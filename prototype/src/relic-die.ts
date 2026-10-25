import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {grain} from './textures';

// Calibrated against the sculpted numeral geometry of both original models.
export const numeralNormals=[[-.569,.782,.253],[-.569,-.782,-.253],[.920,-.299,.252],[0,.966,-.259],[-.920,-.299,.252],[.920,.299,-.252],[0,-.966,.259],[-.920,.299,-.252],[.569,.782,.253],[.569,-.782,-.253]].map(v=>new T.Vector3(v[0],v[1],v[2]/.4).normalize());

/** Adapted Tenshinzo sculpt, with separate solid numeral meshes and added bronze relief. */
export class RelicDie{
  group=new T.Group();base=new T.Vector3();target=new T.Quaternion();private model=new T.Group();
  constructor(private tens:boolean){this.group.add(this.model);this.group.scale.setScalar(.37);}
  setModel(source:T.Object3D){
    this.model.clear();source.updateMatrixWorld(true);const parts:T.Mesh[]=[];source.traverse(n=>{if(n instanceof T.Mesh)parts.push(n);});
    const baked=(part:T.Mesh)=>{const geometry=part.geometry.clone(),position=geometry.attributes.position;const values:number[]=[];for(let i=0;i<position.count;i++)values.push(position.getX(i),position.getY(i),position.getZ(i));geometry.setAttribute('position',new T.Float32BufferAttribute(values,3));const originalNormal=part.geometry.attributes.normal,normalValues:number[]=[];for(let i=0;i<originalNormal.count;i++)normalValues.push(originalNormal.getX(i),originalNormal.getY(i),originalNormal.getZ(i));geometry.setAttribute('normal',new T.Float32BufferAttribute(normalValues,3));geometry.applyMatrix4(part.matrixWorld);return geometry;};
    const numbers=parts.find(n=>n.name.includes('Numbers'))!;const reference=baked(numbers);reference.computeBoundingBox();const center=reference.boundingBox!.getCenter(new T.Vector3());reference.dispose();
    for(const part of parts){
      const geometry=baked(part),position=geometry.attributes.position as T.BufferAttribute;
      for(let i=0;i<position.count;i++){const point=new T.Vector3().fromBufferAttribute(position,i).sub(center);position.setXYZ(i,point.x*.09,point.y*.09,point.z*.09*.4);}
      const normal=geometry.attributes.normal as T.BufferAttribute;for(let i=0;i<normal.count;i++){const n=new T.Vector3(normal.getX(i),normal.getY(i),normal.getZ(i)/.4).normalize();normal.setXYZ(i,n.x,n.y,n.z);}normal.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const isNumber=part.name.includes('Numbers');
      const material=new T.MeshStandardMaterial({color:isNumber?'#c9ad6f':this.tens?'#45463c':'#51453b',metalness:isNumber?.83:.68,roughness:isNumber?.38:.43,bumpMap:grain('bump',128),bumpScale:isNumber?.001:.007});
      const mesh=new T.Mesh(geometry,material);mesh.name=part.name;mesh.castShadow=mesh.receiveShadow=true;this.model.add(mesh);
    }
    const trim:T.BufferGeometry[]=[];
    const tube=(points:T.Vector3[],radius:number)=>new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(12,points.length*3),radius,6,false);
    for(const normal of numeralNormals){
      const up=new T.Vector3(0,0,1).addScaledVector(normal,-normal.z).normalize(),right=new T.Vector3().crossVectors(up,normal).normalize();
      const originalNormal=new T.Vector3(normal.x,normal.y,normal.z*.4).normalize();const transformedLength=new T.Vector3(originalNormal.x,originalNormal.y,originalNormal.z/.4).length();const basis=new T.Matrix4().makeBasis(right,up,normal),origin=normal.clone().multiplyScalar(.855/transformedLength);basis.setPosition(origin);
      // Double engraved arches and tiny scrolls stand above the dark face.
      for(const inset of [1,.88]){
        const points=[new T.Vector3(0,.55*inset,.005),new T.Vector3(.30*inset,.23*inset,.005),new T.Vector3(.28*inset,-.22*inset,.005),new T.Vector3(0,-.52*inset,.005),new T.Vector3(-.28*inset,-.22*inset,.005),new T.Vector3(-.30*inset,.23*inset,.005),new T.Vector3(0,.55*inset,.005)];
        trim.push(tube(points,inset===1?.018:.008).applyMatrix4(basis));
      }
      for(const sign of [-1,1])for(const side of [-1,1]){
        const points: T.Vector3[]=[];for(let i=0;i<=28;i++){const t=i/28*Math.PI*2.2,r=.085*(1-i/34);points.push(new T.Vector3(side*(.10+Math.cos(t)*r),sign*(.39+Math.sin(t)*r),.016));}
        trim.push(tube(points,.009).applyMatrix4(basis));
      }
      for(const y of [-.52,.55])trim.push(new T.SphereGeometry(.033,8,6).translate(0,y,.022).applyMatrix4(basis));
    }
    const relief=new T.Mesh(mergeGeometries(trim),new T.MeshStandardMaterial({color:'#9d8050',metalness:.86,roughness:.43}));relief.castShadow=relief.receiveShadow=true;this.model.add(relief);trim.forEach(g=>g.dispose());
    for(const sign of [-1,1]){
      const cap=new T.Mesh(new T.SphereGeometry(.125,16,12),new T.MeshStandardMaterial({color:'#a68c59',metalness:.85,roughness:.4}));cap.scale.set(1,1,1.35);cap.position.z=sign*1.36;this.model.add(cap);
      const jewel=new T.Mesh(new T.IcosahedronGeometry(.072,1),new T.MeshPhysicalMaterial({color:this.tens?'#1e4e44':'#63392d',metalness:.3,roughness:.2,clearcoat:.7}));jewel.position.z=sign*1.51;this.model.add(jewel);
    }
    this.faceUp(this.tens?4:7);this.group.quaternion.copy(this.target);
  }
  faceUp(value:number){this.target.setFromUnitVectors(numeralNormals[value],new T.Vector3(0,1,0));this.target.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.2));}
  roll(p:number,index:number){const phase=p*13.4+index*2.1,decay=1-p;this.group.position.copy(this.base);this.group.position.x+=Math.sin(phase)*.75*decay;this.group.position.z+=Math.cos(phase*.9)*.52*decay;this.group.position.y+=Math.abs(Math.sin(p*Math.PI*4.5))*.9*decay;this.group.quaternion.copy(this.target).multiply(new T.Quaternion().setFromEuler(new T.Euler(Math.PI*8*(1-p),Math.PI*5*(1-p),Math.PI*6*(1-p))));}
}
