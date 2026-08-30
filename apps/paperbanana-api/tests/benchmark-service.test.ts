import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'

import { createBenchmarkService, publicBenchmarkRelease } from '../src/benchmark-service.js'
import { buildCodexSingleProfile, buildJudgeCalibrationRecord, buildPhaseOperatorAttestation, buildPublicEvidenceDraft, buildStandardReviewSourceManifest, createMongoBenchmarkRepository, judgeCalibrationId, verifyEvidenceObjects, verifyScientificV2EvidenceMetadata } from '../src/benchmark-repository.js'
import {
  BENCHMARK_AXES,
  PB_IMAGE_DIAGNOSTIC_V1,
  PB_IMAGE_LIGHT_V1,
  aggregateAxisScores,
  applyCodexAdjudication,
  benchmarkSampleId,
  buildAuditSelection,
  canonicalHash,
  createCodexReviewPacket,
  importCodexReview,
} from '@paperbanana/benchmark-core'

const reviewSigningSecret = 'test-review-secret'
process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET = reviewSigningSecret

function storedRelease(base: Record<string, any>): Record<string, any> {
  const { _id, ...hashBase } = base
  return { _id, ...hashBase, releaseHash: canonicalHash(hashBase) }
}

test('judge calibration identity is immutable per judge stack', () => {
  const epoch = 'judge-2026-08-v1'
  const stackA = 'a'.repeat(64)
  const stackB = 'b'.repeat(64)
  assert.equal(judgeCalibrationId(epoch, stackA), `benchmark-judge-calibration:${epoch}:${stackA}`)
  assert.notEqual(judgeCalibrationId(epoch, stackA), judgeCalibrationId(epoch, stackB))
})

test('judge calibration record binds the private operator report, authorization, price and usage', () => {
  const codeSha = 'd'.repeat(40)
  const judgeStackHash = 'e'.repeat(64)
  const priceSnapshot = {
    currency: 'USD', source: 'https://openrouter.ai/api/v1/models', capturedAt: '2026-08-25T08:00:00.000Z',
    estimatedPerGenerationUsd: 0, estimatedPerJudgeCallUsd: 0.1,
  }
  const priceHash = canonicalHash(priceSnapshot)
  const authorizationBase = {
    mode: 'calibration', codeSha, maxGenerations: 0, maxJudgeCalls: 14, maxEstimatedUsd: 1.4,
    estimatedPerGenerationUsd: 0, estimatedPerJudgeCallUsd: 0.1, priceSnapshot, priceHash,
  }
  const authorization = { ...authorizationBase, authorizationHash: canonicalHash(authorizationBase) }
  const reportBase = {
    operatorMode: 'calibration', codeSha, judgeEpoch: 'judge-2026-08-v1', judgeStackHash,
    authorizationHash: authorization.authorizationHash, authorization, priceHash, priceSnapshot,
    usage: { generations: 0, judgments: 12, estimatedUsd: 1.2 }, createdAt: '2026-08-25T08:05:00.000Z',
    result: { fixtureHash: 'b'.repeat(64), correctRedLines: 12, totalRedLines: 12, accuracy: 1, agreement: 1, passed: true },
  }
  const operatorReportHash = canonicalHash(reportBase)
  const report = { ...reportBase, operatorReportHash }
  const input = {
    judgeEpoch: 'judge-2026-08-v1', fixtureHash: 'b'.repeat(64), correctRedLines: 12, totalRedLines: 12, agreement: 1,
    operatorReportHash, reportObjectKey: `bench/operator-reports/${operatorReportHash}.json`, authorizationHash: authorization.authorizationHash,
    priceHash, priceSnapshot, usage: { generations: 0, judgments: 12, estimatedUsd: 1.2 },
  }
  const record = buildJudgeCalibrationRecord(input, codeSha, judgeStackHash, 'immutable-admin-id', new Date('2026-08-25T08:10:00.000Z'), report)
  assert.equal(record.operatorReportHash, operatorReportHash)
  assert.equal(record.priceHash, priceHash)
  assert.deepEqual(record.usage, { generations: 0, judgments: 12, estimatedUsd: 1.2 })
  assert.throws(() => buildJudgeCalibrationRecord({ ...input, reportObjectKey: 'bench/other.json' }, codeSha, judgeStackHash, 'immutable-admin-id', new Date(), report), /BENCHMARK_JUDGE_CALIBRATION_FAILED/)
  assert.throws(() => buildJudgeCalibrationRecord({ ...input, priceHash: 'f'.repeat(64) }, codeSha, judgeStackHash, 'immutable-admin-id', new Date(), report), /BENCHMARK_JUDGE_CALIBRATION_FAILED/)
  assert.throws(() => buildJudgeCalibrationRecord({ ...input, usage: { ...record.usage, estimatedUsd: 1.1 } }, codeSha, judgeStackHash, 'immutable-admin-id', new Date(), report), /BENCHMARK_JUDGE_CALIBRATION_FAILED/)
  assert.throws(() => buildJudgeCalibrationRecord(input, codeSha, judgeStackHash, 'immutable-admin-id', new Date(), { ...report, operatorReportHash: 'a'.repeat(64) }), /BENCHMARK_JUDGE_CALIBRATION_FAILED/)
  assert.throws(() => buildJudgeCalibrationRecord(input, codeSha, judgeStackHash, 'immutable-admin-id', new Date(), { ...report, authorization: { ...authorization, maxJudgeCalls: 24 } }), /BENCHMARK_JUDGE_CALIBRATION_FAILED/)
  assert.throws(() => buildJudgeCalibrationRecord(input, codeSha, judgeStackHash, 'immutable-admin-id', new Date(), undefined), /BENCHMARK_JUDGE_CALIBRATION_FAILED/)
})

test('approval creates canonical run facts and reapproval never resigns a tampered stored run', async () => {
  const candidate = {
    _id: 'ark:model', candidateId: 'ark:model', provider: 'ark', modelId: 'model', developer: 'Maker', lane: '2K-standard',
    aspectRatios: ['1:1', '16:9'], registryHash: 'registry-hash', state: 'detected',
  }
  let insertedRun: any
  const collections: Record<string, any> = {
    paperbanana_benchmark_models: {
      async findOne() { return candidate },
      async findOneAndUpdate() { return { ...candidate, state: 'approved' } },
    },
    paperbanana_benchmark_runs: {
      async updateOne(_query: any, update: any) { insertedRun = update.$setOnInsert; return { modifiedCount: 1 } },
    },
    paperbanana_benchmark_suites: {}, paperbanana_benchmark_samples: {}, paperbanana_benchmark_judgments: {}, paperbanana_benchmark_releases: {},
  }
  const input = {
    candidateId: candidate._id, entitlementConfirmed: true, maxGenerations: 24, maxJudgments: 48, maxJudgeCalls: 192, maxEstimatedUsd: 100,
    priceSnapshot: { estimatedPerGeneration: 1, estimatedPerJudgeCall: 0.1, source: 'https://example.com/pricing/image-model', capturedAt: '2026-08-25T08:00:00.000Z' }, adminUserId: 'admin-123',
  }
  const now = () => new Date('2026-08-25T08:00:00.000Z')
  const repository = createMongoBenchmarkRepository({ collection(name: string) { return collections[name] } } as any, now, async () => {}, 'a'.repeat(40))
  await assert.rejects(() => repository.approve({ ...input, priceSnapshot: { ...input.priceSnapshot, source: undefined } } as any), /BENCHMARK_APPROVAL_INCOMPLETE/)
  await repository.approve(input as any)
  assert.equal(insertedRun.runHash, canonicalHash(insertedRun.runFacts))
  assert.equal(insertedRun.candidateSnapshot.displayName, candidate.modelId)
  assert.equal(insertedRun.candidateSnapshot.providerLabel, candidate.provider)
  assert.deepEqual(insertedRun.aspectRatios, [...candidate.aspectRatios].sort())
  assert.deepEqual(insertedRun.aspectRatios, insertedRun.runFacts.aspectRatios)
  assert.equal(insertedRun.approvalVersions.length, 1)
  assert.equal(insertedRun.approvalVersions[0].phase, 'quick')
  const operatorAttestation = buildPhaseOperatorAttestation({ ...insertedRun, state: 'quick_running' }, reviewSigningSecret)
  assert.equal(operatorAttestation.runId, insertedRun._id)
  assert.equal(operatorAttestation.phase, 'quick')
  assert.equal(operatorAttestation.signedAuthorizationHash, insertedRun.authorizationHash)
  assert.equal(operatorAttestation.priceSnapshot.source, input.priceSnapshot.source)
  assert.equal(operatorAttestation.runHash, insertedRun.runHash)
  assert.equal(operatorAttestation.runFactsHash, canonicalHash(insertedRun.runFacts))
  assert.equal(operatorAttestation.candidateSnapshotHash, canonicalHash(insertedRun.candidateSnapshot))
  assert.equal(operatorAttestation.aspectRatiosHash, canonicalHash(insertedRun.runFacts.aspectRatios))
  assert.equal(operatorAttestation.registryHash, insertedRun.registryHash)
  assert.equal(operatorAttestation.runIntegrityAttestation, insertedRun.runIntegrityAttestation)
  assert.match(operatorAttestation.immutableFactsHash, /^[a-f0-9]{64}$/)
  assert.equal(insertedRun.runIntegrityAttestation, createHmac('sha256', reviewSigningSecret)
    .update(canonicalHash({ schemaVersion: 2, runHash: insertedRun.runHash, runFacts: insertedRun.runFacts,
      candidateSnapshot: insertedRun.candidateSnapshot, approvalVersions: insertedRun.approvalVersions })).digest('hex'))

  let reapprovalSet: any
  collections.paperbanana_benchmark_models = {
    async findOne() { return { ...candidate, state: 'approved' } },
    async findOneAndUpdate() { return { ...candidate, state: 'approved', displayName: 'mutable label' } },
  }
  collections.paperbanana_benchmark_runs = {
    find() { return { sort() { return this }, limit() { return this }, async next() { return { ...insertedRun, state: 'provisional_published' } } } },
    async updateOne(_query: any, update: any) { reapprovalSet = update.$set; return { modifiedCount: 1 } },
  }
  const reapprovalRepository = createMongoBenchmarkRepository({ collection(name: string) { return collections[name] } } as any, now, async () => {}, 'a'.repeat(40))
  await reapprovalRepository.approve({ ...input, maxGenerations: 144, maxJudgments: 288, maxJudgeCalls: 1152, maxEstimatedUsd: 500 } as any)
  assert.deepEqual(reapprovalSet.approvalVersions.map((version: any) => version.phase), ['quick', 'full'])
  assert.equal(reapprovalSet.runIntegrityAttestation, createHmac('sha256', reviewSigningSecret)
    .update(canonicalHash({ schemaVersion: 2, runHash: insertedRun.runHash, runFacts: insertedRun.runFacts,
      candidateSnapshot: insertedRun.candidateSnapshot, approvalVersions: reapprovalSet.approvalVersions })).digest('hex'))

  const tamperedRun = { ...insertedRun, state: 'provisional_published', developer: 'forged' }
  let reapprovalWrites = 0
  collections.paperbanana_benchmark_models = {
    async findOne() { return { ...candidate, state: 'approved' } },
    async findOneAndUpdate() { reapprovalWrites += 1; return { ...candidate, state: 'approved' } },
  }
  collections.paperbanana_benchmark_runs = {
    find() { return { sort() { return this }, limit() { return this }, async next() { return tamperedRun } } },
    async updateOne() { reapprovalWrites += 1; return { modifiedCount: 1 } },
  }
  const tamperedReapprovalRepository = createMongoBenchmarkRepository({ collection(name: string) { return collections[name] } } as any, now, async () => {}, 'a'.repeat(40))
  await assert.rejects(() => tamperedReapprovalRepository.approve(input as any), /BENCHMARK_REAPPROVAL_RUN_INTEGRITY_FAILED/)
  assert.equal(reapprovalWrites, 0)
})

test('Codex-only standard approval signs generation-only caps and accepts provider-default output', async () => {
  const candidate = {
    _id: 'openrouter:vendor/model', candidateId: 'openrouter:vendor/model', provider: 'openrouter', modelId: 'vendor/model',
    canonicalModelId: 'vendor/model', developer: 'Vendor', lane: null, aspectRatios: [], registryHash: 'registry-hash', state: 'detected',
    primaryAccessProvider: 'openrouter', alternateAccessProviders: [],
  }
  let insertedRun: any
  const collections: Record<string, any> = {
    paperbanana_benchmark_models: {
      async findOne() { return candidate },
      async findOneAndUpdate() { return { ...candidate, state: 'approved' } },
    },
    paperbanana_benchmark_runs: { async updateOne(_query: any, update: any) { insertedRun = update.$setOnInsert; return { modifiedCount: 1 } } },
    paperbanana_benchmark_suites: {}, paperbanana_benchmark_samples: {}, paperbanana_benchmark_judgments: {}, paperbanana_benchmark_dispatches: {}, paperbanana_benchmark_releases: {},
  }
  const repository = createMongoBenchmarkRepository({ collection: (name: string) => collections[name] } as any, () => new Date('2026-08-28T08:00:00.000Z'), async () => {}, 'a'.repeat(40))
  const result = await repository.approve({
    candidateId: candidate._id, evaluationMode: 'codex_single', entitlementConfirmed: true,
    maxGenerations: 4, maxJudgments: 0, maxJudgeCalls: 0, maxEstimatedUsd: 4,
    priceSnapshot: { currency: 'USD', source: 'https://example.com/pricing', estimatedPerGeneration: 1, estimatedPerJudgeCall: 0, capturedAt: '2026-08-28T07:00:00.000Z' },
    adminUserId: 'immutable-admin-id',
  })
  assert.ok(result.runId)
  assert.equal(insertedRun.evaluationMode, 'codex_single')
  assert.equal(insertedRun.suiteId, PB_IMAGE_LIGHT_V1.id)
  assert.equal(insertedRun.lane, 'provider-default')
  assert.equal(insertedRun.approvalVersions[0].phase, 'standard')
  assert.deepEqual(insertedRun.usageByPhase.standard, { generations: 0, judgments: 0, judgeCalls: 0, estimatedUsd: 0 })
  assert.equal(insertedRun.approval.maxJudgments, 0)
  assert.equal(insertedRun.approval.maxJudgeCalls, 0)

  let legacyLookup = false
  const approvedCollections = {
    ...collections,
    paperbanana_benchmark_models: {
      async findOne() { return { ...candidate, state: 'approved' } },
      async findOneAndUpdate() { return { ...candidate, state: 'approved' } },
    },
    paperbanana_benchmark_runs: {
      find() { legacyLookup = true; throw new Error('standard approval must not reuse a legacy run') },
      async updateOne(_query: any, update: any) { insertedRun = update.$setOnInsert; return { modifiedCount: 1 } },
    },
  }
  const approvedRepository = createMongoBenchmarkRepository({ collection: (name: string) => (approvedCollections as any)[name] } as any, () => new Date('2026-08-28T08:00:00.000Z'), async () => {}, 'a'.repeat(40))
  const approvedResult = await approvedRepository.approve({
    candidateId: candidate._id, evaluationMode: 'codex_single', entitlementConfirmed: true,
    maxGenerations: 4, maxJudgments: 0, maxJudgeCalls: 0, maxEstimatedUsd: 4,
    priceSnapshot: { currency: 'USD', source: 'https://example.com/pricing', estimatedPerGeneration: 1, estimatedPerJudgeCall: 0, capturedAt: '2026-08-28T07:00:00.000Z' },
    adminUserId: 'immutable-admin-id',
  })
  assert.ok(approvedResult.runId)
  assert.equal(legacyLookup, false)
  assert.equal(insertedRun.evaluationMode, 'codex_single')
})

