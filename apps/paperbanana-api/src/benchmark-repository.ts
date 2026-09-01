import {
  BENCHMARK_AXES,
  BENCHMARK_COLLECTIONS,
  PB_IMAGE_DIAGNOSTIC_V1,
  PB_IMAGE_LIGHT_V1,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  assertBenchmarkTransition,
  aggregateAxisScores,
  applyCodexAdjudication,
  applyCodexSingleReview,
  benchmarkSampleId,
  buildAuditSelection,
  canonicalHash,
  createCodexReviewPacket,
  deriveRelativeTraits,
  importCodexReview,
  benchmarkImmutableRunBinding,
  benchmarkJudgeStackHash,
  planBenchmarkCases,
  verifyCodexReviewAttestation,
  type BenchmarkRunState,
} from '@paperbanana/benchmark-core'
import type { Db } from 'mongodb'
import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  SCIENTIFIC_V2_COLLECTIONS,
  SCIENTIFIC_V2_RELEASE_HEAD_ID,
  createScientificV2MongoRepository,
} from './scientific-v2-repository.js'

type AnyRecord = { _id?: string; [key: string]: any }

const benchmarkHashPattern = /^[a-f0-9]{64}$/i
const automaticRedLineCodes = new Set(['missing_node', 'reversed_arrow', 'garbled_text', 'occlusion', 'low_contrast', 'aspect_ratio_violation'])
const maxVerifiedLatencyMs = 86_400_000

function verifiedIntegrityFailure(reason: string): never {
  throw new Error(`BENCHMARK_VERIFIED_INTEGRITY_FAILED:${reason}`)
}

function immutableRunFacts(run: AnyRecord) {
  const createdAt = run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt)
  const aspectRatios = Array.isArray(run.aspectRatios) ? [...run.aspectRatios] : []
  const facts = {
    runId: String(run._id || ''),
    modelCandidateId: String(run.modelCandidateId || ''),
    provider: String(run.provider || ''),
    modelId: String(run.modelId || ''),
    developer: String(run.developer || ''),
    lane: String(run.lane || ''),
    aspectRatios: aspectRatios.map(String).sort(),
    suiteId: String(run.suiteId || ''),
    suiteHash: String(run.suiteHash || ''),
    judgeEpoch: String(run.judgeEpoch || ''),
    reviewerEpoch: String(run.reviewerEpoch || ''),
    ...(run.evaluationMode ? {
      evaluationMode: String(run.evaluationMode),
      evaluationEpoch: String(run.evaluationEpoch || ''),
      reviewProtocol: String(run.reviewProtocol || ''),
      canonicalModelId: String(run.canonicalModelId || run.modelId || ''),
      primaryAccessProvider: String(run.primaryAccessProvider || run.provider || ''),
      alternateAccessProviders: Array.isArray(run.alternateAccessProviders) ? run.alternateAccessProviders.map(String).sort() : [],
    } : {}),
    registryHash: String(run.registryHash || ''),
    codeSha: String(run.codeSha || ''),
    createdAt,
  }
  if (!facts.runId || !facts.modelCandidateId || !facts.provider || !facts.modelId || !facts.lane || !facts.suiteId
    || !benchmarkHashPattern.test(facts.suiteHash) || !facts.judgeEpoch || !facts.reviewerEpoch
    || !facts.registryHash || !/^[a-f0-9]{40}$/i.test(facts.codeSha) || !Number.isFinite(createdAt.getTime())
    || (run.evaluationMode && (!run.evaluationEpoch || !run.reviewProtocol || !run.canonicalModelId || !run.primaryAccessProvider))) {
    throw new Error('BENCHMARK_RUN_FACTS_INVALID')
  }
  return facts
}

function signedCandidateSnapshot(candidate: Record<string, any>, runFacts: ReturnType<typeof immutableRunFacts>) {
  const snapshot = {
    schemaVersion: 1,
    candidateId: String(candidate?._id || candidate?.candidateId || ''),
    provider: String(candidate?.provider || ''),
    modelId: String(candidate?.modelId || ''),
    developer: String(candidate?.developer || ''),
    lane: String(candidate?.lane || ''),
    aspectRatios: Array.isArray(candidate?.aspectRatios) ? candidate.aspectRatios.map(String).sort() : [],
    registryHash: String(candidate?.registryHash || ''),
    displayName: text(candidate?.displayName || candidate?.modelId),
    providerLabel: text(candidate?.providerLabel || candidate?.provider),
  }
  if (snapshot.candidateId !== runFacts.modelCandidateId || snapshot.provider !== runFacts.provider
    || snapshot.modelId !== runFacts.modelId || snapshot.developer !== runFacts.developer || snapshot.lane !== runFacts.lane
    || canonicalHash(snapshot.aspectRatios) !== canonicalHash(runFacts.aspectRatios) || snapshot.registryHash !== runFacts.registryHash
    || !snapshot.displayName || !snapshot.providerLabel) throw new Error('BENCHMARK_RUN_FACTS_INVALID')
  return snapshot
}

function signedApprovalVersion(phase: 'quick' | 'full' | 'standard', approvalInput: Record<string, any>, codeSha: string) {
  const capturedAt = new Date(approvalInput?.priceSnapshot?.capturedAt)
  const approvedAt = approvalInput?.approvedAt instanceof Date ? approvalInput.approvedAt : new Date(approvalInput?.approvedAt)
  const approval = {
    entitlementConfirmed: approvalInput?.entitlementConfirmed === true,
    priceSnapshot: {
      currency: String(approvalInput?.priceSnapshot?.currency || ''),
      source: String(approvalInput?.priceSnapshot?.source || ''),
      estimatedPerGeneration: Number(approvalInput?.priceSnapshot?.estimatedPerGeneration),
      estimatedPerJudgeCall: Number(approvalInput?.priceSnapshot?.estimatedPerJudgeCall),
      capturedAt: Number.isFinite(capturedAt.getTime()) ? capturedAt.toISOString() : '',
    },
    maxGenerations: Number(approvalInput?.maxGenerations),
    maxJudgments: Number(approvalInput?.maxJudgments),
    maxJudgeCalls: Number(approvalInput?.maxJudgeCalls),
    maxEstimatedUsd: Number(approvalInput?.maxEstimatedUsd),
    approvedBy: String(approvalInput?.approvedBy || ''),
    approvedAt,
  }
  let source: URL | undefined
  try { source = new URL(approval.priceSnapshot.source) } catch {}
  const standard = phase === 'standard'
  if (!approval.entitlementConfirmed || approval.priceSnapshot.currency !== 'USD'
    || source?.protocol !== 'https:' || source.username || source.password || source.toString() !== approval.priceSnapshot.source
    || !Number.isFinite(approval.priceSnapshot.estimatedPerGeneration) || approval.priceSnapshot.estimatedPerGeneration <= 0
    || !Number.isFinite(approval.priceSnapshot.estimatedPerJudgeCall) || (standard ? approval.priceSnapshot.estimatedPerJudgeCall !== 0 : approval.priceSnapshot.estimatedPerJudgeCall <= 0)
    || !approval.priceSnapshot.capturedAt || !Number.isInteger(approval.maxGenerations) || approval.maxGenerations <= 0
    || !Number.isInteger(approval.maxJudgments) || (standard ? approval.maxJudgments !== 0 : approval.maxJudgments <= 0)
    || !Number.isInteger(approval.maxJudgeCalls) || (standard ? approval.maxJudgeCalls !== 0 : approval.maxJudgeCalls <= 0)
    || (standard && approval.maxGenerations !== 4)
    || !Number.isFinite(approval.maxEstimatedUsd) || approval.maxEstimatedUsd <= 0 || !approval.approvedBy
    || !Number.isFinite(approvedAt.getTime())) throw new Error('BENCHMARK_RUN_FACTS_INVALID')
  const priceHash = canonicalHash(approval.priceSnapshot)
  return {
    schemaVersion: 1,
    phase,
    authorizationHash: canonicalHash({ phase, approval, codeSha }),
    priceHash,
    approval,
  }
}

function signedRunEnvelope(run: AnyRecord) {
  const runFacts = immutableRunFacts(run)
  const runHash = canonicalHash(runFacts)
  const candidateSnapshot = signedCandidateSnapshot(run.candidateSnapshot, runFacts)
  if (!Array.isArray(run.approvalVersions) || ![1, 2].includes(run.approvalVersions.length)) throw new Error('BENCHMARK_RUN_FACTS_INVALID')
  const expectedPhases = run.evaluationMode === 'codex_single' ? ['standard'] : run.approvalVersions.length === 1 ? ['quick'] : ['quick', 'full']
  if (run.evaluationMode === 'codex_single' && run.approvalVersions.length !== 1) throw new Error('BENCHMARK_RUN_FACTS_INVALID')
  const approvalVersions = run.approvalVersions.map((version: AnyRecord, index: number) => {
    const expected = signedApprovalVersion(expectedPhases[index] as 'quick' | 'full' | 'standard', version?.approval, runFacts.codeSha)
    if (canonicalHash(version) !== canonicalHash(expected)) throw new Error('BENCHMARK_RUN_FACTS_INVALID')
    return expected
  })
  return { schemaVersion: 2, runHash, runFacts, candidateSnapshot, approvalVersions }
}

function createRunIntegrity(run: AnyRecord, signingSecret: string) {
  if (!signingSecret) throw new Error('BENCHMARK_RUN_FACTS_INVALID')
  const envelope = signedRunEnvelope(run)
  const runIntegrityAttestation = createHmac('sha256', signingSecret)
    .update(canonicalHash(envelope))
    .digest('hex')
  return { ...envelope, runIntegrityAttestation }
}

function assertRunIntegrity(run: AnyRecord, signingSecret: string) {
  const expected = createRunIntegrity(run, signingSecret)
  const actualAttestation = String(run.runIntegrityAttestation || '')
  if (run.runHash !== expected.runHash || canonicalHash(run.runFacts) !== canonicalHash(expected.runFacts)
    || canonicalHash(run.candidateSnapshot) !== canonicalHash(expected.candidateSnapshot)
    || canonicalHash(run.approvalVersions) !== canonicalHash(expected.approvalVersions)
    || !benchmarkHashPattern.test(actualAttestation)
    || !timingSafeEqual(Buffer.from(actualAttestation, 'hex'), Buffer.from(expected.runIntegrityAttestation, 'hex'))) {
    throw new Error('BENCHMARK_RUN_FACTS_INVALID')
  }
  return expected
}

function assertPhaseApproval(run: AnyRecord, phase: 'quick' | 'full' | 'standard', signingSecret: string) {
  const integrity = assertRunIntegrity(run, signingSecret)
  const approvalVersion = integrity.approvalVersions.find((version) => version.phase === phase)
  if (!approvalVersion) throw new Error('BENCHMARK_PHASE_APPROVAL_REQUIRED')
  return { integrity, approvalVersion }
}

function candidateMatchesRun(candidate: AnyRecord, run: AnyRecord) {
  const facts = immutableRunFacts(run)
  return candidate?._id === facts.modelCandidateId && candidate.provider === facts.provider && candidate.modelId === facts.modelId
    && String(candidate.developer || '') === facts.developer && candidate.lane === facts.lane
    && canonicalHash((candidate.aspectRatios || []).map(String).sort()) === canonicalHash(facts.aspectRatios)
    && candidate.registryHash === facts.registryHash && candidate.state === 'approved'
}

function exactAxisScores(scores: unknown) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return false
  const keys = Object.keys(scores as Record<string, unknown>).sort()
  return keys.length === BENCHMARK_AXES.length
    && BENCHMARK_AXES.every((axis, index) => keys[index] === [...BENCHMARK_AXES].sort()[index]
      && Number.isFinite((scores as AnyRecord)[axis]) && (scores as AnyRecord)[axis] >= 0 && (scores as AnyRecord)[axis] <= 10)
}

function validEvidence(evidence: unknown) {
  return Array.isArray(evidence) && evidence.length > 0 && evidence.length <= 20
    && evidence.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 500)
}

function normalizedAutomaticRedLines(redLines: unknown) {
  if (!Array.isArray(redLines)) return null
  const normalized: string[] = []
  for (const item of redLines) {
    const code = typeof item === 'string' ? item : item && typeof item === 'object' ? (item as AnyRecord).code : ''
    const keys = item && typeof item === 'object' && !Array.isArray(item) ? Object.keys(item as AnyRecord) : []
    if (typeof code !== 'string' || !automaticRedLineCodes.has(code)
      || (keys.length && keys.some((key) => !['code', 'axis'].includes(key)))
      || (item && typeof item === 'object' && (item as AnyRecord).axis !== undefined && !BENCHMARK_AXES.includes((item as AnyRecord).axis))) return null
    normalized.push(code)
  }
  return [...new Set(normalized)].sort()
}

function validConfirmedRedLines(redLines: unknown) {
  return Array.isArray(redLines) && redLines.every((item) => item && typeof item === 'object' && !Array.isArray(item)
    && Object.keys(item).every((key) => ['code', 'axis', 'cap'].includes(key))
    && typeof item.code === 'string' && item.code.trim().length > 0 && item.code.length <= 160
    && BENCHMARK_AXES.includes(item.axis) && Number.isFinite(item.cap) && item.cap >= 0 && item.cap <= 10)
}

export function buildCodexSingleProfile(input: {
  run: AnyRecord
  samples: AnyRecord[]
  codexJudgments: AnyRecord[]
  automaticJudgments: AnyRecord[]
  dispatches: AnyRecord[]
  priceSnapshot: AnyRecord
  generationCalls?: number
}) {
  if (input.automaticJudgments.length || input.dispatches.length) throw new Error('BENCHMARK_STANDARD_JUDGE_DATA_FORBIDDEN')
  const bySample = new Map(input.codexJudgments.map((judgment) => [judgment.sampleId, judgment]))
  if (bySample.size !== input.codexJudgments.length || input.samples.some((sample) => !bySample.has(sample.sampleId))) {
    throw new Error('BENCHMARK_STANDARD_CODEX_COVERAGE_INVALID')
  }
  const observations = input.samples.map((sample) => {
    const judgment = bySample.get(sample.sampleId)!
    if (!exactAxisScores(judgment.scores) || !validEvidence(judgment.evidence)
      || !validConfirmedRedLines(judgment.confirmedRedLines) || !Number.isFinite(judgment.confidence)
      || judgment.confidence < 0 || judgment.confidence > 1 || judgment.consistencyReviewed !== true) throw new Error('BENCHMARK_STANDARD_CODEX_SHAPE_INVALID')
    return { caseId: sample.caseId, scores: applyCodexSingleReview(judgment as any).scores }
  })
  const dimensions = aggregateAxisScores(observations, { seed: input.run.runHash || input.run.canonicalModelId || input.run.modelId })
  const latencies = input.samples.map((sample) => Number(sample.latencyMs || 0)).filter((value) => value > 0).sort((left, right) => left - right)
  const percentile = (probability: number) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * probability))] / 1_000 : 0
  const generationCalls = input.generationCalls ?? input.samples.length
  if (!Number.isInteger(generationCalls) || generationCalls < input.samples.length || generationCalls > 4) {
    throw new Error('BENCHMARK_STANDARD_GENERATION_COUNT_INVALID')
  }
  const estimatedUsd = Number((generationCalls * Number(input.priceSnapshot?.estimatedPerGeneration || 0)).toFixed(12))
  return {
    canonicalModelId: input.run.canonicalModelId || input.run.modelId,
    modelId: input.run.modelId,
    provider: input.run.provider,
    developer: input.run.developer,
    primaryAccessProvider: input.run.primaryAccessProvider || input.run.provider,
    alternateAccessProviders: input.run.alternateAccessProviders || [],
    lane: input.run.lane || 'provider-default',
    profileStatus: 'published',
    sampleCount: input.samples.length,
    coverage: input.samples.length / 4,
    successRate: input.samples.length / 4,
    auditRatio: input.samples.length ? 1 : 0,
    ranked: input.samples.length >= 3,
    unrankedReason: input.samples.length >= 3 ? undefined : 'INSUFFICIENT_SAMPLES',
    dimensions,
    latency: { p50Seconds: percentile(0.5), p90Seconds: percentile(0.9) },
    actualOutputPixels: input.samples.map((sample) => sample.actualOutputPixels),
    registryHash: input.run.registryHash,
    codeSha: input.run.codeSha,
    priceHash: input.run.priceHash,
    priceSnapshot: input.priceSnapshot,
    estimatedCost: { usd: estimatedUsd, generationCalls, automaticJudgeCalls: 0, logicalJudgments: 0, judgeDispatchCalls: 0 },
  }
}

