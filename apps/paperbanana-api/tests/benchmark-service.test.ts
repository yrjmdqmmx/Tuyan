import assert from 'node:assert/strict'
import test from 'node:test'

import { createBenchmarkService, publicBenchmarkRelease } from '../src/benchmark-service.js'
import { buildJudgeCalibrationRecord, judgeCalibrationId } from '../src/benchmark-repository.js'
import { canonicalHash } from '@paperbanana/benchmark-core'

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
