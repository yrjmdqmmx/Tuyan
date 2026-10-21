import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useReducer, act } from 'react';
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import WorkspaceRunEvidence from '../src/workspace/WorkspaceRunEvidence.jsx';
import { newWorkspace, workspaceReducer, currentTask } from '../src/workspace/workspaceState.js';
import { sampleSvg } from '../src/workspace/previewFixtures.js';

window.matchMedia = query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} });
afterEach(() => { cleanup(); window.localStorage.clear(); });
test('execution evidence reads only on request, retains submitted identity and distinguishes requested from returned model', async () => {
  const run = { id: 'run', execution: { taskId: 'original-task', jobId: 'job', simulation: false } }, before = structuredClone(run);
  const calls = [];
  render(React.createElement(WorkspaceRunEvidence, { taskId: 'restored-task', userId: 'owner', base: 'http://localhost', run,
    read: async (...args) => { calls.push(args); if (calls.length === 1) throw Error('unavailable'); return { providerCalls: [{ channel: 'tokendance', requestedModel: 'seedream-5.0-pro', actualModel: 'doubao-seedream-5-0-pro-260628', protocol: 'ark:image-generations' }], result_images: [{ filename: 'candidate.png', review: { status: 'issues_found', note: '需要检查标签' } }] }; } }));
  assert.equal(calls.length, 0);
  fireEvent.click(screen.getByRole('button', { name: '查看渠道与评审记录' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '查看渠道与评审记录' }));
  await screen.findByText(/实际回报：doubao-seedream-5-0-pro-260628/);
  assert.match(screen.getByText(/请求 seedream-5.0-pro/).textContent, /tokendance/);
  assert.ok(screen.getByText('候选 A · 模型评审发现问题'));
  assert.ok(screen.getByText('需要检查标签'));
  assert.deepEqual(calls, Array(2).fill(['http://localhost', 'owner', 'original-task', 'run', 'job']));
  assert.deepEqual(run, before);
});
test('simulated executions never query real provider evidence', () => {
  render(React.createElement(WorkspaceRunEvidence, { taskId: 'task', userId: 'owner', run: { id: 'run', execution: { jobId: 'job', simulation: true } }, read: () => { throw Error('must not call'); } }));
  assert.equal(screen.queryByRole('button', { name: '查看渠道与评审记录' }), null);
});
function completed() {
  let s = newWorkspace('a');
  const a = (type, data = {}) => { s = workspaceReducer(s, { type, ...data }); };
  a('EDIT_DRAFT', { patch: { text: '科研流程图' } }); a('BEGIN', { runId: 'r' }); a('ACCEPT', { taskId: 'a', runId: 'r' });
  for (const label of ['A', 'B']) a('RESULT', { taskId: 'a', runId: 'r', candidateId: label, label, version: { id: label, format: 'png', url: 'data:image/png;base64,AA==' } });
  a('FINISH', { taskId: 'a', runId: 'r' }); return s;
}
function Harness({ initial = newWorkspace('a'), onSend = () => {} }) {
  const [state, dispatch] = useReducer(workspaceReducer, initial);
  return React.createElement(TaskWorkspace, { state, dispatch, onFiles() {}, onSubmit() {
    onSend(state); const runId = `run-${currentTask(state).runs.length + 1}`;
    dispatch({ type: 'BEGIN', runId }); dispatch({ type: 'ACCEPT', taskId: state.selectedTaskId, runId });
  }, renderModels: () => React.createElement('p', null, '模型接口插槽'), renderSettings: () => React.createElement('p', null, '绘图设置插槽'), renderPage: () => React.createElement('p', null, '资源页面'), saveStatus: '本地草稿' });
}
test('an unread generated result offers selection instead of claiming the path is empty',()=>{
 const initial=completed(),branch=initial.tasks[0].branches.png;branch.versionId=null;branch.candidateId=null;branch.unreadVersionId='A';
 render(React.createElement(Harness,{initial}));
 assert.ok(screen.getByRole('heading',{name:'已有结果可查看'}));
 assert.equal(screen.queryByText('此路径尚无结果'),null);
 fireEvent.click(screen.getByRole('button',{name:'查看已生成版本'}));
 assert.equal(screen.getByRole('button',{name:'查看候选 A · v1'}).getAttribute('aria-pressed'),'true');
 assert.ok(screen.getByRole('link',{name:'下载 PNG'}));
});
test('empty task has one unified input, independent paths and mode, accepts no hidden caption', async () => {
  const user = userEvent.setup(); let submitted;
  const { container } = render(React.createElement(Harness, { onSend: s => { submitted = s; } }));
  assert.ok(screen.getByRole('heading', { name: 'HI！今天想绘制什么？' }));
  assert.equal(container.querySelectorAll('textarea').length, 1);
  await user.type(screen.getByLabelText('绘图要求'), 'PNG 要求');
  await user.click(screen.getByRole('button', { name: '矢量绘图' }));
  assert.equal(screen.getByLabelText('绘图要求').value, '');
  await user.type(screen.getByLabelText('绘图要求'), 'SVG 要求');
  await user.click(within(screen.getByRole('group', { name: '设置深度' })).getByRole('button', { name: '专业' }));
  await user.click(screen.getByRole('button', { name: '图像创作' }));
  assert.equal(screen.getByLabelText('绘图要求').value, 'PNG 要求');
  assert.equal(within(screen.getByRole('group', { name: '设置深度' })).getByRole('button', { name: '普通' }).getAttribute('aria-pressed'), 'true');
  await user.click(screen.getByRole('button', { name: '生成图像' }));
  assert.ok(submitted); assert.equal(currentTask(submitted).branches.png.draft.caption, '');
  assert.equal(container.querySelector('.tw-empty'), null);
  assert.equal(screen.queryByText('本任务已有执行，完成后可提交'), null);
  assert.equal(screen.getByRole('button', { name:'生成图像' }).disabled, true);
  assert.equal(screen.queryByRole('button', { name:'复用上次要求' }), null);
});
test('candidate browsing leaves explicit modification target and send label intact', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness, { initial: completed() }));
  await user.click(screen.getByRole('button', { name: '查看候选 B · v1' }));
  await user.click(screen.getByRole('button', { name: '继续修改' }));
  await user.type(screen.getByLabelText('修改要求'), '只改 B 颜色');
  await user.click(screen.getByRole('button', { name: '查看候选 A · v1' }));
  assert.equal(screen.getByLabelText('修改要求').value, '只改 B 颜色');
  assert.ok(screen.getByRole('button', { name: '修改 B · v1' }));
  await user.click(screen.getByRole('button', { name: '改为修改当前版本' }));
  assert.equal(screen.getByLabelText('修改要求').value, '');
  assert.ok(screen.getByRole('button', { name: '修改 A · v1' }));
  await user.click(screen.getByRole('button', { name: '退出修改' }));
  assert.ok(screen.getByLabelText('绘图要求'));
});
test('segmented controls support keyboard selection without submitting and retain each path mode', async () => {
  const user = userEvent.setup(); let submissions = 0;
  render(React.createElement(Harness, { onSend: () => { submissions++; } }));
  const paths = screen.getByRole('group', { name: '创作路径' });
  within(paths).getByRole('button', { name: '图像创作' }).focus();
  await user.keyboard('{ArrowRight}');
  assert.equal(within(paths).getByRole('button', { name: '矢量绘图' }).getAttribute('aria-pressed'), 'true');
  within(screen.getByRole('group', { name: '设置深度' })).getByRole('button', { name: '普通' }).focus();
  await user.keyboard('{End}');
  assert.equal(screen.getByRole('button', { name: '专业', exact: true }).getAttribute('aria-pressed'), 'true');
  await user.click(within(paths).getByRole('button', { name: '图像创作' }));
  assert.equal(screen.getByRole('button', { name: '普通', exact: true }).getAttribute('aria-pressed'), 'true');
  await user.click(within(paths).getByRole('button', { name: '矢量绘图' }));
  assert.equal(screen.getByRole('button', { name: '专业', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(submissions, 0);
});
test('running task blocks another path but does not block a new task or clear its draft', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness));
  await user.type(screen.getByLabelText('绘图要求'), '任务一');
  await user.click(screen.getByRole('button', { name: '生成图像' }));
  await user.click(screen.getByRole('button', { name: '矢量绘图' }));
  await user.type(screen.getByLabelText('绘图要求'), 'SVG 后续要求');
  assert.equal(screen.getByRole('button', { name: '生成矢量图' }).disabled, true);
  await user.click(screen.getByRole('button', { name: '新建任务' }));
  await user.type(screen.getByLabelText('绘图要求'), '任务二');
  assert.equal(screen.getByRole('button', { name: '生成矢量图' }).disabled, false);
  await user.click(screen.getByRole('button', { name: /任务一/ }));
  assert.equal(screen.getByLabelText('绘图要求').value, 'SVG 后续要求');
});
test('search includes requirement text; Escape returns focus', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness, { initial: completed() }));
  const trigger = screen.getByRole('button', { name: '搜索', exact: true });
  await user.click(trigger);
  const search = screen.getByRole('dialog', { name: '搜索' });
  await user.type(within(search).getByLabelText('搜索任务、功能和工具'), '科研');
  assert.ok(within(search).getByRole('button', { name: /科研流程图/ }));
  await user.keyboard('{Escape}');
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.ok(document.activeElement === trigger);
});
test('collapsed resources use a menu with keyboard navigation, Escape and outside dismissal', async () => {
  const user = userEvent.setup();
  const { container } = render(React.createElement(Harness, { initial: completed() }));
  await user.click(screen.getByRole('button', { name: '收起侧边栏' }));
  const trigger = screen.getByRole('button', { name: '资源与帮助' });
  await user.click(trigger);
  const menu = screen.getByRole('menu', { name: '资源与帮助' });
  const items = within(menu).getAllByRole('menuitem');
  assert.equal(items.length, 10);
  assert.equal(within(menu).queryByRole('menuitem', { name: '绘图模板' }), null);
  assert.equal(screen.queryByRole('dialog', { name: '资源与帮助' }), null);
  assert.ok(document.activeElement === items[0]);
  await user.keyboard('{ArrowDown}'); assert.ok(document.activeElement === items[1]);
  await user.keyboard('{End}'); assert.ok(document.activeElement === items.at(-1));
  await user.keyboard('{Home}'); assert.ok(document.activeElement === items[0]);
  await user.keyboard('{Escape}');
  assert.equal(screen.queryByRole('menu'), null);
  assert.ok(document.activeElement === trigger);
  await user.click(trigger);
  fireEvent.pointerDown(container.querySelector('main'));
  assert.equal(screen.queryByRole('menu'), null);
  await user.click(trigger);
  await user.click(screen.getByRole('menuitem', { name: '使用教程' }));
  assert.equal(screen.queryByRole('menu'), null);
  assert.ok(screen.getByRole('heading', { name: '使用教程' }));
});
test('Tab leaves the resource menu for the fixed account entry', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness));
  await user.click(screen.getByRole('button', { name: '收起侧边栏' }));
  await user.click(screen.getByRole('button', { name: '资源与帮助' }));
  assert.ok(screen.getByRole('menu', { name: '资源与帮助' }));
  await user.keyboard('{Tab}');
  assert.equal(screen.queryByRole('menu'), null);
  assert.equal(document.activeElement === screen.getByRole('button', { name: '登录图研', exact: true }), true, `focus is ${document.activeElement?.outerHTML.slice(0, 180)}`);
});
test('sidebar hover uses a dismissible tooltip and a separate shortcut badge', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness));
  const search = screen.getByRole('button', { name: '搜索', exact: true });
  await user.hover(search);
  const tooltip = await screen.findByRole('tooltip');
  assert.ok(within(tooltip).getByText('搜索'));
  assert.ok(tooltip.querySelector('kbd').textContent.includes('K'));
  assert.equal(search.hasAttribute('title'), false);
  await user.keyboard('{Escape}');
  assert.equal(screen.queryByRole('tooltip'), null);
  await user.unhover(search);
});
test('versions and comparison are view-only; download uses actual saved format', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness, { initial: completed() }));
  const link = screen.getByRole('link', { name: '下载 PNG' });
  assert.ok(link.getAttribute('download').endsWith('.png'));
  await user.click(screen.getByRole('button', { name: '继续修改' }));
  await user.type(screen.getByLabelText('修改要求'), '不要改数值');
  await user.click(screen.getByRole('button', { name: '比较' }));
  assert.ok(screen.getByRole('dialog', { name: '版本比较' }));
  await user.click(screen.getByRole('button', { name: '关闭版本比较' }));
  assert.equal(screen.getByLabelText('修改要求').value, '不要改数值');
  assert.ok(screen.getByRole('button', { name: '修改 A · v1' }));
});
test('fullscreen preview exits with Escape and preserves the bound refinement and draft', async () => {
  const user = userEvent.setup(); render(React.createElement(Harness, { initial: completed() }));
  await user.click(screen.getByRole('button', { name: '继续修改' }));
  await user.type(screen.getByLabelText('修改要求'), '只调整布局');
  const trigger = screen.getByRole('button', { name: '全屏预览' });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'PNG · 第 1 次生成 · 候选 A · v1' });
  assert.ok(within(dialog).getByRole('toolbar', { name: '预览工具' }));
  await user.keyboard('{Escape}');
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.ok(document.activeElement === trigger);
  assert.equal(screen.getByLabelText('修改要求').value, '只调整布局');
  assert.ok(screen.getByRole('button', { name: '修改 A · v1' }));
});
test('Ctrl/Cmd+Enter submits only outside IME composition, ordinary Enter is a newline', async () => {
  let sends = 0; render(React.createElement(Harness, { onSend: () => { sends++; } }));
  const input = screen.getByLabelText('绘图要求');
  fireEvent.change(input, { target: { value: '研究绘图' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.keyDown(input, { key: 'Enter', metaKey: true, isComposing: true });
  assert.equal(sends, 0);
  fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
  assert.equal(sends, 1);
});
test('failed refinement can restore the exact target without starting a new execution', async () => {
  let initial = completed();
  for (const action of [{ type: 'REFINE', versionId: 'B' }, { type: 'EDIT_DRAFT', patch: { text: '修正图例颜色' } }, { type: 'BEGIN', runId: 'failed' }, { type: 'ACCEPT', taskId: 'a', runId: 'failed' }, { type: 'FINISH', taskId: 'a', runId: 'failed', error: '演示失败' }]) initial = workspaceReducer(initial, action);
  let sent = 0; render(React.createElement(Harness, { initial, onSend: () => { sent++; } }));
  const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: '恢复本次输入' }));
  assert.equal(screen.getByLabelText('修改要求').value, '修正图例颜色');
  assert.ok(screen.getByRole('button', { name: '修改 B · v1' })); assert.equal(sent, 0);
});
test('unconfirmed attachment purpose blocks send and is editable inline', async () => {
  let initial = newWorkspace('a'); initial = workspaceReducer(initial, { type: 'EDIT_DRAFT', patch: { text: '绘制机制图', attachments: [{ id: 'file', filename: 'example.png', purpose: '', status: 'local' }] } });
  render(React.createElement(Harness, { initial }));
  assert.equal(screen.getByRole('button', { name: '生成图像' }).disabled, true);
  await userEvent.setup().selectOptions(screen.getByLabelText('example.png 的用途'), 'reference');
  assert.equal(screen.getByRole('button', { name: '生成图像' }).disabled, false);
});
test('local scientific figure fixtures are valid SVG including text containing ampersands', () => {
  for (const shape of ['landscape', 'portrait']) for (const label of ['A', 'B', 'C']) for (const modified of [true, false]) {
    const svg = new window.DOMParser().parseFromString(sampleSvg(label, modified, shape), 'image/svg+xml');
    assert.ok(!svg.querySelector('parsererror'));
    assert.ok(svg.documentElement.textContent.includes('Figure & review'));
  }
});

