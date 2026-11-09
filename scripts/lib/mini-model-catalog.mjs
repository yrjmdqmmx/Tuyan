import { mergeCardFacts } from '../../apps/web/src/lib/catalogCardFacts.js'
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
    const audit = { fields: Object.fromEntries(data.fields.map((field, index) => {
      const fact = data.rows[key] ? data.facts[row[index]] : [null, 'unknown', null, null]
      return [field, { value: fact[0], state: fact[1], provenance: fact[2], sourceUrl: data.sources[fact[3]] || null, suppressFallback: data.details[key]?.suppressFallback?.includes(field) }]
    })) }
    // Roles are already in the registry: apply their image floor at runtime.
    const merged = mergeCardFacts(audit, existing).fields
    const source = data.rows[key] ? row[5] ?? row.slice(0, 4).map(i => data.facts[i][3]).find(i => i !== null) : null
    const sourceUrl = data.sources[source] || Object.values(merged).find(fact => fact.sourceUrl)?.sourceUrl
    rows[key] = [...data.fields.map((field, index) => {
      const fact = merged[field]
      let value = fact.value, prior
      if (field.endsWith('Modalities')) {
        const original = audit.fields[field]
        // Store operands, never the union. Zero references the registry field.
        if (original.state === 'known' && existing[field]?.value?.some(x => !original.value.includes(x))) {
          value = original.value
          prior = existing[field].value
        }
        // Product-config facts are derived from roles/capabilities at runtime.
        if (fact.provenance === 'product') value = value?.filter(x => x !== 'image')
        if (JSON.stringify(value) === JSON.stringify(model[field])) value = 0
        if (prior && JSON.stringify(prior) === JSON.stringify(model[field])) prior = 0
      }
      return intern(facts, [value, fact.state, fact.provenance, fact.sourceUrl ? fact.sourceUrl === sourceUrl ? -1 : intern(sources, fact.sourceUrl) : null, ...(prior !== undefined ? [prior] : [])])
    }), sourceUrl ? intern(sources, sourceUrl) : null]
    const note = data.details[key]?.note, suffix = merged.totalContextTokens?.suffix
    if (note || suffix) details[key] = { ...(note ? { note } : {}), ...(suffix ? { suffix } : {}) }
  }
  // Reuse the static catalog's exact identities instead of shipping each ID twice.
  const keys = Object.entries(providers).flatMap(([channel, provider]) => provider.models.map(model => channel + '/' + model.id))
  // Unverified flags and tombstone evidence are not read by the Mini UI.
  const removed = Object.fromEntries(Object.entries(data.removed).map(([key, value]) => [key, value.replacementApiId]))
  return { verifiedAt: data.verifiedAt, fields: data.fields, facts, sources, rows: keys.map(key => rows[key] || null), details, notices: data.notices, removed }
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
