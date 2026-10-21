import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {SvgTaskAutosave} from '../src/workspace/svgTaskAutosave.js';
import {readSvgDraft,saveSvgDraft,svgDraftKey,purgeTaskSvgDrafts} from '../src/lib/svgDrafts.js';
import {newWorkspace,workspaceReducer,locateVersion} from '../src/workspace/workspaceState.js';
window.indexedDB=indexedDB;
const sessions=[];
afterEach(()=>{for(const s of sessions){s.paused=true;s.close();}sessions.length=0;window.localStorage.clear();});
const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text>Original</text></svg>';
const edit=value=>source.replace('Original',value);
function setup(name,onSave){const s=new SvgTaskAutosave({key:svgDraftKey('https://autosave.test','owner',name,'v1'),taskId:name,versionId:'v1',svg:source,onSave});sessions.push(s);return s;}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
test('many edits form one immutable checkpoint; unchanged canvases never save',async()=>{
 const calls=[],s=setup('batch',async(svg,ids)=>calls.push({svg,...ids}));
 await s.flush();assert.equal(calls.length,0);
 s.change(edit('1'));s.change(edit('2'));s.change(edit('3'));await s.flush();
 assert.equal(calls.length,1);assert.equal(calls[0].svg,edit('3'));assert.equal(calls[0].parentId,'v1');assert.equal(s.dirty,false);
 assert.equal(await readSvgDraft(s.key),null);
 await s.flush();assert.equal(calls.length,1);
});
test('editing during an in-flight save survives closing and is saved as the next child',async()=>{
 const gate=deferred(),started=deferred(),done=deferred(),calls=[];
 const s=setup('in-flight',async(svg,ids)=>{calls.push({svg,...ids});if(calls.length===1){started.resolve();await gate.promise;}else done.resolve();});
 s.change(edit('first'));const first=s.flush();await started.promise;
 s.change(edit('last'));await s.queue;
 const backup=await readSvgDraft(s.key);assert.equal(backup.svg,edit('last'));assert.equal(backup.resumeVersionId,calls[0].versionId);
 s.close();gate.resolve();await first;await done.promise;await s.inFlight;
 assert.equal(calls.length,2);assert.equal(calls[1].svg,edit('last'));assert.equal(calls[1].parentId,calls[0].versionId);assert.equal(s.dirty,false);
});
test('failed persistence retries the same snapshot before saving newer edits',async()=>{
 const calls=[],s=setup('retry',async(svg,ids)=>{calls.push({svg,...ids});if(calls.length===1)throw Error('disk busy');});
 s.change(edit('first'));await s.flush();assert.equal(s.error,'disk busy');assert.equal((await readSvgDraft(s.key)).svg,edit('first'));
 s.change(edit('second'));await s.flush();assert.equal(calls[0].versionId,calls[1].versionId);assert.equal(calls[1].svg,edit('first'));
 await s.flush();assert.equal(calls[2].svg,edit('second'));assert.equal(calls[2].parentId,calls[1].versionId);
});
test('concurrent newer browser backup is not overwritten or retired by autosave',async()=>{
 const s=setup('race',async()=>assert.fail('conflicting local write must not be silently committed'));
 const other={key:s.key,taskId:s.taskId,candidateId:'v1',writer:'other-tab',revision:12,baseRevision:0,svg:edit('other tab')};
 await saveSvgDraft(other);s.change(edit('my tab'));await s.flush();
 assert.match(s.error,/另一个页面/);assert.equal((await readSvgDraft(s.key)).svg,other.svg);
});
test('deleted tasks cannot be resurrected by a late autosave',async()=>{
 const s=setup('deleted',async()=>assert.fail('purged backup cannot commit'));
 s.change(edit('late'));await s.queue;await purgeTaskSvgDrafts('https://autosave.test','owner',[s.taskId]);await s.flush();
 assert.match(s.error,/删除/);assert.equal(await readSvgDraft(s.key),null);
});
test('following a saved SVG remembers the edit without moving the active task or PNG path',()=>{
 let state=newWorkspace('a');const send=action=>{state=workspaceReducer(state,action);};
 send({type:'SET_PATH',path:'svg'});send({type:'SAVE_SVG',taskId:'a',parentId:null,versionId:'v1',runId:'r1',url:'data:image/svg+xml,'+encodeURIComponent(source)});
 send({type:'SET_PATH',path:'png'});send({type:'CREATE_TASK',id:'b'});
 send({type:'SAVE_SVG',taskId:'a',parentId:'v1',versionId:'v2',runId:'r2',select:false,url:'data:image/svg+xml,'+encodeURIComponent(edit('saved'))});
 send({type:'FOLLOW_SVG_SAVE',taskId:'a',parentId:'v1',versionId:'v2'});
 assert.equal(state.selectedTaskId,'b');const a=state.tasks.find(t=>t.id==='a');assert.equal(a.path,'png');assert.equal(a.branches.svg.versionId,'v2');assert.equal(locateVersion(a,'v1').url,'data:image/svg+xml,'+encodeURIComponent(source));
 send({type:'VIEW',taskId:'a',path:'svg',versionId:'v1'});send({type:'FOLLOW_SVG_SAVE',taskId:'a',parentId:'v2',versionId:'v3'});
 assert.equal(state.tasks.find(t=>t.id==='a').branches.svg.versionId,'v1');
 send({type:'SELECT_TASK',id:'a'});send({type:'SET_PATH',path:'svg'});
 // A task explicitly left on PNG still remembers the chosen historical SVG;
 // an automatic background completion never forces a different creation path.
 assert.equal(state.selectedTaskId,'a');assert.equal(state.tasks.length,2);
});
