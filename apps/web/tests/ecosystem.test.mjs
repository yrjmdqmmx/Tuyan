import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { parseTable, exampleTable } from '../src/ecosystem/data.js';
import { renderEcosystem, isolatedHtml } from '../src/ecosystem/client.js';
import ResearchEcosystem from '../src/ecosystem/ResearchEcosystem.jsx';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import { newWorkspace } from '../src/workspace/workspaceState.js';

afterEach(cleanup);
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const svgResult = { tool: 'semiotic', format: 'svg', base64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'), engineVersion: '3.12.1' };
test('table parser retains quoted commas, multiline cells, Unicode and numeric values; rejects malformed/excess input', () => {
  const table = parseTable('name,value\r\n"研究,甲",1.25\r\n"two\nlines",-2e3');
  assert.equal(table.rows[0].name, '研究,甲'); assert.equal(table.rows[1].name, 'two\nlines'); assert.equal(table.rows[1].value, -2000);
  assert.deepEqual(table.numeric, ['value']);
  assert.equal(parseTable('name\tvalue\n研究,甲\t3').rows[0].name, '研究,甲');
  assert.equal(parseTable('name,value\n研究\t甲,3').rows[0].name, '研究\t甲');
  assert.equal(parseTable(exampleTable('sankey')).rows.length, 6);
  for (const bad of ['a,a\n1,2', 'a,b\n1', 'a,b\n"bad,2', '{"a":1}', '[{"x":{}}]', '[{"__proto__":1}]', JSON.stringify(Array.from({ length: 5001 }, () => ({ x: 1 })))]) assert.throws(() => parseTable(bad));
});
test('API uses account session, fixed endpoint and cancellation; HTML cannot access parent origin or network', async () => {
  let sent;
  const result = await renderEcosystem({ base: 'https://api.example/', userId: 'A', payload: { tool: 'semiotic' }, fetcher: async (...args) => { sent = args; return Response.json(svgResult); } });
  assert.equal(sent[0], 'https://api.example/api/ecosystem/render'); assert.equal(sent[1].credentials, 'include'); assert.equal(sent[1].headers['X-Workspace-Account'], 'A'); assert.equal(result.format, 'svg');
  await assert.rejects(renderEcosystem({ userId: '', payload: {} }));
  const html = isolatedHtml({ base64: Buffer.from('<html><head></head><body>交互图表</body></html>').toString('base64') });
  assert.match(html, /connect-src 'none'/); assert.match(html, /frame-src 'none'/); assert.match(html, /交互图表/);
});
test('all three tools share one entry; real input and selected fields are passed once', async () => {
  const calls = [];
  render(React.createElement(ResearchEcosystem, { account: { user: { id: 'A' } }, request: async value => { calls.push(value); return svgResult; } }));
  assert.equal(screen.getAllByRole('article').length, 3);
  fireEvent.click(screen.getByRole('button', { name: '打开交互图表与关系图' }));
  fireEvent.change(screen.getByRole('textbox', { name: '表格数据' }), { target: { value: 'time,measurement\n1,12\n2,18' } });
  fireEvent.click(screen.getByRole('button', { name: '生成可视化' }));
  await screen.findByRole('img', { name: 'semiotic 可视化结果' });
  assert.equal(calls.length, 1); assert.equal(calls[0].payload.data[1].measurement, 18);
  assert.equal(calls[0].payload.options.x, 'time'); assert.equal(calls[0].payload.options.y, 'measurement');
  assert.equal('title' in calls[0].payload.options, false);
  assert.ok(screen.getByRole('button', { name: '下载 SVG' }));
});
test('switching tool aborts work and cannot display a late result; guest action opens login', async () => {
  let resolve, signal;
  const view = render(React.createElement(ResearchEcosystem, { account: { user: { id: 'A' } }, request: value => { signal = value.signal; return new Promise(done => { resolve = done; }); } }));
  fireEvent.click(screen.getByRole('button', { name: '打开交互图表与关系图' })); fireEvent.click(screen.getByRole('button', { name: '载入示例' })); fireEvent.click(screen.getByRole('button', { name: '生成可视化' }));
  fireEvent.click(screen.getByRole('button', { name: 'VizNoir' })); assert.equal(signal.aborted, true);
  await act(async () => resolve(svgResult)); assert.equal(screen.queryByRole('img', { name: 'semiotic 可视化结果' }), null);
  view.unmount(); let login = 0;
  render(React.createElement(ResearchEcosystem, { account: { onSignIn: () => login++ } }));
  fireEvent.click(screen.getByRole('button', { name: '打开交互数据探索' })); fireEvent.click(screen.getByRole('button', { name: '登录后使用' })); assert.equal(login, 1);
});
test('sidebar and rail place ecosystem directly after leaderboard without changing draft', () => {
  const state = newWorkspace(); state.tasks[0].branches.png.draft.text = '保留原科研需求';
  render(React.createElement(TaskWorkspace, { state, dispatch() {}, onSubmit() {}, onFiles() {}, renderPage: page => React.createElement('p', null, `${page}内容`) }));
  const nav = screen.getByRole('navigation', { name: '常用功能' });
  const buttons = within(nav).getAllByRole('button').map(el => el.textContent);
  assert.equal(buttons[buttons.indexOf('排行榜') + 1], '他山科研生态');
  fireEvent.click(within(nav).getByRole('button', { name: '他山科研生态' })); assert.ok(screen.getByText('他山科研生态内容'));
  fireEvent.click(screen.getByRole('button', { name: '返回任务' })); assert.equal(screen.getByRole('textbox', { name: '绘图要求' }).value, '保留原科研需求');
  fireEvent.click(screen.getByRole('button', { name: '收起侧边栏' }));
  const rail = screen.getByRole('navigation', { name: '常用功能' }); const labels = within(rail).getAllByRole('button').map(el => el.getAttribute('aria-label'));
  assert.equal(labels[labels.indexOf('排行榜') + 1], '他山科研生态');
});

test('account change clears imported research data and any completed result', async () => {
  const request = async () => svgResult;
  const view = render(React.createElement(ResearchEcosystem, {account:{user:{id:'A'}},request}));
  fireEvent.click(screen.getByRole('button',{name:'打开交互图表与关系图'}));
  fireEvent.click(screen.getByRole('button',{name:'载入示例'}));
  fireEvent.click(screen.getByRole('button',{name:'生成可视化'}));
  await screen.findByRole('button',{name:'下载 SVG'});
  view.rerender(React.createElement(ResearchEcosystem,{account:{user:{id:'B'}},request}));
  assert.equal(screen.getByRole('textbox',{name:'表格数据'}).value,'');
  assert.equal(screen.queryByRole('button',{name:'下载 SVG'}),null);
});

test('successful mesh render discovers fields; switching field requests a new render', async () => {
  const calls=[];
  render(React.createElement(ResearchEcosystem,{account:{user:{id:'A'}},request:async value=>{
    calls.push(value.payload);
    return {...svgResult,tool:'viznoir',format:'png',summary:{field:'pressure',availableFields:[{name:'pressure'},{name:'temperature'}]}};
  }}));
  fireEvent.click(screen.getByRole('button',{name:'打开三维科研渲染'}));
  fireEvent.click(screen.getByRole('button',{name:'载入示例'}));
  fireEvent.click(screen.getByRole('button',{name:'开始渲染'}));
  const selector=await screen.findByRole('combobox',{name:/着色字段/});
  fireEvent.change(selector,{target:{value:'temperature'}});
  assert.equal(screen.queryByRole('button',{name:'下载 PNG'}),null);
  fireEvent.click(screen.getByRole('button',{name:'开始渲染'}));
  await screen.findByRole('button',{name:'下载 PNG'});
  assert.equal(calls.length,2);assert.equal(calls[1].options.field,'temperature');
});
