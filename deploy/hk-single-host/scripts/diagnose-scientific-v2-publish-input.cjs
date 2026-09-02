'use strict'

const { createHash, createHmac, timingSafeEqual } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')

const requireFromApp = createRequire('/app/package.json')
const { MongoClient } = requireFromApp('mongodb')
const correctiveReleasePlan = Object.freeze({
  baselineReleaseHash: 'f1f31caf50b810b456f434a4fd1d6eed55a60d3f8a54fa3795a08284df4cf70a',
  activePredecessorReleaseHash: '25b48bbfa7f8a7818adcdc088bb11ee596ab14720558f89c63c440989c8a0fbe',
  targetModelIds: Object.freeze([
    'recraft/recraft-v4-pro-vector',
    'recraft/recraft-v4-styles-pro-vector',
    'recraft/recraft-v4-styles-vector',
    'seedream-4.5',
    'seedream-5.0',
  ]),
})

function canonicalNormalize(value) {
  if (value === undefined) return null
  if (Array.isArray(value)) return value.map(canonicalNormalize)
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalNormalize(child)]))
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('NON_FINITE_CANONICAL_VALUE')
  return value
}

function canonicalHash(value) {
  return createHash('sha256').update(JSON.stringify(canonicalNormalize(value))).digest('hex')
}

function exactKeys(value, keys) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()))
}

function safeHashEqual(actual, expected) {
  return typeof actual === 'string' && /^[a-f0-9]{64}$/.test(actual)
    && typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected)
    && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

function hmacHash(secret, hash) {
  return createHmac('sha256', secret).update(hash).digest('hex')
}

function hmacCanonical(secret, value) {
  return hmacHash(secret, canonicalHash(value))
}

