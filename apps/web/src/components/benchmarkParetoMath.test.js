import assert from 'node:assert/strict'
import test from 'node:test'
import { OFFICIAL_PRICES, TEST_COSTS, comparisonPrice, compareCost, costNumber, decimal, filterModels, groupPoints, megapixels, officialPrice, paretoFrontier, slotCost } from './benchmarkParetoMath.js'

const row = (id, cost, score, detail = score) => ({ model: { modelId: id, displayName: id, developer: 'OpenAI', overallScore: score, dimensions: { detail: { mean: detail } } }, price: { status: 'comparable', exact: decimal(cost), usd: Number(cost) } })
const ids = rows => rows.map(r => r.model.modelId).sort()
function boundModel(id) {
  const entry = OFFICIAL_PRICES.models.find(p => p.modelId === id)
  return { modelId: id, overallScore: 8, evidence: entry.binding.map(s => ({ ...s, actualOutputPixels: { width: s.width, height: s.height } })) }
}
test('weak dominance requires one strict improvement and retains fully overlapping models', () => {
  const rows = [row('a', '.1', 8), row('a2', '.1', 8), row('same-cost-lower', '.1', 7), row('same-score-costlier', '.2', 8), row('cheap', '.05', 6), row('best', '.3', 9), row('dominated', '.4', 8)]
  assert.deepEqual(ids(paretoFrontier(rows)), ['a', 'a2', 'best', 'cheap'])
  assert.equal(groupPoints(rows, 'overall').length, 6)
})
test('raw scores and exact rational costs decide near ties', () => {
  assert.deepEqual(ids(paretoFrontier([row('a', '.100000000000000001', 8.00001), row('b', '.100000000000000002', 8)])), ['a'])
  assert.deepEqual(ids(paretoFrontier([row('a', '.1', 8.00001), row('b', '.1', 8.00002)])), ['b'])
  assert.equal(compareCost(decimal('0.010'), decimal('.01')), 0)
})
test('invalid and missing cost are excluded, while a zero score remains valid', () => {
  assert.deepEqual(ids(paretoFrontier([row('valid', '.01', 0), row('zero-cost', '0', 10), row('missing-score', '.05', null), { model: {}, price: { status: 'unconfirmed' } }])), ['valid'])
  assert.deepEqual(paretoFrontier([]), [])
})
test('dimension, vendor, text and inclusive price boundaries recompute visible frontier', () => {
  const rows = [row('Alpha', '.1', 8, 5), row('Beta', '.2', 7, 9), row('Gamma', '.01', 3, 1)]
  rows[2].model.developer = 'Other'
  assert.deepEqual(ids(paretoFrontier(rows)), ['Alpha', 'Gamma'])
  assert.deepEqual(ids(paretoFrontier(rows, 'detail')), ['Alpha', 'Beta', 'Gamma'])
  assert.deepEqual(ids(filterModels(rows, { query: 'BEta' }).visible), ['Beta'])
  assert.deepEqual(ids(filterModels(rows, { vendor: 'openai', min: '.1', max: '.1' }).visible), ['Alpha'])
  assert.equal(filterModels(rows, { min: '.3', max: '.1' }).visible.length, 0)
  assert.match(filterModels(rows, { min: '-1' }).error, /非负/)
  assert.equal(filterModels(rows, { min: '-1' }).matching.length, rows.length)
  assert.equal(filterModels([...rows, { model: { modelId: 'missing', displayName: 'Missing' }, price: { status: 'unconfirmed' } }], { min: '.5' }).missing.length, 1)
})
test('binary megapixels are rounded separately; output tier boundary is inclusive', () => {
  assert.equal(megapixels(1024, 1024), 1);assert.equal(megapixels(1025, 1024), 2)
  assert.equal(megapixels(1824, 1024), 2);assert.equal(megapixels(2048, 1152), 3)
  const rule = { kind: 'bfl_mp', first: '.03', additional: '.015', input: '.015' }
  assert.equal(costNumber(slotCost(rule, { kind: 'generation', width: 1824, height: 1024 }, {})), .045)
  assert.equal(costNumber(slotCost(rule, { kind: 'edit', width: 1824, height: 1024 }, { width: 2048, height: 1152 })), .09)
  const tier = { kind: 'pixel_tier', low: '.30', high: '.60', threshold: 2610000, input: '0' }
  assert.equal(costNumber(slotCost(tier, { kind: 'generation', width: 2610, height: 1000 }, {})), .3)
  assert.equal(costNumber(slotCost(tier, { kind: 'generation', width: 2611, height: 1000 }, {})), .6)
})
test('nine equal weights include reference inputs and exact ECB currency conversion', () => {
  assert.equal(officialPrice(boundModel('black-forest-labs/flux.2-pro')).usd, .06)
  assert.equal(officialPrice(boundModel('black-forest-labs/flux.2-klein-4b')).usd, .016)
  const krea = officialPrice(boundModel('krea/krea-2-medium'))
  assert.equal(compareCost(krea.exact, { n: 19n, d: 600n }), 0)
  const qwen = officialPrice(boundModel('qwen-image-3.0-pro'))
  assert.ok(Math.abs(qwen.usd - ((6 * .5 + 3 * .52) / 9) * 1.1460 / 7.6755) < 1e-15)
})
test('failed slots never silently become free or change the denominator', () => {
  const catalog = structuredClone(OFFICIAL_PRICES), entry = catalog.models.find(p => p.modelId === 'krea/krea-2-medium'), model = boundModel(entry.modelId)
  entry.binding[0].status = model.evidence[0].status = 'failed'
  entry.binding[0].imageHash = model.evidence[0].imageHash = null
  entry.binding[0].width = entry.binding[0].height = null;model.evidence[0].actualOutputPixels = null
  assert.equal(officialPrice(model, catalog).usd, 19 / 600)
  const bfl = catalog.models.find(p => p.modelId === 'black-forest-labs/flux.2-pro'), bflModel = boundModel(bfl.modelId)
  bfl.binding[0].width = null;bflModel.evidence[0].actualOutputPixels.width = null
  assert.equal(officialPrice(bflModel, catalog).status, 'conditions_missing')
})
test('changed generation evidence fails closed; score, comments and actual costs never affect pricing', () => {
  const model = boundModel('krea/krea-2-large'), baseline = officialPrice(model).usd
  model.overallScore = 1;model.evidence[0].scores = { axis: 1 };model.evidence[0].reviewNotes = ['new'];model.actualCost = 999
  assert.equal(officialPrice(model).usd, baseline)
  model.evidence[0].imageHash = 'changed'
  assert.equal(officialPrice(model).status, 'conditions_missing')
  assert.equal(officialPrice({ modelId: 'new/unknown' }).status, 'unconfirmed')
})
test('46 model scope has exact identities and primary sources; withdrawn models cannot reappear', () => {
  assert.equal(OFFICIAL_PRICES.models.length, 46)
  assert.equal(new Set(OFFICIAL_PRICES.models.map(m => m.modelId)).size, 46)
  assert.ok(!OFFICIAL_PRICES.models.some(m => ['codex:gpt-image-2', 'sourceful/riverflow-v2-pro'].includes(m.modelId)))
  assert.equal(OFFICIAL_PRICES.models.filter(m => m.status === 'comparable').length, 28)
  OFFICIAL_PRICES.models.forEach(m => {
    assert.equal(m.checkedAt, '2026-09-20');assert.ok(m.sources.length > 0)
    m.sources.forEach(s => assert.ok(s.url.startsWith('https://')))
    if (m.status === 'comparable') assert.equal(officialPrice(boundModel(m.modelId)).status, 'comparable', m.modelId)
    else assert.ok(m.reason)
  })
})

