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
  const cases = [...rendered.rows.map(row => {
    const link = JSON.parse(fs.readFileSync(path.join(root, 'config/model-audit.generated.json'))).details['tokendance/' + row.modelId].sourceLinks[0]
    return ['tokendance', row.modelId, row.rendersModel ? row.url : link.url, row.rendersModel ? '官方文档' : '原厂规格']
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
    assert.deepEqual(structuredClone(presented.specSources), [{ url, label: label + ' · ' + new URL(url).hostname }])
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