export function buildPublicEvidenceDraft(profileId: string, modelId: string, samples: AnyRecord[], codexJudgments: AnyRecord[]) {
  const judgmentsBySample = new Map(codexJudgments.filter((judgment) => judgment.accepted === true).map((judgment) => [judgment.sampleId, judgment]))
  return samples.flatMap((sample) => {
    const judgment = judgmentsBySample.get(sample.sampleId)
    const variants = Array.isArray(sample.publicRenditions) ? sample.publicRenditions : []
    if (sample.status !== 'completed' || !judgment || !benchmarkHashPattern.test(String(sample.imageHash || ''))
      || !exactAxisScores(judgment.scores) || !validEvidence(judgment.evidence) || !validConfirmedRedLines(judgment.confirmedRedLines)
      || !variants.length || variants.some((variant: AnyRecord) => !['thumbnail', 'detail', 'full'].includes(variant.kind)
        || variant.mimeType !== 'image/webp' || !benchmarkHashPattern.test(String(variant.imageHash || ''))
        || !String(variant.objectKey || '').startsWith(`bench/public/evidence/${sample.imageHash}/`) || !String(variant.objectKey || '').endsWith('.webp'))) return []
    return [{
      sampleId: sample.sampleId,
      profileId,
      modelId,
      caseId: sample.caseId,
      imageHash: sample.imageHash,
      actualOutputPixels: structuredClone(sample.actualOutputPixels),
      variants: structuredClone(variants),
      scores: applyCodexSingleReview(judgment as any).scores,
      reviewNotes: judgment.evidence.map((note: string) => note.trim()),
    }]
  })
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && new Set(left).size === left.length && new Set(right).size === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index])
}

function buildPhaseReviewSourceManifest(run: AnyRecord, runSamples: AnyRecord[], runJudgments: AnyRecord[], runDispatches: AnyRecord[], phase: 'quick' | 'full') {
  const phaseSamples = runSamples.filter((sample) => sample.phase === phase).sort((left, right) => String(left.sampleId).localeCompare(String(right.sampleId)))
  const automaticJudgments = runJudgments.filter((judgment) => judgment.phase === phase && judgment.status === 'completed')
    .sort((left, right) => `${left.sampleId}:${left.provider}`.localeCompare(`${right.sampleId}:${right.provider}`))
  const sampleIds = new Set(phaseSamples.map((sample) => sample.sampleId))
  if (sampleIds.size !== phaseSamples.length || automaticJudgments.length !== phaseSamples.length * 2) throw new Error('BENCHMARK_PHASE_SOURCE_MANIFEST_INVALID')
  const pairs = new Map<string, AnyRecord[]>()
  for (const judgment of automaticJudgments) {
    if (judgment.runId !== run._id || !sampleIds.has(judgment.sampleId) || !['openrouter', 'bailian'].includes(judgment.provider)
      || judgment.judgeEpoch !== run.judgeEpoch || !exactAxisScores(judgment.scores)
      || !Number.isFinite(judgment.confidence) || judgment.confidence < 0 || judgment.confidence > 1
      || !validEvidence(judgment.evidence) || normalizedAutomaticRedLines(judgment.redLines) === null) {
      throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID')
    }
    const pair = pairs.get(judgment.sampleId) || []
    if (pair.some((item) => item.provider === judgment.provider)) throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID')
    pair.push(judgment)
    pairs.set(judgment.sampleId, pair)
  }
  if ([...sampleIds].some((sampleId) => {
    const pair = pairs.get(sampleId) || []
    return pair.length !== 2 || !pair.some((item) => item.provider === 'openrouter') || !pair.some((item) => item.provider === 'bailian')
  })) throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID')
  const automaticKeys = new Set(automaticJudgments.map((judgment) => `${judgment.sampleId}:${judgment.provider}`))
  if (runJudgments.some((judgment) => judgment?.status === 'dispatched' || String(judgment?._id || '').startsWith('dispatch:')
    || String(judgment?.provider || '').startsWith('dispatch:') || judgment?.logicalProvider !== undefined || judgment?.dispatchIndex !== undefined)) {
    throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID')
  }
  if (runDispatches.some((marker) => !['quick', 'full'].includes(marker.phase))) {
    throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID')
  }
  const phaseDispatchMarkers = runDispatches.filter((marker) => marker.phase === phase)
  const dispatchKeys = new Set<string>()
  const dispatchesByJudgment = new Map<string, number[]>()
  for (const marker of phaseDispatchMarkers) {
    const logicalProvider = String(marker.logicalProvider || '')
    const dispatchIndex = Number(marker.dispatchIndex)
    const logicalKey = `${marker.sampleId}:${logicalProvider}`
    const markerKey = `${logicalKey}:${dispatchIndex}`
    const exactKeys = ['_id', 'dispatchIndex', 'judgeEpoch', 'logicalProvider', 'phase', 'runId', 'sampleId']
    if (Object.keys(marker).sort().length !== exactKeys.length || !Object.keys(marker).sort().every((key, index) => key === exactKeys[index])
      || marker.runId !== run._id || !sampleIds.has(marker.sampleId) || !automaticKeys.has(logicalKey)
      || !['openrouter', 'bailian'].includes(logicalProvider) || marker.judgeEpoch !== run.judgeEpoch
      || !Number.isInteger(dispatchIndex) || dispatchIndex < 0 || dispatchIndex > 3
      || marker._id !== `dispatch:${logicalProvider}:${marker.sampleId}:${dispatchIndex}` || dispatchKeys.has(markerKey)) {
      throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID')
    }
    dispatchKeys.add(markerKey)
    const indexes = dispatchesByJudgment.get(logicalKey) || []
    indexes.push(dispatchIndex)
    dispatchesByJudgment.set(logicalKey, indexes)
  }
  if ([...automaticKeys].some((logicalKey) => {
    const indexes = (dispatchesByJudgment.get(logicalKey) || []).sort((left, right) => left - right)
    return indexes.length < 1 || indexes.length > 4 || indexes.some((value, index) => value !== index)
  }) || dispatchesByJudgment.size !== automaticKeys.size) throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID')
  const expectedAuditIds = buildAuditSelection(phaseSamples.map((sample) => {
    const pair = pairs.get(sample.sampleId) || []
    return {
      sampleId: sample.sampleId,
      disagreement: Math.max(...BENCHMARK_AXES.map((axis) => Math.abs(Number(pair[0].scores[axis]) - Number(pair[1].scores[axis])))),
      redLineConflict: canonicalHash(normalizedAutomaticRedLines(pair[0].redLines) || []) !== canonicalHash(normalizedAutomaticRedLines(pair[1].redLines) || []),
      anomalous: pair.some((judgment) => judgment.confidence < 0.35),
      publicEvidence: sample.publicEvidence === true,
    }
  }), run.runHash)
  const facts = {
    schemaVersion: 2,
    runId: run._id,
    runHash: run.runHash,
    phase,
    usage: { generationCalls: phaseSamples.length, logicalJudgments: automaticJudgments.length, judgeDispatchCalls: phaseDispatchMarkers.length },
    samples: phaseSamples.map((sample) => ({
      sampleId: sample.sampleId, runId: sample.runId, phase: sample.phase, caseId: sample.caseId, repetition: sample.repetition,
      status: sample.status, imageHash: sample.imageHash, imageObjectKey: sample.imageObjectKey, latencyMs: sample.latencyMs,
      rubric: sample.rubric, rubricHash: sample.rubricHash, auditRequired: sample.auditRequired === true, publicEvidence: sample.publicEvidence === true,
    })),
    automaticJudgments: automaticJudgments.map((judgment) => ({
      runId: judgment.runId, sampleId: judgment.sampleId, phase: judgment.phase, provider: judgment.provider,
      judgeEpoch: judgment.judgeEpoch, status: judgment.status, scores: judgment.scores, evidence: judgment.evidence,
      redLines: judgment.redLines, confidence: judgment.confidence,
    })),
    judgeDispatchMarkers: phaseDispatchMarkers
      .sort((left, right) => `${left.sampleId}:${left.logicalProvider}:${left.dispatchIndex}`.localeCompare(`${right.sampleId}:${right.logicalProvider}:${right.dispatchIndex}`))
      .map((marker) => ({
        _id: marker._id, runId: marker.runId, sampleId: marker.sampleId, phase: marker.phase,
        logicalProvider: marker.logicalProvider, dispatchIndex: marker.dispatchIndex,
        judgeEpoch: marker.judgeEpoch,
      })),
  }
  return { facts, hash: canonicalHash(facts), expectedAuditIds }
}

export function buildStandardReviewSourceManifest(run: AnyRecord, runSamples: AnyRecord[], runJudgments: AnyRecord[], runDispatches: AnyRecord[]) {
  if (runJudgments.some((judgment) => (judgment.runId === run._id || judgment.phase === 'standard') && judgment.source !== 'codex')
    || runDispatches.some((marker) => marker.runId === run._id || marker.phase === 'standard')) {
    throw new Error('BENCHMARK_STANDARD_SOURCE_MANIFEST_INVALID')
  }
  const standardSamples = runSamples.filter((sample) => sample.phase === 'standard' && sample.status === 'completed')
    .sort((left, right) => String(left.sampleId).localeCompare(String(right.sampleId)))
  const failedSamples = runSamples.filter((sample) => sample.phase === 'standard' && sample.status === 'failed')
    .sort((left, right) => String(left.sampleId).localeCompare(String(right.sampleId)))
  if (runSamples.some((sample) => sample.phase === 'standard' && !['completed', 'failed'].includes(sample.status))) {
    throw new Error('BENCHMARK_STANDARD_SOURCE_MANIFEST_INVALID')
  }
  const ids = new Set<string>()
  const caseIds = new Set(PB_IMAGE_LIGHT_V1.cases.map((item) => item.id))
  for (const sample of standardSamples) {
    const expectedId = Number.isInteger(sample.repetition) ? benchmarkSampleId(String(run._id), 'standard', sample.caseId, sample.repetition) : ''
    const pixels = sample.actualOutputPixels || {}
    if (!caseIds.has(sample.caseId) || sample.runId !== run._id || sample.repetition !== 0 || sample.sampleId !== expectedId || sample._id !== expectedId || ids.has(sample.sampleId)
      || !benchmarkHashPattern.test(String(sample.imageHash || '')) || sample.imageObjectKey !== `bench/objects/${sample.imageHash}.png`
      || canonicalHash(sample.rubric) !== sample.rubricHash || canonicalHash(sample.caseRequirements) !== sample.requirementsHash
      || sample.auditRequired !== true || !Number.isInteger(sample.latencyMs) || sample.latencyMs <= 0 || sample.latencyMs > maxVerifiedLatencyMs
      || !Number.isInteger(pixels.width) || pixels.width <= 0 || !Number.isInteger(pixels.height) || pixels.height <= 0
      || !Number.isFinite(pixels.megapixels) || pixels.megapixels <= 0 || !Number.isInteger(pixels.fileSizeBytes) || pixels.fileSizeBytes <= 0) {
      throw new Error('BENCHMARK_STANDARD_SOURCE_MANIFEST_INVALID')
    }
    ids.add(sample.sampleId)
  }
  for (const sample of failedSamples) {
    const expectedId = Number.isInteger(sample.repetition) ? benchmarkSampleId(String(run._id), 'standard', sample.caseId, sample.repetition) : ''
    if (!caseIds.has(sample.caseId) || sample.runId !== run._id || sample.repetition !== 0 || sample.sampleId !== expectedId
      || sample._id !== expectedId || ids.has(sample.sampleId) || typeof sample.errorCode !== 'string' || !sample.errorCode
      || sample.errorCode.length > 160 || !Number.isFinite(new Date(sample.failedAt).getTime())) {
      throw new Error('BENCHMARK_STANDARD_SOURCE_MANIFEST_INVALID')
    }
    ids.add(sample.sampleId)
  }
  const attemptedSamples = [...standardSamples, ...failedSamples]
  if (attemptedSamples.length > PB_IMAGE_LIGHT_V1.caseCount
    || new Set(attemptedSamples.map((sample) => sample.caseId)).size !== attemptedSamples.length) {
    throw new Error('BENCHMARK_STANDARD_SOURCE_MANIFEST_INVALID')
  }
  const facts = {
    schemaVersion: 3,
    runId: run._id,
    runHash: run.runHash,
    phase: 'standard' as const,
    usage: { generationCalls: attemptedSamples.length, logicalJudgments: 0, judgeDispatchCalls: 0 },
    samples: standardSamples.map((sample) => ({
      sampleId: sample.sampleId, runId: sample.runId, phase: sample.phase, caseId: sample.caseId, repetition: sample.repetition,
      status: sample.status, imageHash: sample.imageHash, imageObjectKey: sample.imageObjectKey, latencyMs: sample.latencyMs,
      rubric: sample.rubric, rubricHash: sample.rubricHash, caseRequirements: sample.caseRequirements,
      requirementsHash: sample.requirementsHash, actualOutputPixels: sample.actualOutputPixels,
      auditRequired: true, publicEvidence: sample.publicEvidence === true,
    })),
    automaticJudgments: [] as never[],
    judgeDispatchMarkers: [] as never[],
    generationFailures: failedSamples.map((sample) => ({
      sampleId: sample.sampleId, runId: sample.runId, phase: sample.phase, caseId: sample.caseId,
      repetition: sample.repetition, status: sample.status, errorCode: sample.errorCode, failedAt: sample.failedAt,
    })),
  }
  return { facts, hash: canonicalHash(facts), expectedAuditIds: standardSamples.map((sample) => sample.sampleId).sort() }
}

function assertStandardSourceManifest(run: AnyRecord, packet: AnyRecord, runSamples: AnyRecord[], runJudgments: AnyRecord[], runDispatches: AnyRecord[], signingSecret: string) {
  const manifest = buildStandardReviewSourceManifest(run, runSamples, runJudgments, runDispatches)
  const expectedAttestation = sourceManifestAttestation(run, manifest.hash, signingSecret)
  const actualAttestation = String(packet?.sourceManifestAttestation || '')
  if (packet?.sourceManifestHash !== manifest.hash || !benchmarkHashPattern.test(actualAttestation)
    || !timingSafeEqual(Buffer.from(actualAttestation, 'hex'), Buffer.from(expectedAttestation, 'hex'))) {
    throw new Error('BENCHMARK_STANDARD_SOURCE_MANIFEST_MISMATCH')
  }
  return manifest
}

function sourceManifestAttestation(run: AnyRecord, sourceManifestHash: string, signingSecret: string) {
  const integrity = assertRunIntegrity(run, signingSecret)
  return createHmac('sha256', signingSecret)
    .update(canonicalHash({ runHash: integrity.runHash, runFacts: integrity.runFacts, sourceManifestHash }))
    .digest('hex')
}

function assertPhaseSourceManifest(run: AnyRecord, packet: AnyRecord, runSamples: AnyRecord[], runJudgments: AnyRecord[], runDispatches: AnyRecord[], phase: 'quick' | 'full', signingSecret: string) {
  const manifest = buildPhaseReviewSourceManifest(run, runSamples, runJudgments, runDispatches, phase)
  const expectedAttestation = sourceManifestAttestation(run, manifest.hash, signingSecret)
  const actualAttestation = String(packet?.sourceManifestAttestation || '')
  if (packet?.sourceManifestHash !== manifest.hash || !benchmarkHashPattern.test(actualAttestation)
    || !timingSafeEqual(Buffer.from(actualAttestation, 'hex'), Buffer.from(expectedAttestation, 'hex'))) {
    throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_MISMATCH')
  }
  return manifest
}

