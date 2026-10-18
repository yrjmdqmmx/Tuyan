import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React from 'react';
import { cleanup, fireEvent, render, screen, within, act } from '@testing-library/react';
import WorkspaceTemplates from '../src/workspace/WorkspaceTemplates.jsx';
import GuidePanel from '../src/components/GuidePanel.jsx';
import AdminWorkspace from '../src/components/admin/AdminWorkspace.jsx';
import { FEATURED_TEMPLATE_REFERENCE_IDS } from '../src/lib/featuredTemplates.js';

const originalFetch = globalThis.fetch;
window.scrollTo = () => {};
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });

test('workspace template browsing and dismissal never apply a template; explicit use applies the selected content once', async () => {
  const requests = [], applied = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return Response.json({ code: 0, references: FEATURED_TEMPLATE_REFERENCE_IDS.map(id => ({ id, imageUrl: `https://example.test/${id}.png`, attribution: `Verified source ${id}`, license: { url: 'https://example.test/license' } })) });
  };
  render(React.createElement(WorkspaceTemplates, { onApply: template => applied.push(template) }));
  await screen.findByRole('img', { name: '统计对比面板参考图' });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '统计' } });
  assert.equal(screen.getAllByRole('article').length, 1);
  fireEvent.click(screen.getByRole('button', { name: '预览统计对比面板' }));
  assert.ok(within(screen.getByRole('dialog')).getByText(/教学示意任务/));
  assert.deepEqual(applied, []);
  fireEvent.click(screen.getByRole('button', { name: '关闭统计对比面板' }));
  assert.deepEqual(applied, []);
  fireEvent.click(screen.getByRole('button', { name: '预览统计对比面板' }));
  fireEvent.click(screen.getByRole('button', { name: '使用模板新建任务' }));
  assert.equal(applied.length, 1);
  assert.equal(applied[0].id, 'statistical-comparison');
  assert.match(applied[0].methodContent, /未给出时列明缺失项/);
  assert.deepEqual(requests.map(request => request.action), ['referenceLibrary']);
});

test('workspace guide describes separate tasks, version retention and actual model/settings entries', () => {
  render(React.createElement(GuidePanel, { workspace: true }));
  assert.equal(screen.queryByRole('heading', { name: '从研究内容到可核对的图示' }), null);
  assert.ok(screen.getByText(/使用模板会创建独立任务/));
  assert.ok(screen.getByText(/PNG 与 SVG 是同一任务内的两条独立分支/));
  assert.ok(screen.getByText(/手工编辑保存为新版本，原版本保留/));
  assert.ok(screen.getByText(/“模型配置”和“绘图设置”/));
  assert.doesNotMatch(document.body.textContent, /套用模板会替换方法|Key 仅保留页面内存|等待选择/);
});

test('embedded administration keeps section navigation and read filters without a second page title or URL changes', async () => {
  const actions = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body); actions.push(request.action);
    return Response.json(request.action === 'adminOverview' ? { code: 0, users: { available: true, total: 4, registered: 1 }, tasks: { available: true, total: 2, counts: {}, successRate: null }, community: { available: true, pending: 0 }, asOf: new Date().toISOString() } : { code: 0, rows: [], pagination: { page: 1, pageSize: 20, total: 0 } });
  };
  const before = window.location.href;
  render(React.createElement(AdminWorkspace, { embedded: true, apiBase: 'http://fixture.test' }));
  await screen.findByRole('button', { name: /用户总数 4/ });
  assert.equal(screen.queryByRole('heading', { level: 1 }), null);
  fireEvent.click(within(screen.getByRole('navigation', { name: '后台导航' })).getByRole('button', { name: '近期任务' }));
  await screen.findByText('没有符合条件的记录');
  fireEvent.change(screen.getByLabelText('执行状态'), { target: { value: 'failed' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '应用筛选' })); });
  assert.equal(window.location.href, before);
  assert.ok(actions.every(action => ['adminOverview', 'adminTaskList'].includes(action)));
});
