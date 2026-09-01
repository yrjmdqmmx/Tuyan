import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmodSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import sharp from 'sharp'

import { SCIENTIFIC_EDIT_SOURCE, canonicalHash } from '@paperbanana/benchmark-core'

import { createScientificV2ProductionRunDependencies, executeScientificV2OperatorBundle } from '../src/scientific-v2-operator-runtime.js'
import {
  createScientificV2ProviderExecutor,
  createScientificV2PublicEvidenceInput,
  createScientificV2MongoLeaseLock,
  createScientificV2MongoRepository,
  createScientificV2ArtifactSpool,
  createScientificV2OssArtifactStore,
  createScientificV2OssEvidenceStore,
  type ScientificV2ProductionArtifact,
  type ScientificV2ProductionArtifactStore,
} from '../src/scientific-v2-production.js'
import * as scientificV2Production from '../src/scientific-v2-production.js'
import { deepFreezeScientificV2 } from '../src/scientific-v2-common.js'
import { ScientificConfirmedFailureError, ScientificV2ArtifactReconciliationRequiredError, runScientificV2Batch } from '../src/scientific-v2-runner.js'
import { UnknownProviderOutcomeError } from '../src/provider-operation.js'
import { productionAtomicDb, productionBatchFixture } from './scientific-v2-production-fixture.js'
import { createScientificV2SignedStateOperationReport, verifyScientificV2SignedStateOperationReport } from '../src/scientific-v2-state-report.js'

const LOCK_NAME = '/run/lock/paperbanana-hk-production.lock'
const ARTIFACT_SPOOL_DIR = mkdtempSync(join(tmpdir(), 'scientific-v2-production-spool-'))
chmodSync(ARTIFACT_SPOOL_DIR, 0o700)
const BUILD_PROVENANCE_DIR = mkdtempSync(join(tmpdir(), 'scientific-v2-production-provenance-'))
chmodSync(BUILD_PROVENANCE_DIR, 0o700)
const BUILD_PROVENANCE_PATH = join(BUILD_PROVENANCE_DIR, 'build-provenance.json')
writeFileSync(BUILD_PROVENANCE_PATH, JSON.stringify({ codeSha: 'a'.repeat(40) }), { mode: 0o600 })
const validEnv = {
  PAPERBANANA_BENCH_ENABLED: 'false',
  PAPERBANANA_BENCH_CONCURRENCY: '1',
  PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED: 'true',
  PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF: LOCK_NAME,
  PAPERBANANA_BENCH_MONGODB_URI: 'mongodb://bench.invalid/test',
  PAPERBANANA_BENCH_MONGO_DB: 'paperbanana_benchmark',
  PAPERBANANA_BENCH_BAILIAN_API_KEY: 'bailian-test-secret',
  PAPERBANANA_BENCH_ARK_API_KEY: 'ark-test-secret',
  PAPERBANANA_BENCH_OPENROUTER_API_KEY: 'openrouter-test-secret',
  PAPERBANANA_BENCH_OSS_REGION: 'oss-cn-hongkong',
  PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID: 'oss-test-id',
  PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET: 'oss-test-secret',
  PAPERBANANA_BENCH_OSS_BUCKET: 'private-test-bucket',
  PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT: 'https://oss-cn-hongkong-internal.aliyuncs.com',
  PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT: 'https://oss-cn-hongkong.aliyuncs.com',
  PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH: SCIENTIFIC_EDIT_SOURCE.pngPath,
  PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR: ARTIFACT_SPOOL_DIR,
  PAPERBANANA_CODE_SHA: 'a'.repeat(40),
  PAPERBANANA_SCIENTIFIC_V2_CANONICAL_PROVENANCE_PATH: BUILD_PROVENANCE_PATH,
}

function normalExecution(manifest: { codeSha: string }) {
  return { manifestCodeSha: manifest.codeSha, executionCodeSha: manifest.codeSha, legacyRecoveryStateHash: null }
}

test('production dependency factory loads nothing before the exact disabled gate and validates secrets before runtime load', async () => {
  let connectorCalls = 0
  const dependencies = {
    async connectMongo() { connectorCalls += 1; throw new Error('must not connect') },
    async createArtifactStore() { connectorCalls += 1; throw new Error('must not create OSS') },
    async loadAuthoritativeRuntime() { connectorCalls += 1; throw new Error('must not load runtime') },
  }
  await assert.rejects(
    () => createScientificV2ProductionRunDependencies({ ...validEnv, PAPERBANANA_BENCH_ENABLED: 'true' }, dependencies),
    /SCIENTIFIC_V2_PRODUCTION_RUN_GATE_INVALID/,
  )
  assert.equal(connectorCalls, 0)

  const missingSecret = { ...validEnv }
  delete (missingSecret as Partial<typeof validEnv>).PAPERBANANA_BENCH_ARK_API_KEY
  await assert.rejects(
    () => createScientificV2ProductionRunDependencies(missingSecret, dependencies),
    /SCIENTIFIC_V2_PRODUCTION_ENV_INVALID/,
  )
  await assert.rejects(
    () => createScientificV2ProductionRunDependencies({ ...validEnv, PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT: '' }, dependencies),
    /SCIENTIFIC_V2_PRODUCTION_ENV_INVALID/,
  )
  await assert.rejects(
    () => createScientificV2ProductionRunDependencies({
      ...validEnv, PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT: validEnv.PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT,
    }, dependencies),
    /SCIENTIFIC_V2_PRODUCTION_ENV_INVALID/,
  )
  assert.equal(connectorCalls, 0)
})

test('production dependency factory wires atomic repository, renewable DB lock, executor and cleanup with fakes', async () => {
  const calls: string[] = []
  const fakeCollection = {}
  const fakeDb = { collection() { return fakeCollection } }
  const artifactStore: ScientificV2ProductionArtifactStore = { async persist() { calls.push('persist') } }
  const repository = {
    async claimReady() { return null }, async saveClaimed(input: any) { return input.nextState },
    async beginDispatch() { return { status: 'started' as const } }, async commitAttempt(input: any) { return input.nextState },
    async resolveDispatch() { return { status: 'started' as const } }, async markUnknown(input: any) { return input.nextState },
    async recordReleaseFailure() {},
  }
  const lock = {
    leaseMs: 120_000, heartbeatIntervalMs: 30_000,
    async acquire() { return 'lock-token' }, async heartbeat() {}, async release() {},
  }
  const created = await createScientificV2ProductionRunDependencies(validEnv, {
    async connectMongo() {
      calls.push('mongo')
      return { db: fakeDb, async close() { calls.push('close') } }
    },
    async createArtifactStore() { calls.push('oss'); return artifactStore },
    createRepository() { return repository },
    createLock() { return lock },
    async loadAuthoritativeRuntime() {
      calls.push('runtime')
      return { async generate() { throw new Error('unused') }, async edit() { throw new Error('unused') } }
    },
    fetchImpl: async () => { throw new Error('unused') },
  })
  assert.deepEqual(calls, ['mongo', 'oss', 'runtime'])
  assert.equal(typeof created.repository.claimReady, 'function')
  assert.equal(typeof created.lock.heartbeat, 'function')
  assert.equal(typeof created.executor.execute, 'function')
  assert.equal(created.recorder.recordAttempt.constructor.name, 'AsyncFunction')
  await created.close()
  assert.deepEqual(calls, ['mongo', 'oss', 'runtime', 'close'])
})

test('production executor uses frozen generation and direct-edit routes, bounded outputs and estimated CNY attestation', async () => {
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#abc' } }).png().toBuffer()
  const imageHash = createHash('sha256').update(png).digest('hex')
  const runtimeCalls: Array<Record<string, unknown>> = []
  const persisted: ScientificV2ProductionArtifact[] = []
  const artifactStore: ScientificV2ProductionArtifactStore = { async persist(value) { persisted.push(value) } }
  const executor = createScientificV2ProviderExecutor({
    runtime: {
      async generate(input) {
        runtimeCalls.push({ operation: 'generation', ...input })
        return `data:image/png;base64,${png.toString('base64')}`
      },
      async edit(input) {
        runtimeCalls.push({ operation: 'edit', ...input })
        return `data:image/png;base64,${png.toString('base64')}`
      },
    },
    credentials: { bailian: 'b-secret', ark: 'a-secret', openrouter: 'o-secret' },
    artifactStore,
    fetchImpl: async () => new Response(png, { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(png.length) } }),
  })
  const generated = await executor.execute({
    slotId: 'generation-slot', canonicalModelId: 'canonical:model', caseId: 'generation-case',
    provider: 'bailian', modelId: 'frozen-generation-model', operation: 'generation', attemptIndex: 1,
    payloadHash: '1'.repeat(64), instruction: 'draw exact content', negativePrompt: 'no extra text',
    aspectRatio: '16:9', imageSize: '2K', estimatedCny: 1.25,
  })
  const edited = await executor.execute({
    slotId: 'edit-slot', canonicalModelId: 'canonical:model', caseId: 'edit-case',
    provider: 'ark', modelId: 'frozen-direct-edit-model', operation: 'edit', attemptIndex: 1,
    payloadHash: '2'.repeat(64), instruction: 'edit only region 1', sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash,
    region: '01-text-label', imageSize: '2K', estimatedCny: 2.5,
  })

  assert.equal(generated.actualCny, 1.25)
  assert.equal(edited.actualCny, 2.5)
  assert.equal(Buffer.compare(generated.bytes, png), 0)
  assert.equal(Buffer.compare(edited.bytes, png), 0)
  assert.equal(runtimeCalls[0].model, 'frozen-generation-model')
  assert.equal(runtimeCalls[0].provider, 'bailian')
  assert.match(String(runtimeCalls[0].prompt), /draw exact content[\s\S]*no extra text/)
  assert.equal(runtimeCalls[1].model, 'frozen-direct-edit-model')
  assert.equal(runtimeCalls[1].provider, 'ark')
  assert.match(String(runtimeCalls[1].sourceImage), /^data:image\/png;base64,/)
  const sourceBytes = Buffer.from(String(runtimeCalls[1].sourceImage).split(',')[1], 'base64')
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), SCIENTIFIC_EDIT_SOURCE.sourceHash)
  assert.equal(persisted.length, 3)
  assert.deepEqual(persisted.map((item) => item.objectKey), [
    `bench/scientific-v2/private/objects/${imageHash}.png`,
    `bench/scientific-v2/private/objects/${SCIENTIFIC_EDIT_SOURCE.sourceHash}.png`,
    `bench/scientific-v2/private/objects/${imageHash}.png`,
  ])
  assert.equal(JSON.stringify({ runtimeCalls, persisted }).includes('b-secret'), true)
  assert.equal(JSON.stringify(persisted).includes('secret'), false)
})