function assertStandardReleaseIntegrity(input: {
  run: AnyRecord
  suite: AnyRecord | null
  runSamples: AnyRecord[]
  runJudgments: AnyRecord[]
  runDispatches: AnyRecord[]
  signingSecret: string
}) {
  const { run, suite, runSamples, runJudgments, runDispatches } = input
  let signedIntegrity: ReturnType<typeof assertRunIntegrity>
  try { signedIntegrity = assertRunIntegrity(run, input.signingSecret) }
  catch { verifiedIntegrityFailure('STANDARD_RUN_FACTS') }
  if (run.evaluationMode !== 'codex_single' || run.reviewProtocol !== 'codex-single-two-pass-v1'
    || run.evaluationEpoch !== run.reviewerEpoch || run.reviewerKind !== 'codex' || run.reviewerPasses !== 2) {
    verifiedIntegrityFailure('STANDARD_EVALUATION_IDENTITY')
  }
  if (!suite || suite._id !== PB_IMAGE_LIGHT_V1.id || suite.id !== PB_IMAGE_LIGHT_V1.id
    || suite.manifestHash !== run.suiteHash || run.suiteHash !== PB_IMAGE_LIGHT_V1.manifestHash) {
    verifiedIntegrityFailure('STANDARD_SUITE_IDENTITY')
  }
  const { _id: _suiteId, createdAt: _createdAt, manifestHash: storedSuiteHash, ...suiteBase } = suite
  if (canonicalHash(suiteBase) !== storedSuiteHash || storedSuiteHash !== PB_IMAGE_LIGHT_V1.manifestHash
    || suite.caseCount !== 4 || !Array.isArray(suite.cases) || suite.cases.length !== 4) {
    verifiedIntegrityFailure('STANDARD_SUITE_HASH')
  }
  const standardApproval = signedIntegrity!.approvalVersions.find((version) => version.phase === 'standard')
  if (!standardApproval || standardApproval.approval.maxGenerations !== 4
    || standardApproval.approval.maxJudgments !== 0 || standardApproval.approval.maxJudgeCalls !== 0
    || standardApproval.approval.priceSnapshot.estimatedPerJudgeCall !== 0) {
    verifiedIntegrityFailure('STANDARD_APPROVAL')
  }
  const completedSamples = runSamples.filter((sample) => sample.phase === 'standard' && sample.status === 'completed')
  let sourceManifest: ReturnType<typeof buildStandardReviewSourceManifest>
  try { sourceManifest = buildStandardReviewSourceManifest(run, runSamples, runJudgments, runDispatches) }
  catch { verifiedIntegrityFailure('STANDARD_SOURCE_MANIFEST') }
  const packet = run.reviewPacket
  if (!packet || packet.phase !== 'standard' || packet.runHash !== run.runHash || packet.reviewerEpoch !== run.reviewerEpoch
    || packet.reviewProtocol !== run.reviewProtocol || run.importedReviewPacketHash !== packet.packetHash
    || !benchmarkHashPattern.test(String(packet.packetHash || '')) || !benchmarkHashPattern.test(String(run.importedReviewHash || ''))
    || !sameStringSet(sourceManifest!.expectedAuditIds, Array.isArray(packet.samples) ? packet.samples.map((sample: AnyRecord) => sample.sampleId) : [])) {
    verifiedIntegrityFailure('STANDARD_PACKET_IDENTITY')
  }
  try { assertStandardSourceManifest(run, packet, runSamples, runJudgments, runDispatches, input.signingSecret) }
  catch { verifiedIntegrityFailure('STANDARD_SOURCE_MANIFEST') }
  const sampleById = new Map(completedSamples.map((sample) => [sample.sampleId, sample]))
  for (const packetSample of packet.samples) {
    const sample = sampleById.get(packetSample.sampleId)
    if (!sample || packetSample.imageObjectKey !== sample.imageObjectKey || packetSample.imageHash !== sample.imageHash
      || packetSample.rubricHash !== sample.rubricHash || canonicalHash(packetSample.rubric) !== sample.rubricHash
      || packetSample.requirementsHash !== sample.requirementsHash
      || canonicalHash(packetSample.caseRequirements) !== sample.requirementsHash) {
      verifiedIntegrityFailure('STANDARD_PACKET_SAMPLE')
    }
  }
  const acceptedCodex = runJudgments.filter((judgment) => judgment.source === 'codex' && judgment.accepted === true
    && judgment.phase === 'standard' && judgment.reviewerEpoch === run.reviewerEpoch && judgment.packetHash === packet.packetHash
    && judgment.reviewHash === run.importedReviewHash && judgment.reviewAttestation === run.importedReviewAttestation)
  if (acceptedCodex.length !== completedSamples.length
    || !sameStringSet(sourceManifest!.expectedAuditIds, acceptedCodex.map((judgment) => judgment.sampleId))
    || acceptedCodex.some((judgment) => !exactAxisScores(judgment.scores) || !validEvidence(judgment.evidence)
      || !validConfirmedRedLines(judgment.confirmedRedLines) || !Number.isFinite(judgment.confidence)
      || judgment.confidence < 0 || judgment.confidence > 1 || judgment.consistencyReviewed !== true)) {
    verifiedIntegrityFailure('STANDARD_CODEX_COVERAGE')
  }
  try {
    const attested = verifyCodexReviewAttestation(packet, acceptedCodex as any, run.importedReviewAttestation, input.signingSecret)
    if (attested.reviewHash !== run.importedReviewHash) verifiedIntegrityFailure('STANDARD_CODEX_REVIEW_HASH')
  } catch { verifiedIntegrityFailure('STANDARD_CODEX_ATTESTATION') }
  const profile = buildCodexSingleProfile({
    run,
    samples: completedSamples,
    codexJudgments: acceptedCodex,
    automaticJudgments: runJudgments.filter((judgment) => judgment.source !== 'codex'),
    dispatches: runDispatches,
    priceSnapshot: standardApproval.approval.priceSnapshot,
    generationCalls: sourceManifest!.facts.usage.generationCalls,
  })
  if (profile.estimatedCost.generationCalls > standardApproval.approval.maxGenerations
    || profile.estimatedCost.usd > standardApproval.approval.maxEstimatedUsd) {
    verifiedIntegrityFailure('STANDARD_APPROVAL_CAPS')
  }
  const candidate = signedIntegrity!.candidateSnapshot
  return {
    ...profile,
    displayName: candidate.displayName,
    providerLabel: candidate.providerLabel,
    authorizationHash: standardApproval.authorizationHash,
    evidenceManifestHash: canonicalHash(completedSamples.map((sample) => ({ sampleId: sample.sampleId, objectKey: sample.imageObjectKey, imageHash: sample.imageHash })).sort((left, right) => left.sampleId.localeCompare(right.sampleId))),
    evidenceObjects: completedSamples.map((sample) => ({ sampleId: sample.sampleId, objectKey: sample.imageObjectKey, imageHash: sample.imageHash })),
  }
}

function assertVerifiedReleaseIntegrity(input: {
  run: AnyRecord
  suite: AnyRecord | null
  runSamples: AnyRecord[]
  runJudgments: AnyRecord[]
  runDispatches: AnyRecord[]
  signingSecret: string
}) {
  const { run, suite, runSamples, runJudgments, runDispatches } = input
  let signedIntegrity: ReturnType<typeof assertRunIntegrity>
  try {
    signedIntegrity = assertRunIntegrity(run, input.signingSecret)
  } catch {
    verifiedIntegrityFailure('RUN_FACTS')
  }
  if (!suite || suite._id !== run.suiteId || suite.id !== run.suiteId || suite.manifestHash !== run.suiteHash) {
    verifiedIntegrityFailure('SUITE_IDENTITY')
  }
  const { _id: _suiteId, createdAt: _createdAt, manifestHash: storedSuiteHash, ...suiteBase } = suite
  if (canonicalHash(suiteBase) !== storedSuiteHash || storedSuiteHash !== PB_IMAGE_DIAGNOSTIC_V1.manifestHash) {
    verifiedIntegrityFailure('SUITE_HASH')
  }
  const suiteCases = Array.isArray(suite.cases) ? suite.cases : []
  if (suite.caseCount !== 48 || suiteCases.length !== 48 || new Set(suiteCases.map((item: AnyRecord) => item.id)).size !== 48) {
    verifiedIntegrityFailure('SUITE_SHAPE')
  }
  const casesById = new Map<string, AnyRecord>()
  for (const diagnosticCase of suiteCases) {
    const { manifestHash, ...caseBase } = diagnosticCase
    if (!diagnosticCase.id || !benchmarkHashPattern.test(String(manifestHash || '')) || canonicalHash(caseBase) !== manifestHash) {
      verifiedIntegrityFailure('CASE_HASH')
    }
    casesById.set(diagnosticCase.id, diagnosticCase)
  }
  const capabilityPlan = planBenchmarkCases(suiteCases, Array.isArray(run.aspectRatios) ? run.aspectRatios : [])
  if (canonicalHash(run.capabilityGaps || []) !== canonicalHash(capabilityPlan.capabilityGaps)) {
    verifiedIntegrityFailure('CAPABILITY_GAPS')
  }
  const executableCasesById = new Map(capabilityPlan.executableCases.map((diagnosticCase) => [diagnosticCase.id, diagnosticCase]))
  const expectedSampleCount = capabilityPlan.executableCases.length * 3

  const candidateFacts = signedIntegrity!.candidateSnapshot
  const fullApprovalVersion = signedIntegrity!.approvalVersions.find((version) => version.phase === 'full')
  if (!fullApprovalVersion) verifiedIntegrityFailure('FULL_APPROVAL')

  const fullSamples = runSamples.filter((sample) => sample.phase === 'full')
  if (fullSamples.length !== expectedSampleCount) verifiedIntegrityFailure('SAMPLE_CARDINALITY')
  const sampleIds = new Set<string>()
  const repetitionsByCase = new Map<string, Set<number>>()
  for (const sample of fullSamples) {
    const diagnosticCase = executableCasesById.get(sample.caseId)
    const expectedSampleId = diagnosticCase && Number.isInteger(sample.repetition)
      ? benchmarkSampleId(String(run._id), 'full', sample.caseId, sample.repetition)
      : ''
    const expectedRubricHash = diagnosticCase ? canonicalHash(diagnosticCase.rubric) : ''
    if (!diagnosticCase || sample.runId !== run._id || sample.phase !== 'full' || sample.status !== 'completed'
      || sample.sampleId !== expectedSampleId || sample._id !== expectedSampleId || sampleIds.has(sample.sampleId)
      || ![0, 1, 2].includes(sample.repetition)
      || !benchmarkHashPattern.test(String(sample.imageHash || ''))
      || sample.imageObjectKey !== `bench/objects/${sample.imageHash}.png`
      || !benchmarkHashPattern.test(String(sample.rubricHash || ''))
      || canonicalHash(sample.rubric) !== sample.rubricHash || sample.rubricHash !== expectedRubricHash) {
      verifiedIntegrityFailure('SAMPLE_SHAPE')
    }
    if (!Number.isInteger(sample.latencyMs) || sample.latencyMs <= 0 || sample.latencyMs > maxVerifiedLatencyMs) {
      verifiedIntegrityFailure('SAMPLE_LATENCY')
    }
    sampleIds.add(sample.sampleId)
    const repetitions = repetitionsByCase.get(sample.caseId) || new Set<number>()
    repetitions.add(sample.repetition)
    repetitionsByCase.set(sample.caseId, repetitions)
  }
  if (repetitionsByCase.size !== capabilityPlan.executableCases.length || [...executableCasesById].some(([caseId]) => {
    const repetitions = repetitionsByCase.get(caseId)
    return !repetitions || repetitions.size !== 3 || [0, 1, 2].some((value) => !repetitions.has(value))
  })) verifiedIntegrityFailure('CASE_REPETITIONS')

  const automaticJudgments = runJudgments.filter((judgment) => judgment.status === 'completed' && judgment.phase === 'full')
  if (automaticJudgments.length !== expectedSampleCount * 2) verifiedIntegrityFailure('AUTOMATIC_CARDINALITY')
  const automaticKeys = new Set<string>()
  const automaticBySample = new Map<string, AnyRecord[]>()
  for (const judgment of automaticJudgments) {
    const key = `${judgment.sampleId}:${judgment.provider}`
    if (judgment.runId !== run._id || !sampleIds.has(judgment.sampleId) || judgment.source === 'codex'
      || !['openrouter', 'bailian'].includes(judgment.provider) || judgment.judgeEpoch !== run.judgeEpoch
      || automaticKeys.has(key) || !exactAxisScores(judgment.scores)
      || !Number.isFinite(judgment.confidence) || judgment.confidence < 0 || judgment.confidence > 1
      || !validEvidence(judgment.evidence) || normalizedAutomaticRedLines(judgment.redLines) === null) {
      verifiedIntegrityFailure('AUTOMATIC_SHAPE')
    }
    automaticKeys.add(key)
    const pair = automaticBySample.get(judgment.sampleId) || []
    pair.push(judgment)
    automaticBySample.set(judgment.sampleId, pair)
  }
  if ([...sampleIds].some((sampleId) => !automaticKeys.has(`${sampleId}:openrouter`) || !automaticKeys.has(`${sampleId}:bailian`))) {
    verifiedIntegrityFailure('AUTOMATIC_COVERAGE')
  }

  let sourceManifest: ReturnType<typeof buildPhaseReviewSourceManifest>
  try { sourceManifest = buildPhaseReviewSourceManifest(run, fullSamples, runJudgments, runDispatches, 'full') }
  catch { verifiedIntegrityFailure('SOURCE_MANIFEST') }
  const expectedAuditIds = sourceManifest.expectedAuditIds
  const auditSamples = fullSamples.filter((sample) => sample.auditRequired === true).sort((left, right) => left.sampleId.localeCompare(right.sampleId))
  const auditIds = auditSamples.map((sample) => sample.sampleId)
  if (!sameStringSet(expectedAuditIds, auditIds)) verifiedIntegrityFailure('AUDIT_SET')
  const packet = run.reviewPacket
  if (!auditSamples.length || !packet || packet.phase !== 'full' || packet.runHash !== run.runHash
    || packet.reviewerEpoch !== run.reviewerEpoch || run.importedReviewPacketHash !== packet.packetHash
    || !benchmarkHashPattern.test(String(packet.packetHash || '')) || !benchmarkHashPattern.test(String(run.importedReviewHash || ''))) {
    verifiedIntegrityFailure('CODEX_PACKET_IDENTITY')
  }
  const expectedPacketHash = canonicalHash({
    schemaVersion: packet.schemaVersion,
    reviewerEpoch: packet.reviewerEpoch,
    runHash: packet.runHash,
    phase: packet.phase,
    issuedAt: packet.issuedAt,
    expiresAt: packet.expiresAt,
    sourceManifestHash: packet.sourceManifestHash,
    sourceManifestAttestation: packet.sourceManifestAttestation,
    samples: packet.samples,
  })
  if (expectedPacketHash !== packet.packetHash || !Array.isArray(packet.samples) || packet.samples.length !== auditSamples.length) {
    verifiedIntegrityFailure('CODEX_PACKET_HASH')
  }
  try { assertPhaseSourceManifest(run, packet, fullSamples, runJudgments, runDispatches, 'full', input.signingSecret) }
  catch { verifiedIntegrityFailure('SOURCE_MANIFEST') }
  const auditById = new Map(auditSamples.map((sample) => [sample.sampleId, sample]))
  const packetSampleIds = new Set<string>()
  for (const packetSample of packet.samples) {
    const sample = auditById.get(packetSample.sampleId)
    if (!sample || packetSampleIds.has(packetSample.sampleId)
      || packetSample.imageObjectKey !== sample.imageObjectKey || packetSample.imageHash !== sample.imageHash
      || packetSample.rubricHash !== sample.rubricHash || canonicalHash(packetSample.rubric) !== sample.rubricHash) {
      verifiedIntegrityFailure('CODEX_PACKET_SAMPLE')
    }
    packetSampleIds.add(packetSample.sampleId)
  }
  const acceptedCodex = runJudgments.filter((judgment) => judgment.source === 'codex' && judgment.accepted === true
    && judgment.phase === 'full' && judgment.reviewerEpoch === run.reviewerEpoch && judgment.packetHash === packet.packetHash
    && judgment.reviewHash === run.importedReviewHash && judgment.reviewAttestation === run.importedReviewAttestation)
  if (acceptedCodex.length !== auditSamples.length
    || new Set(acceptedCodex.map((judgment) => judgment.sampleId)).size !== auditSamples.length
    || !sameStringSet(expectedAuditIds, [...packetSampleIds])
    || !sameStringSet(expectedAuditIds, acceptedCodex.map((judgment) => judgment.sampleId))
    || acceptedCodex.some((judgment) => !packetSampleIds.has(judgment.sampleId)
      || !exactAxisScores(judgment.scores) || !validEvidence(judgment.evidence)
      || !Number.isFinite(judgment.confidence) || judgment.confidence < 0 || judgment.confidence > 1
      || !validConfirmedRedLines(judgment.confirmedRedLines))) {
    verifiedIntegrityFailure('CODEX_ACCEPTED_COVERAGE')
  }
  try {
    const attested = verifyCodexReviewAttestation(packet, acceptedCodex as any, run.importedReviewAttestation, input.signingSecret)
    if (attested.reviewHash !== run.importedReviewHash) verifiedIntegrityFailure('CODEX_REVIEW_HASH')
  } catch {
    verifiedIntegrityFailure('CODEX_ATTESTATION')
  }
  const codexBySample = new Map(acceptedCodex.map((judgment) => [judgment.sampleId, judgment]))
  const observations = fullSamples.map((sample) => {
    const automatic = automaticBySample.get(sample.sampleId) || []
    const codex = codexBySample.get(sample.sampleId)
    const scores = codex
      ? applyCodexAdjudication({ automatic: automatic.map((judgment) => ({ scores: judgment.scores, redLines: judgment.redLines || [] })), codex: codex as any }).scores
      : Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, automatic.reduce((sum, judgment) => sum + Number(judgment.scores[axis]), 0) / automatic.length]))
    if (BENCHMARK_AXES.some((axis) => !Number.isFinite(scores[axis]))) verifiedIntegrityFailure('SCORE_RECOMPUTE')
    return { caseId: sample.caseId, scores }
  })
  const dimensions = aggregateAxisScores(observations, { seed: run.runHash })
  if (BENCHMARK_AXES.some((axis) => dimensions[axis].caseCount !== capabilityPlan.executableCases.length || dimensions[axis].sampleCount !== expectedSampleCount)) {
    verifiedIntegrityFailure('SCORE_COVERAGE')
  }
  const completedCases = new Set(fullSamples.map((sample) => sample.caseId)).size
  const latencies = fullSamples.map((sample) => sample.latencyMs as number).sort((left, right) => left - right)
  const percentile = (probability: number) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * probability))] / 1_000 : 0

  const evidenceObjects = fullSamples.map((sample) => ({ sampleId: sample.sampleId, objectKey: sample.imageObjectKey, imageHash: sample.imageHash }))
    .sort((left, right) => left.sampleId.localeCompare(right.sampleId))
  const generationCalls = fullSamples.length
  const logicalJudgments = automaticJudgments.length
  const judgeDispatchCalls = sourceManifest.facts.usage.judgeDispatchCalls
  const automaticJudgeCalls = logicalJudgments
  const estimatedUsd = Number((generationCalls * fullApprovalVersion!.approval.priceSnapshot.estimatedPerGeneration
    + judgeDispatchCalls * fullApprovalVersion!.approval.priceSnapshot.estimatedPerJudgeCall).toFixed(12))
  if (generationCalls > fullApprovalVersion!.approval.maxGenerations || logicalJudgments > fullApprovalVersion!.approval.maxJudgments
    || judgeDispatchCalls > fullApprovalVersion!.approval.maxJudgeCalls
    || estimatedUsd > fullApprovalVersion!.approval.maxEstimatedUsd) verifiedIntegrityFailure('FULL_APPROVAL_CAPS')
  return {
    sampleCount: fullSamples.length,
    auditRatio: auditSamples.length / fullSamples.length,
    coverage: completedCases / capabilityPlan.executableCases.length,
    capabilityCoverage: capabilityPlan.executableCases.length / suiteCases.length,
    successRate: fullSamples.length / expectedSampleCount,
    capabilityGaps: capabilityPlan.capabilityGaps,
    dimensions,
    latency: { p50Seconds: percentile(0.5), p90Seconds: percentile(0.9) },
    evidenceManifestHash: canonicalHash(evidenceObjects),
    evidenceObjects,
    candidateHash: canonicalHash(candidateFacts),
    displayName: candidateFacts.displayName,
    providerLabel: candidateFacts.providerLabel,
    developer: candidateFacts.developer,
    provider: candidateFacts.provider,
    modelId: candidateFacts.modelId,
    lane: candidateFacts.lane,
    registryHash: candidateFacts.registryHash,
    codeSha: signedIntegrity!.runFacts.codeSha,
    priceHash: fullApprovalVersion!.priceHash,
    authorizationHash: fullApprovalVersion!.authorizationHash,
    priceSnapshot: fullApprovalVersion!.approval.priceSnapshot,
    estimatedCost: { usd: estimatedUsd, generationCalls, automaticJudgeCalls, logicalJudgments, judgeDispatchCalls },
  }
}

