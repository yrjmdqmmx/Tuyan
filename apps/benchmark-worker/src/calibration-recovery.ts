import { canonicalHash } from '@paperbanana/benchmark-core'

type RecoveryBinding = {
  codeSha: string
  notBefore: string
  maxJudgeCalls: number
  maxEstimatedUsd: number
  estimatedPerJudgeCallUsd: number
  priceSource: string
  priceCapturedAt: string
}

type ReportCandidate = {
  objectKey: string
  report: Record<string, any>
}

function exactReport(candidate: ReportCandidate, binding: RecoveryBinding) {
  const report = candidate.report
  const authorization = report?.authorization
  const priceSnapshot = report?.priceSnapshot
  const usage = report?.usage
  const result = report?.result
  const reportHashBase = report && typeof report === 'object' && !Array.isArray(report) ? { ...report } : null
  if (!reportHashBase || !authorization || !priceSnapshot || !usage || !result) return false
  delete reportHashBase.operatorReportHash
  delete reportHashBase.reportObjectKey
  const authorizationBase = { ...authorization }
  delete authorizationBase.authorizationHash
  const createdAt = new Date(report.createdAt)
  const notBefore = new Date(binding.notBefore)
  const operatorReportHash = String(report.operatorReportHash || '')
  const exactObjectKey = `bench/operator-reports/${operatorReportHash}.json`
  return /^[a-f0-9]{64}$/.test(operatorReportHash)
    && candidate.objectKey === exactObjectKey
    && canonicalHash(reportHashBase) === operatorReportHash
    && canonicalHash(authorizationBase) === authorization.authorizationHash
    && report.authorizationHash === authorization.authorizationHash
    && canonicalHash(priceSnapshot) === report.priceHash
    && report.priceHash === authorization.priceHash
    && report.operatorMode === 'calibration'
    && report.codeSha === binding.codeSha
    && authorization.mode === 'calibration'
    && authorization.codeSha === binding.codeSha
    && authorization.maxGenerations === 0
    && authorization.maxJudgeCalls === binding.maxJudgeCalls
    && authorization.maxEstimatedUsd === binding.maxEstimatedUsd
    && authorization.estimatedPerGenerationUsd === 0
    && authorization.estimatedPerJudgeCallUsd === binding.estimatedPerJudgeCallUsd
    && priceSnapshot.currency === 'USD'
    && priceSnapshot.source === binding.priceSource
    && priceSnapshot.capturedAt === binding.priceCapturedAt
    && priceSnapshot.estimatedPerGenerationUsd === 0
    && priceSnapshot.estimatedPerJudgeCallUsd === binding.estimatedPerJudgeCallUsd
    && Number.isFinite(createdAt.getTime())
    && Number.isFinite(notBefore.getTime())
    && createdAt >= notBefore
    && usage.generations === 0
    && Number.isInteger(usage.judgments)
    && usage.judgments >= 12
    && usage.judgments <= binding.maxJudgeCalls
    && Math.abs(usage.estimatedUsd - usage.judgments * binding.estimatedPerJudgeCallUsd) <= 1e-9
    && result.passed === true
    && Number.isInteger(result.correctRedLines)
    && Number.isInteger(result.totalRedLines)
    && result.totalRedLines > 0
    && result.correctRedLines / result.totalRedLines >= 0.85
    && Number(result.accuracy) === result.correctRedLines / result.totalRedLines
    && Number(result.agreement) >= 0.8
}

export function selectRecoverableCalibrationReport(candidates: ReportCandidate[], binding: RecoveryBinding) {
  const matches = candidates.filter((candidate) => exactReport(candidate, binding))
  if (!matches.length) throw new Error('BENCHMARK_CALIBRATION_RECOVERY_NOT_FOUND')
  if (matches.length !== 1) throw new Error('BENCHMARK_CALIBRATION_RECOVERY_AMBIGUOUS')
  return { ...matches[0].report, reportObjectKey: matches[0].objectKey }
}
