import { BENCHMARK_AXES, PB_IMAGE_DIAGNOSTIC_V1, canonicalHash, type BenchmarkLane } from '@paperbanana/benchmark-core'

export const BENCHMARK_CANARY_CASE_IDS = Object.freeze([
  'complex_topology-01',
  'math_symbols-01',
] as const)

type CanaryJudgment = {
  scores: Record<string, number>
  evidence: string[]
  redLines: unknown[]
  confidence: number
}

export async function executeBenchmarkCanary(input: {
  provider: 'bailian' | 'openrouter' | 'ark'
  modelId: string
  lane: BenchmarkLane
  generate(sample: { caseId: string; prompt: string; aspectRatio: string; lane: BenchmarkLane; provider: string; modelId: string }): Promise<{ imageHash: string; imageObjectKey: string; latencyMs: number }>
  judge(provider: 'openrouter' | 'bailian', sample: { caseId: string; imageHash: string; imageObjectKey: string; rubric: unknown; caption: string }): Promise<CanaryJudgment>
}) {
  const cases = BENCHMARK_CANARY_CASE_IDS.map((caseId) => {
    const diagnosticCase = PB_IMAGE_DIAGNOSTIC_V1.cases.find((item) => item.id === caseId)
    if (!diagnosticCase) throw new Error(`BENCHMARK_CANARY_CASE_MISSING:${caseId}`)
    return diagnosticCase
  })
  const samples = []
  for (const diagnosticCase of cases) {
    const generated = await input.generate({
      caseId: diagnosticCase.id,
      prompt: `${diagnosticCase.renderPrompt}\n\nNegative constraints: ${diagnosticCase.negativePrompt}`,
      aspectRatio: diagnosticCase.aspectRatio,
      lane: input.lane,
      provider: input.provider,
      modelId: input.modelId,
    })
    if (!/^[A-Za-z0-9._:-]{3,200}$/.test(generated.imageHash) || !generated.imageObjectKey.startsWith('bench/')) throw new Error('BENCHMARK_CANARY_IMAGE_INVALID')
    samples.push({ caseId: diagnosticCase.id, rubric: diagnosticCase.rubric, caption: diagnosticCase.caption, ...generated })
  }
  const judgments = []
  for (const provider of ['openrouter', 'bailian'] as const) {
    for (const sample of samples) {
      const judgment = await input.judge(provider, sample)
      const valid = BENCHMARK_AXES.every((axis) => Number.isFinite(Number(judgment.scores?.[axis])))
        && Array.isArray(judgment.evidence) && judgment.evidence.length > 0
        && Number.isFinite(judgment.confidence)
      if (!valid) throw new Error('BENCHMARK_CANARY_JUDGMENT_INVALID')
      judgments.push({ provider, caseId: sample.caseId, imageHash: sample.imageHash, ...judgment })
    }
  }
  const reportBase = {
    provider: input.provider,
    modelId: input.modelId,
    lane: input.lane,
    suiteId: PB_IMAGE_DIAGNOSTIC_V1.id,
    suiteHash: PB_IMAGE_DIAGNOSTIC_V1.manifestHash,
    caseIds: [...BENCHMARK_CANARY_CASE_IDS],
    sampleCount: samples.length,
    judgmentCount: judgments.length,
    samples: samples.map(({ rubric: _rubric, caption: _caption, ...sample }) => sample),
    judgments,
    passed: samples.length === 2 && judgments.length === 4,
  }
  return { ...reportBase, reportHash: canonicalHash(reportBase) }
}