function assertQuickReleaseIntegrity(input: {
  run: AnyRecord
  suite: AnyRecord | null
  runSamples: AnyRecord[]
  runJudgments: AnyRecord[]
  runDispatches: AnyRecord[]
  signingSecret: string
}) {
  const { run, suite, runSamples, runJudgments, runDispatches } = input
  let signedIntegrity: ReturnType<typeof assertRunIntegrity>
  try { signedIntegrity = assertRunIntegrity(run, input.signingSecret) }
  catch { verifiedIntegrityFailure('QUICK_RUN_FACTS') }
  if (!suite || suite._id !== run.suiteId || suite.id !== run.suiteId || suite.manifestHash !== run.suiteHash) verifiedIntegrityFailure('QUICK_SUITE')
  const { _id: _suiteId, createdAt: _createdAt, manifestHash: storedSuiteHash, ...suiteBase } = suite!
  if (canonicalHash(suiteBase) !== storedSuiteHash || storedSuiteHash !== PB_IMAGE_DIAGNOSTIC_V1.manifestHash) verifiedIntegrityFailure('QUICK_SUITE')
  const suiteCases = Array.isArray(suite!.cases) ? suite!.cases : []
  const casesById = new Map(suiteCases.map((item: AnyRecord) => [item.id, item]))
  const quickCases = PB_IMAGE_DIAGNOSTIC_V1.quickCaseIds.map((id) => casesById.get(id)).filter(Boolean) as AnyRecord[]
  if (quickCases.length !== PB_IMAGE_DIAGNOSTIC_V1.quickCaseIds.length) verifiedIntegrityFailure('QUICK_CASES')
  const capabilityPlan = planBenchmarkCases(quickCases as any, Array.isArray(run.aspectRatios) ? run.aspectRatios : [])
  const expectedCases = new Map(capabilityPlan.executableCases.map((item) => [item.id, item]))
  const expectedSampleCount = expectedCases.size * 2
  if (canonicalHash(run.capabilityGaps || []) !== canonicalHash(capabilityPlan.capabilityGaps)) verifiedIntegrityFailure('QUICK_CAPABILITY_GAPS')
  const quickSamples = runSamples.filter((sample) => sample.phase === 'quick')
  if (quickSamples.length !== expectedSampleCount) verifiedIntegrityFailure('QUICK_SAMPLE_CARDINALITY')
  const sampleIds = new Set<string>()
  const repetitionsByCase = new Map<string, Set<number>>()
  for (const sample of quickSamples) {
    const diagnosticCase = expectedCases.get(sample.caseId)
    const rubricCase = casesById.get(sample.caseId)
    const expectedSampleId = diagnosticCase && Number.isInteger(sample.repetition) ? benchmarkSampleId(String(run._id), 'quick', sample.caseId, sample.repetition) : ''
    if (!diagnosticCase || sample.runId !== run._id || sample.phase !== 'quick' || sample.status !== 'completed'
      || sample._id !== expectedSampleId || sample.sampleId !== expectedSampleId || sampleIds.has(sample.sampleId)
      || ![0, 1].includes(sample.repetition) || !benchmarkHashPattern.test(String(sample.imageHash || ''))
      || sample.imageObjectKey !== `bench/objects/${sample.imageHash}.png` || canonicalHash(sample.rubric) !== sample.rubricHash
      || !rubricCase || sample.rubricHash !== canonicalHash(rubricCase.rubric) || !Number.isInteger(sample.latencyMs) || sample.latencyMs <= 0 || sample.latencyMs > maxVerifiedLatencyMs) {
      verifiedIntegrityFailure('QUICK_SAMPLE_SHAPE')
    }
    sampleIds.add(sample.sampleId)
    const repetitions = repetitionsByCase.get(sample.caseId) || new Set<number>()
    repetitions.add(sample.repetition)
    repetitionsByCase.set(sample.caseId, repetitions)
  }
  if ([...expectedCases].some(([caseId]) => {
    const repetitions = repetitionsByCase.get(caseId)
    return !repetitions || repetitions.size !== 2 || !repetitions.has(0) || !repetitions.has(1)
  })) verifiedIntegrityFailure('QUICK_REPETITIONS')
  const automatic = runJudgments.filter((judgment) => judgment.phase === 'quick' && judgment.status === 'completed')
  if (automatic.length !== expectedSampleCount * 2) verifiedIntegrityFailure('QUICK_AUTOMATIC_CARDINALITY')
  const automaticKeys = new Set<string>()
  const automaticBySample = new Map<string, AnyRecord[]>()
  for (const judgment of automatic) {
    const key = `${judgment.sampleId}:${judgment.provider}`
    if (judgment.runId !== run._id || !sampleIds.has(judgment.sampleId) || !['openrouter', 'bailian'].includes(judgment.provider)
      || judgment.judgeEpoch !== run.judgeEpoch || automaticKeys.has(key) || !exactAxisScores(judgment.scores)
      || !validEvidence(judgment.evidence) || normalizedAutomaticRedLines(judgment.redLines) === null
      || !Number.isFinite(judgment.confidence) || judgment.confidence < 0 || judgment.confidence > 1) verifiedIntegrityFailure('QUICK_AUTOMATIC_SHAPE')
    automaticKeys.add(key)
    const pair = automaticBySample.get(judgment.sampleId) || []
    pair.push(judgment)
    automaticBySample.set(judgment.sampleId, pair)
  }
  if ([...sampleIds].some((sampleId) => !automaticKeys.has(`${sampleId}:openrouter`) || !automaticKeys.has(`${sampleId}:bailian`))) verifiedIntegrityFailure('QUICK_AUTOMATIC_COVERAGE')
  let sourceManifest: ReturnType<typeof buildPhaseReviewSourceManifest>
  try { sourceManifest = buildPhaseReviewSourceManifest(run, quickSamples, runJudgments, runDispatches, 'quick') }
  catch { verifiedIntegrityFailure('QUICK_SOURCE_MANIFEST') }
  const packet = run.reviewPacket
  try { assertPhaseSourceManifest(run, packet, quickSamples, runJudgments, runDispatches, 'quick', input.signingSecret) }
  catch { verifiedIntegrityFailure('QUICK_SOURCE_MANIFEST') }
  const expectedAuditIds = sourceManifest.expectedAuditIds
  const auditSamples = quickSamples.filter((sample) => sample.auditRequired === true)
  if (!packet || packet.phase !== 'quick' || packet.runHash !== run.runHash || packet.reviewerEpoch !== run.reviewerEpoch
    || run.importedReviewPacketHash !== packet.packetHash || !sameStringSet(expectedAuditIds, auditSamples.map((sample) => sample.sampleId))
    || !sameStringSet(expectedAuditIds, Array.isArray(packet.samples) ? packet.samples.map((sample: AnyRecord) => sample.sampleId) : [])) {
    verifiedIntegrityFailure('QUICK_PACKET')
  }
  const acceptedCodex = runJudgments.filter((judgment) => judgment.source === 'codex' && judgment.accepted === true
    && judgment.phase === 'quick' && judgment.reviewerEpoch === run.reviewerEpoch && judgment.packetHash === packet.packetHash
    && judgment.reviewHash === run.importedReviewHash && judgment.reviewAttestation === run.importedReviewAttestation)
  if (acceptedCodex.length !== auditSamples.length || !sameStringSet(expectedAuditIds, acceptedCodex.map((item) => item.sampleId))
    || acceptedCodex.some((item) => !exactAxisScores(item.scores) || !validEvidence(item.evidence)
      || !Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1 || !validConfirmedRedLines(item.confirmedRedLines))) {
    verifiedIntegrityFailure('QUICK_CODEX')
  }
  try {
    const attested = verifyCodexReviewAttestation(packet, acceptedCodex as any, run.importedReviewAttestation, input.signingSecret)
    if (attested.reviewHash !== run.importedReviewHash) verifiedIntegrityFailure('QUICK_CODEX')
  } catch { verifiedIntegrityFailure('QUICK_CODEX') }
  const codexBySample = new Map(acceptedCodex.map((item) => [item.sampleId, item]))
  const observations = quickSamples.map((sample) => {
    const pair = automaticBySample.get(sample.sampleId) || []
    const codex = codexBySample.get(sample.sampleId)
    const scores = codex ? applyCodexAdjudication({ automatic: pair as any, codex: codex as any }).scores
      : Object.fromEntries(BENCHMARK_AXES.map((axis) => [axis, pair.reduce((sum, item) => sum + Number(item.scores[axis]), 0) / pair.length]))
    return { caseId: sample.caseId, scores }
  })
  const dimensions = aggregateAxisScores(observations, { seed: run.runHash })
  const quickApproval = signedIntegrity!.approvalVersions.find((version) => version.phase === 'quick')
  if (!quickApproval) verifiedIntegrityFailure('QUICK_APPROVAL')
  const generationCalls = quickSamples.length
  const logicalJudgments = automatic.length
  const judgeDispatchCalls = sourceManifest.facts.usage.judgeDispatchCalls
  const estimatedUsd = Number((generationCalls * quickApproval!.approval.priceSnapshot.estimatedPerGeneration
    + judgeDispatchCalls * quickApproval!.approval.priceSnapshot.estimatedPerJudgeCall).toFixed(12))
  if (generationCalls > quickApproval!.approval.maxGenerations || logicalJudgments > quickApproval!.approval.maxJudgments
    || judgeDispatchCalls > quickApproval!.approval.maxJudgeCalls || estimatedUsd > quickApproval!.approval.maxEstimatedUsd) {
    verifiedIntegrityFailure('QUICK_APPROVAL_CAPS')
  }
  const candidate = signedIntegrity!.candidateSnapshot
  return {
    sampleCount: generationCalls, auditRatio: auditSamples.length / generationCalls,
    coverage: expectedCases.size ? new Set(quickSamples.map((sample) => sample.caseId)).size / expectedCases.size : 0,
    capabilityCoverage: expectedCases.size / quickCases.length, successRate: generationCalls / expectedSampleCount,
    capabilityGaps: capabilityPlan.capabilityGaps, dimensions,
    displayName: candidate.displayName, providerLabel: candidate.providerLabel, developer: candidate.developer,
    provider: candidate.provider, modelId: candidate.modelId, lane: candidate.lane, registryHash: candidate.registryHash,
    codeSha: signedIntegrity!.runFacts.codeSha, priceHash: quickApproval!.priceHash,
    authorizationHash: quickApproval!.authorizationHash, priceSnapshot: quickApproval!.approval.priceSnapshot,
    estimatedCost: { usd: estimatedUsd, generationCalls, automaticJudgeCalls: logicalJudgments, logicalJudgments, judgeDispatchCalls },
  }
}

export async function verifyEvidenceObjects(
  objects: readonly { objectKey: string; imageHash: string }[],
  verifyEvidence: (objectKey: string, imageHash: string, options?: { signal?: AbortSignal; timeoutMs?: number }) => Promise<void>,
  options: { concurrency?: number; deadlineMs?: number; retries?: number } = {},
) {
  const concurrency = Math.max(1, Math.min(16, options.concurrency || 8))
  const deadline = Date.now() + Math.max(1_000, options.deadlineMs || 30_000)
  const retries = Math.max(0, Math.min(2, options.retries ?? 1))
  const controller = new AbortController()
  let stopped = false
  let terminalError: unknown
  let cursor = 0
  const deadlineTimer = setTimeout(() => {
    terminalError ||= new Error('deadline')
    stopped = true
    controller.abort()
  }, Math.max(1, deadline - Date.now()))
  const verifyOne = async (item: { objectKey: string; imageHash: string }) => {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const remaining = deadline - Date.now()
      if (remaining <= 0 || controller.signal.aborted) throw terminalError || new Error('deadline')
      let abortListener: (() => void) | undefined
      try {
        await Promise.race([
          verifyEvidence(item.objectKey, item.imageHash, { signal: controller.signal, timeoutMs: remaining }),
          new Promise<never>((_, reject) => {
            abortListener = () => reject(terminalError || new Error('aborted'))
            controller.signal.addEventListener('abort', abortListener, { once: true })
          }),
        ])
        return
      } catch (error) {
        if (controller.signal.aborted || attempt === retries || Date.now() >= deadline) throw error
      } finally {
        if (abortListener) controller.signal.removeEventListener('abort', abortListener)
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, objects.length) }, async () => {
    while (!stopped && cursor < objects.length) {
      const item = objects[cursor++]
      try {
        await verifyOne(item)
      } catch (error) {
        if (!terminalError) terminalError = error
        stopped = true
        controller.abort()
        return
      }
    }
  })
  await Promise.allSettled(workers)
  clearTimeout(deadlineTimer)
  if (terminalError || controller.signal.aborted) {
    verifiedIntegrityFailure('IMAGE_EVIDENCE')
  }
}

export function verifyScientificV2EvidenceMetadata(
  objectKey: string,
  expectedHash: string,
  facts: { mimeType: string; cacheControl: string; sha256: string; acl: string },
) {
  const privateMatch = objectKey.match(/^bench\/scientific-v2\/private\/objects\/([a-f0-9]{64})\.(png|jpeg|webp)$/)
  const publicMatch = objectKey.match(/^bench\/scientific-v2\/public\/([a-f0-9]{64})\/(thumbnail|detail|full)\.webp$/)
  if (!privateMatch && !publicMatch) throw new Error('SCIENTIFIC_V2_OBJECT_KEY_INVALID')
  if (facts.sha256 !== expectedHash) throw new Error('SCIENTIFIC_V2_OBJECT_METADATA_MISMATCH')
  const privateOrUninspectableAcl = facts.acl === 'private' || facts.acl === 'unavailable'
  if (privateMatch) {
    const expectedMime = privateMatch[2] === 'jpeg' ? 'image/jpeg' : `image/${privateMatch[2]}`
    if (privateMatch[1] !== expectedHash || facts.mimeType !== expectedMime
      || facts.cacheControl !== 'private, no-store' || !privateOrUninspectableAcl) {
      throw new Error('SCIENTIFIC_V2_OBJECT_METADATA_MISMATCH')
    }
    return
  }
  if (facts.mimeType !== 'image/webp' || facts.cacheControl !== 'public, max-age=31536000, immutable'
    || !privateOrUninspectableAcl) throw new Error('SCIENTIFIC_V2_OBJECT_METADATA_MISMATCH')
}

function text(value: unknown, max = 160) {
  return String(value || '').trim().slice(0, max)
}

function positiveInteger(value: unknown, max = 100_000) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 && number <= max ? number : 0
}

export function judgeCalibrationId(judgeEpoch: string, judgeStackHash: string) {
  return `benchmark-judge-calibration:${judgeEpoch}:${judgeStackHash}`
}

