import {engraving} from './book-engraving';
import {savedDie,pageKey,tableCards,diceAction} from './life-presentation.mjs';
import icons from './life-icons.svg?raw';
import './life-book.css';
import {bookText,setBookLocale,watchBookLocale} from './book-locale';

export type LifeSnapshot={life:any;screen:string;busy:boolean;error:string;locale:string;selected:string[];readyToRoll:boolean;translate:(s:string)=>string};
type Transition={before:any;after:any;route:string;body:any};
declare global {interface Window {LifeBook?:{app:HTMLElement;render:(snapshot:LifeSnapshot)=>void;transition:(change:Transition)=>Promise<void>};}}
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function installLifeBook(left:HTMLElement,right:HTMLElement,view:{
  update:(snapshot:LifeSnapshot,table:any[])=>void;
  throwDice:(value:number)=>Promise<void>;
  turn:()=>Promise<void>;
  reveal:()=>void;
}){
  document.body.insertAdjacentHTML('beforeend',icons);watchBookLocale();
  right.classList.add('life-paper');left.classList.add('life-left');
  right.innerHTML='<div class="life-page-tools"><span>命运之书</span><span class="scroll-cue">轻扫书页 · 继续阅读 ↓</span></div><div id="app" class="life-book" aria-label="人生游戏书页"></div>';
  const app=right.querySelector<HTMLElement>('#app')!;
  let snapshot:LifeSnapshot|undefined,key='',scroll=0,lastError='',localePending=false;
  right.addEventListener('scroll',()=>scroll=right.scrollTop);
  window.LifeBook={app,
    async transition(change){
      const value=savedDie(change.route,change.body,change.after);
      if(value!==null){try{await view.throwDice(value);}catch(error){console.warn('Saved die retained; physical replay unavailable.',error);}}
      if(pageKey({life:change.before,screen:snapshot?.screen})!==pageKey({life:change.after,screen:change.after.phase==='ending'?'ending':change.after.phase==='draw'?'draw':'game'}))await view.turn();
    },
    render(next){
      if(snapshot&&snapshot.locale!==next.locale)localePending=true;if(!next.busy)localePending=false;
      snapshot=next;app.style.visibility=localePending?'hidden':'';app.setAttribute('aria-busy',String(next.busy));right.classList.toggle('translating',localePending);left.classList.toggle('translating',localePending);
      app.setAttribute('aria-label',next.locale==='en'?'Life game folio':'人生游戏书页');right.setAttribute('aria-label',next.locale==='en'?'Right folio':'人生之书右页');left.setAttribute('aria-label',next.locale==='en'?'Left folio':'人生之书左页');
      const nextKey=pageKey(next),changed=key!==nextKey;key=nextKey;
      const tr=(value:string)=>bookText(value,next.locale,next.translate),life=next.screen==='new'?null:next.life,table=tableCards(life);setBookLocale(next.locale);
      // The original controls and listeners remain authoritative. Only their
      // visual arrangement changes; this also retains every rare decision UI.
      app.querySelector('a[href="./book/"]')?.remove();
      const title=life&&next.screen!=='home'?tr(life.chapterName):tr('人生七章');
      left.innerHTML=`<span class="kicker">${esc(tr('命运之书'))}</span><h2>${esc(title)}</h2><div class="printer-flower">❧</div>${engraving}<div class="life-ledger">${life?`<p>${esc(life.name)} · ${life.age}${next.locale==='en'?' years':'岁'}</p><p>${esc(tr('此生所持'))} ${table.length} / 7 · ${esc(tr('健康剩余 '+life.health+' 次'))}</p><p>${esc(tr(life.parentsAlive?'父母健在':'父母已离世'))}${life.married?' · '+esc(tr('配偶'))+' '+esc(life.npcs.find((n:any)=>n.id===life.spouseId)?.name||''):''}</p>${life.child?`<p>${esc(tr('孩子'))} · ${esc(life.child.name)} · ${life.childAge}${next.locale==='en'?' years':'岁'} · ${esc(tr(life.child.independent?'已独立':life.child.custody==='joint'?'共同抚养':life.child.custody==='self'?'由你主要抚养':life.child.custody==='separated'?'暂时失去日常联系':(life.npcs.find((n:any)=>n.id===life.child.custody)?.name||'')+'主要抚养'))}</p>`:''}<p class="ledger-note">${esc(tr(life.journal.at(-1)?.text||''))}</p><nav>${[['journal','人生手记'],['companions','查看同行者'],['collection','机遇与典藏'],...(life.married?[['transfer','夫妻赠送与交换']]:[])].map(([action,label])=>`<button data-action="${action}" ${next.busy?'disabled':''}>${esc(tr(label))}</button>`).join('')}</nav>`:`<p>${esc(tr('七岁，命运交给你最初的四张牌。'))}</p><p>${esc(tr('你的每一次选择，都会留下痕迹。'))}</p>`}</div><span class="page-number">${life?esc(tr(life.round<0?'命运初启':'第'+(life.round+1)+'回合')):'Ⅰ — Ⅶ'}</span>`;
      // On phones the left folio is hidden, so all archive functions stay here.
      if(life&&next.screen!=='home'){
        const nav=document.createElement('nav');nav.className='life-archive-nav';
        nav.innerHTML=left.querySelector('nav')?.innerHTML||'';app.append(nav);
        const aside=app.querySelector('.play-aside');if(aside){const dossier=document.createElement('details');dossier.className='life-dossier';const summary=document.createElement('summary');summary.textContent=tr('此生档案');dossier.append(summary,aside);app.append(dossier);}
      }
      right.scrollTop=changed||(next.error&&next.error!==lastError)?0:scroll;scroll=right.scrollTop;lastError=next.error;
      const tools=right.querySelector('.life-page-tools')!;
      tools.firstElementChild!.textContent=tr('命运之书');tools.lastElementChild!.textContent=next.locale==='en'?'Scroll to read ↓':'轻扫书页 · 继续阅读 ↓';
      view.update(next,table);view.reveal();
    }
  };
  return {
    async start(){
      // The shared client also runs as a classic script on the original page.
      // @ts-expect-error Vite supports side-effect imports of classic JS.
      await import('../../ai-client.js');await import('../../game.js');
    },
    get snapshot(){return snapshot;},
    select(index:number){
      if(!snapshot||snapshot.busy)return;
      const card=tableCards(snapshot.life)[index];if(!card)return;
      const button=[...app.querySelectorAll<HTMLButtonElement>('[data-action="select-card"]')].find(b=>b.dataset.value===card.key);
      if(snapshot.life.phase==='free'&&button)button.click();
      else {const detail=document.createElement('button');detail.dataset.action='card';detail.dataset.index=String(index);app.append(detail);detail.click();detail.remove();}
    },
    roll(){const button=diceAction(app);if(button){button.click();return true;}return false;},
    get canRoll(){return !!snapshot&&!snapshot.busy&&!!diceAction(app);}
  };
}
