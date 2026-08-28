import { UnknownProviderOutcomeError } from './provider-operation.js'

type Judgment = {
  scores: Record<string, number>
  evidence: string[]
  redLines: unknown[]
  confidence: number
}

export type ConfirmedNotForwardedInput = {
  runId: string
  sampleId: string
  phase: 'quick'
  provider: 'openrouter'
  failedDispatchIndex: 0
  retryDispatchIndex: 1
  proof: {
    target: 'openrouter.ai:443'
    proxyStatus: 503
    durationMs: number
    responseBytes: 0
    logSha256: string
  }
}

export type DispatchReconciliationInspection = {
  runState: string
  errorCode: string
  hasLease: boolean
  sampleCompleted: boolean
  judgmentExists: boolean
  dispatchIndexes: number[]
  usage: { generations: number; judgments: number; judgeCalls: number }
}

export type DispatchReconciliationDependencies = {
  inspect(): Promise<DispatchReconciliationInspection>
  claim(): Promise<void>
  reserveAndMark(dispatchIndex: number): Promise<void>
  judge(beforeDispatch: () => Promise<void>): Promise<Judgment>
  save(judgment: Judgment & { sampleId: string; phase: 'quick'; provider: 'openrouter' }): Promise<void>
  release(): Promise<void>
  pause(reason: 'UNKNOWN_PROVIDER_OUTCOME' | 'BENCHMARK_DISPATCH_RECONCILIATION_FAILED'): Promise<void>
}

export function assertConfirmedNotForwardedInput(input: ConfirmedNotForwardedInput) {
  const valid = /^bench-run-[a-f0-9]{20}$/.test(input.runId)
    && /^sample:[a-f0-9]{64}$/.test(input.sampleId)
    && input.phase === 'quick'
    && input.provider === 'openrouter'
    && input.failedDispatchIndex === 0
    && input.retryDispatchIndex === 1
    && input.proof.target === 'openrouter.ai:443'
    && input.proof.proxyStatus === 503
    && Number.isInteger(input.proof.durationMs)
    && input.proof.durationMs >= 1
    && input.proof.durationMs <= 90_000
    && input.proof.responseBytes === 0
    && /^[a-f0-9]{64}$/.test(input.proof.logSha256)
  if (!valid) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_PROOF_INVALID')
  return input
}

export function assertDispatchReconciliationInspection(value: DispatchReconciliationInspection) {
  const valid = value.runState === 'paused'
    && value.errorCode === 'UNKNOWN_PROVIDER_OUTCOME'
    && value.hasLease === false
    && value.sampleCompleted === true
    && value.judgmentExists === false
    && value.dispatchIndexes.length === 1
    && value.dispatchIndexes[0] === 0
    && value.usage.generations === 24
    && value.usage.judgments === 1
    && value.usage.judgeCalls === 1
  if (!valid) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_STATE_INVALID')
  return value
}

export async function reconcileConfirmedNotForwardedJudgeDispatch(
  input: ConfirmedNotForwardedInput,
  dependencies: DispatchReconciliationDependencies,
) {
  assertConfirmedNotForwardedInput(input)
  assertDispatchReconciliationInspection(await dependencies.inspect())
  let claimed = false
  try {
    await dependencies.claim()
    claimed = true
    let dispatchIndex = input.retryDispatchIndex
    const judgment = await dependencies.judge(async () => {
      if (dispatchIndex > 3) throw new Error('BENCHMARK_DISPATCH_RECONCILIATION_ATTEMPT_LIMIT')
      await dependencies.reserveAndMark(dispatchIndex)
      dispatchIndex += 1
    })
    await dependencies.save({ ...judgment, sampleId: input.sampleId, phase: input.phase, provider: input.provider })
    await dependencies.release()
    return Object.freeze({
      runId: input.runId,
      sampleId: input.sampleId,
      provider: input.provider,
      dispatchIndex: input.retryDispatchIndex,
      judgmentSaved: true as const,
    })
  } catch (error) {
    if (claimed) {
      const unknown = error instanceof UnknownProviderOutcomeError
        || /unknown after dispatch|timed out after dispatch|UNKNOWN_PROVIDER_OUTCOME/i.test(String((error as Error)?.message || error))
      await dependencies.pause(unknown ? 'UNKNOWN_PROVIDER_OUTCOME' : 'BENCHMARK_DISPATCH_RECONCILIATION_FAILED').catch(() => {})
    }
    throw error
  }
}

export type UserAuthorizedAmbiguousRetryInput = {
  runId: string
  sampleId: string
  phase: 'quick'
  provider: 'bailian'
  failedDispatchIndex: 0
  retryDispatchIndex: 1
  authorization: 'retry-one-ambiguous-bailian-judgment-disabled-worker'
}

export type UserAuthorizedAmbiguousRetryDependencies = Omit<DispatchReconciliationDependencies, 'save'> & {
  save(judgment: Judgment & { sampleId: string; phase: 'quick'; provider: 'bailian' }): Promise<void>
}

export async function retryUserAuthorizedAmbiguousJudgeDispatch(
  input: UserAuthorizedAmbiguousRetryInput,
  dependencies: UserAuthorizedAmbiguousRetryDependencies,
) {
  if (!/^bench-run-[a-f0-9]{20}$/.test(input.runId)
    || !/^sample:[a-f0-9]{64}$/.test(input.sampleId)
    || input.phase !== 'quick'
    || input.provider !== 'bailian'
    || input.failedDispatchIndex !== 0
    || input.retryDispatchIndex !== 1
    || input.authorization !== 'retry-one-ambiguous-bailian-judgment-disabled-worker') {
    throw new Error('BENCHMARK_AMBIGUOUS_RETRY_INPUT_INVALID')
  }
  const inspection = await dependencies.inspect()
  if (inspection.runState !== 'paused'
    || inspection.errorCode !== 'UNKNOWN_PROVIDER_OUTCOME'
    || inspection.hasLease
    || !inspection.sampleCompleted
    || inspection.judgmentExists
    || JSON.stringify(inspection.dispatchIndexes) !== '[0]'
    || inspection.usage.generations !== 24
    || inspection.usage.judgments !== 33
    || inspection.usage.judgeCalls !== 34) {
    throw new Error('BENCHMARK_AMBIGUOUS_RETRY_STATE_INVALID')
  }
  let claimed = false
  try {
    await dependencies.claim()
    claimed = true
    let dispatchIndex = input.retryDispatchIndex
    const judgment = await dependencies.judge(async () => {
      if (dispatchIndex > 3) throw new Error('BENCHMARK_AMBIGUOUS_RETRY_ATTEMPT_LIMIT')
      await dependencies.reserveAndMark(dispatchIndex)
      dispatchIndex += 1
    })
    await dependencies.save({ ...judgment, sampleId: input.sampleId, phase: input.phase, provider: input.provider })
    await dependencies.release()
    return Object.freeze({ runId: input.runId, sampleId: input.sampleId, provider: input.provider, dispatchIndex: input.retryDispatchIndex, judgmentSaved: true as const })
  } catch (error) {
    if (claimed) {
      const unknown = error instanceof UnknownProviderOutcomeError
        || /unknown after dispatch|timed out after dispatch|UNKNOWN_PROVIDER_OUTCOME/i.test(String((error as Error)?.message || error))
      await dependencies.pause(unknown ? 'UNKNOWN_PROVIDER_OUTCOME' : 'BENCHMARK_DISPATCH_RECONCILIATION_FAILED').catch(() => {})
    }
    throw error
  }
}
