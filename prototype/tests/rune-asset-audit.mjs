import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
async function runtime(file){let source=await fs.readFile(new URL(`../src/${file}.ts`,import.meta.url),'utf8');source=source.replace("import {grain} from './textures';",'function grain(){return null;}');for(const name of ['three','three/addons/utils/BufferGeometryUtils.js','@dimforge/rapier3d-compat'])source=source.replaceAll(`from '${name}'`,`from '${import.meta.resolve(name)}'`);return import('data:text/javascript;base64,' +Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'));}
const {RelicDie}=await runtime('relic-die'),{prepareDiceThrow,sampleDiceThrow}=await runtime('dice-physics');
async function load(name){const buffer=await fs.readFile(new URL(`../public/assets/${name}.glb`,import.meta.url));return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'')).scene;}
const cases=[['rune-audit',.37]];
for(const [skin,scale] of cases)test(`${skin} at ${scale}: real rigid-body throw starts continuously, stays above the desk and sleeps on the requested faces`,async()=>{
  const dice=[new RelicDie(true),new RelicDie(false)];
  if(skin==='legacy'){dice[0].setModel(await load('fate-d100'));dice[1].setModel(await load('fate-d10'));}
  else{const model=await load('dice-rune');dice.forEach(die=>die.setImportedModel(model.getObjectByName('percentile')));}
  dice.forEach((die,i)=>{die.group.scale.setScalar(scale);die.base.set(scale===.26?(i===0?1.18:2.1):(i===0?4.6:5.05),.43,scale===.26?(i===0?2.85:3.05):(i===0?.85:2.12));die.rest();});
  const shapes=dice.map(d=>d.physicsShape());let seed=1927;const random=()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
  const timings=[];
  for(const values of Array.from({length:10},(_,i)=>[i,(i+5)%10]).concat([[0,0],[9,9]])){
  const started=performance.now(),plan=await prepareDiceThrow(shapes,values,random,async()=>{});
  timings.push(Math.round(performance.now()-started));
  for(let i=0;i<2;i++){
    assert.ok(plan.frames[0][i].position.distanceTo(shapes[i].position)<1e-6);assert.ok(plan.frames[0][i].rotation.angleTo(shapes[i].rotation)<1e-6);
    const end=plan.frames.at(-1)[i],last=plan.frames.at(-2)[i];assert.ok(end.position.distanceTo(last.position)<1e-5&&end.rotation.angleTo(last.rotation)<1e-5,'simulation must sleep before it ends');
    const up=shapes[i].normals.map(n=>n.clone().applyQuaternion(end.rotation).y);assert.equal(up.indexOf(Math.max(...up)),values[i]);assert.ok(Math.max(...up)>.94,'the numeral face must be clearly upward');
  }
  for(let frame=0;frame<plan.frames.length;frame+=12){
    sampleDiceThrow(plan,frame/120,dice.map(d=>d.group));
    dice.forEach((die,i)=>{const pose=plan.frames[frame][i];assert.ok(pose.position.distanceTo(die.group.position)<1e-6);const points=shapes[i].vertices,point=new T.Vector3();let bottom=Infinity;for(let j=0;j<points.length;j+=3){point.set(points[j],points[j+1],points[j+2]).applyQuaternion(pose.rotation).add(pose.position);bottom=Math.min(bottom,point.y);}assert.ok(bottom>-.025,`no visible desk penetration: ${bottom}`);});
  }
  }
  console.log(skin,scale,{throws:timings.length,maxPreparationMs:Math.max(...timings)});
});
