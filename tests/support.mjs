import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {createApi} from '../backend/api.mjs';

export function database(){
  const raw=new DatabaseSync(':memory:');
  for(const name of ['0001_ai.sql','0002_lives.sql'])raw.exec(fs.readFileSync(new URL('../backend/migrations/'+name,import.meta.url),'utf8'));
  const wrap=(sql,values=[])=>({bind:(...v)=>wrap(sql,v),first:async()=>raw.prepare(sql).get(...values)||null,run:async()=>({meta:{changes:Number(raw.prepare(sql).run(...values).changes)}}),_run:()=>({meta:{changes:Number(raw.prepare(sql).run(...values).changes)}})});
  return {raw,prepare:wrap,batch:async rows=>{raw.exec('BEGIN');try{const result=rows.map(r=>r._run());raw.exec('COMMIT');return result;}catch(e){raw.exec('ROLLBACK');throw e;}},close:()=>raw.close()};
}
export function modelValue(input){
  const en=input.locale==='en';
  return {difficulty:'普通',reason:en?'This practical goal requires effort and remains uncertain.':'这是需要投入但存在不确定性的现实目标。',riskType:'事业风险',people:input.people.map((p,i)=>({id:p.id,role:en?(i?'Partner':'Initiator'):(i?'合作伙伴':'发起者'),willing:true,decisionReason:en?'Willing to take this role for this round.':'愿意按这个分工投入本回合行动。',matches:p.available.map(c=>({key:c.key,kind:'高度匹配',reason:en?'This resource supports the practical goal.':'这项资源能支持本次目标的实际执行。'})),reward:{name:['知识','技能','人脉'][i],reason:en?'Practice builds this resource.':'实践带来相应积累。'},risks:p.riskCards.filter(c=>!['父母','家庭','孩子'].includes(c.name)).slice(0,2).map(c=>({name:c.name,reason:en?'A serious setback could damage this existing resource.':'行动受挫可能损害这份已有资源。'})),parentSupport:{allowed:p.parentsAvailable,reason:en?'Parents can provide practical support for this action.':'父母尚可提供与本次行动相关的实际支持。'},opportunities:p.opportunities.map(o=>({id:o.id,reason:en?'This continues the earlier related work.':'这次行动延续此前同类实践。',willingToSpend:true})),opportunityScope:en?'Future related learning and practice':'今后相关学习与实践的积累',achievement:en?'Lifelong Learner':'晚年的求知者'}))};
}
export function storyValue(input){
  const memoir=input.chapter!==undefined,en=input.locale==='en';
  const factIds=memoir?input.ledger.map(e=>e.id).slice(0,12):[input.result?.eventId].filter(Number.isInteger);
  return {...(memoir?{title:en?'Choices Remembered':'真实选择留下的这一章',text:en?'You look back on the choices recorded in this chapter. The events, resources and relationships remain those in the factual journal. The next chapter is still unwritten.':'这一章记录了你实际走过的道路。每一次选择和未尽心愿，都依照手记如实保留。你回望那些留下痕迹的日子，带着已经发生的一切走向下一章。'}:{narrative:en?'You remember the path that led here and record this attempt together with its actual outcome. The facts of this experience will accompany you into the next part of your life.':'你记起此前走过的路，把这一次尝试和真实的结果一起写下。那些选择留下的痕迹，会随你继续走进下一段人生。'}),factIds,factsCheck:input.requiredFacts};
}
export function fixture(t,{dice=[],model,random=()=>0}={}){
  const DB=database();t?.after(()=>DB.close());let now=Date.parse('2026-10-24T00:00:00Z'),rolls=0,calls=0;let life;
  const env={DB,MINIMAX_API_KEY:'fake-test-key',MINIMAX_MODEL:'MiniMax-M3',WEB_ORIGIN:'https://335083474.github.io',DAILY_MODEL_LIMIT:'200'};
  const api=createApi({clock:()=>now,roll:()=>{rolls++;return dice.shift()??10;},rng:random,fetchModel:async(url,request)=>{
    calls++;const b=JSON.parse(request.body),input=JSON.parse(b.messages[1].content);let value;
    if(model)value=await model(b,input,calls);
    if(value instanceof Response)return value;
    value||=input.people?modelValue(input):storyValue(input);
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
  }});
  const session=crypto.randomUUID();
  async function call(route,body={},token=session){now+=61000;const r=await api.fetch(new Request('https://test/api/life/'+route,{method:'POST',headers:{Origin:env.WEB_ORIGIN,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)}),env);const data=await r.json();if(data.life)life=data.life;return {status:r.status,data};}
  async function command(action,args={},extra={}){return call('action',{lifeId:life.id,revision:life.revision,requestId:crypto.randomUUID(),action,args,...extra});}
  async function assess(goal='我想学习新的知识。',extra={}){return call('assess',{lifeId:life.id,revision:life.revision,requestId:crypto.randomUUID(),goal,...extra});}
  return {DB,env,api,session,call,command,assess,get life(){return life;},rolls:()=>rolls,calls:()=>calls,now:()=>now};
}
