import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import React, { useReducer } from 'react';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import { newWorkspace, newTask, workspaceReducer as reduce, currentTask, currentDraft, isFormalTask, savedTaskDrafts } from '../src/workspace/workspaceState.js';
import { WorkspaceSyncController, createWorkspaceCache, mergeWorkspaces } from '../src/workspace/workspaceSync.js';
import { cleanWorkspace } from '../../../packages/api/src/workspace-sync.mjs';

afterEach(cleanup);
const edit = (state, text, at = 1) => reduce(state, { type:'EDIT_DRAFT', patch:{text}, at });
const begin = state => reduce(state, { type:'BEGIN', runId:'run', execution:{version:1,simulation:true}, at:2 });
const accept = state => reduce(state, { type:'ACCEPT', runId:'run' });

test('New reuses the current edited draft, then the latest saved draft; other drafts remain intact', () => {
  let state = edit(newWorkspace('older'), '旧研究草稿');
  state.tasks.push(newTask('latest', 'svg'), newTask('blank'));
  state.selectedTaskId = 'latest'; state = edit(state, '最近的矢量草稿', 10);
  const before = structuredClone(state.tasks);
  for (const selected of ['blank', 'older', 'latest']) {
    const next = reduce({...state, selectedTaskId:selected}, {type:'CREATE_TASK', id:'must-not-exist'});
    assert.equal(next.selectedTaskId, selected === 'older' ? 'older' : 'latest');
    assert.deepEqual(next.tasks, before);
  }
  assert.deepEqual(savedTaskDrafts(state.tasks).map(t => t.id), ['latest', 'older']);
});

test('blank input and local validation cannot create formal tasks; uncertain submissions keep the same draft', () => {
  let state = newWorkspace('draft');
  for (let i = 0; i < 5; i++) state = reduce(state, {type:'CREATE_TASK'});
  state = begin(state); // Empty input fails local validation.
  assert.equal(state.tasks.length, 1); assert.equal(currentTask(state).runs.length, 0);
  state = begin(edit(state, '研究流程'));
  state = reduce(state, {type:'EXECUTION', runId:'run', stage:'提交状态待核对'});
  assert.equal(isFormalTask(currentTask(state)), false);
  assert.deepEqual(reduce(state, {type:'CREATE_TASK'}), state);
  state = reduce(state, {type:'FINISH', runId:'run', error:'请求未被接收'});
  assert.equal(isFormalTask(currentTask(state)), false);
  assert.equal(currentDraft(state).text, '研究流程');
  state = edit(state, '修正后的研究流程');
  assert.equal(currentTask(state).title, '修正后的研究流程');
});

test('a queued receipt promotes once; later failure and retry drafts never demote or duplicate the task', () => {
  const draft = begin(edit(newWorkspace('draft'), '研究流程'));
  let state = reduce(draft, {type:'EXECUTION', runId:'run', execution:{jobId:'queued-job'}});
  assert.equal(isFormalTask(currentTask(state)), true, 'a recovered server receipt counts before ACCEPT is replayed');
  state = accept(state);
  state = reduce(state, {type:'FINISH', runId:'run', error:'接收后的生成失败'});
  assert.equal(isFormalTask(currentTask(state)), true);
  assert.equal(currentDraft(state).text, '研究流程');
  const formal = structuredClone(currentTask(state));
  state = reduce(state, {type:'CREATE_TASK', id:'next-draft'});
  assert.equal(state.selectedTaskId, 'next-draft'); assert.equal(currentDraft(state).text, '');
  assert.deepEqual(state.tasks.find(t => t.id === 'draft'), formal);
  assert.deepEqual(reduce(state, {type:'CREATE_TASK'}), state);
  const merged = mergeWorkspaces(draft, edit(draft, '同时编辑的下一条要求'), {...state, selectedTaskId:'draft'});
  assert.equal(merged.conflicts, 0);
  assert.equal(isFormalTask(merged.state.tasks.find(t => t.id === 'draft')), true);
  assert.equal(merged.state.tasks.find(t => t.id === 'draft').branches.png.draft.text, '同时编辑的下一条要求');
});

