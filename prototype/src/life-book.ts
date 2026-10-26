import {savedDie,pageKey,tableCards,diceAction} from './life-presentation.mjs';
import icons from './life-icons.svg?raw';
import './life-book.css';
import {bookText,setBookLocale,watchBookLocale} from './book-locale';
import {installBookPagination} from './book-pagination';
import {arrangeBookSpread,instructionHTML,refreshBookAssessment} from './book-layout';

export type LifeSnapshot={life:any;screen:string;busy:boolean;error:string;locale:string;selected:string[];readyToRoll:boolean;translate:(s:string)=>string};
type Transition={before:any;after:any;route:string;body:any};
declare global {interface Window {LifeBook?:{app:HTMLElement;render:(snapshot:LifeSnapshot)=>void;transition:(change:Transition)=>Promise<void>;edit?:(change:{readyToRoll:boolean})=>void};}}
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function installLifeBook(left:HTMLElement,right:HTMLElement,view:{
  update:(snapshot:LifeSnapshot,table:any[])=>void;
  throwDice:(value:number)=>Promise<void>;
  turn:(backwards?:boolean)=>Promise<void>;
  reveal:()=>void;
}){
  document.body.insertAdjacentHTML('beforeend',icons);watchBookLocale();
  right.classList.add('life-paper','life-spread');left.replaceChildren();
  right.innerHTML='<div class="folio-running-head"><span></span><span></span></div><div class="folio-viewport"><div id="app" class="life-book folio-content" aria-label="人生游戏书页"></div></div>';
  const app=right.querySelector<HTMLElement>('#app')!;
  const pagination=installBookPagination(right,app,view);
  const expanded=new Set<string>(),detailKinds=['book-companions','book-agreement','book-calculation'];
  app.addEventListener('toggle',event=>{const detail=event.target as HTMLDetailsElement;if(!detail.isConnected)return;const kind=detailKinds.find(name=>detail.classList.contains(name));if(kind){if(detail.open)expanded.add(kind);else expanded.delete(kind);}},true);
  const dossier=document.createElement('dialog');dossier.className='book-dossier';document.body.append(dossier);
  dossier.addEventListener('click',event=>{const target=event.target as HTMLElement;if(target.closest('[data-action],[data-close-dossier]')||target===dossier)dossier.close();});
  document.querySelector('#life-global-nav')!.addEventListener('click',event=>{if((event.target as HTMLElement).closest('[data-book-dossier]'))dossier.showModal();});
  let snapshot:LifeSnapshot|undefined,key='',lastError='',localePending=false;
  window.LifeBook={app,
    edit(change){if(!snapshot)return;snapshot={...snapshot,...change};refreshBookAssessment(app,snapshot);pagination.reflow();view.update(snapshot,tableCards(snapshot.life));},
    async transition(change){
      const value=savedDie(change.route,change.body,change.after);
      if(value!==null){try{await view.throwDice(value);}catch(error){console.warn('Saved die retained; physical replay unavailable.',error);}}
      if(change.route==='life/assess'||pageKey({life:change.before,screen:snapshot?.screen})!==pageKey({life:change.after,screen:change.after.phase==='ending'?'ending':change.after.phase==='draw'?'draw':'game'}))await view.turn();
    },
    render(next){
      const assessmentReady=next.readyToRoll&&!snapshot?.readyToRoll&&!next.busy;
      if(snapshot&&snapshot.locale!==next.locale)localePending=true;if(!next.busy)localePending=false;
      snapshot=next;app.style.visibility=localePending?'hidden':'';app.setAttribute('aria-busy',String(next.busy));right.classList.toggle('translating',localePending);left.classList.toggle('translating',localePending);
      app.setAttribute('aria-label',next.locale==='en'?'Life game folio':'人生游戏书页');right.setAttribute('aria-label',next.locale==='en'?'Open book · facing pages':'人生之书 · 左右双页');left.setAttribute('aria-label',next.locale==='en'?'Left folio':'人生之书左页');
      const nextKey=pageKey(next),changed=key!==nextKey;key=nextKey;
      if(changed)expanded.clear();
      const tr=(value:string)=>bookText(value,next.locale,next.translate),life=next.screen==='new'?null:next.life,table=tableCards(life);setBookLocale(next.locale);
      // The original controls and listeners remain authoritative. Only their
      // visual arrangement changes; this also retains every rare decision UI.
      app.querySelector('a[href="./book/"]')?.remove();
      const header=app.querySelector('.subbar');if(header)document.querySelector('#life-global-nav')!.replaceChildren(header);
      const title=life&&next.screen!=='home'?tr(life.chapterName):tr('人生七章');
      if(life&&next.screen!=='home'){
        const aside=app.querySelector('.play-aside');if(aside){
          const close=document.createElement('button');close.dataset.closeDossier='';close.className='dialog-close';close.textContent='×';close.setAttribute('aria-label',next.locale==='en'?'Close dossier':'关闭档案');
          dossier.replaceChildren(close,aside);dossier.setAttribute('aria-label',next.locale==='en'?'Life dossier':'此生档案');
          const button=document.createElement('button');button.dataset.bookDossier='';button.textContent=next.locale==='en'?'Life dossier':'此生档案';button.disabled=next.busy;header?.querySelector('.subbar__right')?.append(button);
        }
      }
      arrangeBookSpread(app,next);
      for(const kind of expanded){const detail=app.querySelector<HTMLDetailsElement>('.'+kind);if(detail)detail.open=true;}
      const running=right.querySelector('.folio-running-head')!;
      running.firstElementChild!.textContent=title;running.lastElementChild!.textContent=tr('命运之书');
      pagination.update({reset:changed||!!next.error&&next.error!==lastError,locale:next.locale,busy:next.busy,
        closingHTML:instructionHTML(next)+(life?`<div class="book-keepsakes"><span>${esc(tr('此生所持'))} ${table.length} / 7</span><p>${table.map((card:any)=>esc(tr(card.name))+['Ⅰ','Ⅱ','Ⅲ'][card.level-1]).join(' · ')}</p></div>`:'')});
      lastError=next.error;
      if(assessmentReady)pagination.focus('[data-action="roll"]');
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
    page:pagination.go,
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
