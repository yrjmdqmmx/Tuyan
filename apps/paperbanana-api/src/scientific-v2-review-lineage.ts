import { canonicalHash, PB_SCIENTIFIC_FIGURE_V2, SCIENTIFIC_BENCHMARK_IDENTITY } from '@paperbanana/benchmark-core'
import * as reviewProtocol from './scientific-v2-rereview.js'

type Row = Record<string, any>
export type ScientificReviewLineageReader = {
  release: (id: string, hash: string) => Promise<Row | null>
  review: (sessionId: string) => Promise<Row | null>
  evidence: (releaseHash: string) => Promise<Row[]>
  lifecycle: (id: string, hash: string) => Promise<Row | null>
}
const limit = 32
const hashPattern = /^[a-f0-9]{64}$/
function fail(code = 'INVALID'): never { throw new Error(`SCIENTIFIC_V2_REVIEW_ONLY_LINEAGE_${code}`) }
const same = (a: unknown, b: unknown) => canonicalHash(a) === canonicalHash(b)
const ordered = (rows: Row[]) => [...rows].sort((a, b) => Buffer.compare(Buffer.from(`${a.canonicalModelId}\0${a.caseId}`), Buffer.from(`${b.canonicalModelId}\0${b.caseId}`)))
function assertRelease(release: Row) {
  const { _id, releaseHash, ...base } = release
  if (typeof _id !== 'string' || !hashPattern.test(String(releaseHash)) || canonicalHash(base) !== releaseHash
    || release.profileStatus !== 'published' || release.suiteHash !== PB_SCIENTIFIC_FIGURE_V2.manifestHash
    || Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY).some(([key, value]) => release[key] !== value)) fail()
}

/** Pure reads only. The active publication stays separate from its immutable generation provenance. */
export async function resolveScientificV2ReviewOnlyGenerationRelease(input: {
  publicationRelease: Row
  reader: ScientificReviewLineageReader
  secret: string
  protocolForTest?: Pick<ReturnType<typeof reviewProtocol.createRereviewProtocol>, 'finalizeRereview' | 'projectRereviewRelease'>
}) {
  const protocol = input.protocolForTest || reviewProtocol
  const publicationRelease = input.publicationRelease
  let generationRelease = publicationRelease
  const seen = new Set<string>()
  let reviewOnlyDepth = 0
  while (true) {
    if (!generationRelease || seen.has(generationRelease.releaseHash)) fail('CYCLE')
    seen.add(generationRelease.releaseHash)
    assertRelease(generationRelease)
    if (!Object.hasOwn(generationRelease, 'reviewOnly')) break
    if (reviewOnlyDepth >= limit) fail('DEPTH_EXCEEDED')
    const link = generationRelease.reviewOnly
    if (!link || typeof link !== 'object' || link.schemaVersion !== 1 || link.kind !== 'existing_artifact_rereview'
      || link.providerCalls !== 0 || typeof link.sessionId !== 'string' || !link.source
      || !same(Object.keys(link.source).sort(), ['batchId', 'manifestHash', 'releaseHash', 'releaseId'])
      || !hashPattern.test(String(link.source.releaseHash)) || !hashPattern.test(String(link.source.manifestHash))
      || link.source.batchId !== generationRelease.batchId || link.source.manifestHash !== generationRelease.batchManifestHash
      || link.finalHash !== generationRelease.reviewFinalHash) fail()
    if (seen.has(link.source.releaseHash)) fail('CYCLE')
    const source = await input.reader.release(link.source.releaseId, link.source.releaseHash)
    if (!source) fail('SOURCE_MISSING')
    assertRelease(source)
    if (source._id !== link.source.releaseId || source.releaseHash !== link.source.releaseHash
      || source.batchId !== link.source.batchId || source.batchManifestHash !== link.source.manifestHash) fail()
    const lifecycle = await input.reader.lifecycle(source._id, source.releaseHash)
    if (!lifecycle || lifecycle.status !== 'superseded' || lifecycle.releaseId !== source._id || lifecycle.releaseHash !== source.releaseHash
      || lifecycle.supersededByReleaseId !== generationRelease._id || lifecycle.supersededByReleaseHash !== generationRelease.releaseHash) fail('LIFECYCLE_INVALID')
    const record = await input.reader.review(link.sessionId)
    if (!record || record._id !== link.sessionId || record.status !== 'published' || record.providerCalls !== 0
      || record.releaseId !== generationRelease._id || record.releaseHash !== generationRelease.releaseHash
      || record.session?.sessionId !== link.sessionId || record.session?.sessionHash !== link.sessionHash
      || !same(record.session?.baseline, link.source) || record.session?.scope?.scopeHash !== link.scopeHash
      || !same(record.scope, record.session.scope) || record.final?.finalHash !== link.finalHash
      || record.final?.reviewerAHash !== link.reviewerAHash || record.final?.reviewerBHash !== link.reviewerBHash) fail('REVIEW_INVALID')
    const sourceEvidence = await input.reader.evidence(source.releaseHash)
    const currentEvidence = await input.reader.evidence(generationRelease.releaseHash)
    try {
      // Reuse the exact original signed protocol. Never re-sign or alter the stored session.
      const final = protocol.finalizeRereview({ session: record.session, reviewerA: record.reviewerA, reviewerB: record.reviewerB,
        ...(record.arbitration ? { arbitration: record.arbitration } : {}), secret: input.secret })
      if (!same(final, record.final)) fail('REVIEW_INVALID')
      const projected = protocol.projectRereviewRelease({ baseline: source, publicEvidence: sourceEvidence,
        session: record.session, final, secret: input.secret,
        publishedAt: generationRelease.publishedAt instanceof Date ? generationRelease.publishedAt.toISOString() : generationRelease.publishedAt,
        publicationCodeSha: generationRelease.publicationCodeSha })
      if (!same(projected.release, generationRelease) || !same(ordered(projected.publicEvidence), ordered(currentEvidence))) fail('PRESERVATION_INVALID')
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('SCIENTIFIC_V2_REVIEW_ONLY_LINEAGE_')) throw error
      fail('ATTESTATION_INVALID')
    }
    generationRelease = source
    reviewOnlyDepth += 1
  }
  return { publicationRelease, generationRelease, reviewOnlyDepth }
}
