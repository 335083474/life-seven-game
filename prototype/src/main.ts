import * as T from 'three';
import {CSS3DRenderer,CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {ArchiveWorld} from './world';
import {LifeCard} from './objects';
import {RelicDie as TenDie} from './relic-die';
import {installDiceInspector} from './dice-inspector';
import {ImportedFateBook as FateBook} from './fate-book';
import {elements} from './state.mjs';
import {installLifeBook,LifeSnapshot} from './life-book';
import {bookText} from './book-locale';
import {lastSavedDie} from './life-presentation.mjs';
import './style.css';
import './book-typography.css';


const $=<E extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<E>(selector)!;
const fontsReady=Promise.all([document.fonts.load('26px "Archive Body"'),document.fonts.load('48px "Archive Display"')]).catch(()=>[]);
const stage=$('#stage'),pageHost=$('#pages'),state={opened:false};
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
const world=new ArchiveWorld();scene.add(world.group);const assetReady=world.load(renderer,scene,message=>{$('#loading p').textContent=message;dirty=true;}).then(async({book:model,dice:models})=>{await fontsReady;dice.forEach((die,i)=>die.setModel(models[i]));const inspector=installDiceInspector(models,{canChange:()=>!busy,apply:skin=>{dice.forEach((die,i)=>die.setImportedModel(skin[i]));dirty=true;}});openDiceInspector=inspector;await inspector.ready;book.setModel(model);let paper:T.Texture|undefined;model.traverse(node=>{if(node instanceof T.Mesh&&/Mesh_000[12]_/.test(node.name)){const material=(Array.isArray(node.material)?node.material[0]:node.material) as T.MeshStandardMaterial;paper??=material.map??undefined;}});if(paper)cards.forEach(card=>card.setPaper(paper!));layout();restoreSavedDice(true);dirty=true;});
void assetReady.then(()=>import('./dice-physics')).then(module=>module.initDicePhysics()).catch(()=>{/* Retry loading the physics engine on the first throw. */});
const book=new FateBook();scene.add(book.group);
const cards=elements.map((_element,index)=>new LifeCard(index));cards.forEach(c=>scene.add(c.group));
const dice=[new TenDie(true),new TenDie(false)];dice.forEach(d=>scene.add(d.group));
const cssRenderer=new CSS3DRenderer();cssRenderer.setSize(innerWidth,innerHeight);pageHost.appendChild(cssRenderer.domElement);const cssScene=new T.Scene();
const leftDOM=document.createElement('article'),rightDOM=document.createElement('article');leftDOM.className='paper paper-left inactive';rightDOM.className='paper paper-right inactive';leftDOM.setAttribute('aria-label','人生之书左页');rightDOM.setAttribute('aria-label','人生之书右页');
const leftCSS=new CSS3DObject(leftDOM),rightCSS=new CSS3DObject(rightDOM);for(const object of [leftCSS,rightCSS]){object.rotation.x=-Math.PI/2;object.scale.setScalar(2.80/480);object.position.y=1.10;object.position.z=0;cssScene.add(object);}leftCSS.position.x=-1.51;rightCSS.position.x=1.51;

let openDiceInspector:(()=>void)|undefined;
let tableCount=0,reading=false,requestBusy=false,presentationBusy=false,shownDiceKey='';
let mobile=innerWidth<700,busy=false,opening=0,sound=false,dirty=true,turning=false,rolling=false,hidden=document.hidden;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
type Motion={start:number;duration:number;update:(p:number)=>void;finish?:()=>void};const motions:Motion[]=[];
const smooth=(p:number)=>p*p*(3-2*p);
function animate(duration:number,update:(p:number)=>void,finish?:()=>void){motions.push({start:performance.now(),duration:reduced.matches?Math.min(duration,300):duration,update,finish});dirty=true;}
const targetCamera=new T.Vector3(),lookAt=new T.Vector3(),targetLookAt=new T.Vector3();let pointerX=0,pointerY=0,fateFocus=0;
function cameraTargets(){
  book.group.position.z=mobile?-2.5*(1-opening):0;cards.forEach((c,i)=>c.group.visible=i<tableCount&&(!mobile||opening>.7));dice.forEach(d=>d.group.visible=!mobile||opening>.7);
  if(mobile){targetCamera.set(T.MathUtils.lerp(.4,1.66,opening),T.MathUtils.lerp(11,10.1,opening),T.MathUtils.lerp(8.8,7.8,opening));targetLookAt.set(T.MathUtils.lerp(.2,1.66,opening),.20,T.MathUtils.lerp(.0,1.75,opening));camera.fov=opening>.5?42:45;}
  else{targetCamera.set(.4*(1-opening)+pointerX*.14,11.5+pointerY*.12,7.8+pointerY*.07);targetCamera.x+=fateFocus*1.3;targetCamera.y-=fateFocus*.5;targetLookAt.set(.1*(1-opening)+fateFocus*1.4,.10,1.05);camera.fov=T.MathUtils.lerp(37,32,opening)-fateFocus*1.5;}
  if(!mobile && camera.aspect<1.5)camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov/2))*1.5/camera.aspect));
  if(reading&&state.opened){targetCamera.set(mobile?1.66:1.05,mobile?7.8:8.5,mobile?5.5:5.7);targetLookAt.set(mobile?1.66:.7,.4,.25);camera.fov=mobile?42:32;}
  camera.updateProjectionMatrix();
}
function layout(){
  mobile=innerWidth<700;rightCSS.position.x=mobile?1.51:0;book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);renderer.setSize(innerWidth,innerHeight);cssRenderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;
  cards.forEach((c,i)=>{if(mobile){const row=i<4?0:1,col=row===0?i:i-4,count=row===0?Math.min(4,Math.max(1,tableCount)):Math.max(1,tableCount-4);c.home.set(1.66+(col-(count-1)/2)*.89,.08,3.68+row*1.27);c.group.scale.setScalar(.72);c.group.rotation.y=(col-(count-1)/2)*.015;}
    else{c.home.set((i-(Math.max(1,tableCount)-1)/2)*1.22,.08,3.55+Math.abs(i-(Math.max(1,tableCount)-1)/2)*.025);c.group.scale.setScalar(1);c.group.rotation.y=(i-3)*-.025;}c.group.position.copy(c.home);});
  const narrow=!mobile&&innerWidth/innerHeight<1.35;
  dice[0].base.set(mobile?1.18:narrow?4.2:4.6,.43,mobile?2.85:.85);dice[1].base.set(mobile?2.1:narrow?4.35:5.05,.43,mobile?3.05:2.12);dice.forEach(d=>d.group.position.copy(d.base));
  dice.forEach(d=>d.group.scale.setScalar(mobile?.20:narrow?.245:.28));dice.forEach(d=>d.rest());cameraTargets();dirty=true;
}