test('production Bailian direct edit uses a short-lived public OSS URL for the fixed source image', async () => {
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#abd' } }).png().toBuffer()
  const runtimeCalls: Array<Record<string, unknown>> = []
  const persisted: ScientificV2ProductionArtifact[] = []
  const signedSourceUrl = 'https://private-test-bucket.oss-cn-hongkong.aliyuncs.com/bench/source.png?x-oss-signature=test'
  const artifactStore = {
    async persist(value: ScientificV2ProductionArtifact) { persisted.push(value) },
    async createSignedReadUrl(input: { objectKey: string; expiresSeconds: number }) {
      assert.equal(input.objectKey, `bench/scientific-v2/private/objects/${SCIENTIFIC_EDIT_SOURCE.sourceHash}.png`)
      assert.equal(input.expiresSeconds, 900)
      return signedSourceUrl
    },
  } as ScientificV2ProductionArtifactStore & {
    createSignedReadUrl(input: { objectKey: string; expiresSeconds: number }): Promise<string>
  }
  const executor = createScientificV2ProviderExecutor({
    runtime: {
      async generate() { throw new Error('unused') },
      async edit(input) {
        runtimeCalls.push({ operation: 'edit', ...input })
        return `data:image/png;base64,${png.toString('base64')}`
      },
    },
    credentials: { bailian: 'b-secret', ark: 'a-secret', openrouter: 'o-secret' },
    artifactStore,
    fetchImpl: async () => { throw new Error('unused') },
  })

  await executor.execute({
    slotId: 'bailian-edit-slot', canonicalModelId: 'qwen-image-2.0', caseId: 'edit-case',
    provider: 'bailian', modelId: 'qwen-image-2.0', operation: 'edit', attemptIndex: 1,
    payloadHash: '9'.repeat(64), instruction: 'edit only region 1', sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash,
    region: '01-text-label', imageSize: '2K', estimatedCny: 0.2,
  })

  assert.equal(runtimeCalls.length, 1)
  assert.equal(runtimeCalls[0].sourceImage, signedSourceUrl)
  assert.equal(persisted[0].imageHash, SCIENTIFIC_EDIT_SOURCE.sourceHash)
  assert.equal(JSON.stringify(persisted).includes('x-oss-signature'), false)
})

test('production Bailian source handoff failure is confirmed locally before any provider call and charges zero', async () => {
  let runtimeCalls = 0
  const executor = createScientificV2ProviderExecutor({
    runtime: {
      async generate() { throw new Error('unused') },
      async edit() { runtimeCalls += 1; throw new Error('must not call provider') },
    },
    credentials: { bailian: 'b-secret', ark: 'a-secret', openrouter: 'o-secret' },
    artifactStore: {
      async persist() {},
      async createSignedReadUrl() { throw new Error('local signer unavailable') },
    },
    fetchImpl: async () => { throw new Error('unused') },
  })

  await assert.rejects(() => executor.execute({
    slotId: 'bailian-edit-slot', canonicalModelId: 'qwen-image-2.0', caseId: 'edit-case',
    provider: 'bailian', modelId: 'qwen-image-2.0', operation: 'edit', attemptIndex: 1,
    payloadHash: '8'.repeat(64), instruction: 'edit only region 1', sourceHash: SCIENTIFIC_EDIT_SOURCE.sourceHash,
    region: '01-text-label', imageSize: '2K', estimatedCny: 0.2,
  }), (error: unknown) => error instanceof ScientificConfirmedFailureError
    && error.responseClass === 'confirmed_technical_failure' && error.actualCny === 0)
  assert.equal(runtimeCalls, 0)
})

test('production executor never retries unknown failures and only confirms an error carrying a provider response status', async () => {
  let calls = 0
  const artifactStore: ScientificV2ProductionArtifactStore = { async persist() {} }
  const request = {
    slotId: 'slot', canonicalModelId: 'canonical:model', caseId: 'case', provider: 'openrouter' as const,
    modelId: 'frozen-model', operation: 'generation' as const, attemptIndex: 1, payloadHash: '3'.repeat(64),
    instruction: 'draw', negativePrompt: '', aspectRatio: '16:9', imageSize: '2K' as const, estimatedCny: 3,
  }
  const unknownExecutor = createScientificV2ProviderExecutor({
    runtime: { async generate() { calls += 1; throw new Error('socket timed out') }, async edit() { throw new Error('unused') } },
    credentials: { bailian: 'b', ark: 'a', openrouter: 'o' }, artifactStore,
    fetchImpl: async () => { throw new Error('unused') },
  })
  await assert.rejects(() => unknownExecutor.execute(request), UnknownProviderOutcomeError)
  assert.equal(calls, 1)

  const confirmed = Object.assign(new Error('provider returned 503'), { status: 503 })
  const confirmedExecutor = createScientificV2ProviderExecutor({
    runtime: { async generate() { throw confirmed }, async edit() { throw new Error('unused') } },
    credentials: { bailian: 'b', ark: 'a', openrouter: 'o' }, artifactStore,
    fetchImpl: async () => { throw new Error('unused') },
  })
  await assert.rejects(
    () => confirmedExecutor.execute(request),
    (error: unknown) => error instanceof ScientificConfirmedFailureError
      && error.responseClass === 'confirmed_provider_failure' && error.actualCny === 3,
  )
  for (const spoofed of [
    Object.assign(new Error('fake'), { status: '503' }), Object.assign(new Error('fake'), { status: true }),
    Object.assign(new Error('fake'), { status: new Number(503) }), Object.assign(new Error('fake'), { response: { status: '503' } }),
    new Error('provider failed: HTTP 503'),
  ]) {
    let spoofCalls = 0
    const executor = createScientificV2ProviderExecutor({
      runtime: { async generate() { spoofCalls += 1; throw spoofed }, async edit() { throw new Error('unused') } },
      credentials: { bailian: 'b', ark: 'a', openrouter: 'o' }, artifactStore, fetchImpl: async () => { throw new Error('unused') },
    })
    await assert.rejects(() => executor.execute(request), UnknownProviderOutcomeError)
    assert.equal(spoofCalls, 1)
  }
})

test('production Mongo atomic repository resolves commit acknowledgement loss and keeps commit idempotent', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  const now = () => new Date('2026-08-31T04:00:00.000Z')
  const repository = createScientificV2MongoRepository(storage.db, now, () => 'atomic-production-claim-token')
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.state.stateHash })
  assert.ok(claim)
  assert.equal(claim.state.status, 'running')
  assert.equal(Object.isFrozen(claim.state), true)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].stateTransitionFromHash, fixture.state.stateHash)

  const slot = claim.state.slots.find((candidate) => candidate.provider === 'bailian' && candidate.operation === 'generation')!
  const scientificCase = fixture.manifest.cases.find((candidate) => candidate.id === slot.caseId)!
  if (scientificCase.kind !== 'generation') throw new Error('production fixture generation case mismatch')
  const payloadHash = canonicalHash({
    route: { provider: slot.provider, modelId: slot.modelId }, operation: slot.operation,
    imageSize: slot.imageSize,
    caseId: scientificCase.id, instruction: scientificCase.instruction,
    negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio,
  })
  const marker = { manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, attemptIndex: 1, payloadHash }
  assert.deepEqual(await repository.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker }), { status: 'started' })

  const nextState = structuredClone(claim.state)
  const nextSlot = nextState.slots.find((candidate) => candidate.slotId === slot.slotId)!
  const attemptBase = {
    attemptIndex: 1, provider: 'bailian' as const, model: slot.modelId!, operation: 'generation' as const,
    payloadHash, responseClass: 'succeeded', estimatedCny: 1, actualCny: 1,
    startedAt: '2026-08-31T04:00:00.000Z', completedAt: '2026-08-31T04:00:01.000Z',
    rawImageHash: 'f'.repeat(64), byteSize: 1024, width: 2048, height: 1152, format: 'png' as const,
    sourceHash: null, editedHash: null,
  }
  const attempt = { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
  nextSlot.attempts = [attempt]
  nextSlot.status = 'succeeded'
  nextSlot.costCny = 1
  nextState.providerSpentCny.bailian = 1
  nextState.updatedAt = '2026-08-31T04:00:01.000Z'
  const { stateHash: _oldStateHash, ...stateBase } = nextState
  nextState.stateHash = canonicalHash(stateBase)
  const frozenNext = deepFreezeScientificV2(nextState)

  storage.failNextDispatchUpdate()
  await assert.rejects(() => repository.commitAttempt({
    claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt, nextState: frozenNext,
  }), /SIMULATED_DISPATCH_UPDATE_FAILURE/)
  const rolledBackBatch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(rolledBackBatch.stateHash, claim.state.stateHash)
  assert.deepEqual(await repository.resolveDispatch({ claimToken: claim.claimToken, marker }), { status: 'started' })
  assert.equal(storage.transactionCallsWithoutSession(), 0)

  storage.loseNextCommitAck()
  await assert.rejects(() => repository.commitAttempt({
    claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt, nextState: frozenNext,
  }), /SIMULATED_ACK_LOSS/)
  const resolved = await repository.resolveDispatch({ claimToken: claim.claimToken, marker })
  assert.equal(resolved.status, 'committed')
  if (resolved.status !== 'committed') throw new Error('commit not resolved')
  assert.equal(resolved.state.stateHash, frozenNext.stateHash)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].stateTransitionFromHash, claim.state.stateHash)
  assert.equal((await repository.commitAttempt({
    claimToken: claim.claimToken, expectedStateHash: '0'.repeat(64), marker, attempt, nextState: frozenNext,
  })).stateHash, frozenNext.stateHash)
})

