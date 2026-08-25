import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'

import { createBenchmarkService, publicBenchmarkRelease } from '../src/benchmark-service.js'
import { buildJudgeCalibrationRecord, createMongoBenchmarkRepository, judgeCalibrationId, verifyEvidenceObjects } from '../src/benchmark-repository.js'
import {
  BENCHMARK_AXES,
  PB_IMAGE_DIAGNOSTIC_V1,
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

function storedRelease(base: Record<string, any>) {
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
    mode: 'calibration', codeSha, maxGenerations: 0, maxJudgeCalls: 12, maxEstimatedUsd: 3,
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
    aspectRatios: ['16:9'], registryHash: 'registry-hash', state: 'detected',
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
    candidateId: candidate._id, entitlementConfirmed: true, maxGenerations: 24, maxJudgeCalls: 48, maxEstimatedUsd: 100,
    priceSnapshot: { estimatedPerGeneration: 1, estimatedPerJudgeCall: 0.1, capturedAt: '2026-08-25T08:00:00.000Z' }, adminUserId: 'admin-123',
  }
  const now = () => new Date('2026-08-25T08:00:00.000Z')
  const repository = createMongoBenchmarkRepository({ collection(name: string) { return collections[name] } } as any, now, async () => {}, 'a'.repeat(40))
  await repository.approve(input as any)
  assert.equal(insertedRun.runHash, canonicalHash(insertedRun.runFacts))
  assert.equal(insertedRun.candidateSnapshot.displayName, candidate.modelId)
  assert.equal(insertedRun.candidateSnapshot.providerLabel, candidate.provider)
  assert.equal(insertedRun.approvalVersions.length, 1)
  assert.equal(insertedRun.approvalVersions[0].phase, 'quick')
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
  await reapprovalRepository.approve({ ...input, maxGenerations: 144, maxJudgeCalls: 288, maxEstimatedUsd: 500 } as any)
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

test('public release strips private fields and signs only allowlisted bench evidence', async () => {
  const signed: string[] = []
  const release = await publicBenchmarkRelease(storedRelease({
    _id: 'release-1',
    profileStatus: 'verified',
    suiteId: 'pb-image-diagnostic-v1',
    lane: '2K-standard',
    models: [{
      modelId: 'model-a', displayName: 'A', provider: 'openrouter', developer: 'Maker', dimensions: {},
      registryHash: 'registry-a', priceHash: 'price-a', codeSha: 'sha-a', auditRatio: 0.1,
      capabilityGaps: ['aspectRatio:16:9'], secretRef: 'must-not-leak',
    }],
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
  assert.equal('secretRef' in release.models[0], false)
  assert.equal(release.evidence.length, 1)
  assert.equal(release.evidence[0].imageUrl, 'https://signed.example/bench/releases/release-1/allowed.png')
  assert.deepEqual(signed, ['bench/releases/release-1/allowed.png'])
})

test('public actions read immutable releases while admin actions require authorization', async () => {
  const releases = [storedRelease({
    _id: 'release-1', profileStatus: 'verified', suiteId: 'suite', judgeEpoch: 'judge', lane: '2K-standard',
    publishedAt: new Date('2026-08-25T00:00:00Z'), models: [{ modelId: 'model-a', displayName: 'Model A', dimensions: { aesthetics: { mean: 8 } } }], evidence: [],
    methodology: { suiteId: 'suite', aggregation: 'case-first-bootstrap', internalQueue: 'hidden' },
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
  assert.deepEqual((await service.handle({ action: 'benchmarkMethodology' }, false)).methodology, { suiteId: 'suite', aggregation: 'case-first-bootstrap' })
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

function verifiedPublishDb(run: Record<string, any>, input: { suite?: Record<string, any>; candidate?: Record<string, any>; samples?: any[]; transactionalSamples?: any[]; judgments?: any[]; transactionalJudgments?: any[]; insertedReleases?: any[]; transactionState?: { active: boolean }; failRunCasAfterInsert?: boolean } = {}) {
  const storedRun = { ...run }
  const suite = input.suite
  const sampleRows = input.samples || []
  const judgmentRows = input.judgments || []
  let sampleReads = 0
  let judgmentReads = 0
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

function testFullSourceManifest(runId: string, runHash: string, samples: any[], automatic: any[]) {
  const facts = {
    schemaVersion: 1, runId, runHash, phase: 'full',
    usage: { generationCalls: samples.length, automaticJudgeCalls: automatic.length },
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
  }
  return { facts, hash: canonicalHash(facts) }
}

function verifiedFixture(options: { aspectRatios?: string[] } = {}) {
  const runId = 'run-full'
  const reviewerEpoch = 'reviewer-epoch'
  const aspectRatios = options.aspectRatios || ['16:9', '4:3', '3:4', '1:1', '21:9']
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
  const quickPriceSnapshot = { currency: 'USD', estimatedPerGeneration: 1, estimatedPerJudgeCall: 0.1, capturedAt: '2026-08-25T06:00:00.000Z' }
  const fullPriceSnapshot = { currency: 'USD', estimatedPerGeneration: 1, estimatedPerJudgeCall: 0.1, capturedAt: '2026-08-25T07:00:00.000Z' }
  const quickApproval = { entitlementConfirmed: true, priceSnapshot: quickPriceSnapshot, maxGenerations: 24, maxJudgeCalls: 48, maxEstimatedUsd: 100, approvedBy: 'admin-123', approvedAt: new Date('2026-08-25T06:00:00.000Z') }
  const fullApproval = { entitlementConfirmed: true, priceSnapshot: fullPriceSnapshot, maxGenerations: 144, maxJudgeCalls: 288, maxEstimatedUsd: 500, approvedBy: 'admin-123', approvedAt: new Date('2026-08-25T07:00:00.000Z') }
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
  const sourceManifest = testFullSourceManifest(runId, runHash, samples, automatic)
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
  return { run, candidate, suite: { ...PB_IMAGE_DIAGNOSTIC_V1, _id: PB_IMAGE_DIAGNOSTIC_V1.id }, expectedCases, unsupportedCases, capabilityGaps, samples, automatic, codex, expectedAuditIds }
}

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

test('review import persists a Core-only attestation and replay refuses a tampered persisted judgment', async () => {
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
    priceSnapshot: { currency: 'USD', estimatedPerGeneration: 1, estimatedPerJudgeCall: 0.1, capturedAt: '2026-08-25T07:00:00.000Z' },
    maxGenerations: 24, maxJudgeCalls: 48, maxEstimatedUsd: 100, approvedBy: 'admin-123', approvedAt: createdAt }
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
  await repository.importReview({ runId: run._id, review } as any)
  assert.match(run.importedReviewAttestation, /^[a-f0-9]{64}$/)
  assert.equal(rows[0].reviewAttestation, run.importedReviewAttestation)
  assert.equal(rows[0].accepted, true)
  rows[0].scores = { ...rows[0].scores, aesthetics: 0 }
  await assert.rejects(() => repository.importReview({ runId: run._id, review } as any), /BENCHMARK_REVIEW_PERSISTENCE_INCOMPLETE/)
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
  assert.deepEqual(testFullSourceManifest(fixture.run._id, fixture.run.runHash, fixture.samples, fixture.automatic).facts.usage,
    { generationCalls: 144, automaticJudgeCalls: 288 })
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
    verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: forgedLiveCandidate, samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], insertedReleases }) as any,
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
  assert.deepEqual(publishedProfile.estimatedCost, { usd: 172.8, generationCalls: 144, automaticJudgeCalls: 288 })
  assert.equal(publishedProfile.priceHash, fixture.run.approvalVersions[1].priceHash)
  assert.equal(publishedProfile.authorizationHash, fixture.run.approvalVersions[1].authorizationHash)
  assert.equal(insertedReleases[0].priceHash, fixture.run.approvalVersions[1].priceHash)
  assert.equal(insertedReleases[0].methodology.suiteId, PB_IMAGE_DIAGNOSTIC_V1.id)
  assert.equal(insertedReleases[0].methodology.judgeEpoch, fixture.run.judgeEpoch)
  assert.equal(insertedReleases[0].methodology.reviewerEpoch, fixture.run.reviewerEpoch)
  assert.equal(insertedReleases[0].methodology.expectedCaseCount, 48)
  assert.equal(insertedReleases[0].methodology.sampleCount, 144)
  assert.equal(insertedReleases[0].methodology.automaticJudgmentCount, 288)
  assert.equal(insertedReleases[0].methodology.auditSampleCount, fixture.expectedAuditIds.length)
  assert.deepEqual(insertedReleases[0].methodology.capabilityGaps, [])
  assert.notEqual(insertedReleases[0].methodology.auditPolicy, 'trust-worker')

  const corruptions = [
    { label: 'sample cardinality', samples: fixture.samples.slice(1), judgments: [...fixture.automatic, ...fixture.codex], run: fixture.run },
    { label: 'sample phase', samples: fixture.samples.map((sample, index) => index ? sample : { ...sample, phase: 'quick' }), judgments: [...fixture.automatic, ...fixture.codex], run: fixture.run },
    { label: 'image hash', samples: fixture.samples.map((sample, index) => index ? sample : { ...sample, imageHash: 'invalid' }), judgments: [...fixture.automatic, ...fixture.codex], run: fixture.run },
    { label: 'rubric hash', samples: fixture.samples.map((sample, index) => index ? sample : { ...sample, rubricHash: canonicalHash('wrong') }), judgments: [...fixture.automatic, ...fixture.codex], run: fixture.run },
    { label: 'automatic cardinality', samples: fixture.samples, judgments: [...fixture.automatic.slice(1), ...fixture.codex], run: fixture.run },
    { label: 'judge epoch', samples: fixture.samples, judgments: [...fixture.automatic.map((judgment, index) => index ? judgment : { ...judgment, judgeEpoch: 'stale' }), ...fixture.codex], run: fixture.run },
    { label: 'accepted Codex judgment', samples: fixture.samples, judgments: fixture.automatic, run: fixture.run },
    { label: 'current packet', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], run: { ...fixture.run, importedReviewPacketHash: canonicalHash('stale') } },
    { label: 'signed candidate snapshot', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], run: { ...fixture.run, candidateSnapshot: { ...fixture.run.candidateSnapshot, displayName: 'forged signed label' } } },
    { label: 'signed full approval', samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], run: { ...fixture.run, approvalVersions: fixture.run.approvalVersions.map((version: any, index: number) => index ? { ...version, approval: { ...version.approval, maxEstimatedUsd: 99_999 } } : version) } },
  ]
  for (const corruption of corruptions) {
    const corruptRepository = createMongoBenchmarkRepository(
      verifiedPublishDb(corruption.run, { suite: fixture.suite, samples: corruption.samples, judgments: corruption.judgments }) as any,
    )
    await assert.rejects(
      () => corruptRepository.publish({ runId: fixture.run._id, profileStatus: 'verified', evidence: [] } as any),
      /BENCHMARK_VERIFIED_INTEGRITY_FAILED/,
      corruption.label,
    )
  }
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
      judgments: [...fixture.automatic, ...historical, ...fixture.codex], insertedReleases,
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
    verifiedPublishDb(run, { suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples, judgments }) as any,
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
    verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples, judgments }) as any,
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
      verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples, judgments: [...fixture.automatic, ...fixture.codex] }) as any,
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
    verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], insertedReleases, transactionState }) as any,
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
    verifiedPublishDb(fixture.run, { suite: fixture.suite, candidate: fixture.candidate, samples: fixture.samples, judgments: [...fixture.automatic, ...fixture.codex], insertedReleases: failedInserts, transactionState }) as any,
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
      judgments: [...fixture.automatic, ...fixture.codex], insertedReleases,
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
      judgments: [...fixture.automatic, ...fixture.codex], insertedReleases, failRunCasAfterInsert: true,
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
      judgments: [...fixture.automatic, ...fixture.codex],
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
      judgments: [...fixture.automatic, ...fixture.codex],
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
      judgments: [...fixture.automatic, ...fixture.codex],
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
