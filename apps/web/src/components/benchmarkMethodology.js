import { SCIENTIFIC_WEB_CONTRACT } from './scientificBenchmarkContract.js'

const RUBRIC_AXES = Object.freeze([
  'faithfulness',
  'conciseness',
  'readability',
  'aesthetics',
  'text_accuracy',
  'topology',
  'instruction_adherence',
])

const CONSTRAINT_FIELDS = Object.freeze([
  'requiredEntities',
  'requiredRelations',
  'requiredText',
  'forbidden',
])

const WEIGHT_SUM_TOLERANCE = 1e-9
const EXPECTED_SUITE_ID = 'pb-image-light-v1'
const EXPECTED_EVALUATION_MODE = 'codex_single'
const EXPECTED_EVALUATION_EPOCH = 'codex-single-2026-08-v1'
const EXPECTED_REVIEW_PROTOCOL = 'codex-single-two-pass-v1'
const EXPECTED_REVIEWER_KIND = 'codex'
const EXPECTED_REVIEWER_PASSES = 2
const EXPECTED_OVERALL_FORMULA = 'equal_weight_mean_v1'
const EXPECTED_TIE_METHOD = 'competition'
const EXPECTED_RED_LINE_POLICY = 'confirmed_axis_cap'
const EXPECTED_AXIS_WEIGHT = 1 / RUBRIC_AXES.length

const SCIENTIFIC_AXES = SCIENTIFIC_WEB_CONTRACT.axes
const SCIENTIFIC_IDENTITY = SCIENTIFIC_WEB_CONTRACT.identity

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function asText(value) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asStringArray(value) {
  if (!Array.isArray(value) || value.some((item) => asText(item) === null)) return null
  return [...value]
}

function normalizeLicense(value) {
  if (!isPlainObject(value)) return null
  const spdx = asText(value.spdx)
  const author = asText(value.author)
  const source = asText(value.source)
  return spdx && author && source ? { spdx, author, source } : null
}

function normalizeRubric(value) {
  if (!isPlainObject(value)) return null
  const entries = []
  for (const axis of RUBRIC_AXES) {
    const text = asText(value[axis])
    if (text === null) return null
    entries.push([axis, text])
  }
  return Object.fromEntries(entries)
}

function normalizeCase(value) {
  if (!isPlainObject(value)) return null
  const textFields = ['id', 'category', 'title', 'caption', 'aspectRatio', 'renderPrompt', 'negativePrompt', 'manifestHash']
  const normalized = {}
  for (const field of textFields) {
    const text = asText(value[field])
    if (text === null) return null
    normalized[field] = text
  }
  for (const field of CONSTRAINT_FIELDS) {
    const items = asStringArray(value[field])
    if (items === null) return null
    normalized[field] = items
  }
  const rubric = normalizeRubric(value.rubric)
  const license = normalizeLicense(value.license)
  if (!rubric || !license) return null
  return { ...normalized, rubric, license }
}

function normalizeSuite(value) {
  if (!isPlainObject(value) || !Array.isArray(value.cases) || value.cases.length !== 4) return null
  const id = asText(value.id)
  const title = asText(value.title)
  const version = asFiniteNumber(value.version)
  const language = asText(value.language)
  const manifestHash = asText(value.manifestHash)
  const license = normalizeLicense(value.license)
  if (id === null || title === null || version === null || language === null || manifestHash === null || !license) return null
  const cases = value.cases.map(normalizeCase)
  if (cases.some((item) => item === null)) return null
  return { id, title, version, language, license, manifestHash, cases }
}

function normalizeScoring(value) {
  if (!isPlainObject(value)) return null
  const scoreMin = asFiniteNumber(value.scoreMin)
  const scoreMax = asFiniteNumber(value.scoreMax)
  const minimumReviewedSamples = asFiniteNumber(value.minimumReviewedSamples)
  const maximumSamplesPerModel = asFiniteNumber(value.maximumSamplesPerModel)
  const overallFormula = asText(value.overallFormula)
  const tieMethod = asText(value.tieMethod)
  const redLinePolicy = asText(value.redLinePolicy)
  if (scoreMin !== 0 || scoreMax !== 10 || minimumReviewedSamples !== 3 || maximumSamplesPerModel !== 4
    || overallFormula !== EXPECTED_OVERALL_FORMULA || tieMethod !== EXPECTED_TIE_METHOD
    || redLinePolicy !== EXPECTED_RED_LINE_POLICY) return null
  return { scoreMin, scoreMax, minimumReviewedSamples, maximumSamplesPerModel, overallFormula, tieMethod, redLinePolicy }
}

