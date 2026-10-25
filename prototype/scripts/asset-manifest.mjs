import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../public/assets');
const source='https://sketchfab.com/3d-models/book-7f702789fd444ad3b1c4cb3987d955fc';
const files=[];
for(const name of (await fs.readdir(root)).filter(n=>n!=='manifest.json').sort()){
  const data=await fs.readFile(path.join(root,name));
  const hero=name==='victor-book.glb';
  const id=name.startsWith('ferndale')?'ferndale_studio_09':name.replace(/-(color|normal|roughness)\.webp$|\.glb$/,'');
  files.push({file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),title:hero?'Book':id,
    creator:hero?'victorberdugo1':'Poly Haven contributors (see source page)',source:hero?source:'https://polyhaven.com/a/'+id,
    license:hero?'CC BY 4.0':'CC0 1.0',licenseUrl:hero?'https://creativecommons.org/licenses/by/4.0/':'https://polyhaven.com/license',
    modifications:hero?'WebP textures and Meshopt compression; runtime triangle split, hinge rig, added Chinese print and deforming page animation. Original model is static.':'Selected candleholder 03 and encyclopedia volumes 01/06/13; compressed GLB/WebP; scene scale, placement and lighting.',
    ...(hero?{originalSha256:'3210393d368848c7c3b8f78741dbfac52d1ebe0060b768e0204639bfe15e7c83'}:{})});
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({version:2,assets:files},null,2)+'\n');
console.log(`${files.length} licensed assets; ${files.reduce((n,f)=>n+f.bytes,0)} bytes`);
