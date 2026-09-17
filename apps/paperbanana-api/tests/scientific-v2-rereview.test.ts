import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalHash, PB_SCIENTIFIC_FIGURE_V2, SCIENTIFIC_BENCHMARK_IDENTITY,
  SCIENTIFIC_BENCHMARK_AXES, aggregateScientificFixedSlots, rankScientificModels,
} from '@paperbanana/benchmark-core'
import {
  SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE, createRereviewProtocol, createRereviewSession,
} from '../src/scientific-v2-rereview.js'

type Row = Record<string, any>
import { fixture, submission, secret, issuedAt, publishedAt } from './fixtures/scientific-v2-rereview-fixture.js'

function reviews(f: ReturnType<typeof fixture>, a = submission(f.session, 'A'), b = submission(f.session, 'B')) {
  return { reviewerA: f.protocol.validateRereviewSubmission({ session: f.session, role: 'A', submission: a, secret }),
    reviewerB: f.protocol.validateRereviewSubmission({ session: f.session, role: 'B', submission: b, secret }) }
}
function projection(f: ReturnType<typeof fixture>, final: Row) {
  return f.protocol.projectRereviewRelease({ baseline: f.baseline, publicEvidence: f.publicEvidence, session: f.session, final,
    secret, publishedAt, publicationCodeSha: 'f'.repeat(40) })
}

test('frozen production scope rejects synthetic release, roster changes, and replaced Codex model', () => {
  const f = fixture()
  assert.throws(() => createRereviewSession(f), /SCHEMA_INVALID/)
  assert.throws(() => createRereviewSession({ baseline: f.baseline, publicEvidence: f.publicEvidence, scope: f.scope, secret, issuedAt, sessionId: 'synthetic' }), /SCOPE_INVALID/)
  const scope = structuredClone(f.scope)
  scope.targetModelIds[0] = 'codex:gpt-image-2'
  assert.throws(() => createRereviewProtocol(scope), /SCOPE_INVALID/)
  const baseline = structuredClone(f.baseline)
  baseline.models[0].canonicalModelId = 'codex:gpt-image-2'
  assert.throws(() => f.protocol.createRereviewSession({ baseline, publicEvidence: f.publicEvidence, scope: f.scope, secret, issuedAt, sessionId: 'invalid' }), /BASELINE_INVALID/)
})

test('343 successful target images enter anonymous A/B assignments; edits retain source and cases', () => {
  const f = fixture()
  assert.equal(f.session.assignments.A.items.length, 343)
  assert.equal(f.session.assignments.B.items.length, 343)
  const a = f.protocol.getPublicAssignment({ session: f.session, role: 'A', secret })
  assert.equal(a.sessionHash, f.session.sessionHash)
  assert.notDeepEqual(a.items.map((i: Row) => i.itemHash), f.session.assignments.B.items.map((i: Row) => i.itemHash))
  assert.doesNotMatch(JSON.stringify(a), /canonicalModelId|privateMappings|cost|price|reviewNotes|developer|displayName/)
  for (const id of f.scope.targetModelIds) assert.ok(!JSON.stringify(a).includes(id))
  for (const item of a.items) {
    const problem = PB_SCIENTIFIC_FIGURE_V2.cases.find(c => c.id === item.caseId)!
    assert.equal(item.instruction, problem.instruction)
    assert.deepEqual(item.rubric, problem.rubric)
    assert.deepEqual(item.applicableAxes, problem.applicableAxes)
    if (problem.kind === 'edit') assert.equal(item.sourceHash, problem.sourceHash)
  }
  const tampered = structuredClone(f.session)
  tampered.assignments.A.items[0].imageHash = '0'.repeat(64)
  assert.throws(() => f.protocol.getPublicAssignment({ session: tampered, role: 'A', secret }), /ATTESTATION_INVALID/)
})

test('public evidence drift, source path tampering and duplicate slot are rejected', () => {
  const f = fixture()
  const args = { baseline: f.baseline, publicEvidence: structuredClone(f.publicEvidence), scope: f.scope, secret, issuedAt, sessionId: 'drift-test' }
  args.publicEvidence.find((r: Row) => r.status === 'succeeded')!.variants[0].objectKey = 'wrong-location'
  assert.throws(() => f.protocol.createRereviewSession(args), /PUBLIC_EVIDENCE_INVALID/)
  args.publicEvidence = structuredClone(f.publicEvidence)
  args.publicEvidence[0] = args.publicEvidence[1]
  assert.throws(() => f.protocol.createRereviewSession(args), /PUBLIC_EVIDENCE_INVALID/)
})

