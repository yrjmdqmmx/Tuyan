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
    const valueStart = match.index + match[0].length;
    const valueEnd = serializedValueEnd(value, valueStart);
    redacted += value.slice(cursor, valueStart) + '"[REDACTED]"';
    if (valueEnd < 0) return redacted;
    cursor = valueEnd + 1;
    keyPattern.lastIndex = cursor;
  }
  return redacted + value.slice(cursor);
}

function serializedValueEnd(value, valueStart) {
  const first = value[valueStart];
  if (first === '{' || first === '[') return matchingStructuredEnd(value, valueStart);
  if (first === '"' || first === "'") return matchingQuotedEnd(value, valueStart, first);
  if (first === undefined) return -1;
  const relativeEnd = value.slice(valueStart).search(/[\s,;}]/);
  return relativeEnd < 0 ? value.length - 1 : valueStart + relativeEnd - 1;
}

function matchingQuotedEnd(value, valueStart, quote) {
  for (let index = valueStart + 1; index < value.length; index += 1) {
    if (value[index] === '\\') index += 1;
    else if (value[index] === quote) return index;
  }
  return value.length - 1;
}

function matchingStructuredEnd(value, valueStart) {
  const stack = [];
  let quote = '';
  for (let index = valueStart; index < value.length; index += 1) {
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
    } else if (character === '{' || character === '[') {
      stack.push(character);
    } else if (character === '}' || character === ']') {
      const expected = character === '}' ? '{' : '[';
      if (stack.at(-1) !== expected) return value.length - 1;
      stack.pop();
      if (!stack.length) return index;
    }
  }
  return value.length - 1;
}

export function redactErrorForLog(error) {
  return {
    name: redactText(error?.name || 'Error'),
    message: redactText(error?.message || error || 'Unknown error'),
    stack: redactText(error?.stack || ''),
  };
}
