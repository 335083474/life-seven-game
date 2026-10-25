import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// Exercise the real runtime geometry adapter without a DOM or WebGL context.
let source=await fs.readFile(new URL('../src/relic-die.ts',import.meta.url),'utf8');
source=source.replace("import {grain} from './textures';",'function grain(){return null;}');
for(const name of ['three','three/addons/utils/BufferGeometryUtils.js'])source=source.replaceAll(`from '${name}'`,`from '${import.meta.resolve(name)}'`);
const js=stripTypeScriptTypes(source,{mode:'transform'});
const {RelicDie,numeralNormals}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));

for(const kind of ['d10','d100'])test(`${kind}: decoded sculpt has finite solid geometry and ten calibrated landing orientations`,async()=>{
  const buffer=await fs.readFile(new URL(`../public/assets/fate-${kind}.glb`,import.meta.url));
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
  const die=new RelicDie(kind==='d100');die.setModel(gltf.scene);die.group.scale.setScalar(1);
  const bounds=new T.Box3().setFromObject(die.group),size=bounds.getSize(new T.Vector3());
  assert.ok(size.length()>2&&size.length()<8,`quantization must be baked before shortening: ${size.toArray()}`);
  let sculptVertices=0,numberVertices=0;
  die.group.traverse(n=>{if(n instanceof T.Mesh){const p=n.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));if(n.name.includes('Numbers'))numberVertices+=p.count;if(n.name.includes('Dice'))sculptVertices+=p.count;}});
  assert.ok(sculptVertices>1000&&numberVertices>5000,'must retain downloaded body and solid numeral meshes');
  for(let value=0;value<10;value++){
    die.faceUp(value);const up=numeralNormals[value].clone().applyQuaternion(die.target);assert.ok(up.distanceTo(new T.Vector3(0,1,0))<1e-6);
    die.group.quaternion.copy(die.target);die.rest();assert.ok(die.group.quaternion.angleTo(die.target)<1e-6,'final roll pose must match calibrated face');
  }

});
