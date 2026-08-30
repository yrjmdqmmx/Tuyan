import { createHmac, timingSafeEqual } from 'node:crypto'

import { SCIENTIFIC_BENCHMARK_IDENTITY, canonicalHash } from '@paperbanana/benchmark-core'

import {
  assertBoundedScientificV2PlainData,
  assertExactScientificV2Keys,
  assertScientificV2Iso,
  deepFreezeScientificV2,
  isScientificV2Hash,
  scientificV2Error,
} from './scientific-v2-common.js'
import { verifyScientificCodexImportAttestation, type importScientificCodexArtifacts } from './scientific-v2-codex.js'
import type { ScientificV2BatchManifest, ScientificV2BatchState } from './scientific-v2-manifest.js'
import { verifyScientificV2BatchManifest, verifyScientificV2BatchState } from './scientific-v2-manifest.js'

const REPORT_PAYLOAD_KEYS = [
  'schemaVersion', 'identity', 'kind', 'batchId', 'batchManifestHash', 'revision', 'previousStateHash',
  'stateHash', 'state', 'providerCanaryAttestation', 'executionOrderAttestation', 'codexProvenance',
  'disclosure', 'createdAt',
] as const

type ScientificV2StateReportPayload = {
  schemaVersion: 2
  identity: typeof SCIENTIFIC_BENCHMARK_IDENTITY
  kind: 'worker' | 'codex'
  batchId: string
  batchManifestHash: string
  revision: number
  previousStateHash: string
  stateHash: string
  state: Record<string, unknown>
  providerCanaryAttestation: Record<string, unknown>
  executionOrderAttestation: Record<string, unknown>
  codexProvenance: Record<string, unknown> | null
  disclosure: Record<string, unknown> | null
  createdAt: string
}

export type ScientificV2StateOperationReport = ScientificV2StateReportPayload & { reportHash: string }

export type ScientificV2SignedStateOperationReport = {
  report: ScientificV2StateOperationReport
  reportHash: string
  attestationHash: string
}

function reportRecord(value: unknown, code: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) scientificV2Error(code)
}

function assertAttestationSecret(secret: unknown): asserts secret is string {
  if (typeof secret !== 'string' || secret.trim() !== secret
    || Buffer.byteLength(secret, 'utf8') < 32 || Buffer.byteLength(secret, 'utf8') > 4096) {
    scientificV2Error('SCIENTIFIC_V2_OPERATOR_REPORT_SECRET_INVALID')
  }
}

export function assertScientificV2StateOperationReportMetadata(value: unknown): asserts value is {
  batchId: string; revision: number; createdAt: string; attestationSecret: string
} {
  assertExactScientificV2Keys(value, ['batchId', 'revision', 'createdAt', 'attestationSecret'], 'SCIENTIFIC_V2_OPERATOR_REPORT_INPUT_INVALID')
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/.test(String(value.batchId || ''))
    || !Number.isInteger(value.revision) || (value.revision as number) < 1) {
    scientificV2Error('SCIENTIFIC_V2_OPERATOR_REPORT_INPUT_INVALID')
  }
  assertScientificV2Iso(value.createdAt, 'SCIENTIFIC_V2_OPERATOR_REPORT_INPUT_INVALID')
  assertAttestationSecret(value.attestationSecret)
}

