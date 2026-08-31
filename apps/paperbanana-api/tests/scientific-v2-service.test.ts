import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_BENCHMARK_AXES,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  canonicalHash,
} from '@paperbanana/benchmark-core'

import { createBenchmarkService } from '../src/benchmark-service.js'

function scientificRelease() {
  const editCase = PB_SCIENTIFIC_FIGURE_V2.cases.find((item) => item.kind === 'edit')!
  const profileId = `scientific-model:${SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode}:${SCIENTIFIC_BENCHMARK_IDENTITY.evaluationEpoch}`
  const scores = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, 8]))
  const dimensions = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, { mean: 8, denominator: 1, succeededSlots: 1, zeroedSlots: 0 }]))
  const evidence: any[] = PB_SCIENTIFIC_FIGURE_V2.cases.map((scientificCase) => ({
    caseId: scientificCase.id,
    kind: scientificCase.kind,
    status: scientificCase === editCase ? 'succeeded' : 'failed',
    requestedResolution: '2K',
    attemptSummary: { count: scientificCase === editCase ? 1 : 4, responseClasses: scientificCase === editCase ? ['succeeded'] : Array(4).fill('confirmed_provider_failure') },
    ...(scientificCase === editCase ? {
      imageHash: 'a'.repeat(64), sourceHash: editCase.sourceHash, editedHash: 'a'.repeat(64), region: editCase.region,
      actualOutputPixels: { width: 2048, height: 1152, megapixels: 2.3593, fileSizeBytes: 4096 },
      scores: Object.fromEntries(editCase.applicableAxes.map((axis) => [axis, 8])), reviewNotes: ['加分：局部编辑准确'],
      variants: [{ kind: 'detail', imageHash: 'b'.repeat(64), width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp' }],
      beforeVariants: [{ kind: 'detail', imageHash: 'c'.repeat(64), width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp' }],
    } : { failureReason: 'confirmed_attempts_exhausted' }),
  }))
  const releaseBase: any = {
    profileStatus: 'published', ...SCIENTIFIC_BENCHMARK_IDENTITY,
    suiteHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    registryHash: 'd'.repeat(64), priceHash: 'e'.repeat(64),
    manifestCodeSha: 'f'.repeat(40), executionCodeSha: 'f'.repeat(40), legacyRecovery: false,
    batchId: 'scientific-v2-public-batch', batchManifestHash: '1'.repeat(64), reviewFinalHash: '3'.repeat(64),
    sampleCount: 1, automaticJudges: [], automaticJudgeCalls: 0,
    models: [{
      profileId, modelId: 'scientific-model', canonicalModelId: 'scientific-model', displayName: 'Scientific Model', developer: 'Maker',
      profileStatus: 'published', ranked: true, scores, dimensions, overallScore: 8, overallRank: 1,
      dimensionRanks: Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, 1])),
      generationSuccessRate: 0, editSuccessRate: 1 / 3, successRate: 1 / 9,
      attemptSummary: { total: 33, succeeded: 1, failed: 8, unsupported: 0 },
      failureReasons: evidence.filter((item) => item.failureReason).map((item) => ({ caseId: item.caseId, reason: item.failureReason })), evidence,
    }],
    methodology: {
      ...SCIENTIFIC_BENCHMARK_IDENTITY, suiteHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
      expectedCaseCount: 9, dimensions: [...SCIENTIFIC_BENCHMARK_AXES], overallFormula: 'ten_dimension_raw_equal_weight_mean',
      tieMethod: 'competition', failureScore: 0, retryPolicy: { confirmedFailureMaxAttempts: 4, unknownProviderOutcome: 'pause_no_retry' },
      routePriority: ['bailian', 'ark', 'openrouter'], providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
      manifestCodeSha: 'f'.repeat(40), executionCodeSha: 'f'.repeat(40), legacyRecovery: false,
      automaticJudges: [], blindReview: { reviewers: 2, arbitration: 'xhigh_on_dispute', automaticJudges: [] },
      knownLimitations: ['fixed-nine-case-suite'], automaticJudgmentCount: 0,
    },
    publishedAt: new Date('2026-08-31T00:00:00.000Z'),
  }
  const release: any = { _id: 'scientific-v2-release', ...releaseBase, releaseHash: canonicalHash(releaseBase) }
  Object.defineProperty(release, 'profileId', { value: profileId, enumerable: false })
  Object.defineProperty(release, 'editCase', { value: editCase, enumerable: false })
  return release
}

