import { canonicalHash } from '@paperbanana/benchmark-core'

import { UnknownProviderOutcomeError } from './provider-operation.js'
import {
  deepFreezeScientificV2,
  inspectScientificV2Image,
  scientificV2CnyFromUnits,
  scientificV2CnyToUnits,
  scientificV2Error,
} from './scientific-v2-common.js'
import {
  refreshScientificV2StateHash,
  verifyScientificV2BatchState,
  verifyScientificV2BatchManifest,
  type ScientificV2Attempt,
  type ScientificV2BatchManifest,
  type ScientificV2BatchState,
  type ScientificV2PriceEntry,
} from './scientific-v2-manifest.js'

export class ScientificConfirmedFailureError extends Error {
  readonly responseClass: 'confirmed_technical_failure' | 'confirmed_provider_failure'
  readonly actualCny: number | null

  constructor(message: string, facts: { responseClass: string; actualCny?: number | null }) {
    super(message)
    if (!['confirmed_technical_failure', 'confirmed_provider_failure'].includes(facts.responseClass)) {
      scientificV2Error('SCIENTIFIC_V2_CONFIRMED_RESPONSE_CLASS_INVALID')
    }
    this.name = 'ScientificConfirmedFailureError'
    this.responseClass = facts.responseClass as 'confirmed_technical_failure' | 'confirmed_provider_failure'
    this.actualCny = facts.actualCny ?? null
  }
}

export class ScientificV2ArtifactReconciliationRequiredError extends Error {
  readonly bytes: Buffer | null
  readonly actualCny: number | null
  readonly spoolBinding: ScientificV2ArtifactSpoolBinding | null

  constructor(bytes: Buffer | null = null, actualCny: number | null = null, spoolBinding: ScientificV2ArtifactSpoolBinding | null = null) {
    super('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_REQUIRED')
    this.name = 'ScientificV2ArtifactReconciliationRequiredError'
    this.bytes = bytes
    this.actualCny = actualCny
    this.spoolBinding = spoolBinding
  }
}

export interface ScientificV2ArtifactSpoolBinding {
  spoolId: string
  imageHash: string
  format: 'png' | 'jpeg' | 'webp'
  byteSize: number
}

export interface ScientificV2ExecutorRequest {
  slotId: string
  canonicalModelId: string
  caseId: string
  provider: 'bailian' | 'ark' | 'openrouter'
  modelId: string
  operation: 'generation' | 'edit'
  attemptIndex: number
  payloadHash: string
  instruction: string
  negativePrompt?: string
  aspectRatio?: string
  sourceHash?: string
  region?: string
  estimatedCny: number
}

export interface ScientificV2RunnerDependencies {
  repository: ScientificV2RunnerRepository | { save(state: ScientificV2BatchState): Promise<void> }
  recorder: {
    recordAttempt(attempt: ScientificV2Attempt): Promise<void>
    recordUnsupported(conclusion: { slotId: string; caseId: string; canonicalModelId: string; status: 'unsupported'; reason: 'direct_edit_route_unavailable'; costCny: 0 }): Promise<void>
  }
  lock: {
    leaseMs?: number
    heartbeatIntervalMs?: number
    acquire(name: string): Promise<string>
    heartbeat(token: string): Promise<void>
    release(token: string): Promise<void>
  }
  executor: {
    execute(request: ScientificV2ExecutorRequest): Promise<{
      responseClass: 'succeeded' | 'succeeded_low_quality'
      actualCny: number
      bytes: Buffer
    }>
  }
}

export type ScientificV2AtomicRunnerDependencies = Omit<ScientificV2RunnerDependencies, 'repository'> & {
  repository: ScientificV2RunnerRepository
}

interface ScientificV2RunnerAttestation {
  enabled: boolean
  concurrency: number
  lockName: string
  repositoryMode?: 'atomic-v2'
  batchId?: string
  revision?: number
}

export interface ScientificV2DispatchMarker {
  manifestHash: string
  slotId: string
  attemptIndex: number
  payloadHash: string
}

