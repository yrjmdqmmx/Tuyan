import assert from 'node:assert/strict'
import test from 'node:test'

const AXES = [
  'faithfulness',
  'conciseness',
  'readability',
  'aesthetics',
  'text_accuracy',
  'topology',
  'instruction_adherence',
]

const license = { spdx: 'CC-BY-4.0', author: 'PaperBanana contributors', source: 'original' }

function makeCase(index) {
  return {
    id: `case-${index}`,
    category: `category-${index}`,
    title: `Title ${index}`,
    caption: `Caption ${index}`,
    aspectRatio: index === 1 ? '16:9' : 'auto',
    renderPrompt: `Prompt ${index}`,
    negativePrompt: `Negative ${index}`,
    requiredEntities: [`entity-${index}`],
    requiredRelations: [`relation-${index}`],
    requiredText: [],
    forbidden: [`forbidden-${index}`],
    rubric: Object.fromEntries(AXES.map((axis) => [axis, `${axis}-${index}`])),
    license,
    manifestHash: `case-hash-${index}`,
    ignoredInternalField: { secret: true },
  }
}

function validResponse() {
  return {
    code: 0,
    releaseHash: 'release-hash',
    methodology: {
      suiteId: 'pb-image-light-v1',
      suiteHash: 'suite-hash',
      evaluationMode: 'codex_single',
      evaluationEpoch: 'epoch-v1',
      reviewProtocol: 'two-pass-v1',
      reviewerKind: 'codex',
      reviewerPasses: 2,
      automaticJudges: [],
      noOverallScore: false,
      rankingMethod: { id: 'equal_weight_mean_v1', ignored: { secret: true } },
      ignoredInternalField: { secret: true },
    },
    suite: {
      id: 'pb-image-light-v1',
      title: 'Suite title',
      version: 1,
      language: 'zh-CN',
      license,
      manifestHash: 'suite-hash',
      cases: [1, 2, 3, 4].map(makeCase),
      ignoredInternalField: { secret: true },
    },
    scoring: {
      scoreMin: 0,
      scoreMax: 10,
      minimumReviewedSamples: 3,
      maximumSamplesPerModel: 4,
      overallFormula: 'equal_weight_mean_v1',
      tieMethod: 'competition',
      redLinePolicy: 'confirmed_axis_cap',
      ignoredInternalField: { secret: true },
    },
  }
}

async function normalizer() {
  let module
  try {
    module = await import('./benchmarkMethodology.js')
  } catch {}
  assert.equal(typeof module?.normalizeMethodologyResponse, 'function')
  return module.normalizeMethodologyResponse
}

const malformedVariants = [
  ['object case title', (value) => { value.suite.cases[0].title = { text: 'bad' } }],
  ['object prompt', (value) => { value.suite.cases[0].renderPrompt = { text: 'bad' } }],
  ['constraint object item', (value) => { value.suite.cases[0].requiredEntities = ['ok', { text: 'bad' }] }],
  ['rubric missing axis', (value) => { delete value.suite.cases[0].rubric.topology }],
  ['rubric axis object', (value) => { value.suite.cases[0].rubric.faithfulness = { text: 'bad' } }],
  ['suite title object', (value) => { value.suite.title = { text: 'bad' } }],
  ['suite license object field', (value) => { value.suite.license.spdx = { text: 'bad' } }],
  ['case license malformed', (value) => { value.suite.cases[0].license = 'CC-BY-4.0' }],
  ['suite hash object', (value) => { value.suite.manifestHash = { hash: 'bad' } }],
  ['scoring number object', (value) => { value.scoring.scoreMax = { value: 10 } }],
  ['scoring string object', (value) => { value.scoring.tieMethod = { text: 'competition' } }],
  ['automatic judges contains object', (value) => { value.methodology.automaticJudges = ['judge', { id: 'bad' }] }],
  ['review passes string', (value) => { value.methodology.reviewerPasses = '2' }],
  ['ranking method nonplain', (value) => { value.methodology.rankingMethod = [] }],
  ['suite nonplain object', (value) => { value.suite = Object.assign(Object.create({ inherited: true }), value.suite) }],
]

test('normalizer preserves valid public text and array order without mutating its source', async () => {
  const normalizeMethodologyResponse = await normalizer()
  const response = validResponse()
  const snapshot = structuredClone(response)

  const normalized = normalizeMethodologyResponse(response)

  assert.deepEqual(response, snapshot)
  assert.notEqual(normalized, response)
  assert.deepEqual(normalized.suite.cases.map((item) => item.id), ['case-1', 'case-2', 'case-3', 'case-4'])
  assert.deepEqual(normalized.suite.cases[0].requiredEntities, ['entity-1'])
  assert.equal(normalized.suite.cases[0].renderPrompt, 'Prompt 1')
  assert.equal('ignoredInternalField' in normalized.suite.cases[0], false)
  assert.equal('ignoredInternalField' in normalized.methodology, false)
})

test('normalizer rejects every malformed field used by the methodology page', async (t) => {
  const normalizeMethodologyResponse = await normalizer()
  for (const [name, mutate] of malformedVariants) {
    await t.test(name, () => {
      const response = validResponse()
      mutate(response)
      assert.equal(normalizeMethodologyResponse(response), null)
    })
  }
})

test('normalizer rejects non-object, wrong case count, and non-finite numeric fields', async () => {
  const normalizeMethodologyResponse = await normalizer()
  assert.equal(normalizeMethodologyResponse(null), null)
  const wrongCount = validResponse()
  wrongCount.suite.cases.pop()
  assert.equal(normalizeMethodologyResponse(wrongCount), null)
  const nonFinite = validResponse()
  nonFinite.scoring.scoreMin = Number.NaN
  assert.equal(normalizeMethodologyResponse(nonFinite), null)
})
