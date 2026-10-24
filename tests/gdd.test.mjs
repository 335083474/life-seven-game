import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,marry,birth,commitFixed,publicLife,rollSwan,advance,transfer,probability,rerollFree,rollFree,settleFree,divorce,resolveProtection} from '../backend/life-engine.mjs';
import {healthLeft,remove} from '../backend/inventory.mjs';
import {TEST_RULESET} from '../backend/settings.mjs';
import {fixture,storyValue} from './support.mjs';
import {digest,saveLife} from '../backend/life-store.mjs';
import {factsForAI,storyThreads} from '../backend/story-facts.mjs';
const make=()=>createLife({id:crypto.randomUUID(),name:'核对旅人',now:Date.now(),rng:()=>0});
const family=()=>{const l=make();l.round=3;marry(l,'chen');birth(l);return l;};
const okay=async p=>{const r=await p;assert.equal(r.status,200,JSON.stringify(r.data));return r.data.life;};
async function free(f){await okay(f.call('new',{requestId:crypto.randomUUID(),name:'核对旅人'}));await okay(f.command('advance'));await okay(f.command('fixed',{choice:0}));await okay(f.assess());}

test('GDD 2.4 / T-049: child age gates independence; late births stay dependent and early births leave at adulthood',()=>{
  const late=family();late.child.bornAge=55;late.round=7;late.phase='fixed';assert.equal(publicLife(late).childAge,6);assert.equal(publicLife(late).fixed.title,'孩子仍在成长');commitFixed(late,0,{},()=>0);assert(!late.child.independent);assert(late.cards.some(c=>c.name==='孩子'));
  const early=family();early.child.bornAge=18;early.round=4;early.phase='fixed';commitFixed(early,0,{},()=>0);assert(early.child.independent);assert.equal(early.journal.find(e=>e.type==='孩子独立').childAge,20);assert(early.cards.some(c=>c.name==='快乐'));
  early.round=7;early.phase='fixed';commitFixed(early,0,{},()=>0);assert.equal(early.journal.filter(e=>e.type==='孩子独立').length,1);
});

test('GDD 7.7 / T-041: already deceased parents never die twice or cost a substitute resource',()=>{
  const l=make();l.parentsAlive=false;remove(l,'父母');const cards=structuredClone(l.cards);l.round=6;l.phase='fixed';assert.equal(publicLife(l).fixed.title,'记住父母留下的爱');commitFixed(l,0,{},()=>0);assert.deepEqual(l.cards,cards);assert(!l.journal.some(e=>e.type==='亲人离世'));
  const old=make();old.parentsAlive=false;old.pending={source:'free',parentAllowed:true,targets:[{personId:'self',name:'快乐',reason:'代价'}]};assert.equal(publicLife(old).protection.parents,false);assert.throws(()=>resolveProtection(old,'parents',()=>0),/protection_unavailable/);
});

test('GDD 7.9: companions retain their own education branch, age and career facts',()=>{
  const l=make();l.round=0;l.phase='fixed';commitFixed(l,3,{},()=>0);assert.equal(l.path,'辍学');assert.equal(l.npcs[0].path,'国内院校');l.round=1;l.phase='fixed';commitFixed(l,0,{},()=>0);
  assert(l.journal.some(e=>e.personId==='chen'&&e.type==='同行者固定事件'&&e.choice==='外交社团'));assert.equal(l.npcs[0].age,22);
});

test('GDD 6.5 / T-055: separately rolled same-round eligible spouses use the shared last charge once, before any loss',()=>{
  const l=family();l.phase='swan';l.npcs.forEach(n=>n.usedRound=l.round);const before=l.cards.length,other=l.npcs[0],otherCount=other.cards.length;const dice=[100,100,10,10];
  rollSwan(l,()=>dice.shift(),()=>0);assert.equal(l.pending,null);assert.equal(l.cards.length,before);assert.equal(other.cards.length,otherCount);assert.equal(healthLeft(other),0);
  const protection=l.journal.find(e=>e.type==='健康保护');assert(protection.sharedLast);assert.deepEqual(protection.charges,[{personId:'chen',spent:1}]);assert.deepEqual(protection.protectedPeople,['self','chen']);assert.equal(l.swan.companionRolls[0].shared,false);
  advance(l,()=>{throw Error('must not reroll at advance');},()=>0,Date.now());assert.equal(l.journal.filter(e=>e.type==='健康保护').length,1);
});

