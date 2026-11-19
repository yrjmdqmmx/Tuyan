import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpsEventEmitter, loadOpsEventsConfig, opsEventArea, signOpsEvent, verifyOpsEvent } from '../src/ops-events.js';

const secret = 'fixture_ops_events_secret_'.padEnd(48, 'z');
const url = 'https://hooks.example.invalid/tuyan';
const clock = Date.parse('2026-11-18T12:00:00.000Z');
const quiet = { warn() {} };

function recorder(responses = []) {
  const calls = [];
  const fetchImpl = async (target, init) => {
    calls.push({ target: String(target), init });
    const next = responses.length ? responses.shift() : { ok: true, status: 200 };
    if (next instanceof Error) throw next;
    return { ok: next.ok, status: next.status, body: null };
  };
  return { calls, fetchImpl };
}

test('config is disabled by default and strict when enabled', () => {
  assert.deepEqual(loadOpsEventsConfig({}), { enabled: false });
  assert.deepEqual(loadOpsEventsConfig({ TUYAN_OPS_EVENTS_ENABLED: '1', TUYAN_OPS_EVENTS_URL: url, TUYAN_OPS_EVENTS_SECRET: secret }), { enabled: false });
  const ok = loadOpsEventsConfig({ TUYAN_OPS_EVENTS_ENABLED: 'true', TUYAN_OPS_EVENTS_URL: url, TUYAN_OPS_EVENTS_SECRET: secret });
  assert.deepEqual(ok, { enabled: true, url, secret, source: 'gateway' });
  for (const env of [
    { TUYAN_OPS_EVENTS_URL: 'http://hooks.example.invalid/x', TUYAN_OPS_EVENTS_SECRET: secret },
    { TUYAN_OPS_EVENTS_URL: 'https://user:pw@hooks.example.invalid/x', TUYAN_OPS_EVENTS_SECRET: secret },
    { TUYAN_OPS_EVENTS_URL: 'not a url', TUYAN_OPS_EVENTS_SECRET: secret },
    { TUYAN_OPS_EVENTS_URL: url, TUYAN_OPS_EVENTS_SECRET: 'short' },
    { TUYAN_OPS_EVENTS_URL: url, TUYAN_OPS_EVENTS_SECRET: secret, BETTER_AUTH_SECRET: secret },
    { TUYAN_OPS_EVENTS_URL: url, TUYAN_OPS_EVENTS_SECRET: secret, TUYAN_OPS_EVENTS_SOURCE: 'Bad Source' },
  ]) {
    assert.throws(() => loadOpsEventsConfig({ TUYAN_OPS_EVENTS_ENABLED: 'true', ...env }), /Invalid TUYAN_OPS_EVENTS/);
  }
  // Error messages never echo the secret.
  try { loadOpsEventsConfig({ TUYAN_OPS_EVENTS_ENABLED: 'true', TUYAN_OPS_EVENTS_URL: url, TUYAN_OPS_EVENTS_SECRET: secret, ADMIN_TOKEN: secret }); }
  catch (error) { assert.doesNotMatch(error.message, new RegExp(secret)); }
});

test('disabled emitter never calls the network', async () => {
  const { calls, fetchImpl } = recorder();
  const events = createOpsEventEmitter({ config: { enabled: false }, fetchImpl });
  events.emit('feedback.created', { feedbackId: 'feedback-1' });
  await events.idle();
  assert.equal(events.enabled, false);
  assert.equal(calls.length, 0);
});

test('feedback event is HMAC-signed, minimal and verifiable', async () => {
  const { calls, fetchImpl } = recorder();
  const events = createOpsEventEmitter({ config: { enabled: true, url, secret, source: 'hz' }, fetchImpl, nowMs: () => clock, newId: () => 'evt-1', logger: quiet });
  events.emit('feedback.created', { feedbackId: 'feedback-abc', message: 'PRIVATE_SENTINEL', contact: 'PRIVATE_SENTINEL' });
  await events.idle();
  assert.equal(calls.length, 1);
  const { target, init } = calls[0];
  assert.equal(target, url);
  assert.equal(init.method, 'POST');
  assert.equal(init.redirect, 'error');
  const body = JSON.parse(init.body);
  assert.deepEqual(body, { schemaVersion: 1, id: 'evt-1', type: 'feedback.created', level: 'info', occurredAt: '2026-11-18T12:00:00.000Z', source: 'hz', ref: 'feedback-abc' });
  assert.doesNotMatch(init.body, /PRIVATE_SENTINEL/);
  const timestamp = init.headers['x-tuyan-event-timestamp'];
  assert.equal(timestamp, String(clock / 1000));
  assert.equal(init.headers['x-tuyan-event-id'], 'evt-1');
  assert.equal(init.headers['x-tuyan-event-signature'], signOpsEvent(secret, timestamp, init.body));
  assert.ok(verifyOpsEvent(secret, { timestamp, signature: init.headers['x-tuyan-event-signature'], body: init.body }, clock));
  assert.ok(!verifyOpsEvent(secret, { timestamp, signature: init.headers['x-tuyan-event-signature'], body: init.body.replace('abc', 'abd') }, clock));
  assert.ok(!verifyOpsEvent('other'.padEnd(40, 'x'), { timestamp, signature: init.headers['x-tuyan-event-signature'], body: init.body }, clock));
  assert.ok(!verifyOpsEvent(secret, { timestamp, signature: init.headers['x-tuyan-event-signature'], body: init.body }, clock + 301_000));
  assert.ok(!JSON.stringify(init.headers).includes(secret));
});

