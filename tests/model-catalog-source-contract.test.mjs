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
const current = JSON.parse(fs.readFileSync(path.join(root, 'config/model-catalog-updates.json'), 'utf8'))
const channels = ['cn', 'runware'].flatMap(name => JSON.parse(fs.readFileSync(path.join(root, `config/channel-audit/${name}-directory.json`), 'utf8')))

const officialContracts = JSON.parse(fs.readFileSync(path.join(root, 'config/channel-audit/official-contracts.json'), 'utf8'))
const officialAudits = Object.fromEntries(['xai', 'sensenova', 'stepfun', 'qianfan', 'iflytek', 'longcat'].map(provider => [provider, JSON.parse(fs.readFileSync(path.join(root, `config/channel-audit/v24/${provider}.json`), 'utf8'))]))

function assertOfficialEvidence(provider, model) {
  const reviewed = officialAudits[provider]?.models.find(row => row.id === model.id)
  const contract = officialContracts[provider + '/' + model.id]
  assert.ok(reviewed && contract, `${provider}/${model.id} needs both official audit and executable contract`)
  assert.deepEqual([...new Set(reviewed.roles.map(role => role.startsWith('image-') ? 'image' : role))].sort(), [...model.roles].sort())
  assert.deepEqual(contract.roles, model.roles)
  assert.match(contract.source, /^https:\/\//)
  const integration = provider === 'xai' ? reviewed : JSON.parse(fs.readFileSync(path.join(root, `config/channel-audit/v24/${provider}-integration.json`), 'utf8')).models.find(row => row.id === model.id)
  assert.equal(integration.realInference, false)
  assert.equal(integration.accountEntitlement, false)
  assert.equal(integration.billingVerified, false)
  assert.equal(model.verified, false)
}

test('backend and both bundled catalogs are generated from the same reviewed source without drift', () => {
  assert.equal(STATIC_MODEL_REGISTRY_VERSION, current.version)
  assert.equal(mini.STATIC_MODEL_REGISTRY_VERSION, current.version)
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
  assert.equal(audit.staticCount, 760)
  assert.equal(audit.selectableStaticCount, 754)
  assert.equal(audit.incompatiblePolicy, 'omit-incompatible-retain-retired-identities')
  for (const row of audit.decisions) {
    assert.ok(row.reason.trim().length > 10, `${row.provider}/${row.id}: missing rationale`)
    assert.match(row.source, /^https:\/\//)
    if (row.provider === 'openrouter') { assert.ok(['dynamic', 'dynamic-excluded'].includes(row.decision)); continue }
    const model = STATIC_MODEL_REGISTRY[row.provider]?.models.find((m) => m.id === row.resolvedId)
    // The original exclusion remains a historical fact; only this exact reviewed
    // v24 adapter supersedes it, never a blanket exception for older exclusions.
    if (row.provider === 'xai' && row.resolvedId === 'grok-4.20-multi-agent-0309') {
      assert.equal(row.decision, 'excluded')
      assert.equal(officialAudits.xai.models.find(m => m.id === row.resolvedId).decision, 'adapt')
      assert.equal(model.selectable, true)
      assertOfficialEvidence(row.provider, model)
      continue
    }
    if (['added', 'covered', 'alias'].includes(row.decision)) assert.equal(model?.selectable, true, `${row.provider}/${row.id}`)
    else if (row.decision === 'disabled') assert.equal(model?.selectable, false, `${row.provider}/${row.id}`)
    else { assert.equal(row.decision, 'excluded'); assert.equal(model?.selectable === true, false, `${row.provider}/${row.id} exclusion contradicts catalog`) }
  }
  for (const [provider, registry] of Object.entries(STATIC_MODEL_REGISTRY)) {
    assert.equal(new Set(registry.models.map((m) => m.id)).size, registry.models.length)
    for (const model of registry.models) {
      if (!model.selectable) {
        assert.ok(model.disabledReason && model.lifecycleSourceUrl, `${provider}/${model.id} needs an official retirement reason`)
        assert.ok(audit.latestUpdate.removedFromSelection.includes(`${provider}/${model.id}`))
      }
      const previous = audit.decisions.some((row) => row.provider === provider && row.resolvedId === model.id)
      const added = channels.find(row => row.channel === provider && row.apiModelId === model.id)
      const official = officialContracts[provider + '/' + model.id]
      assert.ok(previous || added || official, `${provider}/${model.id} lacks audit evidence`)
      if (official) assertOfficialEvidence(provider, model)
      if (added) {
        assert.equal(added.after, '适配链路已完成但真实调用未验证')
        assert.deepEqual(added.roles, model.roles)
        assert.match(added.source, /^https:\/\//)
        assert.ok(added.decision.length > 10)
      }
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

test('September refresh keeps all previous provider defaults and exact retired identities', () => {
  const review = JSON.parse(fs.readFileSync(path.join(root, 'config/model-catalog-review-20260921.json'), 'utf8'))
  for (const [provider, defaults] of Object.entries(review.baselineDefaults)) assert.deepEqual(STATIC_MODEL_REGISTRY[provider].defaults, defaults, provider)
  assert.equal(review.added.length, 20)
  assert.equal(review.retired.length, 6)
  for (const item of review.retired) {
    const model = STATIC_MODEL_REGISTRY[item.provider].models.find(m => m.id === item.id)
    assert.equal(model.selectable, false)
    assert.ok(model.disabledReason)
  }
  for (const item of review.added) {
    const model = STATIC_MODEL_REGISTRY[item.provider].models.find(m => m.id === item.id)
    assert.deepEqual(model.roles, item.roles)
    assert.equal(model.verified, false)
    assert.equal(model.verificationState, 'catalog')
  }
})
