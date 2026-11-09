// Shared, deliberately closed query vocabulary. Never accepts Mongo/SQL or actions.
export const OPS_KINDS = ['overview', 'failures', 'health'];
export const JOB_STATES = ['reserved', 'queued', 'running', 'awaiting_provider', 'succeeded', 'failed', 'cancelled', 'unknown'];
export const FAILURE_CATEGORIES = ['input', 'balance', 'quota', 'permission', 'rate_limit', 'timeout', 'network', 'provider', 'internal', 'unknown'];
export const FAILURE_STAGES = ['reference_selection', 'reference_preparation', 'reference_analysis', 'planning', 'styling', 'rendering', 'review', 'execution', 'unknown'];
export const REQUEST_STATES = ['not_sent', 'rejected', 'unknown'];
export const OPS_WINDOW_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    from: { type: 'string', description: 'Inclusive ISO 8601 UTC timestamp, e.g. 2026-11-01T00:00:00.000Z' },
    to: { type: 'string', description: 'Exclusive ISO 8601 UTC timestamp; maximum range 90 days' },
  },
};
export const OPS_EMPTY_SCHEMA = { type: 'object', properties: {}, additionalProperties: false };
export class OpsQueryError extends Error {
  constructor() { super('Use only from/to UTC timestamps, both together, with 0 < range <= 90 days and no future dates'); }
}
export function parseOpsQuery(kind, input = {}, nowMs = Date.now()) {
  if (!OPS_KINDS.includes(kind) || !input || typeof input !== 'object' || Array.isArray(input)) throw new OpsQueryError();
  const keys = Object.keys(input);
  if (kind === 'health') { if (keys.length) throw new OpsQueryError(); return {}; }
  if (keys.some(key => !['from', 'to'].includes(key))) throw new OpsQueryError();
  // Minute-rounded default keeps polling/cache stable; actual boundaries always returned.
  const end = Math.floor(nowMs / 60_000) * 60_000;
  if (!keys.length) return { from: new Date(end - 86_400_000).toISOString(), to: new Date(end).toISOString() };
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  if (!valid(input.from) || !valid(input.to)) throw new OpsQueryError();
  const from = Date.parse(input.from), to = Date.parse(input.to);
  if (from >= to || to - from > 90 * 86_400_000 || to > nowMs || from < 0) throw new OpsQueryError();
  return { from: input.from, to: input.to };
}
export function opsCount(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
export function opsNumber(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
export function opsTimestamp(value) {
  const time = typeof value === 'string' || value instanceof Date ? new Date(value) : null;
  return time && Number.isFinite(+time) ? time.toISOString() : null;
}
export function projectCounts(value, names) { return Object.fromEntries(names.map(name => [name, opsCount(value?.[name])])); }
