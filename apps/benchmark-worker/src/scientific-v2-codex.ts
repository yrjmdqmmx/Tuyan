import { PB_SCIENTIFIC_FIGURE_V2, canonicalHash } from '@paperbanana/benchmark-core'

import { assertDenseScientificV2Array, assertExactScientificV2Keys, assertScientificV2Iso, deepFreezeScientificV2, inspectScientificV2Image, isScientificV2Hash, scientificV2Error } from './scientific-v2-common.js'
import { refreshScientificV2StateHash, verifyScientificV2BatchManifest, verifyScientificV2BatchState, type ScientificV2Attempt, type ScientificV2BatchManifest, type ScientificV2BatchState } from './scientific-v2-manifest.js'

const PUBLIC_CODEX_IDENTITY = 'OpenAI GPT Image 2 · Codex 内置渠道'
const CODEX_RESPONSE_CLASSES = ['succeeded', 'succeeded_low_quality', 'confirmed_technical_failure', 'confirmed_provider_failure'] as const
export const SCIENTIFIC_V2_CODEX_MAX_DECODED_BYTES = 192 * 1024 * 1024

interface CodexToolCall {
  slotId: string; caseId: string; attemptIndex: number
  responseClass: typeof CODEX_RESPONSE_CLASSES[number]
  payloadHash: string; bytes: Buffer | null; sha256: string | null; format: string | null
  width: number | null; height: number | null; startedAt: string; completedAt: string
  sourceHash?: string; editedHash?: string | null
}

function assertToolCallKeys(value: unknown, kind: 'generation' | 'edit'): asserts value is CodexToolCall {
  assertExactScientificV2Keys(value, kind === 'generation'
    ? ['slotId', 'caseId', 'attemptIndex', 'responseClass', 'payloadHash', 'bytes', 'sha256', 'format', 'width', 'height', 'startedAt', 'completedAt']
    : ['slotId', 'caseId', 'attemptIndex', 'responseClass', 'payloadHash', 'bytes', 'sha256', 'format', 'width', 'height', 'startedAt', 'completedAt', 'sourceHash', 'editedHash'],
  'SCIENTIFIC_V2_CODEX_TOOL_CALL_SCHEMA_INVALID')
}

function expectedPayloadHash(manifestHash: string, scientificCase: typeof PB_SCIENTIFIC_FIGURE_V2.cases[number]) {
  return canonicalHash({ manifestHash, slotId: `codex:gpt-image-2:${scientificCase.id}`, caseManifestHash: scientificCase.manifestHash })
}

async function normalizeToolCall(call: unknown, scientificCase: typeof PB_SCIENTIFIC_FIGURE_V2.cases[number], manifestHash: string) {
  assertToolCallKeys(call, scientificCase.kind)
  if (call.slotId !== `codex:gpt-image-2:${scientificCase.id}` || call.caseId !== scientificCase.id
    || !Number.isInteger(call.attemptIndex) || call.attemptIndex < 1 || call.attemptIndex > 4
    || !CODEX_RESPONSE_CLASSES.includes(call.responseClass)
    || call.payloadHash !== expectedPayloadHash(manifestHash, scientificCase)) scientificV2Error('SCIENTIFIC_V2_CODEX_SLOT_SET_INVALID')
  assertScientificV2Iso(call.startedAt, 'SCIENTIFIC_V2_CODEX_ARTIFACT_TIME_INVALID')
  assertScientificV2Iso(call.completedAt, 'SCIENTIFIC_V2_CODEX_ARTIFACT_TIME_INVALID')
  if (call.completedAt < call.startedAt) scientificV2Error('SCIENTIFIC_V2_CODEX_ARTIFACT_TIME_INVALID')
  const success = call.responseClass === 'succeeded' || call.responseClass === 'succeeded_low_quality'
  let image: Awaited<ReturnType<typeof inspectScientificV2Image>> | null = null
  if (success) {
    image = await inspectScientificV2Image(call.bytes)
    if (image.rawImageHash !== call.sha256) scientificV2Error('SCIENTIFIC_V2_CODEX_ARTIFACT_HASH_MISMATCH')
    if (image.format !== call.format || image.width !== call.width || image.height !== call.height) scientificV2Error('SCIENTIFIC_V2_CODEX_ARTIFACT_METADATA_MISMATCH')
  } else if (call.bytes !== null || call.sha256 !== null || call.format !== null || call.width !== null || call.height !== null) {
    scientificV2Error('SCIENTIFIC_V2_CODEX_FAILED_CALL_ARTIFACT_FORBIDDEN')
  }
  if (scientificCase.kind === 'edit'
    && (call.sourceHash !== scientificCase.sourceHash || (success ? call.editedHash !== image!.rawImageHash : call.editedHash !== null))) {
    scientificV2Error('SCIENTIFIC_V2_CODEX_EDIT_BINDING_INVALID')
  }
  const base: Omit<ScientificV2Attempt, 'attemptHash'> = {
    attemptIndex: call.attemptIndex, provider: 'codex', model: 'gpt-image-2', operation: scientificCase.kind,
    payloadHash: call.payloadHash, responseClass: call.responseClass, estimatedCny: 0, actualCny: 0,
    startedAt: call.startedAt, completedAt: call.completedAt, rawImageHash: image?.rawImageHash ?? null,
    byteSize: image?.byteSize ?? null, width: image?.width ?? null, height: image?.height ?? null,
    format: image?.format ?? null, sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null,
    editedHash: scientificCase.kind === 'edit' && image ? image.rawImageHash : null,
  }
  return { attempt: { ...base, attemptHash: canonicalHash(base) }, decodedByteSize: image?.decodedByteSize ?? 0 }
}

