import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { auditedModelSpecs, removedModel, auditedModelLifecycle } from '../../../packages/api/src/model-audit.js'
import { MODEL_AUDIT_DATA } from '../../../packages/api/src/model-audit-data.js'

const read = (file: string) => JSON.parse(fs.readFileSync(new URL('../../../' + file, import.meta.url), 'utf8'))
test('R13 shared Core/API sources exclude known dead links and retain seven channel identities', () => {
  const dead = new Set(read('config/channel-audit/dead-links-20261109.json').map((row: any) => row.url))
  const repaired = read('apps/web/tests/fixtures/r12-final-link-check-20261109.json').filter((row: any) => row.originalStatus === 404)
  assert.equal(repaired.length, 7)
  for (const { channel, modelId, finalUrl } of repaired) {
    const audit = auditedModelSpecs(channel, modelId)
    assert.ok(!dead.has(audit.sourceUrl))
    assert.equal(audit.sourceLinks[0].url, finalUrl)
    assert.equal(audit.sourceLinks[0].scope, 'vendor')
    assert.equal(removedModel(channel, modelId), null)
    assert.equal(auditedModelLifecycle(channel, modelId), null)
  }
  for (const key of Object.keys(MODEL_AUDIT_DATA.rows)) {
    const slash = key.indexOf('/'), audit = auditedModelSpecs(key.slice(0, slash), key.slice(slash + 1))
    for (const url of [audit.sourceUrl, ...audit.sourceUrls, ...audit.sourceLinks.map((link: any) => link.url)]) assert.ok(!dead.has(url), key)
  }
})

test('R13B Core audit sources resolve notice labels for full/static consumers without changing priority', async () => {
  // Load the actual JS consumers without adding their modules to Core's TS project.
  const { modelCardSources, modelSourceName } = await import(new URL('../../web/src/lib/modelCardSources.js', import.meta.url).href)
  const { STATIC_MODEL_REGISTRY } = await import(new URL('../../web/src/lib/staticModelCatalog.js', import.meta.url).href)
  const { unpackRegistry } = await import(new URL('../../../scripts/lib/model-card-audit.mjs', import.meta.url).href)
  const cases = read('apps/web/tests/fixtures/r13b-notice-cards.json')
  const registry = unpackRegistry(read('apps/web/tests/fixtures/r11-registry-head.json'))
  assert.equal(cases.length, 25)
  for (const { channel, modelId, url } of cases) {
    const audit = auditedModelSpecs(channel, modelId)
    for (const model of [registry.providers[channel].models.find((m: any) => m.id === modelId), STATIC_MODEL_REGISTRY[channel].models.find((m: any) => m.id === modelId)]) {
      assert.ok(model)
      const sources = modelCardSources({ channel, model, audit, fields: audit.fields, lifecycle: auditedModelLifecycle(channel, modelId), checks: MODEL_AUDIT_DATA.sourceChecks })
      assert.ok(sources.sources.includes(url), channel + '/' + modelId)
      assert.equal(modelSourceName(sources, url), '下线公告')
    }
  }
})

test('R13B Core audit records the exact vendor release and its operator HTTP evidence', () => {
  const url = 'https://api-docs.deepseek.com/news/news250325'
  const audit = auditedModelSpecs('tokendance', 'deepseek-chat-v3-0324')
  assert.equal(audit.sourceLinks[0].url, url)
  assert.equal(audit.sourceLinks[0].scope, 'vendor')
  assert.equal(audit.sourceLinks[0].checkedAt, '2026-11-09')
  assert.deepEqual(MODEL_AUDIT_DATA.sourceChecks[url], { status: 200, contentType: 'text/html', checkedAt: '2026-11-09', finalUrl: url + '/', title: 'V3-0324 Release | DeepSeek API Docs' })
  assert.equal(removedModel('tokendance', 'deepseek-chat-v3-0324'), null)
  assert.equal(auditedModelLifecycle('tokendance', 'deepseek-chat-v3-0324'), null)
})
