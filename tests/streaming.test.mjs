import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiniMax} from '../backend/minimax.mjs';
import {modelPolicy} from '../backend/model-policy.mjs';
import {prosePrefix} from '../backend/stream-json.mjs';
import {fixture,storyValue} from './support.mjs';
import {planInput,validatePlan} from '../backend/life-ai.mjs';
import {modelValue} from './support.mjs';
import {probability,defaultSelections} from '../backend/life-engine.mjs';
import fs from 'node:fs';
import vm from 'node:vm';

const enc=new TextEncoder();
function sse(value,{hold,reasoning=false}={}){
  const raw=JSON.stringify(value),cut=Math.max(20,Math.floor(raw.indexOf('factIds')/2));let release;
  const ready=new Promise(resolve=>release=resolve);
  const response=new Response(new ReadableStream({async start(c){
    const send=delta=>c.enqueue(enc.encode('data: '+JSON.stringify({choices:[{delta}]})+'\n\n'));
    if(reasoning)send({reasoning_content:'PRIVATE REASONING SHOULD NEVER BE SHOWN'});
    send({content:raw.slice(0,cut)});release();if(hold)await hold;
    send({content:raw.slice(cut)});c.enqueue(enc.encode('data: '+JSON.stringify({choices:[{finish_reason:'stop',delta:{}}],usage:{total_tokens:42}})+'\n\ndata: [DONE]\n\n'));c.close();
  }}),{headers:{'Content-Type':'text/event-stream'}});
  return {response,ready};
}
async function setup(f){
  const r=await f.call('new',{name:'流式验收',requestId:crypto.randomUUID()});assert.equal(r.status,200);
  await f.command('advance');await f.command('fixed',{choice:3});await f.assess();
  await f.command('roll',{selection:[]});await f.command('settle');
}
async function stream(f,body){return f.api.fetch(new Request('https://test/api/life/narrate',{method:'POST',headers:{Origin:f.env.WEB_ORIGIN,Authorization:'Bearer '+f.session,'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(body)}),f.env);}
const payload=f=>({lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID()});

test('M3 simple tasks disable thinking; new complex model explicitly uses medium, never implicit max',()=>{
  const env={MINIMAX_MODEL:'MiniMax-M3',MINIMAX_COMPLEX_MODEL:'MiniMax-M3.1-Flash'};
  assert.deepEqual(modelPolicy(env,'story').thinking,{type:'disabled'});
  assert.equal(modelPolicy(env,'plan').model,'MiniMax-M3');
  for(const task of ['memoir','plan-repair']){const p=modelPolicy(env,task);assert.equal(p.model,'MiniMax-M3.1-Flash');assert.equal(p.reasoning_effort,'medium');assert.equal(p.thinking.type,'adaptive');}
  assert.equal(modelPolicy({...env,MINIMAX_COMPLEX_EFFORT:'max'},'memoir').reasoning_effort,'medium');
  assert.equal(modelPolicy({...env,MINIMAX_COMPLEX_EFFORT:'high'},'memoir').reasoning_effort,'high');
});

test('incremental JSON prose decodes split unicode and escapes, skips nested prose and non-text metadata',()=>{
  const raw=JSON.stringify({nested:{narrative:'not the story'},factIds:[7],narrative:'你说："好"。\nA\\B😀'});
  for(let i=0;i<=raw.length;i++){const text=prosePrefix(raw.slice(0,i),'narrative');if(text!==null)assert('你说："好"。\nA\\B😀'.startsWith(text));}
  assert.equal(prosePrefix(raw,'narrative'),'你说："好"。\nA\\B😀');
  assert.equal(prosePrefix('{"narrative":"\\u4f60\\u597d\\uD83D','narrative'),'你好');
  assert.equal(prosePrefix('{"narrative":"\\u4f60\\u597d\\uD83D\\uDE00"}','narrative'),'你好😀');
  assert.equal(prosePrefix('{"factIds":[1,2]}','narrative'),null);
});

test('provider emits real prose before upstream completes and never forwards reasoning or source JSON',async()=>{
  let release;const hold=new Promise(r=>release=r),drafts=[];let request;
  const value={narrative:'你把这次真实的经历写进了手记，接着走向人生的下一页。',factIds:[1],factsCheck:{parentsAlive:true}};
  const {response}=sse(value,{hold,reasoning:true});
  const infer=createMiniMax({MINIMAX_API_KEY:'test',MINIMAX_MODEL:'MiniMax-M3'},{fetchModel:async(_u,r)=>{request=JSON.parse(r.body);return response;}});
  const pending=infer('test',{},1100,{task:'story',onDraft:t=>drafts.push(t)});
  while(!drafts.length)await new Promise(r=>setTimeout(r,1));
  assert(drafts[0].length<value.narrative.length);assert(!drafts.join('').includes('PRIVATE'));assert.equal(request.thinking.type,'disabled');release();
  const final=await pending;assert.deepEqual(final.value,value);assert.equal(drafts.at(-1),value.narrative);assert(final.firstTextMs!==null);
});

test('batch assessment covers every available card; changing selections and locking do not request more AI',async t=>{
  const f=fixture(t);await f.call('new',{name:'批量验收',requestId:crypto.randomUUID()});await f.command('advance');await f.command('fixed',{choice:3});await f.assess();
  const plan=f.life.assessment;assert.equal(plan.people[0].matches.length,f.life.cards.length);assert.equal(f.calls(),1);
  const keys=plan.people[0].matches.map(c=>c.key);for(const key of keys)assert(Number.isInteger(probability(plan,defaultSelections(plan,[key])).probability));
  await f.command('roll',{selection:keys.slice(-2)});assert.equal(f.calls(),1);
});

test('stream validates before commit, caches final state on retry and never rolls or spends cards again',async t=>{
  const f=fixture(t,{model:(_b,input)=>input.result?sse(storyValue(input),{reasoning:true}).response:undefined});await setup(f);
  const before=structuredClone(f.life.cards),body=payload(f),r=await stream(f,body);assert.equal(r.headers.get('Content-Type'),'application/x-ndjson; charset=utf-8');
  const events=(await r.text()).trim().split('\n').map(JSON.parse);assert(events.find(e=>e.type==='draft'));const result=events.at(-1);assert.equal(result.type,'result');assert.deepEqual(result.life.cards,before);assert.equal(f.rolls(),1);assert(result.life.lastResult.narrativeMeta.factIds.length);
  const calls=f.calls();const retry=(await (await stream(f,body)).text()).trim().split('\n').map(JSON.parse);assert.deepEqual(retry.at(-1).life,result.life);assert.equal(f.calls(),calls);assert(!retry.some(e=>e.type==='draft'));
});

test('invalid streamed source is reset once, then discarded without changing persisted facts',async t=>{
  const f=fixture(t,{model:(_b,input)=>input.result?sse({...storyValue(input),factIds:[999999]}).response:undefined});await setup(f);const before=structuredClone(f.life);
  const events=(await (await stream(f,payload(f))).text()).trim().split('\n').map(JSON.parse);
  assert.equal(events.filter(e=>e.type==='reset').length,2);assert.equal(events.at(-1).error,'ai_invalid_response');assert(!events.some(e=>e.type==='result'));
  await f.call('load',{lifeId:before.id});assert.deepEqual(f.life,before);assert.equal(f.rolls(),1);
});

test('browser transport delivers partial text before final state and treats a broken stream as retryable',async()=>{
  let release;const hold=new Promise(r=>release=r),storage=new Map(),progress=[];
  const context=vm.createContext({window:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto,AbortSignal,TextDecoder,fetch:async(_url,request)=>{
    assert.equal(request.headers.Accept,'application/x-ndjson');return new Response(new ReadableStream({async start(c){c.enqueue(enc.encode(JSON.stringify({type:'draft',text:'你记下'})+'\n'));await hold;c.enqueue(enc.encode(JSON.stringify({type:'result',life:{revision:5}})+'\n'));c.close();}}),{headers:{'Content-Type':'application/x-ndjson'}});
  }});vm.runInContext(fs.readFileSync(new URL('../ai-client.js',import.meta.url),'utf8'),context);
  const pending=context.window.LifeDM.call('life/narrate',{},e=>progress.push(e));while(!progress.length)await new Promise(r=>setTimeout(r,1));assert.equal(progress[0].text,'你记下');release();assert.equal((await pending).life.revision,5);
  context.fetch=async()=>new Response('{"type":"draft","text":"incomplete"}\n',{headers:{'Content-Type':'application/x-ndjson'}});
  await assert.rejects(context.window.LifeDM.call('life/narrate',{},()=>{}),e=>e.code==='network_error');
});

test('complex model wire request explicitly sets medium and splits reasoning from public text',async()=>{
  let sent;const infer=createMiniMax({MINIMAX_API_KEY:'test',MINIMAX_MODEL:'MiniMax-M3',MINIMAX_COMPLEX_MODEL:'MiniMax-M3.1-Flash'},{fetchModel:async(_u,r)=>{sent=JSON.parse(r.body);return Response.json({choices:[{finish_reason:'stop',message:{content:'{"text":"verified"}'}}]});}});
  const result=await infer('test',{},2700,{task:'memoir'});assert.equal(sent.model,'MiniMax-M3.1-Flash');assert.equal(sent.thinking.type,'adaptive');assert.equal(sent.reasoning_effort,'medium');assert(sent.max_completion_tokens>=10000);assert.equal(sent.reasoning_split,true);assert.equal(result.effort,'medium');
});


test('an unused final achievement can be omitted in early rounds, while the final round still requires one',async t=>{
  const f=fixture(t,{model:(_b,input)=>input.people?{...modelValue(input),people:modelValue(input).people.map(p=>({...p,achievement:null}))}:undefined});
  await f.call('new',{name:'短评估',requestId:crypto.randomUUID()});await f.command('advance');await f.command('fixed',{choice:3});const r=await f.assess();assert.equal(r.status,200);assert.equal(f.calls(),1);assert.equal(f.life.assessment.people[0].achievement,undefined);
  const life=structuredClone(f.life);life.round=8;const input=planInput(life,{goal:'我想整理这一生的社区服务经验。'}),value=modelValue(input);value.people[0].achievement=null;assert.throws(()=>validatePlan(value,input,crypto.randomUUID(),life),/ai_invalid_response/);
});
