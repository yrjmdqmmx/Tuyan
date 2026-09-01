import assert from 'node:assert/strict'
import test from 'node:test'

import { canonicalHash } from '@paperbanana/benchmark-core'

import { refreshScientificV2StateHash, verifyScientificV2BatchState } from '../src/scientific-v2-manifest.js'
import { reconcileScientificV2UnknownNoArtifact } from '../src/scientific-v2-unknown-reconciliation.js'
import { productionBatchFixture } from './scientific-v2-production-fixture.js'

function pausedUnknownFixture() {
  const fixture = productionBatchFixture(1)
  const state = structuredClone(fixture.state)
  const slot = state.slots[0]
  const scientificCase = fixture.manifest.cases[0]
  assert.equal(scientificCase.kind, 'generation')
  if (scientificCase.kind !== 'generation') throw new Error('fixture')
  const attemptBase = {
    attemptIndex: 1, provider: slot.provider!, model: slot.modelId!, operation: slot.operation,
    payloadHash: canonicalHash({
      route: { provider: slot.provider, modelId: slot.modelId }, operation: slot.operation, imageSize: slot.imageSize,
      caseId: scientificCase.id, instruction: scientificCase.instruction,
      negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio,
    }),
    responseClass: 'unknown_provider_outcome', estimatedCny: 1, actualCny: null,
    startedAt: '2026-08-30T00:01:00.000Z', completedAt: '2026-08-30T00:01:10.000Z',
    rawImageHash: null, byteSize: null, width: null, height: null, format: null,
    sourceHash: null, editedHash: null,
  }
  slot.status = 'unknown'
  slot.costCny = 1
  slot.attempts = [{ ...attemptBase, attemptHash: canonicalHash(attemptBase) }]
  for (const later of state.slots.slice(1)) later.status = 'not_executed'
  state.providerSpentCny.bailian = 1
  state.status = 'paused'
  state.pauseReason = 'reconciliation_required'
  state.updatedAt = '2026-08-30T00:01:10.000Z'
  refreshScientificV2StateHash(state)
  verifyScientificV2BatchState(state, fixture.manifest)
  return { ...fixture, state }
}

test('human zero-artifact reconciliation preserves the attempt and resumes at the next attempt without provider calls', () => {
  const fixture = pausedUnknownFixture()
  const result = reconcileScientificV2UnknownNoArtifact(fixture.state, fixture.manifest, {
    workflowRunId: 33453726938, candidateCount: 0, spoolCandidateCount: 0, credentialStatus: 200,
    reconciledAt: '2026-09-01T00:15:00.000Z',
  })
  assert.equal(result.state.status, 'running')
  assert.equal(result.state.pauseReason, null)
  assert.equal(result.state.slots[0].status, 'retrying')
  assert.equal(result.state.slots[0].attempts[0].responseClass, 'confirmed_technical_failure')
  assert.equal(result.state.slots[0].attempts.length, 1)
  assert.ok(result.state.slots.slice(1).every((slot) => slot.status === 'pending'))
  assert.equal(result.state.providerSpentCny.bailian, 1)
  assert.equal(result.audit.originalAttempt.responseClass, 'unknown_provider_outcome')
  assert.match(result.audit.auditHash, /^[a-f0-9]{64}$/)
  verifyScientificV2BatchState(result.state, fixture.manifest)
})

test('reconciliation rejects non-zero candidates, invalid credential evidence and exhausted attempts', () => {
  const fixture = pausedUnknownFixture()
  const base = { workflowRunId: 1, candidateCount: 0 as const, spoolCandidateCount: 0 as const, credentialStatus: 200 as const,
    reconciledAt: '2026-09-01T00:15:00.000Z' }
  assert.throws(() => reconcileScientificV2UnknownNoArtifact(fixture.state, fixture.manifest, { ...base, candidateCount: 1 as never }))
  assert.throws(() => reconcileScientificV2UnknownNoArtifact(fixture.state, fixture.manifest, { ...base, credentialStatus: 500 as never }))
})

test('the fourth manually reconciled unknown becomes a final failed slot and never dispatches a fifth attempt', () => {
  const fixture = pausedUnknownFixture()
  const manifest = structuredClone(fixture.manifest)
  const slot = fixture.state.slots[0]
  slot.isProviderCanary = false
  manifest.executionOrder[0].isProviderCanary = false
  const original = structuredClone(slot.attempts[0])
  slot.attempts = Array.from({ length: 4 }, (_, index) => {
    const { attemptHash: _hash, ...base } = structuredClone(original)
    base.attemptIndex = index + 1
    base.responseClass = index === 3 ? 'unknown_provider_outcome' : 'confirmed_technical_failure'
    return { ...base, attemptHash: canonicalHash(base) }
  })
  slot.costCny = 4
  fixture.state.providerSpentCny.bailian = 4
  refreshScientificV2StateHash(fixture.state)
  verifyScientificV2BatchState(fixture.state, manifest)
  const result = reconcileScientificV2UnknownNoArtifact(fixture.state, manifest, {
    workflowRunId: 4, candidateCount: 0, spoolCandidateCount: 0, credentialStatus: 200,
    reconciledAt: '2026-09-01T00:20:00.000Z',
  })
  assert.equal(result.state.slots[0].status, 'failed')
  assert.equal(result.state.slots[0].attempts.length, 4)
  assert.equal(result.state.slots[0].attempts[3].responseClass, 'confirmed_technical_failure')
  assert.ok(result.state.slots.slice(1).every((candidate) => candidate.status === 'pending'))
  verifyScientificV2BatchState(result.state, manifest)
})
