const META_ENV = import.meta.env || {};
const AUTH_REQUIRED = META_ENV.VITE_AUTH_REQUIRED === 'true';
const AUTH_ENABLED = AUTH_REQUIRED || META_ENV.VITE_AUTH_ENABLED === 'true' || Boolean(META_ENV.VITE_AUTH_BASE);

export class ApiError extends Error {
  constructor(message, { status = 0, code = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = Number(status || 0);
    this.code = Number(code || 0);
    this.details = details;
  }
}

export async function fetchJson(url, options = {}) {
  const fetchOptions = AUTH_ENABLED ? { credentials: 'include', ...options } : options;
  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (!res.ok || (data.code && data.code !== 0)) {
    throw new ApiError(data.error || data.detail || `HTTP ${res.status}`, {
      status: res.status,
      code: Number(data.code || res.status || 0),
      details: data,
    });
  }
  return data;
}
