import { useEffect, useState } from 'react'
import { fetchBackendHealth, modelRegistryRequest } from '@paperbanana/api'
import { presentRegistryModel, sortModelsNewestFirst } from '../lib/modelPresentation.js'
import useBackendHealth, { boundedRead } from './useBackendHealth.js'

// Only read-only health/catalog requests run here. Late responses cannot replace
// a newer retry or a different backend's capabilities.
export default function useBackendRegistry(apiBase, {
  readHealth = fetchBackendHealth, readRegistry = modelRegistryRequest,
  refreshMs = 60_000, timeoutMs = 30_000,
} = {}) {
  const { health, healthError, retryHealth } = useBackendHealth(apiBase, { readHealth, timeoutMs: Math.min(timeoutMs, 15000) })
  const [catalog, setCatalog] = useState(null)
  const [registryRetry, setRegistryRetry] = useState(0)
  const current = catalog?.apiBase === apiBase && catalog.health === health ? catalog : null

  useEffect(() => {
    if (!health) return undefined
    let cancelled = false
    let pending = false, failed = false
    let controller
    let timer
    const matches = previous => previous?.apiBase === apiBase && previous.health === health
    async function refresh() {
      if (cancelled || pending) return
      clearTimeout(timer)
      pending = true
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
        failed = false
        setCatalog({ apiBase, health, data: { ...registry, providers }, status: 'ready' })
      } catch {
        failed = true
        if (!cancelled) setCatalog(previous => matches(previous) && previous.data
          ? { ...previous, status: 'stale' } : { apiBase, health, data: null, status: 'error' })
      } finally {
        pending = false
        // Schedule after completion: slow reads cannot overlap or be discarded
        // by the next timer tick. Cleanup and explicit retries abort transport.
        if (!cancelled && refreshMs) timer = setTimeout(refresh, refreshMs)
      }
    }
    const recover = () => {
      if (failed && document.visibilityState !== 'hidden') void refresh()
    }
    window.addEventListener('online', recover)
    window.addEventListener('pageshow', recover)
    document.addEventListener('visibilitychange', recover)
    refresh()
    return () => {
      cancelled = true; clearTimeout(timer); controller?.abort()
      window.removeEventListener('online', recover)
      window.removeEventListener('pageshow', recover)
      document.removeEventListener('visibilitychange', recover)
    }
  }, [apiBase, health, registryRetry, readRegistry, timeoutMs, refreshMs])

  function retry() {
    if (!health) {
      void retryHealth()
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
