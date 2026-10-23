import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {createApi} from '../backend/api.mjs';
import {assessment,verdict,evaluateInput} from '../backend/rules.mjs';
import {createMiniMax} from '../backend/minimax.mjs';

const origin='https://335083474.github.io';
function db(){const raw=new DatabaseSync(':memory:');raw.exec(fs.readFileSync(new URL('../backend/migrations/0001_ai.sql',import.meta.url),'utf8'));const wrap=(sql,values=[])=>({bind:(...v)=>wrap(sql,v),first:async()=>raw.prepare(sql).get(...values)||null,run:async()=>({meta:{changes:Number(raw.prepare(sql).run(...values).changes)}})});return {prepare:wrap,close:()=>raw.close()};}
const input={stage:1,goal:'我想研发帮助老人的新技术。',selected:[{name:'知识',level:3},{name:'勇气',level:1}],team:false,history:[{stage:0,type:'初启',text:'获得父母、知识、勇气和快乐。'}]};
const modelAssessment={difficulty:'困难',reason:'需要专业技能与长期投入，知识提供支持，勇气有助于坚持。',matches:[{name:'知识',kind:'高度匹配'},{name:'勇气',kind:'一般匹配'}]};
function fixture(t,options={}){
  const DB=db();t.after(()=>DB.close());const env={DB,WEB_ORIGIN:origin,MINIMAX_API_KEY:'test-secret-do-not-publish',MINIMAX_MODEL:'MiniMax-M3',DAILY_MODEL_LIMIT:'200',...options.env};
  let calls=0,rolls=0;const session=crypto.randomUUID();
  const api=createApi({roll:()=>{rolls++;return options.dice||50;},fetchModel:async(_url,r)=>{
    calls++;const b=JSON.parse(r.body);assert.equal(b.thinking.type,'disabled');
    if(options.model)return options.model(b,calls);
    const value=b.messages[0].content.includes('matches')?modelAssessment:b.messages[0].content.includes('paragraphs')?{paragraphs:['少年时你拥有父母的庇护，并向科学许下心愿。','这段人生仍在继续，尚未到达的地方还没有答案。']}:{narrative:'你在反复尝试中遇到难题，计划没有如愿完成。那些纸上的笔记留下了这一段未竟的心愿。'};
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{total_tokens:100}});
  }});
  async function call(route,body,extra={}){const response=await api.fetch(new Request('https://api.invalid/api/'+route,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+session,'Content-Type':'application/json',...extra.headers},body:JSON.stringify(body)}),env);return {status:response.status,data:await response.json(),response};}
  return {api,env,session,call,calls:()=>calls,rolls:()=>rolls};
}
test('probability preserves tier multipliers, tier III=II, cap and exact D100 boundaries',()=>{
  const p=assessment(modelAssessment,input);assert.equal(p.base,25);assert.equal(p.bonus,16);assert.equal(p.probability,41);assert.equal(p.fumble,5);
  for(const [dice,prob,result] of [[1,5,'大成功'],[41,41,'成功'],[42,41,'普通失败'],[95,41,'普通失败'],[96,41,'大失败'],[99,53,'普通失败'],[100,53,'大失败']])assert.equal(verdict(dice,prob),result);
  assert.throws(()=>assessment({...modelAssessment,matches:[{name:'财富',kind:'高度匹配'}]},input));
  assert.throws(()=>evaluateInput({...input,selected:[...input.selected,{name:'健康',level:1}]}));
  assert.throws(()=>evaluateInput({...input,selected:[{name:'知识',level:99}]}));
});
test('evaluate is idempotent, binds request to contents, and cannot be resolved by another session',async t=>{
  const f=fixture(t),requestId=crypto.randomUUID();const a=await f.call('evaluate',{...input,requestId});assert.equal(a.status,200);assert.equal(a.data.assessment.probability,41);
  assert.deepEqual((await f.call('evaluate',{...input,requestId})).data,a.data);assert.equal(f.calls(),1);
  assert.equal((await f.call('evaluate',{...input,goal:'篡改行动',requestId})).status,409);
  assert.equal((await f.call('resolve',{assessmentId:requestId},{headers:{Authorization:'Bearer '+crypto.randomUUID()}})).status,404);
});
test('resolve caches one server roll and narrative for repeated clicks',async t=>{
  const f=fixture(t),requestId=crypto.randomUUID();await f.call('evaluate',{...input,requestId});
  const r=await f.call('resolve',{assessmentId:requestId});assert.equal(r.status,200);assert.equal(r.data.dice,50);assert.equal(r.data.outcome,'普通失败');
  assert.deepEqual((await f.call('resolve',{assessmentId:requestId})).data,r.data);assert.equal(f.rolls(),1);assert.equal(f.calls(),2);
});
test('provider failure leaves roll locked; retry narrates same result without reroll',async t=>{
  const f=fixture(t,{model:(body,n)=>n===1?Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(modelAssessment)}}]}):n===2?new Response('provider raw secret', {status:500}):Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({narrative:'这次行动没有成功，但你把未竟的尝试写进了笔记，留作来日反省的线索。'})}}]})});
  const id=crypto.randomUUID();await f.call('evaluate',{...input,requestId:id});const failed=await f.call('resolve',{assessmentId:id});assert.equal(failed.status,503);assert.equal(failed.data.diceLocked,true);assert(!JSON.stringify(failed.data).includes('secret'));
  const retried=await f.call('resolve',{assessmentId:id});assert.equal(retried.status,200);assert.equal(retried.data.dice,failed.data.dice);assert.equal(f.rolls(),1);
});
test('simultaneous resolution blocks the second model call',async t=>{
  let finish;const hold=new Promise(r=>finish=r);let entered;const started=new Promise(r=>entered=r);
  const f=fixture(t,{model:async(b,n)=>{if(n===1)return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(modelAssessment)}}]});entered();await hold;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({narrative:'尝试暂时未能成功，你保留了实验笔记，也记住了这次挫折带来的提醒。'})}}]});}});
  const id=crypto.randomUUID();await f.call('evaluate',{...input,requestId:id});const first=f.call('resolve',{assessmentId:id});await started;const second=await f.call('resolve',{assessmentId:id});assert.equal(second.status,409);finish();assert.equal((await first).status,200);assert.equal(f.calls(),2);assert.equal(f.rolls(),1);
});
test('global budget and origin reject before further provider requests',async t=>{
  const f=fixture(t,{env:{DAILY_MODEL_LIMIT:'1'}});const id=crypto.randomUUID();await f.call('evaluate',{...input,requestId:id});assert.equal((await f.call('resolve',{assessmentId:id})).status,429);assert.equal(f.calls(),1);
  const forbidden=await f.call('evaluate',{...input,requestId:crypto.randomUUID()},{headers:{Origin:'https://evil.invalid'}});assert.equal(forbidden.status,403);assert.equal(forbidden.response.headers.get('Access-Control-Allow-Origin'),null);assert.equal(f.calls(),1);
});
test('malformed assessment, oversized body and fabricated card names fail closed',async t=>{
  const f=fixture(t,{model:()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{"difficulty":"必胜","matches":[]}'}}]})});assert.equal((await f.call('evaluate',{...input,requestId:crypto.randomUUID()})).status,502);
  assert.equal((await f.call('evaluate',{...input,goal:'x'.repeat(21000),requestId:crypto.randomUUID()})).status,413);
  assert.equal((await f.call('evaluate',{...input,selected:[{name:'无敌',level:1}],requestId:crypto.randomUUID()})).status,400);
});
test('biography is cached and requires actual history',async t=>{
  const f=fixture(t),body={name:'旅人',requestId:crypto.randomUUID(),cards:input.selected,history:[...input.history,{stage:1,type:'自由事件',text:'D100=50，判定普通失败。'}]};
  const r=await f.call('biography',body);assert.equal(r.status,200);assert.equal(r.data.paragraphs.length,2);assert.deepEqual((await f.call('biography',body)).data,r.data);assert.equal(f.calls(),1);
  assert.equal((await f.call('biography',{...body,requestId:crypto.randomUUID(),history:[]})).status,400);
});
test('stream parser ignores reasoning, handles split frames and requires completed output',async()=>{
  const frames='data: '+JSON.stringify({choices:[{delta:{reasoning_content:'private reasoning',content:'{"connected":'}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:'true}'},finish_reason:'stop'}],usage:{total_tokens:10}})+'\n\ndata: [DONE]\n\n';
  const infer=createMiniMax({MINIMAX_API_KEY:'dummy'},{fetchModel:async()=>new Response(new ReadableStream({start(c){const bytes=new TextEncoder().encode(frames);c.enqueue(bytes.slice(0,37));c.enqueue(bytes.slice(37));c.close();}}),{headers:{'Content-Type':'text/event-stream'}})});
  assert.equal((await infer('test',{})).value.connected,true);
  await assert.rejects(createMiniMax({MINIMAX_API_KEY:'dummy'},{fetchModel:async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]})})('test',{}),/ai_invalid_response/);
});
