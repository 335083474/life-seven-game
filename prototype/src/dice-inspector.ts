import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RelicDie} from './relic-die';
import {diceSkins,loadDicePreview,savedDiceSkin,saveDiceSkin,type DiceSkinId} from './dice-skins';

type Options={canChange:()=>boolean;apply:(models:T.Object3D[])=>void};
export function installDiceInspector(legacy:T.Object3D[],options:Options){
  const trigger=document.createElement('button');trigger.className='inspect-dice';trigger.textContent='骰子外观 ◇';trigger.setAttribute('aria-label','选择骰子外观');document.querySelector('#interface')!.append(trigger);
  const dialog=document.createElement('dialog');dialog.className='dice-inspector';dialog.setAttribute('aria-labelledby','dice-wardrobe-title');
  dialog.innerHTML=`<button class="dialog-close" aria-label="关闭骰子外观">×</button><span class="eyebrow">此刻，选一对与你同行的骰子</span><h2 id="dice-wardrobe-title">命运之骰</h2><div class="dice-skin-options" role="group" aria-label="骰子外观">${diceSkins.map(s=>`<button class="dice-skin-option" data-skin="${s.id}" aria-pressed="false"><strong>${s.name}</strong><span>${s.description}</span><small>预览并选用</small></button>`).join('')}</div><div class="dice-inspector-view" aria-label="可拖动旋转的骰子外观预览"></div><p class="dice-skin-status" role="status" aria-live="polite">正在备好骰子…</p><p class="dice-gesture">拖动旋转，滚轮缩放。左为十位，右为个位。</p><p class="fine-print dice-skin-credit"></p>`;document.body.append(dialog);
  let renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined,camera:T.PerspectiveCamera|undefined,scene:T.Scene|undefined,raf=0,current:DiceSkinId|null=null,shown:DiceSkinId|null=null,loading=false,activeModels=legacy;
  const preview=[new RelicDie(true),new RelicDie(false)];
  const buttons=[...dialog.querySelectorAll<HTMLButtonElement>('[data-skin]')],status=dialog.querySelector<HTMLElement>('.dice-skin-status')!;
  function updateButtons(){for(const button of buttons){const config=diceSkins.find(s=>s.id===button.dataset.skin)!;button.disabled=loading;button.setAttribute('aria-pressed',String(button.dataset.skin===shown));button.querySelector('small')!.textContent=!config.ready?'仅供预览 · 待补齐':button.dataset.skin===current?'正在使用':'预览并选用';}}
  function showPreview(imported:boolean){preview.forEach((die,i)=>{die.group.visible=i<activeModels.length;if(!die.group.visible)return;if(imported)die.setImportedModel(activeModels[i]);else die.setModel(activeModels[i]);die.group.scale.setScalar(.95);die.group.position.set(activeModels.length===1?0:i===0?-1.5:1.5,0,0);});dialog.querySelector('.dice-gesture')!.textContent=activeModels.length===1?'拖动旋转，滚轮缩放。当前仅展示原作百分骰。':'拖动旋转，滚轮缩放。左为十位，右为个位。';}
  async function choose(id:DiceSkinId){
    if(loading||!options.canChange())return;
    loading=true;updateButtons();status.textContent='正在迎回这对骰子…';
    try{const models=await loadDicePreview(id);if(!options.canChange())throw Error('请等骰子落定后再切换');
      const config=diceSkins.find(s=>s.id===id)!;
      if(config.ready){options.apply(models);current=id;saveDiceSkin(id);}
      activeModels=models;shown=id;if(renderer)showPreview(true);
      status.textContent=config.ready?`已选用「${config.name}」· 外观已记住`:`「${config.name}」仅供预览：缺少配套个位骰。桌面仍使用${current?'「'+diceSkins.find(s=>s.id===current)!.name+'」':'原有骰子'}。`;
      const credit=dialog.querySelector<HTMLElement>('.dice-skin-credit')!;credit.replaceChildren();credit.append(`模型：${config.credit} · CC BY 4.0 · `);const link=document.createElement('a');link.href=config.source;link.target='_blank';link.rel='noopener';link.textContent='原作与署名';credit.append(link);
    }catch{status.textContent='这对骰子暂未抵达，请稍后重试。当前骰子仍可使用。';}
    finally{loading=false;updateButtons();}
  }
  buttons.forEach(button=>button.addEventListener('click',()=>void choose(button.dataset.skin as DiceSkinId)));
  const close=()=>{dialog.close();cancelAnimationFrame(raf);trigger.focus();};dialog.querySelector('.dialog-close')!.addEventListener('click',close);dialog.addEventListener('close',()=>cancelAnimationFrame(raf));
  function size(){if(!renderer||!camera)return;const host=dialog.querySelector('.dice-inspector-view')!,width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(18))*Math.max(1,1.6/camera.aspect)));camera.updateProjectionMatrix();}
  const open=()=>{
    if(dialog.open||!options.canChange())return;dialog.showModal();
    if(!renderer){
      const host=dialog.querySelector('.dice-inspector-view')!;renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;host.append(renderer.domElement);
      scene=new T.Scene();scene.background=new T.Color('#151c18');const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();scene.add(new T.HemisphereLight('#e7dac0','#281f15',.6));const light=new T.DirectionalLight('#ffe1ab',2.5);light.position.set(-3,6,4);scene.add(light);preview.forEach(die=>scene!.add(die.group));showPreview(shown!==null);
      camera=new T.PerspectiveCamera(36,1,.1,50);camera.position.set(1.8,3.2,6.3);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=12;controls.target.set(0,0,0);controls.update();
    }
    size();cancelAnimationFrame(raf);const frame=()=>{if(!dialog.open)return;raf=requestAnimationFrame(frame);controls!.update();renderer!.render(scene!,camera!);};frame();
  };
  trigger.addEventListener('click',open);window.addEventListener('resize',size);return Object.assign(open,{ready:choose(savedDiceSkin())});
}
