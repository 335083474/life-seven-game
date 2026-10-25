import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {grain,coverFoil,cardTexture,pageTexture,numberTexture} from './textures';
import {elements} from './state.mjs';

export const brass=new T.MeshStandardMaterial({color:'#bba16a',metalness:.84,roughness:.31});
const darkBrass=new T.MeshStandardMaterial({color:'#655538',metalness:.75,roughness:.45});
const paper=new T.MeshStandardMaterial({color:'#e5d6b2',roughness:.96,map:grain('paper')});
const leather=new T.MeshStandardMaterial({color:'#cbd5b8',map:grain('leather'),bumpMap:grain('bump',256),bumpScale:.018,roughness:.77});
const innerLeather=new T.MeshStandardMaterial({color:'#20362a',roughness:.82,bumpMap:grain('bump',128),bumpScale:.014});
const boardEdge=new T.MeshStandardMaterial({color:'#213c2d',roughness:.68});
const vec=new T.Vector3();
export function box(w:number,h:number,d:number,material:T.Material,x=0,y=0,z=0,r=.025){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,r),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function tube(points:T.Vector3[],radius:number,material:T.Material){const curve=new T.CatmullRomCurve3(points),m=new T.Mesh(new T.TubeGeometry(curve,Math.max(16,points.length*5),radius,5,false),material);m.castShadow=true;return m;}
function pin(x:number,z:number){const mesh=new T.Mesh(new T.SphereGeometry(.035,10,8),brass);mesh.scale.y=.4;mesh.position.set(x,.087,z);return mesh;}

