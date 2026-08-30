import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_BENCHMARK_AXES,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  SCIENTIFIC_REVIEW_MAX_RED_LINES,
  SCIENTIFIC_REVIEW_RED_LINE_CODES,
  aggregateScientificFixedSlots,
  buildScientificV2CanonicalManifest,
  canonicalHash,
  rankScientificModels,
} from '@paperbanana/benchmark-core'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Db } from 'mongodb'

type AnyRecord = { _id?: string; [key: string]: any }

export const SCIENTIFIC_V2_COLLECTIONS = Object.freeze({
  batches: 'paperbanana_benchmark_scientific_v2_batches',
  dispatches: 'paperbanana_benchmark_scientific_v2_dispatches',
  reviews: 'paperbanana_benchmark_scientific_v2_review_artifacts',
  publicEvidence: 'paperbanana_benchmark_scientific_v2_public_evidence',
} as const)

const hashPattern = /^[a-f0-9]{64}$/
const codeShaPattern = /^[a-f0-9]{40}$/
const productionLockName = '/run/lock/paperbanana-hk-production.lock'
const providers = ['bailian', 'ark', 'openrouter'] as const
const reviewRedLineNotes = Object.freeze({
  missing_required_content: '扣分：缺少题目要求的关键内容',
  scientific_inaccuracy: '扣分：存在科学事实偏差',
  topology_error: '扣分：结构或拓扑关系错误',
  text_symbol_error: '扣分：文字或符号表达错误',
  quantitative_error: '扣分：定量表达不准确',
  instruction_violation: '扣分：未完整遵循生成或编辑指令',
  readability_issue: '扣分：信息层级或可读性不足',
  publication_quality_issue: '扣分：未达到出版级视觉质量',
  edit_target_miss: '扣分：未准确完成目标区域编辑',
  non_target_changed: '扣分：非目标区域发生不当变化',
} as const)
const reviewRedLineCodes = new Set<string>(SCIENTIFIC_REVIEW_RED_LINE_CODES)
const scientificCaseOrder = new Map(PB_SCIENTIFIC_FIGURE_V2.cases.map((scientificCase, index) => [scientificCase.id, index]))
const stateOperationReportPayloadKeys = [
  'schemaVersion', 'identity', 'kind', 'batchId', 'batchManifestHash', 'revision', 'previousStateHash',
  'stateHash', 'state', 'providerCanaryAttestation', 'executionOrderAttestation', 'codexProvenance',
  'disclosure', 'createdAt',
] as const

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
    || !hashPattern.test(String(value.stateHash || '')) || value.stateHash !== value.state?.stateHash) {
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
    || !['ready', 'running', 'awaiting_artifacts', 'completed', 'paused', 'blocked'].includes(state.status)
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
      'isProviderCanary', 'routeStatus', 'status', 'costCny', 'attempts',
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
      if (slot.attempts.length !== 4 || !['confirmed_technical_failure', 'confirmed_provider_failure'].includes(slot.attempts.at(-1).responseClass)) scientificError('SCIENTIFIC_V2_STATE_SLOT_INVALID')
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
  if (interruptedIndex >= 0 && (slotStatuses.slice(0, interruptedIndex).some((status: string) => !terminal(status))
    || slotStatuses.slice(interruptedIndex + 1).some((status: string) => status !== 'not_executed'))) {
    scientificError('SCIENTIFIC_V2_STATE_INTERRUPTION_ORDER_INVALID')
  }
  if ((state.status === 'paused') !== (state.pauseReason !== null)
    || (state.status === 'blocked') !== (state.blockReason !== null)
    || (state.status === 'ready' && slotStatuses.some((status: string) => status !== 'pending'))
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
  for (const item of result.items) {
    assertExactKeys(item, ['packetHash', 'itemHash', 'applicableAxes', 'scores', 'redLines', 'lowConfidence'], 'SCIENTIFIC_V2_REVIEW_RESULT_TAMPERED')
    const expected = expectedItems.get(item.itemHash) as AnyRecord | undefined
    if (!expected || expected.packetHash !== item.packetHash || canonicalHash(item.applicableAxes) !== canonicalHash(expected.item.applicableAxes)
      || typeof item.lowConfidence !== 'boolean') {
      scientificError('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
    }
    assertReviewRedLines(item.redLines)
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
  if (canaries.length !== canarySlotIds.size || canaries.some((slot: AnyRecord) => slot.status !== 'succeeded'
    || !['succeeded', 'succeeded_low_quality'].includes(slot.attempts.at(-1)?.responseClass))) {
    scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
  }
  return { providers, attemptSetHash }
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
    'codeSha', 'registryVersion', 'registryHash', 'registrySnapshotHash', 'registrySnapshot', 'canonicalManifestHash', 'suiteHash', 'priceHash',
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
    || canonicalHash(manifest.providerBudgetsCny) !== canonicalHash({ bailian: 180, ark: 180, openrouter: 180 })
    || canonicalHash(manifest.codexLimits) !== canonicalHash({ modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 })
    || canonicalHash(manifest.models) !== canonicalHash(canonicalManifest.models)
    || !Array.isArray(manifest.executionOrder) || manifest.executionOrder.length !== canonicalManifest.models.length * 9
    || Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY).some(([key, value]) => manifest[key] !== value)) {
    scientificError('SCIENTIFIC_V2_BATCH_MANIFEST_INVALID')
  }
  const price = manifest.priceSnapshot
  assertExactKeys(price, ['currency', 'capturedAt', 'entries', 'snapshotHash'], 'SCIENTIFIC_V2_PRICE_SNAPSHOT_INVALID')
  assertIsoInstant(price.capturedAt, 'SCIENTIFIC_V2_PRICE_SNAPSHOT_INVALID')
  for (const entry of price.entries || []) assertExactKeys(entry, [
    'provider', 'modelId', 'operation', 'currency', 'unitCny', 'source', 'sourceVerified', 'entryHash',
  ], 'SCIENTIFIC_V2_PRICE_SNAPSHOT_INVALID')
  if (!price || price.currency !== 'CNY' || !hashPattern.test(String(price.snapshotHash || ''))
    || canonicalWithoutHash(price, 'snapshotHash') !== price.snapshotHash || manifest.priceHash !== price.snapshotHash
    || !Array.isArray(price.entries) || price.entries.some((entry: AnyRecord) => entry.sourceVerified !== true
      || !providers.includes(entry.provider) || !['generation', 'edit'].includes(entry.operation)
      || entry.currency !== 'CNY' || !Number.isFinite(entry.unitCny) || entry.unitCny < 0
      || typeof entry.source !== 'string' || !entry.source.startsWith('https://')
      || canonicalWithoutHash(entry, 'entryHash') !== entry.entryHash)) {
    scientificError('SCIENTIFIC_V2_PRICE_SNAPSHOT_INVALID')
  }
  const priceByRoute = new Map<string, number>(price.entries.map((entry: AnyRecord) => [`${entry.provider}\0${entry.modelId}\0${entry.operation}`, Number(entry.unitCny)]))
  const estimates = { bailian: 0, ark: 0, openrouter: 0 }
  const modelIds = new Set<string>()
  const slotIds = new Set<string>()
  const seenCanaries = new Set<string>()
  for (const [index, slot] of manifest.executionOrder.entries()) {
    assertExactKeys(slot, [
      'sequence', 'slotId', 'canonicalModelId', 'caseId', 'provider', 'modelId', 'operation', 'supported',
      'isProviderCanary', 'routeStatus',
    ], 'SCIENTIFIC_V2_EXECUTION_SLOT_INVALID')
    const model = canonicalManifest.models.find((candidate: AnyRecord) => candidate.canonicalModelId === slot.canonicalModelId)
    const scientificCase = PB_SCIENTIFIC_FIGURE_V2.cases.find((candidate) => candidate.id === slot.caseId)
    if (!model || !scientificCase || slot.sequence !== index + 1 || slotIds.has(slot.slotId)
      || slot.operation !== scientificCase.kind || slot.supported !== Boolean(slot.provider && slot.modelId)
      || (scientificCase.kind === 'generation' && (slot.provider !== model.generationRoute.provider || slot.modelId !== model.generationRoute.modelId))
      || (scientificCase.kind === 'edit' && model.editRoute && (slot.provider !== model.editRoute.provider || slot.modelId !== model.editRoute.modelId))
      || (scientificCase.kind === 'edit' && !model.editRoute && (slot.provider !== null || slot.modelId !== null || slot.routeStatus !== 'no_direct_edit_route'))
      || (slot.provider === 'codex' && slot.canonicalModelId !== 'codex:gpt-image-2')
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
      estimates[slot.provider as keyof typeof estimates] += unit * 4
    }
  }
  if (modelIds.size !== canonicalManifest.models.length || providers.some((provider) => estimates[provider] > 180)) {
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

export function createScientificV2MongoRepository(
  db: Db,
  now = () => new Date(),
  createClaimToken = () => randomBytes(32).toString('hex'),
  options: {
    operatorReportSecret?: string
    immutableCodeSha?: string
    verifyObject?: (objectKey: string, imageHash: string) => Promise<void>
    claimLeaseMs?: number
  } = {},
) {
  const batches = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.batches)
  const dispatches = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.dispatches)
  const reviews = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.reviews)
  const publicEvidence = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.publicEvidence)
  const releases = db.collection<AnyRecord>('paperbanana_benchmark_releases')
  const verifyObject = options.verifyObject || (async () => {})
  const claimLeaseMs = options.claimLeaseMs ?? 120_000
  if (!Number.isInteger(claimLeaseMs) || claimLeaseMs < 1) scientificError('SCIENTIFIC_V2_CLAIM_LEASE_INVALID')

  const operatorSecret = () => {
    const secret = options.operatorReportSecret
    if (typeof secret !== 'string' || secret.trim() !== secret || Buffer.byteLength(secret, 'utf8') < 32 || Buffer.byteLength(secret, 'utf8') > 4096) {
      scientificError('SCIENTIFIC_V2_OPERATOR_REPORT_SECRET_INVALID')
    }
    return secret
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
      const immutableInput = {
        batchId,
        registrySnapshot: input.registrySnapshot,
        canonicalManifest: input.canonicalManifest,
        manifest: input.manifest,
        initialState: input.initialState,
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
    async operatorAttestation(input: { batchId?: string; manifestHash?: string }) {
      const batch = await batches.findOne(input.batchId ? { batchId: input.batchId } : { manifestHash: input.manifestHash })
      if (!batch) scientificError('SCIENTIFIC_V2_BATCH_NOT_FOUND')
      const report = {
        schemaVersion: 2 as const,
        ...SCIENTIFIC_BENCHMARK_IDENTITY,
        batchId: batch.batchId,
        batchManifestHash: batch.manifestHash,
        stateHash: batch.stateHash,
        daemon: { enabled: false as const, status: 'configured-disabled' as const },
        concurrency: 1 as const,
        lockName: batch.manifest.lockName,
        providerBudgetsCny: structuredClone(batch.manifest.providerBudgetsCny),
        codexToolCallLimit: batch.manifest.codexLimits.maxToolCalls,
        modelCount: batch.manifest.models.length,
        slotCount: batch.manifest.executionOrder.length,
        issuedAt: now().toISOString(),
      }
      const reportHash = canonicalHash(report)
      return deepFreeze({ ...report, reportHash, attestationHash: createHmac('sha256', operatorSecret()).update(reportHash).digest('hex') })
    },
    async importStateReport(input: AnyRecord) {
      input = normalizeScientificV2SignedStateOperationReport(input, operatorSecret())
      if (input.report.schemaVersion !== 2 || !['worker', 'codex'].includes(input.report.kind)
        || input.report.stateHash !== input.report.state?.stateHash) scientificError('SCIENTIFIC_V2_OPERATOR_REPORT_SCHEMA_INVALID')
      const batch = await batches.findOne({ batchId: input.report.batchId, manifestHash: input.report.batchManifestHash })
      if (!batch) scientificError('SCIENTIFIC_V2_BATCH_NOT_FOUND')
      const existing = await reviews.findOne({ _id: `scientific-v2-state-report:${input.reportHash}` })
      if (existing) return { stateHash: input.report.stateHash, reviewReady: existing.reviewReady === true, replayed: true }
      if (batch.status === 'published') scientificError('SCIENTIFIC_V2_LATE_IMPORT_REJECTED')
      const attachesPersistedWorkerState = input.report.kind === 'worker' && input.report.stateHash === batch.stateHash
      if (!Number.isInteger(input.report.revision) || input.report.revision !== Number(batch.revision || 0) + 1
        || input.report.previousStateHash === input.report.stateHash
        || (attachesPersistedWorkerState
          ? input.report.previousStateHash !== batch.stateTransitionFromHash
            || !['awaiting_artifacts', 'completed'].includes(batch.state?.status)
          : input.report.previousStateHash !== batch.stateHash)) scientificError('SCIENTIFIC_V2_IMPORT_REVISION_CONFLICT')
      verifyScientificV2ImportedState(input.report.state, batch.manifest)
      assertIsoInstant(input.report.createdAt, 'SCIENTIFIC_V2_OPERATOR_REPORT_SCHEMA_INVALID')
      assertExactKeys(input.report.providerCanaryAttestation, ['providers', 'passed', 'attemptSetHash'], 'SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      assertExactKeys(input.report.executionOrderAttestation, ['slotIds', 'passed'], 'SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      const providerCanaries = providerCanaryFacts(input.report.state, batch.manifest)
      if (input.report.providerCanaryAttestation.passed !== true
        || canonicalHash(input.report.providerCanaryAttestation.providers) !== canonicalHash(providerCanaries.providers)
        || input.report.providerCanaryAttestation.attemptSetHash !== providerCanaries.attemptSetHash
        || input.report.executionOrderAttestation.passed !== true
        || canonicalHash(input.report.executionOrderAttestation.slotIds) !== canonicalHash(input.report.state.slots.map((slot: AnyRecord) => slot.slotId))) {
        scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      }
      if (input.report.kind === 'worker' && !['awaiting_artifacts', 'completed'].includes(input.report.state.status)) {
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
      const batch = await batches.findOne({ batchId: input.batchId, status: 'review_ready' })
      if (!batch) scientificError('SCIENTIFIC_V2_REVIEW_BATCH_NOT_READY')
      assertReviewAssignment(input.assignment, batch, operatorSecret())
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
      for (const binding of objectBindings) await verifyObject(binding.objectKey, binding.imageHash)
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
        const session = db.client.startSession()
        try {
          await session.withTransaction(async () => {
            await reviews.insertOne({
              _id: `scientific-v2-review-assignment:${batch.manifestHash}:${sourceSetHash}:${input.assignment.role}`,
              artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash, sourceSetHash,
              role: input.assignment.role, assignment: structuredClone(input.assignment),
              objectBindings: structuredClone(objectBindings), createdAt: now(),
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
        _objectBindings: structuredClone(objectBindings),
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
      for (const result of input.arbitration.results) {
        const dispute = pending.get(result.itemHash) as AnyRecord | undefined
        if (!dispute || arbitrated.has(result.itemHash)) scientificError('SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
        assertExactKeys(result.scores, dispute.applicableAxes, 'SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
        if (dispute.applicableAxes.some((axis: string) => !Number.isFinite(result.scores[axis]) || result.scores[axis] < 0 || result.scores[axis] > 10)
          || !Array.isArray(result.redLines)) scientificError('SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
        assertReviewRedLines(result.redLines)
        arbitrated.set(result.itemHash, result)
      }
      const results = finalRow.results.map((item: AnyRecord) => {
        const arbitration = arbitrated.get(item.itemHash)
        return arbitration ? { ...item, scores: structuredClone(arbitration.scores), redLines: [...arbitration.redLines].sort(), resolution: 'xhigh_arbitration' } : item
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
        if (!existing || existing.releaseHash !== alreadyPublished.releaseHash) scientificError('SCIENTIFIC_V2_PUBLISH_STATE_CONFLICT')
        return { releaseId: existing._id, releaseHash: existing.releaseHash, profileStatus: 'published', replayed: true }
      }
      const batch = await batches.findOne({ batchId: input.batchId, status: { $in: ['review_finalized', 'review_ready'] }, reviewFinalHash: { $exists: true } })
      if (!batch) scientificError('SCIENTIFIC_V2_BATCH_NOT_PUBLISHABLE')
      verifyScientificV2ImportedState(batch.state, batch.manifest)
      if (batch.state.status !== 'completed' || batch.state.slots.some((slot: AnyRecord) => !['succeeded', 'failed', 'unsupported'].includes(slot.status))) {
        scientificError('SCIENTIFIC_V2_BATCH_NOT_TERMINAL')
      }
      const secret = operatorSecret()
      const stateReportRow = await reviews.findOne({ _id: `scientific-v2-state-report:${batch.latestStateReportHash}` })
      if (!stateReportRow || stateReportRow.reportHash !== batch.latestStateReportHash
        || normalizeScientificV2StateOperationReport(stateReportRow.report).reportHash !== stateReportRow.reportHash
        || !safeHmacEqual(stateReportRow.attestationHash, createHmac('sha256', secret).update(stateReportRow.reportHash).digest('hex'))
        || stateReportRow.report.stateHash !== batch.stateHash
        || canonicalHash(stateReportRow.report.state) !== canonicalHash(batch.state)) {
        scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      }
      const codexProvenance = stateReportRow.report.codexProvenance
      const providerCanary = stateReportRow.report.providerCanaryAttestation
      const orderAttestation = stateReportRow.report.executionOrderAttestation
      const codexSlots = batch.state.slots.filter((slot: AnyRecord) => slot.provider === 'codex')
      const successfulCodexSlots = codexSlots.filter((slot: AnyRecord) => slot.status === 'succeeded').length
      const codexToolCalls = codexSlots.reduce((sum: number, slot: AnyRecord) => sum + slot.attempts.length, 0)
      assertExactKeys(providerCanary, ['providers', 'passed', 'attemptSetHash'], 'SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      const expectedCanaries = providerCanaryFacts(batch.state, batch.manifest)
      if (stateReportRow.report.kind !== 'codex' || codexProvenance.modelId !== 'codex:gpt-image-2'
        || codexProvenance.successfulSlots !== successfulCodexSlots
        || codexProvenance.toolCalls !== codexToolCalls || codexToolCalls > 36
        || codexSlots.length !== 9 || codexSlots[0]?.status !== 'succeeded'
        || codexSlots.some((slot: AnyRecord) => !['succeeded', 'failed'].includes(slot.status))
        || codexProvenance.firstCaseId !== codexSlots[0]?.caseId
        || codexProvenance.artifactCanaryHash !== codexSlots[0]?.attempts.at(-1)?.rawImageHash
        || providerCanary.passed !== true || canonicalHash(providerCanary.providers) !== canonicalHash(expectedCanaries.providers)
        || providerCanary.attemptSetHash !== expectedCanaries.attemptSetHash
        || orderAttestation.passed !== true || canonicalHash(orderAttestation.slotIds) !== canonicalHash(batch.state.slots.map((slot: AnyRecord) => slot.slotId))) {
        scientificError('SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID')
      }

      const markers = await dispatches.find({ manifestHash: batch.manifestHash }).toArray()
      const expectedMarkerKeys = new Set<string>()
      for (const slot of batch.state.slots) {
        if (slot.provider === 'codex' || !slot.provider) continue
        for (const attempt of slot.attempts) {
          const key = `${slot.slotId}\0${attempt.attemptIndex}`
          const exact = markers.filter((marker) => marker.slotId === slot.slotId && marker.attemptIndex === attempt.attemptIndex)
          if (exact.length !== 1 || exact[0].status !== 'committed' || exact[0].payloadHash !== attempt.payloadHash
            || exact[0].attempt?.attemptHash !== attempt.attemptHash) scientificError('SCIENTIFIC_V2_DISPATCH_LEDGER_MISMATCH')
          expectedMarkerKeys.add(key)
        }
      }
      if (markers.some((marker) => !expectedMarkerKeys.has(`${marker.slotId}\0${marker.attemptIndex}`))) {
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
          return arbitration ? { ...item, scores: structuredClone(arbitration.scores), redLines: [...arbitration.redLines].sort(), resolution: 'xhigh_arbitration' } : item
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
      for (const slot of batch.state.slots) if (slot.status === 'succeeded') {
        const attempt = slot.attempts.at(-1)
        requiredRawBindings.set(attempt.rawImageHash, `bench/scientific-v2/private/objects/${attempt.rawImageHash}.${attempt.format}`)
      }
      for (const scientificCase of batch.manifest.cases) if (scientificCase.kind === 'edit') {
        requiredRawBindings.set(scientificCase.sourceHash, `bench/scientific-v2/private/objects/${scientificCase.sourceHash}.png`)
      }
      if (bindingByHash.size !== requiredRawBindings.size || [...requiredRawBindings].some(([hash, objectKey]) => bindingByHash.get(hash)?.objectKey !== objectKey)) {
        scientificError('SCIENTIFIC_V2_OBJECT_BINDING_INVALID')
      }
      for (const [imageHash, binding] of bindingByHash) await verifyObject(binding.objectKey, imageHash)

      const evidenceBySlot = new Map<string, AnyRecord>()
      const evidenceRows: AnyRecord[] = []
      for (const item of input.evidence) {
        const key = `${item.canonicalModelId}\0${item.caseId}`
        if (evidenceBySlot.has(key)) scientificError('SCIENTIFIC_V2_PUBLIC_EVIDENCE_INVALID')
        const slot = batch.state.slots.find((candidate: AnyRecord) => candidate.canonicalModelId === item.canonicalModelId && candidate.caseId === item.caseId)
        const scientificCase = batch.manifest.cases.find((candidate: AnyRecord) => candidate.id === item.caseId)
        if (!slot || !scientificCase || slot.status !== 'succeeded' || item.imageHash !== slot.attempts.at(-1).rawImageHash
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
      if (evidenceBySlot.size !== batch.state.slots.filter((slot: AnyRecord) => slot.status === 'succeeded').length) {
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
      const modelDrafts = batch.manifest.models.map((model: AnyRecord) => {
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
            failureReason: slot.status === 'unsupported' ? 'direct_edit_route_unavailable' : 'confirmed_attempts_exhausted',
          }
          if (!review || !stored) scientificError('SCIENTIFIC_V2_REVIEW_COVERAGE_INVALID')
          const publicStored = {
            variants: stored.variants.map(({ objectKey: _key, ...variant }: AnyRecord) => variant),
            ...(stored.beforeVariants ? { beforeVariants: stored.beforeVariants.map(({ objectKey: _key, ...variant }: AnyRecord) => variant) } : {}),
          }
          return {
            caseId: slot.caseId, kind: scientificCase.kind, status: 'succeeded', imageHash: stored.imageHash,
            ...(scientificCase.kind === 'edit' ? { sourceHash: scientificCase.sourceHash, editedHash: stored.imageHash, region: scientificCase.region } : {}),
            scores: structuredClone(review.result.scores),
            reviewNotes: review.result.redLines.length
              ? review.result.redLines.map((code: keyof typeof reviewRedLineNotes) => reviewRedLineNotes[code])
              : ['加分：双盲审核未确认红线问题'],
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
      const overallRanked = rankScientificModels(modelDrafts.map((model: AnyRecord) => ({ modelId: model.modelId, scores: model.scores })))
      const overallByModel = new Map(overallRanked.map((item) => [item.modelId, item]))
      const dimensionRanks = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, competitionRanks(modelDrafts.map((model: AnyRecord) => model.scores[axis]))]))
      const models = modelDrafts.map((model: AnyRecord, index: number) => ({
        ...model,
        overallScore: overallByModel.get(model.modelId)!.overallScore,
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
        codeSha: batch.manifest.codeSha,
        batchId: batch.batchId,
        batchManifestHash: batch.manifestHash,
        stateHash: batch.stateHash,
        reviewFinalHash: batch.reviewFinalHash,
        sampleCount: batch.state.slots.filter((slot: AnyRecord) => slot.status === 'succeeded').length,
        automaticJudges: [] as unknown[], automaticJudgeCalls: 0,
        models,
        methodology: {
          ...SCIENTIFIC_BENCHMARK_IDENTITY,
          suiteHash: batch.manifest.suiteHash, expectedCaseCount: 9, dimensions: [...SCIENTIFIC_BENCHMARK_AXES],
          overallFormula: 'ten_dimension_raw_equal_weight_mean', tieMethod: 'competition', failureScore: 0,
          retryPolicy: { confirmedFailureMaxAttempts: 4, unknownProviderOutcome: 'pause_no_retry' },
          routePriority: ['bailian', 'ark', 'openrouter'], providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 180 },
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
          const competing = await releases.findOne({
            suiteId: SCIENTIFIC_BENCHMARK_IDENTITY.suiteId,
            evaluationMode: SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode,
            evaluationEpoch: SCIENTIFIC_BENCHMARK_IDENTITY.evaluationEpoch,
            profileStatus: 'published',
          }, { session } as any)
          if (competing) scientificError('SCIENTIFIC_V2_RELEASE_IDENTITY_CONFLICT')
          await releases.insertOne({ _id: releaseId, ...releaseBase, releaseHash }, { session } as any)
          for (const row of publicRows) await publicEvidence.insertOne(row, { session } as any)
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
      const batch = await batches.findOne({ manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash })
      if (!batch) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      const slot = batch.state.slots.find((candidate: AnyRecord) => candidate.slotId === input.marker.slotId)
      const scientificCase = batch.manifest.cases.find((candidate: AnyRecord) => candidate.id === slot?.caseId)
      if (!slot || !scientificCase || input.marker.attemptIndex !== slot.attempts.length + 1
        || input.marker.payloadHash !== expectedPayloadHash(batch.manifest, slot, scientificCase)) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
      const id = markerId(input.marker)
      try {
        await dispatches.insertOne({
          _id: id,
          ...structuredClone(input.marker),
          claimToken: input.claimToken,
          expectedStateHash: input.expectedStateHash,
          status: 'started',
          startedAt: now(),
        })
        return { status: 'started' as const }
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error
        const existing = await dispatches.findOne({ _id: id })
        if (!existing || existing.payloadHash !== input.marker.payloadHash || existing.claimToken !== input.claimToken) {
          scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_CONFLICT')
        }
        return { status: 'existing_uncommitted' as const }
      }
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
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const marker = await dispatches.findOne({ _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'started' }, { session } as any)
          if (!marker) scientificError('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
          const updatedBatch = await batches.updateOne(
            { manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash },
            { $set: {
              state: structuredClone(input.nextState), stateHash: input.nextState.stateHash, stateTransitionFromHash: input.expectedStateHash,
              status: input.nextState.status, updatedAt: now(), claimHeartbeatAt: now(), claimLeaseExpiresAt: new Date(now().getTime() + claimLeaseMs),
            } },
            { session },
          )
          if (updatedBatch.modifiedCount !== 1) scientificError('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
          const updatedMarker = await dispatches.updateOne(
            { _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'started', expectedStateHash: input.expectedStateHash },
            { $set: {
              status: 'committed', attempt: structuredClone(input.attempt), state: structuredClone(input.nextState), committedAt: now(),
              ...(input.artifactRecovery ? { artifactRecovery: structuredClone(input.artifactRecovery) } : {}),
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
          const updatedBatch = await batches.updateOne(
            { manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash },
            { $set: {
              state: structuredClone(input.nextState), stateHash: input.nextState.stateHash, stateTransitionFromHash: input.expectedStateHash,
              status: input.nextState.status, updatedAt: now(), claimHeartbeatAt: now(), claimLeaseExpiresAt: new Date(now().getTime() + claimLeaseMs),
            } },
            { session },
          )
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