test('invalid ids and unknown types are dropped; errors are sanitized and fingerprinted', async () => {
  const { calls, fetchImpl } = recorder();
  const events = createOpsEventEmitter({ config: { enabled: true, url, secret, source: 'gateway' }, fetchImpl, nowMs: () => clock, logger: quiet });
  events.emit('feedback.created', { feedbackId: 'not-a-feedback-id' });
  events.emit('user.deleted', { feedbackId: 'feedback-1' });
  events.emit('error.captured', { status: 502, code: 'stack: PRIVATE_SENTINEL', area: '/paperbanana-api?token=PRIVATE_SENTINEL' });
  await events.idle();
  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.type, 'error.captured');
  assert.equal(body.level, 'error');
  assert.equal(body.status, 502);
  assert.equal(body.code, 'REQUEST_FAILED');
  assert.equal(body.area, 'other');
  assert.match(body.fingerprint, /^[0-9a-f]{16}$/);
  assert.doesNotMatch(calls[0].init.body, /PRIVATE_SENTINEL/);
});

test('dedupe, storm limit and suppressed counter', async () => {
  let now = clock;
  const { calls, fetchImpl } = recorder();
  const events = createOpsEventEmitter({ config: { enabled: true, url, secret, source: 'gateway' }, fetchImpl, nowMs: () => now, logger: quiet,
    limits: { maxPerWindow: 2, windowMs: 60_000, dedupeMs: 60_000 } });
  for (let i = 0; i < 5; i++) events.emit('error.captured', { status: 500, code: 'CORE_DOWN', area: 'api' }); // 1 sent, 4 deduped
  events.emit('feedback.created', { feedbackId: 'feedback-a' });
  events.emit('feedback.created', { feedbackId: 'feedback-a' }); // duplicate id
  events.emit('feedback.created', { feedbackId: 'feedback-b' }); // over storm limit
  await events.idle();
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[1].init.body).suppressedSincePrevious, 4);
  now += 61_000;
  events.emit('feedback.created', { feedbackId: 'feedback-c' });
  await events.idle();
  assert.equal(calls.length, 3);
  assert.equal(JSON.parse(calls[2].init.body).suppressedSincePrevious, 2);
});

test('bounded retries on network/5xx/429, no retry on other 4xx, never throws', async () => {
  const sleeps = [];
  const options = { config: { enabled: true, url, secret, source: 'gateway' }, nowMs: () => clock, logger: quiet, random: () => 0.5, sleep: async ms => { sleeps.push(ms); } };
  let r = recorder([new Error('ECONNRESET'), { ok: false, status: 503 }, { ok: true, status: 204 }]);
  let events = createOpsEventEmitter({ ...options, fetchImpl: r.fetchImpl });
  events.emit('feedback.created', { feedbackId: 'feedback-1' });
  await events.idle();
  assert.equal(r.calls.length, 3);
  assert.deepEqual(sleeps, [1000, 4000]);
  r = recorder([{ ok: false, status: 401 }]);
  events = createOpsEventEmitter({ ...options, fetchImpl: r.fetchImpl });
  events.emit('feedback.created', { feedbackId: 'feedback-2' });
  await events.idle();
  assert.equal(r.calls.length, 1);
  r = recorder([new Error('a'), new Error('b'), new Error('c'), new Error('d')]);
  events = createOpsEventEmitter({ ...options, fetchImpl: r.fetchImpl });
  events.emit('feedback.created', { feedbackId: 'feedback-3' });
  await events.idle();
  assert.equal(r.calls.length, 3);
  events = createOpsEventEmitter({ ...options, fetchImpl: () => { throw new Error('sync'); } });
  assert.doesNotThrow(() => events.emit('feedback.created', { feedbackId: 'feedback-4' }));
  await events.idle();
});

test('error area keeps only coarse, non-identifying route names', () => {
  assert.equal(opsEventArea('/paperbanana-api', 'createJob'), 'paperbanana-api.createJob');
  assert.equal(opsEventArea('/paperbanana-api', 'x'.repeat(41)), 'paperbanana-api');
  assert.equal(opsEventArea('/paperbanana-api', 'drop table'), 'paperbanana-api');
  assert.equal(opsEventArea('/api/workspace/123e4567/items'), 'api.workspace');
  assert.equal(opsEventArea('/api/Workspace'), 'api');
  assert.equal(opsEventArea('/'), 'root');
  assert.equal(opsEventArea('/user@example.com/x'), 'other');
});
