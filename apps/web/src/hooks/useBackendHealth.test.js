import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import useBackendHealth from './useBackendHealth.js';

afterEach(cleanup);
const healthy = { code: 0, ok: true, runtime: 'gateway' };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('a transient health failure recovers automatically and clears its error', async () => {
  let calls = 0;
  const options = { timeoutMs: 200, retryDelays: [10, 20], readHealth: async () => {
    if (++calls === 1) throw TypeError('Failed to fetch');
    return healthy;
  } };
  const { result } = renderHook(() => useBackendHealth('/api', options));
  await waitFor(() => assert.equal(result.current.healthStatus, 'ready'));
  assert.equal(result.current.healthError, '');
  assert.equal(calls, 2);
});

test('automatic retries continue at the capped delay until recovery, then stop', async () => {
  const times = [];
  const options = { timeoutMs: 500, retryDelays: [10, 30], readHealth: async () => {
    times.push(Date.now());
    if (times.length <= 4) throw TypeError('Failed to fetch');
    return healthy;
  } };
  const { result } = renderHook(() => useBackendHealth('/api', options));
  await waitFor(() => assert.equal(result.current.healthStatus, 'ready'));
  assert.equal(times.length, 5);
  assert.ok(times[3] - times[2] >= 25);
  assert.ok(times[4] - times[3] >= 25);
  await act(() => wait(80));
  assert.equal(times.length, 5);
  assert.equal(result.current.healthError, '');
});

test('reconnect events and explicit checks do not overlap a request', async () => {
  let calls = 0;
  const pending = deferred();
  const options = { timeoutMs: 500, retryDelays: [200], readHealth: async () => {
    if (++calls === 1) throw TypeError('Failed to fetch');
    return pending.promise;
  } };
  const { result } = renderHook(() => useBackendHealth('/api', options));
  await waitFor(() => assert.equal(result.current.healthStatus, 'retrying'));
  act(() => {
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    void result.current.retryHealth();
  });
  await waitFor(() => assert.equal(calls, 2));
  await act(() => pending.resolve(healthy));
  assert.equal(result.current.healthStatus, 'ready');
  act(() => window.dispatchEvent(new Event('online')));
  await act(() => wait(230));
  assert.equal(calls, 2);
});

test('timeout aborts transport and a late response cannot overwrite a successful retry', async () => {
  const late = deferred(), signals = [];
  const options = { timeoutMs: 20, retryDelays: [5], readHealth: (_base, { signal }) => {
    signals.push(signal);
    return signals.length === 1 ? late.promise : Promise.resolve({ ...healthy, revision: 'current' });
  } };
  const { result } = renderHook(() => useBackendHealth('/api', options));
  await waitFor(() => assert.equal(result.current.healthStatus, 'ready'));
  assert.equal(signals[0].aborted, true);
  await act(() => late.resolve({ ...healthy, revision: 'old' }));
  assert.equal(result.current.health.revision, 'current');
});

test('changing the backend cancels the old request and rejects its late response', async () => {
  const old = deferred(), signals = [];
  const options = { timeoutMs: 500, retryDelays: [], readHealth: (base, { signal }) => {
    signals.push(signal);
    return base === '/old' ? old.promise : Promise.resolve({ ...healthy, base });
  } };
  const { result, rerender } = renderHook(({ base }) => useBackendHealth(base, options), { initialProps: { base: '/old' } });
  await act(async () => {});
  rerender({ base: '/new' });
  assert.equal(result.current.health, null);
  await waitFor(() => assert.equal(result.current.health?.base, '/new'));
  assert.equal(signals[0].aborted, true);
  await act(() => old.resolve({ ...healthy, base: '/old' }));
  assert.equal(result.current.health.base, '/new');
});

test('unmount cancels a pending request and removes recovery listeners', async () => {
  const signals = [];
  const options = { timeoutMs: 50, retryDelays: [5], readHealth: (_base, { signal }) => {
    signals.push(signal);
    return new Promise(() => {});
  } };
  const { unmount } = renderHook(() => useBackendHealth('/api', options));
  await act(async () => {});
  unmount();
  assert.equal(signals[0].aborted, true);
  window.dispatchEvent(new Event('online'));
  await wait(80);
  assert.equal(signals.length, 1);
});

test('unmount cancels a scheduled retry', async () => {
  let calls = 0;
  const options = { timeoutMs: 200, retryDelays: [150], readHealth: async () => {
    calls++;
    throw TypeError('Failed to fetch');
  } };
  const { result, unmount } = renderHook(() => useBackendHealth('/api', options));
  await waitFor(() => assert.equal(result.current.healthStatus, 'retrying'));
  unmount();
  await wait(180);
  assert.equal(calls, 1);
});

for (const mode of ['hidden', 'offline']) test(`${mode} pauses scheduled checks; returning online and visible resumes immediately`, async t => {
  let calls = 0;
  const options = { timeoutMs: 200, retryDelays: [100], readHealth: async () => {
    if (++calls === 1) throw TypeError('Failed to fetch');
    return healthy;
  } };
  const { result } = renderHook(() => useBackendHealth('/api', options));
  await waitFor(() => assert.equal(result.current.healthStatus, 'retrying'));
  const target = mode === 'hidden' ? document : navigator;
  const property = mode === 'hidden' ? 'visibilityState' : 'onLine';
  Object.defineProperty(target, property, { configurable: true, value: mode === 'hidden' ? 'hidden' : false });
  t.after(() => delete target[property]);
  act(() => {
    (mode === 'hidden' ? document : window).dispatchEvent(new Event(mode === 'hidden' ? 'visibilitychange' : 'offline'));
    window.dispatchEvent(new Event('pageshow'));
    void result.current.retryHealth();
  });
  assert.equal(result.current.healthStatus, 'paused');
  await act(() => wait(140));
  assert.equal(calls, 1);
  Object.defineProperty(target, property, { configurable: true, value: mode === 'hidden' ? 'visible' : true });
  act(() => (mode === 'hidden' ? document : window).dispatchEvent(new Event(mode === 'hidden' ? 'visibilitychange' : 'online')));
  await waitFor(() => assert.equal(result.current.healthStatus, 'ready'));
  assert.equal(calls, 2);
});

test('mounting offline waits for an online event before the first request', async t => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  t.after(() => delete navigator.onLine);
  let calls = 0;
  const options = { readHealth: async () => { calls++; return healthy; } };
  const { result } = renderHook(() => useBackendHealth('/api', options));
  assert.equal(result.current.healthStatus, 'paused');
  assert.equal(calls, 0);
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  act(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => assert.equal(result.current.healthStatus, 'ready'));
  assert.equal(calls, 1);
});

test('a request failing after the page is hidden waits until the page returns', async t => {
  const first = deferred();
  let calls = 0;
  const options = { timeoutMs: 500, retryDelays: [10], readHealth: () => ++calls === 1 ? first.promise : Promise.resolve(healthy) };
  const { result } = renderHook(() => useBackendHealth('/api', options));
  await waitFor(() => assert.equal(calls, 1));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  t.after(() => delete document.visibilityState);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await act(() => first.resolve({ ok: false }));
  assert.equal(result.current.healthStatus, 'paused');
  await act(() => wait(40));
  assert.equal(calls, 1);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await waitFor(() => assert.equal(result.current.healthStatus, 'ready'));
  assert.equal(calls, 2);
});
