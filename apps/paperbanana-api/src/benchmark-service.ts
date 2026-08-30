import { BENCHMARK_AXES, canonicalHash, PB_IMAGE_LIGHT_V1 } from '@paperbanana/benchmark-core'

type AnyRecord = Record<string, any>

const benchmarkLanes = new Set(['1K-standard', '2K-standard', '4K-standard', 'provider-default'])
const arenaRankingMethod = () => ({
  id: 'equal_weight_mean_v1',
  axes: [...BENCHMARK_AXES],
  weights: BENCHMARK_AXES.map(() => 1 / BENCHMARK_AXES.length),
  tieMethod: 'competition',
})
const arenaMethodologyScoring = Object.freeze({
  scoreMin: 0,
  scoreMax: 10,
  minimumReviewedSamples: 3,
  maximumSamplesPerModel: 4,
  overallFormula: 'equal_weight_mean_v1',
  tieMethod: 'competition',
  redLinePolicy: 'confirmed_axis_cap',
})

function publicArenaMethodologySuite(): AnyRecord {
  const suiteFields = ['id', 'title', 'version', 'language', 'license', 'manifestHash']
  const caseFields = [
    'id', 'category', 'title', 'caption', 'aspectRatio', 'renderPrompt', 'negativePrompt', 'requiredEntities',
    'requiredRelations', 'requiredText', 'forbidden', 'rubric', 'license', 'manifestHash',
  ]
  return {
    ...Object.fromEntries(suiteFields.map((key) => [key, structuredClone((PB_IMAGE_LIGHT_V1 as AnyRecord)[key])])),
    cases: PB_IMAGE_LIGHT_V1.cases.map((benchmarkCase) => Object.fromEntries(caseFields.map((key) => [key, structuredClone((benchmarkCase as AnyRecord)[key])]))),
  }
}

const publicActions = new Set(['benchmarkLeaderboard', 'benchmarkModelProfile', 'benchmarkMethodology', 'benchmarkCaseEvidence', 'benchmarkPromptSubmission'])
const adminActions = new Set([
  'adminBenchmarkCandidates',
  'adminBenchmarkApprove',
  'adminBenchmarkControl',
  'adminBenchmarkReviewExport',
  'adminBenchmarkReviewImport',
  'adminBenchmarkPublish',
  'adminBenchmarkPromptQueue',
  'adminBenchmarkPromptDigest',
  'adminBenchmarkPromptDecision',
])

export function isBenchmarkAction(action: string) {
  return publicActions.has(action) || adminActions.has(action)
}

function isArenaLeaderboardRelease(release: AnyRecord): boolean {
  return release.evaluationMode === 'codex_single' && release.profileStatus === 'published'
}

function hasPublicReproducibleMethodologySuite(release: AnyRecord): boolean {
  const methodology = release.methodology
  return isArenaLeaderboardRelease(release)
    && release.suiteId === PB_IMAGE_LIGHT_V1.id
    && release.suiteHash === PB_IMAGE_LIGHT_V1.manifestHash
    && typeof methodology === 'object'
    && methodology !== null
    && !Array.isArray(methodology)
    && methodology.suiteId === PB_IMAGE_LIGHT_V1.id
    && methodology.suiteHash === PB_IMAGE_LIGHT_V1.manifestHash
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

const evidenceHashPattern = /^[a-f0-9]{64}$/i
const evidenceKinds = new Set(['thumbnail', 'detail', 'full'])

function exactPublicScores(value: unknown): value is Record<string, number> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value as AnyRecord).length === BENCHMARK_AXES.length
    && BENCHMARK_AXES.every((axis) => Number.isFinite((value as AnyRecord)[axis]) && (value as AnyRecord)[axis] >= 0 && (value as AnyRecord)[axis] <= 10))
}

function publicPixelFacts(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const pixels = value as AnyRecord
  if (![pixels.width, pixels.height, pixels.megapixels, pixels.fileSizeBytes].every(Number.isFinite)
    || pixels.width <= 0 || pixels.height <= 0 || pixels.megapixels <= 0 || pixels.fileSizeBytes <= 0) return null
  return { width: pixels.width, height: pixels.height, megapixels: pixels.megapixels, fileSizeBytes: pixels.fileSizeBytes }
}

