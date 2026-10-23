const failure = (code, status = 409) => Object.assign(Error(code), {status});
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function loadLife(DB, id, owner, now) {
  const row = await DB.prepare('SELECT * FROM lives WHERE id=? AND owner=? AND expires>?').bind(id, owner, now).first();
  if (!row) throw failure('life_not_found', 404);
  return JSON.parse(row.state);
}
// Both the state and receipt are committed in one D1 transaction. CAS prevents
// two tabs advancing or awarding twice. No in-memory lock is authoritative.
export async function saveLife(DB, before, after, owner, requestId, fingerprint, now, output) {
  after.revision = before.revision + 1;
  const serialized = JSON.stringify(after);
  const key = owner + ':' + requestId;
  const results = await DB.batch([
    DB.prepare('UPDATE lives SET revision=?,state=?,expires=? WHERE id=? AND owner=? AND revision=?').bind(after.revision, serialized, after.expires, after.id, owner, before.revision),
    DB.prepare('INSERT OR IGNORE INTO life_actions(id,life_id,owner,fingerprint,output,expires) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lives WHERE id=? AND owner=? AND revision=? AND state=?)').bind(key, after.id, owner, fingerprint, JSON.stringify(output(after)), after.expires, after.id, owner, after.revision, serialized),
    DB.prepare('UPDATE life_actions SET expires=? WHERE life_id=? AND owner=? AND EXISTS(SELECT 1 FROM lives WHERE id=? AND owner=? AND revision=? AND state=?)').bind(after.expires,after.id,owner,after.id,owner,after.revision,serialized)
  ]);
  if (!results[0].meta.changes) throw failure('revision_conflict');
  return after;
}
export async function receipt(DB, owner, requestId, fingerprint, now) {
  const row = await DB.prepare('SELECT fingerprint,output FROM life_actions WHERE id=? AND owner=? AND expires>?').bind(owner + ':' + requestId, owner, now).first();
  if (!row) return null;
  if (row.fingerprint !== fingerprint) throw failure('request_conflict');
  return JSON.parse(row.output);
}
