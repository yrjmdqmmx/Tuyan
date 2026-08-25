import { canonicalHash } from '@paperbanana/benchmark-core'

type AnyRecord = Record<string, any>

const benchmarkLanes = new Set(['1K-standard', '2K-standard', '4K-standard'])

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

function publicModel(model: AnyRecord) {
  const allowed = [
    'profileId', 'modelId', 'displayName', 'provider', 'providerLabel', 'developer', 'lane', 'profileStatus', 'sampleCount',
    'coverage', 'dimensions', 'traits', 'successRate', 'capabilityCoverage', 'repeatStability', 'latency', 'estimatedCost',
    'registryHash', 'priceHash', 'codeSha', 'auditRatio', 'capabilityGaps',
  ]
  return Object.fromEntries(allowed.filter((key) => model[key] !== undefined).map((key) => [key, model[key]]))
}

function publicMethodology(methodology: AnyRecord | undefined) {
  if (!methodology) return null
  const allowed = ['suiteId', 'aggregation', 'noOverallScore', 'judgeEpoch', 'reviewerEpoch', 'auditPolicy', 'knownLimitations']
  return Object.fromEntries(allowed.filter((key) => methodology[key] !== undefined).map((key) => [key, methodology[key]]))
}

export async function publicBenchmarkRelease(release: AnyRecord, signEvidence: (key: string) => Promise<string>, verifyEvidence: (key: string, imageHash: string) => Promise<void> = async () => {}) {
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
  return {
    releaseId,
    profileStatus: release.profileStatus,
    releaseHash: release.releaseHash,
    supersedesReleaseId: release.supersedesReleaseId || undefined,
    suiteId: release.suiteId,
    suiteHash: release.suiteHash,
    judgeEpoch: release.judgeEpoch,
    reviewerEpoch: release.reviewerEpoch,
    registryHash: release.registryHash,
    priceHash: release.priceHash,
    codeSha: release.codeSha,
    lane: release.lane,
    sampleCount: release.sampleCount,
    auditRatio: release.auditRatio,
    publishedAt: release.publishedAt,
    models: (Array.isArray(release.models) ? release.models : []).map(publicModel),
    evidence,
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
        return { code: 0, methodology: publicMethodology(release?.methodology), releaseHash: release?.releaseHash || '' }
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
