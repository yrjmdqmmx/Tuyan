import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash, createHmac } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import sharp from 'sharp'

import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_EDIT_SOURCE,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  buildScientificV2PriceSnapshot,
  buildScientificV2CanonicalManifest,
  canonicalHash,
  createScientificReviewPacket,
  deriveScientificV2PriceRequirements,
} from '@paperbanana/benchmark-core'

import {
  ScientificConfirmedFailureError,
  UnknownProviderOutcomeError,
  assembleScientificBlindReviewerAssignment,
  buildScientificV2Batch,
  createScientificV2ProductionRunDependencies,
  createScientificBlindReviewPackages,
  createScientificReviewSourceBindings,
  executeScientificV2OperatorBundle,
  finalizeScientificDoubleReview,
  importScientificCodexArtifacts,
  runScientificV2Batch,
  renderScientificV2PublicEvidence,
  validateScientificReviewerResults,
  verifyScientificReviewIntegrityAttestation,
  verifyScientificV2BatchState,
  verifyScientificV2BatchManifest,
  type ScientificV2BatchState,
  type ScientificV2PriceSnapshot,
} from '../src/index.js'
import {
  assertExactScientificV2Keys,
  inspectScientificV2Image,
  scientificV2CnyFromUnits,
  scientificV2CnyToUnits,
} from '../src/scientific-v2-common.js'
import {
  createScientificV2SignedStateOperationReport,
  verifyScientificV2SignedStateOperationReport,
} from '../src/scientific-v2-state-report.js'
import { normalizeScientificV2SignedStateOperationReport as normalizeApiScientificV2SignedStateOperationReport } from '../../paperbanana-api/src/scientific-v2-repository.js'

const H64 = (letter: string) => letter.repeat(64)
const CODE_SHA = 'a'.repeat(40)
const CREATED_AT = '2026-08-30T00:00:00.000Z'
const LOCK_NAME = '/run/lock/paperbanana-hk-production.lock'
const REVIEW_PACKET_SIGNING_SECRET = 'p'.repeat(32)
const REVIEW_ATTESTATION_SECRET = 'r'.repeat(32)
const STATE_OPERATION_REPORT_SECRET = 's'.repeat(32)

function canonicalManifest(options: { providers?: Array<'bailian' | 'ark' | 'openrouter'>; directEdit?: boolean } = {}) {
  const providers = options.providers || ['bailian']
  const registryProviders = Object.fromEntries(providers.map((provider, index) => [provider, {
    models: [{
      id: `${provider}-scientific-${index + 1}`,
      label: `${provider} model`,
      vendor: `${provider} vendor`,
      selectable: true,
      roles: ['image'],
      capabilities: {
        imageGeneration: true,
        imageEditMode: options.directEdit === false ? 'none' : 'direct-edit',
        resolutions: ['2K'],
      },
    }],
  }]))
  return buildScientificV2CanonicalManifest({
    registryVersion: '2026-08-30.test',
    registryHash: H64('1'),
    registry: { providers: registryProviders },
  })
}

function priceSnapshot(manifest: ReturnType<typeof canonicalManifest>, unitCny = 1, verified = true): ScientificV2PriceSnapshot {
  const rateDecimal = unitCny.toFixed(12).replace(/0+$/, '').replace(/\.$/, '')
  const evidence = (url: string, character: string, mediaType = 'application/json') => ({
    url, mediaType, capturedAt: CREATED_AT, bytesSha256: H64(character),
  })
  const snapshot = buildScientificV2PriceSnapshot({
    canonicalManifest: manifest,
    capturedAt: CREATED_AT,
    observations: deriveScientificV2PriceRequirements(manifest).map((requirement, index) => {
      const source = evidence(`https://prices.example/${requirement.provider}/${requirement.modelId}/${requirement.operation}`, 'a')
      const common = {
        provider: requirement.provider, modelId: requirement.modelId, operation: requirement.operation,
        imageSize: requirement.imageSize, billingRegion: requirement.provider === 'openrouter' ? 'openrouter-global' : 'test-region',
        outputWidth: requirement.imageSize === '1K' ? 1280 : 2048,
        outputHeight: requirement.imageSize === '1K' ? 720 : 1152,
      }
      if (requirement.provider !== 'openrouter') return {
        ...common,
        charges: [{ billable: 'output_image' as const, unit: 'image' as const, rateDecimal, quantityDecimal: '1', resolutionTier: requirement.imageSize }],
        source, openRouterEvidence: null, fxEvidence: null,
      }
      const pricing = [{
        billable: 'output_image' as const,
        unit: 'image' as const,
        costUsd: rateDecimal,
        variant: requirement.imageSize === 'provider-default' ? null : requirement.imageSize,
      }]
      return {
        ...common,
        charges: pricing.map((line) => ({ billable: line.billable, unit: line.unit, rateDecimal: line.costUsd, quantityDecimal: '1', resolutionTier: line.variant })),
        source,
        openRouterEvidence: {
          modelApi: evidence('https://openrouter.ai/api/v1/images/models', 'b'), endpointApi: source,
          modelId: requirement.modelId, providerSlug: `fixture-${index}`, rawPricing: pricing, tokenBounds: null,
        },
        fxEvidence: {
          source: evidence('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', 'c', 'application/xml'),
          rateDate: '2026-08-30', baseCurrency: 'EUR' as const, usdPerBaseDecimal: '1', cnyPerBaseDecimal: '1',
        },
      }
    }),
  })
  if (!verified) {
    snapshot.entries[0].source.bytesSha256 = 'invalid'
    const { entryHash: _entryHash, ...entryBase } = snapshot.entries[0]
    snapshot.entries[0].entryHash = canonicalHash(entryBase)
    const { snapshotHash: _snapshotHash, ...snapshotBase } = snapshot
    snapshot.snapshotHash = canonicalHash(snapshotBase)
  }
  return snapshot
}

function registrySnapshot(manifest: ReturnType<typeof canonicalManifest>) {
  interface TestRegistryModel {
    id: string
    label: string
    vendor: string
    canonicalModelId: string
    selectable: boolean
    roles: string[]
    capabilities: { imageGeneration: boolean; imageEditMode: 'direct-edit' | 'analyze-redraw' | 'none'; resolutions: string[] }
  }
  const providers: Partial<Record<'bailian' | 'ark' | 'openrouter', { models: TestRegistryModel[] }>> = {}
  for (const model of manifest.models) {
    if (model.canonicalModelId === 'codex:gpt-image-2') continue
    for (const route of model.routes) {
      if (route.provider === 'codex') continue
      const provider = route.provider
      const entry = providers[provider] || { models: [] }
      entry.models.push({
        id: route.modelId,
        label: model.displayName,
        vendor: model.developer,
        canonicalModelId: model.canonicalModelId,
        selectable: true,
        roles: ['image'],
        capabilities: { imageGeneration: true, imageEditMode: route.editMode, resolutions: route.resolutions },
      })
      providers[provider] = entry
    }
  }
  const base = { registryVersion: manifest.registryVersion, registryHash: manifest.registryHash, registry: { providers } }
  return { ...base, snapshotHash: canonicalHash(base) }
}

function batchFor(manifest: ReturnType<typeof canonicalManifest>, unitCny = 1, verified = true) {
  return buildScientificV2Batch({
    canonicalManifest: manifest,
    registrySnapshot: registrySnapshot(manifest),
    suite: PB_SCIENTIFIC_FIGURE_V2,
    codeSha: CODE_SHA,
    priceSnapshot: priceSnapshot(manifest, unitCny, verified),
    createdAt: CREATED_AT,
    lockName: LOCK_NAME,
  })
}

function freezeStateSnapshot(state: ScientificV2BatchState): ScientificV2BatchState {
  Object.freeze(state.providerSpentCny)
  Object.freeze(state.providerUnreconciledCny)
  for (const slot of state.slots) {
    for (const attempt of slot.attempts) Object.freeze(attempt)
    Object.freeze(slot.attempts)
    Object.freeze(slot)
  }
  Object.freeze(state.slots)
  return Object.freeze(state)
}

function rehashStateSnapshot(state: ScientificV2BatchState) {
  const mutable = structuredClone(state)
  mutable.updatedAt = new Date().toISOString()
  const { stateHash: _oldStateHash, ...base } = mutable
  mutable.stateHash = canonicalHash(base)
  return freezeStateSnapshot(mutable)
}

function atomicRunnerRepository(initial: ScientificV2BatchState, options: { failFirstCommit?: boolean; persistThenThrowFirstCommit?: boolean } = {}) {
  let authoritative = initial
  let claimCounter = 0
  let failedCommit = false
  let lastPersisted: ScientificV2BatchState | null = null
  let releaseFailures = 0
  const markers = new Map<string, 'started' | 'committed' | 'unknown'>()
  const committedStates = new Map<string, ScientificV2BatchState>()
  const markerKey = (marker: { manifestHash: string; slotId: string; attemptIndex: number; payloadHash: string }) => canonicalHash(marker)
  const persist = (nextState: ScientificV2BatchState) => {
    authoritative = nextState
    lastPersisted = nextState
    return nextState
  }
  return {
    repository: {
      async claimReady(input: { manifestHash: string; expectedReadyStateHash: string }) {
        if (authoritative.manifestHash !== input.manifestHash || authoritative.stateHash !== input.expectedReadyStateHash || authoritative.status !== 'ready') return null
        const running = structuredClone(authoritative)
        running.status = 'running'
        const claimed = rehashStateSnapshot(running)
        persist(claimed)
        claimCounter += 1
        return { claimToken: `claim-${claimCounter}`, state: claimed }
      },
      async saveClaimed(input: { expectedStateHash: string; nextState: ScientificV2BatchState }) {
        assert.equal(authoritative.stateHash, input.expectedStateHash)
        return persist(input.nextState)
      },
      async beginDispatch(input: { expectedStateHash: string; marker: { manifestHash: string; slotId: string; attemptIndex: number; payloadHash: string } }) {
        assert.equal(authoritative.stateHash, input.expectedStateHash)
        const key = markerKey(input.marker)
        if (markers.has(key)) return { status: 'existing_uncommitted' as const }
        markers.set(key, 'started')
        return { status: 'started' as const }
      },
      async commitAttempt(input: { expectedStateHash: string; marker: { manifestHash: string; slotId: string; attemptIndex: number; payloadHash: string }; nextState: ScientificV2BatchState }) {
        const key = markerKey(input.marker)
        if (markers.get(key) === 'committed') return committedStates.get(key)!
        assert.equal(authoritative.stateHash, input.expectedStateHash)
        assert.equal(markers.get(key), 'started')
        if (options.failFirstCommit && !failedCommit) {
          failedCommit = true
          throw new Error('injected commit acknowledgement loss')
        }
        markers.set(key, 'committed')
        const persisted = persist(input.nextState)
        committedStates.set(key, persisted)
        if (options.persistThenThrowFirstCommit && !failedCommit) {
          failedCommit = true
          throw new Error('injected post-commit acknowledgement loss')
        }
        return persisted
      },
      async resolveDispatch(input: { marker: { manifestHash: string; slotId: string; attemptIndex: number; payloadHash: string } }) {
        const key = markerKey(input.marker)
        return markers.get(key) === 'committed'
          ? { status: 'committed' as const, state: committedStates.get(key)! }
          : { status: 'started' as const }
      },
      async markUnknown(input: { expectedStateHash: string; marker: { manifestHash: string; slotId: string; attemptIndex: number; payloadHash: string }; nextState: ScientificV2BatchState }) {
        assert.equal(authoritative.stateHash, input.expectedStateHash)
        const key = markerKey(input.marker)
        assert.equal(markers.get(key), 'started')
        markers.set(key, 'unknown')
        return persist(input.nextState)
      },
      async recordReleaseFailure() { releaseFailures += 1 },
      async save(state: ScientificV2BatchState) { lastPersisted = state },
    },
    get authoritative() { return authoritative },
    get lastPersisted() { return lastPersisted },
    get claimCount() { return claimCounter },
    get releaseFailures() { return releaseFailures },
    markers,
    committedStates,
  }
}

