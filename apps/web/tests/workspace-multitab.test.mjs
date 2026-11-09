import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorkspaceCache,WorkspaceSyncController,mergeWorkspaces,equal,createWorkspaceClient} from '../src/workspace/workspaceSync.js';
import {newWorkspace,newTask,workspaceReducer,currentDraft} from '../src/workspace/workspaceState.js';
import {cleanWorkspace} from '../../../packages/api/src/workspace-sync.mjs';
const edit=(s,text,taskId)=>workspaceReducer(s,{type:'EDIT_DRAFT',taskId,patch:{text}});
function server(initial){let state=structuredClone(initial),revision=1,offline=false,puts=0;return {get:async n=>{if(offline)throw Error('offline');return n===revision?{revision,unchanged:true}:{revision,state:structuredClone(state)};},wire:async s=>structuredClone(s),hydrate:async s=>structuredClone(s),put:async(r,s)=>{if(offline)throw Error('offline');if(r!==revision)throw Object.assign(Error('WORKSPACE_CONFLICT'),{status:409});state=structuredClone(s);puts++;return {revision:++revision};},offline:v=>offline=v,read:()=>state,puts:()=>puts};}
// Legacy accounts can contain several unsubmitted drafts. Seed them directly.
const seed=()=>({...edit(newWorkspace('one'),'first'),selectedTaskId:'two',tasks:[...edit(newWorkspace('one'),'first').tasks,newTask('two')]});
async function controller(client,cache,id){const c=new WorkspaceSyncController({key:'account',client,cache,recoveryId:id});await c.init();clearTimeout(c.timer);await c.sync();clearTimeout(c.timer);return c;}
async function settle(...controllers){for(let i=0;i<3;i++)for(const c of controllers){await c.sync();clearTimeout(c.timer);}}

test('shared IndexedDB CAS rebases different tasks and fields, keeps selection and converges without write loops',async()=>{
 const backend=server(seed()),cache=createWorkspaceCache(new IDBFactory());const a=await controller(backend,cache,'A'),b=await controller(backend,cache,'B');
 try{
  a.setState(s=>workspaceReducer(s,{type:'SELECT_TASK',id:'one'}));b.setState(s=>workspaceReducer(s,{type:'SELECT_TASK',id:'two'}));
  a.setState(s=>edit(s,'A changes task one','one'));b.setState(s=>edit(s,'B changes task two','two'));
  await Promise.all([a.flush(),b.flush(),a.sync(),b.sync()]);await settle(a,b);
  assert.equal(a.blocked,false);assert.equal(b.blocked,false);assert.equal(a.state.selectedTaskId,'one');assert.equal(b.state.selectedTaskId,'two');
  assert.equal(a.state.tasks.find(t=>t.id==='one').branches.png.draft.text,'A changes task one');assert.equal(a.state.tasks.find(t=>t.id==='two').branches.png.draft.text,'B changes task two');assert.equal(a.notice,'');assert.ok(equal(a.state,b.state));
  const before=backend.puts();await settle(a,b);assert.equal(backend.puts(),before);
  a.setState(s=>workspaceReducer(s,{type:'RENAME',taskId:'one',title:'Renamed'}));b.setState(s=>edit(s,'new requirements','one'));await settle(a,b);
  const task=a.state.tasks.find(t=>t.id==='one');assert.equal(task.title,'Renamed');assert.equal(task.branches.png.draft.text,'new requirements');assert.equal(a.notice,'');
 }finally{a.dispose();b.dispose();}
});