test('legacy results and manual SVG saves remain tasks; archived/deleted drafts are never silently reopened', () => {
  let state = newWorkspace('manual');
  state = reduce(state, {type:'SAVE_SVG', versionId:'svg', runId:'edit', url:'data:image/svg+xml,<svg/>'});
  assert.equal(isFormalTask(currentTask(state)), true);
  currentTask(state).runs = []; // A legacy result with no execution record remains accessible.
  assert.equal(isFormalTask(currentTask(state)), true);
  for (const flag of ['archived', 'deleted']) {
    const task = currentTask(edit(newWorkspace(flag), flag)); task[flag] = true; state.tasks.push(task);
  }
  const before = structuredClone(state.tasks);
  state = reduce(state, {type:'CREATE_TASK', id:'blank'});
  assert.equal(state.selectedTaskId, 'blank'); assert.deepEqual(state.tasks.slice(1), before);
});

test('drafts survive local reload and a fresh account login through the unchanged server wire format', async () => {
  const cache = createWorkspaceCache(new IDBFactory());
  let remote = null, revision = 0;
  const client = {
    get:async () => ({state:structuredClone(remote),revision}),
    hydrate:async s => structuredClone(s), wire:async s => cleanWorkspace(s),
    put:async (expected, state) => {assert.equal(expected, revision);remote=structuredClone(state);return {revision:++revision};},
  };
  const controllers = [];
  async function open(store) {
    const c = new WorkspaceSyncController({key:'draft-owner',client,cache:store,recoveryId:crypto.randomUUID()});
    controllers.push(c);await c.init();clearTimeout(c.timer);await c.sync();clearTimeout(c.timer);return c;
  }
  try {
    const first = await open(cache);
    first.setState(s => edit(s, '刷新和重新登录后继续编辑'));
    await first.sync();clearTimeout(first.timer);
    const id = first.state.selectedTaskId;first.dispose();
    for (const store of [cache, createWorkspaceCache(new IDBFactory())]) {
      const restored = await open(store);
      restored.setState(s => reduce(s, {type:'CREATE_TASK',id:'unnecessary'}));
      assert.equal(restored.state.selectedTaskId, id);
      assert.equal(currentDraft(restored.state).text, '刷新和重新登录后继续编辑');
      assert.equal(restored.state.tasks.filter(isFormalTask).length, 0);
      assert.equal(restored.state.tasks.length, 1);restored.dispose();
    }
  } finally {controllers.forEach(c => c.dispose());}
});

for (const mobile of [false, true]) test(`${mobile ? 'mobile' : 'desktop'} keeps legacy drafts separate from formal tasks and restores them from New and search`, () => {
  window.matchMedia = query => ({matches:mobile && query.includes('767px'),media:query,addEventListener(){},removeEventListener(){}});
  let state = accept(begin(edit(newWorkspace('formal'), '已接收任务')));
  state = reduce(state, {type:'FINISH',runId:'run',error:'可重试'});
  state.tasks.push(currentTask(edit(newWorkspace('old'), '历史未生成草稿', 10)));
  let latest;
  function Harness() {
    const [s, dispatch] = useReducer(reduce, state);latest=s;
    return React.createElement(TaskWorkspace, {state:s,dispatch,onSubmit(){},onFiles(){},saveStatus:'草稿已保存'});
  }
  render(React.createElement(Harness));
  const open = () => {if(mobile)fireEvent.click(screen.getByRole('button',{name:'打开侧边栏'}));};
  open();
  assert.ok(within(screen.getByRole('navigation',{name:'创作任务'})).getByText('已接收任务'));
  assert.equal(within(screen.getByRole('navigation',{name:'创作任务'})).queryByText('历史未生成草稿'), null);
  assert.ok(within(screen.getByRole('navigation',{name:'草稿'})).getByText('历史未生成草稿'));
  fireEvent.click(screen.getByRole('button',{name:'新建任务'}));
  assert.equal(screen.getByLabelText('绘图要求').value, '历史未生成草稿');
  assert.equal(latest.tasks.length, 2);
  open();fireEvent.click(screen.getByRole('button',{name:'搜索',exact:true}));
  const dialog = screen.getByRole('dialog',{name:'搜索'});
  const drafts = within(dialog).getByRole('region',{name:/草稿/});
  assert.ok(within(drafts).getByText('历史未生成草稿'));
  assert.equal(within(drafts).queryByText('已接收任务'), null);
});
