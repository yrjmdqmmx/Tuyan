import assert from 'node:assert/strict';
import test from 'node:test';

import { loadGatewayConfig } from '../src/config.js';

function validEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    AUTH_BASE_URL: 'https://api.paperbanana.asia',
    BETTER_AUTH_SECRET: 'better-auth-secret-with-at-least-32-bytes',
    MONGODB_URI: 'mongodb://mongo:27017/paperbanana_auth',
    PAPERBANANA_API_URL: 'http://paperbanana-api:3006/paperbanana-api',
    PAPERBANANA_GATEWAY_TOKEN: 'gateway-token',
    PAPERBANANA_GUEST_COOKIE_SECRET: 'guest-cookie-secret-with-at-least-32-bytes',
    ADMIN_USER_IDS: 'admin-id',
    ...overrides,
  };
}

test('requires an explicit backend URL', () => {
  assert.throws(
    () => loadGatewayConfig(validEnv({ PAPERBANANA_API_URL: '', LAF_API_URL: '' })),
    /PAPERBANANA_API_URL or LAF_API_URL is required/,
  );
});

test('prefers the Node API when both backend URLs are configured', () => {
  const config = loadGatewayConfig(validEnv({ LAF_API_URL: 'https://legacy.example/paperbanana-api' }));

  assert.equal(config.backend.mode, 'node');
  assert.equal(config.backend.url, 'http://paperbanana-api:3006/paperbanana-api');
});

test('uses Laf only as an explicit rollback backend', () => {
  const config = loadGatewayConfig(
    validEnv({ PAPERBANANA_API_URL: '', LAF_API_URL: 'https://legacy.example/paperbanana-api' }),
  );

  assert.equal(config.backend.mode, 'laf');
  assert.equal(config.backend.url, 'https://legacy.example/paperbanana-api');
});

test('rejects a missing shared gateway token', () => {
  assert.throws(
    () => loadGatewayConfig(validEnv({ PAPERBANANA_GATEWAY_TOKEN: '   ' })),
    /PAPERBANANA_GATEWAY_TOKEN is required/,
  );
});

test('requires a 32-byte guest cookie secret', () => {
  assert.throws(
    () => loadGatewayConfig(validEnv({ PAPERBANANA_GUEST_COOKIE_SECRET: 'too-short' })),
    /PAPERBANANA_GUEST_COOKIE_SECRET must be at least 32 bytes/,
  );
});

test('validates the previous guest cookie secret when configured', () => {
  assert.throws(
    () => loadGatewayConfig(validEnv({ PAPERBANANA_GUEST_COOKIE_SECRET_PREVIOUS: 'too-short' })),
    /PAPERBANANA_GUEST_COOKIE_SECRET_PREVIOUS must be at least 32 bytes/,
  );
});

test('parses bounded timeouts and the single trusted ingress hop', () => {
  const config = loadGatewayConfig(validEnv({ PAPERBANANA_BACKEND_TIMEOUT_MS: '2500' }));

  assert.equal(config.backend.timeoutMs, 2500);
  assert.equal(config.trustProxy, 1);
  assert.equal(config.listenHost, '0.0.0.0');
});

test('requires immutable admin user IDs and rejects email-shaped values', () => {
  assert.throws(
    () => loadGatewayConfig(validEnv({ ADMIN_USER_IDS: '' })),
    /ADMIN_USER_IDS is required/,
  );
  assert.throws(
    () => loadGatewayConfig(validEnv({ ADMIN_USER_IDS: 'owner@example.com' })),
    /ADMIN_USER_IDS must contain immutable user IDs/,
  );
  assert.throws(
    () => loadGatewayConfig(validEnv({ ADMIN_USER_IDS: ',,,' })),
    /ADMIN_USER_IDS must contain at least one immutable user ID/,
  );

  const config = loadGatewayConfig(validEnv({ ADMIN_USER_IDS: 'admin-1,admin-2,admin-1' }));
  assert.deepEqual([...config.adminUserIds], ['admin-1', 'admin-2']);
  assert.equal(config.adminEmails, undefined);
});

test('default origins include exact WeChat runtime and developer tool origins', () => {
  const config = loadGatewayConfig(validEnv());

  assert.deepEqual(config.frontendOrigins, [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://www.paperbanana.asia',
    'https://paperbanana.asia',
    'https://servicewechat.com',
    'https://developers.weixin.qq.com',
  ]);
});

