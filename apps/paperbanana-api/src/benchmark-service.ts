import { BENCHMARK_AXES, canonicalHash } from '@paperbanana/benchmark-core'

type AnyRecord = Record<string, any>

const benchmarkLanes = new Set(['1K-standard', '2K-standard', '4K-standard', 'provider-default'])
const arenaRankingMethod = () => ({
  id: 'equal_weight_mean_v1',
  axes: [...BENCHMARK_AXES],
  weights: BENCHMARK_AXES.map(() => 1 / BENCHMARK_AXES.length),
  tieMethod: 'competition',
})

const publicActions = new Set(['benchmarkLeaderboard', 'benchmarkModelProfile', 'benchmarkMethodology'])
const adminActions = new Set([
  'adminBenchmarkCandidates',
  'adminBenchmarkApprove',
  'adminBenchmarkControl',
  'adminBenchmarkReviewExport',
  'adminBenchmarkReviewImport',
  'adminBenchmarkPublish',
])

export function isBenchmarkAction(action: string) {
  return publicActions.has(action) || adminActions.has(action)
}

function isArenaLeaderboardRelease(release: AnyRecord): boolean {
  return release.evaluationMode === 'codex_single' && release.profileStatus === 'published'
}

function publicModel(model: AnyRecord, includeRanking = false): AnyRecord {
  const allowed = [
    'profileId', 'modelId', 'displayName', 'provider', 'providerLabel', 'developer', 'lane', 'profileStatus', 'sampleCount',
    'coverage', 'dimensions', 'traits', 'successRate', 'capabilityCoverage', 'repeatStability', 'latency', 'estimatedCost',
    'registryHash', 'priceHash', 'codeSha', 'auditRatio', 'capabilityGaps', 'canonicalModelId', 'primaryAccessProvider',
    'alternateAccessProviders', 'actualOutputPixels', 'ranked', 'unrankedReason',
    ...(includeRanking ? ['overallScore', 'overallRank', 'dimensionRanks'] : []),
  ]
  return Object.fromEntries(allowed.filter((key) => model[key] !== undefined).map((key) => [key, structuredClone(model[key])]))
}

function publicMethodology(methodology: AnyRecord | undefined, rankingMethod?: AnyRecord): AnyRecord | null {
  if (!methodology && !rankingMethod) return null
  const allowed = [
    'suiteId', 'suiteHash', 'aggregation', 'noOverallScore', 'judgeEpoch', 'reviewerEpoch', 'auditPolicy', 'knownLimitations',
    'evaluationMode', 'evaluationEpoch', 'reviewProtocol', 'reviewerKind', 'reviewerPasses', 'automaticJudges',
    'repetitionsPerCase', 'expectedCaseCount', 'sampleCount', 'automaticJudgmentCount', 'logicalJudgmentCount',
    'judgeDispatchCount', 'auditSampleCount', 'actualOutputPixels',
  ]
  const publicValue = Object.fromEntries(allowed.filter((key) => methodology?.[key] !== undefined).map((key) => [key, structuredClone(methodology![key])]))
  return rankingMethod ? { ...publicValue, noOverallScore: false, rankingMethod } : publicValue
}

function isEligibleForPublicLeaderboard(model: AnyRecord): boolean {
  return model.ranked === true
    && Number.isFinite(model.sampleCount)
    && model.sampleCount >= 3
    && BENCHMARK_AXES.every((axis) => Number.isFinite(model.dimensions?.[axis]?.mean))
}

function competitionRanks(values: number[]): number[] {
  const ranks = Array<number>(values.length)
  const ordered = values.map((value, index) => ({ value, index })).sort((left, right) => right.value - left.value)
  let rank = 0
  for (let index = 0; index < ordered.length; index++) {
    if (index === 0 || ordered[index].value !== ordered[index - 1].value) rank = index + 1
    ranks[ordered[index].index] = rank
  }
  return ranks
}

