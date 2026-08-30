import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import sharp from 'sharp'

import {
  PB_SCIENTIFIC_FIGURE_V2,
  buildScientificV2CanonicalManifest,
  canonicalHash,
} from '@paperbanana/benchmark-core'

import * as Worker from '../src/index.js'
import type { ScientificV2BatchState, ScientificV2PriceSnapshot } from '../src/index.js'

const H64 = (letter: string) => letter.repeat(64)
const CREATED_AT = '2026-08-30T00:00:00.000Z'
const LOCK_NAME = '/run/lock/paperbanana-hk-production.lock'

function canonicalManifest() {
  return buildScientificV2CanonicalManifest({
    registryVersion: '2026-08-30.codex-quality',
    registryHash: H64('1'),
    registry: { providers: { bailian: { models: [{
      id: 'quality-image-model',
      label: 'Quality image model',
      vendor: 'Quality vendor',
      selectable: true,
      roles: ['image'] as const,
      capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
    }] } } },
  })
}

function priceSnapshot(): ScientificV2PriceSnapshot {
  const entries = (['generation', 'edit'] as const).map((operation) => {
    const base = {
      provider: 'bailian' as const,
      modelId: 'quality-image-model',
      operation,
      currency: 'CNY' as const,
      unitCny: 1,
      source: `https://prices.example/quality-image-model/${operation}`,
      sourceVerified: true,
    }
    return { ...base, entryHash: canonicalHash(base) }
  })
  const base = { currency: 'CNY' as const, capturedAt: CREATED_AT, entries }
  return { ...base, snapshotHash: canonicalHash(base) }
}

async function awaitingBatch(providerBytes: Buffer) {
  const canonical = canonicalManifest()
  const providerModel = canonical.models.find((model) => model.canonicalModelId !== 'codex:gpt-image-2')!
  const registryBase = {
    registryVersion: canonical.registryVersion,
    registryHash: canonical.registryHash,
    registry: { providers: { bailian: { models: [{
      id: 'quality-image-model',
      label: providerModel.displayName,
      vendor: providerModel.developer,
      canonicalModelId: providerModel.canonicalModelId,
      selectable: true,
      roles: ['image'] as const,
      capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
    }] } } },
  }
  const built = Worker.buildScientificV2Batch({
    canonicalManifest: canonical,
    registrySnapshot: { ...registryBase, snapshotHash: canonicalHash(registryBase) },
    suite: PB_SCIENTIFIC_FIGURE_V2,
    codeSha: 'a'.repeat(40),
    priceSnapshot: priceSnapshot(),
    createdAt: CREATED_AT,
    lockName: LOCK_NAME,
  })
  const ran = await Worker.runScientificV2Batch({
    manifest: built.manifest,
    state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} },
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 'quality-lock' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { return { responseClass: 'succeeded' as const, actualCny: 1, bytes: providerBytes } } },
  })
  return { manifest: ran.manifest, state: ran.state as ScientificV2BatchState }
}

function isoAt(seconds: number) {
  return new Date(Date.parse(CREATED_AT) + seconds * 1000).toISOString()
}

async function artifactInput(options: {
  width?: number
  height?: number
  firstFailures?: number
  finalCanaryFailure?: boolean
  failedSlotIndex?: number
} = {}) {
  const width = options.width ?? 2048
  const height = options.height ?? 1024
  const bytes = await sharp({ create: { width, height, channels: 3, background: '#5b8def' } }).png().toBuffer()
  const providerBytes = width === 2048 && height === 1024
    ? bytes
    : await sharp({ create: { width: 2048, height: 1024, channels: 3, background: '#5b8def' } }).png().toBuffer()
  const { manifest, state } = await awaitingBatch(providerBytes)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const toolCalls: Array<Record<string, unknown>> = []
  let callSequence = 0
  for (let caseIndex = 0; caseIndex < PB_SCIENTIFIC_FIGURE_V2.cases.length; caseIndex += 1) {
    const scientificCase = PB_SCIENTIFIC_FIGURE_V2.cases[caseIndex]
    const failureCount = caseIndex === 0 ? options.firstFailures ?? 0 : 0
    const finalFailure = (caseIndex === 0 && options.finalCanaryFailure) || caseIndex === options.failedSlotIndex
    const attempts = finalFailure ? 4 : failureCount + 1
    for (let attemptIndex = 1; attemptIndex <= attempts; attemptIndex += 1) {
      const failure = attemptIndex <= failureCount || finalFailure
      const call: Record<string, unknown> = {
        slotId: `codex:gpt-image-2:${scientificCase.id}`,
        caseId: scientificCase.id,
        attemptIndex,
        responseClass: failure ? 'confirmed_provider_failure' : 'succeeded',
        payloadHash: canonicalHash({
          manifestHash: manifest.manifestHash,
          slotId: `codex:gpt-image-2:${scientificCase.id}`,
          caseManifestHash: scientificCase.manifestHash,
        }),
        bytes: failure ? null : bytes,
        sha256: failure ? null : sha256,
        format: failure ? null : 'png',
        width: failure ? null : width,
        height: failure ? null : height,
        startedAt: isoAt(callSequence * 2),
        completedAt: isoAt(callSequence * 2 + 1),
      }
      if (scientificCase.kind === 'edit') {
        call.sourceHash = scientificCase.sourceHash
        call.editedHash = failure ? null : sha256
      }
      toolCalls.push(call)
      callSequence += 1
    }
    if (caseIndex === 0 && options.finalCanaryFailure) break
  }
  return {
    manifestHash: manifest.manifestHash,
    stateHash: state.stateHash,
    manifest,
    state,
    provenance: {
      taskId: 'codex-task-quality-v2',
      threadId: 'codex-thread-quality-v2',
      modelAlias: 'gpt-image-2',
      totalToolCalls: toolCalls.length,
    },
    toolCalls,
  }
}

