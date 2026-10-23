export const cards = ['父母','家庭','孩子','爱情','快乐','朋友','知识','技能','智慧','才艺','勇气','沉稳','毅力','幽默','善良','修养','财富','地位','权力','尊重','名气','人脉','健康','梦想','自由','阅历','信仰','颜值'];
export const tiers = { '简单': [65, 1], '普通': [45, 1], '困难': [25, .8], '极难': [10, .5], '传奇': [5, .25] };
const fail = () => { throw Object.assign(new Error('invalid_request'), {status:400}); };
export function text(value, max, min=1) {
  if(typeof value!=='string'||value.trim().length<min||value.length>max) fail();
  return value.trim();
}
export function cardList(value, max=7) {
  if(!Array.isArray(value)||value.length>max) fail();
  const seen=new Set();
  return value.map(c=>{if(!c||!cards.includes(c.name)||![1,2,3].includes(c.level)||seen.has(c.name))fail();seen.add(c.name);return {name:c.name,level:c.level};});
}
export function history(value) {
  if(!Array.isArray(value)||value.length>40)fail();
  return value.map(e=>{if(!Number.isInteger(e.stage)||e.stage<0||e.stage>6)fail();return {stage:e.stage,type:text(e.type,20),text:text(e.text,1000)};});
}
export function evaluateInput(body) {
  if(!Number.isInteger(body.stage)||body.stage<1||body.stage>6)fail();
  return {stage:body.stage,goal:text(body.goal,220),selected:cardList(body.selected,2),team:body.team===true,history:history(body.history||[])};
}
export function biographyInput(body) {
  const entries=history(body.history);
  if(entries.length<2)fail();
  return {name:text(body.name||'无名旅人',40),cards:cardList(body.cards),history:entries};
}
export function assessment(value,input) {
  if(!value||!Object.hasOwn(tiers,value.difficulty)||!Array.isArray(value.matches)||value.matches.length!==input.selected.length)throw Error('ai_invalid_response');
  const [base,factor]=tiers[value.difficulty];
  const parts=input.selected.map(c=>{
    const matches=value.matches.filter(m=>m.name===c.name);
    if(matches.length!==1||!['高度匹配','一般匹配','暂不匹配'].includes(matches[0].kind))throw Error('ai_invalid_response');
    return {...c,kind:matches[0].kind,value:({'高度匹配':8,'一般匹配':4,'暂不匹配':0}[matches[0].kind])*Math.min(c.level,2)};
  });
  const teamwork=input.team?3:0;
  const bonus=Math.round(Math.min(24,parts.reduce((sum,p)=>sum+p.value,0))*factor*10)/10;
  const probability=Math.round(Math.min(90,base+teamwork+bonus));
  if(typeof value.reason!=='string'||!value.reason.trim()||value.reason.length>500)throw Error('ai_invalid_response');
  return {difficulty:value.difficulty,base,factor,bonus,teamwork,probability,fumble:probability<50?5:1,parts,reason:value.reason.trim()};
}
export function verdict(dice,probability) {
  if(!Number.isInteger(dice)||dice<1||dice>100)throw Error('invalid_dice');
  return dice===1?'大成功':dice>=(probability<50?96:100)?'大失败':dice<=probability?'成功':'普通失败';
}
export function rollD100(){const n=new Uint32Array(1);do{crypto.getRandomValues(n);}while(n[0]>=4294967200);return n[0]%100+1;}
