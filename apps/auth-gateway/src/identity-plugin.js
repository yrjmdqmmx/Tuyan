import { randomBytes } from 'node:crypto';
import { createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { exchangeOAuthIdentity, oauthAuthorizationUrl } from './identity-providers.js';
import { identityError } from './identity-store.js';

const providerSchema = z.enum(['github', 'google']);
const purposeSchema = z.enum(['manage', 'delete']);
const token = () => randomBytes(32).toString('base64url');
const knownErrors = new Set(['IDENTITY_CONFLICT', 'IDENTITY_EMAIL_CONFLICT', 'IDENTITY_WRONG_ACCOUNT', 'IDENTITY_ALREADY_LINKED', 'ACCOUNT_LIFECYCLE_CLOSED', 'IDENTITY_REAUTH_REQUIRED', 'IDENTITY_SESSION_CHANGED', 'OAUTH_STATE_INVALID', 'OAUTH_CANCELLED', 'OAUTH_AUTHORIZATION_FAILED']);

export function createIdentityPlugin({ store, config, exchangeIdentity = exchangeOAuthIdentity, authorizationUrl = oauthAuthorizationUrl }) {
  const identity = config.identity || { oauth: {}, returnUrl: 'https://www.paperbanana.asia/' };
  const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/api/auth/identity/oauth/callback', maxAge: 600 };
  const cookieName = (provider) => `${config.production ? '__Secure-' : ''}tuyan_oauth_${provider}`;
  async function session(ctx) {
    const s = await getSessionFromCtx(ctx);
    if (!s) throw identityError('IDENTITY_REAUTH_REQUIRED', 'UNAUTHORIZED');
    await store.active(s.user.id);
    return s;
  }
  const ip = (ctx) => ctx.request?.headers.get('x-tuyan-client-ip') || 'unknown';
  function endpoint(path, body, handler) {
    return createAuthEndpoint(`/identity/${path}`, { method: 'POST', body }, async (ctx) => {
      if (!config.frontendOrigins.includes(ctx.request?.headers.get('origin')) || !ctx.request?.headers.get('content-type')?.startsWith('application/json')) throw identityError('IDENTITY_ORIGIN_REJECTED', 'FORBIDDEN');
      ctx.setHeader('Cache-Control', 'no-store');
      return handler(ctx);
    });
  }
  return { id: 'tuyan-identities', endpoints: {
    identityCapabilities: createAuthEndpoint('/identity/capabilities', { method: 'GET' }, async (ctx) => {
      ctx.setHeader('Cache-Control', 'no-store');
      return ctx.json({ version: 1, providers: { github: Boolean(identity.oauth.github), google: Boolean(identity.oauth.google) }, emailBinding: store.emailBindingEnabled });
    }),
    identityMethods: createAuthEndpoint('/identity/methods', { method: 'GET' }, async (ctx) => {
      ctx.setHeader('Cache-Control', 'no-store');
      return ctx.json(await store.methods(await session(ctx)));
    }),
    identityReauthPassword: endpoint('reauth/password', z.object({ password: z.string().min(1).max(128), purpose: purposeSchema }), async (ctx) => {
      const s = await session(ctx);
      await store.limit('reauth-user', s.user.id, 5, 900);
      const hash = await store.passwordSnapshot(s);
      if (!await ctx.context.password.verify({ hash, password: ctx.body.password })) throw identityError('INVALID_PASSWORD', 'UNAUTHORIZED');
      await store.grant(s, ctx.body.purpose, hash);
      return ctx.json({ verified: true, expiresIn: 300 });
    }),
    identityUnlink: endpoint('unlink', z.object({ provider: z.enum(['email', 'github', 'google']) }), async (ctx) => {
      await store.unlink(await session(ctx), ctx.body.provider);
      return ctx.json({ ok: true });
    }),
    identityEmailRequest: endpoint('email/request', z.object({ email: z.string().max(254) }), async (ctx) => {
      return ctx.json(await store.requestEmail(await session(ctx), ctx.body.email, ip(ctx)));
    }),
    identityEmailVerify: endpoint('email/verify', z.object({ challenge: z.string().length(43), code: z.string().regex(/^\d{6}$/), password: z.string().min(8).max(128) }), async (ctx) => {
      const s = await session(ctx);
      await store.limit('email-verify', s.user.id, 10, 300);
      const hash = await ctx.context.password.hash(ctx.body.password);
      await store.bindEmail(s, ctx.body.challenge, ctx.body.code, hash);
      return ctx.json({ ok: true });
    }),
    identityResetPassword: endpoint('email/reset', z.object({ token: z.string().min(1).max(512), newPassword: z.string().min(8).max(128) }), async (ctx) => {
      await store.limit('password-reset', ip(ctx), 5, 900);
      await store.resetPassword(ctx.body.token, await ctx.context.password.hash(ctx.body.newPassword));
      return ctx.json({ status: true });
    }),
    identityChangePassword: endpoint('email/change-password', z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128), revokeOtherSessions: z.boolean().optional() }), async (ctx) => {
      const s = await session(ctx); await store.limit('password-change', s.user.id, 5, 900);
      const hash = await store.passwordSnapshot(s);
      if (!await ctx.context.password.verify({ hash, password: ctx.body.currentPassword })) throw identityError('INVALID_PASSWORD', 'UNAUTHORIZED');
      await store.changePassword(s, hash, await ctx.context.password.hash(ctx.body.newPassword));
      return ctx.json({ token: null });
    }),
    identityOAuthStart: endpoint('oauth/start', z.object({ provider: providerSchema, intent: z.enum(['login', 'bind', 'reauth']), purpose: purposeSchema.optional() }), async (ctx) => {
      const { provider, intent } = ctx.body, credentials = identity.oauth[provider];
      if (!credentials) throw identityError('IDENTITY_PROVIDER_NOT_CONFIGURED', 'SERVICE_UNAVAILABLE');
      await store.limit('oauth-start', ip(ctx), 30, 900);
      const s = intent === 'login' ? await getSessionFromCtx(ctx) : await session(ctx);
      if (s && intent === 'login') throw identityError('IDENTITY_SESSION_CHANGED', 'CONFLICT');
      if (intent === 'reauth' && !ctx.body.purpose) throw identityError('IDENTITY_PURPOSE_REQUIRED');
      const state = token(), browser = token();
      const flow = { _id: store.fingerprint(state), kind: 'oauth', provider, intent, purpose: ctx.body.purpose || 'manage',
        userId: s?.user.id || '', sessionHash: s ? store.sessionKey(s) : '', browserHash: store.fingerprint(browser),
        verifier: token(), nonce: token(), redirectUri: `${config.authBaseUrl.replace(/\/$/, '')}/api/auth/identity/oauth/callback/${provider}`,
        createdAt: store.now(), expiresAt: store.expires(600) };
      await store.transaction(async (options) => {
        if (s) { await store.active(s.user.id, options, true); if (intent === 'bind') await store.proof(s, 'manage', options); }
        await store.challenges.insertOne(flow, options);
      });
      ctx.setCookie(cookieName(provider), browser, cookieOptions);
      return ctx.json({ url: authorizationUrl(provider, credentials, { ...flow, state }) });
    }),
    identityOAuthCallback: createAuthEndpoint('/identity/oauth/callback/:provider', { method: 'GET' }, async (ctx) => {
      ctx.setHeader('Cache-Control', 'no-store'); ctx.setHeader('Referrer-Policy', 'no-referrer');
      const destination = new URL(identity.returnUrl);
      let result = 'OAUTH_AUTHORIZATION_FAILED';
      try {
        const provider = providerSchema.parse(ctx.params.provider), query = new URL(ctx.request.url).searchParams;
        const state = query.get('state') || '', browser = ctx.getCookie(cookieName(provider)) || '';
        if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !browser) throw identityError('OAUTH_STATE_INVALID');
        const flow = await store.challenges.findOneAndDelete({ _id: store.fingerprint(state), kind: 'oauth', provider, browserHash: store.fingerprint(browser), expiresAt: { $gt: store.now() } });
        ctx.setCookie(cookieName(provider), '', { ...cookieOptions, maxAge: 0 });
        if (!flow) throw identityError('OAUTH_STATE_INVALID');
        const s = await getSessionFromCtx(ctx);
        if (flow.sessionHash !== (s ? store.sessionKey(s) : '') || flow.userId !== (s?.user.id || '')) throw identityError('IDENTITY_SESSION_CHANGED');
        if (query.has('error')) throw identityError(query.get('error') === 'access_denied' ? 'OAUTH_CANCELLED' : 'OAUTH_AUTHORIZATION_FAILED');
        const code = query.get('code') || '';
        if (!code || code.length > 4096 || !identity.oauth[provider]) throw identityError('OAUTH_AUTHORIZATION_FAILED');
        const profile = await exchangeIdentity(provider, identity.oauth[provider], flow, code);
        const userId = await store.oauthIdentity(provider, profile, flow, s);
        if (flow.intent === 'login') {
          const user = await ctx.context.internalAdapter.findUserById(userId);
          const authSession = await ctx.context.internalAdapter.createSession(userId);
          if (!authSession) throw identityError('ACCOUNT_LIFECYCLE_CLOSED');
          await setSessionCookie(ctx, { session: authSession, user });
          result = 'signed-in';
        } else if (flow.intent === 'reauth') { result = `verified-${flow.purpose}`; }
        else result = 'linked';
      } catch (error) {
        const code = error?.body?.code || error?.message;
        result = knownErrors.has(code) ? code : 'OAUTH_AUTHORIZATION_FAILED';
      }
      destination.searchParams.set('auth_result', result);
      // Only non-sensitive status is returned to the frontend; never tokens/codes.
      throw ctx.redirect(destination.toString());
    }),
  } };
}