test('standard review source manifest binds four samples and rejects every automatic judgment or dispatch', () => {
  const run = { _id: 'standard-run', runHash: 'a'.repeat(64), reviewerEpoch: 'codex-single-2026-08-v1' }
  const samples = PB_IMAGE_LIGHT_V1.cases.map((diagnosticCase, index) => ({
    _id: benchmarkSampleId(run._id, 'standard', diagnosticCase.id, 0), sampleId: benchmarkSampleId(run._id, 'standard', diagnosticCase.id, 0),
    runId: run._id, phase: 'standard', caseId: diagnosticCase.id, repetition: 0, status: 'completed',
    imageHash: String(index + 1).repeat(64).slice(0, 64), imageObjectKey: `bench/objects/${String(index + 1).repeat(64).slice(0, 64)}.png`, latencyMs: 1000,
    rubric: diagnosticCase.rubric, rubricHash: canonicalHash(diagnosticCase.rubric), auditRequired: true,
    caseRequirements: { caption: diagnosticCase.caption }, requirementsHash: canonicalHash({ caption: diagnosticCase.caption }),
    actualOutputPixels: { width: 1024, height: 1024, megapixels: 1.0486, fileSizeBytes: 1000 },
  }))
  const manifest = buildStandardReviewSourceManifest(run, samples, [], [])
  assert.equal(manifest.facts.phase, 'standard')
  assert.deepEqual(manifest.facts.usage, { generationCalls: 4, logicalJudgments: 0, judgeDispatchCalls: 0 })
  assert.equal(manifest.expectedAuditIds.length, 4)
  const failed = { _id: samples[3]._id, sampleId: samples[3].sampleId, runId: run._id, phase: 'standard', caseId: samples[3].caseId, repetition: 0, status: 'failed', errorCode: 'BENCHMARK_GENERATION_FAILED', failedAt: new Date('2026-08-28T00:00:00.000Z') }
  const failureManifest = buildStandardReviewSourceManifest(run, [...samples.slice(0, 3), failed], [], [])
  assert.deepEqual(failureManifest.facts.usage, { generationCalls: 4, logicalJudgments: 0, judgeDispatchCalls: 0 })
  assert.equal(failureManifest.expectedAuditIds.length, 3)
  assert.equal(failureManifest.facts.generationFailures.length, 1)
  assert.throws(() => buildStandardReviewSourceManifest(run, samples, [{ phase: 'standard', status: 'completed' }], []), /BENCHMARK_STANDARD_SOURCE_MANIFEST_INVALID/)
  assert.throws(() => buildStandardReviewSourceManifest(run, samples, [], [{ phase: 'standard' }]), /BENCHMARK_STANDARD_SOURCE_MANIFEST_INVALID/)
})

test('Codex-only profile ranks three reviewed samples and prices generation only', () => {
  const samples = PB_IMAGE_LIGHT_V1.cases.slice(0, 3).map((diagnosticCase, index) => ({ sampleId: `sample-${index}`, caseId: diagnosticCase.id, latencyMs: 1000 + index, actualOutputPixels: { width: 1024, height: 1024, megapixels: 1.0486, fileSizeBytes: 1000 } }))
  const codex = samples.map((sample) => ({ sampleId: sample.sampleId, scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 8])), confirmedRedLines: sample.sampleId === 'sample-0' ? [{ code: 'garbled_text', axis: 'text_accuracy', cap: 4 }] : [], evidence: ['visible'], confidence: 0.9, consistencyReviewed: true }))
  const profile = buildCodexSingleProfile({
    run: { runHash: 'a'.repeat(64), canonicalModelId: 'model', modelId: 'route-model', provider: 'openrouter', primaryAccessProvider: 'openrouter', alternateAccessProviders: [], lane: 'provider-default', developer: 'Vendor', priceHash: 'b'.repeat(64), registryHash: 'registry', codeSha: 'c'.repeat(40) },
    samples, codexJudgments: codex, automaticJudgments: [], dispatches: [], priceSnapshot: { estimatedPerGeneration: 0.25 }, generationCalls: 4,
  })
  assert.equal(profile.ranked, true)
  assert.equal(profile.sampleCount, 3)
  assert.equal(profile.dimensions.text_accuracy.mean < profile.dimensions.aesthetics.mean, true)
  assert.deepEqual(profile.estimatedCost, { usd: 1, generationCalls: 4, automaticJudgeCalls: 0, logicalJudgments: 0, judgeDispatchCalls: 0 })
  assert.throws(() => buildCodexSingleProfile({ run: {}, samples, codexJudgments: codex.map((item) => ({ ...item, consistencyReviewed: false })), automaticJudgments: [], dispatches: [], priceSnapshot: { estimatedPerGeneration: 0.25 } }), /BENCHMARK_STANDARD_CODEX_SHAPE_INVALID/)
  assert.throws(() => buildCodexSingleProfile({ run: {}, samples, codexJudgments: codex, automaticJudgments: [{}], dispatches: [], priceSnapshot: { estimatedPerGeneration: 0.25 } }), /BENCHMARK_STANDARD_JUDGE_DATA_FORBIDDEN/)
})

test('public release strips private fields and signs only allowlisted bench evidence', async () => {
  const signed: string[] = []
  const release = await publicBenchmarkRelease(storedRelease({
    _id: 'release-1',
    profileStatus: 'verified',
    suiteId: 'pb-image-diagnostic-v1',
    lane: '2K-standard',
    evaluationMode: 'codex_single', evaluationEpoch: 'codex-single-2026-08-v1', reviewProtocol: 'codex-single-two-pass-v1', reviewerKind: 'codex', reviewerPasses: 2,
    models: [{
      modelId: 'model-a', displayName: 'A', provider: 'openrouter', developer: 'Maker', sampleCount: 3,
      dimensions: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, { mean: 8 }])),
      registryHash: 'registry-a', priceHash: 'price-a', codeSha: 'sha-a', auditRatio: 0.1,
      canonicalModelId: 'maker/model-a', primaryAccessProvider: 'openrouter', alternateAccessProviders: ['bailian'],
      actualOutputPixels: [{ width: 1024, height: 1024, megapixels: 1.048576, fileSizeBytes: 2048 }], ranked: true,
      capabilityGaps: ['aspectRatio:16:9'], secretRef: 'must-not-leak',
    }],
    methodology: { suiteId: 'pb-image-light-v1', evaluationMode: 'codex_single', reviewProtocol: 'codex-single-two-pass-v1', reviewerKind: 'codex', reviewerPasses: 2, automaticJudges: [], internalQueue: 'hidden' },
    evidence: [
      { sampleId: 'allowed', objectKey: 'bench/releases/release-1/allowed.png', kind: 'median' },
      { sampleId: 'outside', objectKey: 'jobs/private.png', kind: 'failure' },
    ],
    internalError: 'secret details',
    secretRef: 'vault:key',
    runQueue: ['work-1'],
  }), async (key) => {
    signed.push(key)
    return `https://signed.example/${key}`
  })
  assert.equal('internalError' in release, false)
  assert.equal('secretRef' in release, false)
  assert.equal('runQueue' in release, false)
  assert.equal(release.models[0].registryHash, 'registry-a')
  assert.equal(release.models[0].priceHash, 'price-a')
  assert.equal(release.models[0].codeSha, 'sha-a')
  assert.equal(release.models[0].auditRatio, 0.1)
  assert.deepEqual(release.models[0].capabilityGaps, ['aspectRatio:16:9'])
  assert.equal(release.evaluationMode, 'codex_single')
  assert.equal(release.models[0].canonicalModelId, 'maker/model-a')
  assert.deepEqual(release.models[0].alternateAccessProviders, ['bailian'])
  assert.equal(release.models[0].actualOutputPixels[0].width, 1024)
  assert.deepEqual(release.methodology?.automaticJudges, [])
  assert.equal(release.methodology?.internalQueue, undefined)
  assert.equal('secretRef' in release.models[0], false)
  assert.equal(release.evidence.length, 1)
  assert.equal(release.evidence[0].imageUrl, 'https://signed.example/bench/releases/release-1/allowed.png')
  assert.deepEqual(signed, ['bench/releases/release-1/allowed.png'])
})

test('public release derives immutable Arena rankings only for complete ranked profiles', async () => {
  const topMeans = [6.01, 6.02, 6.03, 6.04, 6.05, 6.06, 6.07]
  const dimensions = (means: number[]) => Object.fromEntries(BENCHMARK_AXES.map((axis, index) => [axis, { mean: means[index] }]))
  const source = storedRelease({
    _id: 'release-arena', profileStatus: 'published', evaluationMode: 'codex_single', suiteId: 'suite', lane: '2K-standard', evidence: [],
    models: [
      { modelId: 'top-one', displayName: 'Top one', ranked: true, sampleCount: 3, dimensions: dimensions(topMeans), privateFlag: 'hidden' },
      { modelId: 'top-two', displayName: 'Top two', ranked: true, sampleCount: 3, dimensions: dimensions(topMeans) },
      { modelId: 'third', displayName: 'Third', ranked: true, sampleCount: 3, dimensions: dimensions(BENCHMARK_AXES.map(() => 0)) },
      { modelId: 'failed', ranked: false, sampleCount: 4, dimensions: dimensions(topMeans) },
      { modelId: 'too-few', ranked: true, sampleCount: 2, dimensions: dimensions(topMeans) },
      { modelId: 'missing-axis', ranked: true, sampleCount: 3, dimensions: Object.fromEntries(BENCHMARK_AXES.slice(1).map((axis) => [axis, { mean: 8 }])) },
      { modelId: 'not-a-number', ranked: true, sampleCount: 3, dimensions: { ...dimensions(topMeans), faithfulness: { mean: 'NaN' } } },
    ],
    methodology: { suiteId: 'suite', noOverallScore: true },
  })
  const sourceModels = structuredClone(source.models)

  const release = await publicBenchmarkRelease(source, async () => 'signed')

  assert.deepEqual(release.models.map((model: any) => model.modelId), ['top-one', 'top-two', 'third'])
  assert.equal(release.models[0].overallScore, topMeans.reduce((sum, value) => sum + value, 0) / BENCHMARK_AXES.length)
  assert.deepEqual(release.models.map((model: any) => model.overallRank), [1, 1, 3])
  for (const axis of BENCHMARK_AXES) assert.deepEqual(release.models.map((model: any) => model.dimensionRanks[axis]), [1, 1, 3])
  assert.equal(release.sourceReleaseHash, source.releaseHash)
  assert.equal(release.presentationVersion, 'arena-leaderboard-v1')
  assert.equal(release.eligibleModelCount, 3)
  assert.deepEqual(release.rankingMethod, {
    id: 'equal_weight_mean_v1', axes: BENCHMARK_AXES, weights: BENCHMARK_AXES.map(() => 1 / BENCHMARK_AXES.length), tieMethod: 'competition',
  })
  assert.equal(release.methodology?.noOverallScore, false)
  assert.deepEqual(release.methodology?.rankingMethod, release.rankingMethod)
  assert.deepEqual(source.models, sourceModels)
})

test('public release validates the stored hash before deriving leaderboard fields', async () => {
  const release = storedRelease({ _id: 'tampered-release', models: [], evidence: [] })
  release.models.push({ modelId: 'tampered', ranked: true, sampleCount: 3, dimensions: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, { mean: 8 }])) })
  await assert.rejects(
    () => publicBenchmarkRelease(release, async () => { throw new Error('must not derive or sign') }),
    /BENCHMARK_RELEASE_HASH_MISMATCH/,
  )
  const nonFinite = storedRelease({ _id: 'non-finite-release', models: [], evidence: [] })
  nonFinite.models.push({ modelId: 'nan', ranked: true, sampleCount: 3, dimensions: { faithfulness: { mean: Number.NaN } } })
  await assert.rejects(() => publicBenchmarkRelease(nonFinite, async () => 'signed'), /NON_FINITE_CANONICAL_VALUE/)
})

test('benchmark profiles do not expose models filtered from the public leaderboard', async () => {
  const dimensions = Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, { mean: 8 }]))
  const release = storedRelease({
    _id: 'filtered-profile-release', profileStatus: 'published', evaluationMode: 'codex_single', evidence: [], models: [
      { modelId: 'eligible', ranked: true, sampleCount: 3, dimensions },
      { modelId: 'insufficient', ranked: true, sampleCount: 2, dimensions },
    ],
  })
  const service = createBenchmarkService({
    repository: {
      async latestRelease() { return release }, async releaseByModel() { return release }, async candidates() { return [] }, async approve() {}, async control() {},
      async exportReview() {}, async importReview() {}, async publish() {},
    },
    signEvidence: async () => 'signed',
  })
  assert.equal((await service.handle({ action: 'benchmarkModelProfile', modelId: 'eligible' }, false)).code, 0)
  assert.deepEqual(await service.handle({ action: 'benchmarkModelProfile', modelId: 'insufficient' }, false), { code: 404, error: 'Benchmark profile not found' })
})

test('public model and case evidence sign only allowlisted WebP variants and never leak audit fields', async () => {
  const dimensions = Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, { mean: 8 }]))
  const release = storedRelease({
    _id: 'evidence-release', profileStatus: 'published', evaluationMode: 'codex_single',
    suiteId: PB_IMAGE_LIGHT_V1.id, suiteHash: PB_IMAGE_LIGHT_V1.manifestHash,
    evidence: [], models: [{ profileId: 'model-a:codex_single:epoch', modelId: 'model-a', canonicalModelId: 'model-a', ranked: true, sampleCount: 4, dimensions }],
  })
  const rawEvidence = [{
    sourceReleaseHash: release.releaseHash,
    sampleId: 'sample-1', profileId: 'model-a:codex_single:epoch', modelId: 'model-a', caseId: PB_IMAGE_LIGHT_V1.cases[0].id,
    imageHash: 'a'.repeat(64), actualOutputPixels: { width: 2048, height: 1024, megapixels: 2.0972, fileSizeBytes: 1234 },
    scores: Object.fromEntries(BENCHMARK_AXES.map((axis, index) => [axis, 9 - index / 10])),
    reviewNotes: ['文字清晰，但次要标签略拥挤。'],
    variants: [
      { kind: 'thumbnail', objectKey: `bench/public/evidence/${'a'.repeat(64)}/w640.webp`, imageHash: 'b'.repeat(64), width: 640, height: 320, fileSizeBytes: 222, mimeType: 'image/webp' },
      { kind: 'detail', objectKey: `bench/public/evidence/${'a'.repeat(64)}/w1600.webp`, imageHash: 'c'.repeat(64), width: 1600, height: 800, fileSizeBytes: 888, mimeType: 'image/webp' },
    ],
    blindLabel: 'must-not-leak', imageObjectKey: 'bench/objects/private.png', packetHash: 'must-not-leak', reviewAttestation: 'must-not-leak', userId: 'must-not-leak',
  }]
  const signed: string[] = []
  const verified: string[] = []
  const repository = {
    async latestRelease() { return release }, async releaseByModel() { return release },
    async publicEvidenceForRelease(_releaseHash: string, query: any) {
      if (query.profileId) return { items: rawEvidence, nextCursor: null }
      assert.equal(query.caseId, PB_IMAGE_LIGHT_V1.cases[0].id)
      return { items: rawEvidence, nextCursor: null }
    },
    async submitPrompt() {}, async promptQueue() { return [] }, async savePromptDigest() {}, async decidePrompt() {},
    async candidates() { return [] }, async approve() {}, async control() {}, async exportReview() {}, async importReview() {}, async publish() {},
  }
  const service = createBenchmarkService({
    repository,
    signEvidence: async (key) => { signed.push(key); return `https://signed.example/${key}` },
    verifyEvidence: async (key, hash) => { verified.push(`${key}:${hash}`) },
  })

  const modelResponse = await service.handle({ action: 'benchmarkModelProfile', profileId: 'model-a:codex_single:epoch' }, false)
  assert.equal(modelResponse.code, 0)
  assert.equal(modelResponse.profile.evidence.length, 1)
  assert.deepEqual(Object.keys(modelResponse.profile.evidence[0]).sort(), [
    'actualOutputPixels', 'caseId', 'imageHash', 'modelId', 'profileId', 'reviewNotes', 'sampleId', 'scores', 'variants',
  ])
  assert.equal(modelResponse.profile.evidence[0].variants[0].url, `https://signed.example/${rawEvidence[0].variants[0].objectKey}`)
  assert.equal('objectKey' in modelResponse.profile.evidence[0].variants[0], false)

  const caseResponse = await service.handle({ action: 'benchmarkCaseEvidence', caseId: PB_IMAGE_LIGHT_V1.cases[0].id, limit: 12 }, false)
  assert.equal(caseResponse.code, 0)
  assert.equal(caseResponse.case.id, PB_IMAGE_LIGHT_V1.cases[0].id)
  assert.equal(caseResponse.items.length, 1)
  assert.equal(caseResponse.nextCursor, null)
  assert.equal(signed.length, 4)
  assert.equal(verified.length, 4)
})

