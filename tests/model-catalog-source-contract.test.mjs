import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { STATIC_MODEL_REGISTRY, STATIC_MODEL_REGISTRY_VERSION } from '../apps/web/src/lib/staticModelCatalog.js'
import { PROVIDERS } from '../apps/web/src/constants.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const mini = require('../apps/miniprogram/miniprogram/utils/static-model-catalog.js')
const audit = JSON.parse(fs.readFileSync(path.join(root, 'config/model-catalog-audit.json'), 'utf8'))

test('backend and both bundled catalogs are generated from the same reviewed source without drift', () => {
  assert.equal(STATIC_MODEL_REGISTRY_VERSION, audit.version)
  assert.equal(mini.STATIC_MODEL_REGISTRY_VERSION, audit.version)
  assert.deepEqual(mini.STATIC_MODEL_REGISTRY, STATIC_MODEL_REGISTRY)
  assert.match(execFileSync(process.execPath, ['scripts/sync-model-catalog.mjs', '--check'], { cwd: root, encoding: 'utf8' }), /no drift/)
  for (const [provider, registry] of Object.entries(STATIC_MODEL_REGISTRY)) {
    for (const role of ['main', 'image', 'vision']) {
      assert.equal(PROVIDERS[provider][role + 'Model'], registry.defaults[role])
      assert.deepEqual(PROVIDERS[provider][role + 'Models'].map((entry) => entry[0]), registry.models.filter((model) => model.selectable && model.roles.includes(role)).map((model) => model.id), `${provider}/${role}`)
    }
  }
})

test('every original audit row has an explicit implementation or exclusion decision', () => {
  assert.deepEqual(audit.auditRows, { '02-native': 79, '03-siliconflow': 92, '04-bailian': 262, '01-existing': 101, '05-openrouter-text': 430, '05-openrouter-images': 50, '06-tokendance': 93 })
  assert.equal(audit.originalStaticCount, 101)
  assert.equal(audit.staticCount, 739)
  assert.equal(audit.incompatiblePolicy, 'omit-from-catalog')
  for (const row of audit.decisions) {
    assert.ok(row.reason.trim().length > 10, `${row.provider}/${row.id}: missing rationale`)
    assert.match(row.source, /^https:\/\//)
    if (row.provider === 'openrouter') { assert.ok(['dynamic', 'dynamic-excluded'].includes(row.decision)); continue }
    const model = STATIC_MODEL_REGISTRY[row.provider]?.models.find((m) => m.id === row.resolvedId)
    if (['added', 'covered', 'alias'].includes(row.decision)) assert.equal(model?.selectable, true, `${row.provider}/${row.id}`)
    else if (row.decision === 'disabled') assert.equal(model?.selectable, false, `${row.provider}/${row.id}`)
    else { assert.equal(row.decision, 'excluded'); assert.equal(model?.selectable === true, false, `${row.provider}/${row.id} exclusion contradicts catalog`) }
  }
  for (const [provider, registry] of Object.entries(STATIC_MODEL_REGISTRY)) {
    assert.equal(new Set(registry.models.map((m) => m.id)).size, registry.models.length)
    for (const model of registry.models) {
      assert.equal(model.selectable, true, `${provider}/${model.id} incompatible entries must be omitted`)
      assert.ok(audit.decisions.some((row) => row.provider === provider && row.resolvedId === model.id), `${provider}/${model.id} lacks audit evidence`)
    }
  }
})

test('regional, realtime, edit-only and reference-count boundaries remain channel-specific', () => {
  for (const provider of ['bailian', 'ark']) for (const model of STATIC_MODEL_REGISTRY[provider].models) assert.deepEqual(model.regions, ['cn-beijing'])
  for (const model of STATIC_MODEL_REGISTRY.siliconflow.models) assert.deepEqual(model.regions, ['cn'])
  assert.equal(STATIC_MODEL_REGISTRY.bailian.models.some((m) => /-realtime|-us$/.test(m.id)), false)
  for (const [provider, id, upstream] of [
    ['openai', 'gpt-image-2', 16], ['gemini', 'gemini-3.1-flash-image', 14],
    ['xai', 'grok-imagine-image-2.0', 5], ['xai', 'grok-imagine-image', 3],
    ['siliconflow', 'Qwen/Qwen-Image-Edit-2509', 3], ['bailian', 'vidu/viduq3-fast_reference2image', 14],
  ]) {
    const cap = STATIC_MODEL_REGISTRY[provider].models.find((m) => m.id === id).capabilities
    assert.equal(cap.maxReferenceImages, 1, `${provider}/${id} product source limit`)
    assert.equal(cap.providerMaxReferenceImages, upstream, `${provider}/${id} documented API limit`)
  }
  for (const [provider, id] of [['siliconflow', 'Qwen/Qwen-Image-Edit'], ['siliconflow', 'Qwen/Qwen-Image-Edit-2509'], ['bailian', 'wan2.5-i2i-preview'], ['bailian', 'wanx2.1-imageedit']]) {
    const cap = STATIC_MODEL_REGISTRY[provider].models.find((m) => m.id === id).capabilities
    assert.equal(cap.imageGeneration, false); assert.equal(cap.imageEditing, true); assert.equal(cap.requiresSourceImage, true)
  }
})
