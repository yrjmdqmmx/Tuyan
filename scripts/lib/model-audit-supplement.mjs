// Offline, exact-pair evidence overrides. No name inference or provider requests.
export function supplementModelAudit(snapshot, supplement, removed, addendum = { scheduledDeprecations: [] }) {
  const data = structuredClone(snapshot)
  const intern = (list, value) => {
    const index = list.findIndex(item => JSON.stringify(item) === JSON.stringify(value))
    return index < 0 ? list.push(value) - 1 : index
  }
  for (const key of Object.keys(removed)) { delete data.rows[key]; delete data.notices[key] }
  for (const notice of addendum.scheduledDeprecations) {
    const key = notice.channel + '/' + notice.apiModelId
    const url = new URL(notice.sourceUrl)
    if (!data.rows[key] || removed[key] || !Number.isFinite(Date.parse(notice.stopDate)) || url.protocol !== 'https:' || url.username || url.password) throw new Error(`Invalid scheduled notice: ${key}`)
    data.notices[key] = { stopDate: notice.stopDate, scope: 'full', replacement: notice.replacement, sourceUrl: notice.sourceUrl }
  }
  data.details = {}
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
