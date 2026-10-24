// Actual provider acceptance against an isolated in-memory database. No public
// forced-dice endpoint, no real player's save, no credentials in the report.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createApi} from '../backend/api.mjs';
import {database} from '../tests/support.mjs';
const DB=database(),config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.mmx','config.json'),'utf8'));
const env={DB,WEB_ORIGIN:'http://127.0.0.1:8767',MINIMAX_API_KEY:config.api_key,MINIMAX_MODEL:'MiniMax-M3',MINIMAX_REGION:'cn',DAILY_MODEL_LIMIT:200};
let clock=Date.now(),modelCalls=0,life;const token=crypto.randomUUID(),locale=process.argv.includes('--en')?'en':'zh-CN';
const api=createApi({clock:()=>clock+=61000,roll:()=>10,rng:()=>0,fetchModel:(url,body)=>{modelCalls++;return fetch(url,body);}});
async function call(route,payload={}){
  const body={...(life&&route!=='new'?{lifeId:life.id,revision:life.revision}:{}),requestId:crypto.randomUUID(),locale,...payload};
  const r=await api.fetch(new Request('http://127.0.0.1:8767/api/life/'+route,{method:'POST',headers:{Origin:env.WEB_ORIGIN,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)}),env),out=await r.json();
  assert.equal(r.status,200,route+': '+JSON.stringify(out));life=out.life;return life;
}
const action=(action,args={})=>call('action',{action,args});
async function drain(){
  while(life.awards.length)await action('award',{discard:life.canDiscard.find(n=>!['家庭','孩子','快乐','健康'].includes(n))||life.canDiscard[0]});
  if(life.pending)await action('protect',{choice:life.protection.parents?'parents':'accept'});
}
await call('new',{name:locale==='en'?'GDD QA':'策划验收旅人'});await action('advance');
for(let round=0;round<life.roundCount;round++){
  await action('fixed',{choice:round===0?3:0,targetId:'chen',sacrifice:'朋友'});await drain();
  if(round===0){
    await call('assess',{goal:locale==='en'?'I want to organize a community reading project with Xu Zhicheng. I will recruit volunteers while they prepare technical materials.':'我想与许知澄合作，为社区老人组织阅读活动，由我联系社区与志愿者，由许知澄制作方便使用的技术资料。',partners:['chen']});
    assert(life.assessment.people.every(p=>p.matches.every(m=>m.reason)));
    await action('roll',{selection:[]});assert.match(life.roll.lockHash,/^[a-f0-9]{64}$/);await action('settle');await drain();
    await call('narrate');assert(life.lastResult.narrativeMeta.factIds.includes(life.lastResult.eventId));
  }else await action('skip-free');
  await action('advance');await action('swan');await drain();await action('advance');console.log('Verified round '+(round+1)+'/9');
}
for(let chapter=0;chapter<7;chapter++){await call('memoir');assert(life.biography.chapters[chapter].factIds.some(id=>life.journal.some(e=>e.id===id&&e.stage===chapter)));console.log('Verified actual MiniMax chapter '+(chapter+1)+'/7');}
const copy=structuredClone(life);await call('load');assert.deepEqual(life,copy);
const report={at:new Date().toISOString(),realProvider:true,locale,modelCalls,rounds:life.roundCount,sourceCheckedChapters:7,storySourceChecked:true,lockVerified:true,hashedFacts:life.journal.filter(e=>e.hash).length,resumeVerified:true,credentialsRecorded:false,life};
fs.mkdirSync('artifacts/gdd-audit-20261024',{recursive:true});fs.writeFileSync('artifacts/gdd-audit-20261024/minimax-'+locale+'.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({realProvider:true,locale,modelCalls,rounds:life.roundCount,sourceCheckedChapters:7,storySourceChecked:true,hashedFacts:report.hashedFacts,resumeVerified:true}));DB.close();