async function publicEvidenceItems(input: {
  rawItems: AnyRecord[]
  releaseHash: string
  eligibleProfiles: Set<string>
  signEvidence: (key: string) => Promise<string>
  verifyEvidence: (key: string, hash: string) => Promise<void>
}) {
  const output: AnyRecord[] = []
  for (const item of input.rawItems) {
    const imageHash = String(item.imageHash || '')
    const profileId = String(item.profileId || '')
    const reviewNotes = Array.isArray(item.reviewNotes) ? item.reviewNotes : []
    const pixels = publicPixelFacts(item.actualOutputPixels)
    if (item.sourceReleaseHash !== input.releaseHash || !input.eligibleProfiles.has(profileId)
      || !String(item.sampleId || '') || !String(item.modelId || '')
      || !PB_IMAGE_LIGHT_V1.cases.some((benchmarkCase) => benchmarkCase.id === item.caseId)
      || !evidenceHashPattern.test(imageHash) || !pixels || !exactPublicScores(item.scores)
      || !reviewNotes.length || reviewNotes.length > 20
      || reviewNotes.some((note: unknown) => typeof note !== 'string' || !note.trim() || note.length > 500)
      || !Array.isArray(item.variants) || !item.variants.length || item.variants.length > 3) continue
    const variants: AnyRecord[] = []
    for (const variant of item.variants) {
      const objectKey = String(variant.objectKey || '')
      const renditionHash = String(variant.imageHash || '')
      if (!evidenceKinds.has(String(variant.kind || '')) || variant.mimeType !== 'image/webp'
        || !objectKey.startsWith(`bench/public/evidence/${imageHash}/`) || !objectKey.endsWith('.webp') || objectKey.includes('..')
        || !evidenceHashPattern.test(renditionHash)
        || ![variant.width, variant.height, variant.fileSizeBytes].every(Number.isFinite)
        || variant.width <= 0 || variant.height <= 0 || variant.fileSizeBytes <= 0) {
        variants.length = 0
        break
      }
      await input.verifyEvidence(objectKey, renditionHash)
      variants.push({
        kind: variant.kind, width: variant.width, height: variant.height, fileSizeBytes: variant.fileSizeBytes,
        mimeType: 'image/webp', imageHash: renditionHash, url: await input.signEvidence(objectKey),
      })
    }
    if (!variants.length) continue
    output.push({
      sampleId: String(item.sampleId), profileId, modelId: String(item.modelId), caseId: String(item.caseId), imageHash,
      actualOutputPixels: pixels, scores: structuredClone(item.scores), reviewNotes: reviewNotes.map((note: string) => note.trim()), variants,
    })
  }
  return output
}

function promptText(value: unknown, maxLength: number, required = false) {
  const normalized = String(value || '').trim().replace(/\r\n?/g, '\n')
  if ((required && normalized.length < 3) || normalized.length > maxLength
    || /<\/?[A-Za-z][^>]*>/.test(normalized) || /(?:https?:\/\/|www\.)/i.test(normalized)) throw new Error('BENCHMARK_PROMPT_INVALID')
  return normalized
}