const ATTEMPT_KEYS = [
  'attemptIndex', 'provider', 'model', 'operation', 'payloadHash', 'responseClass', 'estimatedCny', 'actualCny',
  'startedAt', 'completedAt', 'rawImageHash', 'byteSize', 'width', 'height', 'format', 'sourceHash', 'editedHash', 'attemptHash',
] as const

function codexAttemptHashIsValid(value: unknown) {
  try {
    assertExactScientificV2Keys(value, ATTEMPT_KEYS, 'SCIENTIFIC_V2_CODEX_ATTESTATION_INVALID')
    const { attemptHash, ...base } = value
    return isScientificV2Hash(attemptHash) && canonicalHash(base) === attemptHash
  } catch {
    return false
  }
}

export function verifyScientificCodexImportAttestation(value: unknown, expectedAttestationHash: string) {
  try {
    if (!value || typeof value !== 'object' || !isScientificV2Hash(expectedAttestationHash)) throw new Error('invalid')
    const result = value as Record<string, unknown>
    const attestation = result.attestation
    assertExactScientificV2Keys(attestation, [
      'schemaVersion', 'manifestHash', 'sourceStateHash', 'importedStateHash', 'provenanceHash', 'toolCallOrderHash',
      'toolCalls', 'decodedBytes', 'attestationHash',
    ], 'SCIENTIFIC_V2_CODEX_ATTESTATION_INVALID')
    const { attestationHash, ...attestationBase } = attestation
    if (attestation.schemaVersion !== 1 || attestationHash !== expectedAttestationHash
      || canonicalHash(attestationBase) !== attestationHash || !isScientificV2Hash(attestation.manifestHash)
      || !isScientificV2Hash(attestation.sourceStateHash) || !isScientificV2Hash(attestation.importedStateHash)
      || !isScientificV2Hash(attestation.provenanceHash) || !isScientificV2Hash(attestation.toolCallOrderHash)
      || !Number.isInteger(attestation.toolCalls) || (attestation.toolCalls as number) < 1 || (attestation.toolCalls as number) > 36
      || !Number.isSafeInteger(attestation.decodedBytes) || (attestation.decodedBytes as number) < 0
      || (attestation.decodedBytes as number) > SCIENTIFIC_V2_CODEX_MAX_DECODED_BYTES) throw new Error('invalid')

    assertExactScientificV2Keys(result.provenance, ['taskId', 'threadId', 'modelAlias', 'totalToolCalls'], 'SCIENTIFIC_V2_CODEX_ATTESTATION_INVALID')
    if (canonicalHash(result.provenance) !== attestation.provenanceHash) throw new Error('invalid')
    assertDenseScientificV2Array(result.attempts, 36, 'SCIENTIFIC_V2_CODEX_ATTESTATION_INVALID')
    if (result.attempts.length !== attestation.toolCalls || result.attempts.some((attempt) => !codexAttemptHashIsValid(attempt))
      || canonicalHash(result.attempts.map((attempt) => (attempt as ScientificV2Attempt).attemptHash)) !== attestation.toolCallOrderHash) throw new Error('invalid')

    const state = result.state
    if (!state || typeof state !== 'object') throw new Error('invalid')
    const stateRecord = state as Record<string, unknown>
    const { stateHash, ...stateBase } = stateRecord
    if (stateHash !== attestation.importedStateHash || canonicalHash(stateBase) !== stateHash
      || stateRecord.manifestHash !== attestation.manifestHash || !Array.isArray(stateRecord.slots)) throw new Error('invalid')
    const stateCodexAttemptHashes = (stateRecord.slots as Array<Record<string, unknown>>)
      .filter((slot) => slot.provider === 'codex')
      .flatMap((slot) => Array.isArray(slot.attempts) ? slot.attempts.map((attempt) => (attempt as ScientificV2Attempt).attemptHash) : [])
    if (canonicalHash(stateCodexAttemptHashes) !== attestation.toolCallOrderHash) throw new Error('invalid')
  } catch {
    scientificV2Error('SCIENTIFIC_V2_CODEX_ATTESTATION_INVALID')
  }
  return true
}

