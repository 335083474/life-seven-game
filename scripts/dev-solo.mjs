// Local-only acceptance server. No production backdoor or forced-dice endpoint.
// --live reuses the locally configured MiniMax key without printing it.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createApi} from '../backend/api.mjs';
import {database,modelValue,storyValue} from '../tests/support.mjs';
const live=process.argv.includes('--live'),root=path.resolve(import.meta.dirname,'..');
const DB=database();
const env={DB,WEB_ORIGIN:'http://127.0.0.1:8767,http://localhost:8767',MINIMAX_API_KEY:'local-mock',MINIMAX_REGION:'cn',MINIMAX_MODEL:'MiniMax-M3',DAILY_MODEL_LIMIT:'200'};
if(live){const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.mmx','config.json'),'utf8'));env.MINIMAX_API_KEY=process.env.MINIMAX_API_KEY||config.api_key||config.apiKey||config.token;if(!env.MINIMAX_API_KEY)throw Error('Existing MiniMax credential unavailable');}
let mockTime=Date.now();
const api=createApi(live?{}:{clock:()=>mockTime+=61000,roll:()=>10,rng:()=>0,fetchModel:async(_url,r)=>{const b=JSON.parse(r.body),input=JSON.parse(b.messages[1].content);const value=input.people?modelValue(input):storyValue(input);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});}});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1:8767');
  if(url.pathname.startsWith('/api/')||url.pathname==='/health'){
    let raw='';for await(const chunk of req)raw+=chunk;
    const response=await api.fetch(new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:raw})}),env);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!target.startsWith(root+path.sep)||!types[path.extname(target)]||target.includes(path.sep+'artifacts'+path.sep)){res.writeHead(404);res.end();return;}
  let content=fs.readFileSync(target);if(target.endsWith(path.sep+'ai-client.js'))content=Buffer.from(content.toString().replace('https://life-seven-game-api.test-garden.workers.dev','http://127.0.0.1:8767'));
  res.writeHead(200,{'Content-Type':types[path.extname(target)],'Cache-Control':'no-store'});res.end(content);
}catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'local_acceptance_error'}));}}).listen(8767,'127.0.0.1',()=>process.stdout.write('Local solo acceptance: http://127.0.0.1:8767 ('+(live?'real MiniMax':'deterministic mock')+')\n'));
