import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorkspace, workspaceReducer as reduce, currentTask, currentBranch, currentDraft, selectedVersion, refinementTarget, activeRun } from './workspaceState.js';

const act = (s, type, data = {}) => reduce(s, { type, ...data });
function generated() {
  let s = newWorkspace('task-a');
  s = act(s, 'EDIT_DRAFT', { patch: { text: '画一个研究流程' } });
  s = act(s, 'BEGIN', { runId: 'run-1' });
  s = act(s, 'ACCEPT', { taskId: 'task-a', runId: 'run-1' });
  for (const [id, label] of [['a', 'A'], ['b', 'B']]) s = act(s, 'RESULT', { taskId: 'task-a', runId: 'run-1', candidateId: id, label, version: { id: `${id}-v1`, url: '/fixture.png', format: 'png' } });
  return act(s, 'FINISH', { taskId: 'task-a', runId: 'run-1' });
}
test('task, path, mode and target drafts stay independent', () => {
  let s = generated();
  s = act(s, 'EDIT_DRAFT', { patch: { text: 'PNG 草稿' } });
  s = act(s, 'SET_PATH', { path: 'svg' });
  assert.equal(currentDraft(s).text, '');
  s = act(s, 'EDIT_DRAFT', { patch: { text: 'SVG 草稿' } });
  s = act(s, 'CREATE_TASK', { id: 'task-b' });
  s = act(s, 'EDIT_DRAFT', { patch: { text: '另一任务' } });
  s = act(s, 'SELECT_TASK', { id: 'task-a' });
  assert.equal(currentDraft(s).text, 'SVG 草稿');
  s = act(s, 'SET_PATH', { path: 'png' });
  assert.equal(currentDraft(s).text, 'PNG 草稿');
});
test('browsing A never replaces the explicit B target, target drafts are not carried over', () => {
  let s = act(generated(), 'REFINE', { versionId: 'b-v1' });
  s = act(s, 'EDIT_DRAFT', { patch: { text: '只修改 B 配色' } });
  s = act(s, 'VIEW', { versionId: 'a-v1' });
  assert.equal(selectedVersion(s).id, 'a-v1');
  assert.equal(refinementTarget(s).id, 'b-v1');
  s = act(s, 'REFINE', { versionId: 'a-v1' });
  assert.equal(currentDraft(s).text, '');
  s = act(s, 'REFINE', { versionId: 'b-v1' });
  assert.equal(currentDraft(s).text, '只修改 B 配色');
  s = act(s, 'SET_PATH', { path: 'svg' });
  s = act(s, 'SET_PATH', { path: 'png' });
  assert.equal(refinementTarget(s), null);
  assert.equal(currentBranch(s).lastTargetId, 'b-v1');
});
test('submission reserves one local slot across paths; snapshot remains immutable', () => {
  let s = generated();
  s = act(s, 'REFINE', { versionId: 'b-v1' });
  s = act(s, 'EDIT_DRAFT', { patch: { text: '改蓝色' } });
  s = act(s, 'BEGIN', { runId: 'run-2' });
  s = act(s, 'EDIT_DRAFT', { patch: { text: '新草稿' } });
  assert.equal(activeRun(s).input.text, '改蓝色');
  s = act(s, 'SET_PATH', { path: 'svg' });
  s = act(s, 'EDIT_DRAFT', { patch: { text: '另画矢量方案' } });
  s = act(s, 'BEGIN', { runId: 'run-3' });
  assert.equal(currentTask(s).runs.length, 2);
  assert.equal(activeRun(s).id, 'run-2');
});
test('a late acceptance does not erase a newer draft or change the current branch', () => {
  let s = newWorkspace('a');
  s = act(s, 'EDIT_DRAFT', { patch: { text: '原始需求' } });
  s = act(s, 'BEGIN', { runId: 'r' });
  s = act(s, 'EDIT_DRAFT', { patch: { text: '下一条要求' } });
  s = act(s, 'SET_PATH', { path: 'svg' });
  s = act(s, 'ACCEPT', { taskId: 'a', runId: 'r' });
  assert.equal(currentTask(s).path, 'svg');
  assert.equal(currentTask(s).branches.png.draft.text, '下一条要求');
});
test('a refinement appends to its candidate and preserves parent, without stealing a different view', () => {
  let s = act(generated(), 'REFINE', { versionId: 'b-v1' });
  s = act(s, 'EDIT_DRAFT', { patch: { text: '调整文字' } });
  s = act(s, 'BEGIN', { runId: 'r2' });
  s = act(s, 'ACCEPT', { taskId: 'task-a', runId: 'r2' });
  s = act(s, 'VIEW', { versionId: 'a-v1' });
  s = act(s, 'RESULT', { taskId: 'task-a', runId: 'r2', version: { id: 'b-v2', format: 'png', url: '/new.png' } });
  s = act(s, 'FINISH', { taskId: 'task-a', runId: 'r2' });
  assert.equal(selectedVersion(s).id, 'a-v1');
  const branch = currentBranch(s);
  assert.equal(branch.groups.length, 1);
  assert.equal(branch.groups[0].candidates.find(c => c.id === 'b').versions[1].parentId, 'b-v1');
  assert.equal(branch.unreadVersionId, 'b-v2');
});
test('background result cannot switch task, terminal failure keeps saved candidates', () => {
  let s = generated();
  s = act(s, 'EDIT_DRAFT', { patch: { text: '再生成' } });
  s = act(s, 'BEGIN', { runId: 'r2' });
  s = act(s, 'ACCEPT', { taskId: 'task-a', runId: 'r2' });
  s = act(s, 'CREATE_TASK', { id: 'task-b' });
  s = act(s, 'RESULT', { taskId: 'task-a', runId: 'r2', candidateId: 'new-a', label: 'A', version: { id: 'new-v1', format: 'png', url: '/new.png' } });
  s = act(s, 'FINISH', { taskId: 'task-a', runId: 'r2', error: '候选 B 失败' });
  assert.equal(s.selectedTaskId, 'task-b');
  const t = s.tasks.find(t => t.id === 'task-a');
  assert.equal(t.activeRunId, null);
  assert.equal(t.branches.png.groups[1].candidates[0].versions.length, 1);
});
test('file completion is attached to the original task, path and target after navigating away', () => {
  let s = act(generated(), 'REFINE', { versionId: 'b-v1' });
  s = act(s, 'CREATE_TASK', { id: 'task-b' });
  s = act(s, 'ADD_ATTACHMENTS', { taskId: 'task-a', path: 'png', draftTargetId: 'b-v1', attachments: [{ id: 'file', filename: 'paper.pdf', purpose: 'research', status: 'local' }] });
  assert.equal(currentDraft(s).attachments.length, 0);
  assert.equal(s.tasks.find(t => t.id === 'task-a').branches.png.refinements['b-v1'].attachments[0].filename, 'paper.pdf');
});
test('automatic title tracks full draft until submission; explicit title never changes', () => {
  let s = newWorkspace('a');
  for (const text of ['研', '研究', '研究方法']) s = act(s, 'EDIT_DRAFT', { patch: { text } });
  assert.equal(currentTask(s).title, '研究方法');
  s = act(s, 'RENAME', { title: '我的标题' }); s = act(s, 'EDIT_DRAFT', { patch: { text: '新内容' } });
  assert.equal(currentTask(s).title, '我的标题');
});
test('creating repeatedly does not multiply empty sidebar tasks', () => {
  let s = newWorkspace('a'); s = act(s, 'CREATE_TASK', { id: 'b' }); s = act(s, 'CREATE_TASK', { id: 'c' });
  assert.equal(s.tasks.length, 1);
});
test('supplements and setting-only drafts are preserved as separate tasks', () => {
  for (const patch of [{ caption: '研究流程图' }, { avoid: '不要装饰边框' }, { settings: { ...currentDraft(newWorkspace()).settings, simple: { ratio: '16:9', candidates: 1, reviews: 1 } } }]) {
    let s = act(newWorkspace('a'), 'EDIT_DRAFT', { patch });
    s = act(s, 'CREATE_TASK', { id: 'b' });
    assert.equal(s.tasks.length, 2);
    assert.equal(currentTask(s).id, 'b');
    s = act(s, 'SELECT_TASK', { id: 'a' });
    for (const [key, value] of Object.entries(patch)) assert.deepEqual(currentDraft(s)[key], value);
  }
});
test('restoring failed input cannot overwrite newer settings or attachments with unchanged text', () => {
  let s = act(generated(), 'EDIT_DRAFT', { patch: { text: '新方案' } });
  s = act(s, 'BEGIN', { runId: 'failed' }); s = act(s, 'ACCEPT', { taskId: 'task-a', runId: 'failed' });
  s = act(s, 'FINISH', { taskId: 'task-a', runId: 'failed', error: '失败' });
  s = act(s, 'EDIT_DRAFT', { patch: { mode: 'advanced', attachments: [{ id: 'new-file', status: 'local', purpose: 'research' }] } });
  const unchanged = act(s, 'RESTORE_RUN', { runId: 'failed' });
  assert.deepEqual(unchanged, s);
});
test('copying branch requirements cannot replace a newly attached file or supplement', () => {
  let s = act(generated(), 'EDIT_DRAFT', { patch: { caption: '本轮指定图注', attachments: [{ id: 'new-file', status: 'local', purpose: 'research' }] } });
  s = act(s, 'SET_PATH', { path: 'svg' });
  s = act(s, 'EDIT_DRAFT', { patch: { avoid: '本路径排除要求' } });
  assert.deepEqual(act(s, 'COPY_REQUIREMENTS'), s);
});
test('failure restores untouched refinement draft but never overwrites a newer one', () => {
  let s = act(generated(), 'REFINE', { versionId: 'b-v1' });
  s = act(s, 'EDIT_DRAFT', { patch: { text: '只改颜色' } });
  s = act(s, 'BEGIN', { runId: 'retry' }); s = act(s, 'ACCEPT', { taskId: 'task-a', runId: 'retry' });
  const failed = act(s, 'FINISH', { taskId: 'task-a', runId: 'retry', error: '模型返回失败' });
  assert.equal(currentBranch(failed).refinements['b-v1'].text, '只改颜色');
  assert.equal(activeRun(failed), null);
  s = act(s, 'REFINE', { versionId: 'b-v1' }); s = act(s, 'EDIT_DRAFT', { patch: { text: '新的修改要求' } });
  s = act(s, 'FINISH', { taskId: 'task-a', runId: 'retry', error: '模型返回失败' });
  assert.equal(currentDraft(s).text, '新的修改要求');
});
