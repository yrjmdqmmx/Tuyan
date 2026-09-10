import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const upstream = 'https://api.paperbanana.asia';
const firstPartyOrigin = 'https://www.paperbanana.asia';
const cookieName = 'tuyan_preview_session';
const lifetimeMs = 7 * 86400_000;
const paths = new Set(['sign-in/email', 'sign-up/email', 'sign-out', 'send-verification-email', 'request-password-reset', 'verification-status']);
const digest = value => createHash('sha256').update(value).digest('hex');
const failure = (message = '正式账号服务暂时不可用，请稍后重试。', status = 503) => Object.assign(new Error(message), { status });
const json = (body, status = 200, cookie) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
const localCookie = (value, maxAge = lifetimeMs / 1000) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

// This is a loopback BFF for the app owner's local preview. It authenticates
// against the existing HTTPS account service; production secrets and database
// access are never copied to the preview. Only an opaque, HttpOnly handle reaches
// the browser. The upstream cookie jar is encrypted at rest and revalidated on
// every local API request (no trusting a client-supplied user ID or cookie cache).
export async function createProductionAuthBridge({ db, secret, apiBase, frontendOrigins, fetcher = fetch, now = () => Date.now() }) {
  const key = Buffer.from(secret, 'base64');
  if (key.length !== 32) throw new Error('Local auth encryption key must contain 32 bytes');
  const apiOrigin = new URL(apiBase).origin;
  if (apiOrigin !== 'http://127.0.0.1:8791') throw new Error('Production auth bridge must bind to its fixed loopback endpoint');
  const origins = new Set(frontendOrigins);
  const sessions = db.collection('production_auth_preview_sessions');
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const inFlight = new WeakMap();
  let health = { ok: false, checkedAt: null };

  function seal(id, jar) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('production-auth/' + id));
    const data = Buffer.concat([cipher.update(JSON.stringify(jar), 'utf8'), cipher.final()]);
    return { iv: iv.toString('base64'), data: data.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
  }
  function unseal(row) {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(row.sealed.iv, 'base64'));
    decipher.setAAD(Buffer.from('production-auth/' + row._id));
    decipher.setAuthTag(Buffer.from(row.sealed.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(row.sealed.data, 'base64')), decipher.final()]).toString('utf8'));
  }
  function sessionId(headers) {
    const raw = headers instanceof Headers ? headers.get('cookie') : headers?.cookie;
    const values = String(raw || '').split(';').map(part => part.trim()).filter(part => part.startsWith(cookieName + '='));
    const value = values.length === 1 ? values[0].slice(cookieName.length + 1) : '';
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? digest(value) : null;
  }
  async function readSession(headers) {
    const id = sessionId(headers);
    if (!id) return null;
    const row = await sessions.findOne({ _id: id, expiresAt: { $gt: new Date(now()) } });
    if (!row) return null;
    try { return { row, jar: unseal(row) }; }
    catch { await sessions.deleteOne({ _id: id }); throw failure('本地登录会话已失效，请重新登录。', 401); }
  }
  function updatedJar(jar, headers) {
    const next = { ...jar };
    for (const item of headers.getSetCookie()) {
      const [pair, ...attributes] = item.split(';');
      const split = pair.indexOf('='), name = pair.slice(0, split), value = pair.slice(split + 1);
      if (!/^(?:__Secure-|__Host-)?paperbanana\.[A-Za-z0-9_.-]+$/.test(name) || !/^[\x21-\x7e]*$/.test(value) || value.includes(';')) continue;
      const expired = attributes.some(attribute => /^\s*max-age\s*=\s*0\s*$/i.test(attribute))
        || attributes.some(attribute => /^\s*expires=/i.test(attribute) && Date.parse(attribute.slice(attribute.indexOf('=') + 1)) <= now());
      if (!value || expired) delete next[name]; else next[name] = value;
    }
    if (JSON.stringify(next).length > 32768) throw failure();
    return next;
  }
  async function call(path, { method = 'GET', body, jar = {} } = {}) {
    const headers = { Origin: firstPartyOrigin, 'User-Agent': 'Tuyan-TokenDance-Local-Preview' };
    const cookie = Object.entries(jar).map(([name, value]) => name + '=' + value).join('; ');
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let response, data;
    try {
      response = await fetcher(upstream + path, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(15000) });
      const bytes = await response.text();
      if (bytes.length > 1024 * 1024) throw failure();
      data = bytes ? JSON.parse(bytes) : null;
      health = { ok: response.status < 500, checkedAt: new Date(now()).toISOString() };
    } catch { health = { ok: false, checkedAt: new Date(now()).toISOString() }; throw failure(); }
    return { response, data, jar: updatedJar(jar, response.headers) };
  }
  function publicData(data) {
    if (!data || typeof data !== 'object') return data;
    const { token: _token, ...result } = data;
    if (result.session) {
      const { token: _sessionToken, ipAddress: _ip, userAgent: _agent, ...session } = result.session;
      result.session = session;
    }
    return result;
  }
  async function validateSession(headers) {
    const found = await readSession(headers);
    if (!found) return null;
    const { row } = found;
    const result = await call('/api/auth/get-session?disableCookieCache=true', { jar: found.jar });
    if (result.response.status >= 500 || result.response.status === 429) throw failure();
    if (result.response.status !== 200 || !result.data?.user?.id) { await sessions.deleteOne({ _id: row._id }); return null; }
    if (String(result.data.user.id) !== row.userId) { await sessions.deleteOne({ _id: row._id }); throw failure('账号会话发生变化，请重新登录。', 401); }
    const state = await call('/api/account/status', { jar: result.jar });
    if (state.response.status !== 200) throw failure();
    if (state.data?.state !== 'active') throw failure('账号正在处理注销或恢复，请先到正式站点处理。', 409);
    const saved = await sessions.updateOne({ _id: row._id, revision: row.revision }, { $set: { sealed: seal(row._id, state.jar) }, $inc: { revision: 1 } });
    // Concurrent logout must not be undone by a late get-session response.
    if (saved.matchedCount !== 1 && !await sessions.findOne({ _id: row._id })) return null;
    return publicData(result.data);
  }
  return {
    async webHandler(request) {
      try {
        const url = new URL(request.url), origin = request.headers.get('origin');
        if (url.origin !== apiOrigin || origin && !origins.has(origin) || request.method !== 'GET' && !origins.has(origin)) return json({ code: 'INVALID_ORIGIN', message: '不受信任的本地请求来源。' }, 403);
        const route = url.pathname.replace(/^\/api\/auth\//, '');
        if (route === 'get-session' && request.method === 'GET') return json(await validateSession(request.headers));
        if (!paths.has(route) || request.method !== 'POST') return json({ code: 'PREVIEW_AUTH_ROUTE_UNAVAILABLE', message: '请在正式图研站点管理此账号操作。' }, 404);
        const rawBody = await request.text();
        let payload;
        try { payload = rawBody ? JSON.parse(rawBody) : route === 'sign-out' ? {} : null; } catch { payload = null; }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || JSON.stringify(payload).length > 65536) return json({ code: 'INVALID_BODY', message: '请求内容无效。' }, 400);
        const found = await readSession(request.headers);
        if (route === 'sign-out') {
          if (found) {
            await sessions.deleteOne({ _id: found.row._id });
            try {
              const result = await call('/api/auth/sign-out', { method: 'POST', body: {}, jar: found.jar });
              if (!result.response.ok) throw failure();
            }
            catch { return json({ code: 'REMOTE_SIGNOUT_UNCERTAIN', message: '本地已退出，服务器退出状态暂时无法确认。' }, 503, localCookie('', 0)); }
          }
          return json({ success: true }, 200, localCookie('', 0));
        }
        const result = await call('/api/auth/' + route, { method: 'POST', body: payload, jar: found?.jar });
        if (route === 'sign-in/email' && result.response.ok && result.data?.user?.id) {
          if (!Object.keys(result.jar).some(name => name.endsWith('.session_token'))) throw failure();
          const opaque = randomBytes(32).toString('base64url'), id = digest(opaque);
          await sessions.insertOne({ _id: id, userId: String(result.data.user.id), sealed: seal(id, result.jar), expiresAt: new Date(now() + lifetimeMs), revision: 0 });
          if (found) await sessions.deleteOne({ _id: found.row._id });
          return json(publicData(result.data), result.response.status, localCookie(opaque));
        }
        const response = json(publicData(result.data), result.response.status);
        for (const name of ['retry-after', 'x-retry-after']) if (result.response.headers.has(name)) response.headers.set(name, result.response.headers.get(name));
        return response;
      } catch (error) { return json({ code: 'PRODUCTION_AUTH_UNAVAILABLE', message: error?.status ? error.message : '正式账号服务暂时不可用，请稍后重试。' }, error?.status || 503); }
    },
    optionalSession(request) {
      if (!inFlight.has(request)) inFlight.set(request, validateSession(request.headers));
      return inFlight.get(request);
    },
    cachedStatus: () => health,
    async ready() {
      try { const result = await call('/api/auth/get-session'); return { ...health, ok: result.response.status === 200 }; }
      catch { return health; }
    },
    async close() {},
  };
}
