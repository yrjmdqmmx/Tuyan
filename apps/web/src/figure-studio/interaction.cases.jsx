import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { connectorEndpoints, createExampleDocument } from '@paperbanana/figure-core';
import FigureCanvas from './FigureCanvas.jsx';
import { EditPanel } from './ModelPanel.jsx';
import RulesPanel from './RulesPanel.jsx';
import Inspector from './Inspector.jsx';
import ExportDialog from './ExportDialog.jsx';
afterEach(cleanup);

test('read-only canvas cannot select or submit pointer modifications', () => {
  let selections = 0; let commands = 0;
  const { container } = render(<FigureCanvas document={createExampleDocument()} selectedId={null} onSelect={() => selections++} onCommands={() => commands++} readOnly />);
  const object = container.querySelector('[data-element-id]');
  fireEvent.pointerDown(object, { button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(object, { clientX: 60, clientY: 50 });
  fireEvent.pointerUp(object);
  assert.equal(selections, 0); assert.equal(commands, 0);
});

test('model edit requires an existing selected object and stale proposals cannot apply', () => {
  const props = { instruction: '字号改为7pt', setInstruction() {}, busy: false, onEdit() {}, onApply() {}, onDismiss() {}, revision: 3 };
  const view = render(<EditPanel {...props} selected={null} patch={null} />);
  assert.equal(screen.getByRole('button', { name: '提出修改方案' }).disabled, true);
  view.rerender(<EditPanel {...props} selected={{ id: 'text', type: 'text', text: '标题' }} patch={{ baseRevision: 2, commands: [{ type: 'update', id: 'text', patch: { fontSize: 7 } }] }} />);
  assert.equal(screen.getByRole('button', { name: '提出修改方案' }).disabled, false);
  assert.equal(screen.getByRole('button', { name: '确认应用' }).disabled, true);
});

test('official baseline problems remain visible after user relaxes a working threshold', () => {
  const document = createExampleDocument();
  document.elements.find((item) => item.type === 'text').fontSize = 10;
  document.ruleOverrides['text-size'] = { value: { min: 5, max: 12 } };
  render(<RulesPanel document={document} onCommands={() => {}} />);
  assert.ok(screen.getAllByText('需调整').length > 0);
  fireEvent.click(screen.getByRole('button', { name: /我的工作规则/ }));
  assert.equal(screen.queryAllByText('需调整').length, 0);
  fireEvent.click(screen.getByRole('button', { name: '官方基线' }));
  assert.ok(screen.getAllByText('需调整').length > 0);
});

test('working-rule editor supports adding and removing a custom DPI requirement', () => {
  const document = createExampleDocument();
  const calls = [];
  const view = render(<RulesPanel document={document} onCommands={(commands) => { calls.push(commands); return true; }} />);
  fireEvent.click(screen.getByRole('button', { name: /我的工作规则/ }));
  fireEvent.click(screen.getByRole('button', { name: '调整工作规则' }));
  fireEvent.change(screen.getByLabelText('名称'), { target: { value: '课题组最低清晰度' } });
  fireEvent.click(screen.getByRole('button', { name: '添加此工作规则' }));
  assert.equal(calls[0][0].type, 'custom-rule');
  assert.equal(calls[0][0].rule.kind, 'min-dpi');
  assert.equal(calls[0][0].rule.value, 450);
  assert.equal(calls[0][0].rule.label, '课题组最低清晰度');
  view.rerender(<RulesPanel document={{ ...document, customRules: [calls[0][0].rule] }} onCommands={(commands) => { calls.push(commands); return true; }} />);
  fireEvent.click(screen.getByRole('button', { name: '删除自定义项' }));
  assert.equal(calls[1][0].type, 'remove-custom-rule');
  assert.equal(calls[1][0].id, calls[0][0].rule.id);
});

test('bound connector inspection uses visible endpoints and detaching preserves their geometry', () => {
  const document = createExampleDocument();
  const line = document.elements.find((item) => item.type === 'arrow');
  const endpoints = connectorEndpoints(line, document.elements);
  let submitted;
  render(<Inspector document={document} selectedId={line.id} onCommands={(commands) => { submitted = commands; }} onDelete={() => {}} />);
  const x1 = screen.getByLabelText('X1 / mm');
  assert.equal(x1.disabled, true);
  assert.equal(Number(x1.value), Math.round(endpoints.x1 * 100) / 100);
  fireEvent.change(screen.getByLabelText('起点连接对象'), { target: { value: '' } });
  assert.equal(submitted[0].patch.fromId, null);
  assert.equal(submitted[0].patch.x1, endpoints.x1);
  assert.equal(submitted[0].patch.y1, endpoints.y1);
});

test('font editor accepts an installed font name rather than silently replacing the selection', () => {
  const document = createExampleDocument();
  const text = document.elements.find((item) => item.type === 'text');
  let submitted;
  render(<Inspector document={document} selectedId={text.id} onCommands={(commands) => { submitted = commands; }} onDelete={() => {}} />);
  const font = screen.getByLabelText('字体');
  fireEvent.change(font, { target: { value: 'Arial Unicode MS' } });
  fireEvent.blur(font);
  assert.equal(submitted[0].patch.fontFamily, 'Arial Unicode MS');
});

test('panel edit shows its expanded scope and blocks over-limit requests', () => {
  const props = { instruction: '向右移动5mm', setInstruction() {}, selected: { id: 'panel', type: 'panel' }, busy: false, onEdit() {}, onApply() {}, onDismiss() {}, revision: 0 };
  const view = render(<EditPanel {...props} scope={{ relatedCount: 3, objectIds: ['panel', 'a', 'b', 'c'], error: '' }} />);
  assert.match(screen.getByText(/编辑作用域/).textContent, /3 个相关子对象，共 4 个对象/);
  view.rerender(<EditPanel {...props} scope={{ relatedCount: 40, objectIds: Array.from({ length: 41 }, (_, index) => String(index)), error: '超过单次 40 个对象的限制，尚未发送请求。' }} />);
  assert.equal(screen.getByRole('button', { name: '提出修改方案' }).disabled, true);
  assert.match(screen.getByRole('alert').textContent, /尚未发送请求/);
});

test('an SVG report becomes stale after importing changed content with the same document ID and revision', async () => {
  const source = createExampleDocument();
  const anchorClick = window.HTMLAnchorElement.prototype.click;
  window.HTMLAnchorElement.prototype.click = () => {};
  try {
    const props = { open: true, onClose() {}, capabilities: null, saveSource() {} };
    const view = render(<ExportDialog {...props} document={source} />);
    fireEvent.click(screen.getByRole('button', { name: 'SVG' }));
    await waitFor(() => assert.ok(screen.getByRole('region', { name: '导出文件检查报告' })));
    assert.equal(screen.queryByText(/当前图稿内容已改变/), null);
    view.rerender(<ExportDialog {...props} document={{ ...source, title: 'Changed source with same revision' }} />);
    assert.ok(screen.getByText(/即使文档编号与版本号相同/));
  } finally { window.HTMLAnchorElement.prototype.click = anchorClick; }
});
