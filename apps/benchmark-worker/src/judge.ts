import { BENCHMARK_AXES, type BenchmarkAxis } from '@paperbanana/benchmark-core'

type JudgeResult = {
  scores: Record<BenchmarkAxis, number>
  evidence: string[]
  redLines: Array<string | { code: string; axis?: BenchmarkAxis }>
  confidence: number
}

export function parseJudgeResponse(text: string): JudgeResult {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('BENCHMARK_JUDGE_JSON_INVALID') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('BENCHMARK_JUDGE_JSON_INVALID')
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  if (JSON.stringify(keys) !== JSON.stringify(['confidence', 'evidence', 'redLines', 'scores'])) throw new Error('BENCHMARK_JUDGE_JSON_INVALID')
  if (!record.scores || typeof record.scores !== 'object' || Array.isArray(record.scores)) throw new Error('BENCHMARK_JUDGE_JSON_INVALID')
  const scoreRecord = record.scores as Record<string, unknown>
  if (JSON.stringify(Object.keys(scoreRecord).sort()) !== JSON.stringify([...BENCHMARK_AXES].sort())) throw new Error('BENCHMARK_JUDGE_JSON_INVALID')
  const scores = {} as Record<BenchmarkAxis, number>
  for (const axis of BENCHMARK_AXES) {
    const score = Number(scoreRecord[axis])
    if (!Number.isFinite(score) || score < 0 || score > 10) throw new Error('BENCHMARK_JUDGE_JSON_INVALID')
    scores[axis] = score
  }
  if (!Array.isArray(record.evidence) || record.evidence.some((item) => typeof item !== 'string')) throw new Error('BENCHMARK_JUDGE_JSON_INVALID')
  if (!Array.isArray(record.redLines)) throw new Error('BENCHMARK_JUDGE_JSON_INVALID')
  const confidence = Number(record.confidence)
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('BENCHMARK_JUDGE_JSON_INVALID')
  return { scores, evidence: record.evidence as string[], redLines: record.redLines as JudgeResult['redLines'], confidence }
}

export async function judgeWithSingleRepair(invoke: (repair: boolean, malformed?: string) => Promise<string>) {
  const first = await invoke(false)
  try { return parseJudgeResponse(first) } catch (error) {
    if ((error as Error).message !== 'BENCHMARK_JUDGE_JSON_INVALID') throw error
    return parseJudgeResponse(await invoke(true, first))
  }
}

export const JUDGE_MODELS = Object.freeze({
  openrouter: 'google/gemini-3.7-flash',
  bailian: 'qwen3.7-plus',
})

export function benchmarkJudgePrompt(input: { rubric: unknown; caption: string }) {
  return [
    'You are a blind evaluator. The tested model identity is intentionally unavailable.',
    'Score only visible evidence from 0 to 10 on exactly seven axes.',
    'Return strict JSON with exactly scores, evidence, redLines, confidence; no markdown.',
    `Rubric: ${JSON.stringify(input.rubric)}`,
    `Expected caption: ${input.caption}`,
  ].join('\n')
}
