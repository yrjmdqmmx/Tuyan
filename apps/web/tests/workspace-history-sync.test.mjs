import test from 'node:test';
import assert from 'node:assert/strict';
import { historyJob } from '../../../packages/api/src/workspace-history.mjs';
import { cleanWorkspace } from '../../../packages/api/src/workspace-sync.mjs';
import { createHistoryReader, mergeAccountHistory, savedHistoryCount } from '../src/workspace/workspaceHistory.js';
import { WorkspaceHistorySync } from '../src/workspace/workspaceHistorySync.js';
import { createWorkspaceClient, versionsOf } from '../src/workspace/workspaceSync.js';
import { newWorkspace, workspaceReducer } from '../src/workspace/workspaceState.js';

const job = (id, extra={}) => historyJob({id,userId:'owner',status:'completed',methodContent:'saved research',caption:'caption',createdAt:'2026-10-17T10:00:00Z',resultImages:[{url:'https://assets.example.test/result.png',filename:'result.png'}],...extra},'production','owner');
const page = (jobs=[], nextOffset=null) => ({jobs,nextOffset});
const timeout = () => Object.assign(Error('signal timed out'), {name:'TimeoutError'});
function deferred() { let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; }
function fixture(read, state=mergeAccountHistory(workspaceReducer(newWorkspace('draft'),{type:'EDIT_DRAFT',patch:{text:'KEEP MY DRAFT'}}),[job('saved')])) {
  let now=1000,visible=true;const timers=new Map(),messages=[],calls=[];
  const controller={state,disposed:false,client:{history:async(...args)=>{calls.push(args);return read(...args);}},setState(update){this.state=update(this.state);}};
  const sync=new WorkspaceHistorySync({controller,notify:value=>messages.push(value),now:()=>now,canRefresh:()=>visible,setTimer:(fn,delay)=>{const id=Symbol();timers.set(id,{fn,delay});return id;},clearTimer:id=>timers.delete(id)});
  return {sync,controller,messages,calls,timers,advance:ms=>{now+=ms;},visible:value=>{visible=value;}};
}

test('history page requests coalesce across hydration and background refresh without losing drafts', async () => {
  const pending=deferred();let calls=0;
  const client=createWorkspaceClient({userId:'owner',fetcher:()=>{calls++;return pending.promise;}});
  const source=mergeAccountHistory(newWorkspace('draft'),[job('saved')]);
  const hydration=client.hydrate(cleanWorkspace(source));
  const refresh=client.history(0);
  const manual=client.history(0,{force:true});
  await Promise.resolve();assert.equal(calls,1);
  pending.resolve(Response.json(page([job('saved')])));
  const [restored]=await Promise.all([hydration,refresh,manual]);
  assert.equal(versionsOf(restored)[0].url,'https://assets.example.test/result.png');
  assert.deepEqual(restored.tasks[0],source.tasks[0]);
  await client.history(0);assert.equal(calls,1,'recent successful pages are shared');
});

test('page cooldown prevents the 5-second workspace poll from hammering a failed history endpoint', async () => {
  let now=0,calls=0;const reader=createHistoryReader(async()=>{calls++;throw timeout();},()=>now);
  for(const delay of [15000,60000,180000,300000,300000]) {
    await assert.rejects(reader.read(),/signal timed out/);const before=calls;
    for(let elapsed=5000;elapsed<delay;elapsed+=5000){now+=5000;await assert.rejects(reader.read(),/signal timed out/);assert.equal(calls,before);}
    now+=5000;
  }
  assert.equal(calls,5);
  await assert.rejects(reader.read(0,{force:true}));assert.equal(calls,6,'explicit retry can bypass the cooldown');
});

test('page caching expires and clear separates deletion/account invalidation from older in-flight reads', async () => {
  let now=0,calls=0;const old=deferred();
  const reader=createHistoryReader(()=>++calls===1?old.promise:Promise.resolve(page([job('new')])) ,()=>now);
  const first=reader.read();await Promise.resolve();reader.clear();
  await reader.read();old.resolve(page([job('old')]));await first;
  assert.equal((await reader.read()).jobs[0].id,'new');assert.equal(calls,2);
  now=30000;await reader.read();assert.equal(calls,3);
});

test('transient failures back off silently twice, warn after repeated failure, and clear after recovery', async () => {
  let failing=true;const f=fixture(()=>{if(failing)throw timeout();return page([job('saved')]);});
  const before=structuredClone(f.controller.state);
  for(const [index,delay] of [15000,60000,180000,300000].entries()) {
    await f.sync.refresh();const view=f.messages.at(-1);
    assert.doesNotMatch(view.historyStatus,/signal timed out/);
    assert.match(view.historyStatus,/已有任务和草稿已保留.*自动重试/);
    assert.equal(Boolean(view.historyIssue),index>=2);
    assert.equal([...f.timers.values()][0].delay,delay);
    assert.deepEqual(f.controller.state,before);
    await f.sync.refresh();assert.equal(f.calls.length,index+1,'early refresh does not read again');f.advance(delay);
  }
  failing=false;await f.sync.refresh();
  assert.equal(f.messages.at(-1).historyIssue,'');assert.match(f.messages.at(-1).historyStatus,/1 条执行记录/);
  assert.equal([...f.timers.values()][0].delay,300000);
  assert.deepEqual(f.controller.state,before);f.sync.dispose();assert.equal(f.timers.size,0);
});