test('completed batch loader accepts every post-generation API control status without weakening signed state binding', async () => {
  let observedFilter: Record<string, unknown> | undefined
  const db = {
    collection() {
      return {
        async findOne(filter: Record<string, unknown>) {
          observedFilter = filter
          return null
        },
      }
    },
  }
  const repository = createScientificV2MongoRepository(db as any)
  await assert.rejects(
    () => repository.loadCompletedBatch({ batchId: 'batch', manifestHash: 'a'.repeat(64), stateHash: 'b'.repeat(64) }),
    /SCIENTIFIC_V2_PUBLIC_RENDER_BATCH_BINDING_INVALID/,
  )
  assert.deepEqual(observedFilter?.status, { $in: ['completed', 'review_ready', 'review_dispute', 'review_finalized', 'published'] })
  assert.equal(observedFilter?.['state.status'], 'completed')
})

test('production Mongo canary completion atomically releases its claim and full resume never redispatches the canary', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#abc' } }).png().toBuffer()
  const calls: string[] = []
  const dependencies = {
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    executor: { async execute(request: any) {
      calls.push(request.slotId)
      return { responseClass: 'succeeded' as const, actualCny: request.estimatedCny, bytes: png }
    } },
  }
  const canaryRepository = createScientificV2MongoRepository(storage.db, () => new Date('2026-08-31T04:10:00.000Z'), () => 'mongo-canary-claim')
  const canary = await runScientificV2Batch({
    manifest: fixture.manifest, state: fixture.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2', phase: 'canary-only' },
    repository: canaryRepository,
    lock: createScientificV2MongoLeaseLock(storage.db, { ownerToken: 'mongo-canary-lock' }),
    ...dependencies,
  })
  assert.equal(canary.state.status, 'canary_complete')
  const canarySlotIds = new Set(canary.state.slots.filter((slot) => slot.isProviderCanary).map((slot) => slot.slotId))
  const row = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(Object.hasOwn(row, 'claimToken'), false)
  assert.equal(Object.hasOwn(row, 'claimLeaseExpiresAt'), false)
  const releaseUpdate = [...storage.findOneAndUpdateCalls].reverse().find((call) => call.collection === 'paperbanana_benchmark_scientific_v2_batches'
    && call.update.$set?.status === 'canary_complete')
  assert.ok(releaseUpdate)
  assert.deepEqual(releaseUpdate.update.$unset, { claimToken: '', claimLeaseExpiresAt: '', claimHeartbeatAt: '', claimedAt: '', workerId: '' })

  calls.length = 0
  const fullRepository = createScientificV2MongoRepository(storage.db, () => new Date('2026-08-31T04:11:00.000Z'), () => 'mongo-full-claim')
  const full = await runScientificV2Batch({
    manifest: fixture.manifest, state: canary.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2', phase: 'full' },
    repository: fullRepository,
    lock: createScientificV2MongoLeaseLock(storage.db, { ownerToken: 'mongo-full-lock' }),
    ...dependencies,
  })
  assert.ok(calls.length > 0)
  assert.ok(calls.every((slotId) => !canarySlotIds.has(slotId)))
  assert.equal(full.state.slots.filter((slot) => slot.isProviderCanary).every((slot) => slot.attempts.length === 1), true)
})

test('production Mongo atomically recovers only an exact legacy provider-canary blocked batch without dispatching it', async () => {
  const fixture = productionBatchFixture()
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#789' } }).png().toBuffer()
  const partial = await runScientificV2Batch({
    manifest: fixture.manifest, state: fixture.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    repository: { async save() {} }, recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    lock: { async acquire() { return 'legacy-blocked-canary-lock' }, async heartbeat() {}, async release() {} },
    executor: { async execute(request: any) {
      if (request.provider === 'bailian') {
        throw new ScientificConfirmedFailureError('confirmed', { responseClass: 'confirmed_provider_failure', actualCny: 1 })
      }
      return { responseClass: 'succeeded' as const, actualCny: 1, bytes: png }
    } },
  })
  const legacy = structuredClone(partial.state)
  const canary = legacy.slots.find((slot) => slot.provider === 'bailian' && slot.isProviderCanary)!
  for (const slot of legacy.slots) if (slot !== canary) {
    slot.status = 'not_executed'
    slot.attempts = []
    slot.costCny = null
  }
  legacy.status = 'blocked'
  legacy.pauseReason = null
  legacy.blockReason = 'provider_canary_failed'
  legacy.providerSpentCny.ark = 0
  legacy.providerSpentCny.openrouter = 0
  const { stateHash: _oldStateHash, ...legacyBase } = legacy
  legacy.stateHash = canonicalHash(legacyBase)

  const storage = productionAtomicDb({ ...fixture, state: legacy })
  const repository = createScientificV2MongoRepository(storage.db, () => new Date('2026-08-31T06:15:00.000Z'), () => 'legacy-canary-recovery-claim')
  assert.equal(await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: '0'.repeat(64) }), null)
  const execution = {
    manifestCodeSha: fixture.manifest.codeSha,
    executionCodeSha: 'b'.repeat(40),
    legacyRecoveryStateHash: legacy.stateHash,
  }
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: legacy.stateHash, execution })

  assert.ok(claim)
  assert.equal(claim.state.status, 'running')
  assert.equal(claim.state.blockReason, null)
  const claimedCanary = claim.state.slots.find((slot) => slot.slotId === canary.slotId)!
  assert.equal(claimedCanary.status, 'failed')
  assert.equal(claimedCanary.attempts.length, 4)
  assert.ok(claim.state.slots.filter((slot) => slot.canonicalModelId === canary.canonicalModelId && slot.supported && !slot.isProviderCanary)
    .every((slot) => slot.status === 'failed' && slot.attempts.length === 0 && slot.costCny === 0))
  assert.ok(claim.state.slots.filter((slot) => slot.provider === 'bailian'
    && slot.canonicalModelId !== canary.canonicalModelId && slot.supported)
    .every((slot) => slot.status === 'pending' && slot.attempts.length === 0 && slot.costCny === null))
  assert.ok(claim.state.slots.filter((slot) => slot.provider !== 'bailian' && slot.status === 'pending').length > 0)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!.length, 0)
  const recoveryUpdate = storage.findOneAndUpdateCalls.find((call) => call.collection === 'paperbanana_benchmark_scientific_v2_batches'
    && call.update.$set?.claimToken === 'legacy-canary-recovery-claim')!
  assert.deepEqual(recoveryUpdate.query.$or, [
    { 'state.status': 'ready' },
    { 'state.status': 'canary_complete' },
    { 'state.status': 'blocked', 'state.blockReason': 'provider_canary_failed' },
  ])
  assert.deepEqual(recoveryUpdate.update.$set.executionLineage, execution)
  assert.equal(await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: legacy.stateHash }), null)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!.length, 0)
})

test('production Mongo never recovers budget or reconciliation blocked and paused batches', async () => {
  const fixture = productionBatchFixture()
  const deniedStates = [
    { status: 'blocked' as const, pauseReason: null, blockReason: 'provider_budget_exceeded_before_attempt' as const },
    { status: 'paused' as const, pauseReason: 'reconciliation_required' as const, blockReason: null },
    { status: 'paused' as const, pauseReason: 'price_reconciliation_required' as const, blockReason: null },
    { status: 'paused' as const, pauseReason: 'artifact_reconciliation_required' as const, blockReason: null },
  ]
  for (const denied of deniedStates) {
    const state = structuredClone(fixture.state)
    state.status = denied.status
    state.pauseReason = denied.pauseReason
    state.blockReason = denied.blockReason
    const { stateHash: _oldStateHash, ...stateBase } = state
    state.stateHash = canonicalHash(stateBase)
    const storage = productionAtomicDb({ ...fixture, state })
    const repository = createScientificV2MongoRepository(storage.db, () => new Date('2026-08-31T06:16:00.000Z'), () => 'denied-recovery-claim')

    assert.equal(await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: state.stateHash }), null)
    assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!.length, 0)
  }
})

test('production Mongo lease lock provides exclusive renewable ownership and explicit release', async () => {
  const storage = productionAtomicDb()
  let timestamp = new Date('2026-08-31T05:00:00.000Z')
  const first = createScientificV2MongoLeaseLock(storage.db, {
    ownerToken: 'lock-owner-a', now: () => timestamp, leaseMs: 1_000, heartbeatIntervalMs: 250,
  })
  const second = createScientificV2MongoLeaseLock(storage.db, {
    ownerToken: 'lock-owner-b', now: () => timestamp, leaseMs: 1_000, heartbeatIntervalMs: 250,
  })
  const token = await first.acquire(LOCK_NAME)
  await assert.rejects(() => second.acquire(LOCK_NAME), /SCIENTIFIC_V2_PRODUCTION_LOCK_HELD/)
  timestamp = new Date(timestamp.getTime() + 500)
  await first.heartbeat(token)
  await first.release(token)
  assert.equal(await second.acquire(LOCK_NAME), 'lock-owner-b')
})

