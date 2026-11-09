import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {newWorkspace,newTask} from '../../../packages/api/src/workspace-defaults.mjs';
import {permanentlyRemoveTask} from '../../../packages/api/src/workspace-deletion.mjs';
import {mergeWorkspaces,createWorkspaceCache,WorkspaceSyncController} from '../src/workspace/workspaceSync.js';
import {mergeAccountHistory} from '../../../packages/api/src/workspace-history-merge.mjs';
import {cleanWorkspace} from '../../../packages/api/src/workspace-sync.mjs';
import {purgeTaskSvgDrafts,saveSvgDraft,readSvgDraft,journalDraft,svgDraftKey} from '../src/lib/svgDrafts.js';
const initial=()=>{const s=newWorkspace('remove');s.tasks[0].branches.png.draft.text='SECRET-DRAFT';return s;};
test('permanent deletion wins over offline edits, conflicts and restore; selected last task becomes empty',()=>{
 const base=initial(),remote=permanentlyRemoveTask(base,'remove'),local=structuredClone(base);local.tasks[0].branches.png.draft.text+=' offline';
 local.tasks.push({...structuredClone(local.tasks[0]),id:'copy',syncConflict:{taskId:'remove',fields:['text']}});
 for(const result of [mergeWorkspaces(base,local,remote),mergeWorkspaces(base,remote,local),mergeWorkspaces(null,local,remote)]){
  assert.equal(result.conflicts,0);assert.doesNotMatch(JSON.stringify(result.state),/SECRET-DRAFT|offline/);assert.equal(result.state.tasks.length,1);assert.ok(result.state.tasks.some(t=>t.id===result.state.selectedTaskId));cleanWorkspace(result.state);
 }
 assert.equal(permanentlyRemoveTask(remote,'remove'),remote);
 assert.equal(mergeAccountHistory({...remote,purgedTasks:[{id:'remove',jobIds:['gone']}]},[{id:'gone',createdAt:1}]).tasks.length,1);
});
test('all per-tab recovery states and bases are scrubbed atomically and late backup writes remain scrubbed',async()=>{
 const cache=createWorkspaceCache(new IDBFactory()),state=initial(),value={state,base:state,cacheBase:state,revision:1};
 await cache.write('a',0,value);await cache.backup('a:tab:offline',value);await cache.write('other-account',0,value);
 const deleted=permanentlyRemoveTask(state,'remove');await cache.write('a',1,{...value,state:deleted});
 assert.doesNotMatch(JSON.stringify(await cache.read('a:tab:offline')),/SECRET-DRAFT/);
 await cache.backup('a:tab:late',value);assert.doesNotMatch(JSON.stringify(await cache.read('a:tab:late')),/SECRET-DRAFT/);
 assert.match(JSON.stringify(await cache.read('other-account')),/SECRET-DRAFT/);
 const controller=new WorkspaceSyncController({cache,key:'a',restoreId:'late'});await controller.init();assert.doesNotMatch(JSON.stringify(controller.state),/SECRET-DRAFT/);controller.dispose();
});
test('SVG recovery journals and database drafts disappear, including late editor saves',async()=>{
 window.localStorage.clear();Object.defineProperty(window,'indexedDB',{value:new IDBFactory(),configurable:true});
 const draft={key:svgDraftKey('fixture','A','remove','v1'),taskId:'remove',writer:'tab',revision:1,baseRevision:0,svg:'SECRET-SVG'};
 await saveSvgDraft(draft);journalDraft(draft);assert.ok(await readSvgDraft(draft.key));
 const keep={...draft,key:svgDraftKey('fixture','B','remove','v1')};await saveSvgDraft(keep);
 await purgeTaskSvgDrafts('fixture','A',['remove']);assert.equal(await readSvgDraft(draft.key),null);assert.equal(journalDraft(draft),false);await assert.rejects(saveSvgDraft(draft));assert.equal((await readSvgDraft(keep.key)).svg,'SECRET-SVG');
});

test('local original cleanup preserves another task and account sharing a file',async()=>{
 const {purgeLocalTaskAssets}=await import('../src/workspace/workspaceDeletion.js');
 const {putBrowserRecord,getBrowserRecord}=await import('../src/lib/browserMaterials.js');
 const factory=new IDBFactory();Object.defineProperty(globalThis,'indexedDB',{value:factory,configurable:true});Object.defineProperty(window,'indexedDB',{value:factory,configurable:true});window.localStorage.clear();
 const cache=createWorkspaceCache(factory),state=initial(),other=newWorkspace('other');state.tasks[0].branches.png.draft.attachments=[{id:'private'},{id:'shared'}];other.tasks[0].branches.png.draft.attachments=[{id:'shared'}];
 await cache.write('account-A',0,{state,base:state,revision:0});await cache.write('account-B',0,{state:other,base:other,revision:0});
 for(const id of ['private','shared'])await putBrowserRecord({scope:'workspace-ui-preview:local',id,kind:'file',bytes:new Uint8Array([1,2,3])});
 const deleted=permanentlyRemoveTask(state,'remove');await purgeLocalTaskAssets({state:deleted,key:'account-A',cache,baseUrl:'fixture',userId:'A',storage:window.localStorage});
 assert.equal(await getBrowserRecord('workspace-ui-preview:local','private'),undefined);assert.ok(await getBrowserRecord('workspace-ui-preview:local','shared'));assert.deepEqual((await cache.read('account-B')).state,other);
});

test('deleting a duplicate task does not suppress history refresh for the retained original',()=>{
 const state=initial();state.tasks[0].runs=[{history:{jobId:'shared-job'},status:'succeeded',input:state.tasks[0].branches.png.draft}];
 const other=structuredClone(state.tasks[0]);other.id='retained';state.tasks.push(other);
 const deleted=permanentlyRemoveTask(state,'remove');assert.deepEqual(deleted.purgedTasks[0].jobIds,[]);assert.equal(deleted.tasks[0].id,'retained');
});
