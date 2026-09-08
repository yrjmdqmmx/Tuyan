import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';

export const authUserFilter = (id) => ({ _id: { $in: ObjectId.isValid(String(id)) ? [String(id), new ObjectId(String(id))] : [String(id)] } });
const digest = (token) => createHash('sha256').update(token).digest('hex');
const emailDigest = (email) => digest(String(email).trim().toLowerCase());
const validToken = (token) => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
const lifetimeMs = 3600000;

// Opaque, one-use tokens address an immutable ID. The library's email-only JWT
// verification path is intentionally replaced, including for legacy links.
export function createAccountVerification({ db, mongoClient, callbackUrl, frontendOrigins = [], now = () => new Date() }) {
  const tokens = db.collection('accountVerificationTokens');
  const operations = db.collection('accountDeletionOperations');
  const users = db.collection('user');
  const allowedOrigins = new Set([new URL(callbackUrl).origin, ...frontendOrigins]);
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  const invalid = (code = 'INVALID_TOKEN') => Object.assign(new Error('ACCOUNT_VERIFICATION_INVALID'), { verificationCode: code });
  async function currentIdentity(row, options) {
    if (await operations.findOne({ _id: row.userId }, options)) return null;
    const identity = await users.findOne(authUserFilter(row.userId), options);
    return identity?.email && emailDigest(identity.email) === row.emailHash ? identity : null;
  }
  return {
    async issue(user) {
      const userId = String(user.id || user._id || '');
      const identity = userId ? await users.findOne(authUserFilter(userId)) : null;
      if (!identity?.email || await operations.findOne({ _id: userId })) throw invalid();
      const emailHash = emailDigest(identity.email);
      const token = randomBytes(32).toString('base64url');
      await tokens.insertOne({ _id: digest(token), userId, emailHash, expiresAt: new Date(now().getTime() + lifetimeMs), createdAt: now() });
      return token;
    },
    // Only the actual sign-up response's immutable identity may receive an
    // observer. Better Auth's synthetic duplicate-user ID deliberately does
    // not resolve. Decoys have the same shape and always report pending.
    async issueStatus(user) {
      const token = randomBytes(32).toString('base64url');
      const userId = String(user?.id || '');
      const identity = userId ? await users.findOne(authUserFilter(userId)) : null;
      if (identity?.email && user?.email && emailDigest(identity.email) === emailDigest(user.email)
        && !await operations.findOne({ _id: userId })) {
        await tokens.insertOne({ _id: digest(token), kind: 'registration-status', userId,
          emailHash: emailDigest(identity.email), expiresAt: new Date(now().getTime() + lifetimeMs), createdAt: now() });
      }
      return token;
    },
    async handler(request) {
      const url = new URL(request.url);
      if (url.pathname === '/api/auth/verification-status' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        try {
          const row = validToken(body?.token) ? await tokens.findOne({ _id: digest(body.token), kind: 'registration-status', expiresAt: { $gt: now() } }) : null;
          const identity = row ? await currentIdentity(row) : null;
          return Response.json({ status: identity?.emailVerified === true ? 'verified' : 'pending' }, { headers: { 'Cache-Control': 'no-store' } });
        } catch {
          return Response.json({ code: 'VERIFICATION_STATUS_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
        }
      }
      if (url.pathname !== '/api/auth/verify-email') return null;
      // Mail previews and security scanners may fetch links before the user.
      // Even legacy GET/HEAD links only open the first-party confirmation page.
      if (request.method === 'GET' || request.method === 'HEAD') {
        const token = url.searchParams.get('token') || '';
        const target = new URL(callbackUrl);
        target.search = '';
        target.hash = '';
        if (validToken(token)) {
          target.pathname = new URL('./email-verify.html', target).pathname;
          target.hash = new URLSearchParams({ token }).toString();
        } else target.searchParams.set('error', 'INVALID_TOKEN');
        return new Response(null, { status: 302, headers: { ...headers, Location: target.toString() } });
      }
      if (request.method !== 'POST') return Response.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405, headers: { ...headers, Allow: 'GET, HEAD, POST' } });
      if (!allowedOrigins.has(request.headers.get('origin'))) return Response.json({ code: 'INVALID_ORIGIN' }, { status: 403, headers });
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return Response.json({ code: 'INVALID_CONTENT_TYPE' }, { status: 415, headers });
      }
      const body = await request.json().catch(() => null);
      const token = body?.token;
      let error = 'INVALID_TOKEN';
      if (validToken(token)) {
        const session = mongoClient.startSession();
        try {
          await session.withTransaction(async () => {
            error = 'INVALID_TOKEN';
            const options = { session };
            const row = await tokens.findOne({ _id: digest(token) }, options);
            if (!row || row.kind) throw invalid();
            if (row.expiresAt <= now()) throw invalid('TOKEN_EXPIRED');
            const identity = await currentIdentity(row, options);
            if (!identity) throw invalid();
            if (row.consumedAt) {
              if (identity.emailVerified !== true) throw invalid();
              error = 'TOKEN_USED';
              return;
            }
            const updated = await users.updateOne({ ...authUserFilter(row.userId), email: identity.email }, { $set: { emailVerified: true, updatedAt: now() } }, options);
            if (updated.matchedCount !== 1) throw invalid();
            // Keep only the digest receipt until the original TTL. A repeat
            // observes completion; it never performs verification a second time.
            await tokens.updateOne({ _id: row._id }, { $set: { consumedAt: now() } }, options);
            error = identity.emailVerified === true ? 'TOKEN_USED' : null;
          }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        } catch (failure) { error = failure.verificationCode || 'VERIFICATION_UNAVAILABLE'; }
        finally { await session.endSession(); }
      }
      const ok = error === null || error === 'TOKEN_USED';
      return Response.json({ ok, code: error || 'EMAIL_VERIFIED' }, {
        status: ok ? 200 : error === 'VERIFICATION_UNAVAILABLE' ? 503 : 400, headers,
      });
    },
  };
}
