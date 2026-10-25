import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {box} from './objects';
import {lightCandles} from './candle-flames';

const base=new URL('assets/',document.baseURI).href;
export class ArchiveWorld{
  group=new T.Group();candleLight=new T.PointLight('#ffb566',24,13,2);
  private animateFlames?:(time:number)=>void;
  private candleModel?:T.Object3D;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private candlePool=new T.SpotLight('#ffb057',42,12,.92,1,2);
  private watchHolder?:T.Group;private clockPhase=0;private previousTime=0;
  private secondHand?:T.Object3D;private minuteHand?:T.Object3D;private hourHand?:T.Object3D;
  private dust:T.Points;private dustStart:Float32Array;
  constructor(){
    const geometry=new T.BufferGeometry(),positions=new Float32Array(90*3);
    let seed=1927;const random=()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
    for(let i=0;i<90;i++){positions[i*3]=random()*11-5.5;positions[i*3+1]=random()*4+.3;positions[i*3+2]=random()*8-4;}
    this.dustStart=positions.slice();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
    this.dust=new T.Points(geometry,new T.PointsMaterial({color:'#dcc59d',size:.012,transparent:true,opacity:.16,depthWrite:false,sizeAttenuation:true}));this.group.add(this.dust);
    this.candleLight.position.set(-5.0,2.5,-1.65);this.group.add(this.candleLight);
    this.candlePool.position.set(-5.0,2.35,-1.65);this.candlePool.target.position.set(-4.65,0,-1.35);this.group.add(this.candlePool,this.candlePool.target);
  }
  async load(renderer:T.WebGLRenderer,scene:T.Scene,progress:(message:string)=>void){
    const manager=new T.LoadingManager();manager.onProgress=(_url,loaded,total)=>progress(`正在迎回旧日的物件 · ${loaded} / ${total}`);
    const loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder),textures=new T.TextureLoader(manager);
    const map=async(name:string,color=false)=>{const t=await textures.loadAsync(base+name);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.wrapS=t.wrapT=T.RepeatWrapping;return t;};
    const [candle,watch,books,woodColor,woodNormal,woodRough,coverColor,coverNormal,coverRough,hdr,hero,percent,unit]=await Promise.all([
      loader.loadAsync(base+'brass_candleholders.glb'),loader.loadAsync(base+'vintage_pocket_watch.glb'),loader.loadAsync(base+'book_encyclopedia_set_01.glb'),
      map('dark_wood-color.webp',true),map('dark_wood-normal.webp'),map('dark_wood-roughness.webp'),
      map('book_pattern-color.webp',true),map('book_pattern-normal.webp'),map('book_pattern-roughness.webp'),
      new HDRLoader(manager).loadAsync(base+'ferndale-studio-09.hdr'),loader.loadAsync(base+'victor-book.glb'),loader.loadAsync(base+'fate-d100.glb'),loader.loadAsync(base+'fate-d10.glb')
    ]);
    const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(hdr);scene.environment=environment.texture;scene.environmentIntensity=.40;hdr.dispose();pmrem.dispose();

