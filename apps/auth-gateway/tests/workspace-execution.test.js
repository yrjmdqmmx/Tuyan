import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createWorkspaceExecutionStore,workspaceExecutionMiddleware,resolveWorkspaceModels} from '../src/workspace-execution.js';
const origin='http://localhost';
function database(){const tables=new Map();return {tables,collection(name){if(!tables.has(name))tables.set(name,new Map());const rows=tables.get(name);const match=(r,q)=>r&&Object.entries(q).every(([k,v])=>r[k]===v);return {findOne:async q=>structuredClone([...rows.values()].find(r=>match(r,q))||null),insertOne:async row=>{if(rows.has(row._id))throw Object.assign(Error(),{code:11000});rows.set(row._id,structuredClone(row));},updateOne:async(q,p)=>{const r=[...rows.values()].find(r=>match(r,q));if(r)Object.assign(r,structuredClone(p.$set));return {matchedCount:r?1:0};},deleteOne:async q=>{const r=[...rows.values()].find(r=>match(r,q));if(r)rows.delete(r._id);}};}};}
const ref={libraryModelId:'main',connectionId:'conn',accessProvider:'openai',modelId:'test-model'},route={accessProvider:'openai',modelId:'test-model'};
const library={revision:1,connections:[{id:'conn',provider:'openai',scope:'account'}],models:[{id:'main',connectionId:'conn',modelId:'test-model'}]};
const body=(run='run')=>({action:'createJob',generationPath:'model-v1',outputFormat:'svg',maxCriticRounds:0,retrievalSetting:'none',visionMode:'none',modelRoutes:{main:{...route}},workspaceExecution:{version:1,taskId:'task',runId:run,libraryRevision:1,models:{main:ref}}});
test('atomic task admission, durable resume, idempotency, terminal release and account isolation',async()=>{
 const db=database(),store=createWorkspaceExecutionStore({db});
 const claims=await Promise.allSettled([store.claim('A','task','r1'),store.claim('A','task','r2')]);assert.equal(claims.filter(x=>x.status==='fulfilled').length,1);assert.equal(claims.filter(x=>x.status==='rejected')[0].reason.status,409);
 const winner=claims.find(x=>x.status==='fulfilled').value.execution.runId;
 await store.update('A',winner,{jobId:'job',status:'running'});const restarted=createWorkspaceExecutionStore({db});assert.equal((await restarted.get('A',winner)).jobId,'job');assert.equal(await restarted.get('B',winner),null);
 assert.equal((await restarted.claim('A','task',winner)).fresh,false);await restarted.update('A',winner,{status:'completed'});assert.equal((await restarted.claim('A','task','r3')).fresh,true);
});
test('HTTP envelope preserves normal downstream route; credentials are resolved only for selected roles, no replay after lost response',async()=>{
 const db=database(),store=createWorkspaceExecutionStore({db});let calls=0,received;
 const app=express();app.use(express.json());app.use(workspaceExecutionMiddleware({auth:{optionalSession:async req=>req.get('cookie')==='fixture=A'?{user:{id:'A'}}:null},store,libraryStore:{get:async()=>library,resolve:async()=> 'PRIVATE_ACCOUNT_KEY'},workspaceStore:{get:async()=>({state:{tasks:[{id:'task',activeRunId:'run',runs:[{id:'run',status:'submitting'}]}]}})},frontendOrigins:[origin]}));
 app.post('/',(req,res)=>{calls++;received=req.body;res.json({jobId:'job',status:'running'});});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}`;
 const send=(data,extra={})=>fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Workspace-Account':'A',Cookie:'fixture=A',...extra},body:JSON.stringify(data)});
 try{assert.equal((await send(body(),{Origin:'http://evil.test'})).status,403);assert.equal((await send(body(),{'X-Workspace-Account':'B'})).status,409);assert.equal((await send(body())).status,200);assert.equal(received.apiKeys.openai,'PRIVATE_ACCOUNT_KEY');assert.equal(received.workspaceExecution,undefined);assert.doesNotMatch(JSON.stringify([...db.tables.values()].flatMap(m=>[...m.values()])),/PRIVATE_ACCOUNT_KEY/);
 assert.equal((await send(body())).status,200);assert.equal(calls,1);assert.equal((await send(body('different'))).status,409);
 const recovery=await (await send({...body(),action:'workspaceExecutionStatus'})).json();assert.equal(recovery.execution.jobId,'job');assert.equal(calls,1);
 }finally{await new Promise(r=>server.close(r));}
});
test('simulation never decrypts account credentials; changed model binding is rejected',async()=>{
 const options={libraryStore:{get:async()=>library,resolve:async()=>{throw Error('Must not read real secret');}},user:'A',body:body(),simulation:true};assert.equal((await resolveWorkspaceModels(options)).apiKeys.openai,'local-simulation-only');const changed=body();changed.modelRoutes.main.modelId='other';await assert.rejects(resolveWorkspaceModels({...options,body:changed}),{status:409});
});
test('closing an unaccepted submission fences late delivery without cancelling an admitted job',async()=>{
 const db=database(),store=createWorkspaceExecutionStore({db});
 await store.closeUnaccepted('A','task','early');
 assert.equal((await store.claim('A','task','early')).fresh,false);
 assert.equal((await store.get('A','early')).closedUnaccepted,true);
 await store.claim('A','task','accepted');
 await assert.rejects(store.closeUnaccepted('A','task','accepted'),{status:409});
 await store.update('A','accepted',{status:'completed',jobId:'job'});
 const race=await Promise.allSettled([store.claim('A','task','race'),store.closeUnaccepted('A','task','race')]);
 const row=await store.get('A','race');assert.ok(row);
 assert.equal(race[0].status==='fulfilled' && race[0].value.fresh, !row.closedUnaccepted);
 if(row.closedUnaccepted){assert.equal((await store.claim('A','task','next')).fresh,true);}
});

test('input optimization resolves only main credentials and shares the task execution lock',async()=>{
 const db=database(),store=createWorkspaceExecutionStore({db});let calls=0;
 const app=express();app.use(express.json());app.use(workspaceExecutionMiddleware({auth:{optionalSession:async()=>({user:{id:'A'}})},store,libraryStore:{get:async()=>library,resolve:async()=> 'SECRET'},workspaceStore:{get:async()=>({state:{tasks:[{id:'task',activeRunId:'run',runs:[{id:'run',status:'submitting'}]}]}})},frontendOrigins:[origin]}));
 app.post('/',(req,res)=>{calls++;assert.equal(req.body.mainRoute.modelId,'test-model');assert.equal(req.body.apiKey,'SECRET');res.json({target:'methodContent',optimizedText:'optimized'});});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const send=run=>fetch(`http://127.0.0.1:${server.address().port}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Workspace-Account':'A'},body:JSON.stringify({...body(run),action:'optimizeInputs'})});
 try{await store.claim('A','task','generating');assert.equal((await send('optimization')).status,409);assert.equal(calls,0);await store.update('A','generating',{status:'completed'});
 const result=await send('optimization');assert.equal(result.status,200,JSON.stringify(await result.json()));assert.equal((await store.get('A','optimization')).status,'completed');const replay=await send('optimization');assert.equal(replay.status,200);assert.equal((await replay.json()).optimizedText,'optimized');assert.equal(calls,1);assert.equal((await store.claim('A','task','next')).fresh,true);
 assert.doesNotMatch(JSON.stringify([...db.tables.values()].flatMap(m=>[...m.values()])),/SECRET/);
 }finally{await new Promise(r=>server.close(r));}
});
test('paused execution resumes only its original job and binding; duplicate resume never dispatches twice',async()=>{
 const db=database(),store=createWorkspaceExecutionStore({db});await store.claim('A','task','run');await store.update('A','run',{jobId:'original-job',status:'awaiting_provider',routes:{main:{...route}},models:{main:ref}});let calls=0;
 const app=express();app.use(express.json());app.use(workspaceExecutionMiddleware({auth:{optionalSession:async()=>({user:{id:'A'}})},store,libraryStore:{get:async()=>library,resolve:async()=> 'SECRET'},workspaceStore:{get:async()=>({state:{tasks:[{id:'task',activeRunId:'run',runs:[{id:'run',status:'submitting'}]}]}})},frontendOrigins:[origin]}));
 app.post('/',(req,res)=>{calls++;assert.equal(req.body.jobId,'original-job');assert.equal(req.body.apiKeys.openai,'SECRET');res.json({jobId:req.body.jobId,status:'running'});});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const send=data=>fetch(`http://127.0.0.1:${server.address().port}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Workspace-Account':'A'},body:JSON.stringify(data)});
 try{const changed={...body(),action:'providerResume',jobId:'foreign-job'};changed.workspaceExecution.models.main={...ref,connectionId:'other'};assert.equal((await send(changed)).status,409);assert.equal(calls,0);
 const request={...body(),action:'providerResume',jobId:'foreign-job'};assert.equal((await send(request)).status,200);assert.equal((await send(request)).status,200);assert.equal(calls,1);await assert.rejects(store.claim('A','task','different'),{status:409});assert.doesNotMatch(JSON.stringify([...db.tables.values()].flatMap(m=>[...m.values()])),/SECRET/);
 }finally{await new Promise(r=>server.close(r));}
});

test('a stale competing run cannot dispatch after the previous task lock is released',async()=>{
 const store=createWorkspaceExecutionStore({db:database()});let calls=0;
 const app=express();app.use(express.json());app.use(workspaceExecutionMiddleware({auth:{optionalSession:async()=>({user:{id:'A'}})},store,libraryStore:{get:async()=>library,resolve:async()=> 'fixture'},workspaceStore:{get:async()=>({state:{tasks:[{id:'task',activeRunId:null,runs:[{id:'run',status:'failed'}]}]}})},frontendOrigins:[origin]}));app.post('/',(_req,res)=>{calls++;res.json({jobId:'unexpected'});});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const response=await fetch(`http://127.0.0.1:${server.address().port}`,{method:'POST',headers:{Origin:origin,'X-Workspace-Account':'A','Content-Type':'application/json'},body:JSON.stringify(body())});assert.equal(response.status,409);assert.equal(calls,0);assert.equal(await store.get('A','run'),null);}finally{await new Promise(r=>server.close(r));}
});


test('workspace is rechecked after slow routing and atomic claim before dispatch',async()=>{
 const store=createWorkspaceExecutionStore({db:database()});let calls=0,reads=0;
 const app=express();app.use(express.json());app.use(workspaceExecutionMiddleware({auth:{optionalSession:async()=>({user:{id:'A'}})},store,libraryStore:{get:async()=>library,resolve:async()=> 'fixture'},workspaceStore:{get:async()=>({state:{tasks:[{id:'task',activeRunId:++reads===1?'run':null,runs:[{id:'run',status:'submitting'}]}]}})},frontendOrigins:[origin]}));app.post('/',(_req,res)=>{calls++;res.json({jobId:'unexpected'});});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const send=()=>fetch(`http://127.0.0.1:${server.address().port}`,{method:'POST',headers:{Origin:origin,'X-Workspace-Account':'A','Content-Type':'application/json'},body:JSON.stringify(body())});assert.equal((await send()).status,409);assert.equal((await send()).status,409);assert.equal(calls,0);assert.equal((await store.get('A','run')).closedUnaccepted,true);assert.equal((await store.claim('A','task','next')).fresh,true);}finally{await new Promise(r=>server.close(r));}
});
