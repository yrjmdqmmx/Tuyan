import { useEffect, useState } from 'react'
import { fetchBackendHealth, modelRegistryRequest } from '@paperbanana/api'
import { presentRegistryModel, sortModelsNewestFirst } from '../lib/modelPresentation.js'

// Only read-only health/catalog requests run here. Late responses cannot replace
// a newer retry or a different backend's capabilities.
function boundedRead(read, timeoutMs, controller) {
  const { signal } = controller
  if (signal.aborted) return Promise.reject(signal.reason)
  let onAbort
  const timer = setTimeout(() => controller.abort(new Error('服务信息读取超时')), timeoutMs)
  return Promise.race([
    Promise.resolve().then(() => read(signal)),
    new Promise((_, reject) => {
      onAbort = () => reject(signal.reason || new Error('读取已取消'))
      signal.addEventListener('abort', onAbort, { once: true })
    }),
  ]).finally(() => { clearTimeout(timer); signal.removeEventListener('abort', onAbort) })
}

export default function useBackendRegistry(apiBase, {
  readHealth = fetchBackendHealth, readRegistry = modelRegistryRequest,
  refreshMs = 60_000, timeoutMs = 30_000,
} = {}) {
  const [backend, setBackend] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [healthRetry, setHealthRetry] = useState(0)
  const [registryRetry, setRegistryRetry] = useState(0)
  const health = backend?.apiBase === apiBase ? backend.health : null
  const healthError = backend?.apiBase === apiBase ? backend.error : ''
  const current = catalog?.apiBase === apiBase && catalog.health === health ? catalog : null

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setBackend({ apiBase, health: null, error: '' })
    boundedRead(signal => readHealth(apiBase, { signal }), timeoutMs, controller)
      .then(health => { if (!cancelled) setBackend({ apiBase, health, error: '' }) })
      .catch(error => { if (!cancelled) setBackend({ apiBase, health: null, error: error?.message || '后端健康检查失败' }) })
    return () => { cancelled = true; controller.abort() }
  }, [apiBase, healthRetry, readHealth, timeoutMs])

  useEffect(() => {
    if (!health) return undefined
    let cancelled = false
    let controller
    let timer
    const matches = previous => previous?.apiBase === apiBase && previous.health === health
    async function refresh() {
      controller = new AbortController()
      // Retain the last successful list for browsing. A stale list never regains
      // submission authority until a complete, valid response arrives.
      setCatalog(previous => matches(previous) && previous.data
        ? previous : { apiBase, health, data: null, status: 'loading' })
      try {
        const registry = await boundedRead(signal => readRegistry(apiBase, health, '', { signal }), timeoutMs, controller)
        if (cancelled) return
        if (!registry?.providers || typeof registry.providers !== 'object' || Array.isArray(registry.providers)) throw new Error('模型目录格式异常')
        const providers = Object.fromEntries(Object.entries(registry.providers).map(([id, entry]) => {
          if (!Array.isArray(entry?.models)) throw new Error('模型目录格式异常')
          return [id, { ...entry, models: sortModelsNewestFirst(entry.models.map(model => presentRegistryModel(id, model))) }]
        }))
        setCatalog({ apiBase, health, data: { ...registry, providers }, status: 'ready' })
      } catch {
        if (!cancelled) setCatalog(previous => matches(previous) && previous.data
          ? { ...previous, status: 'stale' } : { apiBase, health, data: null, status: 'error' })
      } finally {
        // Schedule after completion: slow reads cannot overlap or be discarded
        // by the next timer tick. Cleanup and explicit retries abort transport.
        if (!cancelled && refreshMs) timer = setTimeout(refresh, refreshMs)
      }
    }
    refresh()
    return () => { cancelled = true; clearTimeout(timer); controller?.abort() }
  }, [apiBase, health, registryRetry, readRegistry, timeoutMs, refreshMs])

  function retry() {
    if (!health) {
      setBackend({ apiBase, health: null, error: '' })
      setHealthRetry(value => value + 1)
    } else {
      setRegistryRetry(value => value + 1)
    }
  }

  return {
    health, healthError,
    registry: current?.data || null,
    registryStatus: healthError ? 'error' : current?.status || 'loading',
    retry,
  }
}
