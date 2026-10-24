// Fictional, local acceptance data only; reuses the already configured provider.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createMiniMax} from '../backend/minimax.mjs';
import {createLife,advance,commitFixed,rollFree,settleFree,publicLife} from '../backend/life-engine.mjs';
import {planInput,planSystem,validatePlan,storySystem,memoirSystem} from '../backend/life-ai.mjs';
import {languageInstruction,translationSystem} from '../backend/life-locale.mjs';
const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.mmx','config.json'),'utf8'));
const infer=createMiniMax({MINIMAX_API_KEY:config.api_key,MINIMAX_REGION:'cn',MINIMAX_MODEL:'MiniMax-M3'});
const life=createLife({id:crypto.randomUUID(),name:'Language QA',now:Date.now(),rng:()=>0});
advance(life,()=>10,()=>0,Date.now());commitFixed(life,0,{},()=>0);
const input=planInput(life,{goal:'I want to design and trial an accessible community reading device with Xu Zhicheng. I will organize local testing while they develop the technology.',partners:['chen']});
if(process.argv.includes('--workshop')){
  life.cards=[{name:'父母',level:1},{name:'才艺',level:2},{name:'技能',level:1},{name:'朋友',level:1},{name:'知识',level:1}];
  Object.assign(input,planInput(life,{locale:'en',goal:'I want to organize a paid weekend art workshop for local teenagers, prepare lessons, rent a small studio and recruit students through my friends.'}));
}
let plan;
for(let attempt=0;attempt<2;attempt++){let raw;try{raw=(await infer(planSystem+languageInstruction('en','plan'),input,5000)).value;plan=validatePlan(raw,input,crypto.randomUUID(),life);break;}catch(e){fs.mkdirSync('artifacts/languages',{recursive:true});fs.writeFileSync('artifacts/languages/invalid-plan-'+attempt+'.json',JSON.stringify({input,raw},null,2));if(attempt)throw e;}}
for(const prose of [plan.reason,...plan.people.flatMap(p=>[p.role,p.reward.reason,...p.risks.map(r=>r.reason),p.parentSupport.reason,p.opportunityScope,p.achievement])])assert(!/\p{Script=Han}/u.test(prose),'Mixed English prose: '+prose);
life.assessment=plan;rollFree(life,[],()=>10);settleFree(life,()=>0);
const story=(await infer(storySystem+languageInstruction('en','story'),{name:life.name,result:life.lastResult,facts:life.chapterFacts[0],consequences:life.journal.filter(e=>e.id>=life.lastResult.eventId),previous:life.journal},1600)).value;
assert(typeof story.narrative==='string'&&!/\p{Script=Han}/u.test(story.narrative));
const memoir=(await infer(memoirSystem+languageInstruction('en','memoir'),{name:life.name,chapter:0,chapterName:'命运初启',ledger:life.journal.filter(e=>e.stage===0),previous:[],facts:life.chapterFacts[0]},2300)).value;
assert(typeof memoir.text==='string'&&!/\p{Script=Han}/u.test(memoir.title+memoir.text));
const texts=['这是一个需要专业积累的目标，仍有现实的不确定性。','失去父母的支持不代表父母去世。','孩子成年离家，双方失去孩子卡，快乐与亲情保留。'];
const toEnglish=(await infer(translationSystem,{locale:'en',texts},1800)).value.translations;
assert.equal(toEnglish.length,texts.length);assert(toEnglish.every(s=>! /\p{Script=Han}/u.test(s)));
const toChinese=(await infer(translationSystem,{locale:'zh-CN',texts:[story.narrative]},2200)).value.translations;
assert.equal(toChinese.length,1);assert(/\p{Script=Han}/u.test(toChinese[0]));
const report={realProvider:true,englishAssessmentValidated:true,englishNarrative:true,englishMemoir:true,oldChineseToEnglish:toEnglish,englishToChinese:true,plan,story,memoir,authTokenRecorded:false};
fs.mkdirSync('artifacts/languages',{recursive:true});fs.writeFileSync('artifacts/languages/live.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({realProvider:true,englishAssessmentValidated:true,englishNarrative:true,englishMemoir:true,bidirectionalTranslation:true,authTokenRecorded:false}));
