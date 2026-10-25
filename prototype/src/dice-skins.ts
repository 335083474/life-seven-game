import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
export const diceSkins=[
  {id:'bronze',name:'古铜雕刻',description:'圆润包边 · 铆钉雕纹',ready:true,file:'dice-bronze.glb',credit:'Felipe Carim (Capygon)',source:'https://sketchfab.com/3d-models/metal-and-wood-variation-3d-custom-themed-dice-d209249a82e04705b6baa5188d26650d'},
  {id:'rune',name:'暗色符文',description:'深色石面 · 琥珀微光',ready:false,file:'dice-rune.glb',credit:'JayDesigns3D',source:'https://sketchfab.com/3d-models/dungeons-and-dragons-dice-set-163950cff9694fe1a686d22fe7737236'},
] as const;
export type DiceSkinId=typeof diceSkins[number]['id'];
const cache=new Map<DiceSkinId,Promise<T.Object3D[]>>();
export function savedDiceSkin():DiceSkinId{try{const id=localStorage.getItem('fate-book-dice-skin-v1');return diceSkins.find(s=>s.id===id&&s.ready)?.id??'bronze';}catch{return 'bronze';}}
export function saveDiceSkin(id:DiceSkinId){if(!diceSkins.find(s=>s.id===id)?.ready)return;try{localStorage.setItem('fate-book-dice-skin-v1',id);}catch{/* Play remains available when storage is disabled. */}}
export function loadDicePreview(id:DiceSkinId){
  const existing=cache.get(id);if(existing)return existing;
  const config=diceSkins.find(s=>s.id===id)!;
  const pending=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(new URL('assets/'+config.file,document.baseURI).href).then(gltf=>{
    const models=(config.ready?['percentile','unit']:['percentile']).map(name=>gltf.scene.getObjectByName(name));
    if(models.some(model=>!model||!Array.isArray(model.userData.faceNormals)||model.userData.faceNormals.length!==10||model.userData.faceNormals.some((n:unknown)=>!Array.isArray(n)||n.length!==3||!n.every(Number.isFinite)||new T.Vector3(n[0],n[1],n[2]).length()<.9)))throw Error('骰子模型未完成标定');
    return models as T.Object3D[];
  }).catch(error=>{cache.delete(id);throw error;});cache.set(id,pending);return pending;
}
export function loadDiceSkin(id:DiceSkinId){if(!diceSkins.find(s=>s.id===id)?.ready)return Promise.reject(Error('这套骰子尚未补齐'));return loadDicePreview(id);}