function normalizeRankingMethod(value, scoring) {
  if (!isPlainObject(value)) return null
  const id = asText(value.id)
  const tieMethod = asText(value.tieMethod)
  if (!id || !tieMethod || id !== scoring.overallFormula || tieMethod !== scoring.tieMethod) return null
  if (!Array.isArray(value.axes) || value.axes.length !== RUBRIC_AXES.length
    || value.axes.some((axis, index) => axis !== RUBRIC_AXES[index])) return null
  if (!Array.isArray(value.weights) || value.weights.length !== RUBRIC_AXES.length) return null
  const weights = []
  let weightSum = 0
  for (const weightValue of value.weights) {
    const weight = asFiniteNumber(weightValue)
    if (weight === null || Math.abs(weight - EXPECTED_AXIS_WEIGHT) > WEIGHT_SUM_TOLERANCE) return null
    weights.push(weight)
    weightSum += weight
  }
  if (Math.abs(weightSum - 1) > WEIGHT_SUM_TOLERANCE) return null
  return { id, axes: [...value.axes], weights, tieMethod }
}

function normalizeMethodology(value, scoring, suite) {
  if (!isPlainObject(value) || !isPlainObject(value.rankingMethod)) return null
  const suiteId = asText(value.suiteId)
  const suiteHash = asText(value.suiteHash)
  const evaluationMode = asText(value.evaluationMode)
  const evaluationEpoch = asText(value.evaluationEpoch)
  const reviewProtocol = asText(value.reviewProtocol)
  const reviewerKind = asText(value.reviewerKind)
  const reviewerPasses = asFiniteNumber(value.reviewerPasses)
  const automaticJudges = asStringArray(value.automaticJudges)
  const rankingMethod = normalizeRankingMethod(value.rankingMethod, scoring)
  if (suite.id !== EXPECTED_SUITE_ID || suiteId !== suite.id || suiteHash !== suite.manifestHash
    || evaluationMode !== EXPECTED_EVALUATION_MODE || evaluationEpoch !== EXPECTED_EVALUATION_EPOCH
    || reviewProtocol !== EXPECTED_REVIEW_PROTOCOL || reviewerKind !== EXPECTED_REVIEWER_KIND
    || reviewerPasses !== EXPECTED_REVIEWER_PASSES || automaticJudges?.length !== 0
    || value.noOverallScore !== false || !rankingMethod) return null
  return {
    suiteId,
    suiteHash,
    evaluationMode,
    evaluationEpoch,
    reviewProtocol,
    reviewerKind,
    reviewerPasses,
    automaticJudges,
    noOverallScore: value.noOverallScore,
    rankingMethod,
  }
}

function equalArray(value, expected) {
  return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index])
}

function normalizeScientificCase(value, expected) {
  if (!isPlainObject(value)) return null
  const id = asText(value.id)
  const kind = asText(value.kind)
  const title = asText(value.title)
  const instruction = asText(value.instruction)
  const manifestHash = asText(value.manifestHash)
  const applicableAxes = asStringArray(value.applicableAxes)
  if (!expected || id !== expected.id || kind !== expected.kind || manifestHash !== expected.manifestHash
    || !title || !instruction || !equalArray(applicableAxes, expected.applicableAxes)) return null
  if (!isPlainObject(value.rubric) || Object.keys(value.rubric).length !== applicableAxes.length) return null
  const rubric = {}
  for (const axis of applicableAxes) {
    const text = asText(value.rubric[axis])
    if (!text) return null
    rubric[axis] = text
  }
  if (kind === 'generation') {
    const aspectRatio = asText(value.aspectRatio)
    const negativePrompt = asText(value.negativePrompt)
    if (aspectRatio !== '16:9' || !negativePrompt) return null
    return { id, kind, title, instruction, applicableAxes, rubric, manifestHash, aspectRatio, negativePrompt }
  }
  const sourceHash = asText(value.sourceHash)
  const region = asText(value.region)
  if (sourceHash !== expected.sourceHash || region !== expected.region) return null
  return { id, kind, title, instruction, applicableAxes, rubric, manifestHash, sourceHash, region }
}

