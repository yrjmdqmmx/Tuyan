import { createHash } from 'node:crypto'

import { BENCHMARK_AXES, type BenchmarkAxis, type BenchmarkProfileStatus } from './contracts.js'

export type PartialAxisScores = Partial<Record<BenchmarkAxis, number>>

export interface ScoreObservation {
  caseId: string
  scores: PartialAxisScores
}

function round(value: number, places = 4) {
  const factor = 10 ** places
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function mean(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function seededUnit(seed: string, iteration: number, draw: number) {
  const digest = createHash('sha256').update(`${seed}:${iteration}:${draw}`).digest()
  return digest.readUInt32BE(0) / 0x1_0000_0000
}

function percentile(sorted: readonly number[], probability: number) {
  if (!sorted.length) return 0
  const index = (sorted.length - 1) * probability
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function bootstrapCi(values: readonly number[], iterations: number, seed: string) {
  if (values.length === 1) return { low: values[0], high: values[0] }
  const estimates = Array.from({ length: iterations }, (_, iteration) => {
    const resample = Array.from({ length: values.length }, (_, draw) => {
      const index = Math.floor(seededUnit(seed, iteration, draw) * values.length)
      return values[index]
    })
    return mean(resample)
  }).sort((left, right) => left - right)
  return { low: round(percentile(estimates, 0.025)), high: round(percentile(estimates, 0.975)) }
}

export function aggregateAxisScores(
  observations: readonly ScoreObservation[],
  options: { bootstrapIterations?: number; seed?: string } = {},
) {
  const bootstrapIterations = Math.max(100, Math.floor(options.bootstrapIterations || 2_000))
  const result = {} as Record<BenchmarkAxis, { mean: number; ci95: { low: number; high: number }; caseCount: number; sampleCount: number }>

  for (const axis of BENCHMARK_AXES) {
    const byCase = new Map<string, number[]>()
    for (const observation of observations) {
      const score = observation.scores[axis]
      if (typeof score !== 'number' || score < 0 || score > 10 || !Number.isFinite(score)) continue
      const values = byCase.get(observation.caseId) || []
      values.push(score)
      byCase.set(observation.caseId, values)
    }
    const caseMeans = [...byCase.values()].map(mean)
    const sampleCount = [...byCase.values()].reduce((sum, values) => sum + values.length, 0)
    result[axis] = {
      mean: caseMeans.length ? round(mean(caseMeans)) : 0,
      ci95: caseMeans.length
        ? bootstrapCi(caseMeans, bootstrapIterations, `${options.seed || 'paperbanana'}:${axis}`)
        : { low: 0, high: 0 },
      caseCount: caseMeans.length,
      sampleCount,
    }
  }
  return result
}

export interface AutomaticJudgment {
  scores: PartialAxisScores
  redLines: string[]
}

export interface CodexJudgment {
  scores: PartialAxisScores
  confirmedRedLines: Array<{ code: string; axis: BenchmarkAxis; cap: number }>
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : mean([sorted[middle - 1], sorted[middle]])
}

export function applyCodexAdjudication(input: { automatic: AutomaticJudgment[]; codex: CodexJudgment }) {
  if (input.automatic.length !== 2) throw new Error('TWO_AUTOMATIC_JUDGMENTS_REQUIRED')
  const scores: PartialAxisScores = {}
  for (const axis of BENCHMARK_AXES) {
    const values = [...input.automatic.map((judgment) => judgment.scores[axis]), input.codex.scores[axis]]
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    if (values.length) scores[axis] = round(median(values))
  }
  const appliedCaps = input.codex.confirmedRedLines.map((redLine) => ({ ...redLine }))
  for (const cap of appliedCaps) {
    if (typeof scores[cap.axis] === 'number') scores[cap.axis] = Math.min(scores[cap.axis]!, cap.cap)
  }
  return { scores, appliedCaps }
}

export interface AuditCandidate {
  sampleId: string
  disagreement: number
  redLineConflict: boolean
  anomalous: boolean
  publicEvidence: boolean
}

export function buildAuditSelection(samples: readonly AuditCandidate[], runHash: string) {
  const required = new Set(samples
    .filter((sample) => sample.disagreement > 2 || sample.redLineConflict || sample.anomalous || sample.publicEvidence)
    .map((sample) => sample.sampleId))
  const target = Math.ceil(samples.length * 0.1)
  const deterministic = [...samples]
    .map((sample) => ({ sample, hash: createHash('sha256').update(`${runHash}:${sample.sampleId}`).digest('hex') }))
    .sort((left, right) => left.hash.localeCompare(right.hash))
    .slice(0, target)
  deterministic.forEach(({ sample }) => required.add(sample.sampleId))
  return [...required].sort()
}

interface RelativeDimension {
  mean: number
  laneMedian: number
  differenceCi95: { low: number; high: number }
}

export function deriveRelativeTraits(input: {
  profileStatus: BenchmarkProfileStatus
  coverage: number
  dimensions: Partial<Record<BenchmarkAxis, RelativeDimension>>
}) {
  if (input.profileStatus !== 'verified' || input.coverage < 0.8) return []
  const traits: Array<{ axis: BenchmarkAxis; direction: 'strength' | 'weakness'; delta: number }> = []
  for (const axis of BENCHMARK_AXES) {
    const dimension = input.dimensions[axis]
    if (!dimension) continue
    const delta = round(dimension.mean - dimension.laneMedian, 1)
    if (delta >= 0.5 && dimension.differenceCi95.low > 0) traits.push({ axis, direction: 'strength', delta })
    if (delta <= -0.5 && dimension.differenceCi95.high < 0) traits.push({ axis, direction: 'weakness', delta })
  }
  return traits
}
