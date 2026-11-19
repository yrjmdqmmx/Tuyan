import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { STATIC_MODEL_REGISTRY, STATIC_MODEL_REGISTRY_VERSION } from '../apps/web/src/lib/staticModelCatalog.js'
import { miniModelCatalog } from '../scripts/lib/mini-model-catalog.mjs'
import { historicalModels, laterDisabled } from '../test-support/model-catalog-history.mjs'
import removed from '../config/removed-models.json' with {type:'json'}
import versions from '../config/model-version-audit.json' with {type:'json'}
import tokenDance from '../config/tokendance/catalog.json' with {type:'json'}
import { PROVIDERS } from '../apps/web/src/constants.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const mini = require('../apps/miniprogram/miniprogram/utils/static-model-catalog.js')
const audit = JSON.parse(fs.readFileSync(path.join(root, 'config/model-catalog-audit.json'), 'utf8'))
const current = JSON.parse(fs.readFileSync(path.join(root, 'config/model-catalog-updates.json'), 'utf8'))
const channels = ['cn', 'runware'].flatMap(name => JSON.parse(fs.readFileSync(path.join(root, `config/channel-audit/${name}-directory.json`), 'utf8')))
const runwareContracts = JSON.parse(fs.readFileSync(path.join(root, 'config/channel-audit/runware-contracts.json'), 'utf8'))

const officialContracts = JSON.parse(fs.readFileSync(path.join(root, 'config/channel-audit/official-contracts.json'), 'utf8'))
const refreshContracts = { ...JSON.parse(fs.readFileSync(path.join(root, 'config/channel-audit/frontier-refresh-contracts.json'), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(root, 'config/channel-audit/v381-contracts.json'), 'utf8')) }
const officialAudits = Object.fromEntries(['xai', 'sensenova', 'stepfun', 'qianfan', 'iflytek', 'longcat'].map(provider => [provider, JSON.parse(fs.readFileSync(path.join(root, `config/channel-audit/v24/${provider}.json`), 'utf8'))]))

const laterContracts = Object.assign({}, ...['20261009','20261016','20261019','20261026','20261109'].map(date =>
  JSON.parse(fs.readFileSync(path.join(root, `config/channel-audit/catalog-${date}-contracts.json`), 'utf8'))))

function assertLaterAddition(provider, model) {
  const key = provider+'/'+model.id
  const version = versions.models.find(row => row.channel === provider && row.apiModelId === model.id)
  assert.ok(version && version.checkedAt > audit.auditDate, key)
  assert.match(version.sourceUrls[0], /^https:\/\//, key)
  const contract = laterContracts[key]
  const entry = provider === 'tokendance' ? tokenDance.models.find(m => m.id === model.id)
    : current.providers[provider].find(m => m.id === model.id)
  assert.ok(entry, key)
  const roles = contract?.roles ?? (provider === 'tokendance' ? entry.roles.filter(role => role !== 'optimize') : entry.roles)
  assert.deepEqual(model.roles, roles, key)
  assert.match(contract?.source ?? entry.sourceUrl ?? entry.metadata.officialSourceUrl, /^https:\/\//, key)
  assert.equal(model.verified, false, key)
}

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
  assert.deepEqual(mini.STATIC_MODEL_REGISTRY, miniModelCatalog({registry:STATIC_MODEL_REGISTRY}).registry)
  for (const [provider, registry] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of registry.models) {
    const projected = mini.STATIC_MODEL_REGISTRY[provider].models.find(m=>m.id===model.id)
    for (const field of ['id','roles','selectable','disabledReason','availabilityNotes','regions','protocol']) assert.deepEqual(projected[field],model[field],`${provider}/${model.id}/${field}`)
  }
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
    const key = row.provider+'/'+row.resolvedId
    const original = historicalModels[row.provider]?.models.find(m => m.id === row.resolvedId)
    if (row.decision === 'excluded') {
      assert.notEqual(original?.selectable, true, key)
      assert.notEqual(model?.selectable, true, key)
      continue
    }
    assert.ok(['added','covered','alias','disabled'].includes(row.decision), key)
    assert.equal(original?.selectable, row.decision !== 'disabled', key)
    if (Object.hasOwn(removed, key)) {
      assert.equal(model, undefined, key)
      assert.ok(removed[key].displayName && removed[key].stopDate, key)
      assert.match(removed[key].sourceUrl, /^https:\/\//, key)
    } else {
      assert.equal(model?.selectable, laterDisabled.has(key) ? false : original.selectable, key)
    }
  }
  for (const [provider, registry] of Object.entries(STATIC_MODEL_REGISTRY)) {
    assert.equal(new Set(registry.models.map((m) => m.id)).size, registry.models.length)
    for (const model of registry.models) {
      if (!model.selectable) {
        const key = provider+'/'+model.id
        assert.ok(model.disabledReason, key)
        if (audit.latestUpdate.removedFromSelection.includes(key)) {
          assert.match(model.lifecycleSourceUrl, /^https:\/\//, key)
        } else {
          const decision = current.lifecycle[provider]?.[model.id] ?? current.providers[provider]?.find(m => m.id === model.id)?.metadata
          assert.equal(decision?.selectable, false, key)
          assert.equal(model.disabledReason, decision.disabledReason, key)
          assert.match(decision.lifecycleSourceUrl || decision.catalogRemoval?.sourceUrl || decision.officialSourceUrl, /^https:\/\//, key)
        }
      }
      const previous = audit.decisions.some((row) => row.provider === provider && row.resolvedId === model.id)
      const added = channels.find(row => row.channel === provider && row.apiModelId === model.id)
      const official = officialContracts[provider + '/' + model.id]
      const refresh = refreshContracts[provider + '/' + model.id]
      if (!previous && !added && !official && !refresh) assertLaterAddition(provider, model)
      if (refresh) {
        assert.deepEqual(refresh.roles, model.roles)
        assert.equal(refresh.realInference, false)
        assert.equal(refresh.accountEntitlement, false)
        assert.equal(refresh.billingVerified, false)
        assert.match(refresh.source, /^https:\/\//)
      }
      if (official) assertOfficialEvidence(provider, model)
      if (provider === 'xiaomi' && model.id === 'mimo-v2.6-pro-ultraspeed') {
        assert.equal(added.after, '尚未登记')
        assert.deepEqual(added.roles, [])
        assertLaterAddition(provider, model)
        assert.deepEqual(model.roles, ['main','vision'])
        assert.match(model.availabilityNotes, /需厂商单独开通/)
      } else if (added) {
        if (provider === 'runware' && added.checkedAt === '2026-10-09') {
          const contract = runwareContracts['runware/'+model.id]
          assert.equal(added.after, '待自动化验证')
          assert.match(added.schemaSha256, /^[a-f0-9]{64}$/)
          assert.equal(contract.schemaSha256, added.schemaSha256)
          assert.equal(contract.schemaSource, added.schemaSource)
          assert.deepEqual(contract.roles, model.roles)
          assert.equal(model.verified, false)
        } else {
          assert.equal(added.after, '适配链路已完成但真实调用未验证')
        }
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
