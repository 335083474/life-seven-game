import * as T from 'three';

/** Use the imported model's flame planes to keep each new flame on its own wick. */
export function lightCandles(model:T.Object3D){
  const flames:{sprite:T.Sprite;halo:T.Sprite;height:number;width:number;phase:number}[]=[];
  const makeTexture=(glow:boolean)=>{
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;
    const ctx=canvas.getContext('2d')!;
    if(glow){
      ctx.scale(1,2);const gradient=ctx.createRadialGradient(64,64,0,64,64,64);
      gradient.addColorStop(0,'rgba(255,196,89,.6)');gradient.addColorStop(.18,'rgba(255,140,40,.23)');gradient.addColorStop(.55,'rgba(255,102,18,.055)');gradient.addColorStop(1,'rgba(255,102,18,0)');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    }else{
      ctx.beginPath();ctx.moveTo(64,247);ctx.bezierCurveTo(3,228,27,143,69,8);ctx.bezierCurveTo(60,95,131,222,64,247);ctx.closePath();
      const outer=ctx.createLinearGradient(0,8,0,247);outer.addColorStop(0,'#ff8e23');outer.addColorStop(.42,'#ffcd5c');outer.addColorStop(.78,'#fff3b3');outer.addColorStop(1,'#dd8228');ctx.fillStyle=outer;ctx.fill();
      ctx.beginPath();ctx.moveTo(64,241);ctx.bezierCurveTo(35,225,54,163,66,113);ctx.bezierCurveTo(63,161,92,226,64,241);ctx.fillStyle='#ffffe5';ctx.fill();
      const base=ctx.createRadialGradient(64,239,1,64,239,16);base.addColorStop(0,'rgba(106,135,255,.85)');base.addColorStop(1,'rgba(78,101,206,0)');ctx.fillStyle=base;ctx.fillRect(46,222,36,34);
    }
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
  };
  const flameTexture=makeTexture(false),glowTexture=makeTexture(true);
  model.updateMatrixWorld(true);
  const meshes:T.Mesh[]=[];model.traverse(node=>{if(node instanceof T.Mesh&&[node.material].flat().some(m=>/flame/i.test(m.name)))meshes.push(node);});
  for(const mesh of meshes){
    const positions=mesh.geometry.getAttribute('position'),clusters:{points:T.Vector3[];center:T.Vector3}[]=[];
    for(let i=0;i<positions.count;i++){
      const point=new T.Vector3().fromBufferAttribute(positions,i);
      let cluster=clusters.find(c=>Math.hypot(point.x-c.center.x,point.z-c.center.z)<.065);
      if(!cluster){cluster={points:[],center:point.clone()};clusters.push(cluster);}cluster.points.push(point);
    }
    mesh.visible=false;
    for(const cluster of clusters){
      const bounds=new T.Box3().setFromPoints(cluster.points),bottom=bounds.getCenter(new T.Vector3());bottom.y=bounds.min.y;
      const top=bottom.clone();top.y=bounds.max.y;mesh.localToWorld(bottom);mesh.localToWorld(top);model.worldToLocal(bottom);model.worldToLocal(top);
      const height=bottom.distanceTo(top)*1.6,width=height*.47;
      const sprite=new T.Sprite(new T.SpriteMaterial({map:flameTexture,transparent:true,depthWrite:false,toneMapped:false}));
      sprite.name='living-candle-flame';sprite.center.set(.5,0);sprite.position.copy(bottom);sprite.scale.set(width,height,1);model.add(sprite);
      const halo=new T.Sprite(new T.SpriteMaterial({map:glowTexture,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.7,toneMapped:false}));
      halo.position.copy(bottom).add(new T.Vector3(0,height*.43,0));halo.scale.setScalar(height*3.8);model.add(halo);
      flames.push({sprite,halo,height,width,phase:flames.length*2.37});
    }
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  return (time:number)=>{
    flames.forEach(({sprite,halo,height,width,phase})=>{
      const flutter=reduced.matches?0:Math.sin(time*2.6+phase)*.045+Math.sin(time*6.7+phase)*.018;
      sprite.scale.set(width*(1-flutter*.7),height*(1+flutter),1);
      (sprite.material as T.SpriteMaterial).rotation=flutter*.35;
      halo.material.opacity=.7+flutter;
    });
  };
}
