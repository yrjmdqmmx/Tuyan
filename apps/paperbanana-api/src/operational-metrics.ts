import { monitorEventLoopDelay, performance } from 'node:perf_hooks'

const events = [
  'admission.accepted_active', 'admission.accepted_queued',
  'admission.draining', 'admission.frozen', 'admission.owner_limit', 'admission.ip_limit', 'admission.queue_full',
  'execution.started', 'execution.returned', 'execution.threw', 'execution.claim_lost', 'execution.persistence_failed',
  'workflow.cache_hit', 'workflow.unknown_blocked', 'workflow.retry_wait', 'workflow.started',
  'workflow.completed', 'workflow.rejected', 'workflow.awaiting', 'workflow.unknown', 'workflow.journal_failed',
  'workflow.rate_limit', 'material.busy', 'material.started', 'material.completed', 'material.failed',
  'model.rate_limit', 'model.unknown',
  'review.png_passed', 'review.png_issues_found', 'review.png_protocol_failed',
] as const
type Event = typeof events[number]
const stages = [
  'admission.wait', 'execution.duration', 'workflow.retry_after', 'material.duration',
  'phase:planning', 'phase:reference_analysis', 'phase:reference_preparation', 'phase:reference_selection',
  'phase:rendering', 'phase:review', 'phase:styling',
  'model:text', 'model:image', 'local:svg-render', 'local:save-stage', 'local:material-read', 'other',
] as const
const bounds = [10, 100, 1000, 5000, 15000, 60000, 300000, 900000]
const gaugeNames = ['admission.active', 'admission.queued', 'admission.reserved', 'material.active'] as const
type Histogram = { count: number; sumMs: number; maxMs: number; errors: number; buckets: number[] }

/** Fixed cardinality, process-lifetime counters. Never accept IDs, messages, URLs or credentials. */
export function createOperationalMetrics() {
  const startedAt = new Date().toISOString()
  const counters = Object.fromEntries(events.map(key => [key, 0])) as Record<Event, number>
  const gauges = Object.fromEntries(gaugeNames.map(key => [key, { current: 0, peak: 0 }])) as Record<typeof gaugeNames[number], { current: number; peak: number }>
  const durations = Object.fromEntries(stages.map(key => [key, {
    count: 0, sumMs: 0, maxMs: 0, errors: 0, buckets: bounds.map(() => 0),
  }])) as Record<typeof stages[number], Histogram>
  return {
    increment(event: Event) {
      // Runtime validation also protects callers from unbounded labels.
      if (Object.hasOwn(counters, event)) counters[event]++
    },
    gauge(name: typeof gaugeNames[number], value: number) {
      if (!Object.hasOwn(gauges, name) || !Number.isFinite(value) || value < 0) return
      gauges[name].current = value
      gauges[name].peak = Math.max(gauges[name].peak, value)
    },
    observe(stage: string, ms: number, failed = false) {
      if (!Number.isFinite(ms) || ms < 0) return
      const row = durations[stages.includes(stage as any) ? stage as typeof stages[number] : 'other']
      row.count++; row.sumMs += ms; row.maxMs = Math.max(row.maxMs, ms)
      if (failed) row.errors++
      bounds.forEach((bound, i) => { if (ms <= bound) row.buckets[i]++ })
    },
    snapshot() {
      return { version: 1, startedAt, reset: 'process_restart', counters: { ...counters },
        gauges: structuredClone(gauges), durationBoundsMs: [...bounds], durations: structuredClone(durations) }
    },
  }
}
export const operationalMetrics = createOperationalMetrics()

/** Enabled only by the private operations endpoint; no background network I/O. */
export function createProcessObservation() {
  const delay = monitorEventLoopDelay({ resolution: 20 })
  delay.enable()
  const baseline = performance.eventLoopUtilization()
  return {
    snapshot() {
      const memory = process.memoryUsage()
      return {
        uptimeSeconds: process.uptime(),
        memoryBytes: { rss: memory.rss, heapUsed: memory.heapUsed, heapTotal: memory.heapTotal, external: memory.external },
        cpuMicroseconds: process.cpuUsage(),
        eventLoop: { window: 'process_observer_lifetime', utilization: performance.eventLoopUtilization(baseline).utilization,
          samples: delay.count, p95Ms: delay.count ? delay.percentile(95) / 1e6 : null,
          maxMs: delay.count ? delay.max / 1e6 : null },
      }
    },
    close() { delay.disable() },
  }
}
