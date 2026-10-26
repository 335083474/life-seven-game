import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {PerspectiveCamera,Vector3} from 'three';
const source=readFileSync(new URL('../src/book-framing.ts',import.meta.url),'utf8');
const {bookViewX,spreadFov,pageFov}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));

test('both physical leaves fit the viewport and either leaf can be enlarged without clipping its content',()=>{
  for(const [width,height] of [[390,844],[600,900],[1280,720]]){
    for(const view of ['spread','left','right']){
      const x=bookViewX(view),position=view==='spread'?new Vector3(0,11.5,7.8):new Vector3(x,8.7,6);
      const target=view==='spread'?new Vector3(0,.2,1.05):new Vector3(x,.4,.3);
      const fov=view==='spread'?spreadFov(width/height,position.distanceTo(target)):pageFov(width/height,position.distanceTo(target));
      const camera=new PerspectiveCamera(fov,width/height,.1,80);camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();
      const xs=view==='spread'?[-2.74,2.74]:[x-1.23,x+1.23];
      for(const cornerX of xs)for(const z of [-1.52,1.52]){
        const projected=new Vector3(cornerX,1.1,z).project(camera);
        assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,`${width}px ${view}: content corner clipped`);
      }
    }
  }
});
