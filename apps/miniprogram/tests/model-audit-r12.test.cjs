const {sourceTitle}=require('../miniprogram/utils/card-presentation.js')
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { auditedModelSpecs } = require('../miniprogram/utils/model-audit.js')
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const root = path.resolve(__dirname, '../../..')

test('R12 compiled Mini URLs and labels match full Web objects for 74 captured pages, Bailian specificity and retirement', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09'))
  const { loadCard, readPackedRegistry } = await import('../../../scripts/lib/model-card-audit.mjs')
  const { modelSourceName } = await import('../../web/src/lib/modelCardSources.js')
  const web = await loadCard(root), full = readPackedRegistry(path.join(root, 'apps/web/tests/fixtures/r11-registry-head.json'))
  // Exercise the compiled presenter even for historical cards the picker hides.
  const filename = path.join(root, 'apps/miniprogram/miniprogram/components/model-picker/model-picker.js')
  const context = { Component() {}, exports: {}, require: createRequire(filename) }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\nthis.present = presentModel', context, { filename })
  const rendered = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/tests/fixtures/r12-tokendance-rendered.json')))
  const {expectedTokenDanceSources}=await import('../../../test-support/card-review-r22.mjs')
  const cases = [...rendered.rows.map(row => {
    return ['tokendance', row.modelId, expectedTokenDanceSources(row.modelId)[0], row.rendersModel ? '官方文档' : '原厂规格']
  }),
    ...[['qwen3.8-max', 'qwen3-8-max'], ['qwen3.7-max-2026-06-08', 'qwen3-7-max'], ['qwen3.8-flash', 'vision-model']].map(([id, page]) => ['bailian', id, 'https://help.aliyun.com/zh/model-studio/' + page, '官方文档']),
    ...['qwen3.5-plus', 'qwen3.5-plus-2026-02-15', 'qwen3.5-plus-2026-04-20'].map(id => ['bailian', id, 'https://help.aliyun.com/zh/model-studio/model-depreciation', '下线公告'])]
  assert.equal(cases.length, 80)
  for (const [channel, id, url, label] of cases) {
    const model = full.providers[channel].models.find(m => m.id === id)
    const card = web(channel, model), small = auditedModelSpecs(channel, id)
    assert.equal(card.sources[0], url); assert.equal(small.sourceUrl, url)
    assert.equal(modelSourceName(card, url), label); assert.equal(small.sourceLabel, label)
    const staticModel = STATIC_MODEL_REGISTRY[channel].models.find(m => m.id === id)
    const presented = context.present(staticModel, '', '', channel)
    assert.deepEqual(structuredClone(presented.specSources), [{ ...(['bailian/xiaomi/mimo-v2.5-pro', 'tokenhub/mimo-v2.5-pro'].includes(channel + '/' + id) ? {role:'vendor'} : {}), url, label: label + ' · ' + sourceTitle(url) }, ...small.vendorSources.filter(source => source !== url).map(source => ({url:source,label:'原厂规格 · '+sourceTitle(source)}))])
  }
})

test('R12C projection keeps every rendered fact, qualifier, note and source; only verified IDs use the TokenDance channel template', async () => {
  const { loadCard } = await import('../../../scripts/lib/model-card-audit.mjs')
  const { modelSourceName, isApiSource } = await import('../../web/src/lib/modelCardSources.js')
  const web = await loadCard(root)
  const full = JSON.parse(fs.readFileSync(path.join(root, 'config/model-audit.generated.json')))
  for (const [channel, provider] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of provider.models) {
    // Use the full Web static object, whose specifications Mini stores as facts.
    const original = (await import('../../web/src/lib/staticModelCatalog.js')).STATIC_MODEL_REGISTRY[channel].models.find(m => m.id === model.id)
    const card = web(channel, original), small = auditedModelSpecs(channel, model.id), key = channel + '/' + model.id
    for (const field of Object.keys(card.fields)) for (const property of ['value', 'state', 'provenance', 'unsupportedModalities'])
      assert.deepEqual(small.fields[field][property], card.fields[field][property], key + '/' + field + '/' + property)
    assert.equal(small.fields.totalContextTokens.suffix || '', card.fields.totalContextTokens.suffix || '', key + '/qualifier')
    assert.equal(small.note, full.details[key]?.note || '', key + '/note')
    assert.equal(small.sourceUrl, card.sources[0], key + '/source')
    assert.equal(small.sourceLabel, modelSourceName(card, card.sources[0]), key + '/label')
    assert.equal(isApiSource(small.sourceUrl, full.sourceChecks), false, key)
  }
  const source = fs.readFileSync(path.join(root, 'apps/miniprogram/miniprogram/utils/model-audit-data.js'), 'utf8')
  const { unpackModelCatalog } = require('../miniprogram/utils/unpack-model-catalog.js')
  const data = unpackModelCatalog(JSON.parse(source.match(/unpackModelCatalog\((.*)\)\n/)[1]))
  const identities = Object.entries(STATIC_MODEL_REGISTRY).flatMap(([channel, provider]) => provider.models.map(model => channel + '/' + model.id))
  const flagged = identities.filter((_, i) => data.rows[i][4] === -2).sort()
  const verified = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/tests/fixtures/r12-tokendance-rendered.json'))).rows.filter(row => row.rendersModel).map(row => 'tokendance/' + row.modelId).sort()
  assert.deepEqual(flagged, verified); assert.equal(flagged.length, 67)
  const templatedUrls = new Set(verified.map(key => 'https://tokendance.space/models/' + key.slice('tokendance/'.length)))
  assert.ok(data.sources.every(url => !templatedUrls.has(url)))
  assert.ok(Object.values(data.details).every(detail => !detail.sourceLinks && !detail.sourceUrls))
})

