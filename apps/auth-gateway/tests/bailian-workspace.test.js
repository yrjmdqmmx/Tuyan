import express from 'express';
import { memoryDb } from '../../../test-support/memory-db.mjs';
import { createWorkspaceExecutionStore, workspaceExecutionMiddleware } from '../src/workspace-execution.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspaceModels } from '../src/workspace-execution.js';
import { readHistoricalExecution } from '../src/workspace-history-execution.js';
const modelId='deepseek-v4.1-flash-1017',bailian={workspaceId:'fixture-workspace',region:'cn-beijing'};
const route={accessProvider:'bailian',modelId,bailian};
const library={revision:1,connections:[{id:'c',provider:'bailian',scope:'account',bailian}],models:[{id:'m',connectionId:'c',modelId}]};
const body={action:'optimizeInputs',modelRoutes:{main:route},workspaceExecution:{libraryRevision:1,models:{main:{libraryModelId:'m',connectionId:'c',accessProvider:'bailian',modelId}}}};
test('Gateway derives workspace from account connection, refuses request tampering before credential access',async()=>{
 let credentialReads=0;
 const libraryStore={get:async()=>structuredClone(library),resolve:async()=>{credentialReads++;return 'fixture'}};
 assert.deepEqual((await resolveWorkspaceModels({libraryStore,user:'A',body})).modelRoutes.main,route);
 assert.equal(credentialReads,1);
 for(const mutated of [undefined,{...bailian,workspaceId:'other'},{...bailian,region:'us-east-1'}])await assert.rejects(resolveWorkspaceModels({libraryStore,user:'A',body:{...body,modelRoutes:{main:{...route,bailian:mutated}}}}),{status:409});
 assert.equal(credentialReads,1);
 const noConfig={...libraryStore,get:async()=>({...library,connections:[{...library.connections[0],bailian:undefined}]})};
 await assert.rejects(resolveWorkspaceModels({libraryStore:noConfig,user:'A',body}),{status:400});assert.equal(credentialReads,1);
});
test('history recovery fingerprints the exact workspace and region; legacy identities stay byte-compatible',async()=>{
 const get=async(routes)=>readHistoricalExecution({call:async()=>({status:200,data:{job:{id:'j',userId:'A',modelRoutes:{main:routes}}}})},'A','j');
 const first=await get(route);assert.deepEqual(first.routes.main,route);
 for(const config of [{...bailian,workspaceId:'other'},{...bailian,region:'us-east-1'}])assert.notEqual(first.fingerprint,(await get({...route,bailian:config})).fingerprint);
 assert.deepEqual((await get({accessProvider:'bailian',modelId:'qwen3.7-plus'})).routes.main,{accessProvider:'bailian',modelId:'qwen3.7-plus'});
});

test('paused workspace execution cannot resume against a newly selected business space or region',async()=>{
 const store=createWorkspaceExecutionStore({db:memoryDb()}),origin='http://localhost';let current=structuredClone(library),forwarded=0;
 await store.claim('A','task','run');await store.update('A','run',{jobId:'job',status:'awaiting_provider',routes:{main:route},models:body.workspaceExecution.models});
 const app=express();app.use(express.json());app.use(workspaceExecutionMiddleware({auth:{optionalSession:async()=>({user:{id:'A'}})},store,libraryStore:{get:async()=>current},workspaceStore:{get:async()=>({state:{tasks:[{id:'task'}]}})},frontendOrigins:[origin],simulation:true}));
 app.post('/',(_req,res)=>{forwarded++;res.json({jobId:'job',status:'running'})});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{
  for(const config of [{...bailian,workspaceId:'other'},{...bailian,region:'us-east-1'}]){
   current={...library,connections:[{...library.connections[0],bailian:config}]};
   const request={...body,action:'providerResume',generationPath:'model-v1',outputFormat:'svg',visionMode:'none',jobId:'job',modelRoutes:{main:{...route,bailian:config}},workspaceExecution:{...body.workspaceExecution,version:1,taskId:'task',runId:'run'}};
   const response=await fetch(`http://127.0.0.1:${server.address().port}/`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Workspace-Account':'A'},body:JSON.stringify(request)});
   assert.equal(response.status,409);assert.match((await response.json()).error,/恢复不能更换/);
  }
  assert.equal(forwarded,0);assert.equal((await store.get('A','run')).status,'awaiting_provider');
 }finally{await new Promise(r=>server.close(r))}
});