test('prompt submissions validate text-only fields, require identity, and keep admin decisions separate from the suite', async () => {
  const calls: any[] = []
  const repository = {
    async latestRelease() { return null }, async releaseByModel() { return null }, async publicEvidenceForRelease() { return { items: [], nextCursor: null } },
    async submitPrompt(input: any) { calls.push(['submit', input]); return { submissionId: 'prompt-submission-1', status: 'pending' } },
    async promptQueue(input: any) { calls.push(['queue', input]); return [{ submissionId: 'prompt-submission-1', status: 'pending' }] },
    async savePromptDigest(input: any) { calls.push(['digest', input]); return { digestId: 'digest-1', status: 'candidate' } },
    async decidePrompt(input: any) { calls.push(['decision', input]); return { submissionId: 'prompt-submission-1', status: 'approved_for_next_suite' } },
    async candidates() { return [] }, async approve() {}, async control() {}, async exportReview() {}, async importReview() {}, async publish() {},
  }
  const service = createBenchmarkService({ repository, signEvidence: async () => 'signed' })
  const payload = {
    action: 'benchmarkPromptSubmission', userId: 'account-1', userEmail: 'Owner@Example.com', clientIp: '203.0.113.8',
    prompt: '  Draw a bilingual topology diagram.  ', capability: 'Bilingual topology', requiredElements: 'Chinese and English labels',
    forbiddenResults: 'garbled text', notes: 'Community proposal',
  }
  const response = await service.handle(payload, false)
  assert.deepEqual(response, { code: 0, submission: { submissionId: 'prompt-submission-1', status: 'pending' } })
  assert.equal(calls[0][1].prompt, 'Draw a bilingual topology diagram.')
  assert.equal(calls[0][1].userId, 'account-1')
  assert.equal('userEmail' in calls[0][1], false)
  await assert.rejects(() => service.handle({ ...payload, userId: '' }, false), /BENCHMARK_PROMPT_LOGIN_REQUIRED/)
  await assert.rejects(() => service.handle({ ...payload, prompt: 'https:\/\/example.com prompt' }, false), /BENCHMARK_PROMPT_INVALID/)
  await assert.rejects(() => service.handle({ ...payload, prompt: '<b>html</b>' }, false), /BENCHMARK_PROMPT_INVALID/)

  await assert.rejects(() => service.handle({ action: 'adminBenchmarkPromptQueue' }, false), /BENCHMARK_ADMIN_REQUIRED/)
  assert.equal((await service.handle({ action: 'adminBenchmarkPromptQueue', status: 'pending' }, true)).submissions.length, 1)
  assert.equal((await service.handle({ action: 'adminBenchmarkPromptDigest', digestId: 'digest-1', candidates: [] }, true)).digest.status, 'candidate')
  assert.equal((await service.handle({ action: 'adminBenchmarkPromptDecision', submissionId: 'prompt-submission-1', decision: 'approved_for_next_suite' }, true)).decision.status, 'approved_for_next_suite')
})

test('Mongo prompt submissions enforce daily account and IP limits and keep raw identity private', async () => {
  const inserted: any[] = []
  let accountCount = 0
  let ipCount = 0
  const promptCollection = {
    async countDocuments(query: any) { return query.userId ? accountCount : ipCount },
    async insertOne(document: any) { inserted.push(document); return { insertedId: document._id } },
    async findOne() { return null },
  }
  const emptyCollection = { async updateOne() { return { modifiedCount: 1 } }, async createIndex() {} }
  const collections: Record<string, any> = {
    paperbanana_benchmark_prompt_submissions: promptCollection,
    paperbanana_benchmark_prompt_digests: emptyCollection,
    paperbanana_benchmark_public_evidence: emptyCollection,
    paperbanana_benchmark_suites: emptyCollection,
    paperbanana_benchmark_models: emptyCollection,
    paperbanana_benchmark_runs: emptyCollection,
    paperbanana_benchmark_samples: emptyCollection,
    paperbanana_benchmark_judgments: emptyCollection,
    paperbanana_benchmark_dispatches: emptyCollection,
    paperbanana_benchmark_releases: emptyCollection,
  }
  const repository = createMongoBenchmarkRepository({ collection: (name: string) => collections[name] } as any, () => new Date('2026-08-30T09:00:00.000Z'))
  const input = {
    userId: 'account-1', clientIp: '203.0.113.8', prompt: 'Draw a bilingual topology diagram.', capability: 'Bilingual topology',
    requiredElements: 'Chinese and English labels', forbiddenResults: 'garbled text', notes: 'Community proposal',
  }
  const created = await repository.submitPrompt(input)
  assert.equal(created.status, 'pending')
  assert.match(created.submissionId, /^prompt-submission:/)
  assert.equal(inserted[0].userId, 'account-1')
  assert.equal(inserted[0].clientIp, '203.0.113.8')
  assert.equal(inserted[0].status, 'pending')
  assert.match(inserted[0].normalizedHash, /^[a-f0-9]{64}$/)
  assert.equal('userEmail' in inserted[0], false)

  accountCount = 5
  await assert.rejects(() => repository.submitPrompt(input), /BENCHMARK_PROMPT_RATE_LIMIT_ACCOUNT/)
  accountCount = 0
  ipCount = 20
  await assert.rejects(() => repository.submitPrompt(input), /BENCHMARK_PROMPT_RATE_LIMIT_IP/)
})

test('public evidence drafts bind completed renditions to accepted capped review scores without audit identity', () => {
  const sample = {
    sampleId: 'sample-1', caseId: PB_IMAGE_LIGHT_V1.cases[0].id, status: 'completed', imageHash: 'a'.repeat(64),
    actualOutputPixels: { width: 1200, height: 600, megapixels: 0.72, fileSizeBytes: 1000 },
    publicRenditions: [{ kind: 'thumbnail', objectKey: `bench/public/evidence/${'a'.repeat(64)}/w640.webp`, imageHash: 'b'.repeat(64), width: 640, height: 320, fileSizeBytes: 100, mimeType: 'image/webp' }],
  }
  const judgment = {
    sampleId: 'sample-1', accepted: true, scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 8])),
    confirmedRedLines: [{ code: 'garbled', axis: 'text_accuracy', cap: 4 }], evidence: ['Text is visibly garbled.'],
  }
  const draft = buildPublicEvidenceDraft('profile-1', 'model-1', [sample], [judgment])
  assert.equal(draft.length, 1)
  assert.equal(draft[0].scores.text_accuracy, 4)
  assert.equal(draft[0].scores.aesthetics, 8)
  assert.deepEqual(draft[0].reviewNotes, ['Text is visibly garbled.'])
  assert.deepEqual(Object.keys(draft[0]).sort(), ['actualOutputPixels', 'caseId', 'imageHash', 'modelId', 'profileId', 'reviewNotes', 'sampleId', 'scores', 'variants'])
})

test('historical verified and quick releases keep unranked public models and detached nested values', async () => {
  for (const profileStatus of ['verified', 'provisional']) {
    const source = storedRelease({
      _id: `historical-${profileStatus}`, profileStatus, lane: '2K-standard', evidence: [],
      models: [{
        modelId: 'legacy-model', sampleCount: 2, ranked: false,
        dimensions: { faithfulness: { mean: 7 } },
        alternateAccessProviders: ['legacy-provider'],
      }],
      methodology: { suiteId: 'legacy-suite', noOverallScore: true },
    })

    const release = await publicBenchmarkRelease(source, async () => 'signed')
    release.models[0].dimensions.faithfulness.mean = 1
    release.models[0].alternateAccessProviders.push('mutated')

    assert.equal(release.models.length, 1)
    assert.equal(release.models[0].overallScore, undefined)
    assert.equal(release.models[0].overallRank, undefined)
    assert.equal(release.models[0].dimensionRanks, undefined)
    assert.equal(release.sourceReleaseHash, undefined)
    assert.equal(release.rankingMethod, undefined)
    assert.deepEqual(release.methodology, { suiteId: 'legacy-suite', noOverallScore: true })
    assert.equal(source.models[0].dimensions.faithfulness.mean, 7)
    assert.deepEqual(source.models[0].alternateAccessProviders, ['legacy-provider'])
  }
})

test('benchmark methodology is null when no release exists', async () => {
  const service = createBenchmarkService({
    repository: {
      async latestRelease() { return null }, async releaseByModel() { return null }, async candidates() { return [] }, async approve() {}, async control() {},
      async exportReview() {}, async importReview() {}, async publish() {},
    },
    signEvidence: async () => 'signed',
  })
  assert.deepEqual(await service.handle({ action: 'benchmarkMethodology' }, false), { code: 0, methodology: null, releaseHash: '' })
})

test('Arena methodology publishes a detached reproducible PB_IMAGE_LIGHT_V1 suite and fixed scoring contract', async () => {
  const stored = storedRelease({
    _id: 'arena-methodology-release', profileStatus: 'published', evaluationMode: 'codex_single',
    suiteId: PB_IMAGE_LIGHT_V1.id, suiteHash: PB_IMAGE_LIGHT_V1.manifestHash, evidence: [], models: [],
    methodology: {
      suiteId: PB_IMAGE_LIGHT_V1.id, suiteHash: PB_IMAGE_LIGHT_V1.manifestHash, noOverallScore: true,
      evaluationMode: 'codex_single', evaluationEpoch: 'codex-single-2026-08-v1', reviewProtocol: 'codex-single-two-pass-v1',
      reviewerKind: 'codex', reviewerPasses: 2, automaticJudges: [], internalReviewLog: 'must not leak',
    },
  })
  const storedSnapshot = structuredClone(stored)
  const service = createBenchmarkService({
    repository: {
      async latestRelease() { return stored }, async releaseByModel() { return null }, async candidates() { return [] }, async approve() {}, async control() {},
      async exportReview() {}, async importReview() {}, async publish() {},
    },
    signEvidence: async () => 'signed',
  })
  const expectedSuite = {
    id: PB_IMAGE_LIGHT_V1.id,
    title: PB_IMAGE_LIGHT_V1.title,
    version: PB_IMAGE_LIGHT_V1.version,
    language: PB_IMAGE_LIGHT_V1.language,
    license: PB_IMAGE_LIGHT_V1.license,
    manifestHash: PB_IMAGE_LIGHT_V1.manifestHash,
    cases: PB_IMAGE_LIGHT_V1.cases.map((item) => ({
      id: item.id, category: item.category, title: item.title, caption: item.caption, aspectRatio: item.aspectRatio,
      renderPrompt: item.renderPrompt, negativePrompt: item.negativePrompt, requiredEntities: item.requiredEntities,
      requiredRelations: item.requiredRelations, requiredText: item.requiredText, forbidden: item.forbidden,
      rubric: item.rubric, license: item.license, manifestHash: item.manifestHash,
    })),
  }

  const response = await service.handle({ action: 'benchmarkMethodology' }, false)

  assert.equal(response.releaseHash, stored.releaseHash)
  assert.deepEqual(response.suite, expectedSuite)
  assert.equal(response.suite.cases.length, 4)
  assert.equal(response.suite.cases[0].renderPrompt, PB_IMAGE_LIGHT_V1.cases[0].renderPrompt)
  assert.equal(response.suite.cases[0].negativePrompt, PB_IMAGE_LIGHT_V1.cases[0].negativePrompt)
  assert.deepEqual(response.suite.cases[0].rubric, PB_IMAGE_LIGHT_V1.cases[0].rubric)
  assert.deepEqual(response.suite.cases[0].license, PB_IMAGE_LIGHT_V1.cases[0].license)
  assert.deepEqual(response.scoring, {
    scoreMin: 0,
    scoreMax: 10,
    minimumReviewedSamples: 3,
    maximumSamplesPerModel: 4,
    overallFormula: 'equal_weight_mean_v1',
    tieMethod: 'competition',
    redLinePolicy: 'confirmed_axis_cap',
  })
  assert.deepEqual(response.methodology, {
    suiteId: PB_IMAGE_LIGHT_V1.id,
    suiteHash: PB_IMAGE_LIGHT_V1.manifestHash,
    noOverallScore: false,
    evaluationMode: 'codex_single',
    evaluationEpoch: 'codex-single-2026-08-v1',
    reviewProtocol: 'codex-single-two-pass-v1',
    reviewerKind: 'codex',
    reviewerPasses: 2,
    automaticJudges: [],
    rankingMethod: {
      id: 'equal_weight_mean_v1', axes: BENCHMARK_AXES, weights: BENCHMARK_AXES.map(() => 1 / BENCHMARK_AXES.length), tieMethod: 'competition',
    },
  })
  assert.deepEqual(stored, storedSnapshot)

  const mutableSuite = response.suite as any
  mutableSuite.cases[0].rubric.faithfulness = 'mutated-score'
  mutableSuite.cases[0].requiredEntities.push('mutated')
  mutableSuite.cases[0].license.author = 'mutated'
  assert.notEqual(PB_IMAGE_LIGHT_V1.cases[0].rubric.faithfulness, 'mutated-score')
  assert.equal(PB_IMAGE_LIGHT_V1.cases[0].requiredEntities.includes('mutated'), false)
  assert.notEqual(PB_IMAGE_LIGHT_V1.cases[0].license.author, 'mutated')
  assert.deepEqual((await service.handle({ action: 'benchmarkMethodology' }, false)).suite, expectedSuite)
})

test('Arena methodology omits reproducible attachments when any stored suite identity differs from PB_IMAGE_LIGHT_V1', async () => {
  const matching = {
    suiteId: PB_IMAGE_LIGHT_V1.id,
    suiteHash: PB_IMAGE_LIGHT_V1.manifestHash,
    methodology: { suiteId: PB_IMAGE_LIGHT_V1.id, suiteHash: PB_IMAGE_LIGHT_V1.manifestHash, noOverallScore: true },
  }
  const mismatches = [
    { name: 'top-level suiteId', patch: { suiteId: 'other-suite' } },
    { name: 'top-level suiteHash', patch: { suiteHash: 'a'.repeat(64) } },
    { name: 'methodology suiteId', patch: { methodology: { ...matching.methodology, suiteId: 'other-suite' } } },
    { name: 'methodology suiteHash', patch: { methodology: { ...matching.methodology, suiteHash: 'b'.repeat(64) } } },
  ]

  for (const mismatch of mismatches) {
    const stored = storedRelease({
      _id: `arena-methodology-${mismatch.name}`, profileStatus: 'published', evaluationMode: 'codex_single', evidence: [], models: [],
      ...matching, ...mismatch.patch,
    })
    const storedSnapshot = structuredClone(stored)
    const service = createBenchmarkService({
      repository: {
        async latestRelease() { return stored }, async releaseByModel() { return null }, async candidates() { return [] }, async approve() {}, async control() {},
        async exportReview() {}, async importReview() {}, async publish() {},
      },
      signEvidence: async () => 'signed',
    })

    const response = await service.handle({ action: 'benchmarkMethodology' }, false)

    assert.equal(response.code, 0, mismatch.name)
    assert.equal(response.releaseHash, stored.releaseHash, mismatch.name)
    assert.equal(response.methodology.noOverallScore, true, mismatch.name)
    assert.equal('rankingMethod' in response.methodology, false, mismatch.name)
    assert.equal('suite' in response, false, mismatch.name)
    assert.equal('scoring' in response, false, mismatch.name)
    assert.deepEqual(stored, storedSnapshot, mismatch.name)
  }
})

