import assert from 'node:assert/strict';
import test from 'node:test';
import { identityRequest, identityMessage, readIdentityResult } from './identity.js';

test('identity requests use authenticated JSON without persisting credentials', async () => {
  let recorded;
  await identityRequest('reauth/password', { password: 'fixture', purpose: 'manage' }, 'https://api.test/', async (url, options) => { recorded = { url, options }; return Response.json({ verified: true }); });
  assert.equal(recorded.url, 'https://api.test/api/auth/identity/reauth/password'); assert.equal(recorded.options.credentials, 'include'); assert.equal(recorded.options.method, 'POST');
  assert.equal(JSON.parse(recorded.options.body).purpose, 'manage');
});
test('rate limits and conflicts have actionable localized errors', async () => {
  await assert.rejects(identityRequest('email/request', {}, '', async () => Response.json({ code: 'IDENTITY_RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '60' } })), (e) => e.retryAfterSeconds === 60 && /频繁/.test(e.message));
  assert.match(identityMessage('IDENTITY_EMAIL_CONFLICT'), /先用原账号/); assert.match(identityMessage('IDENTITY_LAST_METHOD'), /至少/);
});
test('callback status parser accepts only known non-sensitive outcomes', () => {
  assert.equal(readIdentityResult('?auth_result=verified-delete&code=ignored'), 'verified-delete');
  assert.equal(readIdentityResult('?auth_result=OAUTH_CANCELLED'), 'OAUTH_CANCELLED');
  assert.equal(readIdentityResult('?auth_result=arbitrary-secret'), '');
});