test('GDD 6.5 / T-054: two available charges cost two; an ineligible spouse event never gains joint protection',()=>{
  const l=family();l.cards.push({name:'健康',level:1,spent:0});l.phase='swan';l.npcs.forEach(n=>n.usedRound=l.round);let dice=[100,100,10,10];rollSwan(l,()=>dice.shift(),()=>0);
  const protection=l.journal.find(e=>e.type==='健康保护');assert.equal(protection.spent,2);assert(!protection.sharedLast);assert.equal(healthLeft(l)+healthLeft(l.npcs[0]),0);
  const m=family();m.phase='swan';m.npcs.forEach(n=>n.usedRound=m.round);dice=[100,100,10,10];const picks=[0,0,4,0];rollSwan(m,()=>dice.shift(),max=>(picks.shift()??0)%max);
  assert(!m.journal.some(e=>e.sharedLast));assert(m.cards.some(c=>c.name==='父母'));assert(!m.npcs[0].cards.some(c=>c.name==='父母'));
});

test('GDD 6.3 / O-19: merging exhausted health cards and giving them back cannot manufacture protection',()=>{
  const l=family(),other=l.npcs[0];l.phase='free';l.cards.push({name:'健康',level:1,spent:1});other.cards.find(c=>c.name==='健康').spent=1;
  transfer(l,{direction:'give',name:'健康'},()=>0);assert.equal(other.cards.find(c=>c.name==='健康').level,2);assert.equal(healthLeft(other),0);
  transfer(l,{direction:'take',name:'健康',exchange:'朋友'},()=>0);assert.equal(healthLeft(l),0);assert.equal(l.cards.find(c=>c.name==='健康').spent,2);
  assert.throws(()=>transfer(l,{direction:'steal',name:'健康'},()=>0),/invalid_request/);
});

test('GDD O-13 / T-050: unapproved major child chains are disabled in the default test configuration',()=>{
  const l=family();l.phase='swan';rollSwan(l,()=>100,n=>n-1);assert(!l.swan.event.childChain);assert(!l.pending?.childChain);assert.equal(l.rulesSnapshot.childChainEnabled,false);
});

test('GDD 8.3 / T-061: unfinished attempts retain original goals, outcomes and fact IDs without inventing promises',()=>{
  const entries=[{id:10,type:'自由事件',goal:'我想完成环球旅行。',outcome:'普通失败',age:22},{id:20,type:'自由事件',goal:'我想经营书店。',outcome:'成功',age:28}];
  const threads=storyThreads(entries);assert.equal(threads[0].status,'unfinished');assert.deepEqual(threads[0].factIds,[10]);assert.equal(threads[0].goal,entries[0].goal);assert.equal(threads[1].status,'achieved');assert(!JSON.stringify(threads).includes('承诺'));
});

test('GDD 5.5 / T-032: an NPC participating in a team has not implicitly consented to spending a personal opportunity',()=>{
  const l=make();l.round=1;l.phase='rolled';l.npcs[0].opportunities=[{id:'past',used:false}];l.assessment={people:[{id:'chen',opportunities:[{id:'past',reason:'相关',willingToSpend:false}]}]};l.roll={dice:100,reroll:null,settled:false,calc:{probability:45}};
  assert.throws(()=>rerollFree(l,'past',()=>20));assert(!l.npcs[0].opportunities[0].used);
  l.assessment.people[0].opportunities[0].willingToSpend=true;rerollFree(l,'past',()=>20);assert(l.npcs[0].opportunities[0].used);assert.equal(l.journal.at(-1).consent,'system-character-confirmed');
});

test('GDD M0 / T-017..021: snapshot parameters and four outcome probabilities use one authoritative D100 threshold',()=>{
  const l=make();assert.equal(l.rulesSnapshot.version,TEST_RULESET.version);const rules=structuredClone(l.rulesSnapshot);rules.difficultyTable['困难']=[26,.8];
  const plan={rulesSnapshot:rules,difficulty:'困难',people:[{id:'self',matches:[{key:'self:知识',name:'知识',level:2,kind:'高度匹配'},{key:'self:技能',name:'技能',level:1,kind:'一般匹配'}]}]};
  const p=probability(plan,{self:['self:知识','self:技能']});assert.equal(p.probability,42);assert.equal(p.exact,42);assert.deepEqual(p.distribution,{'大成功':1,'成功':41,'普通失败':53,'大失败':5});assert.equal(l.rulesSnapshot.difficultyTable['困难'][0],25);
  const team={people:['知识','技能','财富'].map((name,i)=>({id:['self','chen','he'][i],matches:[{key:String(i),name,level:1,kind:'高度匹配'}]}))},selection={self:['0'],chen:['1'],he:['2']};
  for(const [difficulty,exact,rounded] of [['简单',90,90],['普通',75,75],['困难',50.2,50],['极难',28,28],['传奇',17,17]]){const result=probability({...team,difficulty},selection);assert.equal(result.exact,exact);assert.equal(result.probability,rounded);assert.equal(Object.values(result.distribution).reduce((a,b)=>a+b,0),100);}
});

