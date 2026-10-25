import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cardTexture,numberTexture,grain} from './textures';
import {elements} from './state.mjs';

export function box(w:number,h:number,d:number,material:T.Material,x=0,y=0,z=0,r=.025){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,r),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}

export class LifeCard{
  group=new T.Group();home=new T.Vector3();hover=false;selected=false;target=0;label:string;
  private faceMaterial:T.MeshStandardMaterial;private index:number;
  constructor(index:number){this.index=index;const card=elements[index];this.label=card.name;this.group.add(box(1.10,.052,1.64,new T.MeshStandardMaterial({color:'#362419',bumpMap:grain('bump',128),bumpScale:.008,roughness:.88}),0,0,0,.025));
    this.faceMaterial=new T.MeshStandardMaterial({map:cardTexture(card,index),roughness:.94,metalness:0});
    const face=new T.Mesh(new T.PlaneGeometry(1.064,1.60),this.faceMaterial);face.rotation.x=-Math.PI/2;face.position.y=.030;face.receiveShadow=true;this.group.add(face);
    const bronze=new T.MeshStandardMaterial({color:'#80704b',metalness:.72,roughness:.65});
    for(const x of [-.50,.50])for(const z of [-.76,.76]){
      this.group.add(box(.095,.016,.022,bronze,x,.041,z,.004));this.group.add(box(.022,.016,.095,bronze,x,.041,z,.004));
      const rivet=new T.Mesh(new T.SphereGeometry(.014,8,6),bronze);rivet.position.set(x,.049,z);rivet.scale.y=.4;this.group.add(rivet);
    }
  }
  setPaper(paper:T.Texture){this.faceMaterial.map?.dispose();this.faceMaterial.map=cardTexture(elements[this.index],this.index,paper);this.faceMaterial.needsUpdate=true;}
  update(dt:number){const desired=(this.selected?.28:0)+(this.hover?.12:0),a=1-Math.exp(-dt*11);this.target=T.MathUtils.lerp(this.target,desired,a);this.group.position.copy(this.home);this.group.position.y+=this.target;this.group.rotation.z=T.MathUtils.lerp(this.group.rotation.z,this.selected?-.045:0,a);return Math.abs(this.target-desired)>.0004;}
}

export class TenDie{
  group=new T.Group();faces:{normal:T.Vector3;center:T.Vector3}[]=[];base=new T.Vector3();target=new T.Quaternion();start=new T.Quaternion();
  constructor(tens:boolean){
    const apex=1.10,h=apex*(1-Math.cos(Math.PI/5))/(1+Math.cos(Math.PI/5)),points=[new T.Vector3(0,apex,0),new T.Vector3(0,-apex,0)];
    for(let i=0;i<10;i++)points.push(new T.Vector3(Math.cos(i*Math.PI/5),i%2?-h:h,Math.sin(i*Math.PI/5)));
    const vertices:number[]=[];const addFace=(ids:number[])=>{const center=ids.reduce((s,k)=>s.add(points[k]),new T.Vector3()).multiplyScalar(.25);let normal=new T.Vector3().crossVectors(points[ids[1]].clone().sub(points[ids[0]]),points[ids[2]].clone().sub(points[ids[0]])).normalize();if(normal.dot(center)<0){ids.reverse();normal.negate();}
      this.faces.push({normal,center});for(const tri of [[0,1,2],[0,2,3]])for(const k of tri)vertices.push(...points[ids[k]].toArray());};
    for(let i=0;i<5;i++)addFace([0,2+(2*i)%10,2+(2*i+1)%10,2+(2*i+2)%10]);for(let i=0;i<5;i++)addFace([1,2+(2*i+1)%10,2+(2*i+2)%10,2+(2*i+3)%10]);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
    const body=new T.Mesh(geo,new T.MeshStandardMaterial({color:tens?'#594a32':'#726144',roughness:.66,metalness:.78,bumpMap:grain('bump',128),bumpScale:.009,flatShading:true}));body.castShadow=true;body.receiveShadow=true;this.group.add(body);
    this.faces.forEach((face,i)=>{const label=new T.Mesh(new T.PlaneGeometry(.60,.60),new T.MeshStandardMaterial({map:numberTexture(tens?String(i*10).padStart(2,'0'):String(i),'#f0d6a0'),transparent:true,depthWrite:false,roughness:.75,metalness:.2}));label.position.copy(face.center).addScaledVector(face.normal,.005);const up=new T.Vector3(0,0,-1).applyQuaternion(new T.Quaternion().setFromUnitVectors(face.normal,new T.Vector3(0,1,0)).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.2)).invert());const right=new T.Vector3().crossVectors(up,face.normal).normalize();up.crossVectors(face.normal,right).normalize();label.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,face.normal));this.group.add(label);});
    const edges=new T.LineSegments(new T.EdgesGeometry(geo,20),new T.LineBasicMaterial({color:'#ae9764',transparent:true,opacity:.4}));this.group.add(edges);this.group.scale.setScalar(.37);this.faceUp(tens?4:7);this.group.quaternion.copy(this.target);
  }
  faceUp(number:number){this.target.setFromUnitVectors(this.faces[number].normal,new T.Vector3(0,1,0));this.target.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.2));}
  roll(p:number,index:number){const phase=p*13.4+index*2.1,decay=1-p;this.group.position.copy(this.base);this.group.position.x+=Math.sin(phase)*.75*decay;this.group.position.z+=Math.cos(phase*.9)*.52*decay;this.group.position.y+=Math.abs(Math.sin(p*Math.PI*4.5))*.9*decay;
    const twist=new T.Quaternion().setFromEuler(new T.Euler(Math.PI*8*(1-p),Math.PI*5*(1-p),Math.PI*6*(1-p)));this.group.quaternion.copy(this.target).multiply(twist);
  }
}
