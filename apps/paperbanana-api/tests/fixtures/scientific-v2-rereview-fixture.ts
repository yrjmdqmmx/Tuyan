import {
  canonicalHash, PB_SCIENTIFIC_FIGURE_V2, SCIENTIFIC_BENCHMARK_IDENTITY,
  SCIENTIFIC_BENCHMARK_AXES, aggregateScientificFixedSlots, rankScientificModels,
} from '@paperbanana/benchmark-core'
import { SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE, createRereviewProtocol } from '../../src/scientific-v2-rereview.js'

type Row = Record<string, any>
export const secret = 'fixture-review-only-signing-key-with-32-bytes'
export const issuedAt = '2026-09-17T03:00:00.000Z'
export const publishedAt = '2026-09-17T04:00:00.000Z'

export function fixture() {
  const ids = [...SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE.targetModelIds, ...SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE.preservedModelIds]
  const privateRows: Row[] = []
  const models: Row[] = ids.map((id, modelIndex) => {
    const evidence = PB_SCIENTIFIC_FIGURE_V2.cases.map((problem, caseIndex) => {
      const position = modelIndex * 9 + caseIndex
      const status = position < 14 ? 'failed' : position < 17 ? 'unsupported' : 'succeeded'
      const common = { caseId: problem.id, kind: problem.kind, status, requestedResolution: '2K',
        attemptSummary: { count: status === 'unsupported' ? 0 : 1, responseClasses: [status === 'failed' ? 'confirmed_provider_failure' : status] },
        cost: { currency: 'USD', amount: '0.1', basis: 'invoice_reconciled', receipt: `receipt-${position}` } }
      if (status !== 'succeeded') return { ...common, failureReason: `retained-${position}` }
      const imageHash = canonicalHash([id, problem.id])
      const variant = { kind: 'full', imageHash: canonicalHash(['public', id, problem.id]), width: 1024, height: 576, fileSizeBytes: 1234, mimeType: 'image/webp' }
      return { ...common, imageHash, actualOutputPixels: { width: 1024, height: 576 },
        ...(problem.kind === 'edit' ? { sourceHash: problem.sourceHash, editedHash: imageHash, region: problem.region,
          beforeVariants: [{ ...variant, imageHash: canonicalHash(['source', problem.sourceHash]) }] } : {}),
        variants: [variant], scores: Object.fromEntries(problem.applicableAxes.map(axis => [axis, 6])),
        reviewNotes: [`原有图示中第${position}个样本的节点与文字记录保持在历史版本中。`] }
    })
    const aggregation = aggregateScientificFixedSlots(evidence.map((e: Row) => ({ caseId: e.caseId, status: e.status, ...(e.scores ? { scores: e.scores } : {}) })))
    const scores = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map(axis => [axis, aggregation.byAxis[axis].mean]))
    return { profileId: `${id}:fixture`, modelId: id, canonicalModelId: id, displayName: `Model ${modelIndex}`, developer: `Developer ${modelIndex}`,
      profileStatus: 'published', ranked: true, scores, dimensions: structuredClone(aggregation.byAxis), evidence,
      generationSuccessRate: evidence.slice(0, 6).filter(e => e.status === 'succeeded').length / 6,
      editSuccessRate: evidence.slice(6).filter(e => e.status === 'succeeded').length / 3,
      successRate: evidence.filter(e => e.status === 'succeeded').length / 9,
      attemptSummary: { total: evidence.reduce((sum, e) => sum + e.attemptSummary.count, 0) },
      failureReasons: evidence.filter(e => e.status !== 'succeeded').map(e => e.caseId),
      costSummary: { total: '0.9', currency: 'USD' } }
  })
  const ranks = new Map(rankScientificModels(models.map(m => ({ modelId: m.modelId, scores: m.scores }))).map(m => [m.modelId, m]))
  for (const model of models) {
    model.overallScore = ranks.get(model.modelId)!.overallScore
    model.overallRank = ranks.get(model.modelId)!.overallRank
    model.dimensionRanks = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map(axis => [axis, 1 + models.filter(m => m.scores[axis] > model.scores[axis]).length]))
  }
  const base = { ...SCIENTIFIC_BENCHMARK_IDENTITY, profileStatus: 'published', suiteHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    batchId: 'original-generation-batch', batchManifestHash: 'a'.repeat(64), manifestCodeSha: 'b'.repeat(40), executionCodeSha: 'b'.repeat(40),
    publicationCodeSha: 'c'.repeat(40), priceHash: 'd'.repeat(64), reviewFinalHash: 'e'.repeat(64),
    models, sampleCount: 406, publishedAt: issuedAt, methodology: { preserved: 'original generation and scoring protocol' } }
  const releaseHash = canonicalHash(base)
  const baseline: Row = { _id: `bench-scientific-v2-release-${releaseHash.slice(0, 20)}`, ...base, releaseHash }
  for (const model of models) for (const evidence of model.evidence) {
    privateRows.push({ _id: `row-${model.modelId}-${evidence.caseId}`, sourceReleaseHash: releaseHash, profileId: model.profileId,
      canonicalModelId: model.canonicalModelId, overallRank: model.overallRank, ...structuredClone(evidence),
      ...(evidence.variants ? { variants: evidence.variants.map((v: Row) => ({ ...v, objectKey: `bench/scientific-v2/public/${evidence.imageHash}/${v.kind}.webp` })) } : {}),
      ...(evidence.beforeVariants ? { beforeVariants: evidence.beforeVariants.map((v: Row) => ({ ...v, objectKey: `bench/scientific-v2/public/${evidence.sourceHash}/${v.kind}.webp` })) } : {}),
      createdAt: new Date(issuedAt) })
  }
  const scope: Row = { ...structuredClone(SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE), baselineReleaseId: baseline._id, baselineReleaseHash: releaseHash }
  const protocol = createRereviewProtocol(scope)
  const args = { baseline, publicEvidence: privateRows, scope, secret, issuedAt, sessionId: 'rereview-test-session' }
  const session: Row = protocol.createRereviewSession(args)
  return { ...args, protocol, session }
}
export function submission(session: Row, role: 'A' | 'B', value = 7): Row {
  const assignment = session.assignments[role]
  const shards: Row[] = []
  for (let start = 0; start < assignment.items.length; start += 24) {
    const group = assignment.items.slice(start, start + 24)
    shards.push({ reviewer: { model: 'gpt-6-astra', reasoningEffort: 'xhigh', agentId: `${role}-agent-${start}`, contextId: `${role}-context-${start}` },
      results: group.map((item: Row, index: number) => ({ itemHash: item.itemHash, blindLabel: item.blindLabel,
        scores: Object.fromEntries(item.applicableAxes.map((axis: string) => [axis, value])), redLines: [], lowConfidence: false,
        rationale: `第${start + index + 1}幅${role === 'A' ? '图中上方标题清晰，左侧节点的箭头与下方分支连接可辨，局部字号偏小。' : '图的节点边框与两级文字排列清楚，中部连线交叉处留白不足，图例色块可区分。'}`,
        viewedImageHashes: [...new Set([item.imageHash, ...(item.kind === 'edit' ? [item.sourceHash] : [])])] })) })
  }
  return { sessionHash: session.sessionHash, assignmentHash: assignment.assignmentHash, role, shards }
}