test('explicit legacy Web origins cannot omit required WeChat origins', () => {
  const config = loadGatewayConfig(
    validEnv({
      FRONTEND_ORIGINS: 'https://www.paperbanana.asia,https://paperbanana.asia',
    }),
  );

  assert.deepEqual(config.frontendOrigins, [
    'https://www.paperbanana.asia',
    'https://paperbanana.asia',
    'https://servicewechat.com',
    'https://developers.weixin.qq.com',
  ]);
});

test('email security defaults are fail-safe and use fixed HTTPS account pages', () => {
  const config = loadGatewayConfig(validEnv());

  assert.deepEqual(config.authEmail, {
    deliveryEnabled: false,
    requireVerification: false,
    verificationCallbackUrl: 'https://www.paperbanana.asia/account/email-verified.html',
    resetPasswordUrl: 'https://www.paperbanana.asia/account/reset-password.html',
    windowSeconds: 900,
    windowMax: 3,
    dailyMax: 10,
    directMail: null,
  });
});

test('email delivery requires dedicated DirectMail credentials and approved callback origins', () => {
  assert.throws(
    () => loadGatewayConfig(validEnv({ AUTH_REQUIRE_EMAIL_VERIFICATION: 'true' })),
    /AUTH_EMAIL_DELIVERY_ENABLED must be enabled/,
  );
  assert.throws(
    () => loadGatewayConfig(validEnv({ AUTH_EMAIL_DELIVERY_ENABLED: 'true' })),
    /ALIBABA_DIRECTMAIL_ACCESS_KEY_ID is required/,
  );
  assert.throws(
    () => loadGatewayConfig(validEnv({
      AUTH_EMAIL_DELIVERY_ENABLED: 'true',
      ALIBABA_DIRECTMAIL_ACCESS_KEY_ID: 'dedicated-id',
      ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET: 'dedicated-secret',
      ALIBABA_DIRECTMAIL_ENDPOINT: 'dm.example.invalid',
      AUTH_VERIFICATION_CALLBACK_URL: 'http://paperbanana.asia/account/email-verified.html',
    })),
    /AUTH_VERIFICATION_CALLBACK_URL must use https/,
  );
  assert.throws(
    () => loadGatewayConfig(validEnv({
      AUTH_EMAIL_DELIVERY_ENABLED: 'true',
      ALIBABA_DIRECTMAIL_ACCESS_KEY_ID: 'dedicated-id',
      ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET: 'dedicated-secret',
      ALIBABA_DIRECTMAIL_ENDPOINT: 'dm.example.invalid',
      AUTH_PASSWORD_RESET_URL: 'https://evil.example/reset',
    })),
    /AUTH_PASSWORD_RESET_URL must use paperbanana.asia/,
  );
});

test('email delivery defaults to the Hangzhou DirectMail API and remains bounded', () => {
  const config = loadGatewayConfig(validEnv({
    AUTH_EMAIL_DELIVERY_ENABLED: 'true',
    AUTH_REQUIRE_EMAIL_VERIFICATION: 'true',
    ALIBABA_DIRECTMAIL_ACCESS_KEY_ID: 'dedicated-id',
    ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET: 'dedicated-secret',
    ALIBABA_DIRECTMAIL_ACCOUNT_NAME: 'account@mail.paperbanana.asia',
    ALIBABA_DIRECTMAIL_FROM_ALIAS: '图研 Tuyan',
    AUTH_EMAIL_WINDOW_MAX: '4',
    AUTH_EMAIL_DAILY_MAX: '12',
  }));

  assert.equal(config.authEmail.deliveryEnabled, true);
  assert.equal(config.authEmail.requireVerification, true);
  assert.equal(config.authEmail.windowMax, 4);
  assert.equal(config.authEmail.dailyMax, 12);
  assert.deepEqual(config.authEmail.directMail, {
    accessKeyId: 'dedicated-id',
    accessKeySecret: 'dedicated-secret',
    endpoint: 'dm.aliyuncs.com',
    regionId: 'cn-hangzhou',
    accountName: 'account@mail.paperbanana.asia',
    fromAlias: '图研 Tuyan',
  });
});