test('submissions require exact successful coverage, axes, scores and actual image-view declarations', () => {
  const f = fixture()
  const reject = (change: (s: Row) => void, pattern: RegExp) => {
    const s = submission(f.session, 'A'); change(s)
    assert.throws(() => f.protocol.validateRereviewSubmission({ session: f.session, role: 'A', submission: s, secret }), pattern)
  }
  reject(s => { s.shards[0].results.pop() }, /RESULT_SET_INVALID/)
  reject(s => { s.shards[0].results[0].scores.extra_axis = 8 }, /SCORE_INVALID/)
  reject(s => { s.shards[0].results[0].scores[Object.keys(s.shards[0].results[0].scores)[0]] = 10.1 }, /SCORE_INVALID/)
  reject(s => { s.shards[0].reviewer.reasoningEffort = 'high' }, /REVIEWER_INVALID/)
  reject(s => { s.role = 'B' }, /ASSIGNMENT_MISMATCH/)
  reject(s => { s.shards[0].results[0].rationale = '整体表现良好且完全没有发现明显错误' }, /RATIONALE_INVALID/)
  reject(s => { s.shards[0].results[1].rationale = s.shards[0].results[0].rationale }, /RATIONALE_INVALID/)
  reject(s => { s.shards.flatMap((p: Row) => p.results).find((r: Row) => r.viewedImageHashes.length === 2).viewedImageHashes.pop() }, /IMAGE_NOT_VIEWED/)
  reject(s => { s.shards[0].results[0].redLines = ['fabricated_code'] }, /RED_LINE_INVALID/)
})

test('sharded A/B independence and signed result tampering are enforced', () => {
  const f = fixture(), a = submission(f.session, 'A'), b = submission(f.session, 'B')
  b.shards[0].reviewer.contextId = a.shards[0].reviewer.contextId
  const paired = reviews(f, a, b)
  assert.throws(() => f.protocol.finalizeRereview({ session: f.session, ...paired, secret }), /REVIEWER_NOT_INDEPENDENT/)
  const good = reviews(f)
  const mutated: Row = structuredClone(good.reviewerA)
  mutated.results[0].scores[Object.keys(mutated.results[0].scores)[0]] = 0
  assert.throws(() => f.protocol.finalizeRereview({ session: f.session, reviewerA: mutated, reviewerB: good.reviewerB, secret }), /ATTESTATION_INVALID/)
})

test('publication preserves seven models, raw evidence, costs and failures while recalculating fixed-slot means', () => {
  const f = fixture(), originalHash = canonicalHash({ baseline: f.baseline, publicEvidence: f.publicEvidence })
  const final: Row = f.protocol.finalizeRereview({ session: f.session, ...reviews(f), secret })
  assert.equal(final.canFinalize, true)
  assert.equal(final.disputes.length, 0)
  const projected = projection(f, final)
  assert.equal(projected.release.models.length, 47)
  assert.equal(projected.release.sampleCount, 406)
  assert.equal(projected.release.batchId, f.baseline.batchId)
  assert.equal(projected.release.batchManifestHash, f.baseline.batchManifestHash)
  assert.equal(projected.release.executionCodeSha, f.baseline.executionCodeSha)
  assert.equal(projected.release.reviewOnly.source.releaseHash, f.baseline.releaseHash)
  assert.equal(projected.publicEvidence.length, 423)
  for (const old of f.baseline.models) {
    const current = projected.release.models.find((m: Row) => m.modelId === old.modelId)!
    if (f.scope.preservedModelIds.includes(old.modelId)) {
      const { overallRank: _a, dimensionRanks: _b, ...oldRest } = old
      const { overallRank: _c, dimensionRanks: _d, ...newRest } = current
      assert.deepEqual(newRest, oldRest)
    }
    for (const oldEvidence of old.evidence) {
      const evidence = current.evidence.find((e: Row) => e.caseId === oldEvidence.caseId)
      assert.deepEqual(evidence.cost, oldEvidence.cost)
      if (oldEvidence.status !== 'succeeded') assert.deepEqual(evidence, oldEvidence)
      else {
        const { scores: _s1, reviewNotes: _r1, ...oldGeneration } = oldEvidence
        const { scores: _s2, reviewNotes: _r2, ...generation } = evidence
        assert.deepEqual(generation, oldGeneration)
      }
    }
  }
  const allFailed = projected.release.models.find((m: Row) => m.modelId === f.scope.targetModelIds[0])!
  assert.equal(allFailed.overallScore, 0)
  const partial = projected.release.models.find((m: Row) => m.modelId === f.scope.targetModelIds[1])!
  assert.ok(partial.overallScore < 7)
  assert.ok(Object.values(partial.dimensions).some((a: any) => a.zeroedSlots > 0))
  assert.equal(canonicalHash({ baseline: f.baseline, publicEvidence: f.publicEvidence }), originalHash)
  const { _id, releaseHash, ...base } = projected.release
  assert.equal(canonicalHash(base), releaseHash)
})

