const MAX_DETAILED_TOKENS = 240
const MAX_MATRIX_CELLS = 40_000
const MAX_EDIT_TOKENS = 120
const GRAPHEME_SEGMENTER = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

function tokenize(value) {
  return String(value).match(/\s+|[\p{Script=Han}]|[\p{L}\p{N}_]+|[^\s]/gu) || []
}

function appendSegment(segments, type, text) {
  if (!text) return
  const previous = segments.at(-1)
  if (previous?.type === type) previous.text += text
  else segments.push({ type, text })
}

function graphemes(value) {
  if (!GRAPHEME_SEGMENTER) return Array.from(value)
  return Array.from(GRAPHEME_SEGMENTER.segment(value), (part) => part.segment)
}

function sharedEdgeDiff(before, after) {
  const beforeUnits = graphemes(before)
  const afterUnits = graphemes(after)
  let prefixLength = 0
  const sharedLimit = Math.min(beforeUnits.length, afterUnits.length)
  while (prefixLength < sharedLimit && beforeUnits[prefixLength] === afterUnits[prefixLength]) prefixLength += 1

  let suffixLength = 0
  const suffixLimit = sharedLimit - prefixLength
  while (suffixLength < suffixLimit
    && beforeUnits[beforeUnits.length - suffixLength - 1] === afterUnits[afterUnits.length - suffixLength - 1]) suffixLength += 1

  const prefix = beforeUnits.slice(0, prefixLength).join('')
  const beforeMiddle = beforeUnits.slice(prefixLength, beforeUnits.length - suffixLength).join('')
  const afterMiddle = afterUnits.slice(prefixLength, afterUnits.length - suffixLength).join('')
  const suffix = suffixLength ? beforeUnits.slice(beforeUnits.length - suffixLength).join('') : ''
  const beforeSegments = []
  const afterSegments = []
  appendSegment(beforeSegments, 'unchanged', prefix)
  appendSegment(afterSegments, 'unchanged', prefix)
  appendSegment(beforeSegments, 'removed', beforeMiddle)
  appendSegment(afterSegments, 'added', afterMiddle)
  appendSegment(beforeSegments, 'unchanged', suffix)
  appendSegment(afterSegments, 'unchanged', suffix)
  return { mode: 'fallback', before: beforeSegments, after: afterSegments }
}

function detailedDiff(before, after, beforeTokens, afterTokens) {
  const rows = Array.from(
    { length: beforeTokens.length + 1 },
    () => new Uint16Array(afterTokens.length + 1),
  )
  for (let left = beforeTokens.length - 1; left >= 0; left -= 1) {
    for (let right = afterTokens.length - 1; right >= 0; right -= 1) {
      rows[left][right] = beforeTokens[left] === afterTokens[right]
        ? rows[left + 1][right + 1] + 1
        : Math.max(rows[left + 1][right], rows[left][right + 1])
    }
  }

  const editTokens = beforeTokens.length + afterTokens.length - (2 * rows[0][0])
  if (editTokens > MAX_EDIT_TOKENS) return sharedEdgeDiff(before, after)

  const beforeSegments = []
  const afterSegments = []
  let left = 0
  let right = 0
  while (left < beforeTokens.length || right < afterTokens.length) {
    if (left < beforeTokens.length && right < afterTokens.length && beforeTokens[left] === afterTokens[right]) {
      appendSegment(beforeSegments, 'unchanged', beforeTokens[left])
      appendSegment(afterSegments, 'unchanged', afterTokens[right])
      left += 1
      right += 1
    } else if (left < beforeTokens.length
      && (right >= afterTokens.length || rows[left + 1][right] >= rows[left][right + 1])) {
      appendSegment(beforeSegments, 'removed', beforeTokens[left])
      left += 1
    } else {
      appendSegment(afterSegments, 'added', afterTokens[right])
      right += 1
    }
  }
  return { mode: 'detailed', before: beforeSegments, after: afterSegments }
}

export function createInputDiff(beforeValue, afterValue) {
  const before = String(beforeValue ?? '')
  const after = String(afterValue ?? '')
  const beforeTokens = tokenize(before)
  const afterTokens = tokenize(after)
  if (beforeTokens.length + afterTokens.length > MAX_DETAILED_TOKENS
    || beforeTokens.length * afterTokens.length > MAX_MATRIX_CELLS) {
    return sharedEdgeDiff(before, after)
  }
  return detailedDiff(before, after, beforeTokens, afterTokens)
}
