import { createHash, createHmac, randomBytes as secureRandomBytes, timingSafeEqual } from 'node:crypto';

export function createGuestToken({ random, expiresAt, secret }) {
  const payload = `v1.${random}.${Math.trunc(expiresAt)}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function resolveGuestIdentity({
  cookieHeader,
  config,
  nowSeconds = Math.floor(Date.now() / 1000),
  randomBytes = secureRandomBytes,
}) {
  const currentToken = parseCookies(cookieHeader).get(config.name) || '';
  const current = verifyGuestToken(currentToken, config.secret, nowSeconds);
  if (current) return identity(current, currentToken, '');

  const previous = config.previousSecret
    ? verifyGuestToken(currentToken, config.previousSecret, nowSeconds)
    : null;
  if (previous) {
    const rotatedToken = createGuestToken({
      random: previous.random,
      expiresAt: previous.expiresAt,
      secret: config.secret,
    });
    return identity(previous, rotatedToken, serializeCookie(config, rotatedToken, previous.expiresAt - nowSeconds));
  }

  const random = randomBytes(32).toString('base64url');
  const expiresAt = nowSeconds + config.ttlSeconds;
  const token = createGuestToken({ random, expiresAt, secret: config.secret });
  return identity(
    { random, expiresAt },
    token,
    serializeCookie(config, token, config.ttlSeconds),
  );
}

export function readGuestIdentity({
  cookieHeader,
  config,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  const token = parseCookies(cookieHeader).get(config.name) || '';
  const current = verifyGuestToken(token, config.secret, nowSeconds);
  if (current) return identity(current, token, '');
  const previous = config.previousSecret
    ? verifyGuestToken(token, config.previousSecret, nowSeconds)
    : null;
  if (!previous) return null;
  const rotatedToken = createGuestToken({
    random: previous.random,
    expiresAt: previous.expiresAt,
    secret: config.secret,
  });
  return identity(
    previous,
    rotatedToken,
    serializeCookie(config, rotatedToken, previous.expiresAt - nowSeconds),
  );
}

export function verifyGuestToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = String(token || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const [, random, expiresText, signature] = parts;
  if (!/^[A-Za-z0-9_-]{43}$/.test(random)) return null;
  let randomBuffer;
  try {
    randomBuffer = Buffer.from(random, 'base64url');
  } catch {
    return null;
  }
  if (randomBuffer.byteLength !== 32 || randomBuffer.toString('base64url') !== random) return null;

  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowSeconds) return null;
  const expected = createHmac('sha256', secret)
    .update(`v1.${random}.${expiresAt}`)
    .digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.byteLength !== expected.byteLength || !timingSafeEqual(actual, expected)) return null;
  return { random, expiresAt };
}

function identity({ random, expiresAt }, token, setCookie) {
  const ownerHash = createHash('sha256').update(Buffer.from(random, 'base64url')).digest('base64url');
  return {
    owner: `guest:${ownerHash}`,
    random,
    expiresAt,
    token,
    setCookie,
  };
}

function parseCookies(header) {
  const values = new Map();
  for (const part of String(header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && !values.has(name)) values.set(name, value);
  }
  return values;
}

function serializeCookie(config, token, maxAge) {
  const attributes = [
    `${config.name}=${token}`,
    `Max-Age=${Math.max(0, Math.trunc(maxAge))}`,
    'Path=/',
    'HttpOnly',
  ];
  if (config.secure) attributes.push('Secure');
  attributes.push('SameSite=Lax');
  return attributes.join('; ');
}
