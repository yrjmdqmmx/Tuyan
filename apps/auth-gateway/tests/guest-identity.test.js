import assert from 'node:assert/strict';
import test from 'node:test';

import { createGuestToken, readGuestIdentity, resolveGuestIdentity } from '../src/guest-identity.js';

const CURRENT = 'current-guest-cookie-secret-32-bytes-long';
const PREVIOUS = 'previous-guest-cookie-secret-32-bytes-long';
const NOW = 1_800_000_000;

function cookieConfig(overrides = {}) {
  return {
    name: '__Host-paperbanana_guest',
    secret: CURRENT,
    previousSecret: '',
    ttlSeconds: 30 * 24 * 60 * 60,
    secure: true,
    ...overrides,
  };
}

test('issues a 256-bit guest token and a production host-only cookie', () => {
  const identity = resolveGuestIdentity({
    cookieHeader: '',
    config: cookieConfig(),
    nowSeconds: NOW,
    randomBytes: () => Buffer.alloc(32, 7),
  });

  const [version, random, expires, signature] = identity.token.split('.');
  assert.equal(version, 'v1');
  assert.equal(Buffer.from(random, 'base64url').byteLength, 32);
  assert.equal(expires, String(NOW + 30 * 24 * 60 * 60));
  assert.ok(signature.length >= 43);
  assert.match(identity.owner, /^guest:[A-Za-z0-9_-]{43}$/);
  assert.match(identity.setCookie, /^__Host-paperbanana_guest=/);
  assert.match(identity.setCookie, /; Max-Age=2592000; Path=\/; HttpOnly; Secure; SameSite=Lax$/);
  assert.doesNotMatch(identity.setCookie, /Domain=/i);
});

test('reuses a valid current token without rotating the cookie', () => {
  const token = createGuestToken({
    random: Buffer.alloc(32, 8).toString('base64url'),
    expiresAt: NOW + 1000,
    secret: CURRENT,
  });
  const identity = resolveGuestIdentity({
    cookieHeader: `other=x; __Host-paperbanana_guest=${token}`,
    config: cookieConfig(),
    nowSeconds: NOW,
  });

  assert.equal(identity.token, token);
  assert.equal(identity.setCookie, '');
});

test('rejects a tampered token and issues a new identity', () => {
  const token = createGuestToken({
    random: Buffer.alloc(32, 8).toString('base64url'),
    expiresAt: NOW + 1000,
    secret: CURRENT,
  });
  const identity = resolveGuestIdentity({
    cookieHeader: `__Host-paperbanana_guest=${token.slice(0, -1)}x`,
    config: cookieConfig(),
    nowSeconds: NOW,
    randomBytes: () => Buffer.alloc(32, 9),
  });

  assert.notEqual(identity.token, token);
  assert.ok(identity.setCookie);
});

test('rejects an expired token', () => {
  const expired = createGuestToken({
    random: Buffer.alloc(32, 10).toString('base64url'),
    expiresAt: NOW - 1,
    secret: CURRENT,
  });
  const identity = resolveGuestIdentity({
    cookieHeader: `__Host-paperbanana_guest=${expired}`,
    config: cookieConfig(),
    nowSeconds: NOW,
    randomBytes: () => Buffer.alloc(32, 11),
  });

  assert.notEqual(identity.token, expired);
});

test('accepts the previous key, preserves owner, and rotates to the current key', () => {
  const random = Buffer.alloc(32, 12).toString('base64url');
  const oldToken = createGuestToken({ random, expiresAt: NOW + 1000, secret: PREVIOUS });
  const identity = resolveGuestIdentity({
    cookieHeader: `__Host-paperbanana_guest=${oldToken}`,
    config: cookieConfig({ previousSecret: PREVIOUS }),
    nowSeconds: NOW,
  });
  const currentIdentity = resolveGuestIdentity({
    cookieHeader: `__Host-paperbanana_guest=${identity.token}`,
    config: cookieConfig({ previousSecret: PREVIOUS }),
    nowSeconds: NOW,
  });

  assert.notEqual(identity.token, oldToken);
  assert.ok(identity.setCookie);
  assert.equal(identity.owner, currentIdentity.owner);
  assert.equal(currentIdentity.setCookie, '');
});

test('read-only guest lookup never creates a new identity', () => {
  assert.equal(
    readGuestIdentity({ cookieHeader: '', config: cookieConfig(), nowSeconds: NOW }),
    null,
  );
});

test('read-only lookup rotates a valid previous-key token without changing its owner', () => {
  const random = Buffer.alloc(32, 15).toString('base64url');
  const token = createGuestToken({ random, expiresAt: NOW + 1000, secret: PREVIOUS });
  const identity = readGuestIdentity({
    cookieHeader: `__Host-paperbanana_guest=${token}`,
    config: cookieConfig({ previousSecret: PREVIOUS }),
    nowSeconds: NOW,
  });

  assert.ok(identity.setCookie);
  assert.notEqual(identity.token, token);
  const current = readGuestIdentity({
    cookieHeader: `__Host-paperbanana_guest=${identity.token}`,
    config: cookieConfig({ previousSecret: PREVIOUS }),
    nowSeconds: NOW,
  });
  assert.equal(current.owner, identity.owner);
  assert.equal(current.setCookie, '');
});
