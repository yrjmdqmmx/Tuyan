import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { createApp } from '../src/app.js';
import { postInMemory } from '../../paperbanana-api/tests/helpers/in-memory-http.ts';

// Run the shared Core producer, then the actual Gateway JSON relay, without sockets.
const bundle = await build({entryPoints:[new URL('../../../packages/api/src/tokendance-catalog.ts',import.meta.url).pathname],bundle:true,format:'cjs',platform:'node',write:false});
const module = {exports:{}};
new Function('module','exports',bundle.outputFiles[0].text)(module,module.exports);
const {createTokenDanceCatalogCache,tokenDanceCatalogPresence,tokenDanceCatalogModelReason,tokenDanceCatalogMessage}=module.exports;
for (const mode of ['empty','timeout','missing','all_invalid']) test(`R14 Gateway preserves ${mode} presence, hint, channel and model`,async()=>{
  const id='qwen3.8-flash',protocol='openai:chat-completions';
  const cache=createTokenDanceCatalogCache({appUrl:'offline-test',expectedModels:[{id,protocol}],fetcher:async()=>{
    if(mode==='timeout')throw new DOMException('', 'TimeoutError');
    return Response.json({data:mode==='missing'?[{id:'other',supported_protocols:[protocol]}]:mode==='all_invalid'?[null]:[]});
  }});
  const snapshot=await cache.get();
  const data={code:0,providers:{tokendance:{models:[{id,selectable:false,catalogPresence:tokenDanceCatalogPresence(snapshot,id),disabledReason:tokenDanceCatalogModelReason(snapshot,id,protocol)}]}},catalogHealth:{tokendance:snapshot},unavailableProviders:{tokendance:tokenDanceCatalogMessage(snapshot)}};
  let calls=0;
  const app=createApp({config:{production:false,trustProxy:1,frontendOrigins:[],adminUserIds:new Set(),backend:{mode:'node'},maintenance:{retryAfterSeconds:120}},auth:{async optionalSession(){return null},async webHandler(){throw Error("Unexpected auth request")}},backend:{async call(body){assert.equal(body.action,'modelRegistry');calls++;return {status:200,data}}},isMaintenance:()=>false,logger:{info(){},warn(){},error(){}}});
  const response=await postInMemory(createServer(app),'/paperbanana-api',{action:'modelRegistry',provider:'tokendance'},{});
  assert.equal(response.status,200);assert.deepEqual(response.body,data);assert.equal(calls,1);
  const model=response.body.providers.tokendance.models[0];
  assert.equal(model.catalogPresence.status,mode==='missing'?'absent':'unverified');
  assert.match(model.disabledReason,mode==='missing'?/当前目录未列出/:/暂时无法确认/);
  assert.equal(model.selectable,false);
});