test('runner claims authoritative ready state once and atomically fences duplicate snapshots', async () => {
  const built = batchFor(canonicalManifest({ directEdit: false }))
  const fake = atomicRunnerRepository(built.state)
  const png = await sharp({ create: { width: 2048, height: 1024, channels: 3, background: '#abc123' } }).png().toBuffer()
  let providerCalls = 0
  const invocation = () => runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: fake.repository,
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { leaseMs: 100, heartbeatIntervalMs: 5, async acquire() { return 'claim-lock' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { providerCalls += 1; return { responseClass: 'succeeded' as const, actualCny: 1, bytes: png } }, },
  })
  const results = await Promise.allSettled([invocation(), invocation()])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1)
  assert.equal(fake.claimCount, 1)
  assert.equal(providerCalls, 6)
})

test('batch rebuilds the canonical manifest from its authoritative registry snapshot', () => {
  const original = canonicalManifest({ providers: ['bailian', 'ark'] })
  const authority = registrySnapshot(original)
  const deletedModel = structuredClone(original)
  deletedModel.models.splice(0, 1)
  deletedModel.canonicalModelCount = deletedModel.models.length
  deletedModel.rawRouteCount = deletedModel.models.reduce((sum, model) => sum + model.routes.length, 0)
  const { manifestHash: _oldManifestHash, ...base } = deletedModel
  deletedModel.manifestHash = canonicalHash(base)
  assert.throws(() => buildScientificV2Batch({
    canonicalManifest: deletedModel,
    registrySnapshot: authority,
    suite: PB_SCIENTIFIC_FIGURE_V2,
    codeSha: CODE_SHA,
    priceSnapshot: priceSnapshot(deletedModel),
    createdAt: CREATED_AT,
    lockName: LOCK_NAME,
  }), /SCIENTIFIC_V2_REGISTRY_CANONICAL_REBUILD_MISMATCH/)
})

test('runner turns every post-marker decode or commit ambiguity into one durable unknown outcome', async () => {
  for (const mode of ['decode', 'commit'] as const) {
    const built = batchFor(canonicalManifest({ directEdit: false }))
    const fake = atomicRunnerRepository(built.state, { failFirstCommit: mode === 'commit' })
    const invalid = Buffer.from('not-an-image')
    const png = await sharp({ create: { width: 2048, height: 1024, channels: 3, background: '#def456' } }).png().toBuffer()
    let providerCalls = 0
    const result = await runScientificV2Batch({
      manifest: built.manifest, state: built.state,
      attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME }, repository: fake.repository,
      recorder: { async recordAttempt() {}, async recordUnsupported() {} },
      lock: { leaseMs: 100, heartbeatIntervalMs: 5, async acquire() { return 'ambiguity-lock' }, async heartbeat() {}, async release() {} },
      executor: { async execute() { providerCalls += 1; return { responseClass: 'succeeded' as const, actualCny: 1, bytes: mode === 'decode' ? invalid : png } } },
    })
    assert.equal(providerCalls, 1)
    assert.equal(result.state.status, 'paused')
    assert.equal(result.state.pauseReason, 'reconciliation_required')
    assert.equal(result.state.slots[0].status, 'unknown')
    assert.deepEqual([...fake.markers.values()], ['unknown'])
    assert.strictEqual(result.state, fake.lastPersisted)
  }
})

test('runner resolves post-commit acknowledgement loss and repository commit is marker-idempotent', async () => {
  const built = batchFor(canonicalManifest({ directEdit: false }))
  const fake = atomicRunnerRepository(built.state, { persistThenThrowFirstCommit: true })
  const png = await sharp({ create: { width: 2048, height: 1024, channels: 3, background: '#9abcde' } }).png().toBuffer()
  const callsByCase = new Map<string, number>()
  const result = await runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME }, repository: fake.repository,
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 'ack-loss-lock' }, async heartbeat() {}, async release() {} },
    executor: { async execute(request) {
      callsByCase.set(request.caseId, (callsByCase.get(request.caseId) || 0) + 1)
      return { responseClass: 'succeeded', actualCny: 1, bytes: png }
    } },
  })
  const first = result.state.slots.find((slot) => slot.provider === 'bailian' && slot.caseId === PB_SCIENTIFIC_FIGURE_V2.cases[0].id)!
  assert.equal(first.status, 'succeeded')
  assert.equal(first.attempts.length, 1)
  assert.equal(callsByCase.get(first.caseId), 1)
  const marker = { manifestHash: result.manifest.manifestHash, slotId: first.slotId, attemptIndex: 1, payloadHash: first.attempts[0].payloadHash }
  const committed = await fake.repository.commitAttempt({ expectedStateHash: H64('f'), marker, nextState: built.state })
  assert.strictEqual(committed, fake.committedStates.get(canonicalHash(marker)))
})

test('runner never redispatches an incomplete marker and renews long provider calls without release masking', async () => {
  const built = batchFor(canonicalManifest({ directEdit: false }))
  const incomplete = atomicRunnerRepository(built.state)
  const firstSlot = built.manifest.executionOrder.find((slot) => slot.provider === 'bailian')!
  const scientificCase = built.manifest.cases.find((item) => item.id === firstSlot.caseId)!
  const payloadHash = canonicalHash({
    route: { provider: firstSlot.provider, modelId: firstSlot.modelId }, operation: firstSlot.operation,
    imageSize: firstSlot.imageSize,
    caseId: scientificCase.id, instruction: scientificCase.instruction,
    ...(scientificCase.kind === 'generation'
      ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
      : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
  })
  incomplete.markers.set(canonicalHash({ manifestHash: built.manifest.manifestHash, slotId: firstSlot.slotId, attemptIndex: 1, payloadHash }), 'started')
  let blockedCalls = 0
  const blocked = await runScientificV2Batch({
    manifest: built.manifest, state: built.state, attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: incomplete.repository, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { leaseMs: 100, heartbeatIntervalMs: 5, async acquire() { return 'marker-lock' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { blockedCalls += 1; throw new Error('must not dispatch') } },
  })
  assert.equal(blockedCalls, 0)
  assert.equal(blocked.state.status, 'paused')

  const heartbeatBuilt = batchFor(canonicalManifest({ directEdit: false }))
  const heartbeatRepo = atomicRunnerRepository(heartbeatBuilt.state)
  const png = await sharp({ create: { width: 2048, height: 1024, channels: 3, background: '#123abc' } }).png().toBuffer()
  let heartbeats = 0
  const completed = await runScientificV2Batch({
    manifest: heartbeatBuilt.manifest, state: heartbeatBuilt.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME }, repository: heartbeatRepo.repository,
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: {
      leaseMs: 100, heartbeatIntervalMs: 5, async acquire() { return 'heartbeat-lock' },
      async heartbeat() { heartbeats += 1 }, async release() { throw new Error('injected release failure') },
    },
    executor: { async execute() { await new Promise((resolve) => setTimeout(resolve, 22)); return { responseClass: 'succeeded', actualCny: 1, bytes: png } } },
  })
  assert.equal(completed.state.status, 'awaiting_artifacts')
  assert.ok(heartbeats >= 12)
  assert.equal(heartbeatRepo.releaseFailures, 1)
  assert.strictEqual(completed.state, heartbeatRepo.lastPersisted)
})

test('v2 batch freezes complete identities, routes, slots, limits, prices and pending state', () => {
  const built = batchFor(canonicalManifest({ providers: ['openrouter', 'ark', 'bailian'] }))
  assert.deepEqual(Object.fromEntries(Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY).map(([key]) => [key, built.manifest[key as keyof typeof built.manifest]])), SCIENTIFIC_BENCHMARK_IDENTITY)
  assert.equal(built.manifest.codeSha, CODE_SHA)
  assert.equal(built.manifest.registryHash, H64('1'))
  assert.equal(built.manifest.suiteHash, PB_SCIENTIFIC_FIGURE_V2.manifestHash)
  assert.equal(built.manifest.priceHash, built.manifest.priceSnapshot.snapshotHash)
  assert.deepEqual(built.manifest.providerOrder, ['bailian', 'ark', 'openrouter'])
  assert.deepEqual(built.manifest.providerBudgetsCny, { bailian: 180, ark: 180, openrouter: 180 })
  assert.deepEqual(built.manifest.codexLimits, { modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 })
  assert.equal(built.manifest.concurrency, 1)
  assert.equal(built.manifest.lockName, LOCK_NAME)
  assert.equal(built.manifest.cases.length, 9)
  assert.equal(built.manifest.executionOrder.length, built.manifest.models.length * 9)
  assert.deepEqual([...new Set(built.manifest.executionOrder.map((slot) => slot.provider))], ['bailian', 'ark', 'openrouter', 'codex'])
  assert.deepEqual(built.manifest.executionOrder.filter((slot) => slot.isProviderCanary).map((slot) => slot.provider), ['bailian', 'ark', 'openrouter'])
  assert.ok(built.manifest.priceSnapshot.entries.every((entry) => /^[a-f0-9]{64}$/.test(entry.entryHash)))
  assert.equal(Object.isFrozen(built.manifest), true)
  assert.equal(Object.isFrozen(built.manifest.models[0]), true)
  assert.ok(built.state.slots.every((slot) => slot.status === 'pending' && slot.costCny === null && slot.attempts.length === 0))
  assert.doesNotThrow(() => verifyScientificV2BatchManifest(built.manifest))
  assert.doesNotThrow(() => verifyScientificV2BatchState(built.state, built.manifest))

  const tampered = structuredClone(built.manifest)
  tampered.models[0].displayName = 'tampered'
  assert.throws(() => verifyScientificV2BatchManifest(tampered), /SCIENTIFIC_V2_MANIFEST_HASH_MISMATCH/)
  const tamperedState = structuredClone(built.state)
  tamperedState.slots[0].costCny = 0
  assert.throws(() => verifyScientificV2BatchState(tamperedState, built.manifest), /SCIENTIFIC_V2_STATE_HASH_MISMATCH/)
})

test('v2 preflight fails closed for missing, unverified, tampered or over-budget route prices', () => {
  const manifest = canonicalManifest()
  const missing = priceSnapshot(manifest)
  missing.entries.pop()
  const { snapshotHash: _missingHash, ...missingBase } = missing
  missing.snapshotHash = canonicalHash(missingBase)
  assert.throws(() => buildScientificV2Batch({ canonicalManifest: manifest, registrySnapshot: registrySnapshot(manifest), suite: PB_SCIENTIFIC_FIGURE_V2, codeSha: CODE_SHA, priceSnapshot: missing, createdAt: CREATED_AT, lockName: LOCK_NAME }), /SCIENTIFIC_V2_PRICE_UNRESOLVED/)
  assert.throws(() => batchFor(manifest, 1, false), /SCIENTIFIC_V2_PRICE_SOURCE_EVIDENCE_INVALID/)
  const tampered = priceSnapshot(manifest)
  tampered.entries[0].unitCny = 2
  assert.throws(() => buildScientificV2Batch({ canonicalManifest: manifest, registrySnapshot: registrySnapshot(manifest), suite: PB_SCIENTIFIC_FIGURE_V2, codeSha: CODE_SHA, priceSnapshot: tampered, createdAt: CREATED_AT, lockName: LOCK_NAME }), /SCIENTIFIC_V2_PRICE_HASH_MISMATCH/)
  assert.throws(() => batchFor(manifest, 21), /SCIENTIFIC_V2_PROVIDER_BASELINE_BUDGET_EXCEEDED/)
  const worstCaseOnly = batchFor(manifest, 6)
  assert.equal(worstCaseOnly.manifest.priceSnapshot.preflight.providerTotals[0].baselineWithinBudget, true)
  assert.equal(worstCaseOnly.manifest.priceSnapshot.preflight.providerTotals[0].worstCaseWithinBudget, false)
  assert.equal(batchFor(manifest, 0.000000004).manifest.priceSnapshot.entries[0].unitCny, 0.00000001)
  assert.throws(() => buildScientificV2Batch({
    canonicalManifest: manifest,
    registrySnapshot: registrySnapshot(manifest),
    suite: PB_SCIENTIFIC_FIGURE_V2,
    codeSha: CODE_SHA,
    priceSnapshot: priceSnapshot(manifest),
    createdAt: CREATED_AT,
    lockName: 'paperbanana-hk-production.lock',
  }), /SCIENTIFIC_V2_LOCK_INVALID/)
})

test('scientific v2 image inspection enforces encoded, pixel and complete-decode bounds', async () => {
  const png = await sharp({ create: { width: 2048, height: 1024, channels: 3, background: '#ddeeff' } }).png().toBuffer()
  assert.equal((await inspectScientificV2Image(png)).width, 2048)
  await assert.rejects(() => inspectScientificV2Image(png.subarray(0, png.length - 8)), /SCIENTIFIC_V2_OUTPUT_IMAGE_INVALID/)
  await assert.rejects(() => inspectScientificV2Image(Buffer.alloc(25 * 1024 * 1024 + 1)), /SCIENTIFIC_V2_OUTPUT_BYTES_LIMIT_EXCEEDED/)
})

