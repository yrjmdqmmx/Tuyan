export interface BudgetLimits {
  maxGenerations: number
  maxJudgeCalls: number
  maxEstimatedUsd: number
}

export class BenchmarkBudget {
  readonly limits: BudgetLimits
  private generations = 0
  private judgments = 0
  private estimatedUsd = 0

  constructor(limits: BudgetLimits) {
    if (!Number.isInteger(limits.maxGenerations) || !Number.isInteger(limits.maxJudgeCalls) || limits.maxEstimatedUsd <= 0) {
      throw new Error('INVALID_BENCHMARK_BUDGET')
    }
    this.limits = Object.freeze({ ...limits })
  }

  reserve(operation: { kind: 'generation' | 'judgment'; estimatedUsd: number }) {
    const nextGenerations = this.generations + (operation.kind === 'generation' ? 1 : 0)
    const nextJudgments = this.judgments + (operation.kind === 'judgment' ? 1 : 0)
    const nextCost = this.estimatedUsd + operation.estimatedUsd
    if (nextGenerations > this.limits.maxGenerations) throw new Error('BENCHMARK_BUDGET_PAUSED:GENERATIONS')
    if (nextJudgments > this.limits.maxJudgeCalls) throw new Error('BENCHMARK_BUDGET_PAUSED:JUDGMENTS')
    if (!Number.isFinite(nextCost) || nextCost > this.limits.maxEstimatedUsd) throw new Error('BENCHMARK_BUDGET_PAUSED:COST')
    this.generations = nextGenerations
    this.judgments = nextJudgments
    this.estimatedUsd = nextCost
    return this.snapshot()
  }

  snapshot() {
    return { generations: this.generations, judgments: this.judgments, estimatedUsd: this.estimatedUsd }
  }
}
