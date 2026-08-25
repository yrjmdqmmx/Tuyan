import {
  BENCHMARK_AXES,
  BENCHMARK_COLLECTIONS,
  PB_IMAGE_DIAGNOSTIC_V1,
  assertBenchmarkTransition,
  aggregateAxisScores,
  applyCodexAdjudication,
  canonicalHash,
  createCodexReviewPacket,
  deriveRelativeTraits,
  importCodexReview,
  benchmarkJudgeStackHash,
  type BenchmarkRunState,
} from '@paperbanana/benchmark-core'
import type { Db } from 'mongodb'

type AnyRecord = { _id: string; [key: string]: any }

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

export function createMongoBenchmarkRepository(db: Db, now = () => new Date(), verifyEvidence: (objectKey: string, imageHash: string) => Promise<void> = async () => {}) {
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
      const codeSha = text(process.env.PAPERBANANA_CODE_SHA || '')
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
      const authorizationHash = canonicalHash({ phase: maxGenerations > 24 ? 'full' : 'quick', approval, codeSha })
      const judgeStackHash = benchmarkJudgeStackHash(codeSha)
      const currentCandidate = await models.findOne({ _id: candidateId })
      if (!currentCandidate || !['detected', 'approved'].includes(currentCandidate.state)) throw new Error('BENCHMARK_CANDIDATE_NOT_APPROVABLE')
      if (!['1K-standard', '2K-standard', '4K-standard'].includes(currentCandidate.lane)) throw new Error('BENCHMARK_CANDIDATE_HAS_NO_SUPPORTED_LANE')
      let existingRun: AnyRecord | null = null
      let correctionOfReleaseId = ''
      if (currentCandidate.state === 'approved') {
        existingRun = await runs.find({ modelCandidateId: candidateId }).sort({ createdAt: -1 }).limit(1).next()
        if (!existingRun || !['provisional_published', 'verified_published'].includes(existingRun.state)) throw new Error('BENCHMARK_REAPPROVAL_NOT_ALLOWED')
        if (existingRun.state === 'provisional_published') {
          const usage = existingRun.usage || {}
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
        const updated = await runs.updateOne(
          { _id: existingRun._id, state: 'provisional_published' },
          { $set: { approval, priceHash, authorizationHash, updatedAt: now() }, $push: { authorizationHistory: { authorizationHash, priceHash, approvedAt: approval.approvedAt, phase: 'full' } } } as any,
        )
        if (updated.modifiedCount !== 1) throw new Error('BENCHMARK_REAPPROVAL_CONFLICT')
        return { ...adminCandidate(result), runId: existingRun._id, reapproved: true }
      }
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
        authorizationHash,
        authorizationHistory: [{ authorizationHash, priceHash, approvedAt: approval.approvedAt, phase: 'quick' }],
        codeSha,
        state: 'approved',
        approval,
        judgeEstimatedUsd: judgePrice,
        usage: { generations: 0, judgments: 0, estimatedUsd: 0 },
        correctionOfReleaseId: correctionOfReleaseId || undefined,
        createdAt: now(),
      }
      const runHash = canonicalHash(runBase)
      const runId = `bench-run-${runHash.slice(0, 20)}`
      await runs.updateOne({ _id: runId }, { $setOnInsert: { _id: runId, ...runBase, runHash } }, { upsert: true })
      return { ...adminCandidate(result), runId }
    },
    async control(input: AnyRecord) {
      if (input.command === 'recordJudgeCalibration') {
        const judgeEpoch = text(input.judgeEpoch)
        const fixtureHash = text(input.fixtureHash)
        const correctRedLines = positiveInteger(input.correctRedLines, 10_000)
        const totalRedLines = positiveInteger(input.totalRedLines, 10_000)
        const agreement = Number(input.agreement)
        const accuracy = totalRedLines ? correctRedLines / totalRedLines : 0
        if (!judgeEpoch || !/^[a-f0-9]{64}$/i.test(fixtureHash) || correctRedLines > totalRedLines || accuracy < 0.85 || !Number.isFinite(agreement) || agreement < 0.8 || agreement > 1) {
          throw new Error('BENCHMARK_JUDGE_CALIBRATION_FAILED')
        }
        const codeSha = text(process.env.PAPERBANANA_CODE_SHA || '')
        if (!/^[a-f0-9]{40}$/i.test(codeSha)) throw new Error('BENCHMARK_JUDGE_CALIBRATION_FAILED')
        const judgeStackHash = benchmarkJudgeStackHash(codeSha)
        const calibrationId = judgeCalibrationId(judgeEpoch, judgeStackHash)
        const record = { judgeEpoch, fixtureHash, codeSha, judgeStackHash, correctRedLines, totalRedLines, accuracy, agreement, passed: true, recordedBy: text(input.adminUserId), recordedAt: now() }
        await suites.updateOne({ _id: calibrationId }, { $setOnInsert: { _id: calibrationId, ...record } }, { upsert: true })
        const persisted = await suites.findOne({ _id: calibrationId })
        const calibrationFacts = ({ judgeEpoch: epoch, fixtureHash: fixture, codeSha: sha, judgeStackHash: stack, correctRedLines: correct, totalRedLines: total, accuracy: measuredAccuracy, agreement: measuredAgreement, passed }: Record<string, any>) => ({
          judgeEpoch: epoch, fixtureHash: fixture, codeSha: sha, judgeStackHash: stack, correctRedLines: correct,
          totalRedLines: total, accuracy: measuredAccuracy, agreement: measuredAgreement, passed,
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
      const publicEvidenceSampleIds = Array.isArray(input.publicEvidenceSampleIds)
        ? input.publicEvidenceSampleIds.map((value: unknown) => text(value)).filter(Boolean).slice(0, 12) : []
      if (publicEvidenceSampleIds.length) {
        await samples.updateMany({ runId, sampleId: { $in: publicEvidenceSampleIds } }, { $set: { auditRequired: true, publicEvidence: true } })
      }
      const auditSamples = await samples.find({ runId, auditRequired: true }).sort({ sampleId: 1 }).toArray()
      for (const sample of auditSamples) await verifyEvidence(sample.imageObjectKey, sample.imageHash)
      const issuedAt = now()
      const expiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1_000)
      const signingSecret = text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500)
      const packet = createCodexReviewPacket({
        reviewerEpoch: text(run.reviewerEpoch || 'codex-2026-08-v1'),
        runHash: run.runHash,
        phase: run.state === 'quick_review' ? 'quick' : 'full',
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        signingSecret,
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
      const importedReviewHash = canonicalHash(input.review)
      if (run.importedReviewPacketHash === run.reviewPacket.packetHash) {
        if (run.importedReviewHash === importedReviewHash) {
          await judgments.updateMany({ runId, source: 'codex', packetHash: run.reviewPacket.packetHash, reviewHash: importedReviewHash }, { $set: { accepted: true }, $unset: { rejectedAt: '' } })
          return { imported: run.reviewPacket.samples.length, packetHash: run.reviewPacket.packetHash, replayed: true }
        }
        throw new Error('BENCHMARK_REVIEW_CONFLICTING_REPLAY')
      }
      const imported = importCodexReview(run.reviewPacket, input.review, {
        signingSecret: text(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET, 500),
        expectedPhase: run.state === 'quick_review' ? 'quick' : 'full',
        now: now(),
      })
      for (const judgment of imported) {
        await judgments.updateOne(
          { _id: `codex:${runId}:${judgment.sampleId}:${run.reviewPacket.reviewerEpoch}:${run.reviewPacket.packetHash}:${importedReviewHash}` },
          { $setOnInsert: { ...judgment, runId, source: 'codex', reviewerEpoch: run.reviewPacket.reviewerEpoch, packetHash: run.reviewPacket.packetHash, reviewHash: importedReviewHash, accepted: false, createdAt: now() } },
          { upsert: true },
        )
      }
      const runSamples = await samples.find({ runId }).toArray()
      const runJudgments = await judgments.find({ runId }).toArray()
      const codexBySample = new Map(runJudgments.filter((judgment) => judgment.source === 'codex' && judgment.reviewerEpoch === run.reviewPacket.reviewerEpoch && judgment.packetHash === run.reviewPacket.packetHash && judgment.reviewHash === importedReviewHash).map((judgment) => [judgment.sampleId, judgment]))
      if (imported.some((judgment) => !codexBySample.has(judgment.sampleId))) throw new Error('BENCHMARK_REVIEW_PERSISTENCE_INCOMPLETE')
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
        { $set: { [auditField]: now(), importedReviewPacketHash: run.reviewPacket.packetHash, importedReviewHash, releaseDraft, updatedAt: now() } },
      )
      if (updated.modifiedCount !== 1) {
        await judgments.updateMany({ runId, source: 'codex', packetHash: run.reviewPacket.packetHash, reviewHash: importedReviewHash }, { $set: { accepted: false, rejectedAt: now() } })
        throw new Error('BENCHMARK_REVIEW_IMPORT_CONFLICT')
      }
      await judgments.updateMany({ runId, source: 'codex', packetHash: run.reviewPacket.packetHash, reviewHash: importedReviewHash }, { $set: { accepted: true }, $unset: { rejectedAt: '' } })
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
      const previousRelease = await releases.find({ suiteId: run.suiteId, lane: run.lane, judgeEpoch: run.judgeEpoch, publishedAt: { $exists: true } }).sort({ publishedAt: -1 }).limit(1).next()
      if (run.correctionOfReleaseId) {
        const correctionTarget = await releases.findOne({ _id: run.correctionOfReleaseId, suiteId: run.suiteId, lane: run.lane, judgeEpoch: run.judgeEpoch, publishedAt: { $exists: true } })
        if (!correctionTarget) throw new Error('BENCHMARK_CORRECTION_PREDECESSOR_MISMATCH')
      }
      const laneHeadId = `benchmark-release-head:${run.suiteId}:${run.lane}:${run.judgeEpoch}`
      const currentProfiles = (run.releaseDraft?.models || []).map((model: AnyRecord) => ({
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
        const sample = await samples.findOne({ runId, sampleId: text(item.sampleId), publicEvidence: true, auditRequired: true })
        if (!sample?.imageObjectKey) throw new Error('BENCHMARK_EVIDENCE_NOT_AUDITED')
        await verifyEvidence(sample.imageObjectKey, sample.imageHash)
        const codexJudgment = await judgments.findOne({ runId, sampleId: sample.sampleId, source: 'codex', reviewerEpoch: run.reviewerEpoch, packetHash: run.importedReviewPacketHash, reviewHash: run.importedReviewHash, accepted: true })
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
        registryHash: run.registryHash,
        priceHash: run.priceHash,
        codeSha: run.codeSha,
        lane: run.lane,
        sampleCount: publishedProfiles.reduce((sum: number, model: AnyRecord) => sum + Number(model.sampleCount || 0), 0),
        auditRatio: publishedProfiles.length ? publishedProfiles.reduce((sum: number, model: AnyRecord) => sum + Number(model.auditRatio || 0), 0) / publishedProfiles.length : 0,
        models: publishedProfiles,
        evidence: [...(previousRelease?.evidence || []).filter((item: AnyRecord) => !replacedIds.has(item.profileId || `${item.provider || ''}:${item.modelId}:${run.lane}`)), ...currentEvidence],
        methodology: run.releaseDraft?.methodology || {},
        publishedAt: now(),
      }
      const releaseHash = canonicalHash(releaseBase)
      const releaseId = `bench-release-${releaseHash.slice(0, 20)}`
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const current = await runs.findOne({ _id: runId, state: expectedState }, { session })
          if (!current) throw new Error('BENCHMARK_PUBLISH_STATE_CONFLICT')
          const laneHead = await suites.findOne({ _id: laneHeadId }, { session })
          if (laneHead && laneHead.releaseId !== previousRelease?._id) throw new Error('BENCHMARK_LANE_HEAD_CONFLICT')
          await releases.insertOne({ _id: releaseId, ...releaseBase, releaseHash }, { session })
          const updated = await runs.updateOne(
            { _id: runId, state: expectedState },
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
