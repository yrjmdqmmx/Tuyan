const DEFAULT_SCIENTIFIC_PROVIDER_TIMEOUT_MS = 300_000
const MIN_SCIENTIFIC_PROVIDER_TIMEOUT_MS = 120_000
const MAX_SCIENTIFIC_PROVIDER_TIMEOUT_MS = 600_000

export function resolveScientificProviderTimeoutMs(value: string | undefined) {
  const timeoutMs = value === undefined ? DEFAULT_SCIENTIFIC_PROVIDER_TIMEOUT_MS : Number(value)
  if (!Number.isSafeInteger(timeoutMs)
    || timeoutMs < MIN_SCIENTIFIC_PROVIDER_TIMEOUT_MS
    || timeoutMs > MAX_SCIENTIFIC_PROVIDER_TIMEOUT_MS) {
    throw new Error('SCIENTIFIC_V2_PROVIDER_TIMEOUT_INVALID')
  }
  return timeoutMs
}
