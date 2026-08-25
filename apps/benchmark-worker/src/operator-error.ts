export function classifyOperatorError(error: unknown) {
  const message = String((error as Error)?.message || error || '')
  if (/^BENCHMARK_[A-Z0-9_:.-]{1,120}$/.test(message)) return message
  if (/outcome unknown|unknown after dispatch|timed out after dispatch/i.test(message)) {
    return 'BENCHMARK_OPERATOR_UNKNOWN_PROVIDER_OUTCOME'
  }
  return 'BENCHMARK_OPERATOR_FAILURE_REDACTED'
}
