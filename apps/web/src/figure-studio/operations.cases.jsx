import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import useFigureOperations from './useFigureOperations.js';
import { documentContext, operationPending, readOperationPointers, returnedOperation, saveOperationPointers, sameDocumentContext } from './operations.js';
import { createDocument } from '@paperbanana/figure-core';

const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage;
let api;
function Harness({ userId = 'account-a', identity = 'a:1' }) { api = useFigureOperations({ userId, identity }); return <output>{api.rows.map(row => `${row.requestId}:${row.status}`).join(',')}</output>; }
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; window.localStorage.clear(); });
const context = { id: 'document', revision: 4, sha256: 'a'.repeat(64) };
const payload = () => ({ requestId: crypto.randomUUID(), documentContext: context, materials: 'Synthetic material', mainRoute: { accessProvider: 'openai', modelId: 'fixture' }, apiKeys: { openai: 'synthetic-secret' } });
const response = (body, extra = {}) => ({ code: 0, operation: { requestId: body.requestId, kind: 'plan', status: 'succeeded', documentContext: context, providerCalls: [], result: { plan: { title: 'Synthetic', nodes: [], edges: [], notes: [] } }, ...extra } });

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
  assert.throws(() => returnedOperation(response({ requestId: 'x'.repeat(16) }, { documentContext: two }), { requestId: 'x'.repeat(16), kind: 'plan', documentContext: one }), /内容不一致/);
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
