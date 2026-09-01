import assert from 'node:assert/strict'
import test from 'node:test'

test('authoritative image runtime defaults Resvg WASM to the Worker package instead of the Laf-only path', async () => {
  const previous = process.env.RESVG_WASM_PATH
  const previousRuntime = process.env.PAPERBANANA_BENCH_IMAGE_RUNTIME_PATH
  delete process.env.RESVG_WASM_PATH
  process.env.PAPERBANANA_BENCH_IMAGE_RUNTIME_PATH = new URL('./fixtures/authoritative-runtime-fixture.mjs', import.meta.url).pathname
  try {
    const { loadAuthoritativeImageRuntime } = await import('../src/authoritative-runtime.js')
    await loadAuthoritativeImageRuntime()
    assert.equal(process.env.RESVG_WASM_PATH, `${process.cwd()}/node_modules/@resvg/resvg-wasm/index_bg.wasm`)
  } finally {
    if (previous === undefined) delete process.env.RESVG_WASM_PATH
    else process.env.RESVG_WASM_PATH = previous
    if (previousRuntime === undefined) delete process.env.PAPERBANANA_BENCH_IMAGE_RUNTIME_PATH
    else process.env.PAPERBANANA_BENCH_IMAGE_RUNTIME_PATH = previousRuntime
  }
})