test('benchmark methodology keeps historical releases shape-compatible and validates the hash before Arena suite derivation', async () => {
  const historical = storedRelease({
    _id: 'historical-methodology-release', profileStatus: 'verified', evaluationMode: 'quick', evidence: [], models: [],
    methodology: { suiteId: 'legacy-suite', noOverallScore: true },
  })
  const historicalService = createBenchmarkService({
    repository: {
      async latestRelease() { return historical }, async releaseByModel() { return null }, async candidates() { return [] }, async approve() {}, async control() {},
      async exportReview() {}, async importReview() {}, async publish() {},
    },
    signEvidence: async () => 'signed',
  })
  const historicalResponse = await historicalService.handle({ action: 'benchmarkMethodology' }, false)
  assert.deepEqual(historicalResponse, { code: 0, methodology: { suiteId: 'legacy-suite', noOverallScore: true }, releaseHash: historical.releaseHash })
  assert.equal('suite' in historicalResponse, false)
  assert.equal('scoring' in historicalResponse, false)

  const tampered = storedRelease({
    _id: 'tampered-methodology-release', profileStatus: 'published', evaluationMode: 'codex_single', evidence: [], models: [],
    methodology: { suiteId: PB_IMAGE_LIGHT_V1.id, noOverallScore: true },
  })
  tampered.methodology.suiteId = 'tampered-suite'
  const tamperedService = createBenchmarkService({
    repository: {
      async latestRelease() { return tampered }, async releaseByModel() { return null }, async candidates() { return [] }, async approve() {}, async control() {},
      async exportReview() {}, async importReview() {}, async publish() {},
    },
    signEvidence: async () => 'signed',
  })
  await assert.rejects(() => tamperedService.handle({ action: 'benchmarkMethodology' }, false), /BENCHMARK_RELEASE_HASH_MISMATCH/)
})

test('public actions read immutable releases while admin actions require authorization', async () => {
  const releases = [storedRelease({
    _id: 'release-1', profileStatus: 'verified', suiteId: 'suite', judgeEpoch: 'judge', lane: '2K-standard',
    publishedAt: new Date('2026-08-25T00:00:00Z'), models: [{ modelId: 'model-a', displayName: 'Model A', ranked: true, sampleCount: 3, dimensions: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, { mean: 8 }])) }], evidence: [],
    methodology: { suiteId: 'suite', aggregation: 'case-first-bootstrap', noOverallScore: true, internalQueue: 'hidden' },
  })]
  const repository = {
    async latestRelease(lane?: string) { if (lane !== undefined) assert.equal(lane, '2K-standard'); return releases[0] },
    async releaseByModel(modelId: string) { return modelId === 'model-a' ? releases[0] : null },
    async candidates() { return [{ candidateId: 'c1', state: 'detected' }] },
    async approve(input: unknown) { return input },
    async control(input: unknown) { return input },
    async exportReview() { return { packetHash: 'packet-1', samples: [{ imageObjectKey: 'bench/review/image.png', imageHash: 'image-hash' }] } },
    async importReview() { return { imported: 1 } },
    async publish() { return { releaseId: 'release-2' } },
  }
  const service = createBenchmarkService({ repository, signEvidence: async () => 'signed' })
  assert.equal((await service.handle({ action: 'benchmarkLeaderboard', lane: '2K-standard' }, false)).release.releaseHash, releases[0].releaseHash)
  assert.equal((await service.handle({ action: 'benchmarkModelProfile', modelId: 'model-a' }, false)).profile.modelId, 'model-a')
  const historicalLeaderboard = await service.handle({ action: 'benchmarkLeaderboard', lane: '2K-standard' }, false)
  assert.equal(historicalLeaderboard.release.models.length, 1)
  assert.equal(historicalLeaderboard.release.models[0].overallScore, undefined)
  assert.deepEqual((await service.handle({ action: 'benchmarkMethodology' }, false)).methodology, { suiteId: 'suite', aggregation: 'case-first-bootstrap', noOverallScore: true })
  await assert.rejects(() => service.handle({ action: 'adminBenchmarkCandidates' }, false), /BENCHMARK_ADMIN_REQUIRED/)
  assert.deepEqual((await service.handle({ action: 'adminBenchmarkCandidates' }, true)).candidates, [{ candidateId: 'c1', state: 'detected' }])
  const exported = await service.handle({ action: 'adminBenchmarkReviewExport' }, true)
  assert.equal(exported.packet.samples[0].imageUrl, 'signed')
  assert.equal(exported.packet.packetHash, 'packet-1')
})

test('leaderboard rejects unknown lanes instead of comparing incompatible releases', async () => {
  const service = createBenchmarkService({
    repository: {
      async latestRelease() { throw new Error('must not query') },
      async releaseByModel() { return null }, async candidates() { return [] }, async approve() {}, async control() {},
      async exportReview() {}, async importReview() {}, async publish() {},
    },
    signEvidence: async () => 'signed',
  })
  assert.deepEqual(await service.handle({ action: 'benchmarkLeaderboard', lane: '8K-standard' }, false), { code: 400, error: 'Invalid benchmark lane' })
})

function verifiedPublishDb(run: Record<string, any>, input: { suite?: Record<string, any>; candidate?: Record<string, any>; samples?: any[]; transactionalSamples?: any[]; judgments?: any[]; transactionalJudgments?: any[]; dispatches?: any[]; transactionalDispatches?: any[]; insertedReleases?: any[]; transactionState?: { active: boolean }; failRunCasAfterInsert?: boolean } = {}) {
  const storedRun = { ...run }
  const suite = input.suite
  const sampleRows = input.samples || []
  const judgmentRows = input.judgments || []
  const dispatchRows = input.dispatches || []
  let sampleReads = 0
  let judgmentReads = 0
  let dispatchReads = 0
  let transactionActive = false
  let stagedReleases: any[] = []
  let stagedWrites: Array<() => void> = []
  const requireTransactionSession = (options?: Record<string, any>) => {
    if (transactionActive && options?.session !== session) throw new Error('fake transaction read/write missing shared session')
  }
  const collections: Record<string, any> = {
    paperbanana_benchmark_runs: {
      async findOne(query: Record<string, any>, options?: Record<string, any>) {
        requireTransactionSession(options)
        if (query._id !== storedRun._id) return null
        if (query.state && query.state !== storedRun.state) return null
        return storedRun
      },
      async updateOne(_query: any, update: any, options?: Record<string, any>) {
        requireTransactionSession(options)
        if (input.failRunCasAfterInsert && stagedReleases.length) return { modifiedCount: 0 }
        stagedWrites.push(() => Object.assign(storedRun, update.$set || {}))
        return { modifiedCount: 1 }
      },
    },
    paperbanana_benchmark_suites: {
      async findOne(query: Record<string, any>, options?: Record<string, any>) { requireTransactionSession(options); return query._id === suite?._id ? suite : null },
      async updateOne(_query: any, _update: any, options?: Record<string, any>) { requireTransactionSession(options); stagedWrites.push(() => {}); return { modifiedCount: 1 } },
    },
    paperbanana_benchmark_samples: {
      find(_query?: any, options?: Record<string, any>) {
        requireTransactionSession(options)
        const rows = sampleReads++ === 0 || !input.transactionalSamples ? sampleRows : input.transactionalSamples
        return { async toArray() { return rows } }
      },
      async findOne() { return null },
    },
    paperbanana_benchmark_judgments: {
      find(_query?: any, options?: Record<string, any>) {
        requireTransactionSession(options)
        const rows = judgmentReads++ === 0 || !input.transactionalJudgments ? judgmentRows : input.transactionalJudgments
        return { async toArray() { return rows } }
      },
      async findOne() { return null },
    },
    paperbanana_benchmark_dispatches: {
      find(_query?: any, options?: Record<string, any>) {
        requireTransactionSession(options)
        const rows = dispatchReads++ === 0 || !input.transactionalDispatches ? dispatchRows : input.transactionalDispatches
        return { async toArray() { return rows } }
      },
    },
    paperbanana_benchmark_releases: {
      find() { return { sort() { return this }, limit() { return this }, async next() { return null } } },
      async findOne() { return null },
      async insertOne(release: any, options?: Record<string, any>) { requireTransactionSession(options); stagedReleases.push(release) },
    },
    paperbanana_benchmark_models: {
      async findOne(query: Record<string, any>, options?: Record<string, any>) {
        requireTransactionSession(options)
        const candidate = input.candidate || {
          _id: storedRun.modelCandidateId, provider: storedRun.provider, modelId: storedRun.modelId, developer: storedRun.developer || '',
          lane: storedRun.lane, aspectRatios: storedRun.aspectRatios, registryHash: storedRun.registryHash, state: 'approved',
        }
        return query._id === candidate._id ? candidate : null
      },
    },
  }
  const session = {
    async withTransaction(work: () => Promise<void>) {
      transactionActive = true
      stagedReleases = []
      stagedWrites = []
      if (input.transactionState) input.transactionState.active = true
      try {
        await work()
        stagedWrites.forEach((commit) => commit())
        input.insertedReleases?.push(...stagedReleases)
      } finally {
        stagedReleases = []
        stagedWrites = []
        transactionActive = false
        if (input.transactionState) input.transactionState.active = false
      }
    },
    async endSession() {},
  }
  return {
    collection(name: string) { return collections[name] },
    client: { startSession() { return session } },
  }
}

function testPhaseSourceManifest(runId: string, runHash: string, phase: 'quick' | 'full', samples: any[], automatic: any[], dispatchMarkers: any[]) {
  const facts = {
    schemaVersion: 2, runId, runHash, phase,
    usage: { generationCalls: samples.length, logicalJudgments: automatic.length, judgeDispatchCalls: dispatchMarkers.length },
    samples: [...samples].sort((left, right) => left.sampleId.localeCompare(right.sampleId)).map((sample) => ({
      sampleId: sample.sampleId, runId: sample.runId, phase: sample.phase, caseId: sample.caseId, repetition: sample.repetition,
      status: sample.status, imageHash: sample.imageHash, imageObjectKey: sample.imageObjectKey, latencyMs: sample.latencyMs,
      rubric: sample.rubric, rubricHash: sample.rubricHash, auditRequired: sample.auditRequired === true, publicEvidence: sample.publicEvidence === true,
    })),
    automaticJudgments: [...automatic].sort((left, right) => `${left.sampleId}:${left.provider}`.localeCompare(`${right.sampleId}:${right.provider}`)).map((judgment) => ({
      runId: judgment.runId, sampleId: judgment.sampleId, phase: judgment.phase, provider: judgment.provider,
      judgeEpoch: judgment.judgeEpoch, status: judgment.status, scores: judgment.scores, evidence: judgment.evidence,
      redLines: judgment.redLines, confidence: judgment.confidence,
    })),
    judgeDispatchMarkers: [...dispatchMarkers].sort((left, right) => `${left.sampleId}:${left.logicalProvider}:${left.dispatchIndex}`.localeCompare(`${right.sampleId}:${right.logicalProvider}:${right.dispatchIndex}`)).map((marker) => ({
      _id: marker._id, runId: marker.runId, sampleId: marker.sampleId, phase: marker.phase,
      logicalProvider: marker.logicalProvider, dispatchIndex: marker.dispatchIndex,
      judgeEpoch: marker.judgeEpoch,
    })),
  }
  return { facts, hash: canonicalHash(facts) }
}

