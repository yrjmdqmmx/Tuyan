export function buildBenchmarkPhaseOperatorReport(input: {
  runId: string
  phase: 'quick' | 'full'
  authorizationHash: string
  usage: { generations: number; judgments: number; judgeCalls?: number; estimatedUsd: number }
  state: string
  sampleCount: number
  judgmentCount: number
  auditCount: number
}) {
  return Object.freeze({
    runId: input.runId,
    phase: input.phase,
    authorizationHash: input.authorizationHash,
    usage: Object.freeze({
      generations: Number(input.usage?.generations || 0),
      judgments: Number(input.usage?.judgments || 0),
      judgeCalls: Number(input.usage?.judgeCalls || 0),
      estimatedUsd: Number(input.usage?.estimatedUsd || 0),
    }),
    state: input.state,
    sampleCount: Number(input.sampleCount || 0),
    judgmentCount: Number(input.judgmentCount || 0),
    auditCount: Number(input.auditCount || 0),
  })
}
