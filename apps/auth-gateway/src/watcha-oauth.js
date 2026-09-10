import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { authUserFilter } from './account-verification.js';

const AUTHORIZE = 'https://watcha.cn/oauth/authorize';
const TOKEN = 'https://watcha.cn/oauth/api/token';
const USERINFO = 'https://watcha.cn/oauth/api/userinfo';
const TTL_MS = 10 * 60_000;
const CODE_MS = 5 * 60_000;
const opaque = () => randomBytes(32).toString('base64url');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const validOpaque = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const candidates = (id) => authUserFilter(id)._id.$in;
const normalizedEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const fail = (code, status = 'BAD_REQUEST') => new APIError(status, { code: `WATCHA_${code}`, message: `WATCHA_${code}` });
const emailValid = (email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function watchaAuthorizationUrl({ clientId, redirectUri, scopes }, state, verifier) {
  const url = new URL(AUTHORIZE);
  url.search = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
    scope: scopes, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  return url.toString();
}

async function boundedJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok || response.redirected || (response.url && response.url !== url)) throw fail('PROVIDER_UNAVAILABLE', 'BAD_GATEWAY');
  const declared = Number(response.headers.get('content-length'));
  if (declared > 64 * 1024) throw fail('PROVIDER_UNAVAILABLE', 'BAD_GATEWAY');
  const reader = response.body?.getReader();
  if (!reader) throw fail('PROVIDER_UNAVAILABLE', 'BAD_GATEWAY');
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 64 * 1024) { await reader.cancel(); throw fail('PROVIDER_UNAVAILABLE', 'BAD_GATEWAY'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { reader.releaseLock(); }
}

export async function exchangeWatchaIdentity(config, code, verifier, fetchImpl = fetch) {
  const token = await boundedJson(fetchImpl, TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: config.clientId, client_secret: config.clientSecret,
      redirect_uri: config.redirectUri, code_verifier: verifier }).toString() });
  if (!token || token.error || (token.statusCode !== undefined && token.statusCode !== 200) || typeof token.access_token !== 'string' || !token.access_token.length || token.access_token.length > 8192
    || /[\r\n]/.test(token.access_token) || String(token.token_type).toLowerCase() !== 'bearer') throw fail('PROVIDER_UNAVAILABLE', 'BAD_GATEWAY');
  // read is required to establish identity. email is optional and never used as a binding key.
  const granted = typeof token.scope === 'string' ? token.scope.split(/\s+/).filter(Boolean) : [];
  if (!granted.includes('read') || granted.some((scope) => !config.scopes.split(' ').includes(scope))) throw fail('SCOPE_REJECTED');
  const wrapped = await boundedJson(fetchImpl, USERINFO, { method: 'GET', headers: { authorization: `Bearer ${token.access_token}`, accept: 'application/json' } });
  const user = wrapped?.statusCode === 200 ? wrapped.data : null;
  if (!user || !Number.isSafeInteger(user.user_id) || user.user_id <= 0 || typeof user.nickname !== 'string'
    || !user.nickname.trim() || user.nickname.length > 100 || /[\u0000-\u001f\u007f]/.test(user.nickname)) throw fail('PROVIDER_UNAVAILABLE', 'BAD_GATEWAY');
  // Upstream email, avatar and phone are deliberately not persisted or trusted.
  return { accountId: String(user.user_id), nickname: user.nickname.trim() };
}

export function renderWatchaCodeEmail({ code, purpose }) {
  const label = { signup: '创建图研账号', unlink: '解除观猹绑定', delete: '注销图研账号' }[purpose];
  return { subject: `图研 Tuyan｜${label}验证码`,
    textBody: `本次${label}验证码：${code}\n5 分钟内有效，仅用于本次操作。请勿向他人提供验证码。若非本人发起，请忽略。`,
    htmlBody: `<p>本次${label}验证码：</p><p style="font-size:28px;letter-spacing:6px">${code}</p><p>5 分钟内有效，仅用于本次操作。请勿向他人提供验证码。若非本人发起，请忽略。</p>` };
}

