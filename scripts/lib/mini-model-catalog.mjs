// The Mini Program consumes display/selection fields, not the full evidence archive.
// Execution capabilities, eligibility, exact IDs and ordering stay unchanged.
export function miniModelCatalog(catalog) {
  const result = structuredClone(catalog)
  for (const provider of Object.values(result.registry)) for (const model of provider.models) {
    for (const field of ['specifications', 'specificModelSpecifications', 'roleProtocols', 'officialSourceUrl', 'availabilityNotes', 'releaseSourceUrl', 'releaseOrderSourceUrl']) delete model[field]
    delete model.capabilities?.sizeSourceUrls
    delete model.capabilities?.sizeReviewedAt
  }
  return result
}

export function miniModelAudit(data, providers) {
  const facts = [], sources = [], rows = {}, details = {}
  const intern = (list, value) => {
    const i = list.findIndex(item => JSON.stringify(item) === JSON.stringify(value))
    return i < 0 ? list.push(value) - 1 : i
  }
  for (const [key, row] of Object.entries(data.rows)) {
    const source = row[5] ?? row.slice(0, 4).map(i => data.facts[i][3]).find(i => i !== null)
    rows[key] = [...row.slice(0, 4).map(i => intern(facts, [...data.facts[i].slice(0, 2), null, null])), row[4], source == null ? null : intern(sources, data.sources[source])]
    if (data.details[key]?.unknownInputModalities) details[key] = { unknownInputModalities: data.details[key].unknownInputModalities }
  }
  // Reuse the static catalog's exact identities instead of shipping each ID twice.
  const keys = Object.entries(providers).flatMap(([channel, provider]) => provider.models.map(model => channel + '/' + model.id))
  return { fields: data.fields, facts, sources, rows: keys.map(key => rows[key] || null), details, notices: data.notices, removed: data.removed }
}
