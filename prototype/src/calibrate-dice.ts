import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const select=document.querySelector('select')!,host=document.querySelector('main')!;
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,650);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;host.append(renderer.domElement);
const camera=new T.PerspectiveCamera(28,1,.1,40);camera.position.set(0,9,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);
async function draw(){const [skin,part]=select.value.split(':');const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/assets/dice-'+skin+'.glb?audit='+Date.now());const model=gltf.scene.getObjectByName(part)!;
 renderer.setScissorTest(false);renderer.setClearColor('#25332c');renderer.clear();renderer.setScissorTest(true);
 for(let i=0;i<10;i++){const scene=new T.Scene();scene.add(new T.HemisphereLight('#fff1d2','#3b2a19',2));const key=new T.DirectionalLight('#fff0d0',3);key.position.set(-3,8,2);scene.add(key);const die=model.clone(true);die.quaternion.setFromUnitVectors(new T.Vector3(...model.userData.faceNormals[i]),new T.Vector3(0,1,0));scene.add(die);const w=innerWidth/5,h=325,x=i%5*w,y=(i<5?1:0)*h;renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}
 document.querySelector('#labels')!.innerHTML=Array.from({length:10},(_,i)=>`<span>${i}</span>`).join('');
}
select.addEventListener('change',()=>void draw());void draw();
