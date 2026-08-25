export type BenchProvider = 'bailian' | 'openrouter' | 'ark'

export interface PublicWorkerConfig {
  enabled: boolean
  concurrency: number
  detectionIntervalMs: number
  ossPrefix: 'bench/'
  leaseMs: number
  heartbeatMs: number
  availableProviders: BenchProvider[]
  mongoDbName: string
}

function enabled(value: string | undefined) {
  return String(value || '').toLowerCase() === 'true'
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback
}

export function parseWorkerConfig(env: Record<string, string | undefined>): PublicWorkerConfig {
  const availableProviders: BenchProvider[] = []
  if (env.PAPERBANANA_BENCH_BAILIAN_API_KEY) availableProviders.push('bailian')
  if (env.PAPERBANANA_BENCH_OPENROUTER_API_KEY) availableProviders.push('openrouter')
  if (env.PAPERBANANA_BENCH_ARK_API_KEY) availableProviders.push('ark')
  return Object.freeze({
    enabled: enabled(env.PAPERBANANA_BENCH_ENABLED),
    concurrency: boundedInteger(env.PAPERBANANA_BENCH_CONCURRENCY, 1, 1, 1),
    detectionIntervalMs: boundedInteger(env.PAPERBANANA_BENCH_DETECTION_INTERVAL_MS, 6 * 60 * 60 * 1_000, 60_000, 7 * 24 * 60 * 60 * 1_000),
    ossPrefix: 'bench/' as const,
    leaseMs: boundedInteger(env.PAPERBANANA_BENCH_LEASE_MS, 120_000, 30_000, 600_000),
    heartbeatMs: boundedInteger(env.PAPERBANANA_BENCH_HEARTBEAT_MS, 30_000, 5_000, 60_000),
    availableProviders,
    mongoDbName: env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark',
  })
}

export function loadBenchCredentials(env: Record<string, string | undefined>) {
  return {
    bailian: env.PAPERBANANA_BENCH_BAILIAN_API_KEY || '',
    openrouter: env.PAPERBANANA_BENCH_OPENROUTER_API_KEY || '',
    ark: env.PAPERBANANA_BENCH_ARK_API_KEY || '',
  } satisfies Record<BenchProvider, string>
}

export function redactHealthError(value: unknown) {
  return String(value || '')
    .replace(/\b(?:Bearer|Basic)\s+[^\s,;]+/gi, '[REDACTED_AUTH]')
    .replace(/:\/\/([^:/@\s]+):([^@\s]+)@/g, '://[REDACTED]@')
    .replace(/\b([A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD))\s*[=:]\s*([^\s,;]+)/gi, '$1=[REDACTED]')
    .replace(/\b(?:sk-|LTAI)[A-Za-z0-9_-]+\b/g, '[REDACTED_KEY]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[REDACTED]')
    .slice(0, 500)
}
