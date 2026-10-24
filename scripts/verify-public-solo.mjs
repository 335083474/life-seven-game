// Explicit production smoke run. Creates one fictional life and uses real AI.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='https://life-seven-game-api.test-garden.workers.dev',token=crypto.randomUUID();
let life;const requests=[];const streaming=process.argv.includes('--stream');
async function call(route,payload={}){
  const body={...(life&&route!=='new'?{lifeId:life.id,revision:life.revision}:{}),requestId:crypto.randomUUID(),...payload};
  const response=await fetch(base+'/api/life/'+route,{method:'POST',headers:{Origin:'https://335083474.github.io',Authorization:'Bearer '+token,'Content-Type':'application/json',...(streaming&&['narrate','memoir'].includes(route)?{Accept:'application/x-ndjson'}:{})},body:JSON.stringify(body)});
  let result,firstDraftMs=null,draftCount=0;const started=Date.now();
  if(response.headers.get('Content-Type')?.includes('application/x-ndjson')){
    let pending='';const reader=response.body.getReader(),decoder=new TextDecoder();
    function line(raw){if(!raw.trim())return;const e=JSON.parse(raw);if(e.type==='draft'&&e.text){firstDraftMs??=Date.now()-started;draftCount++;}if(e.type==='result')result={life:e.life};if(e.type==='error')throw Error(route+': '+e.error);}
    for(;;){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let i;while((i=pending.indexOf('\n'))>=0){line(pending.slice(0,i));pending=pending.slice(i+1);}}pending+=decoder.decode();if(pending.trim())line(pending);assert(firstDraftMs!==null);
  }else result=await response.json();
  requests.push({route,status:response.status,...(draftCount?{firstDraftMs,draftCount,totalMs:Date.now()-started}:{})});
  if(!response.ok)throw Error(route+': '+JSON.stringify(result));life=result.life;return life;
}
const action=(action,args={})=>call('action',{action,args});
async function drain(){
  if(life.pending)await action('protect',{choice:life.protection.health?'health':life.protection.parents?'parents':'accept'});
  while(life.awards.length){const choices=life.canDiscard.filter(n=>!['家庭','孩子','快乐','健康'].includes(n));await action('award',{discard:choices[0]||life.canDiscard[0]});}
}
const health=await (await fetch(base+'/health')).json();assert.equal(health.version,2);
await call('new',{name:'上线验收旅人'});const lifeId=life.id;
await action('advance');
for(let round=0;round<9;round++){
  assert.equal(life.round,round);
  await action('fixed',{choice:round===0?3:0,targetId:'chen',sacrifice:life.cards.find(c=>!['父母','家庭','孩子'].includes(c.name))?.name});await drain();
  if(round===0){
    await call('assess',{goal:'我想与许知澄合作，做一套方便老人使用的社区阅读设备，由我联系社区和组织试用，由许知澄研究技术。',partners:['chen']});
    assert(!life.assessment.people[0].risks);await action('roll',{selection:[]});await action('settle');await drain();await call('narrate');assert.equal(life.lastResult.source,'MiniMax');
  }else await action('skip-free');
  await action('advance');await action('swan');await drain();await action('advance');
  assert(life.cards.length<=7);assert.equal(new Set(life.cards.map(c=>c.name)).size,life.cards.length);
  console.log('Public life: completed round '+(round+1)+'/9');
}
assert.equal(life.phase,'ending');assert.equal(life.ending.survived,life.cards.length===7);
assert.equal(life.expires,life.endedAt+48*3600000);
for(let i=0;i<7;i++){await call('memoir');assert.equal(life.biography.chapters.length,i+1);console.log('Real MiniMax memoir: '+(i+1)+'/7');}
const before=structuredClone(life);await call('load');assert.deepEqual(life,before);
const report={at:new Date().toISOString(),health,lifeId,rounds:9,realAssessment:true,realNarrative:true,realMemoirChapters:7,ended:true,survived:life.ending.survived,cardCount:life.cards.length,resumeVerified:true,retentionHours:48,requests,life,authTokenRecorded:false,streaming};
fs.mkdirSync('artifacts/solo-release',{recursive:true});fs.writeFileSync(streaming?'artifacts/solo-release/public-stream.json':'artifacts/solo-release/public-life.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({completed:true,rounds:9,chapters:7,survived:report.survived,cards:report.cardCount,resumeVerified:true,authTokenRecorded:false}));