test('scientific v2 image inspection rejects animated WebP and accepts supported static formats', async () => {
  const image = sharp({ create: { width: 64, height: 32, channels: 3, background: '#ddeeff' } })
  const [png, jpeg, webp] = await Promise.all([
    image.clone().png().toBuffer(),
    image.clone().jpeg().toBuffer(),
    image.clone().webp().toBuffer(),
  ])
  await assert.doesNotReject(() => inspectScientificV2Image(png))
  await assert.doesNotReject(() => inspectScientificV2Image(jpeg))
  await assert.doesNotReject(() => inspectScientificV2Image(webp))

  const width = 64
  const frameHeight = 32
  const frames = 5
  const raw = Buffer.alloc(width * frameHeight * frames * 3)
  for (let frame = 0; frame < frames; frame += 1) {
    raw.fill(frame * 40, frame * width * frameHeight * 3, (frame + 1) * width * frameHeight * 3)
  }
  const animated = await sharp(raw, {
    raw: { width, height: frameHeight * frames, channels: 3, pageHeight: frameHeight },
  }).webp({ loop: 0, delay: Array(frames).fill(100) }).toBuffer()
  await assert.rejects(
    () => inspectScientificV2Image(animated),
    /SCIENTIFIC_V2_OUTPUT_ANIMATION_UNSUPPORTED/,
  )
})

test('scientific v2 CNY parsing uses exact decimal/scientific notation and round-trips units', () => {
  for (const [value, units] of [[3e-8, 3n], [7e-8, 7n], [0.1, 10_000_000n], [1.23456789, 123_456_789n]] as const) {
    assert.equal(scientificV2CnyToUnits(value), units)
    assert.equal(scientificV2CnyToUnits(scientificV2CnyFromUnits(units)), units)
  }
  for (const invalid of [4e-9, 1.234567891, 0.10000000000000002]) {
    assert.throws(() => scientificV2CnyToUnits(invalid), /SCIENTIFIC_V2_CNY_PRECISION_INVALID/)
  }
})

test('scientific v2 exact object validation rejects descriptors without invoking getters', () => {
  let getterCalls = 0
  const accessor = {}
  Object.defineProperty(accessor, 'safe', { enumerable: true, get() { getterCalls += 1; return 'value' } })
  assert.throws(() => assertExactScientificV2Keys(accessor, ['safe'], 'SCIENTIFIC_V2_DESCRIPTOR_INVALID'), /SCIENTIFIC_V2_DESCRIPTOR_INVALID/)
  assert.equal(getterCalls, 0)

  const hidden = { safe: 'value' }
  Object.defineProperty(hidden, 'hidden', { enumerable: false, value: true })
  assert.throws(() => assertExactScientificV2Keys(hidden, ['safe'], 'SCIENTIFIC_V2_DESCRIPTOR_INVALID'), /SCIENTIFIC_V2_DESCRIPTOR_INVALID/)
})

test('execution order uses each supported slot route rank, byte identifiers and fixed case order', () => {
  const canonical = buildScientificV2CanonicalManifest({
    registryVersion: '2026-08-30.order', registryHash: H64('2'), registry: { providers: {
      bailian: { models: [{ id: 'bailian-z', canonicalModelId: 'z_shared', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'none' } }] },
      ark: { models: [{ id: 'ark-a', canonicalModelId: 'a-z', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' } }] },
      openrouter: { models: [{ id: 'openrouter-z-edit', canonicalModelId: 'z_shared', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' } }] },
    } },
  })
  const built = batchFor(canonical)
  assert.deepEqual([...new Set(built.manifest.executionOrder.filter((slot) => slot.supported).map((slot) => slot.provider))], ['bailian', 'ark', 'openrouter', 'codex'])
  assert.deepEqual(built.manifest.executionOrder.filter((slot) => slot.isProviderCanary).map((slot) => slot.provider), ['bailian', 'ark', 'openrouter'])
  const arkCases = built.manifest.executionOrder.filter((slot) => slot.provider === 'ark').map((slot) => slot.caseId)
  assert.deepEqual(arkCases, PB_SCIENTIFIC_FIGURE_V2.cases.map((item) => item.id))
})

test('execution slots freeze the per-route output request lane for provider dispatch', () => {
  const registry = { providers: { openrouter: { models: [
    { id: 'vendor/one-k', canonicalModelId: 'vendor:one-k', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'none' as const, resolutions: ['1K'] } },
    { id: 'vendor/default', canonicalModelId: 'vendor:default', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'none' as const, resolutions: [] } },
  ] } } }
  const registryHash = canonicalHash(registry)
  const frozen = buildScientificV2CanonicalManifest({ registryVersion: 'dispatch-lanes-v1', registryHash, registry })
  const built = batchFor(frozen)
  const generationSlots = built.manifest.executionOrder.filter((slot) => slot.operation === 'generation' && slot.provider === 'openrouter')
  assert.deepEqual([...new Set(generationSlots.filter((slot) => slot.modelId === 'vendor/one-k').map((slot) => slot.imageSize))], ['1K'])
  assert.deepEqual([...new Set(generationSlots.filter((slot) => slot.modelId === 'vendor/default').map((slot) => slot.imageSize))], ['provider-default'])
})

test('v2 runner is locked, disabled-gated, strictly serial, route-frozen and records unsupported edits without calls', async () => {
  const built = batchFor(canonicalManifest({ directEdit: false }))
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#fff' } }).png().toBuffer()
  let active = 0
  let maximumActive = 0
  const calls: Array<{ caseId: string; operation: string; provider: string; modelId: string }> = []
  const saved: ScientificV2BatchState[] = []
  const recorded: unknown[] = []
  const locks: string[] = []
  const result = await runScientificV2Batch({
    manifest: built.manifest,
    state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save(state) { saved.push(structuredClone(state)) } },
    recorder: { async recordAttempt(attempt) { recorded.push(attempt) }, async recordUnsupported(conclusion) { recorded.push(conclusion) } },
    lock: {
      async acquire(name) { locks.push(`acquire:${name}`); return 'lock-token' },
      async heartbeat(token) { assert.equal(token, 'lock-token') },
      async release(token) { locks.push(`release:${token}`) },
    },
    executor: {
      async execute(request) {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        calls.push(request)
        await new Promise((resolve) => setImmediate(resolve))
        active -= 1
        return { responseClass: 'succeeded_low_quality', actualCny: 1, bytes: png }
      },
    },
  })
  assert.equal(maximumActive, 1)
  assert.equal(calls.length, 6)
  assert.ok(calls.every((call) => call.operation === 'generation' && call.provider === 'bailian' && call.modelId === 'bailian-scientific-1'))
  assert.equal(result.state.slots.filter((slot) => slot.status === 'unsupported').length, 3)
  assert.equal(result.state.slots.filter((slot) => slot.status === 'awaiting_artifact').length, 9)
  assert.ok(result.state.slots.filter((slot) => slot.status === 'unsupported').every((slot) => slot.costCny === 0 && slot.attempts.length === 0))
  assert.ok(result.state.slots.filter((slot) => slot.status === 'unsupported').every((slot) => slot.provider === null && slot.modelId === null && slot.routeStatus === 'no_direct_edit_route'))
  assert.equal(recorded.length, 9)
  assert.ok(saved.length >= 9)
  assert.ok(saved.every((state) => verifyScientificV2BatchState(state, built.manifest) === state))
  assert.deepEqual(locks, [`acquire:${LOCK_NAME}`, 'release:lock-token'])
  assert.equal(result.state.status, 'awaiting_artifacts')
  assert.throws(() => runScientificV2Batch({
    manifest: built.manifest,
    state: built.state,
    attestation: { enabled: true, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 'unused' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { throw new Error('must not execute') } },
  }), /SCIENTIFIC_V2_DISABLED_GATE_INVALID/)
})

test('v2 runner retries only confirmed failures up to four and stops at first valid low-quality success', async () => {
  const built = batchFor(canonicalManifest())
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#123456' } }).png().toBuffer()
  let firstSlotCalls = 0
  const result = await runScientificV2Batch({
    manifest: built.manifest,
    state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 't' }, async heartbeat() {}, async release() {} },
    executor: { async execute(request) {
      if (request.caseId === PB_SCIENTIFIC_FIGURE_V2.cases[1].id) {
        firstSlotCalls += 1
        if (firstSlotCalls < 4) throw new ScientificConfirmedFailureError('PROVIDER_503', { responseClass: 'confirmed_provider_failure', actualCny: 0.5 })
      }
      return { responseClass: 'succeeded_low_quality', actualCny: 1, bytes: png }
    } },
  })
  const first = result.state.slots.find((slot) => slot.caseId === PB_SCIENTIFIC_FIGURE_V2.cases[1].id && slot.provider !== 'codex')!
  assert.equal(first.attempts.length, 4)
  assert.deepEqual(first.attempts.map((attempt) => attempt.attemptIndex), [1, 2, 3, 4])
  assert.equal(first.status, 'succeeded')
  assert.ok(first.attempts.every((attempt) => /^[a-f0-9]{64}$/.test(attempt.attemptHash) && /^[a-f0-9]{64}$/.test(attempt.payloadHash)))
  assert.equal(first.attempts[3].responseClass, 'succeeded_low_quality')
  assert.deepEqual({ width: first.attempts[3].width, height: first.attempts[3].height, format: first.attempts[3].format }, { width: 2048, height: 1152, format: 'png' })
})

test('four confirmed failures on a non-canary slot audit it as failed and continue the remaining batch', async () => {
  const built = batchFor(canonicalManifest())
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#456789' } }).png().toBuffer()
  let calls = 0
  const result = await runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 't' }, async heartbeat() {}, async release() {} },
    executor: { async execute(request) {
      calls += 1
      if (request.caseId === PB_SCIENTIFIC_FIGURE_V2.cases[1].id) {
        throw new ScientificConfirmedFailureError('CONFIRMED_PROVIDER_FAILURE', { responseClass: 'confirmed_provider_failure', actualCny: 1 })
      }
      return { responseClass: 'succeeded', actualCny: 1, bytes: png }
    } },
  })
  const first = result.state.slots.find((slot) => slot.provider !== 'codex' && slot.caseId === PB_SCIENTIFIC_FIGURE_V2.cases[1].id)!
  assert.equal(first.status, 'failed')
  assert.equal(first.attempts.length, 4)
  assert.ok(calls > 4)
  assert.equal(result.state.blockReason, null)
})

test('price drift pauses a verifier-valid state without adding over-budget confirmed spend', async () => {
  const built = batchFor(canonicalManifest())
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#aaa' } }).png().toBuffer()
  const result = await runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 't' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { return { responseClass: 'succeeded', actualCny: 2, bytes: png } } },
  })
  assert.equal(result.state.status, 'paused')
  assert.equal(result.state.pauseReason, 'price_reconciliation_required')
  assert.equal(result.state.providerSpentCny.bailian, 0)
  assert.equal(result.state.providerUnreconciledCny.bailian, 2)
  assert.doesNotThrow(() => verifyScientificV2BatchState(result.state, result.manifest))
})

test('batch and persisted/returned state snapshots are recursively frozen', async () => {
  const built = batchFor(canonicalManifest({ directEdit: false }))
  assert.equal(Object.isFrozen(built.state), true)
  assert.equal(Object.isFrozen(built.state.slots), true)
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#bbb' } }).png().toBuffer()
  const snapshots: ScientificV2BatchState[] = []
  const result = await runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save(state) { snapshots.push(state) } }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 't' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { return { responseClass: 'succeeded', actualCny: 1, bytes: png } } },
  })
  assert.ok(snapshots.every((state) => Object.isFrozen(state) && Object.isFrozen(state.slots)))
  assert.equal(Object.isFrozen(result.state), true)
})

