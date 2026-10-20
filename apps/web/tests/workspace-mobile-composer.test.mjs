import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useReducer } from 'react';
import { cleanup, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import { newWorkspace, workspaceReducer, currentDraft } from '../src/workspace/workspaceState.js';

window.matchMedia = query => ({ matches: query.includes('767px'), media: query, addEventListener() {}, removeEventListener() {} });
afterEach(cleanup);
const settleFocus = () => act(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
function Harness({ initial = newWorkspace('mobile'), onSend = () => {}, onOptimize = () => {}, onState = () => {}, optimizing = false, optimizationContent, settingsContent }) {
  const [state, dispatch] = useReducer(workspaceReducer, initial);
  onState(state, dispatch);
  return React.createElement(TaskWorkspace, { state, dispatch, onSubmit: () => onSend(state),
    onFiles: files => dispatch({ type:'EDIT_DRAFT', patch: { attachments: files.map((file, i) => ({ id:String(i), filename:file.name, purpose:null, status:'local' })) } }),
    renderModels: () => React.createElement('p', null, '模型选择内容'),
    renderSettings: () => settingsContent || React.createElement('p', null, '绘图设置内容'),
    renderOptimize: composer => composer({ start:onOptimize, optimizing, content:optimizationContent }),
  });
}

test('mobile composer reveals tools only while expanded and preserves the draft across dialogs', async () => {
  let sent = 0, latest;
  const { container } = render(React.createElement(Harness, { onSend: () => sent++, onState: state => latest = state }));
  const input = screen.getByRole('textbox', { name:'绘图要求' });
  assert.equal(screen.queryByRole('button', {name:'模型配置'}), null);
  assert.equal(screen.queryByRole('button', {name:'绘图设置', exact:true}), null);
  assert.equal(screen.queryByRole('group', {name:'设置深度'}), null);
  assert.equal(screen.getByRole('group', {name:'绘图工具'}).querySelectorAll(':scope > button').length, 2);
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
  fireEvent.pointerDown(screen.getByRole('heading', { name:'HI！今天想绘制什么？' }));
  assert.equal(screen.queryByRole('button', {name:'模型配置'}), null);
  assert.equal(screen.queryByRole('group', {name:'设置深度'}), null);
  assert.equal(input.style.height, '44px');
  assert.equal(input.value, '描述科研流程\n保留精确数值');
  act(() => input.focus());
  assert.equal(screen.getByRole('button', {name:'专业', exact:true}).getAttribute('aria-pressed'), 'true');
  assert.equal(sent, 0);
});

for (const control of ['专业', '优化输入', '模型配置', '绘图设置']) test(`mobile ${control} survives a touch blur with no focus destination`, async () => {
  let latest, optimized = 0;
  render(React.createElement(Harness, { onState: state => latest = state, onOptimize: () => optimized++ }));
  const input = screen.getByRole('textbox', { name:'绘图要求' });
  fireEvent.change(input, { target:{value:'手机点击工具时保留草稿'} });
  act(() => input.focus());
  const button = screen.getByRole('button', { name:control, exact:true });
  fireEvent.pointerDown(button, {pointerType:'touch'});
  // Mobile browsers can blur the textarea without focusing the tapped button.
  act(() => input.blur());
  assert.ok(button.isConnected, 'the control must remain mounted until its click');
  assert.ok(input.closest('.tw-composer-region').classList.contains('is-input-focused'));
  fireEvent.pointerUp(button, {pointerType:'touch'});
  fireEvent.click(button);
  if (control === '专业') assert.equal(currentDraft(latest).mode, 'advanced');
  if (control === '优化输入') assert.equal(optimized, 1);
  if (control === '模型配置' || control === '绘图设置') {
    const close = screen.getByRole('button', { name:`关闭${control}` });
    await waitFor(() => assert.ok(document.activeElement === close));
    fireEvent.pointerDown(close, {pointerType:'touch'});
    fireEvent.click(close);
    assert.equal(screen.queryByRole('dialog'), null);
    await settleFocus();
    assert.ok(document.activeElement === button, 'touch dialog returns to its trigger after fallback focus frames');
  }
  assert.ok(screen.getByRole('button', {name:'模型配置'}));
  assert.equal(input.value, '手机点击工具时保留草稿');
  // A second interaction need not refocus the textarea first.
  const simple = screen.getByRole('button', {name:'普通', exact:true});
  fireEvent.pointerDown(simple, {pointerType:'touch'});
  fireEvent.pointerUp(simple, {pointerType:'touch'});
  fireEvent.click(simple);
  assert.equal(currentDraft(latest).mode, 'simple');
  fireEvent.pointerDown(screen.getByRole('heading', {name:'HI！今天想绘制什么？'}), {pointerType:'touch'});
  assert.equal(screen.queryByRole('button', {name:'模型配置'}), null, 'tapping outside still collapses');
  assert.equal(input.value, '手机点击工具时保留草稿');
});

for (const control of ['模型配置', '绘图设置']) test(`mobile ${control} returns to its trigger after keyboard dismissal without changing any draft`, async () => {
  let latest;
  render(React.createElement(Harness, {onState: state => latest = state}));
  const input = screen.getByRole('textbox', {name:'绘图要求'});
  fireEvent.change(input, {target:{value:'本地测试草稿'}});
  act(() => input.focus());
  act(() => input.blur()); // Safari Done; a subsequent touch need not focus its button.
  const before = JSON.stringify(latest);
  for (let attempt = 0; attempt < 2; attempt++) {
    const trigger = screen.getByRole('button', {name:control, exact:true});
    fireEvent.pointerDown(trigger, {pointerType:'touch'});
    fireEvent.click(trigger);
    await settleFocus();
    fireEvent.click(screen.getByRole('button', {name:`关闭${control}`}));
    await settleFocus();
    assert.ok(document.activeElement === trigger, 'focus returns to the touch trigger');
    assert.ok(input.closest('.tw-composer-region').classList.contains('is-input-focused'));
    assert.equal(JSON.stringify(latest), before, 'opening/closing tools never edits task state');
  }
});

test('opening settings from a resting summary does not expand the composer or summon the keyboard', async () => {
  render(React.createElement(Harness));
  const summary = screen.getByRole('button', {name:/普通 ·\s*比例 自动/});
  fireEvent.click(summary);
  await settleFocus();
  fireEvent.click(screen.getByRole('button', {name:'关闭绘图设置'}));
  await settleFocus();
  assert.ok(document.activeElement === summary, 'focus returns to the resting summary');
  assert.equal(screen.queryByRole('button', {name:'模型配置'}), null);
});

test('mobile expansion follows the interaction boundary, including summary, keyboard focus and cancelled touches', () => {
  render(React.createElement(Harness));
  const input = screen.getByRole('textbox', {name:'绘图要求'});
  act(() => input.focus());
  const tools = screen.getByRole('group', {name:'绘图工具'});
  const settings = screen.getByRole('button', {name:/普通 ·\s*比例 自动/});
  fireEvent.pointerDown(settings, {pointerType:'touch'});
  act(() => input.blur());
  fireEvent.pointerCancel(settings, {pointerType:'touch'});
  assert.ok(tools.contains(screen.getByRole('button', {name:'模型配置'})));
  act(() => settings.focus());
  assert.ok(screen.getByRole('button', {name:'模型配置'}));
  act(() => screen.getByRole('button', {name:'打开侧边栏'}).focus());
  assert.equal(screen.queryByRole('button', {name:'模型配置'}), null, 'keyboard navigation outside collapses');
});

test('optimization pending and inline result controls retain the mobile editing layout', () => {
  const { rerender } = render(React.createElement(Harness));
  const input = screen.getByRole('textbox', {name:'绘图要求'});
  fireEvent.change(input, {target:{value:'原文保持不变'}});
  act(() => input.focus());
  act(() => screen.getByRole('button', {name:'优化输入'}).focus());
  rerender(React.createElement(Harness, {optimizing:true}));
  act(() => document.activeElement.blur());
  assert.equal(screen.getByRole('button', {name:'优化中…'}).disabled, true);
  assert.ok(screen.getByRole('button', {name:'模型配置'}));
  const content = React.createElement('button', null, '采用优化稿');
  rerender(React.createElement(Harness, {optimizationContent:content}));
  const apply = screen.getByRole('button', {name:'采用优化稿'});
  fireEvent.pointerDown(apply, {pointerType:'touch'});
  act(() => apply.focus());
  fireEvent.click(apply);
  assert.ok(screen.getByRole('button', {name:'模型配置'}));
  assert.equal(input.value, '原文保持不变');
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
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-height'), '400px');
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '20px');
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
    await settleFocus();
    assert.equal(shell.dataset.keyboardOpen, 'true', 'blur does not jump ahead of the native keyboard');
    viewport.height = window.innerHeight - 40;
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    await settleFocus();
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-height'), `${window.innerHeight - 40}px`);
    viewport.height = window.innerHeight;
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    await waitFor(() => assert.equal(shell.dataset.keyboardOpen, undefined));
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '');
    unmount();
  } finally {
    Object.defineProperty(window, 'visualViewport', {configurable:true, value:original});
  }
});