export async function publicBenchmarkRelease(release: AnyRecord, signEvidence: (key: string) => Promise<string>, verifyEvidence: (key: string, imageHash: string) => Promise<void> = async () => {}): Promise<AnyRecord> {
  const { _id: _storedId, releaseHash: storedHash, ...releaseBase } = release
  if (!storedHash || canonicalHash(releaseBase) !== storedHash) throw new Error('BENCHMARK_RELEASE_HASH_MISMATCH')
  const releaseId = String(release._id || release.releaseId || '')
  const evidence = []
  for (const item of Array.isArray(release.evidence) ? release.evidence : []) {
    const objectKey = String(item.objectKey || '')
    if (!releaseId || !objectKey.startsWith('bench/') || objectKey.includes('..')) continue
    await verifyEvidence(objectKey, String(item.imageHash || ''))
    evidence.push({
      sampleId: String(item.sampleId || ''),
      profileId: String(item.profileId || ''),
      modelId: String(item.modelId || ''),
      caseId: String(item.caseId || ''),
      kind: String(item.kind || ''),
      caption: String(item.caption || ''),
      imageUrl: await signEvidence(objectKey),
      imageHash: String(item.imageHash || ''),
    })
  }
  const arenaLeaderboard = isArenaLeaderboardRelease(release)
  const models = Array.isArray(release.models) ? release.models : []
  const rankingMethod = arenaLeaderboard ? arenaRankingMethod() : undefined
  const publicModels: AnyRecord[] = arenaLeaderboard
    ? models.filter(isEligibleForPublicLeaderboard).map((model: AnyRecord) => ({
      ...publicModel(model, true),
      overallScore: BENCHMARK_AXES.reduce((sum, axis) => sum + model.dimensions[axis].mean, 0) / BENCHMARK_AXES.length,
    }))
    : models.map((model: AnyRecord) => publicModel(model))
  let rankedModels: AnyRecord[] = publicModels
  if (arenaLeaderboard) {
    const overallRanks = competitionRanks(publicModels.map((model) => model.overallScore))
    const dimensionRanks = Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, competitionRanks(publicModels.map((model) => model.dimensions[axis].mean))]))
    rankedModels = publicModels.map((model, index) => ({
      ...model,
      overallRank: overallRanks[index],
      dimensionRanks: Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, dimensionRanks[axis][index]])),
    }))
  }
  return {
    releaseId,
    profileStatus: release.profileStatus,
    releaseHash: release.releaseHash,
    ...(arenaLeaderboard ? {
      sourceReleaseHash: release.releaseHash,
      presentationVersion: 'arena-leaderboard-v1',
      eligibleModelCount: rankedModels.length,
      rankingMethod,
    } : {}),
    supersedesReleaseId: release.supersedesReleaseId || undefined,
    suiteId: release.suiteId,
    suiteHash: release.suiteHash,
    judgeEpoch: release.judgeEpoch,
    reviewerEpoch: release.reviewerEpoch,
    evaluationMode: release.evaluationMode,
    evaluationEpoch: release.evaluationEpoch,
    reviewProtocol: release.reviewProtocol,
    reviewerKind: release.reviewerKind,
    reviewerPasses: release.reviewerPasses,
    registryHash: release.registryHash,
    priceHash: release.priceHash,
    codeSha: release.codeSha,
    lane: release.lane,
    sampleCount: release.sampleCount,
    auditRatio: release.auditRatio,
    publishedAt: release.publishedAt,
    models: rankedModels,
    evidence,
    methodology: publicMethodology(release.methodology, rankingMethod),
  }
}

interface BenchmarkRepository {
  latestRelease(lane?: string): Promise<AnyRecord | null>
  releaseByModel(modelId: string, provider?: string, lane?: string, profileId?: string): Promise<AnyRecord | null>
  candidates(): Promise<AnyRecord[]>
  approve(input: AnyRecord): Promise<unknown>
  control(input: AnyRecord): Promise<unknown>
  exportReview(input: AnyRecord): Promise<unknown>
  importReview(input: AnyRecord): Promise<unknown>
  publish(input: AnyRecord): Promise<unknown>
}

