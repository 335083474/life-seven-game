import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLife,commitFixed,publicLife,advance,marry,birth,divorce,rollSwan,resolveProtection,grant,chooseAward,transfer,probability,defaultSelections} from '../backend/life-engine.mjs';
import {healthLeft,receive,remove,healthProtection} from '../backend/inventory.mjs';
const make=()=>createLife({id:crypto.randomUUID(),name:'测试旅人',now:Date.now(),rng:()=>0});
const start=l=>advance(l,()=>10,()=>0,Date.now());

test('opening draws four distinct elements; draw has no extra free or swan turn',()=>{
  const l=make();assert.equal(l.cards.length,4);assert.equal(new Set(l.cards.map(c=>c.name)).size,4);assert.equal(l.phase,'draw');
  assert.throws(()=>rollSwan(l,()=>10,()=>0));start(l);assert.equal(l.round,0);assert.equal(l.phase,'fixed');
});
test('health upgrade retains spent charges, tier III stays II, reacquisition resets, sharing spends owner',()=>{
  const p={cards:[]};receive(p,'健康');assert.equal(healthLeft(p),1);assert(healthProtection(p,null).protected);assert.equal(healthLeft(p),0);
  receive(p,'健康');assert.equal(healthLeft(p),1);receive(p,'健康');assert.equal(healthLeft(p),1);
  remove(p,'健康');receive(p,'健康');assert.equal(healthLeft(p),1);
  const q={cards:[]};assert(healthProtection(q,p).protected);assert.equal(healthLeft(p),0);assert(p.cards.length===1);
});
test('joint eligible swan spends each own charge or the combined last one, never manufactures extra charges',()=>{
  let a={cards:[{name:'健康',level:1,spent:0}]},b=structuredClone(a);
  assert.deepEqual(healthProtection(a,b,{joint:true}),{protected:true,spent:2,sharedLast:false});assert.equal(healthLeft(a)+healthLeft(b),0);
  a={cards:[{name:'健康',level:2,spent:1}]};b={cards:[]};assert.equal(healthProtection(a,b,{joint:true}).sharedLast,true);assert.equal(healthLeft(a),0);
  a={cards:[{name:'健康',level:2,spent:0}]};b={cards:[]};assert.equal(healthProtection(a,b,{joint:true}).spent,2);assert.equal(healthLeft(a),0);
});
test('black swan covers exactly 65 quiet / 35 adverse D100 values and actually removes cards, never grants',()=>{
  let quiet=0,adverse=0;
  for(let d=1;d<=100;d++){
    const l=make();l.round=0;l.phase='swan';const initial=structuredClone(l.cards);rollSwan(l,()=>d,()=>0);
    if(d<=65){quiet++;assert.equal(l.pending,null);assert.deepEqual(l.cards,initial);}
    else {adverse++;assert(l.pending);resolveProtection(l,'accept',()=>0);assert.equal(l.cards.length,3);assert(l.parentsAlive);}
    assert.equal(l.phase,'round-end');assert(!l.journal.some(e=>e.type==='元素变化'));
  }
  assert.equal(quiet,65);assert.equal(adverse,35);
});
test('parent sacrifice is voluntary, retains target, is not death; later fixed death does not double deduct',()=>{
  const l=make();l.round=0;l.phase='free-result';l.pending={source:'free',targets:[{personId:'self',name:'快乐',reason:'压力导致快乐受损'}],health:false,parentAllowed:true,parentReason:'父母可提供支持'};
  resolveProtection(l,'parents',()=>0);assert(l.cards.some(c=>c.name==='快乐'));assert(!l.cards.some(c=>c.name==='父母'));assert(l.parentsAlive);
  const size=l.cards.length;l.round=6;l.phase='fixed';commitFixed(l,0,{},()=>0);assert.equal(l.cards.length,size);assert.equal(l.parentsAlive,false);
  assert(l.journal.some(e=>e.type==='父母代偿'&&e.text.includes('不是死亡')));
});
test('dropout gets a distinct youth event, and fixed choices cannot be replayed or jumped',()=>{
  const l=make();start(l);commitFixed(l,3,{},()=>0);assert.equal(l.path,'辍学');assert.throws(()=>commitFixed(l,0,{},()=>0));
  l.round=1;l.phase='fixed';assert.equal(publicLife(l).fixed.title,'在社会中历练');assert.equal(publicLife(l).fixed.choices[0][0],'拜师学艺');
  commitFixed(l,0,{},()=>0);assert(l.cards.some(c=>c.name==='技能'));assert.throws(()=>advance(l,()=>10,()=>0,Date.now()));
});
function family(){const l=make();l.round=3;marry(l,'chen');birth(l);return l;}
test('marriage converts love / ordinary card, birth ensures joy without duplicate upgrade; child is one shared person',()=>{
  const l=family();assert(l.married);assert(!l.cards.some(c=>c.name==='爱情'));assert(l.cards.some(c=>c.name==='家庭'));assert.equal(l.child.parents.length,2);
  assert.equal(l.cards.find(c=>c.name==='快乐').level,1);assert(l.cards.some(c=>c.name==='孩子'));assert(l.npcs[0].cards.some(c=>c.name==='孩子'));assert.throws(()=>birth(l));
  l.phase='fixed';assert(publicLife(l).fixed.title.includes('已经相守'));
});
test('child independence removes each existing child card and preserves joy, existence and identity',()=>{
  const l=family(),childId=l.child.id;l.round=7;l.phase='fixed';commitFixed(l,0,{},()=>0);
  assert(!l.cards.some(c=>c.name==='孩子'));assert(!l.npcs[0].cards.some(c=>c.name==='孩子'));
  assert(l.cards.some(c=>c.name==='快乐'));assert(l.npcs[0].cards.some(c=>c.name==='快乐'));assert(l.child.alive);assert(l.child.independent);assert.equal(l.child.id,childId);
});
test('divorce resolves family and random costs before custody; no automatic joy/child tragedy',()=>{
  const l=family();l.cards=[{name:'家庭',level:1},{name:'孩子',level:1},{name:'快乐',level:1},{name:'财富',level:1}];
  l.npcs[0].cards=[{name:'家庭',level:1},{name:'孩子',level:1},{name:'快乐',level:1},{name:'知识',level:1}];
  let draw=0;divorce(l,'双方同意',n=>draw++===0?n-1:0);
  assert(!l.married);assert(!l.cards.some(c=>c.name==='财富'));assert(l.cards.some(c=>c.name==='快乐'));assert(!l.npcs[0].cards.some(c=>c.name==='快乐'));
  assert.equal(l.child.custody,'self');assert(l.cards.some(c=>c.name==='孩子'));assert(!l.npcs[0].cards.some(c=>c.name==='孩子'));assert(l.child.alive);
});
test('ordinary child swan does not cascade; only explicit major event cascades joy',()=>{
  const l=family();l.phase='round-end';l.pending={source:'swan',targets:[{personId:'self',name:'孩子',reason:'日常陪伴变化'}],health:false,parentAllowed:true};resolveProtection(l,'accept',()=>0);
  assert(l.cards.some(c=>c.name==='快乐'));assert(l.npcs[0].cards.some(c=>c.name==='孩子'));assert(l.child.alive);
  const m=family();m.phase='swan';rollSwan(m,()=>100,n=>n-1);assert(m.pending.childChain);resolveProtection(m,'accept',()=>0);
  assert(!m.cards.some(c=>c.name==='孩子'||c.name==='快乐'));assert(!m.npcs[0].cards.some(c=>c.name==='孩子'||c.name==='快乐'));assert(m.child.alive);
});
test('full hand queues real choices; required child cannot be skipped or throw away required joy',()=>{
  const l=make();l.round=3;l.cards=[{name:'家庭',level:1},...['财富','知识','技能','勇气','智慧','才艺'].map(name=>({name,level:1}))];l.married=true;l.spouseId='chen';birth(l);
  assert.equal(l.awards.length,2);assert.throws(()=>chooseAward(l,null));chooseAward(l,'才艺');assert.equal(l.cards.length,7);assert(!publicLife(l).canDiscard.includes('快乐'));
  chooseAward(l,'智慧');assert(l.cards.some(c=>c.name==='孩子'));assert(l.cards.some(c=>c.name==='快乐'));assert.equal(l.cards.length,7);
});
test('transfer preserves health spent and card grade, bound relation cards cannot be transferred',()=>{
  const l=family();l.phase='free';l.npcs[0].cards.find(c=>c.name==='健康').spent=1;
  transfer(l,{direction:'take',name:'健康',exchange:'朋友'},()=>0);assert.equal(l.cards.find(c=>c.name==='健康').spent,1);assert.equal(healthLeft(l),0);
  assert.throws(()=>transfer(l,{direction:'give',name:'孩子'},()=>0));
});
test('tier III keeps real provenance and no extra contribution; same-name contributions diminish strongest-first',()=>{
  const l=make();l.round=0;grant(l,'self','知识','第一次');grant(l,'self','知识','第二次');grant(l,'self','知识','第三次');assert.equal(l.collection.length,1);
  const plan={difficulty:'困难',people:[{id:'self',matches:[{key:'self:知识',name:'知识',level:3,kind:'高度匹配'}]},{id:'chen',matches:[{key:'chen:知识',name:'知识',level:1,kind:'高度匹配'}]},{id:'he',matches:[{key:'he:知识',name:'知识',level:1,kind:'高度匹配'}]}]};
  const p=probability(plan,defaultSelections(plan,['self:知识']));assert.equal(p.raw,22);assert.equal(p.bonus,17.6);assert.equal(p.probability,49);
});
test('final verdict waits for all choices, counts distinct slots not card grade, preserves achievement on death',()=>{
  const l=make();l.round=8;l.phase='round-end';l.achievements=[{title:'晚年的勇敢尝试'}];l.cards=[{name:'知识',level:3}];l.pending={};assert.throws(()=>advance(l,()=>10,()=>0,1000));l.pending=null;
  advance(l,()=>10,()=>0,1000);assert.equal(l.phase,'ending');assert.equal(l.ending.survived,false);assert.equal(l.achievements.length,1);assert.equal(l.expires,1000+48*3600000);
});
