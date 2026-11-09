import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { newWorkspace, workspaceReducer, isFormalTask } from '../src/workspace/workspaceState.js';
import { cleanWorkspace } from '../../../packages/api/src/workspace-sync.mjs';

test('real sync hook preserves account drafts through a transient history timeout and retry recovery', async () => {
  const originalFetch=globalThis.fetch,originalIndexed=globalThis.indexedDB,originalStorage=globalThis.localStorage,originalSession=globalThis.sessionStorage;
  globalThis.indexedDB=new IDBFactory();
  globalThis.localStorage=window.localStorage;globalThis.sessionStorage=window.sessionStorage;
  const {default:useWorkspaceSync}=await import('../src/workspace/useWorkspaceSync.js');
  let remote=cleanWorkspace(workspaceReducer(newWorkspace('saved-draft'),{type:'EDIT_DRAFT',patch:{text:'PRESERVE ACCOUNT DRAFT'}})),revision=1,historyCalls=0;
  const methods=[];
  globalThis.fetch=async(url,options={})=>{
    methods.push([String(url),options.method||'GET']);
    assert.equal(options.headers['X-Workspace-Account'],'history-hook-owner');
    if(new URL(url).pathname.includes('/history')){historyCalls++;if(historyCalls===1)throw Object.assign(Error('signal timed out'),{name:'TimeoutError'});return Response.json({jobs:[],nextOffset:null});}
    assert.match(String(url),/\/api\/workspace(?:\?revision=\d+)?$/);
    if(options.method==='PUT'){const data=JSON.parse(options.body);assert.equal(data.revision,revision);remote=data.state;return Response.json({revision:++revision});}
    return Response.json({state:remote,revision});
  };
  let hook;
  try {
    hook=renderHook(()=>useWorkspaceSync('history-hook-owner','https://history-hook.example.test'));
    await waitFor(()=>assert.equal(hook.result.current.status,'synced',hook.result.current.error),{timeout:3000});
    assert.equal(historyCalls,1);assert.equal(hook.result.current.historyIssue,'');
    assert.match(hook.result.current.historyStatus,/超时.*自动重试/);
    assert.equal(hook.result.current.state.tasks.find(t=>t.id==='saved-draft').branches.png.draft.text,'PRESERVE ACCOUNT DRAFT');
    await act(async()=>{await hook.result.current.loadHistory();});
    assert.equal(historyCalls,2);assert.equal(hook.result.current.historyIssue,'');assert.match(hook.result.current.historyStatus,/历史已更新/);
    act(()=>hook.result.current.setState(s=>workspaceReducer(s,{type:'CREATE_TASK'})));
    assert.equal(hook.result.current.state.selectedTaskId,'saved-draft');
    assert.equal(hook.result.current.state.tasks.filter(isFormalTask).length,0);
    await act(async()=>{await hook.result.current.flush();});
    assert.ok(methods.every(([url,method])=>url.includes('/api/workspace')&&['GET','PUT'].includes(method)));
  } finally {hook?.unmount();cleanup();globalThis.fetch=originalFetch;globalThis.indexedDB=originalIndexed;globalThis.localStorage=originalStorage;globalThis.sessionStorage=originalSession;}
});
