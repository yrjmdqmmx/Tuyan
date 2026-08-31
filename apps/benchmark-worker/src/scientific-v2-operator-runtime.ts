import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_EDIT_SOURCE,
  buildScientificV2CanonicalManifest,
  canonicalHash,
} from '@paperbanana/benchmark-core'
import { createHash } from 'node:crypto'
import { randomUUID } from 'node:crypto'

import { loadBuildProvenance } from './build-provenance.js'

import { assertExactScientificV2Keys, isScientificV2Hash, scientificV2Error } from './scientific-v2-common.js'
import { loadAuthoritativeImageRuntime } from './authoritative-runtime.js'
import { importScientificCodexArtifacts } from './scientific-v2-codex.js'
import { buildScientificV2Batch, SCIENTIFIC_V2_PRODUCTION_LOCK_NAME, verifyScientificV2BatchManifest, verifyScientificV2BatchState, type ScientificV2BatchManifest, type ScientificV2BatchState, type ScientificV2PriceSnapshot } from './scientific-v2-manifest.js'
import {
  assembleScientificBlindReviewerAssignment,
  createScientificBlindReviewPackages,
  finalizeScientificDoubleReview,
  validateScientificReviewerResults,
  type ScientificBlindReviewerPrivateAssignment,
  type ScientificBlindReviewerPublicAssignment,
  type ValidatedScientificReviewerResults,
} from './scientific-v2-review.js'
import { runScientificV2Batch, type ScientificV2AtomicRunnerDependencies } from './scientific-v2-runner.js'
import { assertScientificV2StateOperationReportMetadata, createScientificV2SignedStateOperationReport } from './scientific-v2-state-report.js'
import {
  createScientificV2MongoLeaseLock,
  createScientificV2MongoRepository,
  createScientificV2ArtifactSpool,
  createScientificV2OssArtifactStore,
  createScientificV2OssEvidenceStore,
  createScientificV2ProviderExecutor,
  readScientificV2ProductionEditSourcePng,
  scientificV2PrivateArtifactObjectKey,
  type ScientificV2AuthoritativeImageRuntime,
  type ScientificV2MongoDatabase,
  type ScientificV2ProductionArtifactStore,
  type ScientificV2ArtifactSpool,
  type ScientificV2ProductionRepository,
  reconcileScientificV2Artifact,
  renderScientificV2PublicEvidence,
  type ScientificV2EvidenceObjectStore,
} from './scientific-v2-production.js'
import type { ScientificV2RunnerDependencies, ScientificV2RunnerRepository } from './scientific-v2-runner.js'
import { verifyScientificV2SignedPriceSnapshot } from './scientific-v2-price-attestation.js'

interface OperatorGate { enabled: boolean; concurrency: number; lockName: string }
type CanonicalManifest = Parameters<typeof buildScientificV2Batch>[0]['canonicalManifest']
interface ScientificV2OperatorCodexInput {
  manifestHash: string
  stateHash: string
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  provenance: unknown
  toolCalls: unknown[]
  batchId: string
  revision: number
  previousStateHash: string
  createdAt: string
  attestationSecret: string
  execution?: { manifestCodeSha: string; executionCodeSha: string; legacyRecoveryStateHash: string | null }
}
interface ScientificV2OperatorReportInput {
  batchId: string
  revision: number
  createdAt: string
  attestationSecret: string
  execution?: { manifestCodeSha: string; executionCodeSha: string; legacyRecoveryStateHash: string | null }
}
interface ScientificV2ProductionFactoryDependencies {
  connectMongo?(env: Record<string, string | undefined>): Promise<{ db: unknown; close(): Promise<void> }>
  createArtifactStore?(env: Record<string, string | undefined>): Promise<ScientificV2ProductionArtifactStore>
  createArtifactSpool?(env: Record<string, string | undefined>): Promise<ScientificV2ArtifactSpool>
  createEvidenceStore?(env: Record<string, string | undefined>): Promise<ScientificV2EvidenceObjectStore>
  loadAuthoritativeRuntime(): Promise<unknown>
  createRepository?(db: unknown): ScientificV2RunnerRepository
  createLock?(db: unknown): ScientificV2RunnerDependencies['lock']
  fetchImpl?: typeof fetch
}
interface ScientificV2OperatorExecutionContext {
  env: Record<string, string | undefined>
  productionDependencies?: ScientificV2ProductionFactoryDependencies
  onCleanupFailure?(error: unknown): void
  now?: () => Date
}

