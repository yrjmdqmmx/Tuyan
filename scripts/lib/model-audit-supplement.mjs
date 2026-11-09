// Offline, exact-pair evidence overrides. No name inference or provider requests.
import deadLinks from '../../config/channel-audit/dead-links-20261109.json' with { type: 'json' }
import { isDeadSource } from '../../apps/web/src/lib/modelCardSources.js'
export function supplementModelAudit(snapshot, supplement, removed, addendum = { scheduledDeprecations: [] }) {
  const data = structuredClone(snapshot)
  const intern = (list, value) => {
    const index = list.findIndex(item => JSON.stringify(item) === JSON.stringify(value))
    return index < 0 ? list.push(value) - 1 : index
  }
  for (const [key, row] of Object.entries(removed)) {
    if (!row.displayName?.trim() || row.replacementApiId && !row.replacementDisplayName?.trim()) throw new Error(`Missing display name: ${key}`)
    delete data.rows[key]; delete data.notices[key]
  }
  for (const notice of addendum.scheduledDeprecations) {
    const key = notice.channel + '/' + notice.apiModelId
    const url = new URL(notice.sourceUrl)
    if (!data.rows[key] || removed[key] || !Number.isFinite(Date.parse(notice.stopDate)) || url.protocol !== 'https:' || url.username || url.password) throw new Error(`Invalid scheduled notice: ${key}`)
    data.notices[key] = { stopDate: notice.stopDate, scope: 'full', replacement: notice.replacement, sourceUrl: notice.sourceUrl, displayName: notice.displayName, replacementDisplayName: notice.replacementDisplayName }
  }
  data.details = {}
  data.sourceChecks = { ...supplement.sourceChecks, ...Object.fromEntries(deadLinks.map(({ url, ...check }) => [url, check])) }
  for (const [key, model] of Object.entries(supplement.models)) {
    data.rows[key] = [...data.fields.map(field => intern(data.facts, [model[field], model[field] === null ? 'unknown' : 'known', 'channel', intern(data.sources, model.fieldSources[field])])), 0, intern(data.sources, model.sourceUrls[0])]
    data.details[key] = { unknownInputModalities: model.unknownInputModalities, sourceUrls: model.sourceUrls, note: model.note }
  }
  for (const [key, override] of Object.entries(supplement.fieldOverrides || {})) {
    for (const field of data.fields.filter(field => Object.hasOwn(override, field))) {
      data.rows[key][data.fields.indexOf(field)] = intern(data.facts, [override[field], override[field] === null ? 'unknown' : 'known', 'channel', intern(data.sources, override.sourceUrl)])
      data.details[key] = { ...data.details[key], note: override.note, suppressFallback: [field] }
    }
  }
  for (const [key, links] of Object.entries(supplement.sourceLinks || {})) {
    for (const link of links) {
      const url = new URL(link.url)
      if (!/^[a-z][a-z0-9-]*\/.+/.test(key) || !['channel', 'vendor'].includes(link.scope) || !link.kind
        || !/^\d{4}-\d{2}-\d{2}$/.test(link.checkedAt) || url.protocol !== 'https:' || url.username || url.password)
        throw new Error(`Invalid card source: ${key}`)
    }
    data.details[key] = { ...data.details[key], sourceLinks: links }
  }
  // Core/API exposes source pointers, while field URLs remain historical evidence.
  // Mini resolves the same filtered card links at build time, without a runtime denylist.
  for (const [key, row] of Object.entries(data.rows)) {
    const detail = data.details[key]
    if (detail?.sourceLinks) detail.sourceLinks = detail.sourceLinks.filter(link => !isDeadSource(link.url))
    if (detail?.sourceUrls) detail.sourceUrls = detail.sourceUrls.filter(url => !isDeadSource(url))
    if (isDeadSource(data.sources[row[5]])) {
      const url = detail?.sourceLinks?.[0]?.url || detail?.sourceUrls?.[0]
      row[5] = url ? intern(data.sources, url) : null
    }
  }
  // Only reviewed, verbatim channel evidence can exclude individual modalities.
  for (const [key, exclusions] of Object.entries(supplement.modalityExclusions || {})) {
    for (const [field, evidence] of Object.entries(exclusions)) {
      const fact = data.facts[data.rows[key]?.[data.fields.indexOf(field)]]
      if (!['inputModalities', 'outputModalities'].includes(field) || !fact || fact[1] !== 'known' || fact[2] !== 'channel'
        || data.sources[fact[3]] !== evidence.sourceUrl || !evidence.quote?.trim() || evidence.verifiedAt !== data.verifiedAt
        || !Array.isArray(evidence.values) || !evidence.values.length
        || evidence.values.some(value => !['text', 'image', 'audio', 'video'].includes(value) || fact[0].includes(value)))
        throw new Error(`Invalid modality exclusion: ${key}/${field}`)
      data.details[key] ||= {}
      data.details[key].unsupportedModalities ||= {}
      data.details[key].unsupportedModalities[field] = evidence.values
    }
  }
  // Drop unused facts/sources as well as removed rows, keeping regeneration stable.
  const facts = [], sources = []
  for (const row of Object.values(data.rows)) {
    for (let i = 0; i < data.fields.length; i++) {
      const fact = [...data.facts[row[i]]]
      fact[3] = fact[3] === null ? null : intern(sources, data.sources[fact[3]])
      row[i] = intern(facts, fact)
    }
    row[5] = row[5] === null ? null : intern(sources, data.sources[row[5]])
  }
  return { ...data, facts, sources, removed }
}
