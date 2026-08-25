import OSS from 'ali-oss'

import { selectRecoverableCalibrationReport } from './calibration-recovery.js'
import { loadBuildProvenance } from './build-provenance.js'

const env = process.env

function required(name: string) {
  const value = String(env[name] || '').trim()
  if (!value) throw new Error('BENCHMARK_CALIBRATION_RECOVERY_INPUT_INVALID')
  return value
}

function requiredNumber(name: string) {
  const value = Number(required(name))
  if (!Number.isFinite(value) || value < 0) throw new Error('BENCHMARK_CALIBRATION_RECOVERY_INPUT_INVALID')
  return value
}

async function main() {
  if (env.PAPERBANANA_BENCH_ENABLED !== 'false') throw new Error('BENCHMARK_CALIBRATION_RECOVERY_REQUIRES_DISABLED_WORKER')
  const binding = {
    codeSha: required('PAPERBANANA_RECOVERY_CODE_SHA'),
    notBefore: required('PAPERBANANA_RECOVERY_NOT_BEFORE'),
    maxJudgeCalls: requiredNumber('PAPERBANANA_RECOVERY_MAX_JUDGE_CALLS'),
    maxEstimatedUsd: requiredNumber('PAPERBANANA_RECOVERY_MAX_ESTIMATED_USD'),
    estimatedPerJudgeCallUsd: requiredNumber('PAPERBANANA_RECOVERY_ESTIMATED_PER_JUDGE_CALL_USD'),
    priceSource: required('PAPERBANANA_RECOVERY_PRICE_SOURCE'),
    priceCapturedAt: required('PAPERBANANA_RECOVERY_PRICE_CAPTURED_AT'),
  }
  if (!/^[a-f0-9]{40}$/.test(binding.codeSha) || !Number.isInteger(binding.maxJudgeCalls)
    || new Date(binding.notBefore).toISOString() !== binding.notBefore
    || new Date(binding.priceCapturedAt).toISOString() !== binding.priceCapturedAt) {
    throw new Error('BENCHMARK_CALIBRATION_RECOVERY_INPUT_INVALID')
  }
  const provenance = await loadBuildProvenance()
  if (provenance.codeSha !== binding.codeSha) throw new Error('BENCHMARK_CALIBRATION_RECOVERY_PROVENANCE_MISMATCH')
  const oss = new OSS({
    region: required('PAPERBANANA_BENCH_OSS_REGION'),
    accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
    accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'),
    bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
    endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'),
    secure: true,
    authorizationV4: true,
  })
  const objectKeys: string[] = []
  let marker: string | undefined
  do {
    const page = await oss.list({ prefix: 'bench/operator-reports/', 'max-keys': 100, ...(marker ? { marker } : {}) }, {})
    for (const object of page.objects || []) {
      if (/^bench\/operator-reports\/[a-f0-9]{64}\.json$/.test(object.name)) objectKeys.push(object.name)
    }
    if (!page.isTruncated) break
    const nextMarker = page.nextMarker || page.objects?.at(-1)?.name
    if (!nextMarker || nextMarker === marker) throw new Error('BENCHMARK_CALIBRATION_RECOVERY_LIST_FAILED')
    marker = nextMarker
  } while (true)
  const candidates = []
  for (const objectKey of objectKeys) {
    try {
      const result = await oss.get(objectKey)
      if (Buffer.byteLength(result.content) > 1024 * 1024) continue
      candidates.push({ objectKey, report: JSON.parse(Buffer.from(result.content).toString('utf8')) })
    } catch {}
  }
  process.stdout.write(`${JSON.stringify(selectRecoverableCalibrationReport(candidates, binding))}\n`)
}

void main().catch((error) => {
  const message = String((error as Error)?.message || '')
  const safe = /^BENCHMARK_CALIBRATION_RECOVERY_[A-Z_]{1,80}$/.test(message)
    ? message
    : 'BENCHMARK_CALIBRATION_RECOVERY_FAILED'
  process.stderr.write(`${safe}\n`)
  process.exitCode = 1
})
