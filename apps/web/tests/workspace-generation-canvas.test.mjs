import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React from 'react';
import { cleanup, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GenerationCanvas from '../src/workspace/GenerationCanvas.jsx';
import GenerationProgressPanel from '../src/workspace/GenerationProgressPanel.jsx';
import ResultWorkspace from '../src/workspace/ResultWorkspace.jsx';
import useWorkspaceExecution from '../src/workspace/useWorkspaceExecution.js';
import { generationProgressSnapshot } from '../src/workspace/generationProgress.js';
import { newWorkspace, workspaceReducer } from '../src/workspace/workspaceState.js';

afterEach(cleanup);
function running(path = 'png') {
  let state = newWorkspace('task');
  for (const action of [{ type: 'SET_PATH', path }, { type: 'EDIT_DRAFT', patch: { text: 'Test figure' } },
    { type: 'BEGIN', runId: 'run', at: Date.now() - 65000, execution: { jobId: 'job' } }, { type: 'ACCEPT', runId: 'run' }]) state = workspaceReducer(state, action);
  return state;
}
const snapshot = job => generationProgressSnapshot(job, { taskId: 'task', runId: 'run', base: 'https://example.test' });

test('progress projection retains stage details separately from input and only render stages supply the canvas preview', () => {
  const data = snapshot({ status: 'running', input: 'PRIVATE INPUT', stages: [
    { type: 'planner', title: '规划完成', durationMs: 65000, text: 'PRIVATE MATERIAL' },
    { type: 'render', title: '首次成图', image: { url: '/render.png' } },
    { type: 'reference', title: '参考原图', image: { url: '/private-reference.png' } },
    { type: 'render', error: 'failed', image: { url: '/broken.png' } },
  ] });
  assert.equal(data.stages[0].durationMs, 65000);
  assert.equal(data.preview.url, '/render.png');
  assert.equal(data.stages[0].text, 'PRIVATE MATERIAL');
  assert.ok(!JSON.stringify(data).includes('PRIVATE INPUT'));
  assert.notEqual(data.preview.url, '/private-reference.png');
  assert.equal(snapshot({ stages: [{ type: 'reference', image: { url: '/ref.png' } }] }).preview, null);
});

test('canvas updates from real stage snapshots and never claims a guessed next model phase', () => {
  const run = running().tasks[0].runs[0];
  const { rerender } = render(React.createElement(GenerationCanvas, { run, taskId: 'task', progress: snapshot({ status: 'running', stages: [{ type: 'planner', title: '规划完成', duration_ms: 65000 }] }) }));
  assert.ok(screen.getByRole('heading', { name: '规划完成' }));
  assert.equal(screen.queryByText('正在渲染'), null);
  rerender(React.createElement(GenerationCanvas, { run, taskId: 'task', progress: snapshot({ status: 'running', stages: [{ type: 'render', title: '首次成图', image: { url: '/render.png' } }] }) }));
  const image = screen.getByAltText('过程图：首次成图');
  assert.equal(image.src, 'https://example.test/render.png');
  assert.ok(screen.getByText(/尚未交付/));
  fireEvent.error(image);
  assert.ok(screen.getByRole('alert'));
  assert.ok(screen.getByRole('button', { name: '重新载入' }));
});

test('floating records preserve received details on delayed polling and isolate unrelated tasks', () => {
  const run = running().tasks[0].runs[0], progress = snapshot({ status: 'awaiting_provider', stages: [{ type: 'planner', title: '规划完成', text: '真实布局方案' }] });
  const props = { run, taskId: 'task', progress, triggerRef: { current: null }, onClose() {} };
  const { rerender } = render(React.createElement(GenerationProgressPanel, props));
  assert.ok(screen.getByText('已用 1 分 5 秒'));
  assert.ok(screen.getByText('等待渠道恢复，未重新提交'));
  const record = screen.getByText('规划完成').closest('details');
  record.open = true;
  rerender(React.createElement(GenerationProgressPanel, { ...props, progress: { ...progress, refreshFailed: true } }));
  assert.ok(screen.getByText('进度更新暂时延迟，正在重新查询'));
  assert.equal(record.open, true);
  assert.ok(screen.getByText('真实布局方案'));
  rerender(React.createElement(GenerationProgressPanel, { ...props, taskId: 'other-task' }));
  assert.equal(screen.queryByText('真实布局方案'), null);
  assert.ok(screen.getByText('等待阶段记录…'));
});

test('running SVG uses the generation canvas, idle SVG still uses the inline editor, and other paths stay separate', () => {
  const state = running('svg'), props = { state, dispatch() {}, renderSvgEditor: () => React.createElement('div', null, 'inline editor') };
  const { rerender } = render(React.createElement(ResultWorkspace, props));
  assert.ok(screen.getByRole('region', { name: '实时生成画布' }));
  assert.equal(screen.queryByText('inline editor'), null);
  rerender(React.createElement(ResultWorkspace, { ...props, state: workspaceReducer(state, { type: 'SET_PATH', path: 'png' }) }));
  assert.equal(screen.queryByRole('region', { name: '实时生成画布' }), null);
  const idle = workspaceReducer(newWorkspace('task'), { type: 'SET_PATH', path: 'svg' });
  rerender(React.createElement(ResultWorkspace, { ...props, state: idle }));
  assert.ok(screen.getByText('inline editor'));
});

test('opening stage details never replaces a delivered image; close and Escape restore the trigger', () => {
  const state = workspaceReducer(running(), { type: 'RESULT', runId: 'run', candidateId: 'a', version: { id: 'delivered', format: 'png', url: '/delivered.png' } });
  render(React.createElement(ResultWorkspace, { state, dispatch() {}, executionProgress: snapshot({ stages: [
    { type: 'planner', title: '规划', text: JSON.stringify({ plan: '按四步安排布局' }) },
    { type: 'stylist', title: '设计', text: '使用绿色分区与清晰箭头' },
    { type: 'critic', title: '评审', text: JSON.stringify({ decision: { status: 'issues_found', assessment: '第三步缺少标注', critic_suggestions: ['补充样本数量'] } }) },
    { type: 'render', title: '过程图', image: { url: '/intermediate.png' } },
  ] }) }));
  const image = document.querySelector('.tw-figure-stage img'), viewport = screen.getByRole('region', { name: '作品预览，放大后可滚动查看' });
  const trigger = screen.getByRole('button', { name: '阶段记录', expanded: false });
  fireEvent.click(trigger);
  const panel = screen.getByRole('dialog', { name: '阶段记录' });
  assert.equal(panel.getAttribute('aria-modal'), 'false');
  assert.equal(screen.getByText('按四步安排布局').closest('details').open, false);
  assert.ok(screen.getByText('使用绿色分区与清晰箭头'));
  assert.ok(screen.getByText('第三步缺少标注'));
  assert.ok(screen.getByText('补充样本数量'));
  assert.equal(viewport.querySelector('img'), image);
  assert.equal(image.getAttribute('src'), '/delivered.png');
  fireEvent.keyDown(panel, { key: 'Escape' });
  assert.equal(screen.queryByRole('dialog', { name: '阶段记录' }), null);
  assert.equal(document.activeElement, trigger);
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: '关闭阶段记录' }));
  assert.equal(document.activeElement, trigger);
  fireEvent.click(trigger);
  fireEvent.pointerDown(viewport);
  assert.equal(screen.queryByRole('dialog', { name: '阶段记录' }), null);
  assert.equal(state.tasks[0].branches.png.groups[0].candidates[0].versions.length, 1);
});