test('manifest and state exact schemas reject added fields and recomputed malformed bindings', () => {
  const built = batchFor(canonicalManifest())
  const malformedManifest = structuredClone(built.manifest) as unknown as Record<string, unknown>
  malformedManifest.codeSha = 'a'.repeat(39)
  const { manifestHash: _oldManifestHash, ...manifestBase } = malformedManifest
  malformedManifest.manifestHash = canonicalHash(manifestBase)
  assert.throws(() => verifyScientificV2BatchManifest(malformedManifest as unknown as typeof built.manifest), /SCIENTIFIC_V2_(MANIFEST_SCHEMA|CODE_SHA)/)

  const extraState: Record<string, unknown> = structuredClone(built.state)
  extraState.extra = true
  const { stateHash: _oldStateHash, ...stateBase } = extraState
  extraState.stateHash = canonicalHash(stateBase)
  assert.throws(() => verifyScientificV2BatchState(extraState as unknown as ScientificV2BatchState, built.manifest), /SCIENTIFIC_V2_STATE_SCHEMA_INVALID/)
})

test('state verifier reconstructs every status, attempt image fact and provider ledger after hashes are recomputed', async () => {
  const built = batchFor(canonicalManifest())
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#ccddee' } }).png().toBuffer()
  const completed = await runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 't' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { return { responseClass: 'succeeded', actualCny: 1, bytes: png } } },
  })
  const rehash = (state: ScientificV2BatchState) => {
    for (const slot of state.slots) for (const attempt of slot.attempts) {
      const { attemptHash: _old, ...base } = attempt
      attempt.attemptHash = canonicalHash(base)
    }
    const { stateHash: _old, ...base } = state
    state.stateHash = canonicalHash(base)
    return state
  }
  const mutateAndReject = (mutate: (state: ScientificV2BatchState) => void) => {
    const state = structuredClone(completed.state)
    mutate(state)
    assert.throws(() => verifyScientificV2BatchState(rehash(state), completed.manifest), /SCIENTIFIC_V2_(STATE|ATTEMPT)/)
  }
  mutateAndReject((state) => { Object.assign(state, { status: 'mystery' }) })
  mutateAndReject((state) => { state.pauseReason = 'reconciliation_required' })
  mutateAndReject((state) => { Object.assign(state.slots[0], { status: 'mystery' }) })
  mutateAndReject((state) => { state.slots[0].attempts[0].estimatedCny = -1 })
  mutateAndReject((state) => { state.slots[0].attempts[0].attemptIndex = 2 })
  mutateAndReject((state) => { state.slots[0].attempts[0].actualCny = -1 })
  mutateAndReject((state) => { state.slots[0].attempts[0].payloadHash = H64('f') })
  mutateAndReject((state) => { state.slots[0].attempts[0].rawImageHash = null })
  mutateAndReject((state) => { state.slots[0].attempts[0].sourceHash = H64('f') })
  mutateAndReject((state) => { state.providerSpentCny.bailian += 1 })
  mutateAndReject((state) => { state.providerUnreconciledCny.bailian += 1 })
})

test('canonical manifest routes and model order are derived from routes rather than trusted declarations', () => {
  const original = canonicalManifest({ providers: ['bailian', 'ark'] })
  const changedProvider = structuredClone(original)
  changedProvider.models[0].generationRoute.provider = changedProvider.models[0].generationRoute.provider === 'ark' ? 'bailian' : 'ark'
  const { manifestHash: _oldProviderHash, ...changedProviderBase } = changedProvider
  changedProvider.manifestHash = canonicalHash(changedProviderBase)
  assert.throws(() => batchFor(changedProvider), /SCIENTIFIC_V2_(CANONICAL_(ROUTE|MANIFEST)_DERIVATION_INVALID|PRICE_REQUIREMENT_INVALID)/)

  const changedOrder = structuredClone(original)
  changedOrder.models.reverse()
  const { manifestHash: _oldOrderHash, ...changedOrderBase } = changedOrder
  changedOrder.manifestHash = canonicalHash(changedOrderBase)
  assert.throws(() => batchFor(changedOrder), /SCIENTIFIC_V2_CANONICAL_(MODEL_ORDER|MANIFEST)_DERIVATION_INVALID/)

  const changedCount = structuredClone(original)
  changedCount.rawRouteCount += 1
  const { manifestHash: _oldCountHash, ...changedCountBase } = changedCount
  changedCount.manifestHash = canonicalHash(changedCountBase)
  assert.throws(() => batchFor(changedCount), /SCIENTIFIC_V2_CANONICAL_(COUNT|MANIFEST)_DERIVATION_INVALID/)

  const changedRouteMetadata = structuredClone(original)
  Object.assign(changedRouteMetadata.models[0].routes[0], { editMode: 'arbitrary-redraw' })
  Object.assign(changedRouteMetadata.models[0], { editRoute: null })
  const { manifestHash: _oldMetadataHash, ...changedRouteMetadataBase } = changedRouteMetadata
  changedRouteMetadata.manifestHash = canonicalHash(changedRouteMetadataBase)
  assert.throws(() => batchFor(changedRouteMetadata), /SCIENTIFIC_V2_ROUTE_INVALID/)
})

test('confirmed failure response classes are a closed safe enum', () => {
  assert.throws(() => new ScientificConfirmedFailureError('unsafe', { responseClass: 'confirmed_secret_provider_detail', actualCny: 0 }), /SCIENTIFIC_V2_CONFIRMED_RESPONSE_CLASS_INVALID/)
})

test('production v2 operator inspect is disabled-gated and run dependency factory validates env before runtime load', async () => {
  const manifest = canonicalManifest()
  const built = batchFor(manifest)
  const operatorBatchInput = {
    canonicalManifest: manifest,
    registrySnapshot: registrySnapshot(manifest),
    suiteHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    codeSha: CODE_SHA,
    priceSnapshot: priceSnapshot(manifest),
    createdAt: CREATED_AT,
  }
  const inspected = await executeScientificV2OperatorBundle({
    operation: 'inspect',
    gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    batchInput: operatorBatchInput,
  })
  assert.equal(inspected.operation, 'inspect')
  assert.equal(inspected.providerCalls, 0)
  assert.match(inspected.manifestHash, /^[a-f0-9]{64}$/)
  let authoritativeRuntimeLoads = 0
  await assert.rejects(() => createScientificV2ProductionRunDependencies({
    PAPERBANANA_BENCH_ENABLED: 'false',
    PAPERBANANA_BENCH_CONCURRENCY: '1',
    PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED: 'true',
    PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF: LOCK_NAME,
  }, { async loadAuthoritativeRuntime() { authoritativeRuntimeLoads += 1; return {} } }), /SCIENTIFIC_V2_PRODUCTION_ENV_INVALID/)
  assert.equal(authoritativeRuntimeLoads, 0)
  assert.throws(() => runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { throw new Error('atomic repository gate must run before lock') }, async heartbeat() {}, async release() {} },
    executor: { async execute() { throw new Error('must not dispatch') } },
  }), /SCIENTIFIC_V2_ATOMIC_REPOSITORY_REQUIRED/)
  await assert.rejects(() => executeScientificV2OperatorBundle({
    operation: 'inspect',
    gate: { enabled: true, concurrency: 1, lockName: LOCK_NAME },
    batchInput: operatorBatchInput,
  }), /SCIENTIFIC_V2_OPERATOR_DISABLED_GATE_INVALID/)
})

test('unknown provider outcome pauses reconciliation immediately and budget blocks before the next dispatch', async () => {
  const built = batchFor(canonicalManifest())
  let calls = 0
  const paused = await runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 't' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { calls += 1; throw new UnknownProviderOutcomeError('UNKNOWN_PROVIDER_OUTCOME') } },
  })
  assert.equal(calls, 1)
  assert.equal(paused.state.status, 'paused')
  assert.equal(paused.state.pauseReason, 'reconciliation_required')
  assert.equal(paused.state.slots[0].status, 'unknown')
  assert.equal(paused.state.slots.filter((slot) => slot.attempts.length > 0).length, 1)
  assert.ok(paused.state.slots.filter((slot) => slot.attempts.length === 0).every((slot) => slot.costCny === null))
  assert.doesNotThrow(() => verifyScientificV2BatchState(paused.state, paused.manifest))

  assert.throws(() => batchFor(canonicalManifest(), 20.00000001), /SCIENTIFIC_V2_PROVIDER_BASELINE_BUDGET_EXCEEDED/)
})

async function codexArtifacts(overrides: Record<string, unknown> = {}) {
  const built = batchFor(canonicalManifest())
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#abcdef' } }).png().toBuffer()
  const awaiting = await runScientificV2Batch({
    manifest: built.manifest, state: built.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 't' }, async heartbeat() {}, async release() {} },
    executor: { async execute() { return { responseClass: 'succeeded', actualCny: 1, bytes: png } } },
  })
  const sha256 = createHash('sha256').update(png).digest('hex')
  const toolCalls = PB_SCIENTIFIC_FIGURE_V2.cases.map((item, index) => ({
    slotId: `codex:gpt-image-2:${item.id}`,
    caseId: item.id,
    attemptIndex: 1,
    responseClass: 'succeeded' as const,
    payloadHash: canonicalHash({ manifestHash: built.manifest.manifestHash, slotId: `codex:gpt-image-2:${item.id}`, caseManifestHash: item.manifestHash }),
    bytes: png,
    sha256,
    format: 'png',
    width: 2048,
    height: 1152,
    startedAt: new Date(Date.parse('2026-08-30T01:00:00.000Z') + index * 60_000).toISOString(),
    completedAt: new Date(Date.parse('2026-08-30T01:00:30.000Z') + index * 60_000).toISOString(),
    ...(item.kind === 'edit' ? { sourceHash: item.sourceHash, editedHash: sha256 } : {}),
  }))
  return {
    manifestHash: built.manifest.manifestHash,
    stateHash: awaiting.state.stateHash,
    manifest: built.manifest,
    state: awaiting.state,
    provenance: { taskId: 'codex-task-scientific-v2', threadId: 'codex-thread-scientific-v2', modelAlias: 'gpt-image-2', totalToolCalls: 9 },
    toolCalls,
    ...overrides,
  }
}

test('Codex artifact import validates the first formal canary and all nine original 2K artifacts without request-id disclosure', async () => {
  const result = await importScientificCodexArtifacts(await codexArtifacts())
  assert.equal(result.publicIdentity, 'OpenAI GPT Image 2 · Codex 内置渠道')
  assert.equal(result.modelId, 'codex:gpt-image-2')
  assert.equal(result.attempts.length, 9)
  assert.equal(result.toolCalls, 9)
  assert.ok(result.attempts.every((attempt) => attempt.provider === 'codex' && attempt.model === 'gpt-image-2' && /^[a-f0-9]{64}$/.test(attempt.attemptHash)))
  assert.ok(result.attempts.every((attempt, index) => attempt.startedAt === new Date(Date.parse('2026-08-30T01:00:00.000Z') + index * 60_000).toISOString()))
  assert.equal(JSON.stringify(result).includes('requestId'), false)
  assert.equal(JSON.stringify(result).includes('snapshot'), false)
  assert.deepEqual(result.disclosure, { floatingAlias: true, apiRequestIdAvailable: false, fixedSnapshotAvailable: false })
  assert.ok(result.state.slots.every((slot) => slot.provider !== 'codex' || slot.status === 'succeeded'))

  const badHash = await codexArtifacts()
  badHash.toolCalls[0].sha256 = H64('0')
  await assert.rejects(() => importScientificCodexArtifacts(badHash), /SCIENTIFIC_V2_CODEX_ARTIFACT_HASH_MISMATCH/)
  const duplicate = await codexArtifacts()
  duplicate.toolCalls[1].slotId = duplicate.toolCalls[0].slotId
  await assert.rejects(() => importScientificCodexArtifacts(duplicate), /SCIENTIFIC_V2_CODEX_(SLOT_SET|ATTEMPT_SEQUENCE)_INVALID/)
  const missingCanary = await codexArtifacts()
  missingCanary.toolCalls.shift()
  await assert.rejects(() => importScientificCodexArtifacts(missingCanary), /SCIENTIFIC_V2_CODEX_(CANARY_REQUIRED|TOOL_CALL_LIMIT)/)
  const tooMany = await codexArtifacts()
  tooMany.provenance.totalToolCalls = 37
  await assert.rejects(() => importScientificCodexArtifacts(tooMany), /SCIENTIFIC_V2_CODEX_(TOOL_CALL_LIMIT|PROVENANCE_INVALID)/)
  const wrongFormat = await codexArtifacts()
  wrongFormat.toolCalls[0].format = 'jpeg'
  await assert.rejects(() => importScientificCodexArtifacts(wrongFormat), /SCIENTIFIC_V2_CODEX_ARTIFACT_METADATA_MISMATCH/)
  const smallPng = await sharp({ create: { width: 1024, height: 576, channels: 3, background: '#fff' } }).png().toBuffer()
  const small = await codexArtifacts()
  Object.assign(small.toolCalls[0], {
    bytes: smallPng,
    sha256: createHash('sha256').update(smallPng).digest('hex'),
    width: 1024,
    height: 576,
  })
  await assert.rejects(() => importScientificCodexArtifacts(small), /SCIENTIFIC_V2_CODEX_ARTIFACT_RESOLUTION_INVALID/)
  const wrongEditSource = await codexArtifacts()
  Object.assign(wrongEditSource.toolCalls[6], { sourceHash: H64('f') })
  await assert.rejects(() => importScientificCodexArtifacts(wrongEditSource), /SCIENTIFIC_V2_CODEX_EDIT_BINDING_INVALID/)
  const disclosedRequestId = await codexArtifacts()
  Object.assign(disclosedRequestId.provenance, { requestId: 'must-not-be-accepted' })
  await assert.rejects(() => importScientificCodexArtifacts(disclosedRequestId), /SCIENTIFIC_V2_CODEX_PROVENANCE_INVALID/)

  const replayedAcrossBatch = await codexArtifacts()
  replayedAcrossBatch.manifestHash = H64('f')
  await assert.rejects(() => importScientificCodexArtifacts(replayedAcrossBatch), /SCIENTIFIC_V2_CODEX_BATCH_BINDING_INVALID/)

  const audited = await codexArtifacts()
  const success = audited.toolCalls[0]
  const auditedToolCalls = audited.toolCalls as unknown as Array<Record<string, unknown>>
  auditedToolCalls.unshift({
    ...success,
    attemptIndex: 1,
    responseClass: 'confirmed_provider_failure',
    bytes: null,
    sha256: null,
    format: null,
    width: null,
    height: null,
    completedAt: '2026-08-30T01:00:10.000Z',
  })
  auditedToolCalls[1].attemptIndex = 2
  auditedToolCalls[1].startedAt = '2026-08-30T01:00:10.000Z'
  audited.provenance.totalToolCalls = 10
  const auditedResult = await importScientificCodexArtifacts(audited)
  const firstSlot = auditedResult.state.slots.find((slot) => slot.provider === 'codex' && slot.caseId === PB_SCIENTIFIC_FIGURE_V2.cases[0].id)!
  assert.equal(firstSlot.attempts.length, 2)
  assert.deepEqual(firstSlot.attempts.map((attempt) => attempt.responseClass), ['confirmed_provider_failure', 'succeeded'])
})