export function createBenchmarkService({
  repository,
  signEvidence,
  verifyEvidence = async () => {},
}: {
  repository: BenchmarkRepository
  signEvidence: (key: string) => Promise<string>
  verifyEvidence?: (key: string, imageHash: string) => Promise<void>
}) {
  return {
    async handle(body: AnyRecord, isAdmin: boolean): Promise<AnyRecord> {
      const action = String(body.action || '')
      if (!isBenchmarkAction(action)) throw new Error('UNKNOWN_BENCHMARK_ACTION')
      if (adminActions.has(action) && !isAdmin) throw new Error('BENCHMARK_ADMIN_REQUIRED')

      if (action === 'benchmarkLeaderboard') {
        const lane = String(body.lane || '').trim()
        if (lane && !benchmarkLanes.has(lane)) return { code: 400, error: 'Invalid benchmark lane' }
        const release = await repository.latestRelease(lane || undefined)
        return { code: 0, release: release ? await publicBenchmarkRelease(release, signEvidence, verifyEvidence) : null }
      }
      if (action === 'benchmarkModelProfile') {
        const modelId = String(body.modelId || '').trim()
        const profileId = String(body.profileId || '').trim()
        const provider = String(body.provider || '').trim()
        const lane = String(body.lane || '').trim()
        if (!modelId && !profileId) return { code: 400, error: 'modelId or profileId is required' }
        const release = await repository.releaseByModel(modelId, provider || undefined, lane || undefined, profileId || undefined)
        if (!release) return { code: 404, error: 'Benchmark profile not found' }
        const published = await publicBenchmarkRelease(release, signEvidence, verifyEvidence)
        const profile = published.models.find((model: AnyRecord) => profileId ? model.profileId === profileId : model.modelId === modelId && (!provider || model.provider === provider) && (!lane || model.lane === lane))
        return profile
          ? { code: 0, profile: { ...profile, release: { ...published, models: undefined }, evidence: published.evidence.filter((item: AnyRecord) => item.profileId ? item.profileId === profile.profileId : item.modelId === profile.modelId) } }
          : { code: 404, error: 'Benchmark profile not found' }
      }
      if (action === 'benchmarkMethodology') {
        const release = await repository.latestRelease()
        if (release) {
          const { _id: _storedId, releaseHash: storedHash, ...releaseBase } = release
          if (!storedHash || canonicalHash(releaseBase) !== storedHash) throw new Error('BENCHMARK_RELEASE_HASH_MISMATCH')
        }
        return { code: 0, methodology: release ? publicMethodology(release.methodology, isArenaLeaderboardRelease(release) ? arenaRankingMethod() : undefined) : null, releaseHash: release?.releaseHash || '' }
      }
      if (action === 'adminBenchmarkCandidates') return { code: 0, candidates: await repository.candidates() }
      if (action === 'adminBenchmarkApprove') return { code: 0, approval: await repository.approve(body) }
      if (action === 'adminBenchmarkControl') return { code: 0, run: await repository.control(body) }
      if (action === 'adminBenchmarkReviewExport') {
        const packet = await repository.exportReview(body) as AnyRecord
        return {
          code: 0,
          packet: {
            ...packet,
            samples: await Promise.all((Array.isArray(packet.samples) ? packet.samples : []).map(async (sample: AnyRecord) => ({
              ...sample,
              imageUrl: await signEvidence(String(sample.imageObjectKey || '')),
            }))),
          },
        }
      }
      if (action === 'adminBenchmarkReviewImport') return { code: 0, result: await repository.importReview(body) }
      return { code: 0, release: await repository.publish(body) }
    },
  }
}