export class FateBook{
  group=new T.Group();cover=new T.Group();leftStack=new T.Group();leftTop:T.Mesh;rightTop:T.Mesh;turning:T.Mesh;turningBack:T.Mesh;turnGroup=new T.Group();
  private vertices:Float32Array;private paperBase:T.CanvasTexture;private turnTextures:T.Texture[]=[];
  constructor(){
    this.group.add(box(3.48,.15,4.96,leather,1.70,.12,0,.065));
    const spine=new T.Mesh(new T.CylinderGeometry(.32,.32,4.93,32,1,false,0,Math.PI),leather);spine.rotation.x=Math.PI/2;spine.position.set(.02,.27,0);spine.castShadow=true;this.group.add(spine);
    for(const z of [-1.95,-1.40,1.40,1.95]){const band=new T.Mesh(new T.TorusGeometry(.325,.014,7,24,Math.PI),innerLeather);band.position.set(.01,.27,z);this.group.add(band);}
    const rightBlock=box(3.12,.30,4.53,paper,1.66,.35,0,.018);this.group.add(rightBlock);
    this.leftStack.add(box(3.12,.28,4.53,paper,-1.66,.35,0,.018));this.group.add(this.leftStack);
    for(let i=0;i<26;i++){
      const y=.218+i*.011;
      const line=new T.Mesh(new T.BoxGeometry(3.11,.0025,4.54),new T.MeshStandardMaterial({color:i%3?'#ae9870':'#ddcca8',roughness:1}));line.position.set(1.66,y,0);this.group.add(line);
      const l=line.clone();l.position.x=-1.66;this.leftStack.add(l);
    }
    this.paperBase=pageTexture('','');
    const topMaterial=new T.MeshStandardMaterial({map:this.paperBase,roughness:.98,color:'#fff9e7'});
    this.rightTop=new T.Mesh(new T.PlaneGeometry(3.10,4.50,24,8),topMaterial.clone());this.rightTop.rotation.x=-Math.PI/2;this.rightTop.position.set(1.66,.512,0);this.rightTop.receiveShadow=true;
    this.leftTop=this.rightTop.clone();this.leftTop.material=topMaterial.clone();this.leftTop.position.x=-1.66;this.group.add(this.rightTop,this.leftTop);
    const seam=tube([new T.Vector3(-.12,.51,-2.26),new T.Vector3(0,.42,-1),new T.Vector3(0,.42,1),new T.Vector3(-.12,.51,2.26)],.055,innerLeather);this.group.add(seam);
    this.cover.add(box(3.49,.14,4.96,leather,1.70,0,0,.065));
    this.cover.add(box(3.29,.015,4.74,innerLeather,1.70,-.075,0,.032));
    const foil=new T.Mesh(new T.PlaneGeometry(3.20,4.72),new T.MeshStandardMaterial({color:'#dfc17a',metalness:.94,roughness:.27,alphaMap:coverFoil(),transparent:true,depthWrite:false}));foil.rotation.x=-Math.PI/2;foil.position.set(1.70,.077,0);this.cover.add(foil);
    for(const z of [-2.27,2.27])for(const x of [.24,3.14]){this.cover.add(pin(x,z));const corner=box(.35,.025,.35,brass,x,.073,z,.02);corner.rotation.y=Math.PI/4;this.cover.add(corner);}
    for(const z of [-1.2,1.2]){this.cover.add(box(.44,.043,.20,darkBrass,3.32,.035,z,.02));this.cover.add(pin(3.36,z));}
    this.group.add(this.cover);
    // A ribbon follows the gutter and extends beyond the lower edge.
    this.group.add(tube([new T.Vector3(.04,.53,-2.2),new T.Vector3(.05,.53,.5),new T.Vector3(.11,.25,2.45),new T.Vector3(.25,.17,2.88)],.042,new T.MeshStandardMaterial({color:'#843d2b',roughness:.9})));
    const geo=new T.PlaneGeometry(3.10,4.50,52,7);geo.rotateX(-Math.PI/2);geo.translate(1.55,0,0);this.vertices=new Float32Array(geo.attributes.position.array);
    this.turning=new T.Mesh(geo,new T.MeshStandardMaterial({map:this.paperBase,side:T.FrontSide,roughness:.97}));this.turningBack=new T.Mesh(geo,new T.MeshStandardMaterial({map:this.paperBase,side:T.BackSide,roughness:.97}));
    this.turning.castShadow=this.turning.receiveShadow=true;this.turningBack.castShadow=this.turningBack.receiveShadow=true;
    this.turnGroup.add(this.turning,this.turningBack);this.turnGroup.position.set(.10,.535,0);this.turnGroup.visible=false;this.group.add(this.turnGroup);
    this.setOpening(0);
  }
  setOpening(p:number){this.cover.rotation.z=Math.PI*p;this.cover.position.y=.65-.40*p;this.leftStack.scale.x=Math.max(.001,p);this.leftTop.visible=p>.95;this.leftStack.visible=p>.12;this.group.position.x=-1.70*(1-p);}
  beginTurn(oldTitle:string,oldBody:string,newTitle:string,newBody:string){
    this.turnTextures.forEach(t=>t.dispose());const front=pageTexture(oldTitle,oldBody),back=pageTexture(newTitle,newBody);back.center.x=.5;back.repeat.x=-1;
    (this.turning.material as T.MeshStandardMaterial).map=front;(this.turningBack.material as T.MeshStandardMaterial).map=back;this.turnTextures=[front,back];this.turnGroup.visible=true;this.setTurn(0);
  }
  setTurn(p:number){
    const positions=this.turning.geometry.attributes.position as T.BufferAttribute;
    const width=3.10,steps=52,xs:number[]=[0],ys:number[]=[0],s=Math.sin(Math.PI*p);
    for(let i=1;i<=steps;i++){const u=(i-.5)/steps,a=Math.PI*p+s*(.38*Math.sin(u*Math.PI)-.11);xs[i]=xs[i-1]+Math.cos(a)*width/steps;ys[i]=ys[i-1]+Math.sin(a)*width/steps;}
    for(let i=0;i<positions.count;i++){const u=this.vertices[i*3]/width,index=Math.min(steps,Math.round(u*steps)),z=this.vertices[i*3+2];positions.setXYZ(i,xs[index],ys[index]+s*.025*z*Math.sin(u*Math.PI),z+s*.05*Math.sin(u*Math.PI));}
    positions.needsUpdate=true;this.turning.geometry.computeVertexNormals();
  }
  endTurn(){this.turnGroup.visible=false;}
  setPrintedPages(leftTitle:string,leftBody:string,rightTitle:string,rightBody:string,printed:boolean){
    for(const [mesh,title,body] of [[this.leftTop,leftTitle,leftBody],[this.rightTop,rightTitle,rightBody]] as const){const material=mesh.material as T.MeshStandardMaterial;if(material.map!==this.paperBase)material.map?.dispose();material.map=printed?pageTexture(title,body):this.paperBase;material.needsUpdate=true;}
  }
}

