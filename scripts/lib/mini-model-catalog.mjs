// The Mini Program consumes display/selection fields, not the full evidence archive.
// Execution capabilities, eligibility, exact IDs and ordering stay unchanged.
export function miniModelCatalog(catalog) {
  const result = structuredClone(catalog)
  for (const provider of Object.values(result.registry)) for (const model of provider.models) {
    for (const field of ['specifications', 'specificModelSpecifications', 'roleProtocols', 'officialSourceUrl', 'releaseSourceUrl', 'releaseOrderSourceUrl']) delete model[field]
    delete model.capabilities?.sizeSourceUrls
    delete model.capabilities?.sizeReviewedAt
  }
  return result
}

export function miniModelAudit(data, providers, fallback = () => ({})) {
  const facts = [], sources = [], rows = {}, details = {}
  const intern = (list, value) => {
    const i = list.findIndex(item => JSON.stringify(item) === JSON.stringify(value))
    return i < 0 ? list.push(value) - 1 : i
  }
  for (const [channel, provider] of Object.entries(providers)) for (const model of provider.models) {
    const key = channel + '/' + model.id
    const row = data.rows[key] || [0, 0, 0, 0, 1, null]
    const existing = fallback(channel, model)
    const source = data.rows[key] ? row[5] ?? row.slice(0, 4).map(i => data.facts[i][3]).find(i => i !== null) : null
    rows[key] = [...data.fields.map((field, index) => {
      const fact = data.rows[key] ? data.facts[row[index]] : [null, 'unknown', null, null]
      const prior = existing[field]
      return intern(facts, fact[1] === 'unknown' && prior && !data.details[key]?.suppressFallback?.includes(field)
        ? [prior.value, 'known', 'catalog', intern(sources, prior.sourceUrl)]
        : [...fact.slice(0, 3), fact[3] == null ? null : intern(sources, data.sources[fact[3]])])
    }), row[4], source == null ? null : intern(sources, data.sources[source])]
    const note = [data.details[key]?.note, existing.totalContextTokens?.suffix].filter(Boolean).join('；')
    if (note) details[key] = { note }
  }
  // Reuse the static catalog's exact identities instead of shipping each ID twice.
  const keys = Object.entries(providers).flatMap(([channel, provider]) => provider.models.map(model => channel + '/' + model.id))
  return { verifiedAt: data.verifiedAt, fields: data.fields, facts, sources, rows: keys.map(key => rows[key] || null), details, notices: data.notices, removed: data.removed }
}

export function webModelAudit(data, providers) {
  // Runtime needs card facts, lifecycle and exact removed identities. The input
  // archive and the generator's additions inventory remain server/build-side.
  const { verifiedAt, fields, facts, sources, rows, details, notices, removed } = data
  const keys = Object.entries(providers).flatMap(([channel, provider]) => provider.models.map(model => channel + '/' + model.id))
  const keySet = new Set(keys)
  return { verifiedAt, fields, facts, sources, rows: keys.map(key=>rows[key] || null),
    extraRows: Object.fromEntries(Object.entries(rows).filter(([key])=>!keySet.has(key))), details, notices, removed }
}
