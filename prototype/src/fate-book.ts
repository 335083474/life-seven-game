import * as T from 'three';

type Vertex={position:T.Vector3;normal:T.Vector3;uv:T.Vector2};
const BOOK_SCALE=1.90,BASE=.42,HINGE=BASE+.36373345*BOOK_SCALE;

/** Static CC BY model, split at its gutter with UV-preserving clipping. */
export class ImportedFateBook{
  group=new T.Group();private left=new T.Group();private right=new T.Group();
  private leafGroup=new T.Group();private front:T.Mesh;private back:T.Mesh;private rest:Float32Array;
  private opening=0;private atlas?:T.Texture;private pageMaterials:T.MeshStandardMaterial[]=[];private temporary:T.Texture[]=[];private printed?:T.Texture;
  private deform:{geometry:T.BufferGeometry;rest:Float32Array;side:number}[]=[];
  constructor(){
    this.left.position.y=HINGE;this.group.add(this.right,this.left);
    const geometry=new T.PlaneGeometry(3.0,3.96,64,12);geometry.rotateX(-Math.PI/2);geometry.translate(1.50,0,0);this.rest=new Float32Array(geometry.attributes.position.array);
    this.front=new T.Mesh(geometry,new T.MeshStandardMaterial({roughness:.97,side:T.FrontSide}));this.back=new T.Mesh(geometry,new T.MeshStandardMaterial({roughness:.97,side:T.BackSide}));this.front.castShadow=this.front.receiveShadow=this.back.castShadow=this.back.receiveShadow=true;
    this.leafGroup.add(this.front,this.back);this.leafGroup.position.set(.01,HINGE+.015,0);this.leafGroup.visible=false;this.group.add(this.leafGroup);
  }
  setModel(source:T.Object3D){
    source.updateMatrixWorld(true);const cache=new Map<T.Material,T.Material>();
    source.traverse(child=>{
      if(!(child instanceof T.Mesh))return;
      const isPage=/Mesh_000[12]_/.test(child.name),sourceMaterial=(Array.isArray(child.material)?child.material[0]:child.material) as T.MeshStandardMaterial;
      let material=cache.get(sourceMaterial) as T.MeshStandardMaterial|undefined;
      if(!material){material=sourceMaterial.clone();material.envMapIntensity=.85;if(material.map)material.map.anisotropy=8;cache.set(sourceMaterial,material);}
      if(isPage){this.atlas??=sourceMaterial.map!;this.pageMaterials.push(material);}
      const geometry=child.geometry,index=geometry.getIndex(),position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv'),normalMatrix=new T.Matrix3().getNormalMatrix(child.matrixWorld);
      const vertices:Vertex[]=[];
      for(let i=0;i<position.count;i++)vertices.push({position:new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(child.matrixWorld).multiplyScalar(BOOK_SCALE).add(new T.Vector3(0,BASE,0)),normal:new T.Vector3().fromBufferAttribute(normal,i).applyNormalMatrix(normalMatrix),uv:new T.Vector2().fromBufferAttribute(uv,i)});
      for(const side of [-1,1]){
        const positions:number[]=[],normals:number[]=[],uvs:number[]=[];
        const mix=(a:Vertex,b:Vertex,t:number):Vertex=>({position:a.position.clone().lerp(b.position,t),normal:a.normal.clone().lerp(b.normal,t).normalize(),uv:a.uv.clone().lerp(b.uv,t)});
        const count=index?index.count:position.count;
        for(let i=0;i<count;i+=3){
          const triangle=[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k]);let polygon:Vertex[]=[];
          for(let j=0;j<3;j++){
            const a=triangle[j],b=triangle[(j+1)%3],da=a.position.x*side,db=b.position.x*side;
            if(da>=-1e-6)polygon.push(a);
            if((da<0&&db>0)||(da>0&&db<0))polygon.push(mix(a,b,da/(da-db)));
          }
          for(let j=1;j<polygon.length-1;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]]){
            positions.push(v.position.x,v.position.y-(side<0?HINGE:0),v.position.z);normals.push(...v.normal.toArray());uvs.push(...v.uv.toArray());
          }
        }
        if(!positions.length)continue;
        const split=new T.BufferGeometry();split.setAttribute('position',new T.Float32BufferAttribute(positions,3));split.setAttribute('normal',new T.Float32BufferAttribute(normals,3));split.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));split.computeBoundingSphere();
        const mesh=new T.Mesh(split,material);mesh.name=child.name+(side<0?'_left':'_right');mesh.castShadow=mesh.receiveShadow=true;(side<0?this.left:this.right).add(mesh);
        if(isPage)this.deform.push({geometry:split,rest:new Float32Array(split.attributes.position.array),side});
      }
    });
    // Original exterior remains visible. Only the Chinese title is newly stamped.
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='58px "SimSun",serif';ctx.fillText('命 运 之 书',384,485);ctx.font='22px "SimSun",serif';ctx.fillText('一生，尚未写定。',384,554);ctx.fillRect(280,607,208,1);ctx.font='27px Georgia';ctx.fillText('Ⅰ — Ⅶ',384,665);
    const title=new T.Mesh(new T.PlaneGeometry(2.6,3.8),new T.MeshStandardMaterial({color:'#c8ab6c',metalness:.75,roughness:.48,alphaMap:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,side:T.FrontSide}));title.position.set(-1.52,BASE-.13-HINGE,0);title.rotation.x=Math.PI/2;this.left.add(title);
    this.setOpening(this.opening);
  }
  setOpening(p:number){
    this.opening=p;this.left.rotation.z=-(1-p)*Math.PI;this.group.position.x=-1.70*(1-p);
    for(const page of this.deform){const positions=page.geometry.attributes.position as T.BufferAttribute;
      for(let i=0;i<positions.count;i++){const y=page.rest[i*3+1],worldY=y+(page.side<0?HINGE:0);positions.setY(i,y+(HINGE-worldY)*(1-p));}
      positions.needsUpdate=true;page.geometry.computeVertexNormals();
    }
  }
  private page(title:string,body:string,half=1){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1100;const ctx=canvas.getContext('2d')!;
    if(this.atlas?.image){const image=this.atlas.image as HTMLImageElement;ctx.drawImage(image,half*image.width/2,0,image.width/2,image.height,0,0,768,1100);}else{ctx.fillStyle='#dccba0';ctx.fillRect(0,0,768,1100);}
    ctx.fillStyle='#74603e';ctx.font='24px "SimSun",serif';ctx.fillText('命运之书 · 青春远行',92,115);ctx.fillStyle='#233629';ctx.font='46px "SimSun",serif';ctx.fillText(title,92,252);ctx.fillStyle='#5c513b';ctx.font='27px "SimSun",serif';
    let line='',y=366;for(const character of body){if(character==='\n'||ctx.measureText(line+character).width>570){ctx.fillText(line,92,y);line=character==='\n'?'':character;y+=53;}else line+=character;}ctx.fillText(line,92,y);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;
  }
  beginTurn(oldTitle:string,oldBody:string,newTitle:string,newBody:string){
    this.temporary.forEach(t=>t.dispose());const front=this.page(oldTitle,oldBody,1),back=this.page(newTitle,newBody,0);back.center.x=.5;back.repeat.x=-1;
    (this.front.material as T.MeshStandardMaterial).map=front;(this.back.material as T.MeshStandardMaterial).map=back;(this.front.material as T.MeshStandardMaterial).needsUpdate=(this.back.material as T.MeshStandardMaterial).needsUpdate=true;
    this.temporary=[front,back];this.leafGroup.visible=true;this.setTurn(0);
  }
  setTurn(p:number){
    const positions=this.front.geometry.attributes.position as T.BufferAttribute,width=3,steps=64,s=Math.sin(Math.PI*p),xs=[0],ys=[0];
    for(let i=1;i<=steps;i++){const u=(i-.5)/steps,angle=Math.PI*p+s*(.48*Math.sin(u*Math.PI)-.13);xs[i]=xs[i-1]+Math.cos(angle)*width/steps;ys[i]=ys[i-1]+Math.sin(angle)*width/steps;}
    for(let i=0;i<positions.count;i++){const u=this.rest[i*3]/width,index=Math.min(steps,Math.round(u*steps)),z=this.rest[i*3+2];positions.setXYZ(i,xs[index],ys[index]-.18*(1-s)*Math.pow(u,.5)+s*.018*z*Math.sin(u*Math.PI),z+s*.04*Math.sin(u*Math.PI));}
    positions.needsUpdate=true;this.front.geometry.computeVertexNormals();
  }
  endTurn(){this.leafGroup.visible=false;}
  setPrintedPages(leftTitle:string,leftBody:string,rightTitle:string,rightBody:string,printed:boolean){
    this.printed?.dispose();this.printed=undefined;
    if(!printed){for(const material of this.pageMaterials){material.map=this.atlas!;material.needsUpdate=true;}return;}
    const left=this.page(leftTitle,leftBody,0),right=this.page(rightTitle,rightBody,1),canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1100;const ctx=canvas.getContext('2d')!;ctx.drawImage(left.image,0,0,768,1100);ctx.drawImage(right.image,768,0,768,1100);left.dispose();right.dispose();this.printed=new T.CanvasTexture(canvas);this.printed.colorSpace=T.SRGBColorSpace;
    for(const material of this.pageMaterials){material.map=this.printed;material.needsUpdate=true;}
  }
}
