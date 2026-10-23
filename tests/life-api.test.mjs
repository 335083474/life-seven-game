import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,modelValue} from './support.mjs';
import defaultApi from '../backend/api.mjs';

async function okay(promise){const r=await promise;assert.equal(r.status,200,JSON.stringify(r.data));return r.data.life;}
async function init(f){await okay(f.call('new',{name:'完整旅人',requestId:crypto.randomUUID()}));await okay(f.command('advance'));}
async function drain(f){while(f.life.awards.length){const name=f.life.canDiscard.find(n=>!['家庭','孩子','快乐','健康'].includes(n))||f.life.canDiscard[0];await okay(f.command('award',{discard:name}));}if(f.life.pending)await okay(f.command('protect',{choice:'accept'}));}

test('new/load and action retries are durable, owner scoped, reject fabricated state and duplicate fixed award',async t=>{
  const f=fixture(t);const id=crypto.randomUUID();const a=await okay(f.call('new',{name:'同一生',requestId:id}));assert.deepEqual(await okay(f.call('new',{name:'同一生',requestId:id})),a);
  assert.equal((await f.call('load',{lifeId:id},crypto.randomUUID())).status,404);await okay(f.command('advance'));
  const body={lifeId:id,revision:f.life.revision,requestId:crypto.randomUUID(),action:'fixed',args:{choice:0},cards:[{name:'财富',level:99}]};
  const first=await okay(f.call('action',body));assert.deepEqual(await okay(f.call('action',body)),first);
  assert.equal((await f.command('fixed',{choice:0})).status,409);assert(!f.life.cards.some(c=>c.level===99));
  assert.deepEqual(await okay(f.call('load',{lifeId:id})),first);
});
test('two concurrent fixed decisions use compare-and-swap, exactly one reward and receipt commits',async t=>{
  const f=fixture(t);await init(f);const before=f.life.revision;const body={lifeId:f.life.id,revision:before,action:'fixed',args:{choice:0}};
  const results=await Promise.all([f.call('action',{...body,requestId:crypto.randomUUID()}),f.call('action',{...body,requestId:crypto.randomUUID()})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const loaded=await okay(f.call('load',{lifeId:f.life.id}));assert.equal(loaded.revision,before+1);assert.equal(loaded.cards.find(c=>c.name==='知识').level,1);
});
test('assessment hides reward and candidates, can recalculate selections without changing base; locked dice retry never rerolls',async t=>{
  const f=fixture(t,{dice:[100]});await init(f);await okay(f.command('fixed',{choice:0}));await okay(f.assess());
  assert(!f.life.assessment.people[0].risks);assert(!f.life.assessment.people[0].reward);assert(!JSON.stringify(f.life.assessment).includes('parentSupport'));
  const body={lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID(),action:'roll',args:{selection:[]}};
  const rolled=await okay(f.call('action',body));assert.equal(rolled.roll.dice,100);assert.deepEqual(await okay(f.call('action',body)),rolled);assert.equal(f.rolls(),1);
  assert.equal((await f.command('roll',{selection:[]})).status,409);await okay(f.command('settle'));assert(f.life.pending);
  assert.equal((await f.command('advance')).status,409);await okay(f.command('protect',{choice:'parents'}));assert(f.life.parentsAlive);assert(!f.life.cards.some(c=>c.name==='父母'));
  assert(f.life.lastResult.audit.people[0].risks.length);assert(f.life.journal.find(e=>e.type==='自由事件').audit);
});
test('invalid or causeless model risks fail before dice; parent cannot be an arbitrary risk card',async t=>{
  for(const kind of ['none','parent','reward']){
    const f=fixture(t,{model:(_b,input)=>{const v=modelValue(input);if(kind==='none')v.people.forEach(p=>p.risks=[]);if(kind==='parent')v.people[0].risks=[{name:'父母',reason:'乱写'}];if(kind==='reward')v.people[0].reward.name='家庭';return v;}});
    await init(f);await okay(f.command('fixed',{choice:0}));const result=await f.assess();assert.equal(result.status,kind==='none'?422:502);assert.equal(f.rolls(),0);assert.equal(f.life.phase,'free');
  }
});
test('one later related opportunity can rescue a fumble before loss, keeping the better die; cannot chase success',async t=>{
  const f=fixture(t,{dice:[1,10,10,10,10,10,10,10,100,20]});await init(f);await okay(f.command('fixed',{choice:0}));await okay(f.assess());await okay(f.command('roll',{selection:[]}));assert.equal((await f.command('reroll',{opportunityId:'invented'})).status,409);await okay(f.command('settle'));await drain(f);assert.equal(f.life.opportunities.length,1);
  await okay(f.command('advance'));await okay(f.command('swan'));await okay(f.command('advance'));await okay(f.command('fixed',{choice:0}));await drain(f);await okay(f.assess());
  // Injected sequence also covers the independent NPC dice at the prior boundary.
  await okay(f.command('roll',{selection:[]}));assert.equal(f.life.roll.dice,100);assert.equal(f.life.eligibleOpportunities.length,1);
  await okay(f.command('reroll',{opportunityId:f.life.eligibleOpportunities[0].id}));assert.equal(f.life.roll.reroll,20);assert.equal((await f.command('reroll',{opportunityId:f.life.opportunities[0].id})).status,409);
  const count=f.life.cards.length;await okay(f.command('settle'));assert.equal(f.life.lastResult.outcome,'成功');assert.equal(f.life.pending,null);assert(f.life.cards.length>=count);assert(f.life.opportunities[0].used);
});
test('whole single life from seven to ending: dropout, early marriage, birth, parents, independence, story, resume and expiry',async t=>{
  const f=fixture(t);await init(f);
  for(let round=0;round<9;round++){
    assert.equal(f.life.round,round);
    const choice=round===0?3:round===4?0:0;
    await okay(f.command('fixed',{choice,targetId:'chen',sacrifice:'朋友'}));await drain(f);
    if(round===1){await okay(f.assess('我想与许知澄结婚。',{actionKind:'marry',targetId:'chen',sacrifice:'朋友'}));}
    else await okay(f.assess('我想学习新的知识。'));
    await okay(f.command('roll',{selection:[]}));await okay(f.command('settle'));await drain(f);
    if(round===1)assert(f.life.married);
    if(round===4){assert(f.life.child);assert(f.life.cards.some(c=>c.name==='快乐'));}
    if(round===6)assert.equal(f.life.parentsAlive,false);
    if(round===7){assert(f.life.child.independent);assert(f.life.child.alive);assert(!f.life.cards.some(c=>c.name==='孩子'));}
    await okay(f.call('narrate',{lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID()}));
    await okay(f.command('advance'));await okay(f.command('swan'));await drain(f);await okay(f.command('advance'));
    assert(f.life.cards.length<=7);assert.equal(new Set(f.life.cards.map(c=>c.name)).size,f.life.cards.length);
  }
  assert.equal(f.life.phase,'ending');assert.equal(f.life.ending.survived,f.life.cards.length===7);
  assert.equal(f.life.chapterFacts[0].married,false);assert.equal(f.life.chapterFacts[0].child,null);
  assert.equal(f.life.chapterFacts[5].child.independent,false);assert.equal(f.life.chapterFacts[5].ending,undefined);
  assert.equal(f.life.chapterFacts[6].child.independent,true);assert.deepEqual(f.life.chapterFacts[6].ending,f.life.ending);
  for(let i=0;i<7;i++)await okay(f.call('memoir',{lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID()}));assert.equal(f.life.biography.chapters.length,7);
  const saved=structuredClone(f.life);assert.deepEqual(await okay(f.call('load',{lifeId:f.life.id})),saved);
  const rows=f.DB.raw.prepare('SELECT expires FROM life_actions WHERE life_id=?').all(f.life.id);assert(rows.length>40);assert(rows.every(r=>r.expires===f.life.expires));
  assert.equal(f.life.expires,f.life.endedAt+48*3600000);
  f.DB.raw.prepare('UPDATE lives SET expires=0').run();assert.equal((await f.call('load',{lifeId:f.life.id})).status,404);
});
test('same goal keeps initial difficulty through reassessment, different goal is evaluated again',async t=>{
  let count=0;const f=fixture(t,{model:(_b,input)=>({...modelValue(input),difficulty:count++?'传奇':'简单'})});await init(f);await okay(f.command('fixed',{choice:0}));await okay(f.assess());assert.equal(f.life.assessment.difficulty,'简单');await okay(f.assess());assert.equal(f.life.assessment.difficulty,'简单');await okay(f.assess('我要成为世界首富。'));assert.equal(f.life.assessment.difficulty,'传奇');
});
test('failing provider preserves completed rules and locked dice; narration is independently retryable',async t=>{
  let fail=false;const f=fixture(t,{model:(b,input)=>{if(!input.people&&fail)return new Response('provider private error',{status:500});return null;}});await init(f);await okay(f.command('fixed',{choice:0}));await okay(f.assess());await okay(f.command('roll',{selection:[]}));await okay(f.command('settle'));
  const before=f.life.revision;fail=true;const result=await f.call('narrate',{lifeId:f.life.id,revision:before,requestId:crypto.randomUUID()});assert.equal(result.status,503);assert(!JSON.stringify(result.data).includes('private'));assert.equal(f.life.revision,before);assert.equal(f.rolls(),1);
  fail=false;await okay(f.call('narrate',{lifeId:f.life.id,revision:before,requestId:crypto.randomUUID()}));assert(f.life.lastResult.narrative);assert.equal(f.rolls(),1);
});

test('whole adverse life reaches death, final critical achievement survives the final swan and actual cleanup removes receipts',async t=>{
  const dice=[],f=fixture(t,{dice});await init(f);
  for(let round=0;round<9;round++){
    await okay(f.command('fixed',{choice:round===3?2:0}));await drain(f);
    const assessed=await f.assess('我想认真完成一次学习实践。');
    if(assessed.status===422)await okay(f.assess('我想与许知澄一起完成一次学习实践。',{partners:['chen']}));else assert.equal(assessed.status,200);
    dice.push(round===8?1:100);
    await okay(f.command('roll',{selection:[]}));await okay(f.command('settle'));await drain(f);
    await okay(f.command('advance'));dice.push(100);await okay(f.command('swan'));await drain(f);await okay(f.command('advance'));
  }
  assert.equal(f.life.phase,'ending');assert.equal(f.life.ending.survived,false);assert(f.life.achievements.some(a=>a.personId==='self'&&a.title==='晚年的求知者'));
  assert(f.life.cards.length<7);
  f.DB.raw.prepare('UPDATE lives SET expires=0').run();f.DB.raw.prepare('UPDATE life_actions SET expires=0').run();
  await defaultApi.scheduled({},f.env);assert.equal(f.DB.raw.prepare('SELECT count(*) n FROM lives').get().n,0);assert.equal(f.DB.raw.prepare('SELECT count(*) n FROM life_actions').get().n,0);
});

test('may forfeit the unused free action without fake dice, rewards or soft-locking an empty hand',async t=>{
  const f=fixture(t);await init(f);await okay(f.command('fixed',{choice:0}));const count=f.life.cards.length;
  await okay(f.command('skip-free'));assert.equal(f.life.phase,'free-result');assert.equal(f.life.cards.length,count);assert.equal(f.rolls(),0);assert(f.life.lastResult.skipped);
  assert.equal((await f.command('skip-free')).status,409);await okay(f.command('advance'));assert.equal(f.life.phase,'swan');
});
