import { createHash } from 'node:crypto'

import type OSS from 'ali-oss'
import { PB_IMAGE_DIAGNOSTIC_V1, benchmarkImmutableRunBinding, benchmarkJudgeStackHash, canonicalHash, planBenchmarkCases } from '@paperbanana/benchmark-core'

import type { BenchmarkPhaseAuthorization } from './phase-operator-authorization.js'
import { executeBenchmarkRun } from './runner.js'
import { callBlindJudge } from './judge-provider.js'
import { runProviderOperation } from './provider-operation.js'

function mismatch(): never {
  throw new Error('BENCHMARK_PHASE_OPERATOR_RUN_MISMATCH')
}

export function assertRunMatchesPhaseAuthorization(run: Record<string, any>, authorization: BenchmarkPhaseAuthorization, workerCodeSha: string) {
  let immutable: ReturnType<typeof benchmarkImmutableRunBinding>
  try {
    immutable = benchmarkImmutableRunBinding({
      runHash: run.runHash, runFacts: run.runFacts, candidateSnapshot: run.candidateSnapshot,
      runIntegrityAttestation: run.runIntegrityAttestation,
    })
  } catch { mismatch() }
  if (!run || workerCodeSha !== authorization.codeSha
    || run._id !== authorization.runId || run.state !== authorization.expectedState
    || run.codeSha !== authorization.codeSha || run.provider !== authorization.provider
    || run.modelId !== authorization.modelId || run.lane !== authorization.lane
    || run.suiteId !== authorization.suiteId || run.suiteHash !== authorization.suiteHash
    || run.judgeEpoch !== authorization.judgeEpoch || run.judgeStackHash !== authorization.judgeStackHash
    || run.authorizationHash !== authorization.signedAuthorizationHash || run.priceHash !== authorization.priceHash
    || run.runHash !== canonicalHash(run.runFacts)
    || immutable.runHash !== authorization.runHash || immutable.runFactsHash !== authorization.runFactsHash
    || immutable.candidateSnapshotHash !== authorization.candidateSnapshotHash
    || immutable.aspectRatiosHash !== authorization.aspectRatiosHash || immutable.registryHash !== authorization.registryHash
    || immutable.runIntegrityAttestation !== authorization.runIntegrityAttestation
    || immutable.immutableFactsHash !== authorization.immutableFactsHash
    || canonicalHash(run.aspectRatios) !== authorization.aspectRatiosHash || run.registryHash !== authorization.registryHash) mismatch()
  const phaseApproval = Array.isArray(run.approvalVersions)
    ? run.approvalVersions.find((version: Record<string, any>) => version?.phase === authorization.phase)
    : null
  if (!phaseApproval || phaseApproval.schemaVersion !== 1
    || phaseApproval.authorizationHash !== authorization.signedAuthorizationHash
    || phaseApproval.priceHash !== authorization.priceHash) mismatch()
  const approval = phaseApproval.approval
  const activeApproval = run.approval
  if (canonicalHash({ phase: authorization.phase, approval, codeSha: authorization.codeSha }) !== authorization.signedAuthorizationHash
    || canonicalHash(activeApproval) !== canonicalHash(approval)) mismatch()
  for (const candidate of [approval, activeApproval]) {
    if (!candidate || candidate.entitlementConfirmed !== true
      || candidate.maxGenerations !== authorization.maxGenerations
      || candidate.maxJudgments !== authorization.maxJudgments
      || candidate.maxJudgeCalls !== authorization.maxJudgeCalls
      || candidate.maxEstimatedUsd !== authorization.maxEstimatedUsd
      || canonicalHash(candidate.priceSnapshot) !== authorization.priceHash
      || canonicalHash(candidate.priceSnapshot) !== canonicalHash(authorization.priceSnapshot)) mismatch()
  }
  return { phaseApproval, approval }
}

