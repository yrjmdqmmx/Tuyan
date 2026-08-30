export const SCIENTIFIC_BENCHMARK_IDENTITY = Object.freeze({
  suiteId: 'pb-scientific-figure-v2',
  evaluationMode: 'codex_scientific_v2',
  evaluationEpoch: 'codex-scientific-2026-09-v1',
  reviewProtocol: 'codex-independent-double-review-v2',
  presentationVersion: 'scientific-leaderboard-v2',
} as const)

export const SCIENTIFIC_BENCHMARK_AXES = Object.freeze([
  'scientific_faithfulness',
  'structural_topology',
  'text_symbol_accuracy',
  'quantitative_accuracy',
  'instruction_adherence',
  'readability_visual_hierarchy',
  'information_density',
  'publication_aesthetics',
  'edit_target_accuracy',
  'non_target_preservation',
] as const)

export type ScientificBenchmarkAxis = typeof SCIENTIFIC_BENCHMARK_AXES[number]

export const SCIENTIFIC_AXIS_WEIGHTS = Object.freeze(Object.fromEntries(
  SCIENTIFIC_BENCHMARK_AXES.map((axis) => [axis, 1 / SCIENTIFIC_BENCHMARK_AXES.length]),
) as Record<ScientificBenchmarkAxis, number>)
