import { operationalMetrics } from './operational-metrics.js'
import { AsyncLocalStorage } from 'node:async_hooks'
import { performance } from 'node:perf_hooks'

type Span = { id: number; parent?: number; name: string; startMs: number; durationMs: number; outcome: 'ok' | 'error'; inputChars?: number; outputChars?: number }
export type GenerationPerformance = { version: 1; startedAt: string; durationMs: number; dropped: number; spans: Span[] }
type Scope = { report: GenerationPerformance; start: number; parent?: number }
const scope = new AsyncLocalStorage<Scope>()

/** Bounded, content-free diagnostics. A failed diagnostics write never retries a paid operation. */
export async function withGenerationPerformance<T>(operation: () => Promise<T>, save: (report: GenerationPerformance) => Promise<unknown>): Promise<T> {
  const start = performance.now()
  const report: GenerationPerformance = { version: 1, startedAt: new Date().toISOString(), durationMs: 0, dropped: 0, spans: [] }
  try { return await scope.run({ report, start }, operation) }
  finally {
    report.durationMs = Math.round(performance.now() - start)
    try { await save(report) } catch { console.warn('[generation-performance] diagnostics write unavailable') }
  }
}

export async function measureGeneration<T>(name: string, operation: () => Promise<T>, inputChars?: number): Promise<T> {
  const current = scope.getStore()
  if (!current) return operation()
  if (current.report.spans.length >= 256) { current.report.dropped++; return operation() }
  const start = performance.now()
  const span: Span = { id: current.report.spans.length, ...(current.parent === undefined ? {} : { parent: current.parent }), name, startMs: Math.round(start - current.start), durationMs: 0, outcome: 'error', ...(inputChars === undefined ? {} : { inputChars }) }
  current.report.spans.push(span)
  try {
    const result = await scope.run({ ...current, parent: span.id }, operation)
    span.outcome = 'ok'
    if (typeof result === 'string') span.outputChars = result.length
    return result
  } catch (error: any) {
    // Count only leaf model operations here; enclosing workflow checkpoints
    // may propagate the same failure and must not be interpreted as paid calls.
    if (name === 'model:text' || name === 'model:image') {
      if (error?.status === 429) operationalMetrics.increment('model.rate_limit')
      if (error?.uncertain || error?.requestState === 'unknown') operationalMetrics.increment('model.unknown')
    }
    throw error
  } finally {
    span.durationMs = Math.round(performance.now() - start)
    operationalMetrics.observe(name, span.durationMs, span.outcome === 'error')
  }
}
