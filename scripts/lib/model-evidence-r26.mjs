import review from '../../config/channel-audit/review-r26-20261110.json' with {type: 'json'}

// Offline evidence guard. A generic page or a different snapshot cannot satisfy it.
export function verifiedRetirement(key, sourceUrl, stopDate, evidence = review) {
  const exception = evidence.allowList.find(row => row.card === key && row.sourceUrl === sourceUrl && row.stopDate === stopDate)
  if (exception?.reason?.trim()) return exception
  const fact = evidence.models[key], id = key.slice(key.indexOf('/') + 1)
  const page = evidence.captures.find(row => row.url === sourceUrl)
  const capture = evidence.captures.find(row => row.url === fact?.captureUrl)
  const date = fact?.dateQuote.match(/(\d{4})[年-](\d{2})[月-](\d{2})/)
  if (!fact?.verified || fact.identity !== id || fact.identityMatch !== 'exact'
    || !fact.quote.split(/\s+/).includes(id) || fact.sourceUrl !== sourceUrl || fact.stopDate !== stopDate
    || !date || date.slice(1).join('-') !== stopDate.slice(0, 10)
    || page?.httpStatus !== 200 || capture?.httpStatus !== 200
    || (capture.url !== sourceUrl && capture.parentUrl !== sourceUrl)
    || !/^[a-f0-9]{64}$/.test(capture.sha256) || capture.sha256 !== fact.sha256
    || capture.fetchStartUTC !== fact.fetchStartUTC || capture.fetchTimeAsiaShanghai !== fact.fetchTimeAsiaShanghai
    || !capture.content.includes(fact.quote) || !capture.content.includes(fact.dateQuote)) {
    throw Error('Unverified retirement source: ' + key)
  }
  return fact
}

export function applyEvidenceR26(data, evidence = review) {
  for (const [key, fact] of Object.entries(evidence.models)) {
    verifiedRetirement(key, fact.sourceUrl, data.notices[key]?.stopDate, evidence)
    if (fact.decision !== 'replace-source') continue
    const detail = data.details[key] ||= {}
    detail.lifecycleSourceUrl = fact.sourceUrl
    detail.excludedSources = [...new Set([...(detail.excludedSources || []), fact.oldUrl])]
    detail.sourceLinks = [...(detail.sourceLinks || []).filter(link => link.url !== fact.sourceUrl && link.url !== fact.oldUrl), {
      url: fact.sourceUrl, scope: 'channel', kind: 'retirement-notice', checkedAt: evidence.verifiedAt,
    }]
  }
  return data
}
