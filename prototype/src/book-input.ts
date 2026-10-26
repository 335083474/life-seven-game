type View='spread'|'left'|'right';
type Point={x:number;z:number};
type Options={
  paper:HTMLElement;host:HTMLElement;state:()=>{opened:boolean;busy:boolean;view:View;locale:string};
  hit:(x:number,y:number)=>Point|null;read:(view:View)=>void;page:(direction:number)=>Promise<void>;
  canPage:(direction:number)=>boolean;preview:(direction:number,progress:number)=>void;cancelPreview:()=>void;
};
const controls='button,a,input,textarea,select,label,summary,details,[contenteditable],[role="button"],dialog,.book-guide,#overlay';
/** Keep reading gestures separate from the live game's actual controls. */
export function installBookInput(options:Options){
  const corners=[-1,1].map(direction=>{
    const button=document.createElement('button');button.type='button';button.className='book-corner';button.dataset.bookCorner=direction<0?'previous':'next';button.hidden=true;
    button.innerHTML='<span aria-hidden="true"></span>';options.host.append(button);return {button,direction};
  });
  let down:{x:number;y:number;pointer:number}|undefined;
  let drag:{direction:number;pointer:number;x:number;progress:number;button:HTMLButtonElement}|undefined;
  let suppressClickUntil=0;
  const blocked=()=>{const s=options.state();return !s.opened||s.busy||!!document.querySelector('dialog[open],#overlay,.book-guide:not([hidden])');};
  for(const {button,direction} of corners){
    button.addEventListener('pointerdown',event=>{
      if(blocked()||!options.canPage(direction)||event.button!==0)return;
      event.preventDefault();event.stopPropagation();drag={direction,pointer:event.pointerId,x:event.clientX,progress:0,button};
      button.focus({preventScroll:true});
      button.setPointerCapture?.(event.pointerId);button.classList.add('holding');
    });
    button.addEventListener('pointermove',event=>{
      if(drag?.pointer!==event.pointerId)return;
      const distance=(event.clientX-drag.x)*(direction>0?-1:1);
      drag.progress=Math.max(0,Math.min(.92,distance/Math.max(110,window.innerWidth*.3)));
      if(distance>5)options.preview(direction,drag.progress);
    });
    const release=(event:PointerEvent,cancel=false)=>{
      if(drag?.pointer!==event.pointerId)return;
      const current=drag;drag=undefined;button.classList.remove('holding');suppressClickUntil=Date.now()+500;
      const distance=Math.abs(event.clientX-current.x);
      if(!cancel&&!blocked()&&(distance<8||current.progress>.24))void options.page(direction);
      else options.cancelPreview();
    };
    button.addEventListener('pointerup',event=>release(event));button.addEventListener('pointercancel',event=>release(event,true));
    button.addEventListener('lostpointercapture',()=>{if(drag?.button===button){drag=undefined;button.classList.remove('holding');options.cancelPreview();}});
    button.addEventListener('click',event=>{
      event.stopPropagation();if(blocked()||!options.canPage(direction))return;
      if(event.detail===0||Date.now()>suppressClickUntil)void options.page(direction);
    });
  }
  window.addEventListener('blur',()=>{if(drag){drag.button.classList.remove('holding');drag=undefined;options.cancelPreview();}});
  document.addEventListener('pointerdown',event=>{if(event.button===0)down={x:event.clientX,y:event.clientY,pointer:event.pointerId};});
  document.addEventListener('click',event=>{
    const target=event.target as HTMLElement;
    if(blocked()||Date.now()<suppressClickUntil||target.closest(controls))return;
    if(down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>8)return;
    if(window.getSelection()?.toString())return;
    if(options.paper.contains(target)){
      const point=options.hit(event.clientX,event.clientY);if(point&&Math.abs(point.x)>.15)options.read(point.x<0?'left':'right');
    }else if(options.state().view!=='spread'&&!options.hit(event.clientX,event.clientY))options.read('spread');
  });
  return {
    update(project:(direction:number)=>{x:number;y:number}){
      const state=options.state(),en=state.locale==='en';
      for(const {button,direction} of corners){
        const point=project(direction),available=options.canPage(direction);
        button.hidden=!state.opened||!available||point.x<0||point.x>window.innerWidth||point.y<0||point.y>window.innerHeight;
        button.disabled=state.busy;button.style.left=point.x+'px';button.style.top=point.y+'px';
        const label=direction<0?(en?'Previous pages · click or drag the corner':'前一对书页 · 点击或拖动页角'):(en?'Next pages · click or drag the corner':'后一对书页 · 点击或拖动页角');
        if(button.getAttribute('aria-label')!==label){button.setAttribute('aria-label',label);button.title=label;}
      }
    },
  };
}
