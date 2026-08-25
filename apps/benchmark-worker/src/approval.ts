export interface BenchmarkApproval {
  candidateId: string
  entitlementConfirmed: boolean
  priceSnapshot: { currency: 'USD'; estimatedPerGeneration: number; capturedAt: string }
  maxGenerations: number
  maxJudgments: number
  maxJudgeCalls: number
  maxEstimatedUsd: number
  approvedBy: string
}

function positiveFinite(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function approveCandidate(input: BenchmarkApproval) {
  if (
    !input?.candidateId
    || input.entitlementConfirmed !== true
    || input.priceSnapshot?.currency !== 'USD'
    || !positiveFinite(input.priceSnapshot?.estimatedPerGeneration)
    || !Date.parse(input.priceSnapshot?.capturedAt || '')
    || !Number.isInteger(input.maxGenerations) || input.maxGenerations <= 0
    || !Number.isInteger(input.maxJudgments) || input.maxJudgments <= 0
    || !Number.isInteger(input.maxJudgeCalls) || input.maxJudgeCalls <= 0
    || input.maxJudgeCalls < input.maxJudgments
    || input.maxJudgeCalls > input.maxJudgments * 4
    || !positiveFinite(input.maxEstimatedUsd)
    || !input.approvedBy
  ) throw new Error('BENCHMARK_APPROVAL_INCOMPLETE')
  return Object.freeze({ ...input, priceSnapshot: Object.freeze({ ...input.priceSnapshot }), state: 'approved' as const })
}
