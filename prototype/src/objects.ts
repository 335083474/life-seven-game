import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cardTexture,grain} from './textures';
import {elements} from './state.mjs';

export function box(w:number,h:number,d:number,material:T.Material,x=0,y=0,z=0,r=.025){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,r),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}

export class LifeCard{
  group=new T.Group();home=new T.Vector3();hover=false;selected=false;target=0;label:string;
  private faceMaterial:T.MeshStandardMaterial;private index:number;private paper?:T.Texture;private card=elements[0];
  constructor(index:number){this.index=index;const card=elements[index];this.card=card;this.label=card.name;this.group.add(box(1.10,.052,1.64,new T.MeshStandardMaterial({color:'#362419',bumpMap:grain('bump',128),bumpScale:.008,roughness:.88}),0,0,0,.025));
    this.faceMaterial=new T.MeshStandardMaterial({map:cardTexture(card,index),roughness:.94,metalness:0});
    const face=new T.Mesh(new T.PlaneGeometry(1.064,1.60),this.faceMaterial);face.rotation.x=-Math.PI/2;face.position.y=.030;face.receiveShadow=true;this.group.add(face);
    const bronze=new T.MeshStandardMaterial({color:'#80704b',metalness:.72,roughness:.65});
    for(const x of [-.50,.50])for(const z of [-.76,.76]){
      this.group.add(box(.095,.016,.022,bronze,x,.041,z,.004));this.group.add(box(.022,.016,.095,bronze,x,.041,z,.004));
      const rivet=new T.Mesh(new T.SphereGeometry(.014,8,6),bronze);rivet.position.set(x,.049,z);rivet.scale.y=.4;this.group.add(rivet);
    }
  }
  setPaper(paper:T.Texture){this.paper=paper;this.setCard(this.card);}
  setCard(card:{name:string;subtitle:string;level:number;icon:string;language?:string}){this.card={...elements[0],...card};this.label=card.name;this.faceMaterial.map?.dispose();this.faceMaterial.map=cardTexture(this.card,this.index,this.paper);this.faceMaterial.needsUpdate=true;}
  update(dt:number){const desired=(this.selected?.28:0)+(this.hover?.12:0),a=1-Math.exp(-dt*11);this.target=T.MathUtils.lerp(this.target,desired,a);this.group.position.copy(this.home);this.group.position.y+=this.target;this.group.rotation.z=T.MathUtils.lerp(this.group.rotation.z,this.selected?-.045:0,a);return Math.abs(this.target-desired)>.0004;}
}
