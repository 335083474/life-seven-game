import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,meshopt,textureCompress,transformMesh,metalRough} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import * as T from 'three';
import fs from 'node:fs/promises';
const kind=process.argv[2]||'bronze';
const configs=JSON.parse(await fs.readFile('prototype/scripts/dice-skins-config.json','utf8'));
const config=configs[kind];await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(config.path),root=doc.getRoot(),oldScenes=root.listScenes();
if(root.listExtensionsUsed().some(extension=>extension.extensionName==='KHR_materials_pbrSpecularGlossiness'))await doc.transform(metalRough());
if(kind==='rune')for(const material of root.listMaterials()){
 const ior=material.getExtension('KHR_materials_ior');if(ior)ior.setIOR(1.5);
 if(material.getName()==='Dice')material.setBaseColorFactor([.045,.055,.06,1]).setAlphaMode('OPAQUE').setDoubleSided(false).setRoughnessFactor(.48);
}
if(!config.names.length){console.log(root.listNodes().map(n=>[n.getName(),!!n.getMesh()]));process.exit();}
const scene=doc.createScene(kind);root.setDefaultScene(scene);const records=[];
for(const [index,name] of config.names.entries()){
 const source=root.listNodes().find(n=>n.getName()===name);if(!source)throw Error(name);
 const nodes=[];source.traverse(n=>{if(n.getMesh())nodes.push(n);});
 const dieKind=config.kinds?.[index]??(index===0?'percentile':'unit');
 const holder=doc.createNode(dieKind);scene.addChild(holder);const bounds=new T.Box3();
 for(const n of nodes){transformMesh(n.getMesh(),n.getWorldMatrix());for(const primitive of n.getMesh().listPrimitives()){const a=primitive.getAttribute('POSITION'),v=[];for(let i=0;i<a.getCount();i++){a.getElement(i,v);bounds.expandByPoint(new T.Vector3(...v));}}}
 const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),scale=3/Math.max(size.x,size.y,size.z),matrix=new T.Matrix4().makeScale(scale,scale,scale).setPosition(center.clone().multiplyScalar(-scale));
 const histogram=new Map();
 for(const n of nodes){transformMesh(n.getMesh(),matrix.toArray());const next=doc.createNode(n.getName()).setMesh(n.getMesh());holder.addChild(next);
  for(const p of n.getMesh().listPrimitives()){
   if(kind==='rune'&&p.getMaterial()?.getName()==='Numbers')continue;
   const pos=p.getAttribute('POSITION'),indices=p.getIndices(),count=indices?indices.getCount():pos.getCount(),v=[];
   for(let i=0;i<count;i+=3){const points=[0,1,2].map(k=>{pos.getElement(indices?indices.getScalar(i+k):i+k,v);return new T.Vector3(...v);});const cross=points[1].sub(points[0]).cross(points[2].sub(points[0])),area=cross.length()/2;if(area<1e-9)continue;const normal=cross.normalize(),key=normal.toArray().map(x=>x.toFixed(2)).join(',');const hit=histogram.get(key)||{normal:normal.toArray(),area:0};hit.area+=area;histogram.set(key,hit);}
  }
 }
 const candidates=[];for(const h of [...histogram.values()].sort((a,b)=>b.area-a.area))if(!candidates.some(c=>new T.Vector3(...c.normal).dot(new T.Vector3(...h.normal))>.99)){candidates.push(h);if(candidates.length===10)break;}
 const order=config.faceOrder?.[dieKind];
 const normals=order?order.map(i=>candidates[i].normal):candidates.map(c=>c.normal);holder.setExtras({faceNormals:normals,dieKind});records.push({name:holder.getName(),candidates});
}
for(const s of oldScenes)s.dispose();await doc.transform(prune(),dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:85}),meshopt({encoder:MeshoptEncoder,level:'high'}));
await fs.writeFile(`artifacts/dice-skins/${kind}-candidates.json`,JSON.stringify(records,null,2));
await io.write(`prototype/public/assets/dice-${kind}.glb`,doc);console.log(records);