function verifiedFixture(options: { aspectRatios?: string[]; dispatchAttempts?: number; maxJudgeCalls?: number; maxEstimatedUsd?: number } = {}) {
  const runId = 'run-full'
  const reviewerEpoch = 'reviewer-epoch'
  const aspectRatios = options.aspectRatios ?? ['16:9', '4:3', '3:4', '1:1', '21:9']
  const candidate = {
    _id: 'ark:model', candidateId: 'ark:model', provider: 'ark', providerLabel: 'Volcengine Ark', modelId: 'model',
    displayName: 'Current Model', developer: 'Current Maker', lane: '2K-standard', aspectRatios, registryHash: 'registry-hash', state: 'approved',
  }
  const createdAt = new Date('2026-08-25T07:00:00.000Z')
  const runFacts = {
    runId, modelCandidateId: candidate._id, provider: candidate.provider, modelId: candidate.modelId, developer: candidate.developer,
    lane: candidate.lane, aspectRatios: [...aspectRatios].sort(), suiteId: PB_IMAGE_DIAGNOSTIC_V1.id,
    suiteHash: PB_IMAGE_DIAGNOSTIC_V1.manifestHash, judgeEpoch: 'judge-epoch', reviewerEpoch,
    registryHash: candidate.registryHash, codeSha: 'a'.repeat(40), createdAt,
  }
  const runHash = canonicalHash(runFacts)
  const candidateSnapshot = {
    schemaVersion: 1, candidateId: candidate._id, provider: candidate.provider, modelId: candidate.modelId,
    developer: candidate.developer, lane: candidate.lane, aspectRatios: [...aspectRatios].sort(), registryHash: candidate.registryHash,
    displayName: candidate.displayName, providerLabel: candidate.providerLabel,
  }
  const quickPriceSnapshot = { currency: 'USD', source: 'https://example.com/pricing/image-model', estimatedPerGeneration: 1, estimatedPerJudgeCall: 0.1, capturedAt: '2026-08-25T06:00:00.000Z' }
  const fullPriceSnapshot = { currency: 'USD', source: 'https://example.com/pricing/image-model', estimatedPerGeneration: 1, estimatedPerJudgeCall: 0.1, capturedAt: '2026-08-25T07:00:00.000Z' }
  const quickApproval = { entitlementConfirmed: true, priceSnapshot: quickPriceSnapshot, maxGenerations: 24, maxJudgments: 48, maxJudgeCalls: 192, maxEstimatedUsd: 100, approvedBy: 'admin-123', approvedAt: new Date('2026-08-25T06:00:00.000Z') }
  const fullApproval = { entitlementConfirmed: true, priceSnapshot: fullPriceSnapshot, maxGenerations: 144, maxJudgments: 288, maxJudgeCalls: options.maxJudgeCalls ?? 1152, maxEstimatedUsd: options.maxEstimatedUsd ?? 500, approvedBy: 'admin-123', approvedAt: new Date('2026-08-25T07:00:00.000Z') }
  const approvalVersions = [
    { schemaVersion: 1, phase: 'quick', authorizationHash: canonicalHash({ phase: 'quick', approval: quickApproval, codeSha: runFacts.codeSha }), priceHash: canonicalHash(quickPriceSnapshot), approval: quickApproval },
    { schemaVersion: 1, phase: 'full', authorizationHash: canonicalHash({ phase: 'full', approval: fullApproval, codeSha: runFacts.codeSha }), priceHash: canonicalHash(fullPriceSnapshot), approval: fullApproval },
  ]
  const runIntegrityAttestation = createHmac('sha256', reviewSigningSecret).update(canonicalHash({ schemaVersion: 2, runHash, runFacts, candidateSnapshot, approvalVersions })).digest('hex')
  const expectedCases = PB_IMAGE_DIAGNOSTIC_V1.cases.filter((diagnosticCase) => diagnosticCase.aspectRatio === 'auto' || aspectRatios.includes(diagnosticCase.aspectRatio))
  const unsupportedCases = PB_IMAGE_DIAGNOSTIC_V1.cases.filter((diagnosticCase) => diagnosticCase.aspectRatio !== 'auto' && !aspectRatios.includes(diagnosticCase.aspectRatio))
  const capabilityGaps = unsupportedCases.map((diagnosticCase) => `case=${diagnosticCase.id};aspectRatio=${diagnosticCase.aspectRatio}`)
  const samples = expectedCases.flatMap((diagnosticCase) => Array.from({ length: 3 }, (_, repetition) => {
    const imageHash = canonicalHash(`image:${diagnosticCase.id}:${repetition}`)
    return {
      _id: benchmarkSampleId(runId, 'full', diagnosticCase.id, repetition),
      sampleId: benchmarkSampleId(runId, 'full', diagnosticCase.id, repetition),
      runId, phase: 'full', caseId: diagnosticCase.id, repetition, status: 'completed',
      imageHash, imageObjectKey: `bench/objects/${imageHash}.png`,
      latencyMs: 1_000 + repetition,
      rubric: diagnosticCase.rubric, rubricHash: canonicalHash(diagnosticCase.rubric),
      auditRequired: false,
    }
  }))
  const automatic = samples.flatMap((sample) => ['openrouter', 'bailian'].map((provider) => ({
    _id: `${provider}:${sample.sampleId}:judge-epoch`, runId, sampleId: sample.sampleId, phase: 'full', provider,
    judgeEpoch: 'judge-epoch', status: 'completed',
    scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 6])),
    evidence: ['ok'], redLines: [], confidence: 1,
  })))
  const dispatchMarkers = automatic.flatMap((judgment) => Array.from({ length: options.dispatchAttempts ?? 1 }, (_, dispatchIndex) => ({
    _id: `dispatch:${judgment.provider}:${judgment.sampleId}:${dispatchIndex}`, runId, sampleId: judgment.sampleId, phase: 'full',
    logicalProvider: judgment.provider, dispatchIndex, judgeEpoch: 'judge-epoch',
  })))
  const expectedAuditIds = buildAuditSelection(samples.map((sample) => {
    const pair = automatic.filter((judgment) => judgment.sampleId === sample.sampleId)
    return {
      sampleId: sample.sampleId,
      disagreement: Math.max(...BENCHMARK_AXES.map((axis) => Math.abs(pair[0].scores[axis] - pair[1].scores[axis]))),
      redLineConflict: false,
      anomalous: false,
      publicEvidence: (sample as any).publicEvidence === true,
    }
  }), runHash)
  const expectedAuditSet = new Set(expectedAuditIds)
  samples.forEach((sample) => { sample.auditRequired = expectedAuditSet.has(sample.sampleId) })
  const auditSamples = samples.filter((sample) => sample.auditRequired)
  const sourceManifest = testPhaseSourceManifest(runId, runHash, 'full', samples, automatic, dispatchMarkers)
  const sourceManifestAttestation = createHmac('sha256', reviewSigningSecret)
    .update(canonicalHash({ runHash, runFacts, sourceManifestHash: sourceManifest.hash })).digest('hex')
  const reviewPacket = createCodexReviewPacket({
    reviewerEpoch, runHash, phase: 'full', issuedAt: '2026-08-25T08:00:00.000Z', expiresAt: '2026-08-26T08:00:00.000Z',
    signingSecret: reviewSigningSecret, sourceManifestHash: sourceManifest.hash, sourceManifestAttestation,
    samples: auditSamples.map((sample) => ({ sampleId: sample.sampleId, imageObjectKey: sample.imageObjectKey, imageHash: sample.imageHash, rubric: sample.rubric, rubricHash: sample.rubricHash })),
  })
  const review = {
    packetHash: reviewPacket.packetHash,
    reviewerEpoch,
    judgments: reviewPacket.samples.map((packetSample) => ({
      blindLabel: packetSample.blindLabel,
      imageHash: packetSample.imageHash,
      rubricHash: packetSample.rubricHash,
      scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 10])),
      confirmedRedLines: [], evidence: ['reviewed'], confidence: 1,
    })),
  }
  const imported = importCodexReview(reviewPacket, review, {
    signingSecret: reviewSigningSecret, expectedPhase: 'full', now: new Date('2026-08-25T10:00:00.000Z'),
  })
  const importedReviewHash = imported.reviewHash
  const codex = imported.map((judgment) => ({
    _id: `codex:${judgment.sampleId}`, runId, phase: 'full', ...judgment, source: 'codex', reviewerEpoch,
    packetHash: reviewPacket.packetHash, reviewHash: importedReviewHash, reviewAttestation: imported.attestation, accepted: true,
  }))
  const run = {
    _id: runId, state: 'codex_audit', provider: 'ark', modelId: 'model', developer: candidate.developer, lane: '2K-standard',
    aspectRatios,
    suiteId: PB_IMAGE_DIAGNOSTIC_V1.id, suiteHash: PB_IMAGE_DIAGNOSTIC_V1.manifestHash, judgeEpoch: 'judge-epoch', reviewerEpoch,
    registryHash: 'registry-hash', priceHash: approvalVersions[1].priceHash, authorizationHash: approvalVersions[1].authorizationHash,
    approval: fullApproval, approvalVersions, candidateSnapshot, codeSha: 'a'.repeat(40), createdAt, runFacts, runHash, runIntegrityAttestation,
    modelCandidateId: candidate._id,
    codexAuditImportedAt: new Date(), sampleCount: samples.length, auditRatio: auditSamples.length / samples.length, usage: { estimatedUsd: 1 }, capabilityGaps,
    reviewPacket, importedReviewPacketHash: reviewPacket.packetHash, importedReviewHash, importedReviewAttestation: imported.attestation,
    releaseDraft: { models: [{ sampleCount: samples.length, coverage: 1, capabilityCoverage: expectedCases.length / 48, profileStatus: 'verified', dimensions: {}, capabilityGaps }], evidence: [], methodology: {} },
  }
  return { run, candidate, suite: { ...PB_IMAGE_DIAGNOSTIC_V1, _id: PB_IMAGE_DIAGNOSTIC_V1.id }, expectedCases, unsupportedCases, capabilityGaps, samples, automatic, dispatchMarkers, codex, expectedAuditIds }
}

function quickFixture(options: { aspectRatios?: string[]; dispatchAttempts?: number; maxJudgeCalls?: number; maxEstimatedUsd?: number } = {}) {
  const base = verifiedFixture({ aspectRatios: options.aspectRatios })
  const runId = base.run._id
  const aspectRatios = options.aspectRatios ?? base.run.aspectRatios
  const quickCases = PB_IMAGE_DIAGNOSTIC_V1.quickCaseIds.map((id) => PB_IMAGE_DIAGNOSTIC_V1.cases.find((item) => item.id === id)!)
  const executableCases = quickCases.filter((item) => item.aspectRatio === 'auto' || aspectRatios.includes(item.aspectRatio))
  const capabilityGaps = quickCases.filter((item) => !executableCases.includes(item)).map((item) => `case=${item.id};aspectRatio=${item.aspectRatio}`)
  const samples = executableCases.flatMap((diagnosticCase) => Array.from({ length: 2 }, (_, repetition) => {
    const imageHash = canonicalHash(`quick:${diagnosticCase.id}:${repetition}`)
    const sampleId = benchmarkSampleId(runId, 'quick', diagnosticCase.id, repetition)
    return { _id: sampleId, sampleId, runId, phase: 'quick', caseId: diagnosticCase.id, repetition, status: 'completed',
      imageHash, imageObjectKey: `bench/objects/${imageHash}.png`, latencyMs: 500 + repetition,
      rubric: diagnosticCase.rubric, rubricHash: canonicalHash(diagnosticCase.rubric), auditRequired: false }
  }))
  const automatic = samples.flatMap((sample) => ['openrouter', 'bailian'].map((provider) => ({
    _id: `${provider}:${sample.sampleId}:judge-epoch`, runId, sampleId: sample.sampleId, phase: 'quick', provider,
    judgeEpoch: 'judge-epoch', status: 'completed', scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 6])),
    evidence: ['ok'], redLines: [], confidence: 1,
  })))
  const dispatchMarkers = automatic.flatMap((judgment) => Array.from({ length: options.dispatchAttempts ?? 1 }, (_, dispatchIndex) => ({
    _id: `dispatch:${judgment.provider}:${judgment.sampleId}:${dispatchIndex}`, runId, sampleId: judgment.sampleId, phase: 'quick',
    logicalProvider: judgment.provider, dispatchIndex, judgeEpoch: 'judge-epoch',
  })))
  const expectedAuditIds = buildAuditSelection(samples.map((sample) => ({
    sampleId: sample.sampleId, disagreement: 0, redLineConflict: false, anomalous: false, publicEvidence: false,
  })), base.run.runHash)
  const expectedAuditSet = new Set(expectedAuditIds)
  samples.forEach((sample) => { sample.auditRequired = expectedAuditSet.has(sample.sampleId) })
  const quickApproval = {
    ...base.run.approvalVersions[0].approval,
    maxJudgeCalls: options.maxJudgeCalls ?? 192,
    maxEstimatedUsd: options.maxEstimatedUsd ?? 100,
  }
  const approvalVersion = { schemaVersion: 1, phase: 'quick', authorizationHash: canonicalHash({ phase: 'quick', approval: quickApproval, codeSha: base.run.codeSha }), priceHash: canonicalHash(quickApproval.priceSnapshot), approval: quickApproval }
  const approvalVersions = [approvalVersion]
  const runIntegrityAttestation = createHmac('sha256', reviewSigningSecret).update(canonicalHash({ schemaVersion: 2, runHash: base.run.runHash, runFacts: base.run.runFacts, candidateSnapshot: base.run.candidateSnapshot, approvalVersions })).digest('hex')
  const sourceManifest = testPhaseSourceManifest(runId, base.run.runHash, 'quick', samples, automatic, dispatchMarkers)
  const sourceManifestAttestation = createHmac('sha256', reviewSigningSecret)
    .update(canonicalHash({ runHash: base.run.runHash, runFacts: base.run.runFacts, sourceManifestHash: sourceManifest.hash })).digest('hex')
  const auditSamples = samples.filter((sample) => sample.auditRequired)
  const reviewPacket = createCodexReviewPacket({
    reviewerEpoch: base.run.reviewerEpoch, runHash: base.run.runHash, phase: 'quick', issuedAt: '2026-08-25T08:00:00.000Z', expiresAt: '2026-08-26T08:00:00.000Z',
    signingSecret: reviewSigningSecret, sourceManifestHash: sourceManifest.hash, sourceManifestAttestation,
    samples: auditSamples.map((sample) => ({ sampleId: sample.sampleId, imageObjectKey: sample.imageObjectKey, imageHash: sample.imageHash, rubric: sample.rubric, rubricHash: sample.rubricHash })),
  })
  const review = { packetHash: reviewPacket.packetHash, reviewerEpoch: base.run.reviewerEpoch, judgments: reviewPacket.samples.map((item) => ({
    blindLabel: item.blindLabel, imageHash: item.imageHash, rubricHash: item.rubricHash,
    scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 7])), confirmedRedLines: [], evidence: ['reviewed'], confidence: 1,
  })) }
  const imported = importCodexReview(reviewPacket, review, { signingSecret: reviewSigningSecret, expectedPhase: 'quick', now: new Date('2026-08-25T10:00:00.000Z') })
  const codex = imported.map((judgment) => ({ _id: `codex:${judgment.sampleId}`, runId, phase: 'quick', ...judgment, source: 'codex',
    reviewerEpoch: base.run.reviewerEpoch, packetHash: reviewPacket.packetHash, reviewHash: imported.reviewHash,
    reviewAttestation: imported.attestation, accepted: true }))
  const run = { ...base.run, state: 'quick_review', aspectRatios, capabilityGaps, approval: quickApproval, approvalVersions,
    authorizationHash: approvalVersion.authorizationHash, priceHash: approvalVersion.priceHash, runIntegrityAttestation,
    reviewPacket, reviewPacketExpiresAt: new Date('2026-08-26T08:00:00.000Z'), importedReviewPacketHash: reviewPacket.packetHash,
    importedReviewHash: imported.reviewHash, importedReviewAttestation: imported.attestation, quickAuditImportedAt: new Date(),
    codexAuditImportedAt: undefined, usage: { estimatedUsd: 0 }, usageByPhase: { quick: { estimatedUsd: 0 } } }
  return { ...base, run, samples, automatic, dispatchMarkers, codex, review, expectedAuditIds, capabilityGaps, executableCases }
}