test('Safari keyboard is detected when innerHeight shrinks along with visualViewport', async () => {
  const originalViewport = window.visualViewport, originalHeight = window.innerHeight, originalScroll = window.scrollY;
  const clientHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'clientHeight');
  const viewport = new window.EventTarget();
  Object.assign(viewport, {height:400, offsetTop:150, scale:1});
  Object.defineProperty(window, 'visualViewport', {configurable:true, value:viewport});
  Object.defineProperty(document.documentElement, 'clientHeight', {configurable:true, value:796});
  window.innerHeight = 400;
  window.scrollY = 150;
  try {
    const {container} = render(React.createElement(Harness));
    act(() => screen.getByRole('textbox', {name:'绘图要求'}).focus());
    await settleFocus();
    const shell = container.querySelector('.tw-shell');
    assert.equal(shell.dataset.keyboardOpen, 'true');
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-height'), '400px');
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '150px');
  } finally {
    cleanup();
    window.innerHeight = originalHeight;
    window.scrollY = originalScroll;
    Object.defineProperty(window, 'visualViewport', {configurable:true, value:originalViewport});
    if (clientHeight) Object.defineProperty(document.documentElement, 'clientHeight', clientHeight);
    else delete document.documentElement.clientHeight;
  }
});

for (const pan of [350, 84]) test(`Safari dismissal restores the workspace before delayed visualViewport events after a ${pan}px pan`, async () => {
  const originalViewport = window.visualViewport, originalHeight = window.innerHeight, originalScroll = window.scrollY;
  const clientHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'clientHeight');
  const viewport = new window.EventTarget();
  Object.assign(viewport, {height:446, offsetTop:pan, scale:1});
  Object.defineProperty(window, 'visualViewport', {configurable:true, value:viewport});
  Object.defineProperty(document.documentElement, 'clientHeight', {configurable:true, value:796});
  window.innerHeight = 796 - pan;
  window.scrollY = pan;
  try {
    const {container} = render(React.createElement(Harness));
    const input = screen.getByRole('textbox', {name:'绘图要求'}), shell = container.querySelector('.tw-shell');
    act(() => input.focus());
    await settleFocus();
    assert.equal(shell.dataset.keyboardOpen, 'true');
    act(() => input.blur());
    await settleFocus();
    assert.equal(shell.dataset.keyboardOpen, 'true', 'blur alone does not jump ahead of the keyboard');
    window.innerHeight = 796;
    window.scrollY = 0;
    act(() => window.dispatchEvent(new window.Event('scroll')));
    assert.equal(viewport.height, 446, 'reproduce the stale Safari visual viewport');
    assert.equal(shell.dataset.keyboardOpen, undefined);
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '');
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-height'), '');
  } finally {
    cleanup();
    window.innerHeight = originalHeight;
    window.scrollY = originalScroll;
    Object.defineProperty(window, 'visualViewport', {configurable:true, value:originalViewport});
    if (clientHeight) Object.defineProperty(document.documentElement, 'clientHeight', clientHeight);
    else delete document.documentElement.clientHeight;
  }
});

