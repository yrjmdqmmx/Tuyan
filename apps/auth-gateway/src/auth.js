import { createWatchaOAuth } from './watcha-oauth.js';
import { createAdminAccounts } from './admin-accounts.js';
import { createAccountWriteGuard } from './account-write-guard.js';
import { randomBytes } from 'node:crypto';
import { createAccountVerification, authUserFilter } from './account-verification.js';
import { createDeletionStore } from './account-deletion.js';
import { ensureAccountIndexes, normalizeAccountInput } from './account-indexes.js';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { fromNodeHeaders } from 'better-auth/node';
import { MongoClient, ObjectId } from 'mongodb';

import {
  createAccountEmailService,
  createDatabaseMailLimiter,
  createDirectMailClient,
  createDirectMailTransport,
} from './email.js';

export async function createAuthRuntime(
  config,
  {
    MongoClientClass = MongoClient,
    adapterFactory = mongodbAdapter,
    betterAuthFactory = betterAuth,
    fromNodeHeadersImpl = fromNodeHeaders,
    directMailClientFactory = createDirectMailClient,
    logger = console,
    watchaFetch = fetch,
    watchaNow,
  } = {},
) {
  const mongoClient = new MongoClientClass(config.mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db(config.mongoDbName);
  let status = { ok: true, checkedAt: null };
  try { await ensureAccountIndexes(db); } catch (error) { await mongoClient.close(); throw error; }
  const deletionStore = createDeletionStore(db.collection('accountDeletionOperations'));

  const advanced = {
    useSecureCookies: config.production,
    cookiePrefix: 'paperbanana',
  };
  if (config.cookieDomain) {
    advanced.crossSubDomainCookies = {
      enabled: true,
      domain: config.cookieDomain,
    };
  }
  if (config.cookieSameSite) {
    advanced.defaultCookieAttributes = { sameSite: config.cookieSameSite };
  }

  const emailConfig = {
    deliveryEnabled: false,
    requireVerification: false,
    verificationCallbackUrl: 'https://www.paperbanana.asia/account/email-verified.html',
    resetPasswordUrl: 'https://www.paperbanana.asia/account/reset-password.html',
    windowSeconds: 900,
    windowMax: 3,
    dailyMax: 10,
    directMail: null,
    ...config.authEmail,
    authBaseUrl: config.authBaseUrl,
  };
  const verification = createAccountVerification({ db, mongoClient, callbackUrl: emailConfig.verificationCallbackUrl, frontendOrigins: config.frontendOrigins });
  const limiter = createDatabaseMailLimiter({
    collection: db.collection('authMailRateLimit'),
    secret: config.authSecret,
    windowSeconds: emailConfig.windowSeconds,
    windowMax: emailConfig.windowMax,
    dailyMax: emailConfig.dailyMax,
  });
  let transport = { async send() { return { requestId: '' }; } };
  if (emailConfig.deliveryEnabled) {
    await limiter.ensureIndexes();
    transport = createDirectMailTransport(
      emailConfig.directMail,
      directMailClientFactory(emailConfig.directMail),
    );
  }
  const accountEmail = createAccountEmailService({
    config: emailConfig,
    fingerprintSecret: config.authSecret,
    limiter,
    transport,
    logger,
  });

  let watcha;
  try {
    watcha = createWatchaOAuth({ config, db, mongoClient, limiter, transport, fetchImpl: watchaFetch, ...(watchaNow ? { now: watchaNow } : {}) });
    await watcha.ensureIndexes();
  } catch (error) { await mongoClient.close(); throw error; }
  const auth = betterAuthFactory({
    plugins: [watcha.plugin],
    account: { accountLinking: { disableImplicitLinking: true } },
    appName: 'PaperBanana',
    databaseHooks: { ...createAccountWriteGuard(db), user: {
      create: { before: async (user) => ({ data: normalizeAccountInput(user) }) },
      update: { before: async (user) => ({ data: normalizeAccountInput(user) }) },
    } },
    secret: config.authSecret,
    baseURL: config.authBaseUrl,
    trustedOrigins: config.frontendOrigins,
    // The custom confirmation handler is the only verification endpoint.
    // Disable the library route as well, including its normalized path aliases.
    disabledPaths: ['/verify-email', '/unlink-account'],
    // Better Auth 1.6.11 includes full email addresses in several negative-path
    // log records. Application and account-email logs remain available through
    // the injected redacting logger, so disable the library logger completely.
    logger: { disabled: true },
    database: adapterFactory(db),
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      async sendVerificationEmail({ user, url, token }, request) {
        const boundToken = await verification.issue(user);
        await accountEmail.sendVerification({ email: user.email, url, token: boundToken, request });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: emailConfig.requireVerification,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      autoSignIn: false,
      async sendResetPassword({ user, url, token }, request) {
        await accountEmail.sendPasswordReset({ email: user.email, url, token, request });
      },
      async onPasswordReset({ user }) {
        try {
          await markAuthEmailVerified(db, user.id);
        } catch (error) {
          logger.warn?.('password reset completed but email verification update failed', {
            result: 'verification-update-failed',
            error: String(error?.name || 'Error'),
          });
        }
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 15 * 60, max: 10 },
        '/sign-up/email': { window: 15 * 60, max: 5 },
        '/send-verification-email': { window: 15 * 60, max: 3 },
        '/request-password-reset': { window: 15 * 60, max: 3 },
        '/reset-password': { window: 15 * 60, max: 5 },
        '/change-password': { window: 15 * 60, max: 5 },
      },
    },
    advanced,
  });

  return {
    deletionStore,
    consumeDeletionConfirmation: watcha.consumeDeletionConfirmation,
    webHandler: createRegistrationPrivacyHandler(
      async (request) => await verification.handler(request) || auth.handler(request),
      async (email) => Boolean(await db.collection('user').findOne(
        { email }, { projection: { _id: 1 }, collation: { locale: 'en', strength: 2 } },
      )),
      async (user) => {
        try { return await verification.issueStatus(user); }
        catch {
          logger.warn?.('registration status unavailable', { result: 'observer-unavailable' });
          return randomBytes(32).toString('base64url');
        }
      },
    ),
    async optionalSession(request) {
      return auth.api.getSession({
        headers: fromNodeHeadersImpl(request.headers),
      });
    },
    async verifyPassword({ password, headers }) {
      try {
        const result = await auth.api.verifyPassword({
          body: { password },
          headers: fromNodeHeadersImpl(headers),
        });
        return result?.status === true;
      } catch (error) {
        if (error?.body?.code === 'INVALID_PASSWORD') return false;
        throw error;
      }
    },
    async clearSessionCookie(request, response) {
      const signOutResponse = await auth.api.signOut({
        headers: fromNodeHeadersImpl(request.headers),
        asResponse: true,
      });
      for (const cookie of responseCookies(signOutResponse)) {
        response.append('Set-Cookie', cookie);
      }
    },
    async deleteUser(userId, operation) {
      await deleteAuthUser(mongoClient, db, userId, operation);
    },
    adminAccounts: createAdminAccounts(db),
    async listUsers(body = {}) {
      return listAuthUsers(db, body);
    },
    cachedStatus() {
      return { ...status };
    },
    async ready() {
      try {
        await db.command({ ping: 1 });
        await probeTransactionSupport(mongoClient, db);
        status = { ok: true, checkedAt: new Date().toISOString() };
        return { ok: true };
      } catch {
        status = { ok: false, checkedAt: new Date().toISOString(), error: 'mongodb unavailable' };
        return { ok: false, error: 'mongodb unavailable' };
      }
    },
    async close() {
      await mongoClient.close();
    },
  };
}

