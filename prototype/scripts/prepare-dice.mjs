import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';
import fs from 'node:fs/promises';
await MeshoptEncoder.ready;
for(const kind of ['d10','d100']){
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
 const doc=await io.read('artifacts/dice-model/source/original.glb');
 const selected=doc.getRoot().listNodes().filter(n=>n.getName().includes(kind+' text-')&&n.getMesh());
 const scene=doc.createScene(kind);doc.getRoot().setDefaultScene(scene);
 for(const n of selected){n.getParentNode()?.removeChild(n);for(const old of doc.getRoot().listScenes())if(old!==scene)old.removeChild(n);scene.addChild(n);n.setTranslation([0,0,0]).setRotation([0,0,0,1]).setScale([1,1,1]);}
 for(const old of [...doc.getRoot().listScenes()])if(old!==scene)old.dispose();
 for(const m of doc.getRoot().listMaterials())m.setBaseColorFactor(m.getName()==='Numbers'?[.72,.52,.25,1]:[.28,.21,.13,1]).setMetallicFactor(.82).setRoughnessFactor(m.getName()==='Numbers'?.40:.36);
 await doc.transform(prune(),dedup(),meshopt({encoder:MeshoptEncoder,level:'high'}));
 await io.write('prototype/public/assets/fate-'+kind+'.glb',doc);
}
