export function redactText(value) {
  return String(value || '')
    .replace(/(mongodb(?:\+srv)?:\/\/[^:@/\s]+:)[^@/\s]+(@)/gi, '$1[REDACTED]$2')
    .replace(/\b(sk-[A-Za-z0-9_-]{8,})\b/g, '[REDACTED]')
    .replace(/([?&](?:api[_-]?key|key|token|secret)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/((?:authorization|api[_-]?key|token|secret|password)\s*[:=]\s*)(?:Bearer\s+)?[^\s,;]+/gi, '$1[REDACTED]');
}

export function redactErrorForLog(error) {
  return {
    name: redactText(error?.name || 'Error'),
    message: redactText(error?.message || error || 'Unknown error'),
    stack: redactText(error?.stack || ''),
  };
}