function normalizedPromptSubmission(body: AnyRecord) {
  const userId = String(body.userId || '').trim()
  if (!userId) throw new Error('BENCHMARK_PROMPT_LOGIN_REQUIRED')
  return {
    userId,
    clientIp: String(body.clientIp || '').trim().slice(0, 80),
    prompt: promptText(body.prompt, 4_000, true),
    capability: promptText(body.capability, 1_000, true),
    requiredElements: promptText(body.requiredElements, 1_000),
    forbiddenResults: promptText(body.forbiddenResults, 1_000),
    notes: promptText(body.notes, 1_000),
  }
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
  publicEvidenceForRelease?(releaseHash: string, query: { profileId?: string; caseId?: string; cursor?: string; limit: number }): Promise<{ items: AnyRecord[]; nextCursor: string | null }>
  submitPrompt?(input: AnyRecord): Promise<unknown>
  promptQueue?(input: AnyRecord): Promise<AnyRecord[]>
  savePromptDigest?(input: AnyRecord): Promise<unknown>
  decidePrompt?(input: AnyRecord): Promise<unknown>
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
        const result = profile && repository.publicEvidenceForRelease
          ? await repository.publicEvidenceForRelease(String(published.releaseHash || ''), { profileId: profile.profileId, limit: 4 })
          : null
        const evidence = result ? await publicEvidenceItems({
          rawItems: result.items, releaseHash: String(published.releaseHash || ''), eligibleProfiles: new Set(published.models.map((model: AnyRecord) => String(model.profileId || ''))),
          signEvidence, verifyEvidence,
        }) : []
        const publicCases = publicArenaMethodologySuite().cases.filter((benchmarkCase: AnyRecord) => evidence.some((item: AnyRecord) => item.caseId === benchmarkCase.id))
        return profile
          ? { code: 0, profile: { ...profile, release: { ...published, models: undefined }, cases: publicCases, evidence } }
          : { code: 404, error: 'Benchmark profile not found' }
      }
      if (action === 'benchmarkCaseEvidence') {
        const caseId = String(body.caseId || '').trim()
        const benchmarkCase = PB_IMAGE_LIGHT_V1.cases.find((item) => item.id === caseId)
        if (!benchmarkCase) return { code: 404, error: 'Benchmark case not found' }
        const limit = Math.max(1, Math.min(12, Number.isInteger(Number(body.limit)) ? Number(body.limit) : 12))
        const release = await repository.latestRelease()
        if (!release) return { code: 404, error: 'Benchmark release not found' }
        const published = await publicBenchmarkRelease(release, signEvidence, verifyEvidence)
        if (!isArenaLeaderboardRelease(release)) return { code: 404, error: 'Benchmark case evidence not found' }
        const result = repository.publicEvidenceForRelease
          ? await repository.publicEvidenceForRelease(String(published.releaseHash || ''), { caseId, cursor: String(body.cursor || ''), limit })
          : { items: [], nextCursor: null }
        const items = await publicEvidenceItems({
          rawItems: result.items, releaseHash: String(published.releaseHash || ''), eligibleProfiles: new Set(published.models.map((model: AnyRecord) => String(model.profileId || ''))),
          signEvidence, verifyEvidence,
        })
        const profiles = new Map(published.models.map((model: AnyRecord) => [String(model.profileId || ''), model]))
        return {
          code: 0,
          case: structuredClone(publicArenaMethodologySuite().cases.find((item: AnyRecord) => item.id === caseId)),
          items: items.map((item) => {
            const model = profiles.get(item.profileId) as AnyRecord | undefined
            return {
              ...item,
              model: model ? {
                profileId: model.profileId, modelId: model.modelId, displayName: model.displayName,
                overallRank: model.overallRank, overallScore: model.overallScore,
              } : { profileId: item.profileId, modelId: item.modelId },
            }
          }),
          nextCursor: result.nextCursor,
        }
      }
      if (action === 'benchmarkPromptSubmission') {
        if (!repository.submitPrompt) throw new Error('BENCHMARK_PROMPT_SUBMISSION_UNAVAILABLE')
        return { code: 0, submission: await repository.submitPrompt(normalizedPromptSubmission(body)) }
      }
      if (action === 'benchmarkMethodology') {
        const release = await repository.latestRelease()
        if (release) {
          const { _id: _storedId, releaseHash: storedHash, ...releaseBase } = release
          if (!storedHash || canonicalHash(releaseBase) !== storedHash) throw new Error('BENCHMARK_RELEASE_HASH_MISMATCH')
        }
        const reproducibleMethodology = release && hasPublicReproducibleMethodologySuite(release)
        return {
          code: 0,
          methodology: release ? publicMethodology(release.methodology, reproducibleMethodology ? arenaRankingMethod() : undefined) : null,
          releaseHash: release?.releaseHash || '',
          ...(reproducibleMethodology ? { suite: publicArenaMethodologySuite(), scoring: structuredClone(arenaMethodologyScoring) } : {}),
        }
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
      if (action === 'adminBenchmarkPromptQueue') {
        if (!repository.promptQueue) throw new Error('BENCHMARK_PROMPT_QUEUE_UNAVAILABLE')
        return { code: 0, submissions: await repository.promptQueue(body) }
      }
      if (action === 'adminBenchmarkPromptDigest') {
        if (!repository.savePromptDigest) throw new Error('BENCHMARK_PROMPT_DIGEST_UNAVAILABLE')
        return { code: 0, digest: await repository.savePromptDigest(body) }
      }
      if (action === 'adminBenchmarkPromptDecision') {
        if (!repository.decidePrompt) throw new Error('BENCHMARK_PROMPT_DECISION_UNAVAILABLE')
        return { code: 0, decision: await repository.decidePrompt(body) }
      }
      return { code: 0, release: await repository.publish(body) }
    },
  }
}