test('production Mongo claim lease safely reclaims only without an unresolved dispatch marker', async () => {
  const fixture = productionBatchFixture()
  let clock = new Date('2026-08-31T05:00:00.000Z')
  const safeStorage = productionAtomicDb(fixture)
  const first = createScientificV2MongoRepository(safeStorage.db, () => clock, () => 'stale-claim-first', 1_000)
  const original = await first.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.state.stateHash })
  assert.ok(original)
  clock = new Date(clock.getTime() + 1_001)
  const reclaimed = await createScientificV2MongoRepository(safeStorage.db, () => clock, () => 'stale-claim-second', 1_000)
    .claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.state.stateHash })
  assert.ok(reclaimed)
  assert.equal(reclaimed.claimToken, 'stale-claim-second')
  await assert.rejects(() => first.saveClaimed({
    claimToken: original.claimToken, expectedStateHash: original.state.stateHash, nextState: original.state,
  }), /SCIENTIFIC_V2_REPOSITORY_CAS_FAILED/)

  const unsafeStorage = productionAtomicDb(fixture)
  clock = new Date('2026-08-31T05:00:00.000Z')
  const unsafeFirst = createScientificV2MongoRepository(unsafeStorage.db, () => clock, () => 'unsafe-claim-first', 1_000)
  const unsafeClaim = await unsafeFirst.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.state.stateHash })
  assert.ok(unsafeClaim)
  const slot = unsafeClaim.state.slots[0]
  const scientificCase = fixture.manifest.cases.find((candidate) => candidate.id === slot.caseId)!
  if (scientificCase.kind !== 'generation') throw new Error('fixture canary must be generation')
  const payloadHash = canonicalHash({
    route: { provider: slot.provider, modelId: slot.modelId }, operation: slot.operation,
    imageSize: slot.imageSize,
    caseId: scientificCase.id, instruction: scientificCase.instruction,
    negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio,
  })
  await unsafeFirst.beginDispatch({
    claimToken: unsafeClaim.claimToken, expectedStateHash: unsafeClaim.state.stateHash,
    marker: { manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, attemptIndex: 1, payloadHash },
  })
  clock = new Date(clock.getTime() + 1_001)
  await assert.rejects(() => createScientificV2MongoRepository(unsafeStorage.db, () => clock, () => 'unsafe-claim-second', 1_000)
    .claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.state.stateHash }),
  /SCIENTIFIC_V2_STALE_CLAIM_RECONCILIATION_REQUIRED/)
})

test('stale claim resumes after a committed first slot without redispatching the successful canary', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  let clock = new Date('2026-08-31T05:30:00.000Z')
  const firstRepository = createScientificV2MongoRepository(storage.db, () => clock, () => 'resume-first-claim', 1_000)
  const claim = await firstRepository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.state.stateHash })
  assert.ok(claim)
  const slot = claim.state.slots[0]
  const scientificCase = fixture.manifest.cases.find((candidate) => candidate.id === slot.caseId)!
  if (scientificCase.kind !== 'generation' || slot.provider !== 'bailian' || !slot.modelId) throw new Error('fixture canary mismatch')
  const payloadHash = canonicalHash({
    route: { provider: slot.provider, modelId: slot.modelId }, operation: slot.operation,
    imageSize: slot.imageSize,
    caseId: scientificCase.id, instruction: scientificCase.instruction,
    negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio,
  })
  const marker = { manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, attemptIndex: 1, payloadHash }
  await firstRepository.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker })
  const next = structuredClone(claim.state)
  const nextSlot = next.slots[0]
  const attemptBase = {
    attemptIndex: 1, provider: 'bailian' as const, model: slot.modelId, operation: 'generation' as const,
    payloadHash, responseClass: 'succeeded', estimatedCny: 1, actualCny: 1,
    startedAt: '2026-08-31T05:30:00.000Z', completedAt: '2026-08-31T05:30:01.000Z',
    rawImageHash: 'f'.repeat(64), byteSize: 1024, width: 2048, height: 1152, format: 'png' as const,
    sourceHash: null, editedHash: null,
  }
  const attempt = { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
  nextSlot.attempts = [attempt]; nextSlot.status = 'succeeded'; nextSlot.costCny = 1
  next.providerSpentCny.bailian = 1; next.updatedAt = '2026-08-31T05:30:01.000Z'
  const { stateHash: _oldStateHash, ...stateBase } = next
  next.stateHash = canonicalHash(stateBase)
  await firstRepository.commitAttempt({
    claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt,
    nextState: deepFreezeScientificV2(next),
  })

  clock = new Date(clock.getTime() + 1_001)
  const resumedRepository = createScientificV2MongoRepository(storage.db, () => clock, () => 'resume-second-claim', 1_000)
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#bcd' } }).png().toBuffer()
  let providerCalls = 0
  const result = await runScientificV2Batch({
    manifest: fixture.manifest, state: fixture.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
    repository: resumedRepository,
    lock: createScientificV2MongoLeaseLock(storage.db, { ownerToken: 'resume-lock' }),
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    executor: { async execute() { providerCalls += 1; return { responseClass: 'succeeded', actualCny: 1, bytes: png } } },
  })
  assert.equal(providerCalls, 8)
  assert.equal(result.state.status, 'awaiting_artifacts')
  assert.equal(result.state.slots[0].attempts.length, 1)
  assert.equal(result.state.slots[0].attempts[0].attemptHash, attempt.attemptHash)
})

test('runner renews both DB claim and shared lock leases during a long provider call', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  const baseRepository = createScientificV2MongoRepository(storage.db, () => new Date(), () => 'heartbeat-claim', 30_000)
  let providerPending = false
  let claimRenewalsWhilePending = 0
  let releaseClaimRenewal!: () => void
  const claimRenewed = new Promise<void>((resolve) => { releaseClaimRenewal = resolve })
  const repository = {
    ...baseRepository,
    async heartbeatClaim(input: Parameters<NonNullable<typeof baseRepository.heartbeatClaim>>[0]) {
      await baseRepository.heartbeatClaim!(input)
      if (providerPending) {
        claimRenewalsWhilePending += 1
        releaseClaimRenewal()
      }
    },
  }
  let lockRenewalsWhilePending = 0
  let releaseLockRenewal!: () => void
  const lockRenewed = new Promise<void>((resolve) => { releaseLockRenewal = resolve })
  const lock = createScientificV2MongoLeaseLock(storage.db, {
    ownerToken: 'heartbeat-lock', leaseMs: 30_000, heartbeatIntervalMs: 5,
  })
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#bee' } }).png().toBuffer()
  let providerCalls = 0
  let releaseProvider!: () => void
  const providerRelease = new Promise<void>((resolve) => { releaseProvider = resolve })
  let announceProviderPending!: () => void
  const providerStarted = new Promise<void>((resolve) => { announceProviderPending = resolve })
  const run = runScientificV2Batch({
    manifest: fixture.manifest, state: fixture.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
    repository,
    lock: { ...lock, async heartbeat(token) {
      await lock.heartbeat(token)
      if (providerPending) {
        lockRenewalsWhilePending += 1
        releaseLockRenewal()
      }
    } },
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    executor: { async execute() {
      providerCalls += 1
      if (providerCalls === 1) {
        providerPending = true
        announceProviderPending()
        await providerRelease
        providerPending = false
      }
      return { responseClass: 'succeeded', actualCny: 1, bytes: png }
    } },
  })
  await providerStarted
  let renewalDeadline!: NodeJS.Timeout
  try {
    await Promise.race([
      Promise.all([claimRenewed, lockRenewed]),
      new Promise<never>((_resolve, reject) => {
        renewalDeadline = setTimeout(() => reject(new Error('lease renewal did not occur while provider remained pending')), 10_000)
      }),
    ])
  } finally {
    clearTimeout(renewalDeadline)
  }
  assert.equal(providerPending, true)
  assert.ok(claimRenewalsWhilePending >= 1)
  assert.ok(lockRenewalsWhilePending >= 1)
  releaseProvider()
  await run
})

test('production Mongo markUnknown rolls back state and marker together when its transactional marker update fails', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  const repository = createScientificV2MongoRepository(storage.db, () => new Date(), () => 'unknown-production-claim')
  const lock = createScientificV2MongoLeaseLock(storage.db, { ownerToken: 'unknown-production-lock' })
  let providerCalls = 0
  storage.failNextDispatchUpdate()
  await assert.rejects(() => runScientificV2Batch({
    manifest: fixture.manifest, state: fixture.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
    repository, lock,
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    executor: { async execute() { providerCalls += 1; throw new UnknownProviderOutcomeError('unknown') } },
  }), /SIMULATED_DISPATCH_UPDATE_FAILURE/)
  assert.equal(providerCalls, 1)
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(batch.state.status, 'running')
  assert.equal(batch.state.slots[0].status, 'pending')
  const dispatch = storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!
    .find((row) => row.kind !== 'scientific-v2-production-lock')!
  assert.equal(dispatch.status, 'started')
  assert.equal(storage.transactionCallsWithoutSession(), 0)
})

test('four confirmed provider-canary failures audit-zero that canonical model and permit a signed worker report', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  let calls = 0
  const result = await runScientificV2Batch({
    manifest: fixture.manifest, state: fixture.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
    repository: createScientificV2MongoRepository(storage.db, () => new Date(), () => 'failed-canary-claim'),
    lock: createScientificV2MongoLeaseLock(storage.db, { ownerToken: 'failed-canary-lock' }),
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    executor: { async execute() {
      calls += 1
      throw new ScientificConfirmedFailureError('confirmed', { responseClass: 'confirmed_provider_failure', actualCny: 1 })
    } },
  })
  assert.equal(calls, 4)
  assert.equal(result.state.status, 'awaiting_artifacts')
  assert.equal(result.state.blockReason, null)
  const canary = result.state.slots.find((slot) => slot.isProviderCanary)!
  assert.equal(canary.status, 'failed')
  assert.equal(canary.attempts.length, 4)
  assert.ok(result.state.slots.filter((slot) => slot.provider === 'bailian' && !slot.isProviderCanary)
    .every((slot) => slot.status === 'failed' && slot.attempts.length === 0 && slot.costCny === 0))
  const signed = createScientificV2SignedStateOperationReport({
    kind: 'worker', batchId: 'failed-canary-batch', manifest: fixture.manifest, state: result.state,
    revision: 1, previousStateHash: result.previousStateHash, createdAt: '2026-08-31T06:00:00.000Z',
    attestationSecret: 'failed-provider-canary-report-secret'.padEnd(32, '-'),
  })
  assert.equal(signed.report.providerCanaryAttestation.passed, false)
  assert.equal(verifyScientificV2SignedStateOperationReport(signed, 'failed-provider-canary-report-secret'.padEnd(32, '-')), true)
})

