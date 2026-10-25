import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
// Texture pixels are checked in browser QA; retain texture objects in this geometry-only test.
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
let source=await fs.readFile(new URL('../src/relic-die.ts',import.meta.url),'utf8');source=source.replace("import {grain} from './textures';",'function grain(){return null;}');
for(const name of ['three','three/addons/utils/BufferGeometryUtils.js'])source=source.replaceAll(`from '${name}'`,`from '${import.meta.resolve(name)}'`);
const {RelicDie}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'));
test('incomplete appearance stays preview-only and cannot replace the saved playable pair',async()=>{
 let registry=await fs.readFile(new URL('../src/dice-skins.ts',import.meta.url),'utf8');
 for(const name of ['three','three/addons/loaders/GLTFLoader.js','three/addons/libs/meshopt_decoder.module.js'])registry=registry.replaceAll(`from '${name}'`,`from '${import.meta.resolve(name)}'`);
 const skins=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(registry,{mode:'transform'})).toString('base64'));
 const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 skins.saveDiceSkin('bronze');assert.equal(skins.savedDiceSkin(),'bronze');skins.saveDiceSkin('rune');assert.equal(values.get('fate-book-dice-skin-v1'),'bronze');
 await assert.rejects(skins.loadDiceSkin('rune'),/尚未补齐/);
 values.set('fate-book-dice-skin-v1','rune');assert.equal(skins.savedDiceSkin(),'bronze');
 globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(skins.savedDiceSkin(),'bronze');assert.doesNotThrow(()=>skins.saveDiceSkin('bronze'));
});
for(const skin of ['bronze'])test(`${skin}: original meshes retain two calibrated dice and cosmetic changes retain roll value`,async()=>{
 const buffer=await fs.readFile(new URL(`../public/assets/dice-${skin}.glb`,import.meta.url));const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
 for(const [i,kind] of ['percentile','unit'].entries()){
  const model=gltf.scene.getObjectByName(kind);assert.ok(model);assert.equal(model.userData.faceNormals.length,10);
  let disposed=0,vertices=0;model.traverse(n=>{if(n instanceof T.Mesh){vertices+=n.geometry.attributes.position.count;n.geometry.addEventListener('dispose',()=>disposed++);assert.ok(n.material.map,'original authored surface must remain');}});assert.ok(vertices>1000);
  const die=new RelicDie(i===0);die.setImportedModel(model);die.group.scale.setScalar(1);
  const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());assert.ok(Math.abs(Math.max(size.x,size.y,size.z)-3)<.02);
  for(let value=0;value<10;value++){die.faceUp(value);const normal=new T.Vector3(...model.userData.faceNormals[value]).normalize().applyQuaternion(die.target);assert.ok(normal.distanceTo(new T.Vector3(0,1,0))<1e-6);die.group.quaternion.copy(die.target);die.rest();assert.ok(die.group.quaternion.angleTo(die.target)<1e-6);}
  const previous=die.target.clone();die.setImportedModel(model);assert.ok(previous.angleTo(die.target)<1e-6,'switching appearance must retain the landed value');die.dispose();assert.equal(disposed,0,'shared source cache must stay alive');
 }
});
