import express from 'express';

// 24 MiB artifact expands to 32 MiB base64; leave bounded JSON metadata room.
const MAX_REPLY = 33 * 1024 * 1024;
const fail = (status, message) => Object.assign(new Error(message), { status });
const tools = new Set(['semiotic', 'viznoir', 'dataviz']);

async function boundedJson(response) {
  if (Number(response.headers.get('content-length')) > MAX_REPLY) throw fail(502, '工具返回的结果过大。');
  const reader = response.body?.getReader();
  if (!reader) throw fail(502, '工具未返回有效结果。');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_REPLY) throw fail(502, '工具返回的结果过大。');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}

export function createEcosystemRouter({ auth, frontendOrigins, worker = {}, isMaintenance = () => false, fetchImpl = fetch, now = Date.now, timeoutMs = 90_000 }) {
  const router = express.Router(), origins = new Set(frontendOrigins), accounts = new Map();
  router.use(async (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    try {
      if (req.get('origin') && !origins.has(req.get('origin')) || req.method !== 'GET' && !origins.has(req.get('origin'))) throw fail(403, '请求来源无效，请回到图研页面重试。');
      const session = await auth.optionalSession(req);
      if (!session?.user?.id) throw fail(401, '请先登录，再使用科研工具。');
      if (req.get('x-workspace-account') !== String(session.user.id)) throw fail(409, '账号已变化，请刷新后重试。');
      if (isMaintenance()) throw fail(503, '服务维护中，请稍后重试。');
      if (!worker.url || !worker.token) throw fail(503, '科研工具服务尚未连接，请稍后重试。');
      req.ecosystemUserId = String(session.user.id);
      next();
    } catch (error) { next(error); }
  });
  router.use((req, _res, next) => next(req.method === 'POST' && !req.is('application/json') ? fail(415, '请使用 JSON 格式提交数据。') : undefined));
  router.use(express.json({ limit: '8mb', strict: true, inflate: false,
    verify: (req, _res, bytes) => { req.ecosystemRawBody = bytes; },
    reviver: (_key, value) => {
      if (typeof value === 'number' && !Number.isFinite(value)) throw fail(400, '数据包含超出范围的数字。');
      return value;
    },
  }));

  async function invoke(req, res, path, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', cancel);
    try {
      const response = await fetchImpl(new URL(path, worker.url), {
        method: payload ? 'POST' : 'GET', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${worker.token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
        ...(payload ? { body: payload } : {}),
      });
      const data = await boundedJson(response);
      if (!response.ok) {
        const status = [400, 413, 422, 429, 503, 504].includes(response.status) ? response.status : 502;
        const message = status === 429 ? '工具正在处理其他请求，请稍后再试。' : status === 504 ? '本次处理超时，请缩小文件或数据规模。' : status === 413 ? '文件或结果超出当前大小限制。' : [400, 422].includes(status) ? '数据或选项不符合工具要求，请检查文件格式、字段和数值。' : '科研工具暂时不可用，请稍后重试。';
        throw fail(status, message);
      }
      // Do not deliver a completed request into a revoked or changed account.
      const current = await auth.optionalSession(req);
      if (String(current?.user?.id || '') !== req.ecosystemUserId) throw fail(401, '登录状态已变化，请重新登录。');
      return data;
    } catch (error) {
      if (error.status) throw error;
      throw fail(controller.signal.aborted ? 504 : 503, controller.signal.aborted ? '本次处理已取消或超时，请稍后重试。' : '科研工具暂时无法连接，请稍后重试。');
    } finally { clearTimeout(timer); res.off('close', cancel); }
  }

  const route = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  router.get('/health', route(async (req, res) => res.json(await invoke(req, res, '/health'))));
  router.post('/render', route(async (req, res) => {
    if (!req.body || !tools.has(req.body.tool)) throw fail(400, '请选择一个可用的科研工具。');
    const time = now();
    for (const [id, item] of accounts) if (!item.active && time - item.start >= 60_000) accounts.delete(id);
    if (!accounts.has(req.ecosystemUserId) && accounts.size >= 10_000) throw fail(503, '请求较多，请稍后再试。');
    const item = accounts.get(req.ecosystemUserId) || { start: time, count: 0, active: false };
    if (item.active) throw fail(429, '你已有一个科研工具任务正在处理。');
    if (time - item.start >= 60_000) { item.start = time; item.count = 0; }
    if (item.count >= 6) { res.set('Retry-After', '60'); throw fail(429, '操作较频繁，请稍等一分钟再试。'); }
    item.active = true; item.count++; accounts.set(req.ecosystemUserId, item);
    try {
      // Preserve strict JSON semantics (duplicate keys, numeric spelling) for
      // the worker validator; stringify would silently rewrite invalid data.
      const result = await invoke(req, res, '/render', req.ecosystemRawBody);
      const expected = { semiotic: 'svg', viznoir: 'png', dataviz: 'html' }[req.body.tool];
      if (result.tool !== req.body.tool || result.format !== expected || typeof result.base64 !== 'string' || !result.base64.length || result.base64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(result.base64)) throw fail(502, '工具返回的结果格式不正确。');
      res.json({ tool: result.tool, format: result.format, base64: result.base64,
        filename: `Tuyan-${result.tool}.${result.format}`, engineVersion: String(result.engineVersion || '').slice(0, 80),
        summary: result.summary && typeof result.summary === 'object' ? result.summary : {} });
    } finally { item.active = false; }
  }));
  router.use((error, _req, res, _next) => {
    const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : error.status || 503;
    res.status(status).json({ error: error.type ? (status === 413 ? '请求超过 8 MiB 限制。' : '请求内容无法解析。') : error.status ? error.message : '科研工具暂时不可用。' });
  });
  return router;
}
