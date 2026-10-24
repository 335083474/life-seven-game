// AI receives objective facts, not earlier generated prose as new evidence.
export function factsForAI(events){
  return events.map(({hash,previousHash,sealedAt,hashOrigin,narrative,narrativeMeta,audit,...event})=>event);
}
export function requiredFacts(facts,result=null){
  return {parentsAlive:facts.parentsAlive??null,married:facts.married??null,
    child:facts.child?{id:facts.child.id,alive:facts.child.alive,independent:facts.child.independent}:null,
    outcome:result?.outcome||null,endingSurvived:facts.ending?.survived??null};
}
export function storyThreads(events){
  const groups=new Map();
  for(const e of events){
    if(e.type!=='自由事件'||!e.goal)continue;
    const key=e.goal,entry=groups.get(key)||{goal:key,factIds:[],attempts:[]};
    entry.factIds.push(e.id);entry.attempts.push({eventId:e.id,outcome:e.outcome,age:e.age});
    entry.status=['成功','大成功'].includes(e.outcome)?'achieved':'unfinished';groups.set(key,entry);
  }
  return [...groups.values()];
}
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
export function validateSources(value,input,{memoir=false}={}){
  const primary=memoir?input.ledger:input.consequences;
  const available=new Set([...primary,...(input.earlierFacts||input.previous||[])].filter(e=>Number.isInteger(e.id)).map(e=>e.id));
  const ids=value?.factIds;
  if(!Array.isArray(ids)||!ids.length||ids.length>80||new Set(ids).size!==ids.length||ids.some(id=>!Number.isInteger(id)||!available.has(id))||!ids.some(id=>primary.some(e=>e.id===id)))throw Error('ai_invalid_response');
  if(!memoir&&!ids.includes(input.result.eventId))throw Error('ai_invalid_response');
  if(JSON.stringify(stable(value.factsCheck))!==JSON.stringify(stable(input.requiredFacts)))throw Error('ai_invalid_response');
  return {factIds:ids,factsCheck:input.requiredFacts};
}
export const sourceInstruction='\n额外强制返回 factIds 和 factsCheck。factIds 是正文确实依据的输入事件id整数数组，只能引用当前与更早事实，至少一条本次/本章事实；事件叙事必须包含result.eventId，不能引用未来或不存在的id。factsCheck 必须完整原样复制输入 requiredFacts，正文中的亲属存亡、婚姻、独立、行动成败和终局必须与它一致。不要把来源核对过程写进文学正文。';
export const STORY_PROMPT_VERSION='life-story-3-short-stream';
