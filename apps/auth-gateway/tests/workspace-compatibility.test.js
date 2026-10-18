import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {MongoClient,ObjectId} from 'mongodb';
import {createAuthRuntime} from '../src/auth.js';
import {backfillHistory} from '../src/workspace-backfill.js';
import {workspaceExecutionMiddleware} from '../src/workspace-execution.js';
import {createDeletionStore,createAccountDeletionService} from '../src/account-deletion.js';
import {WORKSPACE_ACCOUNT_COLLECTIONS,withWorkspaceAccountWrite} from '../src/workspace-lifecycle.js';
import {historyJob} from '../../../packages/api/src/workspace-history.mjs';
import {newWorkspace} from '../../../packages/api/src/workspace-defaults.mjs';

// Explicit loopback replica set only; never falls back to application/prod URIs.
const uri=process.env.WORKSPACE_COMPAT_TEST_URI;
test('isolated Mongo: all-account pre-import, lifecycle races and legacy execution recovery', {skip:!uri}, async t=>{
  assert.match(uri,/^mongodb:\/\/127\.0\.0\.1:\d+\//);
  const name='workspace_compat_'+new ObjectId().toHexString(),mongo=new MongoClient(uri);
  await mongo.connect();const db=mongo.db(name);
  assert.ok((await db.admin().command({hello:1})).setName,'transactions must run on an actual replica set');
  const auth=await createAuthRuntime({mongoUri:uri,mongoDbName:name,authSecret:'fixture-secret-only',frontendOrigins:[]},{adapterFactory:()=>({}),betterAuthFactory:()=>({handler:async()=>Response.json({})})});
  const users=['A','B','C','D','E','F'];
  for(const id of [...users,'closed','same-email-new'])await db.collection('user').insertOne({_id:id,email:id==='same-email-new'?'deleted@example.test':id+'@example.test'});
  await db.collection('accountDeletionOperations').insertOne({_id:'closed',status:'pending'});
  const groups=users.map((userId,index)=>({userId,jobs:Array.from({length:index<3?10:9},(_,i)=>historyJob({id:`${userId}-job-${i}`,userId,status:i===0?'awaiting_provider':'completed',outputFormat:i%2?'png':'svg',methodContent:'Original requirement',createdAt:'2026-01-01',resultImages:[{filename:i%2?'original.png':'original.svg'}]},'server',userId))}));
  for(const userId of ['closed','deleted','unknown'])groups.push({userId,jobs:[historyJob({id:userId+'-job',userId,status:'completed'},'server',userId)]});
  const original=newWorkspace('protected-draft');original.tasks[0].branches.png.draft.text='Do not change my current draft';original.tasks[0].branches.svg.draft.avoid='Keep old settings';
  const png={format:'png',base64:Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')},svg={format:'svg',base64:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><text>Original</text></svg>').toString('base64')};
  const savedResults=[await auth.workspaceStore.saveResult('A',png),await auth.workspaceStore.saveResult('A',svg)];
  await auth.workspaceStore.put('A',0,original);
  const duplicateGroups=[...groups,{userId:'A',jobs:groups[0].jobs.map(j=>({...j,source:'production'}))}];
  try {
    await t.test('dry run, repeated apply and transport duplicates preserve drafts/results without replay',async()=>{
      const before=await auth.workspaceStore.get('A');
      const dry=await backfillHistory({db,mongoClient:mongo,groups:duplicateGroups});assert.deepEqual(dry,{accounts:6,skippedAccounts:3,records:57,added:57,unchanged:0});
      assert.deepEqual(await auth.workspaceStore.get('A'),before);assert.equal(await db.collection('workspaceMigrationBackups').countDocuments(),0);
      assert.equal((await backfillHistory({db,mongoClient:mongo,groups:duplicateGroups,apply:true})).added,57);
      const saved=await auth.workspaceStore.get('A'),backup=await db.collection('workspaceMigrationBackups').findOne({userId:'A'});
      assert.equal((await backfillHistory({db,mongoClient:mongo,groups:duplicateGroups,apply:true})).added,0);
      assert.deepEqual(await auth.workspaceStore.get('A'),saved);assert.deepEqual(saved.state.tasks[0],original.tasks[0]);
      assert.deepEqual(await db.collection('workspaceMigrationBackups').findOne({userId:'A'}),backup);
      assert.equal(await db.collection('workspaceDocuments').countDocuments(),6);
      assert.equal((await auth.workspaceStore.get('same-email-new')).state,null);
      for(const [i,result]of savedResults.entries())assert.equal((await auth.workspaceStore.result('A',result.resultId)).base64,[png,svg][i].base64);
      await assert.rejects(auth.workspaceStore.result('B',savedResults[0].resultId),{status:404});
      assert.equal(await db.collection('workspaceExecutions').countDocuments(),0);
      assert.equal(await db.collection('workspaceExecutionLocks').countDocuments(),0);
      await assert.rejects(backfillHistory({db,mongoClient:mongo,groups:[{userId:'B',jobs:groups[0].jobs}],apply:true}),/HISTORY_OWNER_MISMATCH/);
    });
    await t.test('interrupted account transaction rolls back its backup and document; rerun imports once',async()=>{
      await db.collection('user').insertOne({_id:'crash',email:'crash@example.test'});
      await assert.rejects(withWorkspaceAccountWrite({db,mongoClient:mongo,userId:'crash'},async scoped=>{
        await scoped.collection('workspaceMigrationBackups').insertOne({_id:'crash',userId:'crash'});
        await scoped.collection('workspaceDocuments').insertOne({_id:'crash',userId:'crash'});
        throw Error('simulated-process-interruption');
      }),/simulated-process-interruption/);
      for(const n of ['workspaceMigrationBackups','workspaceDocuments'])assert.equal(await db.collection(n).countDocuments({userId:'crash'}),0);
      const g=[{userId:'crash',jobs:[historyJob({id:'crash-job',userId:'crash',status:'completed'},'server','crash')]}];
      assert.equal((await backfillHistory({db,mongoClient:mongo,groups:g,apply:true})).added,1);
      assert.equal((await backfillHistory({db,mongoClient:mongo,groups:g,apply:true})).added,0);
    });
    await t.test('concurrent import reports only committed additions and keeps one backup',async()=>{
      const userId='concurrent-import';await db.collection('user').insertOne({_id:userId,email:userId+'@example.test'});
      const g=[{userId,jobs:[historyJob({id:'same-original-job',userId,status:'completed'},'server',userId)]}];
      const outcomes=await Promise.all([backfillHistory({db,mongoClient:mongo,groups:g,apply:true}),backfillHistory({db,mongoClient:mongo,groups:g,apply:true})]);
      assert.equal(outcomes.reduce((n,r)=>n+r.added,0),1);
      assert.equal(await db.collection('workspaceMigrationBackups').countDocuments({userId}),1);
      const state=(await auth.workspaceStore.get(userId)).state;assert.equal(state.tasks.flatMap(t=>t.runs).length,1);
    });
    await t.test('native and legacy identity coexist; restore uses original job and immutable saved steps',async()=>{
      const task=(await auth.workspaceStore.get('A')).state.tasks.find(t=>t.runs.some(r=>r.history?.jobId==='A-job-0')),run=task.runs[0];
      const job={id:'A-job-0',userId:'A',status:'awaiting_provider',outputFormat:'svg',jobType:'generate',modelRoutes:{main:{accessProvider:'tokendance',modelId:'legacy-exact-model'}},recovery:{canResume:true,channel:'tokendance',requestState:'not_sent'},resultImages:[{filename:'original.svg',url:'data:image/svg+xml;base64,'+svg.base64}]};
      const checkpoint={completedSteps:[{id:'planning',bytes:'immutable saved planning'},{id:'candidate-A',bytes:svg.base64}],pendingSteps:['review']};const before=structuredClone(checkpoint);
      let dispatches=0,modelCalls=0,creates=0;
      const backend={call:async(body,_context,identity)=>{assert.equal(identity.authUserId,'A');assert.equal(body.action,'getJob');return {status:200,data:{job:structuredClone(job)}};}};
      const app=express();app.use(express.json());
      app.use(workspaceExecutionMiddleware({auth:{optionalSession:async()=>({user:{id:'A'}})},backend,store:auth.workspaceExecutionStore,workspaceStore:auth.workspaceStore,libraryStore:auth.modelLibraryStore,frontendOrigins:['http://localhost'],simulation:true}));
      app.post('/',async(req,res)=>{
        if(req.body.action==='getJob')return res.json({job:structuredClone(job)});
        if(req.body.action==='createJob'||req.body.action==='refineImage'){creates++;return res.sendStatus(500);}
        assert.deepEqual(req.body,{action:'tokenDanceResume',jobId:job.id});
        // Local stand-in for Core's atomic queued checkpoint transition.
        if(job.status==='awaiting_provider'){dispatches++;job.status='running';return res.status(503).json({error:'simulated lost acceptance response'});}
        res.json({jobId:job.id,status:job.status});
      });
      const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
      const send=(action,extra={})=>fetch(`http://127.0.0.1:${server.address().port}`,{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json','X-Workspace-Account':'A'},body:JSON.stringify({action,workspaceExecution:{version:1,taskId:task.id,runId:run.id},...extra})});
      try{
        job.userId='B';assert.equal((await send('workspaceAdoptHistory')).status,403);job.userId='A';
        job.recovery.requestState='unknown';assert.equal((await send('workspaceAdoptHistory')).status,409);job.recovery.requestState='not_sent';
        const savedRoutes=job.modelRoutes;job.modelRoutes={};assert.equal((await send('workspaceAdoptHistory')).status,409);job.modelRoutes=savedRoutes;
        assert.equal(await db.collection('workspaceHistoryExecutions').countDocuments(),0);
        await auth.workspaceExecutionStore.claim('A',task.id,'busy-native');
        assert.equal((await send('workspaceAdoptHistory')).status,409);assert.equal(await db.collection('workspaceHistoryExecutions').countDocuments(),0);
        await auth.workspaceExecutionStore.update('A','busy-native',{status:'completed'});
        const response=await send('workspaceAdoptHistory');assert.equal(response.status,200,JSON.stringify(await response.clone().json()));assert.equal((await response.json()).execution.jobId,job.id);
        assert.equal((await send('workspaceAdoptHistory')).status,200);assert.equal(dispatches,0);
        await assert.rejects(auth.workspaceExecutionStore.claim('A',task.id,'different-run'),{status:409});
        const first=await auth.workspaceExecutionStore.get('A',run.id);
        await assert.rejects(auth.workspaceExecutionStore.adoptHistory('A','other-task','other-run',{jobId:job.id,routes:first.routes,fingerprint:first.fingerprint}),{status:409});
        assert.equal(await db.collection('workspaceHistoryExecutions').countDocuments(),1);
        assert.equal((await send('tokenDanceResume',{jobId:'forged',requirements:'replace',modelRoutes:{main:{modelId:'wrong'}},apiKeys:{custom:'FORGED_SECRET'}})).status,503);
        assert.equal((await send('tokenDanceResume')).status,200);assert.equal(dispatches,1);assert.equal(creates,0);assert.equal(modelCalls,0);assert.deepEqual(checkpoint,before);
        // Restart the Auth runtime/store, then read the same accepted identity.
        const persisted=await auth.workspaceExecutionStore.get('A',run.id);assert.equal(persisted.jobId,job.id);assert.equal(persisted.status,'running');
        assert.equal(await auth.workspaceExecutionStore.get('B',run.id),null);
        job.status='completed';assert.equal((await send('getJob')).status,200);
        assert.equal((await auth.workspaceExecutionStore.get('A',run.id)).status,'completed');
        assert.equal(await db.collection('workspaceExecutionLocks').countDocuments({userId:'A'}),0);
        assert.deepEqual((await auth.workspaceStore.get('A')).state.tasks[0],original.tasks[0]);
        assert.doesNotMatch(JSON.stringify(await db.collection('workspaceExecutions').find().toArray()),/FORGED_SECRET/);
      }finally{await new Promise(r=>server.close(r));}
    });
    await t.test('deletion cleans every workspace collection and cannot be resurrected by pre-import or stale writers',async()=>{
      const other=await auth.workspaceStore.get('B');
      for(const collection of WORKSPACE_ACCOUNT_COLLECTIONS)await db.collection(collection).insertOne({_id:'cleanup-fixture-'+collection,userId:'A'});
      const deletionStore=createDeletionStore(db.collection('accountDeletionOperations'),()=>new Date(),{mongoClient:mongo,users:db.collection('user')});
      const backend={call:async body=>({status:200,data:{code:0,ok:true,deletionContractVersion:3,state:'active',operationId:body.operationId,phase:body.action==='completeAccountDeletion'?'completed':'awaiting_auth'}})};
      const service=createAccountDeletionService({auth,backend,store:deletionStore});
      assert.equal((await service.request('A')).status,200);
      for(const collection of WORKSPACE_ACCOUNT_COLLECTIONS)assert.equal(await db.collection(collection).countDocuments({userId:'A'}),0,collection);
      const beforeCount=await db.collection('workspaceMigrationBackups').countDocuments();
      const repeat=await backfillHistory({db,mongoClient:mongo,groups:[groups[0]],apply:true});assert.equal(repeat.skippedAccounts,1);assert.equal(await db.collection('workspaceMigrationBackups').countDocuments(),beforeCount);
      for(const work of [()=>auth.workspaceStore.put('A',0,original),()=>auth.workspaceStore.saveResult('A',svg),()=>auth.workspaceExecutionStore.claim('A','stale','run'),()=>auth.workspaceExecutionStore.closeUnaccepted('A','stale','run'),()=>auth.modelLibraryStore.put('A',{revision:0,models:[],connections:[]})])await assert.rejects(work,{status:403});
      assert.deepEqual(await auth.workspaceStore.get('B'),other);
      assert.equal((await deletionStore.get('A')).status,'completed');
    });
    await t.test('real concurrent deletion and migration serialize on the account document',async()=>{
      for(let i=0;i<5;i++){
        const id='race-'+i;await db.collection('user').insertOne({_id:id,email:id+'@example.test'});
        const deletion=createDeletionStore(db.collection('accountDeletionOperations'),()=>new Date(),{mongoClient:mongo,users:db.collection('user')});
        const g=[{userId:id,jobs:[historyJob({id:'race-job',userId:id,status:'completed'},'server',id)]}];
        const settled=await Promise.allSettled([backfillHistory({db,mongoClient:mongo,groups:g,apply:true}),deletion.begin(id)]);
        assert.equal(settled[1].status,'fulfilled');if(settled[0].status==='rejected')assert.equal(settled[0].reason.status,403);
        // Final account phase uses the same deletion transaction as production.
        await auth.deleteUser(id);
        await assert.rejects(auth.workspaceStore.put(id,0,newWorkspace('late')),{status:403});
        for(const n of WORKSPACE_ACCOUNT_COLLECTIONS)assert.equal(await db.collection(n).countDocuments({userId:id}),0,n);
      }
    });
  }finally{await auth.close();await db.dropDatabase();await mongo.close();}
});
