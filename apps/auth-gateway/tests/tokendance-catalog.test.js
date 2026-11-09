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
  assert.equal(response.status,200);assert.deepEqual(response.body,JSON.parse(JSON.stringify(data)));assert.equal(calls,1);
  const model=response.body.providers.tokendance.models[0];
  assert.equal(model.catalogPresence.status,mode==='missing'?'absent':'unverified');
  assert.match(model.disabledReason,mode==='missing'?/当前目录未列出/:/暂时无法确认/);
  assert.equal(model.selectable,false);
});

// R17 exercises the complete Core response through the real Gateway relay.
import { tokenDanceTestRuntime } from '../../../test-support/tokendance-runtime-r17.mjs';
import absentIds from '../../../test-support/tokendance-absent-r17.json' with {type:'json'};
import { modelMissingFromCatalog, modelRetiredFromCatalog } from '../../web/src/lib/modelRegistry.js';
for (const mode of ['empty','timeout','snapshot']) test(`R17 Gateway full ${mode}: audited absence survives relay, 65 cards visible`,async()=>{
  const runtime=await tokenDanceTestRuntime(mode);
  try {
    const data=await runtime.invoke({action:'modelRegistry',provider:'tokendance'});
    const app=createApp({config:{production:false,trustProxy:1,frontendOrigins:[],adminUserIds:new Set(),backend:{mode:'node'},maintenance:{retryAfterSeconds:120}},auth:{async optionalSession(){return null},async webHandler(){throw Error('Unexpected auth')}},backend:{async call(body){assert.equal(body.action,'modelRegistry');return {status:200,data}}},isMaintenance:()=>false,logger:{info(){},warn(){},error(){}}});
    const response=await postInMemory(createServer(app),'/paperbanana-api',{action:'modelRegistry',provider:'tokendance'},{});
    assert.equal(response.status,200);
    assert.deepEqual(response.body,JSON.parse(JSON.stringify(data)));
    const models=response.body.providers.tokendance.models;
    assert.equal(models.length,74,'historical identities and defaults retained in relay');
    for(const id of absentIds)assert.equal(models.find(m=>m.id===id).catalogPresence.status,'absent',id);
    const visible=models.filter(m=>!modelMissingFromCatalog(response.body,'tokendance',m)&&!modelRetiredFromCatalog(m));
    assert.equal(visible.length,65);
    for(const model of visible){
      assert.equal(model.catalogPresence.status,mode==='snapshot'?'listed':'unverified');
      assert.equal(model.selectable,mode==='snapshot');
      if(mode!=='snapshot')assert.match(model.disabledReason,/暂时无法确认/);
    }
    assert.equal(runtime.providerCalls.length,0);
    assert.equal(runtime.tokenDanceCalls.length,0);
  } finally {await runtime.close()}
});
