import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useReducer } from 'react';
import { cleanup, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import { newWorkspace, workspaceReducer, currentDraft } from '../src/workspace/workspaceState.js';

window.matchMedia = query => ({ matches: query.includes('767px'), media: query, addEventListener() {}, removeEventListener() {} });
afterEach(cleanup);
function Harness({ initial = newWorkspace('mobile'), onSend = () => {}, onOptimize = () => {}, onState = () => {} }) {
  const [state, dispatch] = useReducer(workspaceReducer, initial);
  onState(state, dispatch);
  return React.createElement(TaskWorkspace, { state, dispatch, onSubmit: () => onSend(state),
    onFiles: files => dispatch({ type:'EDIT_DRAFT', patch: { attachments: files.map((file, i) => ({ id:String(i), filename:file.name, purpose:null, status:'local' })) } }),
    renderModels: () => React.createElement('p', null, '模型选择内容'),
    renderSettings: () => React.createElement('p', null, '绘图设置内容'),
    renderOptimize: composer => composer({ start:onOptimize }),
  });
}

test('mobile composer reveals tools only while expanded and preserves the draft across dialogs', async () => {
  let sent = 0, latest;
  const { container } = render(React.createElement(Harness, { onSend: () => sent++, onState: state => latest = state }));
  const input = screen.getByRole('textbox', { name:'绘图要求' });
  assert.equal(screen.queryByRole('button', {name:'模型配置'}), null);
  assert.equal(screen.queryByRole('button', {name:'绘图设置', exact:true}), null);
  assert.equal(screen.queryByRole('group', {name:'设置深度'}), null);
  assert.equal(screen.getByRole('group', {name:'绘图工具'}).querySelectorAll('button').length, 2);
  assert.equal(input.style.height, '44px');
  fireEvent.change(input, { target:{ value:'描述科研流程\n保留精确数值' } });
  act(() => input.focus());
  assert.ok(input.closest('.tw-composer-region').classList.contains('is-input-focused'));
  assert.equal(input.style.height, '88px');
  const toolbar = screen.getByRole('group', { name:'绘图工具' });
  for (const name of ['添加附件', '模型配置', '绘图设置', '优化输入']) assert.ok(toolbar.contains(screen.getByRole('button', { name, exact:true })));
  fireEvent.click(screen.getByRole('button', {name:'专业', exact:true}));
  assert.equal(currentDraft(latest).mode, 'advanced');
  const settings = screen.getByRole('button', { name:'绘图设置', exact:true });
  assert.equal(fireEvent.pointerDown(settings), false, 'toolbar pointer down preserves input focus until click');
  assert.ok(document.activeElement === input);
  act(() => settings.focus()); fireEvent.click(settings);
  assert.ok(screen.getByText('绘图设置内容'));
  fireEvent.click(screen.getByRole('button', { name:'关闭绘图设置' }));
  assert.ok(screen.getByRole('textbox', { name:'绘图要求' }) === input, 'composer input is retained');
  assert.equal(input.value, '描述科研流程\n保留精确数值');
  const models = screen.getByRole('button', { name:'模型配置', exact:true });
  act(() => models.focus()); fireEvent.click(models);
  await waitFor(() => assert.ok(document.activeElement === screen.getByRole('button', { name:'关闭模型配置' }), 'dialog receives focus'));
  assert.ok(screen.getByText('模型选择内容'));
  fireEvent.keyDown(window, { key:'Escape' });
  assert.equal(screen.queryByRole('dialog'), null);
  assert.ok(document.activeElement === models, 'focus returns to the model control');
  assert.equal(screen.getByRole('button', {name:'专业', exact:true}).getAttribute('aria-pressed'), 'true');
  let chooserOpened = 0;
  container.querySelector('input[type=file]').addEventListener('click', e => { e.preventDefault(); chooserOpened++; });
  fireEvent.click(screen.getByRole('button', { name:'添加附件', exact:true }));
  assert.equal(chooserOpened, 1);
  assert.equal(screen.queryByRole('dialog'), null, 'upload plus never opens a tools sheet');
  act(() => input.focus());
  act(() => input.blur());
  assert.equal(screen.queryByRole('button', {name:'模型配置'}), null);
  assert.equal(screen.queryByRole('group', {name:'设置深度'}), null);
  assert.equal(input.style.height, '44px');
  assert.equal(input.value, '描述科研流程\n保留精确数值');
  act(() => input.focus());
  assert.equal(screen.getByRole('button', {name:'专业', exact:true}).getAttribute('aria-pressed'), 'true');
  assert.equal(sent, 0);
});

test('mobile attachments still require an explicit purpose and sending keeps all typed content', () => {
  let submitted;
  const { container } = render(React.createElement(Harness, { onSend: state => submitted = state }));
  fireEvent.change(screen.getByRole('textbox', { name:'绘图要求' }), { target:{ value:'流程图\n要求不截断' } });
  fireEvent.change(container.querySelector('input[type=file]'), { target:{ files:[new window.File(['demo'], 'research.txt', {type:'text/plain'})] } });
  assert.equal(screen.getByRole('button', { name:'生成图像' }).disabled, true);
  fireEvent.change(screen.getByRole('combobox', { name:'research.txt 的用途' }), { target:{ value:'research' } });
  fireEvent.click(screen.getByRole('button', { name:'生成图像' }));
  assert.equal(currentDraft(submitted).text, '流程图\n要求不截断');
  assert.equal(currentDraft(submitted).attachments[0].purpose, 'research');
  fireEvent.click(screen.getByRole('button', { name:'移除 research.txt' }));
  assert.equal(screen.queryByRole('combobox', { name:'research.txt 的用途' }), null);
});

test('mobile controls cannot optimize or submit during an existing run; changing the next draft leaves the submitted mode intact', () => {
  let initial = newWorkspace('mobile'), latest, calls = 0;
  for (const action of [{ type:'EDIT_DRAFT', patch:{text:'original'} }, { type:'BEGIN', runId:'running' }, { type:'ACCEPT', runId:'running' }]) initial = workspaceReducer(initial, action);
  render(React.createElement(Harness, { initial, onState: state => latest=state, onOptimize: () => calls++ }));
  act(() => screen.getByRole('textbox', {name:'绘图要求'}).focus());
  assert.equal(screen.getByRole('button', { name:'优化输入' }).disabled, true);
  fireEvent.click(screen.getByRole('button', {name:'专业', exact:true}));
  assert.equal(screen.getByRole('button', { name:'生成图像' }).disabled, true);
  assert.equal(latest.tasks[0].runs[0].input.mode, 'simple');
  assert.equal(currentDraft(latest).mode, 'advanced');
  assert.equal(calls, 0);
});

for (const error of ['', '本地模拟失败']) test(`finished mobile execution releases send after ${error ? 'failure' : 'success'} without replacing the next draft`, () => {
  let initial = newWorkspace('mobile'), dispatch, submissions = 0;
  for (const action of [{ type:'EDIT_DRAFT', patch:{text:'original'} }, { type:'BEGIN', runId:'running' }, { type:'ACCEPT', runId:'running' }]) initial = workspaceReducer(initial, action);
  render(React.createElement(Harness, { initial, onState: (_state, next) => dispatch = next, onSend: () => submissions++ }));
  fireEvent.change(screen.getByRole('textbox', { name:'绘图要求' }), { target:{ value:'下一张的新要求' } });
  assert.equal(screen.getByRole('button', { name:'生成图像' }).disabled, true);
  assert.equal(screen.queryByRole('button', { name:'复用上次要求' }), null);
  assert.equal(screen.queryByText('本任务已有执行，完成后可提交'), null);
  act(() => dispatch({ type:'FINISH', runId:'running', error }));
  assert.equal(screen.getByRole('textbox', { name:'绘图要求' }).value, '下一张的新要求');
  assert.equal(screen.getByRole('button', { name:'生成图像' }).disabled, false);
  fireEvent.click(screen.getByRole('button', { name:'生成图像' }));
  assert.equal(submissions, 1);
});

test('mobile navigation closes on new task and task selection while preserving existing input', async () => {
  let initial = workspaceReducer(newWorkspace('mobile'), { type:'RENAME', title:'保留草稿' });
  render(React.createElement(Harness, { initial }));
  fireEvent.change(screen.getByRole('textbox', { name:'绘图要求' }), { target:{ value:'未提交的绘图要求' } });
  fireEvent.click(screen.getByRole('button', { name:'打开侧边栏' }));
  await waitFor(() => assert.ok(document.activeElement === screen.getByRole('button', { name:'关闭任务导航' })));
  fireEvent.click(screen.getByRole('button', { name:'新建任务' }));
  assert.equal(screen.queryByRole('dialog'), null);
  assert.equal(screen.getByRole('textbox', { name:'绘图要求' }).value, '');
  fireEvent.click(screen.getByRole('button', { name:'打开侧边栏' }));
  fireEvent.click(screen.getByRole('button', { name:'保留草稿', exact:true }));
  assert.equal(screen.queryByRole('dialog'), null);
  assert.equal(screen.getByRole('textbox', { name:'绘图要求' }).value, '未提交的绘图要求');
});

test('keyboard viewport avoids an overlay, restores on dismissal, and ignores pinch zoom', async () => {
  const original = window.visualViewport;
  const viewport = new window.EventTarget();
  Object.assign(viewport, {height:window.innerHeight, offsetTop:0, scale:1});
  Object.defineProperty(window, 'visualViewport', {configurable:true, value:viewport});
  try {
    const { container, unmount } = render(React.createElement(Harness));
    const shell = container.querySelector('.tw-shell');
    const input = screen.getByRole('textbox', {name:'绘图要求'});
    act(() => input.focus());
    Object.assign(viewport, {height:400, offsetTop:20});
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    await waitFor(() => assert.equal(shell.dataset.keyboardOpen, 'true'));
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-height'), '420px');
    viewport.scale = 1.5;
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    await waitFor(() => assert.equal(shell.dataset.keyboardOpen, undefined));
    viewport.scale = 1;
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    await waitFor(() => assert.equal(shell.dataset.keyboardOpen, 'true'));
    viewport.height = window.innerHeight;
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    await waitFor(() => assert.equal(shell.dataset.keyboardOpen, undefined));
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-height'), '');
    viewport.height = 400;
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    await waitFor(() => assert.equal(shell.dataset.keyboardOpen, 'true'));
    act(() => input.blur());
    await waitFor(() => assert.equal(shell.dataset.keyboardOpen, undefined));
    unmount();
  } finally {
    Object.defineProperty(window, 'visualViewport', {configurable:true, value:original});
  }
});