test('production OSS artifact store writes immutable private content-addressed bytes and verifies duplicate content', async () => {
  const bytes = Buffer.from('immutable-scientific-artifact')
  const imageHash = createHash('sha256').update(bytes).digest('hex')
  const objectKey = `bench/scientific-v2/private/objects/${imageHash}.png`
  const puts: Array<{ key: string; bytes: Buffer; options: Record<string, unknown> }> = []
  let duplicate = false
  let existing = bytes
  const store = createScientificV2OssArtifactStore({
    async put(key, value, options) {
      puts.push({ key, bytes: Buffer.from(value), options })
      if (duplicate) throw Object.assign(new Error('exists'), { status: 409 })
      return {}
    },
    async get() { return { content: existing, headers: {
      'x-oss-meta-sha256': imageHash, 'content-type': 'image/png', 'cache-control': 'private, no-store', 'x-oss-object-acl': 'private',
    } } },
  })
  const artifact = { objectKey, imageHash, format: 'png' as const, contentType: 'image/png' as const, bytes }
  await store.persist(artifact)
  duplicate = true
  await store.persist(artifact)
  assert.equal(puts.length, 2)
  assert.equal(puts[0].key, objectKey)
  assert.equal(JSON.stringify(puts[0].options).includes('private, no-store'), true)
  assert.equal((puts[0].options.headers as Record<string, string>)['x-oss-object-acl'], 'private')
  assert.equal(JSON.stringify(puts[0].options).includes('x-oss-forbid-overwrite'), true)
  existing = Buffer.from('collision')
  await assert.rejects(() => store.persist(artifact), /SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION/)
})

test('private artifact duplicate reasserts the exact bytes and private ACL when GetObjectACL is denied', async () => {
  const bytes = Buffer.from('scientific-private-acl-reassertion')
  const imageHash = createHash('sha256').update(bytes).digest('hex')
  const objectKey = `bench/scientific-v2/private/objects/${imageHash}.png`
  const puts: Array<{ key: string; bytes: Buffer; options: Record<string, unknown> }> = []
  const store = createScientificV2OssArtifactStore({
    async put(key, value, options) {
      puts.push({ key, bytes: Buffer.from(value), options })
      if (puts.length === 1) throw Object.assign(new Error('exists'), { status: 409, code: 'FileAlreadyExists' })
      return {}
    },
    async get() { return { content: bytes, headers: {
      'x-oss-meta-sha256': imageHash, 'content-type': 'image/png', 'cache-control': 'private, no-store',
    } } },
    async getACL() { throw Object.assign(new Error('forbidden'), { status: 403, code: 'AccessDenied' }) },
  })
  await store.persist({ objectKey, imageHash, format: 'png', contentType: 'image/png', bytes })
  assert.equal(puts.length, 2)
  assert.equal(puts[1].key, objectKey)
  assert.equal(puts[1].bytes.equals(bytes), true)
  const repairHeaders = puts[1].options.headers as Record<string, string>
  assert.equal(repairHeaders['x-oss-object-acl'], 'private')
  assert.equal(repairHeaders['x-oss-meta-sha256'], imageHash)
  assert.equal('x-oss-forbid-overwrite' in repairHeaders, false)
})

test('production OSS artifact store signs only bounded private scientific-v2 GET URLs', async () => {
  const calls: unknown[][] = []
  let signedUrl = 'https://private-test-bucket.oss-cn-hongkong.aliyuncs.com/bench/source.png?x-oss-signature=test'
  const store = createScientificV2OssArtifactStore({
    async put() { return {} },
    async get() { throw new Error('unused') },
  }, {
    async signatureUrlV4(...args) { calls.push(args); return signedUrl },
  })
  const objectKey = `bench/scientific-v2/private/objects/${'a'.repeat(64)}.png`
  assert.equal(await store.createSignedReadUrl!({ objectKey, expiresSeconds: 900 }), signedUrl)
  assert.deepEqual(calls, [['GET', 900, undefined, objectKey]])
  await assert.rejects(() => store.createSignedReadUrl!({ objectKey: '../source.png', expiresSeconds: 900 }), /SCIENTIFIC_V2_ARTIFACT_SIGNED_URL_INVALID/)
  await assert.rejects(() => store.createSignedReadUrl!({ objectKey, expiresSeconds: 901 }), /SCIENTIFIC_V2_ARTIFACT_SIGNED_URL_INVALID/)
  signedUrl = 'http://private-test-bucket.oss-cn-hongkong.aliyuncs.com/source.png?x-oss-signature=test'
  await assert.rejects(() => store.createSignedReadUrl!({ objectKey, expiresSeconds: 900 }), /SCIENTIFIC_V2_ARTIFACT_SIGNED_URL_INVALID/)
})

test('private OSS put acknowledgement loss verifies the exact byte hash MIME cache ACL tuple or retransmits only the same bytes', async () => {
  const bytes = Buffer.from('ack-loss-scientific-artifact')
  const imageHash = createHash('sha256').update(bytes).digest('hex')
  const artifact = {
    objectKey: `bench/scientific-v2/private/objects/${imageHash}.png`, imageHash,
    format: 'png' as const, contentType: 'image/png' as const, bytes,
  }
  let putCalls = 0
  const committed = createScientificV2OssArtifactStore({
    async put() { putCalls += 1; throw new Error('socket closed after put') },
    async get() {
      return { content: bytes, headers: {
        'x-oss-meta-sha256': imageHash, 'content-type': 'image/png', 'cache-control': 'private, no-store', 'x-oss-object-acl': 'private',
      } }
    },
  } as any)
  await committed.persist(artifact)
  assert.equal(putCalls, 1)
  for (const mutate of [
    (facts: { content: Buffer; sha256: string; contentType: string; cacheControl: string; acl: string }) => { facts.content = Buffer.from('wrong bytes') },
    (facts: { sha256: string }) => { facts.sha256 = '0'.repeat(64) },
    (facts: { contentType: string }) => { facts.contentType = 'application/octet-stream' },
    (facts: { cacheControl: string }) => { facts.cacheControl = 'public, max-age=31536000, immutable' },
    (facts: { acl: string }) => { facts.acl = 'public-read' },
  ]) {
    const facts = { content: bytes, sha256: imageHash, contentType: 'image/png', cacheControl: 'private, no-store', acl: 'private' }
    mutate(facts)
    const drifted = createScientificV2OssArtifactStore({
      async put() { throw Object.assign(new Error('exists'), { status: 409 }) },
      async get() { return { content: facts.content, headers: {
        'x-oss-meta-sha256': facts.sha256, 'content-type': facts.contentType,
        'cache-control': facts.cacheControl, 'x-oss-object-acl': facts.acl,
      } } },
    } as any)
    await assert.rejects(() => drifted.persist(artifact), /SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION/)
  }

  putCalls = 0
  let reads = 0
  const missing = createScientificV2OssArtifactStore({
    async put() {
      putCalls += 1
      if (putCalls === 1) throw new Error('socket closed before put')
      return {}
    },
    async get() {
      reads += 1
      throw Object.assign(new Error('not found'), { status: 404 })
    },
  } as any)
  await missing.persist(artifact)
  assert.equal(putCalls, 2)
  assert.equal(reads, 1)

  const unknown = createScientificV2OssArtifactStore({
    async put() { throw new Error('put timeout') },
    async get() { throw new Error('get timeout') },
  } as any)
  await assert.rejects(() => unknown.persist(artifact), /SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_REQUIRED/)
})

test('unknown artifact persistence pauses reconciliation after one paid provider call without redispatch', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  const spoolRoot = mkdtempSync(join(tmpdir(), 'scientific-v2-artifact-pause-'))
  chmodSync(spoolRoot, 0o700)
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#ade' } }).png().toBuffer()
  let providerCalls = 0
  const executor = createScientificV2ProviderExecutor({
    runtime: {
      async generate() { providerCalls += 1; return png.toString('base64') },
      async edit() { providerCalls += 1; return png.toString('base64') },
    },
    credentials: { bailian: 'b', ark: 'a', openrouter: 'o' },
    artifactSpool: await createScientificV2ArtifactSpool(spoolRoot),
    artifactStore: { async persist() { throw new ScientificV2ArtifactReconciliationRequiredError() } },
    fetchImpl: async () => { throw new Error('unused') },
  })
  const result = await runScientificV2Batch({
    manifest: fixture.manifest, state: fixture.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
    repository: createScientificV2MongoRepository(storage.db, () => new Date(), () => 'artifact-reconciliation-claim'),
    lock: createScientificV2MongoLeaseLock(storage.db, { ownerToken: 'artifact-reconciliation-lock' }),
    recorder: { async recordAttempt() {}, async recordUnsupported() {} }, executor,
  })
  assert.equal(providerCalls, 1)
  assert.equal(result.state.status, 'paused')
  assert.equal(result.state.pauseReason, 'artifact_reconciliation_required')
  assert.equal(result.state.slots[0].status, 'artifact_reconciliation')
  assert.equal(result.state.slots[0].attempts[0].responseClass, 'artifact_reconciliation_required')
  assert.match(result.state.slots[0].attempts[0].rawImageHash!, /^[a-f0-9]{64}$/)
})

