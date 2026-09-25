import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import useFigureOperations from './useFigureOperations.js';
import OperationPanel from './OperationPanel.jsx';
import { documentContext, operationPending, readOperationPointers, returnedOperation, routeIdentity, saveOperationPointers, sameDocumentContext } from './operations.js';
import { createDocument } from '@paperbanana/figure-core';

const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage;
let api;
function Harness({ userId = 'account-a', identity = 'a:1' }) { api = useFigureOperations({ userId, identity }); return <output>{api.rows.map(row => `${row.requestId}:${row.status}`).join(',')}</output>; }
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; window.localStorage.clear(); });
const context = { id: 'document', revision: 4, sha256: 'a'.repeat(64) };
const payload = () => ({ requestId: crypto.randomUUID(), documentContext: context, materials: 'Synthetic material', mainRoute: { accessProvider: 'openai', modelId: 'fixture' }, apiKeys: { openai: 'synthetic-secret' } });
const response = (body, extra = {}) => ({ code: 0, operation: { requestId: body.requestId, kind: 'plan', status: 'succeeded', documentContext: context, providerCalls: [], result: { plan: { title: 'Synthetic', nodes: [], edges: [], notes: [] } }, ...extra } });

test('call records show shared TokenDance receipts without inventing per-call success or billing', () => {
  const row = response(payload(), { providerCalls: [
    { channel: 'tokendance', requestedModel: 'requested-fixture', actualModel: 'actual-fixture', requestId: 'provider-call-fixture', protocol: 'openai:chat-completions' },
    { channel: 'openai', model: 'native-fixture', status: 'unknown', billingStatus: 'unknown' },
  ] }).operation;
  const { container } = render(<OperationPanel rows={[row]} />);
  assert.match(container.textContent, /结构规划 · 结果已保存/);
  assert.match(container.textContent, /provider-call-fixture · 已保存渠道响应记录/);
  assert.match(container.textContent, /requested-fixture → actual-fixture/);
  assert.match(container.textContent, /调用结果待核对/);
  assert.match(container.textContent, /费用：以渠道账单核对/);
  assert.doesNotMatch(container.textContent, /状态未返回|调用完成|费用：未调用/);
});

for (const accessProvider of ['openai', 'runware', 'tokendance']) test(`${accessProvider} recovery uses the saved credential without offering a replacement key`, () => {
  const row = response(payload(), { status: 'blocked', result: undefined,
    mainRoute: { accessProvider, modelId: 'fixture', protocol: 'openai:chat-completions' },
    recovery: { canResume: true, requestState: 'rejected' },
  }).operation;
  const calls = [];
  const view = render(<OperationPanel rows={[row]} currentRouteIdentity={routeIdentity(row)} onResume={(...args) => calls.push(args)} />);
  assert.equal(Boolean(view.queryByRole('button', { name: '使用当前配置密钥恢复' })), false);
  assert.match(view.container.textContent, /原生渠道使用原操作保存的凭据/);
  assert.equal(calls.length, 0, 'rendering a recoverable row must not invoke anything');
  fireEvent.click(view.getByRole('button', { name: '恢复原操作' }));
  assert.deepEqual(calls, [[row, false]]);
});

test('only the same custom connection can explicitly replace its recovery key', () => {
  const row = response(payload(), { status: 'blocked', result: undefined,
    mainRoute: { accessProvider: 'custom', modelId: 'fixture', custom: { version: 1, connectionId: 'fixture-connection', baseUrl: 'https://fixture.example/v1', protocol: 'openai:chat-completions' } },
    recovery: { canResume: true, requestState: 'rejected' },
  }).operation;
  const calls = [], onResume = (...args) => calls.push(args);
  const view = render(<OperationPanel rows={[row]} currentRouteIdentity={routeIdentity(row)} onResume={onResume} />);
  fireEvent.click(view.getByRole('button', { name: '使用当前配置密钥恢复' }));
  assert.deepEqual(calls, [[row, true]]);
  for (const mainRoute of [
    { ...row.mainRoute, modelId: 'another-model' },
    { ...row.mainRoute, custom: { ...row.mainRoute.custom, baseUrl: 'https://another.example/v1' } },
    { ...row.mainRoute, custom: { ...row.mainRoute.custom, protocol: 'openai:responses' } },
  ]) {
    view.rerender(<OperationPanel rows={[row]} currentRouteIdentity={routeIdentity({ mainRoute })} onResume={onResume} />);
    assert.equal(Boolean(view.queryByRole('button', { name: '使用当前配置密钥恢复' })), false);
    assert.equal(view.getByRole('button', { name: '恢复原操作' }).disabled, false);
  }
  assert.equal(calls.length, 1);
});

