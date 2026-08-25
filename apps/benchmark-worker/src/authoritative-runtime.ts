import { pathToFileURL } from 'node:url'

import { createSharedImageRuntime } from './image-runtime.js'

export async function loadAuthoritativeImageRuntime() {
  const modulePath = process.env.PAPERBANANA_BENCH_IMAGE_RUNTIME_PATH || '/app/dist/image-runtime.mjs'
  const runtimeModule = await import(pathToFileURL(modulePath).href) as { callImageModel: (...args: any[]) => Promise<string> }
  const { callImageModel } = runtimeModule
  if (typeof callImageModel !== 'function') throw new Error('BENCHMARK_IMAGE_RUNTIME_INVALID')
  return createSharedImageRuntime(callImageModel as never)
}
