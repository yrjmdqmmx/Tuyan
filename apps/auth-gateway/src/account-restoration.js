import { createHash, randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';

const hash = (value) => createHash('sha256').update(value).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
const digest = (value) => hash(JSON.stringify(canonical(JSON.parse(JSON.stringify(value)))));
const fingerprint = (id) => hash(String(id)).slice(0, 12);
const owned = (userId) => ({ $or: [{ userId }, { userId: { $in: [null, ''] }, user_id: userId }] });

// Deliberately not a public HTTP action. The operator stops all Core/Gateway
// instances under the host maintenance lock before reviewing and applying.
export async function inspectAccountRestoration({ authDb, businessDb, userFingerprint, session }) {
  if (!/^[a-f0-9]{12}$/.test(userFingerprint)) throw new Error('RESTORATION_FINGERPRINT_REQUIRED');
  const options = session ? { session } : {};
  const identities = await authDb.collection('user').find({}, { ...options, projection: { _id: 1 } }).limit(10001).toArray();
  if (identities.length > 10000) throw new Error('RESTORATION_REVIEW_BOUND_EXCEEDED');
  const matches = identities.filter((row) => fingerprint(row._id) === userFingerprint);
  if (matches.length !== 1) throw new Error('RESTORATION_IDENTITY_NOT_UNIQUE');
  const userId = String(matches[0]._id);
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(userId)) throw new Error('RESTORATION_IDENTITY_INVALID');
  const ids = [userId, ...(ObjectId.isValid(userId) ? [new ObjectId(userId)] : [])];
  const bounded = async (collection, query) => {
    const rows = await collection.find(query, options).sort({ _id: 1 }).limit(5001).toArray();
    if (rows.length > 5000) throw new Error('RESTORATION_REVIEW_BOUND_EXCEEDED');
    return rows;
  };
  const snapshot = {
    user: await authDb.collection('user').findOne({ _id: matches[0]._id }, options),
    credentials: await bounded(authDb.collection('account'), { userId: { $in: ids } }),
    sessions: await bounded(authDb.collection('session'), { userId: { $in: ids } }),
    deletionOperation: await authDb.collection('accountDeletionOperations').findOne({ _id: userId }, options),
    head: await businessDb.collection('paperbanana_account_deletions').findOne({ _id: `user:${userId}` }, options),
    jobs: await bounded(businessDb.collection('paperbanana_jobs'), owned(userId)),
    feedback: await bounded(businessDb.collection('paperbanana_feedback'), owned(userId)),
    uploads: await bounded(businessDb.collection('paperbanana_reference_upload_state'), { ownerKey: `user:${userId}` }),
  };
  const summary = {
    userFingerprint, authCreatedAt: snapshot.user.createdAt,
    state: snapshot.head?.status || 'active', contractVersion: snapshot.head?.contractVersion || null,
    deletionCreatedAt: snapshot.head?.createdAt || null,
    credentials: snapshot.credentials.length, sessions: snapshot.sessions.length,
    jobs: snapshot.jobs.length, feedback: snapshot.feedback.length, uploads: snapshot.uploads.length,
    activeJobs: snapshot.jobs.filter((job) => ['reserved', 'queued', 'running'].includes(job.status)).length,
    reviewSha256: digest(snapshot),
  };
  return { summary, snapshot, userId };
}

export async function restoreAccountIdentity({ client, authDb, businessDb, userFingerprint, expectedReviewSha256, now = () => new Date() }) {
  if (!/^[a-f0-9]{64}$/.test(expectedReviewSha256)) throw new Error('RESTORATION_REVIEW_DIGEST_REQUIRED');
  // Collections must exist before the cross-database transaction. No credential,
  // session, job, feedback or object is updated or deleted by this operation.
  for (const [db, name] of [[authDb, 'accountDeletionOperationHistory'], [businessDb, 'paperbanana_account_deletion_history']]) {
    try { await db.createCollection(name); } catch (error) { if (error.code !== 48) throw error; }
  }
  const session = client.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const { snapshot, summary, userId } = await inspectAccountRestoration({ authDb, businessDb, userFingerprint, session });
      if (snapshot.head?.status === 'active' && snapshot.head.restorationReviewSha256 === expectedReviewSha256) {
        result = { ...summary, restored: true, alreadyRestored: true, accountGeneration: snapshot.head.accountGeneration };
        return;
      }
      if (summary.reviewSha256 !== expectedReviewSha256) throw new Error('RESTORATION_REVIEW_CHANGED');
      if (!snapshot.head || snapshot.head.contractVersion === 3 || snapshot.head.status !== 'deleting') throw new Error('RESTORATION_REQUIRES_INTERRUPTED_LEGACY_ACCOUNT');
      if (String(snapshot.head.userId) !== userId || !snapshot.credentials.length || summary.activeJobs) throw new Error('RESTORATION_IDENTITY_OR_WORK_REVIEW_REQUIRED');
      if (snapshot.deletionOperation && snapshot.deletionOperation.status !== 'review_required') throw new Error('RESTORATION_AUTH_OPERATION_MUST_BE_HELD');
      const restoredAt = now();
      if (snapshot.uploads.some((upload) => !Number.isFinite(new Date(upload.expiresAt).getTime()) || new Date(upload.expiresAt).getTime() + 86400000 > restoredAt.getTime())) throw new Error('RESTORATION_UPLOADS_NOT_SETTLED');
      // These ephemeral confirmations cannot outlive the interrupted account
      // lifecycle. Deleting in this transaction also conflicts with any stale
      // Watcha mutation concurrently trying to consume the same proof.
      for (const name of ['watchaTransactions', 'watchaEmailCodes', 'watchaDeletionConfirmations']) {
        await authDb.collection(name).deleteMany({ userId }, { session });
      }
      const accountGeneration = randomUUID();
      const archiveId = `${userId}:${accountGeneration}`;
      await businessDb.collection('paperbanana_account_deletion_history').insertOne({
        _id: archiveId, userId, disposition: 'restored_original_identity', closedAt: restoredAt,
        reviewSha256: expectedReviewSha256, original: snapshot.head,
        // A closed historical scope is evidence only, never a work queue.
        cleanupAllowed: false, preservedJobIds: snapshot.jobs.map((job) => String(job._id)),
      }, { session });
      if (snapshot.deletionOperation) {
        await authDb.collection('accountDeletionOperationHistory').insertOne({
          _id: archiveId, userId, closedAt: restoredAt, disposition: 'restored_original_identity', original: snapshot.deletionOperation,
        }, { session });
        const removed = await authDb.collection('accountDeletionOperations').deleteOne({ _id: userId, operationId: snapshot.deletionOperation.operationId, status: 'review_required' }, { session });
        if (removed.deletedCount !== 1) throw new Error('RESTORATION_AUTH_OPERATION_CHANGED');
      }
      const replaced = await businessDb.collection('paperbanana_account_deletions').replaceOne({ _id: snapshot.head._id, status: 'deleting' }, {
        _id: snapshot.head._id, userId, contractVersion: 3, status: 'active', phase: 'active',
        accountGeneration, restoredAt, archivedDeletionId: archiveId,
        restorationReviewSha256: expectedReviewSha256, previousGenerationClosedAt: restoredAt,
      }, { session });
      if (replaced.matchedCount !== 1) throw new Error('RESTORATION_HEAD_CHANGED');
      result = { ...summary, state: 'active', contractVersion: 3, restored: true, alreadyRestored: false, accountGeneration };
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return result;
  } finally { await session.endSession(); }
}
