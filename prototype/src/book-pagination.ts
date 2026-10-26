/** Native column fragmentation preserves real controls, text and their listeners. */
export function installBookPagination(
  paper:HTMLElement,app:HTMLElement,
  view:{turn:(backwards?:boolean)=>Promise<void>;reveal:()=>void},
){
  const marker=document.createElement('span');marker.className='folio-end';marker.setAttribute('aria-hidden','true');
  const closing=document.createElement('section');closing.className='folio-closing';
  const nav=document.createElement('nav');nav.className='folio-navigation';nav.setAttribute('aria-label','翻阅书页');
  nav.innerHTML='<button type="button" data-folio-prev></button><span class="folio-counter" role="status" aria-live="polite"></span><button type="button" data-folio-next></button>';
  paper.append(nav);
  const previous=nav.querySelector<HTMLButtonElement>('[data-folio-prev]')!,next=nav.querySelector<HTMLButtonElement>('[data-folio-next]')!,counter=nav.querySelector<HTMLElement>('.folio-counter')!;
  let index=0,count=2,locale='zh-CN',busy=false,paging=false,queued=false,closingHTML='';
  const observe=()=>observer.observe(app,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open']});
  function paint(){
    const stride=2;
    index=Math.max(0,Math.min(index,count-stride));index-=index%2;
    app.style.transform=`translateX(${-index*518}px)`;
    app.dataset.pageStart=String(index+1);app.dataset.pageCount=String(count);
    previous.textContent=locale==='en'?'← Previous':'← 上一页';next.textContent=locale==='en'?'Next →':'下一页 →';
    previous.disabled=busy||paging||index===0;next.disabled=busy||paging||index+stride>=count;
    counter.textContent=locale==='en'?`Pages ${index+1}${stride===2?'–'+(index+2):''} of ${count}`:`第 ${index+1}${stride===2?'—'+(index+2):''} 页 / 共 ${count} 页`;
    nav.setAttribute('aria-label',locale==='en'?'Browse book pages':'翻阅书页');
    const viewport=app.parentElement!;viewport.scrollLeft=0;
  }
  function reflow(){
    queued=false;observer.disconnect();
    closing.remove();marker.remove();app.append(marker);
    // offsetLeft is in untransformed CSS pixels, including overflow columns.
    let used=Math.floor(Math.max(0,marker.offsetLeft)/518)+1;
    if(used%2){closing.innerHTML=closingHTML;app.insertBefore(closing,marker);used=Math.floor(Math.max(0,marker.offsetLeft)/518)+1;}
    count=Math.max(2,used+(used%2));paint();observe();
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(reflow);}}
  const observer=new MutationObserver(schedule);
  async function go(direction:number){
    const stride=2,target=index+direction*stride;
    if(busy||paging||target<0||target>=count)return;
    paging=true;paint();
    try{await view.turn(direction<0);index=Math.min(target,count-stride);}
    finally{paging=false;paint();view.reveal();}
  }
  function focus(selector:string){
    const target=app.querySelector<HTMLElement>(selector);if(!target)return;
    let x=target.offsetLeft,parent=target.offsetParent as HTMLElement|null;
    while(parent&&parent!==app){x+=parent.offsetLeft;parent=parent.offsetParent as HTMLElement|null;}
    index=Math.floor(Math.max(0,x)/518);paint();
  }
  previous.addEventListener('click',()=>void go(-1));next.addEventListener('click',()=>void go(1));
  window.addEventListener('resize',schedule);document.fonts.addEventListener('loadingdone',schedule);
  observe();
  return {
    go,
    focus,
    update(options:{reset:boolean;locale:string;busy:boolean;closingHTML:string}){
      locale=options.locale;busy=options.busy;closingHTML=options.closingHTML;if(options.reset)index=0;reflow();
    },
    reflow:schedule,
  };
}