    woodColor.repeat.set(5,4);woodNormal.repeat.copy(woodColor.repeat);woodRough.repeat.copy(woodColor.repeat);
    this.group.add(box(35,.24,28,new T.MeshStandardMaterial({map:woodColor,normalMap:woodNormal,normalScale:new T.Vector2(.6,.6),roughnessMap:woodRough,roughness:.8,color:'#777d76'}),0,-.16,0,.04));
    const mat=new T.MeshStandardMaterial({map:coverColor,normalMap:coverNormal,roughnessMap:coverRough,color:'#58664f',roughness:.88});
    this.group.add(box(8.4,.018,7.15,mat,0,-.025,.57,.06));
    const borderMaterial=new T.MeshStandardMaterial({color:'#725b34',metalness:.65,roughness:.6});
    for(const z of [-2.94,4.08])this.group.add(box(8.18,.006,.012,borderMaterial,0,-.010,z,.002));
    for(const x of [-4.09,4.09])this.group.add(box(.012,.006,7.02,borderMaterial,x,-.010,.57,.002));
    const finish=(object:T.Object3D)=>object.traverse(child=>{if(child instanceof T.Mesh){child.castShadow=true;child.receiveShadow=true;for(const m of Array.isArray(child.material)?child.material:[child.material]){
      if(m instanceof T.MeshStandardMaterial){m.envMapIntensity=1.2;if(m.map)m.map.anisotropy=8;if(m.name.includes('flame')){m.emissiveIntensity=2.2;child.castShadow=false;m.depthWrite=false;}}
    }}});
    finish(candle.scene);candle.scene.scale.setScalar(2.7);candle.scene.position.set(-5.35,0,-1.25);candle.scene.rotation.y=.35;this.group.add(candle.scene);this.animateFlames=lightCandles(candle.scene);this.candleModel=candle.scene;
    finish(watch.scene);const watchHolder=new T.Group();watchHolder.add(watch.scene);watchHolder.scale.setScalar(21);watchHolder.rotation.set(-Math.PI/2,0,.25);watchHolder.position.set(-4.8,.15,1.95);this.group.add(watchHolder);this.watchHolder=watchHolder;
    this.secondHand=watch.scene.getObjectByName('vintage_pocket_watch_second_hand');this.minuteHand=watch.scene.getObjectByName('vintage_pocket_watch_minute_hand');this.hourHand=watch.scene.getObjectByName('vintage_pocket_watch_hour_hand');
    // Each imported volume is re-centred before being laid into the pile.
    finish(books.scene);let height=0;
    for(const [index,child] of [...books.scene.children].entries()){
      const bounds=new T.Box3().setFromObject(child),center=bounds.getCenter(new T.Vector3());child.position.sub(center);
      const holder=new T.Group();holder.add(child);const scale=11.5;holder.scale.setScalar(scale);holder.rotation.set(0,-.25+index*.11,Math.PI/2);
      const thickness=(bounds.max.x-bounds.min.x)*scale;height+=thickness/2;holder.position.set(4.9+index*.06,height-.02,-3.25+index*.04);height+=thickness/2;this.group.add(holder);
    }
    progress('书页已经备好。');return {book:hero.scene,dice:[percent.scene,unit.scene]};
  }
  update(time:number,turning:boolean,opening:number){
    if(this.watchHolder)this.watchHolder.visible=opening>.4;
    // Let the larger candelabra settle beside the open book, clear of the masthead.
    if(this.candleModel){this.candleModel.scale.setScalar(2.7+opening*.4);this.candleModel.position.set(-5.35+opening*.6,0,-1.25+opening*1.6);}
    this.candleLight.position.z=-1.25+opening*1.6;this.candlePool.position.z=this.candleLight.position.z;this.candlePool.target.position.z=this.candleLight.position.z+.3;
    this.clockPhase+=Math.min(.1,Math.max(0,time-this.previousTime))*(turning?8:1);this.previousTime=time;
    const flicker=this.reduced.matches?0:Math.sin(time*2.6)*.045+Math.sin(time*6.7)*.018;
    this.candleLight.intensity=24*(1+flicker);this.candlePool.intensity=42*(1+flicker*.7);this.animateFlames?.(time);
    if(this.secondHand)this.secondHand.rotation.z=-Math.floor(this.clockPhase)*(Math.PI/30);
    if(this.minuteHand)this.minuteHand.rotation.z=-time*.0017;
    if(this.hourHand)this.hourHand.rotation.z=.8-time*.00014;
    const positions=this.dust.geometry.attributes.position as T.BufferAttribute;
    for(let i=0;i<positions.count;i++){positions.setX(i,this.dustStart[i*3]+Math.sin(time*.08+i)*.16);positions.setY(i,(this.dustStart[i*3+1]+time*.009)%4+.3);}
    positions.needsUpdate=true;
  }
}