test('rejects input audit calls that are not in fixed manifest slot order', async () => {
  const input = await artifactInput()
  ;[input.toolCalls[0], input.toolCalls[1]] = [input.toolCalls[1], input.toolCalls[0]]
  await assert.rejects(() => Worker.importScientificCodexArtifacts(input), /SCIENTIFIC_V2_CODEX_TOOL_CALL_ORDER_INVALID/)
})

test('rejects non-contiguous attempts and globally overlapping tool calls', async () => {
  const gap = await artifactInput({ firstFailures: 1 })
  gap.toolCalls[1].attemptIndex = 3
  await assert.rejects(() => Worker.importScientificCodexArtifacts(gap), /SCIENTIFIC_V2_CODEX_ATTEMPT_SEQUENCE_INVALID/)

  const overlap = await artifactInput({ firstFailures: 1 })
  overlap.toolCalls[1].startedAt = overlap.toolCalls[0].startedAt
  await assert.rejects(() => Worker.importScientificCodexArtifacts(overlap), /SCIENTIFIC_V2_CODEX_TOOL_CALL_TIME_OVERLAP/)
})

test('requires a decoded and verified successful canary before any later slot', async () => {
  const input = await artifactInput({ finalCanaryFailure: true })
  const later = await artifactInput()
  input.toolCalls.push(later.toolCalls[1])
  input.provenance.totalToolCalls = input.toolCalls.length
  await assert.rejects(() => Worker.importScientificCodexArtifacts(input), /SCIENTIFIC_V2_CODEX_CANARY_FAILED/)
})

test('allows a later slot to exhaust four confirmed attempts while preserving subsequent manifest order', async () => {
  const input = await artifactInput({ failedSlotIndex: 1 })
  const result = await Worker.importScientificCodexArtifacts(input)
  const codexSlots = result.state.slots.filter((slot) => slot.provider === 'codex')
  assert.equal(codexSlots[1].status, 'failed')
  assert.equal(codexSlots[1].attempts.length, 4)
  assert.equal(codexSlots[2].status, 'succeeded')
})

test('preserves raw audit order, accepts a confirmed canary retry and valid non-16:9 2048x1024 output, and binds attestation', async () => {
  const input = await artifactInput({ width: 2048, height: 1024, firstFailures: 1 })
  const result = await Worker.importScientificCodexArtifacts(input)
  assert.deepEqual(result.attempts.map((attempt) => attempt.responseClass), [
    'confirmed_provider_failure',
    'succeeded',
    ...Array(8).fill('succeeded'),
  ])
  assert.deepEqual(result.attempts.map((attempt) => attempt.startedAt), input.toolCalls.map((call) => call.startedAt))
  const canarySlot = result.state.slots.find((slot) => slot.provider === 'codex')!
  assert.equal(canarySlot.attempts.length, 2)
  assert.equal(canarySlot.attempts[1].width, 2048)
  assert.equal(canarySlot.attempts[1].height, 1024)

  const verify = (Worker as unknown as Record<string, unknown>).verifyScientificCodexImportAttestation
  assert.equal(typeof verify, 'function')
  const attestation = (result as unknown as { attestation?: Record<string, unknown> }).attestation
  assert.ok(attestation)
  assert.match(String(attestation.provenanceHash), /^[a-f0-9]{64}$/)
  assert.match(String(attestation.toolCallOrderHash), /^[a-f0-9]{64}$/)
  assert.match(String(attestation.attestationHash), /^[a-f0-9]{64}$/)
  assert.equal(attestation.sourceStateHash, input.stateHash)
  assert.equal(attestation.importedStateHash, result.state.stateHash)
  assert.equal((verify as (value: unknown, expected: string) => boolean)(result, String(attestation.attestationHash)), true)

  const provenanceTamper = structuredClone(result)
  provenanceTamper.provenance.taskId = 'tampered-task'
  assert.throws(() => (verify as (value: unknown, expected: string) => boolean)(provenanceTamper, String(attestation.attestationHash)), /SCIENTIFIC_V2_CODEX_ATTESTATION_INVALID/)
  const orderTamper = structuredClone(result)
  orderTamper.attempts.reverse()
  assert.throws(() => (verify as (value: unknown, expected: string) => boolean)(orderTamper, String(attestation.attestationHash)), /SCIENTIFIC_V2_CODEX_ATTESTATION_INVALID/)
  const stateTamper = structuredClone(result)
  stateTamper.state.slots.find((slot) => slot.provider === 'codex')!.attempts.reverse()
  assert.throws(() => (verify as (value: unknown, expected: string) => boolean)(stateTamper, String(attestation.attestationHash)), /SCIENTIFIC_V2_CODEX_ATTESTATION_INVALID/)
})

test('rejects a batch whose aggregate decoded artifact bytes exceed the Codex cap', async () => {
  const input = await artifactInput({ width: 4096, height: 2048, firstFailures: 3 })
  const cap = (Worker as unknown as Record<string, unknown>).SCIENTIFIC_V2_CODEX_MAX_DECODED_BYTES
  assert.equal(typeof cap, 'number')
  await assert.rejects(() => Worker.importScientificCodexArtifacts(input), /SCIENTIFIC_V2_CODEX_DECODED_BYTES_LIMIT_EXCEEDED/)
})