export function createWatchaOAuth({ config, db, mongoClient, limiter, transport, fetchImpl = fetch, now = () => new Date() }) {
  const enabled = config.watcha?.enabled === true;
  if (enabled && (!config.authEmail?.deliveryEnabled || !config.watcha.clientId || !config.watcha.clientSecret
    || !config.watcha.scopes?.split(' ').includes('read') || config.watcha.scopes.split(' ').some((scope) => !['read', 'email'].includes(scope)))) {
    throw new Error('WATCHA_CONFIGURATION_INCOMPLETE');
  }
  const settings = { ...config.watcha, redirectUri: enabled ? new URL('/api/auth/oauth2/callback/watcha', config.authBaseUrl).toString() : '' };
  const origins = new Set((config.frontendOrigins || []).filter((origin) => {
    try { const url = new URL(origin); return url.origin === origin && ['http:', 'https:'].includes(url.protocol)
      && !['servicewechat.com', 'developers.weixin.qq.com'].includes(url.hostname); } catch { return false; }
  }));
  const cookieName = config.production ? '__Host-paperbanana_watcha' : 'paperbanana_watcha';
  const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/', maxAge: TTL_MS / 1000 };
  const txs = db.collection('watchaTransactions');
  const codes = db.collection('watchaEmailCodes');
  const confirmations = db.collection('watchaDeletionConfirmations');
  const users = db.collection('user');
  const accounts = db.collection('account');
  const hmac = (value) => createHmac('sha256', config.authSecret).update(value).digest('hex');
  const browser = (ctx) => ctx.getCookie(cookieName);
  const browserHash = (ctx) => validOpaque(browser(ctx)) ? digest(browser(ctx)) : '';
  const expiry = (ms = TTL_MS) => new Date(now().getTime() + ms);
  const active = async (id, options = {}, marker) => {
    const user = await users.findOne(authUserFilter(id), options);
    if (!user || await db.collection('accountDeletionOperations').findOne({ _id: String(id) }, options)) throw fail('ACCOUNT_UNAVAILABLE', 'FORBIDDEN');
    const history = await db.collection('accountDeletionOperationHistory').findOne({ userId: String(id) }, { ...options, sort: { closedAt: -1, _id: -1 }, projection: { _id: 1 } });
    const generation = `${new Date(user.createdAt).toISOString()}:${history?._id || ''}`;
    if (marker !== undefined && generation !== marker) throw fail('ACCOUNT_CHANGED', 'FORBIDDEN');
    return { user, generation };
  };
  async function transaction(fn) {
    const session = mongoClient.startSession();
    try { return await session.withTransaction(() => fn({ session }), { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }); }
    finally { await session.endSession(); }
  }
  async function current(ctx, required = false) {
    const session = await getSessionFromCtx(ctx, { disableCookieCache: true });
    if (!session?.user || !session.session) { if (required) throw fail('SIGN_IN_REQUIRED', 'UNAUTHORIZED'); return null; }
    const { user, generation } = await active(session.user.id);
    return { ...session, localUser: user, generation };
  }
  async function pending(ctx, session, options = {}) {
    const row = await txs.findOne({ _id: browserHash(ctx), kind: 'pending', expiresAt: { $gt: now() } }, options);
    if (!row) throw fail('PENDING_EXPIRED');
    if (row.userId) {
      if (row.userId !== session?.user.id) throw fail('ACCOUNT_CHANGED', 'FORBIDDEN');
      await active(row.userId, options, row.generation);
    }
    return row;
  }
  function verified(session) { if (session.localUser.emailVerified !== true) throw fail('EMAIL_UNVERIFIED', 'FORBIDDEN'); }
  async function guardUser(session, options) {
    const found = await active(session.user.id, options, session.generation);
    if (!await db.collection('session').findOne({ ...authUserFilter(session.session.id), userId: { $in: candidates(session.user.id) }, expiresAt: { $gt: now() } }, options)) throw fail('SIGN_IN_REQUIRED', 'UNAUTHORIZED');
    const touched = await users.updateOne({ _id: found.user._id, email: session.localUser.email, emailVerified: true }, { $inc: { watchaWriteVersion: 1 } }, options);
    if (touched.matchedCount !== 1) throw fail('ACCOUNT_CHANGED', 'FORBIDDEN');
    return found.user;
  }
  async function createSession(ctx, userId, accountId, generation) {
    await active(userId, {}, generation);
    if (!await accounts.findOne({ providerId: 'watcha', accountId, userId: { $in: candidates(userId) } })) throw fail('BINDING_CONFLICT', 'CONFLICT');
    const user = await ctx.context.internalAdapter.findUserById(userId);
    const session = await ctx.context.internalAdapter.createSession(userId);
    if (!session || !user) throw fail('SESSION_FAILED', 'INTERNAL_SERVER_ERROR');
    try {
      await active(userId, {}, generation);
      if (!await accounts.findOne({ providerId: 'watcha', accountId, userId: { $in: candidates(userId) } })) throw fail('BINDING_CONFLICT', 'CONFLICT');
      await setSessionCookie(ctx, { session, user });
    } catch (error) { await ctx.context.internalAdapter.deleteSession(session.token); throw error; }
  }
  async function codeBinding(ctx, purpose, emailInput, session) {
    if (purpose === 'signup') {
      if (session) throw fail('SIGN_OUT_REQUIRED', 'CONFLICT');
      const row = await pending(ctx, session);
      if (row.intent !== 'login') throw fail('ACCOUNT_CHANGED', 'FORBIDDEN');
      const email = normalizedEmail(emailInput);
      if (!emailValid(email)) throw fail('INVALID_EMAIL');
      return { binding: row._id, email, pendingId: row._id };
    }
    if (!session) throw fail('SIGN_IN_REQUIRED', 'UNAUTHORIZED');
    verified(session);
    return { binding: hmac(session.session.token), email: session.localUser.email, userId: session.user.id, generation: session.generation };
  }
  async function verifyCode(ctx, purpose, email, code, session) {
    const binding = await codeBinding(ctx, purpose, email, session);
    const id = hmac(`${purpose}:${binding.binding}`);
    const row = await codes.findOneAndUpdate({ _id: id, emailHash: hmac(binding.email), ...(binding.generation ? { generation: binding.generation } : {}), expiresAt: { $gt: now() }, guesses: { $lt: 5 } },
      { $inc: { guesses: 1 } }, { returnDocument: 'after' });
    const expected = hmac(`${id}:${row?.nonce || ''}:${String(code || '')}`);
    if (!row || !/^\d{6}$/.test(String(code || '')) || !timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(expected))) throw fail('INVALID_CODE');
    return { ...binding, id, nonce: row.nonce };
  }
  async function consumeCode(row, options) {
    const removed = await codes.deleteOne({ _id: row.id, nonce: row.nonce, expiresAt: { $gt: now() } }, options);
    if (removed.deletedCount !== 1) throw fail('INVALID_CODE');
  }
  function endpoint(path, method, handler) {
    return createAuthEndpoint(path, { method, requireHeaders: true }, async (ctx) => {
      ctx.setHeader('Cache-Control', 'no-store'); ctx.setHeader('Referrer-Policy', 'no-referrer');
      if (!enabled && path !== '/watcha/status') throw fail('DISABLED', 'SERVICE_UNAVAILABLE');
      if (method === 'POST' && (!origins.has(ctx.headers.get('origin')) || ctx.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')) throw fail('INVALID_ORIGIN', 'FORBIDDEN');
      try { return await handler(ctx); }
      catch (error) {
        if (error instanceof APIError) throw error;
        if (error?.code === 11000) throw fail('BINDING_CONFLICT', 'CONFLICT');
        throw fail('UNAVAILABLE', 'SERVICE_UNAVAILABLE');
      }
    });
  }
  return {
    async ensureIndexes() {
      if (!enabled) return;
      for (const collection of [txs, codes, confirmations]) await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await txs.createIndex({ userId: 1 });
      await accounts.createIndex({ providerId: 1, accountId: 1 }, { name: 'watcha_identity_unique_v1', unique: true, partialFilterExpression: { providerId: 'watcha' } });
      await accounts.createIndex({ userId: 1, providerId: 1 }, { name: 'watcha_user_unique_v1', unique: true, partialFilterExpression: { providerId: 'watcha' } });
    },
    async consumeDeletionConfirmation({ confirmationToken, session }) {
      if (!enabled || !validOpaque(confirmationToken) || !session?.session?.token || !session?.user?.id) return false;
      try {
        return await transaction(async (options) => {
          const identity = await active(session.user.id, options);
          if (identity.user.emailVerified !== true || identity.user.email !== session.user.email) return false;
          const row = await confirmations.findOneAndDelete({ _id: digest(confirmationToken), userId: session.user.id,
            binding: hmac(session.session.token), emailHash: hmac(identity.user.email), generation: identity.generation, expiresAt: { $gt: now() } }, options);
          if (!row) return false;
          await guardUser({ ...session, localUser: identity.user, generation: identity.generation }, options);
          return true;
        });
      } catch { return false; }
    },
    plugin: { id: 'tuyan-watcha', endpoints: {
      watchaStatus: endpoint('/watcha/status', 'GET', async (ctx) => {
        if (!enabled) return ctx.json({ available: false, linked: false, hasPassword: false, emailVerified: false, pending: null });
        const session = await current(ctx);
        const credentialQuery = session ? { userId: { $in: candidates(session.user.id) } } : null;
        const linked = Boolean(credentialQuery && await accounts.findOne({ ...credentialQuery, providerId: 'watcha' }));
        const hasPassword = Boolean(credentialQuery && await accounts.findOne({ ...credentialQuery, providerId: 'credential', password: { $type: 'string', $ne: '' } }));
        const row = await pending(ctx, session).catch(() => null);
        return ctx.json({ available: true, linked, hasPassword, emailVerified: session?.localUser.emailVerified === true, pending: row ? { nickname: row.nickname } : null });
      }),
      watchaStart: endpoint('/watcha/start', 'POST', async (ctx) => {
        const { intent, returnOrigin } = ctx.body || {};
        if (!['login', 'link'].includes(intent) || !origins.has(returnOrigin) || returnOrigin !== ctx.headers.get('origin')) throw fail('INVALID_REQUEST');
        const session = await current(ctx, intent === 'link');
        if (intent === 'login' && session) throw fail('SIGN_OUT_REQUIRED', 'CONFLICT');
        if (session) verified(session);
        const state = opaque(); const browserToken = opaque(); const verifier = opaque();
        const previous = browserHash(ctx);
        if (previous) { await txs.deleteMany({ $or: [{ _id: previous }, { browserHash: previous }] }); await codes.deleteMany({ pendingId: previous }); }
        await txs.insertOne({ _id: digest(state), kind: 'state', browserHash: digest(browserToken), verifier, intent, returnOrigin,
          ...(session ? { userId: session.user.id, generation: session.generation } : {}), createdAt: now(), expiresAt: expiry() });
        ctx.setCookie(cookieName, browserToken, cookieOptions);
        return ctx.json({ url: watchaAuthorizationUrl(settings, state, verifier) });
      }),
      watchaCallback: endpoint('/oauth2/callback/watcha', 'GET', async (ctx) => {
        const query = new URL(ctx.request.url).searchParams;
        const state = query.get('state');
        let target = `${[...origins].find((origin) => origin.startsWith('https://')) || [...origins][0] || new URL(config.authBaseUrl).origin}/account/watcha-callback.html?watcha=error`;
        try {
          if (!validOpaque(state) || !browserHash(ctx)) throw fail('INVALID_STATE');
          // Wrong browser cannot consume another browser's transaction.
          const row = await txs.findOneAndDelete({ _id: digest(state), kind: 'state', browserHash: browserHash(ctx), expiresAt: { $gt: now() } });
          if (!row) throw fail('INVALID_STATE');
          target = `${row.returnOrigin}/account/watcha-callback.html?watcha=error`;
          const session = await current(ctx, row.intent === 'link');
          if ((row.intent === 'login' && session) || (row.userId && session?.user.id !== row.userId)) throw fail('ACCOUNT_CHANGED');
          if (row.userId) await active(row.userId, {}, row.generation);
          const code = query.get('code');
          if (query.has('error') || !code || code.length > 4096 || query.getAll('code').length !== 1 || query.getAll('state').length !== 1) throw fail('INVALID_STATE');
          const identity = await exchangeWatchaIdentity(settings, code, row.verifier, fetchImpl);
          const binding = await accounts.findOne({ providerId: 'watcha', accountId: identity.accountId });
          if (row.intent === 'login' && binding) {
            const found = await active(String(binding.userId));
            await createSession(ctx, String(binding.userId), identity.accountId, found.generation);
            ctx.setCookie(cookieName, '', { ...cookieOptions, maxAge: 0 });
            target = target.replace('watcha=error', 'watcha=complete');
          } else {
            // Identity intent remains explicit, even if another account is already bound.
            await txs.insertOne({ _id: browserHash(ctx), kind: 'pending', ...identity, intent: row.intent,
              ...(row.userId ? { userId: row.userId, generation: row.generation } : {}), createdAt: now(), expiresAt: expiry() });
            ctx.setCookie(cookieName, browser(ctx), cookieOptions);
            target = target.replace('watcha=error', 'watcha=pending');
          }
        } catch { /* All provider and state errors use a fixed, secret-free redirect. */ }
        return ctx.redirect(target);
      }),
      watchaEmailCode: endpoint('/watcha/email-code', 'POST', async (ctx) => {
        const { purpose, email } = ctx.body || {};
        if (!['signup', 'unlink', 'delete'].includes(purpose)) throw fail('INVALID_REQUEST');
        const session = await current(ctx, purpose !== 'signup');
        const binding = await codeBinding(ctx, purpose, email, session);
        try {
          await limiter.consume({ kind: 'email', value: binding.email, template: 'watcha' });
          const ip = ctx.headers.get('x-forwarded-for')?.split(',')[0].trim();
          if (ip) await limiter.consume({ kind: 'ip', value: ip, template: 'watcha' });
        } catch { throw fail('EMAIL_RATE_LIMITED', 'TOO_MANY_REQUESTS'); }
        const id = hmac(`${purpose}:${binding.binding}`); const nonce = opaque(); const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
        await codes.replaceOne({ _id: id }, { _id: id, purpose, nonce, codeHash: hmac(`${id}:${nonce}:${code}`), emailHash: hmac(binding.email),
          ...(binding.userId ? { userId: binding.userId, generation: binding.generation } : { pendingId: binding.pendingId }), guesses: 0, createdAt: now(), expiresAt: expiry(CODE_MS) }, { upsert: true });
        try { await transport.send({ toAddress: binding.email, ...renderWatchaCodeEmail({ code, purpose }) }); }
        catch { await codes.deleteOne({ _id: id, nonce }); throw fail('EMAIL_DELIVERY_FAILED', 'SERVICE_UNAVAILABLE'); }
        return ctx.json({ ok: true });
      }),
      watchaComplete: endpoint('/watcha/complete', 'POST', async (ctx) => {
        const session = await current(ctx);
        const email = normalizedEmail(ctx.body?.email);
        const proof = await verifyCode(ctx, 'signup', email, ctx.body?.code, session);
        let created;
        try {
          created = await transaction(async (options) => {
            const row = await pending(ctx, session, options);
            if (await users.findOne({ email }, { ...options, collation: { locale: 'en', strength: 2 } })) throw fail('EXISTING_ACCOUNT', 'CONFLICT');
            if (await accounts.findOne({ providerId: 'watcha', accountId: row.accountId }, options)) throw fail('BINDING_CONFLICT', 'CONFLICT');
            await consumeCode(proof, options);
            const user = { _id: new ObjectId(), email, emailVerified: true, name: row.nickname, createdAt: now(), updatedAt: now() };
            await users.insertOne(user, options);
            await accounts.insertOne({ _id: new ObjectId(), providerId: 'watcha', accountId: row.accountId, userId: user._id, createdAt: now(), updatedAt: now() }, options);
            const removed = await txs.deleteOne({ _id: row._id, kind: 'pending' }, options);
            if (removed.deletedCount !== 1) throw fail('PENDING_EXPIRED');
            return { userId: String(user._id), accountId: row.accountId };
          });
        } catch (error) {
          if (error?.code === 11000 && await users.findOne({ email }, { collation: { locale: 'en', strength: 2 } })) throw fail('EXISTING_ACCOUNT', 'CONFLICT');
          throw error;
        }
        const found = await active(created.userId);
        await createSession(ctx, created.userId, created.accountId, found.generation);
        ctx.setCookie(cookieName, '', { ...cookieOptions, maxAge: 0 });
        return ctx.json({ ok: true });
      }),
      watchaLink: endpoint('/watcha/link', 'POST', async (ctx) => {
        const session = await current(ctx, true); verified(session);
        const row = await pending(ctx, session);
        await transaction(async (options) => {
          await pending(ctx, session, options); const user = await guardUser(session, options);
          const existing = await accounts.findOne({ providerId: 'watcha', accountId: row.accountId }, options);
          if (existing && String(existing.userId) !== session.user.id) throw fail('BINDING_CONFLICT', 'CONFLICT');
          if (!existing) await accounts.insertOne({ _id: new ObjectId(), providerId: 'watcha', accountId: row.accountId, userId: user._id, createdAt: now(), updatedAt: now() }, options);
          if ((await txs.deleteOne({ _id: row._id, kind: 'pending' }, options)).deletedCount !== 1) throw fail('PENDING_EXPIRED');
          await codes.deleteMany({ pendingId: row._id }, options);
        });
        ctx.setCookie(cookieName, '', { ...cookieOptions, maxAge: 0 });
        return ctx.json({ ok: true });
      }),
      watchaUnlink: endpoint('/watcha/unlink', 'POST', async (ctx) => {
        const session = await current(ctx, true); verified(session);
        const proof = await verifyCode(ctx, 'unlink', null, ctx.body?.code, session);
        await transaction(async (options) => {
          await guardUser(session, options);
          if (!await accounts.findOne({ userId: { $in: candidates(session.user.id) }, providerId: 'credential', password: { $type: 'string', $ne: '' } }, options)) throw fail('LAST_LOGIN_METHOD', 'CONFLICT');
          await consumeCode(proof, options);
          await accounts.deleteMany({ userId: { $in: candidates(session.user.id) }, providerId: 'watcha' }, options);
        });
        return ctx.json({ ok: true });
      }),
      watchaDeleteConfirmation: endpoint('/watcha/delete-confirmation', 'POST', async (ctx) => {
        const session = await current(ctx, true); verified(session);
        const proof = await verifyCode(ctx, 'delete', null, ctx.body?.code, session);
        const token = opaque();
        await transaction(async (options) => {
          await guardUser(session, options); await consumeCode(proof, options);
          await confirmations.insertOne({ _id: digest(token), userId: session.user.id, binding: hmac(session.session.token), emailHash: hmac(session.localUser.email),
            generation: session.generation, createdAt: now(), expiresAt: expiry(CODE_MS) }, options);
        });
        return ctx.json({ confirmationToken: token });
      }),
    } },
  };
}
