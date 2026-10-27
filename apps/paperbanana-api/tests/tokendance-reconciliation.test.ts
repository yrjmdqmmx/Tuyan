import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { tokenDanceCatalogPresence, parseTokenDanceCatalog } from '../../../packages/api/src/tokendance-catalog.js'
// @ts-ignore independent Web consumer
import { modelMissingFromCatalog, modelRetiredFromCatalog, modelUnavailableForSelection } from '../../web/src/lib/modelRegistry.js'
// @ts-ignore generated offline fallback
import { STATIC_MODEL_REGISTRY } from '../../web/src/lib/staticModelCatalog.js'
const source = 'https://tokendance.space/gateway/v1/models'
const live = JSON.parse(fs.readFileSync(new URL('../../../docs/model-catalog/2026-10-26-tokendance-public-models.json', import.meta.url), 'utf8'))
const deepseekIds = ['deepseek-v4.1-flash-1017', 'deepseek-v4.1-flash', 'deepseek-v4-flash-0731', 'deepseek-v4-pro-0813', 'deepseek-v4-flash', 'deepseek-v4-pro'].sort()
const absentIds = ['deepseek-chat-v3-0324', 'deepseek-v3.2', 'deepseek-v4-flash-vision-exp', 'qwen3-30b-a3b-instruct-2507', 'qwen3-max', 'qwen3.6-max-preview']
const visible = (registry: any) => registry.providers.tokendance.models.filter((m: any) => !modelMissingFromCatalog(registry, 'tokendance', m) && !modelRetiredFromCatalog(m))
const deepseek = (registry: any) => visible(registry).filter((m: any) => m.id.startsWith('deepseek-')).map((m: any) => m.id).sort()

test('audited fallback shows six DeepSeek models, preserves historical IDs/defaults and does not relist absences on failure', () => {
  const registry = { providers: STATIC_MODEL_REGISTRY, unavailableProviders: { tokendance: '目录读取失败' } }
  assert.deepEqual(deepseek(registry), deepseekIds)
  for (const id of absentIds) {
    const m = registry.providers.tokendance.models.find((m: any) => m.id === id)
    assert.ok(m, 'historical ID retained: ' + id)
    assert.equal(modelUnavailableForSelection(m), true)
    assert.equal(m.catalogPresence.sourceUrl, source)
    assert.equal(m.catalogPresence.checkedAt, '2026-10-26')
  }
})

test('current 112-row directory yields six DeepSeek model cards and excludes tools/specialties/new unreviewed entries', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-10-26T08:00:00Z'))
  assert.equal(live.data.length, 112)
  assert.equal(live.data.filter((m: any) => m.id.startsWith('deepseek-')).length, 8)
  const runtime: any = await createRefineRuntime({ tokenDance: true })
  const requests: string[] = []
  try {
    runtime.legacy.configureRuntimeFetch(async (input: any, init: any = {}) => {
      assert.equal(String(input), source); assert.equal(init.method || 'GET', 'GET')
      requests.push(String(input)); return Response.json(live)
    })
    const registry = await runtime.invoke({ action: 'modelRegistry', provider: 'tokendance' })
    assert.deepEqual(deepseek(registry), deepseekIds)
    assert.equal(visible(registry).length, 66)
    assert.equal(registry.catalogHealth.tokendance.unadaptedCount, 44)
    for (const id of ['deepseek-fetch', 'deepseek-search', 'bocha-web-search', 'glm-ocr', 'qwen3.5-ocr', 'qwen-image-2.1-pro', 'seedream-5.0-flash']) {
      assert.equal(registry.providers.tokendance.models.some((m: any) => m.id === id), false, id)
    }
    assert.deepEqual(registry.providers.tokendance.defaults, STATIC_MODEL_REGISTRY.tokendance.defaults)
    assert.equal(requests.length, 1)
    // Returning an old ID in a later successful directory restores that exact
    // channel identity; a transient read failure never establishes removal.
    runtime.legacy.configureRuntimeFetch(async () => Response.json({ data: [...live.data, { id: 'deepseek-v3.2', supported_protocols: ['openai:chat-completions'] }] }))
    const recovered = await runtime.invoke({ action: 'modelRegistry', provider: 'tokendance', refreshCatalog: true })
    assert.equal(recovered.providers.tokendance.models.find((m: any) => m.id === 'deepseek-v3.2').catalogPresence.status, 'listed')
    assert.ok(deepseek(recovered).includes('deepseek-v3.2'))
    runtime.legacy.configureRuntimeFetch(async () => { throw new Error('offline fixture') })
    const failed = await runtime.invoke({ action: 'modelRegistry', provider: 'tokendance', refreshCatalog: true })
    assert.deepEqual(deepseek(failed), deepseekIds)
    assert.ok(visible(failed).every((m: any) => m.selectable === false))
  } finally { await runtime.close() }
})

test('presence evidence ignores empty, malformed and failed reads, accepts clean complete snapshots and can recover', () => {
  const previous = { status: 'absent' as const, checkedAt: '2026-10-26', sourceUrl: source }
  const base = { models: [], issues: [], total: 0, state: 'unavailable' as const, cause: 'network', checkedAt: null, expiresAt: null, stale: false, failureCount: 1, alert: 'critical' as const }
  assert.equal(tokenDanceCatalogPresence(base, 'id', previous), previous)
  assert.equal(tokenDanceCatalogPresence({ ...base, cause: 'empty', checkedAt: 1 }, 'id', previous), previous)
  const parsed = parseTokenDanceCatalog({ data: [{ id: 'other', supported_protocols: ['openai:chat-completions'] }, null] })
  assert.equal(tokenDanceCatalogPresence({ ...base, ...parsed, checkedAt: 1 }, 'id', previous), previous)
  const clean = { ...base, ...parseTokenDanceCatalog({ data: [{ id: 'id', supported_protocols: ['openai:chat-completions'] }] }), cause: null, checkedAt: 1 }
  assert.equal(tokenDanceCatalogPresence(clean, 'id', previous)?.status, 'listed')
  assert.equal(tokenDanceCatalogPresence(clean, 'missing')?.status, 'absent')
  assert.equal(tokenDanceCatalogPresence({ ...clean, stale: true, cause: 'network' }, 'id', previous)?.status, 'listed', 'last successfully parsed snapshot remains evidence')
})