test('Safari refocus follows the window pan while visualViewport offset is still stale', async () => {
  const originalViewport = window.visualViewport, originalHeight = window.innerHeight, originalScroll = window.scrollY;
  const clientHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'clientHeight');
  const viewport = new window.EventTarget();
  Object.assign(viewport, {height:400, offsetTop:0, scale:1});
  Object.defineProperty(window, 'visualViewport', {configurable:true, value:viewport});
  Object.defineProperty(document.documentElement, 'clientHeight', {configurable:true, value:796});
  try {
    const {container} = render(React.createElement(Harness));
    act(() => screen.getByRole('textbox', {name:'绘图要求'}).focus());
    await settleFocus();
    const shell = container.querySelector('.tw-shell');
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '0px');
    window.innerHeight = 400;
    window.scrollY = 350;
    act(() => window.dispatchEvent(new window.Event('scroll')));
    assert.equal(viewport.offsetTop, 0, 'Safari has not delivered its visual viewport scroll yet');
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '350px');
    window.scrollY = 360;
    await settleFocus();
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '360px', 'a native pan is corrected even before Safari sends its scroll event');
  } finally {
    cleanup();
    window.innerHeight = originalHeight;
    window.scrollY = originalScroll;
    Object.defineProperty(window, 'visualViewport', {configurable:true, value:originalViewport});
    if (clientHeight) Object.defineProperty(document.documentElement, 'clientHeight', clientHeight);
    else delete document.documentElement.clientHeight;
  }
});

