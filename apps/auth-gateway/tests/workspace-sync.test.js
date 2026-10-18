import { memoryDb } from '../../../test-support/memory-db.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createWorkspaceStore, createWorkspaceRouter } from '../src/workspace-sync.js';
import { newWorkspace } from '../../web/src/workspace/workspaceState.js';
function database(){
 const collections=new Map();return {collection(name){if(!collections.has(name)){const rows=new Map();collections.set(name,{
  async findOne(q){return structuredClone([...rows.values()].find(r=>matches(r,q))||null);},
  async insertOne(r){if(rows.has(r._id))throw Object.assign(Error('duplicate'),{code:11000});rows.set(r._id,structuredClone(r));},
  async updateOne(q,update,options={}){let r=[...rows.values()].find(r=>matches(r,q));if(!r&&options.upsert){r={_id:q._id,...update.$setOnInsert};rows.set(r._id,r);}if(!r)return {matchedCount:0};Object.assign(r,structuredClone(update.$set||{}));for(const [k,v]of Object.entries(update.$inc||{}))r[k]=(r[k]||0)+v;return {matchedCount:1};},
  async deleteMany(q){for(const [id,r]of rows)if(matches(r,q))rows.delete(id);},
 });}return collections.get(name);}};
}
function matches(r,q){return Object.entries(q).every(([k,v])=>v&&typeof v==='object'&&'$lte'in v?r[k]<=v.$lte:r[k]===v);}
const png={format:'png',base64:Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')};
test('CAS, account isolation, clean metadata, malformed requests and result ownership',async()=>{
 const store=createWorkspaceStore({db:database()});const s=newWorkspace('task');s.apiKey='secret';
 assert.deepEqual(await store.get('A'),{state:null,revision:0});assert.deepEqual(await store.put('A',0,s),{revision:1});
 assert.equal((await store.get('A')).state.apiKey,undefined);assert.equal((await store.get('B')).state,null);
 await assert.rejects(store.put('A',0,newWorkspace()),{status:409});await assert.rejects(store.put('A',-1,s),{status:400});
 await assert.rejects(store.put('A',1,{...s,selectedTaskId:'unknown'}),{status:400});
 const asset=await store.saveResult('A',png);assert.deepEqual(await store.saveResult('A',png),asset);assert.deepEqual(await store.result('A',asset.resultId),{...asset,...png});await assert.rejects(store.result('B',asset.resultId),{status:404});
 await assert.rejects(store.saveResult('A',{format:'png',base64:Buffer.from('bad image').toString('base64')}),{status:400});
 for(const source of ['<svg onload="alert(1)"/>','<svg><script/></svg>','<svg><image href="https://other.test/secret"/></svg>'])await assert.rejects(store.saveResult('A',{format:'svg',base64:Buffer.from(source).toString('base64')}),{status:400});
});
test('result quota counts deduplicated assets once; lifecycle closure denies writes and reads',async()=>{
 const db=database();let active=true;const store=createWorkspaceStore({db,assertActive:async()=>{if(!active)throw Object.assign(Error('closed'),{status:403});}});
 await store.saveResult('A',png);await store.saveResult('A',png);
 const {createHash}=await import('node:crypto');const owner=createHash('sha256').update('A').digest('hex');assert.equal((await db.collection('workspaceQuotas').findOne({_id:owner})).bytes,8);
 await db.collection('workspaceQuotas').updateOne({_id:owner},{$set:{bytes:100000000}});
 await assert.rejects(store.saveResult('A',{format:'svg',base64:Buffer.from('<svg/>').toString('base64')}),{status:413});
 active=false;await assert.rejects(store.get('A'),{status:403});await assert.rejects(store.put('A',0,newWorkspace()),{status:403});
});
test('HTTP routes require live identity, matching account header and trusted write origin',async()=>{
 const app=express(),store=createWorkspaceStore({db:database()});const origin='http://127.0.0.1:5191';
 app.use('/api/workspace',createWorkspaceRouter({store,frontendOrigins:[origin],auth:{optionalSession:async req=>req.headers.cookie==='fixture=A'?{user:{id:'A'}}:null}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/workspace`;
 const request=(method='GET',extra={},body)=>fetch(base,{method,headers:{Origin:origin,'X-Workspace-Account':'A',Cookie:'fixture=A','Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await request('GET',{Cookie:''})).status,401);assert.equal((await request('GET',{'X-Workspace-Account':'B'})).status,409);
  assert.equal((await request('PUT',{Origin:'http://evil.test'},{revision:0,state:newWorkspace()})).status,403);
  assert.equal((await request('PUT',{}, {revision:0,state:newWorkspace('a')})).status,200);
  const r=await request();assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).revision,1);
 }finally{await new Promise(r=>server.close(r));}
});

test('server history backfill preserves drafts, is idempotent across transports, and handles a concurrent writer',async()=>{
 const {historyJob}=await import('../../../packages/api/src/workspace-history.mjs');
 const store=createWorkspaceStore({db:database()});const draft=newWorkspace('draft');draft.tasks[0].branches.png.draft.text='keep this draft';await store.put('A',0,draft);
 const job=source=>historyJob({id:'legacy-job',userId:'A',status:'completed',methodContent:'old input',outputFormat:'svg',resultImages:[{filename:'old.svg',url:'data:image/svg+xml;base64,PHN2Zy8+'}]},source,'A');
 const first=await store.importHistory('A',[job('production')]);assert.equal(first.imported,1);assert.deepEqual(first.state.tasks[0],draft.tasks[0]);assert.doesNotMatch(JSON.stringify(first.state),/data:image/);
 const again=await store.importHistory('A',[job('server')]);assert.equal(again.imported,0);assert.equal(again.revision,first.revision);assert.equal(again.state.tasks.length,2);
 const put=store.put.bind(store);let raced=false;store.put=async(id,revision,state)=>{if(!raced){raced=true;const latest=await store.get(id);latest.state.tasks[0].branches.png.draft.avoid='concurrent change';await put(id,latest.revision,latest.state);}return put(id,revision,state);};
 const second={...job('server'),id:'another-job'};await store.importHistory('A',[second]);const saved=await store.get('A');assert.equal(saved.state.tasks[0].branches.png.draft.avoid,'concurrent change');assert.equal(saved.state.tasks.length,3);assert.equal((await store.get('B')).state,null);
});

test('offline pre-import skips closed and unknown accounts; repeated apply preserves its original before-image',async()=>{
 const {backfillHistory}=await import('../src/workspace-backfill.js');
 const {historyJob}=await import('../../../packages/api/src/workspace-history.mjs');
 const db=memoryDb(),mongoClient={startSession:()=>({withTransaction:fn=>fn(),endSession:async()=>{}})};await db.collection('user').insertOne({_id:'A'});await db.collection('user').insertOne({_id:'closed'});await db.collection('accountDeletionOperations').insertOne({_id:'closed'});
 const job=id=>historyJob({id:'job-'+id,userId:id,status:'completed',outputFormat:'svg',methodContent:'old request',resultImages:[{filename:'a.svg'}]},'server',id);
 const groups=['A','closed','unknown'].map(userId=>({userId,jobs:[job(userId)]}));
 const store=createWorkspaceStore({db}),before=newWorkspace('existing');before.tasks[0].branches.png.draft.text='untouched';await store.put('A',0,before);
 const dry=await backfillHistory({db,mongoClient,groups});assert.equal(dry.accounts,1);assert.equal(dry.skippedAccounts,2);assert.equal((await store.get('A')).revision,1);
 const first=await backfillHistory({db,mongoClient,groups,apply:true});assert.equal(first.added,1);const saved=await store.get('A');assert.deepEqual(saved.state.tasks[0],before.tasks[0]);
 const again=await backfillHistory({db,mongoClient,groups,apply:true});assert.equal(again.added,0);assert.equal((await store.get('A')).revision,saved.revision);
 assert.equal((await db.collection('workspaceMigrationBackups').findOne({_id:'history-v1:A'})).revision,1);
 assert.equal((await store.get('unknown')).state,null);assert.equal((await store.get('closed')).state,null);
});
