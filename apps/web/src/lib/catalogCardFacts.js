// Display-only facts. Product image-input requirements are a lower bound;
// request caps and model names never establish official token limits.
export const cardFields = ['inputModalities', 'outputModalities', 'totalContextTokens', 'maxOutputTokens']
export function safeSources(values) {
  return [...new Set((values || []).filter(value => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
  }))]
}
const modalityNames = { text: '文本', image: '图像', audio: '音频', video: '视频', file: '文件' }
const positive = value => Number.isSafeInteger(value) && value > 0 ? value : null
function reviewedTokens(value) {
  if (typeof value === 'number') return positive(value)
  const match = /^([\d,]+(?:\.\d+)?)\s*([KM]?)/i.exec(value || '')
  if (!match || !positive(Number(match[1].replaceAll(',', '')) * ({ K: 1000, M: 1000000 }[match[2].toUpperCase()] || 1))) return null
  return match[2] ? match[1] + match[2] : Number(match[1].replaceAll(',', ''))
}
export function catalogCardFacts(provider, model, reviewedModels, specificPages = []) {
  const entry = reviewedModels.models.find(entry => entry.lookupIds.includes(model.id) && (!entry.providers || entry.providers.includes(provider)))
  const reviewed = entry && { ...entry, ...entry.providerOverrides?.[provider], ...entry.variantOverrides?.[model.id] }
  const channel = model.specifications?.version === 1 ? model.specifications : null
  const detailed = model.specificModelSpecifications || specificPages.find(row=>row.keys.includes(provider + '/' + model.id))?.specifications
  const manufacturer = !reviewed && channel?.manufacturer?.identity === 'matched' ? channel.manufacturer : null
  const raw = (data, field) => field === 'totalContextTokens' ? positive(data.contextWindowTokens)
    : field === 'maxOutputTokens' ? positive(data.maxOutputTokens) : data[field === 'inputModalities' ? 'officialInputModalities' : 'officialOutputModalities']
  const layers = [detailed, reviewed, manufacturer, channel].filter(Boolean)
  const result = {}
  for (const field of cardFields) {
    const key = { inputModalities: 'input', outputModalities: 'output', totalContextTokens: 'context', maxOutputTokens: 'maxOutput' }[field]
    const ordered = channel?.serviceDetails?.length || field === 'totalContextTokens' && detailed?.sourceScope !== 'service' && positive(channel?.contextWindowTokens)
      ? [channel, ...layers.filter(layer => layer !== channel)] : layers
    for (const layer of ordered) {
      const sources = safeSources(layer === reviewed ? layer[key + 'Sources'] || layer.sources : layer.sourceUrls)
      if (!sources.length) continue
      const displayValue = layer === reviewed && field.endsWith('Modalities') ? layer[key] : null
      const value = layer === reviewed ? field.endsWith('Modalities')
        ? Object.entries(modalityNames).filter(([, name]) => displayValue?.includes(name)).map(([id]) => id)
        : reviewedTokens(field === 'totalContextTokens' ? layer.context : layer.maxOutputTokens) : raw(layer, field)
      if (field.endsWith('Modalities') ? !Array.isArray(value) || !value.length : !reviewedTokens(value)) continue
      result[field] = { value, state: 'known', provenance: 'catalog', sourceUrl: sources[0], sourceUrls: sources,
        verifiedAt: layer.checkedAt || layer.reviewedAt || reviewedModels.reviewedAt || null,
        ...(displayValue ? { displayValue } : {}),
        ...(field === 'totalContextTokens' && layer === reviewed ? { suffix: String(layer.context).replace(/^[\d,.]+\s*[KM]?/i, '') } : {}),
        ...(field === 'totalContextTokens' && layer.contextWindowApproximate ? { approximate: true } : {}) }
      break
    }
  }
  return result
}
export function needsImageInput(model) {
  const caps = model.capabilities || {}
  return model.roles?.some(role => ['vision', 'edit', 'source-image', 'reference-image'].includes(role))
    || !!(caps.referenceImages || caps.requiresSourceImage || caps.imageEditing || caps.imageEditMode === 'direct-edit')
    || model.operations?.some?.(operation => operation.requiresSourceImage || operation.requiresImageInput)
}
export function supportedModalities(value, existing, image = false) {
  return [...new Set([...(Array.isArray(value) ? value : []), ...(Array.isArray(existing) ? existing : []), ...(image ? ['image'] : [])])]
}
export function mergeCardFacts(audit, existing, model = {}) {
  const fields = {}, conflicts = []
  const comparable = value => JSON.stringify(Array.isArray(value) ? [...value].sort() : value)
  for (const field of cardFields) {
    const fact = audit.fields[field], prior = existing[field]
    const excluded = fact.provenance === 'channel' ? fact.unsupportedModalities || [] : []
    fields[field] = fact.state === 'unknown' && !fact.suppressFallback && prior ? prior : fact
    if (field.endsWith('Modalities') && excluded.length) {
      fields[field] = { ...fact, value: supportedModalities(fact.value, prior?.value).filter(value => !excluded.includes(value)), displayValue: undefined }
    } else if (field.endsWith('Modalities') && prior?.state === 'known') {
      const values = supportedModalities(fact.value, prior.value)
      if (values.some(value => !fact.value?.includes?.(value))) fields[field] = {
        ...prior, value: values,
        ...(comparable(values) !== comparable(prior.value) ? { displayValue: undefined } : {}),
      }
    }
    if (fact.state !== 'unknown' && prior && (fact.state !== prior.state || comparable(fact.value) !== comparable(prior.value)))
      conflicts.push({ field, auditValue: fact.value, auditState: fact.state, existingValue: prior.value, sources: safeSources([fact.sourceUrl, ...prior.sourceUrls]) })
  }
  if (needsImageInput(model) && !fields.inputModalities.unsupportedModalities?.includes('image') && !fields.inputModalities.value?.includes?.('image')) {
    const prior = fields.inputModalities
    fields.inputModalities = { ...prior, value: supportedModalities(prior.value, [], true), state: 'known', provenance: 'product', sourceUrl: null, sourceUrls: [], displayValue: undefined }
  }
  return { fields, conflicts }
}