test('custom replacement-key recovery still respects unknown outcomes, binding mismatches and retry delays', () => {
  const row = response(payload(), { status: 'blocked', result: undefined,
    mainRoute: { accessProvider: 'custom', modelId: 'fixture' },
    recovery: { canResume: true, requestState: 'rejected' },
  }).operation;
  const calls = [], props = { currentRouteIdentity: routeIdentity(row), onResume: (...args) => calls.push(args) };
  const view = render(<OperationPanel {...props} rows={[{ ...row, recovery: { ...row.recovery, retryAt: new Date(Date.now() + 60_000).toISOString() } }]} />);
  assert.equal(view.getByRole('button', { name: '使用当前配置密钥恢复' }).disabled, true);
  fireEvent.click(view.getByRole('button', { name: '使用当前配置密钥恢复' }));
  assert.equal(calls.length, 0);
  for (const change of [{ bindingMismatch: true }, { recovery: { ...row.recovery, requestState: 'unknown' } }]) {
    view.rerender(<OperationPanel {...props} rows={[{ ...row, ...change }]} />);
    assert.equal(Boolean(view.queryByRole('button', { name: '恢复原操作' })), false);
    assert.equal(Boolean(view.queryByRole('button', { name: '使用当前配置密钥恢复' })), false);
  }
});

test('operation pointers are account scoped and exclude credentials, materials and returned results', () => {
  const body = payload();
  saveOperationPointers('account-a', [{ ...body, kind: 'plan', createdAt: '2026-09-22', status: 'succeeded', result: { plan: { title: 'private-result' } } }], window.localStorage);
  const stored = window.localStorage.getItem(window.localStorage.key(0));
  assert.doesNotMatch(stored, /synthetic-secret|Synthetic material|private-result|apiKeys/);
  assert.equal(readOperationPointers('account-a', window.localStorage)[0].requestId, body.requestId);
  assert.deepEqual(readOperationPointers('account-b', window.localStorage), []);
});

test('same id and revision with different content has a different document binding', async () => {
  const doc = createDocument({ title: 'one' });
  const one = await documentContext(doc), two = await documentContext({ ...doc, title: 'two' });
  assert.equal(one.id, two.id); assert.equal(one.revision, two.revision);
  assert.equal(sameDocumentContext(one, two), false);
  assert.match(one.generationContextSha256, /^[a-f0-9]{64}$/);
  assert.equal(sameDocumentContext(one, { ...one, generationContextSha256: '0'.repeat(64) }), false, 'unchanged source cannot accept results generated under another official rule revision');
  assert.equal(sameDocumentContext(one, { ...one, generationContextSha256: undefined }), false, 'historical result without rule evidence cannot silently become a current plan');
  assert.throws(() => returnedOperation(response({ requestId: 'x'.repeat(16) }, { documentContext: two }), { requestId: 'x'.repeat(16), kind: 'plan', documentContext: one }), /内容不一致/);
});

test('only a read-only query can expose mismatched binding evidence and identity is always strict', () => {
  const body = payload(), expected = { requestId: body.requestId, kind: 'plan', documentContext: { ...context, generationContextSha256: 'b'.repeat(64) } };
  const reply = response(body, { status: 'blocked', result: undefined, failure: { message: 'Recorded timeout' }, recovery: { canResume: false, requestState: 'unknown', billingStatus: 'unknown' }, providerCalls: [{ channel: 'tokendance', status: 'unknown', billingStatus: 'unknown' }] });
  assert.throws(() => returnedOperation(reply, expected), /内容不一致/);
  const row = returnedOperation(reply, expected, { readOnlyQuery: true });
  assert.equal(row.bindingMismatch, true);
  assert.deepEqual(row.documentContext, expected.documentContext);
  assert.deepEqual(row.observedDocumentContext, context);
  assert.equal(row.failure.message, 'Recorded timeout');
  assert.equal(row.recovery.billingStatus, 'unknown');
  assert.equal(row.providerCalls.length, 1);
  for (const change of [{ requestId: crypto.randomUUID() }, { kind: 'edit' }]) assert.throws(() => returnedOperation({ ...reply, operation: { ...reply.operation, ...change } }, expected, { readOnlyQuery: true }), /原请求/);
});

test('mismatched query preserves the original pointer and unknown-fee protection without load or resume', async () => {
  globalThis.localStorage = window.localStorage;
  const body = payload(), binding = { ...context, generationContextSha256: 'b'.repeat(64) };
  saveOperationPointers('account-a', [{ ...body, kind: 'plan', documentContext: binding }]);
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(init.body); calls.push(request);
    return Response.json(response(request, { status: 'blocked', result: undefined, failure: { message: 'Recorded timeout' }, recovery: { canResume: true, requestState: 'unknown', billingStatus: 'unknown' }, providerCalls: [{ channel: 'tokendance', status: 'unknown', billingStatus: 'unknown' }] }));
  };
  render(<Harness />);
  await waitFor(() => assert.equal(api.rows[0]?.bindingMismatch, true));
  assert.equal(api.rows[0].status, 'blocked');
  assert.ok(operationPending(api.rows[0]));
  assert.equal(api.rows[0].acknowledged, false);
  assert.deepEqual(readOperationPointers('account-a')[0].documentContext, binding);
  await act(async () => { await api.resume(api.rows[0]); await api.resume({ ...api.rows[0], bindingMismatch: false, recovery: { canResume: true, requestState: 'rejected' } }); });
  await assert.rejects(() => api.start('plan', payload(), 'route'), /尚未确认/);
  const view = render(<OperationPanel rows={api.rows} />);
  assert.match(view.container.textContent, /Recorded timeout/);
  assert.match(view.container.textContent, /仅显示原操作状态/);
  assert.match(view.container.textContent, /费用：以渠道账单核对/);
  assert.equal(view.queryByRole('button', { name: '恢复原操作' }), null);
  view.rerender(<OperationPanel rows={[{ ...api.rows[0], status: 'succeeded', result: { plan: { title: 'Read only' } } }]} />);
  assert.equal(view.queryByRole('button', { name: '载入待确认方案' }), null);
  assert.deepEqual(calls.map(row => row.action), ['figureStudioOperation']);
});

