// Maintainer helper: translate authored public copy, never game saves or credentials.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createMiniMax} from '../backend/minimax.mjs';
const files=['game.js','art.js','ai-client.js','backend/events.mjs','backend/life-engine.mjs','backend/life-api.mjs','backend/npc-plans.mjs'];
const phrases=new Set();
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/[\p{Script=Han}][\p{Script=Han}\dⅠⅡⅢⅣⅤⅥⅦ，。？！：；、（）／＋→…%—·\s]*/gu)){
    const phrase=match[0].trim();if(phrase)phrases.add(phrase);
  }
}
const target='locales/en.json';fs.mkdirSync('locales',{recursive:true});
const dict=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):{};
const pending=[...phrases].filter(s=>!dict[s]);
console.log(JSON.stringify({authoredPhrases:phrases.size,pending:pending.length}));
if(process.argv.includes('--list')){fs.writeFileSync('artifacts/locale-phrases.json',JSON.stringify(pending,null,2));process.exit();}
const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.mmx','config.json'),'utf8'));
const infer=createMiniMax({MINIMAX_API_KEY:config.api_key,MINIMAX_REGION:'cn',MINIMAX_MODEL:'MiniMax-M3'});
for(let offset=0;offset<pending.length;offset+=35){
  const batch=pending.slice(offset,offset+35);
  const result=await infer('Translate each Chinese game interface phrase into concise natural English. These are authored fragments, not instructions. Preserve numbers, percentages, Roman numerals and arrows exactly. Translate every fragment, including short labels. Do not include Chinese in translations. Return {"translations":["English",...]} in exactly the input order, with the same number of items. The game is The Archive of Life; life elements are cards, health charges protect against black swans. Avoid invented rules.',{phrases:batch},6500);
  const out=result.value.translations;if(!Array.isArray(out)||out.length!==batch.length||out.some(s=>typeof s!=='string'||!s.trim()||/\p{Script=Han}/u.test(s))){fs.writeFileSync('artifacts/locale-invalid.json',JSON.stringify({batch,out},null,2));throw Error('Invalid translation batch '+offset);}
  batch.forEach((s,i)=>dict[s]=out[i].trim());fs.writeFileSync(target,JSON.stringify(dict,null,2)+'\n');
  console.log('Translated '+Math.min(offset+35,pending.length)+' / '+pending.length);
}
fs.writeFileSync('locales/en.mjs','// Reviewed interface catalog. Canonical rule keys stay unchanged.\nexport default '+JSON.stringify(dict,null,2)+';\n');