export interface ScientificV2RunnerRepository {
  claimReady(input: { manifestHash: string; expectedReadyStateHash: string }): Promise<{
    claimToken: string; state: ScientificV2BatchState; batchId?: string; revision?: number
  } | null>
  saveClaimed(input: { claimToken: string; expectedStateHash: string; nextState: ScientificV2BatchState }): Promise<ScientificV2BatchState>
  beginDispatch(input: { claimToken: string; expectedStateHash: string; marker: ScientificV2DispatchMarker }): Promise<{ status: 'started' | 'existing_uncommitted' }>
  commitAttempt(input: {
    claimToken: string
    expectedStateHash: string
    marker: ScientificV2DispatchMarker
    attempt: ScientificV2Attempt
    nextState: ScientificV2BatchState
    artifactRecovery?: ScientificV2ArtifactSpoolBinding
  }): Promise<ScientificV2BatchState>
  resolveDispatch(input: {
    claimToken: string
    marker: ScientificV2DispatchMarker
  }): Promise<{ status: 'committed'; state: ScientificV2BatchState } | { status: 'started' }>
  heartbeatClaim?(input: { manifestHash: string; claimToken: string }): Promise<void>
  markUnknown(input: {
    claimToken: string
    expectedStateHash: string
    marker: ScientificV2DispatchMarker
    attempt: ScientificV2Attempt
    conservativeCny: number
    nextState: ScientificV2BatchState
  }): Promise<ScientificV2BatchState>
  recordReleaseFailure(input: { manifestHash: string; claimToken: string | null; failureClass: 'lock_release_failed' }): Promise<void>
}

function priceFor(manifest: ScientificV2BatchManifest, slot: ScientificV2BatchState['slots'][number]) {
  if (!slot.provider || slot.provider === 'codex' || !slot.modelId) scientificV2Error('SCIENTIFIC_V2_PRICE_MISSING')
  const found = manifest.priceSnapshot.entries.find((entry: ScientificV2PriceEntry) => entry.provider === slot.provider
    && entry.modelId === slot.modelId && entry.operation === slot.operation)
  if (!found) scientificV2Error('SCIENTIFIC_V2_PRICE_MISSING')
  return found.unitCny
}

function attemptRecord(input: Omit<ScientificV2Attempt, 'attemptHash'>): ScientificV2Attempt {
  return { ...input, attemptHash: canonicalHash(input) }
}

function nowIso() {
  return new Date().toISOString()
}

function createStateSnapshot(state: ScientificV2BatchState) {
  const snapshot = structuredClone(state)
  snapshot.updatedAt = nowIso()
  refreshScientificV2StateHash(snapshot)
  return deepFreezeScientificV2(snapshot)
}

function markFollowingNotExecuted(state: ScientificV2BatchState, sequence: number) {
  for (const later of state.slots) {
    if (later.sequence > sequence && (later.status === 'pending' || later.status === 'awaiting_artifact')) later.status = 'not_executed'
  }
}

