import assert from 'node:assert/strict'
import test from 'node:test'

import { SCIENTIFIC_WEB_CONTRACT } from './scientificBenchmarkContract.js'

const AXES = [
  'faithfulness',
  'conciseness',
  'readability',
  'aesthetics',
  'text_accuracy',
  'topology',
  'instruction_adherence',
]

const SCIENTIFIC_AXES = [...SCIENTIFIC_WEB_CONTRACT.axes]

function scientificResponse() {
  const cases = SCIENTIFIC_WEB_CONTRACT.cases.map((item, index) => ({
    ...structuredClone(item), title: `科研题 ${index + 1}`, instruction: `固定指令 ${index + 1}`,
    rubric: Object.fromEntries(item.applicableAxes.map((axis) => [axis, `${axis} 评分准则`])),
    ...(item.kind === 'generation' ? { aspectRatio: '16:9', negativePrompt: '不得增加未要求内容' } : {}),
  }))
  return {
    releaseHash: 'b'.repeat(64),
    suite: { id: SCIENTIFIC_WEB_CONTRACT.suiteId, version: 2, language: 'zh-CN', manifestHash: SCIENTIFIC_WEB_CONTRACT.suiteHash, caseCount: 9, cases },
    scoring: { scoreMin: 0, scoreMax: 10, axes: [...SCIENTIFIC_AXES], weights: SCIENTIFIC_AXES.map(() => 0.1), overallFormula: 'ten_dimension_raw_equal_weight_mean', tieMethod: 'competition', failureScore: 0 },
    methodology: {
      suiteId: SCIENTIFIC_WEB_CONTRACT.suiteId, suiteHash: SCIENTIFIC_WEB_CONTRACT.suiteHash, evaluationMode: 'codex_scientific_v2', evaluationEpoch: 'codex-scientific-2026-09-v1',
      reviewProtocol: 'codex-independent-double-review-v2', presentationVersion: 'scientific-leaderboard-v2', expectedCaseCount: 9, dimensions: [...SCIENTIFIC_AXES],
      overallFormula: 'ten_dimension_raw_equal_weight_mean', tieMethod: 'competition', failureScore: 0,
      retryPolicy: { confirmedFailureMaxAttempts: 4, unknownProviderOutcome: 'pause_no_retry' }, routePriority: ['bailian', 'ark', 'openrouter'],
      providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 }, blindReview: { reviewers: 2, arbitration: 'xhigh_on_dispute', automaticJudges: [] },
      knownLimitations: ['fixed-nine-case-suite', 'single-production-run-per-model'], automaticJudges: [], automaticJudgmentCount: 0,
      rankingMethod: { id: 'ten_dimension_raw_equal_weight_mean', axes: [...SCIENTIFIC_AXES], weights: SCIENTIFIC_AXES.map(() => 0.1), tieMethod: 'competition' },
    },
  }
}

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
    license: { ...license },
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
      evaluationEpoch: 'codex-single-2026-08-v1',
      reviewProtocol: 'codex-single-two-pass-v1',
      reviewerKind: 'codex',
      reviewerPasses: 2,
      automaticJudges: [],
      noOverallScore: false,
      rankingMethod: {
        id: 'equal_weight_mean_v1',
        axes: [...AXES],
        weights: AXES.map(() => 1 / 7),
        tieMethod: 'competition',
        ignored: { secret: true },
      },
      ignoredInternalField: { secret: true },
    },
    suite: {
      id: 'pb-image-light-v1',
      title: 'Suite title',
      version: 1,
      language: 'zh-CN',
      license: { ...license },
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
  ['wrong score minimum', (value) => { value.scoring.scoreMin = 1 }],
  ['wrong score maximum', (value) => { value.scoring.scoreMax = 9 }],
  ['wrong minimum reviewed samples', (value) => { value.scoring.minimumReviewedSamples = 2 }],
  ['wrong maximum samples per model', (value) => { value.scoring.maximumSamplesPerModel = 5 }],
  ['wrong overall formula', (value) => { value.scoring.overallFormula = 'weighted_mean_v1'; value.methodology.rankingMethod.id = 'weighted_mean_v1' }],
  ['wrong scoring tie method', (value) => { value.scoring.tieMethod = 'dense'; value.methodology.rankingMethod.tieMethod = 'dense' }],
  ['wrong red-line policy', (value) => { value.scoring.redLinePolicy = 'none' }],
  ['automatic judges contains object', (value) => { value.methodology.automaticJudges = ['judge', { id: 'bad' }] }],
  ['automatic judges is nonempty', (value) => { value.methodology.automaticJudges = ['judge-a'] }],
  ['review passes string', (value) => { value.methodology.reviewerPasses = '2' }],
  ['wrong suite id', (value) => { value.methodology.suiteId = 'other-suite' }],
  ['wrong suite hash binding', (value) => { value.methodology.suiteHash = 'other-hash' }],
  ['wrong evaluation mode', (value) => { value.methodology.evaluationMode = 'dual_judge' }],
  ['wrong evaluation epoch', (value) => { value.methodology.evaluationEpoch = 'other-epoch' }],
  ['wrong review protocol', (value) => { value.methodology.reviewProtocol = 'single-pass-v1' }],
  ['wrong reviewer kind', (value) => { value.methodology.reviewerKind = 'human' }],
  ['wrong reviewer passes', (value) => { value.methodology.reviewerPasses = 1 }],
  ['wrong overall-score flag', (value) => { value.methodology.noOverallScore = true }],
  ['ranking method nonplain', (value) => { value.methodology.rankingMethod = [] }],
  ['ranking axes missing', (value) => { value.methodology.rankingMethod.axes.pop() }],
  ['ranking axes reordered', (value) => { [value.methodology.rankingMethod.axes[0], value.methodology.rankingMethod.axes[1]] = [value.methodology.rankingMethod.axes[1], value.methodology.rankingMethod.axes[0]] }],
  ['ranking axes contains object', (value) => { value.methodology.rankingMethod.axes[0] = { axis: 'faithfulness' } }],
  ['ranking weights object', (value) => { value.methodology.rankingMethod.weights = Object.fromEntries(AXES.map((axis) => [axis, 1 / 7])) }],
  ['ranking weights length six', (value) => { value.methodology.rankingMethod.weights.pop() }],
  ['ranking weights length eight', (value) => { value.methodology.rankingMethod.weights.push(1 / 7) }],
  ['ranking weight is NaN', (value) => { value.methodology.rankingMethod.weights[0] = Number.NaN }],
  ['ranking weight is negative', (value) => { value.methodology.rankingMethod.weights[0] = -1 / 7 }],
  ['ranking weights do not sum to one', (value) => { value.methodology.rankingMethod.weights[0] = 0.25 }],
  ['ranking weights are not equal', (value) => { value.methodology.rankingMethod.weights[0] += 0.01; value.methodology.rankingMethod.weights[1] -= 0.01 }],
  ['ranking tie differs from scoring', (value) => { value.methodology.rankingMethod.tieMethod = 'ordinal' }],
  ['ranking id differs from formula', (value) => { value.methodology.rankingMethod.id = 'different_formula' }],
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
  assert.deepEqual(normalized.methodology.rankingMethod, {
    id: 'equal_weight_mean_v1',
    axes: AXES,
    weights: AXES.map(() => 1 / 7),
    tieMethod: 'competition',
  })
  assert.notEqual(normalized.methodology.rankingMethod.axes, response.methodology.rankingMethod.axes)
  assert.notEqual(normalized.methodology.rankingMethod.weights, response.methodology.rankingMethod.weights)
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

test('normalizer accepts only the exact scientific v2 nine-case ten-dimension methodology', async () => {
  const normalizeMethodologyResponse = await normalizer()
  const normalized = normalizeMethodologyResponse(scientificResponse())
  assert.equal(normalized?.suite.cases.length, 9)
  assert.deepEqual(normalized?.scoring.axes, SCIENTIFIC_AXES)
  assert.equal(normalized?.methodology.failureScore, 0)
  assert.equal(normalized?.methodology.retryPolicy.unknownProviderOutcome, 'pause_no_retry')

  const wrongIdentity = scientificResponse()
  wrongIdentity.methodology.presentationVersion = 'arena-leaderboard-v1'
  assert.equal(normalizeMethodologyResponse(wrongIdentity), null)
  const missingAxis = scientificResponse()
  missingAxis.scoring.axes.pop()
  assert.equal(normalizeMethodologyResponse(missingAxis), null)

  const substitute = scientificResponse()
  substitute.suite.cases[0].id = 'scientific-gen-01-substitute'
  assert.equal(normalizeMethodologyResponse(substitute), null)
  const reordered = scientificResponse()
  reordered.suite.cases.reverse()
  assert.equal(normalizeMethodologyResponse(reordered), null)
  const suiteHashTamper = scientificResponse()
  suiteHashTamper.suite.manifestHash = 'c'.repeat(64)
  suiteHashTamper.methodology.suiteHash = 'c'.repeat(64)
  assert.equal(normalizeMethodologyResponse(suiteHashTamper), null)
  const caseHashTamper = scientificResponse()
  caseHashTamper.suite.cases[4].manifestHash = 'd'.repeat(64)
  assert.equal(normalizeMethodologyResponse(caseHashTamper), null)
  const kindTamper = scientificResponse()
  kindTamper.suite.cases[6].kind = 'generation'
  assert.equal(normalizeMethodologyResponse(kindTamper), null)
  const axesTamper = scientificResponse()
  axesTamper.suite.cases[6].applicableAxes = [...axesTamper.suite.cases[6].applicableAxes].reverse()
  assert.equal(normalizeMethodologyResponse(axesTamper), null)
  const budgetTamper = scientificResponse()
  budgetTamper.methodology.providerBudgetsCny.openrouter = 359
  assert.equal(normalizeMethodologyResponse(budgetTamper), null)
})
