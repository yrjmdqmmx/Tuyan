import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { loadIdentityConfig } from '../src/identity-config.js';
import { oauthAuthorizationUrl, exchangeOAuthIdentity, pkceChallenge } from '../src/identity-providers.js';
import { publicEmail } from '../src/identity-store.js';
const options = { production: true, frontendOrigins: ['https://www.paperbanana.asia'] };

test('providers are disabled by default; enabling requires a complete server credential pair', () => {
  assert.deepEqual(loadIdentityConfig({}, options).oauth, {});
  for (const provider of ['GITHUB', 'GOOGLE']) {
    const env = { [`AUTH_${provider}_ENABLED`]: 'true' };
    assert.throws(() => loadIdentityConfig(env, options), /CLIENT_ID/);
    env[`AUTH_${provider}_CLIENT_ID`] = 'fixture'; assert.throws(() => loadIdentityConfig(env, options), /CLIENT_SECRET/);
    env[`AUTH_${provider}_CLIENT_SECRET`] = 'fixture-server-only'; assert.ok(loadIdentityConfig(env, options).oauth[provider.toLowerCase()]);
  }
});
test('OAuth return URL must use a trusted origin with no userinfo or fragment', () => {
  for (const url of ['https://attacker.test/', 'https://user:password@www.paperbanana.asia/', 'https://www.paperbanana.asia/#token', 'http://www.paperbanana.asia/']) assert.throws(() => loadIdentityConfig({ AUTH_IDENTITY_RETURN_URL: url }, options));
});
test('authorization requests use fixed scopes, PKCE S256, state and Google nonce', () => {
  const flow = { redirectUri: 'https://api.paperbanana.asia/api/auth/identity/oauth/callback/google', verifier: 'local-fixture-verifier', state: 'local-state', nonce: 'local-nonce' };
  for (const provider of ['google', 'github']) {
    const url = new URL(oauthAuthorizationUrl(provider, { clientId: 'fixture', clientSecret: 'must-not-be-in-url' }, flow));
    assert.equal(url.searchParams.get('state'), flow.state); assert.equal(url.searchParams.get('code_challenge_method'), 'S256'); assert.equal(url.searchParams.get('code_challenge'), pkceChallenge(flow.verifier));
    assert.ok(!url.toString().includes('must-not-be-in-url')); assert.ok(!url.toString().includes(flow.verifier));
    assert.equal(url.searchParams.get('scope'), provider === 'github' ? 'read:user user:email' : 'openid email profile');
    if (provider === 'google') assert.equal(url.searchParams.get('nonce'), flow.nonce);
  }
});
test('GitHub stable numeric ID and verified primary email are used; token remains server-side', async () => {
  const seen = [];
  const identity = await exchangeOAuthIdentity('github', { clientId: 'fixture', clientSecret: 'server-secret' }, { redirectUri: 'https://api.test/cb', verifier: 'verifier' }, 'code', { fetchImpl: async (url, init) => {
    seen.push([url, init]);
    if (url.endsWith('access_token')) return Response.json({ access_token: 'provider-token' });
    if (url.endsWith('/emails')) return Response.json([{ primary: true, verified: false, email: 'unverified@example.test' }, { primary: false, verified: true, email: 'secondary@example.test' }]);
    return Response.json({ id: 123, login: 'fixture' });
  } });
  assert.deepEqual(identity, { subject: '123', name: 'fixture', email: '', emailVerified: false });
  assert.equal(seen[0][1].body.get('client_secret'), 'server-secret'); assert.equal(seen[0][1].body.get('code_verifier'), 'verifier');
  assert.equal(seen[1][1].headers.authorization, 'Bearer provider-token'); assert.equal(seen[0][1].redirect, 'error');
});
test('Google token requires signature, issuer, audience, expiry and nonce', async () => {
  const keys = await generateKeyPair('RS256'), otherKeys = await generateKeyPair('RS256');
  const jwk = await exportJWK(keys.publicKey); jwk.kid = 'fixture';
  const localKeys = createLocalJWKSet({ keys: [jwk] });
  async function signed(overrides = {}, signingKey = keys.privateKey) {
    return new SignJWT({ sub: 'google-sub', email: 'google@example.test', email_verified: false, nonce: 'nonce', ...overrides }).setProtectedHeader({ alg: 'RS256', kid: 'fixture' }).setIssuedAt().setIssuer(overrides.iss || 'https://accounts.google.com').setAudience(overrides.aud || 'client').setExpirationTime(overrides.exp || '5m').sign(signingKey);
  }
  const exchange = (idToken) => exchangeOAuthIdentity('google', { clientId: 'client', clientSecret: 'secret' }, { redirectUri: 'https://api.test/cb', verifier: 'verifier', nonce: 'nonce' }, 'code', { googleKeySet: localKeys, fetchImpl: async () => Response.json({ id_token: idToken }) });
  assert.equal((await exchange(await signed())).emailVerified, false);
  for (const overrides of [{ nonce: 'wrong' }, { iss: 'https://attacker.test' }, { aud: 'other-client' }, { exp: 1 }, { azp: 'other-client' }]) await assert.rejects(exchange(await signed(overrides)));
  await assert.rejects(exchange(await signed({}, otherKeys.privateKey)));
});
test('provider HTTP failures never produce an identity', async () => {
  await assert.rejects(exchangeOAuthIdentity('github', { clientId: 'client', clientSecret: 'secret' }, { redirectUri: 'https://api.test/cb', verifier: 'verifier' }, 'code', { fetchImpl: async () => Response.json({ error: 'unavailable' }, { status: 503 }) }));
});
test('internal email compatibility values are never presented as real contacts', () => {
  assert.equal(publicEmail('random@accounts.tuyan.invalid'), ''); assert.equal(publicEmail('user@example.test'), 'user@example.test'); assert.equal(publicEmail(null), '');
});