test('lost submit response queries the same operation and never resubmits paid work', async () => {
  globalThis.localStorage = window.localStorage;
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body); calls.push(body);
    if (body.action === 'figureStudioPlan') throw new TypeError('synthetic lost response');
    return Response.json(response(body));
  };
  render(<Harness />); const body = payload();
  await act(async () => { await api.start('plan', body, 'route'); });
  assert.deepEqual(calls.map(row => row.action), ['figureStudioPlan', 'figureStudioOperation']);
  assert.equal(calls[1].requestId, body.requestId); assert.equal(calls[1].apiKeys, undefined);
  assert.equal(api.rows[0].status, 'succeeded');
});

test('refresh retrieves saved result without any plan/edit or resume call', async () => {
  globalThis.localStorage = window.localStorage;
  const body = payload(); saveOperationPointers('account-a', [{ ...body, kind: 'plan' }]);
  const calls = [];
  globalThis.fetch = async (_url, init) => { const request = JSON.parse(init.body); calls.push(request); return Response.json(response(request)); };
  render(<Harness />);
  await waitFor(() => assert.equal(api.rows[0]?.status, 'succeeded'));
  assert.deepEqual(calls.map(row => row.action), ['figureStudioOperation']);
});

test('unknown results keep submission protection and cannot be resumed', async () => {
  globalThis.localStorage = window.localStorage;
  const calls = [];
  globalThis.fetch = async (_url, init) => { const body = JSON.parse(init.body); calls.push(body); return Response.json(response(body, { status: 'blocked', result: undefined, recovery: { canResume: false, requestState: 'unknown' } })); };
  render(<Harness />);
  await act(async () => { await api.start('plan', payload(), 'route'); });
  assert.ok(operationPending(api.rows[0]));
  await act(async () => { await api.resume(api.rows[0], { openai: 'new-synthetic-key' }); });
  await assert.rejects(() => api.start('plan', payload(), 'route'), /尚未确认/);
  assert.equal(calls.length, 1);
  act(() => api.acknowledge(api.rows[0]));
  assert.equal(operationPending(api.rows[0]), false);
});

test('safe rejected operation resumes only explicitly, using same request id', async () => {
  globalThis.localStorage = window.localStorage;
  const calls = [];
  globalThis.fetch = async (_url, init) => { const body = JSON.parse(init.body); calls.push(body); return Response.json(response(body, body.action === 'figureStudioPlan' ? { status: 'blocked', result: undefined, recovery: { canResume: true, requestState: 'rejected' } } : {})); };
  render(<Harness />); const body = payload();
  await act(async () => { await api.start('plan', body, 'route'); });
  assert.equal(calls.length, 1);
  await act(async () => { await api.resume(api.rows[0], { openai: 'synthetic-replacement' }); });
  assert.deepEqual(calls.map(row => row.action), ['figureStudioPlan', 'figureStudioResume']);
  assert.equal(calls[1].requestId, body.requestId);
  assert.equal(api.rows[0].status, 'succeeded');
});

test('account switch isolates a late completed operation and keeps its recovery pointer only under the old account', async () => {
  globalThis.localStorage = window.localStorage;
  let resolve; globalThis.fetch = async (_url, init) => new Promise(done => { resolve = () => done(Response.json(response(JSON.parse(init.body)))); });
  const view = render(<Harness />); let pending;
  act(() => { pending = api.start('plan', payload(), 'route'); });
  view.rerender(<Harness userId="account-b" identity="b:2" />);
  await act(async () => { resolve(); await pending; });
  assert.deepEqual(api.rows, []);
  assert.equal(readOperationPointers('account-a').length, 1);
  assert.equal(readOperationPointers('account-b').length, 0);
});

test('a preflight not-sent failure stays distinct on refresh and does not turn into an uncertain paid operation', async () => {
  globalThis.localStorage = window.localStorage;
  const calls = [];
  globalThis.fetch = async (_url, init) => { calls.push(JSON.parse(init.body)); return Response.json({ code: 400, error: 'Synthetic preflight rejection', requestState: 'not_sent' }); };
  const view = render(<Harness />);
  await act(async () => { await api.start('plan', payload(), 'route'); });
  assert.equal(api.rows[0].recovery.requestState, 'not_sent');
  assert.equal(operationPending(api.rows[0]), false);
  view.unmount(); render(<Harness />);
  assert.equal(api.rows[0].recovery.requestState, 'not_sent');
  assert.equal(calls.length, 1);
});
