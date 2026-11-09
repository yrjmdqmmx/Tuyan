import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {memoryDb} from '../../../test-support/memory-db.mjs';
import {newWorkspace,newTask} from '../../../packages/api/src/workspace-defaults.mjs';
import {createWorkspaceStore,createWorkspaceRouter} from '../src/workspace-sync.js';
import {createWorkspaceExecutionStore} from '../src/workspace-execution.js';
import {permanentlyRemoveTask} from '../../../packages/api/src/workspace-deletion.mjs';

async function fixture(){const db=memoryDb(),store=createWorkspaceStore({db}),state=newWorkspace('remove');state.tasks[0].branches.png.draft.text='SECRET-DRAFT';state.tasks.push(newTask('keep'));await store.put('A',0,state);return {db,store,state};}
test('permanent deletion scrubs task, backups and execution data; stale clients and claims cannot resurrect it',async()=>{
 const {db,store,state}=await fixture();await db.collection('workspaceMigrationBackups').insertOne({_id:'backup',userId:'A',state});
 await db.collection('workspaceExecutions').insertOne({_id:'receipt',userId:'A',taskId:'remove',runId:'run',jobId:'job',status:'succeeded'});
 const op=await store.beginDelete('A','remove',1);assert.deepEqual(op.jobIds,['job']);
 const saved=await store.get('A');assert.equal(saved.revision,2);assert.deepEqual(saved.state.tasks.map(t=>t.id),['keep']);assert.doesNotMatch(JSON.stringify(db.collection('workspaceMigrationBackups').rows),/SECRET-DRAFT/);
 assert.equal(db.collection('workspaceExecutions').rows.length,0);assert.equal(saved.state.purgedTasks[0].jobIds[0],'job');
 await assert.rejects(store.put('A',2,state),{status:409});await assert.rejects(createWorkspaceExecutionStore({db}).claim('A','remove','late'),{status:409});
 assert.deepEqual(await store.beginDelete('A','remove',1),op);await store.finishDelete('A','remove');assert.deepEqual(await store.pendingDeletions('A'),[]);
 await assert.rejects(store.beginDelete('B','keep',0),{status:404});
});
test('active execution lock and revision mismatch make no deletion; clients cannot forge purge markers',async()=>{
 const {db,store,state}=await fixture();await assert.rejects(store.beginDelete('A','remove',0),{status:409});
 await assert.rejects(store.put('A',1,permanentlyRemoveTask(state,'remove')),{status:409});
 await db.collection('workspaceExecutionLocks').insertOne({_id:'lock',userId:'A',taskId:'remove'});
 await assert.rejects(store.beginDelete('A','remove',1),{status:409});assert.deepEqual((await store.get('A')).state,state);
});
test('HTTP deletion authenticates account and origin; cleanup failure is durable and GET retries without rerunning any model',async()=>{
 const {db,store}=await fixture();await db.collection('workspaceExecutions').insertOne({_id:'receipt',userId:'A',taskId:'remove',jobId:'job'});
 let calls=0,maintenance=false;const app=express();app.use('/api/workspace',createWorkspaceRouter({store,isMaintenance:()=>maintenance,frontendOrigins:['http://local.test'],auth:{optionalSession:async r=>r.headers.cookie==='A'?{user:{id:'A'}}:null},cleanupTask:async op=>{assert.deepEqual(op.jobIds,['job']);if(++calls===1)throw Error('storage down');}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}/api/workspace`;
 const headers={Origin:'http://local.test',Cookie:'A','X-Workspace-Account':'A','Content-Type':'application/json'};
 try{
  for(const [override,status] of [[{Cookie:''},401],[{Origin:'http://evil.test'},403],[{'X-Workspace-Account':'B'},409]])assert.equal((await fetch(url+'/tasks/remove',{method:'DELETE',headers:{...headers,...override},body:'{"revision":1}'})).status,status);
  assert.equal((await fetch(url+'/tasks/remove',{method:'DELETE',headers,body:'{"revision":1}'})).status,503);
  assert.equal((await store.pendingDeletions('A')).length,1);
  maintenance=true;const paused=await (await fetch(url,{headers})).json();assert.equal(paused.deletionPending,true);assert.equal(calls,1);maintenance=false;
  const result=await (await fetch(url,{headers})).json();assert.deepEqual(result.state.tasks.map(t=>t.id),['keep']);assert.equal(calls,2);assert.equal((await store.pendingDeletions('A')).length,0);
 }finally{await new Promise(r=>server.close(r));}
});

test('only exclusive results are erased and quota is released once; stale result uploads are rejected',async()=>{
 const {newDraft}=await import('../../../packages/api/src/workspace-defaults.mjs');
 const db=memoryDb(),store=createWorkspaceStore({db}),state=newWorkspace('remove');state.tasks.push(newTask('keep'));
 const png=tail=>({format:'png',base64:Buffer.from([137,80,78,71,13,10,26,10,tail]).toString('base64')});
 const shared=(await store.saveResult('A',png(1))).resultId,exclusive=(await store.saveResult('A',png(2))).resultId;
 function result(task,id,resultId){const run={id,path:'png',kind:'generate',status:'succeeded',accepted:true,groupId:id,candidateId:null,parentId:null,input:newDraft(),draftRevision:0,navRevision:0,stage:'',createdAt:1};task.runs.push(run);task.branches.png.groups.push({id,number:task.runs.length,runId:id,expected:1,candidates:[{id,label:'A',viewedVersionId:null,versions:[{id,format:'png',resultId,number:1,parentId:null,runId:id,origin:'fixture',review:'',createdAt:1}]}]});}
 result(state.tasks[0],'exclusive',exclusive);result(state.tasks[0],'shared-a',shared);result(state.tasks[1],'shared-b',shared);
 await store.put('A',0,state);await store.beginDelete('A','remove',1);
 await assert.rejects(store.result('A',exclusive),{status:404});assert.equal((await store.result('A',shared)).resultId,shared);assert.equal(db.collection('workspaceQuotas').rows[0].bytes,9);
 await store.beginDelete('A','remove',1);assert.equal(db.collection('workspaceQuotas').rows[0].bytes,9);
 await assert.rejects(store.saveResult('A',{...png(2),taskId:'remove'}),{status:409});assert.equal(db.collection('workspaceResults').rows.length,1);
});
