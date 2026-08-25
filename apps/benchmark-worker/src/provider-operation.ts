export class UnknownProviderOutcomeError extends Error {
  readonly code = 'UNKNOWN_PROVIDER_OUTCOME'
}

export async function runProviderOperation<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; wait?: (milliseconds: number) => Promise<void>; maxRetryAfterMs?: number } = {},
) {
  const maxRetries = Math.max(0, Math.min(2, options.maxRetries || 0))
  const wait = options.wait || ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)))
  const maxRetryAfterMs = options.maxRetryAfterMs || 30_000
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof UnknownProviderOutcomeError) throw error
      const typed = error as Error & { status?: number; retryAfterMs?: number }
      const retryAfterMs = Number(typed.retryAfterMs)
      if (typed.status !== 429 || attempt >= maxRetries || !Number.isFinite(retryAfterMs) || retryAfterMs < 0 || retryAfterMs > maxRetryAfterMs) throw error
      await wait(retryAfterMs)
    }
  }
}
