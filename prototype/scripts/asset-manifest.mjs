import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../public/assets');
const source='https://sketchfab.com/3d-models/book-7f702789fd444ad3b1c4cb3987d955fc';
const files=[];
const skins=JSON.parse(await fs.readFile(path.join(root,'dice-skins.json'),'utf8'));
const fonts=JSON.parse(await fs.readFile(path.join(root,'fonts.json'),'utf8'));
for(const name of (await fs.readdir(root)).filter(n=>n!=='manifest.json').sort()){
  const data=await fs.readFile(path.join(root,name));
  if(name==='page-turn-soft.mp3'){files.push({file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),title:'Pages that Turn #5 - softened page turn',creator:'Joseph SARDIN / BigSoundBank',source:'https://bigsoundbank.com/pages-that-turn-5-s2212.html',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',modifications:'Tempo 1.35x, 90 Hz high-pass, 2200 Hz low-pass, transient compression, reduced gain, short fades, mono 44.1 kHz MP3. Runtime fade-in and non-overlapping paper playback.'});continue;}
  if(name==='rapier-LICENSE.txt'){files.push({file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),title:'Rapier 3D physics engine license',creator:'Dimforge contributors',source:'https://github.com/dimforge/rapier.js',license:'Apache-2.0',licenseUrl:'https://www.apache.org/licenses/LICENSE-2.0',modifications:'Unmodified license text'});continue;}
  if(name.startsWith('archive-')||name==='fonts.json'){
    const font=fonts.find(f=>name===f.file||name===f.file.replace('.woff2','-OFL.txt'));
    files.push({file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),title:font?.originalTitle||'Book typography source records',creator:font?.creator||'Font authors listed in fonts.json',source:font?.source||'fonts.json',license:'SIL OFL 1.1',licenseUrl:font?.licenseSource||'https://openfontlicense.org/',modifications:font?.modifications||'Source and subset provenance records',...(font?{originalSha256:font.originalSha256}:{})});continue;
  }
  const skin=skins.find(s=>s.file===name);if(skin||name==='dice-skins.json'){files.push({file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),...(skin||{title:'Dice appearance source records',creator:'Model authors listed in dice-skins.json',source:'dice-skins.json',license:'CC BY 4.0',modifications:'Source and runtime adaptation records'}),file:name,licenseUrl:'https://creativecommons.org/licenses/by/4.0/'});continue;}
  const hero=name==='victor-book.glb',dice=name.startsWith('fate-d');
  const id=name.startsWith('ferndale')?'ferndale_studio_09':name.replace(/-(color|normal|roughness)\.webp$|\.glb$/,'');
  files.push({file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),title:hero?'Book':dice?'Pointy Metal/Crystal Dice':id,
    creator:hero?'victorberdugo1':dice?'Tenshinzo':'Poly Haven contributors (see source page)',source:hero?source:dice?'https://sketchfab.com/3d-models/pointy-metalcrystal-dice-a4f0e91b8cad44a682f09d9bae14c114':'https://polyhaven.com/a/'+id,
    license:hero||dice?'CC BY 4.0':'CC0 1.0',licenseUrl:hero||dice?'https://creativecommons.org/licenses/by/4.0/':'https://polyhaven.com/license',
    modifications:hero?'WebP textures and Meshopt compression; runtime triangle split, hinge rig, added Chinese print and deforming page animation; front-cover effigy rotated upright within its cover. Original model is static.':dice?'Extracted original d10/d100 body and solid numeral meshes; Meshopt compression. Runtime axial shortening, dark bronze material, added scroll relief, metal frames and gemstone finials.':'Selected candleholder 03 and encyclopedia volumes 01/06/13; compressed GLB/WebP; scene scale, placement and lighting.',
    ...(hero?{originalSha256:'3210393d368848c7c3b8f78741dbfac52d1ebe0060b768e0204639bfe15e7c83'}:dice?{originalSha256:'e3af967b84c6a0d8c8d03370854af55ad19da37ad52ada2e7478ef32457f217a'}:{})});
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({version:2,assets:files},null,2)+'\n');
console.log(`${files.length} licensed assets; ${files.reduce((n,f)=>n+f.bytes,0)} bytes`);
