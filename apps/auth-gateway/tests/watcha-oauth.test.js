import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { exchangeWatchaIdentity, watchaAuthorizationUrl, renderWatchaCodeEmail } from '../src/watcha-oauth.js';
import { redactText } from '../src/redaction.js';

const settings = { clientId: 'fixture +&=', clientSecret: 'fixture-secret +&=', scopes: 'read email', redirectUri: 'https://api.example.test/api/auth/oauth2/callback/watcha' };
const token = { access_token: 'fixture-access', token_type: 'Bearer', scope: 'read email', expires_in: 1800 };
const user = { statusCode: 200, data: { user_id: 21, nickname: '猹' } };
const identity = (tokenResponse = token, userResponse = user) => exchangeWatchaIdentity(settings, 'a+&= code', 'verifier', async (url) => Response.json(url.endsWith('/token') ? tokenResponse : userResponse));

test('Watcha authorization uses fixed endpoint, URL encoding and S256', () => {
  const url = new URL(watchaAuthorizationUrl(settings, 'state', 'verifier'));
  assert.equal(url.origin + url.pathname, 'https://watcha.cn/oauth/authorize');
  assert.equal(url.searchParams.get('client_id'), settings.clientId);
  assert.equal(url.searchParams.get('redirect_uri'), settings.redirectUri);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('code_challenge'), createHash('sha256').update('verifier').digest('base64url'));
  assert.equal(url.searchParams.has('client_secret'), false);
});

test('Watcha exchange uses form encoding, Bearer userinfo and missing upstream email', async () => {
  let count = 0;
  const result = await exchangeWatchaIdentity(settings, 'a+&= code', 'verifier', async (url, init) => {
    count += 1; assert.equal(init.redirect, 'error'); assert.ok(init.signal);
    if (url.endsWith('/token')) {
      assert.equal(init.method, 'POST'); assert.equal(init.headers['content-type'], 'application/x-www-form-urlencoded');
      const body = new URLSearchParams(init.body); assert.equal(body.get('client_secret'), settings.clientSecret);
      assert.equal(body.get('code'), 'a+&= code'); assert.equal(body.get('code_verifier'), 'verifier'); assert.equal(body.get('redirect_uri'), settings.redirectUri);
      return Response.json(token);
    }
    assert.equal(url, 'https://watcha.cn/oauth/api/userinfo'); assert.equal(init.method, 'GET'); assert.equal(init.headers.authorization, 'Bearer fixture-access');
    assert.equal(init.body, undefined); return Response.json(user);
  });
  assert.equal(count, 2); assert.deepEqual(result, { accountId: '21', nickname: '猹' });
});

test('userinfo requires business success and safe positive integer with bounded nickname', async () => {
  for (const invalid of [{ statusCode: 401, data: user.data }, user.data, { statusCode: 200, data: { ...user.data, user_id: '21' } },
    ...[-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1].map((user_id) => ({ statusCode: 200, data: { ...user.data, user_id } })),
    { statusCode: 200, data: { ...user.data, nickname: 'x'.repeat(101) } }]) await assert.rejects(identity(token, invalid));
  assert.deepEqual(await identity({ ...token, scope: 'read' }), { accountId: '21', nickname: '猹' });
});

test('token and response limits reject malformed permissions, business errors, oversized and redirects', async () => {
  for (const invalid of [{ ...token, scope: 'email' }, { ...token, scope: 'read admin' }, { ...token, scope: undefined },
    { ...token, token_type: 'Basic' }, { ...token, access_token: 'a\r\nb' }, { error: 'bad', ...token }]) await assert.rejects(identity(invalid));
  for (const response of [() => new Response('bad json'), () => new Response('x'.repeat(65537)), () => Response.json({}, { status: 401 }),
    () => new Response('x', { headers: { 'content-length': '65537' } })]) {
    await assert.rejects(exchangeWatchaIdentity(settings, 'code', 'verifier', async () => response()));
  }
});

test('security email has purpose and five-minute expiry; redaction hides OAuth and confirmation material', () => {
  const mail = renderWatchaCodeEmail({ code: '123456', purpose: 'delete' });
  assert.match(mail.textBody, /注销图研账号/); assert.match(mail.textBody, /5 分钟/);
  const values = { code: '123456', state: 'fixture-state', code_verifier: 'fixture-verifier', client_secret: 'fixture-client-secret', confirmationToken: 'fixture-confirmation' };
  for (const input of [JSON.stringify(values), '?code=123456&state=fixture-state&confirmationToken=fixture-confirmation', "confirmationToken: 'fixture-confirmation'"]) {
    const redacted = redactText(input);
    for (const value of Object.values(values)) assert.equal(redacted.includes(value), false);
  }
});