function buildPayload(manifest: ScientificV2BatchManifest, slot: ScientificV2BatchState['slots'][number]) {
  const scientificCase = manifest.cases.find((candidate) => candidate.id === slot.caseId)
  if (!scientificCase) scientificV2Error('SCIENTIFIC_V2_SLOT_CASE_INVALID')
  const publicPayload = {
    route: { provider: slot.provider, modelId: slot.modelId },
    operation: slot.operation,
    caseId: scientificCase.id,
    instruction: scientificCase.instruction,
    ...(scientificCase.kind === 'generation'
      ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
      : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
  }
  return { scientificCase, payloadHash: canonicalHash(publicPayload) }
}

function addCny(left: number, right: number) {
  return scientificV2CnyFromUnits(scientificV2CnyToUnits(left) + scientificV2CnyToUnits(right))
}

function chargeAttempt(state: ScientificV2BatchState, provider: 'bailian' | 'ark' | 'openrouter', amount: number) {
  state.providerSpentCny[provider] = addCny(state.providerSpentCny[provider], amount)
}

function isAtomicRepository(value: ScientificV2RunnerDependencies['repository']): value is ScientificV2RunnerRepository {
  return 'claimReady' in value && typeof value.claimReady === 'function'
}

interface LegacyRepositoryState {
  authoritative: ScientificV2BatchState
  markers: Map<string, { status: 'started' | 'committed' | 'unknown'; state?: ScientificV2BatchState }>
}

const legacyRepositoryStates = new WeakMap<object, LegacyRepositoryState>()

class ScientificDispatchResolutionFailedError extends Error {
  constructor() {
    super('SCIENTIFIC_V2_DISPATCH_RESOLUTION_FAILED')
    this.name = 'ScientificDispatchResolutionFailedError'
  }
}

class ScientificDispatchStillStartedError extends Error {
  constructor() {
    super('SCIENTIFIC_V2_DISPATCH_STILL_STARTED')
    this.name = 'ScientificDispatchStillStartedError'
  }
}

function repositoryAdapter(repository: ScientificV2RunnerDependencies['repository'], initial: ScientificV2BatchState) {
  if (isAtomicRepository(repository)) return { repository, atomic: true }
  let stored = legacyRepositoryStates.get(repository)
  if (!stored) {
    stored = { authoritative: initial, markers: new Map() }
    legacyRepositoryStates.set(repository, stored)
  }
  const legacy = stored
  const persist = async (nextState: ScientificV2BatchState) => {
    legacy.authoritative = nextState
    await repository.save(nextState)
    return nextState
  }
  const adapter: ScientificV2RunnerRepository = {
    async claimReady(input) {
      if (legacy.authoritative.manifestHash !== input.manifestHash || legacy.authoritative.stateHash !== input.expectedReadyStateHash
        || legacy.authoritative.status !== 'ready') return null
      const running = structuredClone(legacy.authoritative)
      running.status = 'running'
      const snapshot = createStateSnapshot(running)
      await persist(snapshot)
      return { claimToken: canonicalHash([input.manifestHash, input.expectedReadyStateHash]), state: snapshot }
    },
    async saveClaimed(input) {
      if (legacy.authoritative.stateHash !== input.expectedStateHash) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      return persist(input.nextState)
    },
    async beginDispatch(input) {
      if (legacy.authoritative.stateHash !== input.expectedStateHash) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      const key = canonicalHash(input.marker)
      if (legacy.markers.has(key)) return { status: 'existing_uncommitted' }
      legacy.markers.set(key, { status: 'started' })
      return { status: 'started' }
    },
    async commitAttempt(input) {
      const key = canonicalHash(input.marker)
      const existing = legacy.markers.get(key)
      if (existing?.status === 'committed') return existing.state!
      if (legacy.authoritative.stateHash !== input.expectedStateHash) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      if (existing?.status !== 'started') scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
      const state = await persist(input.nextState)
      legacy.markers.set(key, { status: 'committed', state })
      return state
    },
    async resolveDispatch(input) {
      const existing = legacy.markers.get(canonicalHash(input.marker))
      if (existing?.status === 'committed') return { status: 'committed', state: existing.state! }
      if (existing?.status === 'started') return { status: 'started' }
      scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
    },
    async markUnknown(input) {
      const key = canonicalHash(input.marker)
      if (legacy.authoritative.stateHash !== input.expectedStateHash || legacy.markers.get(key)?.status !== 'started') {
        scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      }
      const state = await persist(input.nextState)
      legacy.markers.set(key, { status: 'unknown', state })
      return state
    },
    async recordReleaseFailure() {},
  }
  return { repository: adapter, atomic: false }
}

async function executeWithHeartbeat<T>(
  lock: ScientificV2RunnerDependencies['lock'],
  lockToken: string,
  heartbeatClaim: () => Promise<void>,
  execute: () => Promise<T>,
) {
  const leaseMs = lock.leaseMs ?? 120_000
  const heartbeatIntervalMs = lock.heartbeatIntervalMs ?? Math.min(15_000, Math.floor(leaseMs / 3))
  if (!Number.isInteger(leaseMs) || !Number.isInteger(heartbeatIntervalMs) || heartbeatIntervalMs < 1 || leaseMs < 2
    || heartbeatIntervalMs >= leaseMs) scientificV2Error('SCIENTIFIC_V2_LOCK_LEASE_INVALID')
  let heartbeatFailure: unknown = null
  let heartbeatChain = Promise.resolve()
  const heartbeat = () => {
    heartbeatChain = heartbeatChain.then(async () => {
      await Promise.all([lock.heartbeat(lockToken), heartbeatClaim()])
    }).catch((error: unknown) => { heartbeatFailure = error })
  }
  await Promise.all([lock.heartbeat(lockToken), heartbeatClaim()])
  const timer = setInterval(heartbeat, heartbeatIntervalMs)
  timer.unref()
  try {
    const result = await execute()
    await heartbeatChain
    if (heartbeatFailure) throw heartbeatFailure
    return result
  } finally {
    clearInterval(timer)
  }
}

async function runScientificV2BatchInternal(input: {
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  attestation: ScientificV2RunnerAttestation
} & ScientificV2RunnerDependencies) {
  verifyScientificV2BatchManifest(input.manifest)
  verifyScientificV2BatchState(input.state, input.manifest)
  const lockToken = await input.lock.acquire(input.manifest.lockName)
  let claimToken: string | null = null
  const adapted = repositoryAdapter(input.repository, input.state)
  try {
    const claim = await adapted.repository.claimReady({ manifestHash: input.manifest.manifestHash, expectedReadyStateHash: input.state.stateHash })
    if (!claim) scientificV2Error('SCIENTIFIC_V2_STATE_ALREADY_CLAIMED')
    claimToken = claim.claimToken
    if (typeof claimToken !== 'string' || !claimToken || !Object.isFrozen(claim.state)) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_SNAPSHOT_INVALID')
    if (input.attestation.batchId !== undefined
      && (claim.batchId !== input.attestation.batchId || claim.revision !== input.attestation.revision)) {
      scientificV2Error('SCIENTIFIC_V2_OPERATOR_REPORT_BATCH_BINDING_INVALID')
    }
    verifyScientificV2BatchState(claim.state, input.manifest)
    if (claim.state.status !== 'running') scientificV2Error('SCIENTIFIC_V2_REPOSITORY_SNAPSHOT_INVALID')
    let authoritative = claim.state
    let state = structuredClone(authoritative)
    let lastTransitionFromHash: string | null = null

    const acceptPersisted = (persisted: ScientificV2BatchState) => {
      if (!Object.isFrozen(persisted)) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_SNAPSHOT_INVALID')
      verifyScientificV2BatchState(persisted, input.manifest)
      authoritative = persisted
      state = structuredClone(persisted)
      return persisted
    }
    const saveClaimed = async () => {
      const expectedStateHash = authoritative.stateHash
      const persisted = acceptPersisted(await adapted.repository.saveClaimed({
        claimToken: claimToken!, expectedStateHash, nextState: createStateSnapshot(state),
      }))
      lastTransitionFromHash = expectedStateHash
      return persisted
    }
    const commitAttempt = async (marker: ScientificV2DispatchMarker, attempt: ScientificV2Attempt, artifactRecovery?: ScientificV2ArtifactSpoolBinding) => {
      if (!adapted.atomic) await input.recorder.recordAttempt(attempt)
      const expectedStateHash = authoritative.stateHash
      const nextState = createStateSnapshot(state)
      try {
        const persisted = acceptPersisted(await adapted.repository.commitAttempt({
          claimToken: claimToken!, expectedStateHash, marker, attempt, nextState, artifactRecovery,
        }))
        lastTransitionFromHash = expectedStateHash
        return persisted
      } catch {
        let resolution: Awaited<ReturnType<ScientificV2RunnerRepository['resolveDispatch']>>
        try {
          resolution = await adapted.repository.resolveDispatch({ claimToken: claimToken!, marker })
        } catch {
          throw new ScientificDispatchResolutionFailedError()
        }
        if (resolution.status === 'committed') {
          const persisted = acceptPersisted(resolution.state)
          lastTransitionFromHash = expectedStateHash
          return persisted
        }
        throw new ScientificDispatchStillStartedError()
      }
    }
    const pauseUnknown = async (
      marker: ScientificV2DispatchMarker,
      slotId: string,
      scientificCase: ScientificV2BatchManifest['cases'][number],
      provider: 'bailian' | 'ark' | 'openrouter',
      modelId: string,
      estimatedCny: number,
      startedAt: string,
    ) => {
      state = structuredClone(authoritative)
      const slot = state.slots.find((candidate) => candidate.slotId === slotId)
      if (!slot) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
      const attempt = attemptRecord({
        attemptIndex: marker.attemptIndex, provider, model: modelId, operation: slot.operation, payloadHash: marker.payloadHash,
        responseClass: 'unknown_provider_outcome', estimatedCny, actualCny: null, startedAt, completedAt: nowIso(),
        rawImageHash: null, byteSize: null, width: null, height: null, format: null,
        sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null, editedHash: null,
      })
      slot.attempts.push(attempt)
      slot.costCny = addCny(slot.costCny || 0, estimatedCny)
      chargeAttempt(state, provider, estimatedCny)
      slot.status = 'unknown'
      state.status = 'paused'
      state.pauseReason = 'reconciliation_required'
      markFollowingNotExecuted(state, slot.sequence)
      const expectedStateHash = authoritative.stateHash
      const persisted = await adapted.repository.markUnknown({
        claimToken: claimToken!, expectedStateHash,
        marker, attempt, conservativeCny: estimatedCny, nextState: createStateSnapshot(state),
      })
      const accepted = acceptPersisted(persisted)
      lastTransitionFromHash = expectedStateHash
      return accepted
    }

    const runResult = (persisted: ScientificV2BatchState) => {
      if (!lastTransitionFromHash) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_TRANSITION_INVALID')
      return { state: persisted, manifest: input.manifest, previousStateHash: lastTransitionFromHash }
    }

    for (const frozenSlot of input.manifest.executionOrder) {
      let slot = state.slots.find((candidate) => candidate.slotId === frozenSlot.slotId)
      if (!slot || slot.sequence !== frozenSlot.sequence) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
      if (['succeeded', 'unsupported', 'failed'].includes(slot.status)) continue
      if (slot.status === 'awaiting_artifact' && slot.provider === 'codex') continue
      if (!['pending', 'retrying'].includes(slot.status)) scientificV2Error('SCIENTIFIC_V2_RESUME_STATE_INVALID')
      if (slot.provider === 'codex') {
        slot.status = 'awaiting_artifact'
        await saveClaimed()
        continue
      }
      if (!slot.supported) {
        slot.status = 'unsupported'
        slot.costCny = 0
        await input.recorder.recordUnsupported({
          slotId: slot.slotId,
          caseId: slot.caseId,
          canonicalModelId: slot.canonicalModelId,
          status: 'unsupported',
          reason: 'direct_edit_route_unavailable',
          costCny: 0,
        })
        await saveClaimed()
        continue
      }
      if (!slot.provider || !slot.modelId) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
      const provider = slot.provider
      const modelId = slot.modelId

      const estimatedCny = priceFor(input.manifest, slot)
      const { scientificCase, payloadHash } = buildPayload(input.manifest, slot)
      const firstAttemptIndex = slot.status === 'retrying' ? slot.attempts.length + 1 : 1
      for (let attemptIndex = firstAttemptIndex; attemptIndex <= 4; attemptIndex += 1) {
        const dispatchSlot = slot
        if (scientificV2CnyToUnits(state.providerSpentCny[provider]) + scientificV2CnyToUnits(estimatedCny)
          > scientificV2CnyToUnits(input.manifest.providerBudgetsCny[provider])) {
          slot.status = 'budget_blocked'
          markFollowingNotExecuted(state, slot.sequence)
          state.status = 'blocked'
          state.blockReason = 'provider_budget_exceeded_before_attempt'
          const persisted = await saveClaimed()
          return runResult(persisted)
        }
        const marker: ScientificV2DispatchMarker = { manifestHash: input.manifest.manifestHash, slotId: dispatchSlot.slotId, attemptIndex, payloadHash }
        const startedAt = nowIso()
        let dispatch
        try {
          dispatch = await adapted.repository.beginDispatch({ claimToken, expectedStateHash: authoritative.stateHash, marker })
        } catch {
          const persisted = await pauseUnknown(marker, dispatchSlot.slotId, scientificCase, provider, modelId, estimatedCny, startedAt)
          return runResult(persisted)
        }
        if (dispatch.status !== 'started') {
          const persisted = await pauseUnknown(marker, dispatchSlot.slotId, scientificCase, provider, modelId, estimatedCny, startedAt)
          return runResult(persisted)
        }

        let output: Awaited<ReturnType<ScientificV2RunnerDependencies['executor']['execute']>> | null = null
        let confirmedFailure: ScientificConfirmedFailureError | null = null
        let artifactFailure: ScientificV2ArtifactReconciliationRequiredError | null = null
        try {
          output = await executeWithHeartbeat(input.lock, lockToken, async () => {
            await adapted.repository.heartbeatClaim?.({ manifestHash: input.manifest.manifestHash, claimToken: claimToken! })
          }, () => input.executor.execute({
            slotId: dispatchSlot.slotId,
            canonicalModelId: dispatchSlot.canonicalModelId,
            caseId: dispatchSlot.caseId,
            provider,
            modelId,
            operation: dispatchSlot.operation,
            attemptIndex,
            payloadHash,
            estimatedCny,
            instruction: scientificCase.instruction,
            ...(scientificCase.kind === 'generation'
              ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
              : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
          }))
          if (!['succeeded', 'succeeded_low_quality'].includes(output.responseClass)
          ) scientificV2Error('SCIENTIFIC_V2_EXECUTOR_RESULT_INVALID')
          scientificV2CnyToUnits(output.actualCny, 'SCIENTIFIC_V2_EXECUTOR_RESULT_INVALID')
          const image = await inspectScientificV2Image(output.bytes)
          const { decodedByteSize: _decodedByteSize, ...imageFacts } = image
          const priceDrift = scientificV2CnyToUnits(output.actualCny) > scientificV2CnyToUnits(estimatedCny)
            || scientificV2CnyToUnits(state.providerSpentCny[provider]) + scientificV2CnyToUnits(output.actualCny)
              > scientificV2CnyToUnits(input.manifest.providerBudgetsCny[provider])
          const attempt = attemptRecord({
            attemptIndex,
            provider,
            model: modelId,
            operation: dispatchSlot.operation,
            payloadHash,
            responseClass: priceDrift ? 'price_reconciliation_required' : output.responseClass,
            estimatedCny,
            actualCny: output.actualCny,
            startedAt,
            completedAt: nowIso(),
            ...imageFacts,
            sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null,
            editedHash: scientificCase.kind === 'edit' ? imageFacts.rawImageHash : null,
          })
          dispatchSlot.attempts.push(attempt)
          if (priceDrift) {
            state.providerUnreconciledCny[provider] = addCny(state.providerUnreconciledCny[provider], output.actualCny)
            dispatchSlot.status = 'price_reconciliation'
            markFollowingNotExecuted(state, dispatchSlot.sequence)
            state.status = 'paused'
            state.pauseReason = 'price_reconciliation_required'
            const persisted = await commitAttempt(marker, attempt)
            return runResult(persisted)
          }
          dispatchSlot.costCny = addCny(dispatchSlot.costCny || 0, output.actualCny)
          chargeAttempt(state, provider, output.actualCny)
          dispatchSlot.status = 'succeeded'
          await commitAttempt(marker, attempt)
          break
        } catch (error) {
          if (error instanceof ScientificConfirmedFailureError) confirmedFailure = error
          else if (error instanceof ScientificV2ArtifactReconciliationRequiredError) artifactFailure = error
          else {
            if (error instanceof ScientificDispatchResolutionFailedError) throw error
            const persisted = await pauseUnknown(marker, dispatchSlot.slotId, scientificCase, provider, modelId, estimatedCny, startedAt)
            return runResult(persisted)
          }
        }
        if (artifactFailure) {
          if (!artifactFailure.bytes || artifactFailure.actualCny === null) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_INVALID')
          const image = await inspectScientificV2Image(artifactFailure.bytes)
          const { decodedByteSize: _decodedByteSize, ...imageFacts } = image
          const attempt = attemptRecord({
            attemptIndex, provider, model: modelId, operation: dispatchSlot.operation, payloadHash,
            responseClass: 'artifact_reconciliation_required', estimatedCny, actualCny: artifactFailure.actualCny,
            startedAt, completedAt: nowIso(), ...imageFacts,
            sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null,
            editedHash: scientificCase.kind === 'edit' ? imageFacts.rawImageHash : null,
          })
          dispatchSlot.attempts.push(attempt)
          dispatchSlot.costCny = addCny(dispatchSlot.costCny || 0, artifactFailure.actualCny)
          chargeAttempt(state, provider, artifactFailure.actualCny)
          dispatchSlot.status = 'artifact_reconciliation'
          markFollowingNotExecuted(state, dispatchSlot.sequence)
          state.status = 'paused'
          state.pauseReason = 'artifact_reconciliation_required'
          const persisted = await commitAttempt(marker, attempt, artifactFailure.spoolBinding || undefined)
          return runResult(persisted)
        }
        if (confirmedFailure) {
          let attemptCommitted = false
          try {
          const actualCny = confirmedFailure.actualCny
          if (actualCny !== null) scientificV2CnyToUnits(actualCny, 'SCIENTIFIC_V2_EXECUTOR_RESULT_INVALID')
          const chargedCny = actualCny ?? estimatedCny
          const priceDrift = actualCny !== null && (scientificV2CnyToUnits(actualCny) > scientificV2CnyToUnits(estimatedCny)
            || scientificV2CnyToUnits(state.providerSpentCny[provider]) + scientificV2CnyToUnits(actualCny)
              > scientificV2CnyToUnits(input.manifest.providerBudgetsCny[provider]))
          const attempt = attemptRecord({
            attemptIndex, provider, model: modelId, operation: dispatchSlot.operation, payloadHash,
            responseClass: priceDrift ? 'price_reconciliation_required' : confirmedFailure.responseClass, estimatedCny, actualCny, startedAt, completedAt: nowIso(),
            rawImageHash: null, byteSize: null, width: null, height: null, format: null,
            sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null, editedHash: null,
          })
          dispatchSlot.attempts.push(attempt)
          if (priceDrift) {
            state.providerUnreconciledCny[provider] = addCny(state.providerUnreconciledCny[provider], actualCny!)
            dispatchSlot.status = 'price_reconciliation'
            markFollowingNotExecuted(state, dispatchSlot.sequence)
            state.status = 'paused'
            state.pauseReason = 'price_reconciliation_required'
            const persisted = await commitAttempt(marker, attempt)
            return runResult(persisted)
          }
          dispatchSlot.costCny = addCny(dispatchSlot.costCny || 0, chargedCny)
          chargeAttempt(state, provider, chargedCny)
          dispatchSlot.status = attemptIndex === 4 ? 'failed' : 'retrying'
          await commitAttempt(marker, attempt)
          attemptCommitted = true
          if (attemptIndex === 4 && dispatchSlot.isProviderCanary) {
            state.status = 'blocked'
            state.blockReason = 'provider_canary_failed'
            markFollowingNotExecuted(state, dispatchSlot.sequence)
            const persisted = await saveClaimed()
            return runResult(persisted)
          }
          if (attemptIndex === 4) break
          slot = state.slots.find((candidate) => candidate.slotId === frozenSlot.slotId)
          if (!slot) scientificV2Error('SCIENTIFIC_V2_STATE_SLOT_INVALID')
          } catch (error) {
            if (attemptCommitted) throw error
            if (error instanceof ScientificDispatchResolutionFailedError) throw error
            const persisted = await pauseUnknown(marker, dispatchSlot.slotId, scientificCase, provider, modelId, estimatedCny, startedAt)
            return runResult(persisted)
          }
        }
      }
    }
    state.status = state.slots.some((slot) => slot.status === 'awaiting_artifact') ? 'awaiting_artifacts' : 'completed'
    const persisted = await saveClaimed()
    return runResult(persisted)
  } finally {
    try {
      await input.lock.release(lockToken)
    } catch {
      try {
        await adapted.repository.recordReleaseFailure({ manifestHash: input.manifest.manifestHash, claimToken, failureClass: 'lock_release_failed' })
      } catch {
        // The paid-operation result/error remains primary; release audit is best effort at this boundary.
      }
    }
  }
}

export function runScientificV2Batch(input: {
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  attestation: ScientificV2RunnerAttestation
} & ScientificV2RunnerDependencies) {
  if (!input.attestation || input.attestation.enabled !== false || input.attestation.concurrency !== 1
    || input.attestation.lockName !== input.manifest.lockName) scientificV2Error('SCIENTIFIC_V2_DISABLED_GATE_INVALID')
  if (input.attestation.repositoryMode === 'atomic-v2' && !isAtomicRepository(input.repository)) {
    scientificV2Error('SCIENTIFIC_V2_ATOMIC_REPOSITORY_REQUIRED')
  }
  return runScientificV2BatchInternal(input)
}