export function buildJudgeCalibrationRecord(input: Record<string, any>, codeShaValue: string, judgeStackHashValue: string, adminUserIdValue: string, recordedAt: Date, operatorReportValue: unknown) {
  const fail = () => { throw new Error('BENCHMARK_JUDGE_CALIBRATION_FAILED') }
  if (!operatorReportValue || typeof operatorReportValue !== 'object' || Array.isArray(operatorReportValue)) fail()
  const operatorReport = operatorReportValue as Record<string, any>
  const operatorReportHash = text(operatorReport.operatorReportHash)
  const reportObjectKey = text(input.reportObjectKey, 300)
  const codeSha = text(codeShaValue)
  const judgeStackHash = text(judgeStackHashValue)
  const recordedBy = text(adminUserIdValue)
  const reportHashBase = { ...operatorReport }
  delete reportHashBase.operatorReportHash
  delete reportHashBase.reportObjectKey
  const authorization = operatorReport.authorization && typeof operatorReport.authorization === 'object' && !Array.isArray(operatorReport.authorization)
    ? { ...operatorReport.authorization }
    : null
  const authorizationHash = text(authorization?.authorizationHash)
  const authorizationBase = authorization ? { ...authorization } : null
  if (authorizationBase) delete authorizationBase.authorizationHash
  const priceHash = text(operatorReport.priceHash)
  const judgeEpoch = text(operatorReport.judgeEpoch)
  const result = operatorReport.result && typeof operatorReport.result === 'object' && !Array.isArray(operatorReport.result)
    ? operatorReport.result
    : {}
  const fixtureHash = text(result.fixtureHash)
  const correctRedLines = positiveInteger(result.correctRedLines, 10_000)
  const totalRedLines = positiveInteger(result.totalRedLines, 10_000)
  const agreement = Number(result.agreement)
  const accuracy = totalRedLines ? correctRedLines / totalRedLines : 0
  const hash64 = /^[a-f0-9]{64}$/i
  const priceSnapshot = operatorReport.priceSnapshot && typeof operatorReport.priceSnapshot === 'object' && !Array.isArray(operatorReport.priceSnapshot)
    ? {
        currency: text(operatorReport.priceSnapshot.currency, 8),
        source: text(operatorReport.priceSnapshot.source, 500),
        capturedAt: text(operatorReport.priceSnapshot.capturedAt, 40),
        estimatedPerGenerationUsd: Number(operatorReport.priceSnapshot.estimatedPerGenerationUsd),
        estimatedPerJudgeCallUsd: Number(operatorReport.priceSnapshot.estimatedPerJudgeCallUsd),
      }
    : null
  const usage = operatorReport.usage && typeof operatorReport.usage === 'object' && !Array.isArray(operatorReport.usage)
    ? {
        generations: Number(operatorReport.usage.generations),
        judgments: Number(operatorReport.usage.judgments),
        estimatedUsd: Number(operatorReport.usage.estimatedUsd),
      }
    : null
  let source: URL | undefined
  let capturedAt = ''
  try {
    source = new URL(priceSnapshot?.source || '')
    capturedAt = new Date(priceSnapshot?.capturedAt || '').toISOString()
  } catch {}
  const priceValid = priceSnapshot
    && authorization
    && priceSnapshot.currency === 'USD'
    && source?.protocol === 'https:' && !source.username && !source.password
    && source.toString() === priceSnapshot.source
    && capturedAt === priceSnapshot.capturedAt
    && Number.isFinite(priceSnapshot.estimatedPerGenerationUsd) && priceSnapshot.estimatedPerGenerationUsd === 0
    && Number.isFinite(priceSnapshot.estimatedPerJudgeCallUsd) && priceSnapshot.estimatedPerJudgeCallUsd > 0
    && priceSnapshot.estimatedPerJudgeCallUsd <= 100
    && canonicalHash(priceSnapshot) === priceHash
    && canonicalHash(priceSnapshot) === canonicalHash(authorization?.priceSnapshot)
  const usageValid = usage
    && Number.isInteger(usage.generations) && usage.generations === 0
    && Number.isInteger(usage.judgments) && usage.judgments >= 12 && usage.judgments <= 24
    && Number.isFinite(usage.estimatedUsd) && usage.estimatedUsd >= 0 && usage.estimatedUsd <= 3
    && priceSnapshot
    && Math.abs(usage.estimatedUsd - usage.judgments * priceSnapshot.estimatedPerJudgeCallUsd) <= 1e-9
  const requestedFacts = {
    judgeEpoch: text(input.judgeEpoch), fixtureHash: text(input.fixtureHash),
    correctRedLines: positiveInteger(input.correctRedLines, 10_000), totalRedLines: positiveInteger(input.totalRedLines, 10_000),
    agreement: Number(input.agreement), operatorReportHash: text(input.operatorReportHash),
    authorizationHash: text(input.authorizationHash), priceHash: text(input.priceHash),
    priceSnapshot: input.priceSnapshot, usage: input.usage,
  }
  const verifiedFacts = { judgeEpoch, fixtureHash, correctRedLines, totalRedLines, agreement, operatorReportHash, authorizationHash, priceHash, priceSnapshot, usage }
  let createdAt = ''
  try { createdAt = new Date(text(operatorReport.createdAt, 40)).toISOString() } catch {}
  if (!judgeEpoch || operatorReport.operatorMode !== 'calibration'
    || operatorReport.codeSha !== codeSha || operatorReport.judgeStackHash !== judgeStackHash
    || canonicalHash(reportHashBase) !== operatorReportHash
    || !authorization || !authorizationBase || canonicalHash(authorizationBase) !== authorizationHash
    || authorization.mode !== 'calibration' || authorization.codeSha !== codeSha
    || authorization.maxGenerations !== 0 || !Number.isInteger(authorization.maxJudgeCalls)
    || authorization.maxJudgeCalls < 12 || authorization.maxJudgeCalls > 24
    || !Number.isFinite(authorization.maxEstimatedUsd) || authorization.maxEstimatedUsd <= 0 || authorization.maxEstimatedUsd > 3
    || authorization.estimatedPerGenerationUsd !== 0
    || authorization.estimatedPerJudgeCallUsd !== priceSnapshot?.estimatedPerJudgeCallUsd
    || usage && usage.judgments > authorization.maxJudgeCalls
    || usage && usage.estimatedUsd > authorization.maxEstimatedUsd
    || authorization.maxJudgeCalls * authorization.estimatedPerJudgeCallUsd - authorization.maxEstimatedUsd > 1e-9
    || authorization.priceHash !== priceHash || operatorReport.authorizationHash !== authorizationHash
    || createdAt !== operatorReport.createdAt || result.passed !== true || Number(result.accuracy) !== accuracy
    || canonicalHash(requestedFacts) !== canonicalHash(verifiedFacts)
    || !hash64.test(fixtureHash) || !hash64.test(operatorReportHash)
    || reportObjectKey !== `bench/operator-reports/${operatorReportHash}.json`
    || !hash64.test(authorizationHash) || !hash64.test(priceHash)
    || !/^[a-f0-9]{40}$/i.test(codeSha) || !hash64.test(judgeStackHash)
    || !correctRedLines || !totalRedLines || correctRedLines > totalRedLines || accuracy < 0.85
    || !Number.isFinite(agreement) || agreement < 0.8 || agreement > 1
    || !/^[A-Za-z0-9._:-]{3,200}$/.test(recordedBy)
    || !priceValid || !usageValid || Number.isNaN(recordedAt.getTime())) fail()
  return {
    judgeEpoch, fixtureHash, codeSha, judgeStackHash, correctRedLines, totalRedLines, accuracy, agreement,
    operatorReportHash, reportObjectKey, authorizationHash, priceHash, priceSnapshot, usage,
    passed: true, recordedBy, recordedAt,
  }
}

function adminCandidate(candidate: AnyRecord) {
  return {
    candidateId: text(candidate._id || candidate.candidateId),
    provider: text(candidate.provider),
    modelId: text(candidate.modelId),
    developer: text(candidate.developer),
    lane: candidate.lane || null,
    state: candidate.state,
    registryHash: candidate.registryHash,
    canonicalModelId: candidate.canonicalModelId || candidate.modelId,
    primaryAccessProvider: candidate.primaryAccessProvider || candidate.provider,
    alternateAccessProviders: candidate.alternateAccessProviders || [],
    detectedAt: candidate.detectedAt,
    approval: candidate.approval ? {
      entitlementConfirmed: candidate.approval.entitlementConfirmed === true,
      priceSnapshot: candidate.approval.priceSnapshot,
      maxGenerations: candidate.approval.maxGenerations,
      maxJudgments: candidate.approval.maxJudgments,
      maxJudgeCalls: candidate.approval.maxJudgeCalls,
      maxEstimatedUsd: candidate.approval.maxEstimatedUsd,
      approvedAt: candidate.approval.approvedAt,
    } : undefined,
  }
}

export function buildPhaseOperatorAttestation(run: AnyRecord, reviewSigningSecret: string) {
  const phase = run?.state === 'quick_running' ? 'quick' : run?.state === 'full_running' ? 'full' : run?.state === 'standard_running' ? 'standard' : ''
  if (!phase) throw new Error('BENCHMARK_PHASE_OPERATOR_ATTESTATION_NOT_RUNNING')
  let verified: ReturnType<typeof assertPhaseApproval>
  try { verified = assertPhaseApproval(run, phase, reviewSigningSecret) }
  catch { throw new Error('BENCHMARK_PHASE_OPERATOR_ATTESTATION_INVALID') }
  const approvalVersion = verified.approvalVersion
  const immutable = benchmarkImmutableRunBinding({
    runHash: verified.integrity.runHash,
    runFacts: verified.integrity.runFacts,
    candidateSnapshot: verified.integrity.candidateSnapshot,
    runIntegrityAttestation: run.runIntegrityAttestation,
  })
  return Object.freeze({
    schemaVersion: 2 as const,
    runId: String(run._id), phase, state: run.state, codeSha: run.codeSha,
    provider: run.provider, modelId: run.modelId, lane: run.lane,
    suiteId: run.suiteId, suiteHash: run.suiteHash,
    judgeEpoch: run.judgeEpoch, judgeStackHash: run.judgeStackHash,
    signedAuthorizationHash: approvalVersion.authorizationHash,
    priceHash: approvalVersion.priceHash,
    immutableFacts: immutable.immutableFacts,
    immutableFactsHash: immutable.immutableFactsHash,
    runHash: immutable.runHash,
    runFactsHash: immutable.runFactsHash,
    candidateSnapshotHash: immutable.candidateSnapshotHash,
    aspectRatiosHash: immutable.aspectRatiosHash,
    registryHash: immutable.registryHash,
    runIntegrityAttestation: immutable.runIntegrityAttestation,
    maxGenerations: approvalVersion.approval.maxGenerations,
    maxJudgments: approvalVersion.approval.maxJudgments,
    maxJudgeCalls: approvalVersion.approval.maxJudgeCalls,
    maxEstimatedUsd: approvalVersion.approval.maxEstimatedUsd,
    priceSnapshot: Object.freeze({ ...approvalVersion.approval.priceSnapshot }),
  })
}

