import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const pkceChallenge = (verifier) => createHash('sha256').update(verifier).digest('base64url');

async function jsonRequest(url, options, fetchImpl) {
  const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('IDENTITY_PROVIDER_UNAVAILABLE');
  const text = await response.text();
  if (text.length > 1000000) throw new Error('IDENTITY_PROVIDER_UNAVAILABLE');
  return JSON.parse(text);
}

export function oauthAuthorizationUrl(provider, credentials, flow) {
  const url = new URL(provider === 'github' ? 'https://github.com/login/oauth/authorize' : 'https://accounts.google.com/o/oauth2/v2/auth');
  const params = { client_id: credentials.clientId, redirect_uri: flow.redirectUri, response_type: 'code', state: flow.state,
    code_challenge: pkceChallenge(flow.verifier), code_challenge_method: 'S256', scope: provider === 'github' ? 'read:user user:email' : 'openid email profile' };
  if (provider === 'google') { params.nonce = flow.nonce; params.prompt = 'select_account'; }
  else params.prompt = 'select_account';
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export async function exchangeOAuthIdentity(provider, credentials, flow, code, { fetchImpl = fetch, googleKeySet = googleKeys } = {}) {
  const tokenUrl = provider === 'github' ? 'https://github.com/login/oauth/access_token' : 'https://oauth2.googleapis.com/token';
  const token = await jsonRequest(tokenUrl, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, code, redirect_uri: flow.redirectUri, code_verifier: flow.verifier, grant_type: 'authorization_code' }) }, fetchImpl);
  if (token.error) throw new Error('OAUTH_AUTHORIZATION_FAILED');
  if (provider === 'google') {
    const { payload } = await jwtVerify(token.id_token, googleKeySet, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: credentials.clientId, algorithms: ['RS256'], maxTokenAge: '10m', requiredClaims: ['sub', 'exp', 'iat', 'nonce'] });
    if (payload.nonce !== flow.nonce || typeof payload.sub !== 'string' || !payload.sub || (payload.azp && payload.azp !== credentials.clientId)) throw new Error('OAUTH_AUTHORIZATION_FAILED');
    return { subject: payload.sub, name: String(payload.name || 'Google 用户'), email: String(payload.email || '').toLowerCase(), emailVerified: payload.email_verified === true };
  }
  if (!token.access_token) throw new Error('OAUTH_AUTHORIZATION_FAILED');
  const headers = { authorization: `Bearer ${token.access_token}`, accept: 'application/vnd.github+json', 'user-agent': 'Tuyan-Account', 'x-github-api-version': '2022-11-28' };
  const user = await jsonRequest('https://api.github.com/user', { headers }, fetchImpl);
  if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new Error('OAUTH_AUTHORIZATION_FAILED');
  const emails = await jsonRequest('https://api.github.com/user/emails', { headers }, fetchImpl);
  const primary = Array.isArray(emails) ? emails.find((item) => item.primary && item.verified) : null;
  return { subject: String(user.id), name: String(user.name || user.login || 'GitHub 用户'), email: String(primary?.email || '').toLowerCase(), emailVerified: Boolean(primary) };
  // Provider access/refresh/ID tokens are used only here and never persisted.
}