test('R13 compiled picker shows all seven vendor replacements and no catalog card selects a denylisted URL', () => {
  const checks = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/tests/fixtures/r12-final-link-check-20261109.json')))
  const dead = JSON.parse(fs.readFileSync(path.join(root, 'config/channel-audit/dead-links-20261109.json')))
  const deadUrls = new Set(dead.map(row => row.url))
  const filename = path.join(root, 'apps/miniprogram/miniprogram/components/model-picker/model-picker.js')
  const context = { Component() {}, exports: {}, require: createRequire(filename) }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\nthis.present = presentModel', context, { filename })
  const repaired = checks.filter(row => row.originalStatus === 404)
  assert.equal(repaired.length, 7)
  for (const { channel, modelId, finalUrl } of repaired) {
    const entry = STATIC_MODEL_REGISTRY[channel].models.find(model => model.id === modelId)
    const small = auditedModelSpecs(channel, modelId)
    const label = modelId === 'xai:grok-imagine@image-quality' ? '下线公告' : '原厂规格'
    assert.equal(small.sourceUrl, finalUrl); assert.equal(small.sourceLabel, label)
    assert.equal(require('../miniprogram/utils/model-audit.js').removedModel(channel, modelId), null)
    const presented = context.present(entry, '', '', channel)
    assert.deepEqual(structuredClone(presented.specSources), [{ url: finalUrl, label: label + ' · ' + sourceTitle(finalUrl) }])
  }
  let cards = 0
  for (const [channel, provider] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of provider.models) {
    cards++
    const presented = context.present(model, '', '', channel)
    for (const source of presented.specSources) assert.ok(!deadUrls.has(source.url), channel + '/' + model.id)
    assert.ok(!deadUrls.has(auditedModelSpecs(channel, model.id).sourceUrl))
  }
  assert.equal(cards, 1064)
})

test('R13B pre-phase-2 static notice priorities and all 34 visible notices remain reproducible', async () => {
  const { archivedAuditText, loadCard } = await import('../../../scripts/lib/model-card-audit.mjs')
  const web = await loadCard(root, 'd1fe6ff6')
  const source = archivedAuditText(root, 'd1fe6ff6', 'apps/web/src/lib/staticModelCatalog.js').replace(/export const /g, 'const ')
  const oldStatic = vm.runInNewContext(source + ';STATIC_MODEL_REGISTRY')
  const cases = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/tests/fixtures/r13b-notice-cards.json')))
  assert.equal(cases.length, 25)
  for (const { channel, modelId, url } of cases) {
    assert.equal(web(channel, oldStatic[channel].models.find(model => model.id === modelId)).sources[0], url)
  }
  let notices = 0
  for (const [channel, provider] of Object.entries(oldStatic)) for (const model of provider.models) {
    if (/deprecat|depreciat|retire|sunset|下线|aliyun\.com\/notice\/\d+|docs\.x\.ai\/developers\/migration\//i.test(web(channel, model).sources[0])) notices++
  }
  assert.equal(notices, 34)
})

test('R13B compiled picker resolves full-model source priorities and retains notice labels', () => {
  const cases = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/tests/fixtures/r13b-notice-cards.json')))
  assert.equal(cases.length, 25)
  const filename = path.join(root, 'apps/miniprogram/miniprogram/components/model-picker/model-picker.js')
  const context = { Component() {}, exports: {}, require: createRequire(filename) }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\nthis.present = presentModel', context, { filename })
  for (const row of [...cases.map(row => ({ ...row, url: row.fullFirstUrl, label: row.url === row.fullFirstUrl ? '下线公告' : '官方文档' })), {
    channel: 'tokendance', modelId: 'deepseek-chat-v3-0324', url: 'https://api-docs.deepseek.com/news/news250325', label: '原厂规格',
  }]) {
    const { channel, modelId, url, label } = row
    const entry = STATIC_MODEL_REGISTRY[channel].models.find(model => model.id === modelId)
    const small = auditedModelSpecs(channel, modelId)
    assert.equal(small.sourceUrl, url); assert.equal(small.sourceLabel, label)
    assert.deepEqual(structuredClone(context.present(entry, '', '', channel).specSources), [{ ...(['bailian/xiaomi/mimo-v2.5-pro', 'tokenhub/mimo-v2.5-pro'].includes(channel + '/' + modelId) ? {role:'vendor'} : {}), url, label: label + ' · ' + sourceTitle(url) }, ...small.vendorSources.filter(source => source !== url).map(source => ({url:source,label:'原厂规格 · '+sourceTitle(source)}))])
  }
  let notices = 0
  const appendedNotices = []
  for (const [channel, provider] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of provider.models) {
    for (const { url, label } of context.present(model, '', '', channel).specSources) {
      if (/deprecat|depreciat|retire|sunset|下线|aliyun\.com\/notice\/\d+|docs\.x\.ai\/developers\/migration\//i.test(url)) {
        notices++
        const primary = auditedModelSpecs(channel, model.id).sourceUrl === url
        if (!primary) appendedNotices.push(channel + '/' + model.id)
        assert.equal(label, (primary ? '下线公告' : '原厂规格') + ' · ' + sourceTitle(url), channel + '/' + model.id)
      }
    }
  }
  assert.equal(notices, 19)
  assert.deepEqual(appendedNotices.sort(), ['tokendance/qwen3.5-plus', 'qianfan/qwen-image-edit', 'siliconflow/Qwen/Qwen-Image-Edit'].sort())
})