test('formal score gap, red-line and low-confidence rules require exact independent xhigh arbitration', () => {
  const f = fixture(), a = submission(f.session, 'A'), b = submission(f.session, 'B')
  const aResults = a.shards.flatMap((s: Row) => s.results), bResults = b.shards.flatMap((s: Row) => s.results)
  const affected = aResults.slice(0, 3)
  const peer = bResults.find((r: Row) => r.itemHash === affected[0].itemHash)!
  peer.scores[Object.keys(peer.scores)[0]] = 10 // >2 => arbitration
  affected[1].redLines = ['text_symbol_error']
  affected[2].lowConfidence = true
  const paired = reviews(f, a, b)
  const pending: Row = f.protocol.finalizeRereview({ session: f.session, ...paired, secret })
  assert.equal(pending.canFinalize, false)
  assert.equal(pending.disputes.length, 3)
  assert.throws(() => projection(f, pending), /FINAL_INCOMPLETE/)
  const assignment = f.protocol.getDisputeAssignment({ session: f.session, final: pending, secret })
  assert.equal(assignment.items.length, 3)
  assert.doesNotMatch(JSON.stringify(assignment), /rationales|redLines|lowConfidence|scores|canonicalModelId|privateMappings/)
  const arbitration: Row = { sessionHash: f.session.sessionHash, reviewerAHash: paired.reviewerA.resultHash, reviewerBHash: paired.reviewerB.resultHash,
    shards: [{ reviewer: { model: 'gpt-6-astra', reasoningEffort: 'xhigh', agentId: 'third-agent', contextId: 'third-fresh-context' },
      results: assignment.items.map((item: Row, index: number) => ({ itemHash: item.itemHash,
        scores: Object.fromEntries(item.applicableAxes.map((axis: string) => [axis, 5])), redLines: ['readability_issue'],
        rationale: `第${index + 1}幅图右下角的小字号标签和穿过边框的连接线降低可读性，中央结构方向仍可辨认。`,
        viewedImageHashes: [...new Set([item.imageHash, ...(item.kind === 'edit' ? [item.sourceHash] : [])])] })) }] }
  const incomplete = structuredClone(arbitration); incomplete.shards[0].results.pop()
  assert.throws(() => f.protocol.finalizeRereview({ session: f.session, ...paired, arbitration: incomplete, secret }), /ARBITRATION_SET_INVALID/)
  const reused = structuredClone(arbitration)
  const firstAffected = paired.reviewerA.results.find((r: Row) => r.itemHash === arbitration.shards[0].results[0].itemHash)!
  reused.shards[0].reviewer = firstAffected.reviewer
  assert.throws(() => f.protocol.finalizeRereview({ session: f.session, ...paired, arbitration: reused, secret }), /REVIEWER_NOT_INDEPENDENT/)
  const final: Row = f.protocol.finalizeRereview({ session: f.session, ...paired, arbitration, secret })
  assert.equal(final.canFinalize, true)
  assert.equal(final.results.filter((r: Row) => r.resolution === 'xhigh_arbitration').length, 3)
  assert.ok(final.results.filter((r: Row) => r.resolution === 'xhigh_arbitration').every((r: Row) => Object.values(r.scores).every(v => v === 5)))
  assert.equal(projection(f, final).release.models.length, 47)
})

test('a score gap of exactly two is averaged without arbitration', () => {
  const f = fixture()
  const final: Row = f.protocol.finalizeRereview({ session: f.session,
    ...reviews(f, submission(f.session, 'A', 6), submission(f.session, 'B', 8)), secret })
  assert.equal(final.canFinalize, true)
  assert.equal(final.disputes.length, 0)
  assert.ok(final.results.every((r: Row) => r.resolution === 'ab_mean' && Object.values(r.scores).every(value => value === 7)))
})

test('final draft tampering and missing publication provenance fail closed', () => {
  const f = fixture()
  const final: Row = f.protocol.finalizeRereview({ session: f.session, ...reviews(f), secret })
  const changed = structuredClone(final)
  changed.results[0].rationales = ['图中所有标签均被替换为新的描述，伪造的审评意见不得通过。']
  assert.throws(() => projection(f, changed), /ATTESTATION_INVALID/)
  assert.throws(() => f.protocol.projectRereviewRelease({ baseline: f.baseline, publicEvidence: f.publicEvidence,
    session: f.session, final, secret, publishedAt, publicationCodeSha: '' }), /CODE_SHA_INVALID/)
  const projected = projection(f, final)
  assert.equal(projected.release.methodology.publicationCodeSha, projected.release.publicationCodeSha)
  assert.equal(projected.release.reviewOnly.providerCalls, 0)
})
