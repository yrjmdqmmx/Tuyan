import type { Db } from 'mongodb'
import { canonicalHash } from '@paperbanana/benchmark-core'
import { SCIENTIFIC_V2_COLLECTIONS, SCIENTIFIC_V2_RELEASE_HEAD_ID } from './scientific-v2-repository.js'
import * as rereviewProtocol from './scientific-v2-rereview.js'

type Row = Record<string, any>
const fail = (code: string): never => { throw new Error(`SCIENTIFIC_V2_REREVIEW_${code}`) }
const exact = (value: Row, keys: string[]) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || canonicalHash(Object.keys(value).sort()) !== canonicalHash([...keys].sort())) fail('INPUT_INVALID')
}

/** Review-only records deliberately live outside worker batches and dispatch ledgers. */
export function createScientificRereviewRepository(db: Db, options: {
  secret: () => string; codeSha: string; now: () => Date;
  verifyObject: (key: string, hash: string) => Promise<void>;
  protocolForTest?: ReturnType<typeof rereviewProtocol.createRereviewProtocol>;
}) {
  const { createRereviewSession, validateRereviewSubmission, finalizeRereview, projectRereviewRelease, getPublicAssignment, getDisputeAssignment } = options.protocolForTest || rereviewProtocol
  const sessions = db.collection<Row>('paperbanana_benchmark_scientific_v2_rereviews')
  const releases = db.collection<Row>('paperbanana_benchmark_releases')
  const rows = db.collection<Row>(SCIENTIFIC_V2_COLLECTIONS.publicEvidence)
  const heads = db.collection<Row>(SCIENTIFIC_V2_COLLECTIONS.releaseHeads)
  const lifecycles = db.collection<Row>(SCIENTIFIC_V2_COLLECTIONS.releaseLifecycle)
  const batches = db.collection<Row>(SCIENTIFIC_V2_COLLECTIONS.batches)
  const loadBaseline = async (hash: string, mongoSession?: any) => {
    const opts = mongoSession ? { session: mongoSession } : {}
    const head = await heads.findOne({ _id: SCIENTIFIC_V2_RELEASE_HEAD_ID } as any, opts)
    const baseline = await releases.findOne({ releaseHash: hash, profileStatus: 'published' }, opts)
    if (!baseline || head?.releaseHash !== hash || head?.releaseId !== baseline._id
      || !await lifecycles.findOne({ releaseId: baseline._id, releaseHash: hash, status: 'active' }, opts)) fail('BASELINE_NOT_ACTIVE')
    const { _id, releaseHash, ...base } = baseline!
    if (canonicalHash(base) !== releaseHash) fail('BASELINE_HASH_INVALID')
    const publicEvidence = await rows.find({ sourceReleaseHash: hash }, opts).sort({ canonicalModelId: 1, caseId: 1 }).toArray()
    return { baseline: baseline!, publicEvidence, head: head! }
  }
  const originalBindings = async (session: Row) => {
    const items: Row[] = session.assignments.A.items
    const hashes = [...new Set(items.map(item => item.imageHash))]
    const matches = await batches.find({ 'state.slots.attempts.rawImageHash': { $in: hashes } }, { projection: { state: 1 } }).toArray()
    const bindings = new Map<string, string>()
    for (const batch of matches) for (const slot of batch.state?.slots || []) for (const attempt of slot.attempts || []) {
      if (!hashes.includes(attempt.rawImageHash)) continue
      if (!['png', 'webp', 'jpeg'].includes(attempt.format)) fail('OBJECT_FORMAT_INVALID')
      const key = `bench/scientific-v2/private/objects/${attempt.rawImageHash}.${attempt.format}`
      if (bindings.has(attempt.rawImageHash) && bindings.get(attempt.rawImageHash) !== key) fail('OBJECT_BINDING_CONFLICT')
      bindings.set(attempt.rawImageHash, key)
    }
    for (const item of items) if (item.sourceHash) bindings.set(item.sourceHash, `bench/scientific-v2/private/objects/${item.sourceHash}.png`)
    if (hashes.some(hash => !bindings.has(hash))) fail('ORIGINAL_OBJECT_MISSING')
    const entries = [...bindings]; let nextIndex = 0
    await Promise.all(Array.from({ length: Math.min(8, entries.length) }, async () => {
      while (nextIndex < entries.length) { const [hash, key] = entries[nextIndex++]; await options.verifyObject(key, hash) }
    }))
    return [...bindings].sort(([a], [b]) => a.localeCompare(b)).map(([imageHash, objectKey]) => ({ imageHash, objectKey }))
  }
  return {
    async control(input: { reviewCommand: string; sessionId: string; payload: Row }) {
      exact(input, ['reviewCommand', 'sessionId', 'payload'])
      const { reviewCommand, sessionId, payload } = input
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,199}$/.test(sessionId)
        || !['freeze', 'export', 'import', 'arbitrate', 'inspect', 'publish'].includes(reviewCommand)) fail('INPUT_INVALID')
      const secret = options.secret()
      let doc = await sessions.findOne({ _id: sessionId } as any)
      const summary = (status: string, rest: Row = {}) => ({ sessionId, reviewCommand, status, providerCalls: 0, ...rest })
      if (reviewCommand === 'freeze') {
        exact(payload, ['scope'])
        if (doc) {
          if (canonicalHash(doc.scope) !== canonicalHash(payload.scope)) fail('SESSION_CONFLICT')
          return summary(doc.status, { sessionHash: doc.session.sessionHash, replayed: true })
        }
        const { baseline, publicEvidence } = await loadBaseline(payload.scope.baselineReleaseHash)
        const session = createRereviewSession({ baseline, publicEvidence, scope: payload.scope, secret, issuedAt: options.now().toISOString(), sessionId })
        const objectBindings = await originalBindings(session)
        const record = { _id: sessionId, session, scope: payload.scope, objectBindings,
          baselineRowsHash: canonicalHash(publicEvidence), status: 'review_ready', revision: 0,
          createdAt: options.now(), codeSha: options.codeSha, providerCalls: 0 }
        const tx = db.client.startSession()
        try { await tx.withTransaction(async () => {
          const fresh = await loadBaseline(payload.scope.baselineReleaseHash, tx)
          if (canonicalHash(fresh.publicEvidence) !== record.baselineRowsHash) fail('BASELINE_DRIFT')
          await sessions.insertOne(record as any, { session: tx })
        }) } finally { await tx.endSession() }
        return summary('review_ready', { sessionHash: session.sessionHash, itemCount: session.assignments.A.items.length })
      }
      if (!doc) fail('SESSION_NOT_FOUND')
      doc = doc!
      if (reviewCommand === 'export') {
        exact(payload, ['role'])
        if (!['A', 'B'].includes(payload.role)) fail('ROLE_INVALID')
        const assignment = getPublicAssignment({ session: doc.session, role: payload.role, secret })
        return summary(doc.status, { sessionHash: doc.session.sessionHash, assignment, _objectBindings: doc.objectBindings })
      }
      if (reviewCommand === 'inspect') {
        exact(payload, [])
        return summary(doc.status, { sessionHash: doc.session.sessionHash, revision: doc.revision,
          reviewerAImported: Boolean(doc.reviewerA), reviewerBImported: Boolean(doc.reviewerB),
          disputeCount: doc.final?.disputes?.length || 0, finalHash: doc.final?.finalHash || null,
          releaseId: doc.releaseId || null, releaseHash: doc.releaseHash || null,
          ...(doc.final?.disputes?.length ? { disputes: doc.final.disputes,
            assignment: { ...getDisputeAssignment({ session: doc.session, final: doc.final, secret }), role: 'ARBITRATION' },
            _objectBindings: doc.objectBindings } : {}) })
      }
      if (reviewCommand === 'import' || reviewCommand === 'arbitrate') {
        exact(payload, reviewCommand === 'import' ? ['role', 'submission'] : ['submission'])
        if (doc.status === 'published') fail('LATE_IMPORT_REJECTED')
        const patch: Row = {}
        if (reviewCommand === 'import') {
          if (!['A', 'B'].includes(payload.role)) fail('ROLE_INVALID')
          const result = validateRereviewSubmission({ session: doc.session, role: payload.role, submission: payload.submission, secret })
          const key = payload.role === 'A' ? 'reviewerA' : 'reviewerB'
          if (doc[key]) {
            if (canonicalHash(doc[key]) !== canonicalHash(result)) fail('REVIEW_CONFLICT')
            return summary(doc.status, { replayed: true, finalHash: doc.final?.finalHash || null })
          }
          patch[key] = result
        } else {
          if (doc.arbitration && canonicalHash(doc.arbitration) === canonicalHash(payload.submission)) {
            return summary(doc.status, { replayed: true, finalHash: doc.final?.finalHash || null })
          }
          if (!doc.reviewerA || !doc.reviewerB || doc.final?.canFinalize) fail('ARBITRATION_NOT_REQUIRED')
          patch.arbitration = payload.submission
        }
        const next = { ...doc, ...patch }
        if (next.reviewerA && next.reviewerB) patch.final = finalizeRereview({ session: doc.session,
          reviewerA: next.reviewerA, reviewerB: next.reviewerB, ...(next.arbitration ? { arbitration: next.arbitration } : {}), secret })
        patch.status = patch.final ? (patch.final.canFinalize ? 'review_finalized' : 'review_dispute') : 'awaiting_peer'
        const changed = await sessions.updateOne({ _id: sessionId, revision: doc.revision } as any,
          { $set: { ...patch, revision: doc.revision + 1, updatedAt: options.now() } })
        if (changed.modifiedCount !== 1) fail('REVIEW_CONFLICT')
        return summary(patch.status, { disputeCount: patch.final?.disputes.length || 0, finalHash: patch.final?.finalHash || null })
      }
      exact(payload, ['expectedFinalHash'])
      if (doc.status === 'published') {
        if (payload.expectedFinalHash !== doc.final.finalHash) fail('FINAL_CONFLICT')
        const published = await releases.findOne({ _id: doc.releaseId, releaseHash: doc.releaseHash })
        if (!published || published.reviewOnly?.sessionHash !== doc.session.sessionHash) fail('PUBLISHED_RELEASE_INVALID')
        const { _id, releaseHash, ...releaseBase } = published!
        if (canonicalHash(releaseBase) !== releaseHash) fail('PUBLISHED_RELEASE_INVALID')
        return summary('published', { releaseId: doc.releaseId, releaseHash: doc.releaseHash, replayed: true })
      }
      if (doc.status !== 'review_finalized' || !doc.final?.canFinalize || payload.expectedFinalHash !== doc.final.finalHash) fail('NOT_FINALIZED')
      const { baseline, publicEvidence } = await loadBaseline(doc.scope.baselineReleaseHash)
      if (canonicalHash(publicEvidence) !== doc.baselineRowsHash) fail('BASELINE_DRIFT')
      const final = finalizeRereview({ session: doc.session, reviewerA: doc.reviewerA, reviewerB: doc.reviewerB,
        ...(doc.arbitration ? { arbitration: doc.arbitration } : {}), secret })
      if (canonicalHash(final) !== canonicalHash(doc.final)) fail('FINAL_CONFLICT')
      const verifiedBindings = await originalBindings(doc.session)
      if (canonicalHash(verifiedBindings) !== canonicalHash(doc.objectBindings)) fail('OBJECT_BINDING_CONFLICT')
      const publicObjects = new Map<string, string>()
      for (const row of publicEvidence) for (const variant of [...(row.variants || []), ...(row.beforeVariants || [])]) {
        if (publicObjects.has(variant.objectKey) && publicObjects.get(variant.objectKey) !== variant.imageHash) fail('PUBLIC_OBJECT_CONFLICT')
        publicObjects.set(variant.objectKey, variant.imageHash)
      }
      const entries = [...publicObjects]; let nextIndex = 0
      await Promise.all(Array.from({ length: Math.min(16, entries.length) }, async () => {
        while (nextIndex < entries.length) { const [key, hash] = entries[nextIndex++]; await options.verifyObject(key, hash) }
      }))
      const projection = projectRereviewRelease({ baseline, publicEvidence, session: doc.session, final,
        secret, publishedAt: options.now().toISOString(), publicationCodeSha: options.codeSha })
      const release = projection.release as Row
      const tx = db.client.startSession()
      try { await tx.withTransaction(async () => {
        const fresh = await loadBaseline(doc!.scope.baselineReleaseHash, tx)
        if (canonicalHash(fresh.publicEvidence) !== doc!.baselineRowsHash) fail('BASELINE_DRIFT')
        const current = await sessions.findOne({ _id: sessionId, revision: doc!.revision, status: 'review_finalized' } as any, { session: tx })
        if (!current || canonicalHash(current.final) !== canonicalHash(final)) fail('FINAL_CONFLICT')
        await releases.insertOne(release as any, { session: tx })
        await rows.insertMany(projection.publicEvidence as any[], { session: tx })
        const retired = await lifecycles.updateOne({ releaseId: baseline._id, releaseHash: baseline.releaseHash, status: 'active' },
          { $set: { status: 'superseded', supersededByReleaseId: release._id, supersededByReleaseHash: release.releaseHash, supersededAt: options.now(), updatedAt: options.now() } }, { session: tx })
        if (retired.modifiedCount !== 1) fail('HEAD_CONFLICT')
        await lifecycles.insertOne({ _id: `benchmark-release-lifecycle:${release._id}`, status: 'active', releaseId: release._id,
          releaseHash: release.releaseHash, supersedesReleaseId: baseline._id, supersedesReleaseHash: baseline.releaseHash,
          activatedAt: options.now(), updatedAt: options.now() } as any, { session: tx })
        const moved = await heads.updateOne({ _id: SCIENTIFIC_V2_RELEASE_HEAD_ID, releaseId: baseline._id, releaseHash: baseline.releaseHash } as any,
          { $set: { releaseId: release._id, releaseHash: release.releaseHash, previousReleaseId: baseline._id,
            previousReleaseHash: baseline.releaseHash, updatedAt: options.now() } }, { session: tx })
        if (moved.modifiedCount !== 1) fail('HEAD_CONFLICT')
        const updated = await sessions.updateOne({ _id: sessionId, revision: doc!.revision, status: 'review_finalized' } as any,
          { $set: { status: 'published', releaseId: release._id, releaseHash: release.releaseHash, revision: doc!.revision + 1, publishedAt: options.now() } }, { session: tx })
        if (updated.modifiedCount !== 1) fail('FINAL_CONFLICT')
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }) } finally { await tx.endSession() }
      return summary('published', { releaseId: release._id, releaseHash: release.releaseHash, replayed: false })
    },
  }
}
