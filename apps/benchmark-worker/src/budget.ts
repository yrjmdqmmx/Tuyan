export interface BudgetLimits {
  maxGenerations: number
  maxJudgeCalls: number
  maxEstimatedUsd: number
}

const USD_SCALE = 1_000_000_000

function toUsdUnits(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER / USD_SCALE) {
    throw new Error('INVALID_BENCHMARK_BUDGET')
  }
  return BigInt(Math.round(value * USD_SCALE))
}

export function addBenchmarkUsd(left: number, right: number) {
  return Number(toUsdUnits(left) + toUsdUnits(right)) / USD_SCALE
}

export function benchmarkUsdExceeds(value: number, limit: number) {
  return toUsdUnits(value) > toUsdUnits(limit)
}

export class BenchmarkBudget {
  readonly limits: BudgetLimits
  private generations = 0
  private judgments = 0
  private estimatedUsdUnits = 0n
  private readonly maxEstimatedUsdUnits: bigint

  constructor(limits: BudgetLimits) {
    if (!Number.isInteger(limits.maxGenerations) || !Number.isInteger(limits.maxJudgeCalls) || limits.maxEstimatedUsd <= 0) {
      throw new Error('INVALID_BENCHMARK_BUDGET')
    }
    this.limits = Object.freeze({ ...limits })
    this.maxEstimatedUsdUnits = toUsdUnits(limits.maxEstimatedUsd)
  }

  reserve(operation: { kind: 'generation' | 'judgment'; estimatedUsd: number }) {
    const nextGenerations = this.generations + (operation.kind === 'generation' ? 1 : 0)
    const nextJudgments = this.judgments + (operation.kind === 'judgment' ? 1 : 0)
    const nextCostUnits = this.estimatedUsdUnits + toUsdUnits(operation.estimatedUsd)
    if (nextGenerations > this.limits.maxGenerations) throw new Error('BENCHMARK_BUDGET_PAUSED:GENERATIONS')
    if (nextJudgments > this.limits.maxJudgeCalls) throw new Error('BENCHMARK_BUDGET_PAUSED:JUDGMENTS')
    if (nextCostUnits > this.maxEstimatedUsdUnits) throw new Error('BENCHMARK_BUDGET_PAUSED:COST')
    this.generations = nextGenerations
    this.judgments = nextJudgments
    this.estimatedUsdUnits = nextCostUnits
    return this.snapshot()
  }

  snapshot() {
    return { generations: this.generations, judgments: this.judgments, estimatedUsd: Number(this.estimatedUsdUnits) / USD_SCALE }
  }
}
