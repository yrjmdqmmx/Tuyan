import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import useBackendRegistry from './useBackendRegistry.js'

afterEach(cleanup)
const ready = { routeContractVersion: 1, universalApiContractVersion: 1, providers: {} }
const healthy = { runtime: 'gateway', backendMode: 'gateway' }
function deferred() {
  let resolve, reject
  const promise = new Promise((a, b) => { resolve = a; reject = b })
  return { promise, resolve, reject }
}
function options(overrides) { return { readHealth: async () => healthy, readRegistry: async () => ready, refreshMs: 0, ...overrides } }

test('health and catalog delays stay loading until a server catalog is received', async () => {
  const health = deferred(), catalog = deferred()
  let calls = 0
  const opts = options({ readHealth: () => health.promise, readRegistry: () => { calls++; return catalog.promise } })
  const { result } = renderHook(() => useBackendRegistry('https://a.example', opts))
  assert.equal(result.current.registryStatus, 'loading')
  assert.equal(calls, 0)
  await act(async () => health.resolve(healthy))
  assert.equal(result.current.registryStatus, 'loading')
  assert.equal(result.current.registry, null)
  await act(async () => catalog.resolve(ready))
  assert.equal(result.current.registryStatus, 'ready')
  assert.equal(result.current.registry.routeContractVersion, 1)
})

for (const failure of ['health', 'catalog', 'malformed']) test(`${failure} failure offers a fresh retry without claiming unsupported`, async () => {
  let healthCalls = 0, catalogCalls = 0
  const opts = options({
    readHealth: async () => { if (++healthCalls === 1 && failure === 'health') throw Error('Offline'); return healthy },
    readRegistry: async () => {
      if (++catalogCalls === 1) { if (failure === 'catalog') throw Error('HTTP 503'); if (failure === 'malformed') return { providers: [] } }
      return ready
    },
  })
  const { result } = renderHook(() => useBackendRegistry('https://a.example', opts))
  await waitFor(() => assert.equal(result.current.registryStatus, 'error'))
  assert.equal(result.current.registry, null)
  act(() => result.current.retry())
  assert.equal(result.current.registryStatus, 'loading')
  await waitFor(() => assert.equal(result.current.registryStatus, 'ready'))
  assert.equal(result.current.healthError, '')
  assert.equal(healthCalls, failure === 'health' ? 2 : 1)
})

test('timeout is retryable and a late failed-attempt response cannot override the retry', async () => {
  const late = deferred()
  let calls = 0
  const opts = options({ timeoutMs: 40, readRegistry: () => ++calls === 1 ? late.promise : Promise.resolve(ready) })
  const { result } = renderHook(() => useBackendRegistry('https://a.example', opts))
  await waitFor(() => assert.equal(result.current.registryStatus, 'error'))
  act(() => result.current.retry())
  await waitFor(() => assert.equal(result.current.registryStatus, 'ready'))
  await act(async () => late.resolve({ providers: {}, routeContractVersion: 0 }))
  assert.equal(result.current.registry.routeContractVersion, 1)
})

test('a backend change clears authority immediately and ignores the old response', async () => {
  const old = deferred()
  const opts = options({ readRegistry: base => base.includes('old') ? old.promise : Promise.resolve(ready) })
  const { result, rerender } = renderHook(({ base }) => useBackendRegistry(base, opts), { initialProps: { base: 'https://old.example' } })
  await act(async () => {})
  rerender({ base: 'https://new.example' })
  assert.equal(result.current.registry, null)
  await waitFor(() => assert.equal(result.current.registryStatus, 'ready'))
  await act(async () => old.resolve({ providers: {}, routeContractVersion: 0 }))
  assert.equal(result.current.registry.routeContractVersion, 1)
})

test('background refresh failure preserves the displayed catalog but removes submission authority', async () => {
  const refresh = deferred()
  let calls = 0
  const opts = options({ refreshMs: 150, readRegistry: () => ++calls === 1 ? Promise.resolve(ready) : refresh.promise })
  const { result } = renderHook(() => useBackendRegistry('https://a.example', opts))
  await waitFor(() => assert.equal(result.current.registryStatus, 'ready'))
  await waitFor(() => assert.equal(calls, 2))
  assert.equal(result.current.registryStatus, 'ready')
  await act(async () => refresh.reject(Error('Network failed')))
  assert.equal(result.current.registryStatus, 'stale')
  assert.deepEqual(result.current.registry, ready)
})

test('retry preserves stale models until fresh capability data replaces them', async () => {
  const pending = deferred()
  let calls = 0
  const opts = options({ readRegistry: () => {
    calls++
    if (calls === 2) throw Error('Offline')
    return calls === 3 ? pending.promise : Promise.resolve(ready)
  } })
  const { result } = renderHook(() => useBackendRegistry('https://a.example', opts))
  await waitFor(() => assert.equal(result.current.registryStatus, 'ready'))
  act(() => result.current.retry())
  await waitFor(() => assert.equal(result.current.registryStatus, 'stale'))
  act(() => result.current.retry())
  assert.deepEqual(result.current.registry, ready)
  assert.equal(result.current.registryStatus, 'stale')
  await act(async () => pending.resolve({ ...ready, registryVersion: 'new' }))
  assert.equal(result.current.registryStatus, 'ready')
  assert.equal(result.current.registry.registryVersion, 'new')
})

test('timeouts abort the transport and unmount cancels an outstanding retry', async () => {
  const signals = []
  const opts = options({ timeoutMs: 40, readRegistry: (_base, _health, _provider, request) => {
    signals.push(request?.signal)
    return new Promise(() => {})
  } })
  const { result, unmount } = renderHook(() => useBackendRegistry('https://a.example', opts))
  await waitFor(() => assert.equal(result.current.registryStatus, 'error'))
  assert.equal(signals[0]?.aborted, true)
  act(() => result.current.retry())
  await waitFor(() => assert.equal(signals.length, 2))
  unmount()
  assert.equal(signals[1]?.aborted, true)
})

test('refresh scheduling waits for a slow request to settle instead of replacing it', async () => {
  const pending = deferred()
  let calls = 0
  const opts = options({ refreshMs: 15, timeoutMs: 500, readRegistry: () => {
    calls++
    return pending.promise
  } })
  const { result } = renderHook(() => useBackendRegistry('https://a.example', opts))
  await waitFor(() => assert.equal(calls, 1))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 65)) })
  assert.equal(calls, 1)
  await act(async () => pending.resolve(ready))
  assert.equal(result.current.registryStatus, 'ready')
})

test('a malformed refresh cannot erase a usable list or become ready', async () => {
  let calls = 0
  const opts = options({ readRegistry: async () => ++calls === 1 ? ready : { providers: { broken: {} } } })
  const { result } = renderHook(() => useBackendRegistry('https://a.example', opts))
  await waitFor(() => assert.equal(result.current.registryStatus, 'ready'))
  act(() => result.current.retry())
  await waitFor(() => assert.equal(result.current.registryStatus, 'stale'))
  assert.deepEqual(result.current.registry, ready)
})
