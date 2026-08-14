export function ownerFields(job) {
  return {
    userId: String(job?.userId || job?.user_id || '').trim(),
    userEmail: String(job?.userEmail || job?.user_email || '').trim().toLowerCase(),
  };
}

export function authorizeJobOwner(job, principal = {}) {
  if (principal.isAdmin) return true;
  const owner = ownerFields(job);
  if (!owner.userId && !owner.userEmail) return false;

  const accountId = String(principal.userId || '').trim();
  const accountEmail = String(principal.email || '').trim().toLowerCase();
  const guestOwner = String(principal.guestOwner || '').trim();
  if (accountId && owner.userId === accountId) return true;
  if (accountEmail && owner.userEmail === accountEmail) return true;
  return Boolean(guestOwner && owner.userId === guestOwner);
}

export function normalizeRefineSource(body = {}, config = {}) {
  const explicitKey = String(body.sourceImageObjectKey || '').trim();
  if (explicitKey) return normalizedObjectKey(explicitKey);

  const rawUrl = String(body.sourceImageUrl || '').trim();
  if (!rawUrl) throw forbidden();
  const signedKey = objectKeyFromSignedOssUrl(rawUrl, config);
  if (signedKey) return normalizedObjectKey(signedKey);

  if (config.backendMode === 'laf' && config.allowLegacyExternalUrl) {
    return {
      objectKey: '',
      jobId: '',
      payload: { sourceImageUrl: rawUrl },
      legacyExternal: true,
    };
  }
  throw forbidden();
}

function normalizedObjectKey(value) {
  let objectKey;
  try {
    objectKey = decodeURIComponent(value);
  } catch {
    throw forbidden();
  }
  if (
    objectKey !== value ||
    objectKey.startsWith('/') ||
    objectKey.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(objectKey)
  ) {
    throw forbidden();
  }
  const parts = objectKey.split('/');
  if (
    parts.length < 2 ||
    parts.some((part) => !part || part === '.' || part === '..') ||
    !/^[A-Za-z0-9._-]+$/.test(parts[0]) ||
    parts[0] === 'references'
  ) {
    throw forbidden();
  }
  return {
    objectKey,
    jobId: parts[0],
    payload: { sourceImageObjectKey: objectKey },
  };
}

function objectKeyFromSignedOssUrl(value, config) {
  if (!config.bucket || !config.publicEndpoint) return '';
  let url;
  let endpoint;
  try {
    url = new URL(value);
    endpoint = new URL(config.publicEndpoint);
  } catch {
    return '';
  }
  const expectedHost = `${String(config.bucket).toLowerCase()}.${endpoint.hostname.toLowerCase()}`;
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== expectedHost) return '';
  if (
    !url.searchParams.get('x-oss-signature-version') ||
    !url.searchParams.get('x-oss-credential') ||
    !url.searchParams.get('x-oss-expires') ||
    !url.searchParams.get('x-oss-signature')
  ) {
    return '';
  }
  try {
    return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    return '';
  }
}

function forbidden() {
  const error = new Error('REFINE_SOURCE_FORBIDDEN');
  error.status = 403;
  error.statusCode = 403;
  return error;
}
