import {createLife, publicLife, commitFixed, chooseAward, advance, rollFree, rerollFree, settleFree, rollSwan, resolveProtection, transfer, reject, person, note} from './life-engine.mjs';
import {chapters} from './events.mjs';
import {digest, loadLife, saveLife, receipt} from './life-store.mjs';
import {planSystem, storySystem, memoirSystem, planInput, validatePlan} from './life-ai.mjs';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
// Unbiased integer sampler, also dependency injected for whole-life tests.
export function randomBelow(max){
  if(!Number.isInteger(max)||max<1||max>1000000)throw Error('invalid_random_range');
  const a=new Uint32Array(1),limit=Math.floor(4294967296/max)*max;
  do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%max;
}
export async function lifeApi({path,body,owner,env,now,infer,quota,roll,rng=randomBelow}) {
  if(path==='/api/life/load'){
    if(!uuid.test(body.lifeId||''))reject('invalid_request',400);
    return {life:publicLife(await loadLife(env.DB,body.lifeId,owner,now))};
  }
  if(!uuid.test(body.requestId||''))reject('invalid_request',400);
  const fingerprint=await digest(JSON.stringify({path,body}));
  if(path==='/api/life/new'){
    const name=typeof body.name==='string'?body.name.trim():'无名旅人';
    if(!name||name.length>20)reject('invalid_request',400);
    const life=createLife({id:body.requestId,name,now,rng});
    await env.DB.prepare('INSERT OR IGNORE INTO lives(id,owner,revision,state,expires) VALUES(?,?,?,?,?)').bind(life.id,owner,0,JSON.stringify(life),life.expires).run();
    const stored=await loadLife(env.DB,life.id,owner,now);
    if(stored.name!==name)reject('request_conflict');
    return {life:publicLife(stored)};
  }
  if(!uuid.test(body.lifeId||'')||!Number.isInteger(body.revision))reject('invalid_request',400);
  const cached=await receipt(env.DB,owner,body.requestId,fingerprint,now);if(cached)return cached;
  const before=await loadLife(env.DB,body.lifeId,owner,now);
  if(before.revision!==body.revision)reject('revision_conflict');
  const life=structuredClone(before);
  const output=state=>({life:publicLife(state)});
  if(path==='/api/life/assess'){
    if(life.phase!=='free'||life.pending||life.awards.length)reject('wrong_phase');
    const input=planInput(life,body);
    if(input.actionKind==='marry'&&!life.cards.some(c=>c.name==='爱情')&&!life.cards.some(c=>c.name===body.sacrifice&&!['父母','家庭','孩子'].includes(c.name)))reject('marriage_sacrifice_required',400);
    let plan;
    for(let attempt=0;attempt<2;attempt++){
      try{await quota();const answer=await infer(planSystem,input,5000);plan=validatePlan(answer.value,input,body.requestId,life);break;}
      catch(e){if(attempt||e.message!=='ai_invalid_response')throw e;}
    }
    life.difficulties||={};const key=life.round+':'+input.goal;
    if(life.difficulties[key])plan.difficulty=life.difficulties[key];else life.difficulties[key]=plan.difficulty;
    life.assessment=plan;
  } else if(path==='/api/life/narrate'){
    if(!life.lastResult||life.pending||life.awards.length)reject('narration_unavailable');
    if(!life.lastResult.narrative){
      await quota();const answer=await infer(storySystem,{name:life.name,result:life.lastResult,consequences:life.journal.filter(e=>e.id>=life.lastResult.eventId),facts:{parentsAlive:life.parentsAlive,married:life.married,spouseId:life.spouseId,child:life.child,cards:life.cards},previous:life.journal.filter(e=>e.id<life.lastResult.eventId).slice(-45)},1500);
      const story=answer.value?.narrative;
      if(typeof story!=='string'||story.length<20||story.length>1600)throw Error('ai_invalid_response');
      life.lastResult.narrative=story.trim();life.lastResult.source='MiniMax';
      life.journal.find(e=>e.id===life.lastResult.eventId).narrative=story.trim();
    }
  } else if(path==='/api/life/memoir'){
    if(life.phase!=='ending')reject('wrong_phase');
    life.biography||={chapters:[],source:'MiniMax'};
    const chapter=life.biography.chapters.length;
    if(chapter<7){
      const historical=life.chapterFacts?.[chapter];
      // Legacy saves without snapshots get only facts reconstructable at this
      // chapter, never the final marriage/child/card state in an earlier year.
      const fallback={parentsAlive:!life.journal.some(e=>e.stage<=chapter&&e.parentsAlive===false),child:life.journal.filter(e=>e.stage<=chapter&&e.child).at(-1)?.child||null,...(chapter===6?{ending:life.ending,cards:life.cards}:{})};
      await quota();const answer=await infer(memoirSystem,{name:life.name,chapter,chapterName:chapters[chapter][0],ledger:life.journal.filter(e=>e.stage===chapter),previous:life.biography.chapters,facts:historical||fallback},2300);
      const value=answer.value;
      if(typeof value?.title!=='string'||value.title.length>60||typeof value.text!=='string'||value.text.trim().length<25||value.text.length>2200)throw Error('ai_invalid_response');
      life.biography.chapters.push({stage:chapter,title:value.title.trim(),text:value.text.trim()});
    }
  } else if(path==='/api/life/action'){
    const args=body.args||{};
    if(life.pending&&body.action!=='protect')reject('pending_choice');
    if(life.awards.length&&body.action!=='award')reject('pending_choice');
    switch(body.action){
      case 'fixed':commitFixed(life,args.choice,args,rng);break;
      case 'award':chooseAward(life,args.discard??null);break;
      case 'advance':advance(life,roll,rng,now);break;
      case 'roll':rollFree(life,args.selection||[],roll);break;
      case 'reroll':rerollFree(life,args.opportunityId,roll);break;
      case 'settle':settleFree(life,rng);break;
      case 'swan':rollSwan(life,roll,rng);break;
      case 'protect':resolveProtection(life,args.choice,rng);break;
      case 'transfer':transfer(life,args,rng);break;
      case 'cancel-assessment':if(life.phase!=='free')reject('wrong_phase');life.assessment=null;break;
      case 'skip-free':{
        if(life.phase!=='free')reject('wrong_phase');
        const event=note(life,'放弃行动','你选择不发起本回合的自由事件，把这次行动机会留白；没有投自由事件骰，也没有获得奖励。',{skipped:true});
        life.lastResult={dice:null,outcome:'未发起',goal:'这一回合，你选择让生活暂时留白。',audit:null,eventId:event.id,narrative:'你没有发起自由事件，这次行动机会已经用完。接下来仍须面对黑天鹅。',source:'rules',skipped:true};
        life.assessment=null;life.phase='free-result';break;
      }
      default:reject('invalid_action',400);
    }
  } else reject('not_found',404);
  await saveLife(env.DB,before,life,owner,body.requestId,fingerprint,now,output);
  return output(life);
}