export async function importScientificCodexArtifacts(input: unknown) {
  assertExactScientificV2Keys(input, ['manifestHash', 'stateHash', 'manifest', 'state', 'provenance', 'toolCalls'], 'SCIENTIFIC_V2_CODEX_IMPORT_SCHEMA_INVALID')
  const manifest = input.manifest as ScientificV2BatchManifest
  const sourceState = input.state as ScientificV2BatchState
  verifyScientificV2BatchManifest(manifest)
  verifyScientificV2BatchState(sourceState, manifest)
  if (input.manifestHash !== manifest.manifestHash || input.stateHash !== sourceState.stateHash
    || sourceState.manifestHash !== manifest.manifestHash || sourceState.status !== 'awaiting_artifacts') scientificV2Error('SCIENTIFIC_V2_CODEX_BATCH_BINDING_INVALID')
  assertExactScientificV2Keys(input.provenance, ['taskId', 'threadId', 'modelAlias', 'totalToolCalls'], 'SCIENTIFIC_V2_CODEX_PROVENANCE_INVALID')
  const provenance = input.provenance
  if (typeof provenance.taskId !== 'string' || !provenance.taskId.trim()
    || typeof provenance.threadId !== 'string' || !provenance.threadId.trim() || provenance.taskId === provenance.threadId
    || provenance.modelAlias !== 'gpt-image-2' || !Number.isInteger(provenance.totalToolCalls)
    || (provenance.totalToolCalls as number) < 1 || (provenance.totalToolCalls as number) > 36) scientificV2Error('SCIENTIFIC_V2_CODEX_PROVENANCE_INVALID')
  assertDenseScientificV2Array(input.toolCalls, 36, 'SCIENTIFIC_V2_CODEX_TOOL_CALL_LIMIT')
  if (input.toolCalls.length !== provenance.totalToolCalls) scientificV2Error('SCIENTIFIC_V2_CODEX_TOOL_CALL_LIMIT')
  const state = structuredClone(sourceState)
  const codexSlots = state.slots.filter((slot) => slot.provider === 'codex')
  if (codexSlots.length !== 9 || codexSlots.some((slot) => slot.status !== 'awaiting_artifact' || slot.attempts.length !== 0 || slot.costCny !== null)) scientificV2Error('SCIENTIFIC_V2_CODEX_BATCH_BINDING_INVALID')
  const allAttempts: ScientificV2Attempt[] = []
  const attemptsBySlot: ScientificV2Attempt[][] = codexSlots.map(() => [])
  let slotIndex = 0
  let previousCompletedAt: string | null = null
  let decodedBytes = 0
  for (const rawCall of input.toolCalls) {
    if (!rawCall || typeof rawCall !== 'object') scientificV2Error('SCIENTIFIC_V2_CODEX_TOOL_CALL_ORDER_INVALID')
    const rawSlotId = (rawCall as Record<string, unknown>).slotId
    const expectedSlot = codexSlots[slotIndex]
    if (rawSlotId !== expectedSlot?.slotId) {
      const previousAttempts = attemptsBySlot[slotIndex]
      const previousLast = previousAttempts.at(-1)
      if (slotIndex === 0 && previousLast && !['succeeded', 'succeeded_low_quality'].includes(previousLast.responseClass)) {
        scientificV2Error('SCIENTIFIC_V2_CODEX_CANARY_FAILED')
      }
      const previousSlotComplete = previousLast && (['succeeded', 'succeeded_low_quality'].includes(previousLast.responseClass)
        || (previousAttempts.length === 4 && ['confirmed_technical_failure', 'confirmed_provider_failure'].includes(previousLast.responseClass)))
      if (!previousSlotComplete
        || rawSlotId !== codexSlots[slotIndex + 1]?.slotId) scientificV2Error('SCIENTIFIC_V2_CODEX_TOOL_CALL_ORDER_INVALID')
      slotIndex += 1
    }
    const scientificCase = PB_SCIENTIFIC_FIGURE_V2.cases[slotIndex]
    const slotAttempts = attemptsBySlot[slotIndex]
    const previousInSlot = slotAttempts.at(-1)
    if (previousInSlot && !['confirmed_technical_failure', 'confirmed_provider_failure'].includes(previousInSlot.responseClass)) {
      scientificV2Error('SCIENTIFIC_V2_CODEX_ATTEMPT_SEQUENCE_INVALID')
    }
    const normalized = await normalizeToolCall(rawCall, scientificCase, manifest.manifestHash)
    const attempt = normalized.attempt
    if (attempt.attemptIndex !== slotAttempts.length + 1) scientificV2Error('SCIENTIFIC_V2_CODEX_ATTEMPT_SEQUENCE_INVALID')
    if (previousCompletedAt !== null && attempt.startedAt < previousCompletedAt) scientificV2Error('SCIENTIFIC_V2_CODEX_TOOL_CALL_TIME_OVERLAP')
    previousCompletedAt = attempt.completedAt
    decodedBytes += normalized.decodedByteSize
    if (!Number.isSafeInteger(decodedBytes) || decodedBytes > SCIENTIFIC_V2_CODEX_MAX_DECODED_BYTES) {
      scientificV2Error('SCIENTIFIC_V2_CODEX_DECODED_BYTES_LIMIT_EXCEEDED')
    }
    slotAttempts.push(attempt)
    allAttempts.push(attempt)
  }
  const canaryLast = attemptsBySlot[0].at(-1)
  if (!canaryLast) scientificV2Error('SCIENTIFIC_V2_CODEX_CANARY_REQUIRED')
  if (!['succeeded', 'succeeded_low_quality'].includes(canaryLast.responseClass)) scientificV2Error('SCIENTIFIC_V2_CODEX_CANARY_FAILED')
  if (attemptsBySlot.some((attempts) => attempts.length < 1 || attempts.length > 4)) scientificV2Error('SCIENTIFIC_V2_CODEX_SLOT_SET_INVALID')

  for (let index = 0; index < PB_SCIENTIFIC_FIGURE_V2.cases.length; index += 1) {
    const slot = codexSlots[index]
    const attempts = attemptsBySlot[index]
    const last = attempts.at(-1)!
    const succeeded = last.responseClass === 'succeeded' || last.responseClass === 'succeeded_low_quality'
    if (!succeeded && (attempts.length !== 4 || !['confirmed_technical_failure', 'confirmed_provider_failure'].includes(last.responseClass))) scientificV2Error('SCIENTIFIC_V2_CODEX_ATTEMPT_SEQUENCE_INVALID')
    slot.attempts = attempts
    slot.costCny = 0
    slot.status = succeeded ? 'succeeded' : 'failed'
  }
  if (allAttempts.length !== input.toolCalls.length) scientificV2Error('SCIENTIFIC_V2_CODEX_SLOT_SET_INVALID')
  state.status = 'completed'; state.pauseReason = null; state.blockReason = null
  refreshScientificV2StateHash(state)
  const frozenState = deepFreezeScientificV2(state)
  verifyScientificV2BatchState(frozenState, manifest)
  const returnedProvenance = {
    taskId: provenance.taskId as string,
    threadId: provenance.threadId as string,
    modelAlias: 'gpt-image-2' as const,
    totalToolCalls: provenance.totalToolCalls as number,
  }
  const attestationBase = {
    schemaVersion: 1 as const,
    manifestHash: manifest.manifestHash,
    sourceStateHash: sourceState.stateHash,
    importedStateHash: frozenState.stateHash,
    provenanceHash: canonicalHash(returnedProvenance),
    toolCallOrderHash: canonicalHash(allAttempts.map((attempt) => attempt.attemptHash)),
    toolCalls: allAttempts.length,
    decodedBytes,
  }
  const result = deepFreezeScientificV2({
    publicIdentity: PUBLIC_CODEX_IDENTITY, modelId: 'codex:gpt-image-2' as const,
    provenance: returnedProvenance,
    disclosure: { floatingAlias: true as const, apiRequestIdAvailable: false as const, fixedSnapshotAvailable: false as const },
    toolCalls: allAttempts.length, attempts: allAttempts, state: frozenState, automaticJudgeCalls: 0 as const,
    attestation: { ...attestationBase, attestationHash: canonicalHash(attestationBase) },
  })
  verifyScientificCodexImportAttestation(result, result.attestation.attestationHash)
  return result
}
