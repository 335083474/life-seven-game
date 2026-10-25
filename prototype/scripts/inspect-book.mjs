import {NodeIO} from '@gltf-transform/core';
import {getBounds} from '@gltf-transform/functions';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const folder=path.resolve(import.meta.dirname,'../../artifacts/book-v2/source/victor-book');
const document=await new NodeIO().read(path.join(folder,'original.glb'));
const result={bounds:getBounds(document.getRoot().listScenes()[0]),nodes:document.getRoot().listNodes().filter(n=>n.getMesh()).map(n=>({name:n.getName(),bounds:getBounds(n),matrix:n.getWorldMatrix(),primitives:n.getMesh().listPrimitives().map(p=>({vertices:p.getAttribute('POSITION').getCount(),material:p.getMaterial()?.getName()}))})),textures:[]};
for(const [i,texture] of document.getRoot().listTextures().entries()){
 const metadata=await sharp(texture.getImage()).metadata();result.textures.push({index:i,name:texture.getName(),width:metadata.width,height:metadata.height,mime:texture.getMimeType()});
 await fs.writeFile(path.join(folder,`texture-${i}.`+(texture.getMimeType()==='image/png'?'png':'jpg')),texture.getImage());
}
await fs.writeFile(path.join(folder,'inspection.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
