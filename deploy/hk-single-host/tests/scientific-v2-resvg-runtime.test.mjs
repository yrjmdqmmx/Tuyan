import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync(new URL('../../../.github/workflows/configure-scientific-v2-resvg-runtime.yml', import.meta.url), 'utf8')
const compose = readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8')

test('Scientific V2 Resvg runtime configuration is digest-bound, zero-provider and shared-lock protected', () => {
  assert.match(workflow, /configure-exact-scientific-v2-resvg-runtime/)
  assert.match(workflow, /group: paperbanana-hk-production/)
  assert.match(workflow, /--network none/)
  assert.match(workflow, /index_bg\.wasm/)
  assert.match(workflow, /providerCalls\":0/)
  assert.doesNotMatch(workflow, /PAPERBANANA_BENCH_(BAILIAN|ARK|OPENROUTER)_API_KEY/)
  assert.equal((compose.match(/RESVG_WASM_PATH: \/app\/node_modules\/@resvg\/resvg-wasm\/index_bg\.wasm/g) || []).length, 2)
})