function addCheck(checks, stage, passed, facts = {}) {
  checks.push({ stage, passed: passed === true, ...facts })
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '/input.json') throw new Error('DIAGNOSTIC_INPUT_PATH_INVALID')
  const uri = String(process.env.PAPERBANANA_BENCH_MONGODB_URI || '')
  const database = String(process.env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark')
  const secret = String(process.env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET || '')
  if (!uri || Buffer.byteLength(secret, 'utf8') < 32) throw new Error('DIAGNOSTIC_ENV_INVALID')
  const envelope = JSON.parse(readFileSync('/input.json', 'utf8'))
  const input = envelope.publishInput
  if (!input || envelope.operation !== 'render_public_evidence' || envelope.providerCalls !== 0
    || canonicalHash(input) !== envelope.publishInputHash) throw new Error('DIAGNOSTIC_INPUT_INVALID')

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
  await client.connect()
  const checks = []
  try {
    const db = client.db(database)
    const batches = db.collection('paperbanana_benchmark_scientific_v2_batches')
    const dispatches = db.collection('paperbanana_benchmark_scientific_v2_dispatches')
    const reviews = db.collection('paperbanana_benchmark_scientific_v2_review_artifacts')
    const releases = db.collection('paperbanana_benchmark_releases')
    const releaseHeads = db.collection('paperbanana_benchmark_release_heads')
    const releaseLifecycle = db.collection('paperbanana_benchmark_release_lifecycle')
    const publicEvidence = db.collection('paperbanana_benchmark_scientific_v2_public_evidence')
    const batch = await batches.findOne({ batchId: input.batchId })
    addCheck(checks, 'batch_publishable', Boolean(batch && ['review_finalized', 'review_ready'].includes(batch.status) && batch.reviewFinalHash), {
      batchStatus: batch?.status || null,
      revision: Number(batch?.revision || 0),
    })
    if (!batch) throw new Error('DIAGNOSTIC_BATCH_NOT_FOUND')
    const correctionTargetModelIds = batch.correctionBaseline && Array.isArray(batch.remediationOf?.targetModelIds)
      ? new Set(batch.remediationOf.targetModelIds) : null
    const correctionTargetSlots = correctionTargetModelIds
      ? batch.state.slots.filter((slot) => correctionTargetModelIds.has(slot.canonicalModelId)) : []
    addCheck(checks, 'correction_target_scope', !batch.correctionBaseline || Boolean(
      exactKeys(batch.correctionBaseline, ['releaseId', 'releaseHash', 'batchId', 'manifestHash'])
      && batch.correctionBaseline.releaseHash === correctiveReleasePlan.baselineReleaseHash
      && batch.remediationOf?.releaseHash === correctiveReleasePlan.activePredecessorReleaseHash
      && canonicalHash(batch.remediationOf?.targetModelIds) === canonicalHash(correctiveReleasePlan.targetModelIds)
      && correctionTargetModelIds?.size
      && correctionTargetSlots.length === correctionTargetModelIds.size * 9
      && correctionTargetSlots.every((slot) => slot.status === 'succeeded'
        && /^[a-f0-9]{64}$/.test(String(slot.attempts?.at(-1)?.rawImageHash || ''))
        && ['succeeded', 'succeeded_low_quality'].includes(String(slot.attempts?.at(-1)?.responseClass || '')))
      && batch.remediationOf.targetModelIds.length === correctionTargetModelIds.size
      && JSON.stringify([...correctionTargetModelIds]) === JSON.stringify([...correctionTargetModelIds].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))))
    ), {
      correction: Boolean(batch.correctionBaseline),
      targetModelCount: correctionTargetModelIds?.size || 0,
      targetSlotCount: correctionTargetSlots.length,
      successfulTargetSlotCount: correctionTargetSlots.filter((slot) => slot.status === 'succeeded').length,
    })

    addCheck(checks, 'terminal_state', batch.state?.status === 'completed'
      && Array.isArray(batch.state?.slots)
      && batch.state.slots.every((slot) => ['succeeded', 'failed', 'unsupported'].includes(slot.status))
      && batch.stateHash === batch.state?.stateHash
      && canonicalHash(Object.fromEntries(Object.entries(batch.state).filter(([key]) => key !== 'stateHash'))) === batch.stateHash, {
      stateStatus: batch.state?.status || null,
      slotCount: Array.isArray(batch.state?.slots) ? batch.state.slots.length : -1,
      succeededCount: Array.isArray(batch.state?.slots) ? batch.state.slots.filter((slot) => slot.status === 'succeeded').length : -1,
    })

    const publicationCodeSha = String(process.env.PAPERBANANA_CODE_SHA || '')
    const lineageComplete = ['manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash'].every((key) => Object.hasOwn(batch, key))
    const publicationCodeDiffAllowed = batch.executionCodeSha === publicationCodeSha || Boolean(
      ['review_ready', 'review_finalized', 'published'].includes(String(batch.status || ''))
      && batch.state?.status === 'completed'
      && batch.stateHash === batch.state?.stateHash
      && /^[a-f0-9]{64}$/.test(String(batch.reviewFinalHash || ''))
      && !(await dispatches.findOne({ manifestHash: batch.manifestHash, status: 'started' })),
    )
    addCheck(checks, 'code_lineage', lineageComplete
      && batch.manifestCodeSha === batch.manifest?.codeSha
      && /^[a-f0-9]{40}$/.test(String(batch.executionCodeSha || ''))
      && /^[a-f0-9]{40}$/.test(publicationCodeSha)
      && publicationCodeDiffAllowed
      && (batch.legacyRecoveryStateHash === null || /^[a-f0-9]{64}$/.test(String(batch.legacyRecoveryStateHash))), {
      manifestMatches: batch.manifestCodeSha === batch.manifest?.codeSha,
      executionMatches: batch.executionCodeSha === publicationCodeSha,
      publicationCodeDiffAllowed,
      legacyRecovery: batch.legacyRecoveryStateHash !== null,
    })

    const reportRow = await reviews.findOne({ _id: `scientific-v2-state-report:${batch.latestStateReportHash}` })
    const reportPayload = reportRow?.report && Object.fromEntries(Object.entries(reportRow.report).filter(([key]) => key !== 'reportHash'))
    addCheck(checks, 'state_report_attestation', Boolean(reportRow
      && reportRow.reportHash === batch.latestStateReportHash
      && reportRow.report?.reportHash === reportRow.reportHash
      && canonicalHash(reportPayload) === reportRow.reportHash
      && safeHashEqual(reportRow.attestationHash, hmacHash(secret, reportRow.reportHash))
      && reportRow.report.stateHash === batch.stateHash
      && reportRow.report.manifestCodeSha === batch.manifestCodeSha
      && reportRow.report.executionCodeSha === batch.executionCodeSha
      && reportRow.report.legacyRecoveryStateHash === batch.legacyRecoveryStateHash
      && canonicalHash(reportRow.report.state) === canonicalHash(batch.state)), {
      reportKind: reportRow?.report?.kind || null,
    })

    const markers = await dispatches.find({ manifestHash: batch.manifestHash }).toArray()
    const expectedMarkers = []
    for (const slot of batch.state.slots) {
      if (slot.provider === 'codex' || !slot.provider) continue
      for (const attempt of slot.attempts) expectedMarkers.push({
        slotId: slot.slotId,
        attemptIndex: attempt.attemptIndex,
        payloadHash: attempt.payloadHash,
        attemptHash: attempt.attemptHash,
      })
    }
    const markerMismatchFacts = []
    const markerMismatches = expectedMarkers.filter((expected) => {
      const exact = markers.filter((marker) => marker.slotId === expected.slotId && marker.attemptIndex === expected.attemptIndex)
      const marker = exact[0]
      const mismatch = exact.length !== 1 || marker?.status !== 'committed' || marker?.payloadHash !== expected.payloadHash
        || marker?.attempt?.attemptHash !== expected.attemptHash
      if (mismatch && markerMismatchFacts.length < 20) {
        const stateSlot = batch.state.slots.find((slot) => slot.slotId === expected.slotId)
        const stateAttempt = stateSlot?.attempts?.[expected.attemptIndex - 1]
        const markerAttempt = marker?.attempt
        const markerAttemptBase = markerAttempt && Object.fromEntries(Object.entries(markerAttempt).filter(([key]) => key !== 'attemptHash'))
        const stateAttemptBase = stateAttempt && Object.fromEntries(Object.entries(stateAttempt).filter(([key]) => key !== 'attemptHash'))
        markerMismatchFacts.push({
          slotId: expected.slotId, attemptIndex: expected.attemptIndex,
          markerCount: exact.length, markerStatus: marker?.status || null,
          payloadMatches: marker?.payloadHash === expected.payloadHash,
          attemptHashMatches: markerAttempt?.attemptHash === expected.attemptHash,
          markerAttemptSelfValid: Boolean(markerAttempt && canonicalHash(markerAttemptBase) === markerAttempt.attemptHash),
          stateAttemptSelfValid: Boolean(stateAttempt && canonicalHash(stateAttemptBase) === stateAttempt.attemptHash),
          markerResponseClass: markerAttempt?.responseClass || null,
          stateResponseClass: stateAttempt?.responseClass || null,
          artifactReconciled: Boolean(marker?.artifactReconciledAt),
        })
      }
      return mismatch
    }).length
    const markerKeys = new Set(expectedMarkers.map((item) => `${item.slotId}\0${item.attemptIndex}`))
    const extraMarkers = markers.filter((marker) => !markerKeys.has(`${marker.slotId}\0${marker.attemptIndex}`)).length
    addCheck(checks, 'dispatch_ledger', markerMismatches === 0 && extraMarkers === 0, {
      expectedCount: expectedMarkers.length, actualCount: markers.length, mismatchCount: markerMismatches, extraCount: extraMarkers,
      mismatchFacts: markerMismatchFacts,
    })

    const finalReview = await reviews.findOne({
      artifactType: 'review_final', batchManifestHash: batch.manifestHash,
      status: 'finalized', finalHash: batch.reviewFinalHash,
    })
    const finalAttestationBase = finalReview && Object.fromEntries(Object.entries(finalReview)
      .filter(([key]) => ['batchManifestHash', 'sourceSetHash', 'automaticJudges', 'automaticJudgeCalls', 'reviewerAHash', 'reviewerBHash', 'disputes', 'results', 'status', 'arbitrationHash', 'finalHash'].includes(key)))
    addCheck(checks, 'review_final_attestation', Boolean(finalReview
      && finalReview.automaticJudgeCalls === 0
      && canonicalHash(finalReview.automaticJudges) === canonicalHash([])
      && safeHashEqual(finalReview.attestationHash, hmacCanonical(secret, finalAttestationBase))), {
      resultCount: Array.isArray(finalReview?.results) ? finalReview.results.length : -1,
      disputeCount: Array.isArray(finalReview?.disputes) ? finalReview.disputes.length : -1,
    })
    if (!finalReview) throw new Error('DIAGNOSTIC_FINAL_REVIEW_NOT_FOUND')

    const [assignmentA, assignmentB, arbitration] = await Promise.all([
      reviews.findOne({ artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash, sourceSetHash: finalReview.sourceSetHash, role: 'A' }),
      reviews.findOne({ artifactType: 'review_assignment_private', batchManifestHash: batch.manifestHash, sourceSetHash: finalReview.sourceSetHash, role: 'B' }),
      finalReview.arbitrationHash ? reviews.findOne({ artifactType: 'review_arbitration', batchManifestHash: batch.manifestHash, sourceSetHash: finalReview.sourceSetHash, role: 'ARBITRATION', arbitrationHash: finalReview.arbitrationHash }) : null,
    ])
    addCheck(checks, 'review_assignments', Boolean(assignmentA?.assignment && assignmentA?.result && assignmentB?.assignment && assignmentB?.result
      && assignmentA.result.resultHash === finalReview.reviewerAHash
      && assignmentB.result.resultHash === finalReview.reviewerBHash
      && assignmentA.assignment.assignmentAttestationHash === assignmentB.assignment.assignmentAttestationHash
      && canonicalHash(assignmentA.assignment.assignmentSet) === canonicalHash(assignmentB.assignment.assignmentSet)), {
      assignmentACount: Array.isArray(assignmentA?.result?.items) ? assignmentA.result.items.length : -1,
      assignmentBCount: Array.isArray(assignmentB?.result?.items) ? assignmentB.result.items.length : -1,
    })
    const genericRationalePrefixes = [
      '加分双盲审核未确认红线问题', '双盲审核未确认红线问题', '整体表现良好', '整体符合要求', '基本符合要求', '未发现明显问题',
      '没有明显问题', '无明显问题', '图像质量良好', '内容基本准确', '结果符合题意', '整体效果不错', '整体效果良好', '符合要求',
      'looksgood', 'meetsrequirements', 'noobviousissues', 'overallgood',
    ]
    const rationaleValid = (value) => typeof value === 'string' && value.trim() === value && value.length >= 8 && value.length <= 500
      && !/[\u0000-\u001f\u007f]|\p{Cf}/u.test(value)
      && !/(?:reviewer\s*[ab]?|blind-[a-z0-9-]+|object\s*key|mapping\s*hash|attestation|hmac|\/tmp\/|bench\/scientific-v2\/private\/)/iu.test(value.normalize('NFKC'))
      && !/(?:https?:\/\/|www\.|mailto:|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b|\b(?:api[-_ ]?key|access[-_ ]?token|secret|password|credential|authorization|bearer)\b|\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b|(?:\/Users\/|\/home\/|[a-z]:\\)|\b(?:sk-|gh[pousr]_)[a-z0-9_-]{8,})/iu.test(value.normalize('NFKC'))
      && !/(?:apikey|accesskey|secretkey|privatekey|accesstoken|refreshtoken|authorization|bearer|password|credential)/u.test(value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\s_-]+/gu, ''))
      && !/(?:sk|gh[pousr])[-_][a-z0-9_-]{8,}/iu.test(value.normalize('NFKC'))
      && !/(?:^|[^a-f0-9])(?:[a-f0-9]{40}|[a-f0-9]{64})(?:[^a-f0-9]|$)/iu.test(value.normalize('NFKC'))
      && !genericRationalePrefixes.some((prefix) => value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()_-]/gu, '').startsWith(prefix))
    const rationaleKey = (value) => value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\p{P}\p{Z}\p{Cf}]/gu, '')
    const reviewerRationalesValid = [assignmentA, assignmentB].every((assignment) => Array.isArray(assignment?.result?.items)
      && assignment.result.items.every((item) => rationaleValid(item.rationale))
      && new Set(assignment.result.items.map((item) => rationaleKey(item.rationale))).size === assignment.result.items.length)
    const finalRationalesValid = Array.isArray(finalReview.results) && finalReview.results.every((item) => Array.isArray(item.rationales)
      && item.rationales.length > 0 && item.rationales.every(rationaleValid))
    const finalRationaleOwners = new Map()
    let finalRationaleDuplicates = 0
    for (const result of finalReview.results || []) for (const rationale of result.rationales || []) {
      const key = rationaleKey(rationale)
      if (finalRationaleOwners.has(key) && finalRationaleOwners.get(key) !== result.itemHash) finalRationaleDuplicates += 1
      else finalRationaleOwners.set(key, result.itemHash)
    }
    addCheck(checks, 'review_rationales', reviewerRationalesValid && finalRationalesValid && finalRationaleDuplicates === 0, {
      reviewerRationalesValid, finalRationalesValid, finalRationaleDuplicates,
    })
    addCheck(checks, 'arbitration_attestation', finalReview.disputes.length === 0 ? finalReview.arbitrationHash === undefined : Boolean(arbitration
      && canonicalHash(arbitration.arbitration) === arbitration.arbitrationHash
      && safeHashEqual(arbitration.attestationHash, hmacHash(secret, arbitration.arbitrationHash))
      && arbitration.arbitration?.reasoningEffort === 'xhigh'
      && Array.isArray(arbitration.arbitration?.results)
      && arbitration.arbitration.results.length === finalReview.disputes.length), {
      arbitrationCount: Array.isArray(arbitration?.arbitration?.results) ? arbitration.arbitration.results.length : 0,
    })

    const bindingByHash = new Map()
    let bindingSchemaFailures = 0
    for (const binding of input.objectBindings) {
      if (!exactKeys(binding, ['imageHash', 'objectKey']) || !/^[a-f0-9]{64}$/.test(String(binding.imageHash || '')) || bindingByHash.has(binding.imageHash)) {
        bindingSchemaFailures += 1
      } else bindingByHash.set(binding.imageHash, binding)
    }
    const requiredBindings = new Map()
    for (const slot of batch.state.slots) if (slot.status === 'succeeded'
      && (!correctionTargetModelIds || correctionTargetModelIds.has(slot.canonicalModelId))) {
      const attempt = slot.attempts.at(-1)
      requiredBindings.set(attempt.rawImageHash, `bench/scientific-v2/private/objects/${attempt.rawImageHash}.${attempt.format}`)
    }
    for (const scientificCase of batch.manifest.cases) if (scientificCase.kind === 'edit'
      && batch.state.slots.some((slot) => slot.caseId === scientificCase.id && slot.status === 'succeeded'
        && (!correctionTargetModelIds || correctionTargetModelIds.has(slot.canonicalModelId)))) {
      requiredBindings.set(scientificCase.sourceHash, `bench/scientific-v2/private/objects/${scientificCase.sourceHash}.png`)
    }
    const bindingMismatches = [...requiredBindings].filter(([hash, key]) => bindingByHash.get(hash)?.objectKey !== key).length
    addCheck(checks, 'object_bindings', bindingSchemaFailures === 0 && bindingByHash.size === requiredBindings.size && bindingMismatches === 0, {
      expectedCount: requiredBindings.size, actualCount: bindingByHash.size, schemaFailureCount: bindingSchemaFailures, mismatchCount: bindingMismatches,
    })

    const evidenceKeys = new Set()
    let evidenceFailures = 0
    for (const item of input.evidence) {
      const slot = batch.state.slots.find((candidate) => candidate.canonicalModelId === item.canonicalModelId && candidate.caseId === item.caseId)
      const scientificCase = batch.manifest.cases.find((candidate) => candidate.id === item.caseId)
      const key = `${item.canonicalModelId}\0${item.caseId}`
      const expectedKeys = ['caseId', 'canonicalModelId', 'imageHash', 'variants', 'requestedResolution', 'actualOutputPixels',
        ...(scientificCase?.kind === 'edit' ? ['sourceHash', 'beforeVariants'] : [])]
      const attempt = slot?.attempts?.at(-1)
      const expectedPixels = attempt && {
        width: attempt.width, height: attempt.height,
        megapixels: Number(((attempt.width * attempt.height) / 1_000_000).toFixed(4)),
        fileSizeBytes: attempt.byteSize,
      }
      const variantValid = (variant, sourceHash) => exactKeys(variant, ['kind', 'objectKey', 'imageHash', 'width', 'height', 'fileSizeBytes', 'mimeType'])
        && ['thumbnail', 'detail', 'full'].includes(variant.kind) && variant.mimeType === 'image/webp'
        && variant.objectKey === `bench/scientific-v2/public/${sourceHash}/${variant.kind}.webp`
        && /^[a-f0-9]{64}$/.test(String(variant.imageHash || ''))
        && Number.isInteger(variant.width) && variant.width > 0 && Number.isInteger(variant.height) && variant.height > 0
        && Number.isInteger(variant.fileSizeBytes) && variant.fileSizeBytes > 0
      const ok = (!correctionTargetModelIds || correctionTargetModelIds.has(item.canonicalModelId))
        && !evidenceKeys.has(key) && exactKeys(item, expectedKeys) && slot?.status === 'succeeded'
        && item.imageHash === attempt?.rawImageHash && item.requestedResolution === slot.imageSize
        && canonicalHash(item.actualOutputPixels) === canonicalHash(expectedPixels)
        && Array.isArray(item.variants) && item.variants.length > 0 && item.variants.length <= 3
        && item.variants.every((variant) => variantValid(variant, item.imageHash))
        && (scientificCase?.kind === 'edit'
          ? item.sourceHash === scientificCase.sourceHash && Array.isArray(item.beforeVariants) && item.beforeVariants.length > 0
            && item.beforeVariants.every((variant) => variantValid(variant, scientificCase.sourceHash))
          : item.sourceHash === undefined && item.beforeVariants === undefined)
      if (!ok) evidenceFailures += 1
      evidenceKeys.add(key)
    }
    const succeededCount = batch.state.slots.filter((slot) => slot.status === 'succeeded'
      && (!correctionTargetModelIds || correctionTargetModelIds.has(slot.canonicalModelId))).length
    addCheck(checks, 'public_evidence_contract', evidenceFailures === 0 && evidenceKeys.size === succeededCount, {
      expectedCount: succeededCount, actualCount: evidenceKeys.size, failureCount: evidenceFailures,
    })

    const mappings = new Map((assignmentA?.assignment?.privateMappings || []).map((mapping) => [mapping.itemHash, mapping]))
    const publicItems = new Map((assignmentA?.assignment?.packages || []).flatMap((packet) => packet.items.map((item) => [item.itemHash, item])))
    const results = new Map(finalReview.results.map((result) => [result.itemHash, result]))
    let coverageFailures = 0
    const reviewSlots = new Set()
    for (const [itemHash, mapping] of mappings) {
      const item = publicItems.get(itemHash)
      const result = results.get(itemHash)
      const key = item && `${mapping.modelKey}\0${item.caseId}`
      const slot = item && batch.state.slots.find((candidate) => candidate.canonicalModelId === mapping.modelKey && candidate.caseId === item.caseId)
      if (!item || !result || mapping.modelKey === undefined || reviewSlots.has(key) || item.imageHash !== slot?.attempts?.at(-1)?.rawImageHash) coverageFailures += 1
      else reviewSlots.add(key)
    }
    addCheck(checks, 'review_coverage', coverageFailures === 0 && reviewSlots.size === succeededCount, {
      expectedCount: succeededCount, actualCount: reviewSlots.size, failureCount: coverageFailures,
    })

    const identityQuery = {
      suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2',
      evaluationEpoch: 'codex-scientific-2026-09-v1', profileStatus: 'published',
    }
    const releaseHeadId = 'benchmark-release-head:pb-scientific-figure-v2:codex_scientific_v2:codex-scientific-2026-09-v1'
    const currentHead = await releaseHeads.findOne({ _id: releaseHeadId })
    const legacyCandidates = currentHead ? [] : await releases.find(identityQuery).sort({ publishedAt: -1 }).limit(2).toArray()
    const competing = currentHead
      ? await releases.findOne({ _id: currentHead.releaseId, releaseHash: currentHead.releaseHash, ...identityQuery })
      : legacyCandidates[0] || null
    const lifecycle = currentHead && competing
      ? await releaseLifecycle.findOne({ releaseId: currentHead.releaseId, releaseHash: currentHead.releaseHash, status: 'active' })
      : null
    const remediation = batch.remediationOf
    const targetSlotIds = remediation?.targetSlotIds
    const remediationMatches = competing ? Boolean(remediation
      && remediation.releaseId === competing._id
      && remediation.releaseHash === competing.releaseHash
      && remediation.batchId === competing.batchId
      && remediation.manifestHash === competing.batchManifestHash
      && Array.isArray(remediation.targetModelIds) && remediation.targetModelIds.length > 0
      && Array.isArray(targetSlotIds) && targetSlotIds.length > 0
      && remediation.targetSlotSetHash === canonicalHash(targetSlotIds)) : !remediation
    const headConsistent = currentHead ? Boolean(competing && lifecycle) : legacyCandidates.length <= 1
    addCheck(checks, 'release_identity_compatible', headConsistent && remediationMatches, {
      currentHeadPresent: Boolean(currentHead),
      lifecycleActive: Boolean(lifecycle),
      competingCount: currentHead ? Number(Boolean(competing)) : legacyCandidates.length,
      remediationMatches,
    })
    if (batch.correctionBaseline && competing) {
      const baselineRelease = await releases.findOne({
        _id: batch.correctionBaseline.releaseId,
        releaseHash: batch.correctionBaseline.releaseHash,
        batchId: batch.correctionBaseline.batchId,
        batchManifestHash: batch.correctionBaseline.manifestHash,
        ...identityQuery,
      })
      const baselineLifecycle = await releaseLifecycle.findOne({
        releaseId: batch.correctionBaseline.releaseId,
        releaseHash: batch.correctionBaseline.releaseHash,
        status: 'superseded',
        supersededByReleaseId: competing._id,
        supersededByReleaseHash: competing.releaseHash,
      })
      const baselineRows = await publicEvidence.find({ sourceReleaseHash: batch.correctionBaseline.releaseHash }).toArray()
      const expectedRows = Array.isArray(baselineRelease?.models)
        ? baselineRelease.models.reduce((count, model) => count + (Array.isArray(model.evidence) ? model.evidence.length : 0), 0) : -1
      const baselineBase = baselineRelease && Object.fromEntries(Object.entries(baselineRelease).filter(([key]) => !['_id', 'releaseHash'].includes(key)))
      const baselineModelIds = Array.isArray(baselineRelease?.models)
        ? baselineRelease.models.map((model) => model.canonicalModelId).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))) : []
      const manifestModelIds = batch.manifest.models.map((model) => model.canonicalModelId)
        .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
      const baselineNonTargets = Array.isArray(baselineRelease?.models)
        ? baselineRelease.models.filter((model) => !correctionTargetModelIds.has(model.canonicalModelId)) : []
      addCheck(checks, 'correction_baseline', Boolean(baselineRelease && baselineLifecycle
        && canonicalHash(baselineBase) === baselineRelease.releaseHash
        && canonicalHash(baselineModelIds) === canonicalHash(manifestModelIds)
        && expectedRows > 0 && baselineRows.length === expectedRows), {
        baselineReleasePresent: Boolean(baselineRelease), baselineLifecyclePresent: Boolean(baselineLifecycle),
        expectedEvidenceCount: expectedRows, actualEvidenceCount: baselineRows.length,
        baselineNonTargetModelCount: baselineNonTargets.length,
        baselineNonTargetProjectionHash: canonicalHash(baselineNonTargets),
      })
    }

    const failed = checks.filter((check) => !check.passed).map((check) => check.stage)
    process.stdout.write(`${JSON.stringify({
      operation: 'diagnose-scientific-v2-publish-input', providerCalls: 0,
      publishInputHash: envelope.publishInputHash, failedStages: failed, checks,
    })}\n`)
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ operation: 'diagnose-scientific-v2-publish-input-failure', providerCalls: 0, code: String(error?.message || 'DIAGNOSTIC_FAILED').slice(0, 128) })}\n`)
  process.exit(1)
})
