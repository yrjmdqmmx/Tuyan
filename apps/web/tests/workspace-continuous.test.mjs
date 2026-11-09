import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorkspace,workspaceReducer,currentTask,currentBranch,currentDraft,selectedVersion,refinementTarget,submitIssue} from '../src/workspace/workspaceState.js';
import {prepareWorkspaceInput} from '../src/workspace/workspaceSubmission.js';
const url='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><text>synthetic</text></svg>');
function harness(path='svg') {
 let state=newWorkspace('continuous');
 const send=(type,props={})=>{state=workspaceReducer(state,{type,...props});return state;};
 send('SET_PATH',{path});
 const round=(id,source=null)=>{
  send('EDIT_DRAFT',{patch:{text:'instruction '+id}});send('BEGIN',{runId:id});
  const run=currentTask(state).runs.at(-1);assert.equal(run.parentId,source);assert.equal(run.kind,source?'refine':'generate');
  send('ACCEPT',{runId:id});send('RESULT',{runId:id,candidateId:'candidate',version:{id:id+'-v',format:path,url}});send('FINISH',{runId:id});
 };
 return {send,round,get state(){return state;}};
}
test('PNG and SVG continue multiple rounds automatically, preserving originals and ancestry',()=>{
 for(const path of ['png','svg']) {
  const h=harness(path);h.round('first');const original=structuredClone(selectedVersion(h.state));
  assert.equal(refinementTarget(h.state).id,'first-v');assert.equal(currentDraft(h.state).text,'');
  h.round('second','first-v');h.round('third','second-v');
  assert.equal(h.state.tasks.length,1);assert.equal(currentBranch(h.state).groups.length,1);
  const versions=currentBranch(h.state).groups[0].candidates[0].versions;
  assert.equal(versions.length,3);assert.equal(versions[0].url,original.url);assert.equal(versions[2].parentId,'second-v');
  h.send('VIEW',{versionId:'first-v'});h.round('fork','first-v');
  assert.equal(selectedVersion(h.state).parentId,'first-v');assert.equal(currentTask(h.state).runs[0].input.text,'instruction first');
 }
});
test('next-round typing survives acceptance and follows the new result; failure retains input for retry',()=>{
 const h=harness();h.round('first');h.send('EDIT_DRAFT',{patch:{text:'second'}});h.send('BEGIN',{runId:'second'});h.send('ACCEPT',{runId:'second'});
 h.send('EDIT_DRAFT',{patch:{text:'already typing third'}});h.send('RESULT',{runId:'second',version:{id:'second-v',format:'svg',url}});h.send('FINISH',{runId:'second'});
 assert.equal(currentDraft(h.state).text,'already typing third');assert.equal(refinementTarget(h.state).id,'second-v');
 h.send('BEGIN',{runId:'third'});h.send('ACCEPT',{runId:'third'});h.send('FINISH',{runId:'third',error:'synthetic failure'});
 assert.equal(currentDraft(h.state).text,'already typing third');assert.equal(selectedVersion(h.state).id,'second-v');
});
test('legacy workspaces default to the visible source without discarding earlier drafts or source masks',()=>{
 const h=harness('png');h.round('first');const b=currentBranch(h.state);
 b.refinements['first-v'].text='legacy editing';b.targetId=null;
 assert.equal(currentDraft(h.state).text,'legacy editing');assert.equal(refinementTarget(h.state).id,'first-v');
 h.send('EDIT_DRAFT',{patch:{settings:{...currentDraft(h.state).settings,simple:{...currentDraft(h.state).settings.simple,refineMask:{sourceId:'first-v'}}}}});
 h.round('next','first-v');assert.equal(currentDraft(h.state).settings.simple.refineMask,undefined);
 assert.equal(currentBranch(h.state).refinements['first-v'].settings.simple.refineMask.sourceId,'first-v');
});
test('submission drains manual SVG saving before freezing the latest source and never sends stale canvas bytes',async()=>{
 const h=harness();h.round('first');h.send('EDIT_DRAFT',{patch:{text:'AI instruction after manual edit'}});
 await prepareWorkspaceInput({getState:()=>h.state,flushSvg:async()=>{
  h.send('SAVE_SVG',{parentId:'first-v',versionId:'manual-v',runId:'manual',select:false,url:url+'edited'});
  h.send('FOLLOW_SVG_SAVE',{parentId:'first-v',versionId:'manual-v'});
 },readFile:async()=>assert.fail('no originals')});
 h.send('BEGIN',{runId:'ai'});assert.equal(currentTask(h.state).runs.at(-1).parentId,'manual-v');assert.equal(currentTask(h.state).runs.at(-1).input.text,'AI instruction after manual edit');
 assert.equal(currentDraft(h.state).text,'AI instruction after manual edit');
});
test('source changes, account changes, unavailable images and failed local saves prevent AI dispatch',async()=>{
 for(const change of ['task','version','text','account','save']) {
  const h=harness();h.round('first');h.round('second','first-v');h.send('EDIT_DRAFT',{patch:{text:'pending'}});
  await assert.rejects(prepareWorkspaceInput({getState:()=>h.state,isCurrent:()=>change!=='account',readFile:async()=>{},flushSvg:async()=>{
   if(change==='task')h.send('CREATE_TASK',{id:'other'});
   if(change==='version')h.send('VIEW',{versionId:'first-v'});
   if(change==='text')h.send('EDIT_DRAFT',{patch:{text:'changed'}});
   if(change==='save')throw Error('save failed');
  }}));assert.equal(currentTask(h.state).activeRunId,null);
 }
 const h=harness();h.round('first');h.send('EDIT_DRAFT',{patch:{text:'edit expired image'}});
 currentBranch(h.state).groups[0].candidates[0].versions[0].loadError='图片已过期';
 assert.equal(submitIssue(h.state),'图片已过期');h.send('BEGIN',{runId:'never'});assert.equal(currentTask(h.state).runs.length,1);
});
test('returning to a path with first results automatically selects its source without leaving the task',()=>{
 const h=harness('png');h.send('EDIT_DRAFT',{patch:{text:'first'}});h.send('BEGIN',{runId:'first'});h.send('ACCEPT',{runId:'first'});h.send('SET_PATH',{path:'svg'});
 h.send('RESULT',{runId:'first',candidateId:'a',version:{id:'png-result',format:'png',url:'data:image/png;base64,AA=='}});h.send('FINISH',{runId:'first'});
 assert.equal(currentTask(h.state).path,'svg');h.send('SET_PATH',{path:'png'});assert.equal(refinementTarget(h.state).id,'png-result');
 h.send('EDIT_DRAFT',{patch:{text:'adjust'}});h.send('BEGIN',{runId:'next'});assert.equal(currentTask(h.state).runs.at(-1).parentId,'png-result');
});
test('restoring initial requirements writes into the visible composer and never overwrites a newer instruction',()=>{
 const h=harness();h.round('first');h.send('RESTORE_RUN',{runId:'first'});assert.equal(currentDraft(h.state).text,'instruction first');assert.equal(refinementTarget(h.state).id,'first-v');
 h.send('EDIT_DRAFT',{patch:{text:'my new instruction'}});h.send('RESTORE_RUN',{runId:'first'});assert.equal(currentDraft(h.state).text,'my new instruction');
});
