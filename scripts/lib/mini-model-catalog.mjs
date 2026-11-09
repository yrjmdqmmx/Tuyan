import { mergeCardFacts } from '../../apps/web/src/lib/catalogCardFacts.js'
import { modelCardSources, modelSourceName } from '../../apps/web/src/lib/modelCardSources.js'
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
  const facts = [], sources = [], rows = {}, details = {}, sourceTemplates = []
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
      return [field, { value: fact[0], state: fact[1], provenance: fact[2], sourceUrl: data.sources[fact[3]] || null, suppressFallback: data.details[key]?.suppressFallback?.includes(field), unsupportedModalities: data.details[key]?.unsupportedModalities?.[field], modalityMasks: data.details[key]?.modalityMasks?.[field] }]
    })) }
    // Roles are already in the registry: apply their image floor at runtime.
    const merged = mergeCardFacts(audit, existing).fields
    const source = data.rows[key] ? row[5] ?? row.slice(0, 4).map(i => data.facts[i][3]).find(i => i !== null) : null
    const notice = data.notices[key]
    const links = modelCardSources({ channel, model, fields: merged,
      audit: { ...audit, ...data.details[key], sourceUrl: data.sources[source] },
      lifecycle: notice ? { ...notice, state: 'scheduled' } : null, checks: data.sourceChecks })
    const sourceUrl = links.sources[0]
    rows[key] = [...data.fields.map((field, index) => {
      const fact = merged[field]
      let value = fact.value, prior
      if (field.endsWith('Modalities')) {
        const original = audit.fields[field]
        // Store operands, never the union. Zero references the registry field.
        if (original.state === 'known' && !original.suppressFallback && !original.modalityMasks?.length && !original.unsupportedModalities?.length && existing[field]?.value?.some(x => !original.value.includes(x))) {
          value = original.value
          prior = existing[field].value
        }
        // Product-config facts are derived from roles/capabilities at runtime.
        if (fact.provenance === 'product') value = value?.filter(x => x !== 'image')
        if (JSON.stringify(value) === JSON.stringify(model[field])) value = 0
        if (prior && JSON.stringify(prior) === JSON.stringify(model[field])) prior = 0
      }
      // Per-field slots reference the primary URL when equal. Additional vendor
      // links are stored once in details; the full evidence stays in Web/API.
      return intern(facts, [value, fact.state, fact.provenance, fact.sourceUrl && fact.sourceUrl === sourceUrl ? -1 : null, ...(prior !== undefined ? [prior] : [])])
    }), sourceUrl === 'https://tokendance.space/models/' + model.id && channel === 'tokendance'
      && data.details[key]?.sourceLinks?.some(link => link.url === sourceUrl && link.kind === 'model-page' && link.checkedAt)
      ? -2 : sourceUrl ? intern(sources, sourceUrl) : null]
    const label = sourceUrl && modelSourceName(links, sourceUrl)
    if (label && label !== '官方文档') rows[key].push(label === '下线公告' ? 1 : 2)
    const note = data.details[key]?.note, suffix = merged.totalContextTokens?.suffix
    if (note || suffix) details[key] = { ...(note ? { note } : {}), ...(suffix ? { suffix } : {}) }
    if (data.details[key]?.unsupportedModalities) details[key] = { ...details[key], unsupportedModalities: data.details[key].unsupportedModalities }
    if (data.details[key]?.suppressFallback) details[key] = { ...details[key], suppressFallback: data.details[key].suppressFallback }
    const vendorSources = links.vendorSources.filter(url => url !== sourceUrl)
    if (vendorSources.length && Object.values(merged).some(fact => fact.provenance === 'vendor')) details[key] = { ...details[key], vendorSources }
    if (data.details[key]?.modalityMasks) details[key] = { ...details[key], modalityMasks: data.details[key].modalityMasks }
  }
  // Encode only exact round trips of already resolved links. Shared templates
  // reuse registry IDs; they never choose or invent a model's destination.
  for (const [channel, provider] of Object.entries(providers)) for (const model of provider.models) {
    const row = rows[channel + '/' + model.id], url = sources[row[4]]
    if (!url) continue
    for (const [format, id] of [model.id, model.id.replace(/[:@]/g, '-')].entries()) {
      if (!url.includes(id)) continue
      const at = url.indexOf(id), template = [url.slice(0, at), url.slice(at + id.length), format]
      row[4] = -3 - intern(sourceTemplates, template)
      break
    }
  }
  // Compact source indices after replacing URLs with templates.
  const compactSources = []
  for (const row of Object.values(rows)) if (row[4] !== null && row[4] >= 0) row[4] = intern(compactSources, sources[row[4]])
  // Reuse the static catalog's exact identities instead of shipping each ID twice.
  const keys = Object.entries(providers).flatMap(([channel, provider]) => provider.models.map(model => channel + '/' + model.id))
  // Unverified flags and tombstone evidence are not read by the Mini UI.
  const removed = Object.fromEntries(Object.entries(data.removed).map(([key, value]) => [key, [value.replacementApiId, value.displayName, value.replacementDisplayName || null]]))
  // Optional details share the existing row identity; slot 5 stays the source label.
  const detailRows = keys.map(key => details[key] ? [...rows[key].slice(0, 5), rows[key][5] || null, details[key]] : rows[key] || null)
  return { verifiedAt: data.verifiedAt, fields: data.fields, facts, sources: compactSources, sourceTemplates, rows: detailRows, details: {}, notices: data.notices, removed }
}

export function webModelAudit(data, providers) {
  // Runtime needs card facts, lifecycle and exact removed identities. The input
  // archive and the generator's additions inventory remain server/build-side.
  const { verifiedAt, fields, facts, sources, rows, details, notices, removed, sourceChecks } = data
  const keys = Object.entries(providers).flatMap(([channel, provider]) => provider.models.map(model => channel + '/' + model.id))
  const keySet = new Set(keys)
  return { verifiedAt, fields, facts, sources, rows: keys.map(key=>rows[key] || null),
    extraRows: Object.fromEntries(Object.entries(rows).filter(([key])=>!keySet.has(key))), details, notices, removed, sourceChecks }
}