test('same-field concurrent/offline edits retain both drafts, stable conflict identities and no navigation',async()=>{
 const backend=server(edit(newWorkspace('one'),'base')),cache=createWorkspaceCache(new IDBFactory()),a=await controller(backend,cache,'A'),b=await controller(backend,cache,'B');
 try{
  backend.offline(true);a.setState(s=>edit(s,'offline A'));b.setState(s=>edit(s,'offline B'));
  await Promise.all([a.flush(),b.flush()]);await a.sync();assert.equal(a.blocked,false);
  backend.offline(false);await settle(a,b);
  for(const c of [a,b]){assert.equal(c.state.selectedTaskId,'one');assert.ok(c.state.tasks.some(t=>t.branches.png.draft.text==='offline A'));assert.ok(c.state.tasks.some(t=>t.branches.png.draft.text==='offline B'));assert.ok(c.notice);}
  const count=a.state.tasks.length;await settle(a,b);assert.equal(a.state.tasks.length,count);assert.equal(b.state.tasks.length,count);
  const copy=a.state.tasks.find(t=>t.syncConflict);a.setState(s=>workspaceReducer(s,{type:'KEEP_CONFLICT',taskId:copy.id}));await settle(a,b);assert.equal(a.notice,'');assert.equal(b.notice,'');
 }finally{a.dispose();b.dispose();}
});

test('separate origins merge through account CAS; background catchup and reload retain per-tab view',async()=>{
 const backend=server(seed()),ca=createWorkspaceCache(new IDBFactory()),cb=createWorkspaceCache(new IDBFactory()),a=await controller(backend,ca,'A'),b=await controller(backend,cb,'B');
 try{
  a.setState(s=>workspaceReducer(s,{type:'SELECT_TASK',id:'one'}));b.setState(s=>workspaceReducer(s,{type:'SELECT_TASK',id:'two'}));
  b.setState(s=>workspaceReducer(s,{type:'SET_PATH',path:'svg'}));await b.flush();
  a.setState(s=>edit(s,'from origin A','one'));await a.sync();await b.sync({background:true});
  assert.equal(b.state.selectedTaskId,'two');assert.equal(b.state.tasks.find(t=>t.id==='two').path,'svg');assert.equal(b.state.tasks.find(t=>t.id==='one').branches.png.draft.text,'from origin A');
  b.dispose();const restored=new WorkspaceSyncController({key:'account',cache:cb,client:backend,recoveryId:'B-new',restoreId:'B'});await restored.init();try{await restored.sync();assert.equal(restored.state.selectedTaskId,'two');assert.equal(restored.state.tasks.find(t=>t.id==='two').path,'svg');}finally{restored.dispose();}
 }finally{a.dispose();b.dispose();}
});

test('deletion propagates without resurrecting stale content; delete versus edit preserves a recovery copy',()=>{
 const base=edit(newWorkspace('one'),'base'),deleted=workspaceReducer(base,{type:'DELETE'});
 let merged=mergeWorkspaces(base,base,deleted);assert.equal(merged.state.tasks[0].deleted,true);assert.equal(merged.state.selectedTaskId,'one');assert.equal(merged.conflicts,0);
 merged=mergeWorkspaces(base,edit(base,'unsaved change'),deleted);assert.equal(merged.conflicts,1);assert.ok(merged.state.tasks.some(t=>!t.deleted&&t.branches.png.draft.text==='unsaved change'));assert.ok(merged.state.tasks.find(t=>t.id==='one').deleted);assert.doesNotThrow(()=>cleanWorkspace(merged.state));
});

test('generation observations and results merge with typing, terminal state cannot regress or create another execution',()=>{
 let base=edit(newWorkspace('one'),'submitted');base=workspaceReducer(base,{type:'BEGIN',runId:'run',at:1,execution:{version:1,simulation:true}});base=workspaceReducer(base,{type:'ACCEPT',runId:'run'});
 const local=edit(base,'next operation');let remote=workspaceReducer(base,{type:'EXECUTION',runId:'run',stage:'规划完成'});remote=workspaceReducer(remote,{type:'RESULT',runId:'run',candidateId:'c',version:{id:'v',format:'svg',url:'data:image/svg+xml,test'},at:3});remote=workspaceReducer(remote,{type:'FINISH',runId:'run'});
 const merged=mergeWorkspaces(base,local,remote);assert.equal(merged.conflicts,0);assert.equal(currentDraft(merged.state).text,'next operation');assert.equal(merged.state.tasks[0].activeRunId,null);assert.equal(merged.state.tasks[0].runs.length,1);
 const stale=workspaceReducer(base,{type:'EXECUTION',runId:'run',stage:'rendering'});const final=mergeWorkspaces(base,remote,stale);assert.equal(final.state.tasks[0].runs[0].status,'succeeded');assert.equal(final.state.tasks[0].activeRunId,null);assert.equal(final.conflicts,0);
});

