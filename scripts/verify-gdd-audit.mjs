import fs from 'node:fs';
import assert from 'node:assert/strict';
const audit=JSON.parse(fs.readFileSync('docs/development-audit.json','utf8'));
assert.equal(audit.cases.length,70);assert.equal(audit.openDecisions.length,26);
assert.deepEqual(audit.cases.map(c=>c.id).sort(),Array.from({length:70},(_,i)=>'T-'+String(i+1).padStart(3,'0')));
assert.deepEqual(audit.openDecisions.map(c=>c.id).sort(),Array.from({length:26},(_,i)=>'O-'+String(i+1).padStart(2,'0')));
const statuses=new Set(['verified','candidate','partial','multiplayer','commercial','decision']),summary={};
for(const row of audit.cases){
  assert(statuses.has(row.status),row.id);assert(row.note?.length>5,row.id);
  if(['verified','candidate'].includes(row.status))assert(row.evidence.length,row.id);
  for(const file of row.evidence)assert(fs.existsSync(file),row.id+': missing '+file);
  summary[row.status]=(summary[row.status]||0)+1;
}
assert.deepEqual(summary,audit.summary);
assert(audit.openDecisions.every(d=>d.status==='open'&&d.previewPolicy));
console.log(JSON.stringify({baseline:audit.baseline.id,cases:70,openDecisions:26,coverageComplete:true,summary}));
