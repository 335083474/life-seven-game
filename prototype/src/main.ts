import * as T from 'three';
import {CSS3DRenderer,CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {FateBook,LifeCard,TenDie,environment} from './objects';
import {initialState,elements,intentions,toggleElement,chance,d100,settle} from './state.mjs';
import './style.css';

const $=<E extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<E>(selector)!;
const esc=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const stage=$('#stage'),pageHost=$('#pages'),state=initialState();
let renderer:T.WebGLRenderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{
  $('#loading').innerHTML='<span class="loading-seal">Ⅶ</span><p>当前浏览器未能打开三维场景。</p><p>请在支持 WebGL 的浏览器中重试。</p><a href="../" style="color:#d2ba80">返回人生游戏</a>';throw Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.17;renderer.outputColorSpace=T.SRGBColorSpace;stage.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#101a14');scene.fog=new T.FogExp2('#101a14',.027);
const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.1,80);camera.position.set(.6,10.8,9.1);
const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),envTarget=pmrem.fromScene(room,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.32;room.dispose();pmrem.dispose();
scene.add(new T.AmbientLight('#d9e0c8',.32));const hemi=new T.HemisphereLight('#adb9ae','#41351e',.52);scene.add(hemi);
const key=new T.DirectionalLight('#ffe3af',2.8);key.position.set(-3.5,8.5,3.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.camera.far=25;key.shadow.normalBias=.025;key.shadow.bias=-.00015;key.shadow.radius=3;scene.add(key);
const rim=new T.DirectionalLight('#c5d8d0',1.05);rim.position.set(5,5,-4);scene.add(rim);
scene.add(environment());const book=new FateBook();scene.add(book.group);
const cards=elements.map((_element,index)=>new LifeCard(index));cards.forEach(c=>scene.add(c.group));
const dice=[new TenDie(true),new TenDie(false)];dice.forEach(d=>scene.add(d.group));
const cssRenderer=new CSS3DRenderer();cssRenderer.setSize(innerWidth,innerHeight);pageHost.appendChild(cssRenderer.domElement);const cssScene=new T.Scene();
const leftDOM=document.createElement('article'),rightDOM=document.createElement('article');leftDOM.className='paper paper-left inactive';rightDOM.className='paper paper-right inactive';leftDOM.setAttribute('aria-label','人生之书左页');rightDOM.setAttribute('aria-label','人生之书右页');
const leftCSS=new CSS3DObject(leftDOM),rightCSS=new CSS3DObject(rightDOM);for(const object of [leftCSS,rightCSS]){object.rotation.x=-Math.PI/2;object.scale.setScalar(3.10/480);object.position.y=.545;object.position.z=-.02;cssScene.add(object);}leftCSS.position.x=-1.66;rightCSS.position.x=1.66;

let mobile=innerWidth<700,busy=false,opening=0,sound=false,dirty=true,turning=false,rolling=false,hidden=document.hidden;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
type Motion={start:number;duration:number;update:(p:number)=>void;finish?:()=>void};const motions:Motion[]=[];
const smooth=(p:number)=>p*p*(3-2*p);
function animate(duration:number,update:(p:number)=>void,finish?:()=>void){motions.push({start:performance.now(),duration:reduced.matches?Math.min(duration,300):duration,update,finish});dirty=true;}
const targetCamera=new T.Vector3(),lookAt=new T.Vector3(),targetLookAt=new T.Vector3();let pointerX=0,pointerY=0;
function cameraTargets(){
  book.group.position.z=mobile?-2.5*(1-opening):0;cards.forEach(c=>c.group.visible=!mobile||opening>.7);dice.forEach(d=>d.group.visible=!mobile||opening>.7);
  if(mobile){targetCamera.set(T.MathUtils.lerp(.4,1.66,opening),T.MathUtils.lerp(11,10.1,opening),T.MathUtils.lerp(8.8,7.8,opening));targetLookAt.set(T.MathUtils.lerp(.2,1.66,opening),.20,T.MathUtils.lerp(.0,1.75,opening));camera.fov=opening>.5?42:45;}
  else{targetCamera.set(.4*(1-opening)+pointerX*.14,11.5+pointerY*.12,7.8+pointerY*.07);targetLookAt.set(.1*(1-opening),.10,1.05);camera.fov=T.MathUtils.lerp(37,32,opening);}
  camera.updateProjectionMatrix();
}
function layout(){
  mobile=innerWidth<700;book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);renderer.setSize(innerWidth,innerHeight);cssRenderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;
  cards.forEach((c,i)=>{if(mobile){const row=i<4?0:1,col=row===0?i:i-4,count=row===0?4:3;c.home.set(1.66+(col-(count-1)/2)*.89,.08,3.68+row*1.27);c.group.scale.setScalar(.72);c.group.rotation.y=(col-(count-1)/2)*.015;}
    else{c.home.set((i-3)*1.22,.08,3.55+Math.abs(i-3)*.025);c.group.scale.setScalar(1);c.group.rotation.y=(i-3)*-.025;}c.group.position.copy(c.home);});
  dice[0].base.set(mobile?1.18:4.25,.43,mobile?2.85:.85);dice[1].base.set(mobile?2.1:5.0,.43,mobile?3.05:2.12);dice.forEach(d=>d.group.position.copy(d.base));
  if(mobile){dice.forEach(d=>d.group.scale.setScalar(.26));}else dice.forEach(d=>d.group.scale.setScalar(.37));cameraTargets();dirty=true;
}

const arch=`<svg class="book-etching" viewBox="0 0 280 195" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.1"><path d="M92 166V78a48 48 0 0 1 96 0v88zM99 166V79a41 41 0 0 1 82 0v87"/><path d="M115 164V82a25 25 0 0 1 50 0v82M70 168h140M54 178h171M130 164l12-33 8 32M142 132v-20M142 144l-10 9m12-9 12 9"/><circle cx="140" cy="79" r="18" stroke-dasharray="1 4"/><path d="M20 164l40-55 33 55M186 164l34-43 39 43M27 164h59m109 0h55M130 22h20M140 12v20"/><path d="M46 168l-6 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9m20-9-7 9" opacity=".45"/></g></svg>`;
const pageNumber=(n:number)=>`<span class="page-number">— ${String(n).padStart(2,'0')} —</span>`;
const goal=()=>intentions.find(g=>g.id===state.intention)||intentions[0];
function leftContent(){const g=goal();return `<span class="kicker">第三章 · 青年之书</span><div class="chapter-roman">Ⅲ</div><div class="rule"></div><h2>${state.page<2?'一生，尚未写定。':'走过，便有了痕迹。'}</h2>${arch}<p>${state.page===0?'你来到一座陌生的城市。<br>行囊很轻，来日很长。':state.page===1?esc(g.title)+'。<br>'+esc(g.short):'有些选择带来抵达，<br>有些选择教人等待。'}</p><div class="faint">第二十二年 · 青春远行</div>${pageNumber(22+state.page*2)}`;}
function rightContent(){const g=goal();
  if(state.page===0)return `<span class="kicker">第三章 · 青年之书</span><h2>青春远行</h2><p>这一页，你想如何书写？</p><div class="intentions">${intentions.map((intent,i)=>`<button class="intention" data-intent="${intent.id}" aria-pressed="${state.intention===intent.id}"><span>${'ABC'[i]}</span><span><strong>${intent.title}</strong><small>${intent.short}</small></span></button>`).join('')}</div><button class="page-next" data-next>写下这一选择 <span>→</span></button>${pageNumber(23)}`;
  if(state.page===1)return `<span class="kicker">此刻，由你决定</span><h2>此刻，你所倚仗的</h2><p class="small">${esc(g.description)}</p><div class="selection-slots">${[0,1].map(i=>{const e=elements.find(c=>c.id===state.selected[i]);return `<div class="selection-slot ${e?'filled':''}">${e?`<strong>${e.name}</strong><small>${e.level===2?'Ⅱ · 精进':'Ⅰ · 初识'}</small>`:'<span class="empty">＋</span><small>从桌面选择</small>'}</div>`;}).join('')}</div><div class="chance"><span>这次尝试的成功率</span><strong>${chance(state)}<small>%</small></strong></div><button class="page-roll" data-roll ${state.selected.length===2?'':'disabled'}>掷下命运之骰 <span>↗</span></button><button class="page-back" data-back>← 重写选择</button>${pageNumber(25)}`;
  const roll=state.roll!;const successful=roll.outcome==='成功'||roll.outcome==='大成功';return `<span class="kicker">往事已成 · 人生的一页</span><div class="result-number">${String(roll.dice).padStart(2,'0')}</div><div class="result-caption">${roll.outcome}</div><div class="rule"></div><h3>${esc(g.title)}</h3><p class="result-prose">${successful?g.success:g.failure}</p><div class="result-meta">D100 · 成功率 ${roll.probability}% · ${state.selected.map(id=>elements.find(e=>e.id===id)!.name).join('、')}</div><button class="page-next" data-another>另写一段人生 <span>→</span></button>${pageNumber(27)}`;
}
function pageFacts(){return {leftTitle:'一生，尚未写定。',leftBody:goal().short,rightTitle:state.page===0?'青春远行':state.page===1?'此刻，你所倚仗的':state.roll?.outcome||'往事已成',rightBody:state.page===0?'这一页，你想把日子写成什么模样？\n'+intentions.map(i=>i.title).join('\n'):state.page===1?goal().description:state.roll?.outcome==='成功'||state.roll?.outcome==='大成功'?goal().success:goal().failure};}
function renderPages(){leftDOM.innerHTML=leftContent();rightDOM.innerHTML=rightContent();updateTargets();$('#selection-count').textContent=state.page===1?`已选 ${state.selected.length} / 2 · ${state.selected.length<2?'点选桌上元素':'可以掷骰了'}`:state.page===2?'这一页，已经写入往事':'七种元素 · 陪你走过这一生';$('#selection-hint').textContent=state.page===1?'选择此刻的倚仗':'此生所持';dirty=true;}
function setPagesVisible(visible:boolean){leftDOM.classList.toggle('inactive',!visible||mobile);rightDOM.classList.toggle('inactive',!visible);}
function setBusy(value:boolean){busy=value;for(const b of document.querySelectorAll<HTMLButtonElement>('.paper button,#open,#close-book,.card-hit'))b.disabled=value||(b.classList.contains('card-hit')&&(!state.opened||state.page!==1))||(b.hasAttribute('data-roll')&&state.selected.length!==2);}
let toastTimer:number|undefined;function toast(message:string){clearTimeout(toastTimer);$('#notice').textContent=message;$('#notice').classList.add('visible');toastTimer=window.setTimeout(()=>$('#notice').classList.remove('visible'),3300);}

// Audio is entirely opt-in; no downloads or autoplay.
let audio:AudioContext|undefined;
function play(kind:'paper'|'dice'){
  if(!sound)return;try{audio??=new AudioContext();void audio.resume();const n=Math.floor(audio.sampleRate*(kind==='paper'?.32:.12)),buffer=audio.createBuffer(1,n,audio.sampleRate),channel=buffer.getChannelData(0);for(let i=0;i<n;i++)channel[i]=(Math.random()*2-1)*Math.pow(1-i/n,2)*.1;
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type=kind==='paper'?'highpass':'lowpass';filter.frequency.value=kind==='paper'?1400:430;gain.gain.value=kind==='paper'?.33:.6;source.connect(filter).connect(gain).connect(audio.destination);source.start();
  }catch{/* The experience remains playable without Web Audio. */}
}
function openBook(){if(busy||state.opened)return;state.opened=true;setBusy(true);$('#invitation').classList.add('leaving');$('#close-book').hidden=false;play('paper');animate(1900,p=>{opening=smooth(p);book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);cameraTargets();},()=>{opening=1;setPagesVisible(true);$('#table-caption').hidden=false;renderPages();setBusy(false);toast('翻开这一页，先选一条想走的路。');});}
function closeBook(){if(busy||!state.opened)return;setBusy(true);setPagesVisible(false);$('#table-caption').hidden=true;$('#dice-label').hidden=true;play('paper');animate(1500,p=>{opening=1-smooth(p);book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);cameraTargets();},()=>{state.opened=false;$('#invitation').classList.remove('leaving');$('#close-book').hidden=true;setBusy(false);});}
function turnTo(page:number,fromRoll=false){if((busy&&!fromRoll)||!state.opened)return;const backwards=page<state.page,old=pageFacts();state.page=page;const next=pageFacts();turning=true;setBusy(true);setPagesVisible(false);book.setPrintedPages(old.leftTitle,old.leftBody,next.rightTitle,next.rightBody,true);book.beginTurn(backwards?next.rightTitle:old.rightTitle,backwards?next.rightBody:old.rightBody,backwards?old.leftTitle:next.leftTitle,backwards?old.leftBody:next.leftBody);play('paper');animate(1300,p=>book.setTurn(backwards?1-smooth(p):smooth(p)),()=>{book.endTurn();book.setPrintedPages('','','','',false);turning=false;renderPages();setPagesVisible(true);setBusy(false);});}
function selectCard(index:number){if(busy||!state.opened)return;if(state.page!==1){toast('先在书中写下选择，再选两张元素。');return;}const result=toggleElement(state,elements[index].id);if(!result.ok){toast(result.message!);return;}cards.forEach((c,i)=>c.selected=state.selected.includes(elements[i].id));renderPages();setBusy(false);dirty=true;}
function rollDice(){if(busy||state.page!==1||state.selected.length!==2||state.roll!==null)return;const result=settle(state,d100());rolling=true;setBusy(true);$('#dice-label').hidden=false;$('#dice-status').textContent='让骰子落定…';$('#dice-value').textContent='··';
  dice[0].faceUp(Math.floor(result.dice%100/10));dice[1].faceUp(result.dice%10);play('dice');let lastBounce=0;
  animate(2350,p=>{dice.forEach((d,i)=>d.roll(p,i));const bounce=Math.floor(p*5);if(bounce>lastBounce&&bounce<5){lastBounce=bounce;play('dice');}},()=>{rolling=false;$('#dice-value').textContent=String(result.dice).padStart(2,'0');$('#dice-status').textContent=result.dice===100?'00 + 0，记作100':`${Math.floor(result.dice/10)*10} + ${result.dice%10} · ${result.outcome}`;animate(450,()=>{},()=>turnTo(2,true));});
}

