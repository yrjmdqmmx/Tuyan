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

test('background refresh keeps a loaded catalog while pending, then removes authority on failure', async () => {
  const refresh = deferred()
  let calls = 0
  const opts = options({ refreshMs: 150, readRegistry: () => ++calls === 1 ? Promise.resolve(ready) : refresh.promise })
  const { result } = renderHook(() => useBackendRegistry('https://a.example', opts))
  await waitFor(() => assert.equal(result.current.registryStatus, 'ready'))
  await waitFor(() => assert.equal(calls, 2))
  assert.equal(result.current.registryStatus, 'ready')
  await act(async () => refresh.reject(Error('Network failed')))
  assert.equal(result.current.registryStatus, 'error')
  assert.equal(result.current.registry, null)
})
