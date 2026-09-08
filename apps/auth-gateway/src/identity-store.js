import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { APIError } from 'better-auth/api';
import { authUserFilter } from './account-verification.js';

export const INTERNAL_EMAIL_DOMAIN = '@accounts.tuyan.invalid';
export const publicEmail = (email) => String(email || '').endsWith(INTERNAL_EMAIL_DOMAIN) ? '' : String(email || '');
export const identityError = (code, status = 'BAD_REQUEST') => new APIError(status, { code, message: code });
const secretToken = () => randomBytes(32).toString('base64url');
const candidateIds = (id) => ObjectId.isValid(String(id)) ? [String(id), new ObjectId(String(id))] : [String(id)];

export function createIdentityStore({ db, mongoClient, secret, oauth = {}, sendBindingEmail, now = () => new Date() }) {
  const users = db.collection('user'), accounts = db.collection('account'), challenges = db.collection('authIdentityChallenges');
  const fingerprint = (s) => createHmac('sha256', secret).update(String(s)).digest('hex');
  const sessionKey = (session) => fingerprint(session.session.token);
  const ownerQuery = (id) => ({ userId: { $in: candidateIds(id) } });
  const identityKey = (provider, subject) => fingerprint(`${provider}:${subject}`);
  async function socialEmailOwner(email, userId, options = {}) {
    return accounts.findOne({ providerEmailHash: fingerprint(String(email).trim().toLowerCase()), userId: { $nin: userId ? candidateIds(userId) : [] } }, options);
  }
  async function transaction(fn) {
    const session = mongoClient.startSession();
    try { return await session.withTransaction(() => fn({ session }), { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }); }
    catch (error) { if (error?.code === 11000) throw identityError('IDENTITY_CONFLICT', 'CONFLICT'); throw error; }
    finally { await session.endSession(); }
  }
  async function active(userId, options = {}, touch = false) {
    const user = await users.findOne(authUserFilter(String(userId)), options);
    if (!user || await db.collection('accountDeletionOperations').findOne({ _id: String(userId) }, options)) throw identityError('ACCOUNT_LIFECYCLE_CLOSED', 'FORBIDDEN');
    if (touch) await users.updateOne({ _id: user._id }, { $inc: { authIdentityRevision: 1 } }, options);
    return user;
  }
  const expires = (seconds) => new Date(now().getTime() + seconds * 1000);
  async function limit(kind, value, max, seconds) {
    const start = Math.floor(now().getTime() / (seconds * 1000));
    const row = await db.collection('authIdentityRateLimits').findOneAndUpdate({ _id: fingerprint(`${kind}:${value}:${start}`) },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: expires(seconds * 2) } }, { upsert: true, returnDocument: 'after' });
    if (row.count > max) throw new APIError('TOO_MANY_REQUESTS', { code: 'IDENTITY_RATE_LIMITED', message: 'Please wait before retrying', retryAfterSeconds: seconds }, { 'Retry-After': String(seconds) });
  }
  async function putGrant(session, purpose, options) {
    await challenges.updateOne({ _id: fingerprint(`grant:${sessionKey(session)}:${purpose}`) }, { $set: {
      kind: 'grant', userId: session.user.id, sessionHash: sessionKey(session), purpose, expiresAt: expires(300),
    } }, { ...options, upsert: true });
  }
  async function passwordSnapshot(session, options = {}) {
    const row = await accounts.findOne({ ...ownerQuery(session.user.id), providerId: 'credential' }, options);
    if (!row?.password) throw identityError('INVALID_PASSWORD', 'UNAUTHORIZED');
    return row.password;
  }
  async function grant(session, purpose, passwordHash) {
    return transaction(async (options) => {
      await active(session.user.id, options, true);
      if (passwordHash && passwordHash !== await passwordSnapshot(session, options)) throw identityError('IDENTITY_REAUTH_REQUIRED', 'UNAUTHORIZED');
      await putGrant(session, purpose, options);
    });
  }
  async function proof(session, purpose, options, consume = true) {
    const query = { _id: fingerprint(`grant:${sessionKey(session)}:${purpose}`), kind: 'grant', userId: session.user.id, expiresAt: { $gt: now() } };
    const row = consume ? await challenges.findOneAndDelete(query, options) : await challenges.findOne(query, options);
    if (!row) throw identityError('IDENTITY_REAUTH_REQUIRED', 'UNAUTHORIZED');
  }
  async function methods(session) {
    const user = await active(session.user.id);
    const linked = await accounts.find(ownerQuery(user._id)).toArray();
    const methods = linked.filter((a) => a.providerId === 'credential' || ['github', 'google'].includes(a.providerId)).map((a) => ({
      provider: a.providerId === 'credential' ? 'email' : a.providerId,
      label: a.providerId === 'credential' ? publicEmail(user.email) : String(a.identityLabel || a.providerId),
      verified: a.providerId === 'credential' ? Boolean(user.emailVerified) : true,
      available: a.providerId === 'credential' ? Boolean(a.password && publicEmail(user.email) && user.emailVerified) : Boolean(oauth[a.providerId]),
    }));
    const grants = {};
    for (const purpose of ['manage', 'delete']) {
      const row = await challenges.findOne({ _id: fingerprint(`grant:${sessionKey(session)}:${purpose}`), expiresAt: { $gt: now() } });
      grants[purpose] = row?.expiresAt || null;
    }
    return { methods, email: publicEmail(user.email), emailVerified: Boolean(publicEmail(user.email) && user.emailVerified), grants };
  }
  async function oauthIdentity(provider, identity, flow, session) {
    if (!identity.subject || identity.subject.length > 255) throw identityError('OAUTH_AUTHORIZATION_FAILED');
    return transaction(async (options) => {
      const fence = await db.collection('authIdentityFences').findOne({ _id: identityKey(provider, identity.subject) }, options);
      if (fence && flow.createdAt <= fence.deletedAt) throw identityError('ACCOUNT_LIFECYCLE_CLOSED', 'FORBIDDEN');
      const existing = await accounts.findOne({ providerId: provider, accountId: identity.subject }, options);
      if (flow.intent === 'reauth') {
        if (!session || !existing || String(existing.userId) !== session.user.id) throw identityError('IDENTITY_WRONG_ACCOUNT', 'FORBIDDEN');
        await active(session.user.id, options, true);
        await putGrant(session, flow.purpose, options);
        return session.user.id;
      }
      if (flow.intent === 'login' && existing) { await active(existing.userId, options, true); return String(existing.userId); }
      let user;
      if (flow.intent === 'bind') {
        if (!session) throw identityError('IDENTITY_REAUTH_REQUIRED', 'UNAUTHORIZED');
        user = await active(session.user.id, options, true);
        if (existing && String(existing.userId) !== session.user.id) throw identityError('IDENTITY_CONFLICT', 'CONFLICT');
        if (existing) return session.user.id;
        if (await accounts.findOne({ ...ownerQuery(user._id), providerId: provider }, options)) throw identityError('IDENTITY_ALREADY_LINKED', 'CONFLICT');
      }
      // Email is a conflict signal only; never a key for implicit account linking.
      if (identity.email && identity.emailVerified) {
        const emailOwner = await users.findOne({ email: identity.email.trim().toLowerCase() }, { ...options, collation: { locale: 'en', strength: 2 } });
        if (emailOwner && String(emailOwner._id) !== String(user?._id || '')) throw identityError('IDENTITY_EMAIL_CONFLICT', 'CONFLICT');
        if (await socialEmailOwner(identity.email, user?._id, options)) throw identityError('IDENTITY_EMAIL_CONFLICT', 'CONFLICT');
      }
      if (!user) {
        user = { _id: new ObjectId(), name: identity.name.slice(0, 100), email: `${randomUUID()}${INTERNAL_EMAIL_DOMAIN}`, emailVerified: false, createdAt: now(), updatedAt: now() };
        await users.insertOne(user, options);
      }
      await accounts.insertOne({ _id: new ObjectId(), providerId: provider, accountId: identity.subject, userId: user._id,
        identityLabel: identity.name.slice(0, 100), ...(identity.email && identity.emailVerified ? { providerEmailHash: fingerprint(identity.email.trim().toLowerCase()) } : {}), providerEmailVerified: Boolean(identity.emailVerified), createdAt: now(), updatedAt: now() }, options);
      if (session) await challenges.deleteMany({ userId: session.user.id }, options);
      return String(user._id);
    });
  }
  async function unlink(session, provider) {
    return transaction(async (options) => {
      const user = await active(session.user.id, options, true);
      await proof(session, 'manage', options);
      const linked = await accounts.find(ownerQuery(user._id), options).toArray();
      const target = provider === 'email' ? 'credential' : provider;
      if (!linked.some((a) => a.providerId === target)) throw identityError('IDENTITY_NOT_LINKED');
      const usable = linked.filter((a) => a.providerId !== target && (a.providerId === 'credential'
        ? Boolean(a.password && publicEmail(user.email) && user.emailVerified) : Boolean(oauth[a.providerId])));
      if (!usable.length) throw identityError('IDENTITY_LAST_METHOD', 'CONFLICT');
      for (const row of linked.filter((a) => a.providerId === target && target !== 'credential')) {
        await db.collection('authIdentityFences').updateOne({ _id: identityKey(target, row.accountId) }, { $set: { deletedAt: now(), expiresAt: expires(1200) } }, { ...options, upsert: true });
      }
      await accounts.deleteMany({ ...ownerQuery(user._id), providerId: target }, options);
      if (target === 'credential') {
        await users.updateOne({ _id: user._id }, { $set: { email: `${randomUUID()}${INTERNAL_EMAIL_DOMAIN}`, emailVerified: false, updatedAt: now() } }, options);
        await db.collection('accountVerificationTokens').deleteMany({ userId: String(user._id) }, options);
        await db.collection('verification').deleteMany({ value: { $in: candidateIds(user._id) } }, options);
      }
      // Other sessions must not retain an authentication route that was removed.
      await db.collection('session').deleteMany({ ...ownerQuery(user._id), token: { $ne: session.session.token } }, options);
      await challenges.deleteMany({ userId: session.user.id }, options);
    });
  }
  async function requestEmail(session, email, ip) {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || email.endsWith('.invalid')) throw identityError('IDENTITY_INVALID_EMAIL');
    if (!sendBindingEmail) throw identityError('IDENTITY_EMAIL_UNAVAILABLE', 'SERVICE_UNAVAILABLE');
    await limit('email-minute', email, 1, 60); await limit('email-day', email, 5, 86400); await limit('binding-ip', ip, 10, 3600);
    const token = secretToken(), code = String(randomInt(100000, 1000000));
    await transaction(async (options) => {
      const user = await active(session.user.id, options, true);
      await proof(session, 'manage', options);
      if (publicEmail(user.email)) throw identityError('IDENTITY_ALREADY_LINKED', 'CONFLICT');
      if (await users.findOne({ email }, { ...options, collation: { locale: 'en', strength: 2 } })) throw identityError('IDENTITY_EMAIL_CONFLICT', 'CONFLICT');
      if (await socialEmailOwner(email, user._id, options)) throw identityError('IDENTITY_EMAIL_CONFLICT', 'CONFLICT');
      await challenges.deleteMany({ kind: 'email-bind', userId: session.user.id }, options);
      await challenges.insertOne({ _id: fingerprint(token), kind: 'email-bind', userId: session.user.id, sessionHash: sessionKey(session), email,
        codeHash: fingerprint(`${token}:${code}`), attempts: 0, createdAt: now(), expiresAt: expires(300), ready: false }, options);
    });
    try { await sendBindingEmail({ email, code }); await challenges.updateOne({ _id: fingerprint(token) }, { $set: { ready: true } }); }
    catch { await challenges.deleteOne({ _id: fingerprint(token) }); throw identityError('IDENTITY_EMAIL_UNAVAILABLE', 'SERVICE_UNAVAILABLE'); }
    return { challenge: token, expiresIn: 300, retryAfterSeconds: 60 };
  }
  async function bindEmail(session, token, code, passwordHash) {
    const query = { _id: fingerprint(token), kind: 'email-bind', userId: session.user.id, sessionHash: sessionKey(session), ready: true, expiresAt: { $gt: now() }, attempts: { $lt: 5 } };
    // Attempts are committed even when verification fails; no rollback resets a guess.
    const challenge = await challenges.findOneAndUpdate(query, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
    if (!challenge) throw identityError('IDENTITY_CODE_EXPIRED');
    if (!timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(fingerprint(`${token}:${code}`)))) throw identityError('IDENTITY_CODE_INVALID');
    return transaction(async (options) => {
      const user = await active(session.user.id, options, true);
      if (publicEmail(user.email)) throw identityError('IDENTITY_ALREADY_LINKED', 'CONFLICT');
      const consumed = await challenges.findOneAndDelete({ ...query, attempts: { $lte: 5 } }, options);
      if (!consumed) throw identityError('IDENTITY_CODE_EXPIRED');
      if (await users.findOne({ email: challenge.email }, { ...options, collation: { locale: 'en', strength: 2 } })) throw identityError('IDENTITY_EMAIL_CONFLICT', 'CONFLICT');
      if (await socialEmailOwner(challenge.email, user._id, options)) throw identityError('IDENTITY_EMAIL_CONFLICT', 'CONFLICT');
      await users.updateOne({ _id: user._id }, { $set: { email: challenge.email, emailVerified: true, updatedAt: now() } }, options);
      await accounts.insertOne({ _id: new ObjectId(), userId: user._id, providerId: 'credential', accountId: String(user._id), password: passwordHash, createdAt: now(), updatedAt: now() }, options);
      await db.collection('session').deleteMany({ ...ownerQuery(user._id), token: { $ne: session.session.token } }, options);
      await challenges.deleteMany({ userId: session.user.id }, options);
    });
  }
  async function resetPassword(token, passwordHash) {
    return transaction(async (options) => {
      const verification = db.collection('verification');
      const row = await verification.findOne({ identifier: `reset-password:${token}`, expiresAt: { $gt: now() } }, options);
      if (!row) throw identityError('INVALID_TOKEN');
      const user = await active(row.value, options, true);
      if (!publicEmail(user.email) || !await accounts.findOne({ ...ownerQuery(user._id), providerId: 'credential' }, options)) throw identityError('INVALID_TOKEN');
      await verification.deleteOne({ _id: row._id }, options);
      await accounts.updateMany({ ...ownerQuery(user._id), providerId: 'credential' }, { $set: { password: passwordHash, updatedAt: now() } }, options);
      await users.updateOne({ _id: user._id }, { $set: { emailVerified: true, updatedAt: now() } }, options);
      await db.collection('session').deleteMany(ownerQuery(user._id), options);
      await challenges.deleteMany({ userId: String(user._id) }, options);
    });
  }
  async function changePassword(session, previousHash, passwordHash) {
    return transaction(async (options) => {
      const user = await active(session.user.id, options, true);
      if (previousHash !== await passwordSnapshot(session, options)) throw identityError('IDENTITY_REAUTH_REQUIRED', 'UNAUTHORIZED');
      await accounts.updateMany({ ...ownerQuery(user._id), providerId: 'credential' }, { $set: { password: passwordHash, updatedAt: now() } }, options);
      await db.collection('session').deleteMany({ ...ownerQuery(user._id), token: { $ne: session.session.token } }, options);
      await challenges.deleteMany({ userId: session.user.id }, options);
    });
  }
  return { emailBindingEnabled: Boolean(sendBindingEmail), socialEmailOwner, fingerprint, sessionKey, identityKey, active, transaction, challenges, now, expires, passwordSnapshot, resetPassword, changePassword, grant, proof, methods, limit, oauthIdentity, unlink, requestEmail, bindEmail };
}

export async function ensureIdentityIndexes(db) {
  await db.collection('account').createIndex({ providerId: 1, accountId: 1 }, { name: 'auth_oauth_subject_unique_v1', unique: true, partialFilterExpression: { providerId: { $in: ['github', 'google'] } } });
  for (const name of ['authIdentityChallenges', 'authIdentityRateLimits', 'authIdentityFences']) await db.collection(name).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('authIdentityChallenges').createIndex({ userId: 1 });
}

export async function deleteIdentityState(db, userId, options, secret) {
  const rows = await db.collection('account').find({ userId: { $in: candidateIds(userId) }, providerId: { $in: ['github', 'google'] } }, options).toArray();
  const deletedAt = new Date();
  for (const row of rows) {
    const id = createHmac('sha256', secret).update(`${row.providerId}:${row.accountId}`).digest('hex');
    await db.collection('authIdentityFences').updateOne({ _id: id }, { $set: { deletedAt, expiresAt: new Date(deletedAt.getTime() + 20 * 60 * 1000) } }, { ...options, upsert: true });
  }
  await db.collection('authIdentityChallenges').deleteMany({ userId: String(userId) }, options);
}
