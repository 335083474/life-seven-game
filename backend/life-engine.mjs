import {cards, tiers, verdict} from './rules.mjs';
import {rounds, chapters, fixedEvent, swans,childAge} from './events.mjs';
import {find, remove, receive, healthLeft, healthProtection} from './inventory.mjs';
import {TEST_RULESET,rulesFor} from './settings.mjs';
import {npcPlans,npcMatchReason,npcRiskReason} from './npc-plans.mjs';

export const RULE_VERSION = TEST_RULESET.version;
export const reject = (code, status = 409) => { throw Object.assign(Error(code), {status}); };
const special = ['父母','家庭','孩子'];
export const ordinary = cards.filter(name => !special.includes(name));
const titles = {'梦想':'一生所向','知识':'穷理求真','勇气':'长风未歇','健康':'生命韧性','快乐':'温柔之光','自由':'旷野来信','财富':'岁月所积','技能':'百炼之艺','才艺':'心有繁花','朋友':'同行之人','爱情':'心之归处','智慧':'明辨春秋','沉稳':'静水流深','毅力':'百折不回','幽默':'笑对浮生','善良':'长存善意','修养':'岁月从容','地位':'立身之处','权力':'责任之重','尊重':'众望所归','名气':'人间回响','人脉':'千里相逢','阅历':'山海入怀','信仰':'心有所守','颜值':'风华入画'};
const summary = {gained:'获得',upgraded:'精进',retained:'保留'};
export const person = (life, id = 'self') => id === 'self' ? life : life.npcs.find(n => n.id === id) || reject('invalid_person',400);
export const spouseOf = (life, id = 'self') => life.married && (id === 'self' ? person(life,life.spouseId) : id === life.spouseId ? life : null);
const pick = (array, rng) => array.length ? array[rng(array.length)] : null;
export function note(life, type, text, facts = {}) {
  const event = {id:life.journal.length+1, round:life.round, stage:rounds[life.round]?.stage || (life.round < 0 ? 0 : 6), age:rounds[life.round]?.age || 7, type,text,...facts};
  life.journal.push(event); return event;
}
function captureChapterFacts(life,stage) {
  life.chapterFacts||={};
  life.chapterFacts[stage]={age:rounds[life.round]?.age||7,parentsAlive:life.parentsAlive,married:life.married,spouse:life.married?person(life,life.spouseId).name:null,child:structuredClone(life.child),career:life.career,people:life.npcs.map(n=>({id:n.id,name:n.name,age:n.age,path:n.path,career:n.career,parentsAlive:n.parentsAlive})),cards:structuredClone(life.cards),achievements:structuredClone(life.achievements),collection:structuredClone(life.collection),...(stage===6&&life.ending?{ending:structuredClone(life.ending)}:{})};
}
export function createLife({id, name, now, rng}) {
  const pool = [...ordinary];
  const life = {id,version:RULE_VERSION,rulesSnapshot:structuredClone(TEST_RULESET),revision:0,name,round:-1,phase:'draw',cards:[{name:'父母',level:1}],path:null,parentsAlive:true,married:false,spouseId:null,formerSpouses:[],marriages:[],child:null,npcs:[],journal:[],opportunities:[],achievements:[],collection:[],awards:[],pending:null,assessment:null,roll:null,lastResult:null,biography:null,endedAt:null,createdAt:now,expires:now+TEST_RULESET.activeRetentionDays*86400000};
  for(let i=0;i<3;i++) receive(life,pool.splice(rng(pool.length),1)[0]);
  const profiles = [
    ['chen','许知澄','喜欢钻研，也珍惜安稳的生活。',['知识','技能','健康']],
    ['he','林予禾','关心人与人的联系，愿意尝试公益和创作。',['人脉','快乐','才艺']],
    ['ye','周行野','喜欢远方与新事业，敢于承担风险。',['勇气','财富','阅历']]
  ];
  life.npcs = profiles.map(([id,name,profile,names])=>({id,name,profile,age:7,path:null,parentsAlive:true,healthTierCap:TEST_RULESET.healthTierCap,cards:[{name:'父母',level:1},...names.map(name=>({name,level:1,...(name==='健康'?{spent:0}:{})}))],opportunities:[],usedRound:-1,known:false}));
  note(life,'命运初启',`七岁，${name}拥有父母的庇护，又得到${life.cards.slice(1).map(c=>'「'+c.name+'」').join('、')}。`,{gains:life.cards.map(c=>c.name)});
  captureChapterFacts(life,0);
  return life;
}
function rememberCollection(life, p, name) {
  if(p!==life || find(p,name)?.level!==3 || life.collection.some(c=>c.name===name))return;
  const entry = {name,title:titles[name]||'岁月之证',eventId:life.journal.length,round:life.round};
  life.collection.push(entry); note(life,'典藏成就',`「${name}Ⅲ · ${entry.title}」成为此生的典藏。能力与Ⅱ级相同，并不代表行动目标已经实现。`,{collection:entry});
}
export function grant(life, id, name, reason, {ensure=false, required=false}={}) {
  if(!cards.includes(name))reject('invalid_card',400);
  const p = person(life,id), result=receive(p,name,{ensure:ensure||special.includes(name)});
  if(result.kind==='overflow') {
    if(id==='self') life.awards.push({name,reason,required});
    else {
      // NPC makes its own resource choice; protect the family and a child's joy.
      const candidates=p.cards.filter(c=>!['家庭','孩子',...(life.child?['快乐']:[])].includes(c.name));
      const old=candidates.find(c=>c.name!=='健康')||candidates[0];
      if(old){remove(p,old.name);receive(p,name);note(life,'同行者取舍',`${p.name}为「${name}」放下「${old.name}」。`,{personId:id,gained:name,lost:old.name});}
    }
  } else if(result.kind!=='retained') {
    note(life,id==='self'?'元素变化':'同行者成长',`${p.name}${summary[result.kind]}「${name}${result.level>1?' · '+['','Ⅰ','Ⅱ','Ⅲ'][result.level]:''}」。${reason}`,{personId:id,change:result});
    rememberCollection(life,p,name);
  }
}
function lose(life,id,name,reason,{chain=true}={}) {
  const p=person(life,id),card=remove(p,name);if(!card)return;
  note(life,'元素失去',`${p.name}失去「${name}」。${reason}${name==='父母'?'这代表支持耗尽，不表示父母去世。':''}${name==='孩子'?'孩子仍然健在，亲子关系仍然存在。':''}`,{personId:id,lost:name,reason});
  if(name==='家庭'&&life.married&&chain) divorce(life,reason,()=>0,{alreadyLost:id});
}
function replaceable(life,name) {
  if(name==='家庭'&&life.married)return false;
  if(life.awards.some(a=>a.required&&a.name==='孩子')&&name==='快乐')return false;
  return true;
}
export function chooseAward(life, discard) {
  const award=life.awards[0];if(!award)reject('nothing_pending');
  if(discard===null){if(award.required)reject('required_award');note(life,'人生取舍',`你放弃了「${award.name}」的获得机会，保留原有元素。`);life.awards.shift();return;}
  if(!find(life,discard)||!replaceable(life,discard))reject('invalid_discard',400);
  remove(life,discard);life.awards.shift();receive(life,award.name);
  note(life,'人生取舍',`为留下「${award.name}」，你放下「${discard}」。${discard==='父母'?'父母仍然健在，只是这份庇护不再计入所持资源。':''}`,{gained:award.name,lost:discard});
}
export function marry(life,targetId,sacrifice) {
  if(life.married||rounds[life.round].age<18)reject('marriage_unavailable');
  const other=person(life,targetId); if(other===life)reject('invalid_person',400);
  const ownLove=find(life,'爱情');
  if(!ownLove&&(!sacrifice||special.includes(sacrifice)||!find(life,sacrifice)))reject('marriage_sacrifice_required',400);
  const npcSacrifice=find(other,'爱情')?.name||other.cards.find(c=>!special.includes(c.name))?.name;
  if(!npcSacrifice)reject('npc_declined');
  const ownCost=ownLove?'爱情':sacrifice;
  remove(life,ownCost);remove(other,npcSacrifice);
  note(life,'婚姻取舍',`你把「${ownCost}」转换为家庭；${other.name}把「${npcSacrifice}」转换为家庭。`,{costs:[{personId:'self',name:ownCost},{personId:targetId,name:npcSacrifice}]});
  life.married=true;life.spouseId=targetId;other.known=true;
  life.marriages||=[];const marriage={id:crypto.randomUUID(),spouseId:targetId,startedRound:life.round,endedRound:null,healthSharing:true,consent:{self:true,[targetId]:'system-character'}};life.marriages.push(marriage);life.marriageId=marriage.id;
  grant(life,'self','家庭','你们决定共同生活。',{ensure:true,required:true});grant(life,targetId,'家庭','你们决定共同生活。',{ensure:true});
  note(life,'婚姻',`你与${other.name}${life.formerSpouses.includes(targetId)?'复婚':'结婚'}。各自保有手牌，健康保护自动共享，先用自己的次数。双方也可以借用资源、赠送与交换元素。`,{relation:'married',targetId,marriage:structuredClone(marriage)});
}
export function birth(life) {
  if(!life.married||life.child)reject('birth_unavailable');
  life.child={id:life.id+':child',name:'小禾',bornAge:rounds[life.round].age,parents:['self',life.spouseId],custody:'joint',independent:false,alive:true};
  for(const id of life.child.parents){grant(life,id,'快乐','迎接孩子时的共同获得。',{ensure:true,required:true});grant(life,id,'孩子','同一个孩子，各自承担养育。',{ensure:true,required:true});}
  note(life,'生育',`你们迎接了同一个孩子「${life.child.name}」，双方获得孩子，已有快乐则保留、没有则获得。之后两张卡独立变化。`,{child:structuredClone(life.child)});
}
export function divorce(life,reason,rng,{alreadyLost=null}={}) {
  if(!life.married)reject('not_married');
  const other=spouseOf(life),otherId=other.id;
  const marriage=life.marriages?.find(m=>m.id===life.marriageId);if(marriage)marriage.endedRound=life.round;
  life.married=false;life.spouseId=null;if(!life.formerSpouses.includes(otherId))life.formerSpouses.push(otherId);
  for(const id of ['self',otherId]){
    const p=person(life,id);remove(p,'家庭');
    const target=pick(p.cards.filter(c=>!['孩子','家庭'].includes(c.name)),rng);
    if(target)lose(life,id,target.name,'婚姻结束后的随机代价。',{chain:false});
  }
  if(life.child?.parents.includes(otherId)&&!life.child.independent){
    const a=Boolean(find(life,'快乐')),b=Boolean(find(other,'快乐'));
    life.child.custody=a===b?'joint':a?'self':otherId;
    if(life.child.custody!=='joint')lose(life,a?otherId:'self','孩子','孩子由另一位家长主要抚养。',{chain:false});
  }
  note(life,'离婚',`你与${other.name}结束婚姻。双方失去家庭，并各随机失去一张合法元素（不抽孩子）。${life.child?'抚养安排：'+(life.child.custody==='joint'?'共同抚养':life.child.custody==='self'?'由你主要抚养':'由另一位家长主要抚养')+'。孩子仍然健在，快乐不自动连锁失去。':''}${reason}`,{relation:'divorced',targetId:otherId,alreadyLost,marriageId:life.marriageId,child:structuredClone(life.child)});
  life.marriageId=null;
}
export function commitFixed(life,choice,options,rng) {
  if(life.phase!=='fixed')reject('wrong_phase');
  const event=fixedEvent(life),selected=event.choices[choice];if(!selected)reject('invalid_choice',400);
  note(life,'固定事件',`在「${event.title}」中，你选择「${selected[0]}」。`,{fixedId:event.id,choice:selected[0]});
  if(event.id==='school')life.path=selected[0];
  if(event.id==='career')life.career=selected[0];
  if(selected[2])grant(life,'self',selected[2],'这一选择成为人生的积累。');
  if(event.id==='marriage'){
    if(life.married){if(choice===1)divorce(life,'你选择结束婚姻。',rng);}
    else if(choice===0)marry(life,options.targetId,options.sacrifice);
    else if(choice===1)note(life,'未完的心愿','你选择等待真爱。相遇尚未发生，可以在后续自由事件中主动追求。',{promise:'等待真爱'});
  }
  if(event.id==='birth'&&!life.child&&life.married&&choice===0)birth(life);
  if(event.id==='parents'&&life.parentsAlive){
    life.parentsAlive=false;remove(life,'父母');for(const n of life.npcs){n.parentsAlive=false;remove(n,'父母');}
    note(life,'亲人离世','父母在晚年离世。无论此前庇护是否耗尽，这次都记为真实离世，不重复扣除已失去的父母卡。',{parentsAlive:false});
  }
  if(life.child&&!life.child.independent&&childAge(life)>=rulesFor(life).adultAge){
    life.child.independent=true;life.child.custody='independent';
    for(const id of life.child.parents)remove(person(life,id),'孩子');
    note(life,'孩子独立',`「${life.child.name}」成年后离开身边。双方失去各自仍持有的孩子卡，保留快乐。亲情仍在，孩子没有去世。`,{child:structuredClone(life.child),childAge:childAge(life)});
  }
  // NPCs develop on the same clock. No extra model calls or imaginary people.
  life.npcs.forEach((n,i)=>{
    n.usedRound=-1;n.age=rounds[life.round].age;
    if(selected[2]){
      const ownEvent=event.id==='youth'?fixedEvent({...life,path:n.path}):event,ownChoice=ownEvent.choices[(i+life.round)%ownEvent.choices.length];
      if(event.id==='school')n.path=ownChoice[0];if(event.id==='career')n.career=ownChoice[0];
      note(life,'同行者固定事件',`${n.name}选择「${ownChoice[0]}」。`,{personId:n.id,fixedId:ownEvent.id,choice:ownChoice[0]});
      if(ownChoice[2])grant(life,n.id,ownChoice[2],'同行者也在这一时期作出自己的选择。');
    }
  });
  life.phase='free';life.assessment=null;life.roll=null;life.lastResult=null;life.actionLock=null;
}
export function probability(plan, selections) {
  const rules=rulesFor(plan),[base,factor]=rules.difficultyTable[plan.difficulty];const parts=[];const seen=new Set();
  for(const p of plan.people){
    const chosen=selections[p.id]||[];if(chosen.length>rules.cardsPerParticipant)reject('too_many_cards',400);
    for(const key of chosen){
      const c=p.matches.find(m=>m.key===key);if(!c||seen.has(key))reject('invalid_selection',400);seen.add(key);
      parts.push({...c,personId:p.id,value:rules.matchPoints[c.kind]*Math.min(c.level,2)});
    }
  }
  const groups={};for(const p of parts)(groups[p.name]||=[]).push(p.value);
  const raw=Object.values(groups).reduce((s,values)=>s+values.sort((a,b)=>b-a).reduce((x,v,i)=>x+v*rules.sameNameFactors[Math.min(i,rules.sameNameFactors.length-1)],0),0);
  const bonus=Math.round(Math.min(rules.maxElementContribution,raw)*factor*10)/10,teamwork=(plan.people.length-1)*rules.teamBonus;
  const exact=Math.min(rules.maxSuccessRate,base+bonus+teamwork),probability=Math.round(exact);
  const distribution={'大成功':0,'成功':0,'普通失败':0,'大失败':0};for(let d=1;d<=100;d++)distribution[verdict(d,probability)]++;
  return {difficulty:plan.difficulty,base,factor,bonus,teamwork,raw,exact,probability,fumble:distribution['大失败'],distribution,ruleVersion:rules.version,contributionCap:rules.maxElementContribution,maxSuccessRate:rules.maxSuccessRate,parts};
}
export function defaultSelections(plan,own=[]) {
  const points=rulesFor(plan).matchPoints,limit=rulesFor(plan).cardsPerParticipant;
  const selections={self:own},used=new Set(own);
  for(const p of plan.people.filter(p=>p.id!=='self')){
    selections[p.id]=p.matches.filter(m=>!used.has(m.key)).sort((a,b)=>points[b.kind]*Math.min(b.level,2)-points[a.kind]*Math.min(a.level,2)).slice(0,limit).map(m=>m.key);
    selections[p.id].forEach(k=>used.add(k));
  }
  return selections;
}
export function rollFree(life,selection,roll,lock=null) {
  if(life.phase!=='free'||!life.assessment||life.roll)reject('wrong_phase');
  const plan=life.assessment;const selections=defaultSelections(plan,selection);const calc=probability(plan,selections);
  if(lock)life.actionLock=lock;
  for(const p of plan.people)if(p.id!=='self')person(life,p.id).usedRound=life.round;
  life.roll={dice:roll(),reroll:null,calc,selections,settled:false,lockHash:lock?.hash||null};life.phase='rolled';
  note(life,'骰子落定',`行动「${plan.goal}」已锁定。D100=${life.roll.dice}，判定${verdict(life.roll.dice,calc.probability)}。尚未执行奖惩。`,{dice:life.roll.dice,assessmentId:plan.id,selection:selections,calculation:calc,lockHash:lock?.hash||null});
}
export function eligibleOpportunities(life) {
  if(!life.roll||life.roll.settled||life.roll.reroll!==null||!['普通失败','大失败'].includes(verdict(life.roll.dice,life.roll.calc.probability)))return [];
  return life.assessment.people.flatMap(p=>p.opportunities.map(o=>({...o,personId:p.id}))).filter(o=>(o.personId==='self'||o.willingToSpend===true)&&person(life,o.personId).opportunities.some(x=>x.id===o.id&&!x.used));
}
export function rerollFree(life,id,roll) {
  if(life.phase!=='rolled')reject('wrong_phase');
  const eligible=eligibleOpportunities(life).find(o=>o.id===id);if(!eligible)reject('opportunity_unavailable');
  const p=person(life,eligible.personId);p.opportunities.find(o=>o.id===id).used=true;
  life.roll.reroll=roll();
  note(life,'命运重掷',`${p.name}自愿使用源自过去大成功的机遇。第一次${life.roll.dice}，第二次${life.roll.reroll}，保留较好的${Math.min(life.roll.dice,life.roll.reroll)}。`,{opportunityId:id,first:life.roll.dice,second:life.roll.reroll,personId:eligible.personId,consent:eligible.personId==='self'?'player-confirmed':'system-character-confirmed'});
}
export function settleFree(life,rng) {
  if(life.phase!=='rolled'||life.roll.settled)reject('wrong_phase');
  const r=life.roll,plan=life.assessment,dice=Math.min(r.dice,r.reroll??101),outcome=verdict(dice,r.calc.probability);
  r.settled=true;life.lastResult={dice,firstDice:r.dice,reroll:r.reroll,outcome,goal:plan.goal,calc:r.calc,audit:structuredClone(plan),narrative:null,source:'rules'};
  if(life.actionLock)life.lastResult.lock={hash:life.actionLock.hash,createdAt:life.actionLock.createdAt,ruleVersion:life.actionLock.ruleVersion,selection:r.selections,calculation:r.calc};
  plan.people.forEach(p=>{if(p.id!=='self'){person(life,p.id).usedRound=life.round;person(life,p.id).known=true;}});
  const event=note(life,'自由事件',`行动「${plan.goal}」：${outcome}。D100=${dice}，成功率${r.calc.probability}%。`,{goal:plan.goal,outcome,dice,people:plan.people.map(p=>p.id),roles:plan.people.map(p=>({id:p.id,role:p.role})),riskType:plan.riskType,audit:structuredClone(plan),lockHash:r.lockHash});
  life.lastResult.eventId=event.id;
  if(['成功','大成功'].includes(outcome)){
    if(plan.action==='marry')marry(life,plan.targetId,plan.sacrifice);
    else if(plan.action==='divorce')divorce(life,'自由事件中作出离婚决定。',rng);
    else if(plan.action==='birth')birth(life);
    else for(const p of plan.people)grant(life,p.id,p.reward.name,p.reward.reason);
    if(outcome==='大成功')for(const p of plan.people){
      if(life.round===rounds.length-1){
        const achievement={title:p.achievement,goal:plan.goal,eventId:event.id,personId:p.id};
        life.achievements.push(achievement);note(life,'终局成就',`${person(life,p.id).name}获得「${p.achievement}」。这项成就不占卡位、不改变生存要求，即使终局死亡仍然保留。`,{achievement});
      } else {
        const opportunity={id:crypto.randomUUID(),source:plan.goal,scope:p.opportunityScope,fromRound:life.round,eventId:event.id,used:false};
        person(life,p.id).opportunities.push(opportunity);note(life,'人生机遇',`${person(life,p.id).name}从此次大成功中留下未来的机遇：${p.opportunityScope}。只可在之后相关自由事件首次失败后，自愿重掷一次。`,{opportunity});
      }
    }
  } else if(outcome==='大失败'){
    const weights=rulesFor(plan).lossWeights,eligible=plan.people.filter(p=>p.risks.length),weighted=eligible.flatMap(p=>Array(p.id==='self'?weights.self:weights.companion).fill(p));
    const bearer=pick(weighted,rng);if(!bearer)reject('no_legal_risk');
    const target=pick(bearer.risks,rng);
    life.pending={source:'free',targets:[{personId:bearer.id,name:target.name,reason:target.reason}],health:false,parentAllowed:bearer.parentSupport.allowed,parentReason:bearer.parentSupport.reason};
  }
  life.phase='free-result';
}
function actualLoss(life,target,rng) {
  const wasFamily=target.name==='家庭'&&life.married;
  if(wasFamily)divorce(life,target.reason,rng,{alreadyLost:target.personId});
  else lose(life,target.personId,target.name,target.reason,{chain:false});
}
export function resolveProtection(life,choice,rng) {
  const pending=life.pending;if(!pending)reject('nothing_pending');
  const target=pending.targets[0],owner=person(life,target.personId);
  if(choice==='health'){
    if(!pending.health||pending.source!=='swan')reject('protection_unavailable');
    const spouse=spouseOf(life,target.personId);
    const result=healthProtection(owner,spouse,{joint:pending.targets.length===2});
    if(!result.protected)reject('protection_unavailable');
    note(life,'健康保护',`${result.sharedLast?'劫后余生：夫妻用共同剩下的最后一次健康保护，抵挡同回合的两次符合条件失牌。':`${owner.name}使用健康保护，抵挡此次符合条件的失牌；健康卡保留。`}`,{protection:'health',...result});
  } else if(choice==='parents'){
    if(!pending.parentAllowed||(owner.parentsAlive??life.parentsAlive)===false||!find(owner,'父母')||target.name==='父母')reject('protection_unavailable');
    lose(life,target.personId,'父母','你主动接受父母的帮助，以支持耗尽代替原定失牌。',{chain:false});
    note(life,'父母代偿',`${owner.name}保住「${target.name}」。${pending.parentReason||'父母承担了这次代价。'}父母仍然健在，这不是死亡。`,{protected:target.name});
    for(const extra of pending.targets.slice(1))companionLoss(life,person(life,extra.personId),extra,rng);
  } else if(choice==='accept'){
    for(const t of pending.targets){if(t.personId==='self')actualLoss(life,t,rng);else companionLoss(life,person(life,t.personId),t,rng);}
    if(pending.childChain){
      for(const id of life.child?.parents||['self']){lose(life,id,'孩子','预先规定的重大亲子失联。',{chain:false});lose(life,id,'快乐','重大亲子事件的专项连锁。',{chain:false});}
      if(life.child)life.child.custody='separated';
    }
  } else reject('invalid_choice',400);
  life.pending=null;
}
function useHealth(life,owner,other,targets){
  const before=[owner,other].filter(Boolean).map(p=>({id:p===life?'self':p.id,spent:find(p,'健康')?.spent||0}));
  const result=healthProtection(owner,other,{joint:targets.length===2});if(!result.protected)return false;
  const charges=before.map(p=>({personId:p.id,spent:(find(person(life,p.id),'健康')?.spent||0)-p.spent})).filter(p=>p.spent);
  note(life,'健康保护',result.sharedLast?'劫后余生：夫妻用共同剩下的最后一次健康保护，抵挡同回合的两次符合条件失牌。':`${owner.name}依照共享约定使用健康保护，抵挡符合条件的失牌；健康卡保留。`,{protection:'health',...result,charges,protectedPeople:targets.map(t=>t.personId)});
  return true;
}
function companionAction(life,n,roll,rng){
  if(n.usedRound===life.round)return;
  const candidates=(npcPlans[n.id]||[]).filter(plan=>plan.risks.some(name=>find(n,name))),action=pick(candidates,rng);
  if(!action){n.usedRound=life.round;note(life,'同行者行动留白',`${n.name}没有发起本回合的独立行动。`,{personId:n.id,skipped:true});return;}
  const reward=action.reward,risks=action.risks.filter(name=>find(n,name));
  const plan={difficulty:'普通',rulesSnapshot:rulesFor(life),people:[{id:n.id,matches:n.cards.map(c=>({...c,key:n.id+':'+c.name,kind:c.name===reward?'高度匹配':risks.includes(c.name)?'一般匹配':'暂不匹配',reason:npcMatchReason}))}]};
  const selection=plan.people[0].matches.filter(m=>m.kind!=='暂不匹配').sort((a,b)=>rulesFor(life).matchPoints[b.kind]*Math.min(b.level,2)-rulesFor(life).matchPoints[a.kind]*Math.min(a.level,2)).slice(0,rulesFor(life).cardsPerParticipant).map(m=>m.key);
  const calculation=probability(plan,{[n.id]:selection}),d=roll(),out=verdict(d,calculation.probability);
  n.usedRound=life.round;
  const event=note(life,'同行者自由事件',`${n.name}尝试「${action.goal}」，D100=${d}，判定${out}。`,{personId:n.id,dice:d,outcome:out,goal:action.goal,prelockedRisks:risks.map(name=>({name,reason:npcRiskReason})),rewardCandidate:reward,probability:calculation.probability,calculation,selection,source:'authored-npc-plan-v1'});
  if(out==='成功'||out==='大成功')grant(life,n.id,reward,'同行者独自追求自己方向时的收获。');
  else if(out==='大失败'){const name=pick(risks,rng);if(name)lose(life,n.id,name,'同行者自己的行动遭遇重大挫折。',{chain:false});}
  if(out==='大成功'){
    if(life.round===rounds.length-1){const achievement={title:titles[reward]||'岁月之证',goal:action.goal,eventId:event.id,personId:n.id};life.achievements.push(achievement);note(life,'终局成就',`${n.name}获得「${achievement.title}」。`,{achievement});}
    else {const opportunity={id:crypto.randomUUID(),source:action.goal,scope:reward,fromRound:life.round,eventId:event.id,used:false};n.opportunities.push(opportunity);note(life,'人生机遇',`${n.name}留下与「${reward}」相关的未来机遇。`,{personId:n.id,opportunity});}
  }
}
function companionLoss(life,n,target,rng){
  if(!target||!find(n,target.name))return;
  if(target.name!=='父母'&&n.parentsAlive!==false&&find(n,'父母'))lose(life,n.id,'父母','同行者主动用父母庇护代偿，父母仍然健在。',{chain:false});
  else actualLoss(life,target,rng);
}
export function rollSwan(life,roll,rng) {
  if(life.phase!=='swan')reject('wrong_phase');
  const rules=rulesFor(life),dice=roll(),other=spouseOf(life);
  const table=swans.filter(s=>(!s.joint||life.married)&&(!s.childChain||(rules.childChainEnabled&&life.child&&!life.child.independent&&find(life,'孩子'))));
  const event=dice>rules.swanQuietThrough?pick(table,rng):null;
  const card=event?pick(event.childChain?life.cards.filter(c=>c.name==='孩子'):life.cards,rng):null;
  const ownTarget=card?{personId:'self',name:card.name,reason:event.text}:null;
  let jointCard=null,jointTarget=null;
  life.swan={dice,event,companionRolls:[],companionsResolved:true};
  // First collect each participant's complete round. Health is resolved only
  // after both spouses' swans are known, never by button/iteration order.
  for(const n of life.npcs){
    companionAction(life,n,roll,rng);
    const shared=Boolean(event?.joint&&other?.id===n.id),d=shared?dice:roll();
    const e=shared?event:d>rules.swanQuietThrough?pick(swans.filter(s=>!s.joint&&!s.childChain),rng):null;
    const c=e?pick(n.cards,rng):null;
    if(shared){jointCard=c;jointTarget=c?{personId:n.id,name:c.name,reason:e.text}:null;}
    life.swan.companionRolls.push({personId:n.id,dice:d,event:e,shared,target:c?{personId:n.id,name:c.name,reason:e.text}:null});
    note(life,'同行者黑天鹅',e?`${n.name}的D100=${d}，遭遇「${e.title}」。`:`${n.name}的D100=${d}，这一回合波澜未起。`,{personId:n.id,dice:d,swanId:e?.id||null,shared});
  }
  const spouseRoll=other?life.swan.companionRolls.find(r=>r.personId===other.id):null;
  const spouseTarget=spouseRoll?.target,protectedPeople=new Set();
  const pair=ownTarget&&event.health&&spouseTarget&&spouseRoll.event.health&&life.married;
  if(pair&&useHealth(life,life,other,[ownTarget,spouseTarget])){protectedPeople.add('self');protectedPeople.add(other.id);}
  else if(ownTarget&&event.health&&useHealth(life,life,other,[ownTarget]))protectedPeople.add('self');
  // Unrelated companions have no claim on this couple's charges.
  for(const r of life.swan.companionRolls){
    if(!r.target||protectedPeople.has(r.personId))continue;
    const n=person(life,r.personId);
    if(r.event.health&&useHealth(life,n,spouseOf(life,n.id),[r.target]))protectedPeople.add(r.personId);
  }
  if(ownTarget&&!protectedPeople.has('self'))life.pending={source:'swan',targets:[ownTarget,...(jointTarget&&!protectedPeople.has(jointTarget.personId)?[jointTarget]:[])],health:false,parentAllowed:life.parentsAlive,parentReason:'父母自愿替你承担这次命运的代价。',childChain:Boolean(event.childChain)};
  for(const r of life.swan.companionRolls){
    if(r.target&&!protectedPeople.has(r.personId)&&!r.shared)companionLoss(life,person(life,r.personId),r.target,rng);
  }
  note(life,'黑天鹅',event?`D100=${dice}，${event.title}。${event.text}${ownTarget?`本次原定失去「${ownTarget.name}」。`:'当前没有可以扣除的元素。'}`:`D100=${dice}。这一回合波澜未起，没有失牌或额外奖励。`,{dice,swanId:event?.id||null,healthEligible:Boolean(event?.health),protected:protectedPeople.has('self')});
  life.phase='round-end';
}
export function advance(life,roll,rng,now) {
  if(life.pending||life.awards.length)reject('pending_choice');
  if(life.phase==='draw'){life.round=0;life.phase='fixed';return;}
  if(life.phase==='free-result'){life.phase='swan';return;}
  if(life.phase!=='round-end')reject('wrong_phase');
  // Companions who did not cooperate use their one free action independently.
  for(const n of life.swan?.companionsResolved?[]:life.npcs){
    if(n.usedRound!==life.round){
      const d=roll(),out=verdict(d,53);
      const directions={chen:['知识','技能','智慧','健康'],he:['人脉','快乐','才艺','善良'],ye:['勇气','财富','阅历','毅力']};
      if(out==='成功'||out==='大成功')grant(life,n.id,pick(directions[n.id],rng),'同行者独自追求自己方向时的收获。');
      else if(out==='大失败'){const t=pick(n.cards.filter(c=>!special.includes(c.name)),rng);if(t)lose(life,n.id,t.name,'同行者自己的行动遭遇重大挫折。',{chain:false});}
    }
    const swanDice=roll();
    if(swanDice>65&&n.cards.length){
      const event=pick(swans.filter(s=>!s.joint&&!s.childChain),rng),target=pick(n.cards,rng);
      note(life,'同行者黑天鹅',`${n.name}的D100=${swanDice}，遭遇「${event.title}」。`,{personId:n.id,dice:swanDice,swanId:event.id});
      if(event.health&&healthProtection(n,spouseOf(life,n.id)).protected)note(life,'同行者健康保护',`${n.name}依照婚姻共享约定使用健康保护，抵挡此次符合条件的失牌。`,{personId:n.id});
      else if(target.name!=='父母'&&find(n,'父母'))lose(life,n.id,'父母','同行者主动用父母庇护代偿，父母仍然健在。',{chain:false});
      else actualLoss(life,{personId:n.id,name:target.name,reason:event.text},rng);
    }
  }
  if(life.round===rounds.length-1){
    life.phase='ending';life.endedAt=now;life.expires=now+rulesFor(life).endingRetentionHours*3600000;
    life.ending={survived:life.cards.length===7,count:life.cards.length,at:now};
    note(life,'终局',life.ending.survived?'七种不同的人生元素留存，你在终局存活。':'最终留下'+life.cards.length+'种人生元素，不足七种，按游戏规则判定死亡。',{ending:life.ending});
    captureChapterFacts(life,6);
  } else {captureChapterFacts(life,rounds[life.round].stage);life.round++;life.phase='fixed';life.assessment=null;life.roll=null;life.swan=null;}
}
export function transfer(life,{direction,name,exchange},rng) {
  if(!['give','take'].includes(direction))reject('invalid_request',400);
  if(!life.married||!['fixed','free'].includes(life.phase)||life.assessment||life.pending||life.awards.length)reject('transfer_unavailable');
  if(special.includes(name)||special.includes(exchange))reject('bound_card',400);
  const other=spouseOf(life),from=direction==='give'?life:other,to=direction==='give'?other:life;
  const card=find(from,name);if(!card)reject('invalid_card',400);
  if(exchange){if(!find(to,exchange)||exchange===name)reject('invalid_card',400);}
  if(!exchange&&!find(to,name)&&to.cards.length>=7)reject('recipient_full');
  // In single-player a companion agrees to a fair exchange or a spare resource,
  // and freely accepts gifts; it will not surrender its last resource or health.
  if(direction==='take'&&!exchange&&(other.cards.length<=4||name==='健康'))reject('npc_declined');
  const returned=exchange?remove(to,exchange):null;remove(from,name);
  const add=(p,c)=>{
    const existing=find(p,c.name);
    if(existing){const oldLevel=existing.level,oldSpent=existing.spent;existing.level=Math.min(3,Math.max(existing.level,c.level)+1);if(c.name==='健康'){const remaining=Math.max(0,Math.min(2,oldLevel)-(oldSpent||0))+Math.max(0,Math.min(2,c.level)-(c.spent||0));existing.spent=Math.max(0,Math.min(2,existing.level)-remaining);}}
    else p.cards.push(c);rememberCollection(life,p,c.name);
  };
  add(to,card);if(returned)add(from,returned);
  note(life,'夫妻资源',`${from.name}向${to.name}${exchange?'交换':'赠送'}「${name}」${exchange?'，换回「'+exchange+'」':''}。转移保留原等级与已用健康次数，不是重新获得。`,{from:from===life?'self':from.id,to:to===life?'self':to.id,name,exchange:exchange||null});
}
export function publicLife(life) {
  const out=structuredClone(life);
  if(out.assessment){
    out.assessment={id:out.assessment.id,goal:out.assessment.goal,difficulty:out.assessment.difficulty,reason:out.assessment.reason,riskType:out.assessment.riskType,people:out.assessment.people.map(p=>({id:p.id,role:p.role,matches:p.matches,opportunities:p.opportunities})),action:out.assessment.action,targetId:out.assessment.targetId,rulesSnapshot:out.assessment.rulesSnapshot||out.rulesSnapshot,ruleVersion:out.assessment.ruleVersion,aiMeta:out.assessment.aiMeta};
  }
  if(out.actionLock)delete out.actionLock.snapshot;
  out.roundCount=rounds.length;out.childAge=childAge(life);out.fixed=fixedEvent(life);
  if(out.fixed)out.fixed.choices=out.fixed.choices.map(c=>c.slice(0,2));
  out.chapter=life.round<0?0:rounds[life.round].stage;
  out.chapterName=chapters[out.chapter][0];out.age=life.round<0?7:rounds[life.round].age;
  out.health=healthLeft(life);out.npcs.forEach(n=>n.health=healthLeft(n));out.eligibleOpportunities=eligibleOpportunities(life);
  out.canDiscard=life.cards.filter(c=>replaceable(life,c.name)).map(c=>c.name);
  const ownHealth=healthLeft(life),otherHealth=spouseOf(life)?healthLeft(spouseOf(life)):0;
  out.protection=life.pending?{health:life.pending.health&&ownHealth+otherHealth>0,parents:life.pending.parentAllowed&&(person(life,life.pending.targets[0].personId).parentsAlive??life.parentsAlive)!==false&&Boolean(find(person(life,life.pending.targets[0].personId),'父母'))&&life.pending.targets[0].name!=='父母'}:null;
  return out;
}
