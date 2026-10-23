import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createMiniMax} from '../backend/minimax.mjs';
const cfg=JSON.parse(await fs.readFile(path.join(process.env.MMX_CONFIG_DIR||path.join(os.homedir(),'.mmx'),'config.json'),'utf8'));
const infer=createMiniMax({MINIMAX_API_KEY:cfg.api_key,MINIMAX_REGION:cfg.region||'cn',MINIMAX_MODEL:'MiniMax-M3'});
const answer=await infer('返回JSON对象，字段connected为true。',{task:'connection test'},256);
console.log(JSON.stringify({connected:answer.value.connected,model:answer.model,usage:answer.usage,elapsedMs:answer.elapsedMs}));
