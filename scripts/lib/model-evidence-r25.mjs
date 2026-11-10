import review from '../../config/channel-audit/review-r25-20261110.json' with {type: 'json'}

// Correct public citations without rewriting execution notices or their dates.
export function applyEvidenceR25(data, evidence = review) {
  for (const [key, fact] of Object.entries(evidence.models)) {
    const page = evidence.captures.find(p => p.url === fact.sourceUrl)
    const capture = evidence.captures.find(p => p.url === fact.captureUrl)
    if (page?.httpStatus !== 200 || capture?.httpStatus !== 200
      || !/^[a-f0-9]{64}$/.test(capture.sha256) || !capture.excerpts.includes(fact.quote)
      || !capture.excerpts.includes(fact.identityQuote) || fact.identityQuote !== key.slice(key.indexOf('/') + 1)
      || !capture.content.includes(fact.quote) || !capture.content.includes(fact.identityQuote)
      || fact.stopDate !== '2027-01-19' || !fact.quote.includes('2027年01月19日（正式下线）')
      || data.notices[key]?.stopDate !== fact.stopDate) throw Error('Invalid retirement evidence: ' + key)
    const detail = data.details[key] ||= {}
    if (detail.excludedSources?.includes(fact.sourceUrl)) throw Error('Excluded retirement source: ' + key)
    detail.lifecycleSourceUrl = fact.sourceUrl
    detail.sourceLinks = [...(detail.sourceLinks || []).filter(link => link.url !== fact.sourceUrl), {
      url: fact.sourceUrl, scope: 'channel', kind: 'retirement-notice', checkedAt: evidence.verifiedAt,
    }]
  }
  return data
}
