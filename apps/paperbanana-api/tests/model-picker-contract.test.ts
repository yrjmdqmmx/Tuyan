import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { resolveImageSize } from '../../../packages/types/src/image-size-contract.js'
import { buildAspectRatioOptions, normalizeSelectedAspectRatio } from '../../../packages/types/src/aspect-ratios.js'
import { modelDeveloper, presentRegistryModel, sortModelsNewestFirst } from '../../../packages/types/src/model-presentation.js'

const require = createRequire(import.meta.url)
const mini = require('../../miniprogram/miniprogram/utils/aspect-ratios.js')
const web = require('../../web/src/lib/aspectRatios.js')
const presentation = require('../../miniprogram/miniprogram/utils/model-presentation.js')
const { STATIC_MODEL_REGISTRY: catalog } = require('../../miniprogram/miniprogram/utils/static-model-catalog.js')
const sizes = JSON.parse(fs.readFileSync(new URL('../../../config/image-size-contracts.json', import.meta.url), 'utf8'))

test('every visible ratio has a legal request for its exact channel, operation and resolution', (context) => {
  let checked = 0
  for (const [key, route] of Object.entries(sizes.routes) as [string, any][]) {
    const slash = key.indexOf('/')
    const model = catalog[key.slice(0, slash)].models.find((model: any) => model.id === key.slice(slash + 1))
    for (const operation of ['generation', 'editing']) {
      const capabilityField = operation === 'generation' ? 'aspectRatios' : 'refineAspectRatios'
      const map = model.capabilities[capabilityField + 'ByResolution']
      assert.deepEqual(buildAspectRatioOptions({ capabilities: model.capabilities, capabilityField, resolution: 'invalid' }), [])
      if (!route[operation]) {
        assert.deepEqual(buildAspectRatioOptions({ capabilities: model.capabilities, capabilityField, resolution: '1K' }), [])
        continue
      }
      for (const resolution of Object.keys(map)) {
        const input = { capabilities: model.capabilities, capabilityField, resolution } as const
        const options = buildAspectRatioOptions(input)
        assert.deepEqual(options, mini.buildAspectRatioOptions(input))
        assert.deepEqual(options, web.buildAspectRatioOptions(input))
        assert.deepEqual(options.map(option => option.value), ['auto', ...map[resolution]], key)
        for (const option of options) {
          assert.equal(option.disabled, false)
          assert.doesNotThrow(() => resolveImageSize(sizes.profiles[route[operation]], option.value, resolution), key)
          assert.equal(normalizeSelectedAspectRatio(option.value, options), option.value)
          checked++
        }
        assert.ok(options.some(option => option.value === normalizeSelectedAspectRatio('999:1', options)))
      }
    }
  }
  assert.ok(checked > 15000)
  context.diagnostic(`${checked} visible channel/model/operation/resolution/ratio combinations resolved to legal requests`)
})

test('tiers, hosting accounts, historical aliases and company identities remain separate from request IDs', () => {
  for (const [channel, id, vendor] of [
    ['siliconflow', 'Pro/deepseek-ai/DeepSeek-V3', '深度求索'],
    ['siliconflow', 'Pro/zai-org/GLM-5.1', '智谱'],
    ['siliconflow', 'THUDM/GLM-4-32B-0414', '智谱'],
    ['siliconflow', 'Pro/MiniMaxAI/MiniMax-M2.5', 'MiniMax'],
    ['together', 'moonshotai/Kimi-K2.6', '月之暗面'],
    ['fal', 'fal-ai/flux-2-pro', 'Black Forest Labs'],
    ['replicate', 'zsxkib/step1x-edit', '阶跃星辰'],
    ['mistral', 'zai-glm-5-2', '智谱'],
    ['openrouter', 'x-ai/grok-4.6', 'SpaceXAI'],
  ]) {
    const model = presentRegistryModel(channel, { id, vendor: 'Pro' })
    assert.equal(model.id, id)
    assert.equal(model.vendor, vendor)
    assert.equal(presentation.presentRegistryModel(channel, { id, vendor: 'Pro' }).vendor, vendor)
    assert.equal(modelDeveloper('', model).label, vendor, 'grouping must preserve the reviewed developer')
  }
  assert.equal(modelDeveloper('replicate', { id: 'random-person/model' }).label, '开发方待确认')
  assert.equal(modelDeveloper('siliconflow', { id: 'THUDM/unreviewed-research' }).label, '开发方待确认')
  assert.equal(presentRegistryModel('siliconflow', { id: 'THUDM/GLM-4-32B-0414', label: '' }).label, 'GLM-4-32B-0414')
  assert.equal((presentRegistryModel('siliconflow', {id: 'Pro/deepseek-ai/DeepSeek-V3'}) as any).serviceTier, 'Pro')
})