test('estimated official auto pricing includes input fees but never enters verified frontier', () => {
  const model = boundModel('x-ai/grok-imagine-image-2.0'), price = officialPrice(model)
  assert.equal(price.status, 'estimated');assert.equal(price.usd, .07)
  assert.deepEqual(paretoFrontier([{ model, price }]), [])
  assert.equal(filterModels([{ model, price }], {}).missing.length, 1)
})

function billedModel(entry) {
  return { modelId: entry.modelId, profileId: entry.profileId, displayName: entry.modelId, overallScore: 8,
    evidence: entry.binding.map(s => ({ ...s, actualOutputPixels: { width: s.width, height: s.height } })) }
}
test('only seven authorized reconciled bills join the 28 official quotes with exact nine-slot means', () => {
  const expected = [.034, .101, .15, .039, .128, .25, .25]
  assert.equal(TEST_COSTS.models.length, 7)
  TEST_COSTS.models.forEach((entry, i) => {
    const model = billedModel(entry), price = comparisonPrice(model)
    assert.equal(price.usd, expected[i]);assert.equal(price.costBasis, 'test')
    assert.equal(price.slots.length, 9);assert.equal(price.status, 'comparable')
    assert.equal(comparisonPrice(model, 'official').status, 'conditions_missing')
    assert.equal(officialPrice(model).status, 'conditions_missing')
    assert.deepEqual(filterModels([{ model, price }], {}).visible.map(r => r.model.modelId), [entry.modelId])
  })
  const rows = OFFICIAL_PRICES.models.map(entry => {
    const billed = TEST_COSTS.models.find(m => m.modelId === entry.modelId)
    const model = billed ? billedModel(billed) : entry.binding ? boundModel(entry.modelId) : { modelId: entry.modelId }
    return { model, price: comparisonPrice(model) }
  })
  assert.equal(rows.filter(r => r.price.status === 'comparable').length, 35)
  assert.equal(comparisonPrice({ modelId: 'sourceful/riverflow-v2-pro' }).status, 'unconfirmed')
})
test('incomplete, stale, unverified or mismatched bills cannot become plotted costs', () => {
  const entry = TEST_COSTS.models[0], model = billedModel(entry)
  for (const mutate of [
    c => { c.models[0].binding.pop() },
    c => { c.models[0].binding[1] = structuredClone(c.models[0].binding[0]) },
    c => { c.models[0].binding[0].billing.basis = 'budget_estimate' },
    c => { c.models[0].binding[0].billing.amount = null },
    c => { c.models[0].binding[0].billing.currency = 'CNY' },
    c => { c.models[0].binding[0].billing.evidenceHash = '' },
    c => { c.models[0].binding[0].billing.verifiedAt = '' },
    c => { c.models[0].total = '123' },
  ]) {
    const catalog = structuredClone(TEST_COSTS);mutate(catalog)
    assert.equal(comparisonPrice(model, 'combined', catalog).status, 'conditions_missing')
  }
  model.evidence[0].imageHash = 'changed'
  assert.equal(comparisonPrice(model).status, 'conditions_missing')
})
test('billed failures keep their recorded amount and one ninth weight; scores cannot alter bills', () => {
  const catalog = structuredClone(TEST_COSTS), entry = catalog.models[0], model = billedModel(entry)
  entry.binding[0].status = model.evidence[0].status = 'failed'
  entry.binding[0].imageHash = model.evidence[0].imageHash = null
  entry.binding[0].width = entry.binding[0].height = null;model.evidence[0].actualOutputPixels = null
  model.overallScore = 0;model.evidence[0].reviewNotes = ['updated review']
  assert.equal(comparisonPrice(model, 'combined', catalog).usd, .034)
  entry.binding[0].billing.amount = '0';entry.total = '.272'
  assert.equal(comparisonPrice(model, 'combined', catalog).usd, .272 / 9)
})