test('valid provider bytes followed by local spool or private OSS failure fail-stop after exactly one paid call', async () => {
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#ade' } }).png().toBuffer()
  for (const mode of ['spool', 'collision'] as const) {
    const fixture = productionBatchFixture()
    const storage = productionAtomicDb(fixture)
    const spoolRoot = mkdtempSync(join(tmpdir(), `scientific-v2-${mode}-fail-`)); chmodSync(spoolRoot, 0o700)
    const realSpool = await createScientificV2ArtifactSpool(spoolRoot)
    let providerCalls = 0
    const executor = createScientificV2ProviderExecutor({
      runtime: { async generate() { providerCalls += 1; return png.toString('base64') }, async edit() { providerCalls += 1; return png.toString('base64') } },
      credentials: { bailian: 'b', ark: 'a', openrouter: 'o' },
      artifactSpool: mode === 'spool' ? { ...realSpool, async stage() { throw Object.assign(new Error('disk full'), { code: 'ENOSPC' }) } } : realSpool,
      artifactStore: { async persist() { throw new Error('SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION') } },
      fetchImpl: async () => { throw new Error('unused') },
    })
    const result = await runScientificV2Batch({
      manifest: fixture.manifest, state: fixture.state,
      attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
      repository: createScientificV2MongoRepository(storage.db, () => new Date(), () => `${mode}-fail-stop-claim`),
      lock: createScientificV2MongoLeaseLock(storage.db, { ownerToken: `${mode}-fail-stop-lock` }),
      recorder: { async recordAttempt() {}, async recordUnsupported() {} }, executor,
    })
    assert.equal(providerCalls, 1)
    assert.equal(result.state.status, 'paused')
    assert.equal(result.state.pauseReason, 'artifact_reconciliation_required')
  }
})

test('durable artifact spool recovers the exact paid output in a new process and resumes without redispatching that slot', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  const spoolRoot = mkdtempSync(join(tmpdir(), 'scientific-v2-artifact-spool-'))
  chmodSync(spoolRoot, 0o700)
  const firstSpool = await createScientificV2ArtifactSpool(spoolRoot)
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#ade' } }).png().toBuffer()
  let providerCalls = 0
  const firstExecutor = createScientificV2ProviderExecutor({
    runtime: {
      async generate() { providerCalls += 1; return png.toString('base64') },
      async edit() { providerCalls += 1; return png.toString('base64') },
    },
    credentials: { bailian: 'b', ark: 'a', openrouter: 'o' }, artifactSpool: firstSpool,
    artifactStore: { async persist() { throw new ScientificV2ArtifactReconciliationRequiredError() } },
    fetchImpl: async () => { throw new Error('unused') },
  })
  const first = await runScientificV2Batch({
    manifest: fixture.manifest, state: fixture.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
    repository: createScientificV2MongoRepository(storage.db, () => new Date('2026-08-31T10:00:00.000Z'), () => 'artifact-spool-first'),
    lock: createScientificV2MongoLeaseLock(storage.db, { ownerToken: 'artifact-spool-lock-1' }),
    recorder: { async recordAttempt() {}, async recordUnsupported() {} }, executor: firstExecutor,
  })
  assert.equal(providerCalls, 1)
  assert.equal(first.state.slots[0].status, 'artifact_reconciliation')
  const artifactDispatch = storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!
    .find((row) => row.status === 'committed' && row.artifactRecovery)
  assert.match(String(artifactDispatch?.artifactRecovery?.spoolId), /^[a-f0-9]{64}\.(png|jpeg|webp)$/)
  assert.equal(artifactDispatch?.artifactRecovery?.imageHash, first.state.slots[0].attempts[0].rawImageHash)
  assert.equal(JSON.stringify(artifactDispatch?.artifactRecovery).includes(png.toString('base64')), false)

  assert.equal(readdirSync(spoolRoot).length, 1)
  const persisted: Buffer[] = []
  let runtimeLoads = 0
  let failCleanup = false
  const recoveryDependencies = {
    async connectMongo() { return { db: storage.db, async close() {} } },
    async createArtifactStore() { return { async persist(artifact: ScientificV2ProductionArtifact) { persisted.push(Buffer.from(artifact.bytes)) } } },
    async createArtifactSpool() {
      const spool = await createScientificV2ArtifactSpool(spoolRoot)
      return { ...spool, async remove(binding: Parameters<typeof spool.remove>[0]) {
        if (failCleanup) throw new Error('cleanup failed')
        return spool.remove(binding)
      } }
    },
    createRepository() { return createScientificV2MongoRepository(storage.db, () => new Date('2026-08-31T10:05:00.000Z'), () => 'artifact-spool-reconcile') },
    async loadAuthoritativeRuntime() { runtimeLoads += 1; throw new Error('must not load runtime') },
  }
  const recoveryBundle = {
    operation: 'reconcile_artifact', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    manifest: fixture.manifest, state: first.state,
    input: {
      batchId: 'scientific-v2-production-batch', slotId: first.state.slots[0].slotId,
      attemptIndex: 1, imageHash: first.state.slots[0].attempts[0].rawImageHash!,
    },
  } as const
  await assert.rejects(() => executeScientificV2OperatorBundle({
    ...recoveryBundle, input: { ...recoveryBundle.input, batchId: 'wrong-batch' },
  }, {
    env: { ...validEnv, PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR: spoolRoot },
    productionDependencies: recoveryDependencies,
  }), /SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_CAS_FAILED/)
  assert.equal(readdirSync(spoolRoot).length, 1)
  persisted.length = 0
  failCleanup = true
  const recoveredOutput = await executeScientificV2OperatorBundle(recoveryBundle, {
    env: { ...validEnv, PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR: spoolRoot },
    productionDependencies: recoveryDependencies,
  })
  const recovered = { state: recoveredOutput.state as typeof first.state }
  assert.equal(recoveredOutput.providerCalls, 0)
  assert.equal(runtimeLoads, 0)
  assert.equal(persisted.length, 1)
  assert.equal(persisted[0].equals(png), true)
  assert.equal(recovered.state.status, 'running')
  assert.equal(recovered.state.slots[0].status, 'succeeded')
  assert.equal(recovered.state.slots[0].attempts[0].responseClass, 'succeeded')
  assert.equal(readdirSync(spoolRoot).length, 1)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].artifactCleanupFailure, 'spool_remove_failed')

  const resumed = await runScientificV2Batch({
    manifest: fixture.manifest, state: recovered.state,
    attestation: { enabled: false, concurrency: 1, lockName: LOCK_NAME, repositoryMode: 'atomic-v2' },
    repository: createScientificV2MongoRepository(storage.db, () => new Date('2026-08-31T10:06:00.000Z'), () => 'artifact-spool-resume'),
    lock: createScientificV2MongoLeaseLock(storage.db, { ownerToken: 'artifact-spool-lock-2' }),
    recorder: { async recordAttempt() {}, async recordUnsupported() {} },
    executor: {
      async execute() { providerCalls += 1; return { responseClass: 'succeeded', actualCny: 1, bytes: png } },
    },
  })
  assert.equal(resumed.state.status, 'awaiting_artifacts')
  assert.equal(providerCalls, 9)
})

test('artifact spool rejects tampering symlinks absolute identifiers and retains bytes after failed recovery CAS', async () => {
  const spoolRoot = mkdtempSync(join(tmpdir(), 'scientific-v2-artifact-spool-security-'))
  chmodSync(spoolRoot, 0o700)
  const spool = await createScientificV2ArtifactSpool(spoolRoot)
  const bytes = Buffer.from('durable-bytes')
  const imageHash = createHash('sha256').update(bytes).digest('hex')
  const binding = await spool.stage({ slotId: 'slot', attemptIndex: 1, payloadHash: 'a'.repeat(64), imageHash, format: 'png', bytes })
  writeFileSync(join(spoolRoot, binding.spoolId), Buffer.from('tampered'))
  await assert.rejects(() => spool.read(binding), /SCIENTIFIC_V2_ARTIFACT_SPOOL_(?:CONTENT|FILE)_INVALID/)
  await assert.rejects(() => spool.read({ ...binding, spoolId: '/tmp/absolute' }), /SCIENTIFIC_V2_ARTIFACT_SPOOL_ID_INVALID/)
  const external = join(spoolRoot, 'external')
  writeFileSync(external, bytes)
  const link = join(spoolRoot, 'f'.repeat(64) + '.png')
  symlinkSync(external, link)
  await assert.rejects(() => spool.read({ ...binding, spoolId: link.split('/').at(-1)! }), /SCIENTIFIC_V2_ARTIFACT_SPOOL_FILE_INVALID/)
})

test('scientific v2 public evidence builds exact three immutable non-upscaled WebP variants for raw and edit source', async () => {
  const builder = (scientificV2Production as unknown as Record<string, unknown>).createScientificV2PublicEvidenceInput
  assert.equal(typeof builder, 'function')
  const raw = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#cde' } }).png().toBuffer()
  const rawHash = createHash('sha256').update(raw).digest('hex')
  const puts: Array<{ key: string; bytes: Buffer; options: Record<string, unknown> }> = []
  const result = await (builder as (input: Record<string, unknown>) => Promise<any>)({
    canonicalModelId: 'test:scientific-model', caseId: 'scientific-edit-01-text-label',
    raw: { bytes: raw, imageHash: rawHash, format: 'png' },
    editSource: { bytes: readFileSync(SCIENTIFIC_EDIT_SOURCE.pngPath), imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, format: 'png' },
    store: {
      async put(key: string, bytes: Buffer, options: Record<string, unknown>) { puts.push({ key, bytes: Buffer.from(bytes), options }); return {} },
      async get() { throw new Error('unexpected duplicate') },
      async head() { throw new Error('unexpected duplicate') },
      async getACL() { throw new Error('unexpected duplicate') },
    },
  })
  assert.equal(puts.length, 6)
  assert.deepEqual(result.evidence[0].variants.map((item: any) => item.kind), ['thumbnail', 'detail', 'full'])
  assert.deepEqual(result.evidence[0].beforeVariants.map((item: any) => item.kind), ['thumbnail', 'detail', 'full'])
  assert.ok(result.evidence[0].variants.every((item: any) => item.width <= 800 && item.objectKey === `bench/scientific-v2/public/${rawHash}/${item.kind}.webp`))
  assert.ok(result.evidence[0].beforeVariants.every((item: any) => item.width <= SCIENTIFIC_EDIT_SOURCE.width
    && item.objectKey === `bench/scientific-v2/public/${SCIENTIFIC_EDIT_SOURCE.sourceHash}/${item.kind}.webp`))
  assert.deepEqual(result.objectBindings, [
    { imageHash: rawHash, objectKey: `bench/scientific-v2/private/objects/${rawHash}.png` },
    { imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, objectKey: `bench/scientific-v2/private/objects/${SCIENTIFIC_EDIT_SOURCE.sourceHash}.png` },
  ])
  assert.ok(puts.every((item) => (item.options.headers as Record<string, string>)['x-oss-object-acl'] === 'private'
    && (item.options.headers as Record<string, string>)['x-oss-forbid-overwrite'] === 'true'))
})

