export class BackendError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
    this.statusCode = status;
    this.code = code;
  }
}

const MAX_REQUEST_TIMEOUT_MS = 120_000;

export function createBackendClient({
  mode,
  url,
  timeoutMs,
  gatewayToken,
  adminToken = '',
  adminTransportToken = '',
  fetchImpl = globalThis.fetch,
}) {
  let readinessStatus = {
    mode,
    ok: false,
    checkedAt: null,
    code: 'NOT_CHECKED',
  };

  async function requestJson(target, init, requestTimeoutMs = timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new DOMException('Backend request timed out', 'TimeoutError')),
      requestTimeoutMs,
    );
    timeout.unref?.();
    try {
      const response = await fetchImpl(target, { ...init, signal: controller.signal });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {
          code: response.status || 502,
          error: text || `Backend HTTP ${response.status}`,
        };
      }
      return { status: response.status, data };
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'TimeoutError') {
        throw new BackendError(504, 'BACKEND_TIMEOUT', 'Backend request timed out');
      }
      throw new BackendError(502, 'BACKEND_UNAVAILABLE', 'Backend unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  async function call(inputBody = {}, requestContext = {}, options = {}) {
    const body = sanitizeBody(inputBody);
    const headers = transportHeaders(requestContext);
    headers['content-type'] = 'application/json';

    if (mode === 'node') {
      headers['x-paperbanana-gateway-token'] = gatewayToken;
      if (options.adminAction) {
        if (!adminTransportToken) {
          throw new BackendError(503, 'ADMIN_API_DISABLED', 'Admin API disabled: transport assertion is not configured');
        }
        headers['x-paperbanana-admin-transport-token'] = adminTransportToken;
        headers['x-paperbanana-admin-user-id'] = safeHeader(options.adminUserId, 200);
      }
    } else if (mode === 'laf') {
      body.gatewayToken = gatewayToken;
      if (options.adminAction) {
        if (!adminToken) {
          throw new BackendError(503, 'ADMIN_API_DISABLED', 'Admin API disabled: ADMIN_TOKEN is not configured');
        }
        body.adminToken = adminToken;
      }
    } else {
      throw new BackendError(500, 'BACKEND_CONFIG_INVALID', `Unsupported backend mode: ${mode}`);
    }

    return requestJson(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, requestTimeout(timeoutMs, options.timeoutMs));
  }

  async function ready(requestContext = {}) {
    try {
      let result;
      let ok;
      if (mode === 'node') {
        const headers = transportHeaders(requestContext);
        headers['x-paperbanana-gateway-token'] = gatewayToken;
        result = await requestJson(nodeReadinessUrl(url), { method: 'GET', headers });
        ok = isHttpSuccess(result.status) && result.data?.ready === true;
      } else if (mode === 'laf') {
        result = await call({ action: 'health' }, requestContext);
        ok = isHttpSuccess(result.status) && Number(result.data?.code || 0) === 0 && result.data?.ok !== false;
      } else {
        throw new BackendError(500, 'BACKEND_CONFIG_INVALID', `Unsupported backend mode: ${mode}`);
      }
      readinessStatus = {
        mode,
        ok,
        checkedAt: new Date().toISOString(),
        status: result.status,
        ready: mode === 'node' ? result.data?.ready === true : ok,
        dependencies: result.data?.dependencies || {},
      };
      return { ok, ...result };
    } catch (error) {
      readinessStatus = {
        mode,
        ok: false,
        checkedAt: new Date().toISOString(),
        status: error?.status || 502,
        code: error?.code || 'BACKEND_UNAVAILABLE',
      };
      throw error;
    }
  }

  return {
    mode,
    call,
    ready,
    cachedStatus() {
      return { ...readinessStatus };
    },
  };
}

function requestTimeout(defaultTimeoutMs, override) {
  if (override === undefined) return defaultTimeoutMs;
  if (!Number.isFinite(override) || !Number.isInteger(override) || override < 1 || override > MAX_REQUEST_TIMEOUT_MS) {
    throw new BackendError(500, 'BACKEND_TIMEOUT_INVALID', 'Backend timeout override must be an integer between 1 and 120000');
  }
  return override;
}

function sanitizeBody(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? { ...input } : {};
  delete body.gatewayToken;
  delete body.adminToken;
  return body;
}

function transportHeaders(context = {}) {
  const headers = {};
  const clientIp = safeHeader(context.clientIp, 128);
  const userAgent = safeHeader(context.userAgent, 512);
  if (clientIp) headers['x-paperbanana-client-ip'] = clientIp;
  if (userAgent) headers['user-agent'] = userAgent;
  return headers;
}

function safeHeader(value, maxLength) {
  return String(value || '')
    .replace(/[\r\n]/g, '')
    .trim()
    .slice(0, maxLength);
}

function nodeReadinessUrl(apiUrl) {
  return new URL('/ready', apiUrl).toString();
}

function isHttpSuccess(status) {
  return status >= 200 && status < 300;
}
