import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import * as T from 'three';
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
