import { configureCoreServices } from './core-services.js'
import { normalizeAuthoritativeImageRuntimeError } from './image-runtime-error.js'
import { enableScientificBenchmarkRasterDecoders } from './image-runtime-sharp-policy.js'
import { resolveScientificProviderTimeoutMs } from './image-runtime-timeout.js'

function forbiddenCollection() {
  return new Proxy({}, {
    get() {
      return async () => { throw new Error('BENCHMARK_IMAGE_RUNTIME_DATABASE_ACCESS_FORBIDDEN') }
    },
  })
}

configureCoreServices({
  mongo: { db: { collection: forbiddenCollection } as any },
  storage: { bucket() { throw new Error('BENCHMARK_IMAGE_RUNTIME_STORAGE_ACCESS_FORBIDDEN') } },
})

const core = await import('./core-entry.mjs')
enableScientificBenchmarkRasterDecoders()
const failedRequests = new WeakSet<object>()
core.configureRuntimeFetch(async (input: string | URL | Request, init?: RequestInit) => {
  if (init && failedRequests.has(init)) throw new Error('UNKNOWN_PROVIDER_OUTCOME_NO_REDISPATCH')
  const timeout = AbortSignal.timeout(resolveScientificProviderTimeoutMs(process.env.PAPERBANANA_BENCH_PROVIDER_TIMEOUT_MS))
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  try {
    return await globalThis.fetch(input, { ...init, signal })
  } catch (error) {
    if (init) failedRequests.add(init)
    throw new Error('UNKNOWN_PROVIDER_OUTCOME_AFTER_DISPATCH', { cause: error })
  }
})

export const callImageModel: typeof core.callImageModel = async (...args: Parameters<typeof core.callImageModel>) => {
  try {
    return await core.callImageModel(...args)
  } catch (error) {
    throw normalizeAuthoritativeImageRuntimeError(error)
  }
}
