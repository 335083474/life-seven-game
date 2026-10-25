import * as T from 'three';
import {CSS3DRenderer,CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {ArchiveWorld} from './world';
import {LifeCard} from './objects';
import {RelicDie as TenDie} from './relic-die';
import {installDiceInspector} from './dice-inspector';
import {ImportedFateBook as FateBook} from './fate-book';
import {initialState,elements,intentions,toggleElement,d100,settle} from './state.mjs';
import './style.css';
import './book-typography.css';
import {bookLeft,bookRight} from './book-content';

const $=<E extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<E>(selector)!;
const fontsReady=Promise.all([document.fonts.load('26px "Archive Body"'),document.fonts.load('48px "Archive Display"')]).catch(()=>[]);
const stage=$('#stage'),pageHost=$('#pages'),state=initialState();
let renderer:T.WebGLRenderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{
  $('#loading').innerHTML='<span class="loading-seal">Ⅶ</span><p>当前浏览器未能打开三维场景。</p><p>请在支持 WebGL 的浏览器中重试。</p><a href="../" style="color:#d2ba80">返回人生游戏</a>';throw Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.outputColorSpace=T.SRGBColorSpace;stage.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#090e0e');scene.fog=new T.FogExp2('#0e1412',.032);
const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.1,80);camera.position.set(.6,10.8,9.1);
scene.add(new T.AmbientLight('#d9d3be',.10));const hemi=new T.HemisphereLight('#a8b7c0','#21170d',.24);scene.add(hemi);
const key=new T.DirectionalLight('#ffddb0',2.2);key.position.set(-3.5,8.5,3.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.camera.far=25;key.shadow.normalBias=.025;key.shadow.bias=-.00015;key.shadow.radius=3;scene.add(key);
const readingLight=new T.SpotLight('#ffe8bd',70,20,.70,1,2);readingLight.position.set(1,7.5,1.5);readingLight.target.position.set(0,.7,0);scene.add(readingLight,readingLight.target);
const rim=new T.DirectionalLight('#a8c3d7',.38);rim.position.set(5,5,-4);scene.add(rim);
const diceLight=new T.PointLight('#f0d6a5',7,7,2);diceLight.position.set(5.2,3.3,1.5);scene.add(diceLight);
const world=new ArchiveWorld();scene.add(world.group);const assetReady=world.load(renderer,scene,message=>{$('#loading p').textContent=message;dirty=true;}).then(async({book:model,dice:models})=>{await fontsReady;dice.forEach((die,i)=>die.setModel(models[i]));installDiceInspector(models);book.setModel(model);let paper:T.Texture|undefined;model.traverse(node=>{if(node instanceof T.Mesh&&/Mesh_000[12]_/.test(node.name)){const material=(Array.isArray(node.material)?node.material[0]:node.material) as T.MeshStandardMaterial;paper??=material.map??undefined;}});if(paper)cards.forEach(card=>card.setPaper(paper!));layout();dirty=true;});
const book=new FateBook();scene.add(book.group);
const cards=elements.map((_element,index)=>new LifeCard(index));cards.forEach(c=>scene.add(c.group));
const dice=[new TenDie(true),new TenDie(false)];dice.forEach(d=>scene.add(d.group));
const cssRenderer=new CSS3DRenderer();cssRenderer.setSize(innerWidth,innerHeight);pageHost.appendChild(cssRenderer.domElement);const cssScene=new T.Scene();
const leftDOM=document.createElement('article'),rightDOM=document.createElement('article');leftDOM.className='paper paper-left inactive';rightDOM.className='paper paper-right inactive';leftDOM.setAttribute('aria-label','人生之书左页');rightDOM.setAttribute('aria-label','人生之书右页');
const leftCSS=new CSS3DObject(leftDOM),rightCSS=new CSS3DObject(rightDOM);for(const object of [leftCSS,rightCSS]){object.rotation.x=-Math.PI/2;object.scale.setScalar(2.80/480);object.position.y=1.10;object.position.z=0;cssScene.add(object);}leftCSS.position.x=-1.51;rightCSS.position.x=1.51;

let mobile=innerWidth<700,busy=false,opening=0,sound=false,dirty=true,turning=false,rolling=false,hidden=document.hidden;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
type Motion={start:number;duration:number;update:(p:number)=>void;finish?:()=>void};const motions:Motion[]=[];
const smooth=(p:number)=>p*p*(3-2*p);
function animate(duration:number,update:(p:number)=>void,finish?:()=>void){motions.push({start:performance.now(),duration:reduced.matches?Math.min(duration,300):duration,update,finish});dirty=true;}
const targetCamera=new T.Vector3(),lookAt=new T.Vector3(),targetLookAt=new T.Vector3();let pointerX=0,pointerY=0,fateFocus=0;
function cameraTargets(){
  book.group.position.z=mobile?-2.5*(1-opening):0;cards.forEach(c=>c.group.visible=!mobile||opening>.7);dice.forEach(d=>d.group.visible=!mobile||opening>.7);
  if(mobile){targetCamera.set(T.MathUtils.lerp(.4,1.66,opening),T.MathUtils.lerp(11,10.1,opening),T.MathUtils.lerp(8.8,7.8,opening));targetLookAt.set(T.MathUtils.lerp(.2,1.66,opening),.20,T.MathUtils.lerp(.0,1.75,opening));camera.fov=opening>.5?42:45;}
  else{targetCamera.set(.4*(1-opening)+pointerX*.14,11.5+pointerY*.12,7.8+pointerY*.07);targetCamera.x+=fateFocus*1.3;targetCamera.y-=fateFocus*.5;targetLookAt.set(.1*(1-opening)+fateFocus*1.4,.10,1.05);camera.fov=T.MathUtils.lerp(37,32,opening)-fateFocus*1.5;}
  if(!mobile && camera.aspect<1.5)camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov/2))*1.5/camera.aspect));
  camera.updateProjectionMatrix();
}
function layout(){
  mobile=innerWidth<700;book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);renderer.setSize(innerWidth,innerHeight);cssRenderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;
  cards.forEach((c,i)=>{if(mobile){const row=i<4?0:1,col=row===0?i:i-4,count=row===0?4:3;c.home.set(1.66+(col-(count-1)/2)*.89,.08,3.68+row*1.27);c.group.scale.setScalar(.72);c.group.rotation.y=(col-(count-1)/2)*.015;}
    else{c.home.set((i-3)*1.22,.08,3.55+Math.abs(i-3)*.025);c.group.scale.setScalar(1);c.group.rotation.y=(i-3)*-.025;}c.group.position.copy(c.home);});
  dice[0].base.set(mobile?1.18:4.8,.43,mobile?2.85:.85);dice[1].base.set(mobile?2.1:5.35,.43,mobile?3.05:2.12);dice.forEach(d=>d.group.position.copy(d.base));
  if(mobile){dice.forEach(d=>d.group.scale.setScalar(.26));}else dice.forEach(d=>d.group.scale.setScalar(.37));cameraTargets();dirty=true;
}

