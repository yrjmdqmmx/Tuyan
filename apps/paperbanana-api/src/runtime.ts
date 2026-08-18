import type { MongoAdapter } from './mongo-adapter.js'
import type { OssAdapter } from './oss-adapter.js'
import type { LegacyHandler, Readiness, ReadinessProbe, ServiceLogger } from './server.js'

type RuntimeDependencies = {
  mongo: MongoAdapter
  oss: OssAdapter
  providerEgress?: {
    snapshot(): 'ready' | 'degraded'
    close(): Promise<void>
  }
  configureCloud(adapters: { mongo: MongoAdapter; storage: OssAdapter }): void
  loadHandler(): Promise<LegacyHandler>
  logger: ServiceLogger
  readinessProbeTimeoutMs?: number
}

type DependencyName = 'mongodb' | 'oss'
type DependencyState = 'ready' | 'unavailable'

export function createReadinessController({
  timeoutMs,
  probes,
  initial,
}: {
  timeoutMs: number
  probes: Record<DependencyName, () => Promise<void>>
  initial?: Readiness
}) {
  let cached: Readiness = initial || {
    ready: false,
    dependencies: { mongodb: 'unavailable', oss: 'unavailable' },
  }
  let inFlight: {
    promise: Promise<Readiness>
    pending: Set<DependencyName>
  } | undefined

  const snapshot = (): Readiness => ({
    ready: cached.ready,
    dependencies: { ...(cached.dependencies || {}) },
  })
  const update = (name: DependencyName, state: DependencyState) => {
    const dependencies = {
      mongodb: String(cached.dependencies?.mongodb || 'unavailable') as DependencyState,
      oss: String(cached.dependencies?.oss || 'unavailable') as DependencyState,
      [name]: state,
    }
    cached = {
      ready: dependencies.mongodb === 'ready' && dependencies.oss === 'ready',
      dependencies,
    }
  }

  const start = () => {
    if (inFlight) return inFlight
    const pending = new Set<DependencyName>(['mongodb', 'oss'])
    const entry = { promise: Promise.resolve(cached), pending }
    const run = async (name: DependencyName) => {
      try {
        await probes[name]()
        update(name, 'ready')
      } catch {
        update(name, 'unavailable')
      } finally {
        pending.delete(name)
      }
    }
    entry.promise = Promise.all([run('mongodb'), run('oss')])
      .then(snapshot)
      .finally(() => {
        if (inFlight === entry) inFlight = undefined
      })
    inFlight = entry
    return entry
  }

  return {
    snapshot,
    async probe(): Promise<Readiness> {
      const entry = start()
      let timer: ReturnType<typeof setTimeout> | undefined
      const timedOut = new Promise<Readiness>((resolve) => {
        timer = setTimeout(() => {
          for (const name of entry.pending) update(name, 'unavailable')
          resolve(snapshot())
        }, timeoutMs)
      })
      try {
        return await Promise.race([entry.promise, timedOut])
      } finally {
        if (timer) clearTimeout(timer)
      }
    },
  }
}

async function withinDeadline<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function prepareRuntime({
  mongo,
  oss,
  providerEgress,
  configureCloud,
  loadHandler,
  logger,
  readinessProbeTimeoutMs = 2000,
}: RuntimeDependencies): Promise<{
  handler: LegacyHandler
  readinessProbe: ReadinessProbe
  healthSnapshot: () => Readiness
  close(): Promise<void>
}> {
  const closeResources = async () => {
    let failure: unknown
    try {
      await mongo.close()
    } catch (error) {
      failure = error
    }
    try {
      await providerEgress?.close()
    } catch (error) {
      failure ||= error
    }
    if (failure) throw failure
  }
  let handler: LegacyHandler
  try {
    await mongo.connect()
    const reconciledJobs = await mongo.reconcileInterruptedJobs()
    logger.info('startup reconciliation completed', { reconciledJobs })
    await withinDeadline(
      Promise.all([mongo.probe(), oss.probe()]),
      readinessProbeTimeoutMs,
      'Startup dependency readiness probe',
    )
    configureCloud({ mongo, storage: oss })
    handler = await loadHandler()
  } catch (error) {
    await closeResources().catch(() => {})
    throw error
  }

  const readiness = createReadinessController({
    timeoutMs: readinessProbeTimeoutMs,
    probes: { mongodb: () => mongo.probe(), oss: () => oss.probe() },
    initial: { ready: true, dependencies: { mongodb: 'ready', oss: 'ready' } },
  })
  const withProviderEgress = (snapshot: Readiness): Readiness => providerEgress
    ? {
        ...snapshot,
        dependencies: {
          ...(snapshot.dependencies || {}),
          providerEgress: providerEgress.snapshot(),
        },
      }
    : snapshot

  return {
    handler,
    async readinessProbe() { return withProviderEgress(await readiness.probe()) },
    healthSnapshot: () => withProviderEgress(readiness.snapshot()),
    close: closeResources,
  }
}
