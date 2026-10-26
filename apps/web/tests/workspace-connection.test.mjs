import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import React from 'react';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import useWorkspaceExecution from '../src/workspace/useWorkspaceExecution.js';
import useBackendRegistry from '../src/hooks/useBackendRegistry.js';
import WorkspaceStatus from '../src/workspace/WorkspaceStatus.jsx';
import { newWorkspace } from '../src/workspace/workspaceState.js';

afterEach(cleanup);
const healthy = { code: 0, ok: true, runtime: 'gateway', executionEnabled: true, executionMode: 'production', workspaceExecutionContractVersion: 1 };
const options = overrides => ({ stateRef: { current: newWorkspace('connection-test') }, dispatch() {}, sync: {}, models: {}, userId: 'synthetic-owner', base: 'https://offline-fixture.invalid', ...overrides });

test('a signed-in workspace recovers on reconnect without reloading, modifying drafts or submitting a task', async t => {
  const requests = [], actions = [];
  const input = options({ dispatch: action => actions.push(action) });
  const originalState = structuredClone(input.stateRef.current);
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    requests.push({ url, method: request?.method || 'GET' });
    if (requests.length === 1) throw TypeError('Failed to fetch');
    return Response.json(healthy);
  });
  const { result } = renderHook(() => useWorkspaceExecution(input));
  await waitFor(() => assert.ok(result.current.error));
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => assert.equal(result.current.health?.ok, true));
  assert.equal(result.current.error, '');
  assert.equal(result.current.healthError, '');
  assert.deepEqual(input.stateRef.current, originalState);
  assert.deepEqual(actions, []);
  assert.deepEqual(requests.map(r => r.method), ['GET', 'GET']);
});

test('returning to a visible page retries failed model-service health before loading its catalog', async () => {
  let healthCalls = 0, catalogCalls = 0;
  const config = { refreshMs: 0, readHealth: async () => {
    if (++healthCalls === 1) throw TypeError('Failed to fetch');
    return healthy;
  }, readRegistry: async () => { catalogCalls++; return { providers: {} }; } };
  const { result } = renderHook(() => useBackendRegistry('https://offline-fixture.invalid', config));
  await waitFor(() => assert.ok(result.current.healthError));
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await waitFor(() => assert.equal(result.current.registryStatus, 'ready'));
  assert.equal(result.current.healthError, '');
  assert.equal(healthCalls, 2);
  assert.equal(catalogCalls, 1);
});

test('connection recovery preserves a separate account or task error', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    if (++calls === 1) throw TypeError('Failed to fetch');
    return Response.json(healthy);
  });
  const input = options({ userId: '' });
  const { result } = renderHook(() => useWorkspaceExecution(input));
  await waitFor(() => assert.ok(result.current.error));
  await act(() => result.current.submit());
  const accountError = result.current.error;
  assert.match(accountError, /请先登录/);
  act(() => window.dispatchEvent(new Event('pageshow')));
  await waitFor(() => assert.equal(result.current.health?.ok, true));
  assert.equal(result.current.error, accountError);
  assert.equal(result.current.healthError, '');
});

test('reconnect also recovers a catalog that failed after the health check succeeded', async () => {
  let calls = 0, finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const config = { refreshMs: 0, readHealth: async () => healthy, readRegistry: async () => {
    if (++calls === 1) throw TypeError('Failed to fetch');
    return pending;
  } };
  const { result } = renderHook(() => useBackendRegistry('https://offline-fixture.invalid', config));
  await waitFor(() => assert.equal(result.current.registryStatus, 'error'));
  act(() => {
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('pageshow'));
  });
  await waitFor(() => assert.equal(calls, 2));
  await act(() => finish({ providers: {} }));
  assert.equal(result.current.registryStatus, 'ready');
  assert.equal(calls, 2);
});

test('submitting before connection recovery explains the wait and never queues an automatic generation', async t => {
  const requests = [], actions = [];
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  t.mock.method(globalThis, 'fetch', async (_url, request) => {
    requests.push(request?.method || 'GET');
    if (requests.length === 1) throw TypeError('Failed to fetch');
    return pending;
  });
  const input = options({ dispatch: action => actions.push(action) });
  const { result } = renderHook(() => useWorkspaceExecution(input));
  await waitFor(() => assert.ok(result.current.healthError));
  await act(() => result.current.submit());
  assert.match(result.current.error, /恢复后请再次提交/);
  await act(() => finish(Response.json(healthy)));
  assert.equal(result.current.error, '');
  assert.equal(result.current.health?.ok, true);
  assert.deepEqual(requests, ['GET', 'GET']);
  assert.deepEqual(actions, []);
});

for (const [name, response] of [
  ['HTTP 503', () => Response.json(healthy, { status: 503 })],
  ['unhealthy JSON', () => Response.json({ ...healthy, ok: false })],
  ['HTML fallback', () => new Response('<html>Unavailable</html>')],
]) test(`${name} cannot be treated as a connected execution service`, async t => {
  t.mock.method(globalThis, 'fetch', async () => response());
  const input = options();
  const { result } = renderHook(() => useWorkspaceExecution(input));
  await waitFor(() => assert.ok(result.current.error));
  assert.equal(result.current.health, null);
});

test('connection recovery is automatic without adding a manual connection button', () => {
  let checks = 0, polls = 0;
  render(React.createElement(WorkspaceStatus, {
    sync: { saveStatus: '已保存' }, issues: ['连接失败'], open: true, run: null,
    execution: { health: null, healthError: '连接失败，将自动重试。', healthStatus: 'retrying', retryHealth: () => checks++, refresh: () => polls++ },
  }));
  assert.equal(screen.queryByRole('button', { name: '重新检查连接' }), null);
  assert.ok(screen.getByText('连接暂时中断，正在自动重新检查…'));
  assert.equal(checks, 0);
  assert.equal(polls, 0);
  assert.equal(screen.getByRole('button', { name: '刷新执行状态' }).disabled, true);
});