test('state operation report adapter signs canonical worker and Codex transitions without disclosing its secret', async () => {
  const artifacts = await codexArtifacts()
  const canarySuccess = artifacts.toolCalls[0]
  ;(artifacts.toolCalls as unknown as Array<Record<string, unknown>>).unshift({
    ...canarySuccess, attemptIndex: 1, responseClass: 'confirmed_provider_failure', bytes: null,
    sha256: null, format: null, width: null, height: null, completedAt: '2026-08-30T01:00:10.000Z',
  })
  artifacts.toolCalls[1].attemptIndex = 2
  artifacts.toolCalls[1].startedAt = '2026-08-30T01:00:10.000Z'
  artifacts.provenance.totalToolCalls = 10
  const imported = await importScientificCodexArtifacts(artifacts)
  const attestationSecret = 'state-operation-report-secret'.padEnd(32, '-')
  const common = {
    batchId: 'scientific-v2-worker-report-test',
    manifest: artifacts.manifest,
    previousStateHash: artifacts.state.stateHash,
    createdAt: '2026-08-31T02:00:00.000Z',
    attestationSecret,
  }
  const workerReport = createScientificV2SignedStateOperationReport({
    ...common, kind: 'worker', revision: 1, state: artifacts.state,
  })
  assert.equal(workerReport.report.kind, 'worker')
  assert.equal(workerReport.report.codexProvenance, null)
  assert.equal(workerReport.report.disclosure, null)
  assert.equal(verifyScientificV2SignedStateOperationReport(workerReport, attestationSecret), true)

  const codexReport = createScientificV2SignedStateOperationReport({
    ...common, kind: 'codex', revision: 2, previousStateHash: artifacts.state.stateHash,
    state: imported.state, codexImport: imported,
  })
  assert.deepEqual(Object.keys(codexReport), ['report', 'reportHash', 'attestationHash'])
  assert.equal(codexReport.report.reportHash, codexReport.reportHash)
  assert.equal(codexReport.attestationHash, createHmac('sha256', attestationSecret).update(codexReport.reportHash).digest('hex'))
  assert.deepEqual(codexReport.report.codexProvenance, {
    modelId: 'codex:gpt-image-2', successfulSlots: 9, toolCalls: 10,
    firstCaseId: PB_SCIENTIFIC_FIGURE_V2.cases[0].id,
    artifactCanaryHash: imported.state.slots.find((slot) => slot.provider === 'codex')!.attempts.at(-1)!.rawImageHash,
  })
  assert.deepEqual(codexReport.report.disclosure, { containsSecrets: false, automaticJudges: [], reviewerIdentity: null })
  assert.equal(JSON.stringify(codexReport).includes(attestationSecret), false)
  assert.equal(verifyScientificV2SignedStateOperationReport(codexReport, attestationSecret), true)

  assert.throws(() => createScientificV2SignedStateOperationReport({ ...common, kind: 'worker', revision: 1, state: artifacts.state, attestationSecret: 'x'.repeat(31) }), /SCIENTIFIC_V2_OPERATOR_REPORT_SECRET_INVALID/)
  assert.throws(() => createScientificV2SignedStateOperationReport({ ...common, kind: 'worker', revision: 1, state: artifacts.state, attestationSecret: 'x'.repeat(4097) }), /SCIENTIFIC_V2_OPERATOR_REPORT_SECRET_INVALID/)
})

test('production Codex import validates before OSS and persists every success plus the fixed edit source by content hash', async () => {
  const artifacts = await codexArtifacts()
  const persisted: Array<{ objectKey: string; imageHash: string; bytes: Buffer }> = []
  let artifactConnections = 0
  let runtimeLoads = 0
  const bundle = {
    operation: 'import_codex' as const,
    gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    input: {
      ...artifacts,
      batchId: 'scientific-v2-codex-production-import', revision: 2,
      previousStateHash: artifacts.state.stateHash, createdAt: '2026-08-31T03:00:00.000Z',
      attestationSecret: STATE_OPERATION_REPORT_SECRET,
    },
  }
  const context = {
    env: { PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH: SCIENTIFIC_EDIT_SOURCE.pngPath },
    productionDependencies: {
      async createArtifactStore() {
        artifactConnections += 1
        return { async persist(value: { objectKey: string; imageHash: string; bytes: Buffer }) { persisted.push(value) } }
      },
      async loadAuthoritativeRuntime() { runtimeLoads += 1; throw new Error('runtime must not load for Codex import') },
    },
  }
  const output = await executeScientificV2OperatorBundle(bundle, context)
  assert.deepEqual(Object.keys(output), ['report', 'reportHash', 'attestationHash'])
  assert.equal(artifactConnections, 1)
  assert.equal(runtimeLoads, 0)
  assert.equal(persisted.length, 10)
  assert.equal(persisted.filter((item) => item.imageHash === SCIENTIFIC_EDIT_SOURCE.sourceHash).length, 1)
  assert.ok(persisted.every((item) => item.objectKey === `bench/scientific-v2/private/objects/${item.imageHash}.${item.objectKey.split('.').at(-1)}`))

  const invalid = structuredClone(bundle)
  invalid.input.attestationSecret = 'short'
  await assert.rejects(() => executeScientificV2OperatorBundle(invalid, context), /SCIENTIFIC_V2_OPERATOR_REPORT_SECRET_INVALID/)
  assert.equal(artifactConnections, 1)
})

function sourcePacket(modelKey: string, secret: string) {
  const imageHash = canonicalHash({ modelKey, image: 1 })
  return createScientificReviewPacket({
    suiteManifestHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    packetId: `source-${modelKey}`,
    runHash: canonicalHash({ modelKey, run: 1 }),
    issuedAt: CREATED_AT,
    signingSecret: secret,
    items: PB_SCIENTIFIC_FIGURE_V2.cases.map((scientificCase) => ({
      caseId: scientificCase.id,
      caseManifestHash: scientificCase.manifestHash,
      applicableAxes: scientificCase.applicableAxes,
      imageHash,
      rubric: scientificCase.rubric,
      attemptResult: { status: 'succeeded' as const, routeId: `private-route-${modelKey}`, attemptHash: canonicalHash({ modelKey, caseId: scientificCase.id }) },
      instruction: scientificCase.instruction,
      ...(scientificCase.kind === 'generation'
        ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
        : { sourceHash: scientificCase.sourceHash, editedHash: imageHash, region: scientificCase.region }),
    })),
  })
}

