import {
  BENCHMARK_AXES,
  PB_IMAGE_LIGHT_V1,
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_BENCHMARK_AXES,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  canonicalHash,
} from '@paperbanana/benchmark-core'

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
const scientificRankingMethod = () => ({
  id: 'ten_dimension_raw_equal_weight_mean',
  axes: [...SCIENTIFIC_BENCHMARK_AXES],
  weights: SCIENTIFIC_BENCHMARK_AXES.map(() => 1 / SCIENTIFIC_BENCHMARK_AXES.length),
  tieMethod: 'competition',
})
const scientificMethodologyScoring = Object.freeze({
  scoreMin: 0,
  scoreMax: 10,
  axes: [...SCIENTIFIC_BENCHMARK_AXES],
  overallFormula: 'ten_dimension_raw_equal_weight_mean',
  tieMethod: 'competition',
  failureScore: 0,
  unsupportedScore: 0,
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

function publicScientificMethodologySuite(): AnyRecord {
  return {
    id: PB_SCIENTIFIC_FIGURE_V2.id,
    version: PB_SCIENTIFIC_FIGURE_V2.version,
    language: PB_SCIENTIFIC_FIGURE_V2.language,
    caseCount: PB_SCIENTIFIC_FIGURE_V2.caseCount,
    manifestHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    cases: PB_SCIENTIFIC_FIGURE_V2.cases.map((scientificCase) => ({
      id: scientificCase.id,
      kind: scientificCase.kind,
      title: scientificCase.title,
      instruction: scientificCase.instruction,
      applicableAxes: [...scientificCase.applicableAxes],
      rubric: structuredClone(scientificCase.rubric),
      manifestHash: scientificCase.manifestHash,
      ...(scientificCase.kind === 'generation'
        ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
        : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
    })),
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

function isScientificLeaderboardRelease(release: AnyRecord): boolean {
  return release.evaluationMode === SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode
    && release.profileStatus === 'published'
    && release.suiteId === SCIENTIFIC_BENCHMARK_IDENTITY.suiteId
    && release.suiteHash === PB_SCIENTIFIC_FIGURE_V2.manifestHash
    && release.presentationVersion === SCIENTIFIC_BENCHMARK_IDENTITY.presentationVersion
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
    'scores', 'generationSuccessRate', 'editSuccessRate', 'attemptSummary', 'failureReasons', 'evidence',
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
    'presentationVersion', 'expectedCaseCount', 'dimensions', 'overallFormula', 'tieMethod', 'failureScore',
    'retryPolicy', 'routePriority', 'providerBudgetsCny', 'blindReview', 'automaticJudgmentCount',
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
const scientificPublicReviewNotes = new Set([
  '加分：双盲审核未确认红线问题',
  '加分：局部编辑准确',
  '扣分：缺少题目要求的关键内容',
  '扣分：存在科学事实偏差',
  '扣分：结构或拓扑关系错误',
  '扣分：文字或符号表达错误',
  '扣分：定量表达不准确',
  '扣分：未完整遵循生成或编辑指令',
  '扣分：信息层级或可读性不足',
  '扣分：未达到出版级视觉质量',
  '扣分：未准确完成目标区域编辑',
  '扣分：非目标区域发生不当变化',
])
const scientificSuccessClasses = new Set(['succeeded', 'succeeded_low_quality'])
const scientificConfirmedFailureClasses = new Set(['confirmed_technical_failure', 'confirmed_provider_failure'])

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

async function publicScientificEvidenceItems(input: {
  rawItems: AnyRecord[]
  releaseHash: string
  eligibleProfiles: Set<string>
  signEvidence: (key: string) => Promise<string>
  verifyEvidence: (key: string, hash: string) => Promise<void>
}) {
  const output: AnyRecord[] = []
  for (const item of input.rawItems) {
    const profileId = String(item.profileId || '')
    const scientificCase = PB_SCIENTIFIC_FIGURE_V2.cases.find((candidate) => candidate.id === item.caseId)
    const attemptSummary = publicScientificAttemptSummary(item.attemptSummary, item.status, item.failureReason)
    if (!scientificCase || item.sourceReleaseHash !== input.releaseHash || !input.eligibleProfiles.has(profileId)
      || !['succeeded', 'failed', 'unsupported'].includes(item.status)
      || !attemptSummary) continue
    const base: AnyRecord = {
      profileId,
      canonicalModelId: String(item.canonicalModelId || ''),
      overallRank: item.overallRank,
      caseId: scientificCase.id,
      kind: scientificCase.kind,
      status: item.status,
      requestedResolution: item.requestedResolution,
      attemptSummary,
    }
    if (item.status !== 'succeeded') {
      if ((item.status === 'failed' && !['confirmed_attempts_exhausted', 'provider_canary_confirmed_failed'].includes(item.failureReason))
        || (item.status === 'failed' && !['1K', '2K', 'provider-default'].includes(String(item.requestedResolution || '')))
        || (item.status === 'unsupported' && item.requestedResolution !== null)
        || (item.status === 'unsupported' && scientificCase.kind === 'generation' && item.failureReason !== 'capability_unsupported')
        || (item.status === 'unsupported' && scientificCase.kind === 'edit' && item.failureReason !== 'direct_edit_route_unavailable')) continue
      output.push({ ...base, failureReason: String(item.failureReason || '') })
      continue
    }
    const actualOutputPixels = publicPixelFacts(item.actualOutputPixels)
    if (!['1K', '2K', 'provider-default'].includes(String(item.requestedResolution || ''))
      || !actualOutputPixels || !evidenceHashPattern.test(String(item.imageHash || '')) || !Array.isArray(item.variants) || !item.variants.length
      || !exactScientificPublicScores(item.scores, scientificCase.applicableAxes)) continue
    const signVariants = async (rawVariants: AnyRecord[], sourceHash: string) => {
      const variants: AnyRecord[] = []
      for (const variant of rawVariants) {
        const objectKey = String(variant.objectKey || '')
        if (!evidenceKinds.has(String(variant.kind || '')) || variant.mimeType !== 'image/webp'
          || !objectKey.startsWith(`bench/scientific-v2/public/${sourceHash}/`) || objectKey.includes('..') || !objectKey.endsWith('.webp')
          || !evidenceHashPattern.test(String(variant.imageHash || ''))
          || ![variant.width, variant.height, variant.fileSizeBytes].every(Number.isFinite)) return []
        await input.verifyEvidence(objectKey, variant.imageHash)
        variants.push({
          kind: variant.kind, imageHash: variant.imageHash, width: variant.width, height: variant.height,
          fileSizeBytes: variant.fileSizeBytes, mimeType: 'image/webp', url: await input.signEvidence(objectKey),
        })
      }
      return variants
    }
    const variants = await signVariants(item.variants, item.imageHash)
    if (!variants.length) continue
    let beforeVariants: AnyRecord[] | undefined
    if (scientificCase.kind === 'edit') {
      if (item.sourceHash !== scientificCase.sourceHash || item.editedHash !== item.imageHash || !Array.isArray(item.beforeVariants)) continue
      beforeVariants = await signVariants(item.beforeVariants, scientificCase.sourceHash)
      if (!beforeVariants.length) continue
    }
    output.push({
      ...base,
      imageHash: item.imageHash,
      actualOutputPixels,
      scores: structuredClone(item.scores),
      reviewNotes: Array.isArray(item.reviewNotes)
        ? item.reviewNotes.map(String).filter((note: string) => scientificPublicReviewNotes.has(note)).slice(0, 10)
        : [],
      variants,
      ...(scientificCase.kind === 'edit' ? {
        sourceHash: scientificCase.sourceHash,
        editedHash: item.imageHash,
        region: scientificCase.region,
        beforeVariants,
      } : {}),
    })
  }
  return output
}

function publicScientificAttemptSummary(value: unknown, status: unknown, failureReason: unknown): { count: number; responseClasses: string[] } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const summary = value as AnyRecord
  if (!Number.isInteger(summary.count) || summary.count < 0 || summary.count > 4
    || !Array.isArray(summary.responseClasses) || summary.responseClasses.length !== summary.count
    || summary.responseClasses.some((responseClass) => typeof responseClass !== 'string')) return null
  const responseClasses = summary.responseClasses.map(String)
  if (status === 'succeeded' && (summary.count < 1 || !scientificSuccessClasses.has(responseClasses.at(-1) || '')
    || responseClasses.slice(0, -1).some((responseClass) => !scientificConfirmedFailureClasses.has(responseClass)))) return null
  if (status === 'failed' && (failureReason === 'provider_canary_confirmed_failed'
    ? summary.count !== 0 || responseClasses.length !== 0
    : failureReason !== 'confirmed_attempts_exhausted' || summary.count !== 4
      || responseClasses.some((responseClass) => !scientificConfirmedFailureClasses.has(responseClass)))) return null
  if (status === 'unsupported' && (summary.count !== 0 || responseClasses.length !== 0)) return null
  return { count: summary.count, responseClasses }
}

function exactScientificPublicScores(value: unknown, axes: readonly string[]): value is Record<string, number> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value as AnyRecord).length === axes.length
    && axes.every((axis) => Number.isFinite((value as AnyRecord)[axis]) && (value as AnyRecord)[axis] >= 0 && (value as AnyRecord)[axis] <= 10))
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
  const scientificLeaderboard = isScientificLeaderboardRelease(release)
  const models = Array.isArray(release.models) ? release.models : []
  const rankingMethod = scientificLeaderboard ? scientificRankingMethod() : arenaLeaderboard ? arenaRankingMethod() : undefined
  const publicModels: AnyRecord[] = scientificLeaderboard
    ? models.map((model: AnyRecord) => publicModel(model, true))
    : arenaLeaderboard
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
    ...((arenaLeaderboard || scientificLeaderboard) ? {
      sourceReleaseHash: release.releaseHash,
      presentationVersion: scientificLeaderboard ? SCIENTIFIC_BENCHMARK_IDENTITY.presentationVersion : 'arena-leaderboard-v1',
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
        const scientific = isScientificLeaderboardRelease(release)
        const profile = published.models.find((model: AnyRecord) => profileId ? model.profileId === profileId : model.modelId === modelId && (!provider || model.provider === provider) && (!lane || model.lane === lane))
        const result = profile && repository.publicEvidenceForRelease
          ? await repository.publicEvidenceForRelease(String(published.releaseHash || ''), { profileId: profile.profileId, limit: scientific ? 12 : 4 })
          : null
        const evidence = result ? await (scientific ? publicScientificEvidenceItems : publicEvidenceItems)({
          rawItems: result.items, releaseHash: String(published.releaseHash || ''), eligibleProfiles: new Set(published.models.map((model: AnyRecord) => String(model.profileId || ''))),
          signEvidence, verifyEvidence,
        }) : []
        const publicCases = (scientific ? publicScientificMethodologySuite() : publicArenaMethodologySuite()).cases
          .filter((benchmarkCase: AnyRecord) => evidence.some((item: AnyRecord) => item.caseId === benchmarkCase.id))
        return profile
          ? { code: 0, profile: { ...profile, release: { ...published, models: undefined }, cases: publicCases, evidence } }
          : { code: 404, error: 'Benchmark profile not found' }
      }
      if (action === 'benchmarkCaseEvidence') {
        const caseId = String(body.caseId || '').trim()
        const limit = Math.max(1, Math.min(12, Number.isInteger(Number(body.limit)) ? Number(body.limit) : 12))
        const release = await repository.latestRelease()
        if (!release) return { code: 404, error: 'Benchmark release not found' }
        const scientific = isScientificLeaderboardRelease(release)
        const benchmarkCase = scientific
          ? PB_SCIENTIFIC_FIGURE_V2.cases.find((item) => item.id === caseId)
          : PB_IMAGE_LIGHT_V1.cases.find((item) => item.id === caseId)
        if (!benchmarkCase) return { code: 404, error: 'Benchmark case not found' }
        const published = await publicBenchmarkRelease(release, signEvidence, verifyEvidence)
        if (!scientific && !isArenaLeaderboardRelease(release)) return { code: 404, error: 'Benchmark case evidence not found' }
        const result = repository.publicEvidenceForRelease
          ? await repository.publicEvidenceForRelease(String(published.releaseHash || ''), { caseId, cursor: String(body.cursor || ''), limit })
          : { items: [], nextCursor: null }
        const items = await (scientific ? publicScientificEvidenceItems : publicEvidenceItems)({
          rawItems: result.items, releaseHash: String(published.releaseHash || ''), eligibleProfiles: new Set(published.models.map((model: AnyRecord) => String(model.profileId || ''))),
          signEvidence, verifyEvidence,
        })
        const profiles = new Map(published.models.map((model: AnyRecord) => [String(model.profileId || ''), model]))
        return {
          code: 0,
          case: structuredClone((scientific ? publicScientificMethodologySuite() : publicArenaMethodologySuite()).cases.find((item: AnyRecord) => item.id === caseId)),
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
        const scientificMethodology = release && isScientificLeaderboardRelease(release)
        return {
          code: 0,
          methodology: release ? publicMethodology(release.methodology, scientificMethodology ? scientificRankingMethod() : reproducibleMethodology ? arenaRankingMethod() : undefined) : null,
          releaseHash: release?.releaseHash || '',
          ...(scientificMethodology
            ? { suite: publicScientificMethodologySuite(), scoring: structuredClone(scientificMethodologyScoring) }
            : reproducibleMethodology ? { suite: publicArenaMethodologySuite(), scoring: structuredClone(arenaMethodologyScoring) } : {}),
        }
      }
      if (action === 'adminBenchmarkCandidates') return { code: 0, candidates: await repository.candidates() }
      if (action === 'adminBenchmarkApprove') return { code: 0, approval: await repository.approve(body) }
      if (action === 'adminBenchmarkControl') return { code: 0, run: await repository.control(body) }
      if (action === 'adminBenchmarkReviewExport') {
        const packet = await repository.exportReview(body) as AnyRecord
        if (body.evaluationMode === SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode) {
          const bindings = new Map((Array.isArray(packet._objectBindings) ? packet._objectBindings : [])
            .map((binding: AnyRecord) => [String(binding.imageHash || ''), String(binding.objectKey || '')]))
          const { _objectBindings: _privateBindings, ...publicPacket } = packet
          return {
            code: 0,
            packet: {
              ...publicPacket,
              packages: await Promise.all((Array.isArray(packet.packages) ? packet.packages : []).map(async (reviewPackage: AnyRecord) => ({
                ...reviewPackage,
                items: await Promise.all((Array.isArray(reviewPackage.items) ? reviewPackage.items : []).map(async (item: AnyRecord) => {
                  const objectKey = bindings.get(String(item.imageHash || ''))
                  if (!objectKey) throw new Error('SCIENTIFIC_V2_REVIEW_OBJECT_BINDING_INVALID')
                  return { ...item, imageUrl: await signEvidence(objectKey) }
                })),
              }))),
            },
          }
        }
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
