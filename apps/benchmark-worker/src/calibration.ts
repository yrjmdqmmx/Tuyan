export function evaluateJudgeCalibration(input: { correctRedLines: number; totalRedLines: number; agreement: number }) {
  if (!Number.isInteger(input.correctRedLines) || !Number.isInteger(input.totalRedLines) || input.totalRedLines <= 0) throw new Error('INVALID_JUDGE_CALIBRATION')
  const accuracy = input.correctRedLines / input.totalRedLines
  return { accuracy, agreement: input.agreement, passed: accuracy >= 0.85 && input.agreement >= 0.8 }
}
