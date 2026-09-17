import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalHash } from '@paperbanana/benchmark-core'
import { fixture, submission, secret, publishedAt } from './fixtures/scientific-v2-rereview-fixture.js'
import { resolveScientificV2ReviewOnlyGenerationRelease, type ScientificReviewLineageReader } from '../src/scientific-v2-review-lineage.js'
import { inspectScientificV2Lineage } from '../src/scientific-v2-lineage-inspector.js'

type Row = Record<string, any>
function signedLink(f = fixture()) {
  const reviewerA = f.protocol.validateRereviewSubmission({ session: f.session, role: 'A', submission: submission(f.session, 'A'), secret })
  const reviewerB = f.protocol.validateRereviewSubmission({ session: f.session, role: 'B', submission: submission(f.session, 'B'), secret })
  const final = f.protocol.finalizeRereview({ session: f.session, reviewerA, reviewerB, secret })
  const projection = f.protocol.projectRereviewRelease({ baseline: f.baseline, publicEvidence: f.publicEvidence,
    session: f.session, final, secret, publishedAt, publicationCodeSha: 'f'.repeat(40) })
  const record = { _id: f.session.sessionId, session: f.session, scope: f.scope, providerCalls: 0,
    status: 'published', reviewerA, reviewerB, final, releaseId: projection.release._id, releaseHash: projection.release.releaseHash }
  const lifecycle = { releaseId: f.baseline._id, releaseHash: f.baseline.releaseHash, status: 'superseded',
    supersededByReleaseId: projection.release._id, supersededByReleaseHash: projection.release.releaseHash }
  const data = structuredClone({ source: f.baseline, current: projection.release, sourceRows: f.publicEvidence, currentRows: projection.publicEvidence, record, lifecycle })
  const calls: string[] = []
  const reader: ScientificReviewLineageReader = {
    release: async (id, hash) => { calls.push('release'); return data.source?._id === id && data.source?.releaseHash === hash ? data.source : null },
    review: async (id) => { calls.push('review'); return data.record?._id === id ? data.record : null },
    evidence: async (hash) => { calls.push('evidence'); return hash === data.source.releaseHash ? data.sourceRows : data.currentRows },
    lifecycle: async () => { calls.push('lifecycle'); return data.lifecycle },
  }
  const run = () => resolveScientificV2ReviewOnlyGenerationRelease({ publicationRelease: data.current, reader, secret, protocolForTest: f.protocol })
  return { f, data, reader, calls, run }
}
function rehash(release: Row) {
  const { _id: _id, releaseHash: _hash, ...base } = release
  release.releaseHash = canonicalHash(base)
  release._id = `bench-scientific-v2-release-${release.releaseHash.slice(0, 20)}`
}

test('published rereview resolves its signed original source while retaining current scores and every source record', async () => {
  const f = signedLink(), prior = canonicalHash(f.data)
  const result = await f.run()
  assert.equal(result.reviewOnlyDepth, 1)
  assert.equal(result.generationRelease.releaseHash, f.data.source.releaseHash)
  assert.equal(result.publicationRelease.releaseHash, f.data.current.releaseHash)
  assert.notEqual(result.publicationRelease.reviewFinalHash, result.generationRelease.reviewFinalHash)
  assert.notDeepEqual(result.publicationRelease.models.map((m: Row) => m.scores), result.generationRelease.models.map((m: Row) => m.scores))
  assert.equal(canonicalHash(f.data), prior)
  assert.deepEqual([...new Set(f.calls)].sort(), ['evidence', 'lifecycle', 'release', 'review'])
})

test('ordinary published generation release remains a zero-hop read with no lineage records needed', async () => {
  const f = signedLink()
  const result = await resolveScientificV2ReviewOnlyGenerationRelease({ publicationRelease: f.data.source, reader: f.reader, secret })
  assert.equal(result.reviewOnlyDepth, 0)
  assert.equal(result.generationRelease, result.publicationRelease)
  assert.deepEqual(f.calls, [])
})

test('lineage rejects missing sources, tampered signatures, final results, scope and lifecycle links', async (t) => {
  for (const [name, change] of [
    ['missing source', (d: Row) => { d.source = null }],
    ['unsigned session change', (d: Row) => { d.record.session.assignments.A.items[0].imageHash = '0'.repeat(64) }],
    ['unsigned A result change', (d: Row) => { d.record.reviewerA.results[0].scores[Object.keys(d.record.reviewerA.results[0].scores)[0]] = 1 }],
    ['final change', (d: Row) => { d.record.final.canFinalize = false }],
    ['scope drift', (d: Row) => { d.record.scope.targetModelIds.pop() }],
    ['unpublished review', (d: Row) => { d.record.status = 'review_finalized' }],
    ['generation batch changed', (d: Row) => { d.current.reviewOnly.source.batchId = 'forged-generation'; rehash(d.current) }],
    ['lifecycle absent', (d: Row) => { d.lifecycle = null }],
    ['lifecycle unrelated', (d: Row) => { d.lifecycle.supersededByReleaseHash = '0'.repeat(64) }],
  ] as const) await t.test(name, async () => {
    const f = signedLink(); change(f.data)
    await assert.rejects(f.run, /SCIENTIFIC_V2_REVIEW_ONLY_LINEAGE_/)
  })
})

