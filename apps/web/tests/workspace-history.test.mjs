import test from 'node:test';
import assert from 'node:assert/strict';
import {historyJob} from '../../../packages/api/src/workspace-history.mjs';
import {cleanWorkspace,resultReferences} from '../../../packages/api/src/workspace-sync.mjs';
import {mergeAccountHistory} from '../src/workspace/workspaceHistory.js';
import {newWorkspace,workspaceReducer} from '../src/workspace/workspaceState.js';
import {createWorkspaceClient,versionsOf} from '../src/workspace/workspaceSync.js';
const job=(id,extra={})=>historyJob({id,userId:'owner',status:'completed',methodContent:'method',caption:'caption',createdAt:'2026-10-17T10:00:00Z',aspectRatio:'16:9',numCandidates:1,maxCriticRounds:1,resultImages:[{url:'https://assets.example.test/result.png',filename:'result.png'}],...extra},'production','owner');
test('history rejects other accounts and excludes keys, originals, logs and custom routing secrets',()=>{
 assert.throws(()=>historyJob({id:'x',userId:'other'},'production','owner'),/OWNER/);
 const value=job('one',{apiKeys:{secret:'do-not-copy'},referenceImages:[{url:'https://private.test/original'}],logs:['do-not-copy'],modelRoutes:{main:{accessProvider:'custom',modelId:'m',custom:{apiKey:'do-not-copy'}}}});
 assert.doesNotMatch(JSON.stringify(value),/do-not-copy|private.test/);assert.equal(value.models.main.modelId,'m');
});
test('history appends without selecting or rewriting drafts, deduplicates and groups only explicit source relationships',()=>{
 const old=workspaceReducer(newWorkspace('draft'),{type:'EDIT_DRAFT',patch:{text:'DO NOT CHANGE'}});
 const jobs=[job('a'),job('b',{sourceTaskId:'a',jobType:'refine'}),job('c')];const first=mergeAccountHistory(old,jobs);
 assert.equal(first.selectedTaskId,'draft');assert.deepEqual(first.tasks[0],old.tasks[0]);assert.equal(first.tasks.length,3);
 assert.equal(first.tasks.find(t=>t.id==='history-production-a').runs.length,2);assert.deepEqual(mergeAccountHistory(first,jobs),first);
 const clean=cleanWorkspace(first);assert.doesNotMatch(JSON.stringify(clean),/https:/);assert.deepEqual(resultReferences(clean),[]);
});
test('running historical jobs block a new run without execution credentials; completion releases the run',()=>{
 let state=mergeAccountHistory(newWorkspace('draft'),[job('a',{status:'running',resultImages:[]})]);
 const task=state.tasks.find(t=>t.id==='history-production-a');assert.equal(task.activeRunId,task.runs[0].id);assert.equal(task.runs[0].execution,undefined);
 state=mergeAccountHistory(state,[job('a')]);assert.equal(state.tasks.find(t=>t.id===task.id).activeRunId,null);assert.equal(versionsOf(state).length,1);
});
test('PNG and SVG branches preserve both formats; native workspace jobs are not duplicated',()=>{
 const state=mergeAccountHistory(newWorkspace('draft'),[job('a'),job('b',{sourceTaskId:'a',outputFormat:'svg',resultImages:[{url:'https://assets.example.test/b.svg',filename:'b.svg'}]})]);
 assert.deepEqual(versionsOf(state).map(v=>v.format),['png','svg']);assert.equal(cleanWorkspace(state).tasks.length,2);
 const native=structuredClone(job('a'));native.source='server';const existing=newWorkspace('draft');existing.tasks[0].runs=[{execution:{jobId:'a'}}];assert.equal(mergeAccountHistory(existing,[native]),existing);
});
test('native account execution identity prevents history duplication in stale and fresh tabs',()=>{
 const stale=workspaceReducer(newWorkspace('draft'),{type:'EDIT_DRAFT',patch:{text:'keep local draft'}});
 const native={...job('pending'),workspaceExecution:{taskId:'native-task',runId:'native-run'}};
 assert.equal(mergeAccountHistory(stale,[native]),stale);
 const oldHistory=mergeAccountHistory(stale,[job('pending')]);
 assert.equal(mergeAccountHistory(oldHistory,[native]),oldHistory,'already imported records and drafts are preserved');
});
test('history hydration renews URLs in one batch without downloading originals or uploading copies',async()=>{
 const source=mergeAccountHistory(newWorkspace('draft'),[job('a')]);const calls=[];
 const client=createWorkspaceClient({userId:'owner',fetcher:async(url,options)=>{calls.push([url,options.method]);return Response.json({jobs:[job('a')],nextOffset:null});}});
 const wire=await client.wire(source);assert.equal(calls.length,0);const result=await client.hydrate(wire);assert.equal(versionsOf(result)[0].url,'https://assets.example.test/result.png');assert.equal(calls.length,1);assert.match(calls[0][0],/\/history\?offset=0$/);
});
test('missing historical files preserve metadata without blocking other drafts',async()=>{
 const source=mergeAccountHistory(newWorkspace('draft'),[job('a')]);const client=createWorkspaceClient({userId:'owner',fetcher:async()=>Response.json({jobs:[],nextOffset:null})});
 const restored=await client.hydrate(await client.wire(source));assert.match(versionsOf(restored)[0].loadError,/暂不可用/);assert.equal(restored.tasks.length,2);
});

test('history result download reads only the authenticated result pointer, never a client supplied URL',async()=>{
 const {workspaceVersionDataUrl}=await import('../src/workspace/workspaceResultAsset.js');const original=globalThis.fetch;const calls=[];
 try{globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({format:'svg',base64:btoa('<svg/>')});};
 const result=await workspaceVersionDataUrl({format:'svg',url:'https://ignored.test',history:{source:'production',jobId:'safe-job',index:0}},'http://localhost:8791','owner');
 assert.match(result,/^data:image\/svg\+xml;base64,/);assert.equal(calls[0].url,'http://localhost:8791/api/workspace/history/safe-job/results/0');assert.equal(calls[0].options.headers['X-Workspace-Account'],'owner');
 await assert.rejects(workspaceVersionDataUrl({format:'png',history:{source:'production',jobId:'safe-job',index:0}},'http://localhost:8791','owner'),/格式/);
 }finally{globalThis.fetch=original;}
});

test('legacy inline SVG results are recovered but excluded from stored metadata',()=>{
 const svg='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg"/>');
 const record=job('inline',{outputFormat:'svg',resultImages:[{filename:'figure.svg',url:svg}]});
 const state=mergeAccountHistory(newWorkspace('draft'),[record]);assert.equal(versionsOf(state)[0].url,svg);assert.doesNotMatch(JSON.stringify(cleanWorkspace(state)),/data:image/);
 const invalid=job('invalid',{resultImages:[{filename:'figure.svg',url:'data:text/html,<script/>'}]});assert.equal(invalid.results[0].url,'');
});