test('keyboard touch boundary stops root panning but preserves text scrolling and pinch', async () => {
  const original = window.visualViewport;
  const viewport = new window.EventTarget();
  Object.assign(viewport, {height:400, offsetTop:0, scale:1});
  Object.defineProperty(window, 'visualViewport', {configurable:true, value:viewport});
  const touch = (node, type, points) => {
    const event = new window.Event(type, {bubbles:true, cancelable:true});
    Object.defineProperty(event, 'touches', {value:points.map(([clientX,clientY]) => ({clientX,clientY}))});
    node.dispatchEvent(event);
    return event.defaultPrevented;
  };
  try {
    render(React.createElement(Harness));
    const input = screen.getByRole('textbox', {name:'绘图要求'}), greeting = screen.getByRole('heading', {name:'HI！今天想绘制什么？'});
    act(() => input.focus());
    await settleFocus();
    touch(greeting, 'touchstart', [[100,300]]);
    assert.equal(touch(greeting, 'touchmove', [[100,200]]), true, 'blank area must not pan the root');
    input.style.overflowY = 'auto';
    Object.defineProperties(input, {clientHeight:{value:88}, scrollHeight:{value:500}});
    touch(input, 'touchstart', [[100,300]]);
    assert.equal(touch(input, 'touchmove', [[100,200]]), false, 'long text remains scrollable');
    input.scrollTop = 412;
    touch(input, 'touchstart', [[100,300]]);
    assert.equal(touch(input, 'touchmove', [[100,200]]), true, 'text boundary must not chain to the root');
    touch(input, 'touchstart', [[100,300],[200,300]]);
    assert.equal(touch(input, 'touchmove', [[80,280],[220,320]]), false, 'pinch remains available');
    viewport.height = window.innerHeight;
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    await settleFocus();
    touch(greeting, 'touchstart', [[100,300]]);
    assert.equal(touch(greeting, 'touchmove', [[100,200]]), false, 'no keyboard means no touch interception');
  } finally {
    cleanup();
    Object.defineProperty(window, 'visualViewport', {configurable:true, value:original});
  }
});

test('a settings field keeps its sheet above the keyboard and returns to the expanded composer', async () => {
  const originalViewport = window.visualViewport, originalHeight = window.innerHeight, originalScroll = window.scrollY;
  const clientHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'clientHeight');
  const viewport = new window.EventTarget();
  Object.assign(viewport, {height:796, offsetTop:0, scale:1});
  Object.defineProperty(window, 'visualViewport', {configurable:true, value:viewport});
  Object.defineProperty(document.documentElement, 'clientHeight', {configurable:true, value:796});
  window.innerHeight = 796; window.scrollY = 0;
  try {
    let latest;
    const {container} = render(React.createElement(Harness, {
      onState: state => latest = state,
      settingsContent: React.createElement('input', {'aria-label':'研究关键词'}),
    }));
    const composer = screen.getByRole('textbox', {name:'绘图要求'});
    fireEvent.change(composer, {target:{value:'保留原有绘图草稿'}});
    act(() => composer.focus()); act(() => composer.blur());
    const before = JSON.stringify(latest);
    const trigger = screen.getByRole('button', {name:'绘图设置',exact:true});
    fireEvent.click(trigger); await settleFocus();
    const field = screen.getByRole('textbox', {name:'研究关键词'});
    const body = field.closest('.tw-dialog-body'), shell = container.querySelector('.tw-shell');
    Object.defineProperty(body, 'clientHeight', {value:330});
    body.getBoundingClientRect = () => ({top:66,bottom:396});
    field.getBoundingClientRect = () => ({top:500-body.scrollTop,bottom:548-body.scrollTop});
    act(() => field.focus());
    window.innerHeight = 480; window.scrollY = 316;
    Object.assign(viewport, {height:446,offsetTop:0}); // Safari pan precedes viewport offset.
    act(() => viewport.dispatchEvent(new window.Event('resize')));
    assert.equal(shell.dataset.keyboardOpen, 'true');
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '316px');
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-height'), '446px');
    assert.ok(field.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom - 12);
    body.scrollTop = 260;
    await settleFocus();
    assert.equal(body.scrollTop, 260, 'a stable viewport must not fight the user scrolling the sheet');
    fireEvent.click(screen.getByRole('button', {name:'关闭绘图设置'}));
    window.innerHeight = 796; window.scrollY = 0;
    act(() => window.dispatchEvent(new window.Event('scroll')));
    await settleFocus();
    assert.equal(shell.dataset.keyboardOpen, undefined, 'closing the sheet clears stale keyboard geometry');
    assert.equal(document.activeElement, trigger);
    assert.ok(composer.closest('.tw-composer-region').classList.contains('is-input-focused'));
    assert.equal(JSON.stringify(latest), before);
    act(() => composer.focus());
    window.innerHeight = 446; window.scrollY = 350;
    act(() => window.dispatchEvent(new window.Event('scroll')));
    assert.equal(shell.style.getPropertyValue('--tw-keyboard-top'), '350px');
    assert.equal(composer.value, '保留原有绘图草稿');
  } finally {
    cleanup();
    window.innerHeight = originalHeight; window.scrollY = originalScroll;
    Object.defineProperty(window, 'visualViewport', {configurable:true, value:originalViewport});
    if (clientHeight) Object.defineProperty(document.documentElement, 'clientHeight', clientHeight);
    else delete document.documentElement.clientHeight;
  }
});