test('lineage rejects hash-consistent changes to images, preserved scores and public evidence after publication', async (t) => {
  for (const [name, change] of [
    ['image', (d: Row) => { d.current.models.find((m: Row) => m.evidence.some((e: Row) => e.status === 'succeeded')).evidence.find((e: Row) => e.status === 'succeeded').imageHash = '0'.repeat(64) }],
    ['preserved model score', (d: Row) => { d.current.models.find((m: Row) => m.modelId === 'google/nano-banana').overallScore = 1 }],
    ['public image object', (d: Row) => { d.currentRows.find((r: Row) => r.status === 'succeeded').variants[0].objectKey = 'wrong-path' }],
    ['original public evidence', (d: Row) => { d.sourceRows.find((r: Row) => r.status === 'succeeded').reviewNotes = ['新文字不能改写原发布记录中的历史审评依据。'] }],
  ] as const) await t.test(name, async () => {
    const f = signedLink(); change(f.data)
    rehash(f.data.current)
    f.data.record.releaseId = f.data.current._id; f.data.record.releaseHash = f.data.current.releaseHash
    f.data.lifecycle.supersededByReleaseId = f.data.current._id; f.data.lifecycle.supersededByReleaseHash = f.data.current.releaseHash
    await assert.rejects(f.run, /SCIENTIFIC_V2_REVIEW_ONLY_LINEAGE_/)
  })
})

test('malformed self-references are rejected before any lineage traversal can loop', async () => {
  const f = signedLink()
  f.data.current.reviewOnly.source.releaseHash = f.data.current.releaseHash
  f.data.current.reviewOnly.source.releaseId = f.data.current._id
  await assert.rejects(f.run, /SCIENTIFIC_V2_REVIEW_ONLY_LINEAGE_/)
  assert.equal(f.calls.length, 0)
})

test('existing Core inspector rejects missing hash, DB identity or signing key before any connection', async () => {
  for (const env of [{}, { SCIENTIFIC_V2_ACTIVE_RELEASE_HASH: 'a'.repeat(64) },
    { SCIENTIFIC_V2_ACTIVE_RELEASE_HASH: 'bad', PAPERBANANA_BENCH_MONGODB_URI: 'mongodb://127.0.0.1', PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET: secret },
    { SCIENTIFIC_V2_ACTIVE_RELEASE_HASH: 'a'.repeat(64), PAPERBANANA_BENCH_MONGODB_URI: 'mongodb://127.0.0.1', PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET: 'short' }]) {
    await assert.rejects(() => inspectScientificV2Lineage(env), /INSPECTOR_INPUT_INVALID/)
  }
})

test('lineage traversal has a hard 32-hop budget independently of the per-link verifier', async () => {
  const f = fixture()
  const releases = new Map<string, Row>([[f.baseline.releaseHash, f.baseline]])
  const records = new Map<string, Row>(), lifecycles = new Map<string, Row>(), projected = new Map<string, Row>()
  let current = f.baseline
  for (let index = 0; index < 33; index++) {
    const source = { releaseId: current._id, releaseHash: current.releaseHash, batchId: current.batchId, manifestHash: current.batchManifestHash }
    const sessionId = `bounded-review-${index}`, sessionHash = canonicalHash(sessionId), finalHash = canonicalHash(['final', index])
    const scope = { scopeHash: canonicalHash(['scope', index]) }
    const final = { finalHash, reviewerAHash: 'a'.repeat(64), reviewerBHash: 'b'.repeat(64) }
    const next: Row = { ...structuredClone(current), reviewFinalHash: finalHash,
      reviewOnly: { schemaVersion: 1, kind: 'existing_artifact_rereview', providerCalls: 0, sessionId, sessionHash,
        finalHash, reviewerAHash: final.reviewerAHash, reviewerBHash: final.reviewerBHash, source, scopeHash: scope.scopeHash } }
    rehash(next)
    records.set(sessionId, { _id: sessionId, status: 'published', providerCalls: 0, releaseId: next._id, releaseHash: next.releaseHash,
      session: { sessionId, sessionHash, baseline: source, scope }, scope, final })
    lifecycles.set(current.releaseHash, { releaseId: current._id, releaseHash: current.releaseHash, status: 'superseded',
      supersededByReleaseId: next._id, supersededByReleaseHash: next.releaseHash })
    projected.set(sessionHash, next); releases.set(next.releaseHash, next); current = next
  }
  let verified = 0
  // Signature and preservation rejection are tested above with the real protocol.
  // This isolated verifier double makes only the traversal bound observable.
  const protocolForTest = {
    finalizeRereview: ({ session }: Row) => { verified += 1; return records.get(session.sessionId)!.final },
    projectRereviewRelease: ({ session }: Row) => ({ release: projected.get(session.sessionHash)!, publicEvidence: [] }),
  }
  await assert.rejects(() => resolveScientificV2ReviewOnlyGenerationRelease({ publicationRelease: current, secret, protocolForTest,
    reader: { release: async (_id, hash) => releases.get(hash) || null, review: async id => records.get(id) || null,
      lifecycle: async (_id, hash) => lifecycles.get(hash) || null, evidence: async () => [] } }), /DEPTH_EXCEEDED/)
  assert.equal(verified, 32)
})