test('scientific v2 public actions expose ten-axis rankings, full methodology and signed edit before/after without secrets', async () => {
  const release = scientificRelease()
  const evidenceRow = {
    sourceReleaseHash: release.releaseHash,
    profileId: release.profileId,
    canonicalModelId: 'scientific-model', overallRank: 1,
    ...release.models[0].evidence.find((item: any) => item.caseId === release.editCase.id),
    variants: [{ kind: 'detail', objectKey: `bench/scientific-v2/public/${'a'.repeat(64)}/detail.webp`, imageHash: 'b'.repeat(64), width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp' }],
    beforeVariants: [{ kind: 'detail', objectKey: `bench/scientific-v2/public/${release.editCase.sourceHash}/detail.webp`, imageHash: 'c'.repeat(64), width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp' }],
  }
  evidenceRow.reviewNotes = ['加分：局部编辑准确', 'reviewer secret /tmp/blind-A']
  const signed: string[] = []
  const verified: string[] = []
  const repository: any = {
    async latestRelease() { return release },
    async releaseByModel() { return release },
    async publicEvidenceForRelease() { return { items: [evidenceRow], nextCursor: null } },
    async candidates() { return [] }, async approve() {}, async control() {},
    async exportReview() {
      return {
        role: 'A', packages: [{ packetHash: 'packet', items: [{ imageHash: 'a'.repeat(64) }] }],
        _objectBindings: [{ imageHash: 'a'.repeat(64), objectKey: `bench/scientific-v2/private/objects/${'a'.repeat(64)}.png` }],
      }
    },
    async importReview() {}, async publish() {},
  }
  const service = createBenchmarkService({
    repository,
    signEvidence: async (key) => { signed.push(key); return `https://signed.example/${canonicalHash(key)}` },
    verifyEvidence: async (key) => { verified.push(key) },
  })

  const leaderboard = await service.handle({ action: 'benchmarkLeaderboard' }, false)
  assert.equal(leaderboard.release.presentationVersion, 'scientific-leaderboard-v2')
  assert.equal(leaderboard.release.manifestCodeSha, 'f'.repeat(40))
  assert.equal(leaderboard.release.executionCodeSha, 'f'.repeat(40))
  assert.equal(leaderboard.release.legacyRecovery, false)
  assert.equal(Object.hasOwn(leaderboard.release, 'codeSha'), false)
  assert.equal(Object.hasOwn(leaderboard.release, 'stateHash'), false)
  assert.equal(Object.keys(leaderboard.release.models[0].scores).length, 10)
  assert.equal(leaderboard.release.models[0].evidence.length, 9)

  const methodology = await service.handle({ action: 'benchmarkMethodology' }, false)
  assert.equal(methodology.suite.cases.length, 9)
  assert.deepEqual(methodology.scoring.axes, [...SCIENTIFIC_BENCHMARK_AXES])
  assert.equal(methodology.methodology.automaticJudgmentCount, 0)
  assert.equal(methodology.methodology.manifestCodeSha, 'f'.repeat(40))
  assert.equal(methodology.methodology.executionCodeSha, 'f'.repeat(40))
  assert.equal(methodology.methodology.legacyRecovery, false)
  assert.equal(Object.hasOwn(methodology.methodology, 'codeSha'), false)
  assert.equal(Object.hasOwn(methodology.methodology, 'stateHash'), false)

  const profile = await service.handle({ action: 'benchmarkModelProfile', profileId: release.profileId }, false)
  const publicEdit = profile.profile.evidence[0]
  assert.equal(publicEdit.beforeVariants[0].url.startsWith('https://signed.example/'), true)
  assert.equal(publicEdit.variants[0].url.startsWith('https://signed.example/'), true)
  assert.equal(JSON.stringify(profile).includes('objectKey'), false)
  assert.equal(JSON.stringify(profile).includes('reviewerIdentity'), false)
  assert.equal(JSON.stringify(profile).includes('attestationHash'), false)
  assert.deepEqual(publicEdit.reviewNotes, ['加分：局部编辑准确'])
  assert.equal(publicEdit.requestedResolution, '2K')
  assert.deepEqual(publicEdit.actualOutputPixels, { width: 2048, height: 1152, megapixels: 2.3593, fileSizeBytes: 4096 })

  const caseResponse = await service.handle({ action: 'benchmarkCaseEvidence', caseId: release.editCase.id }, false)
  assert.equal(caseResponse.code, 0)
  assert.equal(caseResponse.items.length, 1)
  assert.equal(signed.length, 4)
  assert.equal(verified.length, 4)

  const reviewExport = await service.handle({ action: 'adminBenchmarkReviewExport', evaluationMode: 'codex_scientific_v2' }, true)
  assert.equal(reviewExport.packet.packages[0].items[0].imageUrl.startsWith('https://signed.example/'), true)
  assert.equal(JSON.stringify(reviewExport).includes('objectKey'), false)
  assert.equal(JSON.stringify(reviewExport).includes('_objectBindings'), false)
})

test('scientific public evidence allowlists attempt summary fields and rejects incomplete score sets', async () => {
  const release = scientificRelease()
  const success = structuredClone(release.models[0].evidence.find((item: any) => item.status === 'succeeded'))
  const evidenceRow = {
    sourceReleaseHash: release.releaseHash,
    profileId: release.profileId,
    canonicalModelId: 'scientific-model',
    overallRank: 1,
    ...success,
    attemptSummary: {
      ...success.attemptSummary,
      objectKey: 'bench/scientific-v2/private/attempt.json',
      blindLabel: 'blind-A',
    },
    variants: [{ kind: 'detail', objectKey: `bench/scientific-v2/public/${success.imageHash}/detail.webp`, imageHash: 'b'.repeat(64), width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp' }],
    beforeVariants: [{ kind: 'detail', objectKey: `bench/scientific-v2/public/${success.sourceHash}/detail.webp`, imageHash: 'c'.repeat(64), width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp' }],
  }
  const repository: any = {
    async latestRelease() { return release },
    async releaseByModel() { return release },
    async publicEvidenceForRelease() { return { items: [evidenceRow], nextCursor: null } },
    async candidates() { return [] }, async approve() {}, async control() {}, async exportReview() {}, async importReview() {}, async publish() {},
  }
  const service = createBenchmarkService({ repository, signEvidence: async () => 'https://signed.example/evidence.webp', verifyEvidence: async () => {} })

  const projected = await service.handle({ action: 'benchmarkModelProfile', profileId: release.profileId }, false)
  assert.deepEqual(projected.profile.evidence[0].attemptSummary, { count: 1, responseClasses: ['succeeded'] })
  assert.equal(JSON.stringify(projected).includes('objectKey'), false)
  assert.equal(JSON.stringify(projected).includes('blindLabel'), false)

  delete evidenceRow.scores[Object.keys(evidenceRow.scores)[0]]
  const malformed = await service.handle({ action: 'benchmarkModelProfile', profileId: release.profileId }, false)
  assert.deepEqual(malformed.profile.evidence, [])
})

test('scientific public release rejects rehashed ambiguous codeSha or internal stateHash fields', async () => {
  for (const [field, value] of [['codeSha', 'a'.repeat(40)], ['stateHash', 'b'.repeat(64)]] as const) {
    const release: any = scientificRelease()
    release[field] = value
    const { _id: _id, releaseHash: _releaseHash, ...releaseBase } = release
    release.releaseHash = canonicalHash(releaseBase)
    const repository: any = {
      async latestRelease() { return release },
      async releaseByModel() { return release },
      async publicEvidenceForRelease() { return { items: [], nextCursor: null } },
      async candidates() { return [] }, async approve() {}, async control() {}, async exportReview() {}, async importReview() {}, async publish() {},
    }
    const service = createBenchmarkService({ repository, signEvidence: async () => '', verifyEvidence: async () => {} })
    await assert.rejects(
      () => service.handle({ action: 'benchmarkLeaderboard' }, false),
      /SCIENTIFIC_RELEASE_LINEAGE_INVALID/,
      field,
    )
    await assert.rejects(
      () => service.handle({ action: 'benchmarkMethodology' }, false),
      /SCIENTIFIC_RELEASE_LINEAGE_INVALID/,
      `${field} methodology`,
    )
  }
})

test('scientific public evidence exposes only exact zero-attempt provider-canary propagated failures', async () => {
  const release = scientificRelease()
  const failed = structuredClone(release.models[0].evidence.find((item: any) => item.status === 'failed'))
  const evidenceRow = {
    sourceReleaseHash: release.releaseHash,
    profileId: release.profileId,
    canonicalModelId: 'scientific-model',
    overallRank: 1,
    ...failed,
    attemptSummary: { count: 0, responseClasses: [] },
    failureReason: 'provider_canary_confirmed_failed',
  }
  const repository: any = {
    async latestRelease() { return release },
    async releaseByModel() { return release },
    async publicEvidenceForRelease() { return { items: [evidenceRow], nextCursor: null } },
    async candidates() { return [] }, async approve() {}, async control() {}, async exportReview() {}, async importReview() {}, async publish() {},
  }
  const service = createBenchmarkService({ repository, signEvidence: async () => '', verifyEvidence: async () => {} })

  const projected = await service.handle({ action: 'benchmarkModelProfile', profileId: release.profileId }, false)
  assert.deepEqual(projected.profile.evidence, [{
    profileId: release.profileId,
    canonicalModelId: 'scientific-model',
    overallRank: 1,
    caseId: failed.caseId,
    kind: failed.kind,
    status: 'failed',
    requestedResolution: '2K',
    attemptSummary: { count: 0, responseClasses: [] },
    failureReason: 'provider_canary_confirmed_failed',
  }])

  evidenceRow.failureReason = 'confirmed_attempts_exhausted'
  const mismatched = await service.handle({ action: 'benchmarkModelProfile', profileId: release.profileId }, false)
  assert.deepEqual(mismatched.profile.evidence, [])
})

test('production CJS bundle loads scientific v2 without an import.meta URL crash', () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const build = spawnSync('pnpm', ['build'], { cwd: packageRoot, encoding: 'utf8' })
  assert.equal(build.status, 0, build.stderr || build.stdout)
  const loaded = spawnSync(process.execPath, ['-e', "require('./dist/server.cjs'); console.log('loaded')"], { cwd: packageRoot, encoding: 'utf8' })
  assert.match(loaded.stdout, /loaded/)
  assert.doesNotMatch(loaded.stderr, /ERR_INVALID_URL|Invalid URL/)
})

test('runtime injects the configured server-side review secret into the scientific repository', () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const main = readFileSync(path.join(packageRoot, 'src/main.ts'), 'utf8')
  assert.match(main, /operatorReportSecret:\s*config\.benchmark\.reviewSigningSecret/)
  assert.doesNotMatch(main, /PAPERBANANA_BENCH_SCIENTIFIC_V2_OPERATOR_SECRET/)
})
