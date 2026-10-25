import * as T from 'three';

const serif='"Noto Serif CJK SC","Songti SC","SimSun",serif';
function canvas(w:number,h:number){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export function texture(c:HTMLCanvasElement){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
let seed=1977;function random(){seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;}
export function grain(kind:'leather'|'paper'|'wood'|'bump',size=512){
  const c=canvas(size,size),ctx=c.getContext('2d')!,data=ctx.createImageData(size,size);seed=1977;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,n=random()-.5;
    const wave=Math.sin(x*.16+Math.sin(y*.018)*3+Math.sin(y*.004)*9)+Math.sin(x*.61+y*.006)*.35;
    const base=kind==='leather'?[29,51,42]:kind==='paper'?[232,220,190]:kind==='wood'?[48,32,23]:[128,128,128];
    const variation=kind==='wood'?wave*3.5+n*4:kind==='leather'?n*12+Math.sin(x*1.7)*Math.sin(y*1.8)*2:kind==='bump'?n*65:n*8;
    for(let k=0;k<3;k++)data.data[i+k]=Math.max(0,Math.min(255,base[k]+variation));data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);const t=texture(c);t.wrapS=t.wrapT=T.RepeatWrapping;if(kind==='bump')t.colorSpace=T.NoColorSpace;return t;
}
export function compass(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color='#ae8b47'){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.4;
  for(const v of [.77,.89,1]){ctx.beginPath();ctx.arc(0,0,r*v,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<32;i++){const a=i*Math.PI/16;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.92,Math.sin(a)*r*.92);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}
  for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4);ctx.beginPath();ctx.moveTo(0,-r*.7);ctx.lineTo(r*.12,-r*.13);ctx.lineTo(0,0);ctx.closePath();if(i%2===0)ctx.fill();else ctx.stroke();ctx.restore();}
  ctx.beginPath();ctx.arc(0,0,r*.12,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function coverFoil(){
  const c=canvas(1024,1536),ctx=c.getContext('2d')!;ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=2;
  for(const pad of [48,63,84]){ctx.strokeRect(pad,pad,1024-pad*2,1536-pad*2);}
  for(const x of [84,940])for(const y of [84,1452]){ctx.save();ctx.translate(x,y);ctx.rotate(x>500?Math.PI:0);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(80,0);ctx.bezierCurveTo(40,12,18,36,0,80);ctx.closePath();ctx.stroke();ctx.restore();}
  ctx.textAlign='center';ctx.font=`29px ${serif}`;ctx.fillText('七 章 人 生 · 一 册 珍 藏',512,242);
  compass(ctx,512,568,191,'#fff');
  ctx.font=`100px ${serif}`;ctx.fillText('命 运 之 书',512,957);
  ctx.font=`28px ${serif}`;ctx.fillText('一生，尚未写定。',512,1042);
  ctx.fillRect(416,1100,192,1.5);ctx.font='40px Georgia';ctx.fillText('Ⅰ — Ⅶ',512,1190);
  ctx.font=`25px ${serif}`;ctx.fillText('所走的路，终会成为你。',512,1360);return texture(c);
}
function icon(ctx:CanvasRenderingContext2D,name:string,x:number,y:number,r:number){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#284632';ctx.fillStyle='#284632';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.85,0,Math.PI*2);ctx.stroke();
  if(name==='book'){for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(0,28);ctx.lineTo(0,-25);ctx.quadraticCurveTo(sign*25,-42,sign*44,-27);ctx.lineTo(sign*44,32);ctx.quadraticCurveTo(sign*25,16,0,28);ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(sign*9,-12+i*13);ctx.lineTo(sign*33,-17+i*13);ctx.stroke();}}}
  else if(name==='home'){ctx.beginPath();ctx.moveTo(-43,0);ctx.lineTo(0,-43);ctx.lineTo(43,0);ctx.moveTo(-30,-8);ctx.lineTo(-30,36);ctx.lineTo(30,36);ctx.lineTo(30,-8);ctx.moveTo(-9,36);ctx.lineTo(-9,9);ctx.lineTo(9,9);ctx.lineTo(9,36);ctx.stroke();}
  else if(name==='sun')compass(ctx,0,0,r*.65,'#466051');
  else if(name==='coin'){ctx.beginPath();ctx.arc(0,0,42,0,Math.PI*2);ctx.stroke();ctx.strokeRect(-15,-15,30,30);for(const a of [-1,1]){ctx.beginPath();ctx.arc(a*13,0,42,-1.2,1.2);ctx.stroke();}}
  else if(name==='leaf'){ctx.beginPath();ctx.moveTo(-27,32);ctx.bezierCurveTo(-47,-13,-2,-42,36,-41);ctx.bezierCurveTo(42,-5,23,38,-27,32);ctx.moveTo(-37,43);ctx.lineTo(25,-29);ctx.moveTo(-17,20);ctx.lineTo(-20,-9);ctx.moveTo(-2,3);ctx.lineTo(23,3);ctx.stroke();}
  else if(name==='flower'){for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.ellipse(0,-24,13,25,0,0,Math.PI*2);ctx.stroke();ctx.restore();}ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();}
  else{for(const sign of [-1,1]){ctx.beginPath();ctx.arc(sign*19,-18,13,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(sign*19,21,22,24,0,Math.PI,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(-40,37);ctx.lineTo(40,37);ctx.stroke();}
  ctx.restore();
}
export function cardTexture(card:{name:string;subtitle:string;level:number;icon:string},index:number,paper?:T.Texture){
  const c=canvas(512,768),ctx=c.getContext('2d')!;const fill=ctx.createLinearGradient(0,0,512,768);fill.addColorStop(0,'#eee4c9');fill.addColorStop(.6,'#d9caa6');fill.addColorStop(1,'#c7b98f');ctx.fillStyle=fill;ctx.fillRect(0,0,512,768);
  seed=50+index;for(let i=0;i<10000;i++){ctx.fillStyle=`rgba(60,42,20,${random()*.035})`;ctx.fillRect(random()*512,random()*768,1+random()*2,1);}
  if(paper?.image){const image=paper.image as HTMLImageElement;ctx.drawImage(image,image.width/2,0,image.width/2,image.height,0,0,512,768);}
  ctx.strokeStyle='#78603d';for(const pad of [26,33]){ctx.lineWidth=1;ctx.strokeRect(pad,pad,512-2*pad,768-2*pad);}
  ctx.font='17px Georgia';ctx.fillStyle='#8c7748';ctx.textAlign='left';ctx.fillText(`人生元素 · ${String(index+1).padStart(2,'0')}`,45,63);ctx.textAlign='right';ctx.font='33px Georgia';ctx.fillText(card.level===2?'Ⅱ':'Ⅰ',468,73);
  ctx.save();ctx.shadowColor='#f2dfae';ctx.shadowOffsetY=1;icon(ctx,card.icon,256,288,104);ctx.restore();ctx.fillStyle='#30271c';ctx.textAlign='center';ctx.font=`bold 65px ${serif}`;ctx.fillText(card.name.split('').join(' '),256,492);ctx.fillStyle='#665036';ctx.font=`23px ${serif}`;ctx.fillText(card.subtitle,256,550);
  ctx.strokeStyle='#a99665';ctx.beginPath();ctx.moveTo(88,622);ctx.lineTo(424,622);ctx.stroke();ctx.font='19px Georgia';ctx.fillText('命 运 之 书',256,665);ctx.font=`21px ${serif}`;ctx.fillText(card.level===2?'精 进':'初 识',256,713);return texture(c);
}
export function pageTexture(title:string,body:string,kicker='青春远行 · 人生的一页'){
  const c=canvas(768,1100),ctx=c.getContext('2d')!;ctx.fillStyle='#e8dcbe';ctx.fillRect(0,0,768,1100);
  const shade=ctx.createLinearGradient(0,0,768,0);shade.addColorStop(0,'rgba(62,42,20,.16)');shade.addColorStop(.12,'rgba(62,42,20,0)');shade.addColorStop(.88,'rgba(62,42,20,0)');shade.addColorStop(1,'rgba(62,42,20,.06)');ctx.fillStyle=shade;ctx.fillRect(0,0,768,1100);
  ctx.strokeStyle='#b6a17b';ctx.strokeRect(39,44,690,1010);if(!title&&!body)return texture(c);ctx.fillStyle='#977a4c';ctx.font=`21px ${serif}`;ctx.fillText(kicker,83,121);ctx.fillStyle='#293d31';ctx.font=`48px ${serif}`;ctx.fillText(title,83,260);
  ctx.font=`26px ${serif}`;ctx.fillStyle='#625b48';let line='',y=370;for(const ch of body){if(ch==='\n'||ctx.measureText(line+ch).width>595){ctx.fillText(line,83,y);line=ch==='\n'?'':ch;y+=51;}else line+=ch;}ctx.fillText(line,83,y);compass(ctx,384,848,89,'#aa9161');ctx.textAlign='center';ctx.font='19px Georgia';ctx.fillText('—  命 运 之 书  —',384,1000);return texture(c);
}
export function numberTexture(value:string,color:string){
  const c=canvas(256,256),ctx=c.getContext('2d')!;
  // A recessed engraved cartouche, shared by both dice rather than plastic colours.
  ctx.strokeStyle='#a28a5b';ctx.lineWidth=2;
  for(const radius of [104,97]){ctx.beginPath();ctx.arc(128,128,radius,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<8;i++){ctx.save();ctx.translate(128,128);ctx.rotate(i*Math.PI/4);ctx.fillStyle='#9c8050';ctx.beginPath();ctx.moveTo(0,-90);ctx.lineTo(3,-83);ctx.lineTo(0,-77);ctx.lineTo(-3,-83);ctx.closePath();ctx.fill();ctx.restore();}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 100px Georgia';ctx.shadowColor='#17110a';ctx.shadowBlur=2;ctx.shadowOffsetY=2;ctx.fillStyle=color;ctx.fillText(value,128,136);return texture(c);
}
