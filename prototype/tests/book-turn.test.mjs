import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const source=(await fs.readFile(new URL('../src/fate-book.ts',import.meta.url),'utf8')).replace("from 'three'",`from '${import.meta.resolve('three')}'`);
const {ImportedFateBook}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'));
test('turning leaf stays finite and lands flat on either side without stale-bound culling',()=>{
  const book=new ImportedFateBook();book.beginTurn();
  const leaves=[];book.group.traverse(node=>{if(node instanceof T.Mesh)leaves.push(node);});
  assert.equal(leaves.length,2);
  for(const mesh of leaves)assert.equal(mesh.frustumCulled,false);
  for(let step=0;step<=20;step++){
    book.setTurn(step/20);const positions=leaves[0].geometry.attributes.position;
    for(let i=0;i<positions.count;i++)assert.ok(Number.isFinite(positions.getX(i)+positions.getY(i)+positions.getZ(i)));
    if(step===0||step===20){
      const box=new T.Box3().setFromBufferAttribute(positions);
      assert.ok(Math.abs(box.max.y-box.min.y)<1e-5,'landed page must be flat, without sinking through the original book');
      assert.ok(Math.abs(box.max.x-box.min.x-3)<1e-5);
    }
  }
  book.endTurn();assert.equal(leaves[0].parent.visible,false);
});

test('closed cover title faces the reader with its top away from the reader',()=>{
  const originalDocument=globalThis.document;
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){},fillRect(){}})})};
  try{
    const book=new ImportedFateBook();book.setModel(new T.Group());book.setOpening(0);book.group.updateMatrixWorld(true);
    const title=book.group.getObjectByName('fate-cover-title');assert.ok(title);
    const right=new T.Vector3(1,0,0).transformDirection(title.matrixWorld);
    const up=new T.Vector3(0,1,0).transformDirection(title.matrixWorld);
    const normal=new T.Vector3(0,0,1).transformDirection(title.matrixWorld);
    assert.ok(right.distanceTo(new T.Vector3(1,0,0))<1e-6,'letters must read from left to right');
    assert.ok(up.distanceTo(new T.Vector3(0,0,-1))<1e-6,'top of title must point toward the far edge');
    assert.ok(normal.distanceTo(new T.Vector3(0,1,0))<1e-6,'front face must remain above the cover');
  }finally{globalThis.document=originalDocument;}
});

test('real cover effigy has its forehead toward the far edge while the lining and source model stay in place',async()=>{
  const saved={document:globalThis.document,self:globalThis.self,createImageBitmap:globalThis.createImageBitmap};
  globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
  try{
    const bytes=await fs.readFile(new URL('../public/assets/victor-book.glb',import.meta.url));
    const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    gltf.scene.updateMatrixWorld(true);
    const original=gltf.scene.getObjectsByProperty('isMesh',true).find(mesh=>mesh.name.startsWith('Mesh_0012_')),raw=original.geometry.attributes.position.array.slice();
    globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){},fillRect(){}})})};
    const book=new ImportedFateBook();book.setModel(gltf.scene);
    const sculpt=book.group.getObjectsByProperty('isMesh',true).find(mesh=>mesh.name.startsWith('Mesh_0012_')&&mesh.name.endsWith('_left'));assert.ok(sculpt);
    function landmark(mesh,u,v){
      const uv=mesh.geometry.attributes.uv,positions=mesh.geometry.attributes.position;let best=Infinity,index=0;
      for(let i=0;i<uv.count;i++){const distance=(uv.getX(i)-u)**2+(uv.getY(i)-v)**2;if(distance<best){best=distance;index=i;}}
      return new T.Vector3().fromBufferAttribute(positions,index).applyMatrix4(mesh.matrixWorld);
    }
    // Landmarks calibrated against the authored helmet: crown and lower mask.
    for(const opening of [0,.5,1]){
      book.setOpening(opening);book.group.updateMatrixWorld(true);
      const forehead=landmark(sculpt,.72,-.15),chin=landmark(sculpt,.72,-.65);
      assert.ok(forehead.z<chin.z-.8,'effigy must read upright from the player at +Z throughout opening');
    }
    const liningUV=[.25,-.4],before=landmark(original,...liningUV).multiplyScalar(1.9).add(new T.Vector3(0,.42,0));
    const after=landmark(sculpt,...liningUV);assert.ok(before.distanceTo(after)<1e-4,'lining must retain its authored position');
    assert.deepEqual(original.geometry.attributes.position.array,raw,'source GLB geometry must remain untouched');
  }finally{Object.assign(globalThis,saved);}
});