test('simultaneous generation polls with identical result IDs do not create conflicts or duplicate versions',()=>{
 let base=edit(newWorkspace('one'),'submitted');base=workspaceReducer(base,{type:'BEGIN',runId:'run',at:1,execution:{version:1,simulation:true}});base=workspaceReducer(base,{type:'ACCEPT',runId:'run'});
 const result=at=>workspaceReducer(base,{type:'RESULT',runId:'run',candidateId:'c',version:{id:'v',format:'png',url:'data:image/png;base64,AA=='},at});
 const merged=mergeWorkspaces(base,result(2),result(3));assert.equal(merged.conflicts,0);assert.equal(merged.state.tasks[0].branches.png.groups[0].candidates[0].versions.length,1);
});

test('transport revision check remains authenticated and only omits unchanged state',async()=>{
 const seen=[];const client=createWorkspaceClient({userId:'fixture',baseUrl:'https://account.test',fetcher:async(url,options)=>{seen.push([url,options]);return {ok:true,json:async()=>({revision:4,unchanged:true})};}});await client.get(4);
 assert.equal(seen[0][0],'https://account.test/api/workspace?revision=4');assert.equal(seen[0][1].credentials,'include');assert.equal(seen[0][1].headers['X-Workspace-Account'],'fixture');
});

test('conflict copies round-trip through the actual wire allowlist and stop uploading',async()=>{
 const backend=server(edit(newWorkspace('one'),'base'));backend.wire=async s=>cleanWorkspace(s);
 const a=await controller(backend,createWorkspaceCache(new IDBFactory()),'A'),b=await controller(backend,createWorkspaceCache(new IDBFactory()),'B');
 try{a.setState(s=>edit(s,'A'));b.setState(s=>edit(s,'B'));await settle(a,b);assert.equal(a.status,'synced');assert.equal(b.status,'synced');const puts=backend.puts();await settle(a,b);assert.equal(backend.puts(),puts);}finally{a.dispose();b.dispose();}
});

test('disjoint text edits merge; overlapping text edits retain both exact versions',()=>{
 const base=edit(newWorkspace('one'),'alpha\nbeta\ngamma');let result=mergeWorkspaces(base,edit(base,'ALPHA\nbeta\ngamma'),edit(base,'alpha\nbeta\nGAMMA'));
 assert.equal(result.conflicts,0);assert.equal(currentDraft(result.state).text,'ALPHA\nbeta\nGAMMA');
 result=mergeWorkspaces(base,edit(base,'alpha\nleft\ngamma'),edit(base,'alpha\nright\ngamma'));assert.equal(result.conflicts,1);assert.ok(result.state.tasks.some(t=>t.branches.png.draft.text==='alpha\nleft\ngamma'));assert.ok(result.state.tasks.some(t=>t.branches.png.draft.text==='alpha\nright\ngamma'));
});

test('a rename dialog opened before a remote rename cannot silently overwrite it',()=>{
 const base=workspaceReducer(newWorkspace('one'),{type:'RENAME',title:'original'});let remote=workspaceReducer(base,{type:'RENAME',title:'remote name'});remote=workspaceReducer(remote,{type:'RENAME',title:'local dialog name',baseTitle:'original'});
 assert.equal(remote.selectedTaskId,'one');assert.equal(remote.tasks[0].title,'remote name');assert.ok(remote.tasks.some(t=>t.syncConflict&&t.title.startsWith('local dialog name')));
});