const goal=()=>intentions.find(g=>g.id===state.intention)||intentions[0];
function pageFacts(){return {leftTitle:state.page<2?'一生，尚未写定':'走过，便有痕迹',leftBody:state.page===0?'你来到一座陌生的城市。\n行囊很轻，来日很长。':state.page===1?goal().title+'。\n'+goal().short:'有些选择带来抵达，\n有些选择教人等待。',rightTitle:state.page===0?'青春远行':state.page===1?'此刻的倚仗':state.roll?.outcome||'往事已成',rightBody:state.page===0?'行至此处，你想如何落笔？\n'+intentions.map(i=>i.title).join('\n'):state.page===1?goal().description:state.roll?.outcome==='成功'||state.roll?.outcome==='大成功'?goal().success:goal().failure};}
function renderPages(){leftDOM.dataset.page=rightDOM.dataset.page=String(state.page);leftDOM.innerHTML=bookLeft(state);rightDOM.innerHTML=bookRight(state);updateTargets();$('#selection-count').textContent=state.page===1?`已选 ${state.selected.length} / 2 · ${state.selected.length<2?'点选桌上元素':'可以掷骰了'}`:state.page===2?'这一页，已经写入往事':'七种元素 · 陪你走过这一生';$('#selection-hint').textContent=state.page===1?'选择此刻的倚仗':'此生所持';dirty=true;}
function setPagesVisible(visible:boolean){leftDOM.classList.toggle('inactive',!visible||mobile);rightDOM.classList.toggle('inactive',!visible);}
function setBusy(value:boolean){busy=value;for(const b of document.querySelectorAll<HTMLButtonElement>('.paper button,#open,#close-book,.card-hit,.inspect-dice'))b.disabled=value||(b.classList.contains('card-hit')&&(!state.opened||state.page!==1))||(b.hasAttribute('data-roll')&&state.selected.length!==2);}
let toastTimer:number|undefined;function toast(message:string){clearTimeout(toastTimer);$('#notice').textContent=message;$('#notice').classList.add('visible');toastTimer=window.setTimeout(()=>$('#notice').classList.remove('visible'),3300);}