function normalizeScientificResponse(response) {
  const releaseHash = asText(response.releaseHash)
  const suite = response.suite
  const scoring = response.scoring
  const methodology = response.methodology
  if (!releaseHash || !isPlainObject(suite) || !isPlainObject(scoring) || !isPlainObject(methodology)
    || suite.id !== SCIENTIFIC_WEB_CONTRACT.suiteId || suite.version !== 2 || suite.language !== 'zh-CN'
    || suite.caseCount !== 9 || suite.manifestHash !== SCIENTIFIC_WEB_CONTRACT.suiteHash
    || !Array.isArray(suite.cases) || suite.cases.length !== SCIENTIFIC_WEB_CONTRACT.cases.length) return null
  const cases = suite.cases.map((item, index) => normalizeScientificCase(item, SCIENTIFIC_WEB_CONTRACT.cases[index]))
  if (cases.some((item) => item === null)) return null
  if (scoring.scoreMin !== 0 || scoring.scoreMax !== 10 || scoring.failureScore !== 0
    || (scoring.unsupportedScore !== undefined && scoring.unsupportedScore !== 0)
    || !equalArray(scoring.axes, SCIENTIFIC_AXES) || scoring.overallFormula !== 'ten_dimension_raw_equal_weight_mean'
    || scoring.tieMethod !== 'competition') return null
  const rankingMethod = methodology.rankingMethod
  if (methodology.suiteId !== SCIENTIFIC_IDENTITY.suiteId || methodology.suiteHash !== suite.manifestHash
    || methodology.evaluationMode !== SCIENTIFIC_IDENTITY.evaluationMode || methodology.evaluationEpoch !== SCIENTIFIC_IDENTITY.evaluationEpoch
    || methodology.reviewProtocol !== SCIENTIFIC_IDENTITY.reviewProtocol || methodology.presentationVersion !== SCIENTIFIC_IDENTITY.presentationVersion
    || methodology.expectedCaseCount !== 9 || !equalArray(methodology.dimensions, SCIENTIFIC_AXES)
    || methodology.overallFormula !== scoring.overallFormula || methodology.tieMethod !== scoring.tieMethod || methodology.failureScore !== 0
    || methodology.retryPolicy?.confirmedFailureMaxAttempts !== 4 || methodology.retryPolicy?.unknownProviderOutcome !== 'pause_no_retry'
    || !equalArray(methodology.routePriority, ['bailian', 'ark', 'openrouter'])
    || methodology.providerBudgetsCny?.bailian !== 180 || methodology.providerBudgetsCny?.ark !== 180 || methodology.providerBudgetsCny?.openrouter !== 180
    || methodology.blindReview?.reviewers !== 2 || methodology.blindReview?.arbitration !== 'xhigh_on_dispute'
    || !equalArray(methodology.blindReview?.automaticJudges, []) || !equalArray(methodology.automaticJudges, [])
    || methodology.automaticJudgmentCount !== 0 || !Array.isArray(methodology.knownLimitations) || !methodology.knownLimitations.length
    || !isPlainObject(rankingMethod) || rankingMethod.id !== scoring.overallFormula || rankingMethod.tieMethod !== 'competition'
    || !equalArray(rankingMethod.axes, SCIENTIFIC_AXES) || !Array.isArray(rankingMethod.weights) || rankingMethod.weights.length !== 10
    || rankingMethod.weights.some((weight) => typeof weight !== 'number' || Math.abs(weight - 0.1) > WEIGHT_SUM_TOLERANCE)) return null
  return {
    releaseHash,
    suite: { id: suite.id, version: suite.version, language: suite.language, caseCount: 9, manifestHash: suite.manifestHash, cases },
    scoring: { scoreMin: 0, scoreMax: 10, axes: [...SCIENTIFIC_AXES], overallFormula: scoring.overallFormula, tieMethod: 'competition', failureScore: 0, unsupportedScore: scoring.unsupportedScore ?? 0 },
    methodology: {
      suiteId: methodology.suiteId, suiteHash: methodology.suiteHash, evaluationMode: methodology.evaluationMode,
      evaluationEpoch: methodology.evaluationEpoch, reviewProtocol: methodology.reviewProtocol, presentationVersion: methodology.presentationVersion,
      expectedCaseCount: 9, dimensions: [...SCIENTIFIC_AXES], overallFormula: methodology.overallFormula, tieMethod: 'competition', failureScore: 0,
      retryPolicy: { confirmedFailureMaxAttempts: 4, unknownProviderOutcome: 'pause_no_retry' }, routePriority: [...methodology.routePriority],
      providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 180 },
      blindReview: { reviewers: 2, arbitration: 'xhigh_on_dispute', automaticJudges: [] },
      knownLimitations: [...methodology.knownLimitations], automaticJudges: [], automaticJudgmentCount: 0,
      rankingMethod: { id: rankingMethod.id, axes: [...SCIENTIFIC_AXES], weights: [...rankingMethod.weights], tieMethod: 'competition' },
    },
  }
}

export function normalizeMethodologyResponse(response) {
  if (!isPlainObject(response)) return null
  if (response.suite?.id === SCIENTIFIC_IDENTITY.suiteId || response.methodology?.evaluationMode === SCIENTIFIC_IDENTITY.evaluationMode) {
    return normalizeScientificResponse(response)
  }
  const releaseHash = asText(response.releaseHash)
  const suite = normalizeSuite(response.suite)
  const scoring = normalizeScoring(response.scoring)
  const methodology = scoring && suite ? normalizeMethodology(response.methodology, scoring, suite) : null
  if (!releaseHash || !suite || !scoring || !methodology) return null
  return { releaseHash, suite, scoring, methodology }
}
