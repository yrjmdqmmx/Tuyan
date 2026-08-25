import {
  BENCHMARK_AXES,
  BENCHMARK_COLLECTIONS,
  PB_IMAGE_DIAGNOSTIC_V1,
  assertBenchmarkTransition,
  aggregateAxisScores,
  applyCodexAdjudication,
  benchmarkSampleId,
  buildAuditSelection,
  canonicalHash,
  createCodexReviewPacket,
  deriveRelativeTraits,
  importCodexReview,
  benchmarkJudgeStackHash,
  planBenchmarkCases,
  verifyCodexReviewAttestation,
  type BenchmarkRunState,
} from '@paperbanana/benchmark-core'
import type { Db } from 'mongodb'
import { createHmac, timingSafeEqual } from 'node:crypto'

type AnyRecord = { _id: string; [key: string]: any }

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
    registryHash: String(run.registryHash || ''),
    codeSha: String(run.codeSha || ''),
    createdAt,
  }
  if (!facts.runId || !facts.modelCandidateId || !facts.provider || !facts.modelId || !facts.lane || !facts.suiteId
    || !benchmarkHashPattern.test(facts.suiteHash) || !facts.judgeEpoch || !facts.reviewerEpoch
    || !facts.registryHash || !/^[a-f0-9]{40}$/i.test(facts.codeSha) || !Number.isFinite(createdAt.getTime())) {
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

function signedApprovalVersion(phase: 'quick' | 'full', approvalInput: Record<string, any>, codeSha: string) {
  const capturedAt = new Date(approvalInput?.priceSnapshot?.capturedAt)
  const approvedAt = approvalInput?.approvedAt instanceof Date ? approvalInput.approvedAt : new Date(approvalInput?.approvedAt)
  const approval = {
    entitlementConfirmed: approvalInput?.entitlementConfirmed === true,
    priceSnapshot: {
      currency: String(approvalInput?.priceSnapshot?.currency || ''),
      estimatedPerGeneration: Number(approvalInput?.priceSnapshot?.estimatedPerGeneration),
      estimatedPerJudgeCall: Number(approvalInput?.priceSnapshot?.estimatedPerJudgeCall),
      capturedAt: Number.isFinite(capturedAt.getTime()) ? capturedAt.toISOString() : '',
    },
    maxGenerations: Number(approvalInput?.maxGenerations),
    maxJudgeCalls: Number(approvalInput?.maxJudgeCalls),
    maxEstimatedUsd: Number(approvalInput?.maxEstimatedUsd),
    approvedBy: String(approvalInput?.approvedBy || ''),
    approvedAt,
  }
  if (!approval.entitlementConfirmed || approval.priceSnapshot.currency !== 'USD'
    || !Number.isFinite(approval.priceSnapshot.estimatedPerGeneration) || approval.priceSnapshot.estimatedPerGeneration <= 0
    || !Number.isFinite(approval.priceSnapshot.estimatedPerJudgeCall) || approval.priceSnapshot.estimatedPerJudgeCall <= 0
    || !approval.priceSnapshot.capturedAt || !Number.isInteger(approval.maxGenerations) || approval.maxGenerations <= 0
    || !Number.isInteger(approval.maxJudgeCalls) || approval.maxJudgeCalls <= 0
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
  const expectedPhases = run.approvalVersions.length === 1 ? ['quick'] : ['quick', 'full']
  const approvalVersions = run.approvalVersions.map((version: AnyRecord, index: number) => {
    const expected = signedApprovalVersion(expectedPhases[index] as 'quick' | 'full', version?.approval, runFacts.codeSha)
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

function assertPhaseApproval(run: AnyRecord, phase: 'quick' | 'full', signingSecret: string) {
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

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && new Set(left).size === left.length && new Set(right).size === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index])
}

function buildFullReviewSourceManifest(run: AnyRecord, runSamples: AnyRecord[], runJudgments: AnyRecord[]) {
  const fullSamples = runSamples.filter((sample) => sample.phase === 'full').sort((left, right) => String(left.sampleId).localeCompare(String(right.sampleId)))
  const automaticJudgments = runJudgments.filter((judgment) => judgment.phase === 'full' && judgment.status === 'completed')
    .sort((left, right) => `${left.sampleId}:${left.provider}`.localeCompare(`${right.sampleId}:${right.provider}`))
  const sampleIds = new Set(fullSamples.map((sample) => sample.sampleId))
  if (sampleIds.size !== fullSamples.length || automaticJudgments.length !== fullSamples.length * 2) throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID')
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
  const expectedAuditIds = buildAuditSelection(fullSamples.map((sample) => {
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
    schemaVersion: 1,
    runId: run._id,
    runHash: run.runHash,
    phase: 'full',
    usage: { generationCalls: fullSamples.length, automaticJudgeCalls: automaticJudgments.length },
    samples: fullSamples.map((sample) => ({
      sampleId: sample.sampleId, runId: sample.runId, phase: sample.phase, caseId: sample.caseId, repetition: sample.repetition,
      status: sample.status, imageHash: sample.imageHash, imageObjectKey: sample.imageObjectKey, latencyMs: sample.latencyMs,
      rubric: sample.rubric, rubricHash: sample.rubricHash, auditRequired: sample.auditRequired === true, publicEvidence: sample.publicEvidence === true,
    })),
    automaticJudgments: automaticJudgments.map((judgment) => ({
      runId: judgment.runId, sampleId: judgment.sampleId, phase: judgment.phase, provider: judgment.provider,
      judgeEpoch: judgment.judgeEpoch, status: judgment.status, scores: judgment.scores, evidence: judgment.evidence,
      redLines: judgment.redLines, confidence: judgment.confidence,
    })),
  }
  return { facts, hash: canonicalHash(facts), expectedAuditIds }
}

function sourceManifestAttestation(run: AnyRecord, sourceManifestHash: string, signingSecret: string) {
  const integrity = assertRunIntegrity(run, signingSecret)
  return createHmac('sha256', signingSecret)
    .update(canonicalHash({ runHash: integrity.runHash, runFacts: integrity.runFacts, sourceManifestHash }))
    .digest('hex')
}

function assertFullSourceManifest(run: AnyRecord, packet: AnyRecord, runSamples: AnyRecord[], runJudgments: AnyRecord[], signingSecret: string) {
  const manifest = buildFullReviewSourceManifest(run, runSamples, runJudgments)
  const expectedAttestation = sourceManifestAttestation(run, manifest.hash, signingSecret)
  const actualAttestation = String(packet?.sourceManifestAttestation || '')
  if (packet?.sourceManifestHash !== manifest.hash || !benchmarkHashPattern.test(actualAttestation)
    || !timingSafeEqual(Buffer.from(actualAttestation, 'hex'), Buffer.from(expectedAttestation, 'hex'))) {
    throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_MISMATCH')
  }
  return manifest
}

function assertVerifiedReleaseIntegrity(input: {
  run: AnyRecord
  suite: AnyRecord | null
  runSamples: AnyRecord[]
  runJudgments: AnyRecord[]
  signingSecret: string
}) {
  const { run, suite, runSamples, runJudgments } = input
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
      ? benchmarkSampleId(run._id, 'full', sample.caseId, sample.repetition)
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

  let sourceManifest: ReturnType<typeof buildFullReviewSourceManifest>
  try { sourceManifest = buildFullReviewSourceManifest(run, fullSamples, automaticJudgments) }
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
  try { assertFullSourceManifest(run, packet, fullSamples, automaticJudgments, input.signingSecret) }
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
  const automaticJudgeCalls = automaticJudgments.length
  const estimatedUsd = Number((generationCalls * fullApprovalVersion!.approval.priceSnapshot.estimatedPerGeneration
    + automaticJudgeCalls * fullApprovalVersion!.approval.priceSnapshot.estimatedPerJudgeCall).toFixed(12))
  if (generationCalls > fullApprovalVersion!.approval.maxGenerations || automaticJudgeCalls > fullApprovalVersion!.approval.maxJudgeCalls
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
    estimatedCost: { usd: estimatedUsd, generationCalls, automaticJudgeCalls },
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
    || authorization.maxJudgeCalls * authorization.estimatedPerJudgeCallUsd > authorization.maxEstimatedUsd
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
    detectedAt: candidate.detectedAt,
    approval: candidate.approval ? {
      entitlementConfirmed: candidate.approval.entitlementConfirmed === true,
      priceSnapshot: candidate.approval.priceSnapshot,
      maxGenerations: candidate.approval.maxGenerations,
      maxJudgeCalls: candidate.approval.maxJudgeCalls,
      maxEstimatedUsd: candidate.approval.maxEstimatedUsd,
      approvedAt: candidate.approval.approvedAt,
    } : undefined,
  }
}

export function createMongoBenchmarkRepository(
  db: Db,
  now = () => new Date(),
  verifyEvidence: (objectKey: string, imageHash: string, options?: { signal?: AbortSignal; timeoutMs?: number }) => Promise<void> = async () => {},
  immutableCodeSha = String(process.env.PAPERBANANA_CODE_SHA || ''),
  readOperatorReport: (objectKey: string, maxBytes: number) => Promise<Uint8Array> = async () => { throw new Error('BENCHMARK_OPERATOR_REPORT_READER_UNAVAILABLE') },
) {
  const suites = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.suites)
  const models = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.models)
  const runs = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.runs)
  const samples = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.samples)
  const judgments = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.judgments)
  const releases = db.collection<AnyRecord>(BENCHMARK_COLLECTIONS.releases)

  return {
    async ensureSuite() {
      await suites.updateOne(
        { _id: PB_IMAGE_DIAGNOSTIC_V1.id },
        { $setOnInsert: { ...PB_IMAGE_DIAGNOSTIC_V1, _id: PB_IMAGE_DIAGNOSTIC_V1.id, createdAt: now() } },
        { upsert: true },
      )
    },
    async latestRelease(lane?: string) {
      return releases.find({
        profileStatus: { $in: ['provisional', 'verified'] },
        publishedAt: { $exists: true },
        ...(lane ? { lane } : {}),
      })
        .sort({ publishedAt: -1 }).limit(1).next()
    },
    async releaseByModel(modelId: string, provider?: string, lane?: string, profileId?: string) {
      const profileQuery = profileId ? { profileId } : { modelId, ...(provider ? { provider } : {}), ...(lane ? { lane } : {}) }
      return releases.find({ profileStatus: { $in: ['provisional', 'verified'] }, models: { $elemMatch: profileQuery }, publishedAt: { $exists: true } })
        .sort({ publishedAt: -1 }).limit(1).next()
    },
    async candidates() {
      return (await models.find({}).sort({ detectedAt: -1 }).limit(200).toArray()).map(adminCandidate)
    },
    async approve(input: AnyRecord) {
      const candidateId = text(input.candidateId)
      const maxGenerations = positiveInteger(input.maxGenerations, 144)
      const maxJudgeCalls = positiveInteger(input.maxJudgeCalls, 1_000)
      const maxEstimatedUsd = Number(input.maxEstimatedUsd)
      const price = Number(input.priceSnapshot?.estimatedPerGeneration)
      const judgePrice = Number(input.priceSnapshot?.estimatedPerJudgeCall)
      const codeSha = text(immutableCodeSha)
      if (!candidateId || input.entitlementConfirmed !== true || !maxGenerations || !maxJudgeCalls
        || !Number.isFinite(maxEstimatedUsd) || !(maxEstimatedUsd > 0) || maxEstimatedUsd > 100_000
        || !Number.isFinite(price) || !(price > 0) || price > 1_000
        || !Number.isFinite(judgePrice) || !(judgePrice > 0) || judgePrice > 100
        || !/^[a-f0-9]{40}$/i.test(codeSha) || !/^[A-Za-z0-9._:-]{3,200}$/.test(text(input.adminUserId))) {
        throw new Error('BENCHMARK_APPROVAL_INCOMPLETE')
      }
      const approval = {
        entitlementConfirmed: true,
        priceSnapshot: {
          currency: 'USD',
          estimatedPerGeneration: price,
          estimatedPerJudgeCall: judgePrice,
          capturedAt: new Date(text(input.priceSnapshot?.capturedAt || now().toISOString())).toISOString(),
        },
        maxGenerations,
        maxJudgeCalls,
        maxEstimatedUsd,
        approvedBy: text(input.adminUserId),
        approvedAt: now(),
      }
      const priceHash = canonicalHash(approval.priceSnapshot)
      const judgeStackHash = benchmarkJudgeStackHash(codeSha)
      const reviewSigningSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      const currentCandidate = await models.findOne({ _id: candidateId })
      if (!currentCandidate || !['detected', 'approved'].includes(currentCandidate.state)) throw new Error('BENCHMARK_CANDIDATE_NOT_APPROVABLE')
      if (!['1K-standard', '2K-standard', '4K-standard'].includes(currentCandidate.lane)) throw new Error('BENCHMARK_CANDIDATE_HAS_NO_SUPPORTED_LANE')
      let existingRun: AnyRecord | null = null
      let correctionOfReleaseId = ''
      if (currentCandidate.state === 'approved') {
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
          if (maxGenerations < Number(usage.generations || 0) || maxJudgeCalls < Number(usage.judgments || 0) || maxEstimatedUsd < Number(usage.estimatedUsd || 0)) {
            throw new Error('BENCHMARK_REAPPROVAL_BELOW_USAGE')
          }
        } else {
          correctionOfReleaseId = text(existingRun.releaseId)
          existingRun = null
        }
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
      const quickApprovalVersion = signedApprovalVersion('quick', approval, codeSha)
      const candidateSnapshot = signedCandidateSnapshot(result, {
        runId: 'pending', modelCandidateId: candidateId, provider: String(result.provider), modelId: String(result.modelId),
        developer: String(result.developer || ''), lane: String(result.lane), aspectRatios: (result.aspectRatios || []).map(String).sort(),
        suiteId: PB_IMAGE_DIAGNOSTIC_V1.id, suiteHash: PB_IMAGE_DIAGNOSTIC_V1.manifestHash,
        judgeEpoch: 'judge-2026-08-v1', reviewerEpoch: 'codex-2026-08-v1', registryHash: String(result.registryHash),
        codeSha, createdAt: now(),
      })
      const runBase = {
        modelCandidateId: candidateId,
        provider: result.provider,
        modelId: result.modelId,
        developer: result.developer || '',
        lane: result.lane,
        aspectRatios: result.aspectRatios || [],
        suiteId: PB_IMAGE_DIAGNOSTIC_V1.id,
        suiteHash: PB_IMAGE_DIAGNOSTIC_V1.manifestHash,
        judgeEpoch: 'judge-2026-08-v1',
        judgeStackHash,
        reviewerEpoch: 'codex-2026-08-v1',
        registryHash: result.registryHash,
        priceHash,
        authorizationHash: quickApprovalVersion.authorizationHash,
        authorizationHistory: [{ authorizationHash: quickApprovalVersion.authorizationHash, priceHash, approvedAt: approval.approvedAt, phase: 'quick' }],
        approvalVersions: [quickApprovalVersion],
        candidateSnapshot,
        codeSha,
        state: 'approved',
        approval,
        judgeEstimatedUsd: judgePrice,
        usage: { generations: 0, judgments: 0, estimatedUsd: 0 },
        usageByPhase: {
          quick: { generations: 0, judgments: 0, estimatedUsd: 0 },
          full: { generations: 0, judgments: 0, estimatedUsd: 0 },
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
      if (targetState === 'quick_running' || targetState === 'full_running') {
        try { assertPhaseApproval(run, targetState === 'full_running' ? 'full' : 'quick', text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)) }
        catch { throw new Error('BENCHMARK_PHASE_APPROVAL_REQUIRED') }
        const calibration = await suites.findOne({ _id: judgeCalibrationId(run.judgeEpoch, run.judgeStackHash), codeSha: run.codeSha, judgeStackHash: run.judgeStackHash, passed: true })
        if (!calibration) throw new Error('BENCHMARK_JUDGE_CALIBRATION_REQUIRED')
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
    async exportReview(input: AnyRecord) {
      const runId = text(input.runId)
      const run = await runs.findOne({ _id: runId, state: { $in: ['quick_review', 'codex_audit'] } })
      if (!run) throw new Error('BENCHMARK_CODEX_AUDIT_NOT_READY')
      const signingSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      const phase = run.state === 'quick_review' ? 'quick' : 'full'
      try { assertPhaseApproval(run, phase, signingSecret) } catch { throw new Error('BENCHMARK_RUN_FACTS_INVALID') }
      const publicEvidenceSampleIds = Array.isArray(input.publicEvidenceSampleIds)
        ? input.publicEvidenceSampleIds.map((value: unknown) => text(value)).filter(Boolean).slice(0, 12) : []
      if (publicEvidenceSampleIds.length) {
        await samples.updateMany({ runId, phase, sampleId: { $in: publicEvidenceSampleIds } }, { $set: { auditRequired: true, publicEvidence: true } })
      }
      const auditSamples = await samples.find({ runId, phase, auditRequired: true }).sort({ sampleId: 1 }).toArray()
      let sourceBinding: { sourceManifestHash?: string; sourceManifestAttestation?: string } = {}
      if (phase === 'full') {
        const allFullSamples = await samples.find({ runId, phase: 'full' }).toArray()
        const allRunJudgments = await judgments.find({ runId }).toArray()
        let manifest: ReturnType<typeof buildFullReviewSourceManifest>
        try { manifest = buildFullReviewSourceManifest(run, allFullSamples, allRunJudgments) }
        catch { throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_INVALID') }
        if (!sameStringSet(manifest.expectedAuditIds, auditSamples.map((sample) => sample.sampleId))) throw new Error('BENCHMARK_FULL_AUDIT_SET_MISMATCH')
        sourceBinding = {
          sourceManifestHash: manifest.hash,
          sourceManifestAttestation: sourceManifestAttestation(run, manifest.hash, signingSecret),
        }
      }
      for (const sample of auditSamples) await verifyEvidence(sample.imageObjectKey, sample.imageHash)
      const issuedAt = now()
      const expiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1_000)
      const packet = createCodexReviewPacket({
        reviewerEpoch: text(run.reviewerEpoch || 'codex-2026-08-v1'),
        runHash: run.runHash,
        phase,
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
        })),
      })
      await runs.updateOne(
        { _id: runId, state: run.state },
        {
          $set: { reviewPacket: packet, reviewPacketExpiresAt: expiresAt, updatedAt: now() },
          $unset: { quickAuditImportedAt: '', codexAuditImportedAt: '', importedReviewPacketHash: '' },
        },
      )
      return packet
    },
    async importReview(input: AnyRecord) {
      const runId = text(input.runId)
      const run = await runs.findOne({ _id: runId, state: { $in: ['quick_review', 'codex_audit'] } })
      if (!run?.reviewPacket) throw new Error('BENCHMARK_REVIEW_PACKET_NOT_FOUND')
      if (!run.reviewPacketExpiresAt || new Date(run.reviewPacketExpiresAt).getTime() <= now().getTime()) throw new Error('BENCHMARK_REVIEW_PACKET_EXPIRED')
      const signingSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      try { assertPhaseApproval(run, run.state === 'quick_review' ? 'quick' : 'full', signingSecret) } catch { throw new Error('BENCHMARK_RUN_FACTS_INVALID') }
      if (run.state === 'codex_audit') {
        try {
          assertFullSourceManifest(
            run,
            run.reviewPacket,
            await samples.find({ runId, phase: 'full' }).toArray(),
            await judgments.find({ runId }).toArray(),
            signingSecret,
          )
        } catch {
          throw new Error('BENCHMARK_FULL_SOURCE_MANIFEST_MISMATCH')
        }
      }
      const imported = importCodexReview(run.reviewPacket, input.review, {
        signingSecret,
        expectedPhase: run.state === 'quick_review' ? 'quick' : 'full',
        now: now(),
      })
      const importedReviewHash = imported.reviewHash
      const phase = run.state === 'quick_review' ? 'quick' : 'full'
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
      const releaseDraft = run.releaseDraft || { models: [{}], evidence: [], methodology: {} }
      const auditField = run.state === 'quick_review' ? 'quickAuditImportedAt' : 'codexAuditImportedAt'
      const profileStatus = run.state === 'quick_review' ? 'provisional' : 'verified'
      releaseDraft.models = [{ ...(releaseDraft.models?.[0] || {}), dimensions, profileStatus }]
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
      const runId = text(input.runId)
      if (input.profileStatus !== 'provisional' && input.profileStatus !== 'verified') throw new Error('BENCHMARK_PROFILE_STATUS_INVALID')
      const run = await runs.findOne({ _id: runId })
      const expectedState = input.profileStatus === 'provisional' ? 'quick_review' : 'codex_audit'
      if (!run || run.state !== expectedState) throw new Error('BENCHMARK_RUN_NOT_PUBLISHABLE')
      if (input.profileStatus === 'provisional' && (!run.quickAuditImportedAt || run.importedReviewPacketHash !== run.reviewPacket?.packetHash)) throw new Error('BENCHMARK_QUICK_AUDIT_REQUIRED')
      if (input.profileStatus === 'verified' && !run.codexAuditImportedAt) throw new Error('BENCHMARK_CODEX_AUDIT_REQUIRED')
      const profileStatus = input.profileStatus === 'provisional' ? 'provisional' : 'verified'
      const signingSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      const verifiedDbIntegrity = profileStatus === 'verified'
        ? assertVerifiedReleaseIntegrity({
            run,
            suite: await suites.findOne({ _id: run.suiteId }),
            runSamples: await samples.find({ runId }).toArray(),
            runJudgments: await judgments.find({ runId }).toArray(),
            signingSecret,
          })
        : null
      if (verifiedDbIntegrity) await verifyEvidenceObjects(verifiedDbIntegrity.evidenceObjects, verifyEvidence)
      const verifiedAt = verifiedDbIntegrity ? now().toISOString() : ''
      const verifiedIntegrity = verifiedDbIntegrity ? (() => {
        const { evidenceObjects: _evidenceObjects, candidateHash: _candidateHash, ...profileIntegrity } = verifiedDbIntegrity
        return { ...profileIntegrity, verifiedAt }
      })() : null
      const previousRelease = await releases.find({ suiteId: run.suiteId, lane: run.lane, judgeEpoch: run.judgeEpoch, publishedAt: { $exists: true } }).sort({ publishedAt: -1 }).limit(1).next()
      if (run.correctionOfReleaseId) {
        const correctionTarget = await releases.findOne({ _id: run.correctionOfReleaseId, suiteId: run.suiteId, lane: run.lane, judgeEpoch: run.judgeEpoch, publishedAt: { $exists: true } })
        if (!correctionTarget) throw new Error('BENCHMARK_CORRECTION_PREDECESSOR_MISMATCH')
      }
      const laneHeadId = `benchmark-release-head:${run.suiteId}:${run.lane}:${run.judgeEpoch}`
      const currentProfiles = verifiedIntegrity
        ? [{
            profileId: `${verifiedIntegrity.provider}:${verifiedIntegrity.modelId}:${verifiedIntegrity.lane}`,
            profileStatus: 'verified',
            ...verifiedIntegrity,
          }]
        : (run.releaseDraft?.models || []).map((model: AnyRecord) => ({
            ...model,
            profileId: `${run.provider}:${run.modelId}:${run.lane}`,
            developer: run.developer || model.developer || '',
            sampleCount: run.sampleCount || model.sampleCount,
            auditRatio: run.auditRatio,
            successRate: model.successRate ?? 1,
            estimatedCost: { usd: Number(run.usage?.estimatedUsd || 0) },
            registryHash: run.registryHash,
            priceHash: run.priceHash,
            codeSha: run.codeSha,
          }))
      const replacedIds = new Set(currentProfiles.map((model: AnyRecord) => model.profileId))
      const mergedProfiles = [...(previousRelease?.models || []).filter((model: AnyRecord) => !replacedIds.has(model.profileId || `${model.provider}:${model.modelId}:${model.lane}`)), ...currentProfiles]
      const laneMedians = Object.fromEntries(BENCHMARK_AXES.map((axis) => {
        const values = mergedProfiles.filter((model: AnyRecord) => model.profileStatus === 'verified').map((model: AnyRecord) => Number(model.dimensions?.[axis]?.mean)).filter(Number.isFinite).sort((left: number, right: number) => left - right)
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
        return { ...model, dimensions, traits: deriveRelativeTraits({ profileStatus: model.profileStatus, coverage: Number(model.coverage || 0), dimensions }) }
      })
      const requestedEvidence = Array.isArray(input.evidence) ? input.evidence.slice(0, 12) : []
      const currentEvidence = []
      for (const item of requestedEvidence) {
        const sample = await samples.findOne({ runId, ...(profileStatus === 'verified' ? { phase: 'full' } : { phase: 'quick' }), sampleId: text(item.sampleId), publicEvidence: true, auditRequired: true })
        if (!sample?.imageObjectKey) throw new Error('BENCHMARK_EVIDENCE_NOT_AUDITED')
        await verifyEvidence(sample.imageObjectKey, sample.imageHash)
        const codexJudgment = await judgments.findOne({ runId, phase: profileStatus === 'verified' ? 'full' : 'quick', sampleId: sample.sampleId, source: 'codex', reviewerEpoch: run.reviewerEpoch, packetHash: run.importedReviewPacketHash, reviewHash: run.importedReviewHash, reviewAttestation: run.importedReviewAttestation, accepted: true })
        if (!codexJudgment) throw new Error('BENCHMARK_EVIDENCE_NOT_CODEX_REVIEWED')
        currentEvidence.push({ sampleId: sample.sampleId, profileId: `${run.provider}:${run.modelId}:${run.lane}`, modelId: run.modelId, caseId: sample.caseId, objectKey: sample.imageObjectKey, imageHash: sample.imageHash, kind: ['median', 'strength', 'failure'].includes(item.kind) ? item.kind : 'median', caption: text(item.caption, 300) })
      }
      const releaseBase = {
        profileStatus,
        supersedesReleaseId: previousRelease?._id || undefined,
        suiteId: run.suiteId,
        suiteHash: run.suiteHash,
        judgeEpoch: run.judgeEpoch,
        reviewerEpoch: run.reviewerEpoch,
        registryHash: verifiedIntegrity?.registryHash || run.registryHash,
        priceHash: verifiedIntegrity?.priceHash || run.priceHash,
        codeSha: verifiedIntegrity?.codeSha || run.codeSha,
        lane: verifiedIntegrity?.lane || run.lane,
        sampleCount: publishedProfiles.reduce((sum: number, model: AnyRecord) => sum + Number(model.sampleCount || 0), 0),
        auditRatio: publishedProfiles.length ? publishedProfiles.reduce((sum: number, model: AnyRecord) => sum + Number(model.auditRatio || 0), 0) / publishedProfiles.length : 0,
        models: publishedProfiles,
        evidence: [...(previousRelease?.evidence || []).filter((item: AnyRecord) => !replacedIds.has(item.profileId || `${item.provider || ''}:${item.modelId}:${run.lane}`)), ...currentEvidence],
        methodology: profileStatus === 'verified' ? {
          suiteId: run.suiteId,
          suiteHash: run.suiteHash,
          aggregation: 'case-first-bootstrap',
          noOverallScore: true,
          auditPolicy: 'disagreement-v1:red-line-conflict,confidence-below-0.35,invalid-evidence,public-evidence,deterministic-10-percent',
          repetitionsPerCase: 3,
          automaticJudges: ['openrouter', 'bailian'],
          expectedCaseCount: Math.round(Number(verifiedIntegrity?.capabilityCoverage || 0) * 48),
          sampleCount: verifiedIntegrity?.sampleCount,
          automaticJudgmentCount: Number(verifiedIntegrity?.sampleCount || 0) * 2,
          auditSampleCount: Math.round(Number(verifiedIntegrity?.auditRatio || 0) * Number(verifiedIntegrity?.sampleCount || 0)),
          capabilityGaps: verifiedIntegrity?.capabilityGaps,
          judgeEpoch: run.judgeEpoch,
          reviewerEpoch: run.reviewerEpoch,
          evidenceManifestHash: verifiedIntegrity?.evidenceManifestHash,
          evidenceVerifiedAt: verifiedIntegrity?.verifiedAt,
        } : run.releaseDraft?.methodology || {},
        publishedAt: now(),
      }
      const releaseHash = canonicalHash(releaseBase)
      const releaseId = `bench-release-${releaseHash.slice(0, 20)}`
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const publishGuard = {
            _id: runId,
            state: expectedState,
            ...(verifiedIntegrity ? {
              'reviewPacket.packetHash': run.reviewPacket.packetHash,
              importedReviewPacketHash: run.importedReviewPacketHash,
              importedReviewHash: run.importedReviewHash,
            } : {}),
          }
          const current = await runs.findOne(publishGuard, { session })
          if (!current) throw new Error('BENCHMARK_PUBLISH_STATE_CONFLICT')
          if (verifiedIntegrity) {
            const transactionalIntegrity = assertVerifiedReleaseIntegrity({
              run: current,
              suite: await suites.findOne({ _id: current.suiteId }, { session }),
              runSamples: await samples.find({ runId }, { session }).toArray(),
              runJudgments: await judgments.find({ runId }, { session }).toArray(),
              signingSecret,
            })
            if (canonicalHash(transactionalIntegrity) !== canonicalHash(verifiedDbIntegrity)) {
              verifiedIntegrityFailure('SNAPSHOT_CHANGED')
            }
          }
          const laneHead = await suites.findOne({ _id: laneHeadId }, { session })
          if (laneHead && laneHead.releaseId !== previousRelease?._id) throw new Error('BENCHMARK_LANE_HEAD_CONFLICT')
          await releases.insertOne({ _id: releaseId, ...releaseBase, releaseHash }, { session })
          const updated = await runs.updateOne(
            publishGuard,
            { $set: { state: profileStatus === 'provisional' ? 'provisional_published' : 'verified_published', releaseId, updatedAt: now() } },
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