// Audio is entirely opt-in; no downloads or autoplay.
let audio:AudioContext|undefined;
function play(kind:'paper'|'dice'|'mark'){
  if(!sound)return;try{audio??=new AudioContext();void audio.resume();if(kind==='mark'){for(const frequency of [146.83,220]){const oscillator=audio.createOscillator(),envelope=audio.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;envelope.gain.setValueAtTime(.0001,audio.currentTime);envelope.gain.exponentialRampToValueAtTime(.025,audio.currentTime+.035);envelope.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.8);oscillator.connect(envelope).connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+1.9);}return;}const n=Math.floor(audio.sampleRate*(kind==='paper'?.32:.12)),buffer=audio.createBuffer(1,n,audio.sampleRate),channel=buffer.getChannelData(0);for(let i=0;i<n;i++)channel[i]=(Math.random()*2-1)*Math.pow(1-i/n,2)*.1;
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type=kind==='paper'?'highpass':'lowpass';filter.frequency.value=kind==='paper'?1400:430;gain.gain.value=kind==='paper'?.33:.6;source.connect(filter).connect(gain).connect(audio.destination);source.start();
  }catch{/* The experience remains playable without Web Audio. */}
}
function openBook(){if(busy||state.opened)return;state.opened=true;setBusy(true);$('#invitation').classList.add('leaving');$('#close-book').hidden=false;play('paper');animate(1900,p=>{opening=smooth(p);book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);cameraTargets();},()=>{opening=1;setPagesVisible(true);$('#table-caption').hidden=false;renderPages();setBusy(false);toast('翻开这一页，先选一条想走的路。');});}
function closeBook(){if(busy||!state.opened)return;setBusy(true);setPagesVisible(false);$('#table-caption').hidden=true;$('#dice-label').hidden=true;play('paper');animate(1500,p=>{opening=1-smooth(p);book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);cameraTargets();},()=>{state.opened=false;$('#invitation').classList.remove('leaving');$('#close-book').hidden=true;setBusy(false);});}
function turnTo(page:number,fromRoll=false){if((busy&&!fromRoll)||!state.opened)return;const backwards=page<state.page,old=pageFacts();state.page=page;const next=pageFacts();turning=true;setBusy(true);setPagesVisible(false);book.setPrintedPages(old.leftTitle,old.leftBody,next.rightTitle,next.rightBody,true);book.beginTurn(backwards?next.rightTitle:old.rightTitle,backwards?next.rightBody:old.rightBody,backwards?old.leftTitle:next.leftTitle,backwards?old.leftBody:next.leftBody);play('paper');animate(1300,p=>book.setTurn(backwards?1-smooth(p):smooth(p)),()=>{book.endTurn();book.setPrintedPages('','','','',false);turning=false;renderPages();setPagesVisible(true);setBusy(false);});}
function selectCard(index:number){if(busy||!state.opened)return;if(state.page!==1){toast('先在书中写下选择，再选两张元素。');return;}const result=toggleElement(state,elements[index].id);if(!result.ok){toast(result.message!);return;}cards.forEach((c,i)=>c.selected=state.selected.includes(elements[i].id));renderPages();setBusy(false);dirty=true;}
function rollDice(){if(busy||state.page!==1||state.selected.length!==2||state.roll!==null)return;const result=settle(state,d100());rolling=true;setBusy(true);$('#dice-label').hidden=false;$('#dice-status').textContent='让骰子落定…';$('#dice-value').textContent='··';
  dice[0].faceUp(Math.floor(result.dice%100/10));dice[1].faceUp(result.dice%10);play('dice');let lastBounce=0;
  animate(2600,p=>{fateFocus=reduced.matches?0:Math.sin(Math.PI*p)*.8;dice.forEach((d,i)=>d.roll(p,i));const bounce=Math.floor(p*5);if(bounce>lastBounce&&bounce<5){lastBounce=bounce;play('dice');}},()=>{fateFocus=0;rolling=false;play('mark');$('#dice-value').textContent=String(result.dice).padStart(2,'0');$('#dice-status').textContent=result.dice===100?'00 + 0，记作100':`${Math.floor(result.dice/10)*10} + ${result.dice%10} · ${result.outcome}`;animate(450,()=>{},()=>turnTo(2,true));});
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
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||busy)return;if(e.key==='Escape'&&state.opened)closeBook();if(e.key==='ArrowRight'&&state.opened&&state.page===0)turnTo(1);if(e.key==='ArrowLeft'&&state.opened&&state.page===1)turnTo(0);});
window.addEventListener('pointermove',e=>{if(mobile||busy||document.querySelector('dialog[open]'))return;pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5;cameraTargets();dirty=true;});
window.addEventListener('resize',()=>{layout();setPagesVisible(state.opened&&!busy);});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;dirty=true;});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();toast('画面暂时中断。恢复后可以继续这一页。');});
renderer.domElement.addEventListener('webglcontextrestored',()=>{dirty=true;toast('画面已恢复。');});
let previous=performance.now(),lastAmbient=0;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
function frame(now:number){requestAnimationFrame(frame);if(hidden){previous=now;return;}const dt=Math.min(.05,(now-previous)/1000);previous=now;
  let moving=false;for(let i=motions.length-1;i>=0;i--){const m=motions[i],p=Math.min(1,(now-m.start)/m.duration);m.update(p);moving=true;if(p>=1){motions.splice(i,1);m.finish?.();}}
  cameraTargets();if(camera.position.distanceTo(targetCamera)>.0001||lookAt.distanceTo(targetLookAt)>.0001){camera.position.lerp(targetCamera,1-Math.exp(-dt*6));lookAt.lerp(targetLookAt,1-Math.exp(-dt*6));camera.lookAt(lookAt);moving=true;}
  cards.forEach(c=>{if(c.update(dt))moving=true;});
  const ambient=now-lastAmbient>1000/24;if(ambient){world.update(now/1000,turning,opening);lastAmbient=now;}
  if(dirty||moving||rolling||turning||ambient){if(dirty||moving||rolling||turning)renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);cssRenderer.render(cssScene,camera);updateTargets();dirty=false;}
}
layout();camera.position.copy(targetCamera);lookAt.copy(targetLookAt);camera.lookAt(lookAt);book.setOpening(0);if(!mobile)book.group.position.x+=2.4;renderPages();setBusy(false);requestAnimationFrame(frame);
void Promise.all([assetReady,Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1600))])]).then(()=>{$('#loading').classList.add('finished');dirty=true;}).catch(error=>{$('#loading').innerHTML='<span class="loading-seal">Ⅶ</span><p>旧日的物件未能全部抵达。</p><button class="primary" onclick="location.reload()">重新加载</button>';console.error('Asset loading failed',error);});
