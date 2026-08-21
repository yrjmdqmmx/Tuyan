const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://www.paperbanana.asia',
  'https://paperbanana.asia',
  'https://servicewechat.com',
  'https://developers.weixin.qq.com',
];
const REQUIRED_WECHAT_ORIGINS = [
  'https://servicewechat.com',
  'https://developers.weixin.qq.com',
];

export function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadGatewayConfig(env = process.env) {
  const nodeApiUrl = stringValue(env.PAPERBANANA_API_URL);
  const lafApiUrl = stringValue(env.LAF_API_URL);
  if (!nodeApiUrl && !lafApiUrl) {
    throw new Error('PAPERBANANA_API_URL or LAF_API_URL is required');
  }

  const backend = nodeApiUrl
    ? { mode: 'node', url: validHttpUrl('PAPERBANANA_API_URL', nodeApiUrl) }
    : { mode: 'laf', url: validHttpUrl('LAF_API_URL', lafApiUrl) };
  backend.timeoutMs = boundedInteger(env.PAPERBANANA_BACKEND_TIMEOUT_MS, 15_000, 100, 120_000);

  const guestSecret = required(env, 'PAPERBANANA_GUEST_COOKIE_SECRET');
  requireMinBytes('PAPERBANANA_GUEST_COOKIE_SECRET', guestSecret, 32);
  const previousGuestSecret = stringValue(env.PAPERBANANA_GUEST_COOKIE_SECRET_PREVIOUS);
  if (previousGuestSecret) {
    requireMinBytes('PAPERBANANA_GUEST_COOKIE_SECRET_PREVIOUS', previousGuestSecret, 32);
  }

  const production = env.NODE_ENV === 'production';
  const sameSite = stringValue(env.COOKIE_SAME_SITE).toLowerCase();
  if (sameSite && !['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none');
  }
  const adminUserIds = parseList(required(env, 'ADMIN_USER_IDS'));
  if (!adminUserIds.length) {
    throw new Error('ADMIN_USER_IDS must contain at least one immutable user ID');
  }
  if (adminUserIds.some((id) => !/^[A-Za-z0-9._:-]{3,200}$/.test(id))) {
    throw new Error('ADMIN_USER_IDS must contain immutable user IDs');
  }
  const configuredOrigins = parseList(env.FRONTEND_ORIGINS);
  const frontendOrigins = [
    ...new Set([
      ...(configuredOrigins.length ? configuredOrigins : DEFAULT_ORIGINS),
      ...REQUIRED_WECHAT_ORIGINS,
    ]),
  ];

  return {
    production,
    port: boundedInteger(env.PORT, 3005, 1, 65_535),
    listenHost: stringValue(env.HOST) || '0.0.0.0',
    authBaseUrl: validHttpUrl('AUTH_BASE_URL', required(env, 'AUTH_BASE_URL')),
    authSecret: required(env, 'BETTER_AUTH_SECRET'),
    mongoUri: required(env, 'MONGODB_URI'),
    mongoDbName: stringValue(env.MONGODB_DB) || 'paperbanana_auth',
    frontendOrigins,
    cookieDomain: stringValue(env.COOKIE_DOMAIN),
    cookieSameSite: sameSite || (production ? 'lax' : 'lax'),
    backend,
    gatewayToken: required(env, 'PAPERBANANA_GATEWAY_TOKEN'),
    adminToken: stringValue(env.ADMIN_TOKEN),
    adminUserIds: new Set(adminUserIds),
    guestCookie: {
      name: production ? '__Host-paperbanana_guest' : 'paperbanana_guest',
      secret: guestSecret,
      previousSecret: previousGuestSecret,
      ttlSeconds: 30 * 24 * 60 * 60,
      secure: production,
    },
    maintenance: {
      markerFile: stringValue(env.PAPERBANANA_MAINTENANCE_FILE) || '/opt/paperbanana/maintenance',
      retryAfterSeconds: boundedInteger(env.PAPERBANANA_MAINTENANCE_RETRY_AFTER_SECONDS, 300, 1, 86_400),
      env,
    },
    oss: {
      bucket: stringValue(env.PAPERBANANA_BUCKET),
      publicEndpoint: stringValue(env.OSS_PUBLIC_ENDPOINT),
      allowLegacyExternalRefineUrl: parseBoolean(env.PAPERBANANA_ALLOW_LEGACY_EXTERNAL_REFINE_URL),
    },
    trustProxy: 1,
  };
}

function required(env, name) {
  const value = stringValue(env[name]);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function stringValue(value) {
  return String(value || '').trim();
}

function requireMinBytes(name, value, size) {
  if (Buffer.byteLength(value, 'utf8') < size) {
    throw new Error(`${name} must be at least ${size} bytes`);
  }
}

function validHttpUrl(name, value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https`);
  }
  return parsed.toString();
}

function boundedInteger(value, fallback, min, max) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Expected integer between ${min} and ${max}`);
  }
  return parsed;
}

function parseBoolean(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}