export function createMongoBenchmarkRepository(
  db: Db,
  now = () => new Date(),
  verifyEvidence: (objectKey: string, imageHash: string, options?: { signal?: AbortSignal; timeoutMs?: number }) => Promise<void> = async () => {},
  immutableCodeSha = String(process.env.PAPERBANANA_CODE_SHA || ''),
  readOperatorReport: (objectKey: string, maxBytes: number) => Promise<Uint8Array> = async () => { throw new Error('BENCHMARK_OPERATOR_REPORT_READER_UNAVAILABLE') },
  scientificV2Options: { operatorReportSecret?: string; createClaimToken?: () => string; requireRegistryAuthority?: boolean } = {},
) {
  const suites = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.suites)
  const models = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.models)
  const runs = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.runs)
  const samples = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.samples)
  const judgments = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.judgments)
  const dispatches = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.dispatches)
  const releases = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.releases)
  const releaseHeads = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.releaseHeads)
  const releaseLifecycle = db.collection<AnyRecord>(SCIENTIFIC_V2_COLLECTIONS.releaseLifecycle)
  const publicEvidence = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.publicEvidence)
  const promptSubmissions = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.promptSubmissions)
  const promptDigests = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.promptDigests)
  const scientificV2 = createScientificV2MongoRepository(db, now, scientificV2Options.createClaimToken, {
    operatorReportSecret: scientificV2Options.operatorReportSecret,
    immutableCodeSha,
    verifyObject: async (objectKey, imageHash) => verifyEvidence(objectKey, imageHash),
    requireRegistryAuthority: scientificV2Options.requireRegistryAuthority,
  })

  const activeScientificRelease = async () => {
    const head = await releaseHeads.findOne({ _id: SCIENTIFIC_V2_RELEASE_HEAD_ID })
    if (!head) return { hasHead: false, release: null as AnyRecord | null }
    const [release, lifecycle] = await Promise.all([
      releases.findOne({ _id: head.releaseId, releaseHash: head.releaseHash }),
      releaseLifecycle.findOne({ releaseId: head.releaseId, releaseHash: head.releaseHash, status: 'active' }),
    ])
    if (!release || !lifecycle
      || release.suiteId !== SCIENTIFIC_BENCHMARK_IDENTITY.suiteId
      || release.evaluationMode !== SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode
      || release.evaluationEpoch !== SCIENTIFIC_BENCHMARK_IDENTITY.evaluationEpoch
      || release.profileStatus !== 'published') return { hasHead: true, release: null as AnyRecord | null }
    return { hasHead: true, release }
  }

  return {
    async ensureSuite() {
      await suites.updateOne(
        { _id: PB_IMAGE_DIAGNOSTIC_V1.id },
        { $setOnInsert: { ...PB_IMAGE_DIAGNOSTIC_V1, _id: PB_IMAGE_DIAGNOSTIC_V1.id, createdAt: now() } },
        { upsert: true },
      )
      await suites.updateOne(
        { _id: PB_IMAGE_LIGHT_V1.id },
        { $setOnInsert: { ...PB_IMAGE_LIGHT_V1, _id: PB_IMAGE_LIGHT_V1.id, createdAt: now() } },
        { upsert: true },
      )
      const indexes = [
        [publicEvidence, { sourceReleaseHash: 1, profileId: 1, sampleId: 1 }, { unique: true, name: 'public_evidence_release_profile_sample' }],
        [publicEvidence, { sourceReleaseHash: 1, caseId: 1, overallRank: 1 }, { name: 'public_evidence_case_rank' }],
        [promptSubmissions, { userId: 1, createdAt: 1 }, { name: 'prompt_submission_account_day' }],
        [promptSubmissions, { clientIp: 1, createdAt: 1 }, { name: 'prompt_submission_ip_day' }],
        [promptSubmissions, { status: 1, createdAt: 1 }, { name: 'prompt_submission_queue' }],
        [promptDigests, { digestId: 1 }, { unique: true, name: 'prompt_digest_id' }],
      ] as const
      await Promise.all(indexes.map(async ([collection, keys, options]) => {
        if (typeof (collection as any).createIndex === 'function') await (collection as any).createIndex(keys, options)
      }))
      await scientificV2.ensureIndexes()
    },
    async latestRelease(lane?: string) {
      if (!lane) {
        const active = await activeScientificRelease()
        if (active.hasHead) return active.release
      }
      return releases.find({
        profileStatus: { $in: ['provisional', 'verified', 'published'] },
        publishedAt: { $exists: true },
        ...(lane ? { lane } : {}),
      })
        .sort({ publishedAt: -1 }).limit(1).next()
    },
    async releaseByModel(modelId: string, provider?: string, lane?: string, profileId?: string) {
      const profileQuery = profileId ? { profileId } : { modelId, ...(provider ? { provider } : {}), ...(lane ? { lane } : {}) }
      const active = await activeScientificRelease()
      if (active.release && active.release.models?.some((model: AnyRecord) => Object.entries(profileQuery).every(([key, value]) => model[key] === value))) {
        return active.release
      }
      const candidates = await releases.find({
        profileStatus: { $in: ['provisional', 'verified', 'published'] },
        models: { $elemMatch: profileQuery }, publishedAt: { $exists: true },
      }).sort({ publishedAt: -1 }).limit(20).toArray()
      return candidates.find((release: AnyRecord) => !active.hasHead
        || release.evaluationMode !== SCIENTIFIC_BENCHMARK_IDENTITY.evaluationMode
        || release.evaluationEpoch !== SCIENTIFIC_BENCHMARK_IDENTITY.evaluationEpoch) || null
    },
    async publicEvidenceForRelease(releaseHash: string, query: { profileId?: string; caseId?: string; cursor?: string; limit: number }) {
      const release = await releases.findOne({ releaseHash })
      if (release?.evaluationMode === 'codex_scientific_v2') {
        return scientificV2.publicEvidenceForRelease(releaseHash, query)
      }
      const offset = /^\d+$/.test(String(query.cursor || '')) ? Number(query.cursor) : 0
      const limit = Math.max(1, Math.min(12, Number(query.limit) || 12))
      const rows = await publicEvidence.find({
        sourceReleaseHash: releaseHash,
        ...(query.profileId ? { profileId: query.profileId } : {}),
        ...(query.caseId ? { caseId: query.caseId } : {}),
      }).sort({ overallRank: 1, profileId: 1, sampleId: 1 }).skip(offset).limit(limit + 1).toArray()
      return { items: rows.slice(0, limit), nextCursor: rows.length > limit ? String(offset + limit) : null }
    },
    async submitPrompt(input: AnyRecord) {
      const timestamp = now()
      const dayStart = new Date(timestamp)
      dayStart.setUTCHours(0, 0, 0, 0)
      const [accountCount, ipCount] = await Promise.all([
        promptSubmissions.countDocuments({ userId: input.userId, createdAt: { $gte: dayStart } }),
        promptSubmissions.countDocuments({ clientIp: input.clientIp, createdAt: { $gte: dayStart } }),
      ])
      if (accountCount >= 5) throw new Error('BENCHMARK_PROMPT_RATE_LIMIT_ACCOUNT')
      if (ipCount >= 20) throw new Error('BENCHMARK_PROMPT_RATE_LIMIT_IP')
      const normalizedBase = {
        prompt: text(input.prompt, 4_000), capability: text(input.capability, 1_000), requiredElements: text(input.requiredElements, 1_000),
        forbiddenResults: text(input.forbiddenResults, 1_000), notes: text(input.notes, 1_000),
      }
      const normalizedHash = canonicalHash(normalizedBase)
      const submissionId = `prompt-submission:${canonicalHash([input.userId, normalizedHash])}`
      const document = {
        _id: submissionId, submissionId, ...normalizedBase, normalizedHash,
        userId: text(input.userId, 200), clientIp: text(input.clientIp, 80), status: 'pending', createdAt: timestamp, updatedAt: timestamp,
      }
      try {
        await promptSubmissions.insertOne(document)
      } catch (error: any) {
        if (error?.code !== 11000) throw error
        const existing = await promptSubmissions.findOne({ _id: submissionId })
        if (!existing) throw error
        return { submissionId, status: existing.status, duplicate: true }
      }
      return { submissionId, status: 'pending' }
    },
    async promptQueue(input: AnyRecord) {
      const statuses = new Set(['pending', 'grouped', 'candidate', 'approved_for_next_suite', 'merged', 'rejected'])
      const status = statuses.has(String(input.status || '')) ? String(input.status) : 'pending'
      const limit = Math.max(1, Math.min(200, Number(input.limit) || 200))
      const rows = await promptSubmissions.find({ status }).sort({ createdAt: 1 }).limit(limit).toArray()
      return rows.map((row: AnyRecord) => ({
        submissionId: row.submissionId, status: row.status, prompt: row.prompt, capability: row.capability,
        requiredElements: row.requiredElements, forbiddenResults: row.forbiddenResults, notes: row.notes,
        normalizedHash: row.normalizedHash, userId: row.userId, createdAt: row.createdAt,
      }))
    },
    async savePromptDigest(input: AnyRecord) {
      const candidates = (Array.isArray(input.candidates) ? input.candidates.slice(0, 200) : []).map((candidate: AnyRecord, index: number) => ({
        candidateId: text(candidate.candidateId, 200) || `candidate-${index + 1}`,
        sourceSubmissionIds: [...new Set((Array.isArray(candidate.sourceSubmissionIds) ? candidate.sourceSubmissionIds : []).map((value: unknown) => text(value, 200)).filter(Boolean))].sort(),
        mergeReason: text(candidate.mergeReason, 1_000), normalizedPrompt: text(candidate.normalizedPrompt, 4_000),
        capability: text(candidate.capability, 1_000), requiredElements: text(candidate.requiredElements, 1_000),
        forbiddenResults: text(candidate.forbiddenResults, 1_000), scoringFocus: text(candidate.scoringFocus, 1_000), status: 'candidate',
      })).filter((candidate: AnyRecord) => candidate.sourceSubmissionIds.length && candidate.normalizedPrompt && candidate.capability)
      const sourceSubmissionIds = [...new Set(candidates.flatMap((candidate: AnyRecord) => Array.isArray(candidate.sourceSubmissionIds) ? candidate.sourceSubmissionIds : []).map((value: unknown) => text(value, 200)).filter(Boolean))].sort()
      const digestId = text(input.digestId, 200) || `prompt-digest:${canonicalHash({ sourceSubmissionIds, candidates })}`
      if (!/^[-A-Za-z0-9:._]{3,200}$/.test(digestId)) throw new Error('BENCHMARK_PROMPT_DIGEST_INVALID')
      const timestamp = now()
      const lockId = 'benchmark-prompt-digest-lock'
      const leaseUntil = new Date(timestamp.getTime() + 10 * 60_000)
      let locked = false
      try {
        if (typeof (promptDigests as any).findOneAndUpdate === 'function') {
          try {
            const lock = await (promptDigests as any).findOneAndUpdate(
              { _id: lockId, $or: [{ leaseUntil: { $lte: timestamp } }, { leaseUntil: { $exists: false } }, { owner: digestId }] },
              { $set: { owner: digestId, leaseUntil, updatedAt: timestamp }, $setOnInsert: { _id: lockId, kind: 'digest-lock', createdAt: timestamp } },
              { upsert: true, returnDocument: 'after' },
            )
            if (lock?.owner !== digestId) throw new Error('BENCHMARK_PROMPT_DIGEST_LOCKED')
            locked = true
          } catch (error: any) {
            if (error?.code === 11000) throw new Error('BENCHMARK_PROMPT_DIGEST_LOCKED')
            throw error
          }
        }
        if (sourceSubmissionIds.length && typeof (promptSubmissions as any).find === 'function') {
          const sourceRows = await promptSubmissions.find({ submissionId: { $in: sourceSubmissionIds } }).toArray()
          if (sourceRows.length !== sourceSubmissionIds.length || sourceRows.some((row: AnyRecord) => row.status !== 'pending' && !(row.status === 'grouped' && row.digestId === digestId))) {
            throw new Error('BENCHMARK_PROMPT_DIGEST_SOURCE_INVALID')
          }
        }
        await promptDigests.updateOne(
          { _id: digestId },
          { $setOnInsert: { _id: digestId, digestId, candidates: structuredClone(candidates), sourceSubmissionIds, status: 'candidate', createdAt: timestamp }, $set: { updatedAt: timestamp } },
          { upsert: true },
        )
        if (sourceSubmissionIds.length) await promptSubmissions.updateMany?.(
          { submissionId: { $in: sourceSubmissionIds }, status: 'pending' },
          { $set: { status: 'grouped', digestId, updatedAt: timestamp } },
        )
        return { digestId, status: 'candidate', candidateCount: candidates.length, sourceSubmissionCount: sourceSubmissionIds.length }
      } finally {
        if (locked) await promptDigests.updateOne({ _id: lockId, owner: digestId }, { $unset: { owner: '', leaseUntil: '' }, $set: { updatedAt: now() } }).catch(() => {})
      }
    },
    async decidePrompt(input: AnyRecord) {
      const submissionId = text(input.submissionId, 200)
      const decision = String(input.decision || '')
      if (!submissionId || !['approved_for_next_suite', 'merged', 'rejected'].includes(decision)) throw new Error('BENCHMARK_PROMPT_DECISION_INVALID')
      const result = await promptSubmissions.updateOne(
        { submissionId, status: { $in: ['pending', 'grouped', 'candidate'] } },
        { $set: {
          status: decision, decisionNotes: text(input.decisionNotes, 1_000), decidedBy: text(input.adminUserId, 200),
          adminEditedPrompt: text(input.editedPrompt, 4_000), adminEditedCapability: text(input.editedCapability, 1_000),
          decidedAt: now(), updatedAt: now(),
        } },
      )
      if (result.modifiedCount !== 1) throw new Error('BENCHMARK_PROMPT_DECISION_CONFLICT')
      return { submissionId, status: decision }
    },
    async candidates() {
      return (await models.find({}).sort({ detectedAt: -1 }).limit(200).toArray()).map(adminCandidate)
    },
    async approve(input: AnyRecord) {
      const candidateId = text(input.candidateId)
      const standardMode = input.evaluationMode === 'codex_single'
      const maxGenerations = positiveInteger(input.maxGenerations, 144)
      const maxJudgments = Number(input.maxJudgments)
      const maxJudgeCalls = Number(input.maxJudgeCalls)
      const maxEstimatedUsd = Number(input.maxEstimatedUsd)
      const price = Number(input.priceSnapshot?.estimatedPerGeneration)
      const judgePrice = Number(input.priceSnapshot?.estimatedPerJudgeCall)
      const priceSourceText = text(input.priceSnapshot?.source, 500)
      const capturedAtText = text(input.priceSnapshot?.capturedAt, 40)
      let priceSource: URL | undefined
      let capturedAt = ''
      try {
        priceSource = new URL(priceSourceText)
        capturedAt = new Date(capturedAtText).toISOString()
      } catch {}
      const codeSha = text(immutableCodeSha)
      if (!candidateId || input.entitlementConfirmed !== true || !maxGenerations
        || !Number.isInteger(maxJudgments) || !Number.isInteger(maxJudgeCalls)
        || (standardMode ? maxGenerations !== 4 || maxJudgments !== 0 || maxJudgeCalls !== 0 : maxJudgments <= 0 || maxJudgeCalls <= 0)
        || !Number.isFinite(maxEstimatedUsd) || !(maxEstimatedUsd > 0) || maxEstimatedUsd > 100_000
        || !Number.isFinite(price) || !(price > 0) || price > 1_000
        || !Number.isFinite(judgePrice) || (standardMode ? judgePrice !== 0 : !(judgePrice > 0) || judgePrice > 100)
        || priceSource?.protocol !== 'https:' || priceSource.username || priceSource.password || priceSource.toString() !== priceSourceText
        || capturedAt !== capturedAtText
        || !/^[a-f0-9]{40}$/i.test(codeSha) || !/^[A-Za-z0-9._:-]{3,200}$/.test(text(input.adminUserId))) {
        throw new Error('BENCHMARK_APPROVAL_INCOMPLETE')
      }
      const approval = {
        entitlementConfirmed: true,
        priceSnapshot: {
          currency: 'USD',
          source: priceSourceText,
          estimatedPerGeneration: price,
          estimatedPerJudgeCall: judgePrice,
          capturedAt,
        },
        maxGenerations,
        maxJudgments,
        maxJudgeCalls,
        maxEstimatedUsd,
        approvedBy: text(input.adminUserId),
        approvedAt: now(),
      }
      const priceHash = canonicalHash(approval.priceSnapshot)
      const judgeStackHash = standardMode
        ? canonicalHash({ evaluationMode: 'codex_single', automaticJudges: [] })
        : benchmarkJudgeStackHash(codeSha)
      const reviewSigningSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      const currentCandidate = await models.findOne({ _id: candidateId })
      if (!currentCandidate || !['detected', 'approved'].includes(currentCandidate.state)) throw new Error('BENCHMARK_CANDIDATE_NOT_APPROVABLE')
      if (!standardMode && !['1K-standard', '2K-standard', '4K-standard'].includes(currentCandidate.lane)) throw new Error('BENCHMARK_CANDIDATE_HAS_NO_SUPPORTED_LANE')
      let existingRun: AnyRecord | null = null
      let correctionOfReleaseId = ''
      if (!standardMode && currentCandidate.state === 'approved') {
        existingRun = await runs.find({ modelCandidateId: candidateId }).sort({ createdAt: -1 }).limit(1).next()
        if (!existingRun || !['provisional_published', 'verified_published'].includes(existingRun.state)) throw new Error('BENCHMARK_REAPPROVAL_NOT_ALLOWED')
        try {
          assertRunIntegrity(existingRun, reviewSigningSecret)
        } catch {
          throw new Error('BENCHMARK_REAPPROVAL_RUN_INTEGRITY_FAILED')
        }
        if (!candidateMatchesRun(currentCandidate, existingRun)) throw new Error('BENCHMARK_REAPPROVAL_CANDIDATE_MISMATCH')
        if (existingRun.state === 'provisional_published') {
          const usage = existingRun.usageByPhase?.full || {}
          if (maxGenerations < Number(usage.generations || 0) || maxJudgments < Number(usage.judgments || 0)
            || maxJudgeCalls < Number(usage.judgeCalls || 0) || maxEstimatedUsd < Number(usage.estimatedUsd || 0)) {
            throw new Error('BENCHMARK_REAPPROVAL_BELOW_USAGE')
          }
        } else {
          correctionOfReleaseId = text(existingRun.releaseId)
          existingRun = null
        }
      }
      const approvalPhase = standardMode ? 'standard' : existingRun ? 'full' : 'quick'
      if (standardMode && (maxGenerations !== 4 || maxJudgments !== 0 || maxJudgeCalls !== 0
        || maxGenerations * price > maxEstimatedUsd + 1e-9)) throw new Error('BENCHMARK_APPROVAL_INCOMPLETE')
      const generationLimit = approvalPhase === 'quick' ? 24 : 144
      const judgmentLimit = approvalPhase === 'quick' ? 48 : 288
      if (!standardMode && (maxGenerations > generationLimit || maxJudgments > judgmentLimit
        || maxJudgeCalls < maxJudgments || maxJudgeCalls > maxJudgments * 4 || maxJudgeCalls > judgmentLimit * 4
        || maxGenerations * price + maxJudgeCalls * judgePrice > maxEstimatedUsd + 1e-9)) {
        throw new Error('BENCHMARK_APPROVAL_INCOMPLETE')
      }
      const result = await models.findOneAndUpdate(
        { _id: candidateId, state: currentCandidate.state },
        { $set: { state: 'approved', approval, updatedAt: now() } },
        { returnDocument: 'after' },
      )
      if (!result) throw new Error('BENCHMARK_CANDIDATE_APPROVAL_CONFLICT')
      if (existingRun) {
        const fullApprovalVersion = signedApprovalVersion('full', approval, codeSha)
        const nextApprovalVersions = [...existingRun.approvalVersions, fullApprovalVersion]
        const nextIntegrity = createRunIntegrity({ ...existingRun, approvalVersions: nextApprovalVersions }, reviewSigningSecret)
        const updated = await runs.updateOne(
          { _id: existingRun._id, state: 'provisional_published' },
          { $set: {
            approval, priceHash, authorizationHash: fullApprovalVersion.authorizationHash,
            approvalVersions: nextApprovalVersions, runIntegrityAttestation: nextIntegrity.runIntegrityAttestation, updatedAt: now(),
          }, $push: { authorizationHistory: { authorizationHash: fullApprovalVersion.authorizationHash, priceHash, approvedAt: approval.approvedAt, phase: 'full' } } } as any,
        )
        if (updated.modifiedCount !== 1) throw new Error('BENCHMARK_REAPPROVAL_CONFLICT')
        return { ...adminCandidate(result), runId: existingRun._id, reapproved: true }
      }
      const initialPhase = standardMode ? 'standard' : 'quick'
      const quickApprovalVersion = signedApprovalVersion(initialPhase, approval, codeSha)
      const resolvedLane = currentCandidate.lane || 'provider-default'
      const candidateSnapshot = signedCandidateSnapshot({ ...result, lane: resolvedLane }, {
        runId: 'pending', modelCandidateId: candidateId, provider: String(result.provider), modelId: String(result.modelId),
        developer: String(result.developer || ''), lane: resolvedLane, aspectRatios: (result.aspectRatios || []).map(String).sort(),
        suiteId: standardMode ? PB_IMAGE_LIGHT_V1.id : PB_IMAGE_DIAGNOSTIC_V1.id,
        suiteHash: standardMode ? PB_IMAGE_LIGHT_V1.manifestHash : PB_IMAGE_DIAGNOSTIC_V1.manifestHash,
        judgeEpoch: standardMode ? 'judge-none-codex-single-v1' : 'judge-2026-08-v1',
        reviewerEpoch: standardMode ? 'codex-single-2026-08-v1' : 'codex-2026-08-v1', registryHash: String(result.registryHash),
        codeSha, createdAt: now(),
      })
      const runBase = {
        modelCandidateId: candidateId,
        provider: result.provider,
        modelId: result.modelId,
        developer: result.developer || '',
        lane: resolvedLane,
        aspectRatios: Array.isArray(result.aspectRatios) ? result.aspectRatios.map(String).sort() : [],
        suiteId: standardMode ? PB_IMAGE_LIGHT_V1.id : PB_IMAGE_DIAGNOSTIC_V1.id,
        suiteHash: standardMode ? PB_IMAGE_LIGHT_V1.manifestHash : PB_IMAGE_DIAGNOSTIC_V1.manifestHash,
        judgeEpoch: standardMode ? 'judge-none-codex-single-v1' : 'judge-2026-08-v1',
        judgeStackHash,
        reviewerEpoch: standardMode ? 'codex-single-2026-08-v1' : 'codex-2026-08-v1',
        evaluationMode: standardMode ? 'codex_single' : 'dual_judge_codex_audit',
        evaluationEpoch: standardMode ? 'codex-single-2026-08-v1' : 'judge-2026-08-v1',
        reviewProtocol: standardMode ? 'codex-single-two-pass-v1' : 'dual-judge-codex-audit-v1',
        reviewerKind: standardMode ? 'codex' : undefined,
        reviewerPasses: standardMode ? 2 : undefined,
        canonicalModelId: result.canonicalModelId || result.modelId,
        primaryAccessProvider: result.primaryAccessProvider || result.provider,
        alternateAccessProviders: result.alternateAccessProviders || [],
        registryHash: result.registryHash,
        priceHash,
        authorizationHash: quickApprovalVersion.authorizationHash,
        authorizationHistory: [{ authorizationHash: quickApprovalVersion.authorizationHash, priceHash, approvedAt: approval.approvedAt, phase: initialPhase }],
        approvalVersions: [quickApprovalVersion],
        candidateSnapshot,
        codeSha,
        state: 'approved',
        approval,
        judgeEstimatedUsd: judgePrice,
        usage: { generations: 0, judgments: 0, estimatedUsd: 0 },
        usageByPhase: {
          quick: { generations: 0, judgments: 0, judgeCalls: 0, estimatedUsd: 0 },
          full: { generations: 0, judgments: 0, judgeCalls: 0, estimatedUsd: 0 },
          standard: { generations: 0, judgments: 0, judgeCalls: 0, estimatedUsd: 0 },
        },
        correctionOfReleaseId: correctionOfReleaseId || undefined,
        createdAt: now(),
      }
      const runId = `bench-run-${canonicalHash(runBase).slice(0, 20)}`
      const runRecord = { _id: runId, ...runBase }
      const runIntegrity = createRunIntegrity(runRecord, reviewSigningSecret)
      await runs.updateOne({ _id: runId }, { $setOnInsert: { ...runRecord, ...runIntegrity } }, { upsert: true })
      return { ...adminCandidate(result), runId }
    },
    async control(input: AnyRecord) {
      if (input.evaluationMode === 'codex_scientific_v2') {
        if (input.command === 'freezeBatch') return scientificV2.freezeBatch(input)
        if (input.command === 'freezeRemediationBatch') return scientificV2.freezeRemediationBatch({
          batchId: input.batchId,
          sourceBatchId: input.sourceBatchId,
          sourceManifestHash: input.sourceManifestHash,
          sourceReleaseHash: input.sourceReleaseHash,
          targetModelIds: input.targetModelIds,
          targetSlotIds: input.targetSlotIds,
          targetSlotSetHash: input.targetSlotSetHash,
        })
        if (input.command === 'operatorAttestation') return scientificV2.operatorAttestation({ batchId: input.batchId, manifestHash: input.manifestHash })
        if (input.command === 'operatorDiagnostic') {
          const allowedKeys = new Set(['action', 'evaluationMode', 'command', 'batchId', 'manifestHash', 'gatewayToken', 'adminToken', 'adminUserId'])
          if (Reflect.ownKeys(input).some((key) => typeof key !== 'string' || !allowedKeys.has(key))) {
            throw new Error('SCIENTIFIC_V2_OPERATOR_DIAGNOSTIC_SCHEMA_INVALID')
          }
          return scientificV2.operatorDiagnostic({ batchId: input.batchId, manifestHash: input.manifestHash })
        }
        if (input.command === 'importWorkerState' || input.command === 'importCodexState') {
          const expectedKind = input.command === 'importWorkerState' ? 'worker' : 'codex'
          if (input.report?.kind !== expectedKind) throw new Error('SCIENTIFIC_V2_OPERATOR_REPORT_KIND_MISMATCH')
          return scientificV2.importStateReport({ report: input.report, reportHash: input.reportHash, attestationHash: input.attestationHash })
        }
        throw new Error('SCIENTIFIC_V2_CONTROL_COMMAND_INVALID')
      }
      if (input.command === 'recordJudgeCalibration') {
        const codeSha = text(immutableCodeSha)
        const judgeStackHash = benchmarkJudgeStackHash(codeSha)
        let operatorReport: unknown
        try {
          const reportObjectKey = text(input.reportObjectKey, 300)
          if (!/^bench\/operator-reports\/[a-f0-9]{64}\.json$/i.test(reportObjectKey)) throw new Error('invalid report key')
          const bytes = await readOperatorReport(reportObjectKey, 1024 * 1024)
          operatorReport = JSON.parse(Buffer.from(bytes).toString('utf8'))
        } catch {
          throw new Error('BENCHMARK_JUDGE_CALIBRATION_FAILED')
        }
        const record = buildJudgeCalibrationRecord(input, codeSha, judgeStackHash, text(input.adminUserId), now(), operatorReport)
        const calibrationId = judgeCalibrationId(record.judgeEpoch, judgeStackHash)
        await suites.updateOne({ _id: calibrationId }, { $setOnInsert: { _id: calibrationId, ...record } }, { upsert: true })
        const persisted = await suites.findOne({ _id: calibrationId })
        const calibrationFacts = ({ judgeEpoch: epoch, fixtureHash: fixture, codeSha: sha, judgeStackHash: stack, correctRedLines: correct, totalRedLines: total, accuracy: measuredAccuracy, agreement: measuredAgreement, operatorReportHash, reportObjectKey, authorizationHash, priceHash, priceSnapshot, usage, passed }: Record<string, any>) => ({
          judgeEpoch: epoch, fixtureHash: fixture, codeSha: sha, judgeStackHash: stack, correctRedLines: correct,
          totalRedLines: total, accuracy: measuredAccuracy, agreement: measuredAgreement,
          operatorReportHash, reportObjectKey, authorizationHash, priceHash, priceSnapshot, usage, passed,
        })
        if (!persisted || canonicalHash(calibrationFacts(persisted)) !== canonicalHash(calibrationFacts(record))) {
          throw new Error('BENCHMARK_JUDGE_CALIBRATION_CONFLICT')
        }
        return persisted
      }
      const runId = text(input.runId)
      const targetState = text(input.targetState) as BenchmarkRunState
      const run = await runs.findOne({ _id: runId })
      if (!run) throw new Error('BENCHMARK_RUN_NOT_FOUND')
      if (input.command === 'phaseOperatorAttestation') {
        return buildPhaseOperatorAttestation(run, text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500))
      }
      if (targetState === 'quick_running' || targetState === 'full_running' || targetState === 'standard_running') {
        const phase = targetState === 'full_running' ? 'full' : targetState === 'standard_running' ? 'standard' : 'quick'
        try { assertPhaseApproval(run, phase, text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)) }
        catch { throw new Error('BENCHMARK_PHASE_APPROVAL_REQUIRED') }
        if (phase !== 'standard') {
          const calibration = await suites.findOne({ _id: judgeCalibrationId(run.judgeEpoch, run.judgeStackHash), codeSha: run.codeSha, judgeStackHash: run.judgeStackHash, passed: true })
          if (!calibration) throw new Error('BENCHMARK_JUDGE_CALIBRATION_REQUIRED')
        }
      }
      assertBenchmarkTransition(run.state as BenchmarkRunState, targetState)
      const result = await runs.findOneAndUpdate(
        { _id: runId, state: run.state },
        {
          $set: { state: targetState, updatedAt: now(), controlReason: text(input.reason, 500) },
          ...(['paused', 'cancelled', 'superseded', 'failed'].includes(targetState) ? { $unset: { leaseOwner: '', leaseToken: '', leaseUntil: '' } } : {}),
        },
        { returnDocument: 'after' },
      )
      if (!result) throw new Error('BENCHMARK_RUN_STATE_CONFLICT')
      return { runId, state: result.state }
    },
    async exportReview(input: AnyRecord): Promise<AnyRecord> {
      if (input.evaluationMode === 'codex_scientific_v2') {
        return scientificV2.exportReviewAssignment({ batchId: text(input.batchId), assignment: input.assignment, objectBindings: input.objectBindings })
      }
      const runId = text(input.runId)
      const run = await runs.findOne({ _id: runId, state: { $in: ['quick_review', 'codex_audit', 'codex_review'] } })
      if (!run) throw new Error('BENCHMARK_CODEX_AUDIT_NOT_READY')
      const signingSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      const phase = run.state === 'quick_review' ? 'quick' : run.state === 'codex_review' ? 'standard' : 'full'
      try { assertPhaseApproval(run, phase, signingSecret) } catch { throw new Error('BENCHMARK_RUN_FACTS_INVALID') }
      const publicEvidenceSampleIds = Array.isArray(input.publicEvidenceSampleIds)
        ? input.publicEvidenceSampleIds.map((value: unknown) => text(value)).filter(Boolean).slice(0, 12) : []
      if (publicEvidenceSampleIds.length) {
        await samples.updateMany({ runId, phase, sampleId: { $in: publicEvidenceSampleIds } }, { $set: { auditRequired: true, publicEvidence: true } })
      }
      const auditSamples = await samples.find({ runId, phase, auditRequired: true }).sort({ sampleId: 1 }).toArray()
      const allPhaseSamples = await samples.find({ runId, phase }).toArray()
      const allRunJudgments = await judgments.find({ runId }).toArray()
      const allRunDispatches = await dispatches.find({ runId }).toArray()
      let manifest: ReturnType<typeof buildPhaseReviewSourceManifest> | ReturnType<typeof buildStandardReviewSourceManifest>
      try {
        manifest = phase === 'standard'
          ? buildStandardReviewSourceManifest(run, allPhaseSamples, allRunJudgments, allRunDispatches)
          : buildPhaseReviewSourceManifest(run, allPhaseSamples, allRunJudgments, allRunDispatches, phase)
      }
      catch { throw new Error('BENCHMARK_PHASE_SOURCE_MANIFEST_INVALID') }
      if (!sameStringSet(manifest.expectedAuditIds, auditSamples.map((sample) => sample.sampleId))) throw new Error('BENCHMARK_PHASE_AUDIT_SET_MISMATCH')
      const sourceBinding = {
        sourceManifestHash: manifest.hash,
        sourceManifestAttestation: sourceManifestAttestation(run, manifest.hash, signingSecret),
      }
      for (const sample of auditSamples) await verifyEvidence(sample.imageObjectKey, sample.imageHash)
      const issuedAt = now()
      const expiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1_000)
      const packet = createCodexReviewPacket({
        reviewerEpoch: text(run.reviewerEpoch || 'codex-2026-08-v1'),
        runHash: run.runHash,
        phase,
        ...(phase === 'standard' ? { reviewProtocol: 'codex-single-two-pass-v1' as const } : {}),
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        signingSecret,
        ...sourceBinding,
        samples: auditSamples.map((sample) => ({
          sampleId: sample.sampleId,
          imageObjectKey: sample.imageObjectKey,
          imageHash: sample.imageHash,
          rubric: sample.rubric,
          rubricHash: sample.rubricHash,
          ...(phase === 'standard' ? { caseRequirements: sample.caseRequirements, requirementsHash: sample.requirementsHash } : {}),
        })),
      })
      await runs.updateOne(
        { _id: runId, state: run.state },
        {
          $set: { reviewPacket: packet, reviewPacketExpiresAt: expiresAt, updatedAt: now() },
          $unset: { quickAuditImportedAt: '', codexAuditImportedAt: '', standardReviewImportedAt: '', importedReviewPacketHash: '' },
        },
      )
      return packet
    },
    async importReview(input: AnyRecord) {
      if (input.evaluationMode === 'codex_scientific_v2') {
        if (input.arbitration) return scientificV2.importArbitration({
          batchId: text(input.batchId), arbitration: input.arbitration,
          arbitrationHash: text(input.arbitrationHash), attestationHash: text(input.attestationHash),
        })
        return scientificV2.importReviewResult({ batchId: text(input.batchId), result: input.result })
      }
      const runId = text(input.runId)
      const run = await runs.findOne({ _id: runId, state: { $in: ['quick_review', 'codex_audit', 'codex_review'] } })
      if (!run?.reviewPacket) throw new Error('BENCHMARK_REVIEW_PACKET_NOT_FOUND')
      if (!run.reviewPacketExpiresAt || new Date(run.reviewPacketExpiresAt).getTime() <= now().getTime()) throw new Error('BENCHMARK_REVIEW_PACKET_EXPIRED')
      const signingSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      const phase = run.state === 'quick_review' ? 'quick' : run.state === 'codex_review' ? 'standard' : 'full'
      try { assertPhaseApproval(run, phase, signingSecret) } catch { throw new Error('BENCHMARK_RUN_FACTS_INVALID') }
      try {
        const persistedSamples = await samples.find({ runId, phase }).toArray()
        const persistedJudgments = await judgments.find({ runId }).toArray()
        const persistedDispatches = await dispatches.find({ runId }).toArray()
        if (phase === 'standard') assertStandardSourceManifest(run, run.reviewPacket, persistedSamples, persistedJudgments, persistedDispatches, signingSecret)
        else assertPhaseSourceManifest(run, run.reviewPacket, persistedSamples, persistedJudgments, persistedDispatches, phase, signingSecret)
      } catch { throw new Error('BENCHMARK_PHASE_SOURCE_MANIFEST_MISMATCH') }
      const imported = importCodexReview(run.reviewPacket, input.review, {
        signingSecret,
        expectedPhase: phase,
        now: now(),
      })
      const importedReviewHash = imported.reviewHash
      const loadPersistedReview = async () => {
        const allJudgments = await judgments.find({ runId }).toArray()
        const persisted = allJudgments.filter((judgment) => judgment.source === 'codex'
          && judgment.phase === phase && judgment.reviewerEpoch === run.reviewPacket.reviewerEpoch && judgment.packetHash === run.reviewPacket.packetHash
          && judgment.reviewHash === importedReviewHash)
        if (persisted.length !== imported.length || persisted.some((judgment) => judgment.reviewAttestation !== imported.attestation)) {
          throw new Error('BENCHMARK_REVIEW_PERSISTENCE_INCOMPLETE')
        }
        try {
          const facts = verifyCodexReviewAttestation(run.reviewPacket, persisted as any, imported.attestation, signingSecret)
          if (facts.reviewHash !== importedReviewHash) throw new Error('review hash mismatch')
        } catch {
          throw new Error('BENCHMARK_REVIEW_PERSISTENCE_INCOMPLETE')
        }
        return { allJudgments, persisted }
      }
      if (run.importedReviewPacketHash === run.reviewPacket.packetHash) {
        if (run.importedReviewHash === importedReviewHash && run.importedReviewAttestation === imported.attestation) {
          await loadPersistedReview()
          await judgments.updateMany({ runId, phase, source: 'codex', packetHash: run.reviewPacket.packetHash, reviewHash: importedReviewHash }, { $set: { accepted: true }, $unset: { rejectedAt: '' } })
          return { imported: run.reviewPacket.samples.length, packetHash: run.reviewPacket.packetHash, replayed: true }
        }
        throw new Error('BENCHMARK_REVIEW_CONFLICTING_REPLAY')
      }
      for (const judgment of imported) {
        await judgments.updateOne(
          { _id: `codex:${runId}:${judgment.sampleId}:${run.reviewPacket.reviewerEpoch}:${run.reviewPacket.packetHash}:${importedReviewHash}` },
          { $setOnInsert: { ...judgment, runId, phase, source: 'codex', reviewerEpoch: run.reviewPacket.reviewerEpoch, packetHash: run.reviewPacket.packetHash, reviewHash: importedReviewHash, reviewAttestation: imported.attestation, accepted: false, createdAt: now() } },
          { upsert: true },
        )
      }
      const runSamples = await samples.find({ runId, phase }).toArray()
      const { allJudgments: runJudgments, persisted } = await loadPersistedReview()
      const releaseDraft = run.releaseDraft || { models: [{}], evidence: [], methodology: {} }
      const auditField = phase === 'quick' ? 'quickAuditImportedAt' : phase === 'standard' ? 'standardReviewImportedAt' : 'codexAuditImportedAt'
      const profileStatus = phase === 'quick' ? 'provisional' : phase === 'standard' ? 'published' : 'verified'
      if (phase === 'standard') {
        const standardProfile = buildCodexSingleProfile({
          run,
          samples: runSamples.filter((sample) => sample.status === 'completed'),
          codexJudgments: persisted,
          automaticJudgments: runJudgments.filter((judgment) => judgment.source !== 'codex'),
          dispatches: await dispatches.find({ runId }).toArray(),
          priceSnapshot: run.approval?.priceSnapshot || {},
          generationCalls: runSamples.filter((sample) => ['completed', 'failed'].includes(sample.status)).length,
        })
        const standardProfileId = `${standardProfile.canonicalModelId}:${run.evaluationMode}:${run.evaluationEpoch}`
        releaseDraft.models = [{ ...(releaseDraft.models?.[0] || {}), ...standardProfile }]
        releaseDraft.publicEvidence = buildPublicEvidenceDraft(
          standardProfileId,
          standardProfile.modelId,
          runSamples,
          persisted.map((judgment: AnyRecord) => ({ ...judgment, accepted: true })),
        )
        releaseDraft.methodology = {
          suiteId: run.suiteId, evaluationMode: 'codex_single', evaluationEpoch: run.evaluationEpoch,
          reviewProtocol: run.reviewProtocol, reviewerKind: 'codex', reviewerPasses: 2, automaticJudges: [],
        }
      } else {
        const codexBySample = new Map(persisted.map((judgment) => [judgment.sampleId, judgment]))
        const observations = runSamples.map((sample) => {
          const automatic = runJudgments.filter((judgment) => judgment.sampleId === sample.sampleId && judgment.status === 'completed' && ['openrouter', 'bailian'].includes(judgment.provider))
          const codex = codexBySample.get(sample.sampleId)
          const scores = codex && automatic.length === 2
            ? applyCodexAdjudication({ automatic: automatic.map((judgment) => ({ scores: judgment.scores, redLines: judgment.redLines || [] })), codex: codex as any }).scores
            : Object.fromEntries(Object.keys(automatic[0]?.scores || {}).map((axis) => [axis, automatic.reduce((sum, judgment) => sum + Number(judgment.scores[axis] || 0), 0) / Math.max(1, automatic.length)]))
          return { caseId: sample.caseId, scores }
        })
        const dimensions = aggregateAxisScores(observations, { seed: run.runHash })
        releaseDraft.models = [{ ...(releaseDraft.models?.[0] || {}), dimensions, profileStatus }]
      }
      const updated = await runs.updateOne(
        { _id: runId, state: run.state, 'reviewPacket.packetHash': run.reviewPacket.packetHash, importedReviewPacketHash: { $exists: false } },
        { $set: { [auditField]: now(), importedReviewPacketHash: run.reviewPacket.packetHash, importedReviewHash, importedReviewAttestation: imported.attestation, releaseDraft, updatedAt: now() } },
      )
      if (updated.modifiedCount !== 1) {
        await judgments.updateMany({ runId, phase, source: 'codex', packetHash: run.reviewPacket.packetHash, reviewHash: importedReviewHash }, { $set: { accepted: false, rejectedAt: now() } })
        throw new Error('BENCHMARK_REVIEW_IMPORT_CONFLICT')
      }
      await judgments.updateMany({ runId, phase, source: 'codex', packetHash: run.reviewPacket.packetHash, reviewHash: importedReviewHash }, { $set: { accepted: true }, $unset: { rejectedAt: '' } })
      return { imported: imported.length, packetHash: run.reviewPacket.packetHash }
    },
    async publish(input: AnyRecord) {
      if (input.evaluationMode === 'codex_scientific_v2') {
        return scientificV2.publishScientificV2({
          batchId: text(input.batchId),
          objectBindings: input.objectBindings,
          evidence: input.evidence,
        })
      }
      const runId = text(input.runId)
      if (!['provisional', 'verified', 'published'].includes(input.profileStatus)) throw new Error('BENCHMARK_PROFILE_STATUS_INVALID')
      const run = await runs.findOne({ _id: runId })
      const standardMode = input.profileStatus === 'published'
      const expectedState = input.profileStatus === 'provisional' ? 'quick_review' : standardMode ? 'codex_review' : 'codex_audit'
      if (!run || run.state !== expectedState) throw new Error('BENCHMARK_RUN_NOT_PUBLISHABLE')
      if (input.profileStatus === 'provisional' && (!run.quickAuditImportedAt || run.importedReviewPacketHash !== run.reviewPacket?.packetHash)) throw new Error('BENCHMARK_QUICK_AUDIT_REQUIRED')
      if (input.profileStatus === 'verified' && !run.codexAuditImportedAt) throw new Error('BENCHMARK_CODEX_AUDIT_REQUIRED')
      if (standardMode && (!run.standardReviewImportedAt || run.importedReviewPacketHash !== run.reviewPacket?.packetHash)) throw new Error('BENCHMARK_STANDARD_REVIEW_REQUIRED')
      const profileStatus = input.profileStatus as 'provisional' | 'verified' | 'published'
      const signingSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      const integrityInput = {
        run,
        suite: await suites.findOne({ _id: run.suiteId }),
        runSamples: await samples.find({ runId }).toArray(),
        runJudgments: await judgments.find({ runId }).toArray(),
        runDispatches: await dispatches.find({ runId }).toArray(),
        signingSecret,
      }
      const verifiedDbIntegrity = standardMode
        ? assertStandardReleaseIntegrity(integrityInput)
        : profileStatus === 'verified'
        ? assertVerifiedReleaseIntegrity({
            ...integrityInput,
          })
        : assertQuickReleaseIntegrity(integrityInput)
      if (profileStatus === 'verified' || standardMode) await verifyEvidenceObjects(
        (verifiedDbIntegrity as unknown as AnyRecord).evidenceObjects,
        verifyEvidence,
        { concurrency: 8, deadlineMs: 120_000, retries: 1 },
      )
      const verifiedAt = profileStatus === 'verified' ? now().toISOString() : ''
      const verifiedIntegrity = (() => {
        const { evidenceObjects: _evidenceObjects, candidateHash: _candidateHash, ...profileIntegrity } = verifiedDbIntegrity as unknown as AnyRecord
        return profileStatus === 'verified' ? { ...profileIntegrity, verifiedAt } : profileIntegrity
      })()
      const releasePartition = standardMode
        ? { suiteId: run.suiteId, evaluationMode: run.evaluationMode, evaluationEpoch: run.evaluationEpoch }
        : { suiteId: run.suiteId, lane: run.lane, judgeEpoch: run.judgeEpoch }
      const previousRelease = await releases.find({ ...releasePartition, publishedAt: { $exists: true } }).sort({ publishedAt: -1 }).limit(1).next()
      if (run.correctionOfReleaseId) {
        const correctionTarget = await releases.findOne({ _id: run.correctionOfReleaseId, ...releasePartition, publishedAt: { $exists: true } })
        if (!correctionTarget) throw new Error('BENCHMARK_CORRECTION_PREDECESSOR_MISMATCH')
      }
      const laneHeadId = standardMode
        ? `benchmark-release-head:${run.suiteId}:${run.evaluationMode}:${run.evaluationEpoch}`
        : `benchmark-release-head:${run.suiteId}:${run.lane}:${run.judgeEpoch}`
      const currentProfiles = [{
        profileId: standardMode
          ? `${verifiedIntegrity.canonicalModelId}:${run.evaluationMode}:${run.evaluationEpoch}`
          : `${verifiedIntegrity.provider}:${verifiedIntegrity.modelId}:${verifiedIntegrity.lane}`,
        profileStatus,
        ...verifiedIntegrity,
      }]
      const replacedIds = new Set(currentProfiles.map((model: AnyRecord) => model.profileId))
      const mergedProfiles = [...(previousRelease?.models || []).filter((model: AnyRecord) => !replacedIds.has(model.profileId || `${model.provider}:${model.modelId}:${model.lane}`)), ...currentProfiles]
      const laneMedians = Object.fromEntries(BENCHMARK_AXES.map((axis) => {
        const values = mergedProfiles.filter((model: AnyRecord) => model.profileStatus === (standardMode ? 'published' : 'verified') && model.ranked !== false).map((model: AnyRecord) => Number(model.dimensions?.[axis]?.mean)).filter(Number.isFinite).sort((left: number, right: number) => left - right)
        const middle = Math.floor(values.length / 2)
        return [axis, values.length ? (values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2) : 0]
      }))
      const publishedProfiles = mergedProfiles.map((model: AnyRecord) => {
        const dimensions = Object.fromEntries(BENCHMARK_AXES.flatMap((axis) => {
          const dimension = model.dimensions?.[axis]
          if (!dimension) return []
          const laneMedian = laneMedians[axis]
          return [[axis, { ...dimension, laneMedian, differenceCi95: { low: Number(dimension.ci95?.low || dimension.mean) - laneMedian, high: Number(dimension.ci95?.high || dimension.mean) - laneMedian } }]]
        }))
        return { ...model, dimensions, traits: standardMode ? [] : deriveRelativeTraits({ profileStatus: model.profileStatus, coverage: Number(model.coverage || 0), dimensions }) }
      })
      const requestedEvidence = Array.isArray(input.evidence) ? input.evidence.slice(0, 12) : []
      const currentEvidence = []
      for (const item of requestedEvidence) {
        const evidencePhase = standardMode ? 'standard' : profileStatus === 'verified' ? 'full' : 'quick'
        const sample = await samples.findOne({ runId, phase: evidencePhase, sampleId: text(item.sampleId), publicEvidence: true, auditRequired: true })
        if (!sample?.imageObjectKey) throw new Error('BENCHMARK_EVIDENCE_NOT_AUDITED')
        await verifyEvidence(sample.imageObjectKey, sample.imageHash)
        const codexJudgment = await judgments.findOne({ runId, phase: evidencePhase, sampleId: sample.sampleId, source: 'codex', reviewerEpoch: run.reviewerEpoch, packetHash: run.importedReviewPacketHash, reviewHash: run.importedReviewHash, reviewAttestation: run.importedReviewAttestation, accepted: true })
        if (!codexJudgment) throw new Error('BENCHMARK_EVIDENCE_NOT_CODEX_REVIEWED')
        currentEvidence.push({ sampleId: sample.sampleId, profileId: currentProfiles[0].profileId, modelId: run.modelId, caseId: sample.caseId, objectKey: sample.imageObjectKey, imageHash: sample.imageHash, kind: ['median', 'strength', 'failure'].includes(item.kind) ? item.kind : 'median', caption: text(item.caption, 300) })
      }
      const releaseBase = {
        profileStatus,
        supersedesReleaseId: previousRelease?._id || undefined,
        suiteId: run.suiteId,
        suiteHash: run.suiteHash,
        judgeEpoch: run.judgeEpoch,
        reviewerEpoch: run.reviewerEpoch,
        evaluationMode: run.evaluationMode,
        evaluationEpoch: run.evaluationEpoch,
        reviewProtocol: run.reviewProtocol,
        reviewerKind: run.reviewerKind,
        reviewerPasses: run.reviewerPasses,
        registryHash: verifiedIntegrity?.registryHash || run.registryHash,
        priceHash: verifiedIntegrity?.priceHash || run.priceHash,
        codeSha: verifiedIntegrity?.codeSha || run.codeSha,
        lane: verifiedIntegrity?.lane || run.lane,
        sampleCount: publishedProfiles.reduce((sum: number, model: AnyRecord) => sum + Number(model.sampleCount || 0), 0),
        auditRatio: publishedProfiles.length ? publishedProfiles.reduce((sum: number, model: AnyRecord) => sum + Number(model.auditRatio || 0), 0) / publishedProfiles.length : 0,
        models: publishedProfiles,
        evidence: [...(previousRelease?.evidence || []).filter((item: AnyRecord) => !replacedIds.has(item.profileId || `${item.provider || ''}:${item.modelId}:${run.lane}`)), ...currentEvidence],
        methodology: standardMode ? {
          suiteId: run.suiteId,
          suiteHash: run.suiteHash,
          evaluationMode: 'codex_single',
          evaluationEpoch: run.evaluationEpoch,
          reviewProtocol: 'codex-single-two-pass-v1',
          reviewerKind: 'codex',
          reviewerPasses: 2,
          aggregation: 'case-first-bootstrap',
          noOverallScore: true,
          repetitionsPerCase: 1,
          automaticJudges: [],
          expectedCaseCount: 4,
          sampleCount: verifiedIntegrity?.sampleCount,
          automaticJudgmentCount: 0,
          logicalJudgmentCount: 0,
          judgeDispatchCount: 0,
          auditSampleCount: verifiedIntegrity?.sampleCount,
          actualOutputPixels: verifiedIntegrity?.actualOutputPixels,
          reviewerEpoch: run.reviewerEpoch,
          knownLimitations: ['small-sample-size', 'single-reviewer', 'mixed-native-output-resolution'],
          evidenceManifestHash: verifiedIntegrity.evidenceManifestHash,
        } : {
          suiteId: run.suiteId,
          suiteHash: run.suiteHash,
          aggregation: 'case-first-bootstrap',
          noOverallScore: true,
          auditPolicy: 'disagreement-v1:red-line-conflict,confidence-below-0.35,invalid-evidence,public-evidence,deterministic-10-percent',
          repetitionsPerCase: profileStatus === 'verified' ? 3 : 2,
          automaticJudges: ['openrouter', 'bailian'],
          expectedCaseCount: Math.round(Number(verifiedIntegrity.capabilityCoverage || 0)
            * (profileStatus === 'verified' ? 48 : PB_IMAGE_DIAGNOSTIC_V1.quickCaseIds.length)),
          sampleCount: verifiedIntegrity?.sampleCount,
          automaticJudgmentCount: Number(verifiedIntegrity?.sampleCount || 0) * 2,
          logicalJudgmentCount: verifiedIntegrity?.estimatedCost.logicalJudgments,
          judgeDispatchCount: verifiedIntegrity?.estimatedCost.judgeDispatchCalls,
          auditSampleCount: Math.round(Number(verifiedIntegrity?.auditRatio || 0) * Number(verifiedIntegrity?.sampleCount || 0)),
          capabilityGaps: verifiedIntegrity?.capabilityGaps,
          judgeEpoch: run.judgeEpoch,
          reviewerEpoch: run.reviewerEpoch,
          ...(profileStatus === 'verified' ? {
            evidenceManifestHash: verifiedIntegrity.evidenceManifestHash,
            evidenceVerifiedAt: verifiedIntegrity.verifiedAt,
          } : {}),
        },
        publishedAt: now(),
      }
      const releaseHash = canonicalHash(releaseBase)
      const releaseId = `bench-release-${releaseHash.slice(0, 20)}`
      const currentEvidenceDraft = standardMode && Array.isArray(run.releaseDraft?.publicEvidence)
        ? run.releaseDraft.publicEvidence.filter((item: AnyRecord) => replacedIds.has(item.profileId))
        : []
      if (currentEvidenceDraft.length) {
        await verifyEvidenceObjects(
          currentEvidenceDraft.flatMap((item: AnyRecord) => item.variants.map((variant: AnyRecord) => ({ objectKey: variant.objectKey, imageHash: variant.imageHash }))),
          verifyEvidence,
          { concurrency: 8, deadlineMs: 120_000, retries: 1 },
        )
      }
      const previousEvidenceRows = standardMode && previousRelease?.releaseHash && (publicEvidence as any)?.find
        ? await publicEvidence.find({ sourceReleaseHash: previousRelease.releaseHash }).toArray()
        : []
      const evidenceRows = [
        ...previousEvidenceRows.filter((item: AnyRecord) => !replacedIds.has(item.profileId)),
        ...currentEvidenceDraft,
      ].map((item: AnyRecord) => {
        const { _id: _previousId, sourceReleaseHash: _previousHash, createdAt: _previousCreatedAt, updatedAt: _previousUpdatedAt, ...publicItem } = item
        const evidenceId = `benchmark-public-evidence:${canonicalHash([releaseHash, publicItem.profileId, publicItem.sampleId])}`
        return { _id: evidenceId, ...publicItem, sourceReleaseHash: releaseHash, createdAt: now(), updatedAt: now() }
      })
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const publishGuard = {
            _id: runId,
            state: expectedState,
            'reviewPacket.packetHash': run.reviewPacket.packetHash,
            importedReviewPacketHash: run.importedReviewPacketHash,
            importedReviewHash: run.importedReviewHash,
          }
          const current = await runs.findOne(publishGuard, { session })
          if (!current) throw new Error('BENCHMARK_PUBLISH_STATE_CONFLICT')
          const transactionalInput = {
            run: current, suite: await suites.findOne({ _id: current.suiteId }, { session }),
            runSamples: await samples.find({ runId }, { session }).toArray(),
            runJudgments: await judgments.find({ runId }, { session }).toArray(),
            runDispatches: await dispatches.find({ runId }, { session }).toArray(), signingSecret,
          }
          const transactionalIntegrity = standardMode
            ? assertStandardReleaseIntegrity(transactionalInput)
            : profileStatus === 'verified'
            ? assertVerifiedReleaseIntegrity(transactionalInput)
            : assertQuickReleaseIntegrity(transactionalInput)
          if (canonicalHash(transactionalIntegrity) !== canonicalHash(verifiedDbIntegrity)) {
            verifiedIntegrityFailure('SNAPSHOT_CHANGED')
          }
          const laneHead = await suites.findOne({ _id: laneHeadId }, { session })
          if (laneHead && laneHead.releaseId !== previousRelease?._id) throw new Error('BENCHMARK_LANE_HEAD_CONFLICT')
          if (evidenceRows.length && (publicEvidence as any)?.bulkWrite) {
            await publicEvidence.bulkWrite(
              evidenceRows.map((document: AnyRecord) => ({ updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true } })),
              { session },
            )
          }
          await releases.insertOne({ _id: releaseId, ...releaseBase, releaseHash }, { session })
          const updated = await runs.updateOne(
            publishGuard,
            { $set: { state: standardMode ? 'published' : profileStatus === 'provisional' ? 'provisional_published' : 'verified_published', releaseId, updatedAt: now() } },
            { session },
          )
          if (updated.modifiedCount !== 1) throw new Error('BENCHMARK_PUBLISH_STATE_CONFLICT')
          await suites.updateOne(
            { _id: laneHeadId, ...(laneHead ? { releaseId: laneHead.releaseId } : { releaseId: { $exists: false } }) },
            { $set: { releaseId, releaseHash, updatedAt: now() }, $setOnInsert: { _id: laneHeadId } },
            { upsert: true, session },
          )
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally { await session.endSession() }
      return { releaseId, releaseHash, profileStatus }
    },
  }
}
