import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

// Passive operations events: a signed, privacy-minimal outbound webhook for
// "new user feedback" and "captured server error". Disabled unless
// TUYAN_OPS_EVENTS_ENABLED=true. Delivery is best-effort and never blocks or
// fails the user request; the read-only /api/agent-ops/feedback window remains
// the source of truth for catch-up after missed events.
export const OPS_EVENT_TYPES = ['feedback.created', 'error.captured'];
const LEVELS = { 'feedback.created': 'info', 'error.captured': 'error' };
const FEEDBACK_ID = /^feedback-[A-Za-z0-9_-]{1,64}$/;
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const AREA = /^[a-z0-9-]{1,40}(\.[a-zA-Z0-9-]{1,40}){0,1}$/;
const OTHER_SECRET_KEYS = ['PAPERBANANA_GATEWAY_TOKEN', 'ADMIN_TOKEN', 'PAPERBANANA_ADMIN_TOKEN', 'PAPERBANANA_ADMIN_TRANSPORT_TOKEN',
  'PAPERBANANA_BENCH_DISCOVERY_TOKEN', 'BETTER_AUTH_SECRET', 'PAPERBANANA_GUEST_COOKIE_SECRET', 'PAPERBANANA_OPERATIONS_TOKEN'];

export function loadOpsEventsConfig(env = process.env) {
  if (env.TUYAN_OPS_EVENTS_ENABLED !== 'true') return { enabled: false };
  const invalid = reason => { throw new Error(`Invalid TUYAN_OPS_EVENTS configuration: ${reason}; see docs/operations/passive-events.md`); };
  let url;
  try { url = new URL(String(env.TUYAN_OPS_EVENTS_URL || '')); } catch { invalid('TUYAN_OPS_EVENTS_URL must be an absolute https URL'); }
  if (url.protocol !== 'https:' || url.username || url.password) invalid('TUYAN_OPS_EVENTS_URL must be an absolute https URL without credentials');
  const secret = String(env.TUYAN_OPS_EVENTS_SECRET || '').trim();
  if (secret.length < 32) invalid('TUYAN_OPS_EVENTS_SECRET must be at least 32 characters');
  if (OTHER_SECRET_KEYS.some(key => String(env[key] || '').trim() === secret)) invalid('TUYAN_OPS_EVENTS_SECRET must not reuse another secret');
  const source = String(env.TUYAN_OPS_EVENTS_SOURCE || 'gateway').trim();
  if (!/^[a-z0-9-]{1,32}$/.test(source)) invalid('TUYAN_OPS_EVENTS_SOURCE must match [a-z0-9-]{1,32}');
  return { enabled: true, url: url.toString(), secret, source };
}

export function signOpsEvent(secret, timestamp, body) {
  return `v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

/** Verifier for receivers and tests: constant-time compare, 5-minute replay window. */
export function verifyOpsEvent(secret, { timestamp, signature, body }, nowMs = Date.now()) {
  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts) || Math.abs(nowMs / 1000 - ts) > 300 || typeof signature !== 'string') return false;
  const expected = Buffer.from(signOpsEvent(secret, timestamp, body));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const disabled = Object.freeze({ enabled: false, emit() {}, idle: async () => {} });

export function createOpsEventEmitter({
  config = { enabled: false }, fetchImpl = globalThis.fetch, nowMs = Date.now, logger = console,
  sleep = ms => new Promise(resolve => { const t = setTimeout(resolve, ms); t.unref?.(); }), random = Math.random,
  newId = randomUUID, limits = {},
} = {}) {
  if (!config?.enabled) return disabled;
  const { maxPerWindow = 30, windowMs = 10 * 60_000, dedupeMs = 10 * 60_000, attempts = 3, timeoutMs = 5000, maxInFlight = 20 } = limits;
  const sent = []; // delivery start times inside the storm window
  const recent = new Map(); // dedupe key -> expiresAt
  let suppressed = 0, inFlight = 0;
  const pending = new Set();

  async function deliver(event) {
    const body = JSON.stringify(event);
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const timestamp = String(Math.floor(nowMs() / 1000));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      timer.unref?.();
      try {
        const response = await fetchImpl(config.url, { method: 'POST', redirect: 'error', signal: controller.signal, body,
          headers: { 'content-type': 'application/json', 'user-agent': 'tuyan-ops-events/1',
            'x-tuyan-event-id': event.id, 'x-tuyan-event-timestamp': timestamp,
            'x-tuyan-event-signature': signOpsEvent(config.secret, timestamp, body) } });
        await response.body?.cancel?.().catch(() => {});
        if (response.ok) return true;
        if (response.status < 500 && response.status !== 429) break; // receiver rejected it; do not retry
      } catch { /* network error or timeout: retry */ }
      finally { clearTimeout(timer); }
      if (attempt < attempts) await sleep(1000 * 4 ** (attempt - 1) * (0.5 + random()));
    }
    logger.warn?.('ops event delivery failed', { type: event.type, id: event.id });
    return false;
  }

  function emit(type, fields = {}) {
    try {
      if (!OPS_EVENT_TYPES.includes(type)) return;
      const now = nowMs();
      for (const [key, expires] of recent) if (expires <= now) recent.delete(key);
      while (sent.length && sent[0] <= now - windowMs) sent.shift();
      const event = { schemaVersion: 1, id: newId(), type, level: LEVELS[type], occurredAt: new Date(now).toISOString(), source: config.source };
      let key;
      if (type === 'feedback.created') {
        if (!FEEDBACK_ID.test(String(fields.feedbackId || ''))) return;
        event.ref = fields.feedbackId; key = `f:${fields.feedbackId}`;
      } else {
        const status = Number.isInteger(fields.status) && fields.status >= 500 && fields.status <= 599 ? fields.status : 500;
        const code = CODE.test(String(fields.code || '')) ? fields.code : 'REQUEST_FAILED';
        const area = AREA.test(String(fields.area || '')) ? fields.area : 'other';
        Object.assign(event, { status, code, area });
        event.fingerprint = createHash('sha256').update(`${status}|${code}|${area}`).digest('hex').slice(0, 16);
        key = `e:${event.fingerprint}`;
      }
      if (recent.has(key)) { suppressed++; return; }
      if (sent.length >= maxPerWindow || inFlight >= maxInFlight) { suppressed++; return; }
      recent.set(key, now + dedupeMs);
      sent.push(now);
      if (suppressed) { event.suppressedSincePrevious = suppressed; suppressed = 0; }
      inFlight++;
      const job = deliver(event).catch(() => false).finally(() => { inFlight--; pending.delete(job); });
      pending.add(job);
    } catch { /* never let alerting break a request */ }
  }
  return { enabled: true, emit, idle: () => Promise.all([...pending]) };
}

/**
 * Coarse, non-identifying location of a captured error: the first path segment,
 * the router name under /api, or the legacy action name. Ids, tokens and query
 * text never leave the process.
 */
export function opsEventArea(path, action) {
  const segments = String(path || '').split('/').filter(Boolean);
  const first = segments[0] || 'root';
  if (!/^[a-z0-9-]{1,40}$/.test(first)) return 'other';
  if (first === 'api' && /^[a-z0-9-]{1,40}$/.test(segments[1] || '')) return `api.${segments[1]}`;
  if (first === 'paperbanana-api' && /^[a-zA-Z]{1,40}$/.test(String(action || ''))) return `paperbanana-api.${action}`;
  return first;
}