test('public rendition duplicate reconciliation rejects exact bytes with drifted MIME metadata cache or ACL', async () => {
  const raw = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#cde' } }).png().toBuffer()
  const rawHash = createHash('sha256').update(raw).digest('hex')
  const baseline = {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
    sha256: '',
    acl: 'private',
  }
  for (const mutate of [
    (facts: typeof baseline) => { facts.contentType = 'application/octet-stream' },
    (facts: typeof baseline) => { facts.cacheControl = 'private, no-store' },
    (facts: typeof baseline) => { facts.sha256 = '0'.repeat(64) },
    (facts: typeof baseline) => { facts.acl = 'public-read' },
  ]) {
    let attempted = Buffer.alloc(0)
    let attemptedHash = ''
    const facts = { ...baseline }
    await assert.rejects(() => createScientificV2PublicEvidenceInput({
      canonicalModelId: 'test:scientific-model', caseId: 'scientific-generation-01',
      raw: { bytes: raw, imageHash: rawHash, format: 'png' },
      store: {
        async put(_key, bytes, options) {
          attempted = Buffer.from(bytes)
          attemptedHash = createHash('sha256').update(attempted).digest('hex')
          facts.sha256 = attemptedHash
          mutate(facts)
          assert.equal((options.headers as Record<string, string>)['x-oss-forbid-overwrite'], 'true')
          throw Object.assign(new Error('exists'), { status: 409 })
        },
        async get() { return { content: attempted } },
        async head() { return { headers: {
          'content-type': facts.contentType,
          'cache-control': facts.cacheControl,
          'x-oss-meta-sha256': facts.sha256,
        } } },
        async getACL() { return { acl: facts.acl } },
      },
    }), /SCIENTIFIC_V2_PUBLIC_RENDITION_COLLISION/)
    assert.match(attemptedHash, /^[a-f0-9]{64}$/)
  }
})

test('signed public rendition replay verifies exact existing bytes even when OSS masks duplicate and ACL errors', async () => {
  const raw = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#cde' } }).png().toBuffer()
  const rawHash = createHash('sha256').update(raw).digest('hex')
  const existing = new Map<string, { bytes: Buffer; imageHash: string }>()
  let privateReassertions = 0
  const result = await createScientificV2PublicEvidenceInput({
    canonicalModelId: 'test:scientific-model', caseId: 'scientific-generation-01',
    raw: { bytes: raw, imageHash: rawHash, format: 'png' },
    store: {
      async put(key, bytes, options) {
        const headers = options.headers as Record<string, string>
        const value = { bytes: Buffer.from(bytes), imageHash: createHash('sha256').update(bytes).digest('hex') }
        assert.equal(headers['x-oss-object-acl'], 'private')
        if (headers['x-oss-forbid-overwrite'] === 'true') {
          existing.set(key, value)
          throw Object.assign(new Error('details omitted'), { name: 'ResponseError' })
        }
        assert.equal(headers['x-oss-forbid-overwrite'], undefined)
        assert.equal(headers['x-oss-meta-sha256'], value.imageHash)
        privateReassertions += 1
        return {}
      },
      async get() { throw Object.assign(new Error('details omitted'), { name: 'ResponseError' }) },
      async getStream(key, options) {
        assert.equal(options, undefined)
        return {
        stream: Readable.from([existing.get(key)!.bytes]),
        res: { status: 206, headers: { 'content-length': String(existing.get(key)!.bytes.length) } },
        }
      },
      async head(key) { return { headers: {
        'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable',
        'x-oss-meta-sha256': existing.get(key)!.imageHash,
      } } },
      async getACL() { throw Object.assign(new Error('forbidden'), { status: 403, code: 'AccessDenied' }) },
    },
  })
  assert.equal((result.evidence[0] as any).variants.length, 3)
  assert.equal(privateReassertions, 0)
})

test('production evidence store bounded-reads private bytes only with exact hash metadata MIME cache and ACL', async () => {
  const bytes = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#abc' } }).png().toBuffer()
  const imageHash = createHash('sha256').update(bytes).digest('hex')
  const objectKey = `bench/scientific-v2/private/objects/${imageHash}.png`
  const facts = { contentType: 'image/png', cacheControl: 'private, no-store', sha256: imageHash, acl: 'private' }
  const store = () => createScientificV2OssEvidenceStore({
    async put() { throw new Error('unused') }, async get() { throw new Error('unused') },
    async head() { return { headers: {
      'content-type': facts.contentType, 'cache-control': facts.cacheControl, 'x-oss-meta-sha256': facts.sha256,
    } } },
    async getACL() { return { acl: facts.acl } },
    async getStream(_key, options) {
      assert.deepEqual(options, { headers: { Range: `bytes=0-${25 * 1024 * 1024}` } })
      return { stream: Readable.from([bytes]), res: { status: 206, headers: { 'content-length': String(bytes.length) } } }
    },
  })
  assert.equal(typeof store().getStream, 'function')
  assert.equal((await store().readPrivate({ objectKey, imageHash, format: 'png' })).equals(bytes), true)
  for (const mutate of [
    () => { facts.contentType = 'application/octet-stream' },
    () => { facts.cacheControl = 'public, max-age=31536000, immutable' },
    () => { facts.sha256 = '0'.repeat(64) },
    () => { facts.acl = 'public-read' },
  ]) {
    Object.assign(facts, { contentType: 'image/png', cacheControl: 'private, no-store', sha256: imageHash, acl: 'private' })
    mutate()
    await assert.rejects(() => store().readPrivate({ objectKey, imageHash, format: 'png' }), /SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION/)
  }
})

test('private evidence read reasserts private ACL after exact bounded hash verification when GetObjectACL is denied', async () => {
  const bytes = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#abc' } }).png().toBuffer()
  const imageHash = createHash('sha256').update(bytes).digest('hex')
  const objectKey = `bench/scientific-v2/private/objects/${imageHash}.png`
  const puts: Array<{ key: string; bytes: Buffer; options: Record<string, unknown> }> = []
  const store = createScientificV2OssEvidenceStore({
    async put(key, value, options) { puts.push({ key, bytes: Buffer.from(value), options }); return {} },
    async get() { throw new Error('unused') },
    async head() { return { headers: {
      'content-type': 'image/png', 'cache-control': 'private, no-store', 'x-oss-meta-sha256': imageHash,
    } } },
    async getACL() { throw Object.assign(new Error('forbidden'), { status: 403, code: 'AccessDenied' }) },
    async getStream() { return { stream: Readable.from([bytes]), res: { status: 206, headers: { 'content-length': String(bytes.length) } } } },
  })
  assert.equal((await store.readPrivate({ objectKey, imageHash, format: 'png' })).equals(bytes), true)
  assert.equal(puts.length, 1)
  assert.equal(puts[0].key, objectKey)
  assert.equal(puts[0].bytes.equals(bytes), true)
  const repairHeaders = puts[0].options.headers as Record<string, string>
  assert.equal(repairHeaders['x-oss-object-acl'], 'private')
  assert.equal(repairHeaders['x-oss-meta-sha256'], imageHash)
  assert.equal('x-oss-forbid-overwrite' in repairHeaders, false)
})

test('production executor rejects oversized URL output before buffering its response body', async () => {
  let bodyReads = 0
  const executor = createScientificV2ProviderExecutor({
    runtime: {
      async generate() { return 'https://runtime.invalid/oversized.png' },
      async edit() { throw new Error('unused') },
    },
    credentials: { bailian: 'b', ark: 'a', openrouter: 'o' },
    artifactStore: { async persist() { throw new Error('must not persist') } },
    fetchImpl: async () => new Response(new ReadableStream({ pull() { bodyReads += 1 } }), {
      status: 200, headers: { 'content-length': String(25 * 1024 * 1024 + 1) },
    }),
  })
  await assert.rejects(() => executor.execute({
    slotId: 'slot', canonicalModelId: 'canonical:model', caseId: 'case', provider: 'bailian',
    modelId: 'frozen-model', operation: 'generation', attemptIndex: 1, payloadHash: '4'.repeat(64),
    instruction: 'draw', negativePrompt: '', aspectRatio: '16:9', imageSize: '2K', estimatedCny: 1,
  }), (error: unknown) => error instanceof ScientificConfirmedFailureError
    && error.responseClass === 'confirmed_technical_failure' && error.actualCny === 1)
  assert.ok(bodyReads <= 1)
})

test('production executor rejects every runtime URL before fetch, including credentials, IPs and private targets', async () => {
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#fff' } }).png().toBuffer()
  for (const url of [
    'https://cdn.example.invalid/output.png',
    'https://user:password@cdn.example.invalid/output.png',
    'https://127.0.0.1/output.png',
    'https://169.254.169.254/latest/meta-data',
    'https://10.0.0.1/output.png',
  ]) {
    let fetchCalls = 0
    const executor = createScientificV2ProviderExecutor({
      runtime: { async generate() { return url }, async edit() { return url } },
      credentials: { bailian: 'b', ark: 'a', openrouter: 'o' }, artifactStore: { async persist() {} },
      fetchImpl: async () => { fetchCalls += 1; return new Response(png) },
    })
    await assert.rejects(() => executor.execute({
      slotId: 'slot', canonicalModelId: 'canonical:model', caseId: 'case', provider: 'bailian',
      modelId: 'frozen-model', operation: 'generation', attemptIndex: 1, payloadHash: '8'.repeat(64),
      instruction: 'draw', negativePrompt: '', aspectRatio: '16:9', imageSize: '2K', estimatedCny: 1,
    }), (error: unknown) => error instanceof ScientificConfirmedFailureError
      && error.responseClass === 'confirmed_technical_failure' && error.actualCny === 1)
    assert.equal(fetchCalls, 0)
  }
})

