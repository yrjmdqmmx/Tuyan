import { auditedModelSpecs, auditedModelLifecycle } from './modelAudit.js'
import reviewedModels from '../data/model-card-specifications.json'

const reviewedById = new Map()
for (const entry of reviewedModels.models) {
  for (const id of entry.lookupIds) reviewedById.set(id, entry)
}
export function safeOfficialSources(values) {
  return [...new Set(Array.isArray(values) ? values : [])].filter(value => {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && !url.username && !url.password
    } catch { return false }
  })
}
const names = { text: '文本', image: '图像', audio: '音频', video: '视频', file: '文件', document: '文件' }
const formatModalities = values => Array.isArray(values) && values.length
  ? values.map(value => names[value]).filter(Boolean).join('、') || null : null
function reviewedSpecification(provider, model) {
  const entry = reviewedById.get(model.id)
  return entry && (!entry.providers || entry.providers.includes(provider))
    ? { ...entry, ...entry.providerOverrides?.[provider], ...entry.variantOverrides?.[model.id] } : null
}

// Display only. Neither request IDs nor adapter capabilities/limits are changed here.
export function modelCardName(provider, model) {
  const resolved = model.specificModelSpecifications?.resolvedModel
  const name = resolved?.modelId && resolved?.displayName && safeOfficialSources(resolved.sourceUrls).length
    ? resolved.displayName : reviewedSpecification(provider, model)?.displayName || model.label || model.id
  return name.replace(/（具体版本待确认）|\(具体版本待确认\)/g, '').trim()
}

export function modelCardSpecifications(provider, model) {
  const audit = auditedModelSpecs(provider, model.id)
  const fields = audit.fields
  const labels = { unknown: '未知', unsupported: '不支持', 'not-applicable': '不适用' }
  const text = fact => fact.state === 'known'
    ? Array.isArray(fact.value) ? formatModalities(fact.value) : `${fact.value.toLocaleString('en-US')} tokens`
    : labels[fact.state]
  const image = model.roles?.includes('image') || fields.outputModalities.value?.some?.(x => x === 'image' || x === 'video')
  const scope = fact => fact.provenance === 'vendor' ? '原厂' : fact.provenance === 'channel' ? '渠道' : ''
  const context = image ? '不适用' : text(fields.totalContextTokens)
  const maxOutput = image ? '不适用' : text(fields.maxOutputTokens)
  return {
    input: text(fields.inputModalities), output: text(fields.outputModalities), context, maxOutput,
    inputFact: fields.inputModalities, outputFact: fields.outputModalities,
    inputScope: scope(fields.inputModalities), outputScope: scope(fields.outputModalities),
    contextScope: scope(fields.totalContextTokens), maxOutputScope: scope(fields.maxOutputTokens),
    note: audit.note,
    vendorSources: Object.values(fields).filter(fact => fact.provenance === 'vendor').map(fact => fact.sourceUrl),
    sources: safeOfficialSources([auditedModelLifecycle(provider, model.id)?.sourceUrl, ...audit.sourceUrls,...Object.values(fields).map(fact => fact.sourceUrl), audit.sourceUrl,
      model.officialSourceUrl, ...(model.catalogReview?.sourceUrls || []), ...(model.specifications?.sourceUrls || []), ...(model.specificModelSpecifications?.sourceUrls || [])]),
    checkedAt: audit.verifiedAt, unverified: audit.unverified,
    lifecycle: auditedModelLifecycle(provider, model.id),
    limitRows: [{label:'上下文窗口',value:context}, {label:'最大输出',value:maxOutput}],
  }
}