const targetButtons=elements.map((e,i)=>{const b=document.createElement('button');b.className='card-hit';b.type='button';b.setAttribute('aria-label',`${e.name} ${e.level===2?'Ⅱ级':'Ⅰ级'}`);b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="sr-only">${e.name}</span>`;b.addEventListener('click',()=>selectCard(i));b.addEventListener('pointerenter',()=>{cards[i].hover=true;dirty=true;});b.addEventListener('pointerleave',()=>{cards[i].hover=false;dirty=true;});b.addEventListener('focus',()=>{cards[i].hover=true;dirty=true;});b.addEventListener('blur',()=>{cards[i].hover=false;dirty=true;});$('#card-targets').appendChild(b);return b;});
function updateTargets(){
  camera.updateMatrixWorld();cards.forEach((c,i)=>{const b=targetButtons[i];b.hidden=!state.opened||opening<.99;vec.copy(c.group.position).project(camera);b.style.left=`${(vec.x*.5+.5)*innerWidth}px`;b.style.top=`${(-vec.y*.5+.5)*innerHeight}px`;
    const scale=c.group.scale.x,distance=c.group.position.distanceTo(camera.position),pixels=innerHeight/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*distance);b.style.width=`${1.10*scale*pixels}px`;b.style.height=`${1.55*scale*pixels*.72}px`;b.setAttribute('aria-pressed',String(c.selected));b.disabled=busy||state.page!==1;});
}
const vec=new T.Vector3();
$('#open').addEventListener('click',openBook);$('#close-book').addEventListener('click',closeBook);
rightDOM.addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button||busy)return;
  if(button.dataset.intent){state.intention=button.dataset.intent;renderPages();}
  else if(button.hasAttribute('data-next'))turnTo(1);
  else if(button.hasAttribute('data-back'))turnTo(0);
  else if(button.hasAttribute('data-roll'))rollDice();
  else if(button.hasAttribute('data-another')){state.roll=null;state.selected=[];cards.forEach(c=>c.selected=false);$('#dice-label').hidden=true;turnTo(0);}
});
const dialog=$<HTMLDialogElement>('#help');$('#guide').addEventListener('click',()=>dialog.showModal());$('#dismiss-help').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();const p=e as MouseEvent;if(p.clientX<r.left||p.clientX>r.right||p.clientY<r.top||p.clientY>r.bottom)dialog.close();}});
$('#restart').addEventListener('click',()=>{if(busy){toast('请等这一页落定。');return;}dialog.close();state.page=0;state.roll=null;state.selected=[];state.intention='bookshop';cards.forEach(c=>c.selected=false);renderPages();if(state.opened)closeBook();});
$('#sound').addEventListener('click',()=>{sound=!sound;$('#sound').setAttribute('aria-pressed',String(sound));$('#sound').setAttribute('aria-label',sound?'关闭声音':'开启声音');$('#sound').title=sound?'关闭声音':'开启声音';if(sound)play('paper');});
document.addEventListener('keydown',e=>{if(dialog.open||busy)return;if(e.key==='Escape'&&state.opened)closeBook();if(e.key==='ArrowRight'&&state.opened&&state.page===0)turnTo(1);if(e.key==='ArrowLeft'&&state.opened&&state.page===1)turnTo(0);});
window.addEventListener('pointermove',e=>{if(mobile||busy||dialog.open)return;pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5;cameraTargets();dirty=true;});
window.addEventListener('resize',()=>{layout();setPagesVisible(state.opened&&!busy);});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;dirty=true;});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();toast('画面暂时中断。恢复后可以继续这一页。');});
renderer.domElement.addEventListener('webglcontextrestored',()=>{dirty=true;toast('画面已恢复。');});
let previous=performance.now();
function frame(now:number){requestAnimationFrame(frame);if(hidden){previous=now;return;}const dt=Math.min(.05,(now-previous)/1000);previous=now;
  let moving=false;for(let i=motions.length-1;i>=0;i--){const m=motions[i],p=Math.min(1,(now-m.start)/m.duration);m.update(p);moving=true;if(p>=1){motions.splice(i,1);m.finish?.();}}
  cameraTargets();if(camera.position.distanceTo(targetCamera)>.0001||lookAt.distanceTo(targetLookAt)>.0001){camera.position.lerp(targetCamera,1-Math.exp(-dt*6));lookAt.lerp(targetLookAt,1-Math.exp(-dt*6));camera.lookAt(lookAt);moving=true;}
  cards.forEach(c=>{if(c.update(dt))moving=true;});
  if(dirty||moving||rolling||turning){renderer.render(scene,camera);cssRenderer.render(cssScene,camera);updateTargets();dirty=false;}
}
layout();camera.position.copy(targetCamera);lookAt.copy(targetLookAt);camera.lookAt(lookAt);book.setOpening(0);if(!mobile)book.group.position.x+=2.4;renderPages();setBusy(false);requestAnimationFrame(frame);
void Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1600))]).then(()=>{$('#loading').classList.add('finished');dirty=true;});