function setPagesVisible(visible:boolean){leftDOM.classList.add('inactive');rightDOM.classList.toggle('inactive',!visible);}
function syncBusy(){busy=requestBusy||presentationBusy;for(const b of document.querySelectorAll<HTMLButtonElement>('#open,#close-book,#reading-mode,.card-hit,.dice-hit,.inspect-dice'))b.disabled=busy;rightDOM.inert=turning||rolling;leftDOM.inert=turning||rolling;}
function setBusy(value:boolean){presentationBusy=value;syncBusy();}
let toastTimer:number|undefined;function toast(message:string){clearTimeout(toastTimer);$('#notice').textContent=message;$('#notice').classList.add('visible');$('#notice').setAttribute('aria-hidden','false');toastTimer=window.setTimeout(()=>{$('#notice').classList.remove('visible');$('#notice').setAttribute('aria-hidden','true');},3300);}

// Audio is opt-in; the paper recording loads only after sound is enabled.
let audio:AudioContext|undefined;
let paperBuffer:AudioBuffer|undefined,paperLoading:Promise<AudioBuffer|undefined>|undefined,paperRequest=0;
let paperVoice:{source:AudioBufferSourceNode;gain:GainNode}|undefined;
function stopPaper(){
  paperRequest++;if(!paperVoice||!audio)return;
  const {source,gain}=paperVoice;paperVoice=undefined;gain.gain.cancelScheduledValues(audio.currentTime);gain.gain.setValueAtTime(gain.gain.value,audio.currentTime);gain.gain.linearRampToValueAtTime(0,audio.currentTime+.025);source.stop(audio.currentTime+.03);
}
async function playPaper(context:AudioContext){
  stopPaper();const request=paperRequest;
  const buffer=paperBuffer??await(paperLoading??=(async()=>{const response=await fetch(new URL('assets/page-turn-soft.mp3',document.baseURI));if(!response.ok)throw Error('Paper audio unavailable');return paperBuffer=await context.decodeAudioData(await response.arrayBuffer());})().catch(()=>undefined).finally(()=>{paperLoading=undefined;}));
  if(!buffer||!sound||request!==paperRequest)return;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;
  gain.gain.setValueAtTime(0,context.currentTime);gain.gain.linearRampToValueAtTime(.6,context.currentTime+.025);
  source.connect(gain).connect(context.destination);paperVoice={source,gain};
  source.onended=()=>{source.disconnect();gain.disconnect();if(paperVoice?.source===source)paperVoice=undefined;};source.start();
}
function play(kind:'paper'|'dice'|'mark'){
  if(!sound)return;try{audio??=new AudioContext();void audio.resume().catch(()=>{});if(kind==='paper'){void playPaper(audio).catch(()=>{});return;}if(kind==='mark'){for(const frequency of [146.83,220]){const oscillator=audio.createOscillator(),envelope=audio.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;envelope.gain.setValueAtTime(.0001,audio.currentTime);envelope.gain.exponentialRampToValueAtTime(.025,audio.currentTime+.035);envelope.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.8);oscillator.connect(envelope).connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+1.9);}return;}const n=Math.floor(audio.sampleRate*.12),buffer=audio.createBuffer(1,n,audio.sampleRate),channel=buffer.getChannelData(0);for(let i=0;i<n;i++)channel[i]=(Math.random()*2-1)*Math.pow(1-i/n,2)*.1;
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=430;gain.gain.value=.6;source.connect(filter).connect(gain).connect(audio.destination);source.start();
  }catch{/* The experience remains playable without Web Audio. */}
}
function openBook(){if(busy||state.opened)return;state.opened=true;setBusy(true);$('#invitation').classList.add('leaving');$('#close-book').hidden=false;play('paper');animate(1900,p=>{opening=smooth(p);book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);cameraTargets();},()=>{opening=1;setPagesVisible(true);$('#table-caption').hidden=false;setBusy(false);restoreSavedDice();toast(lifeBook.snapshot?.locale==='en'?'Your next choice awaits in the book.':'从七岁开始，把这一生写进书里。');});}
function closeBook(){if(busy||!state.opened)return;setBusy(true);setPagesVisible(false);$('#table-caption').hidden=true;$('#dice-label').hidden=true;play('paper');animate(1500,p=>{opening=1-smooth(p);book.setOpening(opening);if(!mobile)book.group.position.x+=2.4*(1-opening);cameraTargets();},()=>{state.opened=false;$('#invitation').classList.remove('leaving');$('#close-book').hidden=true;setBusy(false);});}
async function turnPage(backwards=false){
  if(!state.opened)return;
  turning=true;const manual=!requestBusy;if(manual)setBusy(true);rightDOM.inert=leftDOM.inert=true;book.beginTurn();book.setTurn(backwards?1:0);play('paper');
  await new Promise<void>(resolve=>animate(1100,p=>{book.setTurn(backwards?1-smooth(p):smooth(p));leftDOM.style.opacity=rightDOM.style.opacity=String(1-smooth(Math.min(1,p/.3)));},()=>{book.endTurn();turning=false;if(manual)setBusy(false);resolve();}));
}
function revealPages(){if(!turning){leftDOM.style.opacity=rightDOM.style.opacity='1';}}
function selectCard(index:number){if(busy||!state.opened)return;lifeBook.select(index);}
function restoreSavedDice(force=false){
  const life=lifeBook.snapshot?.life,value=lastSavedDie(life);if(value===null){$('#dice-label').hidden=true;shownDiceKey='';return;}if(rolling||turning)return;
  const key=life.id+':'+value;if(force||key!==shownDiceKey){dice.forEach((die,i)=>{die.faceUp(i===0?Math.floor(value%100/10):value%10);die.group.quaternion.copy(die.target);die.rest();});shownDiceKey=key;}
  $('#dice-label').hidden=!state.opened;$('#dice-value').textContent=String(value).padStart(2,'0');$('#dice-status').textContent=value===100?'00 + 0 = 100':`${Math.floor(value/10)*10} + ${value%10}`;
}
async function showSavedDice(value:number){
  if(!state.opened)return;
  if(reading){reading=false;$('#reading-mode').setAttribute('aria-pressed','false');cameraTargets();await new Promise<void>(resolve=>animate(900,()=>{},resolve));}
  let replayed=false;rolling=true;rightDOM.inert=leftDOM.inert=true;$('#dice-label').hidden=false;$('#dice-status').textContent=lifeBook.snapshot?.locale==='en'?'Let fate settle…':'让骰子落定…';$('#dice-value').textContent='··';
  try{
    const {prepareDiceThrow,sampleDiceThrow}=await import('./dice-physics');
    const shapes=dice.map(d=>d.physicsShape()),radii=shapes.map(shape=>{let radius=0;for(let i=0;i<shape.vertices.length;i+=3)radius=Math.max(radius,Math.hypot(shape.vertices[i],shape.vertices[i+1],shape.vertices[i+2]));return radius;});
    const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion),point=new T.Vector3();
    const fitsView=(poses:{position:T.Vector3}[])=>poses.every((pose,i)=>[right,up].every(axis=>[-1,1].every(sign=>{point.copy(pose.position).addScaledVector(axis,radii[i]*sign).project(camera);return Math.abs(point.x)<.995&&Math.abs(point.y)<.98;})));
    const throwData=await prepareDiceThrow(shapes,[Math.floor(value%100/10),value%10],Math.random,undefined,fitsView);let impact=0;
    await new Promise<void>(resolve=>animate(throwData.duration*1000,p=>{
      if(reduced.matches&&p<1)return;
      sampleDiceThrow(throwData,p*throwData.duration,dice.map(d=>d.group));
      while(impact<throwData.impacts.length&&throwData.impacts[impact]<=p*throwData.duration){impact++;if(!reduced.matches)play('dice');}
    },()=>{dice.forEach((die,i)=>die.rememberFace(i===0?Math.floor(value%100/10):value%10));resolve();}));
    replayed=true;play('mark');
  }finally{
    if(!replayed)dice.forEach((die,i)=>{die.faceUp(i===0?Math.floor(value%100/10):value%10);die.group.quaternion.copy(die.target);die.rest();});
    shownDiceKey=lifeBook.snapshot?.life?.id+':'+value;rolling=false;$('#dice-value').textContent=String(value).padStart(2,'0');$('#dice-status').textContent=value===100?'00 + 0 = 100':`${Math.floor(value/10)*10} + ${value%10}`;
  }
}

