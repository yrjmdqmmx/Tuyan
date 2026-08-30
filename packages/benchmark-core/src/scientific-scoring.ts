import {
  SCIENTIFIC_BENCHMARK_AXES,
  type ScientificBenchmarkAxis,
} from './scientific-contracts.js'
import { PB_SCIENTIFIC_FIGURE_V2 } from './scientific-suite.js'
import { compareScientificIdentifiers } from './scientific-model-manifest.js'

export type ScientificAxisScores = Record<ScientificBenchmarkAxis, number>

function assertScientificScore(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) {
    throw new Error('INVALID_SCIENTIFIC_AXIS_SCORE')
  }
}

export function scientificOverallScore(scores: Partial<ScientificAxisScores>) {
  let total = 0
  for (const axis of SCIENTIFIC_BENCHMARK_AXES) {
    const score = scores[axis]
    assertScientificScore(score)
    total += score
  }
  return total / SCIENTIFIC_BENCHMARK_AXES.length
}

export function rankScientificModels<T extends { modelId: string; scores: Partial<ScientificAxisScores> }>(models: readonly T[]) {
  const modelIds = models.map((model) => model.modelId)
  if (modelIds.some((modelId) => typeof modelId !== 'string' || !modelId)
    || new Set(modelIds).size !== modelIds.length) {
    throw new Error('DUPLICATE_SCIENTIFIC_MODEL_ID')
  }
  const ordered = models.map((model) => ({
    ...model,
    overallScore: scientificOverallScore(model.scores),
  })).sort((left, right) => right.overallScore - left.overallScore || compareScientificIdentifiers(left.modelId, right.modelId))

  let previousScore: number | undefined
  let previousRank = 0
  return ordered.map((model, index) => {
    const overallRank = index === 0 || model.overallScore !== previousScore ? index + 1 : previousRank
    previousScore = model.overallScore
    previousRank = overallRank
    return { ...model, overallRank }
  })
}

export type ScientificAttemptStatus = 'succeeded' | 'failed' | 'unsupported' | 'not_executed' | 'budget_blocked'

export interface ScientificFixedSlotAttempt {
  caseId: string
  status: ScientificAttemptStatus
  scores?: Partial<ScientificAxisScores>
}

export function aggregateScientificFixedSlots(attempts: readonly ScientificFixedSlotAttempt[]) {
  const expectedCases = PB_SCIENTIFIC_FIGURE_V2.cases
  const byCase = new Map(attempts.map((attempt) => [attempt.caseId, attempt]))
  if (byCase.size !== attempts.length
    || attempts.length !== expectedCases.length
    || expectedCases.some((scientificCase) => !byCase.has(scientificCase.id))) {
    throw new Error('SCIENTIFIC_FIXED_SLOT_SET_MISMATCH')
  }

  const accumulators = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, {
    total: 0,
    denominator: 0,
    succeededSlots: 0,
    zeroedSlots: 0,
  }])) as Record<ScientificBenchmarkAxis, { total: number; denominator: number; succeededSlots: number; zeroedSlots: number }>

  for (const scientificCase of expectedCases) {
    const attempt = byCase.get(scientificCase.id)!
    if (attempt.status === 'not_executed') throw new Error(`SCIENTIFIC_SLOT_NOT_EXECUTED:${attempt.caseId}`)
    if (attempt.status === 'budget_blocked') throw new Error(`SCIENTIFIC_SLOT_BUDGET_BLOCKED:${attempt.caseId}`)
    if (!['succeeded', 'failed', 'unsupported'].includes(attempt.status)) throw new Error(`INVALID_SCIENTIFIC_SLOT_STATUS:${attempt.caseId}`)
    for (const axis of scientificCase.applicableAxes) {
      const accumulator = accumulators[axis]
      accumulator.denominator += 1
      if (attempt.status === 'succeeded') {
        const score = attempt.scores?.[axis]
        assertScientificScore(score)
        accumulator.total += score
        accumulator.succeededSlots += 1
      } else {
        accumulator.zeroedSlots += 1
      }
    }
  }

  const byAxis = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map((axis) => {
    const accumulator = accumulators[axis]
    if (accumulator.denominator === 0) throw new Error(`SCIENTIFIC_AXIS_WITHOUT_FIXED_SLOT:${axis}`)
    return [axis, Object.freeze({
      mean: accumulator.total / accumulator.denominator,
      denominator: accumulator.denominator,
      succeededSlots: accumulator.succeededSlots,
      zeroedSlots: accumulator.zeroedSlots,
    })]
  })) as Record<ScientificBenchmarkAxis, { mean: number; denominator: number; succeededSlots: number; zeroedSlots: number }>

  return Object.freeze({ byAxis: Object.freeze(byAxis) })
}