test('GDD 5.4 / T-031: three-person fumbles have one direct loss candidate and the configured 3:1:1 bearer weights',()=>{
  const counts={self:0,chen:0,he:0};
  for(let index=0;index<5;index++){
    const l=make();l.round=0;l.phase='free';l.assessment={id:'locked',goal:'共同筹办活动',difficulty:'普通',riskType:'事业风险',action:'pursuit',people:['self','chen','he'].map((id,i)=>({id,matches:[],opportunities:[],risks:[{name:['朋友','技能','才艺'][i],reason:'事前原因'}],parentSupport:{allowed:false,reason:'不适用'}}))};
    rollFree(l,[],()=>100);let draw=0;settleFree(l,max=>draw++===0?index%max:0);assert.equal(l.pending.targets.length,1);counts[l.pending.targets[0].personId]++;
  }
  assert.deepEqual(counts,{self:3,chen:1,he:1});
});

test('GDD T-056..058: protection cannot be reused next round or borrowed after divorce',()=>{
  const l=family();l.phase='swan';l.npcs.forEach(n=>n.usedRound=l.round);let dice=[100,10,10,10];rollSwan(l,()=>dice.shift(),()=>0);assert.equal(healthLeft(l.npcs[0]),0);assert.equal(l.pending,null);
  advance(l,()=>10,()=>0,Date.now());commitFixed(l,0,{},()=>0);l.phase='swan';l.npcs.forEach(n=>n.usedRound=l.round);dice=[100,100,10,10];rollSwan(l,()=>dice.shift(),()=>0);assert(l.pending);assert(!l.journal.some(e=>e.sharedLast));
  const m=family();divorce(m,'分开生活',()=>0);m.phase='swan';m.npcs.forEach(n=>n.usedRound=m.round);dice=[100,10,10,10];rollSwan(m,()=>dice.shift(),()=>0);assert(m.pending);assert.equal(healthLeft(m.npcs[0]),1);
});

test('GDD 4.2 / T-030: lock hashes bind pre-roll plan, selected cards and formula; tampering cannot settle',async t=>{
  const f=fixture(t);await free(f);
  assert.equal((await f.assess('四人一起行动',{partners:['chen','he','ye']})).status,400);
  assert.equal((await f.command('roll',{selection:['self:父母','self:爱情','self:朋友']})).status,400);assert.equal(f.rolls(),0);
  await okay(f.command('roll',{selection:[]}));assert.match(f.life.roll.lockHash,/^[a-f0-9]{64}$/);assert.equal(f.life.actionLock.snapshot,undefined);
  const stored=JSON.parse(f.DB.raw.prepare('SELECT state FROM lives WHERE id=?').get(f.life.id).state);assert.equal(await digest(JSON.stringify(stored.actionLock.snapshot)),f.life.roll.lockHash);stored.assessment.people[0].risks=[];
  f.DB.raw.prepare('UPDATE lives SET state=? WHERE id=?').run(JSON.stringify(stored),stored.id);const result=await f.command('settle');assert.equal(result.data.error,'fact_integrity');assert.equal(f.rolls(),1);
});

test('GDD 8.1 / 9.3: objective fact chain is append-only; generated prose does not rewrite its hash',async t=>{
  const f=fixture(t);await free(f);await okay(f.command('roll',{selection:[]}));await okay(f.command('settle'));const before=structuredClone(f.life),event=before.journal.find(e=>e.type==='自由事件');
  await okay(f.call('narrate',{lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID()}));const after=f.life.journal.find(e=>e.id===event.id);assert.equal(after.hash,event.hash);assert.deepEqual(after.narrativeMeta.factIds,[event.id]);assert.equal(after.narrativeMeta.sourceHashes[0].hash,event.hash);
  const changed=structuredClone(before);changed.journal[0].text='改写童年';await assert.rejects(()=>saveLife(f.DB,before,changed,'test',crypto.randomUUID(),'test',Date.now(),()=>({})),/fact_integrity/);
  assert(!JSON.stringify(factsForAI(f.life.journal)).includes('narrativeMeta'));assert(!JSON.stringify(factsForAI(f.life.journal)).includes('sourceHashes'));
});

test('GDD 8.5 / T-059: unknown source IDs or contradictory family-state checks reject narration without changing settled rules',async t=>{
  let bad='future';const f=fixture(t,{model:(_b,input)=>{if(!input.result)return;const value=storyValue(input);if(bad==='future')value.factIds=[99999];else if(bad==='parents')value.factsCheck={...value.factsCheck,parentsAlive:false};return value;}});
  await free(f);await okay(f.command('roll',{selection:[]}));await okay(f.command('settle'));const cards=structuredClone(f.life.cards);
  for(const mode of ['future','parents']){bad=mode;const r=await f.call('narrate',{lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID()});assert.equal(r.status,502);assert.deepEqual(f.life.cards,cards);assert.equal(f.rolls(),1);}
  bad=null;await okay(f.call('narrate',{lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID()}));assert(f.life.lastResult.narrativeMeta.factIds.length);
});