test('known dates and version relations produce a stable newest-first order without recommendation or ID sorting', () => {
  const models = [
    { id: 'a-old-recommended', releasedAt: '2025-01-01', recommended: true, releaseFamily: 'f', releaseOrder: 1 },
    { id: 'z-new-undated', releaseFamily: 'f', releaseOrder: 2 },
    { id: 'unknown-a', releasedAt: '2026-02-30' },
    { id: 'newest-dated', releasedAt: '2026-08-01' },
    { id: 'unknown-z' },
  ]
  assert.deepEqual(sortModelsNewestFirst(models).map(model => model.id), ['newest-dated','z-new-undated','a-old-recommended','unknown-a','unknown-z'])
  assert.deepEqual(presentation.sortModelsNewestFirst(models), sortModelsNewestFirst(models))
  const conflict = [{id:'older-date',releasedAt:'2024-01-01',releaseFamily:'f',releaseOrder:2},{id:'newer-date',releasedAt:'2025-01-01',releaseFamily:'f',releaseOrder:1}]
  assert.equal(sortModelsNewestFirst(conflict)[0].id, 'newer-date')
  assert.equal(sortModelsNewestFirst(sortModelsNewestFirst(models)).length, models.length)
  const glm = catalog.siliconflow.models.filter((model: any) => /GLM-5/.test(model.id))
  assert.deepEqual(glm.map((model: any) => model.id), ['zai-org/GLM-5.3','zai-org/GLM-5.2','Pro/zai-org/GLM-5.1'])
  assert.equal(catalog.anthropic.models[0].id, 'claude-fable-5-1')
  assert.equal(catalog.gemini.models[0].id, 'gemini-3.8-flash')
})

test('all catalogs keep deterministic chronology after refresh, without changing routes or IDs', async () => {
  const { orderModelChannels, MODEL_CHANNEL_LABELS } = await import('../../../packages/types/src/model-presentation.js')
  const ids = Object.keys(catalog)
  assert.deepEqual(orderModelChannels(ids), ['tokendance', ...ids.filter(id => id !== 'tokendance')])
  assert.equal(MODEL_CHANNEL_LABELS.tokendance, '观猹 TokenDance')
  assert.deepEqual(ids, Object.keys(catalog))
  for (const [channel, entry] of Object.entries(catalog) as [string, any][]) {
    const models = entry.models.map((m: any) => presentRegistryModel(channel, m))
    const expected = sortModelsNewestFirst(models).map((m: any) => m.id)
    for (const shuffled of [[...models].reverse(), [...models.filter((_: any, i: number) => i % 2), ...models.filter((_: any, i: number) => !(i % 2))]]) {
      assert.deepEqual(sortModelsNewestFirst(shuffled).map((m: any) => m.id), expected, channel)
    }
    assert.equal(new Set(expected).size, models.length)
  }
})

test('TokenDance versions, preview SKUs and snapshots retain their channel-specific official meaning', () => {
  const deepseek = catalog.tokendance.models.filter((m: any) => m.vendorId === 'deepseek')
  assert.equal(deepseek[0].id, 'deepseek-v4.1-flash')
  assert.equal(deepseek[0].releasedAt, null, 'catalog creation timestamp is not a publication date')
  assert.equal(deepseek[0].lifecycle, 'preview')
  for (const id of ['deepseek-v4-pro', 'deepseek-v4-flash']) {
    const preview = deepseek.find((m: any) => m.id === id)
    assert.equal(preview.lifecycle, 'preview')
    assert.equal(preview.releasedAt, '2026-04-24')
    assert.equal((presentRegistryModel('deepseek', { id, vendorId: 'deepseek' }) as any).releasedAt.startsWith('2026-0'), true)
  }
  for (const id of ['deepseek-v4-pro-0813', 'deepseek-v4-flash-0731', 'deepseek-chat-v3-0324']) assert.equal(deepseek.find((m: any) => m.id === id).releaseKind, 'snapshot')
  const image = presentRegistryModel('tokendance', { id: 'seedream-5.0-pro', vendorId: 'bytedance' }) as any
  const old = presentRegistryModel('ark', { id: 'doubao-seedream-4-5-251128', vendorId: 'bytedance' }) as any
  assert.equal(image.releaseFamily, old.releaseFamily)
  assert.ok(image.releaseOrder > old.releaseOrder)
})
