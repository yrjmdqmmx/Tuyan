import { configureLafCloud } from './laf-cloud.js'
import { normalizeAuthoritativeImageRuntimeError } from './image-runtime-error.js'
import { enableScientificBenchmarkRasterDecoders } from './image-runtime-sharp-policy.js'

function forbiddenCollection() {
  return new Proxy({}, {
    get() {
      return async () => { throw new Error('BENCHMARK_IMAGE_RUNTIME_DATABASE_ACCESS_FORBIDDEN') }
    },
  })
}

configureLafCloud({
  mongo: { db: { collection: forbiddenCollection } },
  storage: { bucket() { throw new Error('BENCHMARK_IMAGE_RUNTIME_STORAGE_ACCESS_FORBIDDEN') } },
})

const legacy = await import('./legacy-entry.mjs')
enableScientificBenchmarkRasterDecoders()
const failedRequests = new WeakSet<object>()
legacy.configureRuntimeFetch(async (input: string | URL | Request, init?: RequestInit) => {
  if (init && failedRequests.has(init)) throw new Error('UNKNOWN_PROVIDER_OUTCOME_NO_REDISPATCH')
  const timeout = AbortSignal.timeout(Number(process.env.PAPERBANANA_BENCH_PROVIDER_TIMEOUT_MS || 120_000))
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  try {
    return await globalThis.fetch(input, { ...init, signal })
  } catch (error) {
    if (init) failedRequests.add(init)
    throw new Error('UNKNOWN_PROVIDER_OUTCOME_AFTER_DISPATCH', { cause: error })
  }
})

export const callImageModel: typeof legacy.callImageModel = async (...args: Parameters<typeof legacy.callImageModel>) => {
  try {
    return await legacy.callImageModel(...args)
  } catch (error) {
    throw normalizeAuthoritativeImageRuntimeError(error)
  }
}
