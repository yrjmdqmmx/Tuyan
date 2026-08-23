import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAccountEmailService,
  createDatabaseMailLimiter,
  createDirectMailTransport,
  emailFingerprint,
  renderAccountEmail,
} from '../src/email.js';

test('verification and reset templates are bilingual and contain only the supplied HTTPS action URL', () => {
  for (const type of ['verification', 'password-reset']) {
    const message = renderAccountEmail(type, 'https://www.paperbanana.asia/account/action?token=safe');
    assert.match(message.subject, /图研/);
    assert.match(message.htmlBody, /简体中文/);
    assert.match(message.htmlBody, /English/);
    assert.match(message.textBody, /https:\/\/www\.paperbanana\.asia/);
    assert.doesNotMatch(message.htmlBody, /<img|tracking-pixel|utm_/i);
  }
});

test('fingerprints are stable, normalized, and do not disclose the original value', () => {
  const first = emailFingerprint(' User@Example.com ', 'secret-at-least-32-bytes-long-value');
  const second = emailFingerprint('user@example.com', 'secret-at-least-32-bytes-long-value');
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.doesNotMatch(first, /user|example/);
});

test('mail service enforces database-backed email and IP windows before sending', async () => {
  const consumed = [];
  const sent = [];
  const logs = [];
  const service = createAccountEmailService({
    config: {
      deliveryEnabled: true,
      authBaseUrl: 'https://api.paperbanana.asia/',
      verificationCallbackUrl: 'https://www.paperbanana.asia/account/email-verified.html',
      resetPasswordUrl: 'https://www.paperbanana.asia/account/reset-password.html',
    },
    fingerprintSecret: 'secret-at-least-32-bytes-long-value',
    limiter: { async consume(input) { consumed.push(input); } },
    transport: { async send(input) { sent.push(input); return { requestId: 'provider-request-id' }; } },
    logger: { info(message, data) { logs.push([message, data]); } },
  });

  await service.sendVerification({
    email: 'User@Example.com',
    url: 'https://api.paperbanana.asia/api/auth/verify-email?token=top-secret',
    request: new Request('https://api.paperbanana.asia', { headers: { 'x-forwarded-for': '203.0.113.7' } }),
  });

  assert.equal(consumed.length, 2);
  assert.deepEqual(consumed.map((entry) => entry.kind), ['email', 'ip']);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].toAddress, 'user@example.com');
  assert.match(sent[0].htmlBody, /token=top-secret/);
  const serializedLogs = JSON.stringify(logs);
  assert.doesNotMatch(serializedLogs, /User@Example|user@example|top-secret/);
  assert.match(serializedLogs, /provider-request-id/);
});

test('disabled delivery never sends or consumes quota', async () => {
  let calls = 0;
  const service = createAccountEmailService({
    config: { deliveryEnabled: false },
    fingerprintSecret: 'secret-at-least-32-bytes-long-value',
    limiter: { async consume() { calls += 1; } },
    transport: { async send() { calls += 1; } },
  });
  await service.sendPasswordReset({ email: 'user@example.com', url: 'https://example.invalid/reset' });
  assert.equal(calls, 0);
});

test('DirectMail transport disables tracking and maps the provider request id', async () => {
  const calls = [];
  const transport = createDirectMailTransport({
    accountName: 'account@mail.paperbanana.asia',
    fromAlias: '图研 Tuyan',
  }, {
    async singleSendMail(request) {
      calls.push(request);
      return { body: { requestId: 'dm-request-id' } };
    },
  });

  assert.deepEqual(await transport.send({
    toAddress: 'person@example.com',
    subject: 'subject',
    htmlBody: '<p>body</p>',
    textBody: 'body',
  }), { requestId: 'dm-request-id' });
  assert.equal(calls[0].clickTrace, '0');
  assert.equal(calls[0].accountName, 'account@mail.paperbanana.asia');
  assert.equal(calls[0].toAddress, 'person@example.com');
});

test('provider failures are logged without addresses or tokens and rethrown as a stable error', async () => {
  const logs = [];
  const service = createAccountEmailService({
    config: {
      deliveryEnabled: true,
      authBaseUrl: 'https://api.paperbanana.asia/',
      verificationCallbackUrl: 'https://www.paperbanana.asia/account/email-verified.html',
      resetPasswordUrl: 'https://www.paperbanana.asia/account/reset-password.html',
    },
    fingerprintSecret: 'secret-at-least-32-bytes-long-value',
    limiter: { async consume() {} },
    transport: {
      async send() {
        const error = new Error('provider rejected user@example.com token=top-secret');
        error.code = 'ProviderRejected';
        error.data = { requestId: 'safe-provider-request-id' };
        throw error;
      },
    },
    logger: { warn(message, data) { logs.push([message, data]); } },
  });

  await assert.rejects(
    () => service.sendVerification({
      email: 'user@example.com',
      token: 'top-secret',
      request: new Request('https://api.paperbanana.asia'),
    }),
    (error) => error.statusCode === 503
      && error.body?.code === 'ACCOUNT_EMAIL_DELIVERY_FAILED'
      && !String(error.message).includes('user@example.com'),
  );
  const serializedLogs = JSON.stringify(logs);
  assert.match(serializedLogs, /safe-provider-request-id/);
  assert.match(serializedLogs, /ProviderRejected/);
  assert.doesNotMatch(serializedLogs, /user@example.com|top-secret/);
});

test('database mail quota returns a Better Auth 429 with retry metadata', async () => {
  const counts = new Map();
  const collection = {
    async createIndex() {},
    async findOneAndUpdate({ _id }) {
      const count = (counts.get(_id) || 0) + 1;
      counts.set(_id, count);
      return { _id, count };
    },
  };
  const limiter = createDatabaseMailLimiter({
    collection,
    secret: 'secret-at-least-32-bytes-long-value',
    windowSeconds: 900,
    windowMax: 1,
    dailyMax: 10,
    now: () => new Date('2026-08-23T00:00:00Z'),
  });
  await limiter.consume({ kind: 'email', value: 'user@example.com', template: 'verification' });
  await assert.rejects(
    () => limiter.consume({ kind: 'email', value: 'user@example.com', template: 'verification' }),
    (error) => error.statusCode === 429 && new Headers(error.headers).get('X-Retry-After') === '900',
  );
});
