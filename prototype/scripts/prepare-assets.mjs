import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,weld,textureCompress,meshopt,getBounds} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const project=path.resolve(import.meta.dirname,'../..');
const source=path.join(project,'artifacts/book-v2/source');
const output=path.join(project,'prototype/public/assets');
await fs.mkdir(output,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const reports=[];
for(const [asset,selected] of [
  ['brass_candleholders',['brass_candleholder_03']],
  ['vintage_pocket_watch',null],
  ['book_encyclopedia_set_01',['book_encyclopedia_set_01_book01','book_encyclopedia_set_01_book06','book_encyclopedia_set_01_book13']]
]){
  const doc=await io.read(path.join(source,asset,asset+'.gltf'));
  if(selected)for(const node of doc.getRoot().listNodes())if(!selected.includes(node.getName()))node.dispose();
  if(asset==='brass_candleholders')doc.getRoot().listNodes()[0].setTranslation([0,0,0]);
  await doc.transform(prune(),dedup(),weld(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:86}),meshopt({encoder:MeshoptEncoder,level:'high'}));
  const filename=asset+'.glb';await io.write(path.join(output,filename),doc);
  const checked=await io.read(path.join(output,filename));
  reports.push({asset,filename,bytes:(await fs.stat(path.join(output,filename))).size,bounds:getBounds(checked.getRoot().listScenes()[0]),nodes:checked.getRoot().listNodes().map(n=>({name:n.getName(),bounds:getBounds(n)}))});
}
// Preserve the authored book's named parts for the runtime hinge.
const hero=await io.read(path.join(source,'victor-book/original.glb'));
await hero.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:86}),meshopt({encoder:MeshoptEncoder,level:'high'}));
await io.write(path.join(output,'victor-book.glb'),hero);
for(const asset of ['dark_wood','book_pattern']){
  const meta=JSON.parse(await fs.readFile(path.join(source,asset+'.json'),'utf8'));
  const images=Object.keys(meta.gltf['1k'].gltf.include).filter(n=>n.startsWith('textures/'));
  for(const name of images){
    const suffix=name.includes('nor_gl')?'normal':name.includes('rough')?'roughness':'color';
    await sharp(path.join(source,asset,name)).webp({quality:88}).toFile(path.join(output,asset+'-'+suffix+'.webp'));
  }
}
await fs.copyFile(path.join(source,'ferndale_studio_09/environment.hdr'),path.join(output,'ferndale-studio-09.hdr'));
await fs.writeFile(path.join(project,'artifacts/book-v2/asset-report.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports,null,2));
