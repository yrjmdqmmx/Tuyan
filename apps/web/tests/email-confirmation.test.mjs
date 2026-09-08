import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { mountEmailConfirmation } from '../public/account/email-verify.js';

const html = fs.readFileSync(new URL('../public/account/email-verify.html', import.meta.url), 'utf8');
const token = 'a'.repeat(43);
function fixture(fetch, hash = `#token=${token}`) {
  const dom = new JSDOM(html, { url: `https://web.example.test/account/email-verify.html${hash}` });
  const { document, history } = dom.window;
  let destination;
  const location = { get hash() { return dom.window.location.hash; }, get href() { return dom.window.location.href; }, pathname: dom.window.location.pathname, replace(value) { destination = value; } };
  mountEmailConfirmation({ document, location, history, fetch, timeout: () => undefined });
  return { dom, document, destination: () => destination, submit: () => document.getElementById('verify-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })) };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('opening and previewing the confirmation page executes no verification request and clears the URL token', async () => {
  const f = fixture(() => assert.fail('page preview must never call verification'));
  assert.equal(f.dom.window.location.hash, '');
  assert.equal(f.document.getElementById('confirm-state').classList.contains('hidden'), false);
  for (const event of ['load', 'pageshow', 'focus', 'visibilitychange']) f.dom.window.dispatchEvent(new f.dom.window.Event(event));
  await settle();
  assert.equal(f.destination(), undefined);
  assert.equal(f.dom.window.localStorage.length, 0);
  assert.equal(f.dom.window.sessionStorage.length, 0);
  assert.equal(f.document.documentElement.outerHTML.includes(token), false);
  f.dom.window.close();
});

test('an explicit confirmation sends one credential-free POST and leaves a token-free result URL', async () => {
  const calls = [];
  let finish;
  const f = fixture((url, init) => { calls.push({ url, init }); return new Promise((resolve) => { finish = resolve; }); });
  f.submit(); f.submit();
  assert.equal(calls.length, 1, 'double click is ignored while pending');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.referrerPolicy, 'no-referrer');
  assert.deepEqual(JSON.parse(calls[0].init.body), { token });
  assert.equal(new URL(calls[0].url).search, '');
  finish(Response.json({ ok: true, code: 'EMAIL_VERIFIED' }));
  await settle();
  assert.equal(f.destination(), 'https://web.example.test/account/email-verified.html');
  f.submit(); assert.equal(calls.length, 1, 'the completed token is discarded');
  f.dom.window.close();
});

test('lost response never shows success or retries automatically; a manual retry can observe the committed receipt', async () => {
  let calls = 0;
  const f = fixture(async () => { if (++calls === 1) throw new Error('network timeout after commit'); return Response.json({ ok: true, code: 'TOKEN_USED' }); });
  f.submit(); await settle();
  assert.equal(f.destination(), undefined);
  assert.match(f.document.getElementById('message').textContent, /点击按钮重试/);
  assert.equal(calls, 1);
  f.submit(); await settle();
  assert.equal(calls, 2);
  assert.equal(new URL(f.destination()).searchParams.get('error'), 'TOKEN_USED');
  f.dom.window.close();
});

test('missing/invalid fragments never submit; expiry and service failures cannot claim success', async () => {
  for (const hash of ['', '#token=invalid']) {
    const f = fixture(() => assert.fail('invalid token must not submit'), hash);
    f.submit(); await settle();
    assert.equal(f.document.getElementById('invalid-state').classList.contains('hidden'), false);
    f.dom.window.close();
  }
  for (const [status, code, expected] of [[400, 'TOKEN_EXPIRED', 'TOKEN_EXPIRED'], [400, 'INVALID_TOKEN', 'INVALID_TOKEN'], [503, 'VERIFICATION_UNAVAILABLE', null], [200, 'UNKNOWN', null]]) {
    const f = fixture(async () => Response.json({ ok: status === 200, code }, { status }));
    f.submit(); await settle();
    assert.equal(f.destination() ? new URL(f.destination()).searchParams.get('error') : null, expected);
    if (!expected) assert.match(f.document.getElementById('message').textContent, /暂时无法确认/);
    f.dom.window.close();
  }
});
