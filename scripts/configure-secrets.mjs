// Pipe an existing local MiniMax credential directly to Wrangler, never to a file/argument/log.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
let config={};
try{config=JSON.parse(await fs.readFile(path.join(process.env.MMX_CONFIG_DIR||path.join(os.homedir(),'.mmx'),'config.json'),'utf8'));}catch{}
const key=config.api_key||process.env.AI_LIVE_MINIMAX_API_KEY||process.env.MINIMAX_API_KEY;
if(!key)throw Error('No existing MiniMax credential available');
const cli=process.env.WRANGLER_CLI||path.resolve('node_modules/wrangler/bin/wrangler.js');
const child=spawn(process.execPath,[cli,'secret','bulk','--config','backend/wrangler.jsonc'],{env:{...process.env,WRANGLER_SEND_METRICS:'false'},stdio:['pipe','pipe','pipe']});
child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});
child.stdin.end(JSON.stringify({MINIMAX_API_KEY:key}));
const code=await new Promise((resolve,reject)=>{child.on('exit',resolve);child.on('error',reject);});
if(code)throw Error('Secret configuration failed (secret values withheld)');
console.log(JSON.stringify({configured:['MINIMAX_API_KEY'],secretValuesPrinted:false}));