function standardFixture() {
  const runId = 'bench-run-1234567890abcdef1234'
  const createdAt = new Date('2026-08-28T00:00:00.000Z')
  const reviewerEpoch = 'codex-single-2026-08-v1'
  const candidate = { _id: 'ark:standard-model', provider: 'ark', modelId: 'standard-model', developer: 'Maker', lane: '2K-standard', aspectRatios: ['1:1'], registryHash: 'registry-hash', displayName: 'Standard Model', providerLabel: '火山方舟' }
  const runFacts = {
    runId, modelCandidateId: candidate._id, provider: candidate.provider, modelId: candidate.modelId, developer: candidate.developer,
    lane: candidate.lane, aspectRatios: [...candidate.aspectRatios], suiteId: PB_IMAGE_LIGHT_V1.id, suiteHash: PB_IMAGE_LIGHT_V1.manifestHash,
    judgeEpoch: 'judge-none-codex-single-v1', reviewerEpoch, evaluationMode: 'codex_single', evaluationEpoch: reviewerEpoch,
    reviewProtocol: 'codex-single-two-pass-v1', canonicalModelId: 'maker/standard-model', primaryAccessProvider: 'ark',
    alternateAccessProviders: ['openrouter'], registryHash: candidate.registryHash, codeSha: 'a'.repeat(40), createdAt,
  }
  const runHash = canonicalHash(runFacts)
  const candidateSnapshot = { schemaVersion: 1, candidateId: candidate._id, provider: candidate.provider, modelId: candidate.modelId,
    developer: candidate.developer, lane: candidate.lane, aspectRatios: candidate.aspectRatios, registryHash: candidate.registryHash,
    displayName: candidate.displayName, providerLabel: candidate.providerLabel }
  const priceSnapshot = { currency: 'USD', source: 'https://example.com/pricing/standard-model', estimatedPerGeneration: 0.25, estimatedPerJudgeCall: 0, capturedAt: '2026-08-28T00:00:00.000Z' }
  const approval = { entitlementConfirmed: true, priceSnapshot, maxGenerations: 4, maxJudgments: 0, maxJudgeCalls: 0, maxEstimatedUsd: 1, approvedBy: 'admin-123', approvedAt: createdAt }
  const approvalVersion = { schemaVersion: 1, phase: 'standard', authorizationHash: canonicalHash({ phase: 'standard', approval, codeSha: runFacts.codeSha }), priceHash: canonicalHash(priceSnapshot), approval }
  const approvalVersions = [approvalVersion]
  const runIntegrityAttestation = createHmac('sha256', reviewSigningSecret).update(canonicalHash({ schemaVersion: 2, runHash, runFacts, candidateSnapshot, approvalVersions })).digest('hex')
  const samples = PB_IMAGE_LIGHT_V1.cases.map((diagnosticCase, index) => {
    const sampleId = benchmarkSampleId(runId, 'standard', diagnosticCase.id, 0)
    const imageHash = canonicalHash(`standard-image:${diagnosticCase.id}`)
    const caseRequirements = { caption: diagnosticCase.caption, requiredEntities: diagnosticCase.requiredEntities || [], requiredRelations: diagnosticCase.requiredRelations || [], requiredText: diagnosticCase.requiredText || [], forbidden: diagnosticCase.forbidden || [], aspectRatio: diagnosticCase.aspectRatio, caseManifestHash: diagnosticCase.manifestHash }
    return { _id: sampleId, sampleId, runId, phase: 'standard', caseId: diagnosticCase.id, repetition: 0, status: 'completed', imageHash,
      imageObjectKey: `bench/objects/${imageHash}.png`, latencyMs: 1_000 + index, rubric: diagnosticCase.rubric,
      rubricHash: canonicalHash(diagnosticCase.rubric), caseRequirements, requirementsHash: canonicalHash(caseRequirements),
      actualOutputPixels: { width: 2048, height: 2048, megapixels: 4.1943, fileSizeBytes: 4_096 }, auditRequired: true }
  })
  const sourceManifest = buildStandardReviewSourceManifest({ _id: runId, runHash }, samples, [], [])
  const sourceManifestAttestation = createHmac('sha256', reviewSigningSecret).update(canonicalHash({ runHash, runFacts, sourceManifestHash: sourceManifest.hash })).digest('hex')
  const reviewPacket = createCodexReviewPacket({ reviewerEpoch, runHash, phase: 'standard', reviewProtocol: 'codex-single-two-pass-v1',
    issuedAt: '2026-08-28T01:00:00.000Z', expiresAt: '2026-08-29T01:00:00.000Z', signingSecret: reviewSigningSecret,
    sourceManifestHash: sourceManifest.hash, sourceManifestAttestation,
    samples: samples.map((sample) => ({ sampleId: sample.sampleId, imageObjectKey: sample.imageObjectKey, imageHash: sample.imageHash,
      rubric: sample.rubric, rubricHash: sample.rubricHash, caseRequirements: sample.caseRequirements, requirementsHash: sample.requirementsHash })) })
  const review = { packetHash: reviewPacket.packetHash, reviewerEpoch, judgments: reviewPacket.samples.map((sample) => ({ blindLabel: sample.blindLabel,
    imageHash: sample.imageHash, rubricHash: sample.rubricHash, scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 8])),
    confirmedRedLines: [], evidence: ['visible'], confidence: 1, consistencyReviewed: true })) }
  const imported = importCodexReview(reviewPacket, review, { signingSecret: reviewSigningSecret, expectedPhase: 'standard', now: new Date('2026-08-28T02:00:00.000Z') })
  const codex = imported.map((judgment) => ({ _id: `codex:${judgment.sampleId}`, runId, phase: 'standard', ...judgment, source: 'codex', reviewerEpoch,
    packetHash: reviewPacket.packetHash, reviewHash: imported.reviewHash, reviewAttestation: imported.attestation, accepted: true }))
  const run = { _id: runId, state: 'codex_review', ...runFacts, modelCandidateId: candidate._id, reviewerKind: 'codex', reviewerPasses: 2,
    judgeStackHash: canonicalHash({ evaluationMode: 'codex_single', automaticJudges: [] }), priceHash: approvalVersion.priceHash,
    authorizationHash: approvalVersion.authorizationHash, approval, approvalVersions, candidateSnapshot, runFacts, runHash, runIntegrityAttestation,
    standardReviewImportedAt: new Date('2026-08-28T02:00:00.000Z'), reviewPacket, importedReviewPacketHash: reviewPacket.packetHash,
    importedReviewHash: imported.reviewHash, importedReviewAttestation: imported.attestation }
  return { run, candidate, suite: { ...PB_IMAGE_LIGHT_V1, _id: PB_IMAGE_LIGHT_V1.id }, samples, codex }
}

test('Standard publication rebuilds a zero-Judge published profile and isolates its evaluation partition', async () => {
  const fixture = standardFixture()
  const inserted: any[] = []
  const verificationTimeouts: number[] = []
  const repository = createMongoBenchmarkRepository(verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples, judgments: fixture.codex, dispatches: [], insertedReleases: inserted }) as any, () => new Date('2026-08-28T03:00:00.000Z'), async (_objectKey, _imageHash, options) => {
    verificationTimeouts.push(options?.timeoutMs || 0)
  })
  const result = await repository.publish({ runId: fixture.run._id, profileStatus: 'published', evidence: [] } as any)
  assert.equal(result.profileStatus, 'published')
  assert.equal(inserted.length, 1)
  assert.equal(inserted[0].evaluationMode, 'codex_single')
  assert.equal(inserted[0].methodology.reviewProtocol, 'codex-single-two-pass-v1')
  assert.deepEqual(inserted[0].methodology.automaticJudges, [])
  assert.deepEqual(inserted[0].models[0].estimatedCost, { usd: 1, generationCalls: 4, automaticJudgeCalls: 0, logicalJudgments: 0, judgeDispatchCalls: 0 })
  assert.equal(inserted[0].models[0].ranked, true)
  assert.equal(verificationTimeouts.length, 4)
  assert.ok(verificationTimeouts.every((timeoutMs) => timeoutMs > 100_000), 'Standard evidence verification must allow bounded public-OSS reads longer than 30 seconds')
})

test('verified publication fails closed when DB has no phase-pure 48x3 full samples and 288 automatic judgments', async () => {
  const run = {
    _id: 'run-full', state: 'codex_audit', provider: 'ark', modelId: 'model', lane: '2K-standard',
    suiteId: 'pb-image-diagnostic-v1', suiteHash: 'suite-hash', judgeEpoch: 'judge-epoch', reviewerEpoch: 'reviewer-epoch',
    registryHash: 'registry-hash', priceHash: 'price-hash', codeSha: 'a'.repeat(40), runHash: 'run-hash',
    codexAuditImportedAt: new Date(), sampleCount: 144, auditRatio: 0.1, usage: { estimatedUsd: 1 },
    reviewPacket: { packetHash: 'packet-hash' }, importedReviewPacketHash: 'packet-hash', importedReviewHash: 'review-hash',
    releaseDraft: { models: [{ sampleCount: 144, coverage: 1, profileStatus: 'verified', dimensions: {} }], evidence: [], methodology: {} },
  }
  const repository = createMongoBenchmarkRepository(verifiedPublishDb(run) as any)
  await assert.rejects(
    () => repository.publish({ runId: run._id, profileStatus: 'verified', evidence: [] } as any),
    /BENCHMARK_VERIFIED_INTEGRITY_FAILED/,
  )
})

test('quick review import fails closed for a legacy packet without a signed phase source manifest', async () => {
  const reviewerEpoch = 'reviewer-epoch'
  const rubric = { aesthetics: 'visible quality' }
  const createdAt = new Date('2026-08-25T07:00:00.000Z')
  const runFacts = {
    runId: 'attested-run', modelCandidateId: 'ark:model', provider: 'ark', modelId: 'model', developer: 'Maker', lane: '2K-standard',
    aspectRatios: ['16:9'], suiteId: PB_IMAGE_DIAGNOSTIC_V1.id, suiteHash: PB_IMAGE_DIAGNOSTIC_V1.manifestHash,
    judgeEpoch: 'judge-epoch', reviewerEpoch, registryHash: 'registry-hash', codeSha: 'a'.repeat(40), createdAt,
  }
  const runHash = canonicalHash(runFacts)
  const packet = createCodexReviewPacket({
    reviewerEpoch, runHash, phase: 'quick',
    issuedAt: '2026-08-25T08:00:00.000Z', expiresAt: '2026-08-26T08:00:00.000Z', signingSecret: reviewSigningSecret,
    samples: [{ sampleId: 'sample-1', imageObjectKey: 'bench/objects/image.png', imageHash: canonicalHash('image'), rubric, rubricHash: canonicalHash(rubric) }],
  })
  const review = {
    packetHash: packet.packetHash, reviewerEpoch,
    judgments: [{ blindLabel: 'sample-001', imageHash: packet.samples[0].imageHash, rubricHash: packet.samples[0].rubricHash,
      scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 7])), confirmedRedLines: [], evidence: ['visible'], confidence: 1 }],
  }
  const run: any = {
    _id: 'attested-run', state: 'quick_review', reviewerEpoch, runHash, runFacts, reviewPacket: packet,
    modelCandidateId: 'ark:model', provider: 'ark', modelId: 'model', developer: 'Maker', lane: '2K-standard', aspectRatios: ['16:9'],
    suiteId: PB_IMAGE_DIAGNOSTIC_V1.id, suiteHash: PB_IMAGE_DIAGNOSTIC_V1.manifestHash, judgeEpoch: 'judge-epoch', registryHash: 'registry-hash', codeSha: 'a'.repeat(40), createdAt,
    candidateSnapshot: { schemaVersion: 1, candidateId: 'ark:model', provider: 'ark', modelId: 'model', developer: 'Maker', lane: '2K-standard', aspectRatios: ['16:9'], registryHash: 'registry-hash', displayName: 'model', providerLabel: 'ark' },
    approvalVersions: [],
    reviewPacketExpiresAt: new Date('2026-08-26T08:00:00.000Z'), releaseDraft: { models: [{}] },
  }
  const quickApproval = { entitlementConfirmed: true,
    priceSnapshot: { currency: 'USD', estimatedPerGeneration: 1, estimatedPerJudgeCall: 0.1, source: 'https://example.com/pricing/image-model', capturedAt: '2026-08-25T07:00:00.000Z' },
    maxGenerations: 24, maxJudgments: 48, maxJudgeCalls: 192, maxEstimatedUsd: 100, approvedBy: 'admin-123', approvedAt: createdAt }
  run.approvalVersions = [{ schemaVersion: 1, phase: 'quick', authorizationHash: canonicalHash({ phase: 'quick', approval: quickApproval, codeSha: run.codeSha }), priceHash: canonicalHash(quickApproval.priceSnapshot), approval: quickApproval }]
  run.runIntegrityAttestation = createHmac('sha256', reviewSigningSecret).update(canonicalHash({ schemaVersion: 2, runHash, runFacts, candidateSnapshot: run.candidateSnapshot, approvalVersions: run.approvalVersions })).digest('hex')
  const rows: any[] = []
  const collections: Record<string, any> = {
    paperbanana_benchmark_runs: {
      async findOne() { return run },
      async updateOne(_query: any, update: any) { Object.assign(run, update.$set); return { modifiedCount: 1 } },
    },
    paperbanana_benchmark_samples: { find() { return { async toArray() { return [] } } } },
    paperbanana_benchmark_judgments: {
      async updateOne(query: any, update: any) {
        if (!rows.some((row) => row._id === query._id)) rows.push({ _id: query._id, ...update.$setOnInsert })
        return { modifiedCount: 1 }
      },
      find() { return { async toArray() { return rows } } },
      async updateMany(_query: any, update: any) { rows.forEach((row) => Object.assign(row, update.$set)); return { modifiedCount: rows.length } },
    },
    paperbanana_benchmark_suites: {}, paperbanana_benchmark_models: {}, paperbanana_benchmark_releases: {},
  }
  const db = { collection(name: string) { return collections[name] } }
  const repository = createMongoBenchmarkRepository(db as any, () => new Date('2026-08-25T10:00:00.000Z'))
  await assert.rejects(() => repository.importReview({ runId: run._id, review } as any), /BENCHMARK_PHASE_SOURCE_MANIFEST_MISMATCH/)
  assert.equal(rows.length, 0)
})

test('quick review import revalidates the signed append-only dispatch set before persisting Codex rows', async () => {
  const fixture = quickFixture({ dispatchAttempts: 2 })
  let judgmentWrites = 0
  const tamperedDispatches = fixture.dispatchMarkers.slice(0, -1)
  const collections: Record<string, any> = {
    paperbanana_benchmark_runs: { async findOne() { return fixture.run } },
    paperbanana_benchmark_samples: { find() { return { async toArray() { return fixture.samples } } } },
    paperbanana_benchmark_judgments: {
      find() { return { async toArray() { return fixture.automatic } } },
      async updateOne() { judgmentWrites += 1; return { modifiedCount: 1 } },
    },
    paperbanana_benchmark_dispatches: { find() { return { async toArray() { return tamperedDispatches } } } },
    paperbanana_benchmark_suites: {}, paperbanana_benchmark_models: {}, paperbanana_benchmark_releases: {},
  }
  const repository = createMongoBenchmarkRepository(
    { collection(name: string) { return collections[name] } } as any,
    () => new Date('2026-08-25T10:00:00.000Z'),
  )
  await assert.rejects(
    () => repository.importReview({ runId: fixture.run._id, review: fixture.review } as any),
    /BENCHMARK_PHASE_SOURCE_MANIFEST_MISMATCH/,
  )
  assert.equal(judgmentWrites, 0)
})

test('full review export freezes the complete sample and automatic judgment manifest into the signed packet', async () => {
  const fixture = verifiedFixture()
  let savedPacket: any
  const collections: Record<string, any> = {
    paperbanana_benchmark_runs: {
      async findOne() { return fixture.run },
      async updateOne(_query: any, update: any) { savedPacket = update.$set.reviewPacket; return { modifiedCount: 1 } },
    },
    paperbanana_benchmark_samples: {
      async updateMany() { return { modifiedCount: 0 } },
      find(query: any) {
        const rows = query.auditRequired === true ? fixture.samples.filter((sample) => sample.auditRequired) : fixture.samples
        return { sort() { return this }, async toArray() { return rows } }
      },
    },
    paperbanana_benchmark_judgments: { find() { return { async toArray() { return fixture.automatic } } } },
    paperbanana_benchmark_dispatches: { find() { return { async toArray() { return fixture.dispatchMarkers } } } },
    paperbanana_benchmark_suites: {}, paperbanana_benchmark_models: {}, paperbanana_benchmark_releases: {},
  }
  const repository = createMongoBenchmarkRepository(
    { collection(name: string) { return collections[name] } } as any,
    () => new Date('2026-08-25T10:00:00.000Z'),
    async () => {},
  )
  const packet = await repository.exportReview({ runId: fixture.run._id, publicEvidenceSampleIds: [] } as any)
  assert.equal(packet.sourceManifestHash, fixture.run.reviewPacket.sourceManifestHash)
  assert.equal(packet.sourceManifestAttestation, fixture.run.reviewPacket.sourceManifestAttestation)
  assert.equal(savedPacket.packetHash, packet.packetHash)
  const expectedManifest = testPhaseSourceManifest(fixture.run._id, fixture.run.runHash, 'full', fixture.samples, fixture.automatic, fixture.dispatchMarkers)
  assert.equal(expectedManifest.facts.schemaVersion, 2)
  assert.equal(expectedManifest.facts.judgeDispatchMarkers.length, 288)
  assert.deepEqual(expectedManifest.facts.usage,
    { generationCalls: 144, logicalJudgments: 288, judgeDispatchCalls: 288 })
})