test('production executor charges invalid provider output but fail-stops local OSS failure for artifact reconciliation', async () => {
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#def' } }).png().toBuffer()
  const request = {
    slotId: 'slot', canonicalModelId: 'canonical:model', caseId: 'case', provider: 'bailian' as const,
    modelId: 'frozen-model', operation: 'generation' as const, attemptIndex: 1, payloadHash: '5'.repeat(64),
    instruction: 'draw', negativePrompt: '', aspectRatio: '16:9', imageSize: '2K' as const, estimatedCny: 4,
  }
  const invalidOutput = createScientificV2ProviderExecutor({
    runtime: { async generate() { return 'not-image-output' }, async edit() { throw new Error('unused') } },
    credentials: { bailian: 'b', ark: 'a', openrouter: 'o' }, artifactStore: { async persist() {} },
    fetchImpl: async () => { throw new Error('unused') },
  })
  await assert.rejects(() => invalidOutput.execute(request), (error: unknown) => error instanceof ScientificConfirmedFailureError
    && error.responseClass === 'confirmed_technical_failure' && error.actualCny === 4)

  const failedPersist = createScientificV2ProviderExecutor({
    runtime: { async generate() { return png.toString('base64') }, async edit() { throw new Error('unused') } },
    credentials: { bailian: 'b', ark: 'a', openrouter: 'o' },
    artifactStore: { async persist() { throw new Error('OSS write failed') } },
    fetchImpl: async () => { throw new Error('unused') },
  })
  await assert.rejects(() => failedPersist.execute(request), (error: unknown) => error instanceof ScientificV2ArtifactReconciliationRequiredError
    && error.actualCny === 4 && error.bytes?.equals(png) === true)
})

test('production run operator uses real adapters with fakes and returns an API-importable signed worker report', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#fed' } }).png().toBuffer()
  let providerCalls = 0
  let closes = 0
  const secret = 'production-worker-report-secret'.padEnd(32, '-')
  const output = await executeScientificV2OperatorBundle({
    operation: 'run', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    ...normalExecution(fixture.manifest),
    manifest: fixture.manifest, state: fixture.state,
    report: {
      batchId: 'scientific-v2-production-batch', revision: 1,
      createdAt: '2026-08-31T06:00:00.000Z', attestationSecret: secret,
    },
  }, {
    env: validEnv,
    productionDependencies: {
      async connectMongo() { return { db: storage.db, async close() { closes += 1 } } },
      async createArtifactStore() {
        return {
          async persist() {},
          async createSignedReadUrl({ objectKey }: { objectKey: string }) {
            return `https://private-test-bucket.oss-cn-hongkong.aliyuncs.com/${objectKey}?x-oss-signature=test`
          },
        }
      },
      async loadAuthoritativeRuntime() {
        return {
          async generate() { providerCalls += 1; return png.toString('base64') },
          async edit() { providerCalls += 1; return png.toString('base64') },
        }
      },
      createRepository(db) { return createScientificV2MongoRepository(db as typeof storage.db, () => new Date(), () => 'production-operator-claim') },
      createLock(db) { return createScientificV2MongoLeaseLock(db as typeof storage.db, { ownerToken: 'production-operator-lock' }) },
      fetchImpl: async () => { throw new Error('unused') },
    },
  })
  assert.deepEqual(Object.keys(output), ['report', 'reportHash', 'attestationHash'])
  assert.ok(output.report && typeof output.report === 'object')
  const report = output.report as Record<string, unknown>
  assert.equal(report.kind, 'worker')
  assert.equal((report.state as Record<string, unknown>).status, 'awaiting_artifacts')
  const persistedBatch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(report.previousStateHash, persistedBatch.stateTransitionFromHash)
  assert.notEqual(report.previousStateHash, report.stateHash)
  assert.equal(verifyScientificV2SignedStateOperationReport(output, secret), true)
  assert.equal(JSON.stringify(output).includes(secret), false)
  assert.equal(providerCalls, 9)
  assert.equal(closes, 1)
})

test('production run verifies manifest and state before loading any runtime or connector', async () => {
  const fixture = productionBatchFixture()
  const tamperedManifest = structuredClone(fixture.manifest)
  tamperedManifest.priceHash = '0'.repeat(64)
  let dependencyCalls = 0
  await assert.rejects(() => executeScientificV2OperatorBundle({
    operation: 'run', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    ...normalExecution(fixture.manifest),
    manifest: tamperedManifest, state: fixture.state,
    report: {
      batchId: 'scientific-v2-production-batch', revision: 1,
      createdAt: '2026-08-31T06:00:00.000Z', attestationSecret: 'x'.repeat(32),
    },
  }, {
    env: validEnv,
    productionDependencies: {
      async connectMongo() { dependencyCalls += 1; throw new Error('must not connect') },
      async createArtifactStore() { dependencyCalls += 1; throw new Error('must not create OSS') },
      async loadAuthoritativeRuntime() { dependencyCalls += 1; throw new Error('must not load runtime') },
    },
  }), /SCIENTIFIC_V2_MANIFEST_HASH_MISMATCH|SCIENTIFIC_V2_PRICE_HASH_MISMATCH/)
  assert.equal(dependencyCalls, 0)
})

test('production run validates signed-report metadata before dependencies and DB claim binding before provider dispatch', async () => {
  const fixture = productionBatchFixture()
  for (const report of [
    { batchId: '../bad', revision: 1, createdAt: '2026-08-31T06:00:00.000Z', attestationSecret: 'x'.repeat(32) },
    { batchId: 'valid-batch', revision: 0, createdAt: '2026-08-31T06:00:00.000Z', attestationSecret: 'x'.repeat(32) },
    { batchId: 'valid-batch', revision: 1, createdAt: 'not-iso', attestationSecret: 'x'.repeat(32) },
    { batchId: 'valid-batch', revision: 1, createdAt: '2026-08-31T06:00:00.000Z', attestationSecret: 'short' },
  ]) {
    let dependencyCalls = 0
    await assert.rejects(() => executeScientificV2OperatorBundle({
      operation: 'run', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
      ...normalExecution(fixture.manifest),
      manifest: fixture.manifest, state: fixture.state, report,
    }, {
      env: validEnv,
      productionDependencies: {
        async connectMongo() { dependencyCalls += 1; throw new Error('must not connect') },
        async createArtifactStore() { dependencyCalls += 1; throw new Error('must not load OSS') },
        async loadAuthoritativeRuntime() { dependencyCalls += 1; throw new Error('must not load runtime') },
      },
    }), /SCIENTIFIC_V2_OPERATOR_REPORT_/)
    assert.equal(dependencyCalls, 0)
  }

  const storage = productionAtomicDb(fixture)
  storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].batchId = 'authoritative-other-batch'
  let providerCalls = 0
  await assert.rejects(() => executeScientificV2OperatorBundle({
    operation: 'run', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    ...normalExecution(fixture.manifest),
    manifest: fixture.manifest, state: fixture.state,
    report: { batchId: 'caller-batch', revision: 1, createdAt: '2026-08-31T06:00:00.000Z', attestationSecret: 'x'.repeat(32) },
  }, {
    env: validEnv,
    productionDependencies: {
      async connectMongo() { return { db: storage.db, async close() {} } },
      async createArtifactStore() { return { async persist() {} } },
      async loadAuthoritativeRuntime() { return { async generate() { providerCalls += 1; return '' }, async edit() { providerCalls += 1; return '' } } },
      createRepository(db) { return createScientificV2MongoRepository(db as typeof storage.db, () => new Date(), () => 'metadata-binding-claim') },
      createLock(db) { return createScientificV2MongoLeaseLock(db as typeof storage.db, { ownerToken: 'metadata-binding-lock' }) },
    },
  }), /SCIENTIFIC_V2_OPERATOR_REPORT_BATCH_BINDING_INVALID/)
  assert.equal(providerCalls, 0)
})

test('production run preserves its signed report when dependency cleanup fails', async () => {
  const fixture = productionBatchFixture()
  const storage = productionAtomicDb(fixture)
  const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: '#ace' } }).png().toBuffer()
  let stderr = ''
  const originalWrite = process.stderr.write.bind(process.stderr)
  process.stderr.write = ((chunk: string | Uint8Array) => { stderr += String(chunk); return true }) as typeof process.stderr.write
  const output = await executeScientificV2OperatorBundle({
    operation: 'run', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    ...normalExecution(fixture.manifest), manifest: fixture.manifest, state: fixture.state,
    report: { batchId: 'scientific-v2-production-batch', revision: 1, createdAt: '2026-08-31T06:00:00.000Z', attestationSecret: 'x'.repeat(32) },
  }, {
    env: validEnv,
    productionDependencies: {
      async connectMongo() { return { db: storage.db, async close() { throw new Error('cleanup failed') } } },
      async createArtifactStore() { return { async persist() {} } },
      async loadAuthoritativeRuntime() { return { async generate() { return png.toString('base64') }, async edit() { return png.toString('base64') } } },
      createRepository(db) { return createScientificV2MongoRepository(db as typeof storage.db, () => new Date(), () => 'cleanup-claim') },
      createLock(db) { return createScientificV2MongoLeaseLock(db as typeof storage.db, { ownerToken: 'cleanup-lock' }) },
    },
  }).finally(() => { process.stderr.write = originalWrite })
  assert.deepEqual(Object.keys(output), ['report', 'reportHash', 'attestationHash'])
  assert.equal(stderr, 'SCIENTIFIC_V2_PRODUCTION_CLEANUP_FAILED\n')
})
