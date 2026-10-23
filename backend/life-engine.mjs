import {cards, tiers, verdict} from './rules.mjs';
import {rounds, chapters, fixedEvent, swans} from './events.mjs';
import {find, remove, receive, healthLeft, healthProtection} from './inventory.mjs';

export const RULE_VERSION = 'solo-1.0-test';
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
  life.chapterFacts[stage]={age:rounds[life.round]?.age||7,parentsAlive:life.parentsAlive,married:life.married,spouse:life.married?person(life,life.spouseId).name:null,child:structuredClone(life.child),cards:structuredClone(life.cards),achievements:structuredClone(life.achievements),collection:structuredClone(life.collection),...(stage===6&&life.ending?{ending:structuredClone(life.ending)}:{})};
}
export function createLife({id, name, now, rng}) {
  const pool = [...ordinary];
  const life = {id,version:RULE_VERSION,revision:0,name,round:-1,phase:'draw',cards:[{name:'父母',level:1}],path:null,parentsAlive:true,married:false,spouseId:null,formerSpouses:[],child:null,npcs:[],journal:[],opportunities:[],achievements:[],collection:[],awards:[],pending:null,assessment:null,roll:null,lastResult:null,biography:null,endedAt:null,createdAt:now,expires:now+30*86400000};
  for(let i=0;i<3;i++) receive(life,pool.splice(rng(pool.length),1)[0]);
  const profiles = [
    ['chen','许知澄','喜欢钻研，也珍惜安稳的生活。',['知识','技能','健康']],
    ['he','林予禾','关心人与人的联系，愿意尝试公益和创作。',['人脉','快乐','才艺']],
    ['ye','周行野','喜欢远方与新事业，敢于承担风险。',['勇气','财富','阅历']]
  ];
  life.npcs = profiles.map(([id,name,profile,names])=>({id,name,profile,cards:[{name:'父母',level:1},...names.map(name=>({name,level:1,...(name==='健康'?{spent:0}:{})}))],opportunities:[],usedRound:-1,known:false}));
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
  grant(life,'self','家庭','你们决定共同生活。',{ensure:true,required:true});grant(life,targetId,'家庭','你们决定共同生活。',{ensure:true});
  note(life,'婚姻',`你与${other.name}${life.formerSpouses.includes(targetId)?'复婚':'结婚'}。各自保有手牌，健康保护自动共享，先用自己的次数。双方也可以借用资源、赠送与交换元素。`,{relation:'married',targetId});
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
  note(life,'离婚',`你与${other.name}结束婚姻。双方失去家庭，并各随机失去一张合法元素（不抽孩子）。${life.child?'抚养安排：'+(life.child.custody==='joint'?'共同抚养':life.child.custody==='self'?'由你主要抚养':'由另一位家长主要抚养')+'。孩子仍然健在，快乐不自动连锁失去。':''}${reason}`,{relation:'divorced',targetId:otherId,alreadyLost});
}
export function commitFixed(life,choice,options,rng) {
  if(life.phase!=='fixed')reject('wrong_phase');
  const event=fixedEvent(life),selected=event.choices[choice];if(!selected)reject('invalid_choice',400);
  note(life,'固定事件',`在「${event.title}」中，你选择「${selected[0]}」。`,{fixedId:event.id,choice:selected[0]});
  if(event.id==='school')life.path=selected[0];
  if(selected[2])grant(life,'self',selected[2],'这一选择成为人生的积累。');
  if(event.id==='marriage'){
    if(life.married){if(choice===1)divorce(life,'你选择结束婚姻。',rng);}
    else if(choice===0)marry(life,options.targetId,options.sacrifice);
    else if(choice===1)note(life,'未完的心愿','你选择等待真爱。相遇尚未发生，可以在后续自由事件中主动追求。',{promise:'等待真爱'});
  }
  if(event.id==='birth'&&!life.child&&life.married&&choice===0)birth(life);
  if(event.id==='parents'){
    life.parentsAlive=false;remove(life,'父母');for(const n of life.npcs)remove(n,'父母');
    note(life,'亲人离世','父母在晚年离世。无论此前庇护是否耗尽，这次都记为真实离世，不重复扣除已失去的父母卡。',{parentsAlive:false});
  }
  if(event.id==='independence'&&life.child&&!life.child.independent){
    life.child.independent=true;life.child.custody='independent';
    for(const id of life.child.parents)remove(person(life,id),'孩子');
    note(life,'孩子独立',`「${life.child.name}」成年后离开身边。双方失去各自仍持有的孩子卡，保留快乐。亲情仍在，孩子没有去世。`,{child:structuredClone(life.child)});
  }
  // NPCs develop on the same clock. No extra model calls or imaginary people.
  life.npcs.forEach((n,i)=>{
    n.usedRound=-1;
    if(selected[2])grant(life,n.id,event.choices[(i+life.round)%event.choices.length][2]||selected[2],'同行者也在这一时期作出自己的选择。');
  });
  life.phase='free';life.assessment=null;life.roll=null;life.lastResult=null;
}
export function probability(plan, selections) {
  const [base,factor]=tiers[plan.difficulty];const parts=[];const seen=new Set();
  for(const p of plan.people){
    const chosen=selections[p.id]||[];if(chosen.length>2)reject('too_many_cards',400);
    for(const key of chosen){
      const c=p.matches.find(m=>m.key===key);if(!c||seen.has(key))reject('invalid_selection',400);seen.add(key);
      parts.push({...c,personId:p.id,value:({'高度匹配':8,'一般匹配':4,'暂不匹配':0}[c.kind])*Math.min(c.level,2)});
    }
  }
  const groups={};for(const p of parts)(groups[p.name]||=[]).push(p.value);
  const raw=Object.values(groups).reduce((s,values)=>s+values.sort((a,b)=>b-a).reduce((x,v,i)=>x+v*[1,.5,.25][Math.min(i,2)],0),0);
  const bonus=Math.round(Math.min(24,raw)*factor*10)/10,teamwork=(plan.people.length-1)*3;
  const exact=Math.min(90,base+bonus+teamwork),probability=Math.round(exact);
  return {difficulty:plan.difficulty,base,factor,bonus,teamwork,raw,exact,probability,fumble:probability<50?5:1,parts};
}
export function defaultSelections(plan,own=[]) {
  const selections={self:own},used=new Set(own);
  for(const p of plan.people.filter(p=>p.id!=='self')){
    selections[p.id]=p.matches.filter(m=>!used.has(m.key)).sort((a,b)=>({'高度匹配':8,'一般匹配':4,'暂不匹配':0}[b.kind])*Math.min(b.level,2)-({'高度匹配':8,'一般匹配':4,'暂不匹配':0}[a.kind])*Math.min(a.level,2)).slice(0,2).map(m=>m.key);
    selections[p.id].forEach(k=>used.add(k));
  }
  return selections;
}
export function rollFree(life,selection,roll) {
  if(life.phase!=='free'||!life.assessment||life.roll)reject('wrong_phase');
  const plan=life.assessment;const selections=defaultSelections(plan,selection);const calc=probability(plan,selections);
  life.roll={dice:roll(),reroll:null,calc,selections,settled:false};life.phase='rolled';
  note(life,'骰子落定',`行动「${plan.goal}」已锁定。D100=${life.roll.dice}，判定${verdict(life.roll.dice,calc.probability)}。尚未执行奖惩。`,{dice:life.roll.dice,assessmentId:plan.id});
}
export function eligibleOpportunities(life) {
  if(!life.roll||life.roll.settled||life.roll.reroll!==null||!['普通失败','大失败'].includes(verdict(life.roll.dice,life.roll.calc.probability)))return [];
  return life.assessment.people.flatMap(p=>p.opportunities.map(o=>({...o,personId:p.id}))).filter(o=>person(life,o.personId).opportunities.some(x=>x.id===o.id&&!x.used));
}
export function rerollFree(life,id,roll) {
  if(life.phase!=='rolled')reject('wrong_phase');
  const eligible=eligibleOpportunities(life).find(o=>o.id===id);if(!eligible)reject('opportunity_unavailable');
  const p=person(life,eligible.personId);p.opportunities.find(o=>o.id===id).used=true;
  life.roll.reroll=roll();
  note(life,'命运重掷',`${p.name}自愿使用源自过去大成功的机遇。第一次${life.roll.dice}，第二次${life.roll.reroll}，保留较好的${Math.min(life.roll.dice,life.roll.reroll)}。`,{opportunityId:id,first:life.roll.dice,second:life.roll.reroll});
}
export function settleFree(life,rng) {
  if(life.phase!=='rolled'||life.roll.settled)reject('wrong_phase');
  const r=life.roll,plan=life.assessment,dice=Math.min(r.dice,r.reroll??101),outcome=verdict(dice,r.calc.probability);
  r.settled=true;life.lastResult={dice,firstDice:r.dice,reroll:r.reroll,outcome,goal:plan.goal,calc:r.calc,audit:structuredClone(plan),narrative:null,source:'rules'};
  plan.people.forEach(p=>{if(p.id!=='self'){person(life,p.id).usedRound=life.round;person(life,p.id).known=true;}});
  const event=note(life,'自由事件',`行动「${plan.goal}」：${outcome}。D100=${dice}，成功率${r.calc.probability}%。`,{goal:plan.goal,outcome,dice,people:plan.people.map(p=>p.id),riskType:plan.riskType,audit:structuredClone(plan)});
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
    const eligible=plan.people.filter(p=>p.risks.length),weighted=eligible.flatMap(p=>Array(p.id==='self'?3:1).fill(p));
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
    if(!pending.health)reject('protection_unavailable');
    const spouse=spouseOf(life,target.personId);
    const result=healthProtection(owner,spouse,{joint:pending.targets.length===2});
    if(!result.protected)reject('protection_unavailable');
    note(life,'健康保护',`${result.sharedLast?'劫后余生：夫妻用共同剩下的最后一次健康保护，抵挡同回合的两次符合条件失牌。':`${owner.name}使用健康保护，抵挡此次符合条件的失牌；健康卡保留。`}`,{protection:'health',...result});
  } else if(choice==='parents'){
    if(!pending.parentAllowed||!find(owner,'父母')||target.name==='父母')reject('protection_unavailable');
    lose(life,target.personId,'父母','你主动接受父母的帮助，以支持耗尽代替原定失牌。',{chain:false});
    note(life,'父母代偿',`${owner.name}保住「${target.name}」。${pending.parentReason||'父母承担了这次代价。'}父母仍然健在，这不是死亡。`,{protected:target.name});
    for(const extra of pending.targets.slice(1))actualLoss(life,extra,rng);
  } else if(choice==='accept'){
    for(const t of pending.targets)actualLoss(life,t,rng);
    if(pending.childChain){
      for(const id of life.child?.parents||['self']){lose(life,id,'孩子','预先规定的重大亲子失联。',{chain:false});lose(life,id,'快乐','重大亲子事件的专项连锁。',{chain:false});}
      if(life.child)life.child.custody='separated';
    }
  } else reject('invalid_choice',400);
  life.pending=null;
}
export function rollSwan(life,roll,rng) {
  if(life.phase!=='swan')reject('wrong_phase');
  const dice=roll();
  life.swan={dice,event:null};
  if(dice<=65){note(life,'黑天鹅',`D100=${dice}。这一回合波澜未起，没有失牌或额外奖励。`,{dice});life.phase='round-end';return;}
  const table=swans.filter(s=>(!s.joint||life.married)&&(!s.childChain||(life.child&&!life.child.independent&&find(life,'孩子'))));
  const event=pick(table,rng);life.swan.event=event;
  const pool=event.childChain?life.cards.filter(c=>c.name==='孩子'):life.cards;
  const target=pick(pool,rng);
  if(target){
    const targets=[{personId:'self',name:target.name,reason:event.text}];
    if(event.joint){const other=spouseOf(life),t=pick(other.cards,rng);if(t)targets.push({personId:other.id,name:t.name,reason:event.text});}
    life.pending={source:'swan',targets,health:event.health,parentAllowed:true,parentReason:'父母自愿替你承担这次命运的代价。',childChain:Boolean(event.childChain)};
  }
  note(life,'黑天鹅',`D100=${dice}，${event.title}。${event.text}${target?`本次原定失去「${target.name}」，等待保护选择后结算。`:'当前没有可以扣除的元素。'}`,{dice,swanId:event.id,healthEligible:event.health});
  life.phase='round-end';
}
export function advance(life,roll,rng,now) {
  if(life.pending||life.awards.length)reject('pending_choice');
  if(life.phase==='draw'){life.round=0;life.phase='fixed';return;}
  if(life.phase==='free-result'){life.phase='swan';return;}
  if(life.phase!=='round-end')reject('wrong_phase');
  // Companions who did not cooperate use their one free action independently.
  for(const n of life.npcs){
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
    life.phase='ending';life.endedAt=now;life.expires=now+48*3600000;
    life.ending={survived:life.cards.length===7,count:life.cards.length,at:now};
    note(life,'终局',life.ending.survived?'七种不同的人生元素留存，你在终局存活。':'最终留下'+life.cards.length+'种人生元素，不足七种，按游戏规则判定死亡。',{ending:life.ending});
    captureChapterFacts(life,6);
  } else {captureChapterFacts(life,rounds[life.round].stage);life.round++;life.phase='fixed';life.assessment=null;life.roll=null;life.swan=null;}
}
export function transfer(life,{direction,name,exchange},rng) {
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
    if(existing){existing.level=Math.min(3,Math.max(existing.level,c.level)+1);if(c.name==='健康')existing.spent=Math.max(existing.spent||0,c.spent||0);}
    else p.cards.push(c);rememberCollection(life,p,c.name);
  };
  add(to,card);if(returned)add(from,returned);
  note(life,'夫妻资源',`${from.name}向${to.name}${exchange?'交换':'赠送'}「${name}」${exchange?'，换回「'+exchange+'」':''}。转移保留原等级与已用健康次数，不是重新获得。`,{from:from===life?'self':from.id,to:to===life?'self':to.id,name,exchange:exchange||null});
}
export function publicLife(life) {
  const out=structuredClone(life);
  if(out.assessment){
    out.assessment={id:out.assessment.id,goal:out.assessment.goal,difficulty:out.assessment.difficulty,reason:out.assessment.reason,riskType:out.assessment.riskType,people:out.assessment.people.map(p=>({id:p.id,role:p.role,matches:p.matches,opportunities:p.opportunities})),action:out.assessment.action,targetId:out.assessment.targetId};
  }
  out.fixed=fixedEvent(life);
  if(out.fixed)out.fixed.choices=out.fixed.choices.map(c=>c.slice(0,2));
  out.chapter=life.round<0?0:rounds[life.round].stage;
  out.chapterName=chapters[out.chapter][0];out.age=life.round<0?7:rounds[life.round].age;
  out.health=healthLeft(life);out.eligibleOpportunities=eligibleOpportunities(life);
  out.canDiscard=life.cards.filter(c=>replaceable(life,c.name)).map(c=>c.name);
  const ownHealth=healthLeft(life),otherHealth=spouseOf(life)?healthLeft(spouseOf(life)):0;
  out.protection=life.pending?{health:life.pending.health&&ownHealth+otherHealth>0,parents:life.pending.parentAllowed&&Boolean(find(person(life,life.pending.targets[0].personId),'父母'))&&life.pending.targets[0].name!=='父母'}:null;
  return out;
}