test('concurrent task additions converge despite different local ordering; mode is shared content',async()=>{
 let seed=edit(newWorkspace('one'),'seed');seed=workspaceReducer(seed,{type:'BEGIN',runId:'seed-run'});seed=workspaceReducer(seed,{type:'ACCEPT',runId:'seed-run'});seed=workspaceReducer(seed,{type:'FINISH',runId:'seed-run'});
 const backend=server(seed);backend.wire=async s=>cleanWorkspace(s);
 const a=await controller(backend,createWorkspaceCache(new IDBFactory()),'A'),b=await controller(backend,createWorkspaceCache(new IDBFactory()),'B');
 try{
  a.setState(s=>workspaceReducer(s,{type:'CREATE_TASK',id:'from-a'}));a.setState(s=>edit(s,'created in A'));
  b.setState(s=>workspaceReducer(s,{type:'CREATE_TASK',id:'from-b'}));b.setState(s=>edit(s,'created in B'));
  await settle(a,b);assert.equal(a.status,'synced');assert.equal(b.status,'synced');assert.equal(a.state.tasks.length,3);assert.equal(b.state.tasks.length,3);assert.ok(equal(a.state,b.state));
  const puts=backend.puts();await settle(a,b);assert.equal(backend.puts(),puts,'collection ordering must not cause upload ping-pong');
  a.setState(s=>workspaceReducer(s,{type:'EDIT_DRAFT',taskId:'one',patch:{mode:'advanced'}}));await settle(a,b);
  assert.equal(b.state.tasks.find(t=>t.id==='one').branches.png.draft.mode,'advanced');assert.equal(b.state.selectedTaskId,'from-b');
 }finally{a.dispose();b.dispose();}
});


test('a late server acceptance keeps the admitted run visible after a competing tab submission',()=>{
 const base=edit(newWorkspace('one'),'requirements');
 const start=id=>workspaceReducer(base,{type:'BEGIN',runId:id,execution:{version:1,simulation:true}});
 let merged=mergeWorkspaces(base,start('first'),start('second')).state;assert.equal(merged.tasks[0].activeRunId,'second');
 merged=workspaceReducer(merged,{type:'EXECUTION',runId:'first',execution:{jobId:'server-accepted'}});
 merged=workspaceReducer(merged,{type:'ACCEPT',runId:'first'});assert.equal(merged.tasks[0].activeRunId,'first');assert.equal(merged.tasks[0].runs.find(r=>r.id==='first').accepted,true);
 merged=workspaceReducer(merged,{type:'FINISH',runId:'second',error:'not dispatched'});assert.equal(merged.tasks[0].activeRunId,'first');assert.equal(merged.tasks[0].runs.find(r=>r.id==='second').status,'failed');
 const next=mergeWorkspaces(base,merged,start('second'));assert.equal(next.state.tasks[0].activeRunId,'first');assert.equal(next.conflicts,0);
});


test('acceptance clears only submitted input, not a concurrently prepared next draft',()=>{
 let base=edit(newWorkspace('one'),'submitted requirements');base=workspaceReducer(base,{type:'BEGIN',runId:'run',execution:{version:1,simulation:true}});
 const local=edit(base,'next operation typed while acceptance is in flight'),remote=workspaceReducer(base,{type:'ACCEPT',runId:'run'});
 for(const [a,b] of [[local,remote],[remote,local]]){const merged=mergeWorkspaces(base,a,b);assert.equal(merged.conflicts,0);assert.equal(currentDraft(merged.state).text,'next operation typed while acceptance is in flight');assert.equal(merged.state.tasks[0].runs[0].accepted,true);}
 const renamed=workspaceReducer(remote,{type:'RENAME',title:'new name'}),observed=workspaceReducer(remote,{type:'EXECUTION',runId:'run',stage:'rendering'});assert.equal(currentDraft(mergeWorkspaces(base,renamed,observed).state).text,'','two acceptance observations do not resurrect submitted text');
});
