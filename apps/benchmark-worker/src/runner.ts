import { aggregateAxisScores, buildAuditSelection, canonicalHash } from '@paperbanana/benchmark-core'

type DiagnosticCase = {
  id: string
  renderPrompt: string
  negativePrompt: string
  aspectRatio: string
  rubric: unknown
  caption: string
  manifestHash: string
}

type Run = {
  runId: string
  phase: 'quick' | 'full'
  provider: string
  modelId: string
  lane: '1K-standard' | '2K-standard' | '4K-standard'
  repetitions: number
  runHash?: string
  expectedCaseCount?: number
  capabilityGaps?: string[]
}

type Sample = {
  sampleId: string
  runId: string
  caseId: string
  repetition: number
  imageBase64?: string
  imageObjectKey?: string
  imageHash: string
  latencyMs?: number
  rubric: unknown
  rubricHash: string
  caption: string
}

type Judgment = {
  sampleId: string
  provider: 'openrouter' | 'bailian'
  scores: Record<string, number>
  evidence: string[]
  redLines: unknown[]
  confidence: number
}

type RunnerRepository = {
  findSample(sampleId: string): Promise<Sample | null>
  saveSample(sample: Sample): Promise<void>
  findJudgment(sampleId: string, provider: Judgment['provider']): Promise<Judgment | null>
  saveJudgment(judgment: Judgment): Promise<void>
  markAudits?(sampleIds: string[]): Promise<void>
  completeRun(nextState: 'quick_review' | 'codex_audit', summary?: Record<string, unknown>): Promise<void>
}

export async function executeBenchmarkRun(input: {
  run: Run
  cases: DiagnosticCase[]
  generate(sample: {
    sampleId: string
    caseId: string
    repetition: number
    prompt: string
    aspectRatio: string
    lane: Run['lane']
    provider: string
    modelId: string
  }): Promise<{ imageBase64?: string; imageObjectKey?: string; imageHash: string; latencyMs?: number }>
  judge(provider: Judgment['provider'], sample: Sample): Promise<Omit<Judgment, 'sampleId' | 'provider'>>
  repository: RunnerRepository
}) {
  const materialized: Sample[] = []
  for (const diagnosticCase of input.cases) {
    for (let repetition = 0; repetition < input.run.repetitions; repetition += 1) {
      const sampleId = `sample:${canonicalHash([input.run.runId, diagnosticCase.id, repetition])}`
      let sample = await input.repository.findSample(sampleId)
      if (!sample) {
        const generated = await input.generate({
          sampleId,
          caseId: diagnosticCase.id,
          repetition,
          prompt: `${diagnosticCase.renderPrompt}\n\nNegative constraints: ${diagnosticCase.negativePrompt}`,
          aspectRatio: diagnosticCase.aspectRatio,
          lane: input.run.lane,
          provider: input.run.provider,
          modelId: input.run.modelId,
        })
        sample = {
          sampleId,
          runId: input.run.runId,
          caseId: diagnosticCase.id,
          repetition,
          ...generated,
          rubric: diagnosticCase.rubric,
          rubricHash: canonicalHash(diagnosticCase.rubric),
          caption: diagnosticCase.caption,
        }
        await input.repository.saveSample(sample)
      }
      materialized.push(sample)
    }
  }

  const judgments = new Map<string, Judgment[]>()
  for (const judgeProvider of ['openrouter', 'bailian'] as const) {
    for (const sample of materialized) {
      let judgment = await input.repository.findJudgment(sample.sampleId, judgeProvider)
      if (!judgment) {
        judgment = { sampleId: sample.sampleId, provider: judgeProvider, ...(await input.judge(judgeProvider, sample)) }
        await input.repository.saveJudgment(judgment)
      }
      const list = judgments.get(sample.sampleId) || []
      list.push(judgment)
      judgments.set(sample.sampleId, list)
    }
  }

  const auditCandidates = materialized.map((sample) => {
    const pair = judgments.get(sample.sampleId) || []
    const axisDifferences = pair.length === 2
      ? Object.keys(pair[0].scores).map((axis) => Math.abs(Number(pair[0].scores[axis]) - Number(pair[1].scores[axis])))
      : [10]
    return {
      sampleId: sample.sampleId,
      disagreement: Math.max(...axisDifferences),
      redLineConflict: pair.length === 2 && JSON.stringify(pair[0].redLines) !== JSON.stringify(pair[1].redLines),
      anomalous: pair.length !== 2 || pair.some((judgment) => judgment.confidence < 0.35 || !judgment.evidence.length || Object.keys(judgment.scores).length !== 7),
      publicEvidence: false,
    }
  })
  const auditSampleIds = buildAuditSelection(auditCandidates, input.run.runHash || canonicalHash(input.run))
  await input.repository.markAudits?.(auditSampleIds)
  const scoreObservations = materialized.map((sample) => {
    const pair = judgments.get(sample.sampleId) || []
    const scores = Object.fromEntries(Object.keys(pair[0]?.scores || {}).map((axis) => [
      axis,
      pair.reduce((sum, judgment) => sum + Number(judgment.scores[axis] || 0), 0) / Math.max(1, pair.length),
    ]))
    return { caseId: sample.caseId, scores }
  })
  const dimensions = aggregateAxisScores(scoreObservations, { seed: input.run.runHash || input.run.runId })
  const latencies = materialized.map((sample) => Number(sample.latencyMs || 0)).filter((value) => value > 0).sort((left, right) => left - right)
  const percentile = (probability: number) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * probability))] / 1_000 : 0
  const nextState = input.run.phase === 'quick' ? 'quick_review' : 'codex_audit'
  await input.repository.completeRun(nextState, {
    sampleCount: materialized.length,
    judgmentCount: materialized.length * 2,
    auditSampleCount: auditSampleIds.length,
    auditRatio: materialized.length ? auditSampleIds.length / materialized.length : 0,
    releaseDraft: {
      models: [{
        modelId: input.run.modelId,
        provider: input.run.provider,
        lane: input.run.lane,
        profileStatus: input.run.phase === 'quick' ? 'provisional' : 'verified',
        sampleCount: materialized.length,
        coverage: (input.run.expectedCaseCount || input.cases.length) ? new Set(materialized.map((sample) => sample.caseId)).size / (input.run.expectedCaseCount || input.cases.length) : 0,
        capabilityCoverage: (input.run.expectedCaseCount || input.cases.length) ? input.cases.length / (input.run.expectedCaseCount || input.cases.length) : 0,
        capabilityGaps: input.run.capabilityGaps || [],
        dimensions,
        latency: { p50Seconds: percentile(0.5), p90Seconds: percentile(0.9) },
      }],
      evidence: [],
      methodology: { suiteId: 'pb-image-diagnostic-v1', aggregation: 'case-first-bootstrap', noOverallScore: true, auditPolicy: 'disagreement-v1:red-line-conflict,confidence-below-0.35,invalid-evidence,public-evidence,deterministic-10-percent' },
    },
  })
  return { nextState, sampleCount: materialized.length, judgmentCount: materialized.length * 2, auditSampleIds }
}
