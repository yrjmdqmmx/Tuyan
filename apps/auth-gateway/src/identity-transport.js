import { ProxyAgent } from 'undici';

const ENDPOINTS = new Set([
  'https://github.com/login/oauth/access_token',
  'https://api.github.com/user',
  'https://oauth2.googleapis.com/token',
  'https://www.googleapis.com/oauth2/v3/certs',
]);

export function loadIdentityProxy(env = {}) {
  const value = String(env.AUTH_IDENTITY_PROXY_URL || '').trim();
  // Dedicated WireGuard listener: it cannot relay model API requests.
  if (value && value !== 'http://10.78.0.1:3129') throw Error('AUTH_IDENTITY_PROXY_INVALID');
  return value;
}

export function createIdentityTransport(proxyUrl, { fetchImpl = fetch, Agent = ProxyAgent } = {}) {
  const proxy = loadIdentityProxy({ AUTH_IDENTITY_PROXY_URL: proxyUrl });
  const dispatcher = proxy ? new Agent({ uri: proxy, connections: 4, connectTimeout: 5000 }) : undefined;
  return {
    fetch(url, options = {}) {
      if (!ENDPOINTS.has(String(url))) throw Error('AUTH_IDENTITY_ENDPOINT_DENIED');
      // Never follow redirects or fall back to another route after an exchange.
      return fetchImpl(url, { ...options, redirect: 'error', ...(dispatcher ? { dispatcher } : {}) });
    },
    async close() { await dispatcher?.close(); },
  };
}