export interface ScientificV2OperatorInspectBundle {
  operation: 'inspect'
  gate: OperatorGate
  batchInput: {
    canonicalManifest: CanonicalManifest
    registrySnapshot: Parameters<typeof buildScientificV2Batch>[0]['registrySnapshot']
    suiteHash: string
    codeSha: string
    priceSnapshot: ScientificV2PriceSnapshot
    createdAt: string
  }
}

export type ScientificV2OperatorBundle = ScientificV2OperatorInspectBundle | {
  operation: 'prepare'; gate: OperatorGate; input: {
    registryAuthority: Record<string, unknown>
    signedPriceSnapshot: unknown
    codeSha: string
    createdAt: string
  }
} | {
  operation: 'import_codex'; gate: OperatorGate; input: ScientificV2OperatorCodexInput
} | {
  operation: 'review_pack'; gate: OperatorGate; input: Parameters<typeof createScientificBlindReviewPackages>[0] & { attestationSecret: string }
} | {
  operation: 'review_finalize'; gate: OperatorGate; input: {
    reviewerA: ValidatedScientificReviewerResults
    reviewerB: ValidatedScientificReviewerResults
    automaticJudges: readonly unknown[]
    arbitration?: unknown
    attestationSecret: string
  }
} | {
  operation: 'review_validate'; gate: OperatorGate; input: {
    role: 'A' | 'B'
    publicAssignment: ScientificBlindReviewerPublicAssignment
    privateAssignment: ScientificBlindReviewerPrivateAssignment
    submissions: unknown[]
    attestationSecret: string
  }
} | {
  operation: 'review_arbitrate'; gate: OperatorGate; input: {
    reviewerA: ValidatedScientificReviewerResults
    reviewerB: ValidatedScientificReviewerResults
    automaticJudges: readonly unknown[]
    arbitration: unknown
    attestationSecret: string
  }
} | {
  operation: 'run'; gate: OperatorGate
  executionPhase?: 'canary-only' | 'full'
  manifestCodeSha: string
  executionCodeSha: string
  legacyRecoveryStateHash: string | null
  manifest: Parameters<typeof runScientificV2Batch>[0]['manifest']
  state: Parameters<typeof runScientificV2Batch>[0]['state']
  report: ScientificV2OperatorReportInput
} | {
  operation: 'reconcile_artifact'; gate: OperatorGate
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  input: { batchId: string; slotId: string; attemptIndex: number; imageHash: string }
} | {
  operation: 'render_public_evidence'; gate: OperatorGate
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  input: { batchId: string }
}

function assertGate(gate: unknown): asserts gate is OperatorGate {
  assertExactScientificV2Keys(gate, ['enabled', 'concurrency', 'lockName'], 'SCIENTIFIC_V2_OPERATOR_GATE_SCHEMA_INVALID')
  if (gate.enabled !== false || gate.concurrency !== 1 || gate.lockName !== SCIENTIFIC_V2_PRODUCTION_LOCK_NAME) {
    scientificV2Error('SCIENTIFIC_V2_OPERATOR_DISABLED_GATE_INVALID')
  }
}

function assertScientificV2ProductionControlGate(env: Record<string, string | undefined>) {
  if (env.PAPERBANANA_BENCH_ENABLED !== 'false' || env.PAPERBANANA_BENCH_CONCURRENCY !== '1'
    || env.PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED !== 'true'
    || env.PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF !== SCIENTIFIC_V2_PRODUCTION_LOCK_NAME) {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_RUN_GATE_INVALID')
  }
}