function safeHashEqual(actual: unknown, expected: string) {
  return typeof actual === 'string' && isScientificV2Hash(actual)
    && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

export function normalizeScientificV2StateOperationReport(value: unknown): ScientificV2StateOperationReport {
  assertBoundedScientificV2PlainData(value, {
    maxDepth: 16, maxNodes: 200_000, maxArrayLength: 20_000, maxStringLength: 4_096,
  }, 'SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  reportRecord(value, 'SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  const hasReportHash = Object.hasOwn(value, 'reportHash')
  assertExactScientificV2Keys(value, hasReportHash ? [...REPORT_PAYLOAD_KEYS, 'reportHash'] : REPORT_PAYLOAD_KEYS, 'SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  const state = value.state
  reportRecord(state, 'SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  if (value.schemaVersion !== 2 || !['worker', 'codex'].includes(String(value.kind))
    || canonicalHash(value.identity) !== canonicalHash(SCIENTIFIC_BENCHMARK_IDENTITY)
    || typeof value.batchId !== 'string' || !value.batchId
    || !isScientificV2Hash(value.batchManifestHash)
    || !Number.isInteger(value.revision) || (value.revision as number) < 1
    || !isScientificV2Hash(value.previousStateHash)
    || !isScientificV2Hash(value.stateHash) || value.stateHash !== state.stateHash) {
    scientificV2Error('SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  }
  assertScientificV2Iso(value.createdAt, 'SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID')
  const payload = Object.fromEntries(REPORT_PAYLOAD_KEYS.map((key) => [key, structuredClone(value[key])])) as ScientificV2StateReportPayload
  const reportHash = canonicalHash(payload)
  if (hasReportHash && value.reportHash !== reportHash) scientificV2Error('SCIENTIFIC_V2_OPERATION_REPORT_HASH_INVALID')
  return deepFreezeScientificV2({ ...payload, reportHash })
}

export function scientificV2StateOperationReportHmacPayload(value: unknown) {
  return normalizeScientificV2StateOperationReport(value).reportHash
}

type ScientificV2CodexImportResult = Awaited<ReturnType<typeof importScientificCodexArtifacts>>

type ScientificV2StateOperationReportInput = {
  kind: 'worker' | 'codex'
  batchId: string
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  revision: number
  previousStateHash: string
  createdAt: string
  attestationSecret: string
  codexImport?: ScientificV2CodexImportResult
}

export function createScientificV2SignedStateOperationReport(input: ScientificV2StateOperationReportInput): ScientificV2SignedStateOperationReport {
  assertExactScientificV2Keys(input, [
    'kind', 'batchId', 'manifest', 'state', 'revision', 'previousStateHash', 'createdAt', 'attestationSecret',
    ...(input.kind === 'codex' ? ['codexImport'] : []),
  ], 'SCIENTIFIC_V2_OPERATOR_REPORT_INPUT_INVALID')
  assertAttestationSecret(input.attestationSecret)
  verifyScientificV2BatchManifest(input.manifest)
  verifyScientificV2BatchState(input.state, input.manifest)
  if (input.state.manifestHash !== input.manifest.manifestHash) scientificV2Error('SCIENTIFIC_V2_OPERATOR_REPORT_INPUT_INVALID')

  const providerCanarySlots = input.manifest.executionOrder.filter((slot) => slot.isProviderCanary)
  for (const canary of providerCanarySlots) {
    const stateSlot = input.state.slots.find((slot) => slot.slotId === canary.slotId)
    if (stateSlot?.status !== 'succeeded'
      || !['succeeded', 'succeeded_low_quality'].includes(stateSlot.attempts.at(-1)?.responseClass || '')) {
      scientificV2Error('SCIENTIFIC_V2_PROVIDER_CANARY_FAILED')
    }
  }
  const providerCanaries = providerCanarySlots
    .map((slot) => slot.provider)
    .filter((provider): provider is NonNullable<typeof provider> => provider !== null)
  const providers = [...new Set(providerCanaries)]
  const providerAttemptHashes = input.state.slots
    .filter((slot) => slot.provider !== 'codex')
    .flatMap((slot) => slot.attempts.map((attempt) => attempt.attemptHash))

  let codexProvenance: Record<string, unknown> | null = null
  let disclosure: Record<string, unknown> | null = null
  if (input.kind === 'codex') {
    const imported = input.codexImport
    if (!imported || imported.state !== input.state
      || imported.state.stateHash !== input.state.stateHash
      || imported.state.manifestHash !== input.manifest.manifestHash
      || !verifyScientificCodexImportAttestation(imported, imported.attestation.attestationHash)) {
      scientificV2Error('SCIENTIFIC_V2_OPERATOR_REPORT_CODEX_IMPORT_INVALID')
    }
    const codexSlots = input.state.slots.filter((slot) => slot.provider === 'codex')
    codexProvenance = {
      modelId: 'codex:gpt-image-2',
      successfulSlots: codexSlots.filter((slot) => slot.status === 'succeeded').length,
      toolCalls: codexSlots.reduce((sum, slot) => sum + slot.attempts.length, 0),
      firstCaseId: codexSlots[0]?.caseId,
      artifactCanaryHash: [...(codexSlots[0]?.attempts || [])].reverse()
        .find((attempt) => ['succeeded', 'succeeded_low_quality'].includes(attempt.responseClass))?.rawImageHash,
    }
    disclosure = { containsSecrets: false, automaticJudges: [], reviewerIdentity: null }
  } else if (input.codexImport !== undefined) {
    scientificV2Error('SCIENTIFIC_V2_OPERATOR_REPORT_INPUT_INVALID')
  }

  const report = normalizeScientificV2StateOperationReport({
    schemaVersion: 2,
    identity: { ...SCIENTIFIC_BENCHMARK_IDENTITY },
    kind: input.kind,
    batchId: input.batchId,
    batchManifestHash: input.manifest.manifestHash,
    revision: input.revision,
    previousStateHash: input.previousStateHash,
    stateHash: input.state.stateHash,
    state: input.state,
    providerCanaryAttestation: {
      providers,
      passed: true,
      attemptSetHash: canonicalHash(providerAttemptHashes),
    },
    executionOrderAttestation: { slotIds: input.state.slots.map((slot) => slot.slotId), passed: true },
    codexProvenance,
    disclosure,
    createdAt: input.createdAt,
  })
  const reportHash = report.reportHash
  const attestationHash = createHmac('sha256', input.attestationSecret).update(reportHash).digest('hex')
  return deepFreezeScientificV2({ report, reportHash, attestationHash })
}

export function verifyScientificV2SignedStateOperationReport(value: unknown, attestationSecret: string) {
  try {
    assertAttestationSecret(attestationSecret)
    assertBoundedScientificV2PlainData(value, {
      maxDepth: 18, maxNodes: 200_010, maxArrayLength: 20_000, maxStringLength: 4_096,
    }, 'SCIENTIFIC_V2_OPERATOR_REPORT_SCHEMA_INVALID')
    assertExactScientificV2Keys(value, ['report', 'reportHash', 'attestationHash'], 'SCIENTIFIC_V2_OPERATOR_REPORT_SCHEMA_INVALID')
    const report = normalizeScientificV2StateOperationReport(value.report)
    const expectedAttestationHash = createHmac('sha256', attestationSecret).update(report.reportHash).digest('hex')
    if (!safeHashEqual(value.reportHash, report.reportHash) || !safeHashEqual(value.attestationHash, expectedAttestationHash)) {
      scientificV2Error('SCIENTIFIC_V2_OPERATOR_REPORT_ATTESTATION_INVALID')
    }
    return true
  } catch {
    return false
  }
}