test('mobile search preserves the sidebar and returns focus and scroll on cancel', async () => {
  let latest;
  const {container} = render(React.createElement(Harness, {onState: state => latest = state}));
  fireEvent.change(screen.getByRole('textbox', {name:'绘图要求'}), {target:{value:'搜索不能改动的草稿'}});
  const before = JSON.stringify(latest);
  fireEvent.click(screen.getByRole('button', {name:'打开侧边栏'}));
  await settleFocus();
  const nav = screen.getByRole('dialog', {name:'任务导航'}), trigger = screen.getByRole('button', {name:'搜索',exact:true});
  const tasks = nav.querySelector('.tw-tasks');
  tasks.scrollTop = 120;
  for (const closeWithEscape of [false,true]) {
    fireEvent.click(trigger); // Safari touch need not focus the clicked control.
    await settleFocus();
    assert.ok(nav.isConnected, 'search must retain the mounted navigation');
    assert.ok(container.querySelector('.tw-shell').classList.contains('tw-mobile-nav-open'));
    assert.ok(nav.closest('[inert]'), 'covered navigation must not receive input');
    assert.equal(screen.queryByRole('dialog', {name:'任务导航'}), null, 'only search is exposed to assistive navigation');
    const search = screen.getByRole('textbox', {name:'搜索任务、功能和工具'});
    assert.equal(document.activeElement, search);
    fireEvent.change(search, {target:{value:'没有匹配项'}});
    if (closeWithEscape) fireEvent.keyDown(window, {key:'Escape'});
    else fireEvent.click(screen.getByRole('button', {name:'关闭搜索'}));
    await settleFocus();
    assert.equal(screen.getByRole('dialog', {name:'任务导航'}), nav);
    assert.equal(document.activeElement, trigger);
    assert.equal(tasks.scrollTop, 120);
    assert.equal(JSON.stringify(latest), before);
  }
});

test('selecting a search result exits both mobile layers and releases their scroll lock', async () => {
  const initial = workspaceReducer(newWorkspace('mobile'), {type:'EDIT_DRAFT',patch:{text:'本地任务草稿'}});
  const {container} = render(React.createElement(Harness, {initial}));
  const overflowBefore = document.body.style.overflow;
  fireEvent.click(screen.getByRole('button', {name:'打开侧边栏'}));
  await settleFocus();
  fireEvent.click(screen.getByRole('button', {name:'搜索',exact:true}));
  await settleFocus();
  fireEvent.click(screen.getByRole('button', {name:/本地任务草稿.*0 次执行/}));
  await settleFocus();
  assert.equal(screen.queryByRole('dialog'), null);
  assert.equal(container.querySelector('.tw-shell').classList.contains('tw-mobile-nav-open'), false);
  assert.equal(screen.getByRole('textbox', {name:'绘图要求'}).value, '本地任务草稿');
  assert.equal(document.body.style.overflow, overflowBefore);
});
