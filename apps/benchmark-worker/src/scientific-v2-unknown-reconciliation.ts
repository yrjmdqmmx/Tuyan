import { canonicalHash } from '@paperbanana/benchmark-core'

import {
  refreshScientificV2StateHash,
  verifyScientificV2BatchState,
  type ScientificV2BatchManifest,
  type ScientificV2BatchState,
} from './scientific-v2-manifest.js'

export interface ScientificV2UnknownNoArtifactEvidence {
  workflowRunId: number
  candidateCount: 0
  spoolCandidateCount: 0
  credentialStatus: 200
  reconciledAt: string
}

function fail(): never { throw new Error('SCIENTIFIC_V2_UNKNOWN_RECONCILIATION_INVALID') }

export function reconcileScientificV2UnknownNoArtifact(
  source: ScientificV2BatchState,
  manifest: ScientificV2BatchManifest,
  evidence: ScientificV2UnknownNoArtifactEvidence,
) {
  verifyScientificV2BatchState(source, manifest)
  if (source.status !== 'paused' || source.pauseReason !== 'reconciliation_required'
    || source.blockReason !== null || !Number.isSafeInteger(evidence.workflowRunId) || evidence.workflowRunId <= 0
    || evidence.candidateCount !== 0 || evidence.spoolCandidateCount !== 0 || evidence.credentialStatus !== 200
    || Number.isNaN(Date.parse(evidence.reconciledAt))) fail()
  const state = structuredClone(source)
  const unknownIndexes = state.slots.flatMap((slot, index) => slot.status === 'unknown' ? [index] : [])
  if (unknownIndexes.length !== 1) fail()
  const unknownIndex = unknownIndexes[0]
  const slot = state.slots[unknownIndex]
  const attempt = slot.attempts.at(-1)
  if (!attempt || attempt.responseClass !== 'unknown_provider_outcome' || attempt.actualCny !== null
    || attempt.rawImageHash !== null || attempt.byteSize !== null || attempt.width !== null
    || attempt.height !== null || attempt.format !== null || attempt.attemptIndex > 4) fail()

  const originalAttempt = structuredClone(attempt)
  const { attemptHash: _oldAttemptHash, ...attemptBase } = attempt
  attemptBase.responseClass = 'confirmed_technical_failure'
  Object.assign(attempt, attemptBase, { attemptHash: canonicalHash(attemptBase) })
  slot.status = attempt.attemptIndex === 4 ? 'failed' : 'retrying'
  for (const later of state.slots.slice(unknownIndex + 1)) {
    if (later.status !== 'not_executed') fail()
    later.status = 'pending'
  }
  state.status = 'running'
  state.pauseReason = null
  state.updatedAt = evidence.reconciledAt
  refreshScientificV2StateHash(state)
  verifyScientificV2BatchState(state, manifest)
  const auditBase = {
    schemaVersion: 1,
    kind: 'unknown_no_artifact_reconciliation',
    manifestHash: manifest.manifestHash,
    previousStateHash: source.stateHash,
    stateHash: state.stateHash,
    slotId: slot.slotId,
    sequence: slot.sequence,
    originalAttempt,
    reconciledAttempt: structuredClone(attempt),
    evidence: structuredClone(evidence),
  }
  return Object.freeze({
    state: Object.freeze(state),
    audit: Object.freeze({ ...auditBase, auditHash: canonicalHash(auditBase) }),
  })
}
