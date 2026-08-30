import { SCIENTIFIC_CASE_BY_ID, SCIENTIFIC_WEB_CONTRACT } from './scientificBenchmarkContract.js'

const hashPattern = /^[a-f0-9]{64}$/u
const successClasses = new Set(['succeeded', 'succeeded_low_quality'])
const confirmedFailureClasses = new Set(['confirmed_technical_failure', 'confirmed_provider_failure'])
const resultFields = ['imageHash', 'editedHash', 'sourceHash', 'region', 'variants', 'beforeVariants', 'scores', 'reviewNotes', 'actualOutputPixels']

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function equalArray(value, expected) {
  return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index])
}

function finiteScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10
}

function exactKeys(value, keys, predicate) {
  return isPlainObject(value) && Object.keys(value).length === keys.length && keys.every((key) => predicate(value[key]))
}

function validVariants(value, requireUrl) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) return false
  const kinds = new Set()
  return value.every((variant) => {
    if (!isPlainObject(variant) || !['thumbnail', 'detail', 'full'].includes(variant.kind) || kinds.has(variant.kind)
      || !hashPattern.test(String(variant.imageHash || '')) || variant.mimeType !== 'image/webp'
      || ![variant.width, variant.height, variant.fileSizeBytes].every((number) => Number.isInteger(number) && number > 0)
      || (requireUrl && (typeof variant.url !== 'string' || !/^https?:\/\//u.test(variant.url)))
      || (!requireUrl && variant.url !== undefined && (typeof variant.url !== 'string' || !/^https?:\/\//u.test(variant.url)))) return false
    kinds.add(variant.kind)
    return true
  })
}

function validAttempts(value) {
  return isPlainObject(value) && Number.isInteger(value.count) && value.count >= 0
    && Array.isArray(value.responseClasses) && value.responseClasses.length === value.count
    && value.responseClasses.every((item) => typeof item === 'string')
}

function hasAnyResultField(item) {
  return resultFields.some((field) => Object.prototype.hasOwnProperty.call(item, field))
}

export function normalizeScientificEvidenceSlot(item, { requireUrl = false, expectedCaseId } = {}) {
  if (!isPlainObject(item) || (expectedCaseId && item.caseId !== expectedCaseId)) return null
  const scientificCase = SCIENTIFIC_CASE_BY_ID.get(item.caseId)
  if (!scientificCase || item.kind !== scientificCase.kind || !validAttempts(item.attemptSummary)) return null
  const { count, responseClasses } = item.attemptSummary
  if (item.status === 'succeeded') {
    const terminal = responseClasses.at(-1)
    if (count < 1 || count > 4 || Object.prototype.hasOwnProperty.call(item, 'failureReason')
      || !successClasses.has(terminal) || responseClasses.slice(0, -1).some((entry) => !confirmedFailureClasses.has(entry))
      || !hashPattern.test(String(item.imageHash || '')) || !validVariants(item.variants, requireUrl)
      || !exactKeys(item.scores, scientificCase.applicableAxes, finiteScore)
      || !Array.isArray(item.reviewNotes) || !item.reviewNotes.length || item.reviewNotes.some((note) => typeof note !== 'string' || !note.trim())) return null
    if (scientificCase.kind === 'edit') {
      if (item.sourceHash !== scientificCase.sourceHash || item.editedHash !== item.imageHash || item.region !== scientificCase.region
        || !validVariants(item.beforeVariants, requireUrl)) return null
    } else if (['sourceHash', 'editedHash', 'region', 'beforeVariants'].some((field) => Object.prototype.hasOwnProperty.call(item, field))) return null
  } else if (item.status === 'failed') {
    if (count !== 4 || responseClasses.some((entry) => !confirmedFailureClasses.has(entry))
      || item.failureReason !== 'confirmed_attempts_exhausted' || hasAnyResultField(item)) return null
  } else if (item.status === 'unsupported') {
    if (scientificCase.kind !== 'edit' || count !== 0 || responseClasses.length !== 0
      || item.failureReason !== 'direct_edit_route_unavailable' || hasAnyResultField(item)) return null
  } else return null
  return structuredClone(item)
}

function derivedModelFacts(slots) {
  const generation = slots.slice(0, 6)
  const edit = slots.slice(6)
  const succeeded = slots.filter((item) => item.status === 'succeeded').length
  const failed = slots.filter((item) => item.status === 'failed').length
  const unsupported = slots.filter((item) => item.status === 'unsupported').length
  return {
    generationSuccessRate: generation.filter((item) => item.status === 'succeeded').length / 6,
    editSuccessRate: edit.filter((item) => item.status === 'succeeded').length / 3,
    successRate: succeeded / 9,
    attemptSummary: { total: slots.reduce((sum, item) => sum + item.attemptSummary.count, 0), succeeded, failed, unsupported },
    failureReasons: slots.filter((item) => item.failureReason).map((item) => ({ caseId: item.caseId, reason: item.failureReason })),
  }
}

function equalNumber(actual, expected) {
  return typeof actual === 'number' && Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-12
}

function equalJson(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected)
}

function normalizedScientificSlots(value, requireUrl) {
  if (!Array.isArray(value) || value.length !== SCIENTIFIC_WEB_CONTRACT.cases.length) return null
  const slotsByCaseId = new Map()
  for (const item of value) {
    const slot = normalizeScientificEvidenceSlot(item, { requireUrl })
    if (!slot || slotsByCaseId.has(slot.caseId)) return null
    slotsByCaseId.set(slot.caseId, slot)
  }
  const slots = SCIENTIFIC_WEB_CONTRACT.cases.map((scientificCase) => slotsByCaseId.get(scientificCase.id) || null)
  return slots.some((slot) => slot === null) ? null : slots
}

function validScientificModel(model, requireUrl) {
  if (!isPlainObject(model) || typeof model.profileId !== 'string' || !model.profileId || typeof model.modelId !== 'string' || !model.modelId
    || !finiteScore(model.overallScore) || !Number.isInteger(model.overallRank) || model.overallRank < 1
    || !exactKeys(model.scores, SCIENTIFIC_WEB_CONTRACT.axes, finiteScore)
    || !exactKeys(model.dimensions, SCIENTIFIC_WEB_CONTRACT.axes, (dimension) => finiteScore(dimension?.mean))
    || !exactKeys(model.dimensionRanks, SCIENTIFIC_WEB_CONTRACT.axes, (rank) => Number.isInteger(rank) && rank >= 1)) return null
  const slots = normalizedScientificSlots(model.evidence, requireUrl)
  if (!slots) return null
  const derived = derivedModelFacts(slots)
  if (!equalNumber(model.generationSuccessRate, derived.generationSuccessRate)
    || !equalNumber(model.editSuccessRate, derived.editSuccessRate) || !equalNumber(model.successRate, derived.successRate)
    || !equalJson(model.attemptSummary, derived.attemptSummary) || !equalJson(model.failureReasons, derived.failureReasons)) return null
  return { model: { ...structuredClone(model), evidence: slots }, slots }
}

function exactIdentity(value) {
  return isPlainObject(value) && value.suiteId === SCIENTIFIC_WEB_CONTRACT.suiteId && value.suiteHash === SCIENTIFIC_WEB_CONTRACT.suiteHash
    && Object.entries(SCIENTIFIC_WEB_CONTRACT.identity).every(([key, expected]) => value[key] === expected)
}

export function hasScientificHint(value) {
  if (!isPlainObject(value)) return false
  return value.suiteHash === SCIENTIFIC_WEB_CONTRACT.suiteHash
    || Object.entries(SCIENTIFIC_WEB_CONTRACT.identity).some(([field, expected]) => value[field] === expected)
}

function validRanking(value) {
  return isPlainObject(value) && value.id === 'ten_dimension_raw_equal_weight_mean' && value.tieMethod === 'competition'
    && equalArray(value.axes, SCIENTIFIC_WEB_CONTRACT.axes) && Array.isArray(value.weights) && value.weights.length === 10
    && value.weights.every((weight) => typeof weight === 'number' && Math.abs(weight - 0.1) <= 1e-9)
}

export function normalizeLeaderboardRelease(release) {
  if (!isPlainObject(release)) return null
  if (!hasScientificHint(release)) return structuredClone(release)
  if (!exactIdentity(release) || release.profileStatus !== 'published' || !validRanking(release.rankingMethod)
    || !Array.isArray(release.models) || !release.models.length || release.eligibleModelCount !== release.models.length) return null
  const models = release.models.map((model) => validScientificModel(model, false))
  if (models.some((model) => model === null)) return null
  return { ...structuredClone(release), models: models.map((model) => model.model) }
}

export function normalizeScientificPublicCase(value, expectedCaseId) {
  if (!isPlainObject(value) || value.id !== expectedCaseId) return null
  const expected = SCIENTIFIC_CASE_BY_ID.get(expectedCaseId)
  if (!expected || value.kind !== expected.kind || value.manifestHash !== expected.manifestHash
    || !equalArray(value.applicableAxes, expected.applicableAxes) || typeof value.title !== 'string' || !value.title
    || typeof value.instruction !== 'string' || !value.instruction || !exactKeys(value.rubric, expected.applicableAxes, (text) => typeof text === 'string' && Boolean(text))) return null
  if (expected.kind === 'edit') {
    if (value.sourceHash !== expected.sourceHash || value.region !== expected.region) return null
  } else if (value.aspectRatio !== '16:9' || typeof value.negativePrompt !== 'string' || !value.negativePrompt) return null
  return structuredClone(value)
}

export function normalizeScientificProfile(profile) {
  if (!isPlainObject(profile) || !exactIdentity(profile.release)) return null
  const valid = validScientificModel(profile, true)
  if (!valid || !Array.isArray(profile.cases) || profile.cases.length !== 9) return null
  const cases = profile.cases.map((item, index) => normalizeScientificPublicCase(item, SCIENTIFIC_WEB_CONTRACT.cases[index].id))
  if (cases.some((item) => item === null)) return null
  return { ...structuredClone(profile), evidence: valid.slots }
}

export function normalizeScientificCaseResponse(response, expectedCaseId) {
  if (!isPlainObject(response) || !SCIENTIFIC_CASE_BY_ID.has(expectedCaseId)
    || !normalizeScientificPublicCase(response.case, expectedCaseId) || !Array.isArray(response.items)
    || response.items.some((item) => !normalizeScientificEvidenceSlot(item, { requireUrl: true, expectedCaseId }))) return null
  const profileIds = response.items.map((item) => item.profileId)
  if (profileIds.some((id) => typeof id !== 'string' || !id) || new Set(profileIds).size !== profileIds.length
    || !(response.nextCursor === null || response.nextCursor === undefined || typeof response.nextCursor === 'string')) return null
  return structuredClone(response)
}
