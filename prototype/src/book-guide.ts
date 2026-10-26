type Options={snapshot:()=>{locale:string;screen:string;life:any;busy?:boolean}|undefined;opened:()=>boolean;open:()=>void};
const storageKey='fate-book-guide-v1';
export function installBookGuide(options:Options){
  const panel=document.createElement('aside');panel.className='book-guide';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-live','polite');
  panel.innerHTML='<div class="book-guide__top"><span></span><button type="button" data-tour-skip></button></div><h2></h2><p></p><div class="book-guide__actions"><button type="button" data-tour-back></button><button type="button" data-tour-next></button></div>';
  document.body.append(panel);
  const heading=panel.querySelector('h2')!,body=panel.querySelector('p')!,count=panel.querySelector('.book-guide__top>span')!,skip=panel.querySelector<HTMLButtonElement>('[data-tour-skip]')!,back=panel.querySelector<HTMLButtonElement>('[data-tour-back]')!,next=panel.querySelector<HTMLButtonElement>('[data-tour-next]')!;
  let active=false,index=0,ready=false,attempted=false,highlight:Element|null=null;
  const steps=[
    ['open','打开你的命运之书','点击打开书本。这里的每一次正式选择，都会成为人生记录。','Open your Book of Fate','Open the book. Every confirmed choice becomes part of this life.','#open'],
    ['pages','像翻书一样阅读','点击书页靠近阅读，点桌面或按 Esc 返回双页。点击或拖动外侧页角翻阅；翻书不会推进人生。','Read the facing pages','Click a page to read closer. Click the table or press Esc to return. Click or drag an outer corner to turn pages. Reading does not advance life.','.folio-navigation'],
    ['choices','先读，再写下选择','固定事件先选一项，再确认。自由事件先写目标，随后选牌并请司书评估。','Read, then make your choice','Select and confirm a fixed choice. For a free action, write a goal, select elements and request an assessment.','.folio-viewport'],
    ['cards','把人生元素带进行动','自由事件可选至多两张元素；点击桌上或书内卡牌，再次点击可取消。选牌本身不消耗卡。','Bring elements to an action','During a free action, choose up to two cards in the book or on the table. Click again to deselect. Selection does not spend cards.','#card-targets'],
    ['dice','评估之后，交给骰子','查看概率与风险后，点击桌上骰子执行。其他时候点击骰子可以端详外观。黑天鹅直接投骰，无需评估。','Let the dice decide','After reviewing the assessment, click a table die to commit. Outside a roll, clicking a die opens its appearance. The Black Swan needs no assessment.','.dice-hit'],
  ];
  function completed(){try{return localStorage.getItem(storageKey)==='done';}catch{return false;}}
  function finish(){active=false;panel.hidden=true;highlight?.classList.remove('book-guide-target');highlight=null;try{localStorage.setItem(storageKey,'done');}catch{}}
  function paint(){
    if(!active)return;const en=options.snapshot()?.locale==='en',step=steps[index];
    panel.hidden=false;panel.dataset.step=step[0];panel.setAttribute('aria-label',en?'How to play':'新手引导');
    heading.textContent=step[en?3:1];body.textContent=step[en?4:2];count.textContent=en?`FIRST STEPS · ${index+1} / 5`:`初次落笔 · ${index+1} / 5`;
    if(index===1&&window.innerWidth<700)body.textContent=en?'Both pages stay available. Tap either page to read closer, then tap the table or Both pages to return. Tap or drag an outer corner to turn a pair of pages.':'左右双页都可阅读。点书页靠近，点桌面或返回双页退出；点击或拖动外侧页角，一次翻过两页。';
    skip.textContent=en?'Skip':'跳过';skip.setAttribute('aria-label',en?'Skip tutorial':'跳过引导');back.textContent=en?'Back':'上一步';back.disabled=index===0;
    next.textContent=index===0?(en?'Open the book':'打开书本'):index===4?(en?'Start playing':'开始游玩'):(en?'Got it, next':'知道了，下一步');
    highlight?.classList.remove('book-guide-target');highlight=document.querySelector(step[5]);highlight?.classList.add('book-guide-target');
    if(index===0&&options.opened()){index=1;paint();}
  }
  function start(){active=true;index=options.opened()?1:0;paint();}
  function maybeStart(){if(ready&&options.snapshot()&&!options.snapshot()?.busy&&!attempted){attempted=true;if(!completed())start();}}
  next.addEventListener('click',()=>{if(index===0){options.open();if(options.opened())index=1;paint();}else if(index===4)finish();else{index++;paint();}});
  back.addEventListener('click',()=>{index=Math.max(0,index-1);paint();});skip.addEventListener('click',finish);
  document.querySelector('#open')?.addEventListener('click',()=>{if(active&&index===0){index=1;paint();}});
  return {start,refresh(){maybeStart();paint();},ready(){ready=true;maybeStart();},get active(){return active;}};
}
