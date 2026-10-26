import {savedDie,pageKey,tableCards,diceAction} from './life-presentation.mjs';
import icons from './life-icons.svg?raw';
import './life-book.css';
import {bookText,setBookLocale,watchBookLocale} from './book-locale';
import {installBookPagination} from './book-pagination';

export type LifeSnapshot={life:any;screen:string;busy:boolean;error:string;locale:string;selected:string[];readyToRoll:boolean;translate:(s:string)=>string};
type Transition={before:any;after:any;route:string;body:any};
declare global {interface Window {LifeBook?:{app:HTMLElement;render:(snapshot:LifeSnapshot)=>void;transition:(change:Transition)=>Promise<void>};}}
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
  let snapshot:LifeSnapshot|undefined,key='',lastError='',localePending=false;
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
      const header=app.querySelector('.subbar');if(header)document.querySelector('#life-global-nav')!.replaceChildren(header);
      const title=life&&next.screen!=='home'?tr(life.chapterName):tr('人生七章');
      if(life&&next.screen!=='home'){
        const nav=document.createElement('nav');nav.className='life-archive-nav';
        nav.innerHTML=[['journal','人生手记'],['companions','查看同行者'],['collection','机遇与典藏'],...(life.married?[['transfer','夫妻赠送与交换']]:[])].map(([action,label])=>`<button data-action="${action}" ${next.busy?'disabled':''}>${esc(tr(label))}</button>`).join('');app.append(nav);
        const aside=app.querySelector('.play-aside');if(aside){const dossier=document.createElement('details');dossier.className='life-dossier';const summary=document.createElement('summary');summary.textContent=tr('此生档案');dossier.append(summary,aside);app.append(dossier);}
      }
      const running=right.querySelector('.folio-running-head')!;
      running.firstElementChild!.textContent=title;running.lastElementChild!.textContent=tr('命运之书');
      pagination.update({reset:changed||!!next.error&&next.error!==lastError,locale:next.locale,busy:next.busy,
        closingHTML:life?`<span class="kicker">${esc(tr('此生档案'))}</span><h3>${esc(life.name)}</h3><p>${life.age}${next.locale==='en'?' years':'岁'} · ${esc(tr(life.chapterName))}</p><p>${esc(tr('此生所持'))} ${table.length} / 7</p><p>${table.map((card:any)=>esc(tr(card.name))+['Ⅰ','Ⅱ','Ⅲ'][card.level-1]).join(' · ')}</p><p>${esc(tr(life.parentsAlive?'父母健在':'父母已离世'))}</p><p>${esc(tr('健康剩余 '+life.health+' 次'))}</p>`:`<span class="kicker">${esc(tr('命运之书'))}</span><h3>${esc(tr('人生七章'))}</h3><p>${esc(tr('你的每一次选择，都会留下痕迹。'))}</p>`});
      lastError=next.error;
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
