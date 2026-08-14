const sensitiveKeys = new Set([
  'authorization',
  'xpaperbananagatewaytoken',
  'gatewaytoken',
  'admintoken',
  'apikey',
  'apikeys',
  'body',
  'requestbody',
])

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function redactString(value: string): string {
  return value.replace(/([?&]key=)[^&#\s]+/gi, '$1[REDACTED]')
}

export function redactLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return redactString(value)
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[CIRCULAR]'
  seen.add(value)

  if (Array.isArray(value)) return value.map((item) => redactLogValue(item, seen))
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) }
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeys.has(normalizedKey(key)) ? '[REDACTED]' : redactLogValue(item, seen),
    ]),
  )
}
