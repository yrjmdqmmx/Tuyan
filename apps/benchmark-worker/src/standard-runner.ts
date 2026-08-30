import { aggregateAxisScores, benchmarkSampleId, canonicalHash } from '@paperbanana/benchmark-core'

import { UnknownProviderOutcomeError } from './provider-operation.js'

type DiagnosticCase = {
  id: string
  renderPrompt: string
  negativePrompt: string
  aspectRatio: string
  rubric: unknown
  caption: string
  manifestHash: string
  requiredEntities?: string[]
  requiredRelations?: string[]
  requiredText?: string[]
  forbidden?: string[]
}

type StandardRun = {
  runId: string
  phase: 'standard'
  provider: string
  modelId: string
  canonicalModelId?: string
  primaryAccessProvider?: string
  alternateAccessProviders?: string[]
  lane: '1K-standard' | '2K-standard' | '4K-standard' | null
  repetitions: 1
  runHash?: string
  operatorAuthorizationHash?: string
}

type PixelFacts = { width: number; height: number; megapixels: number; fileSizeBytes: number }
type StandardSample = {
  sampleId: string
  runId: string
  phase: 'standard'
  caseId: string
  repetition: 0
  imageBase64?: string
  imageObjectKey?: string
  imageHash: string
  latencyMs?: number
  actualOutputPixels: PixelFacts
  rubric: unknown
  rubricHash: string
  caption: string
  caseRequirements: Record<string, unknown>
  requirementsHash: string
  publicRenditions?: Array<Record<string, unknown>>
}

type StandardRepository = {
  findSample(sampleId: string): Promise<StandardSample | null>
  saveSample(sample: StandardSample): Promise<void>
  recordGenerationFailure(failure: { sampleId: string; caseId: string; phase: 'standard'; errorCode: string }): Promise<void>
  markAudits(sampleIds: string[]): Promise<void>
  completeRun(nextState: 'codex_review', summary: Record<string, any>): Promise<void>
}

function resolutionRequest(lane: StandardRun['lane']) {
  return lane ? lane.slice(0, 2) : 'provider-default'
}

export async function executeStandardBenchmarkRun(input: {
  run: StandardRun
  cases: DiagnosticCase[]
  generate(sample: {
    sampleId: string
    phase: 'standard'
    caseId: string
    repetition: 0
    prompt: string
    aspectRatio: string
    resolutionRequest: string
    provider: string
    modelId: string
  }): Promise<{ imageBase64?: string; imageObjectKey?: string; imageHash: string; latencyMs?: number; actualOutputPixels: PixelFacts; publicRenditions?: Array<Record<string, unknown>> }>
  repository: StandardRepository
}) {
  if (input.run.repetitions !== 1 || input.cases.length !== 4) throw new Error('BENCHMARK_STANDARD_SHAPE_INVALID')
  const materialized: StandardSample[] = []
  for (const diagnosticCase of input.cases) {
    const sampleId = benchmarkSampleId(input.run.runId, 'standard', diagnosticCase.id, 0)
    let sample = await input.repository.findSample(sampleId)
    if (!sample) {
      try {
        const generated = await input.generate({
          sampleId,
          phase: 'standard',
          caseId: diagnosticCase.id,
          repetition: 0,
          prompt: `${diagnosticCase.renderPrompt}\n\nNegative constraints: ${diagnosticCase.negativePrompt}`,
          aspectRatio: diagnosticCase.aspectRatio,
          resolutionRequest: resolutionRequest(input.run.lane),
          provider: input.run.provider,
          modelId: input.run.modelId,
        })
        const caseRequirements = {
          caption: diagnosticCase.caption,
          requiredEntities: diagnosticCase.requiredEntities || [],
          requiredRelations: diagnosticCase.requiredRelations || [],
          requiredText: diagnosticCase.requiredText || [],
          forbidden: diagnosticCase.forbidden || [],
          aspectRatio: diagnosticCase.aspectRatio,
          caseManifestHash: diagnosticCase.manifestHash,
        }
        sample = {
          sampleId, runId: input.run.runId, phase: 'standard', caseId: diagnosticCase.id, repetition: 0,
          ...generated,
          rubric: diagnosticCase.rubric,
          rubricHash: canonicalHash(diagnosticCase.rubric),
          caption: diagnosticCase.caption,
          caseRequirements,
          requirementsHash: canonicalHash(caseRequirements),
        }
        await input.repository.saveSample(sample)
      } catch (error) {
        if (error instanceof UnknownProviderOutcomeError || /UNKNOWN_PROVIDER_OUTCOME|unknown after dispatch|timed out after dispatch/i.test(String((error as Error)?.message || error))) throw error
        await input.repository.recordGenerationFailure({
          sampleId, caseId: diagnosticCase.id, phase: 'standard',
          errorCode: String((error as Error)?.message || 'BENCHMARK_GENERATION_FAILED').slice(0, 160),
        })
        continue
      }
    }
    materialized.push(sample)
  }
  const auditSampleIds = materialized.map((sample) => sample.sampleId).sort()
  await input.repository.markAudits(auditSampleIds)
  const latencyValues = materialized.map((sample) => Number(sample.latencyMs || 0)).filter((value) => value > 0).sort((a, b) => a - b)
  const percentile = (p: number) => latencyValues.length ? latencyValues[Math.min(latencyValues.length - 1, Math.floor((latencyValues.length - 1) * p))] / 1_000 : 0
  const ranked = materialized.length >= 3
  const profile = {
    canonicalModelId: input.run.canonicalModelId || input.run.modelId,
    modelId: input.run.modelId,
    provider: input.run.provider,
    primaryAccessProvider: input.run.primaryAccessProvider || input.run.provider,
    alternateAccessProviders: input.run.alternateAccessProviders || [],
    lane: input.run.lane || 'provider-default',
    profileStatus: 'published',
    sampleCount: materialized.length,
    coverage: materialized.length / 4,
    successRate: materialized.length / 4,
    ranked,
    unrankedReason: ranked ? undefined : 'INSUFFICIENT_SAMPLES',
    dimensions: aggregateAxisScores([], { seed: input.run.runHash || input.run.runId }),
    actualOutputPixels: materialized.map((sample) => sample.actualOutputPixels),
    latency: { p50Seconds: percentile(0.5), p90Seconds: percentile(0.9) },
  }
  await input.repository.completeRun('codex_review', {
    ...(input.run.operatorAuthorizationHash ? { operatorAuthorizationHash: input.run.operatorAuthorizationHash } : {}),
    sampleCount: materialized.length,
    judgmentCount: 0,
    auditSampleCount: materialized.length,
    auditRatio: materialized.length ? 1 : 0,
    releaseDraft: {
      models: [profile], evidence: [],
      methodology: {
        suiteId: 'pb-image-light-v1', aggregation: 'case-first-bootstrap', noOverallScore: true,
        evaluationMode: 'codex_single', evaluationEpoch: 'codex-single-2026-08-v1',
        reviewProtocol: 'codex-single-two-pass-v1', reviewerKind: 'codex', reviewerPasses: 2,
        automaticJudges: [], repetitionsPerCase: 1,
      },
    },
  })
  return { nextState: 'codex_review' as const, sampleCount: materialized.length, judgmentCount: 0, auditSampleIds, ranked }
}