export class LifeCard{
  group=new T.Group();home=new T.Vector3();hover=false;selected=false;target=0;label:string;
  constructor(index:number){const card=elements[index];this.label=card.name;this.group.add(box(1.10,.041,1.64,new T.MeshStandardMaterial({color:'#9d895e',metalness:.25,roughness:.55}),0,0,0,.045));
    const face=new T.Mesh(new T.PlaneGeometry(1.064,1.60),new T.MeshStandardMaterial({map:cardTexture(card,index),roughness:.73,metalness:.06}));face.rotation.x=-Math.PI/2;face.position.y=.024;face.receiveShadow=true;this.group.add(face);
    const rim=new T.Mesh(new RoundedBoxGeometry(1.13,.035,1.67,2,.04),new T.MeshStandardMaterial({color:'#d4b774',metalness:.8,roughness:.3}));rim.position.y=-.012;this.group.add(rim);
  }
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
    const body=new T.Mesh(geo,new T.MeshPhysicalMaterial({color:tens?'#184b3c':'#e6d8b6',roughness:tens?.29:.38,metalness:tens?.18:.06,clearcoat:.45,clearcoatRoughness:.3,flatShading:true}));body.castShadow=true;body.receiveShadow=true;this.group.add(body);
    this.faces.forEach((face,i)=>{const label=new T.Mesh(new T.PlaneGeometry(.48,.48),new T.MeshStandardMaterial({map:numberTexture(tens?String(i*10).padStart(2,'0'):String(i),tens?'#e9d39a':'#354f3f'),transparent:true,depthWrite:false,roughness:.55}));label.position.copy(face.center).addScaledVector(face.normal,.005);const up=new T.Vector3(0,0,-1).applyQuaternion(new T.Quaternion().setFromUnitVectors(face.normal,new T.Vector3(0,1,0)).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.2)).invert());const right=new T.Vector3().crossVectors(up,face.normal).normalize();up.crossVectors(face.normal,right).normalize();label.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,face.normal));this.group.add(label);});
    const edges=new T.LineSegments(new T.EdgesGeometry(geo,20),new T.LineBasicMaterial({color:tens?'#768b60':'#9c8e6c',transparent:true,opacity:.45}));this.group.add(edges);this.group.scale.setScalar(.37);this.faceUp(tens?4:7);this.group.quaternion.copy(this.target);
  }
  faceUp(number:number){this.target.setFromUnitVectors(this.faces[number].normal,new T.Vector3(0,1,0));this.target.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.2));}
  roll(p:number,index:number){const phase=p*13.4+index*2.1,decay=1-p;this.group.position.copy(this.base);this.group.position.x+=Math.sin(phase)*.75*decay;this.group.position.z+=Math.cos(phase*.9)*.52*decay;this.group.position.y+=Math.abs(Math.sin(p*Math.PI*4.5))*.9*decay;
    const twist=new T.Quaternion().setFromEuler(new T.Euler(Math.PI*8*(1-p),Math.PI*5*(1-p),Math.PI*6*(1-p)));this.group.quaternion.copy(this.target).multiply(twist);
  }
}

