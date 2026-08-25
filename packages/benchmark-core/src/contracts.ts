import { canonicalHash } from './hash.js'

export const BENCHMARK_AXES = [
  'faithfulness',
  'conciseness',
  'readability',
  'aesthetics',
  'text_accuracy',
  'topology',
  'instruction_adherence',
] as const

export type BenchmarkAxis = typeof BENCHMARK_AXES[number]

export const BENCHMARK_LANE_ORDER = ['2K-standard', '1K-standard', '4K-standard'] as const
export type BenchmarkLane = typeof BENCHMARK_LANE_ORDER[number]

export type BenchmarkProfileStatus = 'provisional' | 'verified' | 'superseded'
export type BenchmarkPhase = 'quick' | 'full'

export const BENCHMARK_COLLECTIONS = Object.freeze({
  suites: 'paperbanana_benchmark_suites',
  models: 'paperbanana_benchmark_models',
  runs: 'paperbanana_benchmark_runs',
  samples: 'paperbanana_benchmark_samples',
  judgments: 'paperbanana_benchmark_judgments',
  dispatches: 'paperbanana_benchmark_dispatches',
  releases: 'paperbanana_benchmark_releases',
} as const)

export const BENCHMARK_RUN_STATES = [
  'detected',
  'approved',
  'quick_running',
  'quick_review',
  'provisional_published',
  'full_running',
  'codex_audit',
  'verified_published',
  'paused',
  'failed',
  'cancelled',
  'superseded',
] as const

export type BenchmarkRunState = typeof BENCHMARK_RUN_STATES[number]

const terminalStates: BenchmarkRunState[] = ['cancelled', 'superseded']
const interruptibleStates: BenchmarkRunState[] = [
  'approved', 'quick_running', 'quick_review', 'provisional_published', 'full_running', 'codex_audit', 'paused', 'failed',
]

export const BENCHMARK_RUN_TRANSITIONS: Readonly<Record<BenchmarkRunState, readonly BenchmarkRunState[]>> = {
  detected: Object.freeze(['approved', 'cancelled', 'superseded']),
  approved: Object.freeze(['quick_running', 'paused', 'cancelled', 'superseded']),
  quick_running: Object.freeze(['quick_review', 'paused', 'failed', 'cancelled', 'superseded']),
  quick_review: Object.freeze(['provisional_published', 'paused', 'failed', 'cancelled', 'superseded']),
  provisional_published: Object.freeze(['full_running', 'paused', 'cancelled', 'superseded']),
  full_running: Object.freeze(['codex_audit', 'paused', 'failed', 'cancelled', 'superseded']),
  codex_audit: Object.freeze(['verified_published', 'paused', 'failed', 'cancelled', 'superseded']),
  verified_published: Object.freeze(['superseded']),
  paused: Object.freeze(['approved', 'quick_running', 'quick_review', 'provisional_published', 'full_running', 'codex_audit', 'cancelled', 'superseded']),
  failed: Object.freeze(['approved', 'quick_running', 'full_running', 'codex_audit', 'cancelled', 'superseded']),
  cancelled: Object.freeze([]),
  superseded: Object.freeze([]),
}

if (terminalStates.some((state) => BENCHMARK_RUN_TRANSITIONS[state].length)) {
  throw new Error('Terminal benchmark states cannot have transitions')
}
if (interruptibleStates.some((state) => !BENCHMARK_RUN_TRANSITIONS[state])) {
  throw new Error('Every interruptible benchmark state must declare transitions')
}

export function assertBenchmarkTransition(from: BenchmarkRunState, to: BenchmarkRunState) {
  if (!BENCHMARK_RUN_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`INVALID_BENCHMARK_TRANSITION:${from}->${to}`)
  }
}

export function selectBenchmarkLane(resolutions: readonly string[]): BenchmarkLane | null {
  const supported = new Set(resolutions.map((value) => value.toUpperCase()))
  for (const lane of BENCHMARK_LANE_ORDER) {
    const resolution = lane.slice(0, 2).toUpperCase()
    if (supported.has(resolution)) return lane
  }
  return null
}

export function benchmarkSampleId(runId: string, phase: BenchmarkPhase, caseId: string, repetition: number) {
  if (!runId || !caseId || !['quick', 'full'].includes(phase) || !Number.isInteger(repetition) || repetition < 0) {
    throw new Error('INVALID_BENCHMARK_SAMPLE_IDENTITY')
  }
  return `sample:${canonicalHash([runId, phase, caseId, repetition])}`
}
