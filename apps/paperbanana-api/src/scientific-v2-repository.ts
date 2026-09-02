import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY,
  SCIENTIFIC_BENCHMARK_AXES,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  SCIENTIFIC_EDIT_SOURCE,
  SCIENTIFIC_REVIEW_MAX_RED_LINES,
  SCIENTIFIC_REVIEW_RED_LINE_CODES,
  aggregateScientificFixedSlots,
  buildScientificV2CanonicalManifest,
  canonicalHash,
  deriveScientificV2PriceRequirements,
  rankScientificModels,
  verifyScientificV2PriceSnapshot,
} from '@paperbanana/benchmark-core'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Db } from 'mongodb'

import { verifyScientificV2RegistryAuthority } from './scientific-v2-production-bridge.js'

type AnyRecord = { _id?: string; [key: string]: any }

export const SCIENTIFIC_V2_COLLECTIONS = Object.freeze({
  batches: 'paperbanana_benchmark_scientific_v2_batches',
  dispatches: 'paperbanana_benchmark_scientific_v2_dispatches',
  reviews: 'paperbanana_benchmark_scientific_v2_review_artifacts',
  publicEvidence: 'paperbanana_benchmark_scientific_v2_public_evidence',
  releaseHeads: 'paperbanana_benchmark_release_heads',
  releaseLifecycle: 'paperbanana_benchmark_release_lifecycle',
} as const)

export const SCIENTIFIC_V2_RELEASE_HEAD_ID = [
  'benchmark-release-head',
  SCIENTIFIC_BENCHMARK_IDENTITY.suiteId,
  SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode,
  SCIENTIFIC_BENCHMARK_IDENTITY.evaluationEpoch,
].join(':')

const hashPattern = /^[a-f0-9]{64}$/
const codeShaPattern = /^[a-f0-9]{40}$/
const SCIENTIFIC_V2_CORRECTIVE_RELEASE_PLAN = Object.freeze({
  baselineReleaseHash: 'f1f31caf50b810b456f434a4fd1d6eed55a60d3f8a54fa3795a08284df4cf70a',
  activePredecessorReleaseHash: '25b48bbfa7f8a7818adcdc088bb11ee596ab14720558f89c63c440989c8a0fbe',
  targetModelIds: Object.freeze([
    'seedream-4.5',
    'seedream-5.0',
  ]),
})
const OPERATOR_ATTESTATION_DOMAIN = 'paperbanana/scientific-v2/operator-attestation/v1'
const OPERATOR_DIAGNOSTIC_DOMAIN = 'paperbanana/scientific-v2/operator-diagnostic/v1'
const productionLockName = '/run/lock/paperbanana-hk-production.lock'
const providers = ['bailian', 'ark', 'openrouter'] as const
const reviewRedLineCodes = new Set<string>(SCIENTIFIC_REVIEW_RED_LINE_CODES)
const scientificCaseOrder = new Map(PB_SCIENTIFIC_FIGURE_V2.cases.map((scientificCase, index) => [scientificCase.id, index]))
const stateOperationReportPayloadKeys = [
  'schemaVersion', 'identity', 'kind', 'batchId', 'batchManifestHash', 'revision', 'previousStateHash',
  'stateHash', 'state', 'manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash',
  'providerCanaryAttestation', 'executionOrderAttestation', 'codexProvenance',
  'disclosure', 'createdAt',
] as const
const confirmedFailureResponseClasses = new Set(['confirmed_technical_failure', 'confirmed_provider_failure'])
const reviewObjectVerificationConcurrency = 16

async function verifyReviewObjects(
  bindings: Array<{ imageHash: string; objectKey: string }>,
  verifyObject: (objectKey: string, imageHash: string) => Promise<void>,
) {
  let nextIndex = 0
  const worker = async () => {
    while (nextIndex < bindings.length) {
      const binding = bindings[nextIndex]
      nextIndex += 1
      await verifyObject(binding.objectKey, binding.imageHash)
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(reviewObjectVerificationConcurrency, bindings.length) },
    () => worker(),
  ))
}

function isExactConfirmedCanaryFailure(slot: AnyRecord) {
  return slot.isProviderCanary === true && slot.status === 'failed' && slot.attempts.length === 4
    && slot.attempts.every((attempt: AnyRecord) => confirmedFailureResponseClasses.has(attempt.responseClass))
}

function isCanaryRoutePropagatedFailure(slot: AnyRecord) {
  return slot.isProviderCanary === false && slot.supported === true && slot.status === 'failed'
    && typeof slot.provider === 'string' && slot.provider !== 'codex'
    && slot.attempts.length === 0 && slot.costCny === 0
}

function canaryRouteIdentity(slot: AnyRecord) {
  return `${slot.provider}\u0000${slot.canonicalModelId}`
}

export function scientificV2FailureReason(slot: AnyRecord) {
  if (slot.status === 'unsupported') {
    return slot.operation === 'edit' ? 'direct_edit_route_unavailable' : 'capability_unsupported'
  }
  if (isCanaryRoutePropagatedFailure(slot)) {
    return 'provider_canary_confirmed_failed'
  }
  return 'confirmed_attempts_exhausted'
}

export type ScientificV2StateOperationReport = {
  schemaVersion: 2
  identity: typeof SCIENTIFIC_BENCHMARK_IDENTITY
  kind: 'worker' | 'codex'
  batchId: string
  batchManifestHash: string
  revision: number
  previousStateHash: string
  stateHash: string
  state: AnyRecord
  manifestCodeSha: string
  executionCodeSha: string
  legacyRecoveryStateHash: string | null
  providerCanaryAttestation: AnyRecord
  executionOrderAttestation: AnyRecord
  codexProvenance: AnyRecord | null
  disclosure: AnyRecord | null
  createdAt: string
  reportHash: string
}

export function normalizeScientificV2StateOperationReport(value: AnyRecord): ScientificV2StateOperationReport {
  const allowedKeys = value?.reportHash === undefined ? stateOperationReportPayloadKeys : [...stateOperationReportPayloadKeys, 'reportHash']
  assertExactKeys(value, allowedKeys, 'SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  if (value.schemaVersion !== 2 || !['worker', 'codex'].includes(value.kind)
    || canonicalHash(value.identity) !== canonicalHash(SCIENTIFIC_BENCHMARK_IDENTITY)
    || typeof value.batchId !== 'string' || !value.batchId
    || !hashPattern.test(String(value.batchManifestHash || ''))
    || !Number.isInteger(value.revision) || value.revision < 1
    || !hashPattern.test(String(value.previousStateHash || ''))
    || !hashPattern.test(String(value.stateHash || '')) || value.stateHash !== value.state?.stateHash
    || !codeShaPattern.test(String(value.manifestCodeSha || ''))
    || !codeShaPattern.test(String(value.executionCodeSha || ''))
    || (value.manifestCodeSha === value.executionCodeSha
      ? value.legacyRecoveryStateHash !== null
      : !hashPattern.test(String(value.legacyRecoveryStateHash || '')))) {
    scientificError('SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  }
  assertIsoInstant(value.createdAt, 'SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  const payload = Object.fromEntries(stateOperationReportPayloadKeys.map((key) => [key, structuredClone(value[key])])) as Omit<ScientificV2StateOperationReport, 'reportHash'>
  const reportHash = canonicalHash(payload)
  if (value.reportHash !== undefined && value.reportHash !== reportHash) scientificError('SCIENTIFIC_V2_OPERATION_REPORT_HASH_INVALID')
  return deepFreeze({ ...payload, reportHash })
}

export function scientificV2StateOperationReportHmacPayload(value: ScientificV2StateOperationReport) {
  const normalized = normalizeScientificV2StateOperationReport(value)
  return normalized.reportHash
}

export function normalizeScientificV2SignedStateOperationReport(value: AnyRecord, secret: string) {
  assertExactKeys(value, ['report', 'reportHash', 'attestationHash'], 'SCIENTIFIC_V2_OPERATOR_REPORT_SCHEMA_INVALID')
  if (typeof secret !== 'string' || secret.trim() !== secret
    || Buffer.byteLength(secret, 'utf8') < 32 || Buffer.byteLength(secret, 'utf8') > 4096) {
    scientificError('SCIENTIFIC_V2_OPERATOR_REPORT_SECRET_INVALID')
  }
  const report = normalizeScientificV2StateOperationReport(value.report)
  const reportHash = scientificV2StateOperationReportHmacPayload(report)
  const expectedAttestationHash = createHmac('sha256', secret).update(reportHash).digest('hex')
  if (value.reportHash !== reportHash || !safeHmacEqual(value.attestationHash, expectedAttestationHash)) {
    scientificError('SCIENTIFIC_V2_OPERATOR_REPORT_ATTESTATION_INVALID')
  }
  return deepFreeze({ report, reportHash, attestationHash: value.attestationHash as string })
}

function assertReviewRedLines(value: unknown) {
  if (!Array.isArray(value) || value.length > SCIENTIFIC_REVIEW_MAX_RED_LINES || new Set(value).size !== value.length
    || value.some((code) => typeof code !== 'string' || code.length > 64 || !reviewRedLineCodes.has(code))) {
    scientificError('SCIENTIFIC_V2_REVIEW_REDLINE_INVALID')
  }
}

function normalizeReviewRationale(value: unknown) {
  if (typeof value !== 'string') scientificError('SCIENTIFIC_V2_REVIEW_RATIONALE_INVALID')
  const rationale = value.trim()
  const normalized = rationale.normalize('NFKC')
  const compact = normalized.toLocaleLowerCase('en-US').replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()_-]/gu, '')
  const securityCompact = normalized.toLocaleLowerCase('en-US').replace(/[\s_-]+/gu, '')
  const genericPrefixes = [
    '加分双盲审核未确认红线问题', '双盲审核未确认红线问题', '整体表现良好', '整体符合要求', '基本符合要求',
    '未发现明显问题', '没有明显问题', '无明显问题', '图像质量良好', '内容基本准确', '结果符合题意', '整体效果不错', '整体效果良好', '符合要求',
    'looksgood', 'meetsrequirements', 'noobviousissues', 'overallgood',
  ]
  if (genericPrefixes.some((prefix) => compact.startsWith(prefix))
    || rationale !== value || rationale.length < 8 || rationale.length > 500
    || /[\u0000-\u001f\u007f]|\p{Cf}/u.test(rationale)
    || /(?:reviewer\s*[ab]?|blind-[a-z0-9-]+|object\s*key|mapping\s*hash|attestation|hmac|\/tmp\/|bench\/scientific-v2\/private\/)/iu.test(normalized)
    || /(?:https?:\/\/|www\.|mailto:|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b|\b(?:api[-_ ]?key|access[-_ ]?token|secret|password|credential|authorization|bearer)\b|\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b|(?:\/Users\/|\/home\/|[a-z]:\\)|\b(?:sk-|gh[pousr]_)[a-z0-9_-]{8,})/iu.test(normalized)
    || /(?:apikey|accesskey|secretkey|privatekey|accesstoken|refreshtoken|authorization|bearer|password|credential)/u.test(securityCompact)
    || /(?:sk|gh[pousr])[-_][a-z0-9_-]{8,}/iu.test(normalized)
    || /\b[a-f0-9]{40}(?:[a-f0-9]{24})?\b/iu.test(normalized)) {
    scientificError('SCIENTIFIC_V2_REVIEW_RATIONALE_INVALID')
  }
  return rationale
}

function reviewRationaleUniquenessKey(rationale: string) {
  return rationale.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\p{P}\p{Z}\p{Cf}]/gu, '')
}

function scientificError(code: string): never {
  throw new Error(code)
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}

function markerId(marker: AnyRecord) {
  return `scientific-v2-dispatch:${canonicalHash({ manifestHash: marker.manifestHash, slotId: marker.slotId, attemptIndex: marker.attemptIndex })}`
}

function assertMarker(marker: AnyRecord) {
  if (!marker || !hashPattern.test(String(marker.manifestHash || '')) || !hashPattern.test(String(marker.payloadHash || ''))
    || typeof marker.slotId !== 'string' || !marker.slotId || !Number.isInteger(marker.attemptIndex)
    || marker.attemptIndex < 1 || marker.attemptIndex > 4) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
}

function assertArtifactRecovery(value: unknown, attempt: AnyRecord) {
  assertExactKeys(value, ['spoolId', 'imageHash', 'format', 'byteSize'], 'SCIENTIFIC_V2_ARTIFACT_RECOVERY_INVALID')
  if (!/^[a-f0-9]{64}\.(png|jpeg|webp)$/.test(String(value.spoolId || ''))
    || value.imageHash !== attempt.rawImageHash || value.format !== attempt.format || value.byteSize !== attempt.byteSize
    || !String(value.spoolId).endsWith(`.${value.format}`)) scientificError('SCIENTIFIC_V2_ARTIFACT_RECOVERY_INVALID')
}

function assertNextState(nextState: AnyRecord, manifestHash: string) {
  if (!nextState || nextState.manifestHash !== manifestHash || !hashPattern.test(String(nextState.stateHash || ''))
    || canonicalWithoutHash(nextState, 'stateHash') !== nextState.stateHash) scientificError('SCIENTIFIC_V2_STATE_HASH_MISMATCH')
}

function assertExactKeys(value: unknown, keys: readonly string[], code: string): asserts value is AnyRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) scientificError(code)
  const actual = Reflect.ownKeys(value).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) scientificError(code)
}

function safeHmacEqual(actual: unknown, expected: string) {
  return typeof actual === 'string' && hashPattern.test(actual) && actual.length === expected.length
    && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

function expectedPayloadHash(manifest: AnyRecord, slot: AnyRecord, scientificCase: AnyRecord) {
  if (slot.provider === 'codex') return canonicalHash({
    manifestHash: manifest.manifestHash,
    slotId: slot.slotId,
    caseManifestHash: scientificCase.manifestHash,
  })
  return canonicalHash({
    route: { provider: slot.provider, modelId: slot.modelId },
    operation: slot.operation,
    imageSize: slot.imageSize,
    caseId: scientificCase.id,
    instruction: scientificCase.instruction,
    ...(scientificCase.kind === 'generation'
      ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
      : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
  })
}

function assertIsoInstant(value: unknown, code = 'SCIENTIFIC_V2_STATE_TIME_INVALID') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) scientificError(code)
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) scientificError(code)
}

function cnyUnits(value: unknown, code = 'SCIENTIFIC_V2_CNY_PRECISION_INVALID') {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) scientificError(code)
  const units = Math.round(value * 100_000_000)
  if (!Number.isSafeInteger(units) || units / 100_000_000 !== value) scientificError(code)
  return units
}