test('quick review export freezes quick samples, automatic judgments, and append-only dispatch usage', async () => {
  const fixture = quickFixture({ dispatchAttempts: 2 })
  let savedPacket: any
  const collections: Record<string, any> = {
    paperbanana_benchmark_runs: {
      async findOne() { return fixture.run },
      async updateOne(_query: any, update: any) { savedPacket = update.$set.reviewPacket; return { modifiedCount: 1 } },
    },
    paperbanana_benchmark_samples: {
      async updateMany() { return { modifiedCount: 0 } },
      find(query: any) {
        const rows = query.auditRequired === true ? fixture.samples.filter((sample) => sample.auditRequired) : fixture.samples
        return { sort() { return this }, async toArray() { return rows } }
      },
    },
    paperbanana_benchmark_judgments: { find() { return { async toArray() { return fixture.automatic } } } },
    paperbanana_benchmark_dispatches: { find() { return { async toArray() { return fixture.dispatchMarkers } } } },
    paperbanana_benchmark_suites: {}, paperbanana_benchmark_models: {}, paperbanana_benchmark_releases: {},
  }
  const repository = createMongoBenchmarkRepository(
    { collection(name: string) { return collections[name] } } as any,
    () => new Date('2026-08-25T10:00:00.000Z'),
    async () => {},
  )
  const packet = await repository.exportReview({ runId: fixture.run._id, publicEvidenceSampleIds: [] } as any)
  const expectedManifest = testPhaseSourceManifest(fixture.run._id, fixture.run.runHash, 'quick', fixture.samples, fixture.automatic, fixture.dispatchMarkers)
  assert.equal(packet.sourceManifestHash, expectedManifest.hash)
  assert.equal(savedPacket.sourceManifestHash, expectedManifest.hash)
  assert.equal(expectedManifest.facts.phase, 'quick')
  assert.deepEqual(expectedManifest.facts.usage, {
    generationCalls: fixture.samples.length,
    logicalJudgments: fixture.automatic.length,
    judgeDispatchCalls: fixture.dispatchMarkers.length,
  })
})

test('provisional publication independently rebuilds quick usage and cost and never trusts legacy run usage', async () => {
  const publish = async (fixture: ReturnType<typeof quickFixture>, extraDispatches: any[] = []) => {
    const insertedReleases: any[] = []
    const repository = createMongoBenchmarkRepository(
      verifiedPublishDb(fixture.run, {
        suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples,
        judgments: [...fixture.automatic, ...fixture.codex], dispatches: [...fixture.dispatchMarkers, ...extraDispatches], insertedReleases,
      }) as any,
    )
    const result = await repository.publish({ runId: fixture.run._id, profileStatus: 'provisional', evidence: [] } as any)
    return { result, release: insertedReleases[0] }
  }

  const normal = await publish(quickFixture())
  assert.equal(normal.result.profileStatus, 'provisional')
  assert.equal(normal.release.models[0].profileStatus, 'provisional')
  assert.deepEqual(normal.release.models[0].estimatedCost, {
    usd: 28.8, generationCalls: 24, automaticJudgeCalls: 48, logicalJudgments: 48, judgeDispatchCalls: 48,
  })
  assert.deepEqual(normal.release.models[0].traits, [])

  const repaired = await publish(quickFixture({ dispatchAttempts: 4 }))
  assert.deepEqual(repaired.release.models[0].estimatedCost, {
    usd: 43.2, generationCalls: 24, automaticJudgeCalls: 48, logicalJudgments: 48, judgeDispatchCalls: 192,
  })
  await assert.rejects(() => publish(quickFixture({ dispatchAttempts: 4, maxJudgeCalls: 191 })), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:QUICK_APPROVAL_CAPS/)
  await assert.rejects(() => publish(quickFixture({ dispatchAttempts: 4, maxEstimatedUsd: 43.1 })), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:QUICK_APPROVAL_CAPS/)
})

test('provisional publication accepts only the signed quick shape and revalidates its transaction snapshot', async () => {
  const publish = async (fixture: ReturnType<typeof quickFixture>, changes: Record<string, any> = {}) => createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, {
      suite: fixture.suite, candidate: fixture.candidate,
      samples: changes.samples || fixture.samples,
      judgments: changes.judgments || [...fixture.automatic, ...fixture.codex],
      dispatches: changes.dispatches || fixture.dispatchMarkers,
      transactionalSamples: changes.transactionalSamples,
      transactionalJudgments: changes.transactionalJudgments,
      transactionalDispatches: changes.transactionalDispatches,
    }) as any,
  ).publish({ runId: fixture.run._id, profileStatus: 'provisional', evidence: [] } as any)

  const fixture = quickFixture()
  const firstMarker = fixture.dispatchMarkers[0]
  const corruptions = [
    { label: 'missing sample', samples: fixture.samples.slice(1) },
    { label: 'extra sample', samples: [...fixture.samples, { ...fixture.samples[0], _id: 'extra', sampleId: 'extra' }] },
    { label: 'missing dispatch tail', dispatches: fixture.dispatchMarkers.slice(0, -1) },
    { label: 'dispatch gap', dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, _id: `dispatch:${marker.logicalProvider}:${marker.sampleId}:1`, dispatchIndex: 1 }) },
    { label: 'extra dispatch', dispatches: [...fixture.dispatchMarkers, { ...firstMarker, _id: 'dispatch:openrouter:unknown:0', sampleId: 'unknown' }] },
    { label: 'wrong dispatch phase', dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, phase: 'full' }) },
    { label: 'wrong dispatch provider', dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, logicalProvider: 'ark' }) },
    { label: 'wrong dispatch epoch', dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, judgeEpoch: 'stale' }) },
    { label: 'legacy judgment marker', judgments: [...fixture.automatic, firstMarker, ...fixture.codex] },
  ]
  for (const corruption of corruptions) {
    await assert.rejects(() => publish(fixture, corruption), /BENCHMARK_VERIFIED_INTEGRITY_FAILED/, corruption.label)
  }

  await assert.rejects(
    () => publish(fixture, { transactionalDispatches: fixture.dispatchMarkers.slice(0, -1) }),
    /BENCHMARK_VERIFIED_INTEGRITY_FAILED/,
  )

  const failedInserts: any[] = []
  const casRepository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, {
      suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples,
      judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers,
      insertedReleases: failedInserts, failRunCasAfterInsert: true,
    }) as any,
  )
  await assert.rejects(
    () => casRepository.publish({ runId: fixture.run._id, profileStatus: 'provisional', evidence: [] } as any),
    /BENCHMARK_PUBLISH_STATE_CONFLICT/,
  )
  assert.equal(failedInserts.length, 0)

  const gapFixture = quickFixture({ aspectRatios: ['1:1'] })
  const gapResult = await publish(gapFixture)
  assert.equal(gapResult.profileStatus, 'provisional')
})

test('verified publication independently accepts only the exact full suite, automatic judges and current Codex packet', async () => {
  const fixture = verifiedFixture()
  const verifiedObjects: string[] = []
  const insertedReleases: any[] = []
  fixture.run.releaseDraft.models[0] = {
    displayName: 'forged draft name',
    providerLabel: 'forged draft provider',
    sampleCount: 1,
    coverage: 0.01,
    capabilityCoverage: 0.02,
    successRate: 0.03,
    profileStatus: 'provisional',
    dimensions: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, { mean: 99, ci95: { low: 99, high: 99 } }])),
  } as any
  fixture.run.releaseDraft.methodology = { suiteId: 'forged-suite', auditPolicy: 'trust-worker' }
  ;(fixture.run as any).usage = { generations: 9_999, judgments: 9_999, estimatedUsd: 9_999 }
  ;(fixture.run as any).priceHash = canonicalHash('worker-forged-price')
  ;(fixture.run as any).authorizationHash = canonicalHash('worker-forged-authorization')
  ;(fixture.run as any).approval = { entitlementConfirmed: false, priceSnapshot: { estimatedPerGeneration: 999 } }
  const forgedLiveCandidate = { ...fixture.candidate, displayName: 'Worker forged name', providerLabel: 'Worker forged provider', developer: 'Worker forged developer' }
  const repository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: forgedLiveCandidate, samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, insertedReleases }) as any,
    () => new Date('2026-08-25T10:00:00.000Z'),
    async (objectKey) => { verifiedObjects.push(objectKey) },
  )
  const result = await repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any)
  assert.equal(result.profileStatus, 'verified')
  assert.equal(verifiedObjects.length, 144)
  assert.equal(insertedReleases.length, 1)
  const publishedProfile = insertedReleases[0].models.find((model: any) => model.modelId === fixture.run.modelId)
  const codexBySample = new Map(fixture.codex.map((judgment) => [judgment.sampleId, judgment]))
  const expectedDimensions = aggregateAxisScores(fixture.samples.map((sample) => {
    const automatic = fixture.automatic.filter((judgment) => judgment.sampleId === sample.sampleId)
    const codex = codexBySample.get(sample.sampleId)
    const scores = codex
      ? applyCodexAdjudication({ automatic, codex }).scores
      : Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, automatic.reduce((sum, judgment) => sum + judgment.scores[axis], 0) / automatic.length]))
    return { caseId: sample.caseId, scores }
  }), { seed: fixture.run.runHash })
  for (const axis of BENCHMARK_AXES) {
    assert.equal(publishedProfile.dimensions[axis].mean, expectedDimensions[axis].mean)
    assert.deepEqual(publishedProfile.dimensions[axis].ci95, expectedDimensions[axis].ci95)
    assert.equal(publishedProfile.dimensions[axis].caseCount, expectedDimensions[axis].caseCount)
    assert.equal(publishedProfile.dimensions[axis].sampleCount, expectedDimensions[axis].sampleCount)
    assert.equal(publishedProfile.dimensions[axis].laneMedian, expectedDimensions[axis].mean)
    assert.deepEqual(publishedProfile.dimensions[axis].differenceCi95, {
      low: expectedDimensions[axis].ci95.low - expectedDimensions[axis].mean,
      high: expectedDimensions[axis].ci95.high - expectedDimensions[axis].mean,
    })
  }
  assert.equal(publishedProfile.sampleCount, 144)
  assert.equal(publishedProfile.coverage, 1)
  assert.equal(publishedProfile.capabilityCoverage, 1)
  assert.equal(publishedProfile.successRate, 1)
  assert.equal(publishedProfile.profileStatus, 'verified')
  assert.equal(publishedProfile.displayName, fixture.candidate.displayName)
  assert.equal(publishedProfile.providerLabel, fixture.candidate.providerLabel)
  assert.equal(publishedProfile.developer, fixture.candidate.developer)
  assert.deepEqual(publishedProfile.estimatedCost, { usd: 172.8, generationCalls: 144, automaticJudgeCalls: 288, logicalJudgments: 288, judgeDispatchCalls: 288 })
  assert.equal(publishedProfile.priceHash, fixture.run.approvalVersions[1].priceHash)
  assert.equal(publishedProfile.authorizationHash, fixture.run.approvalVersions[1].authorizationHash)
  assert.equal(insertedReleases[0].priceHash, fixture.run.approvalVersions[1].priceHash)
  assert.equal(insertedReleases[0].methodology.suiteId, PB_IMAGE_DIAGNOSTIC_V1.id)
  assert.equal(insertedReleases[0].methodology.judgeEpoch, fixture.run.judgeEpoch)
  assert.equal(insertedReleases[0].methodology.reviewerEpoch, fixture.run.reviewerEpoch)
  assert.equal(insertedReleases[0].methodology.expectedCaseCount, 48)
  assert.equal(insertedReleases[0].methodology.sampleCount, 144)
  assert.equal(insertedReleases[0].methodology.automaticJudgmentCount, 288)
  assert.equal(insertedReleases[0].methodology.logicalJudgmentCount, 288)
  assert.equal(insertedReleases[0].methodology.judgeDispatchCount, 288)
  assert.equal(insertedReleases[0].methodology.auditSampleCount, fixture.expectedAuditIds.length)
  assert.deepEqual(insertedReleases[0].methodology.capabilityGaps, [])
  assert.notEqual(insertedReleases[0].methodology.auditPolicy, 'trust-worker')

  const corruptions = [
    { label: 'sample cardinality', samples: fixture.samples.slice(1), judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, run: fixture.run },
    { label: 'sample phase', samples: fixture.samples.map((sample, index) => index ? sample : { ...sample, phase: 'quick' }), judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, run: fixture.run },
    { label: 'image hash', samples: fixture.samples.map((sample, index) => index ? sample : { ...sample, imageHash: 'invalid' }), judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, run: fixture.run },
    { label: 'rubric hash', samples: fixture.samples.map((sample, index) => index ? sample : { ...sample, rubricHash: canonicalHash('wrong') }), judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, run: fixture.run },
    { label: 'automatic cardinality', samples: fixture.samples, judgments: [...fixture.automatic.slice(1), ...fixture.codex], dispatches: fixture.dispatchMarkers, run: fixture.run },
    { label: 'judge epoch', samples: fixture.samples, judgments: [...fixture.automatic.map((judgment, index) => index ? judgment : { ...judgment, judgeEpoch: 'stale' }), ...fixture.codex], dispatches: fixture.dispatchMarkers, run: fixture.run },
    { label: 'accepted Codex judgment', samples: fixture.samples, judgments: fixture.automatic, dispatches: fixture.dispatchMarkers, run: fixture.run },
    { label: 'current packet', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, run: { ...fixture.run, importedReviewPacketHash: canonicalHash('stale') } },
    { label: 'signed candidate snapshot', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, run: { ...fixture.run, candidateSnapshot: { ...fixture.run.candidateSnapshot, displayName: 'forged signed label' } } },
    { label: 'signed full approval', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, run: { ...fixture.run, approvalVersions: fixture.run.approvalVersions.map((version: any, index: number) => index ? { ...version, approval: { ...version.approval, maxEstimatedUsd: 99_999 } } : version) } },
    { label: 'dispatch missing first marker', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, _id: `dispatch:${marker.logicalProvider}:${marker.sampleId}:1`, dispatchIndex: 1 }), run: fixture.run },
    { label: 'dispatch extra unknown sample', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: [...fixture.dispatchMarkers, { ...fixture.dispatchMarkers[0], _id: 'dispatch:openrouter:unknown-sample:0', sampleId: 'unknown-sample' }], run: fixture.run },
    { label: 'dispatch phase', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, phase: 'quick' }), run: fixture.run },
    { label: 'dispatch provider', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, logicalProvider: 'ark' }), run: fixture.run },
    { label: 'dispatch epoch', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, judgeEpoch: 'stale' }), run: fixture.run },
    { label: 'dispatch duplicate', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: [...fixture.dispatchMarkers, { ...fixture.dispatchMarkers[0] }], run: fixture.run },
    { label: 'dispatch deleted tail', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers.slice(0, -1), run: fixture.run },
    { label: 'dispatch phase-downgraded tail', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers.map((marker, index) => index === fixture.dispatchMarkers.length - 1 ? { ...marker, phase: 'quick' } : marker), run: fixture.run },
    { label: 'dispatch incomplete old record', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers.map((marker, index) => index ? marker : { ...marker, status: 'dispatched' }), run: fixture.run },
    { label: 'legacy judgment marker rejected', samples: fixture.samples, judgments: [...fixture.automatic, fixture.dispatchMarkers[0], ...fixture.codex], dispatches: fixture.dispatchMarkers, run: fixture.run },
  ]
  for (const corruption of corruptions) {
    const corruptRepository = createMongoBenchmarkRepository(
      verifiedPublishDb(corruption.run, { suite: fixture.suite, samples: corruption.samples, judgments: corruption.judgments, dispatches: corruption.dispatches }) as any,
    )
    await assert.rejects(
      () => corruptRepository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any),
      /BENCHMARK_VERIFIED_INTEGRITY_FAILED/,
      corruption.label,
    )
  }
})

