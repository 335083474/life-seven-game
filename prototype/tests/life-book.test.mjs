import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {fixture} from '../../tests/support.mjs';
import {savedDie,pageKey,tableCards,lastSavedDie} from '../src/life-presentation.mjs';

const {arrangeBookSpread,refreshBookAssessment}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(readFileSync(new URL('../src/book-layout.ts',import.meta.url),'utf8'))).toString('base64'));

test('real shared UI completes nine rounds through the book host, retains saves, and presents only saved dice',async t=>{
  const f=fixture(t,{dice:Array(100).fill(10)}),window=new Window({url:'https://335083474.github.io/life-seven-game/book/'});
  const previous={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,NodeFilter:globalThis.NodeFilter};
  Object.assign(globalThis,{window,document:window.document,localStorage:window.localStorage,NodeFilter:window.NodeFilter});
  t.after(()=>{Object.assign(globalThis,previous);window.happyDOM.abort();});
  window.document.body.innerHTML='<article><div id="book-app"></div></article>';
  const app=window.document.getElementById('book-app'),throws=[];let latest,breakReplay=false;
  window.LifeBook={app,render:snapshot=>{
    latest=snapshot;
    const aside=app.querySelector('.play-aside'),header=app.querySelector('.subbar');aside?.remove();header?.remove();
    const live=[...app.querySelectorAll('button,input,textarea,select')].filter(n=>!n.closest('.hero__frame,.chapter-rail,.home__bottom'));
    arrangeBookSpread(app,snapshot);
    for(const control of live)assert(app.contains(control),'Facing-page layout must retain '+(control.dataset.action||control.id));
    assert(app.querySelectorAll('.book-leaf').length>=2,'Every game phase needs facing content');
  },edit:change=>{latest={...latest,...change};refreshBookAssessment(app,latest);},transition:async({route,body,after})=>{
    const die=savedDie(route,body,after);if(die!==null)throws.push(die);
    if(breakReplay){breakReplay=false;throw Error('Simulated presentation interruption');}
  }};
  window.LifeDM={call:async(route,body)=>{const response=await f.call(route.replace('life/',''),body);if(response.status!==200)throw Object.assign(Error(response.data.error),{code:response.data.error});return response.data;}};
  await import('../../game.js?book-ui-test');
  const idle=async()=>{for(let i=0;i<1000;i++){await new Promise(resolve=>setTimeout(resolve,1));if(!latest.busy)return;}throw Error('UI did not finish');};
  const click=async(action,value)=>{
    const buttons=[...window.document.querySelectorAll('[data-action]')];
    const button=buttons.find(b=>b.dataset.action===action&&(value===undefined||b.dataset.value===value||b.dataset.index===String(value))&&!b.disabled);
    assert(button,`Missing usable action ${action} in ${f.life?.phase}`);button.click();await idle();
  };
  assert(app.querySelector('[data-action=start]').textContent.includes('抽取天赋'));
  await click('start');
  assert.equal(latest.screen,'new');assert.equal(app.querySelectorAll('.element-card--back').length,3,'New life must show three unrevealed gifts');
  assert(app.querySelector('.book-leaf--story #life-name'),'Name belongs on the opening left page');
  assert(app.querySelector('.book-leaf--choice [data-action=reveal]'),'Reveal stays on the facing page');
  assert(!app.querySelector('[data-action=advance]'),'Cannot skip the initial draw');
  app.querySelector('#life-name').value='三维规则验收';await click('reveal');
  assert.equal(latest.life.phase,'draw');assert.equal(tableCards(latest.life).length,4);
  assert.equal(latest.life.round,-1,'Revealing gifts must not begin a regular round');
  assert.equal(app.querySelectorAll('.element-card--back').length,0);
  assert(latest.life.cards.some(card=>card.name==='父母'));assert.equal(new Set(latest.life.cards.map(card=>card.name)).size,4);
  assert(app.querySelector('.book-leaf--choice [data-action=advance]').textContent.includes('确认天赋'));
  assert.equal(window.localStorage.getItem('life-seven-current-v2'),JSON.stringify(f.life.id));
  await click('advance');
  async function drain(){
    while(f.life.pending||f.life.awards.length){
      if(f.life.pending)await click('protect','accept');
      else await click('award',f.life.canDiscard.find(n=>!['家庭','孩子','快乐','健康'].includes(n))||f.life.canDiscard[0]);
    }
  }
  for(let round=0;round<9;round++){
    assert.equal(latest.life.round,round);assert.equal(latest.life.phase,'fixed');
    await click('fixed-choice',0);await click('fixed');await drain();
    if(round===0){
      await click('preset',0);
      const longGoal='我想研究帮助老人的新技术，先走访社区，采访愿意参与的居民，再与旧友一起设计可使用的原型，并用三个月完成小范围验证，为独立生活的长者减少日常困难。';
      app.querySelector('#free-goal').value=longGoal;app.querySelector('#free-goal').dispatchEvent(new window.Event('input',{bubbles:true}));
      await click('assess');
      const focusedGoal=app.querySelector('#free-goal');focusedGoal.value=longGoal+'新目标';focusedGoal.dispatchEvent(new window.Event('input',{bubbles:true}));
      assert.equal(app.querySelector('#free-goal'),focusedGoal,'Editing must retain the real input');assert(app.classList.contains('book-assessment-stale'));assert(app.querySelector('[data-action="assess"]'));
      focusedGoal.value=longGoal;focusedGoal.dispatchEvent(new window.Event('input',{bubbles:true}));assert(!app.classList.contains('book-assessment-stale'));assert.equal(app.querySelectorAll('.book-roll-chance').length,1);assert(app.querySelector('[data-action="roll"]'));

      const calls=f.calls(),key=tableCards(latest.life)[0].key;
      await click('select-card',key);await click('select-card',key);
      assert.equal(f.calls(),calls,'Changing cards must not call AI');
      breakReplay=true;await click('roll');
      assert.equal(latest.life.phase,'rolled','Presentation failure must not discard a committed roll');
      assert.equal(throws.at(-1),latest.life.roll.dice);await click('settle');await drain();
      await click('narrate');assert(latest.life.lastResult.narrative);assert(app.querySelector('.book-leaf--story details'));assert(app.querySelector('.book-leaf--choice [data-action=advance]'));assert(app.textContent.includes(longGoal),'The complete action is retained, not truncated');
    }else{await click('skip-confirm');await click('skip-free');}
    await click('advance');assert.equal(latest.life.phase,'swan');
    await click('swan');assert.equal(throws.at(-1),latest.life.swan.dice);await drain();await click('advance');
  }
  assert.equal(latest.life.phase,'ending');assert.equal(throws.length,10);
  await click('memoir');assert.equal(latest.life.biography.chapters.length,7);
  const id=latest.life.id;await click('home');await click('resume');assert.equal(latest.life.id,id);assert.equal(latest.life.phase,'ending');
  await click('home');await click('start');assert.equal(latest.screen,'new');assert.equal(app.querySelectorAll('.element-card--back').length,3,'Starting again must offer a fresh draw even with a save');
  assert.equal(window.localStorage.getItem('life-seven-current-v2'),JSON.stringify(id),'Opening setup alone must not replace the saved life');
  assert.equal(window.document.querySelectorAll('#app').length,0,'The game uses the host element, not a second page');
  assert(!window.document.querySelector('#book-app [data-action="swan"]'));
});

test('presentation identifies transitions without deriving dice from probability or showing rewards',()=>{
  assert.equal(savedDie('life/assess',{}, {roll:{dice:42}}),null);
  assert.equal(savedDie('life/action',{action:'roll'},{roll:{dice:100}}),100);
  assert.equal(savedDie('life/action',{action:'reroll'},{roll:{dice:100,reroll:2}}),2);
  assert.equal(savedDie('life/action',{action:'swan'},{swan:{dice:0}}),null);
  assert.equal(lastSavedDie({roll:{dice:12,reroll:80}}),80,'Restore the last actual throw, not the kept result');
  assert.equal(lastSavedDie({swan:{dice:100},roll:{dice:12,reroll:80}}),100);
  assert.equal(lastSavedDie({phase:'fixed',lastResult:{dice:40}}),null);
  assert.notEqual(pageKey({screen:'game',life:{id:'a',round:0,phase:'free'}}),pageKey({screen:'game',life:{id:'a',round:0,phase:'rolled'}}));
  assert.deepEqual(tableCards({cards:[{name:'健康',level:2,spent:1}]}),[{name:'健康',level:2,spent:1,key:'self:健康'}]);
});
