import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { MongoClient, ObjectId } from 'mongodb';

export async function createAuthRuntime(
  config,
  {
    MongoClientClass = MongoClient,
    adapterFactory = mongodbAdapter,
    betterAuthFactory = betterAuth,
    handlerFactory = toNodeHandler,
    fromNodeHeadersImpl = fromNodeHeaders,
  } = {},
) {
  const mongoClient = new MongoClientClass(config.mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db(config.mongoDbName);
  let status = { ok: true, checkedAt: null };

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

  const auth = betterAuthFactory({
    appName: 'PaperBanana',
    secret: config.authSecret,
    baseURL: config.authBaseUrl,
    trustedOrigins: config.frontendOrigins,
    database: adapterFactory(db),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    advanced,
  });

  return {
    handler: handlerFactory(auth),
    async optionalSession(request) {
      return auth.api.getSession({
        headers: fromNodeHeadersImpl(request.headers),
      });
    },
    async verifyPassword({ email, password, headers }) {
      await auth.api.signInEmail({
        body: { email, password },
        headers: fromNodeHeadersImpl(headers),
      });
      return true;
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
    async deleteUser(userId) {
      await deleteAuthUser(db, userId);
    },
    async listUsers(body = {}) {
      return listAuthUsers(db, body);
    },
    cachedStatus() {
      return { ...status };
    },
    async ready() {
      try {
        await db.command({ ping: 1 });
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

async function deleteAuthUser(db, userId) {
  const id = String(userId || '');
  if (!id) return;
  const candidates = [id];
  let objectId = null;
  if (ObjectId.isValid(id)) {
    objectId = new ObjectId(id);
    candidates.push(objectId);
  }
  await db.collection('session').deleteMany({ userId: { $in: candidates } });
  await db.collection('account').deleteMany({ userId: { $in: candidates } });
  await db.collection('user').deleteOne(
    objectId ? { $or: [{ _id: objectId }, { id }] } : { $or: [{ _id: id }, { id }] },
  );
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
