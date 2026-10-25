import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RelicDie} from './relic-die';

export function installDiceInspector(models:T.Object3D[]){
  const trigger=document.createElement('button');trigger.className='inspect-dice';trigger.textContent='端详命运之骰 ◇';trigger.setAttribute('aria-label','端详命运之骰');document.querySelector('#interface')!.append(trigger);
  const dialog=document.createElement('dialog');dialog.className='dice-inspector';dialog.innerHTML='<button class="dialog-close" aria-label="关闭骰子细节">×</button><span class="eyebrow">黄铜包边 · 立体数字 · 卷草浮雕</span><h2>两枚旧物，一次命运。</h2><div class="dice-inspector-view" aria-label="可拖动旋转的精细骰子模型"></div><p>拖动旋转，滚轮缩放。左为十位，右为个位。</p><p class="fine-print">改编自 Tenshinzo 的 Pointy Metal/Crystal Dice（CC BY 4.0），保留原作立体数字，缩短尖端并增加金属花饰与宝石端帽。</p>';document.body.append(dialog);
  let renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined,camera:T.PerspectiveCamera|undefined,scene:T.Scene|undefined,raf=0;
  const close=()=>{dialog.close();cancelAnimationFrame(raf);trigger.focus();};dialog.querySelector('button')!.addEventListener('click',close);dialog.addEventListener('close',()=>cancelAnimationFrame(raf));
  function size(){if(!renderer||!camera)return;const host=dialog.querySelector('.dice-inspector-view')!,width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(18))*Math.max(1,1.6/camera.aspect)));camera.updateProjectionMatrix();}
  const open=()=>{
    if(dialog.open)return;
    dialog.showModal();
    if(!renderer){
      const host=dialog.querySelector('.dice-inspector-view')!;renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;host.append(renderer.domElement);
      scene=new T.Scene();scene.background=new T.Color('#151c18');const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();scene.add(new T.HemisphereLight('#e7dac0','#281f15',.6));const light=new T.DirectionalLight('#ffe1ab',2.5);light.position.set(-3,6,4);scene.add(light);
      models.forEach((model,i)=>{const die=new RelicDie(i===0);die.setModel(model);die.group.scale.setScalar(1);die.group.position.x=i===0?-1.45:1.45;scene!.add(die.group);});
      camera=new T.PerspectiveCamera(36,1,.1,50);camera.position.set(1.8,3.2,6.3);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=12;controls.target.set(0,0,0);controls.update();
    }
    size();const frame=()=>{if(!dialog.open)return;raf=requestAnimationFrame(frame);controls!.update();renderer!.render(scene!,camera!);};frame();
  };trigger.addEventListener('click',open);window.addEventListener('resize',size);return open;
}
