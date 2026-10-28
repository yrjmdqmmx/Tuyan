import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {IDBFactory} from 'fake-indexeddb';
import {createAuthRuntime} from '../../auth-gateway/src/auth.js';
import {createWorkspaceRouter} from '../../auth-gateway/src/workspace-sync.js';
import {createWorkspaceCache,WorkspaceSyncController,createWorkspaceClient,equal} from '../src/workspace/workspaceSync.js';
import {newWorkspace,newTask,workspaceReducer} from '../src/workspace/workspaceState.js';
const requireGateway=createRequire(new URL('../../auth-gateway/package.json',import.meta.url));
const {MongoClient,ObjectId}=requireGateway('mongodb'),express=requireGateway('express');
const uri=process.env.WORKSPACE_COMPAT_TEST_URI;
const edit=(s,id,text)=>workspaceReducer(s,{type:'EDIT_DRAFT',taskId:id,patch:{text}});
const textOf=(s,id)=>s.tasks.find(t=>t.id===id).branches.png.draft.text;
const stopTimer=c=>clearTimeout(c.timer);
async function settle(...tabs){for(let i=0;i<3;i++)for(const c of tabs){await c.sync();stopTimer(c);}}

test('real Mongo replica set: account CAS, independent-origin clients and durable multi-tab recovery',{skip:!uri},async t=>{
 assert.match(uri,/^mongodb:\/\/127\.0\.0\.1:\d+\//,'never use an application or production database');
 const dbName='workspace_multitab_'+new ObjectId().toHexString(),mongo=new MongoClient(uri);await mongo.connect();const db=mongo.db(dbName);
 assert.ok((await db.admin().command({hello:1})).setName);
 const auth=await createAuthRuntime({mongoUri:uri,mongoDbName:dbName,authSecret:'local-test-secret-only',frontendOrigins:[]},{adapterFactory:()=>({}),betterAuthFactory:()=>({handler:async()=>Response.json({})})});
 await db.collection('user').insertMany([{_id:'test-owner',email:'owner@example.test'},{_id:'other',email:'other@example.test'}]);
 const origins=['https://tuyansci.cn','https://www.paperbanana.asia'];
 const app=express();app.use('/api/workspace',createWorkspaceRouter({auth:{optionalSession:async req=>req.get('cookie')==='test-session=owner'?{user:{id:'test-owner'}}:null},store:auth.workspaceStore,frontendOrigins:origins}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const baseUrl=`http://127.0.0.1:${server.address().port}`;
 const tabs=[];
 function transport(origin){let offline=false;return {setOffline:v=>offline=v,client:createWorkspaceClient({baseUrl,userId:'test-owner',fetcher:(url,options={})=>{if(offline)throw Error('network disconnected');return fetch(url,{...options,headers:{...options.headers,Origin:origin,Cookie:'test-session=owner'}});}})};}
 const shared=createWorkspaceCache(new IDBFactory()),separate=createWorkspaceCache(new IDBFactory());
 async function tab(cache,transport,id,restoreId){const c=new WorkspaceSyncController({cache,key:'account',client:transport.client,recoveryId:id,restoreId});tabs.push(c);await c.init();stopTimer(c);await c.sync();stopTimer(c);return c;}
 try{
  let seed=edit(newWorkspace('one'),'one','base one');seed={...seed,selectedTaskId:'two',tasks:[...seed.tasks,newTask('two')]};seed=edit(seed,'two','base two');await auth.workspaceStore.put('test-owner',0,seed);
  await t.test('actual transaction CAS rejects stale writes; accepted content remains intact',async()=>{
   const before=await auth.workspaceStore.get('test-owner');const outcomes=await Promise.allSettled([auth.workspaceStore.put('test-owner',before.revision,seed),auth.workspaceStore.put('test-owner',before.revision,seed)]);
   assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,409);assert.equal((await auth.workspaceStore.get('test-owner')).revision,before.revision+1);
  });
  const ta=transport(origins[0]),tb=transport(origins[0]),tc=transport(origins[1]);const a=await tab(shared,ta,'a'),b=await tab(shared,tb,'b'),c=await tab(separate,tc,'c');
  await t.test('different tasks and non-overlapping fields converge across origins without navigation or upload loops',async()=>{
   a.setState(s=>workspaceReducer(s,{type:'SELECT_TASK',id:'one'}));b.setState(s=>workspaceReducer(s,{type:'SELECT_TASK',id:'two'}));c.setState(s=>workspaceReducer(s,{type:'SELECT_TASK',id:'two'}));
   a.setState(s=>edit(s,'one','edited A'));b.setState(s=>edit(s,'two','edited B'));c.setState(s=>workspaceReducer(s,{type:'RENAME',taskId:'one',title:'cross-origin rename'}));await Promise.all([a.flush(),b.flush(),c.flush()]);await settle(a,b,c);
   for(const tab of [a,b,c]){assert.equal(textOf(tab.state,'one'),'edited A');assert.equal(textOf(tab.state,'two'),'edited B');assert.equal(tab.state.tasks.find(t=>t.id==='one').title,'cross-origin rename');assert.equal(tab.status,'synced');assert.equal(tab.blocked,false);}
   assert.equal(a.state.selectedTaskId,'one');assert.equal(b.state.selectedTaskId,'two');assert.equal(c.state.selectedTaskId,'two');const rev=(await auth.workspaceStore.get('test-owner')).revision;await settle(a,b,c);assert.equal((await auth.workspaceStore.get('test-owner')).revision,rev);
  });
  await t.test('offline conflicting text preserves both exact drafts through restart and keeps unrelated work writable',async()=>{
   tc.setOffline(true);c.setState(s=>edit(s,'one','offline exact draft C'));await c.flush();await c.sync();stopTimer(c);assert.equal(c.status,'error');assert.equal(c.blocked,false);
   a.setState(s=>edit(s,'one','online exact draft A'));await settle(a,b);c.dispose();tc.setOffline(false);const resumed=await tab(separate,tc,'c-reopened','c');await settle(a,b,resumed);
   for(const tab of [a,b,resumed]){const texts=tab.state.tasks.map(t=>t.branches.png.draft.text);assert.ok(texts.includes('offline exact draft C'));assert.ok(texts.includes('online exact draft A'));assert.ok(tab.state.tasks.some(t=>t.syncConflict));assert.equal(tab.blocked,false);}
   b.setState(s=>edit(s,'two','unrelated task stays writable'));await settle(a,b,resumed);assert.equal(textOf(resumed.state,'two'),'unrelated task stays writable');assert.equal(resumed.state.selectedTaskId,'two');
   const rev=(await auth.workspaceStore.get('test-owner')).revision;await settle(a,b,resumed);assert.equal((await auth.workspaceStore.get('test-owner')).revision,rev);
  });
  await t.test('simultaneous result writes use one record and one quota reservation; results and next draft survive terminal synchronization',async()=>{
   const png={format:'png',base64:Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64')};const results=await Promise.all([auth.workspaceStore.saveResult('test-owner',png),auth.workspaceStore.saveResult('test-owner',png)]);assert.equal(results[0].resultId,results[1].resultId);assert.equal(await db.collection('workspaceResults').countDocuments({userId:'test-owner'}),1);assert.equal((await db.collection('workspaceQuotas').findOne({userId:'test-owner'})).bytes,9);await assert.rejects(auth.workspaceStore.result('other',results[0].resultId),{status:404});
   a.setState(s=>workspaceReducer(s,{type:'BEGIN',taskId:'two',runId:'generation',execution:{version:1,simulation:false,jobId:'existing-job'}}));a.setState(s=>workspaceReducer(s,{type:'ACCEPT',taskId:'two',runId:'generation'}));await settle(a,b);
   b.setState(s=>edit(s,'two','next draft while generation completes'));a.setState(s=>workspaceReducer(s,{type:'RESULT',taskId:'two',runId:'generation',candidateId:'candidate-A',version:{id:'version-A',format:'png',url:'data:image/png;base64,'+png.base64}}));a.setState(s=>workspaceReducer(s,{type:'FINISH',taskId:'two',runId:'generation'}));await settle(a,b);
   const saved=await auth.workspaceStore.get('test-owner');assert.equal(textOf(saved.state,'two'),'next draft while generation completes',JSON.stringify([a,b].map(c=>({status:c.status,error:c.error,revision:c.revision,base:textOf(c.base,'two'),text:textOf(c.state,'two')}))));assert.equal(saved.state.tasks.find(t=>t.id==='two').activeRunId,null);assert.equal(saved.state.tasks.find(t=>t.id==='two').branches.png.groups[0].candidates[0].versions.length,1);assert.equal(await db.collection('workspaceExecutions').countDocuments(),0,'sync observations never dispatch generation');assert.equal(await db.collection('workspaceResults').countDocuments({userId:'test-owner'}),1);
  });
  await t.test('deletion is durable across stale clients and can be restored without losing input or result',async()=>{
   a.setState(s=>workspaceReducer(s,{type:'DELETE',taskId:'two'}));await settle(a,b);assert.equal(b.state.tasks.find(t=>t.id==='two').deleted,true);assert.equal(b.state.selectedTaskId,'two');b.setState(s=>workspaceReducer(s,{type:'RESTORE_TASK',taskId:'two'}));await settle(a,b);assert.equal(!!a.state.tasks.find(t=>t.id==='two').deleted,false);assert.equal(textOf(a.state,'two'),'next draft while generation completes');
  });
  await t.test('actual Mongo task lock admits one competing run and repeated identity never dispatches anew',async()=>{
   const outcomes=await Promise.allSettled([auth.workspaceExecutionStore.claim('test-owner','two','run-a'),auth.workspaceExecutionStore.claim('test-owner','two','run-b')]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,409);
   const winner=outcomes[0].status==='fulfilled'?'run-a':'run-b';await auth.workspaceExecutionStore.update('test-owner',winner,{jobId:'accepted-job',status:'running'});const retry=await auth.workspaceExecutionStore.claim('test-owner','two',winner);assert.equal(retry.fresh,false);assert.equal(retry.execution.jobId,'accepted-job');assert.equal(await db.collection('workspaceExecutionLocks').countDocuments(),1);
  });
  await t.test('history reads identify a native execution before clients receive its acceptance',async()=>{
   const {historyJob}=await import('../../../packages/api/src/workspace-history.mjs');
   const {mergeAccountHistory}=await import('../src/workspace/workspaceHistory.js');
   const job=historyJob({id:'accepted-job',userId:'test-owner',status:'running',methodContent:'submitted'},'server','test-owner');
   const jobs=await auth.workspaceStore.identifyHistory('test-owner',[job]);assert.equal(jobs[0].workspaceExecution.taskId,'two');
   const stale=edit(newWorkspace('different'),'different','unsaved local');assert.equal(mergeAccountHistory(stale,jobs),stale);
   const before=await auth.workspaceStore.get('test-owner');await auth.workspaceStore.importHistory('test-owner',[job]);const after=await auth.workspaceStore.get('test-owner');assert.deepEqual(after,before);
   assert.equal((await auth.workspaceStore.identifyHistory('other',[job]))[0].workspaceExecution,undefined);
  });
 }finally{for(const c of tabs)c.dispose();await new Promise(r=>server.close(r));await auth.close();await db.dropDatabase();await mongo.close();}
});
