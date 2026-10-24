import test from 'node:test';
import assert from 'node:assert/strict';
import {translateText,chineseDecorations,normalizeLocale} from '../locale.mjs';
import {missingTranslations,languageInstruction} from '../backend/life-locale.mjs';
import {fixture,modelValue} from './support.mjs';
import {rounds,chapters,swans} from '../backend/events.mjs';
import {cards} from '../backend/rules.mjs';

test('all fixed events, cards, chapters and adverse events have English copy; decorations are Chinese by default',()=>{
  for(const copy of [...cards,...chapters.flat(),...rounds.flatMap(r=>[r.title,...r.choices.flat().filter(v=>typeof v==='string')]),...swans.flatMap(s=>[s.title,s.text])]){
    assert.ok(!/\p{Script=Han}/u.test(translateText(copy,'en')),copy);
  }
  for(const copy of Object.keys(chineseDecorations))assert.notEqual(translateText(copy),copy,copy);
  for(const copy of ['简单','普通','困难','极难','传奇','高度匹配','一般匹配','暂不匹配','经济风险','事业风险','人际风险','身心风险','情感风险','探索风险','生活风险'])assert.ok(!/\p{Script=Han}/u.test(translateText(copy,'en')),copy);
  assert.equal(normalizeLocale('unsupported'),'zh-CN');
  assert.match(translateText('#1 · Ⅰ · 7岁 · 命运初启','en'),/7 years old/);
});

test('language translation caches prose without altering assessments, dice, cards, history or future risks',async t=>{
  let languagePrompt='';
  const f=fixture(t,{model:(b,input)=>{
    if(input.texts){languagePrompt=b.messages[0].content;return {translations:input.texts.map((_,i)=>'Localized factual text '+i+'.')};}
    if(input.people){const p=modelValue(input);p.reason='只有这份测试评估中才出现的独特难度说明';return p;}
  }});
  await f.call('new',{requestId:crypto.randomUUID(),name:'Locale QA'});await f.command('advance');await f.command('fixed',{choice:0});await f.assess('我想学习新的设计方法。',{locale:'en'});
  const before=structuredClone(f.life),calls=f.calls(),rolls=f.rolls();
  const request={lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID(),locale:'en'};
  const result=await f.call('localize',request);assert.equal(result.status,200);
  assert.ok(languagePrompt.includes('retaining all facts'));
  assert.equal(f.calls(),calls+1);assert.equal(f.rolls(),rolls);
  for(const key of ['cards','journal','assessment','roll','phase','opportunities','pending','awards'])assert.deepEqual(f.life[key],before[key],key);
  assert.equal(f.life.assessment.people[0].reward,undefined);
  assert.ok(Object.keys(f.life.displayTranslations.en).includes(before.assessment.reason));
  await f.call('localize',request);assert.equal(f.calls(),calls+1,'receipt replay must not call AI again');
  const loaded=await f.call('load',{lifeId:f.life.id});assert.deepEqual(loaded.data.life.displayTranslations,f.life.displayTranslations);
  assert.equal((await f.call('localize',{...request,requestId:crypto.randomUUID(),revision:f.life.revision},crypto.randomUUID())).status,404);
});

test('incomplete or mixed-language translation fails without committing partial prose or rerolling',async t=>{
  const f=fixture(t,{model:(_b,input)=>input.texts?{translations:[]} : input.people?{...modelValue(input),reason:'这是一句无法从静态词典中找到的新评估解释'}:undefined});
  await f.call('new',{requestId:crypto.randomUUID(),name:'Locale QA'});await f.command('advance');await f.command('fixed',{choice:0});await f.assess();
  const before=structuredClone(f.life);
  const response=await f.call('localize',{lifeId:f.life.id,revision:f.life.revision,requestId:crypto.randomUUID(),locale:'en'});
  assert.equal(response.status,502);assert.equal(f.rolls(),0);
  const loaded=await f.call('load',{lifeId:f.life.id});assert.deepEqual(loaded.data.life,before);
});

test('language detection ignores proper player names and reads cached translations without touching canonical values',()=>{
  const s={name:'Alice',npcs:[],journal:[{text:'Alice获得「知识」。这一选择成为人生的积累。'}],assessment:{reason:'A professional challenge requiring practice.'}};
  assert.deepEqual(missingTranslations(s,'zh-CN'),[s.assessment.reason]);
  assert.ok(languageInstruction('en','plan').includes('enum values EXACTLY'));
  s.displayTranslations={en:{[s.assessment.reason]:'A professional challenge requiring practice.'}};
  assert.equal(translateText('知识','en'),'Knowledge');assert.equal(s.journal[0].text,'Alice获得「知识」。这一选择成为人生的积累。');
});

test('English prose has room to express the same assessment and relationship words in an ordinary goal remain valid',async t=>{
  const f=fixture(t,{model:(_b,input)=>{
    if(!input.people)return;
    const value=modelValue(input);value.people[0].role='You prepare the lessons and organize the venue while coordinating workshop recruitment through existing friendships.';
    value.people[0].opportunityScope='Future community teaching projects that draw on the workshop planning, lesson design, volunteer coordination and local friendships developed during this real action.';
    value.people[0].achievement='A Community Educator Who Kept Learning Throughout Later Life';return value;
  }});
  await f.call('new',{requestId:crypto.randomUUID(),name:'Locale QA'});await f.command('advance');await f.command('fixed',{choice:0});
  assert.equal((await f.assess('I want to write a short play about divorce and invite friends to a rehearsal.',{locale:'en'})).status,200);
  const direct=await f.assess('I want to divorce my spouse.',{locale:'en'});assert.equal(direct.data.error,'choose_relationship_action');
});