export function environment(){
  const group=new T.Group(),wood=grain('wood',1024);wood.repeat.set(3,1.5);const tabletop=box(35,.24,28,new T.MeshStandardMaterial({map:wood,roughness:.77,metalness:.02,bumpMap:grain('bump',256),bumpScale:.008}),0,-.16,0,.05);group.add(tabletop);
  // A desk blotter frames the book without covering the walnut completely.
  group.add(box(9.1,.018,7.3,new T.MeshStandardMaterial({color:'#1a2920',roughness:.97,bumpMap:grain('bump',128),bumpScale:.012}),0,-.025,.65,.06));
  for(const z of [-2.94,4.24])group.add(box(8.84,.008,.009,darkBrass,0,-.012,z,.002));
  for(const x of [-4.43,4.43])group.add(box(.009,.008,7.19,darkBrass,x,-.012,.65,.002));
  const candle=new T.Group();
  const profile=[[.0,.0],[.42,.02],[.46,.08],[.39,.15],[.25,.19],[.21,.25],[.13,.30],[.09,.9],[.15,1.02],[.24,1.08],[.28,1.14],[.26,1.19],[.0,1.2]].map(([x,y])=>new T.Vector2(x,y));
  const holder=new T.Mesh(new T.LatheGeometry(profile,40),brass);holder.castShadow=holder.receiveShadow=true;candle.add(holder);
  const wax=new T.Mesh(new T.CylinderGeometry(.14,.16,.95,24),new T.MeshStandardMaterial({color:'#dbc9a5',roughness:.8}));wax.position.y=1.62;wax.castShadow=true;candle.add(wax);
  for(let i=0;i<7;i++){const drip=new T.Mesh(new T.CapsuleGeometry(.018,.15+i*.015,3,6),wax.material);drip.position.set(Math.cos(i*2.4)*.145,1.9-i*.035,Math.sin(i*2.4)*.145);candle.add(drip);}
  const flame=new T.Mesh(new T.SphereGeometry(.08,12,16),new T.MeshBasicMaterial({color:'#ffce77'}));flame.position.y=2.17;flame.scale.set(.6,1.9,.6);candle.add(flame);const core=new T.Mesh(new T.SphereGeometry(.04,10,10),new T.MeshBasicMaterial({color:'#fff2c3'}));core.position.y=2.12;core.scale.set(.5,1.8,.5);candle.add(core);
  candle.position.set(-5.2,0,-2.65);group.add(candle);const flameLight=new T.PointLight('#ffb453',12,9,2);flameLight.position.set(-5.2,2.2,-2.65);group.add(flameLight);
  // Pocket watch: concentric metal rims, enamel dial and restrained hands.
  const watch=new T.Group();for(const [r,t,y] of [[.63,.05,.03],[.56,.035,.08],[.52,.015,.09]]){const m=new T.Mesh(new T.TorusGeometry(r,t,8,56),brass);m.rotation.x=-Math.PI/2;m.position.y=y;watch.add(m);}
  const dial=new T.Mesh(new T.CylinderGeometry(.53,.53,.06,48),new T.MeshStandardMaterial({color:'#d9caa5',roughness:.65}));watch.add(dial);
  for(let i=0;i<60;i++){const angle=i*Math.PI/30;const tick=box(i%5===0?.015:.008,.006,i%5===0?.075:.032,darkBrass,Math.sin(angle)*.47,.066,Math.cos(angle)*.47,.001);tick.rotation.y=angle;watch.add(tick);}
  for(const [length,angle] of [[.36,-1.1],[.25,.9]]){const hand=box(.018,.008,length,darkBrass,Math.sin(angle)*length/2,.078,Math.cos(angle)*length/2,.001);hand.rotation.y=angle;watch.add(hand);}watch.add(pin(0,0));const crown=box(.16,.10,.18,brass,0,.02,-.73);watch.add(crown);const ring=new T.Mesh(new T.TorusGeometry(.16,.025,6,20),brass);ring.rotation.x=-Math.PI/2;ring.position.z=-.91;watch.add(ring);watch.rotation.y=.5;watch.position.set(-4.6,.1,1.35);group.add(watch);
  const chainPoints=[];for(let i=0;i<20;i++)chainPoints.push(new T.Vector3(-4.9+Math.sin(i*.28)*.30,.05,1.0-i*.13));group.add(tube(chainPoints,.015,brass));
  const pen=new T.Group();const barrel=new T.Mesh(new T.CylinderGeometry(.055,.06,2.15,16),new T.MeshPhysicalMaterial({color:'#122a22',metalness:.3,roughness:.2,clearcoat:.8}));barrel.rotation.z=Math.PI/2;pen.add(barrel);const nib=new T.Mesh(new T.ConeGeometry(.065,.4,5),brass);nib.rotation.z=-Math.PI/2;nib.position.x=1.26;pen.add(nib);for(const x of [-.95,-.75,.92]){const ring=new T.Mesh(new T.TorusGeometry(.061,.012,5,20),brass);ring.rotation.y=Math.PI/2;ring.position.x=x;pen.add(ring);}pen.rotation.y=-.7;pen.position.set(4.6,.11,-1.8);group.add(pen);
  // Background volumes use the same material family as the hero book.
  for(let i=0;i<3;i++){const book=new T.Group(),mat=new T.MeshStandardMaterial({color:['#304236','#392f26','#323b37'][i],roughness:.8});book.add(box(2.5,.12,3.6,mat,0,0,0,.04),box(2.3,.22,3.4,paper,0,.15,0,.02),box(2.5,.12,3.6,mat,0,.3,0,.04));book.position.set(4.5+i*.1,i*.34,-4.8);book.rotation.y=-.3+i*.11;group.add(book);}
  return group;
}
