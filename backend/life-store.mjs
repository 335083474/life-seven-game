const failure = (code, status = 409) => Object.assign(Error(code), {status});
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
const objective=event=>Object.fromEntries(Object.entries(event).filter(([key])=>!['narrative','narrativeMeta','hash','previousHash','sealedAt','hashOrigin'].includes(key)));
export async function sealLedger(after,before,now){
  if(before){
    if(after.journal.length<before.journal.length)throw failure('fact_integrity',409);
    for(let i=0;i<before.journal.length;i++)if(JSON.stringify(objective(before.journal[i]))!==JSON.stringify(objective(after.journal[i])))throw failure('fact_integrity',409);
  }
  let previousHash=null;
  for(let i=0;i<after.journal.length;i++){
    const event=after.journal[i],hash=await digest(JSON.stringify({previousHash,fact:objective(event)}));
    if(event.hash&&(event.hash!==hash||event.previousHash!==previousHash))throw failure('fact_integrity',409);
    if(!event.hash){event.hash=hash;event.previousHash=previousHash;event.sealedAt=now;event.hashOrigin=before&&i<before.journal.length?'legacy-import':'server-event';}
    previousHash=hash;
  }
  after.factHead=previousHash;
}
export async function loadLife(DB, id, owner, now) {
  const row = await DB.prepare('SELECT * FROM lives WHERE id=? AND owner=? AND expires>?').bind(id, owner, now).first();
  if (!row) throw failure('life_not_found', 404);
  return JSON.parse(row.state);
}
// Both the state and receipt are committed in one D1 transaction. CAS prevents
// two tabs advancing or awarding twice. No in-memory lock is authoritative.
export async function saveLife(DB, before, after, owner, requestId, fingerprint, now, output) {
  await sealLedger(after,before,now);
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