test('opening records preserves unsaved SVG edits and mounted editor state', () => {
  const state = workspaceReducer(running('svg'), { type: 'RESULT', runId: 'run', candidateId: 'a', version: { id: 'delivered', format: 'svg', url: '/delivered.svg' } });
  let mounts = 0;
  function Editor() { React.useEffect(() => { mounts++; }, []); return React.createElement('textarea', { 'aria-label': '本地 SVG 草稿', defaultValue: 'original' }); }
  render(React.createElement(ResultWorkspace, { state, dispatch() {}, renderSvgEditor: () => React.createElement(Editor) }));
  const editor = screen.getByRole('textbox', { name: '本地 SVG 草稿' });
  fireEvent.change(editor, { target: { value: 'unsaved edit' } });
  fireEvent.click(screen.getByRole('button', { name: '阶段记录' }));
  fireEvent.click(screen.getByRole('button', { name: '关闭阶段记录' }));
  assert.equal(editor.value, 'unsaved edit');
  assert.equal(mounts, 1);
});

test('long runs keep planning details and stages without content explain their state', () => {
  const progress = snapshot({ stages: [{ type: 'planner', text: '最初的规划' }, ...Array.from({ length: 65 }, (_, i) => ({ type: 'render', id: String(i) }))] });
  assert.equal(progress.stages[0].text, '最初的规划');
  render(React.createElement(GenerationProgressPanel, { run: running().tasks[0].runs[0], taskId: 'task', progress, triggerRef: { current: null }, onClose() {} }));
  assert.ok(screen.getByText('最初的规划'));
  assert.equal(screen.getAllByText('此阶段尚未返回详细内容。').length, 65);
});

test('existing execution polling supplies ephemeral progress, retains it on failure, and stops after completion', async t => {
  const stateRef = { current: running() }, calls = [];
  let job = { id: 'job', status: 'running', stages: [{ type: 'planner', title: '规划已返回', durationMs: 1200, text: 'private' }] }, broken = false, execution;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (!options?.body) return Response.json({ executionEnabled: true });
    const body = JSON.parse(options.body); calls.push(body.action);
    if (broken) throw Error('offline');
    return Response.json({ job });
  });
  function Harness() {
    execution = useWorkspaceExecution({ stateRef, dispatch: action => { stateRef.current = workspaceReducer(stateRef.current, action); }, sync: { setState() {} }, userId: 'owner', base: 'https://example.test' });
    return null;
  }
  render(React.createElement(Harness));
  await waitFor(() => assert.equal(execution.progressByRunId.run?.stages[0].title, '规划已返回'));
  assert.deepEqual(calls, ['getJob']);
  assert.equal(execution.progressByRunId.run.stages[0].text, 'private');
  assert.ok(!JSON.stringify(stateRef.current).includes('private'));
  assert.equal(stateRef.current.tasks[0].branches.png.groups[0].candidates.length, 0);
  broken = true; await act(() => execution.refresh());
  assert.equal(execution.progressByRunId.run.refreshFailed, true);
  assert.equal(execution.progressByRunId.run.stages[0].title, '规划已返回');
  broken = false; job = { ...job, status: 'completed' }; await act(() => execution.refresh());
  assert.equal(stateRef.current.tasks[0].activeRunId, null);
  await act(() => execution.refresh());
  assert.deepEqual(execution.progressByRunId, {});
  assert.deepEqual(calls, ['getJob', 'getJob', 'getJob']);
});