const targetButtons=elements.map((e,i)=>{const b=document.createElement('button');b.className='card-hit';b.type='button';b.setAttribute('aria-label',`${e.name} ${e.level===2?'Ⅱ级':'Ⅰ级'}`);b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="sr-only">${e.name}</span>`;b.addEventListener('click',()=>selectCard(i));b.addEventListener('pointerenter',()=>{cards[i].hover=true;dirty=true;});b.addEventListener('pointerleave',()=>{cards[i].hover=false;dirty=true;});b.addEventListener('focus',()=>{cards[i].hover=true;dirty=true;});b.addEventListener('blur',()=>{cards[i].hover=false;dirty=true;});$('#card-targets').appendChild(b);return b;});
const diceButtons=dice.map((_die,i)=>{
  const button=document.createElement('button');button.className='dice-hit';button.type='button';
  button.innerHTML='<span class="sr-only">命运之骰</span>';button.hidden=true;
  button.addEventListener('click',()=>{
    if(busy||document.querySelector('dialog[open],#overlay'))return;
    if(state.opened&&lifeBook.canRoll)lifeBook.roll();
    else openDiceInspector?.();
  });
  $('#interface').append(button);return button;
});
function updateTargets(){
  camera.updateMatrixWorld();cards.forEach((c,i)=>{const b=targetButtons[i];b.hidden=i>=tableCount||!state.opened||opening<.99;vec.copy(c.group.position).project(camera);b.style.left=`${(vec.x*.5+.5)*innerWidth}px`;b.style.top=`${(-vec.y*.5+.5)*innerHeight}px`;
    const scale=c.group.scale.x,distance=c.group.position.distanceTo(camera.position),pixels=innerHeight/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*distance);b.style.width=`${1.10*scale*pixels}px`;b.style.height=`${1.55*scale*pixels*.72}px`;b.setAttribute('aria-pressed',String(c.selected));b.disabled=busy;});
  dice.forEach((die,i)=>{
    const button=diceButtons[i];button.hidden=!openDiceInspector||!die.group.visible||opening>0&&opening<.99;
    vec.copy(die.group.position).project(camera);
    button.style.left=`${(vec.x*.5+.5)*innerWidth}px`;button.style.top=`${(-vec.y*.5+.5)*innerHeight}px`;
    const pixels=innerHeight/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*die.group.position.distanceTo(camera.position));
    const size=Math.max(44,2.7*die.group.scale.x*pixels);button.style.width=button.style.height=`${size}px`;button.disabled=busy;
    const locale=lifeBook.snapshot?.locale||'zh-CN',label=bookText(state.opened&&lifeBook.canRoll?'点击掷骰':'拿起端详 · 拖动旋转',locale);
    button.title=label;button.setAttribute('aria-label',`${locale==='en'?(i===0?'Tens die':'Units die'):(i===0?'十位命运骰':'个位命运骰')} · ${label}`);
  });
}
const vec=new T.Vector3();
$('#reading-mode').addEventListener('click',()=>{if(busy||!state.opened)return;reading=!reading;$('#reading-mode').setAttribute('aria-pressed',String(reading));cameraTargets();dirty=true;});
$('#open').addEventListener('click',openBook);$('#close-book').addEventListener('click',closeBook);
const dialog=$<HTMLDialogElement>('#help');$('#guide').addEventListener('click',()=>dialog.showModal());$('#dismiss-help').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();const p=e as MouseEvent;if(p.clientX<r.left||p.clientX>r.right||p.clientY<r.top||p.clientY>r.bottom)dialog.close();}});
$('#restart').addEventListener('click',()=>{if(busy){toast('请等这一页落定。');return;}dialog.close();const button=document.createElement('button');button.dataset.action='home';rightDOM.append(button);button.click();button.remove();if(state.opened)closeBook();});
$('#sound').addEventListener('click',()=>{sound=!sound;$('#sound').setAttribute('aria-pressed',String(sound));$('#sound').setAttribute('aria-label',sound?'关闭声音':'开启声音');$('#sound').title=sound?'关闭声音':'开启声音';if(sound)play('paper');else stopPaper();});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open],#overlay')||busy||(e.target as HTMLElement).matches('input,textarea,select'))return;if(e.key==='Escape'&&state.opened)closeBook();if(e.key==='ArrowRight'&&state.opened){e.preventDefault();void lifeBook.page(1);}if(e.key==='ArrowLeft'&&state.opened){e.preventDefault();void lifeBook.page(-1);}});
window.addEventListener('pointermove',e=>{if(mobile||busy||document.querySelector('dialog[open],#overlay'))return;pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5;cameraTargets();dirty=true;});
window.addEventListener('resize',()=>{layout();setPagesVisible(state.opened&&opening>.99&&!turning);});
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
const lifeBook=installLifeBook(leftDOM,rightDOM,{
  throwDice:showSavedDice,turn:turnPage,reveal:revealPages,
  update(snapshot:LifeSnapshot,table:any[]){
    const previousCount=tableCount;tableCount=table.length;
    cards.forEach((card,i)=>{const item=table[i];if(item){const name=snapshot.translate(item.name),signature=name+':'+item.level;
      if(card.label!==signature){card.setCard({name,subtitle:snapshot.translate(item.level===3?'典藏':item.level===2?'精进':'初识'),language:snapshot.locale,level:item.level,icon:elements.find(e=>e.name===item.name)?.icon||'sun'});card.label=signature;}
      card.selected=snapshot.selected.includes(item.key);targetButtons[i].setAttribute('aria-label',name+' '+['Ⅰ','Ⅱ','Ⅲ'][item.level-1]);
    }else card.selected=false;});
    $('#selection-hint').textContent=snapshot.translate('此生所持');
    $('#selection-count').textContent=snapshot.locale==='en'?`${table.length} / 7 · ${snapshot.selected.length} selected`:`${table.length} / 7 · 已选 ${snapshot.selected.length} 张`;
    const footer=$('#interface footer>span');footer.textContent=snapshot.locale==='en'?'Seven chapters · One life':'单人人生 · 七章一生';
    $('#book-status').hidden=!snapshot.busy;$('#book-status').textContent=rightDOM.classList.contains('translating')?(snapshot.locale==='en'?'Translating this life…':'正在切换这一生的语言…'):(snapshot.locale==='en'?'The keeper is writing… Your progress is being saved.':'司书正在落笔… 请等这一笔保存。');requestBusy=snapshot.busy;if(previousCount!==tableCount)layout();if(!snapshot.busy)restoreSavedDice();syncBusy();dirty=true;
  }
});
layout();camera.position.copy(targetCamera);lookAt.copy(targetLookAt);camera.lookAt(lookAt);book.setOpening(0);if(!mobile)book.group.position.x+=2.4;setBusy(false);requestAnimationFrame(frame);
void lifeBook.start().catch(error=>{toast('游戏书页未能载入，请刷新后重试。');console.error(error);});
void Promise.all([assetReady,Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1600))])]).then(()=>{$('#loading').classList.add('finished');$('#loading').setAttribute('aria-hidden','true');dirty=true;}).catch(error=>{$('#loading').innerHTML='<span class="loading-seal">Ⅶ</span><p>旧日的物件未能全部抵达。</p><button class="primary" onclick="location.reload()">重新加载</button><p><a href="../" style="color:#d2ba80">打开原版人生游戏</a></p>';console.error('Asset loading failed',error);});
