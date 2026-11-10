import evidence from '../../config/channel-audit/model-modality-phase2-20261109.json' with { type: 'json' }

const hosts = { bailian: 'help.aliyun.com', fal: 'fal.ai', ideogram: 'developer.ideogram.ai', qianfan: 'cloud.baidu.com', replicate: 'replicate.com', sensenova: 'platform.sensenova.cn', runware: 'runware.ai' }
const modalities = ['text', 'image', 'audio', 'video', 'file']
const fields = ['inputModalities', 'outputModalities']

// Versioned, exact-channel evidence only. No live access during generation.
export function applyPhase2(data, review = evidence) {
  const intern = (list, value) => {
    const i = list.findIndex(item => JSON.stringify(item) === JSON.stringify(value))
    return i < 0 ? list.push(value) - 1 : i
  }
  function validate(key, row) {
    const url = new URL(row.sourceUrl), page = review.pages[row.sourceUrl]
    if (!/^[a-z]+\/.+/.test(key) || url.protocol !== 'https:' || url.username || url.password || url.hostname !== hosts[key.split('/')[0]]
      || !row.quote?.trim() || row.verifiedAt !== review.verifiedAt || !['2026-11-09', '2026-11-10'].includes(row.verifiedAt)
      || page?.status !== 200 || page.checkedAt.slice(0, 10) !== row.verifiedAt || !page.sha256?.match(/^[a-f0-9]{64}$/)
      || !page.excerpts?.includes(row.quote) || (row.supportingQuotes || []).some(quote => !page.excerpts?.includes(quote)))
      throw new Error(`Invalid phase 2 channel evidence: ${key}`)
    data.rows[key] ||= [...data.fields.map(() => intern(data.facts, [null, 'unknown', null, null])), 1, null]
  }
  function replace(key, field, value, row, exhaustive) {
    if (!fields.includes(field) || !Array.isArray(value) || !value.length || value.some(x => !modalities.includes(x)))
      throw new Error(`Invalid phase 2 modalities: ${key}/${field}`)
    data.rows[key][data.fields.indexOf(field)] = intern(data.facts, [value, 'known', 'channel', intern(data.sources, row.sourceUrl)])
    const detail = data.details[key] ||= {}
    if (row.verifiedAt !== data.verifiedAt) (detail.fieldVerifiedAt ||= {})[field] = row.verifiedAt
    detail.suppressFallback = [...new Set([...(detail.suppressFallback || []), field])]
    if (exhaustive) (detail.unsupportedModalities ||= {})[field] = modalities.slice(0, 4).filter(x => !value.includes(x))
  }
  for (const [key, row] of Object.entries(review.tables)) {
    validate(key, row)
    if (!row.identityQuote?.includes(key.slice(key.indexOf('/') + 1)) || !review.pages[row.sourceUrl].excerpts.includes(row.identityQuote) || !/输入模态.*输出模态/.test(row.quote))
      throw new Error(`Missing exact table identity: ${key}`)
    const table = row.quote.match(/^输入模态 (.*?) 输出模态 (.*)$/)
    for (const [index, field] of fields.entries()) if (JSON.stringify(table?.[index + 1].match(/Text|Image|Audio|Video/g)?.map(x => x.toLowerCase())) !== JSON.stringify(row[field]))
      throw new Error(`Table values disagree with quote: ${key}/${field}`)
    for (const field of fields) replace(key, field, row[field], row, true)
  }
  for (const [key, rows] of Object.entries(review.reviews)) for (const [field, row] of Object.entries(rows)) {
    validate(key, row)
    if (!fields.includes(field) || !['mask', 'positive-only'].includes(row.mode) || !Object.keys(row.decisions || {}).length
      || Object.entries(row.decisions).some(([id, state]) => !modalities.includes(id) || !['supported', 'unknown'].includes(state)
        || row.mode === 'positive-only' && (row.value?.includes(id) !== (state === 'supported')) || row.mode === 'mask' && state !== 'unknown'))
      throw new Error(`Invalid phase 2 decision: ${key}/${field}`)
    if (row.mode === 'positive-only') replace(key, field, row.value, row, false)
    else {
      // Silence about one modality cannot erase unrelated, previously known facts.
      const detail = data.details[key] ||= {}
      ;(detail.modalityMasks ||= {})[field] = Object.keys(row.decisions)
    }
  }
  for (const [key, row] of Object.entries(review.links)) {
    if (row.availability !== 'unverified' || row.verifiedAt !== review.verifiedAt || !row.attempts.length || data.removed?.[key])
      throw new Error(`Invalid phase 2 retained model: ${key}`)
    for (const attempt of row.attempts) {
      const url = new URL(attempt.sourceUrl), final = new URL(attempt.finalUrl)
      if ([url, final].some(value => value.protocol !== 'https:' || value.hostname !== hosts[key.split('/')[0]] || value.username || value.password)
        || ![200, 404].includes(attempt.status) || attempt.checkedAt.slice(0, 10) !== row.verifiedAt
        || !attempt.sha256?.match(/^[a-f0-9]{64}$/) || !attempt.quote?.trim() || attempt.matchesExactModel !== false)
        throw new Error(`Invalid phase 2 availability evidence: ${key}`)
    }
  }
  return data
}
