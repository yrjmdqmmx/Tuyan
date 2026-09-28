import { useEffect, useState } from 'react'
import { fetchBackendHealth, modelRegistryRequest } from '@paperbanana/api'
import { presentRegistryModel, sortModelsNewestFirst } from '../lib/modelPresentation.js'

// Only read-only health/catalog requests run here. Late responses cannot replace
// a newer retry or a different backend's capabilities.
function boundedRead(read, timeoutMs, signal) {
  let timer
  let onAbort
  return Promise.race([
    Promise.resolve().then(read),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('服务信息读取超时')), timeoutMs) }),
    new Promise((_, reject) => {
      onAbort = () => reject(new Error('读取已取消'))
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
    boundedRead(() => readHealth(apiBase), timeoutMs, controller.signal)
      .then(health => { if (!cancelled) setBackend({ apiBase, health, error: '' }) })
      .catch(error => { if (!cancelled) setBackend({ apiBase, health: null, error: error?.message || '后端健康检查失败' }) })
    return () => { cancelled = true; controller.abort() }
  }, [apiBase, healthRetry, readHealth, timeoutMs])

  useEffect(() => {
    if (!health) return undefined
    let cancelled = false
    const controller = new AbortController()
    // A successful catalog remains usable while the periodic refresh is pending.
    // A failed refresh clears its authority and blocks advanced submission.
    setCatalog(previous => previous?.apiBase === apiBase && previous.health === health && previous.status === 'ready'
      ? previous : { apiBase, health, data: null, status: 'loading' })
    boundedRead(() => readRegistry(apiBase, health), timeoutMs, controller.signal)
      .then(registry => {
        if (cancelled) return
        if (!registry?.providers || typeof registry.providers !== 'object' || Array.isArray(registry.providers)) throw new Error('模型目录格式异常')
        const providers = Object.fromEntries(Object.entries(registry.providers).map(([id, entry]) => {
          if (!Array.isArray(entry?.models)) throw new Error('模型目录格式异常')
          return [id, { ...entry, models: sortModelsNewestFirst(entry.models.map(model => presentRegistryModel(id, model))) }]
        }))
        setCatalog({ apiBase, health, data: { ...registry, providers }, status: 'ready' })
      })
      .catch(() => { if (!cancelled) setCatalog({ apiBase, health, data: null, status: 'error' }) })
    return () => { cancelled = true; controller.abort() }
  }, [apiBase, health, registryRetry, readRegistry, timeoutMs])

  useEffect(() => {
    if (!health || !refreshMs) return undefined
    const timer = setInterval(() => setRegistryRetry(value => value + 1), refreshMs)
    return () => clearInterval(timer)
  }, [health, refreshMs])

  function retry() {
    if (!health) {
      setBackend({ apiBase, health: null, error: '' })
      setHealthRetry(value => value + 1)
    } else {
      setCatalog({ apiBase, health, data: null, status: 'loading' })
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
