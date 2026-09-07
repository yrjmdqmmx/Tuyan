import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';

export const authUserFilter = (id) => ({ _id: { $in: ObjectId.isValid(String(id)) ? [String(id), new ObjectId(String(id))] : [String(id)] } });
const digest = (token) => createHash('sha256').update(token).digest('hex');

// Opaque, one-use tokens address an immutable ID. The library's email-only JWT
// verification path is intentionally replaced, including for legacy links.
export function createAccountVerification({ db, mongoClient, callbackUrl, now = () => new Date() }) {
  const tokens = db.collection('accountVerificationTokens');
  const operations = db.collection('accountDeletionOperations');
  const users = db.collection('user');
  const invalid = () => new Error('ACCOUNT_VERIFICATION_INVALID');
  return {
    async issue(user) {
      const userId = String(user.id || user._id || '');
      const identity = userId ? await users.findOne(authUserFilter(userId)) : null;
      if (!identity?.email || await operations.findOne({ _id: userId })) throw invalid();
      const emailHash = digest(String(identity.email).trim().toLowerCase());
      const token = randomBytes(32).toString('base64url');
      await tokens.insertOne({ _id: digest(token), userId, emailHash, expiresAt: new Date(now().getTime() + 3600000), createdAt: now() });
      return token;
    },
    async handler(request) {
      const url = new URL(request.url);
      if (url.pathname !== '/api/auth/verify-email' || request.method !== 'GET') return null;
      const token = url.searchParams.get('token') || '';
      let success = false;
      if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
        const session = mongoClient.startSession();
        try {
          await session.withTransaction(async () => {
            success = false;
            const options = { session };
            const row = await tokens.findOne({ _id: digest(token), expiresAt: { $gt: now() } }, options);
            if (!row || await operations.findOne({ _id: row.userId }, options)) throw invalid();
            const identity = await users.findOne(authUserFilter(row.userId), options);
            if (!identity?.email || digest(String(identity.email).trim().toLowerCase()) !== row.emailHash) throw invalid();
            const updated = await users.updateOne({ ...authUserFilter(row.userId), email: identity.email }, { $set: { emailVerified: true, updatedAt: now() } }, options);
            if (updated.matchedCount !== 1) throw invalid();
            await tokens.deleteOne({ _id: row._id }, options);
            success = true;
          }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        } catch { success = false; }
        finally { await session.endSession(); }
      }
      // The configured first-party destination is the only allowed redirect.
      // Never echo raw tokens or honor arbitrary callback URLs from a link.
      const target = new URL(callbackUrl);
      if (!success) target.searchParams.set('error', 'INVALID_TOKEN');
      return Response.redirect(target, 302);
    },
  };
}
