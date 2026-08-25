import sharp from 'sharp'

import { JUDGE_CALIBRATION_FIXTURES } from './calibration-fixtures.js'
import { renderCalibrationFixture } from './calibration-render.js'
import { loadBuildProvenance } from './build-provenance.js'
import { loadBenchCredentials } from './config.js'
import { runOpenRouterJudgeProbe, type OpenRouterJudgeProbeKind } from './openrouter-judge-probe.js'
import { createOpenRouterJudgeEgress } from './judge-egress.js'

const env = process.env

async function main() {
  if (env.PAPERBANANA_BENCH_ENABLED !== 'false' || env.PAPERBANANA_BENCH_CONCURRENCY !== '1') {
    throw new Error('BENCHMARK_OPENROUTER_PROBE_WORKER_BOUNDARY_INVALID')
  }
  if (env.PAPERBANANA_OPENROUTER_PROBE_CONFIRM !== 'probe-one-openrouter-judge-disabled-worker') {
    throw new Error('BENCHMARK_OPENROUTER_PROBE_CONFIRMATION_INVALID')
  }
  if (env.PAPERBANANA_BENCH_MAX_JUDGE_CALLS !== '1') throw new Error('BENCHMARK_OPENROUTER_PROBE_CALL_CAP_INVALID')
  const maxUsd = Number(env.PAPERBANANA_BENCH_MAX_ESTIMATED_USD)
  const perCallUsd = Number(env.PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD)
  if (maxUsd !== 0.1 || perCallUsd !== 0.1) throw new Error('BENCHMARK_OPENROUTER_PROBE_BUDGET_INVALID')
  const kind = String(env.PAPERBANANA_OPENROUTER_PROBE_KIND || '') as OpenRouterJudgeProbeKind
  if (!['text_only', 'minimal_image', 'benchmark_fixture'].includes(kind)) throw new Error('BENCHMARK_OPENROUTER_PROBE_KIND_INVALID')
  const provenance = await loadBuildProvenance()
  if (provenance.codeSha !== String(env.PAPERBANANA_CODE_SHA || '').toLowerCase()) {
    throw new Error('BENCHMARK_OPENROUTER_PROBE_PROVENANCE_MISMATCH')
  }
  const key = loadBenchCredentials(env).openrouter
  if (!key) throw new Error('BENCHMARK_OPENROUTER_PROBE_CREDENTIAL_MISSING')

  let imageBase64: string | undefined
  if (kind === 'minimal_image') {
    imageBase64 = (await sharp({ create: { width: 256, height: 256, channels: 4, background: '#4c6fff' } }).png().toBuffer()).toString('base64')
  } else if (kind === 'benchmark_fixture') {
    imageBase64 = Buffer.from(await renderCalibrationFixture(JUDGE_CALIBRATION_FIXTURES[0])).toString('base64')
  }
  const egress = createOpenRouterJudgeEgress(env)
  try {
    const result = await runOpenRouterJudgeProbe({ kind, apiKey: key, imageBase64, fetchImpl: egress.fetch })
    process.stdout.write(`OPENROUTER_JUDGE_PROBE_RESULT=${result}\n`)
  } finally { await egress.close() }
}

void main().catch(() => {
  process.stderr.write('BENCHMARK_OPENROUTER_PROBE_FAILURE_REDACTED\n')
  process.exitCode = 1
})
