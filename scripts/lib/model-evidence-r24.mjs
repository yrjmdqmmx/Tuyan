import evidence from '../../config/channel-audit/review-r24-20261110.json' with { type: 'json' }

// Display evidence only: never change execution cutoffs, identities or capabilities.
export function applyEvidenceR24(data, review = evidence) {
  const intern = (list, value) => {
    const index = list.findIndex(item => JSON.stringify(item) === JSON.stringify(value))
    return index < 0 ? list.push(value) - 1 : index
  }
  for (const [key, model] of Object.entries(review.models)) {
    const row = data.rows[key]
    if (!row) throw Error('Missing reviewed model: ' + key)
    const detail = data.details[key] ||= {}
    for (const [field, fact] of Object.entries(model.fields)) {
      const index = data.fields.indexOf(field)
      const page = review.captures.find(page => page.url === fact.sourceUrl)
      const words = { text: '文本', image: '图像', video: '视频', audio: '音频' }
      const values = Array.isArray(fact.value) ? fact.value : [fact.value]
      const supported = fact.state === 'known' && page?.httpStatus === 200
        && /^[a-f0-9]{64}$/.test(page.sha256) && page.excerpts.includes(fact.quote) && page.excerpts.includes(fact.identityQuote)
        && values.every(value => fact.quote.toLowerCase().includes(String(value).toLowerCase()) || words[value] && fact.quote.includes(words[value]))
      const unknown = fact.state === 'unknown' && fact.value === null && fact.sourceUrl === null && fact.provenance === null
      if (index < 0 || !supported && !unknown) throw Error('Invalid reviewed fact: ' + key + '/' + field)
      row[index] = intern(data.facts, [fact.value, fact.state, fact.provenance, fact.sourceUrl ? intern(data.sources, fact.sourceUrl) : null])
      ;(detail.fieldVerifiedAt ||= {})[field] = review.verifiedAt
      ;(detail.fieldSources ||= {})[field] = fact.sourceUrl
      if (fact.state === 'unknown') detail.suppressFallback = [...new Set([...(detail.suppressFallback || []), field])]
    }
    if (model.sourceUrl) row[5] = intern(data.sources, model.sourceUrl)
    if (model.excludedSources) detail.excludedSources = model.excludedSources
    if (model.note) detail.note = model.note
    if (model.retirement) detail.sourceLinks = [...(detail.sourceLinks || []).filter(link => link.url !== model.retirement.sourceUrl), {
      url: model.retirement.sourceUrl, scope: 'channel', kind: 'retirement-notice', checkedAt: review.verifiedAt,
    }]
  }
  return data
}
