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
  if ([scoreMin, scoreMax, minimumReviewedSamples, maximumSamplesPerModel].some((item) => item === null)
    || !overallFormula || !tieMethod || !redLinePolicy) return null
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
    if (weight === null || weight <= 0) return null
    weights.push(weight)
    weightSum += weight
  }
  if (Math.abs(weightSum - 1) > WEIGHT_SUM_TOLERANCE) return null
  return { id, axes: [...value.axes], weights, tieMethod }
}

function normalizeMethodology(value, scoring) {
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
  if (!suiteId || !suiteHash || !evaluationMode || !evaluationEpoch || !reviewProtocol || !reviewerKind
    || reviewerPasses === null || automaticJudges === null || typeof value.noOverallScore !== 'boolean' || !rankingMethod) return null
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

export function normalizeMethodologyResponse(response) {
  if (!isPlainObject(response)) return null
  const releaseHash = asText(response.releaseHash)
  const suite = normalizeSuite(response.suite)
  const scoring = normalizeScoring(response.scoring)
  const methodology = scoring ? normalizeMethodology(response.methodology, scoring) : null
  if (!releaseHash || !suite || !scoring || !methodology) return null
  return { releaseHash, suite, scoring, methodology }
}
