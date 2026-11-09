import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {accountWorkspaceStore} from '../../src/workspace-lifecycle.js';
import {createWorkspaceStore} from '../../src/workspace-sync.js';
import {createWorkspaceExecutionStore} from '../../src/workspace-execution.js';
import {newWorkspace,newTask} from '../../../../packages/api/src/workspace-defaults.mjs';
const uri=process.env.WORKSPACE_COMPAT_TEST_URI;
test('real Mongo transactions serialize permanent deletion with stale saves and execution claims',{skip:!uri},async()=>{
 assert.match(uri,/^mongodb:\/\/127\.0\.0\.1:\d+\//);
 const client=new MongoClient(uri),db=client.db('delete_fixture_'+Date.now());await client.connect();
 try{
  await db.collection('user').insertOne({_id:'fixture-owner'});
  // Pre-create collections so first-use collection creation is outside races.
  for(const name of ['workspaceDocuments','workspaceExecutions','workspaceExecutionLocks','workspaceHistoryExecutions','workspaceMigrationBackups','workspaceTaskDeletions','workspaceResults','workspaceQuotas','accountDeletionOperations'])await db.createCollection(name);
  const store=accountWorkspaceStore({db,mongoClient:client,factory:createWorkspaceStore,mutations:['put','saveResult','importHistory','beginDelete','finishDelete']});
  const executions=accountWorkspaceStore({db,mongoClient:client,factory:createWorkspaceExecutionStore,mutations:['claim','update','adoptHistory','closeUnaccepted']});
  const state=newWorkspace('remove');state.tasks[0].branches.png.draft.text='private fixture';state.tasks.push(newTask('keep'));await store.put('fixture-owner',0,state);
  const stale=structuredClone(state);stale.tasks[0].branches.png.draft.text='stale private fixture';
  const race=await Promise.allSettled([store.beginDelete('fixture-owner','remove',1),store.put('fixture-owner',1,stale)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
  if(race[0].status==='rejected')await store.beginDelete('fixture-owner','remove',(await store.get('fixture-owner')).revision);
  const saved=await store.get('fixture-owner');assert.doesNotMatch(JSON.stringify(saved),/private fixture/);
  await assert.rejects(store.put('fixture-owner',saved.revision,stale),{status:409});
  const compete=await Promise.allSettled([store.beginDelete('fixture-owner','keep',saved.revision),executions.claim('fixture-owner','keep','late-run')]);
  assert.equal(compete.filter(r=>r.status==='fulfilled').length,1);
  if(compete[0].status==='rejected'){await executions.update('fixture-owner','late-run',{status:'failed'});await store.beginDelete('fixture-owner','keep',saved.revision);}
  await assert.rejects(executions.claim('fixture-owner','keep','another-late-run'),{status:409});
  assert.equal((await store.get('fixture-owner')).state.tasks.length,1);
 }finally{await db.dropDatabase();await client.close();}
});