export function verifyScientificV2ImportedState(state: AnyRecord, manifest: AnyRecord) {
  assertExactKeys(state, [
    'schemaVersion', 'manifestHash', 'status', 'pauseReason', 'blockReason', 'createdAt', 'updatedAt',
    'providerSpentCny', 'providerUnreconciledCny', 'slots', 'stateHash',
  ], 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  if (state.schemaVersion !== 2 || state.manifestHash !== manifest.manifestHash
    || !hashPattern.test(String(state.stateHash || '')) || canonicalWithoutHash(state, 'stateHash') !== state.stateHash
    || !['ready', 'running', 'canary_complete', 'awaiting_artifacts', 'completed', 'paused', 'blocked'].includes(state.status)
    || !Array.isArray(state.slots) || state.slots.length !== manifest.executionOrder.length) {
    scientificError('SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  }
  assertIsoInstant(state.createdAt)
  assertIsoInstant(state.updatedAt)
  if (state.updatedAt < state.createdAt
    || ![null, 'reconciliation_required', 'price_reconciliation_required', 'artifact_reconciliation_required'].includes(state.pauseReason)
    || ![null, 'provider_budget_exceeded_before_attempt', 'provider_canary_failed'].includes(state.blockReason)) scientificError('SCIENTIFIC_V2_STATE_STATUS_INVALID')
  assertExactKeys(state.providerSpentCny, providers, 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  assertExactKeys(state.providerUnreconciledCny, providers, 'SCIENTIFIC_V2_STATE_SCHEMA_INVALID')
  const totals = { bailian: 0, ark: 0, openrouter: 0 }
  const unreconciled = { bailian: 0, ark: 0, openrouter: 0 }
  for (const [index, slot] of state.slots.entries()) {
    const frozen = manifest.executionOrder[index]
    const scientificCase = manifest.cases.find((candidate: AnyRecord) => candidate.id === slot.caseId)
    assertExactKeys(slot, [
      'sequence', 'slotId', 'canonicalModelId', 'caseId', 'provider', 'modelId', 'operation', 'supported',
      'imageSize', 'isProviderCanary', 'routeStatus', 'status', 'costCny', 'attempts',
    ], 'SCIENTIFIC_V2_STATE_SLOT_INVALID')
    if (!scientificCase || Object.entries(frozen).some(([key, value]) => canonicalHash(slot[key]) !== canonicalHash(value))
      || !Array.isArray(slot.attempts) || slot.attempts.length > 4
      || !['pending', 'retrying', 'succeeded', 'unsupported', 'awaiting_artifact', 'unknown', 'failed', 'budget_blocked', 'not_executed', 'price_reconciliation', 'artifact_reconciliation'].includes(slot.status)) {
      scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    }
    let slotCost = 0
    for (const [attemptIndex, attempt] of slot.attempts.entries()) {
      assertExactKeys(attempt, [
        'attemptIndex', 'provider', 'model', 'operation', 'payloadHash', 'responseClass', 'estimatedCny', 'actualCny',
        'startedAt', 'completedAt', 'rawImageHash', 'byteSize', 'width', 'height', 'format', 'sourceHash', 'editedHash', 'attemptHash',
      ], 'SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      const { attemptHash, ...attemptBase } = attempt
      const price = slot.provider === 'codex' ? 0 : manifest.priceSnapshot.entries.find((entry: AnyRecord) => entry.provider === slot.provider
        && entry.modelId === slot.modelId && entry.operation === slot.operation)?.unitCny
      const actualCostValid = attempt.actualCny === null || (Number.isFinite(attempt.actualCny) && attempt.actualCny >= 0)
      if (attempt.attemptIndex !== attemptIndex + 1 || attempt.provider !== slot.provider || attempt.model !== slot.modelId
        || attempt.operation !== slot.operation || attempt.payloadHash !== expectedPayloadHash(manifest, slot, scientificCase)
        || canonicalHash(attemptBase) !== attemptHash || price === undefined || attempt.estimatedCny !== price
        || !actualCostValid
        || !['succeeded', 'succeeded_low_quality', 'confirmed_technical_failure', 'confirmed_provider_failure', 'unknown_provider_outcome', 'price_reconciliation_required', 'artifact_reconciliation_required'].includes(attempt.responseClass)) {
        scientificError('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      }
      cnyUnits(attempt.estimatedCny)
      if (attempt.actualCny !== null) cnyUnits(attempt.actualCny)
      assertIsoInstant(attempt.startedAt, 'SCIENTIFIC_V2_ATTEMPT_TIME_INVALID')
      assertIsoInstant(attempt.completedAt, 'SCIENTIFIC_V2_ATTEMPT_TIME_INVALID')
      if (attempt.completedAt < attempt.startedAt
        || (attemptIndex < slot.attempts.length - 1 && !['confirmed_technical_failure', 'confirmed_provider_failure'].includes(attempt.responseClass))) {
        scientificError('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
      }
      const succeeds = ['succeeded', 'succeeded_low_quality'].includes(attempt.responseClass)
      const artifactReconciliation = attempt.responseClass === 'artifact_reconciliation_required'
      const imageFacts = [attempt.rawImageHash, attempt.byteSize, attempt.width, attempt.height, attempt.format]
      const noImage = imageFacts.every((value) => value === null)
      const hasImage = hashPattern.test(String(attempt.rawImageHash || '')) && Number.isInteger(attempt.byteSize) && attempt.byteSize > 0
        && Number.isInteger(attempt.width) && attempt.width > 0 && Number.isInteger(attempt.height) && attempt.height > 0
        && ['png', 'jpeg', 'webp'].includes(attempt.format)
      const confirmedOrUnknown = ['confirmed_technical_failure', 'confirmed_provider_failure', 'unknown_provider_outcome'].includes(attempt.responseClass)
      if ((succeeds && (!hasImage || attempt.actualCny === null))
        || (artifactReconciliation && (!hasImage || attempt.actualCny === null))
        || (confirmedOrUnknown && !noImage)
        || (attempt.responseClass === 'unknown_provider_outcome' && attempt.actualCny !== null)
        || (attempt.responseClass === 'price_reconciliation_required' && attempt.actualCny === null)
        || (attempt.responseClass === 'price_reconciliation_required' && !hasImage && !noImage)
        || (scientificCase.kind === 'generation' && (attempt.sourceHash !== null || attempt.editedHash !== null))
        || (scientificCase.kind === 'edit' && (attempt.sourceHash !== scientificCase.sourceHash || (hasImage ? attempt.editedHash !== attempt.rawImageHash : attempt.editedHash !== null)))) {
        scientificError('SCIENTIFIC_V2_ATTEMPT_IMAGE_INVALID')
      }
      if (attempt.responseClass === 'price_reconciliation_required') {
        if (slot.provider === 'codex') scientificError('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
        unreconciled[slot.provider as keyof typeof unreconciled] += cnyUnits(attempt.actualCny)
      } else {
        const accounted = cnyUnits(attempt.actualCny ?? attempt.estimatedCny)
        if (slot.provider && slot.provider !== 'codex'
          && ((attempt.actualCny !== null && cnyUnits(attempt.actualCny) > cnyUnits(attempt.estimatedCny))
            || totals[slot.provider as keyof typeof totals] + slotCost + accounted > cnyUnits(manifest.providerBudgetsCny[slot.provider]))) {
          scientificError('SCIENTIFIC_V2_ATTEMPT_SCHEMA_INVALID')
        }
        slotCost += accounted
      }
    }
    if (slot.status === 'unsupported') {
      if (slot.supported || slot.provider !== null || slot.attempts.length || slot.costCny !== 0) scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'succeeded') {
      if (!slot.attempts.length || !['succeeded', 'succeeded_low_quality'].includes(slot.attempts.at(-1).responseClass)) scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'failed') {
      const exhausted = slot.attempts.length === 4 && confirmedFailureResponseClasses.has(slot.attempts.at(-1)?.responseClass)
      const propagated = isCanaryRoutePropagatedFailure(slot)
      if (!exhausted && !propagated) scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    } else if (slot.status === 'unknown' && slot.attempts.at(-1)?.responseClass !== 'unknown_provider_outcome') scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    else if (slot.status === 'retrying' && (!slot.attempts.length || slot.attempts.length >= 4
      || !['confirmed_technical_failure', 'confirmed_provider_failure'].includes(slot.attempts.at(-1)?.responseClass))) scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    else if (slot.status === 'price_reconciliation' && slot.attempts.at(-1)?.responseClass !== 'price_reconciliation_required') scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    else if (slot.status === 'artifact_reconciliation' && (!slot.attempts.length
      || slot.attempts.at(-1)?.responseClass !== 'artifact_reconciliation_required'
      || !Number.isFinite(slot.costCny) || slot.costCny < 0)) scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    else if (slot.status === 'budget_blocked' && (slot.attempts.length ? slot.costCny === null : slot.costCny !== null)) scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    else if (['pending', 'awaiting_artifact', 'not_executed'].includes(slot.status) && (slot.attempts.length || slot.costCny !== null)) scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    if (slot.status === 'awaiting_artifact' && slot.provider !== 'codex') scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
    if (slot.attempts.length && slot.status !== 'price_reconciliation' && cnyUnits(slot.costCny) !== slotCost) scientificError('SCIENTIFIC_V2_STATE_BUDGET_INVALID')
    if (slot.provider && slot.provider !== 'codex') totals[slot.provider as keyof typeof totals] += slotCost
  }
  for (const provider of providers) {
    if (cnyUnits(state.providerSpentCny[provider]) !== totals[provider]
      || totals[provider] > cnyUnits(manifest.providerBudgetsCny[provider])
      || cnyUnits(state.providerUnreconciledCny[provider]) !== unreconciled[provider]) {
      scientificError('SCIENTIFIC_V2_STATE_BUDGET_INVALID')
    }
  }
  const legacyBlockedCanaryFailure = state.status === 'blocked' && state.blockReason === 'provider_canary_failed'
  const failedCanaryRoutes = new Set(state.slots.filter(isExactConfirmedCanaryFailure).map(canaryRouteIdentity))
  const propagatedFailures = state.slots.filter(isCanaryRoutePropagatedFailure)
  if (propagatedFailures.some((slot: AnyRecord) => !failedCanaryRoutes.has(canaryRouteIdentity(slot)))) {
    scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
  }
  if (!legacyBlockedCanaryFailure && [...failedCanaryRoutes].some((routeIdentity) => state.slots.some((slot: AnyRecord) => canaryRouteIdentity(slot) === routeIdentity
    && !slot.isProviderCanary && !isCanaryRoutePropagatedFailure(slot)))) {
    scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
  }
  const priceReconciliationSlot = state.slots.find((slot: AnyRecord) => slot.status === 'price_reconciliation')
  if (priceReconciliationSlot) {
    const attempt = priceReconciliationSlot.attempts.at(-1)
    const provider = priceReconciliationSlot.provider as keyof typeof totals
    const priceIncreased = cnyUnits(attempt.actualCny) > cnyUnits(attempt.estimatedCny)
    const crossesProviderBudget = totals[provider] + unreconciled[provider] > cnyUnits(manifest.providerBudgetsCny[provider])
    if (!priceIncreased && !crossesProviderBudget) scientificError('SCIENTIFIC_V2_PRICE_RECONCILIATION_INVALID')
  }
  const slotStatuses = state.slots.map((slot: AnyRecord) => slot.status)
  const terminal = (status: string) => ['succeeded', 'unsupported', 'failed'].includes(status)
  const canaryFailureIndex = state.status === 'blocked' && state.blockReason === 'provider_canary_failed'
    ? state.slots.findIndex((slot: AnyRecord) => slot.isProviderCanary && slot.status === 'failed')
    : -1
  const interruptedIndex = canaryFailureIndex >= 0 ? canaryFailureIndex
    : slotStatuses.findIndex((status: string) => ['unknown', 'price_reconciliation', 'artifact_reconciliation', 'budget_blocked'].includes(status))
  const isCanaryCarryover = (slot: AnyRecord) => (slot.isProviderCanary && slot.status === 'succeeded')
    || (slot.status === 'failed' && failedCanaryRoutes.has(canaryRouteIdentity(slot)))
  if (interruptedIndex >= 0 && (state.slots.slice(0, interruptedIndex).some((slot: AnyRecord) => !terminal(slot.status))
    || state.slots.slice(interruptedIndex + 1).some((slot: AnyRecord) => slot.status !== 'not_executed' && !isCanaryCarryover(slot)))) {
    scientificError('SCIENTIFIC_V2_STATE_INTERRUPTION_ORDER_INVALID')
  }
  if ((state.status === 'paused') !== (state.pauseReason !== null)
    || (state.status === 'blocked') !== (state.blockReason !== null)
    || (state.status === 'ready' && slotStatuses.some((status: string) => status !== 'pending'))
    || (state.status === 'canary_complete' && (state.slots.some((slot: AnyRecord) => slot.isProviderCanary
      ? !(slot.status === 'succeeded' || isExactConfirmedCanaryFailure(slot))
      : failedCanaryRoutes.has(canaryRouteIdentity(slot)) ? !isCanaryRoutePropagatedFailure(slot) : slot.status !== 'pending')
      || state.slots.filter((slot: AnyRecord) => slot.isProviderCanary).length !== new Set(manifest.executionOrder
        .filter((slot: AnyRecord) => slot.isProviderCanary).map((slot: AnyRecord) => slot.provider)).size))
    || (state.status === 'running' && slotStatuses.some((status: string) => ['unknown', 'budget_blocked', 'not_executed', 'price_reconciliation', 'artifact_reconciliation'].includes(status)))
    || (state.status === 'awaiting_artifacts' && (!slotStatuses.includes('awaiting_artifact')
      || slotStatuses.some((status: string) => ['pending', 'retrying', 'unknown', 'budget_blocked', 'not_executed', 'price_reconciliation', 'artifact_reconciliation'].includes(status))))
    || (state.status === 'completed' && slotStatuses.some((status: string) => !terminal(status)))
    || (state.status !== 'completed' && slotStatuses.every(terminal))
    || (state.status === 'paused' && state.pauseReason === 'reconciliation_required' && slotStatuses.filter((status: string) => status === 'unknown').length !== 1)
    || (state.status === 'paused' && state.pauseReason === 'price_reconciliation_required' && slotStatuses.filter((status: string) => status === 'price_reconciliation').length !== 1)
    || (state.status === 'paused' && state.pauseReason === 'artifact_reconciliation_required' && slotStatuses.filter((status: string) => status === 'artifact_reconciliation').length !== 1)
    || (state.status === 'paused' && state.pauseReason !== 'reconciliation_required' && slotStatuses.includes('unknown'))
    || (state.status === 'paused' && state.pauseReason !== 'price_reconciliation_required' && slotStatuses.includes('price_reconciliation'))
    || (state.status === 'paused' && state.pauseReason !== 'artifact_reconciliation_required' && slotStatuses.includes('artifact_reconciliation'))
    || (state.status === 'paused' && slotStatuses.some((status: string) => ['pending', 'retrying', 'awaiting_artifact', 'budget_blocked'].includes(status)))
    || (state.status === 'blocked' && state.blockReason === 'provider_budget_exceeded_before_attempt'
      && slotStatuses.filter((status: string) => status === 'budget_blocked').length !== 1)
    || (state.status === 'blocked' && state.blockReason === 'provider_canary_failed'
      && state.slots.filter((slot: AnyRecord) => slot.isProviderCanary && slot.status === 'failed').length !== 1)
    || (state.status === 'blocked' && state.blockReason === 'provider_canary_failed'
      && slotStatuses.some((status: string) => ['budget_blocked', 'unknown', 'price_reconciliation', 'artifact_reconciliation'].includes(status)))) {
    scientificError('SCIENTIFIC_V2_STATE_STATUS_INVALID')
  }
  return state
}

function hmacCanonical(secret: string, value: unknown) {
  return createHmac('sha256', secret).update(canonicalHash(value)).digest('hex')
}

function assertUnknownReconciliationAudit(
  audit: AnyRecord,
  input: { batch: AnyRecord; marker: AnyRecord; slot: AnyRecord; attempt: AnyRecord },
) {
  const { batch, marker, slot, attempt } = input
  const evidence = audit?.evidence
  const originalAttempt = audit?.originalAttempt
  const reconciledAttempt = audit?.reconciledAttempt
  const originalBase = originalAttempt && Object.fromEntries(Object.entries(originalAttempt).filter(([key]) => key !== 'attemptHash'))
  const expectedReconciledBase = originalBase && { ...originalBase, responseClass: 'confirmed_technical_failure' }
  const expectedReconciled = expectedReconciledBase && { ...expectedReconciledBase, attemptHash: canonicalHash(expectedReconciledBase) }
  const auditBase = audit && Object.fromEntries([
    'schemaVersion', 'kind', 'manifestHash', 'previousStateHash', 'stateHash', 'slotId', 'sequence',
    'originalAttempt', 'reconciledAttempt', 'evidence',
  ].map((key) => [key, structuredClone(audit[key])]))
  if (!audit || audit.artifactType !== 'unknown_reconciliation'
    || audit._id !== `scientific-v2-unknown-reconciliation:${batch.manifestHash}:${audit.previousStateHash}`
    || audit.batchManifestHash !== batch.manifestHash || audit.sourceSetHash !== audit.previousStateHash
    || audit.schemaVersion !== 1 || audit.kind !== 'unknown_no_artifact_reconciliation'
    || audit.manifestHash !== batch.manifestHash || !hashPattern.test(String(audit.previousStateHash || ''))
    || !hashPattern.test(String(audit.stateHash || '')) || audit.previousStateHash === audit.stateHash
    || audit.slotId !== slot.slotId || audit.sequence !== slot.sequence
    || marker.status !== 'unknown' || marker.payloadHash !== attempt.payloadHash
    || originalAttempt?.responseClass !== 'unknown_provider_outcome' || originalAttempt?.actualCny !== null
    || canonicalHash(originalAttempt) !== canonicalHash(marker.attempt)
    || canonicalHash(reconciledAttempt) !== canonicalHash(attempt)
    || canonicalHash(expectedReconciled) !== canonicalHash(reconciledAttempt)
    || !exactUnknownReconciliationEvidence(evidence)
    || audit.auditHash !== canonicalHash(auditBase)) {
    scientificError('SCIENTIFIC_V2_DISPATCH_LEDGER_MISMATCH')
  }
}

function exactUnknownReconciliationEvidence(value: AnyRecord) {
  if (!value) return false
  try {
    assertExactKeys(value, ['workflowRunId', 'candidateCount', 'spoolCandidateCount', 'credentialStatus', 'reconciledAt'], 'SCIENTIFIC_V2_DISPATCH_LEDGER_MISMATCH')
    assertIsoInstant(value.reconciledAt, 'SCIENTIFIC_V2_DISPATCH_LEDGER_MISMATCH')
  } catch { return false }
  return Number.isSafeInteger(value.workflowRunId) && value.workflowRunId > 0
    && value.candidateCount === 0 && value.spoolCandidateCount === 0 && value.credentialStatus === 200
}

function assertReviewAssignment(assignment: AnyRecord, batch: AnyRecord, secret: string) {
  assertExactKeys(assignment, ['role', 'packages', 'privateMappings', 'privateEnvelope', 'mappingHash', 'assignmentSet', 'assignmentAttestationHash'], 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  if (!['A', 'B'].includes(assignment.role) || !Array.isArray(assignment.packages) || !assignment.packages.length
    || !Array.isArray(assignment.privateMappings) || !assignment.privateEnvelope
    || assignment.privateEnvelope.role !== assignment.role
    || assignment.privateEnvelope.batchManifestHash !== batch.manifestHash
    || assignment.assignmentSet.batchManifestHash !== batch.manifestHash
    || assignment.privateEnvelope.sourceSetHash !== assignment.assignmentSet.sourceSetHash
    || canonicalHash(assignment.privateEnvelope) !== assignment.mappingHash
    || canonicalHash(assignment.privateMappings) !== canonicalHash(assignment.privateEnvelope.mappings)
    || canonicalHash(assignment.packages) !== assignment.privateEnvelope.packagesHash
    || !safeHmacEqual(assignment.assignmentAttestationHash, hmacCanonical(secret, assignment.assignmentSet))) {
    scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  }
  const ownHash = assignment.role === 'A' ? assignment.assignmentSet.reviewerAEnvelopeHash : assignment.assignmentSet.reviewerBEnvelopeHash
  if (canonicalHash(assignment.privateEnvelope) !== ownHash) scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  const publicBindings: string[] = []
  for (const packet of assignment.packages) {
    assertExactKeys(packet, ['schemaVersion', 'batchManifestHash', 'packetId', 'items', 'packetHash'], 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
    const { packetHash, ...packetBase } = packet
    if (packet.schemaVersion !== 2 || packet.batchManifestHash !== batch.manifestHash || canonicalHash(packetBase) !== packetHash
      || !Array.isArray(packet.items) || !packet.items.length || packet.items.length > 24) scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
    for (const item of packet.items) {
      const allowed = ['blindLabel', 'itemHash', 'sourcePacketHash', 'caseId', 'kind', 'applicableAxes', 'imageHash', 'rubric', 'instruction',
        ...(item.kind === 'edit' ? ['sourceHash', 'editedHash', 'region'] : ['negativePrompt', 'aspectRatio'])]
      assertExactKeys(item, allowed, 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
      const scientificCase = PB_SCIENTIFIC_FIGURE_V2.cases.find((candidate) => candidate.id === item.caseId)
      if (!scientificCase || item.kind !== scientificCase.kind || !hashPattern.test(String(item.imageHash || ''))
        || canonicalHash(item.applicableAxes) !== canonicalHash(scientificCase.applicableAxes)
        || canonicalHash(item.rubric) !== canonicalHash(scientificCase.rubric)
        || item.instruction !== scientificCase.instruction
        || (scientificCase.kind === 'generation' && (item.negativePrompt !== scientificCase.negativePrompt || item.aspectRatio !== scientificCase.aspectRatio))
        || (scientificCase.kind === 'edit' && (item.sourceHash !== scientificCase.sourceHash || item.editedHash !== item.imageHash || item.region !== scientificCase.region))) {
        scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
      }
      publicBindings.push(`${packet.packetHash}\0${item.blindLabel}\0${item.itemHash}\0${item.sourcePacketHash}`)
    }
  }
  const privateBindings = assignment.privateMappings.map((item: AnyRecord) => `${item.packetHash}\0${item.blindLabel}\0${item.itemHash}\0${item.sourcePacketHash}`)
  if (canonicalHash(publicBindings.sort()) !== canonicalHash(privateBindings.sort())) scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
}

function assertReviewerResult(result: AnyRecord, assignment: AnyRecord, secret: string) {
  assertExactKeys(result, [
    'role', 'batchManifestHash', 'sourceSetHash', 'assignmentAttestationHash', 'assignmentSet', 'mappingHash',
    'items', 'resultHash', 'resultAttestationHash',
  ], 'SCIENTIFIC_V2_REVIEW_RESULT_TAMPERED')
  const { resultHash, resultAttestationHash, ...base } = result
  if (result.role !== assignment.role || result.batchManifestHash !== assignment.privateEnvelope.batchManifestHash
    || result.sourceSetHash !== assignment.privateEnvelope.sourceSetHash
    || result.assignmentAttestationHash !== assignment.assignmentAttestationHash
    || canonicalHash(result.assignmentSet) !== canonicalHash(assignment.assignmentSet)
    || result.mappingHash !== assignment.mappingHash || canonicalHash(base) !== resultHash
    || !safeHmacEqual(resultAttestationHash, hmacCanonical(secret, { ...base, resultHash }))) {
    scientificError('SCIENTIFIC_V2_REVIEW_RESULT_TAMPERED')
  }
  const expectedItems = new Map(assignment.packages.flatMap((packet: AnyRecord) => packet.items.map((item: AnyRecord) => [item.itemHash, { packetHash: packet.packetHash, item }])))
  if (!Array.isArray(result.items) || result.items.length !== expectedItems.size) scientificError('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
  const seenRationales = new Set<string>()
  for (const item of result.items) {
    assertExactKeys(item, ['packetHash', 'itemHash', 'applicableAxes', 'scores', 'redLines', 'lowConfidence', 'rationale'], 'SCIENTIFIC_V2_REVIEW_RESULT_TAMPERED')
    const expected = expectedItems.get(item.itemHash) as AnyRecord | undefined
    if (!expected || expected.packetHash !== item.packetHash || canonicalHash(item.applicableAxes) !== canonicalHash(expected.item.applicableAxes)
      || typeof item.lowConfidence !== 'boolean') {
      scientificError('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
    }
    assertReviewRedLines(item.redLines)
    const rationale = normalizeReviewRationale(item.rationale)
    const rationaleKey = reviewRationaleUniquenessKey(rationale)
    if (seenRationales.has(rationaleKey)) scientificError('SCIENTIFIC_V2_REVIEW_RATIONALE_INVALID')
    seenRationales.add(rationaleKey)
    assertExactKeys(item.scores, item.applicableAxes, 'SCIENTIFIC_V2_REVIEW_SCORE_INVALID')
    if (item.applicableAxes.some((axis: string) => !Number.isFinite(item.scores[axis]) || item.scores[axis] < 0 || item.scores[axis] > 10)) {
      scientificError('SCIENTIFIC_V2_REVIEW_SCORE_INVALID')
    }
  }
}

function combineReviews(left: AnyRecord, right: AnyRecord) {
  const byRight = new Map<string, AnyRecord>(right.items.map((item: AnyRecord) => [item.itemHash, item]))
  const disputes: AnyRecord[] = []
  const results = left.items.map((item: AnyRecord) => {
    const other = byRight.get(item.itemHash)
    if (!other || canonicalHash(item.applicableAxes) !== canonicalHash(other.applicableAxes)) scientificError('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
    const reasons: string[] = []
    if (item.applicableAxes.some((axis: string) => Math.abs(item.scores[axis] - other.scores[axis]) > 2)) reasons.push('score_gap_gt_2')
    const leftLines = [...item.redLines].sort()
    const rightLines = [...other.redLines].sort()
    if (canonicalHash(leftLines) !== canonicalHash(rightLines)) reasons.push('red_line_conflict')
    if (item.lowConfidence || other.lowConfidence) reasons.push('low_confidence')
    if (reasons.length) disputes.push({ itemHash: item.itemHash, applicableAxes: item.applicableAxes, reasons })
    return {
      itemHash: item.itemHash,
      applicableAxes: structuredClone(item.applicableAxes),
      scores: Object.fromEntries(item.applicableAxes.map((axis: string) => [axis, (item.scores[axis] + other.scores[axis]) / 2])),
      redLines: [...new Set([...leftLines, ...rightLines])].sort(),
      rationales: [...new Set([item.rationale, other.rationale])],
      resolution: reasons.length ? 'pending_arbitration' : 'ab_mean',
    }
  })
  return { disputes, results }
}

function assertSignedOperationalAttestation(value: AnyRecord, secret: string, expectedKeys: string[]) {
  assertExactKeys(value, [...expectedKeys, 'hash', 'attestationHash'], 'SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
  const { hash, attestationHash, ...base } = value
  if (canonicalHash(base) !== hash || !safeHmacEqual(attestationHash, createHmac('sha256', secret).update(hash).digest('hex'))) {
    scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
  }
  return base
}

function providerCanaryFacts(state: AnyRecord, manifest: AnyRecord) {
  const canarySlotIds = new Set(manifest.executionOrder.filter((slot: AnyRecord) => slot.isProviderCanary).map((slot: AnyRecord) => slot.slotId))
  const canaries = state.slots.filter((slot: AnyRecord) => canarySlotIds.has(slot.slotId))
  const providers = [...new Set(manifest.executionOrder.filter((slot: AnyRecord) => slot.isProviderCanary).map((slot: AnyRecord) => slot.provider))]
  const attemptSetHash = canonicalHash(state.slots.filter((slot: AnyRecord) => slot.provider !== 'codex')
    .flatMap((slot: AnyRecord) => slot.attempts.map((attempt: AnyRecord) => attempt.attemptHash)))
  const succeeded = (slot: AnyRecord) => slot.status === 'succeeded'
    && ['succeeded', 'succeeded_low_quality'].includes(slot.attempts.at(-1)?.responseClass)
  if (canaries.length !== canarySlotIds.size || canaries.some((slot: AnyRecord) => !succeeded(slot) && !isExactConfirmedCanaryFailure(slot))) {
    scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
  }
  return { providers, passed: canaries.every(succeeded), attemptSetHash }
}

function diagnosticCnyTotal(attempts: AnyRecord[], key: 'estimatedCny' | 'actualCny') {
  const values = attempts.map((attempt) => attempt[key])
  return values.every((value) => Number.isFinite(value) && value >= 0)
    ? values.reduce((total, value) => total + value, 0)
    : null
}

function publicVariant(value: AnyRecord, sourceHash: string) {
  assertExactKeys(value, ['kind', 'objectKey', 'imageHash', 'width', 'height', 'fileSizeBytes', 'mimeType'], 'SCIENTIFIC_V2_PUBLIC_VARIANT_INVALID')
  if (!['thumbnail', 'detail', 'full'].includes(value.kind) || value.mimeType !== 'image/webp'
    || !hashPattern.test(String(value.imageHash || ''))
    || value.objectKey !== `bench/scientific-v2/public/${sourceHash}/${value.kind}.webp`
    || !Number.isInteger(value.width) || value.width <= 0 || !Number.isInteger(value.height) || value.height <= 0
    || !Number.isInteger(value.fileSizeBytes) || value.fileSizeBytes <= 0) scientificError('SCIENTIFIC_V2_PUBLIC_VARIANT_INVALID')
  return {
    kind: value.kind, imageHash: value.imageHash, width: value.width, height: value.height,
    fileSizeBytes: value.fileSizeBytes, mimeType: 'image/webp' as const,
  }
}

function competitionRanks(values: number[]) {
  const ranked = Array<number>(values.length)
  const ordered = values.map((value, index) => ({ value, index })).sort((left, right) => right.value - left.value)
  let rank = 0
  ordered.forEach((item, index) => {
    if (index === 0 || item.value !== ordered[index - 1].value) rank = index + 1
    ranked[item.index] = rank
  })
  return ranked
}

function canonicalWithoutHash(value: AnyRecord, hashKey: string) {
  const copy = structuredClone(value)
  delete copy[hashKey]
  return canonicalHash(copy)
}

function assertRegistryAndManifest(input: AnyRecord) {
  const snapshot = input.registrySnapshot
  const canonicalManifest = input.canonicalManifest
  assertExactKeys(snapshot, ['registryVersion', 'registryHash', 'registry', 'snapshotHash'], 'SCIENTIFIC_V2_REGISTRY_SNAPSHOT_INVALID')
  assertExactKeys(canonicalManifest, [
    'schemaVersion', 'suiteId', 'evaluationMode', 'evaluationEpoch', 'reviewProtocol', 'presentationVersion',
    'registryVersion', 'registryHash', 'routePriority', 'rawRouteCount', 'canonicalModelCount', 'models', 'manifestHash',
  ], 'SCIENTIFIC_V2_CANONICAL_MANIFEST_MISMATCH')
  if (!snapshot || !canonicalManifest || !hashPattern.test(String(snapshot.snapshotHash || ''))
    || canonicalWithoutHash(snapshot, 'snapshotHash') !== snapshot.snapshotHash) {
    scientificError('SCIENTIFIC_V2_REGISTRY_SNAPSHOT_INVALID')
  }
  if (snapshot.registryHash !== canonicalHash(snapshot.registry)) scientificError('SCIENTIFIC_V2_REGISTRY_HASH_MISMATCH')
  let rebuilt: AnyRecord
  try {
    rebuilt = buildScientificV2CanonicalManifest({
      registryVersion: snapshot.registryVersion,
      registryHash: snapshot.registryHash,
      registry: snapshot.registry,
    }) as AnyRecord
  } catch {
    scientificError('SCIENTIFIC_V2_CANONICAL_MANIFEST_MISMATCH')
  }
  if (canonicalHash(rebuilt) !== canonicalHash(canonicalManifest)) scientificError('SCIENTIFIC_V2_CANONICAL_MANIFEST_MISMATCH')
  for (const model of canonicalManifest.models) {
    assertExactKeys(model, ['canonicalModelId', 'displayName', 'developer', 'generationRoute', 'editRoute', 'routes'], 'SCIENTIFIC_V2_CANONICAL_MANIFEST_MISMATCH')
    assertExactKeys(model.generationRoute, ['provider', 'modelId'], 'SCIENTIFIC_V2_CANONICAL_MANIFEST_MISMATCH')
    if (model.editRoute) assertExactKeys(model.editRoute, ['provider', 'modelId', 'editMode'], 'SCIENTIFIC_V2_CANONICAL_MANIFEST_MISMATCH')
    for (const route of model.routes) assertExactKeys(route, ['provider', 'modelId', 'editMode', 'resolutions'], 'SCIENTIFIC_V2_CANONICAL_MANIFEST_MISMATCH')
  }
  const manifest = input.manifest
  assertExactKeys(manifest, [
    'schemaVersion', 'suiteId', 'evaluationMode', 'evaluationEpoch', 'reviewProtocol', 'presentationVersion',
    'codeSha', 'registryVersion', 'registryHash', 'registrySnapshotHash', 'registrySnapshot', 'canonicalManifestHash', 'suiteHash', 'priceHash', 'priceOperatorAuthorizationHash',
    'canonicalManifest', 'models', 'cases', 'executionOrder', 'providerOrder', 'providerBudgetsCny',
    'codexLimits', 'concurrency', 'lockName', 'priceSnapshot', 'createdAt', 'manifestHash',
  ], 'SCIENTIFIC_V2_BATCH_MANIFEST_INVALID')
  assertIsoInstant(manifest.createdAt, 'SCIENTIFIC_V2_BATCH_MANIFEST_INVALID')
  if (!manifest || manifest.schemaVersion !== 2 || !hashPattern.test(String(manifest.manifestHash || ''))
    || canonicalWithoutHash(manifest, 'manifestHash') !== manifest.manifestHash
    || manifest.canonicalManifestHash !== canonicalManifest.manifestHash
    || canonicalHash(manifest.canonicalManifest) !== canonicalHash(canonicalManifest)
    || manifest.registrySnapshotHash !== snapshot.snapshotHash
    || canonicalHash(manifest.registrySnapshot) !== canonicalHash(snapshot)
    || manifest.registryVersion !== snapshot.registryVersion || manifest.registryHash !== snapshot.registryHash
    || manifest.suiteHash !== PB_SCIENTIFIC_FIGURE_V2.manifestHash
    || canonicalHash(manifest.cases) !== canonicalHash(PB_SCIENTIFIC_FIGURE_V2.cases)
    || !codeShaPattern.test(String(manifest.codeSha || ''))
    || manifest.concurrency !== 1 || manifest.lockName !== productionLockName
    || canonicalHash(manifest.providerOrder) !== canonicalHash(providers)
    || canonicalHash(manifest.providerBudgetsCny) !== canonicalHash(SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY)
    || canonicalHash(manifest.codexLimits) !== canonicalHash({ modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 })
    || canonicalHash(manifest.models) !== canonicalHash(canonicalManifest.models)
    || !Array.isArray(manifest.executionOrder) || manifest.executionOrder.length !== canonicalManifest.models.length * 9
    || Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY).some(([key, value]) => manifest[key] !== value)) {
    scientificError('SCIENTIFIC_V2_BATCH_MANIFEST_INVALID')
  }
  const price = manifest.priceSnapshot
  const typedCanonicalManifest = canonicalManifest as unknown as Parameters<typeof verifyScientificV2PriceSnapshot>[1]
  verifyScientificV2PriceSnapshot(price, typedCanonicalManifest)
  if (manifest.priceHash !== price.snapshotHash || price.capturedAt !== manifest.createdAt
    || manifest.priceOperatorAuthorizationHash !== price.operatorAuthorizationHash) scientificError('SCIENTIFIC_V2_PRICE_SNAPSHOT_INVALID')
  const priceByRoute = new Map<string, number>(price.entries.map((entry: AnyRecord) => [`${entry.provider}\0${entry.modelId}\0${entry.operation}`, Number(entry.unitCny)]))
  const estimates = { bailian: 0, ark: 0, openrouter: 0 }
  const modelIds = new Set<string>()
  const slotIds = new Set<string>()
  const seenCanaries = new Set<string>()
  const priceRequirements = new Map(deriveScientificV2PriceRequirements(typedCanonicalManifest)
    .map((requirement) => [`${requirement.provider}\0${requirement.modelId}\0${requirement.operation}`, requirement]))
  for (const [index, slot] of manifest.executionOrder.entries()) {
    assertExactKeys(slot, [
      'sequence', 'slotId', 'canonicalModelId', 'caseId', 'provider', 'modelId', 'operation', 'supported',
      'imageSize', 'isProviderCanary', 'routeStatus',
    ], 'SCIENTIFIC_V2_EXECUTION_SLOT_INVALID')
    const model = canonicalManifest.models.find((candidate: AnyRecord) => candidate.canonicalModelId === slot.canonicalModelId)
    const scientificCase = PB_SCIENTIFIC_FIGURE_V2.cases.find((candidate) => candidate.id === slot.caseId)
    if (!model || !scientificCase || slot.sequence !== index + 1 || slotIds.has(slot.slotId)
      || slot.operation !== scientificCase.kind || slot.supported !== Boolean(slot.provider && slot.modelId)
      || (scientificCase.kind === 'generation' && (slot.provider !== model.generationRoute.provider || slot.modelId !== model.generationRoute.modelId))
      || (scientificCase.kind === 'edit' && model.editRoute && (slot.provider !== model.editRoute.provider || slot.modelId !== model.editRoute.modelId))
      || (scientificCase.kind === 'edit' && !model.editRoute && (slot.provider !== null || slot.modelId !== null || slot.routeStatus !== 'no_direct_edit_route'))
      || (slot.provider === 'codex' && slot.canonicalModelId !== 'codex:gpt-image-2')
      || (slot.supported && slot.imageSize !== (slot.provider === 'codex' ? '2K'
        : priceRequirements.get(`${slot.provider}\0${slot.modelId}\0${slot.operation}`)?.imageSize))
      || (!slot.supported && slot.imageSize !== null)
      || ((slot.provider === 'codex' || slot.provider === null) && slot.isProviderCanary)
      || (slot.provider && slot.provider !== 'codex' && slot.isProviderCanary !== !seenCanaries.has(slot.provider))) {
      scientificError('SCIENTIFIC_V2_EXECUTION_SLOT_INVALID')
    }
    if (slot.isProviderCanary) seenCanaries.add(slot.provider)
    slotIds.add(slot.slotId)
    modelIds.add(slot.canonicalModelId)
    if (slot.provider && slot.provider !== 'codex') {
      const unit = priceByRoute.get(`${slot.provider}\0${slot.modelId}\0${slot.operation}`)
      if (unit === undefined) scientificError('SCIENTIFIC_V2_PRICE_MISSING')
      estimates[slot.provider as keyof typeof estimates] += unit
    }
  }
  if (modelIds.size !== canonicalManifest.models.length
    || providers.some((provider) => estimates[provider] > SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY[provider])) {
    scientificError('SCIENTIFIC_V2_PREFLIGHT_BUDGET_INVALID')
  }
}

function assertInitialState(input: AnyRecord) {
  const state = input.initialState
  const manifest = input.manifest
  verifyScientificV2ImportedState(state, manifest)
  if (!state || state.schemaVersion !== 2 || state.manifestHash !== manifest.manifestHash
    || state.status !== 'ready' || state.pauseReason !== null || state.blockReason !== null
    || !hashPattern.test(String(state.stateHash || '')) || canonicalWithoutHash(state, 'stateHash') !== state.stateHash
    || canonicalHash(state.providerSpentCny) !== canonicalHash({ bailian: 0, ark: 0, openrouter: 0 })
    || canonicalHash(state.providerUnreconciledCny) !== canonicalHash({ bailian: 0, ark: 0, openrouter: 0 })
    || !Array.isArray(state.slots) || state.slots.length !== manifest.executionOrder.length) {
    scientificError('SCIENTIFIC_V2_INITIAL_STATE_INVALID')
  }
  for (const [index, slot] of state.slots.entries()) {
    const frozenSlot = manifest.executionOrder[index]
    const expectedStatus = 'pending'
    if (slot.status !== expectedStatus || slot.costCny !== null
      || !Array.isArray(slot.attempts) || slot.attempts.length !== 0
      || Object.entries(frozenSlot).some(([key, value]) => canonicalHash(slot[key]) !== canonicalHash(value))) {
      scientificError('SCIENTIFIC_V2_INITIAL_STATE_INVALID')
    }
  }
}

function exactSortedStrings(value: unknown, code: string, limit = 512) {
  if (!Array.isArray(value) || value.length < 1 || value.length > limit
    || value.some((item) => typeof item !== 'string' || item.length < 1 || item.length > 300)) scientificError(code)
  const sorted = [...value].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
  if (new Set(sorted).size !== sorted.length || canonicalHash(sorted) !== canonicalHash(value)) scientificError(code)
  return sorted
}

function rebindRemediationAttempt(manifest: AnyRecord, slot: AnyRecord, attempt: AnyRecord) {
  const scientificCase = manifest.cases.find((candidate: AnyRecord) => candidate.id === slot.caseId)
  if (!scientificCase) scientificError('SCIENTIFIC_V2_REMEDIATION_SOURCE_INVALID')
  const attemptBase: AnyRecord = {
    ...structuredClone(attempt),
    payloadHash: expectedPayloadHash(manifest, slot, scientificCase),
  }
  delete attemptBase.attemptHash
  return { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
}

export function buildScientificV2RemediationFreeze(input: {
  sourceManifest: AnyRecord
  sourceState: AnyRecord
  codeSha: string
  targetSlotIds: string[]
  zeroCallCorrection?: true
  now: Date
}) {
  if (!codeShaPattern.test(input.codeSha) || !(input.now instanceof Date) || !Number.isFinite(input.now.getTime())) {
    scientificError('SCIENTIFIC_V2_REMEDIATION_INPUT_INVALID')
  }
  const zeroCallCorrection = input.zeroCallCorrection === true
  const targetSlotIds = zeroCallCorrection && Array.isArray(input.targetSlotIds) && input.targetSlotIds.length === 0
    ? []
    : exactSortedStrings(input.targetSlotIds, 'SCIENTIFIC_V2_REMEDIATION_TARGET_SET_INVALID')
  if (zeroCallCorrection !== (targetSlotIds.length === 0)) scientificError('SCIENTIFIC_V2_REMEDIATION_TARGET_SET_INVALID')
  verifyScientificV2ImportedState(input.sourceState, input.sourceManifest)
  if (input.sourceState.status !== 'completed'
    || input.sourceState.slots.some((slot: AnyRecord) => !['succeeded', 'failed', 'unsupported'].includes(slot.status))) {
    scientificError('SCIENTIFIC_V2_REMEDIATION_SOURCE_INVALID')
  }
  const sourceSlots = new Map(input.sourceState.slots.map((slot: AnyRecord) => [slot.slotId, slot]))
  if (targetSlotIds.some((slotId) => {
    const slot = sourceSlots.get(slotId) as AnyRecord | undefined
    return !slot || slot.status !== 'failed' || slot.attempts.length !== 4
      || slot.attempts.some((attempt: AnyRecord) => !confirmedFailureResponseClasses.has(attempt.responseClass))
  })) scientificError('SCIENTIFIC_V2_REMEDIATION_TARGET_SET_INVALID')

  const manifestBase = structuredClone(input.sourceManifest)
  delete manifestBase.manifestHash
  manifestBase.codeSha = input.codeSha
  const manifest: AnyRecord = { ...manifestBase, manifestHash: canonicalHash(manifestBase) }
  const targets = new Set(targetSlotIds)
  const slots = input.sourceState.slots.map((sourceSlot: AnyRecord) => {
    const slot = structuredClone(sourceSlot)
    if (targets.has(slot.slotId)) return { ...slot, status: 'pending', costCny: null, attempts: [] }
    slot.attempts = slot.attempts.map((attempt: AnyRecord) => rebindRemediationAttempt(manifest, slot, attempt))
    return slot
  })
  const providerSpentCny = { bailian: 0, ark: 0, openrouter: 0 }
  for (const slot of slots) if (slot.provider && slot.provider !== 'codex') {
    providerSpentCny[slot.provider as keyof typeof providerSpentCny] = Number((
      providerSpentCny[slot.provider as keyof typeof providerSpentCny]
      + slot.attempts.reduce((sum: number, attempt: AnyRecord) => sum + Number(attempt.actualCny ?? attempt.estimatedCny), 0)
    ).toFixed(8))
  }
  const stateBase = {
    schemaVersion: 2,
    manifestHash: manifest.manifestHash,
    // A remediation state deliberately mixes carried terminal slots with pending targets.
    // `running` is the only canonical state shape that permits that mix before a lease is claimed.
    status: zeroCallCorrection ? 'completed' : 'running',
    pauseReason: null,
    blockReason: null,
    createdAt: input.sourceState.createdAt,
    updatedAt: input.now.toISOString(),
    providerSpentCny,
    providerUnreconciledCny: { bailian: 0, ark: 0, openrouter: 0 },
    slots,
  }
  const initialState = { ...stateBase, stateHash: canonicalHash(stateBase) }
  verifyScientificV2ImportedState(initialState, manifest)
  return deepFreeze({ manifest, initialState, targetSlotIds, targetSlotSetHash: canonicalHash(targetSlotIds) })
}

export function createScientificV2MongoRepository(
  db: Db,
  now = () => new Date(),
  createClaimToken = () => randomBytes(32).toString('hex'),
  options: {
    operatorReportSecret?: string
    immutableCodeSha?: string
    verifyObject?: (objectKey: string, imageHash: string) => Promise<void>
    verifyReviewObject?: (objectKey: string, imageHash: string) => Promise<void>
    claimLeaseMs?: number
    requireRegistryAuthority?: boolean
    correctionPlanForTest?: {
      baselineReleaseHash: string
      activePredecessorReleaseHash: string
      targetModelIds: string[]
    }
  } = {},
) {
  const batches = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.batches)
  const dispatches = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.dispatches)
  const reviews = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.reviews)
  const publicEvidence = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.publicEvidence)
  const releases = db.collection<AnyRecord>('paperbanana_benchmark_releases')
  const releaseHeads = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.releaseHeads)
  const releaseLifecycle = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.releaseLifecycle)
  const verifyObject = options.verifyObject || (async () => {})
  const verifyReviewObject = options.verifyReviewObject || verifyObject
  const claimLeaseMs = options.claimLeaseMs ?? 120_000
  const correctionPlan = options.correctionPlanForTest || SCIENTIFIC_V2_CORRECTIVE_RELEASE_PLAN
  if (!Number.isInteger(claimLeaseMs) || claimLeaseMs < 1) scientificError('SCIENTIFIC_V2_CLAIM_LEASE_INVALID')

  const assertExactCorrectionPlanBatch = (batch: AnyRecord) => {
    const correctionBaseline = batch?.correctionBaseline
    const remediation = batch?.remediationOf
    const requiresCorrection = remediation?.releaseHash === correctionPlan.activePredecessorReleaseHash
    if (!requiresCorrection && correctionBaseline === undefined) return
    const zeroCallCorrection = batch?.zeroCallCorrection === true
    if (!requiresCorrection || !correctionBaseline
      || correctionBaseline.releaseHash !== correctionPlan.baselineReleaseHash
      || !Array.isArray(remediation.targetModelIds)
      || canonicalHash(remediation.targetModelIds) !== canonicalHash(correctionPlan.targetModelIds)
      || (zeroCallCorrection && (batch.state?.status !== 'completed'
        || !hashPattern.test(String(batch.stateTransitionFromHash || ''))
        || canonicalHash(remediation.targetSlotIds) !== canonicalHash([])
        || remediation.targetSlotSetHash !== canonicalHash([])))
      || (!zeroCallCorrection && Array.isArray(remediation.targetSlotIds) && remediation.targetSlotIds.length === 0)) {
      scientificError('SCIENTIFIC_V2_CORRECTION_PLAN_INVALID')
    }
  }

  const operatorSecret = () => {
    const secret = options.operatorReportSecret
    if (typeof secret !== 'string' || secret.trim() !== secret || Buffer.byteLength(secret, 'utf8') < 32 || Buffer.byteLength(secret, 'utf8') > 4096) {
      scientificError('SCIENTIFIC_V2_OPERATOR_REPORT_SECRET_INVALID')
    }
    return secret
  }

  const validateStoredCodeLineage = (batch: AnyRecord) => {
    const fields = ['manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash'] as const
    const present = fields.map((field) => Object.hasOwn(batch, field))
    if (present.some(Boolean) && !present.every(Boolean)) scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
    if (!present.every(Boolean)) return null
    const lineage = {
      manifestCodeSha: batch.manifestCodeSha,
      executionCodeSha: batch.executionCodeSha,
      legacyRecoveryStateHash: batch.legacyRecoveryStateHash,
    }
    if (!codeShaPattern.test(String(lineage.manifestCodeSha || ''))
      || !codeShaPattern.test(String(lineage.executionCodeSha || ''))
      || lineage.manifestCodeSha !== batch.manifest?.codeSha
      || (lineage.legacyRecoveryStateHash !== null && !hashPattern.test(String(lineage.legacyRecoveryStateHash || '')))
      || (lineage.legacyRecoveryStateHash === null && lineage.manifestCodeSha !== lineage.executionCodeSha)
      || (Object.hasOwn(batch, 'lineageRecoveryRotationUsed') && typeof batch.lineageRecoveryRotationUsed !== 'boolean')) {
      scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
    }
    return { lineage, rotationUsed: batch.lineageRecoveryRotationUsed === true }
  }

  const ensureBatchCodeLineage = async (batch: AnyRecord) => {
    if (batch.manifestHash !== batch.manifest?.manifestHash || batch.stateHash !== batch.state?.stateHash) {
      scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
    }
    const manifestCodeSha = String(batch.manifest?.codeSha || '')
    const executionCodeSha = String(options.immutableCodeSha || manifestCodeSha)
    if (!codeShaPattern.test(manifestCodeSha) || !codeShaPattern.test(executionCodeSha)) {
      scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
    }
    const exactLegacyBlocked = batch.status === 'blocked' && batch.stateHash === batch.state?.stateHash
      && batch.state?.status === 'blocked' && batch.state?.blockReason === 'provider_canary_failed'
    if (exactLegacyBlocked) verifyScientificV2ImportedState(batch.state, batch.manifest)
    const stored = validateStoredCodeLineage(batch)
    if (stored) {
      if (stored.lineage.executionCodeSha === executionCodeSha) return stored.lineage
      const rotationAllowed = exactLegacyBlocked
        && executionCodeSha !== manifestCodeSha
        && stored.lineage.legacyRecoveryStateHash === batch.stateHash
        && Number(batch.revision || 0) === 0
        && batch.latestStateReportHash === null
        && stored.rotationUsed === false
      if (!rotationAllowed) scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
      const unresolvedDispatch = await dispatches.findOne({ manifestHash: batch.manifestHash, status: 'started' })
      if (unresolvedDispatch) scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
      const rotationQuery = {
        _id: batch._id,
        manifestCodeSha: stored.lineage.manifestCodeSha,
        executionCodeSha: stored.lineage.executionCodeSha,
        legacyRecoveryStateHash: stored.lineage.legacyRecoveryStateHash,
        stateHash: batch.stateHash,
        status: 'blocked',
        revision: 0,
        latestStateReportHash: null,
        activeDispatchId: { $exists: false },
      }
      let rotated = await batches.updateOne(
        { ...rotationQuery, lineageRecoveryRotationUsed: false },
        { $set: { executionCodeSha, lineageRecoveryRotationUsed: true } },
      )
      if (rotated.modifiedCount !== 1) {
        rotated = await batches.updateOne(
          { ...rotationQuery, lineageRecoveryRotationUsed: { $exists: false } },
          { $set: { executionCodeSha, lineageRecoveryRotationUsed: true } },
        )
      }
      if (rotated.modifiedCount === 1) {
        batch.executionCodeSha = executionCodeSha
        batch.lineageRecoveryRotationUsed = true
        return { ...stored.lineage, executionCodeSha }
      }
      const raced = await batches.findOne({ _id: batch._id })
      const racedStored = raced ? validateStoredCodeLineage(raced) : null
      if (!racedStored || racedStored.lineage.executionCodeSha !== executionCodeSha) scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
      return racedStored.lineage
    }
    if (manifestCodeSha !== executionCodeSha && !exactLegacyBlocked) scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
    const lineage = {
      manifestCodeSha,
      executionCodeSha,
      legacyRecoveryStateHash: manifestCodeSha !== executionCodeSha && exactLegacyBlocked ? batch.stateHash : null,
    }
    const updated = await batches.updateOne(
      {
        _id: batch._id,
        manifestCodeSha: { $exists: false }, executionCodeSha: { $exists: false }, legacyRecoveryStateHash: { $exists: false },
      },
      { $set: { ...structuredClone(lineage), lineageRecoveryRotationUsed: false } },
    )
    if (updated.modifiedCount !== 1) {
      const raced = await batches.findOne({ _id: batch._id })
      if (!raced) scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
      const racedStored = validateStoredCodeLineage(raced)
      if (!racedStored || racedStored.lineage.executionCodeSha !== executionCodeSha) scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
      return racedStored.lineage
    }
    Object.assign(batch, lineage, { lineageRecoveryRotationUsed: false })
    return lineage
  }

  const publicationBatchCodeLineage = async (batch: AnyRecord) => {
    const stored = validateStoredCodeLineage(batch)
    if (!stored) {
      const lineage = await ensureBatchCodeLineage(batch)
      return { ...lineage, publicationCodeSha: lineage.executionCodeSha }
    }
    const publicationCodeSha = String(options.immutableCodeSha || stored.lineage.executionCodeSha)
    if (!codeShaPattern.test(publicationCodeSha)) scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
    if (publicationCodeSha !== stored.lineage.executionCodeSha) {
      if (!['review_ready', 'review_finalized', 'published'].includes(String(batch.status || ''))
        || batch.state?.status !== 'completed'
        || batch.stateHash !== batch.state?.stateHash
        || !hashPattern.test(String(batch.reviewFinalHash || ''))
        || await dispatches.findOne({ manifestHash: batch.manifestHash, status: 'started' })) {
        scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
      }
    }
    return { ...stored.lineage, publicationCodeSha }
  }

  const verifiedCodexProvenance = (report: AnyRecord, state: AnyRecord) => {
    assertExactKeys(report.codexProvenance, ['modelId', 'successfulSlots', 'toolCalls', 'firstCaseId', 'artifactCanaryHash'], 'SCIENTIFIC_V2_CODEX_PROVENANCE_INVALID')
    assertExactKeys(report.disclosure, ['containsSecrets', 'automaticJudges', 'reviewerIdentity'], 'SCIENTIFIC_V2_CODEX_DISCLOSURE_INVALID')
    const codexSlots = state.slots.filter((slot: AnyRecord) => slot.provider === 'codex')
    const successfulSlots = codexSlots.filter((slot: AnyRecord) => slot.status === 'succeeded').length
    const toolCalls = codexSlots.reduce((sum: number, slot: AnyRecord) => sum + slot.attempts.length, 0)
    if (codexSlots.length !== 9 || codexSlots[0]?.status !== 'succeeded'
      || codexSlots.some((slot: AnyRecord) => !['succeeded', 'failed'].includes(slot.status))
      || report.codexProvenance.modelId !== 'codex:gpt-image-2'
      || report.codexProvenance.successfulSlots !== successfulSlots
      || report.codexProvenance.toolCalls !== toolCalls || toolCalls > 36
      || report.codexProvenance.firstCaseId !== codexSlots[0]?.caseId
      || report.codexProvenance.artifactCanaryHash !== codexSlots[0]?.attempts.at(-1)?.rawImageHash
      || report.disclosure.containsSecrets !== false
      || canonicalHash(report.disclosure.automaticJudges) !== canonicalHash([])
      || report.disclosure.reviewerIdentity !== null) scientificError('SCIENTIFIC_V2_CODEX_PROVENANCE_INVALID')
    return structuredClone(report.codexProvenance)
  }

  const inheritedRemediationCodexProvenance = async (batch: AnyRecord) => {
    const remediation = batch.remediationOf
    if (!remediation || !Array.isArray(remediation.targetSlotIds)
      || remediation.targetSlotIds.some((slotId: unknown) => typeof slotId !== 'string' || slotId.startsWith('codex:gpt-image-2:'))) {
      scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
    }
    const source = batch.correctionBaseline || remediation
    const sourceBatch = await batches.findOne({
      batchId: source.batchId,
      manifestHash: source.manifestHash,
      status: 'published',
      releaseId: source.releaseId,
      releaseHash: source.releaseHash,
    })
    const sourceRelease = await releases.findOne({
      _id: source.releaseId,
      releaseHash: source.releaseHash,
      batchId: source.batchId,
      batchManifestHash: source.manifestHash,
      profileStatus: 'published',
      ...SCIENTIFIC_BENCHMARK_IDENTITY,
    })
    if (!sourceBatch || !sourceRelease || sourceBatch.state?.status !== 'completed'
      || sourceBatch.stateHash !== sourceBatch.state?.stateHash
      || !hashPattern.test(String(sourceBatch.latestStateReportHash || ''))) {
      scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
    }
    const { _id: _releaseId, releaseHash: sourceReleaseHash, ...sourceReleaseBase } = sourceRelease
    if (canonicalHash(sourceReleaseBase) !== sourceReleaseHash) scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
    const sourceReportRow = await reviews.findOne({ _id: `scientific-v2-state-report:${sourceBatch.latestStateReportHash}` })
    if (!sourceReportRow || sourceReportRow.reportHash !== sourceBatch.latestStateReportHash
      || normalizeScientificV2StateOperationReport(sourceReportRow.report).reportHash !== sourceReportRow.reportHash
      || !safeHmacEqual(sourceReportRow.attestationHash, createHmac('sha256', operatorSecret()).update(sourceReportRow.reportHash).digest('hex'))
      || sourceReportRow.report.kind !== 'codex'
      || sourceReportRow.report.batchId !== sourceBatch.batchId
      || sourceReportRow.report.batchManifestHash !== sourceBatch.manifestHash
      || sourceReportRow.report.stateHash !== sourceBatch.stateHash
      || canonicalHash(sourceReportRow.report.state) !== canonicalHash(sourceBatch.state)) {
      scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
    }
    verifyScientificV2ImportedState(sourceReportRow.report.state, sourceBatch.manifest)
    const provenance = verifiedCodexProvenance(sourceReportRow.report, sourceReportRow.report.state)
    const currentCodexSlots = new Map(batch.state.slots
      .filter((slot: AnyRecord) => slot.provider === 'codex')
      .map((slot: AnyRecord) => [slot.slotId, slot]))
    const sourceCodexSlots = sourceBatch.state.slots.filter((slot: AnyRecord) => slot.provider === 'codex')
    if (sourceCodexSlots.length !== 9 || currentCodexSlots.size !== 9) scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
    for (const sourceSlot of sourceCodexSlots) {
      const currentSlot = currentCodexSlots.get(sourceSlot.slotId) as AnyRecord | undefined
      if (!currentSlot) scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      const expected = structuredClone(sourceSlot)
      expected.attempts = sourceSlot.attempts.map((attempt: AnyRecord) => rebindRemediationAttempt(batch.manifest, currentSlot, attempt))
      if (canonicalHash(expected) !== canonicalHash(currentSlot)) scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
    }
    return provenance
  }

  return {
    async ensureIndexes() {
      const indexes = [
        [batches, { batchId: 1 }, { unique: true, name: 'scientific_v2_batch_id' }],
        [batches, { manifestHash: 1 }, { unique: true, name: 'scientific_v2_manifest_hash' }],
        [dispatches, { manifestHash: 1, slotId: 1, attemptIndex: 1 }, { unique: true, name: 'scientific_v2_dispatch_identity' }],
        [reviews, { batchManifestHash: 1, sourceSetHash: 1, role: 1 }, { unique: true, name: 'scientific_v2_review_identity' }],
        [publicEvidence, { sourceReleaseHash: 1, profileId: 1, caseId: 1 }, { unique: true, name: 'scientific_v2_public_evidence_identity' }],
      ] as const
      await Promise.all(indexes.map(async ([collection, keys, options]) => {
        if (typeof (collection as any).createIndex === 'function') await (collection as any).createIndex(keys, options)
      }))
    },
    async publicEvidenceForRelease(releaseHash: string, query: { profileId?: string; caseId?: string; cursor?: string; limit: number }) {
      const offset = /^\d+$/.test(String(query.cursor || '')) ? Number(query.cursor) : 0
      const limit = Math.max(1, Math.min(12, Number(query.limit) || 12))
      const rows = await publicEvidence.find({
        sourceReleaseHash: releaseHash,
        ...(query.profileId ? { profileId: query.profileId } : {}),
        ...(query.caseId ? { caseId: query.caseId } : {}),
      }).sort(query.caseId ? { overallRank: 1, profileId: 1 } : { overallRank: 1, profileId: 1, caseId: 1 }).toArray()
      const ordered = query.profileId
        ? rows.sort((left, right) => (scientificCaseOrder.get(String(left.caseId)) ?? Number.MAX_SAFE_INTEGER)
          - (scientificCaseOrder.get(String(right.caseId)) ?? Number.MAX_SAFE_INTEGER))
        : rows
      const page = ordered.slice(offset, offset + limit + 1)
      return { items: page.slice(0, limit), nextCursor: page.length > limit ? String(offset + limit) : null }
    },
    async freezeBatch(input: AnyRecord) {
      const batchId = String(input?.batchId || '')
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/.test(batchId)) scientificError('SCIENTIFIC_V2_BATCH_ID_INVALID')
      if (options.requireRegistryAuthority) {
        const authority = verifyScientificV2RegistryAuthority(input.registryAuthority, {
          expectedCodeSha: String(options.immutableCodeSha || ''), secret: operatorSecret(), now,
        })
        if (authority.registryVersion !== input.registrySnapshot?.registryVersion
          || authority.registryBytesHash !== createHash('sha256').update(JSON.stringify(input.registrySnapshot?.registry)).digest('hex')
          || authority.registry.registryVersion !== input.canonicalManifest?.registryVersion) {
          scientificError('SCIENTIFIC_V2_REGISTRY_AUTHORITY_BINDING_INVALID')
        }
      }
      const immutableInput = {
        batchId,
        registrySnapshot: input.registrySnapshot,
        canonicalManifest: input.canonicalManifest,
        manifest: input.manifest,
        initialState: input.initialState,
        ...(options.requireRegistryAuthority ? { registryAuthority: input.registryAuthority } : {}),
      }
      const frozenInputHash = canonicalHash(immutableInput)
      const existingById = await batches.findOne({ batchId })
      const existingByManifest = await batches.findOne({ manifestHash: String(input?.manifest?.manifestHash || '') })
      const existing = existingById || existingByManifest
      if (existing) {
        if (existing.frozenInputHash !== frozenInputHash) scientificError('SCIENTIFIC_V2_BATCH_CONFLICT')
        return { batchId, manifestHash: existing.manifestHash, stateHash: existing.stateHash, replayed: true }
      }
      assertRegistryAndManifest(input)
      if (options.immutableCodeSha && input.manifest.codeSha !== options.immutableCodeSha) scientificError('SCIENTIFIC_V2_CODE_SHA_MISMATCH')
      assertInitialState(input)
      const document = {
        _id: `scientific-v2-batch:${batchId}`,
        ...structuredClone(immutableInput),
        manifestHash: input.manifest.manifestHash,
        stateHash: input.initialState.stateHash,
        state: structuredClone(input.initialState),
        stateTransitionFromHash: null,
        status: 'frozen',
        revision: 0,
        latestStateReportHash: null,
        frozenInputHash,
        createdAt: now(),
      }
      try {
        await batches.insertOne(document)
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error
        const raced = await batches.findOne({ batchId })
          || await batches.findOne({ manifestHash: document.manifestHash })
        if (!raced || raced.frozenInputHash !== frozenInputHash) scientificError('SCIENTIFIC_V2_BATCH_CONFLICT')
        return { batchId, manifestHash: raced.manifestHash, stateHash: raced.stateHash, replayed: true }
      }
      return { batchId, manifestHash: document.manifestHash, stateHash: document.stateHash, replayed: false }
    },
    async freezeRemediationBatch(input: AnyRecord) {
      const baseKeys = [
        'batchId', 'sourceBatchId', 'sourceManifestHash', 'sourceReleaseHash',
        'targetModelIds', 'targetSlotIds', 'targetSlotSetHash',
      ]
      const correctionKeys = ['baselineBatchId', 'baselineManifestHash', 'baselineReleaseId', 'baselineReleaseHash']
      const hasCorrectionBaseline = correctionKeys.some((key) => Object.hasOwn(input || {}, key))
      assertExactKeys(input, hasCorrectionBaseline ? [...baseKeys, ...correctionKeys] : baseKeys, 'SCIENTIFIC_V2_REMEDIATION_INPUT_INVALID')
      const batchId = String(input.batchId || '')
      const sourceBatchId = String(input.sourceBatchId || '')
      if (![batchId, sourceBatchId].every((value) => /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/.test(value))
        || !hashPattern.test(String(input.sourceManifestHash || ''))
        || !hashPattern.test(String(input.sourceReleaseHash || ''))) scientificError('SCIENTIFIC_V2_REMEDIATION_INPUT_INVALID')
      const targetModelIds = exactSortedStrings(input.targetModelIds, 'SCIENTIFIC_V2_REMEDIATION_TARGET_SET_INVALID', 64)
      const zeroCallCorrection = hasCorrectionBaseline && Array.isArray(input.targetSlotIds) && input.targetSlotIds.length === 0
      const targetSlotIds = zeroCallCorrection
        ? []
        : exactSortedStrings(input.targetSlotIds, 'SCIENTIFIC_V2_REMEDIATION_TARGET_SET_INVALID')
      if (canonicalHash(targetSlotIds) !== input.targetSlotSetHash) scientificError('SCIENTIFIC_V2_REMEDIATION_TARGET_SET_INVALID')
      if ((input.sourceReleaseHash === correctionPlan.activePredecessorReleaseHash && !hasCorrectionBaseline)
        || (hasCorrectionBaseline && (input.baselineReleaseHash !== correctionPlan.baselineReleaseHash
        || input.sourceReleaseHash !== correctionPlan.activePredecessorReleaseHash
        || canonicalHash(targetModelIds) !== canonicalHash(correctionPlan.targetModelIds)))) {
        scientificError('SCIENTIFIC_V2_CORRECTION_PLAN_INVALID')
      }
      const source = await batches.findOne({
        batchId: sourceBatchId, manifestHash: input.sourceManifestHash,
        releaseHash: input.sourceReleaseHash, status: 'published',
      })
      if (!source || source.state?.status !== 'completed' || source.releaseId === undefined
        || source.stateHash !== source.state?.stateHash
        || source.manifestHash !== source.manifest?.manifestHash) {
        scientificError('SCIENTIFIC_V2_REMEDIATION_SOURCE_INVALID')
      }
      const sourceRelease = await releases.findOne({
        _id: source.releaseId, releaseHash: input.sourceReleaseHash,
        batchId: sourceBatchId, batchManifestHash: input.sourceManifestHash,
        profileStatus: 'published',
      })
      if (!sourceRelease) scientificError('SCIENTIFIC_V2_REMEDIATION_SOURCE_INVALID')
      const { _id: _sourceReleaseId, releaseHash: sourceReleaseHash, ...sourceReleaseBase } = sourceRelease
      if (canonicalHash(sourceReleaseBase) !== sourceReleaseHash) scientificError('SCIENTIFIC_V2_REMEDIATION_SOURCE_INVALID')
      verifyScientificV2ImportedState(source.state, source.manifest)
      const modelSet = new Set(targetModelIds)
      if (targetModelIds.some((modelId) => !source.manifest.models.some((model: AnyRecord) => model.canonicalModelId === modelId))) {
        scientificError('SCIENTIFIC_V2_REMEDIATION_TARGET_SET_INVALID')
      }
      const exactFailedSlots = source.state.slots
        .filter((slot: AnyRecord) => modelSet.has(slot.canonicalModelId) && slot.status === 'failed')
        .map((slot: AnyRecord) => slot.slotId)
        .sort((left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
      if (canonicalHash(exactFailedSlots) !== canonicalHash(targetSlotIds)) scientificError('SCIENTIFIC_V2_REMEDIATION_TARGET_SET_INVALID')
      if (zeroCallCorrection) {
        const targetSlots = source.state.slots.filter((slot: AnyRecord) => modelSet.has(slot.canonicalModelId))
        if (targetSlots.length !== targetModelIds.length * 9
          || targetSlots.some((slot: AnyRecord) => slot.status !== 'succeeded'
            || !hashPattern.test(String(slot.attempts.at(-1)?.rawImageHash || ''))
            || !['succeeded', 'succeeded_low_quality'].includes(String(slot.attempts.at(-1)?.responseClass)))) {
          scientificError('SCIENTIFIC_V2_CORRECTION_TARGET_INCOMPLETE')
        }
        if (!Array.isArray(sourceRelease.models)) scientificError('SCIENTIFIC_V2_REMEDIATION_SOURCE_INVALID')
        for (const modelId of targetModelIds) {
          const releaseModels = sourceRelease.models.filter((model: AnyRecord) => model.canonicalModelId === modelId)
          const releaseEvidence = releaseModels[0]?.evidence
          const modelSlots = targetSlots.filter((slot: AnyRecord) => slot.canonicalModelId === modelId)
          if (releaseModels.length !== 1 || !Array.isArray(releaseEvidence)
            || releaseEvidence.length !== modelSlots.length) scientificError('SCIENTIFIC_V2_REMEDIATION_SOURCE_INVALID')
          const evidenceByCase = new Map(releaseEvidence.map((item: AnyRecord) => [item.caseId, item]))
          if (evidenceByCase.size !== releaseEvidence.length
            || modelSlots.some((slot: AnyRecord) => {
              const evidence = evidenceByCase.get(slot.caseId) as AnyRecord | undefined
              const finalAttempt = slot.attempts.at(-1)
              return !evidence || evidence.status !== slot.status || evidence.imageHash !== finalAttempt?.rawImageHash
            })) scientificError('SCIENTIFIC_V2_REMEDIATION_SOURCE_INVALID')
        }
      }
      const immutableCodeSha = String(options.immutableCodeSha || '')
      const remediation = buildScientificV2RemediationFreeze({
        sourceManifest: source.manifest, sourceState: source.state, codeSha: immutableCodeSha,
        targetSlotIds, ...(zeroCallCorrection ? { zeroCallCorrection: true as const } : {}), now: now(),
      })
      const derivedInput = {
        batchId,
        registrySnapshot: source.registrySnapshot,
        canonicalManifest: source.canonicalManifest,
        manifest: remediation.manifest,
        initialState: remediation.initialState,
      }
      assertRegistryAndManifest(derivedInput)
      const remediationOf = {
        batchId: sourceBatchId,
        manifestHash: input.sourceManifestHash,
        releaseId: source.releaseId,
        releaseHash: input.sourceReleaseHash,
        targetModelIds,
        targetSlotIds,
        targetSlotSetHash: remediation.targetSlotSetHash,
      }
      let correctionBaseline: AnyRecord | undefined
      if (hasCorrectionBaseline) {
        if (![input.baselineBatchId, input.baselineReleaseId].every((value) => typeof value === 'string' && value.length > 0)
          || !hashPattern.test(String(input.baselineManifestHash || ''))
          || !hashPattern.test(String(input.baselineReleaseHash || ''))
          || input.baselineReleaseHash === input.sourceReleaseHash) {
          scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
        }
        const baselineBatch = await batches.findOne({
          batchId: input.baselineBatchId,
          manifestHash: input.baselineManifestHash,
          releaseId: input.baselineReleaseId,
          releaseHash: input.baselineReleaseHash,
          status: 'published',
        })
        const baselineRelease = await releases.findOne({
          _id: input.baselineReleaseId,
          releaseHash: input.baselineReleaseHash,
          batchId: input.baselineBatchId,
          batchManifestHash: input.baselineManifestHash,
          profileStatus: 'published',
          ...SCIENTIFIC_BENCHMARK_IDENTITY,
        })
        const sourceLifecycle = await releaseLifecycle.findOne({
          releaseId: source.releaseId,
          releaseHash: input.sourceReleaseHash,
          status: 'active',
          supersedesReleaseId: input.baselineReleaseId,
          supersedesReleaseHash: input.baselineReleaseHash,
        })
        const baselineLifecycle = await releaseLifecycle.findOne({
          releaseId: input.baselineReleaseId,
          releaseHash: input.baselineReleaseHash,
          status: 'superseded',
          supersededByReleaseId: source.releaseId,
          supersededByReleaseHash: input.sourceReleaseHash,
        })
        if (!baselineBatch || baselineBatch.state?.status !== 'completed' || !baselineRelease
          || !sourceLifecycle || !baselineLifecycle) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
        const { _id: _baselineReleaseId, releaseHash: baselineReleaseHash, ...baselineReleaseBase } = baselineRelease
        const baselineModelIds = Array.isArray(baselineRelease.models)
          ? baselineRelease.models.map((model: AnyRecord) => model.canonicalModelId).sort((left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
          : []
        const sourceModelIds = sourceRelease.models.map((model: AnyRecord) => model.canonicalModelId)
          .sort((left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
        if (canonicalHash(baselineReleaseBase) !== baselineReleaseHash
          || canonicalHash(baselineModelIds) !== canonicalHash(sourceModelIds)
          || targetModelIds.some((modelId) => !baselineModelIds.includes(modelId))) {
          scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
        }
        correctionBaseline = {
          releaseId: input.baselineReleaseId,
          releaseHash: input.baselineReleaseHash,
          batchId: input.baselineBatchId,
          manifestHash: input.baselineManifestHash,
        }
      }
      const frozenInputHash = canonicalHash({
        ...remediationOf,
        ...(correctionBaseline ? { correctionBaseline } : {}),
        ...(zeroCallCorrection ? { zeroCallCorrection: true } : {}),
        batchId,
        manifestHash: remediation.manifest.manifestHash,
        stateHash: remediation.initialState.stateHash,
      })
      const existing = await batches.findOne({ batchId })
        || await batches.findOne({ manifestHash: remediation.manifest.manifestHash })
      if (existing) {
        if (existing.frozenInputHash !== frozenInputHash) scientificError('SCIENTIFIC_V2_BATCH_CONFLICT')
        return {
          batchId, manifestHash: existing.manifestHash, stateHash: existing.stateHash,
          targetSlotCount: targetSlotIds.length, replayed: true,
        }
      }
      const carriedDispatches: AnyRecord[] = []
      const targets = new Set(targetSlotIds)
      for (const slot of remediation.initialState.slots) {
        if (targets.has(slot.slotId) || !slot.provider || slot.provider === 'codex') continue
        for (const attempt of slot.attempts) {
          const sourceMarker = await dispatches.findOne({
            manifestHash: input.sourceManifestHash, slotId: slot.slotId,
            attemptIndex: attempt.attemptIndex,
          })
          if (!sourceMarker || sourceMarker.payloadHash !== attempt.payloadHash) {
            scientificError('SCIENTIFIC_V2_REMEDIATION_DISPATCH_LEDGER_INVALID')
          }
          let carriedFromUnknownAuditId: string | undefined
          if (sourceMarker.status !== 'committed' || sourceMarker.attempt?.attemptHash !== attempt.attemptHash) {
            const audits = await reviews.find({
              artifactType: 'unknown_reconciliation', batchManifestHash: input.sourceManifestHash,
              slotId: slot.slotId, sequence: slot.sequence,
            }).toArray()
            const matching = audits.filter((audit: AnyRecord) => canonicalHash(audit.reconciledAttempt) === canonicalHash(attempt)
              && canonicalHash(audit.originalAttempt) === canonicalHash(sourceMarker.attempt))
            if (matching.length !== 1) scientificError('SCIENTIFIC_V2_REMEDIATION_DISPATCH_LEDGER_INVALID')
            assertUnknownReconciliationAudit(matching[0], { batch: source, marker: sourceMarker, slot, attempt })
            carriedFromUnknownAuditId = String(matching[0]._id)
          }
          const marker = {
            manifestHash: remediation.manifest.manifestHash,
            slotId: slot.slotId,
            attemptIndex: attempt.attemptIndex,
            payloadHash: attempt.payloadHash,
          }
          carriedDispatches.push({
            _id: markerId(marker), ...marker, status: 'committed', attempt: structuredClone(attempt),
            carriedFromDispatchId: sourceMarker._id,
            carriedFromManifestHash: input.sourceManifestHash,
            ...(carriedFromUnknownAuditId ? { carriedFromUnknownAuditId } : {}),
            committedAt: now(),
          })
        }
      }
      const document = {
        _id: `scientific-v2-batch:${batchId}`,
        ...structuredClone(derivedInput),
        manifestHash: remediation.manifest.manifestHash,
        stateHash: remediation.initialState.stateHash,
        state: structuredClone(remediation.initialState),
        stateTransitionFromHash: zeroCallCorrection ? source.stateHash : null,
        status: 'frozen',
        revision: 0,
        latestStateReportHash: null,
        frozenInputHash,
        remediationOf: structuredClone(remediationOf),
        ...(correctionBaseline ? { correctionBaseline: structuredClone(correctionBaseline) } : {}),
        ...(zeroCallCorrection ? { zeroCallCorrection: true } : {}),
        carriedDispatchCount: carriedDispatches.length,
        createdAt: now(),
      }
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          await batches.insertOne(document, { session } as any)
          for (const marker of carriedDispatches) await dispatches.insertOne(marker, { session } as any)
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error
        const raced = await batches.findOne({ batchId })
          || await batches.findOne({ manifestHash: remediation.manifest.manifestHash })
        if (!raced || raced.frozenInputHash !== frozenInputHash) scientificError('SCIENTIFIC_V2_BATCH_CONFLICT')
        return {
          batchId, manifestHash: raced.manifestHash, stateHash: raced.stateHash,
          targetSlotCount: targetSlotIds.length, replayed: true,
        }
      } finally {
        await session.endSession()
      }
      return {
        batchId, manifestHash: document.manifestHash, stateHash: document.stateHash,
        targetSlotCount: targetSlotIds.length, replayed: false,
      }
    },
    async operatorAttestation(input: { batchId?: string; manifestHash?: string }) {
      const batch = await batches.findOne(input.batchId ? { batchId: input.batchId } : { manifestHash: input.manifestHash })
      if (!batch) scientificError('SCIENTIFIC_V2_BATCH_NOT_FOUND')
      assertExactCorrectionPlanBatch(batch)
      const secret = operatorSecret()
      if (batch.manifestHash !== batch.manifest?.manifestHash
        || canonicalWithoutHash(batch.manifest, 'manifestHash') !== batch.manifestHash) scientificError('SCIENTIFIC_V2_MANIFEST_HASH_INVALID')
      if (batch.stateHash !== batch.state?.stateHash) scientificError('SCIENTIFIC_V2_STATE_HASH_INVALID')
      verifyScientificV2ImportedState(batch.state, batch.manifest)
      const manifestSnapshot = structuredClone(batch.manifest)
      const stateSnapshot = structuredClone(batch.state)
      const codeLineage = await ensureBatchCodeLineage(batch)
      const correction = batch.correctionBaseline ? {
        baseline: structuredClone(batch.correctionBaseline),
        activePredecessor: {
          releaseId: batch.remediationOf.releaseId,
          releaseHash: batch.remediationOf.releaseHash,
          batchId: batch.remediationOf.batchId,
          manifestHash: batch.remediationOf.manifestHash,
        },
        targetModelIds: structuredClone(batch.remediationOf.targetModelIds),
        targetSlotIds: structuredClone(batch.remediationOf.targetSlotIds),
        targetSlotSetHash: batch.remediationOf.targetSlotSetHash,
      } : undefined
      const report = {
        schemaVersion: 2 as const,
        ...SCIENTIFIC_BENCHMARK_IDENTITY,
        batchId: batch.batchId,
        batchManifestHash: batch.manifestHash,
        stateHash: batch.stateHash,
        ...codeLineage,
        daemon: { enabled: false as const, status: 'configured-disabled' as const },
        concurrency: 1 as const,
        lockName: batch.manifest.lockName,
        providerBudgetsCny: structuredClone(batch.manifest.providerBudgetsCny),
        codexToolCallLimit: batch.manifest.codexLimits.maxToolCalls,
        modelCount: batch.manifest.models.length,
        slotCount: batch.manifest.executionOrder.length,
        revision: Number(batch.revision || 0),
        ...(correction ? { correction } : {}),
        issuedAt: now().toISOString(),
      }
      const reportHash = canonicalHash(report)
      const attestationKey = createHmac('sha256', secret).update(OPERATOR_ATTESTATION_DOMAIN).digest()
      return deepFreeze({ ...report, manifestSnapshot, stateSnapshot, reportHash, attestationHash: createHmac('sha256', attestationKey).update(reportHash).digest('hex') })
    },
    async operatorDiagnostic(input: { batchId?: string; manifestHash?: string }) {
      assertExactKeys(input, ['batchId', 'manifestHash'], 'SCIENTIFIC_V2_OPERATOR_DIAGNOSTIC_SCHEMA_INVALID')
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/.test(String(input.batchId || '')) || !hashPattern.test(String(input.manifestHash || ''))) {
        scientificError('SCIENTIFIC_V2_OPERATOR_DIAGNOSTIC_SCHEMA_INVALID')
      }
      const batch = await batches.findOne({ batchId: input.batchId, manifestHash: input.manifestHash })
      if (!batch) scientificError('SCIENTIFIC_V2_BATCH_NOT_FOUND')
      if (batch.manifestHash !== batch.manifest?.manifestHash || batch.stateHash !== batch.state?.stateHash) {
        scientificError('SCIENTIFIC_V2_OPERATOR_DIAGNOSTIC_BINDING_INVALID')
      }
      verifyScientificV2ImportedState(batch.state, batch.manifest)
      const stateSlots = new Map<string, AnyRecord>(batch.state.slots.map((slot: AnyRecord): [string, AnyRecord] => [slot.slotId, slot]))
      const providerCanaries = batch.manifest.executionOrder
        .filter((slot: AnyRecord) => slot.isProviderCanary)
        .map((frozenSlot: AnyRecord) => {
          const slot = stateSlots.get(frozenSlot.slotId)
          if (!slot) scientificError('SCIENTIFIC_V2_OPERATOR_DIAGNOSTIC_STATE_INVALID')
          return {
            provider: frozenSlot.provider,
            canonicalModelId: frozenSlot.canonicalModelId,
            caseId: frozenSlot.caseId,
            slotId: frozenSlot.slotId,
            status: slot.status,
            attemptCount: slot.attempts.length,
            responseClasses: slot.attempts.map((attempt: AnyRecord) => attempt.responseClass),
            estimatedCny: diagnosticCnyTotal(slot.attempts, 'estimatedCny'),
            actualCny: diagnosticCnyTotal(slot.attempts, 'actualCny'),
          }
        })
      const diagnostic = {
        batchId: batch.batchId,
        manifestHash: batch.manifestHash,
        stateHash: batch.stateHash,
        status: batch.state.status,
        pauseReason: batch.state.pauseReason,
        blockReason: batch.state.blockReason,
        providerSpentCny: Object.fromEntries(providers.map((provider) => [provider, batch.state.providerSpentCny[provider]])),
        providerUnreconciledCny: Object.fromEntries(providers.map((provider) => [provider, batch.state.providerUnreconciledCny[provider]])),
        revision: Number(batch.revision || 0),
        providerCanaries,
      }
      const diagnosticHash = canonicalHash(diagnostic)
      const diagnosticKey = createHmac('sha256', operatorSecret()).update(OPERATOR_DIAGNOSTIC_DOMAIN).digest()
      return deepFreeze({ ...diagnostic, diagnosticHash, attestationHash: createHmac('sha256', diagnosticKey).update(diagnosticHash).digest('hex') })
    },
    async importStateReport(input: AnyRecord) {
      input = normalizeScientificV2SignedStateOperationReport(input, operatorSecret())
      if (input.report.schemaVersion !== 2 || !['worker', 'codex'].includes(input.report.kind)
        || input.report.stateHash !== input.report.state?.stateHash) scientificError('SCIENTIFIC_V2_OPERATOR_REPORT_SCHEMA_INVALID')
      const batch = await batches.findOne({ batchId: input.report.batchId, manifestHash: input.report.batchManifestHash })
      if (!batch) scientificError('SCIENTIFIC_V2_BATCH_NOT_FOUND')
      const codeLineage = await ensureBatchCodeLineage(batch)
      if (input.report.manifestCodeSha !== codeLineage.manifestCodeSha
        || input.report.executionCodeSha !== codeLineage.executionCodeSha
        || input.report.legacyRecoveryStateHash !== codeLineage.legacyRecoveryStateHash) {
        scientificError('SCIENTIFIC_V2_CODE_LINEAGE_INVALID')
      }
      const existing = await reviews.findOne({ _id: `scientific-v2-state-report:${input.reportHash}` })
      if (existing) return { stateHash: input.report.stateHash, reviewReady: existing.reviewReady === true, replayed: true }
      if (batch.status === 'published') scientificError('SCIENTIFIC_V2_LATE_IMPORT_REJECTED')
      const attachesPersistedWorkerState = input.report.kind === 'worker' && input.report.stateHash === batch.stateHash
      if (!Number.isInteger(input.report.revision) || input.report.revision !== Number(batch.revision || 0) + 1
        || input.report.previousStateHash === input.report.stateHash
        || (attachesPersistedWorkerState
          ? input.report.previousStateHash !== batch.stateTransitionFromHash
            || !['canary_complete', 'awaiting_artifacts', 'completed'].includes(batch.state?.status)
          : input.report.previousStateHash !== batch.stateHash)) scientificError('SCIENTIFIC_V2_IMPORT_REVISION_CONFLICT')
      verifyScientificV2ImportedState(input.report.state, batch.manifest)
      assertIsoInstant(input.report.createdAt, 'SCIENTIFIC_V2_OPERATOR_REPORT_SCHEMA_INVALID')
      assertExactKeys(input.report.providerCanaryAttestation, ['providers', 'passed', 'attemptSetHash'], 'SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      assertExactKeys(input.report.executionOrderAttestation, ['slotIds', 'passed'], 'SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      const providerCanaries = providerCanaryFacts(input.report.state, batch.manifest)
      if (input.report.providerCanaryAttestation.passed !== providerCanaries.passed
        || canonicalHash(input.report.providerCanaryAttestation.providers) !== canonicalHash(providerCanaries.providers)
        || input.report.providerCanaryAttestation.attemptSetHash !== providerCanaries.attemptSetHash
        || input.report.executionOrderAttestation.passed !== true
        || canonicalHash(input.report.executionOrderAttestation.slotIds) !== canonicalHash(input.report.state.slots.map((slot: AnyRecord) => slot.slotId))) {
        scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      }
      if (input.report.kind === 'worker' && !['canary_complete', 'awaiting_artifacts', 'completed'].includes(input.report.state.status)) {
        scientificError('SCIENTIFIC_V2_IMPORT_WORKER_STATE_INVALID')
      }
      if (input.report.kind === 'codex' && input.report.state.status !== 'completed') {
        scientificError('SCIENTIFIC_V2_IMPORT_CODEX_STATE_INVALID')
      }
      if (input.report.kind === 'worker') {
        if (input.report.codexProvenance !== null || input.report.disclosure !== null) scientificError('SCIENTIFIC_V2_IMPORT_WORKER_STATE_INVALID')
      } else {
        assertExactKeys(input.report.codexProvenance, ['modelId', 'successfulSlots', 'toolCalls', 'firstCaseId', 'artifactCanaryHash'], 'SCIENTIFIC_V2_CODEX_PROVENANCE_INVALID')
        assertExactKeys(input.report.disclosure, ['containsSecrets', 'automaticJudges', 'reviewerIdentity'], 'SCIENTIFIC_V2_CODEX_DISCLOSURE_INVALID')
        const codexSlots = input.report.state.slots.filter((slot: AnyRecord) => slot.provider === 'codex')
        const successfulSlots = codexSlots.filter((slot: AnyRecord) => slot.status === 'succeeded').length
        const toolCalls = codexSlots.reduce((sum: number, slot: AnyRecord) => sum + slot.attempts.length, 0)
        if (codexSlots.length !== 9 || codexSlots[0]?.status !== 'succeeded'
          || codexSlots.some((slot: AnyRecord) => !['succeeded', 'failed'].includes(slot.status))
          || input.report.codexProvenance.modelId !== 'codex:gpt-image-2'
          || input.report.codexProvenance.successfulSlots !== successfulSlots
          || input.report.codexProvenance.toolCalls !== toolCalls || toolCalls > 36
          || input.report.codexProvenance.firstCaseId !== codexSlots[0].caseId
          || input.report.codexProvenance.artifactCanaryHash !== codexSlots[0].attempts.at(-1)?.rawImageHash
          || input.report.disclosure.containsSecrets !== false || canonicalHash(input.report.disclosure.automaticJudges) !== canonicalHash([])
          || input.report.disclosure.reviewerIdentity !== null) scientificError('SCIENTIFIC_V2_CODEX_PROVENANCE_INVALID')
      }
      const reviewReady = input.report.state.status === 'completed'
        && input.report.state.slots.every((slot: AnyRecord) => ['succeeded', 'unsupported', 'failed'].includes(slot.status))
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          await reviews.insertOne({
            _id: `scientific-v2-state-report:${input.reportHash}`,
            artifactType: 'state_report',
            batchManifestHash: input.report.batchManifestHash,
            sourceSetHash: input.report.stateHash,
            role: `${input.report.kind}_state`,
            report: structuredClone(input.report),
            reportHash: input.reportHash,
            attestationHash: input.attestationHash,
            reviewReady,
            createdAt: now(),
          }, { session } as any)
          const stateUpdate = attachesPersistedWorkerState ? {} : {
            state: structuredClone(input.report.state),
            stateHash: input.report.stateHash,
            stateTransitionFromHash: batch.stateHash,
          }
          const updated = await batches.updateOne(
            {
              _id: batch._id, stateHash: batch.stateHash, status: batch.status, revision: batch.revision,
              latestStateReportHash: batch.latestStateReportHash,
              ...(attachesPersistedWorkerState ? { stateTransitionFromHash: batch.stateTransitionFromHash } : {}),
            },
            { $set: {
              ...stateUpdate,
              status: reviewReady ? 'review_ready' : input.report.state.status,
              latestStateReportHash: input.reportHash,
              revision: input.report.revision,
              providerCanaryAttestation: structuredClone(input.report.providerCanaryAttestation),
              executionOrderAttestation: structuredClone(input.report.executionOrderAttestation),
              codexProvenance: structuredClone(input.report.codexProvenance),
              disclosure: structuredClone(input.report.disclosure),
              updatedAt: now(),
            } },
            { session },
          )
          if (updated.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_IMPORT_STATE_CONFLICT')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return { stateHash: input.report.stateHash, reviewReady, replayed: false }
    },
    async exportReviewAssignment(input: { batchId: string; assignment: AnyRecord; objectBindings: AnyRecord[] }) {
      const batch = await batches.findOne({
        batchId: input.batchId,
        status: { $in: ['review_ready', 'review_dispute', 'review_finalized', 'published'] },
      })
      if (!batch) scientificError('SCIENTIFIC_V2_REVIEW_BATCH_NOT_READY')
      assertReviewAssignment(input.assignment, batch, operatorSecret())
      if (batch.correctionBaseline) {
        const expectedTargetModels = exactSortedStrings(
          batch.remediationOf?.targetModelIds,
          'SCIENTIFIC_V2_CORRECTION_REVIEW_SCOPE_INVALID',
          64,
        )
        const assignedModels = input.assignment.privateEnvelope.sources
          .map((source: AnyRecord) => source.modelKey)
          .sort((left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
        const mappedModels = [...new Set<string>(input.assignment.privateMappings.map((mapping: AnyRecord) => String(mapping.modelKey)))]
          .sort((left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
        if (canonicalHash(assignedModels) !== canonicalHash(expectedTargetModels)
          || mappedModels.some((modelId) => !expectedTargetModels.includes(modelId))) {
          scientificError('SCIENTIFIC_V2_CORRECTION_REVIEW_SCOPE_INVALID')
        }
      }
      const peerRole = input.assignment.role === 'A' ? 'B' : 'A'
      const peer = await reviews.findOne({
        artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash,
        sourceSetHash: input.assignment.privateEnvelope.sourceSetHash, role: peerRole,
      })
      if (peer) {
        if (canonicalHash(peer.assignment.assignmentSet) !== canonicalHash(input.assignment.assignmentSet)
          || peer.assignment.assignmentAttestationHash !== input.assignment.assignmentAttestationHash) {
          scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_CONFLICT')
        }
        const ownItems = input.assignment.packages.flatMap((packet: AnyRecord) => packet.items.map((item: AnyRecord) => item.itemHash))
        const peerItems = peer.assignment.packages.flatMap((packet: AnyRecord) => packet.items.map((item: AnyRecord) => item.itemHash))
        if (canonicalHash([...ownItems].sort()) !== canonicalHash([...peerItems].sort())
          || (ownItems.length > 1 && canonicalHash(ownItems) === canonicalHash(peerItems))) {
          scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_CONFLICT')
        }
      }
      const expectedImages = new Set(input.assignment.packages.flatMap((packet: AnyRecord) => packet.items.map((item: AnyRecord) => item.imageHash)))
      if (!Array.isArray(input.objectBindings) || input.objectBindings.length !== expectedImages.size) scientificError('SCIENTIFIC_V2_REVIEW_OBJECT_BINDING_INVALID')
      const objectBindings = input.objectBindings.map((binding) => {
        assertExactKeys(binding, ['imageHash', 'objectKey'], 'SCIENTIFIC_V2_REVIEW_OBJECT_BINDING_INVALID')
        const slot = batch.state.slots.find((candidate: AnyRecord) => candidate.status === 'succeeded'
          && candidate.attempts.at(-1)?.rawImageHash === binding.imageHash)
        const attempt = slot?.attempts.at(-1)
        if (!expectedImages.has(binding.imageHash) || !attempt
          || binding.objectKey !== `bench/scientific-v2/private/objects/${binding.imageHash}.${attempt.format}`) {
          scientificError('SCIENTIFIC_V2_REVIEW_OBJECT_BINDING_INVALID')
        }
        return { imageHash: binding.imageHash, objectKey: binding.objectKey }
      })
      if (new Set(objectBindings.map((binding) => binding.imageHash)).size !== objectBindings.length) scientificError('SCIENTIFIC_V2_REVIEW_OBJECT_BINDING_INVALID')
      const requiresEditSource = input.assignment.packages.some((packet: AnyRecord) => packet.items.some((item: AnyRecord) => item.kind === 'edit'))
      const verifiedBindings = requiresEditSource && !objectBindings.some((binding) => binding.imageHash === SCIENTIFIC_EDIT_SOURCE.sourceHash)
        ? [...objectBindings, {
            imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash,
            objectKey: `bench/scientific-v2/private/objects/${SCIENTIFIC_EDIT_SOURCE.sourceHash}.png`,
          }]
        : objectBindings
      await verifyReviewObjects(verifiedBindings, verifyReviewObject)
      const sourceSetHash = input.assignment.privateEnvelope.sourceSetHash
      const existing = await reviews.findOne({
        artifactType: 'review_assignment_private',
        batchManifestHash: batch.manifestHash,
        sourceSetHash,
        role: input.assignment.role,
      })
      if (existing) {
        if (canonicalHash(existing.assignment) !== canonicalHash(input.assignment)) scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_CONFLICT')
      } else {
        if (batch.status !== 'review_ready') scientificError('SCIENTIFIC_V2_REVIEW_BATCH_NOT_READY')
        const session = db.client.startSession()
        try {
          await session.withTransaction(async () => {
            await reviews.insertOne({
              _id: `scientific-v2-review-assignment:${batch.manifestHash}:${sourceSetHash}:${input.assignment.role}`,
              artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash, sourceSetHash,
              role: input.assignment.role, assignment: structuredClone(input.assignment),
              objectBindings: structuredClone(verifiedBindings), createdAt: now(),
            }, { session } as any)
            const updated = await batches.updateOne(
              { _id: batch._id, status: 'review_ready', stateHash: batch.stateHash, revision: batch.revision, latestStateReportHash: batch.latestStateReportHash },
              { $set: { revision: batch.revision + 1, updatedAt: now() } }, { session },
            )
            if (updated.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_CONFLICT')
          })
        } finally {
          await session.endSession()
        }
      }
      return deepFreeze({
        role: input.assignment.role,
        packages: structuredClone(input.assignment.packages),
        mappingHash: input.assignment.mappingHash,
        assignmentSet: structuredClone(input.assignment.assignmentSet),
        assignmentAttestationHash: input.assignment.assignmentAttestationHash,
        _objectBindings: structuredClone(verifiedBindings),
      })
    },
    async importReviewResult(input: { batchId: string; result: AnyRecord }) {
      const batch = await batches.findOne({ batchId: input.batchId })
      if (!batch) scientificError('SCIENTIFIC_V2_REVIEW_BATCH_NOT_READY')
      const role = input.result?.role
      if (!['A', 'B'].includes(role)) scientificError('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
      const assignmentRow = await reviews.findOne({
        artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash,
        sourceSetHash: input.result.sourceSetHash, role,
      })
      if (!assignmentRow) scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_NOT_FOUND')
      assertReviewerResult(input.result, assignmentRow.assignment, operatorSecret())
      if (assignmentRow.result) {
        if (assignmentRow.result.resultHash !== input.result.resultHash) scientificError('SCIENTIFIC_V2_REVIEW_RESULT_CONFLICT')
        if (batch.status === 'published') return { status: 'published', role, replayed: true }
        const existingFinal = await reviews.findOne({ _id: `scientific-v2-review-final:${batch.manifestHash}:${input.result.sourceSetHash}` })
        if (existingFinal) {
          if (batch.reviewFinalHash !== existingFinal.finalHash || !['review_finalized', 'review_dispute', 'review_ready'].includes(batch.status)) {
            scientificError('SCIENTIFIC_V2_REVIEW_FINAL_CONFLICT')
          }
          return deepFreeze({ status: existingFinal.status, disputes: structuredClone(existingFinal.disputes), results: structuredClone(existingFinal.results), automaticJudgeCalls: 0, finalHash: existingFinal.finalHash, replayed: true })
        }
        const peer = await reviews.findOne({
          artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash,
          sourceSetHash: input.result.sourceSetHash, role: role === 'A' ? 'B' : 'A',
        })
        if (!peer?.result) return { status: 'awaiting_peer', role, replayed: true }
      }
      if (!['review_ready', 'review_dispute'].includes(batch.status)) scientificError('SCIENTIFIC_V2_LATE_IMPORT_REJECTED')
      const otherRole = role === 'A' ? 'B' : 'A'
      let outcome: AnyRecord = { status: 'awaiting_peer', role }
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const currentBatch = await batches.findOne({
            _id: batch._id, status: batch.status, stateHash: batch.stateHash, revision: batch.revision,
            latestStateReportHash: batch.latestStateReportHash,
          }, { session } as any)
          if (!currentBatch) scientificError('SCIENTIFIC_V2_REVIEW_RESULT_CONFLICT')
          const currentAssignment = await reviews.findOne({ _id: assignmentRow._id }, { session } as any)
          if (!currentAssignment) scientificError('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_NOT_FOUND')
          if (currentAssignment.result && currentAssignment.result.resultHash !== input.result.resultHash) scientificError('SCIENTIFIC_V2_REVIEW_RESULT_CONFLICT')
          if (!currentAssignment.result) {
            const updated = await reviews.updateOne(
              { _id: assignmentRow._id, result: { $exists: false } },
              { $set: { result: structuredClone(input.result), resultImportedAt: now() } }, { session },
            )
            if (updated.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_REVIEW_RESULT_CONFLICT')
          }
          const other = await reviews.findOne({
            artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash,
            sourceSetHash: input.result.sourceSetHash, role: otherRole,
          }, { session } as any)
          let batchSet: AnyRecord = { revision: batch.revision + 1, updatedAt: now() }
          if (other?.result) {
            const reviewerA = role === 'A' ? input.result : other.result
            const reviewerB = role === 'B' ? input.result : other.result
            const combined = combineReviews(reviewerA, reviewerB)
            const finalBase = {
              batchManifestHash: batch.manifestHash, sourceSetHash: input.result.sourceSetHash,
              automaticJudges: [] as unknown[], automaticJudgeCalls: 0 as const,
              reviewerAHash: reviewerA.resultHash, reviewerBHash: reviewerB.resultHash,
              disputes: combined.disputes, results: combined.results,
              status: combined.disputes.length ? 'dispute' : 'finalized',
            }
            const finalHash = canonicalHash(finalBase)
            const finalDocument = {
              _id: `scientific-v2-review-final:${batch.manifestHash}:${input.result.sourceSetHash}`,
              artifactType: 'review_final', role: 'FINAL', ...finalBase, finalHash,
              attestationHash: hmacCanonical(operatorSecret(), { ...finalBase, finalHash }), createdAt: now(),
            }
            try { await reviews.insertOne(finalDocument, { session } as any) } catch (error) {
              if ((error as { code?: number })?.code !== 11000) throw error
              const existingFinal = await reviews.findOne({ _id: finalDocument._id }, { session } as any)
              if (!existingFinal || existingFinal.finalHash !== finalHash) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_CONFLICT')
            }
            batchSet = {
              status: combined.disputes.length ? 'review_dispute' : 'review_finalized',
              reviewFinalHash: finalHash, revision: batch.revision + 1, updatedAt: now(),
            }
            outcome = { status: finalBase.status, disputes: combined.disputes, results: combined.results, automaticJudgeCalls: 0, finalHash }
          }
          const batchUpdated = await batches.updateOne(
            { _id: batch._id, status: batch.status, stateHash: batch.stateHash, revision: batch.revision, latestStateReportHash: batch.latestStateReportHash },
            { $set: batchSet }, { session },
          )
          if (batchUpdated.modifiedCount !== 1) scientificError(other?.result ? 'SCIENTIFIC_V2_REVIEW_FINAL_CONFLICT' : 'SCIENTIFIC_V2_REVIEW_RESULT_CONFLICT')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return deepFreeze(outcome)
    },
    async importArbitration(input: { batchId: string; arbitration: AnyRecord; arbitrationHash: string; attestationHash: string }) {
      const batch = await batches.findOne({ batchId: input.batchId })
      if (!batch) scientificError('SCIENTIFIC_V2_ARBITRATION_NOT_REQUIRED')
      const arbitrationId = `scientific-v2-review-arbitration:${batch.manifestHash}:${input.arbitration?.sourceSetHash}`
      const existingArbitration = await reviews.findOne({ _id: arbitrationId })
      if (existingArbitration) {
        const finalized = await reviews.findOne({ _id: `scientific-v2-review-final:${batch.manifestHash}:${input.arbitration?.sourceSetHash}` })
        if (existingArbitration.arbitrationHash !== input.arbitrationHash
          || canonicalHash(input.arbitration) !== input.arbitrationHash
          || existingArbitration.attestationHash !== input.attestationHash
          || !safeHmacEqual(input.attestationHash, createHmac('sha256', operatorSecret()).update(input.arbitrationHash).digest('hex'))
          || !finalized || finalized.status !== 'finalized' || finalized.arbitrationHash !== input.arbitrationHash
          || batch.reviewFinalHash !== finalized.finalHash || !['review_ready', 'review_finalized', 'published'].includes(batch.status)) {
          scientificError('SCIENTIFIC_V2_ARBITRATION_ATTESTATION_INVALID')
        }
        return deepFreeze({ status: 'finalized', results: structuredClone(finalized.results), automaticJudgeCalls: 0, finalHash: finalized.finalHash, replayed: true })
      }
      if (batch.status !== 'review_dispute') scientificError('SCIENTIFIC_V2_ARBITRATION_NOT_REQUIRED')
      const finalRow = await reviews.findOne({ _id: `scientific-v2-review-final:${batch.manifestHash}:${input.arbitration?.sourceSetHash}` })
      if (!finalRow || finalRow.status !== 'dispute') scientificError('SCIENTIFIC_V2_ARBITRATION_NOT_REQUIRED')
      if (canonicalHash(input.arbitration) !== input.arbitrationHash
        || !safeHmacEqual(input.attestationHash, createHmac('sha256', operatorSecret()).update(input.arbitrationHash).digest('hex'))
        || input.arbitration.reasoningEffort !== 'xhigh'
        || input.arbitration.batchManifestHash !== batch.manifestHash
        || input.arbitration.sourceSetHash !== finalRow.sourceSetHash
        || !Array.isArray(input.arbitration.results)
        || input.arbitration.results.length !== finalRow.disputes.length) scientificError('SCIENTIFIC_V2_ARBITRATION_ATTESTATION_INVALID')
      const pending = new Map(finalRow.disputes.map((item: AnyRecord) => [item.itemHash, item]))
      const arbitrated = new Map<string, AnyRecord>()
      const seenRationales = new Set<string>()
      for (const result of input.arbitration.results) {
        const dispute = pending.get(result.itemHash) as AnyRecord | undefined
        if (!dispute || arbitrated.has(result.itemHash)) scientificError('SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
        assertExactKeys(result, ['itemHash', 'scores', 'redLines', 'rationale'], 'SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
        assertExactKeys(result.scores, dispute.applicableAxes, 'SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
        if (dispute.applicableAxes.some((axis: string) => !Number.isFinite(result.scores[axis]) || result.scores[axis] < 0 || result.scores[axis] > 10)
          || !Array.isArray(result.redLines)) scientificError('SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
        assertReviewRedLines(result.redLines)
        const rationale = normalizeReviewRationale(result.rationale)
        const rationaleKey = reviewRationaleUniquenessKey(rationale)
        if (seenRationales.has(rationaleKey)) scientificError('SCIENTIFIC_V2_REVIEW_RATIONALE_INVALID')
        seenRationales.add(rationaleKey)
        arbitrated.set(result.itemHash, result)
      }
      const results = finalRow.results.map((item: AnyRecord) => {
        const arbitration = arbitrated.get(item.itemHash)
        return arbitration ? {
          ...item,
          scores: structuredClone(arbitration.scores),
          redLines: [...arbitration.redLines].sort(),
          rationales: [normalizeReviewRationale(arbitration.rationale)],
          resolution: 'xhigh_arbitration',
        } : item
      })
      const finalBase = {
        batchManifestHash: batch.manifestHash,
        sourceSetHash: finalRow.sourceSetHash,
        automaticJudges: [] as unknown[], automaticJudgeCalls: 0 as const,
        reviewerAHash: finalRow.reviewerAHash, reviewerBHash: finalRow.reviewerBHash,
        disputes: finalRow.disputes, results, status: 'finalized', arbitrationHash: input.arbitrationHash,
      }
      const finalHash = canonicalHash(finalBase)
      const arbitrationRow = {
        _id: arbitrationId,
        artifactType: 'review_arbitration', role: 'ARBITRATION', batchManifestHash: batch.manifestHash,
        sourceSetHash: finalRow.sourceSetHash, arbitration: structuredClone(input.arbitration),
        arbitrationHash: input.arbitrationHash, attestationHash: input.attestationHash, createdAt: now(),
      }
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          await reviews.insertOne(arbitrationRow, { session } as any)
          const updatedReview = await reviews.updateOne(
            { _id: finalRow._id, finalHash: finalRow.finalHash, status: 'dispute' },
            { $set: { ...finalBase, finalHash, attestationHash: hmacCanonical(operatorSecret(), { ...finalBase, finalHash }), finalizedAt: now() } },
            { session },
          )
          if (updatedReview.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_CONFLICT')
          const updatedBatch = await batches.updateOne(
            { _id: batch._id, status: 'review_dispute', reviewFinalHash: finalRow.finalHash, revision: batch.revision, latestStateReportHash: batch.latestStateReportHash },
            { $set: { status: 'review_ready', reviewFinalHash: finalHash, revision: batch.revision + 1, updatedAt: now() } },
            { session },
          )
          if (updatedBatch.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_CONFLICT')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return deepFreeze({ status: 'finalized', results, automaticJudgeCalls: 0, finalHash })
    },
    async publishScientificV2(input: { batchId: string; objectBindings: AnyRecord[]; evidence: AnyRecord[] }) {
      const alreadyPublished = await batches.findOne({ batchId: input.batchId, status: 'published' })
      if (alreadyPublished?.releaseId) {
        const existing = await releases.findOne({ _id: alreadyPublished.releaseId })
        if (!existing) scientificError('SCIENTIFIC_V2_PUBLISH_STATE_CONFLICT')
        operatorSecret()
        const codeLineage = await publicationBatchCodeLineage(alreadyPublished)
        const { _id: _releaseId, releaseHash: storedReleaseHash, ...releaseBase } = existing
        if (storedReleaseHash !== alreadyPublished.releaseHash || canonicalHash(releaseBase) !== storedReleaseHash
          || existing.manifestCodeSha !== codeLineage.manifestCodeSha
          || existing.executionCodeSha !== codeLineage.executionCodeSha
          || existing.publicationCodeSha !== codeLineage.publicationCodeSha
          || existing.legacyRecovery !== (codeLineage.legacyRecoveryStateHash !== null)) {
          scientificError('SCIENTIFIC_V2_PUBLISH_STATE_CONFLICT')
        }
        return { releaseId: existing._id, releaseHash: existing.releaseHash, profileStatus: 'published', replayed: true }
      }
      const batch = await batches.findOne({ batchId: input.batchId, status: { $in: ['review_finalized', 'review_ready'] }, reviewFinalHash: { $exists: true } })
      if (!batch) scientificError('SCIENTIFIC_V2_BATCH_NOT_PUBLISHABLE')
      assertExactCorrectionPlanBatch(batch)
      const secret = operatorSecret()
      const codeLineage = await publicationBatchCodeLineage(batch)
      verifyScientificV2ImportedState(batch.state, batch.manifest)
      if (batch.state.status !== 'completed' || batch.state.slots.some((slot: AnyRecord) => !['succeeded', 'failed', 'unsupported'].includes(slot.status))) {
        scientificError('SCIENTIFIC_V2_BATCH_NOT_TERMINAL')
      }
      let correctionBaselineRelease: AnyRecord | null = null
      let correctionTargetModelIds: Set<string> | null = null
      const correctionBaselinePublicRows = new Map<string, AnyRecord>()
      if (batch.correctionBaseline !== undefined) {
        assertExactKeys(batch.correctionBaseline, ['releaseId', 'releaseHash', 'batchId', 'manifestHash'], 'SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
        if (!batch.remediationOf || !hashPattern.test(String(batch.correctionBaseline.releaseHash || ''))
          || typeof batch.correctionBaseline.releaseId !== 'string' || !batch.correctionBaseline.releaseId
          || typeof batch.correctionBaseline.batchId !== 'string' || !batch.correctionBaseline.batchId
          || !hashPattern.test(String(batch.correctionBaseline.manifestHash || ''))) {
          scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
        }
        correctionTargetModelIds = new Set(exactSortedStrings(
          batch.remediationOf.targetModelIds,
          'SCIENTIFIC_V2_CORRECTION_TARGET_SET_INVALID',
          64,
        ))
        if (batch.correctionBaseline.releaseHash !== correctionPlan.baselineReleaseHash
          || batch.remediationOf.releaseHash !== correctionPlan.activePredecessorReleaseHash
          || canonicalHash([...correctionTargetModelIds]) !== canonicalHash(correctionPlan.targetModelIds)) {
          scientificError('SCIENTIFIC_V2_CORRECTION_PLAN_INVALID')
        }
        const correctionTargetSlots = batch.state.slots.filter((slot: AnyRecord) => correctionTargetModelIds!.has(slot.canonicalModelId))
        if (correctionTargetSlots.length !== correctionTargetModelIds.size * 9
          || correctionTargetSlots.some((slot: AnyRecord) => slot.status !== 'succeeded'
            || !hashPattern.test(String(slot.attempts.at(-1)?.rawImageHash || ''))
            || !['succeeded', 'succeeded_low_quality'].includes(String(slot.attempts.at(-1)?.responseClass)))) {
          scientificError('SCIENTIFIC_V2_CORRECTION_TARGET_INCOMPLETE')
        }
        const correctionTargetSlotIds = batch.zeroCallCorrection === true
          && Array.isArray(batch.remediationOf.targetSlotIds) && batch.remediationOf.targetSlotIds.length === 0
          ? []
          : exactSortedStrings(
              batch.remediationOf.targetSlotIds,
              'SCIENTIFIC_V2_CORRECTION_TARGET_INCOMPLETE',
            )
        if (batch.remediationOf.targetSlotSetHash !== canonicalHash(correctionTargetSlotIds)
          || correctionTargetSlotIds.some((slotId) => {
            const slot = batch.state.slots.find((candidate: AnyRecord) => candidate.slotId === slotId)
            return !slot || !correctionTargetModelIds!.has(slot.canonicalModelId)
              || slot.status !== 'succeeded' || !hashPattern.test(String(slot.attempts.at(-1)?.rawImageHash || ''))
          })) {
          scientificError('SCIENTIFIC_V2_CORRECTION_TARGET_INCOMPLETE')
        }
        correctionBaselineRelease = await releases.findOne({
          _id: batch.correctionBaseline.releaseId,
          releaseHash: batch.correctionBaseline.releaseHash,
          batchId: batch.correctionBaseline.batchId,
          batchManifestHash: batch.correctionBaseline.manifestHash,
          profileStatus: 'published',
          ...SCIENTIFIC_BENCHMARK_IDENTITY,
        })
        if (!correctionBaselineRelease) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
        const { _id: _baselineId, releaseHash: baselineHash, ...baselineBase } = correctionBaselineRelease
        const baselineModels = Array.isArray(correctionBaselineRelease.models) ? correctionBaselineRelease.models : []
        const manifestModelIds = batch.manifest.models.map((model: AnyRecord) => model.canonicalModelId).sort((left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
        const baselineModelIds = baselineModels.map((model: AnyRecord) => model.canonicalModelId).sort((left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
        if (canonicalHash(baselineBase) !== baselineHash
          || canonicalHash(manifestModelIds) !== canonicalHash(baselineModelIds)
          || [...correctionTargetModelIds].some((modelId) => !manifestModelIds.includes(modelId))) {
          scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
        }
        const baselineByModel = new Map(baselineModels.map((model: AnyRecord) => [model.canonicalModelId, model]))
        for (const slot of batch.state.slots) if (!correctionTargetModelIds.has(slot.canonicalModelId)) {
          const baselineModel = baselineByModel.get(slot.canonicalModelId) as AnyRecord | undefined
          const baselineEvidence = baselineModel?.evidence?.find((item: AnyRecord) => item.caseId === slot.caseId)
          const finalAttempt = slot.attempts.at(-1)
          if (!baselineEvidence || baselineEvidence.status !== slot.status
            || (slot.status === 'succeeded' && baselineEvidence.imageHash !== finalAttempt?.rawImageHash)) {
            scientificError('SCIENTIFIC_V2_CORRECTION_NON_TARGET_DRIFT')
          }
        }
        const baselineRows = await publicEvidence.find({ sourceReleaseHash: batch.correctionBaseline.releaseHash }).toArray()
        const expectedBaselineSlots = new Set<string>()
        for (const baselineModel of baselineModels) {
          if (!Array.isArray(baselineModel.evidence) || baselineModel.evidence.length !== 9) {
            scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
          }
          for (const evidence of baselineModel.evidence) {
            const key = `${baselineModel.canonicalModelId}\0${evidence.caseId}`
            if (expectedBaselineSlots.has(key)) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
            expectedBaselineSlots.add(key)
          }
        }
        if (baselineRows.length !== expectedBaselineSlots.size) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
        for (const row of baselineRows) {
          const key = `${row.canonicalModelId}\0${row.caseId}`
          const baselineModel = baselineByModel.get(row.canonicalModelId) as AnyRecord | undefined
          const baselineEvidence = baselineModel?.evidence?.find((item: AnyRecord) => item.caseId === row.caseId)
          if (!baselineEvidence || !expectedBaselineSlots.has(key) || correctionBaselinePublicRows.has(key)
            || row.sourceReleaseHash !== batch.correctionBaseline.releaseHash
            || row.profileId !== baselineModel?.profileId || row.overallRank !== baselineModel?.overallRank) {
            scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
          }
          assertExactKeys(row, [
            '_id', 'sourceReleaseHash', 'profileId', 'canonicalModelId', 'overallRank',
            ...Object.keys(baselineEvidence), 'createdAt',
          ], 'SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
          const publicPayload: AnyRecord = structuredClone(row)
          delete publicPayload._id
          delete publicPayload.sourceReleaseHash
          delete publicPayload.profileId
          delete publicPayload.canonicalModelId
          delete publicPayload.overallRank
          delete publicPayload.createdAt
          if (Array.isArray(publicPayload.variants)) {
            publicPayload.variants = publicPayload.variants.map((variant: AnyRecord) => publicVariant(variant, baselineEvidence.imageHash))
          }
          if (Array.isArray(publicPayload.beforeVariants)) {
            if (!hashPattern.test(String(baselineEvidence.sourceHash || ''))) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
            publicPayload.beforeVariants = publicPayload.beforeVariants.map((variant: AnyRecord) => publicVariant(variant, baselineEvidence.sourceHash))
          }
          if (canonicalHash(publicPayload) !== canonicalHash(baselineEvidence)) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
          for (const variant of row.variants || []) await verifyObject(variant.objectKey, variant.imageHash)
          for (const variant of row.beforeVariants || []) await verifyObject(variant.objectKey, variant.imageHash)
          correctionBaselinePublicRows.set(key, structuredClone(row))
        }
      }
      const stateReportRow = await reviews.findOne({ _id: `scientific-v2-state-report:${batch.latestStateReportHash}` })
      if (!stateReportRow || stateReportRow.reportHash !== batch.latestStateReportHash
        || normalizeScientificV2StateOperationReport(stateReportRow.report).reportHash !== stateReportRow.reportHash
        || !safeHmacEqual(stateReportRow.attestationHash, createHmac('sha256', secret).update(stateReportRow.reportHash).digest('hex'))
        || stateReportRow.report.stateHash !== batch.stateHash
        || stateReportRow.report.manifestCodeSha !== codeLineage.manifestCodeSha
        || stateReportRow.report.executionCodeSha !== codeLineage.executionCodeSha
        || stateReportRow.report.legacyRecoveryStateHash !== codeLineage.legacyRecoveryStateHash
        || canonicalHash(stateReportRow.report.state) !== canonicalHash(batch.state)) {
        scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      }
      const providerCanary = stateReportRow.report.providerCanaryAttestation
      const orderAttestation = stateReportRow.report.executionOrderAttestation
      assertExactKeys(providerCanary, ['providers', 'passed', 'attemptSetHash'], 'SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      const expectedCanaries = providerCanaryFacts(batch.state, batch.manifest)
      if (providerCanary.passed !== expectedCanaries.passed || canonicalHash(providerCanary.providers) !== canonicalHash(expectedCanaries.providers)
        || providerCanary.attemptSetHash !== expectedCanaries.attemptSetHash
        || orderAttestation.passed !== true || canonicalHash(orderAttestation.slotIds) !== canonicalHash(batch.state.slots.map((slot: AnyRecord) => slot.slotId))) {
        scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      }
      if (stateReportRow.report.kind === 'codex') verifiedCodexProvenance(stateReportRow.report, batch.state)
      else if (stateReportRow.report.kind === 'worker') await inheritedRemediationCodexProvenance(batch)
      else scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')

      const markers = await dispatches.find({ manifestHash: batch.manifestHash }).toArray()
      const unknownReconciliations = await reviews.find({
        artifactType: 'unknown_reconciliation', batchManifestHash: batch.manifestHash,
      }).toArray()
      const usedUnknownReconciliations = new Set<string>()
      const expectedMarkerKeys = new Set<string>()
      for (const slot of batch.state.slots) {
        if (slot.provider === 'codex' || !slot.provider) continue
        for (const attempt of slot.attempts) {
          const key = `${slot.slotId}\0${attempt.attemptIndex}`
          const exact = markers.filter((marker) => marker.slotId === slot.slotId && marker.attemptIndex === attempt.attemptIndex)
          if (exact.length !== 1) scientificError('SCIENTIFIC_V2_DISPATCH_LEDGER_MISMATCH')
          const marker = exact[0]
          const exactCommitted = marker.status === 'committed' && marker.payloadHash === attempt.payloadHash
            && marker.attempt?.attemptHash === attempt.attemptHash
          if (!exactCommitted) {
            const matchingAudits = unknownReconciliations.filter((audit) => audit.slotId === slot.slotId
              && audit.sequence === slot.sequence
              && canonicalHash(audit.originalAttempt) === canonicalHash(marker.attempt)
              && canonicalHash(audit.reconciledAttempt) === canonicalHash(attempt))
            if (matchingAudits.length !== 1) scientificError('SCIENTIFIC_V2_DISPATCH_LEDGER_MISMATCH')
            assertUnknownReconciliationAudit(matchingAudits[0], { batch, marker, slot, attempt })
            usedUnknownReconciliations.add(String(matchingAudits[0]._id))
          }
          expectedMarkerKeys.add(key)
        }
      }
      if (markers.some((marker) => !expectedMarkerKeys.has(`${marker.slotId}\0${marker.attemptIndex}`))
        || unknownReconciliations.length !== usedUnknownReconciliations.size) {
        scientificError('SCIENTIFIC_V2_DISPATCH_LEDGER_MISMATCH')
      }
      const finalReview = await reviews.findOne({
        artifactType: 'review_final', batchManifestHash: batch.manifestHash,
        status: 'finalized', finalHash: batch.reviewFinalHash,
      })
      if (!finalReview || finalReview.automaticJudgeCalls !== 0 || canonicalHash(finalReview.automaticJudges) !== canonicalHash([])
        || !safeHmacEqual(finalReview.attestationHash, hmacCanonical(secret, Object.fromEntries(Object.entries(finalReview)
          .filter(([key]) => ['batchManifestHash', 'sourceSetHash', 'automaticJudges', 'automaticJudgeCalls', 'reviewerAHash', 'reviewerBHash', 'disputes', 'results', 'status', 'arbitrationHash', 'finalHash'].includes(key)))))) {
        scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
      }
      const assignmentA = await reviews.findOne({ artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash, sourceSetHash: finalReview.sourceSetHash, role: 'A' })
      const assignmentB = await reviews.findOne({ artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash, sourceSetHash: finalReview.sourceSetHash, role: 'B' })
      if (!assignmentA?.result || !assignmentB?.result) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
      assertReviewAssignment(assignmentA.assignment, batch, secret)
      assertReviewAssignment(assignmentB.assignment, batch, secret)
      assertReviewerResult(assignmentA.result, assignmentA.assignment, secret)
      assertReviewerResult(assignmentB.result, assignmentB.assignment, secret)
      if (assignmentA.assignment.assignmentAttestationHash !== assignmentB.assignment.assignmentAttestationHash
        || canonicalHash(assignmentA.assignment.assignmentSet) !== canonicalHash(assignmentB.assignment.assignmentSet)
        || assignmentA.result.resultHash !== finalReview.reviewerAHash || assignmentB.result.resultHash !== finalReview.reviewerBHash) {
        scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
      }
      const recomputedReview = combineReviews(assignmentA.result, assignmentB.result)
      let recomputedResults = recomputedReview.results
      if (recomputedReview.disputes.length) {
        const arbitrationRow = await reviews.findOne({
          artifactType: 'review_arbitration', batchManifestHash: batch.manifestHash,
          sourceSetHash: finalReview.sourceSetHash, role: 'ARBITRATION', arbitrationHash: finalReview.arbitrationHash,
        })
        if (!arbitrationRow || canonicalHash(arbitrationRow.arbitration) !== arbitrationRow.arbitrationHash
          || !safeHmacEqual(arbitrationRow.attestationHash, createHmac('sha256', secret).update(arbitrationRow.arbitrationHash).digest('hex'))
          || arbitrationRow.arbitration.reasoningEffort !== 'xhigh') scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
        const byItem = new Map(arbitrationRow.arbitration.results.map((item: AnyRecord) => [item.itemHash, item]))
        if (byItem.size !== recomputedReview.disputes.length) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
        recomputedResults = recomputedReview.results.map((item: AnyRecord) => {
          const arbitration = byItem.get(item.itemHash) as AnyRecord | undefined
          return arbitration ? {
            ...item,
            scores: structuredClone(arbitration.scores),
            redLines: [...arbitration.redLines].sort(),
            rationales: [normalizeReviewRationale(arbitration.rationale)],
            resolution: 'xhigh_arbitration',
          } : item
        })
      } else if (finalReview.arbitrationHash !== undefined) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
      if (canonicalHash(recomputedResults) !== canonicalHash(finalReview.results)
        || canonicalHash(recomputedReview.disputes) !== canonicalHash(finalReview.disputes)) {
        scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
      }
      const expectedFinalBase = {
        batchManifestHash: batch.manifestHash, sourceSetHash: finalReview.sourceSetHash,
        automaticJudges: [] as unknown[], automaticJudgeCalls: 0 as const,
        reviewerAHash: assignmentA.result.resultHash, reviewerBHash: assignmentB.result.resultHash,
        disputes: recomputedReview.disputes, results: recomputedResults, status: 'finalized',
        ...(recomputedReview.disputes.length ? { arbitrationHash: finalReview.arbitrationHash } : {}),
      }
      if (canonicalHash(expectedFinalBase) !== finalReview.finalHash) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
      const assignment = assignmentA
      const resultByItem = new Map(finalReview.results.map((result: AnyRecord) => [result.itemHash, result]))
      const mappingByItem = new Map<string, AnyRecord>(assignment.assignment.privateMappings.map((mapping: AnyRecord) => [mapping.itemHash, mapping]))
      const publicItemByHash = new Map<string, AnyRecord>(assignment.assignment.packages.flatMap((packet: AnyRecord) => packet.items.map((item: AnyRecord) => [item.itemHash, item])))
      if (resultByItem.size !== finalReview.results.length || mappingByItem.size !== publicItemByHash.size) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')

      if (!Array.isArray(input.objectBindings) || !Array.isArray(input.evidence)) scientificError('SCIENTIFIC_V2_PUBLISH_INPUT_INVALID')
      const bindingByHash = new Map<string, AnyRecord>()
      for (const binding of input.objectBindings) {
        assertExactKeys(binding, ['imageHash', 'objectKey'], 'SCIENTIFIC_V2_OBJECT_BINDING_INVALID')
        if (!hashPattern.test(String(binding.imageHash || '')) || typeof binding.objectKey !== 'string'
          || bindingByHash.has(binding.imageHash)) scientificError('SCIENTIFIC_V2_OBJECT_BINDING_INVALID')
        bindingByHash.set(binding.imageHash, binding)
      }
      const requiredRawBindings = new Map<string, string>()
      for (const slot of batch.state.slots) if (slot.status === 'succeeded'
        && (!correctionTargetModelIds || correctionTargetModelIds.has(slot.canonicalModelId))) {
        const attempt = slot.attempts.at(-1)
        requiredRawBindings.set(attempt.rawImageHash, `bench/scientific-v2/private/objects/${attempt.rawImageHash}.${attempt.format}`)
      }
      for (const scientificCase of batch.manifest.cases) if (scientificCase.kind === 'edit'
        && batch.state.slots.some((slot: AnyRecord) => slot.caseId === scientificCase.id && slot.status === 'succeeded'
          && (!correctionTargetModelIds || correctionTargetModelIds.has(slot.canonicalModelId)))) {
        requiredRawBindings.set(scientificCase.sourceHash, `bench/scientific-v2/private/objects/${scientificCase.sourceHash}.png`)
      }
      if (bindingByHash.size !== requiredRawBindings.size || [...requiredRawBindings].some(([hash, objectKey]) => bindingByHash.get(hash)?.objectKey !== objectKey)) {
        scientificError('SCIENTIFIC_V2_OBJECT_BINDING_INVALID')
      }
      for (const [imageHash, binding] of bindingByHash) await verifyObject(binding.objectKey, imageHash)

      const evidenceBySlot = new Map<string, AnyRecord>()
      const evidenceRows: AnyRecord[] = []
      for (const item of input.evidence) {
        if (correctionTargetModelIds && !correctionTargetModelIds.has(item.canonicalModelId)) {
          scientificError('SCIENTIFIC_V2_PUBLIC_EVIDENCE_INVALID')
        }
        const key = `${item.canonicalModelId}\0${item.caseId}`
        if (evidenceBySlot.has(key)) scientificError('SCIENTIFIC_V2_PUBLIC_EVIDENCE_INVALID')
        const slot = batch.state.slots.find((candidate: AnyRecord) => candidate.canonicalModelId === item.canonicalModelId && candidate.caseId === item.caseId)
        const scientificCase = batch.manifest.cases.find((candidate: AnyRecord) => candidate.id === item.caseId)
        assertExactKeys(item, [
          'caseId', 'canonicalModelId', 'imageHash', 'variants', 'requestedResolution', 'actualOutputPixels',
          ...(scientificCase?.kind === 'edit' ? ['sourceHash', 'beforeVariants'] : []),
        ], 'SCIENTIFIC_V2_PUBLIC_EVIDENCE_INVALID')
        const attempt = slot?.attempts.at(-1)
        const actualOutputPixels = item.actualOutputPixels
        if (!slot || !scientificCase || slot.status !== 'succeeded' || item.imageHash !== slot.attempts.at(-1).rawImageHash
          || item.requestedResolution !== slot.imageSize
          || !actualOutputPixels || typeof actualOutputPixels !== 'object' || Array.isArray(actualOutputPixels)
          || canonicalHash(actualOutputPixels) !== canonicalHash({
            width: attempt.width, height: attempt.height,
            megapixels: Number(((attempt.width * attempt.height) / 1_000_000).toFixed(4)),
            fileSizeBytes: attempt.byteSize,
          })
          || !Array.isArray(item.variants) || !item.variants.length || item.variants.length > 3) scientificError('SCIENTIFIC_V2_PUBLIC_EVIDENCE_INVALID')
        const variants = []
        const variantKinds = new Set<string>()
        for (const variant of item.variants) {
          if (variantKinds.has(variant.kind)) scientificError('SCIENTIFIC_V2_PUBLIC_VARIANT_INVALID')
          variantKinds.add(variant.kind)
          const publicValue = publicVariant(variant, item.imageHash)
          await verifyObject(variant.objectKey, variant.imageHash)
          variants.push({ ...publicValue, objectKey: variant.objectKey })
        }
        let beforeVariants: AnyRecord[] | undefined
        if (scientificCase.kind === 'edit') {
          if (item.sourceHash !== scientificCase.sourceHash || !Array.isArray(item.beforeVariants) || !item.beforeVariants.length) {
            scientificError('SCIENTIFIC_V2_PUBLIC_EVIDENCE_INVALID')
          }
          beforeVariants = []
          const beforeKinds = new Set<string>()
          for (const variant of item.beforeVariants) {
            if (beforeKinds.has(variant.kind)) scientificError('SCIENTIFIC_V2_PUBLIC_VARIANT_INVALID')
            beforeKinds.add(variant.kind)
            const publicValue = publicVariant(variant, scientificCase.sourceHash)
            await verifyObject(variant.objectKey, variant.imageHash)
            beforeVariants.push({ ...publicValue, objectKey: variant.objectKey })
          }
        } else if (item.beforeVariants !== undefined || item.sourceHash !== undefined) scientificError('SCIENTIFIC_V2_PUBLIC_EVIDENCE_INVALID')
        evidenceBySlot.set(key, { ...item, variants, beforeVariants })
      }
      if (evidenceBySlot.size !== batch.state.slots.filter((slot: AnyRecord) => slot.status === 'succeeded'
        && (!correctionTargetModelIds || correctionTargetModelIds.has(slot.canonicalModelId))).length) {
        scientificError('SCIENTIFIC_V2_PUBLIC_EVIDENCE_INVALID')
      }

      const reviewBySlot = new Map<string, AnyRecord>()
      for (const [itemHash, mapping] of mappingByItem) {
        const publicItem = publicItemByHash.get(itemHash) as AnyRecord | undefined
        const result = resultByItem.get(itemHash) as AnyRecord | undefined
        if (!publicItem || !result || mapping.modelKey === undefined) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
        const key = `${mapping.modelKey}\0${publicItem.caseId}`
        if (reviewBySlot.has(key) || publicItem.imageHash === undefined) scientificError('SCIENTIFIC_V2_REVIEW_FINAL_INVALID')
        reviewBySlot.set(key, { publicItem, result })
      }
      const recomputedModelDrafts = batch.manifest.models
        .filter((model: AnyRecord) => !correctionTargetModelIds || correctionTargetModelIds.has(model.canonicalModelId))
        .map((model: AnyRecord) => {
        const slots = batch.state.slots.filter((slot: AnyRecord) => slot.canonicalModelId === model.canonicalModelId)
        if (slots.length !== 9) scientificError('SCIENTIFIC_V2_FIXED_SLOT_SET_INVALID')
        const fixed = slots.map((slot: AnyRecord) => {
          if (slot.status !== 'succeeded') return { caseId: slot.caseId, status: slot.status }
          const review = reviewBySlot.get(`${slot.canonicalModelId}\0${slot.caseId}`)
          if (!review || review.publicItem.imageHash !== slot.attempts.at(-1).rawImageHash) scientificError('SCIENTIFIC_V2_REVIEW_COVERAGE_INVALID')
          return { caseId: slot.caseId, status: 'succeeded' as const, scores: review.result.scores }
        })
        const aggregation = aggregateScientificFixedSlots(fixed)
        const scores = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, aggregation.byAxis[axis].mean]))
        const evidence = slots.map((slot: AnyRecord) => {
          const scientificCase = batch.manifest.cases.find((candidate: AnyRecord) => candidate.id === slot.caseId)
          const review = reviewBySlot.get(`${slot.canonicalModelId}\0${slot.caseId}`)
          const stored = evidenceBySlot.get(`${slot.canonicalModelId}\0${slot.caseId}`)
          const attemptSummary = {
            count: slot.attempts.length,
            responseClasses: slot.attempts.map((attempt: AnyRecord) => attempt.responseClass),
          }
          if (slot.status !== 'succeeded') return {
            caseId: slot.caseId, kind: scientificCase.kind, status: slot.status, attemptSummary,
            requestedResolution: slot.imageSize,
            failureReason: scientificV2FailureReason(slot),
          }
          if (!review || !stored) scientificError('SCIENTIFIC_V2_REVIEW_COVERAGE_INVALID')
          const publicStored = {
            variants: stored.variants.map(({ objectKey: _key, ...variant }: AnyRecord) => variant),
            ...(stored.beforeVariants ? { beforeVariants: stored.beforeVariants.map(({ objectKey: _key, ...variant }: AnyRecord) => variant) } : {}),
          }
          return {
            caseId: slot.caseId, kind: scientificCase.kind, status: 'succeeded', imageHash: stored.imageHash,
            requestedResolution: stored.requestedResolution,
            actualOutputPixels: structuredClone(stored.actualOutputPixels),
            ...(scientificCase.kind === 'edit' ? { sourceHash: scientificCase.sourceHash, editedHash: stored.imageHash, region: scientificCase.region } : {}),
            scores: structuredClone(review.result.scores),
            reviewNotes: review.result.rationales.map((rationale: unknown) => normalizeReviewRationale(rationale)),
            attemptSummary, ...publicStored,
          }
        })
        const generation = slots.filter((slot: AnyRecord) => slot.operation === 'generation')
        const edit = slots.filter((slot: AnyRecord) => slot.operation === 'edit')
        return {
          profileId: `${model.canonicalModelId}:${SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode}:${SCIENTIFIC_BENCHMARK_IDENTITY.evaluationEpoch}`,
          modelId: model.canonicalModelId, canonicalModelId: model.canonicalModelId,
          displayName: model.displayName, developer: model.developer, profileStatus: 'published', ranked: true,
          scores, dimensions: aggregation.byAxis,
          generationSuccessRate: generation.filter((slot: AnyRecord) => slot.status === 'succeeded').length / 6,
          editSuccessRate: edit.filter((slot: AnyRecord) => slot.status === 'succeeded').length / 3,
          successRate: slots.filter((slot: AnyRecord) => slot.status === 'succeeded').length / 9,
          attemptSummary: {
            total: slots.reduce((sum: number, slot: AnyRecord) => sum + slot.attempts.length, 0),
            succeeded: slots.filter((slot: AnyRecord) => slot.status === 'succeeded').length,
            failed: slots.filter((slot: AnyRecord) => slot.status === 'failed').length,
            unsupported: slots.filter((slot: AnyRecord) => slot.status === 'unsupported').length,
          },
          failureReasons: evidence.filter((item: AnyRecord) => item.failureReason).map((item: AnyRecord) => ({ caseId: item.caseId, reason: item.failureReason })),
          evidence,
        }
        })
      const correctionEvaluationKeys = [
        'scores', 'dimensions', 'generationSuccessRate', 'editSuccessRate', 'successRate',
        'attemptSummary', 'failureReasons', 'evidence',
      ] as const
      const modelDrafts = correctionBaselineRelease && correctionTargetModelIds
        ? batch.manifest.models.map((model: AnyRecord) => {
          const baseline = correctionBaselineRelease!.models.find((candidate: AnyRecord) => candidate.canonicalModelId === model.canonicalModelId)
          if (!baseline) return undefined
          const draft = structuredClone(baseline)
          if (!correctionTargetModelIds!.has(model.canonicalModelId)) return draft
          const recomputed = recomputedModelDrafts.find((candidate: AnyRecord) => candidate.canonicalModelId === model.canonicalModelId)
          if (!recomputed) return undefined
          for (const key of correctionEvaluationKeys) draft[key] = structuredClone(recomputed[key])
          return draft
        })
        : recomputedModelDrafts
      if (modelDrafts.some((model: AnyRecord) => !model)) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
      const overallRanked = rankScientificModels(modelDrafts.map((model: AnyRecord) => ({ modelId: model.modelId, scores: model.scores })))
      const overallByModel = new Map(overallRanked.map((item) => [item.modelId, item]))
      const dimensionRanks = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, competitionRanks(modelDrafts.map((model: AnyRecord) => model.scores[axis]))]))
      const models = modelDrafts.map((model: AnyRecord, index: number) => ({
        ...model,
        overallScore: correctionTargetModelIds && !correctionTargetModelIds.has(model.canonicalModelId)
          ? model.overallScore
          : overallByModel.get(model.modelId)!.overallScore,
        overallRank: overallByModel.get(model.modelId)!.overallRank,
        dimensionRanks: Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, dimensionRanks[axis][index]])),
      })).sort((left: AnyRecord, right: AnyRecord) => left.overallRank - right.overallRank || Buffer.compare(Buffer.from(left.modelId), Buffer.from(right.modelId)))

      // The object contract is immutable and content addressed; verify every referenced object again immediately before hashing the release.
      for (const [imageHash, binding] of bindingByHash) await verifyObject(binding.objectKey, imageHash)
      for (const stored of evidenceBySlot.values()) {
        for (const variant of stored.variants) await verifyObject(variant.objectKey, variant.imageHash)
        for (const variant of stored.beforeVariants || []) await verifyObject(variant.objectKey, variant.imageHash)
      }

      const releaseBase = {
        profileStatus: 'published',
        ...SCIENTIFIC_BENCHMARK_IDENTITY,
        suiteHash: batch.manifest.suiteHash,
        registryHash: batch.manifest.registryHash,
        priceHash: batch.manifest.priceHash,
        manifestCodeSha: codeLineage.manifestCodeSha,
        executionCodeSha: codeLineage.executionCodeSha,
        publicationCodeSha: codeLineage.publicationCodeSha,
        legacyRecovery: codeLineage.legacyRecoveryStateHash !== null,
        batchId: batch.batchId,
        batchManifestHash: batch.manifestHash,
        reviewFinalHash: batch.reviewFinalHash,
        sampleCount: batch.state.slots.filter((slot: AnyRecord) => slot.status === 'succeeded').length,
        automaticJudges: [] as unknown[], automaticJudgeCalls: 0,
        models,
        methodology: {
          ...SCIENTIFIC_BENCHMARK_IDENTITY,
          suiteHash: batch.manifest.suiteHash, expectedCaseCount: 9, dimensions: [...SCIENTIFIC_BENCHMARK_AXES],
          overallFormula: 'ten_dimension_raw_equal_weight_mean', tieMethod: 'competition', failureScore: 0,
          retryPolicy: { confirmedFailureMaxAttempts: 4, unknownProviderOutcome: 'pause_no_retry' },
          routePriority: ['bailian', 'ark', 'openrouter'], providerBudgetsCny: { ...SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY },
          manifestCodeSha: codeLineage.manifestCodeSha,
          executionCodeSha: codeLineage.executionCodeSha,
          publicationCodeSha: codeLineage.publicationCodeSha,
          legacyRecovery: codeLineage.legacyRecoveryStateHash !== null,
          automaticJudges: [] as unknown[],
          blindReview: { reviewers: 2, arbitration: 'xhigh_on_dispute', automaticJudges: [] },
          knownLimitations: ['fixed-nine-case-suite', 'single-production-run-per-model', 'human-codex-double-review'],
          automaticJudgmentCount: 0,
        },
        publishedAt: now(),
      }
      const releaseHash = canonicalHash(releaseBase)
      const releaseId = `bench-scientific-v2-release-${releaseHash.slice(0, 20)}`
      const publicRows = models.flatMap((model: AnyRecord) => model.evidence.map((item: AnyRecord) => {
        if (correctionTargetModelIds && !correctionTargetModelIds.has(model.canonicalModelId)) {
          const baselineRow = correctionBaselinePublicRows.get(`${model.canonicalModelId}\0${item.caseId}`)
          if (!baselineRow) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
          return {
            ...structuredClone(baselineRow),
            _id: `scientific-v2-public-evidence:${canonicalHash([releaseHash, model.profileId, item.caseId])}`,
            sourceReleaseHash: releaseHash,
            overallRank: model.overallRank,
            createdAt: now(),
          }
        }
        const stored = evidenceBySlot.get(`${model.canonicalModelId}\0${item.caseId}`)
        const row = {
          _id: `scientific-v2-public-evidence:${canonicalHash([releaseHash, model.profileId, item.caseId])}`,
          sourceReleaseHash: releaseHash, profileId: model.profileId, canonicalModelId: model.canonicalModelId,
          overallRank: model.overallRank, ...structuredClone(item),
          ...(stored ? {
            variants: stored.variants,
            ...(stored.beforeVariants ? { beforeVariants: stored.beforeVariants } : {}),
          } : {}),
          createdAt: now(),
        }
        return row
      }))
      const snapshotHash = canonicalHash({ stateHash: batch.stateHash, reviewFinalHash: batch.reviewFinalHash, status: batch.status, revision: batch.revision, latestStateReportHash: batch.latestStateReportHash })
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const current = await batches.findOne({ _id: batch._id, status: batch.status, stateHash: batch.stateHash, reviewFinalHash: batch.reviewFinalHash, revision: batch.revision, latestStateReportHash: batch.latestStateReportHash }, { session } as any)
          if (!current || canonicalHash({ stateHash: current.stateHash, reviewFinalHash: current.reviewFinalHash, status: current.status, revision: current.revision, latestStateReportHash: current.latestStateReportHash }) !== snapshotHash) {
            scientificError('SCIENTIFIC_V2_PUBLISH_STATE_CONFLICT')
          }
          assertExactCorrectionPlanBatch(current)
          if (canonicalHash(current.remediationOf) !== canonicalHash(batch.remediationOf)
            || canonicalHash(current.correctionBaseline) !== canonicalHash(batch.correctionBaseline)) {
            scientificError('SCIENTIFIC_V2_PUBLISH_STATE_CONFLICT')
          }
          const identityQuery = {
            suiteId: SCIENTIFIC_BENCHMARK_IDENTITY.suiteId,
            evaluationMode: SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode,
            evaluationEpoch: SCIENTIFIC_BENCHMARK_IDENTITY.evaluationEpoch,
            profileStatus: 'published',
          }
          const currentHead = await releaseHeads.findOne({ _id: SCIENTIFIC_V2_RELEASE_HEAD_ID }, { session } as any)
          let competing: AnyRecord | null = null
          if (currentHead) {
            competing = await releases.findOne({
              _id: currentHead.releaseId, releaseHash: currentHead.releaseHash, ...identityQuery,
            }, { session } as any)
            const lifecycle = await releaseLifecycle.findOne({
              releaseId: currentHead.releaseId, releaseHash: currentHead.releaseHash, status: 'active',
            }, { session } as any)
            if (!competing || !lifecycle) scientificError('SCIENTIFIC_V2_RELEASE_HEAD_CONFLICT')
          } else {
            const legacyCandidates = await releases.find(identityQuery, { session } as any)
              .sort({ publishedAt: -1 }).limit(2).toArray()
            if (legacyCandidates.length > 1) scientificError('SCIENTIFIC_V2_RELEASE_HEAD_CONFLICT')
            competing = legacyCandidates[0] || null
          }
          const remediationOf = batch.remediationOf
          if (competing) {
            const targetSlotIds = remediationOf?.targetSlotIds
            if (!remediationOf
              || remediationOf.releaseId !== competing._id
              || remediationOf.releaseHash !== competing.releaseHash
              || remediationOf.batchId !== competing.batchId
              || remediationOf.manifestHash !== competing.batchManifestHash
              || !Array.isArray(remediationOf.targetModelIds) || !remediationOf.targetModelIds.length
              || !Array.isArray(targetSlotIds)
              || (!targetSlotIds.length && batch.zeroCallCorrection !== true)
              || remediationOf.targetSlotSetHash !== canonicalHash(targetSlotIds)) {
              scientificError('SCIENTIFIC_V2_RELEASE_IDENTITY_CONFLICT')
            }
          } else if (remediationOf) {
            scientificError('SCIENTIFIC_V2_RELEASE_IDENTITY_CONFLICT')
          }
          if (batch.correctionBaseline) {
            if (!competing) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
            const baselineInSnapshot = await releases.findOne({
              _id: batch.correctionBaseline.releaseId,
              releaseHash: batch.correctionBaseline.releaseHash,
              batchId: batch.correctionBaseline.batchId,
              batchManifestHash: batch.correctionBaseline.manifestHash,
              profileStatus: 'published',
              ...SCIENTIFIC_BENCHMARK_IDENTITY,
            }, { session } as any)
            const baselineLifecycle = await releaseLifecycle.findOne({
              releaseId: batch.correctionBaseline.releaseId,
              releaseHash: batch.correctionBaseline.releaseHash,
              status: 'superseded',
              supersededByReleaseId: competing._id,
              supersededByReleaseHash: competing.releaseHash,
            }, { session } as any)
            if (!baselineInSnapshot || !baselineLifecycle) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
            const { _id: _baselineId, releaseHash: baselineHash, ...baselineBase } = baselineInSnapshot
            if (canonicalHash(baselineBase) !== baselineHash) scientificError('SCIENTIFIC_V2_CORRECTION_BASELINE_INVALID')
          }
          await releases.insertOne({ _id: releaseId, ...releaseBase, releaseHash }, { session } as any)
          for (const row of publicRows) await publicEvidence.insertOne(row, { session } as any)
          if (competing) {
            const oldLifecycle = await releaseLifecycle.findOne({ releaseId: competing._id }, { session } as any)
            const supersededLifecycle = {
              status: 'superseded', releaseId: competing._id, releaseHash: competing.releaseHash,
              supersededByReleaseId: releaseId, supersededByReleaseHash: releaseHash,
              supersededAt: now(), updatedAt: now(),
            }
            if (oldLifecycle) {
              const retired = await releaseLifecycle.updateOne(
                { _id: oldLifecycle._id, releaseId: competing._id, releaseHash: competing.releaseHash, status: 'active' },
                { $set: supersededLifecycle }, { session },
              )
              if (retired.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_RELEASE_HEAD_CONFLICT')
            } else {
              await releaseLifecycle.insertOne({
                _id: `benchmark-release-lifecycle:${competing._id}`, ...supersededLifecycle,
                activatedAt: competing.publishedAt,
              }, { session } as any)
            }
          }
          await releaseLifecycle.insertOne({
            _id: `benchmark-release-lifecycle:${releaseId}`,
            status: 'active', releaseId, releaseHash,
            ...(competing ? { supersedesReleaseId: competing._id, supersedesReleaseHash: competing.releaseHash } : {}),
            activatedAt: now(), updatedAt: now(),
          }, { session } as any)
          if (currentHead) {
            const movedHead = await releaseHeads.updateOne(
              { _id: SCIENTIFIC_V2_RELEASE_HEAD_ID, releaseId: currentHead.releaseId, releaseHash: currentHead.releaseHash },
              { $set: {
                releaseId, releaseHash,
                previousReleaseId: competing?._id, previousReleaseHash: competing?.releaseHash,
                updatedAt: now(),
              } },
              { session },
            )
            if (movedHead.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_RELEASE_HEAD_CONFLICT')
          } else {
            await releaseHeads.insertOne({
              _id: SCIENTIFIC_V2_RELEASE_HEAD_ID,
              releaseId, releaseHash,
              ...(competing ? { previousReleaseId: competing._id, previousReleaseHash: competing.releaseHash } : {}),
              updatedAt: now(),
            }, { session } as any)
          }
          const updated = await batches.updateOne(
            { _id: batch._id, status: batch.status, stateHash: batch.stateHash, reviewFinalHash: batch.reviewFinalHash, revision: batch.revision, latestStateReportHash: batch.latestStateReportHash },
            { $set: { status: 'published', releaseId, releaseHash, revision: batch.revision + 1, publishedAt: now(), updatedAt: now() } },
            { session },
          )
          if (updated.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_PUBLISH_STATE_CONFLICT')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return { releaseId, releaseHash, profileStatus: 'published', replayed: false }
    },
    async claimReady(input: { manifestHash: string; expectedReadyStateHash: string }) {
      const claimNow = now()
      let current = await batches.findOne({
        manifestHash: input.manifestHash,
        stateHash: input.expectedReadyStateHash,
        'state.status': 'ready',
        claimToken: { $exists: false },
      })
      if (!current) current = await batches.findOne({
        manifestHash: input.manifestHash,
        stateHash: input.expectedReadyStateHash,
        'state.status': 'running',
        status: 'frozen',
        remediationOf: { $exists: true },
        claimToken: { $exists: false },
      })
      let reclaim = false
      if (!current) {
        current = await batches.findOne({
          manifestHash: input.manifestHash,
          status: 'running',
          claimLeaseExpiresAt: { $lte: claimNow },
        })
        if (!current) return null
        reclaim = true
        const unresolved = await dispatches.findOne({ manifestHash: input.manifestHash, status: 'started' })
        if (unresolved) scientificError('SCIENTIFIC_V2_STALE_CLAIM_RECONCILIATION_REQUIRED')
      }
      const claimToken = createClaimToken()
      if (typeof claimToken !== 'string' || claimToken.length < 8) scientificError('SCIENTIFIC_V2_CLAIM_TOKEN_INVALID')
      const state = structuredClone(current.state)
      if (!reclaim) {
        state.status = 'running'
        state.updatedAt = claimNow.toISOString()
        delete state.stateHash
        state.stateHash = canonicalHash(state)
      }
      verifyScientificV2ImportedState(state, current.manifest)
      const claimLeaseExpiresAt = new Date(claimNow.getTime() + claimLeaseMs)
      const claimed = await (batches as any).findOneAndUpdate(
        reclaim
          ? { _id: current._id, stateHash: current.stateHash, status: 'running', claimToken: current.claimToken, claimLeaseExpiresAt: { $lte: claimNow } }
          : current.remediationOf
            ? { _id: current._id, stateHash: input.expectedReadyStateHash, 'state.status': 'running', status: 'frozen', remediationOf: { $exists: true }, claimToken: { $exists: false } }
            : { _id: current._id, stateHash: input.expectedReadyStateHash, 'state.status': 'ready', claimToken: { $exists: false } },
        { $set: {
          state,
          stateHash: state.stateHash,
          ...(reclaim ? {} : { stateTransitionFromHash: input.expectedReadyStateHash }),
          status: 'running',
          claimToken,
          claimedAt: claimNow,
          claimHeartbeatAt: claimNow,
          claimLeaseExpiresAt,
        } },
        { returnDocument: 'after' },
      )
      if (!claimed) return null
      return {
        claimToken,
        state: deepFreeze(structuredClone(state)),
        batchId: String(current.batchId || ''),
        revision: Number(current.revision || 0) + 1,
      }
    },
    async saveClaimed(input: { claimToken: string; expectedStateHash: string; nextState: AnyRecord }) {
      assertNextState(input.nextState, input.nextState.manifestHash)
      const current = await batches.findOne({ manifestHash: input.nextState.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash })
      if (!current) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      verifyScientificV2ImportedState(input.nextState, current.manifest)
      const result = await (batches as any).findOneAndUpdate(
        { manifestHash: input.nextState.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash },
        { $set: {
          state: structuredClone(input.nextState), stateHash: input.nextState.stateHash, stateTransitionFromHash: input.expectedStateHash,
          status: input.nextState.status, updatedAt: now(), claimHeartbeatAt: now(), claimLeaseExpiresAt: new Date(now().getTime() + claimLeaseMs),
        } },
        { returnDocument: 'after' },
      )
      if (!result) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      return deepFreeze(structuredClone(input.nextState))
    },
    async beginDispatch(input: { claimToken: string; expectedStateHash: string; marker: AnyRecord }) {
      assertMarker(input.marker)
      const id = markerId(input.marker)
      let outcome: { status: 'started' | 'existing_uncommitted' } | null = null
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const batch = await batches.findOne({
            manifestHash: input.marker.manifestHash,
            claimToken: input.claimToken,
            stateHash: input.expectedStateHash,
            status: 'running',
            'state.status': 'running',
          }, { session } as any)
          if (!batch) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
          const existing = await dispatches.findOne({ _id: id }, { session } as any)
          if (existing) {
            if (existing.payloadHash !== input.marker.payloadHash || existing.claimToken !== input.claimToken
              || (batch.activeDispatchId !== undefined && batch.activeDispatchId !== id)) {
              scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_CONFLICT')
            }
            outcome = { status: 'existing_uncommitted' }
            return
          }
          if (batch.activeDispatchId !== undefined) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
          const slot = batch.state.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
          const scientificCase = batch.manifest.cases.find((candidate: AnyRecord) => candidate.id === slot?.caseId)
          if (!slot || !scientificCase || input.marker.attemptIndex !== slot.attempts.length + 1
            || input.marker.payloadHash !== expectedPayloadHash(batch.manifest, slot, scientificCase)) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
          const reserved = await batches.updateOne(
            {
              _id: batch._id,
              claimToken: input.claimToken,
              stateHash: input.expectedStateHash,
              status: 'running',
              'state.status': 'running',
              activeDispatchId: { $exists: false },
              ...(Object.hasOwn(batch, 'executionCodeSha')
                ? { executionCodeSha: batch.executionCodeSha }
                : { executionCodeSha: { $exists: false } }),
            },
            { $set: { activeDispatchId: id } },
            { session },
          )
          if (reserved.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
          await dispatches.insertOne({
            _id: id,
            ...structuredClone(input.marker),
            claimToken: input.claimToken,
            expectedStateHash: input.expectedStateHash,
            status: 'started',
            startedAt: now(),
          }, { session } as any)
          outcome = { status: 'started' }
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      if (!outcome) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      return outcome
    },
    async heartbeatClaim(input: { manifestHash: string; claimToken: string }) {
      const heartbeatAt = now()
      const updated = await batches.updateOne(
        { manifestHash: input.manifestHash, claimToken: input.claimToken, status: 'running', claimLeaseExpiresAt: { $gt: heartbeatAt } },
        { $set: { claimHeartbeatAt: heartbeatAt, claimLeaseExpiresAt: new Date(heartbeatAt.getTime() + claimLeaseMs) } },
      )
      if (updated.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_CLAIM_LEASE_LOST')
    },
    async commitAttempt(input: {
      claimToken: string
      expectedStateHash: string
      marker: AnyRecord
      attempt: AnyRecord
      nextState: AnyRecord
      artifactRecovery?: AnyRecord
      failureCode?: string
    }) {
      assertMarker(input.marker)
      assertNextState(input.nextState, input.marker.manifestHash)
      const id = markerId(input.marker)
      const replay = await dispatches.findOne({ _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'committed' })
      if (replay) return deepFreeze(structuredClone(replay.state))
      const authoritative = await batches.findOne({ manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash })
      if (!authoritative) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      verifyScientificV2ImportedState(input.nextState, authoritative.manifest)
      const previousSlot = authoritative.state.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
      const nextSlot = input.nextState.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
      const persistedAttempt = nextSlot?.attempts?.[input.marker.attemptIndex - 1]
      if (!previousSlot || !nextSlot || previousSlot.attempts.length !== input.marker.attemptIndex - 1
        || canonicalHash(persistedAttempt) !== canonicalHash(input.attempt)
        || input.attempt.attemptIndex !== input.marker.attemptIndex || input.attempt.payloadHash !== input.marker.payloadHash) {
        scientificError('SCIENTIFIC_V2_ATTEMPT_MISMATCH')
      }
      if (input.artifactRecovery) {
        if (input.attempt.responseClass !== 'artifact_reconciliation_required') scientificError('SCIENTIFIC_V2_ARTIFACT_RECOVERY_INVALID')
        assertArtifactRecovery(input.artifactRecovery, input.attempt)
      }
      if (input.failureCode !== undefined && !/^SCIENTIFIC_V2_[A-Z0-9_]{1,120}$/.test(input.failureCode)) {
        scientificError('SCIENTIFIC_V2_FAILURE_CODE_INVALID')
      }
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const marker = await dispatches.findOne({ _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'started' }, { session } as any)
          if (!marker) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
          const batchUpdate = { $set: {
              state: structuredClone(input.nextState), stateHash: input.nextState.stateHash, stateTransitionFromHash: input.expectedStateHash,
              status: input.nextState.status, updatedAt: now(), claimHeartbeatAt: now(), claimLeaseExpiresAt: new Date(now().getTime() + claimLeaseMs),
            }, $unset: { activeDispatchId: '' } }
          let updatedBatch = await batches.updateOne(
            { manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash, activeDispatchId: id },
            batchUpdate,
            { session },
          )
          if (updatedBatch.modifiedCount !== 1) {
            updatedBatch = await batches.updateOne(
              { manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash, activeDispatchId: { $exists: false } },
              batchUpdate,
              { session },
            )
          }
          if (updatedBatch.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
          const updatedMarker = await dispatches.updateOne(
            { _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'started', expectedStateHash: input.expectedStateHash },
            { $set: {
              status: 'committed', attempt: structuredClone(input.attempt), state: structuredClone(input.nextState), committedAt: now(),
              ...(input.artifactRecovery ? { artifactRecovery: structuredClone(input.artifactRecovery) } : {}),
              ...(input.failureCode ? { failureCode: input.failureCode } : {}),
            } },
            { session },
          )
          if (updatedMarker.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return deepFreeze(structuredClone(input.nextState))
    },
    async resolveDispatch(input: { claimToken: string; marker: AnyRecord }) {
      assertMarker(input.marker)
      const marker = await dispatches.findOne({ _id: markerId(input.marker), claimToken: input.claimToken, payloadHash: input.marker.payloadHash })
      if (!marker) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
      if (marker.status === 'committed') return { status: 'committed' as const, state: deepFreeze(structuredClone(marker.state)) }
      if (marker.status === 'started') return { status: 'started' as const }
      scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
    },
    async markUnknown(input: { claimToken: string; expectedStateHash: string; marker: AnyRecord; attempt: AnyRecord; conservativeCny: number; nextState: AnyRecord }) {
      assertMarker(input.marker)
      assertNextState(input.nextState, input.marker.manifestHash)
      if (!Number.isFinite(input.conservativeCny) || input.conservativeCny < 0) scientificError('SCIENTIFIC_V2_UNKNOWN_COST_INVALID')
      const id = markerId(input.marker)
      const authoritative = await batches.findOne({ manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash })
      if (!authoritative) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      verifyScientificV2ImportedState(input.nextState, authoritative.manifest)
      const previousSlot = authoritative.state.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
      const nextSlot = input.nextState.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
      const persistedAttempt = nextSlot?.attempts?.[input.marker.attemptIndex - 1]
      if (!previousSlot || !nextSlot || previousSlot.attempts.length !== input.marker.attemptIndex - 1
        || canonicalHash(persistedAttempt) !== canonicalHash(input.attempt)
        || input.attempt.attemptIndex !== input.marker.attemptIndex || input.attempt.payloadHash !== input.marker.payloadHash
        || nextSlot.status !== 'unknown' || input.attempt.responseClass !== 'unknown_provider_outcome') {
        scientificError('SCIENTIFIC_V2_ATTEMPT_MISMATCH')
      }
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const marker = await dispatches.findOne({ _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'started', expectedStateHash: input.expectedStateHash }, { session } as any)
          if (!marker) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
          const batchUpdate = { $set: {
              state: structuredClone(input.nextState), stateHash: input.nextState.stateHash, stateTransitionFromHash: input.expectedStateHash,
              status: input.nextState.status, updatedAt: now(), claimHeartbeatAt: now(), claimLeaseExpiresAt: new Date(now().getTime() + claimLeaseMs),
            }, $unset: { activeDispatchId: '' } }
          let updatedBatch = await batches.updateOne(
            { manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash, activeDispatchId: id },
            batchUpdate,
            { session },
          )
          if (updatedBatch.modifiedCount !== 1) {
            updatedBatch = await batches.updateOne(
              { manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash, activeDispatchId: { $exists: false } },
              batchUpdate,
              { session },
            )
          }
          if (updatedBatch.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
          const updatedMarker = await dispatches.updateOne(
            { _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'started', expectedStateHash: input.expectedStateHash },
            { $set: { status: 'unknown', attempt: structuredClone(input.attempt), conservativeCny: input.conservativeCny, state: structuredClone(input.nextState), resolvedAt: now() } },
            { session },
          )
          if (updatedMarker.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return deepFreeze(structuredClone(input.nextState))
    },
    async reconcileArtifact(input: {
      batchId: string
      manifestHash: string
      expectedStateHash: string
      marker: AnyRecord
      imageHash: string
      nextState: AnyRecord
    }) {
      assertMarker(input.marker)
      const current = await batches.findOne({
        batchId: input.batchId,
        manifestHash: input.manifestHash,
        stateHash: input.expectedStateHash,
        status: 'paused',
        'state.pauseReason': 'artifact_reconciliation_required',
      })
      if (!current) scientificError('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_CAS_FAILED')
      verifyScientificV2ImportedState(current.state, current.manifest)
      verifyScientificV2ImportedState(input.nextState, current.manifest)
      const previousSlot = current.state.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
      const previousAttempt = previousSlot?.attempts?.[input.marker.attemptIndex - 1]
      if (!previousSlot || previousSlot.status !== 'artifact_reconciliation'
        || previousAttempt?.responseClass !== 'artifact_reconciliation_required'
        || previousAttempt.payloadHash !== input.marker.payloadHash || previousAttempt.rawImageHash !== input.imageHash) {
        scientificError('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_BINDING_INVALID')
      }
      const expected = structuredClone(current.state)
      const expectedSlot = expected.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
      const expectedAttempt = expectedSlot.attempts[input.marker.attemptIndex - 1]
      expectedAttempt.responseClass = 'succeeded'
      delete expectedAttempt.attemptHash
      expectedAttempt.attemptHash = canonicalHash(expectedAttempt)
      expectedSlot.status = 'succeeded'
      for (const later of expected.slots) if (later.sequence > expectedSlot.sequence && later.status === 'not_executed') later.status = 'pending'
      expected.status = 'running'
      expected.pauseReason = null
      expected.blockReason = null
      expected.updatedAt = input.nextState.updatedAt
      delete expected.stateHash
      expected.stateHash = canonicalHash(expected)
      if (canonicalHash(expected) !== canonicalHash(input.nextState)) scientificError('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_STATE_INVALID')

      const markerKey = markerId(input.marker)
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const dispatch = await dispatches.findOne({
            _id: markerKey,
            payloadHash: input.marker.payloadHash,
            status: 'committed',
            'artifactRecovery.imageHash': input.imageHash,
          }, { session } as any)
          if (!dispatch) scientificError('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_BINDING_INVALID')
          assertArtifactRecovery(dispatch.artifactRecovery, previousAttempt)
          const updatedBatch = await batches.updateOne(
            {
              batchId: input.batchId, manifestHash: input.manifestHash, stateHash: input.expectedStateHash,
              status: 'paused', 'state.pauseReason': 'artifact_reconciliation_required',
            },
            { $set: {
              state: structuredClone(input.nextState), stateHash: input.nextState.stateHash,
              stateTransitionFromHash: input.expectedStateHash, status: 'running', updatedAt: now(),
              claimLeaseExpiresAt: new Date(0),
            } },
            { session },
          )
          if (updatedBatch.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_CAS_FAILED')
          const nextSlot = input.nextState.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
          const nextAttempt = nextSlot?.attempts?.[input.marker.attemptIndex - 1]
          const updatedDispatch = await dispatches.updateOne(
            {
              _id: markerKey, payloadHash: input.marker.payloadHash, status: 'committed',
              'artifactRecovery.imageHash': input.imageHash,
            },
            { $set: { attempt: structuredClone(nextAttempt), state: structuredClone(input.nextState), artifactReconciledAt: now() } },
            { session },
          )
          if (updatedDispatch.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_CAS_FAILED')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return deepFreeze(structuredClone(input.nextState))
    },
    async recordReleaseFailure(input: { manifestHash: string; claimToken: string | null; failureClass: 'lock_release_failed' }) {
      if (input.failureClass !== 'lock_release_failed') scientificError('SCIENTIFIC_V2_RELEASE_FAILURE_INVALID')
      await batches.updateOne(
        { manifestHash: input.manifestHash, ...(input.claimToken ? { claimToken: input.claimToken } : {}) },
        { $set: { releaseFailure: input.failureClass, releaseFailureAt: now() } },
      )
    },
  }
}