async function assertExecutionLineage(env: Record<string, string | undefined>, manifest: ScientificV2BatchManifest, execution: ScientificV2OperatorReportInput['execution']) {
  if (!execution) return
  assertExactScientificV2Keys(execution, ['manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
  const provenance = await loadBuildProvenance(
    env.PAPERBANANA_SCIENTIFIC_V2_CANONICAL_PROVENANCE_PATH || '/app/build-provenance.json',
  )
  if (execution.manifestCodeSha !== manifest.codeSha || !/^[a-f0-9]{40}$/.test(execution.executionCodeSha)
    || provenance.codeSha !== execution.executionCodeSha
    || env.PAPERBANANA_CODE_SHA !== execution.executionCodeSha
    || (execution.manifestCodeSha === execution.executionCodeSha
      ? execution.legacyRecoveryStateHash !== null
      : !isScientificV2Hash(execution.legacyRecoveryStateHash))) {
    scientificV2Error('SCIENTIFIC_V2_EXECUTION_LINEAGE_INVALID')
  }
}

export async function createScientificV2ProductionRunDependencies(
  env: Record<string, string | undefined>,
  deps?: ScientificV2ProductionFactoryDependencies,
): Promise<ScientificV2AtomicRunnerDependencies & {
  repository: ScientificV2ProductionRepository
  artifactStore: ScientificV2ProductionArtifactStore
  artifactSpool: ScientificV2ArtifactSpool
  close(): Promise<void>
}> {
  assertScientificV2ProductionControlGate(env)
  const required = [
    'PAPERBANANA_BENCH_MONGODB_URI', 'PAPERBANANA_BENCH_BAILIAN_API_KEY', 'PAPERBANANA_BENCH_ARK_API_KEY',
    'PAPERBANANA_BENCH_OPENROUTER_API_KEY', 'PAPERBANANA_BENCH_OSS_REGION', 'PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID',
    'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET', 'PAPERBANANA_BENCH_OSS_BUCKET', 'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT',
    'PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR',
  ] as const
  if (required.some((key) => typeof env[key] !== 'string' || !env[key]!.trim() || env[key]!.trim() !== env[key])) {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_ENV_INVALID')
  }
  try {
    const endpoint = new URL(env.PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT!)
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) scientificV2Error('SCIENTIFIC_V2_PRODUCTION_ENV_INVALID')
  } catch {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_ENV_INVALID')
  }
  const leaseMs = env.PAPERBANANA_BENCH_LEASE_MS === undefined ? 120_000 : Number(env.PAPERBANANA_BENCH_LEASE_MS)
  const heartbeatIntervalMs = env.PAPERBANANA_BENCH_HEARTBEAT_MS === undefined ? 30_000 : Number(env.PAPERBANANA_BENCH_HEARTBEAT_MS)
  if (!Number.isInteger(leaseMs) || !Number.isInteger(heartbeatIntervalMs) || heartbeatIntervalMs < 1 || heartbeatIntervalMs >= leaseMs) {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_ENV_INVALID')
  }
  const resolvedDeps = deps || createDefaultScientificV2ProductionDependencies(env, leaseMs, heartbeatIntervalMs)
  if (!resolvedDeps.connectMongo || !resolvedDeps.createArtifactStore) scientificV2Error('SCIENTIFIC_V2_PRODUCTION_DEPENDENCY_INVALID')
  const artifactSpool = resolvedDeps.createArtifactSpool
    ? await resolvedDeps.createArtifactSpool(env)
    : await createScientificV2ArtifactSpool(env.PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR!)
  const connection = await resolvedDeps.connectMongo(env)
  try {
    const artifactStore = await resolvedDeps.createArtifactStore(env)
    const runtime = await resolvedDeps.loadAuthoritativeRuntime()
    if (!runtime || typeof runtime !== 'object' || typeof (runtime as ScientificV2AuthoritativeImageRuntime).generate !== 'function'
      || typeof (runtime as ScientificV2AuthoritativeImageRuntime).edit !== 'function') {
      scientificV2Error('SCIENTIFIC_V2_PRODUCTION_DEPENDENCY_INVALID')
    }
    if (!resolvedDeps.createRepository || !resolvedDeps.createLock) scientificV2Error('SCIENTIFIC_V2_PRODUCTION_DEPENDENCY_INVALID')
    const repository = resolvedDeps.createRepository(connection.db)
    const lock = resolvedDeps.createLock(connection.db)
    const executor = createScientificV2ProviderExecutor({
      runtime: runtime as ScientificV2AuthoritativeImageRuntime,
      credentials: {
        bailian: env.PAPERBANANA_BENCH_BAILIAN_API_KEY!,
        ark: env.PAPERBANANA_BENCH_ARK_API_KEY!,
        openrouter: env.PAPERBANANA_BENCH_OPENROUTER_API_KEY!,
      },
      artifactStore,
      artifactSpool,
      fetchImpl: resolvedDeps.fetchImpl || fetch,
      editSourcePng: readScientificV2ProductionEditSourcePng(env.PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH),
    })
    return {
      repository: repository as ScientificV2ProductionRepository, lock, executor, artifactStore, artifactSpool,
      recorder: { async recordAttempt() {}, async recordUnsupported() {} },
      async close() { await connection.close() },
    }
  } catch (error) {
    await connection.close().catch(() => undefined)
    throw error
  }
}

async function createScientificV2ArtifactReconciliationDependencies(
  env: Record<string, string | undefined>,
  deps?: ScientificV2ProductionFactoryDependencies,
) {
  assertScientificV2ProductionControlGate(env)
  const required = [
    'PAPERBANANA_BENCH_MONGODB_URI', 'PAPERBANANA_BENCH_OSS_REGION', 'PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID',
    'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET', 'PAPERBANANA_BENCH_OSS_BUCKET', 'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT',
    'PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR',
  ] as const
  if (required.some((key) => typeof env[key] !== 'string' || !env[key]!.trim() || env[key]!.trim() !== env[key])) {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_ENV_INVALID')
  }
  const resolved = deps || createDefaultScientificV2ProductionDependencies(env, 120_000, 30_000)
  if (!resolved.connectMongo || !resolved.createArtifactStore || !resolved.createRepository) {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_DEPENDENCY_INVALID')
  }
  const artifactSpool = resolved.createArtifactSpool
    ? await resolved.createArtifactSpool(env)
    : await createScientificV2ArtifactSpool(env.PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR!)
  const connection = await resolved.connectMongo(env)
  try {
    const artifactStore = await resolved.createArtifactStore(env)
    const repository = resolved.createRepository(connection.db) as ScientificV2ProductionRepository
    if (typeof repository.reconcileArtifact !== 'function') scientificV2Error('SCIENTIFIC_V2_PRODUCTION_DEPENDENCY_INVALID')
    return { artifactSpool, artifactStore, repository, close: connection.close }
  } catch (error) {
    await connection.close().catch(() => undefined)
    throw error
  }
}

function createDefaultScientificV2ProductionDependencies(
  env: Record<string, string | undefined>,
  leaseMs: number,
  heartbeatIntervalMs: number,
): ScientificV2ProductionFactoryDependencies {
  const ownerToken = `scientific-v2-operator:${randomUUID()}`
  return {
    async connectMongo() {
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(env.PAPERBANANA_BENCH_MONGODB_URI!, { appName: 'paperbanana-scientific-v2-worker' })
      try {
        await client.connect()
      } catch (error) {
        await client.close().catch(() => undefined)
        throw error
      }
      return { db: client.db(env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark'), async close() { await client.close() } }
    },
    async createArtifactStore() {
      const { default: OSS } = await import('ali-oss')
      const client = new OSS({
        region: env.PAPERBANANA_BENCH_OSS_REGION!,
        accessKeyId: env.PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID!,
        accessKeySecret: env.PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET!,
        bucket: env.PAPERBANANA_BENCH_OSS_BUCKET!,
        endpoint: env.PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT!,
        secure: true,
        authorizationV4: true,
      })
      return createScientificV2OssArtifactStore(client as unknown as Parameters<typeof createScientificV2OssArtifactStore>[0])
    },
    async createArtifactSpool() {
      return createScientificV2ArtifactSpool(env.PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR!)
    },
    async createEvidenceStore() {
      const { default: OSS } = await import('ali-oss')
      const client = new OSS({
        region: env.PAPERBANANA_BENCH_OSS_REGION!, accessKeyId: env.PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID!,
        accessKeySecret: env.PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET!, bucket: env.PAPERBANANA_BENCH_OSS_BUCKET!,
        endpoint: env.PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT!, secure: true, authorizationV4: true,
      })
      return createScientificV2OssEvidenceStore(client as unknown as Parameters<typeof createScientificV2OssEvidenceStore>[0])
    },
    loadAuthoritativeRuntime: loadAuthoritativeImageRuntime,
    createRepository(db) { return createScientificV2MongoRepository(db as ScientificV2MongoDatabase, undefined, undefined, leaseMs) },
    createLock(db) {
      return createScientificV2MongoLeaseLock(db as ScientificV2MongoDatabase, { ownerToken, leaseMs, heartbeatIntervalMs })
    },
  }
}

async function createScientificV2PublicRenderDependencies(
  env: Record<string, string | undefined>,
  deps?: ScientificV2ProductionFactoryDependencies,
) {
  assertScientificV2ProductionControlGate(env)
  const required = [
    'PAPERBANANA_BENCH_MONGODB_URI', 'PAPERBANANA_BENCH_OSS_REGION', 'PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID',
    'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET', 'PAPERBANANA_BENCH_OSS_BUCKET', 'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT',
  ] as const
  if (required.some((key) => typeof env[key] !== 'string' || !env[key]!.trim() || env[key]!.trim() !== env[key])) {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_ENV_INVALID')
  }
  const resolved = deps || createDefaultScientificV2ProductionDependencies(env, 120_000, 30_000)
  if (!resolved.connectMongo || !resolved.createEvidenceStore || !resolved.createRepository) {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_DEPENDENCY_INVALID')
  }
  const connection = await resolved.connectMongo(env)
  try {
    const store = await resolved.createEvidenceStore(env)
    const repository = resolved.createRepository(connection.db) as ScientificV2ProductionRepository
    if (typeof repository.loadCompletedBatch !== 'function') scientificV2Error('SCIENTIFIC_V2_PRODUCTION_DEPENDENCY_INVALID')
    return { store, repository, close: connection.close }
  } catch (error) {
    await connection.close().catch(() => undefined)
    throw error
  }
}

async function createCodexArtifactStore(
  env: Record<string, string | undefined>,
  deps?: ScientificV2ProductionFactoryDependencies,
) {
  if (deps?.createArtifactStore) return deps.createArtifactStore(env)
  const required = [
    'PAPERBANANA_BENCH_OSS_REGION', 'PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID', 'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET',
    'PAPERBANANA_BENCH_OSS_BUCKET', 'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT',
  ] as const
  if (required.some((key) => typeof env[key] !== 'string' || !env[key]!.trim() || env[key]!.trim() !== env[key])) {
    scientificV2Error('SCIENTIFIC_V2_PRODUCTION_ENV_INVALID')
  }
  return createDefaultScientificV2ProductionDependencies(env, 120_000, 30_000).createArtifactStore!(env)
}

async function persistCodexArtifacts(
  input: ScientificV2OperatorCodexInput,
  store: ScientificV2ProductionArtifactStore,
  editSourcePng: Buffer,
) {
  let sourcePersisted = false
  for (const call of input.toolCalls) {
    if (!call || typeof call !== 'object') scientificV2Error('SCIENTIFIC_V2_CODEX_TOOL_CALL_SCHEMA_INVALID')
    const record = call as Record<string, unknown>
    if (!['succeeded', 'succeeded_low_quality'].includes(String(record.responseClass))) continue
    if (!Buffer.isBuffer(record.bytes) || !isScientificV2Hash(record.sha256)
      || !['png', 'jpeg', 'webp'].includes(String(record.format))) scientificV2Error('SCIENTIFIC_V2_CODEX_ARTIFACT_METADATA_MISMATCH')
    const format = record.format as 'png' | 'jpeg' | 'webp'
    await store.persist({
      objectKey: scientificV2PrivateArtifactObjectKey(record.sha256, format), imageHash: record.sha256,
      format, contentType: `image/${format}` as 'image/png' | 'image/jpeg' | 'image/webp', bytes: record.bytes,
    })
    if (!sourcePersisted && record.sourceHash === SCIENTIFIC_EDIT_SOURCE.sourceHash) {
      await store.persist({
        objectKey: scientificV2PrivateArtifactObjectKey(SCIENTIFIC_EDIT_SOURCE.sourceHash, 'png'),
        imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, format: 'png', contentType: 'image/png', bytes: editSourcePng,
      })
      sourcePersisted = true
    }
  }
}

export function executeScientificV2OperatorBundle(bundle: ScientificV2OperatorInspectBundle): Promise<{
  operation: 'inspect'; providerCalls: 0; manifestHash: string; stateHash: string; modelCount: number; slotCount: number
}>
export function executeScientificV2OperatorBundle(bundle: ScientificV2OperatorBundle): Promise<Record<string, unknown>>
export function executeScientificV2OperatorBundle(bundle: ScientificV2OperatorBundle, context: ScientificV2OperatorExecutionContext): Promise<Record<string, unknown>>
export async function executeScientificV2OperatorBundle(bundle: ScientificV2OperatorBundle, context?: ScientificV2OperatorExecutionContext): Promise<Record<string, unknown>> {
  if (!bundle || typeof bundle !== 'object') scientificV2Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
  assertGate(bundle.gate)
  if (bundle.operation === 'prepare') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'input'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    assertExactScientificV2Keys(bundle.input, [
      'registryAuthority', 'signedPriceSnapshot', 'codeSha', 'createdAt',
    ], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    assertExactScientificV2Keys(bundle.input.registryAuthority, [
      'schemaVersion', 'codeSha', 'capturedAt', 'registryVersion', 'registryBytesHash',
      'registry', 'snapshotHash', 'attestationHash',
    ], 'SCIENTIFIC_V2_REGISTRY_AUTHORITY_INVALID')
    const authority = bundle.input.registryAuthority
    const registry = authority.registry as Record<string, unknown>
    const registryBytesHash = createHash('sha256').update(JSON.stringify(registry)).digest('hex')
    if (authority.schemaVersion !== 1 || authority.codeSha !== bundle.input.codeSha
      || authority.registryVersion !== registry.registryVersion || authority.registryBytesHash !== registryBytesHash
      || canonicalHash(Object.fromEntries(Object.entries(authority).filter(([key]) => !['snapshotHash', 'attestationHash'].includes(key)))) !== authority.snapshotHash) {
      scientificV2Error('SCIENTIFIC_V2_REGISTRY_AUTHORITY_INVALID')
    }
    const registryHash = canonicalHash(registry)
    const canonicalManifest = buildScientificV2CanonicalManifest({
      registryVersion: authority.registryVersion as string, registryHash, registry,
    })
    const signedPriceCapturedAt = (bundle.input.signedPriceSnapshot as Record<string, unknown>)?.capturedAt
    if (signedPriceCapturedAt !== bundle.input.createdAt) scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH')
    const priceSnapshot = verifyScientificV2SignedPriceSnapshot(bundle.input.signedPriceSnapshot, {
      secret: String((context?.env || process.env).PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET || ''),
      canonicalManifest,
      expectedCodeSha: bundle.input.codeSha,
      now: context?.now || (() => new Date()),
      maxAgeMs: 24 * 60 * 60 * 1_000,
    })
    if ((bundle.input.signedPriceSnapshot as Record<string, unknown>).registryAuthorityHash !== authority.snapshotHash) {
      scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH')
    }
    const registryBase = {
      registryVersion: authority.registryVersion as string, registryHash, registry,
    }
    const registrySnapshot = { ...registryBase, snapshotHash: canonicalHash(registryBase) }
    const built = buildScientificV2Batch({
      canonicalManifest, registrySnapshot, suite: PB_SCIENTIFIC_FIGURE_V2,
      codeSha: bundle.input.codeSha, priceSnapshot, createdAt: bundle.input.createdAt,
      lockName: SCIENTIFIC_V2_PRODUCTION_LOCK_NAME,
    })
    const freezeInput = {
      batchId: `scientific-v2-${built.manifest.manifestHash.slice(0, 20)}`,
      registryAuthority: structuredClone(authority), registrySnapshot, canonicalManifest,
      manifest: built.manifest, initialState: built.state,
    }
    const inspectBundle = {
      operation: 'inspect', gate: bundle.gate,
      batchInput: {
        canonicalManifest, registrySnapshot, suiteHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
        codeSha: bundle.input.codeSha, priceSnapshot, createdAt: bundle.input.createdAt,
      },
    }
    return {
      operation: 'prepare', providerCalls: 0, registryAuthority: authority, registrySnapshot,
      canonicalManifest, manifest: built.manifest, initialState: built.state,
      inspectBundle, freezeInput,
      attestInput: {
        batchId: freezeInput.batchId, manifestHash: built.manifest.manifestHash,
      },
      registryHash, suiteHash: built.manifest.suiteHash, priceHash: built.manifest.priceHash,
      manifestHash: built.manifest.manifestHash, stateHash: built.state.stateHash,
      modelCount: built.manifest.models.length,
    }
  }
  if (bundle.operation === 'inspect') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'batchInput'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    assertExactScientificV2Keys(bundle.batchInput, ['canonicalManifest', 'registrySnapshot', 'suiteHash', 'codeSha', 'priceSnapshot', 'createdAt'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    if (bundle.batchInput.suiteHash !== PB_SCIENTIFIC_FIGURE_V2.manifestHash) scientificV2Error('SCIENTIFIC_V2_SUITE_MISMATCH')
    const built = buildScientificV2Batch({
      canonicalManifest: bundle.batchInput.canonicalManifest, registrySnapshot: bundle.batchInput.registrySnapshot, suite: PB_SCIENTIFIC_FIGURE_V2,
      codeSha: bundle.batchInput.codeSha, priceSnapshot: bundle.batchInput.priceSnapshot,
      createdAt: bundle.batchInput.createdAt, lockName: SCIENTIFIC_V2_PRODUCTION_LOCK_NAME,
    })
    verifyScientificV2BatchManifest(built.manifest)
    verifyScientificV2BatchState(built.state, built.manifest)
    return { operation: 'inspect', providerCalls: 0, manifestHash: built.manifest.manifestHash, stateHash: built.state.stateHash, modelCount: built.manifest.models.length, slotCount: built.state.slots.length }
  }
  if (bundle.operation === 'import_codex') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'input'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    assertExactScientificV2Keys(bundle.input, [
      'manifestHash', 'stateHash', 'manifest', 'state', 'provenance', 'toolCalls',
      'batchId', 'revision', 'previousStateHash', 'createdAt', 'attestationSecret',
      ...(bundle.input.execution ? ['execution'] : []),
    ], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    const {
      batchId, revision, previousStateHash, createdAt, attestationSecret,
      execution,
      ...codexInput
    } = bundle.input
    assertScientificV2StateOperationReportMetadata({ batchId, revision, createdAt, attestationSecret })
    if (!isScientificV2Hash(previousStateHash) || previousStateHash !== codexInput.stateHash) {
      scientificV2Error('SCIENTIFIC_V2_OPERATOR_REPORT_PREVIOUS_STATE_MISMATCH')
    }
    const imported = await importScientificCodexArtifacts(codexInput)
    const env = context?.env || process.env
    const store = await createCodexArtifactStore(env, context?.productionDependencies)
    await persistCodexArtifacts(
      bundle.input,
      store,
      readScientificV2ProductionEditSourcePng(env.PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH),
    )
    return createScientificV2SignedStateOperationReport({
      kind: 'codex', batchId, manifest: codexInput.manifest, state: imported.state,
      revision, previousStateHash, createdAt, attestationSecret,
      ...(execution ? { execution } : {}),
      codexImport: imported,
    }) as unknown as Record<string, unknown>
  }
  if (bundle.operation === 'review_pack') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'input'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    const { attestationSecret, ...packageInput } = bundle.input
    const packed = createScientificBlindReviewPackages(packageInput, attestationSecret)
    const publicReviewer = (reviewer: typeof packed.reviewerA) => ({
      role: reviewer.role, packages: reviewer.packages, mappingHash: reviewer.mappingHash,
      assignmentSet: reviewer.assignmentSet, assignmentAttestationHash: reviewer.assignmentAttestationHash,
    })
    const privateBundle = {
      batchManifestHash: packed.batchManifestHash,
      sourceSetHash: packed.sourceSetHash,
      reviewerA: { privateMappings: packed.reviewerA.privateMappings, privateEnvelope: packed.reviewerA.privateEnvelope },
      reviewerB: { privateMappings: packed.reviewerB.privateMappings, privateEnvelope: packed.reviewerB.privateEnvelope },
    }
    return {
      operation: 'review_pack', providerCalls: 0, batchManifestHash: packed.batchManifestHash,
      automaticJudges: packed.automaticJudges,
      publicReviewerA: publicReviewer(packed.reviewerA), publicReviewerB: publicReviewer(packed.reviewerB),
      publicArtifactHash: canonicalHash({ reviewerA: publicReviewer(packed.reviewerA), reviewerB: publicReviewer(packed.reviewerB) }),
      privateBundle, privateBundleHash: canonicalHash(privateBundle),
    }
  }
  if (bundle.operation === 'review_finalize') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'input'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    const { attestationSecret, ...reviewInput } = bundle.input
    const final = finalizeScientificDoubleReview(reviewInput, attestationSecret)
    return { operation: 'review_finalize', providerCalls: 0, ...final }
  }
  if (bundle.operation === 'review_validate') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'input'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    assertExactScientificV2Keys(bundle.input, [
      'role', 'publicAssignment', 'privateAssignment', 'submissions', 'attestationSecret',
    ], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    const assignment = assembleScientificBlindReviewerAssignment({
      publicAssignment: bundle.input.publicAssignment,
      privateAssignment: bundle.input.privateAssignment,
    })
    const result = validateScientificReviewerResults({
      role: bundle.input.role, assignment, submissions: bundle.input.submissions,
    }, bundle.input.attestationSecret)
    return { operation: 'review_validate', providerCalls: 0, result }
  }
  if (bundle.operation === 'review_arbitrate') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'input'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    const { attestationSecret, ...reviewInput } = bundle.input
    const final = finalizeScientificDoubleReview(reviewInput, attestationSecret)
    if (!final.canFinalize || final.attestation.arbitrationHash === null) {
      scientificV2Error('SCIENTIFIC_V2_ARBITRATION_REQUIRED')
    }
    return { operation: 'review_arbitrate', providerCalls: 0, ...final }
  }
  if (bundle.operation === 'reconcile_artifact') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'manifest', 'state', 'input'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    assertExactScientificV2Keys(bundle.input, ['batchId', 'slotId', 'attemptIndex', 'imageHash'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    if (typeof bundle.input.batchId !== 'string' || !bundle.input.batchId || typeof bundle.input.slotId !== 'string'
      || !bundle.input.slotId || !Number.isInteger(bundle.input.attemptIndex) || bundle.input.attemptIndex < 1
      || bundle.input.attemptIndex > 4 || !isScientificV2Hash(bundle.input.imageHash)) {
      scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_BINDING_INVALID')
    }
    verifyScientificV2BatchManifest(bundle.manifest)
    verifyScientificV2BatchState(bundle.state, bundle.manifest)
    const dependencies = await createScientificV2ArtifactReconciliationDependencies(
      context?.env || process.env, context?.productionDependencies,
    )
    try {
      const result = await reconcileScientificV2Artifact({
        manifest: bundle.manifest, state: bundle.state, ...bundle.input,
        repository: dependencies.repository, artifactStore: dependencies.artifactStore, artifactSpool: dependencies.artifactSpool,
        editSourcePng: readScientificV2ProductionEditSourcePng((context?.env || process.env).PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH),
      })
      return { operation: 'reconcile_artifact', providerCalls: 0, state: result.state, stateHash: result.state.stateHash }
    } finally {
      await dependencies.close().catch((error) => {
        if (context?.onCleanupFailure) context.onCleanupFailure(error)
        else process.stderr.write('SCIENTIFIC_V2_PRODUCTION_CLEANUP_FAILED\n')
      })
    }
  }
  if (bundle.operation === 'render_public_evidence') {
    assertExactScientificV2Keys(bundle, ['operation', 'gate', 'manifest', 'state', 'input'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    assertExactScientificV2Keys(bundle.input, ['batchId'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    if (typeof bundle.input.batchId !== 'string' || !bundle.input.batchId || bundle.input.batchId.length > 160) {
      scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDER_BATCH_BINDING_INVALID')
    }
    verifyScientificV2BatchManifest(bundle.manifest)
    verifyScientificV2BatchState(bundle.state, bundle.manifest)
    if (bundle.state.status !== 'completed') scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDER_STATE_INVALID')
    const dependencies = await createScientificV2PublicRenderDependencies(context?.env || process.env, context?.productionDependencies)
    try {
      const result = await renderScientificV2PublicEvidence({
        batchId: bundle.input.batchId, manifest: bundle.manifest, state: bundle.state,
        repository: dependencies.repository, store: dependencies.store,
        editSourcePng: readScientificV2ProductionEditSourcePng((context?.env || process.env).PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH),
      })
      return { operation: 'render_public_evidence', providerCalls: 0, ...result }
    } finally {
      await dependencies.close().catch((error) => {
        if (context?.onCleanupFailure) context.onCleanupFailure(error)
        else process.stderr.write('SCIENTIFIC_V2_PRODUCTION_CLEANUP_FAILED\n')
      })
    }
  }
  if (bundle.operation === 'run') {
    assertExactScientificV2Keys(bundle, Object.hasOwn(bundle, 'executionPhase')
      ? ['operation', 'gate', 'executionPhase', 'manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash', 'manifest', 'state', 'report']
      : ['operation', 'gate', 'manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash', 'manifest', 'state', 'report'], 'SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    if (![undefined, 'canary-only', 'full'].includes(bundle.executionPhase)) scientificV2Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    const execution = {
      manifestCodeSha: bundle.manifestCodeSha,
      executionCodeSha: bundle.executionCodeSha,
      legacyRecoveryStateHash: bundle.legacyRecoveryStateHash,
    }
    assertScientificV2StateOperationReportMetadata({
      batchId: bundle.report.batchId,
      revision: bundle.report.revision,
      createdAt: bundle.report.createdAt,
      attestationSecret: bundle.report.attestationSecret,
    })
    verifyScientificV2BatchManifest(bundle.manifest)
    verifyScientificV2BatchState(bundle.state, bundle.manifest)
    await assertExecutionLineage(context?.env || process.env, bundle.manifest, execution)
    const dependencies = await createScientificV2ProductionRunDependencies(context?.env || process.env, context?.productionDependencies)
    let operationResult: Record<string, unknown> | null = null
    let operationError: unknown = null
    try {
      const result = await runScientificV2Batch({
        manifest: bundle.manifest, state: bundle.state,
        attestation: {
          enabled: false, concurrency: 1, lockName: SCIENTIFIC_V2_PRODUCTION_LOCK_NAME, repositoryMode: 'atomic-v2',
          batchId: bundle.report.batchId, revision: bundle.report.revision,
          phase: bundle.executionPhase || 'full',
          execution,
        },
        ...dependencies,
      })
      operationResult = createScientificV2SignedStateOperationReport({
        kind: 'worker', manifest: bundle.manifest, state: result.state,
        batchId: bundle.report.batchId, revision: bundle.report.revision,
        previousStateHash: result.previousStateHash, createdAt: bundle.report.createdAt,
        attestationSecret: bundle.report.attestationSecret,
        execution,
      }) as unknown as Record<string, unknown>
    } catch (error) {
      operationError = error
    }
    try {
      await dependencies.close()
    } catch (error) {
      if (context?.onCleanupFailure) context.onCleanupFailure(error)
      else process.stderr.write('SCIENTIFIC_V2_PRODUCTION_CLEANUP_FAILED\n')
    }
    if (operationError) throw operationError
    return operationResult!
  }
  scientificV2Error('SCIENTIFIC_V2_OPERATOR_OPERATION_INVALID')
}
