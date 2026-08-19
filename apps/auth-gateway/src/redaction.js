export function redactText(value) {
  return redactApiKeyMaps(String(value || ''))
    .replace(/(\b(?:cookie|set-cookie)\s*:\s*)[^\r\n]+/gi, '$1[REDACTED]')
    .replace(
      /(\\?"(?:authorization|cookie|password|token|secret|(?:admin|gateway|guest|access|refresh|session|bearer)[_-]?token|api[_-]?key|access[_-]?key(?:id|secret))\\?"\s*:\s*\\?")((?:\\.|[^"\\])*)(\\?")/gi,
      '$1[REDACTED]$3',
    )
    .replace(
      /((?:['"])?(?:authorization|cookie|password|token|secret|(?:admin|gateway|guest|access|refresh|session|bearer)[_-]?token|api[_-]?key|access[_-]?key(?:id|secret))(?:['"])?\s*:\s*')((?:\\.|[^'\\])*)(')/gi,
      '$1[REDACTED]$3',
    )
    .replace(/(mongodb(?:\+srv)?:\/\/[^:@/\s]+:)[^@/\s]+(@)/gi, '$1[REDACTED]$2')
    .replace(/\b(sk-[A-Za-z0-9_-]{8,})\b/g, '[REDACTED]')
    .replace(/([?&](?:api[_-]?key|key|token|secret)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(
      /((?:authorization|cookie|api[_-]?key|access[_-]?key(?:id|secret)|(?:admin|gateway|guest|access|refresh|session|bearer)[_-]?token|token|secret|password)\s*[:=]\s*)(?:Bearer\s+)?[^\s,;&}"']+/gi,
      '$1[REDACTED]',
    );
}

function redactApiKeyMaps(value) {
  const keyPattern = /(?:\\?["'])?api[_-]?keys?(?:\\?["'])?\s*:\s*/gi;
  let redacted = '';
  let cursor = 0;
  let match;
  while ((match = keyPattern.exec(value))) {
    const objectStart = match.index + match[0].length;
    if (value[objectStart] !== '{') continue;
    const objectEnd = matchingObjectEnd(value, objectStart);
    redacted += value.slice(cursor, objectStart) + '"[REDACTED]"';
    if (objectEnd < 0) return redacted;
    cursor = objectEnd + 1;
    keyPattern.lastIndex = cursor;
  }
  return redacted + value.slice(cursor);
}

function matchingObjectEnd(value, objectStart) {
  let depth = 0;
  let quote = '';
  for (let index = objectStart; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === '\\') {
        index += 1;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}' && --depth === 0) {
      return index;
    }
  }
  return -1;
}

export function redactErrorForLog(error) {
  return {
    name: redactText(error?.name || 'Error'),
    message: redactText(error?.message || error || 'Unknown error'),
    stack: redactText(error?.stack || ''),
  };
}
