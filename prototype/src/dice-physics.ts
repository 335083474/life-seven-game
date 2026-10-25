import RAPIER from '@dimforge/rapier3d-compat';
import * as T from 'three';

export type DieShape={vertices:Float32Array;normals:T.Vector3[];position:T.Vector3;rotation:T.Quaternion};
export type Pose={position:T.Vector3;rotation:T.Quaternion};
export type DiceThrow={frames:Pose[][];duration:number;impacts:number[];attempts:number};
let ready:Promise<void>|undefined;
export const initDicePhysics=()=>ready??=RAPIER.init();
const dt=1/120;
function collisionPoints(shape:DieShape){
  // A compact convex proxy keeps engraving triangles out of the contact solver.
  const directions=[...shape.normals,...shape.normals.map(n=>n.clone().negate())];
  for(let i=0;i<256;i++){const y=1-2*(i+.5)/256,r=Math.sqrt(1-y*y),angle=i*2.3999632297;directions.push(new T.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r));}
  const selected=new Set<number>(),points=shape.vertices;
  for(const direction of directions){let best=-Infinity,index=0;for(let i=0;i<points.length;i+=3){const dot=points[i]*direction.x+points[i+1]*direction.y+points[i+2]*direction.z;if(dot>best){best=dot;index=i;}}selected.add(index);}
  return Float32Array.from([...selected].flatMap(i=>[points[i],points[i+1],points[i+2]]));
}
function topFace(normals:T.Vector3[],rotation:T.Quaternion){let index=0,best=-Infinity;normals.forEach((normal,i)=>{const y=normal.clone().applyQuaternion(rotation).y;if(y>best){best=y;index=i;}});return index;}

/** Keep the existing unbiased D100 result; choose a simulated throw that actually lands on it.
 * The complete recorded path comes from Rapier, including dice-to-dice collisions.
 * There is no correction torque, orientation snap, or slide after the simulation sleeps.
 */
export async function prepareDiceThrow(shapes:DieShape[],values:number[],random:()=>number=Math.random,yieldWork:()=>Promise<void>=()=>new Promise(resolve=>setTimeout(resolve,0)),acceptFrame:(poses:Pose[])=>boolean=()=>true):Promise<DiceThrow>{
  await initDicePhysics();
  const colliders=shapes.map(shape=>{const desc=RAPIER.ColliderDesc.roundConvexHull(collisionPoints(shape),.014);if(!desc)throw Error('Invalid dice hull');return desc.setMass(.018).setFriction(.48).setRestitution(.48);});
  const launch=(shape:DieShape)=>{
    const size=shape.vertices.reduce((maximum,n)=>Math.max(maximum,Math.abs(n)),0)/.55;
    const angle=random()*Math.PI*2,tumble=8+random()*5;
    return {linear:{x:(random()-.5)*.65*size,y:(4.15+random()*.65)*Math.sqrt(Math.max(.65,size)),z:(random()-.5)*.45*size},angular:{x:Math.cos(angle)*tumble,y:(random()-.5)*8,z:Math.sin(angle)*tumble}};
  };
  let firstLaunch:ReturnType<typeof launch>|undefined,lockedAt=0;
  for(let attempt=1;attempt<=600;attempt++){
    const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=dt;world.numSolverIterations=8;
    try{
      world.createCollider(RAPIER.ColliderDesc.cuboid(18,.12,14).setTranslation(0,-.12,0).setFriction(.48).setRestitution(.3));
      world.createCollider(RAPIER.ColliderDesc.cuboid(3.5,.54,2.2).setTranslation(0,.54,0).setFriction(.7).setRestitution(.1));
      if(attempt-lockedAt>100)firstLaunch=undefined;
      const launches=[firstLaunch??launch(shapes[0]),launch(shapes[1])];
      const bodies=shapes.map((shape,i)=>{
        const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(shape.position.x,shape.position.y,shape.position.z).setRotation(shape.rotation).setLinearDamping(.12).setAngularDamping(.12).setCcdEnabled(true));
        world.createCollider(colliders[i],body);
        body.setLinvel(launches[i].linear,true);body.setAngvel(launches[i].angular,true);return body;
      });
      const capture=()=>bodies.map(body=>({position:new T.Vector3().copy(body.translation()),rotation:new T.Quaternion().copy(body.rotation()).normalize()}));
      const frames:Pose[][]=[capture()],impacts:number[]=[];let previousVertical=bodies.map(b=>b.linvel().y),valid=true;
      for(let step=1;step<=840;step++){
        world.step();const frame=capture();frames.push(frame);
        bodies.forEach((body,i)=>{const vertical=body.linvel().y;if(previousVertical[i]<-.6&&vertical>previousVertical[i]+.5&&(step/120-(impacts.at(-1)??-1))>.07)impacts.push(step/120);previousVertical[i]=vertical;});
        if(!acceptFrame(frame)||frame.some((pose,i)=>Math.abs(pose.position.x-shapes[i].position.x)>.9||Math.abs(pose.position.z-shapes[i].position.z)>.65)){valid=false;break;}
        if(step>90&&bodies.every(body=>body.isSleeping()))break;
      }
      if(valid&&bodies.every(body=>body.isSleeping())){
        const faces=frames.at(-1)!.map((pose,i)=>topFace(shapes[i].normals,pose.rotation));
        const upright=faces.every((face,i)=>shapes[i].normals[face].clone().applyQuaternion(frames.at(-1)![i].rotation).y>.95);
        if(upright&&faces.every((face,i)=>face===values[i]))return {frames,duration:(frames.length-1)*dt,impacts,attempts:attempt};
        if(!firstLaunch&&faces[0]===values[0]){firstLaunch=launches[0];lockedAt=attempt;}
      }
    }finally{world.free();}
    if(attempt%4===0)await yieldWork();
  }
  throw Error('A matching settled throw could not be prepared');
}

export function sampleDiceThrow(throwData:DiceThrow,seconds:number,groups:T.Group[]){
  const time=T.MathUtils.clamp(seconds/dt,0,throwData.frames.length-1),index=Math.floor(time),next=Math.min(index+1,throwData.frames.length-1),alpha=time-index;
  groups.forEach((group,i)=>{group.position.lerpVectors(throwData.frames[index][i].position,throwData.frames[next][i].position,alpha);group.quaternion.slerpQuaternions(throwData.frames[index][i].rotation,throwData.frames[next][i].rotation,alpha);});
}
