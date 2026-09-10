import assert from 'node:assert/strict';
import { createWatchaFixture } from './watcha-fixture.mjs';

let clock = new Date();
const fixture = await createWatchaFixture({ uri: process.env.WATCHA_TEST_MONGO_URI, now: () => clock });
const { origin, db, mail } = fixture;
const nativeHeaders = { origin: '', referer: 'https://servicewechat.com/wxfb85c471df3d9022/10/page-frame.html' };
function client(native = false) {
  const cookies = new Map();
  return {
    cookies,
    async request(path, body, extra = {}) {
      const response = await fetch(`${origin}/api/auth/${path}`, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
        headers: { origin, 'content-type': 'application/json', cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(native ? nativeHeaders : {}), ...extra },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      for (const line of response.headers.getSetCookie()) { const [name, ...rest] = line.split(';')[0].split('='); const value = rest.join('='); if (value) cookies.set(name, value); else cookies.delete(name); }
      return response;
    },
    async json(path, body, extra) { const response = await this.request(path, body, extra); return { status: response.status, data: await response.json() }; },
  };
}
async function launch(mini, browser, intent = 'login') {
  const started = await mini.json('watcha/mini-start', { intent });
  assert.equal(started.status, 200);
  const url = new URL(started.data.url); assert.equal(url.origin, origin);
  const launched = await browser.request(url.pathname.replace('/api/auth/', '') + url.search);
  assert.equal(launched.status, 302);
  const oauth = new URL(launched.headers.get('location'));
  assert.equal(oauth.origin, 'https://watcha.cn'); assert.equal(oauth.searchParams.get('code_challenge_method'), 'S256');
  return oauth.searchParams.get('state');
}
async function callback(browser, state, identity) {
  const response = await browser.request(`oauth2/callback/watcha?state=${state}&code=${identity}`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const html = await response.text();
  assert.doesNotMatch(html, /fixture-secret|Bearer fixture/);
  return html.match(/value="([A-Za-z0-9_-]{43})"/)?.[1];
}
async function emailCode(mini, purpose, email) {
  assert.equal((await mini.json('watcha/email-code', { purpose, email })).status, 200);
  return mail.at(-1).textBody.match(/验证码：(\d{6})/)[1];
}
async function existing(mini, email) {
  assert.equal((await mini.json('sign-up/email', { email, password: 'fixture-password-long', name: 'Fixture' })).status, 200);
  await db.collection('user').updateOne({ email }, { $set: { emailVerified: true } });
  const response = await mini.json('sign-in/email', { email, password: 'fixture-password-long' }); assert.equal(response.status, 200); return response.data.user.id;
}
try {
  const mini = client(true), browser = client(), stranger = client(true);
  const status = await mini.json('watcha/mini-status'); assert.equal(status.data.miniProgramSupported, true);
  assert.equal((await mini.json('watcha/mini-start', { intent: 'login' }, { origin: '', referer: 'https://servicewechat.com/wxOTHER/10/page-frame.html' })).status, 403);
  assert.equal((await mini.json('watcha/start', { intent: 'login', returnOrigin: 'https://servicewechat.com' })).status, 403);
  const state = await launch(mini, browser);
  const grant = await callback(browser, state, 81001); assert.ok(grant);
  assert.equal((await browser.json('get-session')).data, null);
  assert.equal((await mini.json('get-session')).data, null);
  assert.equal((await mini.json('watcha/mini-status')).data.pending, null);
  assert.equal((await stranger.json('watcha/mini-exchange', { code: grant })).status, 400);
  assert.equal((await mini.json('watcha/mini-exchange', { code: grant })).data.status, 'pending');
  assert.equal((await mini.json('watcha/mini-exchange', { code: grant })).status, 400);
  let code = await emailCode(mini, 'signup', 'native-new@example.test');
  assert.equal((await mini.json('watcha/complete', { email: 'native-new@example.test', code })).status, 200);
  const userId = (await mini.json('get-session')).data.user.id;
  assert.equal((await mini.json('watcha/mini-status')).data.hasPassword, false);
  console.log('PASS native Origin/Referer, browser/client isolation, two-proof exchange, replay, verified passwordless signup');

  const returning = client(true), ambient = client();
  const ambientId = await existing(ambient, 'ambient@example.test');
  const returnGrant = await callback(ambient, await launch(returning, ambient), 81001);
  assert.equal((await ambient.json('get-session')).data.user.id, ambientId);
  const races = await Promise.all([returning.json('watcha/mini-exchange', { code: returnGrant }), returning.json('watcha/mini-exchange', { code: returnGrant })]);
  assert.equal(races.filter(r => r.status === 200).length, 1);
  assert.equal((await returning.json('get-session')).data.user.id, userId);
  console.log('PASS returning login preserves original ID, ambient browser login untouched, concurrent exchange only once');

  const owner = client(true), targetId = await existing(owner, 'native-owner@example.test');
  const target = client(true), external = client();
  const newGrant = await callback(external, await launch(target, external), 81002);
  await target.json('watcha/mini-exchange', { code: newGrant });
  code = await emailCode(target, 'signup', 'native-owner@example.test');
  assert.equal((await target.json('watcha/complete', { email: 'native-owner@example.test', code })).data.code, 'WATCHA_EXISTING_ACCOUNT');
  assert.equal((await target.json('sign-in/email', { email: 'native-owner@example.test', password: 'fixture-password-long' })).status, 200);
  assert.equal((await target.json('watcha/link', {})).status, 200);
  assert.equal((await target.json('get-session')).data.user.id, targetId);
  code = await emailCode(target, 'unlink');
  assert.equal((await target.json('watcha/unlink', { code })).status, 200);
  console.log('PASS existing email requires explicit sign-in/link; native email-code unlink preserves original user');

  const bound = client(), linkGrant = await callback(bound, await launch(target, bound, 'link'), 81003);
  await target.json('sign-out', {});
  await target.json('sign-in/email', { email: 'native-owner@example.test', password: 'fixture-password-long' });
  assert.equal((await target.json('watcha/mini-exchange', { code: linkGrant })).data.code, 'WATCHA_ACCOUNT_CHANGED');
  const finalGrant = await callback(bound, await launch(target, bound, 'link'), 81003);
  assert.equal((await target.json('watcha/mini-exchange', { code: finalGrant })).data.status, 'pending');
  await target.json('sign-out', {});
  await target.json('sign-in/email', { email: 'native-owner@example.test', password: 'fixture-password-long' });
  assert.equal((await target.json('watcha/link', {})).data.code, 'WATCHA_ACCOUNT_CHANGED');
  assert.equal((await target.json('watcha/mini-status')).data.linked, false);
  console.log('PASS link exchange and final confirmation bind the initiating session, including A-B-A re-login');

  const canceled = client(true), cancelBrowser = client();
  const canceledState = await launch(canceled, cancelBrowser);
  assert.equal((await canceled.json('watcha/mini-cancel', {})).status, 200);
  assert.equal(await callback(cancelBrowser, canceledState, 81004), undefined);
  const stale = client(true), staleBrowser = client();
  const staleGrant = await callback(staleBrowser, await launch(stale, staleBrowser), 81005);
  clock = new Date(clock.getTime() + 11 * 60_000);
  assert.equal((await stale.json('watcha/mini-exchange', { code: staleGrant })).status, 400);
  console.log('PASS cancellation invalidates in-flight browser handoff; expired codes cannot create sessions');

  const restored = client(true), restoredBrowser = client();
  const beforeRestore = await callback(restoredBrowser, await launch(restored, restoredBrowser), 81001);
  await db.collection('accountDeletionOperationHistory').insertOne({ userId, closedAt: clock });
  assert.equal((await restored.json('watcha/mini-exchange', { code: beforeRestore })).data.code, 'WATCHA_ACCOUNT_CHANGED');
  assert.equal((await restored.json('get-session')).data, null);
  console.log('PASS identity completion pins the original account lifecycle generation across restoration');

  code = await emailCode(mini, 'unlink');
  assert.equal((await mini.json('watcha/unlink', { code })).data.code, 'WATCHA_LAST_LOGIN_METHOD');
  code = await emailCode(mini, 'delete');
  const confirmation = await mini.json('watcha/delete-confirmation', { code }); assert.equal(confirmation.status, 200);
  assert.equal((await returning.json('watcha/delete-confirmation', { code })).status, 400);
  const session = (await mini.json('get-session')).data;
  assert.equal(await fixture.runtime.consumeDeletionConfirmation({ confirmationToken: confirmation.data.confirmationToken, session }), true);
  assert.equal(await fixture.runtime.consumeDeletionConfirmation({ confirmationToken: confirmation.data.confirmationToken, session }), false);
  console.log('PASS last-login protection and session-bound one-use passwordless deletion confirmation over native API');
} finally { await fixture.close(); }
