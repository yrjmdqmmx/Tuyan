export function normalizeAuthoritativeImageRuntimeError(error: unknown) {
  if (error && typeof error === 'object') {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'status')
    const status = descriptor && 'value' in descriptor ? descriptor.value : undefined
    if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599) return error
  }
  return error instanceof Error ? error : new Error('UNKNOWN_PROVIDER_OUTCOME_AFTER_DISPATCH')
}