test('manual retry, expired sessions and invalid pages surface an actionable message immediately', async () => {
  for(const [error,manual,pattern] of [[timeout(),true,/超时/],[Object.assign(Error('UNAUTHORIZED'),{status:401}),false,/重新登录/],[Object.assign(Error('ACCOUNT_CHANGED'),{status:409}),false,/账号状态已变化/],[Object.assign(Error('invalid'),{status:422}),false,/不完整/]]) {
    const f=fixture(()=>{throw error;});await f.sync.refresh({manual});assert.match(f.messages.at(-1).historyIssue,pattern);assert.doesNotMatch(f.messages.at(-1).historyIssue,/signal timed out|UNAUTHORIZED|ACCOUNT_CHANGED/);f.sync.dispose();
  }
});

test('hidden/offline pages wait for the next visible online wake and share one refresh', async () => {
  const pending=deferred(),f=fixture(()=>pending.promise);f.visible(false);f.sync.start();
  assert.equal(f.calls.length,0);assert.equal(f.timers.size,0);
  f.visible(true);f.sync.wake();f.sync.wake();assert.equal(f.calls.length,1);
  pending.resolve(page());await f.sync.inFlight;
  f.advance(300000);f.visible(false);f.sync.wake();assert.equal(f.calls.length,1);
  f.visible(true);f.sync.wake();await f.sync.inFlight;assert.equal(f.calls.length,2);f.sync.dispose();
});

test('disposing an old account ignores its late response and does not schedule another poll', async () => {
  const pending=deferred(),f=fixture(()=>pending.promise);const before=structuredClone(f.controller.state);
  const refresh=f.sync.refresh();f.sync.dispose();pending.resolve(page([job('old-account')]));await refresh;
  assert.deepEqual(f.controller.state,before);assert.deepEqual(f.messages,[]);assert.equal(f.timers.size,0);
});

test('reconnecting before the retry deadline rearms a timer paused by an offline completion', async () => {
  const pending=deferred(),f=fixture(()=>pending.promise);f.sync.start();f.visible(false);
  pending.reject(timeout());await f.sync.inFlight;assert.equal(f.timers.size,0);
  f.advance(5000);f.visible(true);f.sync.wake();
  assert.equal(f.calls.length,1,'reconnect still respects the server cooldown');
  assert.equal([...f.timers.values()][0].delay,10000,'the retry must not depend on another focus event');
  f.controller.client.history=async()=>page();f.advance(10000);[...f.timers.values()][0].fn();await f.sync.inFlight;
  assert.match(f.messages.at(-1).historyStatus,/历史已更新/);f.sync.dispose();
});

test('partially read pages remain saved and a later retry recovers without duplicates or data loss', async () => {
  let failing=true;const f=fixture(offset=>offset===0?page([job('first')],25):failing?Promise.reject(timeout()):page([job('second')]));
  const before=structuredClone(f.controller.state.tasks);await f.sync.refresh();
  assert.equal(savedHistoryCount(f.controller.state),2);for(const task of before)assert.deepEqual(f.controller.state.tasks.find(t=>t.id===task.id),task);
  failing=false;f.advance(15000);await f.sync.refresh();
  assert.equal(savedHistoryCount(f.controller.state),3);assert.equal(f.messages.at(-1).historyIssue,'');
  assert.equal(f.controller.state.tasks.filter(t=>t.id==='history-production-first').length,1);f.sync.dispose();
});

test('non-advancing pagination is bounded and malformed payloads cannot be reported as a complete refresh', async () => {
  const f=fixture(()=>page([job('loop')],25));await f.sync.refresh();
  assert.equal(f.calls.length,2);assert.match(f.messages.at(-1).historyIssue,/不完整/);assert.equal(savedHistoryCount(f.controller.state),2);f.sync.dispose();
  for(const invalid of [{},page([{}])])await assert.rejects(createHistoryReader(async()=>invalid).read(),{status:422});
});

test('saved history count deduplicates execution identities without altering conflict copies or native tasks', () => {
  const state=mergeAccountHistory(newWorkspace('draft'),[job('a'),job('b')]);
  const conflict=structuredClone(state.tasks[1]);conflict.id+='-conflict';conflict.syncConflict=true;state.tasks.push(conflict);
  state.tasks[0].runs=[{execution:{jobId:'a'}},{execution:{jobId:'native'}}];const before=structuredClone(state);
  assert.equal(savedHistoryCount(state),3);assert.deepEqual(state,before);
});

test('unfinished historical jobs keep a faster refresh until their terminal state arrives', async () => {
  let running=true;const f=fixture(()=>page([job('active',{status:running?'running':'completed'})]));
  await f.sync.refresh();assert.equal([...f.timers.values()][0].delay,60000);
  running=false;f.advance(60000);await f.sync.refresh();assert.equal([...f.timers.values()][0].delay,300000);f.sync.dispose();
});