function createRegistrationPrivacyHandler(webHandler, userExists, issueStatus) {
  return async function registrationPrivacyHandler(request) {
    const url = new URL(request.url);
    const signupBody = request.method === 'POST' && url.pathname === '/api/auth/sign-up/email' ? request.clone() : null;
    const response = await webHandler(request);
    if (request.method !== 'POST' || url.pathname !== '/api/auth/sign-up/email') return response;

    let duplicate = false;
    if (response.status === 422) {
      const body = await response.clone().json().catch(() => null);
      duplicate = [
        'USER_ALREADY_EXISTS',
        'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      ].includes(body?.code);
      if (!duplicate && body?.code === 'FAILED_TO_CREATE_USER') {
        const input = await signupBody?.json().catch(() => null);
        const email = String(input?.email || '').trim().toLowerCase();
        // The unique index can win after the library's existence precheck.
        // Confirm that collision; do not mask unrelated database failures.
        duplicate = Boolean(email && await userExists(email));
      }
    }
    if (!response.ok && !duplicate) return response;

    const accepted = response.ok ? await response.clone().json().catch(() => null) : null;
    const verificationStatusToken = await issueStatus(accepted?.user);

    const headers = new Headers(response.headers);
    headers.delete('set-cookie');
    headers.delete('content-length');
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('cache-control', 'no-store');
    return new Response(
      JSON.stringify({ status: true, emailVerificationRequired: true, verificationStatusToken }),
      { status: 200, headers },
    );
  };
}

async function markAuthEmailVerified(db, userId) {
  const id = String(userId || '');
  if (!id) throw new Error('Auth user id is required');
  await db.collection('user').updateOne(
    authUserFilter(id),
    { $set: { emailVerified: true, updatedAt: new Date() } },
  );
}

async function probeTransactionSupport(mongoClient, db) {
  const session = mongoClient.startSession();
  try {
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });
    await db.collection('user').findOne({}, { projection: { _id: 1 }, session });
    await session.abortTransaction();
  } catch (error) {
    if (session.inTransaction?.()) {
      await session.abortTransaction().catch(() => {});
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function deleteAuthUser(mongoClient, db, userId, operation) {
  const id = String(userId || '');
  if (!id) throw new Error('Auth user id is required');
  const candidates = [id];
  let objectId = null;
  if (ObjectId.isValid(id)) {
    objectId = new ObjectId(id);
    candidates.push(objectId);
  }
  const session = mongoClient.startSession();
  try {
    await session.withTransaction(async () => {
      const options = { session };
      if (operation) {
        const op = await db.collection('accountDeletionOperations').findOne({
          _id: id, operationId: operation.operationId, leaseToken: operation.leaseToken, phase: 'auth', status: 'pending', contractVersion: 3,
        }, options);
        if (!op) throw new Error('ACCOUNT_DELETION_OPERATION_MISMATCH');
      }
      for (const name of ['watchaTransactions', 'watchaEmailCodes', 'watchaDeletionConfirmations']) {
        await db.collection(name).deleteMany({ userId: id }, options);
      }
      await db.collection('session').deleteMany({ userId: { $in: candidates } }, options);
      await db.collection('account').deleteMany({ userId: { $in: candidates } }, options);
      if (operation) {
        await db.collection('accountVerificationTokens').deleteMany({ userId: id }, options);
        await db.collection('verification').deleteMany({ value: { $in: candidates } }, options);
      }
      const userDeletion = await db.collection('user').deleteOne(
        authUserFilter(id),
        options,
      );
      if (userDeletion.deletedCount !== 1 && !(operation && userDeletion.deletedCount === 0)) {
        throw new Error('Auth user deletion did not match exactly one user');
      }
      if (operation) {
        const committed = await db.collection('accountDeletionOperations').updateOne(
          { _id: id, operationId: operation.operationId, leaseToken: operation.leaseToken, phase: 'auth' },
          { $set: { phase: 'ack', authDeletedAt: new Date(), updatedAt: new Date() } }, options,
        );
        if (committed.matchedCount !== 1) throw new Error('ACCOUNT_DELETION_LEASE_LOST');
      }
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });
  } finally {
    await session.endSession();
  }
}

async function listAuthUsers(db, body = {}) {
  const limit = clamp(Number(body.limit || 100), 1, 500);
  const users = await db
    .collection('user')
    .find({})
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .toArray();
  const userIds = users.map((user) => user._id).filter(Boolean);
  const userIdStrings = userIds.map((id) => String(id));
  const sessions = await latestSessionsByUser(db, userIds, userIdStrings);
  return {
    users: users.map((user) => publicAuthUser(user, sessions.get(String(user._id)))),
  };
}

async function latestSessionsByUser(db, userIds, userIdStrings) {
  if (!userIds.length) return new Map();
  const rows = await db
    .collection('session')
    .aggregate([
      {
        $match: {
          $or: [{ userId: { $in: userIds } }, { userId: { $in: userIdStrings } }],
        },
      },
      { $sort: { updatedAt: -1, createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: '$userId',
          sessionCount: { $sum: 1 },
          latestSessionAt: { $first: { $ifNull: ['$updatedAt', '$createdAt'] } },
          lastIpAddress: { $first: '$ipAddress' },
          lastUserAgent: { $first: '$userAgent' },
        },
      },
    ])
    .toArray();
  return new Map(rows.map((row) => [String(row._id), row]));
}

function publicAuthUser(user, session) {
  return {
    id: String(user._id || user.id || ''),
    email: user.email || '',
    name: user.name || '',
    emailVerified: Boolean(user.emailVerified),
    image: user.image || '',
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || '',
    lastLoginAt: session?.latestSessionAt || '',
    sessionCount: Number(session?.sessionCount || 0),
    lastIpAddress: session?.lastIpAddress || '',
    lastUserAgent: session?.lastUserAgent || '',
  };
}

function responseCookies(response) {
  if (typeof response?.headers?.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const cookie = response?.headers?.get?.('set-cookie');
  return cookie ? [cookie] : [];
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(value, max));
}