export async function processAcquiredBenchmarkRun(input: {
  run: Record<string, any>
  workerId: string
  workerCodeSha: string
  configuredCodeSha: string
  authorization?: BenchmarkPhaseAuthorization
  credentials: Record<'bailian' | 'openrouter' | 'ark', string>
  imageRuntime: { generate(input: Record<string, any>): Promise<string> }
  oss: Pick<OSS, 'put' | 'get'>
  repository: Record<string, any>
  openRouterJudgeFetch: typeof fetch
}) {
  const { run, workerId, workerCodeSha, configuredCodeSha, authorization, credentials, imageRuntime, oss, repository, openRouterJudgeFetch } = input
  if (authorization) assertRunMatchesPhaseAuthorization(run, authorization, workerCodeSha)
  if (workerCodeSha !== configuredCodeSha || workerCodeSha !== run.codeSha) throw new Error('BENCHMARK_WORKER_CODE_SHA_MISMATCH')
  if (benchmarkJudgeStackHash(workerCodeSha) !== run.judgeStackHash) throw new Error('BENCHMARK_JUDGE_STACK_MISMATCH')
  const provider = String(run.provider) as 'bailian' | 'openrouter' | 'ark'
  const apiKey = credentials[provider]
  if (!apiKey || !credentials.openrouter || !credentials.bailian) throw new Error('BENCHMARK_DEDICATED_CREDENTIALS_MISSING')
  const phase = run.state === 'full_running' ? 'full' : 'quick'
  const phaseCases = phase === 'full'
    ? [...PB_IMAGE_DIAGNOSTIC_V1.cases]
    : PB_IMAGE_DIAGNOSTIC_V1.quickCaseIds.map((id) => PB_IMAGE_DIAGNOSTIC_V1.cases.find((item) => item.id === id)!)
  const capabilityPlan = planBenchmarkCases(phaseCases, run.aspectRatios || [])
  const result = await executeBenchmarkRun({
    run: {
      runId: run._id, phase, provider, modelId: run.modelId, lane: run.lane, repetitions: phase === 'full' ? 3 : 2,
      runHash: run.runHash, expectedCaseCount: phaseCases.length, capabilityGaps: capabilityPlan.capabilityGaps,
      operatorAuthorizationHash: authorization?.authorizationHash,
    },
    cases: capabilityPlan.executableCases as any,
    async generate(sample) {
      await repository.reserveBudget(run._id, workerId, run.leaseToken, run.state, 'generation', Number(run.approval?.priceSnapshot?.estimatedPerGeneration || 0))
      await repository.beginSampleDispatch(run, workerId, sample)
      const startedAt = Date.now()
      const imageBase64 = await imageRuntime.generate({ provider, model: run.modelId, apiKey, prompt: sample.prompt, aspectRatio: sample.aspectRatio, imageSize: sample.lane })
      const bytes = Buffer.from(imageBase64, 'base64')
      const imageHash = createHash('sha256').update(bytes).digest('hex')
      const imageObjectKey = `bench/objects/${imageHash}.png`
      try {
        await oss.put(imageObjectKey, bytes, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'x-oss-forbid-overwrite': 'true' } } as any)
      } catch (error: any) {
        if (![409, 'FileAlreadyExists'].includes(error?.status || error?.code)) throw error
        const existing = await oss.get(imageObjectKey)
        if (createHash('sha256').update(Buffer.from(existing.content)).digest('hex') !== imageHash) throw new Error('BENCHMARK_CONTENT_ADDRESS_COLLISION')
      }
      return { imageHash, imageObjectKey, latencyMs: Date.now() - startedAt }
    },
    async judge(judgeProvider, sample) {
      const object = await oss.get(sample.imageObjectKey!)
      await repository.reserveBudget(run._id, workerId, run.leaseToken, run.state, 'judgment', 0)
      let dispatchIndex = 0
      return runProviderOperation(
        () => callBlindJudge({
          provider: judgeProvider, apiKey: credentials[judgeProvider], imageBase64: Buffer.from(object.content).toString('base64'),
          rubric: sample.rubric, caption: sample.caption,
          fetchImpl: judgeProvider === 'openrouter' ? openRouterJudgeFetch : undefined,
          beforeDispatch: async () => {
            const currentDispatch = dispatchIndex++
            await repository.reserveBudget(run._id, workerId, run.leaseToken, run.state, 'judgeCall', Number(run.approval?.priceSnapshot?.estimatedPerJudgeCall || 0))
            await repository.beginJudgeDispatch(run, workerId, sample.sampleId, judgeProvider, currentDispatch)
          },
        }),
        { maxRetries: 1 },
      )
    },
    repository: repository.forRun(run, workerId),
  })
  return { ...result, phase, authorizationHash: authorization?.authorizationHash || null }
}
