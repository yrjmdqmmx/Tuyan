import { BENCHMARK_AXES, type BenchmarkAxis } from './contracts.js'
import { canonicalHash } from './hash.js'
import { createHmac, timingSafeEqual } from 'node:crypto'

interface ReviewSampleInput {
  sampleId: string
  imageObjectKey: string
  imageHash: string
  rubric: Partial<Record<BenchmarkAxis, string>>
  rubricHash: string
  modelId?: string
  automaticScores?: unknown
}

export function createCodexReviewPacket(input: {
  reviewerEpoch: string
  runHash: string
  phase: 'quick' | 'full'
  issuedAt: string
  expiresAt: string
  signingSecret: string
  samples: readonly ReviewSampleInput[]
}) {
  if (!input.reviewerEpoch || !input.runHash || !input.samples.length || !input.signingSecret || !Number.isFinite(Date.parse(input.issuedAt)) || Date.parse(input.expiresAt) <= Date.parse(input.issuedAt)) throw new Error('INVALID_CODEX_REVIEW_PACKET')
  const packetBase = {
    schemaVersion: 1,
    reviewerEpoch: input.reviewerEpoch,
    runHash: input.runHash,
    phase: input.phase,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    samples: input.samples.map((sample, index) => {
      if (!sample.sampleId || !sample.imageObjectKey.startsWith('bench/') || !sample.imageHash || !sample.rubricHash) {
        throw new Error('INVALID_CODEX_REVIEW_SAMPLE')
      }
      if (canonicalHash(sample.rubric) !== sample.rubricHash) throw new Error('CODEX_REVIEW_RUBRIC_HASH_MISMATCH')
      return {
        blindLabel: `sample-${String(index + 1).padStart(3, '0')}`,
        sampleId: sample.sampleId,
        imageObjectKey: sample.imageObjectKey,
        imageHash: sample.imageHash,
        rubric: sample.rubric,
        rubricHash: sample.rubricHash,
      }
    }),
  }
  const packetHash = canonicalHash(packetBase)
  return { ...packetBase, packetHash, signature: createHmac('sha256', input.signingSecret).update(packetHash).digest('hex') }
}

interface ReviewImport {
  packetHash: string
  reviewerEpoch: string
  judgments: Array<{
    blindLabel: string
    imageHash: string
    rubricHash: string
    scores: Partial<Record<BenchmarkAxis, number>>
    confirmedRedLines: Array<{ code: string; axis: BenchmarkAxis; cap: number }>
    evidence: string[]
    confidence: number
  }>
}

export function importCodexReview(packet: ReturnType<typeof createCodexReviewPacket>, review: ReviewImport, options: { signingSecret: string; expectedPhase: 'quick' | 'full'; now: Date }) {
  const expectedPacketHash = canonicalHash({
    schemaVersion: packet.schemaVersion,
    reviewerEpoch: packet.reviewerEpoch,
    runHash: packet.runHash,
    phase: packet.phase,
    issuedAt: packet.issuedAt,
    expiresAt: packet.expiresAt,
    samples: packet.samples,
  })
  if (packet.packetHash !== expectedPacketHash || review.packetHash !== packet.packetHash) throw new Error('CODEX_REVIEW_PACKET_HASH_MISMATCH')
  const expectedSignature = createHmac('sha256', options.signingSecret).update(packet.packetHash).digest('hex')
  if (!packet.signature || packet.signature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(packet.signature), Buffer.from(expectedSignature))) throw new Error('CODEX_REVIEW_SIGNATURE_MISMATCH')
  if (packet.phase !== options.expectedPhase) throw new Error('CODEX_REVIEW_PHASE_MISMATCH')
  if (Date.parse(packet.expiresAt) <= options.now.getTime()) throw new Error('CODEX_REVIEW_PACKET_EXPIRED')
  if (review.reviewerEpoch !== packet.reviewerEpoch) throw new Error('CODEX_REVIEW_EPOCH_MISMATCH')
  if (review.judgments.length !== packet.samples.length) throw new Error('CODEX_REVIEW_CARDINALITY_MISMATCH')
  const expectedLabels = new Set(packet.samples.map((sample) => sample.blindLabel))
  const receivedLabels = new Set(review.judgments.map((judgment) => judgment.blindLabel))
  if (receivedLabels.size !== review.judgments.length || receivedLabels.size !== expectedLabels.size || [...expectedLabels].some((label) => !receivedLabels.has(label))) {
    throw new Error('CODEX_REVIEW_LABEL_SET_MISMATCH')
  }
  return review.judgments.map((judgment) => {
    const sample = packet.samples.find((candidate) => candidate.blindLabel === judgment.blindLabel)
    if (!sample) throw new Error('CODEX_REVIEW_UNKNOWN_SAMPLE')
    if (judgment.imageHash !== sample.imageHash) throw new Error('CODEX_REVIEW_IMAGE_HASH_MISMATCH')
    if (judgment.rubricHash !== sample.rubricHash) throw new Error('CODEX_REVIEW_RUBRIC_HASH_MISMATCH')
    if (!Number.isFinite(judgment.confidence) || judgment.confidence < 0 || judgment.confidence > 1) throw new Error('CODEX_REVIEW_INVALID_CONFIDENCE')
    if (Object.keys(judgment.scores).length !== BENCHMARK_AXES.length) throw new Error('CODEX_REVIEW_INVALID_SCORE')
    for (const axis of BENCHMARK_AXES) {
      const score = judgment.scores[axis]
      if (!Number.isFinite(score) || score! < 0 || score! > 10) throw new Error('CODEX_REVIEW_INVALID_SCORE')
    }
    if (!Array.isArray(judgment.evidence) || !judgment.evidence.length || judgment.evidence.length > 20 || judgment.evidence.some((value) => typeof value !== 'string' || !value.trim() || value.length > 500)) throw new Error('CODEX_REVIEW_INVALID_EVIDENCE')
    if (!Array.isArray(judgment.confirmedRedLines) || judgment.confirmedRedLines.some((item) => !item || typeof item.code !== 'string' || !item.code.trim() || !BENCHMARK_AXES.includes(item.axis) || !Number.isFinite(item.cap) || item.cap < 0 || item.cap > 10)) throw new Error('CODEX_REVIEW_INVALID_RED_LINE')
    return { sampleId: sample.sampleId, ...judgment }
  })
}
