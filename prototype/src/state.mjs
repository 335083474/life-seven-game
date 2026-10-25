// The visual scene reads this small, independent prototype state.
// No imports from the production save or payment APIs.
export const elements=[
  {id:'parents',name:'父母',subtitle:'来时的庇护',level:1,icon:'home'},
  {id:'knowledge',name:'知识',subtitle:'照见未知',level:2,icon:'book'},
  {id:'courage',name:'勇气',subtitle:'向前一步',level:1,icon:'sun'},
  {id:'wealth',name:'财富',subtitle:'有所积累',level:1,icon:'coin'},
  {id:'health',name:'健康',subtitle:'身心安然',level:1,icon:'leaf'},
  {id:'joy',name:'快乐',subtitle:'心有所悦',level:1,icon:'flower'},
  {id:'friends',name:'朋友',subtitle:'有人同行',level:1,icon:'stars'}
];
export const intentions=[
  {id:'bookshop',title:'开一间小书店',short:'在陌生的城市，留一盏灯。',description:'你想在老街的转角开一间小书店。让路过的人能停下来，也让漂泊的自己有一个归处。',base:45,match:{parents:4,knowledge:8,courage:4,wealth:8,health:0,joy:4,friends:8},success:'招牌终于挂在老街的转角。第一位读者推门进来时，你才发现，那些反复修改的计划，已经变成了可以触摸的日常。',failure:'你在老街走了许多遍，仍没找到能负担的店面。书店暂时留在纸上。你收好写满批注的计划，把这一次尚未实现的心愿留给以后。'},
  {id:'journey',title:'赴一次远方之约',short:'去看看，年少时想过的世界。',description:'你想和旧友赴一场拖延多年的远行。离开熟悉的生活，重新认识世界，也重新认识彼此。',base:45,match:{parents:0,knowledge:4,courage:8,wealth:8,health:8,joy:4,friends:8},success:'列车驶出熟悉的城市。旧友坐在对面，把年少时画的路线展开。窗外的山川一页页掠过，那场迟到的约定，终于有了真实的风景。',failure:'时间和预算始终没能凑在一起。你们没有踏上那趟列车，但仍认真地重新画好了路线。远方还在，只是这一回，它仍然需要等待。'},
  {id:'study',title:'重新走进课堂',short:'给没有答案的问题，多一点时间。',description:'你想重新走进课堂，学习一直好奇的知识。在生活的忙碌之中，为尚未解答的问题留出一段时间。',base:45,match:{parents:4,knowledge:8,courage:4,wealth:4,health:4,joy:0,friends:4},success:'教室的灯在傍晚亮起。你把第一本笔记写得很慢，许多曾经模糊的问题，终于有了可以继续追问的方向。这一次，你为自己而学。',failure:'你试着在工作之后赶去课堂，却没能完成这一期的课程。笔记停在中途，问题仍然没有答案。你把它留在案头，没有把未完成写成完成。'}
];
/** @typedef {{opened:boolean,page:number,intention:string,selected:string[],roll:{dice:number,probability:number,outcome:string}|null}} PrototypeState */
/** @returns {PrototypeState} */
export function initialState(){return {opened:false,page:0,intention:'bookshop',selected:[],roll:null};}
export function toggleElement(state,id){
  if(!elements.some(e=>e.id===id))return {ok:false,message:'这张元素尚未进入这一生。'};
  if(state.roll!==null)return {ok:false,message:'这一笔已经写下。可以翻页，另写一段人生。'};
  if(state.selected.includes(id)){state.selected=state.selected.filter(k=>k!==id);return {ok:true};}
  if(state.selected.length===2)return {ok:false,message:'一段选择，最多倚仗两种元素。先放下一张，再作决定。'};
  state.selected.push(id);return {ok:true};
}
export function chance(state){const goal=intentions.find(g=>g.id===state.intention)||intentions[0];return Math.min(90,goal.base+state.selected.reduce((total,id)=>{const card=elements.find(c=>c.id===id);return total+(goal.match[id]||0)*(card?.level===2?2:1);},0));}
export function d100(random=crypto.getRandomValues.bind(crypto)){
  const value=new Uint32Array(1),limit=Math.floor(4294967296/100)*100;
  do{random(value);}while(value[0]>=limit);return value[0]%100+1;
}
export function verdict(dice,probability){if(!Number.isInteger(dice)||dice<1||dice>100)throw Error('invalid dice');return dice===1?'大成功':dice>=(probability<50?96:100)?'大失败':dice<=probability?'成功':'普通失败';}
export function settle(state,dice){if(state.selected.length!==2||state.roll!==null)throw Error('invalid roll state');state.roll={dice,probability:chance(state),outcome:verdict(dice,chance(state))};return state.roll;}