test('leaderboard opens inside both sidebar sizes and returning retains the task draft',async()=>{
 const user=userEvent.setup();render(React.createElement(Harness));await user.type(screen.getByLabelText('绘图要求'),'keep me');
 await user.click(screen.getByRole('button',{name:'排行榜',exact:true}));assert.ok(screen.getByRole('heading',{name:'排行榜'}));assert.equal(screen.queryByRole('link',{name:'排行榜'}),null);
 await user.click(screen.getByRole('button',{name:'返回任务'}));assert.equal(screen.getByLabelText('绘图要求').value,'keep me');
 await user.click(screen.getByRole('button',{name:'收起侧边栏'}));await user.click(screen.getByRole('button',{name:'排行榜',exact:true}));assert.ok(screen.getByRole('heading',{name:'排行榜'}));
});

test('permanent deletion requires confirmation, cancellation is inert, failures stay visible and duplicate clicks are blocked',async()=>{
 const state=newWorkspace('delete-fixture');state.tasks[0].title='删除验收样例';state.tasks[0].branches.png.draft.text='fixture';
 let calls=0,finish;render(React.createElement(TaskWorkspace,{state,dispatch:()=>{},onDeleteTask:()=>{calls++;return new Promise((resolve,reject)=>{finish={resolve,reject};});}}));
 const open=()=>{fireEvent.click(screen.getByLabelText('删除验收样例 的操作'));fireEvent.click(screen.getByRole('button',{name:'删除',exact:true}));};
 open();assert.equal(calls,0);assert.ok(screen.getByText(/无法恢复/));assert.equal(screen.queryByRole('button',{name:'归档',exact:true}),null);
 fireEvent.click(screen.getByRole('button',{name:'取消',exact:true}));assert.equal(calls,0);assert.equal(screen.queryByRole('dialog',{name:'彻底删除任务'}),null);
 open();fireEvent.click(screen.getByRole('button',{name:'彻底删除',exact:true}));assert.equal(calls,1);assert.equal(screen.getByRole('button',{name:'正在彻底删除…'}).disabled,true);
 await act(async()=>{finish.reject(Error('清理未完成'));});assert.ok(screen.getByRole('alert'));assert.ok(screen.getByRole('dialog',{name:'彻底删除任务'}));
 fireEvent.click(screen.getByRole('button',{name:'彻底删除',exact:true}));assert.equal(calls,2);await act(async()=>{finish.resolve();});assert.equal(screen.queryByRole('dialog',{name:'彻底删除任务'}),null);
});
