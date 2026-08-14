export class BackendError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
    this.statusCode = status;
    this.code = code;
  }
}

export function createBackendClient({
  mode,
  url,
  timeoutMs,
  gatewayToken,
  adminToken = '',
  fetchImpl = globalThis.fetch,
}) {
  let cachedStatus = {
    mode,
    ok: false,
    checkedAt: null,
    code: 'NOT_CHECKED',
  };

  async function call(inputBody = {}, requestContext = {}, options = {}) {
    const body = sanitizeBody(inputBody);
    const headers = {
      'content-type': 'application/json',
    };
    const clientIp = safeHeader(requestContext.clientIp, 128);
    const userAgent = safeHeader(requestContext.userAgent, 512);
    if (clientIp) headers['x-paperbanana-client-ip'] = clientIp;
    if (userAgent) headers['user-agent'] = userAgent;

    if (mode === 'node') {
      headers['x-paperbanana-gateway-token'] = gatewayToken;
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

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new DOMException('Backend request timed out', 'TimeoutError')),
      timeoutMs,
    );
    timeout.unref?.();

    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
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
      cachedStatus = {
        mode,
        ok: response.ok && Number(data?.code || 0) === 0,
        checkedAt: new Date().toISOString(),
        status: response.status,
        code: Number(data?.code || 0),
      };
      return { status: response.status, data };
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'TimeoutError') {
        cachedStatus = failedStatus(mode, 504, 'BACKEND_TIMEOUT');
        throw new BackendError(504, 'BACKEND_TIMEOUT', 'Backend request timed out');
      }
      cachedStatus = failedStatus(mode, 502, 'BACKEND_UNAVAILABLE');
      throw new BackendError(502, 'BACKEND_UNAVAILABLE', 'Backend unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    mode,
    call,
    cachedStatus() {
      return { ...cachedStatus };
    },
    async ready(requestContext = {}) {
      const result = await call({ action: 'health' }, requestContext);
      return {
        ok: result.status >= 200 && result.status < 300 && Number(result.data?.code || 0) === 0,
        result,
      };
    },
  };
}

function sanitizeBody(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? { ...input } : {};
  delete body.gatewayToken;
  delete body.adminToken;
  return body;
}

function safeHeader(value, maxLength) {
  return String(value || '')
    .replace(/[\r\n]/g, '')
    .trim()
    .slice(0, maxLength);
}

function failedStatus(mode, status, code) {
  return {
    mode,
    ok: false,
    checkedAt: new Date().toISOString(),
    status,
    code,
  };
}
