import { canonicalHash } from './hash.js'

export const BENCHMARK_JUDGE_STACK_DESCRIPTOR = Object.freeze({
  openrouterModel: 'google/gemini-3.7-flash',
  bailianModel: 'qwen3.7-plus',
  promptSchema: 'seven-axis-strict-json-v1',
  repairPolicy: 'single-repair-v1',
})

export function benchmarkJudgeStackHash(codeSha: string) {
  if (!/^[a-f0-9]{40}$/i.test(codeSha)) throw new Error('INVALID_BENCHMARK_CODE_SHA')
  return canonicalHash({ codeSha, ...BENCHMARK_JUDGE_STACK_DESCRIPTOR })
}
