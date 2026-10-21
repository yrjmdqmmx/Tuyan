import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { File } from 'node:buffer';
import { cleanWorkspace } from '../../../packages/api/src/workspace-sync.mjs';
import { newWorkspace, workspaceReducer, currentDraft, taskHasContent } from '../src/workspace/workspaceState.js';
import { createWorkspaceCache, WorkspaceSyncController, createWorkspaceClient, mergeWorkspaces, readLegacy, ORIGINAL_SCOPE, versionsOf } from '../src/workspace/workspaceSync.js';
import { saveBrowserMaterial, browserFile } from '../src/lib/browserMaterials.js';
import { restoreWorkspaceOriginal } from '../src/workspace/workspaceMaterials.js';
const draft = (state,text) => workspaceReducer(state,{type:'EDIT_DRAFT',patch:{text}});
const ready = async (client, cache=createWorkspaceCache(new IDBFactory()), key='account-a') => {const c=new WorkspaceSyncController({cache,key,client,recoveryId:'test-tab'});await c.init();clearTimeout(c.timer);return c;};
function server() {
 let state=null,revision=0,fail=false;
 return {get:async()=>{if(fail)throw Error('offline');return {state:structuredClone(state),revision};},hydrate:async s=>structuredClone(s),wire:async s=>structuredClone(s),put:async(r,s)=>{if(r!==revision)throw Object.assign(Error('WORKSPACE_CONFLICT'),{status:409});state=structuredClone(s);return {revision:++revision};},offline:v=>{fail=v;}};
}
test('legacy migration reads without changing original bytes; malformed data is never replaced',()=>{
 const s=draft(newWorkspace('old'),'已有研究草稿');const raw=JSON.stringify({revision:8,state:s});let writes=0;
 const storage={getItem:()=>raw,setItem:()=>writes++};assert.deepEqual(readLegacy(storage),s);assert.equal(writes,0);
 assert.throws(()=>readLegacy({getItem:()=>'{bad json'}));
});
test('same-task conflicts preserve both complete histories; unrelated tasks merge without copies',()=>{
 const base=draft(newWorkspace('t'),'base'),local=draft(base,'device A'),remote=draft(base,'device B');
 const merged=mergeWorkspaces(base,local,remote,()=> 'copy');assert.equal(merged.conflicts,1);assert.equal(merged.state.selectedTaskId,'t');
 assert.equal(merged.state.tasks.find(t=>t.id==='copy').branches.png.draft.text,'device A');assert.equal(merged.state.tasks.find(t=>t.id==='t').branches.png.draft.text,'device B');
 const other=workspaceReducer(remote,{type:'CREATE_TASK',id:'other'});const result=mergeWorkspaces(base,base,other);assert.equal(result.conflicts,0);assert.equal(result.state.tasks.length,2);
});
test('two isolated devices sync drafts/settings, handle offline conflict and retain queued state across reload',async()=>{
 const remote=server(),cacheA=createWorkspaceCache(new IDBFactory()),a=await ready(remote,cacheA);
 try {
  a.setState(s=>draft(s,'first'));await a.sync();
  const b=await ready(remote);try {
   await b.sync();assert.ok(b.state.tasks.some(t=>t.branches.png.draft.text==='first'));
   b.setState(s=>({...s,selectedTaskId:a.state.selectedTaskId}));
   remote.offline(true);a.setState(s=>draft(s,'offline A'));await a.sync();assert.equal(a.status,'error');await a.flush();a.dispose();
   const restored=await ready(remote,cacheA);try {
    assert.equal(currentDraft(restored.state).text,'offline A');remote.offline(false);
    b.setState(s=>draft(s,'changed B'));await b.sync();await restored.sync();assert.match(restored.notice,/冲突副本/);
    assert.ok(restored.state.tasks.some(t=>t.branches.png.draft.text==='offline A'));assert.ok(restored.state.tasks.some(t=>t.branches.png.draft.text==='changed B'));
   } finally {restored.dispose();}
  } finally {b.dispose();}
 } finally {a.dispose();}
});
test('local CAS blocks stale tabs and quota failures never claim synced or permit unsafe exit',async()=>{
 const cache=createWorkspaceCache(new IDBFactory()),s=draft(newWorkspace('t'),'first');
 await cache.write('a',0,{state:s});await assert.rejects(cache.write('a',0,{state:newWorkspace()}),/另一标签页/);
 const c=await ready(null,{read:async()=>null,write:async()=>{throw Error('quota');}},'guest');
 try {assert.equal(c.blocked,true);assert.equal(c.status,'error');await assert.rejects(c.flush());}finally{c.dispose();}
});
test('account caches and pending responses cannot cross users or revive a disposed workspace',async()=>{
 const cache=createWorkspaceCache(new IDBFactory());const a=await ready(server(),cache,'a');a.setState(s=>draft(s,'private A'));await a.flush();a.dispose();
 const b=await ready(server(),cache,'b');assert.equal(currentDraft(b.state).text,'');b.dispose();
 let finish;let puts=0;const c=await ready({get:()=>new Promise(r=>finish=r),hydrate:async()=>null,put:async()=>puts++,wire:async()=>({})});
 const running=c.sync();await c.queue;while(!finish)await new Promise(r=>setTimeout(r,0));c.dispose();finish({state:null,revision:0});await running;assert.equal(puts,0);
});
test('typing during slow asset preparation is not overwritten by the completed upload',async()=>{
 const remote=server();let release;const original=remote.wire;remote.wire=s=>new Promise(r=>release=()=>r(original(s)));
 const c=await ready(remote);try {
  c.setState(s=>draft(s,'submitted snapshot'));const syncing=c.sync();while(!release)await new Promise(r=>setTimeout(r,0));
  c.setState(s=>draft(s,'newer typing'));release();await syncing;assert.equal(currentDraft(c.state).text,'newer typing');assert.equal(c.status,'pending');
 }finally{c.dispose();}
});
test('transport uploads only result assets and allowlisted metadata, preserving both PNG/SVG formats',async()=>{
 let state=draft(newWorkspace('t'),'research');const secret='do-not-sync-secret',bytes='original-file-bytes';
 currentDraft(state).attachments=[{id:'file',clientFileId:'file',filename:'a.pdf',format:'pdf',size:3,sha256:'a'.repeat(64),purpose:'research',status:'local',bytes,apiKey:secret}];
 state.apiKey=secret;state.tasks[0].branches.png.draft.settings.simple.apiKey=secret;
 const reduce=(type,rest={})=>{state=workspaceReducer(state,{type,...rest});};
 for (const path of ['png','svg']) {
  reduce('SET_PATH',{path});reduce('EDIT_DRAFT',{patch:{text:'figure'}});reduce('BEGIN',{runId:path});reduce('ACCEPT',{runId:path});
  reduce('RESULT',{runId:path,candidateId:path,label:'A',version:{id:path,format:path,url:path==='png'?'data:image/png;base64,iVBORw0KGgo=':'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}});reduce('FINISH',{runId:path});
 }
 const requests=[];const client=createWorkspaceClient({userId:'A',baseUrl:'http://local.test',fetcher:async(url,init)=>{requests.push({url,init});return Response.json({resultId:(requests.length===1?'a':'b').repeat(64)});}});
 const wire=await client.wire(state),json=JSON.stringify(wire);assert.equal(requests.length,2);assert.ok(!json.includes(secret));assert.ok(!json.includes(bytes));assert.ok(!json.includes('data:image'));assert.ok(!json.includes('browserSaved'));
 assert.deepEqual(versionsOf(wire).map(v=>v.format),['png','svg']);assert.equal(requests[0].init.headers['X-Workspace-Account'],'A');assert.deepEqual(cleanWorkspace(wire),wire);
});
test('originals stay device-local, only exact content can repair a missing reference',async()=>{
 globalThis.indexedDB=new IDBFactory();const file=new File(['private source'],'evidence.txt',{type:'text/plain'});const ref=await saveBrowserMaterial(ORIGINAL_SCOPE,file);
 globalThis.indexedDB=new IDBFactory();await assert.rejects(browserFile(ORIGINAL_SCOPE,ref),/当前浏览器没有/);
 await assert.rejects(restoreWorkspaceOriginal(ref,new File(['changed source'],'evidence.txt')),/不一致/);
 await restoreWorkspaceOriginal(ref,file);assert.equal(await(await browserFile(ORIGINAL_SCOPE,ref)).text(),'private source');
});
test('JSON key ordering and preview navigation do not produce conflict copies or new writes',async()=>{
 const base=draft(newWorkspace('t'),'same');
 const remote=structuredClone(base);remote.tasks[0]={branches:remote.tasks[0].branches,...remote.tasks[0]};
 remote.tasks[0].path='svg';remote.tasks[0].branches.svg.navRevision=7;
 const local=structuredClone(base);local.tasks[0].branches.png.navRevision=3;
 const result=mergeWorkspaces(base,local,remote);assert.equal(result.conflicts,0);assert.equal(result.state.tasks.length,1);assert.equal(result.state.tasks[0].path,'png');
 const backend=server();const c=await ready(backend);try{c.setState(()=>base);await c.sync();const rev=c.revision;c.setState(s=>workspaceReducer(s,{type:'SET_PATH',path:'svg'}));await c.sync();assert.equal(c.revision,rev);}finally{c.dispose();}
});
test('real edit arriving during a remote read preserves newer content and immutable input snapshots',async()=>{
 const backend=server();const c=await ready(backend);try{
  c.setState(s=>draft(s,'baseline'));await c.sync();const original=backend.get;let release;
  backend.get=()=>new Promise(r=>release=async()=>r(await original()));const reading=c.sync();while(!release)await new Promise(r=>setTimeout(r,0));
  c.setState(s=>draft(s,'edited while reading'));await release();await reading;assert.equal(currentDraft(c.state).text,'edited while reading');assert.equal(c.status,'synced');
 }finally{c.dispose();}
});
test('identical cache snapshots are idempotent across tabs while changed drafts still conflict',async()=>{
 const cache=createWorkspaceCache(new IDBFactory());const value={state:newWorkspace('t'),base:null,revision:0,importedGuest:false};
 assert.equal(await cache.write('guest',0,value),1);assert.equal(await cache.write('guest',0,structuredClone(value)),1);
 await assert.rejects(cache.write('guest',0,{...value,state:draft(value.state,'new content')}),/另一标签页/);
});

test('different tab view selections and refreshed signed URLs do not conflict with unchanged content',async()=>{
 const cache=createWorkspaceCache(new IDBFactory()),state=newWorkspace('t');
 state.tasks[0].branches.png.groups=[{id:'g',candidates:[{id:'c',versions:[{id:'v',history:{source:'production',jobId:'j',index:0},url:'https://storage.test/old'}]}]}];
 const value={state,base:structuredClone(state),revision:1,importedGuest:false};await cache.write('account',0,value);
 const other=structuredClone(value);other.state.tasks[0].path='svg';other.state.tasks[0].branches.png.navRevision=10;
 other.state.tasks[0].branches.png.groups[0].candidates[0].versions[0].url='https://storage.test/renewed';
 assert.equal(await cache.write('account',0,other),1);
 assert.equal(await cache.write('account',1,other),1);
 assert.equal((await cache.read('account')).state.tasks[0].path,'png','shared cache does not publish tab navigation');
 await assert.rejects(cache.write('account',0,{...other,state:draft(other.state,'actual concurrent text')}),/另一标签页/);
});

test('idle background checks read revisions without status churn, hydration or storage writes',async()=>{
 const backend=server(),cache=createWorkspaceCache(new IDBFactory()),c=await ready(backend,cache);
 try {
  await c.sync();clearTimeout(c.timer);
  const events=[];c.notify=controller=>events.push(controller.status);
  const originalGet=backend.get;let reads=0,hydrates=0,writes=0,puts=0;
  backend.get=async()=>{reads++;return originalGet();};backend.hydrate=async s=>{hydrates++;return structuredClone(s);};
  backend.put=async()=>{puts++;throw Error('unexpected write');};
  const originalWrite=cache.write;cache.write=(...args)=>{writes++;return originalWrite(...args);};
  await c.sync({background:true});await c.sync({background:true});
  assert.equal(reads,2);assert.equal(hydrates,0);assert.equal(writes,0);assert.equal(puts,0);assert.deepEqual(events,[]);
  c.setState(s=>structuredClone(s));assert.deepEqual(events,[]);assert.equal(writes,0);
  c.setState(s=>workspaceReducer(s,{type:'SET_PATH',path:'svg'}));await c.queue;
  assert.equal(c.status,'synced');assert.ok(events.every(s=>s==='synced'));assert.equal(puts,0);
 }finally{c.dispose();}
});

test('quiet polling still receives remote changes and reports outages and recovery',async()=>{
 const backend=server(),a=await ready(backend),b=await ready(backend);
 try {
  await a.sync();await b.sync();b.setState(s=>draft(s,'another device'));await b.sync();
  await a.sync({background:true});assert.equal(currentDraft(a.state).text,'another device');assert.equal(a.status,'synced');
  backend.offline(true);await a.sync({background:true});assert.equal(a.status,'error');
  await a.flush();assert.equal(a.status,'error','saving a local cache must not report network recovery');
  backend.offline(false);await a.sync({background:true});assert.equal(a.status,'synced');
 }finally{a.dispose();b.dispose();}
});

test('an edit made during a quiet revision check is uploaded, not dropped by the no-change shortcut',async()=>{
 const backend=server(),c=await ready(backend);
 try {
  await c.sync();const original=backend.get;let release;
  backend.get=()=>new Promise(resolve=>release=async()=>resolve(await original()));
  const reading=c.sync({background:true});while(!release)await new Promise(r=>setTimeout(r,0));
  c.setState(s=>draft(s,'typed during background check'));await release();await reading;
  assert.equal(currentDraft((await original()).state).text,'typed during background check');assert.equal(c.status,'synced');
 }finally{c.dispose();}
});

test('task and path browsing stays local; real edits still upload and failures remain visible',async()=>{
 const backend=server(),cache=createWorkspaceCache(new IDBFactory()),c=await ready(backend,cache);
 try {
  c.setState(()=>draft(newWorkspace('one'),'first draft'));c.setState(s=>workspaceReducer(s,{type:'CREATE_TASK',id:'two'}));
  c.setState(s=>draft(s,'second draft'));await c.sync();clearTimeout(c.timer);
  const revision=c.revision,generation=c.generation,events=[];c.notify=value=>events.push(value.status);
  let scheduled=0;c.schedule=()=>{scheduled++;};
  const originalGet=backend.get,originalPut=backend.put;let gets=0,puts=0;
  backend.get=async()=>{gets++;return originalGet();};backend.put=async(...args)=>{puts++;return originalPut(...args);};
  for(let i=0;i<3;i++)for(const action of [{type:'SELECT_TASK',id:'one'},{type:'SET_PATH',path:'svg'},{type:'SET_PATH',path:'png'},{type:'SELECT_TASK',id:'two'}])c.setState(s=>workspaceReducer(s,action));
  await c.queue;assert.equal(scheduled,0);assert.equal(gets,0);assert.equal(puts,0);assert.equal(c.generation,generation);assert.equal(c.revision,revision);assert.ok(events.every(status=>status==='synced'));
  assert.equal((await cache.read(c.key+':tab:test-tab')).state.tasks.find(t=>t.id==='one').path,'png');
  c.setState(s=>draft(s,'second draft'));assert.equal(scheduled,0,'identical input should not create a revision');
  c.setState(s=>draft(s,'actual change'));assert.equal(scheduled,1);await c.sync();assert.equal(puts,1);assert.equal(currentDraft((await originalGet()).state).text,'actual change');
  backend.offline(true);await c.sync();assert.equal(c.status,'error');c.setState(s=>workspaceReducer(s,{type:'SELECT_TASK',id:'one'}));await c.queue;assert.equal(c.status,'error');
 }finally{c.dispose();}
});
test('local settings depth merges with unrelated remote text edits',()=>{
 const base=draft(newWorkspace('mode'),'original'),local=workspaceReducer(base,{type:'EDIT_DRAFT',patch:{mode:'advanced'}}),remote=draft(base,'remote edit');
 const result=mergeWorkspaces(base,local,remote);assert.equal(result.conflicts,0);assert.equal(currentDraft(result.state).mode,'advanced');assert.equal(currentDraft(result.state).text,'remote edit');
});

test('switching settings depth alone does not turn an empty task into a saved draft',()=>{
 const initial=newWorkspace('empty'),changed=workspaceReducer(initial,{type:'EDIT_DRAFT',patch:{mode:'advanced'}});
 assert.equal(taskHasContent(changed.tasks[0]),false);
 const next=workspaceReducer(changed,{type:'CREATE_TASK',id:'unnecessary'});assert.equal(next.tasks.length,1);assert.equal(next.selectedTaskId,'empty');
});

test('automatic SVG edits survive offline reload and sync into the same task on another device',async()=>{
 const remote=server(),cache=createWorkspaceCache(new IDBFactory()),a=await ready(remote,cache);let restored,b;
 try {
  a.setState(newWorkspace('autosave-account-task'));
  const source='<svg xmlns="http://www.w3.org/2000/svg"><text>original</text></svg>';
  a.setState(s=>workspaceReducer(s,{type:'SAVE_SVG',taskId:'autosave-account-task',versionId:'original',runId:'original-run',url:'data:image/svg+xml,'+encodeURIComponent(source)}));
  await a.sync();remote.offline(true);
  a.setState(s=>workspaceReducer(s,{type:'SAVE_SVG',taskId:'autosave-account-task',parentId:'original',versionId:'edited',runId:'edited-run',select:false,url:'data:image/svg+xml,'+encodeURIComponent(source.replace('original','edited'))}));
  a.setState(s=>workspaceReducer(s,{type:'FOLLOW_SVG_SAVE',taskId:'autosave-account-task',parentId:'original',versionId:'edited'}));
  await a.flush();await a.sync();assert.equal(a.status,'error');a.dispose();
  restored=await ready(remote,cache);assert.equal(restored.state.tasks.find(t=>t.id==='autosave-account-task').branches.svg.versionId,'edited');
  remote.offline(false);await restored.sync();assert.equal(restored.status,'synced');
  b=await ready(remote);await b.sync();const task=b.state.tasks.find(t=>t.id==='autosave-account-task');
  const versions=task.branches.svg.groups[0].candidates[0].versions;assert.equal(versions.length,2);assert.equal(versions[0].id,'original');assert.equal(versions[1].id,'edited');assert.equal(versions[1].parentId,'original');assert.equal(b.state.tasks.filter(t=>t.id.startsWith('autosave-account-task')).length,1);
 }finally{a.dispose();restored?.dispose();b?.dispose();}
});