test('verified publication prices repair and 429 dispatch attempts and independently enforces both signed Judge caps', async () => {
  const publish = async (fixture: ReturnType<typeof verifiedFixture>, extras: any[] = []) => {
    const insertedReleases: any[] = []
    const repository = createMongoBenchmarkRepository(
      verifiedPublishDb(fixture.run, {
        suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples,
        judgments: [...fixture.automatic, ...fixture.codex], dispatches: [...fixture.dispatchMarkers, ...extras], insertedReleases,
      }) as any,
    )
    const result = await repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any)
    return { result, release: insertedReleases[0] }
  }
  const repaired = verifiedFixture({ dispatchAttempts: 4 })
  const published = await publish(repaired)
  assert.deepEqual(published.release.models[0].estimatedCost, {
    usd: 259.2, generationCalls: 144, automaticJudgeCalls: 288, logicalJudgments: 288, judgeDispatchCalls: 1152,
  })
  const quickHistory = {
    ...repaired.dispatchMarkers[0], _id: 'dispatch:openrouter:quick-history:0', sampleId: 'quick-history',
    phase: 'quick', logicalProvider: 'openrouter', dispatchIndex: 0, judgeEpoch: 'old-quick-epoch',
  }
  const withQuickHistory = await publish(repaired, [quickHistory])
  assert.equal(withQuickHistory.release.models[0].estimatedCost.judgeDispatchCalls, 1152)
  await assert.rejects(() => publish(verifiedFixture({ dispatchAttempts: 4, maxJudgeCalls: 1151 })), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:FULL_APPROVAL_CAPS/)
  await assert.rejects(() => publish(verifiedFixture({ dispatchAttempts: 4, maxEstimatedUsd: 259.1 })), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:FULL_APPROVAL_CAPS/)
})

test('verified publication ignores accepted quick and superseded full Codex rows and scores only the exact current full import', async () => {
  const fixture = verifiedFixture()
  const current = fixture.codex[0]
  const historical = [
    { ...current, _id: 'codex:quick-history', phase: 'quick', scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 0])), packetHash: canonicalHash('quick-packet'), reviewHash: canonicalHash('quick-review'), reviewAttestation: canonicalHash('quick-attestation') },
    { ...current, _id: 'codex:full-history', phase: 'full', scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 0])), packetHash: canonicalHash('old-full-packet'), reviewHash: canonicalHash('old-full-review'), reviewAttestation: canonicalHash('old-full-attestation') },
  ]
  const insertedReleases: any[] = []
  const repository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, {
      suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples,
      judgments: [...fixture.automatic, ...historical, ...fixture.codex], dispatches: fixture.dispatchMarkers, insertedReleases,
    }) as any,
  )
  await repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any)
  assert.equal(insertedReleases.length, 1)
  const profile = insertedReleases[0].models.find((model: any) => model.modelId === fixture.run.modelId)
  assert.equal(profile.dimensions.aesthetics.mean, 6)
})

test('verified publication authenticates the exact packet and complete accepted Codex judgment set', async () => {
  const fixture = verifiedFixture()
  const publish = async (run: any, judgments: any[]) => createMongoBenchmarkRepository(
    verifiedPublishDb(run, { suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples, judgments, dispatches: fixture.dispatchMarkers }) as any,
  ).publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any)

  await assert.rejects(() => publish(
    fixture.run,
    [...fixture.automatic, ...fixture.codex.map((judgment, index) => index ? judgment : {
      ...judgment, scores: { ...judgment.scores, aesthetics: 0 },
    })],
  ), /BENCHMARK_VERIFIED_INTEGRITY_FAILED/)
  await assert.rejects(() => publish(
    { ...fixture.run, reviewPacket: { ...fixture.run.reviewPacket, signature: '0'.repeat(64) } },
    [...fixture.automatic, ...fixture.codex],
  ), /BENCHMARK_VERIFIED_INTEGRITY_FAILED/)
  await assert.rejects(() => publish(
    { ...fixture.run, importedReviewAttestation: '0'.repeat(64) },
    [...fixture.automatic, ...fixture.codex],
  ), /BENCHMARK_VERIFIED_INTEGRITY_FAILED/)
  await assert.rejects(() => publish(
    { ...fixture.run, runIntegrityAttestation: '0'.repeat(64) },
    [...fixture.automatic, ...fixture.codex],
  ), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:RUN_FACTS/)
  await assert.rejects(() => publish(
    { ...fixture.run, developer: 'forged developer' },
    [...fixture.automatic, ...fixture.codex],
  ), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:RUN_FACTS/)
  await assert.rejects(() => publish(
    { ...fixture.run, importedReviewHash: canonicalHash('forged-accepted') },
    [...fixture.automatic, ...fixture.codex.map((judgment) => ({ ...judgment, reviewHash: canonicalHash('forged-accepted') }))],
  ), /BENCHMARK_VERIFIED_INTEGRITY_FAILED/)
})

test('verified publication rebuilds the audit set and strictly validates automatic and Codex evidence fields', async () => {
  const fixture = verifiedFixture()
  const unaudited = fixture.samples.find((sample) => !fixture.expectedAuditIds.includes(sample.sampleId))!
  const publish = async (samples: any[], judgments: any[]) => createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples, judgments, dispatches: fixture.dispatchMarkers }) as any,
  ).publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any)
  const disagreement = fixture.automatic.map((judgment) => judgment.sampleId === unaudited.sampleId && judgment.provider === 'openrouter'
    ? { ...judgment, scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 0])) }
    : judgment)
  await assert.rejects(() => publish(fixture.samples, [...disagreement, ...fixture.codex]), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:AUDIT_SET/)
  const equalUnreviewedTamper = fixture.automatic.map((judgment) => judgment.sampleId === unaudited.sampleId
    ? { ...judgment, scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 9])) }
    : judgment)
  await assert.rejects(() => publish(fixture.samples, [...equalUnreviewedTamper, ...fixture.codex]), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:SOURCE_MANIFEST/)
  await assert.rejects(() => publish(
    fixture.samples.map((sample) => sample.sampleId === unaudited.sampleId ? { ...sample, publicEvidence: true } : sample),
    [...fixture.automatic, ...fixture.codex],
  ), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:AUDIT_SET/)
  const redLineConflict = fixture.automatic.map((judgment) => judgment.sampleId === unaudited.sampleId && judgment.provider === 'openrouter'
    ? { ...judgment, redLines: ['missing_node'] }
    : judgment)
  await assert.rejects(() => publish(fixture.samples, [...redLineConflict, ...fixture.codex]), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:AUDIT_SET/)
  const anomalous = fixture.automatic.map((judgment) => judgment.sampleId === unaudited.sampleId && judgment.provider === 'openrouter'
    ? { ...judgment, confidence: 0.2 }
    : judgment)
  await assert.rejects(() => publish(fixture.samples, [...anomalous, ...fixture.codex]), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:AUDIT_SET/)
  for (const automaticPatch of [
    { confidence: Number.NaN }, { evidence: [] }, { redLines: [{ code: 'invented' }] },
  ]) {
    await assert.rejects(() => publish(fixture.samples, [
      ...fixture.automatic.map((judgment, index) => index ? judgment : { ...judgment, ...automaticPatch }), ...fixture.codex,
    ]), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:AUTOMATIC_SHAPE/)
  }
  for (const codexPatch of [
    { confidence: -1 }, { evidence: [] }, { confirmedRedLines: [{ code: '', axis: 'aesthetics', cap: 4 }] },
  ]) {
    await assert.rejects(() => publish(fixture.samples, [
      ...fixture.automatic, ...fixture.codex.map((judgment, index) => index ? judgment : { ...judgment, ...codexPatch }),
    ]), /BENCHMARK_VERIFIED_INTEGRITY_FAILED/)
  }
})

test('verified publication rejects every missing, non-finite, fractional, non-positive or excessive latency', async () => {
  const fixture = verifiedFixture()
  for (const latencyMs of [undefined, Number.NaN, -1, 0, 1.5, 86_400_001]) {
    const samples = fixture.samples.map((sample, index) => index ? sample : { ...sample, latencyMs })
    const repository = createMongoBenchmarkRepository(
      verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers }) as any,
    )
    await assert.rejects(
      () => repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any),
      /BENCHMARK_VERIFIED_INTEGRITY_FAILED:SAMPLE_LATENCY/,
    )
  }
})

test('verified publication verifies immutable OSS evidence outside the transaction with bounded retry and fails closed', async () => {
  const fixture = verifiedFixture()
  const insertedReleases: any[] = []
  const transactionState = { active: false }
  let verificationCalls = 0
  let firstObjectAttempts = 0
  const repository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, insertedReleases, transactionState }) as any,
    () => new Date('2026-08-25T10:00:00.000Z'),
    async (objectKey) => {
      assert.equal(transactionState.active, false)
      verificationCalls += 1
      if (objectKey === fixture.samples[0].imageObjectKey && firstObjectAttempts++ === 0) throw new Error('transient OSS read')
    },
  )
  await repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any)
  assert.equal(verificationCalls, 145)
  assert.equal(insertedReleases.length, 1)

  const failedInserts: any[] = []
  const failedSignals: AbortSignal[] = []
  const failedRepository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, insertedReleases: failedInserts, transactionState }) as any,
    () => new Date('2026-08-25T10:00:00.000Z'),
    async (_objectKey, _imageHash, options) => {
      assert.equal(transactionState.active, false)
      failedSignals.push(options?.signal!)
      throw new Error('permanent OSS read failure')
    },
  )
  await assert.rejects(() => failedRepository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:IMAGE_EVIDENCE/)
  assert.equal(failedInserts.length, 0)
  assert.ok(failedSignals.length >= 2)
  assert.ok(failedSignals.every((signal) => signal.aborted))
})

test('evidence batch aborts every active read, stops dequeuing and settles cleanup after the first terminal failure', async () => {
  const objects = Array.from({ length: 20 }, (_, index) => ({ objectKey: `bench/objects/${index}.png`, imageHash: canonicalHash(index) }))
  const calls: string[] = []
  const signals: AbortSignal[] = []
  let terminalAttempts = 0
  await assert.rejects(() => verifyEvidenceObjects(objects, async (objectKey, _imageHash, options) => {
    calls.push(objectKey)
    signals.push(options?.signal!)
    if (objectKey === objects[0].objectKey) {
      terminalAttempts += 1
      throw new Error('terminal')
    }
    await new Promise<void>((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
  }, { concurrency: 4, deadlineMs: 100, retries: 1 }), /BENCHMARK_VERIFIED_INTEGRITY_FAILED:IMAGE_EVIDENCE/)
  assert.equal(terminalAttempts, 2)
  assert.ok(calls.length <= 5)
  assert.ok(signals.every((signal) => signal === signals[0] && signal.aborted))
})

test('verified publication CAS-rejects an evidence manifest drift without downloading inside the transaction', async () => {
  const fixture = verifiedFixture()
  const insertedReleases: any[] = []
  const target = fixture.samples.find((sample) => !sample.auditRequired)!
  const replacementHash = canonicalHash('replacement-image')
  const transactionalSamples = fixture.samples.map((sample) => sample.sampleId === target.sampleId
    ? { ...sample, imageHash: replacementHash, imageObjectKey: `bench/objects/${replacementHash}.png` }
    : sample)
  const repository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, {
      suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples, transactionalSamples,
      judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, insertedReleases,
    }) as any,
  )
  await assert.rejects(
    () => repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any),
    /BENCHMARK_VERIFIED_INTEGRITY_FAILED:SOURCE_MANIFEST/,
  )
  assert.equal(insertedReleases.length, 0)
})

test('verified publication rolls back a staged release when the post-insert run CAS loses', async () => {
  const fixture = verifiedFixture()
  const insertedReleases: any[] = []
  const repository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, {
      suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples,
      judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers, insertedReleases, failRunCasAfterInsert: true,
    }) as any,
  )
  await assert.rejects(
    () => repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any),
    /BENCHMARK_PUBLISH_STATE_CONFLICT/,
  )
  assert.equal(insertedReleases.length, 0)
})

test('verified publication accepts supported full cases and records each unsupported fixed-ratio case as a capability gap', async () => {
  const fixture = verifiedFixture({ aspectRatios: ['16:9'] })
  const insertedReleases: any[] = []
  let verificationCalls = 0
  const repository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, {
      suite: fixture.suite,
      samples: fixture.samples,
      judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers,
      insertedReleases,
    }) as any,
    () => new Date('2026-08-25T10:00:00.000Z'),
    async () => { verificationCalls += 1 },
  )
  const result = await repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any)
  assert.equal(result.profileStatus, 'verified')
  assert.equal(fixture.expectedCases.length, 43)
  assert.equal(fixture.samples.length, 129)
  assert.equal(fixture.automatic.length, 258)
  assert.equal(verificationCalls, 129)
  const profile = insertedReleases[0].models.find((model: any) => model.modelId === fixture.run.modelId)
  assert.equal(profile.sampleCount, 129)
  assert.equal(profile.coverage, 1)
  assert.equal(profile.capabilityCoverage, 43 / 48)
  assert.equal(profile.successRate, 1)
  assert.deepEqual(profile.capabilityGaps, [
    'case=multi_panel_process-05;aspectRatio=1:1',
    'case=proportional_layout-02;aspectRatio=3:4',
    'case=proportional_layout-03;aspectRatio=1:1',
    'case=proportional_layout-05;aspectRatio=21:9',
    'case=proportional_layout-06;aspectRatio=4:3',
  ])

  const unsupportedCase = fixture.unsupportedCases[0]
  const unsupportedSample = {
    ...fixture.samples[0],
    _id: benchmarkSampleId(fixture.run._id, 'full', unsupportedCase.id, 0),
    sampleId: benchmarkSampleId(fixture.run._id, 'full', unsupportedCase.id, 0),
    caseId: unsupportedCase.id,
    rubric: unsupportedCase.rubric,
    rubricHash: canonicalHash(unsupportedCase.rubric),
  }
  const corruptRepository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, {
      suite: fixture.suite,
      samples: [...fixture.samples, unsupportedSample],
      judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers,
    }) as any,
  )
  await assert.rejects(
    () => corruptRepository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any),
    /BENCHMARK_VERIFIED_INTEGRITY_FAILED/,
  )
})

test('verified publication rejects a valid-shaped score snapshot change before inserting a stale release', async () => {
  const fixture = verifiedFixture()
  const insertedReleases: any[] = []
  const transactionalJudgments = [
    ...fixture.automatic.map((judgment) => judgment.sampleId !== fixture.samples[0].sampleId ? judgment : {
      ...judgment,
      scores: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, 9])),
    }),
    ...fixture.codex,
  ]
  const repository = createMongoBenchmarkRepository(
    verifiedPublishDb(fixture.run, {
      suite: fixture.suite,
      samples: fixture.samples,
      judgments: [...fixture.automatic, ...fixture.codex], dispatches: fixture.dispatchMarkers,
      transactionalJudgments,
      insertedReleases,
    }) as any,
  )
  await assert.rejects(
    () => repository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any),
    /BENCHMARK_VERIFIED_INTEGRITY_FAILED:SOURCE_MANIFEST/,
  )
  assert.equal(insertedReleases.length, 0)
})
test('scientific v2 production object policy requires exact private/public metadata and ACL', () => {
  const rawHash = 'a'.repeat(64)
  const publicHash = 'b'.repeat(64)
  const privateKey = `bench/scientific-v2/private/objects/${rawHash}.png`
  const publicKey = `bench/scientific-v2/public/${rawHash}/thumbnail.webp`
  verifyScientificV2EvidenceMetadata(privateKey, rawHash, {
    mimeType: 'image/png', cacheControl: 'private, no-store', sha256: rawHash, acl: 'private',
  })
  verifyScientificV2EvidenceMetadata(publicKey, publicHash, {
    mimeType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable', sha256: publicHash, acl: 'public-read',
  })
  for (const drift of [
    { mimeType: 'image/png' }, { cacheControl: 'private, no-store' }, { sha256: rawHash }, { acl: 'private' },
  ]) {
    assert.throws(() => verifyScientificV2EvidenceMetadata(publicKey, publicHash, {
      mimeType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable', sha256: publicHash, acl: 'public-read', ...drift,
    }), /SCIENTIFIC_V2_OBJECT_METADATA_MISMATCH/)
  }
})