function reviewAuthority(registryHash: string, modelKeys: string[]) {
  const providerNames = ['bailian', 'ark', 'openrouter'] as const
  if (modelKeys.length < 1 || modelKeys.length > providerNames.length) throw new Error('test review authority model count invalid')
  const providers = Object.fromEntries(modelKeys.map((modelKey, index) => [providerNames[index], { models: [{
    id: `review-${modelKey}`,
    canonicalModelId: `secret-model-${modelKey}`,
    label: `review ${modelKey}`,
    vendor: `review vendor ${modelKey}`,
    selectable: true,
    roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
  }] }]))
  const canonical = buildScientificV2CanonicalManifest({ registryVersion: `review-${registryHash.slice(0, 8)}`, registryHash, registry: { providers } })
  const built = batchFor(canonical)
  const state = structuredClone(built.state)
  state.status = 'completed'
  for (const slot of state.slots) {
    const scientificCase = built.manifest.cases.find((item) => item.id === slot.caseId)!
    const rawImageHash = canonicalHash({ model: slot.canonicalModelId, caseId: slot.caseId, image: true })
    const payloadHash = slot.provider === 'codex'
      ? canonicalHash({ manifestHash: built.manifest.manifestHash, slotId: slot.slotId, caseManifestHash: scientificCase.manifestHash })
      : canonicalHash({
        route: { provider: slot.provider, modelId: slot.modelId }, operation: slot.operation,
        imageSize: slot.imageSize,
        caseId: scientificCase.id, instruction: scientificCase.instruction,
        ...(scientificCase.kind === 'generation'
          ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
          : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
      })
    const cny = slot.provider === 'codex' ? 0 : 1
    const startedAt = new Date(Date.parse(CREATED_AT) + slot.sequence * 2_000).toISOString()
    const attemptBase = {
      attemptIndex: 1, provider: slot.provider!, model: slot.modelId!, operation: slot.operation, payloadHash,
      responseClass: 'succeeded', estimatedCny: cny, actualCny: cny, startedAt,
      completedAt: new Date(Date.parse(startedAt) + 1_000).toISOString(), rawImageHash, byteSize: 1_024,
      width: 2_048, height: 1_024, format: 'png' as const,
      sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null,
      editedHash: scientificCase.kind === 'edit' ? rawImageHash : null,
    }
    slot.attempts = [{ ...attemptBase, attemptHash: canonicalHash(attemptBase) }]
    slot.status = 'succeeded'
    slot.costCny = cny
    if (slot.provider !== 'codex' && slot.provider !== null) state.providerSpentCny[slot.provider] += cny
  }
  const completed = rehashStateSnapshot(state)
  verifyScientificV2BatchState(completed, built.manifest)
  return { manifest: built.manifest, state: completed }
}

test('render_public_evidence reads exact private objects and emits an API-ready secret-free publish payload without runtime calls', async () => {
  const authority = reviewAuthority(H64('7'), ['render-model'])
  const raw = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#abc' } }).png().toBuffer()
  const rawHash = createHash('sha256').update(raw).digest('hex')
  const state = structuredClone(authority.state)
  for (const slot of state.slots) {
    const attempt = slot.attempts.at(-1)!
    attempt.rawImageHash = rawHash
    attempt.byteSize = raw.length
    attempt.width = 800
    attempt.height = 400
    attempt.format = 'png'
    if (slot.operation === 'edit') attempt.editedHash = rawHash
    const { attemptHash: _attemptHash, ...attemptBase } = attempt
    attempt.attemptHash = canonicalHash(attemptBase)
  }
  const completed = rehashStateSnapshot(state)
  verifyScientificV2BatchState(completed, authority.manifest)
  const source = readFileSync(SCIENTIFIC_EDIT_SOURCE.pngPath)
  const puts: string[] = []
  let runtimeLoads = 0
  const output = await executeScientificV2OperatorBundle({
    operation: 'render_public_evidence', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    manifest: authority.manifest, state: completed,
    input: { batchId: 'render-public-batch' },
  } as any, {
    env: {
      PAPERBANANA_BENCH_ENABLED: 'false', PAPERBANANA_BENCH_CONCURRENCY: '1',
      PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED: 'true', PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF: LOCK_NAME,
      PAPERBANANA_BENCH_MONGODB_URI: 'mongodb://render.invalid/benchmark',
      PAPERBANANA_BENCH_OSS_REGION: 'oss-cn-hongkong', PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID: 'render-id',
      PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET: 'render-secret', PAPERBANANA_BENCH_OSS_BUCKET: 'render-bucket',
      PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT: 'https://oss-cn-hongkong-internal.aliyuncs.com',
      PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH: SCIENTIFIC_EDIT_SOURCE.pngPath,
    },
    productionDependencies: {
      async connectMongo() { return { db: {}, async close() {} } },
      createRepository() { return { async loadCompletedBatch() { return { manifest: authority.manifest, state: completed } } } as any },
      async createEvidenceStore() {
        return {
          async readPrivate(input: any) { return input.imageHash === SCIENTIFIC_EDIT_SOURCE.sourceHash ? source : raw },
          async persistPrivate(input: any) { assert.equal(input.imageHash, SCIENTIFIC_EDIT_SOURCE.sourceHash) },
          async put(key: string) { puts.push(key); return {} },
          async get() { throw new Error('unexpected duplicate') },
          async head() { throw new Error('unexpected duplicate') },
          async getACL() { throw new Error('unexpected duplicate') },
        }
      },
      async loadAuthoritativeRuntime() { runtimeLoads += 1; throw new Error('must not load runtime') },
    } as any,
  })
  assert.equal(output.operation, 'render_public_evidence')
  assert.equal(output.providerCalls, 0)
  assert.equal(runtimeLoads, 0)
  const publishInput = output.publishInput as any
  assert.equal(publishInput.batchId, 'render-public-batch')
  assert.equal(publishInput.evidence.length, completed.slots.length)
  assert.ok(publishInput.evidence.every((item: any) => item.requestedResolution === '2K'))
  assert.ok(publishInput.evidence.every((item: any) => item.actualOutputPixels.width === 800
    && item.actualOutputPixels.height === 400 && item.actualOutputPixels.fileSizeBytes === raw.length))
  assert.deepEqual(publishInput.objectBindings.map((item: any) => item.imageHash).sort(), [rawHash, SCIENTIFIC_EDIT_SOURCE.sourceHash].sort())
  assert.equal(puts.length, completed.slots.length * 3 + completed.slots.filter((slot) => slot.operation === 'edit').length * 3)
  assert.match(String(output.publishInputHash), /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(output).includes('render-secret'), false)
})

test('public render always persists and binds the fixed edit source when every edit slot failed', async () => {
  const authority = reviewAuthority(H64('8'), ['render-no-edit'])
  const source = readFileSync(SCIENTIFIC_EDIT_SOURCE.pngPath)
  const raw = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#def' } }).png().toBuffer()
  const rawHash = createHash('sha256').update(raw).digest('hex')
  const state = structuredClone(authority.state)
  for (const slot of state.slots) {
    if (slot.operation === 'generation') {
      const attempt = slot.attempts[0]; attempt.rawImageHash = rawHash; attempt.byteSize = raw.length; attempt.width = 800; attempt.height = 400
      const { attemptHash: _hash, ...base } = attempt; attempt.attemptHash = canonicalHash(base)
      continue
    }
    const scientificCase = authority.manifest.cases.find((item) => item.id === slot.caseId)!
    const estimatedCny = slot.provider === 'codex' ? 0 : 1
    if (slot.provider && slot.provider !== 'codex') state.providerSpentCny[slot.provider] += estimatedCny * 3
    slot.attempts = Array.from({ length: 4 }, (_, index) => {
      const base = {
        attemptIndex: index + 1, provider: slot.provider!, model: slot.modelId!, operation: slot.operation,
        payloadHash: slot.attempts[0].payloadHash, responseClass: 'confirmed_provider_failure', estimatedCny, actualCny: estimatedCny,
        startedAt: new Date(Date.parse(CREATED_AT) + (slot.sequence * 10 + index) * 2000).toISOString(),
        completedAt: new Date(Date.parse(CREATED_AT) + (slot.sequence * 10 + index) * 2000 + 1000).toISOString(),
        rawImageHash: null, byteSize: null, width: null, height: null, format: null,
        sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null, editedHash: null,
      }
      return { ...base, attemptHash: canonicalHash(base) }
    })
    slot.status = 'failed'; slot.costCny = estimatedCny * 4
  }
  const completed = rehashStateSnapshot(state)
  verifyScientificV2BatchState(completed, authority.manifest)
  let sourcePuts = 0
  const result = await renderScientificV2PublicEvidence({
    batchId: 'no-edit-success', manifest: authority.manifest, state: completed,
    repository: { async loadCompletedBatch() { return { manifest: authority.manifest, state: completed } } } as any,
    store: {
      async persistPrivate(input: any) { assert.equal(input.imageHash, SCIENTIFIC_EDIT_SOURCE.sourceHash); sourcePuts += 1 },
      async readPrivate() { return raw }, async put() { return {} }, async get() { throw new Error('unused') },
      async head() { throw new Error('unused') }, async getACL() { throw new Error('unused') },
    },
    editSourcePng: source,
  })
  assert.equal(sourcePuts, 1)
  assert.equal(result.publishInput.objectBindings.some((item) => item.imageHash === SCIENTIFIC_EDIT_SOURCE.sourceHash), true)
  assert.equal(result.publishInput.evidence.every((item: any) => authority.manifest.cases.find((c) => c.id === item.caseId)?.kind === 'generation'), true)
})

function sourcePacketForAuthority(modelKey: string, authority: ReturnType<typeof reviewAuthority>, secret: string) {
  const slots = authority.state.slots.filter((slot) => slot.canonicalModelId === modelKey && slot.status === 'succeeded')
  return createScientificReviewPacket({
    suiteManifestHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    packetId: `source-${modelKey}`,
    runHash: canonicalHash({ manifestHash: authority.manifest.manifestHash, modelKey }),
    issuedAt: CREATED_AT,
    signingSecret: secret,
    items: slots.map((slot) => {
      const scientificCase = authority.manifest.cases.find((item) => item.id === slot.caseId)!
      const attempt = slot.attempts.at(-1)!
      return {
        caseId: scientificCase.id,
        caseManifestHash: scientificCase.manifestHash,
        applicableAxes: scientificCase.applicableAxes,
        imageHash: attempt.rawImageHash!, rubric: scientificCase.rubric,
        attemptResult: { status: 'succeeded' as const, routeId: `${slot.provider}:${slot.modelId}`, attemptHash: attempt.attemptHash },
        instruction: scientificCase.instruction,
        ...(scientificCase.kind === 'generation'
          ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
          : { sourceHash: scientificCase.sourceHash, editedHash: attempt.editedHash!, region: scientificCase.region }),
      }
    }),
  })
}

function attestedReviewSources(registryHash: string, modelKeys: string[], packetSecret: string) {
  const authority = reviewAuthority(registryHash, modelKeys)
  const sources = authority.manifest.models.map((model) => ({
    modelKey: model.canonicalModelId,
    packet: sourcePacketForAuthority(model.canonicalModelId, authority, packetSecret),
    signingSecret: packetSecret,
  }))
  const certified = createScientificReviewSourceBindings({
    batchManifestHash: authority.manifest.manifestHash,
    manifest: authority.manifest,
    state: authority.state,
    sources,
  }, REVIEW_ATTESTATION_SECRET)
  return {
    ...authority,
    batchManifestHash: authority.manifest.manifestHash,
    sourceSetHash: certified.sourceSetHash,
    sources: sources.map((source, index) => ({ ...source, binding: certified.bindings[index] })),
  }
}

function reviewerSubmission(assignment: ReturnType<typeof createScientificBlindReviewPackages>['reviewerA'], score: number, overrides: Record<string, unknown> = {}) {
  return assignment.packages.map((packet) => ({
    packetHash: packet.packetHash,
    results: packet.items.map((item) => ({
      itemHash: item.itemHash,
      blindLabel: item.blindLabel,
      scores: Object.fromEntries(item.applicableAxes.map((axis) => [axis, score])),
      redLines: [],
      lowConfidence: false,
      ...overrides,
    })),
  }))
}

test('review roster retains a zero-success model while packaging only exact successful state items', () => {
  const packetSecret = REVIEW_PACKET_SIGNING_SECRET
  const authority = reviewAuthority(H64('e'), ['alpha'])
  const state = structuredClone(authority.state)
  const zeroModelKey = 'secret-model-alpha'
  for (const slot of state.slots.filter((candidate) => candidate.canonicalModelId === zeroModelKey)) {
    const original = slot.attempts[0]
    slot.attempts = Array.from({ length: 4 }, (_, index) => {
      const base = {
        ...original,
        attemptIndex: index + 1,
        responseClass: 'confirmed_provider_failure',
        rawImageHash: null, byteSize: null, width: null, height: null, format: null,
        editedHash: null,
      }
      const { attemptHash: _oldAttemptHash, ...attemptBase } = base
      return { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
    })
    slot.status = 'failed'
    slot.costCny = 4
  }
  state.providerSpentCny.bailian = 36
  const terminal = rehashStateSnapshot(state)
  verifyScientificV2BatchState(terminal, authority.manifest)
  const sources = authority.manifest.models.map((model) => model.canonicalModelId === zeroModelKey
    ? { modelKey: model.canonicalModelId, packet: null, signingSecret: null }
    : { modelKey: model.canonicalModelId, packet: sourcePacketForAuthority(model.canonicalModelId, { ...authority, state: terminal }, packetSecret), signingSecret: packetSecret })
  const bound = createScientificReviewSourceBindings({
    batchManifestHash: authority.manifest.manifestHash, manifest: authority.manifest, state: terminal, sources,
  }, REVIEW_ATTESTATION_SECRET)
  const packed = createScientificBlindReviewPackages({
    batchManifestHash: authority.manifest.manifestHash, manifest: authority.manifest, state: terminal,
    sourceSetHash: bound.sourceSetHash, seed: 'zero-success-roster',
    sources: sources.map((source, index) => ({ ...source, binding: bound.bindings[index] })),
  }, REVIEW_ATTESTATION_SECRET)
  assert.equal(packed.reviewerA.privateEnvelope.sources.some((source) => source.modelKey === zeroModelKey && source.runHash === null), true)
  assert.equal(packed.reviewerA.packages.flatMap((packet) => packet.items).length, 9)
  assert.throws(() => createScientificReviewSourceBindings({
    batchManifestHash: authority.manifest.manifestHash, manifest: authority.manifest, state: terminal,
    sources: sources.filter((source) => source.modelKey !== zeroModelKey),
  }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_MODEL_ROSTER_MISMATCH/)
})

test('blind A/B packages verify Core packets, mix stable ~24-item packets and expose no identity or automatic Judge', () => {
  const secret = REVIEW_PACKET_SIGNING_SECRET
  const attested = attestedReviewSources(H64('b'), ['alpha', 'beta', 'gamma'], secret)
  const mixed = createScientificBlindReviewPackages({
    batchManifestHash: attested.batchManifestHash,
    manifest: attested.manifest,
    state: attested.state,
    sourceSetHash: attested.sourceSetHash,
    seed: 'stable-scientific-seed',
    sources: attested.sources,
  }, REVIEW_ATTESTATION_SECRET)
  assert.deepEqual(mixed.automaticJudges, [])
  assert.equal(mixed.batchManifestHash, attested.batchManifestHash)
  assert.equal(JSON.stringify(mixed).includes(REVIEW_ATTESTATION_SECRET), false)
  assert.equal(JSON.stringify(mixed).includes(secret), false)
  assert.ok(mixed.reviewerA.privateEnvelope.sources.every((source) => typeof source.runHash === 'string' && /^[a-f0-9]{64}$/.test(source.runHash)
    && typeof source.sourcePacketHash === 'string' && /^[a-f0-9]{64}$/.test(source.sourcePacketHash)))
  assert.equal(mixed.reviewerA.packages.length, 2)
  assert.deepEqual(mixed.reviewerA.packages.map((packet) => packet.items.length), [24, 12])
  assert.notDeepEqual(mixed.reviewerA.packages[0].items.map((item) => item.blindLabel), mixed.reviewerB.packages[0].items.map((item) => item.blindLabel))
  assert.notDeepEqual(mixed.reviewerA.packages[0].items.map((item) => item.itemHash), mixed.reviewerB.packages[0].items.map((item) => item.itemHash))
  for (const reviewer of [mixed.reviewerA, mixed.reviewerB]) {
    const exposed = JSON.stringify(reviewer.packages)
    assert.equal(/secret-model|private-route|reviewerA|reviewerB|bailian|ark|openrouter/.test(exposed), false)
    assert.ok(reviewer.packages.every((packet) => packet.items.length <= 24 && /^[a-f0-9]{64}$/.test(packet.packetHash)))
    const publicItems = reviewer.packages.flatMap((packet) => packet.items)
    assert.ok(publicItems.filter((item) => item.kind === 'generation').every((item) => typeof item.negativePrompt === 'string' && typeof item.aspectRatio === 'string'))
    assert.ok(publicItems.filter((item) => item.kind === 'edit').every((item) => item.sourceHash && item.editedHash && item.region
      && item.negativePrompt === undefined && item.aspectRatio === undefined))
  }
  const single = attestedReviewSources(H64('b'), ['alpha'], secret)
  const tampered = structuredClone(single.sources[0].packet)
  tampered.items[0].itemHash = H64('0')
  const tamperedSources = single.sources.map((source, index) => index === 0 ? { ...source, packet: tampered } : source)
  assert.throws(() => createScientificBlindReviewPackages({ batchManifestHash: single.batchManifestHash, manifest: single.manifest, state: single.state, sourceSetHash: single.sourceSetHash, seed: 'x', sources: tamperedSources }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_REVIEW_ITEM_HASH_MISMATCH/)
})

test('review validation fails closed and finalization averages agreement or requires xhigh arbitration for disputes', () => {
  const secret = REVIEW_PACKET_SIGNING_SECRET
  const attested = attestedReviewSources(H64('b'), ['alpha'], secret)
  const mixed = createScientificBlindReviewPackages({ batchManifestHash: attested.batchManifestHash, manifest: attested.manifest, state: attested.state, sourceSetHash: attested.sourceSetHash, seed: 'stable', sources: attested.sources }, REVIEW_ATTESTATION_SECRET)
  const { privateMappings, privateEnvelope, ...publicAssignment } = mixed.reviewerA
  const assembledA = assembleScientificBlindReviewerAssignment({ publicAssignment, privateAssignment: { privateMappings, privateEnvelope } })
  assert.equal(assembledA.mappingHash, mixed.reviewerA.mappingHash)
  assert.throws(() => createScientificBlindReviewPackages({ batchManifestHash: attested.batchManifestHash, manifest: attested.manifest, state: attested.state, sourceSetHash: attested.sourceSetHash, seed: 's'.repeat(257), sources: attested.sources }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_SOURCE_INVALID/)
  const validatedA = validateScientificReviewerResults({ role: 'A', assignment: assembledA, submissions: reviewerSubmission(mixed.reviewerA, 8) }, REVIEW_ATTESTATION_SECRET)
  const validatedB = validateScientificReviewerResults({ role: 'B', assignment: mixed.reviewerB, submissions: reviewerSubmission(mixed.reviewerB, 6) }, REVIEW_ATTESTATION_SECRET)
  const tamperedAssignment = structuredClone(mixed.reviewerA)
  tamperedAssignment.packages[0].items[0].blindLabel = 'blind-tampered'
  assert.throws(() => validateScientificReviewerResults({ role: 'A', assignment: tamperedAssignment, submissions: reviewerSubmission(mixed.reviewerA, 8) }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED/)
  const averaged = finalizeScientificDoubleReview({ reviewerA: validatedA, reviewerB: validatedB, automaticJudges: [] }, REVIEW_ATTESTATION_SECRET)
  assert.equal(averaged.canFinalize, true)
  assert.equal(averaged.disputes.length, 0)
  assert.ok(averaged.results.every((item) => Object.values(item.scores).every((score) => score === 7)))
  const forgedValidatedA = structuredClone(validatedA)
  forgedValidatedA.items[0].scores[forgedValidatedA.items[0].applicableAxes[0]] = 7
  const { resultHash: _oldResultHash, resultAttestationHash: _oldResultAttestationHash, ...forgedResultBase } = forgedValidatedA
  forgedValidatedA.resultHash = canonicalHash(forgedResultBase)
  assert.throws(() => finalizeScientificDoubleReview({ reviewerA: forgedValidatedA, reviewerB: validatedB, automaticJudges: [] }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_RESULT_TAMPERED/)
  assert.equal(verifyScientificReviewIntegrityAttestation(averaged.attestation, REVIEW_ATTESTATION_SECRET), true)
  const tamperedAttestation: Record<string, unknown> = structuredClone(averaged.attestation)
  tamperedAttestation.automaticJudgeCalls = 1
  assert.equal(verifyScientificReviewIntegrityAttestation(tamperedAttestation, REVIEW_ATTESTATION_SECRET), false)

  const sameRedLineA = validateScientificReviewerResults({ role: 'A', assignment: mixed.reviewerA, submissions: reviewerSubmission(mixed.reviewerA, 8, { redLines: ['scientific_inaccuracy'] }) }, REVIEW_ATTESTATION_SECRET)
  const sameRedLineB = validateScientificReviewerResults({ role: 'B', assignment: mixed.reviewerB, submissions: reviewerSubmission(mixed.reviewerB, 8, { redLines: ['scientific_inaccuracy'] }) }, REVIEW_ATTESTATION_SECRET)
  const sameRedLineFinal = finalizeScientificDoubleReview({ reviewerA: sameRedLineA, reviewerB: sameRedLineB, automaticJudges: [] }, REVIEW_ATTESTATION_SECRET)
  assert.equal(sameRedLineFinal.disputes.length, 0)

  const disputedB = validateScientificReviewerResults({ role: 'B', assignment: mixed.reviewerB, submissions: reviewerSubmission(mixed.reviewerB, 4, { lowConfidence: true, redLines: ['instruction_violation'] }) }, REVIEW_ATTESTATION_SECRET)
  const pending = finalizeScientificDoubleReview({ reviewerA: validatedA, reviewerB: disputedB, automaticJudges: [] }, REVIEW_ATTESTATION_SECRET)
  assert.equal(pending.canFinalize, false)
  assert.equal(pending.disputes.length, 18)
  assert.deepEqual(pending.disputes[0].reasons, ['score_gap_gt_2', 'red_line_conflict', 'low_confidence'])
  const arbitration = {
    reasoningEffort: 'xhigh' as const,
    results: pending.disputes.map((dispute) => ({
      itemHash: dispute.itemHash,
      scores: Object.fromEntries(dispute.applicableAxes.map((axis) => [axis, 9])),
      redLines: [],
    })),
  }
  const final = finalizeScientificDoubleReview({ reviewerA: validatedA, reviewerB: disputedB, automaticJudges: [], arbitration }, REVIEW_ATTESTATION_SECRET)
  assert.equal(final.canFinalize, true)
  assert.ok(final.results.every((item) => Object.values(item.scores).every((score) => score === 9)))
  assert.throws(() => finalizeScientificDoubleReview({
    reviewerA: validatedA,
    reviewerB: disputedB,
    automaticJudges: [],
    arbitration: { ...arbitration, reasoningEffort: 'high' },
  }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_ARBITRATION_SET_INVALID/)

  assert.throws(() => validateScientificReviewerResults({ role: 'A', assignment: mixed.reviewerA, submissions: [] }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID/)
  const duplicate = reviewerSubmission(mixed.reviewerA, 8)
  duplicate[0].results.push(duplicate[0].results[0])
  assert.throws(() => validateScientificReviewerResults({ role: 'A', assignment: mixed.reviewerA, submissions: duplicate }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID/)
  const extra = reviewerSubmission(mixed.reviewerA, 8)
  Object.assign(extra[0].results[0], { provider: 'secret' })
  assert.throws(() => validateScientificReviewerResults({ role: 'A', assignment: mixed.reviewerA, submissions: extra }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_RESULT_SCHEMA_INVALID/)
  const oversizedRedLines = reviewerSubmission(mixed.reviewerA, 8, { redLines: Array.from({ length: 33 }, (_, index) => `red-${index}`) })
  assert.throws(() => validateScientificReviewerResults({ role: 'A', assignment: mixed.reviewerA, submissions: oversizedRedLines }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_RED_LINE_INVALID/)
  assert.throws(() => validateScientificReviewerResults({ role: 'A', assignment: mixed.reviewerA, submissions: reviewerSubmission(mixed.reviewerA, 8, { redLines: ['unknown_red_line'] }) }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_RED_LINE_INVALID/)
  const forbiddenAutomaticJudges: unknown[] = ['judge']
  assert.throws(() => finalizeScientificDoubleReview({ reviewerA: validatedA, reviewerB: validatedB, automaticJudges: forbiddenAutomaticJudges }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_AUTOMATIC_JUDGE_FORBIDDEN/)
})

test('source and assignment HMACs prevent model rebinding and cross-batch A/B finalization', () => {
  const packetSecret = REVIEW_PACKET_SIGNING_SECRET
  const batchB = attestedReviewSources(H64('b'), ['alpha'], packetSecret)
  const packedB = createScientificBlindReviewPackages({ batchManifestHash: batchB.batchManifestHash, manifest: batchB.manifest, state: batchB.state, sourceSetHash: batchB.sourceSetHash, seed: 'bound', sources: batchB.sources }, REVIEW_ATTESTATION_SECRET)
  const validatedA = validateScientificReviewerResults({ role: 'A', assignment: packedB.reviewerA, submissions: reviewerSubmission(packedB.reviewerA, 8) }, REVIEW_ATTESTATION_SECRET)
  assert.equal(validatedA.batchManifestHash, batchB.batchManifestHash)
  assert.equal(validatedA.sourceSetHash, batchB.sourceSetHash)
  assert.match(validatedA.assignmentAttestationHash, /^[a-f0-9]{64}$/)

  const rebound = structuredClone(batchB.sources)
  rebound[0].modelKey = 'secret-model-rebound'
  assert.throws(() => createScientificBlindReviewPackages({ batchManifestHash: batchB.batchManifestHash, manifest: batchB.manifest, state: batchB.state, sourceSetHash: batchB.sourceSetHash, seed: 'bound', sources: rebound }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_(MODEL_ROSTER_MISMATCH|SOURCE_BINDING_ATTESTATION_INVALID)/)
  for (const mutate of [
    (sources: typeof rebound) => { sources[0].binding.runHash = H64('1') },
    (sources: typeof rebound) => { sources[0].binding.sourcePacketHash = H64('2') },
    (sources: typeof rebound) => { sources[0].binding.bindingAttestation = H64('3') },
  ]) {
    const changed = structuredClone(batchB.sources)
    mutate(changed)
    assert.throws(() => createScientificBlindReviewPackages({ batchManifestHash: batchB.batchManifestHash, manifest: batchB.manifest, state: batchB.state, sourceSetHash: batchB.sourceSetHash, seed: 'bound', sources: changed }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_SOURCE_BINDING_ATTESTATION_INVALID/)
  }

  const batchC = attestedReviewSources(H64('c'), ['alpha'], packetSecret)
  const packedC = createScientificBlindReviewPackages({ batchManifestHash: batchC.batchManifestHash, manifest: batchC.manifest, state: batchC.state, sourceSetHash: batchC.sourceSetHash, seed: 'bound', sources: batchC.sources }, REVIEW_ATTESTATION_SECRET)
  const validatedB = validateScientificReviewerResults({ role: 'B', assignment: packedC.reviewerB, submissions: reviewerSubmission(packedC.reviewerB, 8) }, REVIEW_ATTESTATION_SECRET)
  assert.throws(() => finalizeScientificDoubleReview({ reviewerA: validatedA, reviewerB: validatedB, automaticJudges: [] }, REVIEW_ATTESTATION_SECRET), /SCIENTIFIC_V2_REVIEW_BINDING_MISMATCH/)
  assert.throws(() => createScientificReviewSourceBindings({ batchManifestHash: batchB.batchManifestHash, manifest: batchB.manifest, state: batchB.state, sources: batchB.sources.map(({ binding: _binding, ...source }) => source) }, 'short'), /SCIENTIFIC_V2_REVIEW_ATTESTATION_SECRET_INVALID/)
})

test('built scientific v2 operator executes inspect, production run, Codex import and review finalize', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-operator-'))
  const artifactSpool = join(root, 'artifact-spool')
  const codexArtifactRoot = join(root, 'codex-artifacts')
  mkdirSync(artifactSpool, { mode: 0o700 })
  mkdirSync(codexArtifactRoot, { mode: 0o700 })
  const executable = join(process.cwd(), 'dist/scientific-v2-operator.mjs')
  const distLoader = join(process.cwd(), 'tests/fixtures/scientific-v2-dist-loader.mjs')
  const distRuntime = join(process.cwd(), 'tests/fixtures/scientific-v2-dist-runtime.mjs')
  let distRunImageBase64 = ''
  const runBundle = (name: string, bundle: unknown) => {
    const path = join(root, `${name}.json`)
    writeFileSync(path, JSON.stringify(bundle), { mode: 0o600 })
    const expectedBundleSha256 = createHash('sha256').update(readFileSync(path)).digest('hex')
    const privateOutputPath = join(root, `${name}.private.json`)
    const ossAuditPath = join(root, `${name}.oss-audit.txt`)
    const result = spawnSync(process.execPath, [executable], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH: path,
        PAPERBANANA_SCIENTIFIC_V2_SPOOL_DIR: root,
        PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256: expectedBundleSha256,
        ...(name === 'import' ? { PAPERBANANA_SCIENTIFIC_V2_CODEX_ARTIFACT_DIR: codexArtifactRoot } : {}),
        ...(['review-pack', 'review-validate-a', 'review-validate-b', 'review-arbitrate', 'review'].includes(name) ? {
          PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_PATH: privateOutputPath,
          PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_DIR: root,
        } : {}),
        ...(['import', 'run'].includes(name) ? {
          NODE_OPTIONS: `--experimental-loader=${distLoader}`,
          PAPERBANANA_BENCH_OSS_REGION: 'oss-cn-hongkong', PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID: 'dist-oss-id',
          PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET: 'dist-oss-secret', PAPERBANANA_BENCH_OSS_BUCKET: 'dist-private-bucket',
          PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT: 'https://oss-cn-hongkong-internal.aliyuncs.com',
          PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH: SCIENTIFIC_EDIT_SOURCE.pngPath,
          SCIENTIFIC_V2_DIST_OSS_AUDIT_PATH: ossAuditPath,
        } : {}),
        ...(name === 'run' ? {
          PAPERBANANA_BENCH_ENABLED: 'false', PAPERBANANA_BENCH_CONCURRENCY: '1',
          PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED: 'true', PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF: LOCK_NAME,
          PAPERBANANA_BENCH_MONGODB_URI: 'mongodb://dist-test.invalid/benchmark',
          PAPERBANANA_BENCH_MONGO_DB: 'paperbanana_benchmark',
          PAPERBANANA_BENCH_BAILIAN_API_KEY: 'dist-bailian-secret', PAPERBANANA_BENCH_ARK_API_KEY: 'dist-ark-secret',
          PAPERBANANA_BENCH_OPENROUTER_API_KEY: 'dist-openrouter-secret',
          PAPERBANANA_BENCH_IMAGE_RUNTIME_PATH: distRuntime,
          PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR: artifactSpool,
          SCIENTIFIC_V2_DIST_TEST_IMAGE_BASE64: distRunImageBase64,
        } : {}),
      },
    })
    assert.equal(result.status, 0, result.stderr)
    const parsed = JSON.parse(result.stdout)
    if (name === 'import') assert.equal(readFileSync(ossAuditPath, 'utf8').trim().split('\n').length, 10)
    if (name !== 'import' && name !== 'run') assert.equal(parsed.providerCalls, 0)
    if (name === 'review-pack') {
      const privateArtifact = JSON.parse(readFileSync(privateOutputPath, 'utf8'))
      assert.equal(JSON.stringify(parsed).includes('privateMappings'), false)
      assert.equal(JSON.stringify(parsed).includes('privateEnvelope'), false)
      assert.equal(JSON.stringify(parsed).includes('modelKey'), false)
      assert.equal(JSON.stringify(parsed).includes('runHash'), false)
      assert.equal(JSON.stringify(privateArtifact).includes('privateMappings'), true)
    }
    return parsed
  }
  try {
    const manifest = canonicalManifest()
    assert.equal(runBundle('inspect', {
      operation: 'inspect', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
      batchInput: { canonicalManifest: manifest, registrySnapshot: registrySnapshot(manifest), suiteHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash, codeSha: CODE_SHA, priceSnapshot: priceSnapshot(manifest), createdAt: CREATED_AT },
    }).operation, 'inspect')

    const codex = await codexArtifacts()
    const serializedCodex = {
      ...codex,
      toolCalls: codex.toolCalls.map((call) => {
        const { bytes, ...rest } = call
        const fileName = `${call.sha256}.${call.format}`
        const path = join(codexArtifactRoot, fileName)
        writeFileSync(path, bytes, { mode: 0o600 })
        return { ...rest, artifactRef: { schemaVersion: 1, fileName, sha256: call.sha256, byteSize: bytes.length, format: call.format } }
      }),
    }
    const importOutput = runBundle('import', {
      operation: 'import_codex', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
      input: {
        ...serializedCodex,
        batchId: 'scientific-v2-dist-import', revision: 2,
        previousStateHash: codex.state.stateHash, createdAt: '2026-08-31T03:00:00.000Z',
        attestationSecret: STATE_OPERATION_REPORT_SECRET,
      },
    })
    assert.deepEqual(Object.keys(importOutput), ['report', 'reportHash', 'attestationHash'])
    assert.equal(importOutput.report.kind, 'codex')
    assert.equal(importOutput.report.batchId, 'scientific-v2-dist-import')
    assert.equal(importOutput.report.previousStateHash, codex.state.stateHash)
    assert.equal(importOutput.report.stateHash, importOutput.report.state.stateHash)
    assert.equal(importOutput.report.reportHash, importOutput.reportHash)
    assert.equal(verifyScientificV2SignedStateOperationReport(importOutput, STATE_OPERATION_REPORT_SECRET), true)
    assert.deepEqual(
      normalizeApiScientificV2SignedStateOperationReport(importOutput, STATE_OPERATION_REPORT_SECRET),
      importOutput,
    )
    assert.equal(JSON.stringify(importOutput).includes(STATE_OPERATION_REPORT_SECRET), false)

    const production = batchFor(manifest)
    distRunImageBase64 = codex.toolCalls[0].bytes.toString('base64')
    const runOutput = runBundle('run', {
      operation: 'run', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
      manifest: production.manifest, state: production.state,
      report: {
        batchId: 'scientific-v2-dist-run', revision: 1,
        createdAt: '2026-08-31T03:30:00.000Z', attestationSecret: STATE_OPERATION_REPORT_SECRET,
      },
    })
    assert.deepEqual(Object.keys(runOutput), ['report', 'reportHash', 'attestationHash'])
    assert.equal(runOutput.report.kind, 'worker')
    assert.equal(runOutput.report.state.status, 'awaiting_artifacts', JSON.stringify({
      pauseReason: runOutput.report.state.pauseReason,
      slots: runOutput.report.state.slots.slice(0, 2),
    }))
    assert.notEqual(runOutput.report.previousStateHash, runOutput.report.stateHash)
    assert.equal(runOutput.report.state.slots.filter((slot: ScientificV2BatchState['slots'][number]) => slot.provider === 'bailian' && slot.status === 'succeeded').length, 9)
    assert.equal(verifyScientificV2SignedStateOperationReport(runOutput, STATE_OPERATION_REPORT_SECRET), true)
    assert.deepEqual(normalizeApiScientificV2SignedStateOperationReport(runOutput, STATE_OPERATION_REPORT_SECRET), runOutput)
    assert.equal(JSON.stringify(runOutput).includes('dist-bailian-secret'), false)

    const secret = REVIEW_PACKET_SIGNING_SECRET
    const operatorAttested = attestedReviewSources(H64('b'), ['alpha'], secret)
    const reviewPackOutput = runBundle('review-pack', {
      operation: 'review_pack', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
      input: { batchManifestHash: operatorAttested.batchManifestHash, manifest: operatorAttested.manifest, state: operatorAttested.state, sourceSetHash: operatorAttested.sourceSetHash, seed: 'operator-review', sources: operatorAttested.sources, attestationSecret: REVIEW_ATTESTATION_SECRET },
    })
    assert.equal(reviewPackOutput.operation, 'review_pack')
    assert.equal(JSON.stringify(reviewPackOutput).includes(REVIEW_ATTESTATION_SECRET), false)
    const mixed = createScientificBlindReviewPackages({ batchManifestHash: operatorAttested.batchManifestHash, manifest: operatorAttested.manifest, state: operatorAttested.state, sourceSetHash: operatorAttested.sourceSetHash, seed: 'operator-review', sources: operatorAttested.sources }, REVIEW_ATTESTATION_SECRET)
    const splitAssignment = (assignment: typeof mixed.reviewerA | typeof mixed.reviewerB) => {
      const { privateMappings, privateEnvelope, ...publicAssignment } = assignment
      return { publicAssignment, privateAssignment: { privateMappings, privateEnvelope } }
    }
    const splitA = splitAssignment(mixed.reviewerA)
    const splitB = splitAssignment(mixed.reviewerB)
    const validatedAOutput = runBundle('review-validate-a', {
      operation: 'review_validate', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
      input: { role: 'A', ...splitA, submissions: reviewerSubmission(mixed.reviewerA, 8), attestationSecret: REVIEW_ATTESTATION_SECRET },
    })
    const validatedBOutput = runBundle('review-validate-b', {
      operation: 'review_validate', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
      input: { role: 'B', ...splitB, submissions: reviewerSubmission(mixed.reviewerB, 4, { lowConfidence: true }), attestationSecret: REVIEW_ATTESTATION_SECRET },
    })
    assert.equal(JSON.stringify(validatedAOutput).includes('privateMappings'), false)
    const reviewerA = JSON.parse(readFileSync(join(root, 'review-validate-a.private.json'), 'utf8')).result
    const reviewerB = JSON.parse(readFileSync(join(root, 'review-validate-b.private.json'), 'utf8')).result
    const pending = finalizeScientificDoubleReview({ reviewerA, reviewerB, automaticJudges: [] }, REVIEW_ATTESTATION_SECRET)
    assert.equal(pending.canFinalize, false)
    const arbitration = {
      reasoningEffort: 'xhigh' as const,
      results: pending.disputes.map((dispute) => ({
        itemHash: dispute.itemHash,
        scores: Object.fromEntries(dispute.applicableAxes.map((axis) => [axis, 7])),
        redLines: [],
      })),
    }
    const arbitrationOutput = runBundle('review-arbitrate', {
      operation: 'review_arbitrate', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
      input: { reviewerA, reviewerB, automaticJudges: [], arbitration, attestationSecret: REVIEW_ATTESTATION_SECRET },
    })
    assert.equal(arbitrationOutput.canFinalize, true)
    assert.equal(JSON.stringify(arbitrationOutput).includes(REVIEW_ATTESTATION_SECRET), false)
    const reviewOutput = runBundle('review', {
      operation: 'review_finalize', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME }, input: { reviewerA, reviewerB, automaticJudges: [], arbitration, attestationSecret: REVIEW_ATTESTATION_SECRET },
    })
    assert.equal(reviewOutput.operation, 'review_finalize')
    assert.equal(Object.hasOwn(reviewOutput, 'results'), false)
    assert.equal(Object.hasOwn(reviewOutput, 'disputes'), false)
    assert.match(reviewOutput.resultsHash, /^[a-f0-9]{64}$/)
    const privateFinal = JSON.parse(readFileSync(join(root, 'review.private.json'), 'utf8'))
    assert.equal(Array.isArray(privateFinal.results), true)
    assert.equal(JSON.stringify(reviewOutput).includes(REVIEW_ATTESTATION_SECRET), false)

    const missing = spawnSync(process.execPath, [executable], { encoding: 'utf8', env: { ...process.env, PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH: '' } })
    assert.notEqual(missing.status, 0)
    assert.match(missing.stderr, /SCIENTIFIC_V2_OPERATOR_BUNDLE_PATH_REQUIRED/)
    assert.equal(`${missing.stdout}${missing.stderr}`.includes('PROVIDER_DISPATCH'), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
