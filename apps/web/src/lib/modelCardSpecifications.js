import { displayModalities, displayModalityText } from '../../../../packages/api/src/card-presentation.mjs'
import { auditedModelSpecs, auditedModelLifecycle, removedModel, MODEL_AUDIT_DATA } from './modelAudit.js'
import { modelCardSources } from './modelCardSources.js'
import { catalogCardFacts, mergeCardFacts } from './catalogCardFacts.js'
import { formatContextLimit } from './modelPresentation.js'
import reviewedModels from '../data/model-card-specifications.json'
import specificPages from '../../../../config/channel-audit/specific-model-page-overrides.json'
import { STATIC_MODEL_REGISTRY } from './staticModelCatalog.js'

// Saved settings contain identities, not facts. Resolve before presentation;
// live full objects take precedence, including intentional null/unknown values.
export function resolveCardModel(provider, model, registry) {
  const id = typeof model === 'string' ? model : model?.id
  if (model?.specifications || model?.specificModelSpecifications || provider === 'custom') return model
  const full = registry?.providers?.[provider]?.models?.find(row => row.id === id)
    || STATIC_MODEL_REGISTRY[provider]?.models.find(row => row.id === id)
  return { ...full, ...(typeof model === 'object' ? model : { id }),
    ...(!model?.roles?.length && full?.roles ? { roles: full.roles } : {}) }
}

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
  ? displayModalities(values).map(value => names[value]).filter(Boolean).join('、') || null : null
function reviewedSpecification(provider, model) {
  const entry = reviewedById.get(model.id)
  return entry && (!entry.providers || entry.providers.includes(provider))
    ? { ...entry, ...entry.providerOverrides?.[provider], ...entry.variantOverrides?.[model.id] } : null
}

// Display only. Neither request IDs nor adapter capabilities/limits are changed here.
export function modelCardName(provider, model) {
  // Fact resolution must not introduce alias/version names into saved labels.
  const resolved = model.specificModelSpecifications?.resolvedModel
  const name = resolved?.modelId && resolved?.displayName && safeOfficialSources(resolved.sourceUrls).length
    ? resolved.displayName : reviewedSpecification(provider, model)?.displayName || model.label || model.id
  return name.replace(/（具体版本待确认）|\(具体版本待确认\)/g, '').trim()
}

export function modelCardSpecifications(provider, model, registry) {
  model = resolveCardModel(provider, model, registry)
  const audit = auditedModelSpecs(provider, model.id)
  const { fields, conflicts } = mergeCardFacts(audit, catalogCardFacts(provider, model, reviewedModels, specificPages), model)
  const labels = { unknown: '未知', unsupported: '不支持', 'not-applicable': '不适用' }
  const text = fact => fact.state === 'known'
    ? Array.isArray(fact.value) ? (fact.displayValue ? displayModalityText(fact.displayValue) : formatModalities(fact.value)) : `${typeof fact.value === 'string' ? fact.value.replace(/[km]$/i, unit => unit.toUpperCase()) : formatContextLimit(fact.value, fact.approximate)} tokens${fact.suffix || ''}`
    : labels[fact.state]
  const image = model.roles?.includes('image') || fields.outputModalities.value?.some?.(x => x === 'image' || x === 'video')
  const scope = fact => fact.provenance === 'vendor' ? '原厂' : fact.provenance === 'channel' ? '渠道' : fact.provenance === 'catalog' ? '图研既有核实' : fact.provenance === 'product' ? '图研输入要求' : ''
  const pureImage = image && !fields.outputModalities.value?.includes?.('text') && !['totalContextTokens', 'maxOutputTokens'].some(key => fields[key].state === 'known')
  const limit = fact => pureImage && fact.state === 'unknown' ? '不适用' : text(fact)
  const context = limit(fields.totalContextTokens)
  const maxOutput = limit(fields.maxOutputTokens)
  const retired = removedModel(provider, model.id)
  const lifecycle = auditedModelLifecycle(provider, model.id)
  const sources = modelCardSources({ channel: provider, model, audit, fields,
    lifecycle: lifecycle || (retired ? { ...retired, state: 'retired' } : null), checks: MODEL_AUDIT_DATA.sourceChecks })
  return {
    fields, conflicts,
    input: text(fields.inputModalities), output: text(fields.outputModalities), context, maxOutput,
    inputFact: fields.inputModalities, outputFact: fields.outputModalities,
    inputScope: scope(fields.inputModalities), outputScope: scope(fields.outputModalities),
    contextScope: scope(fields.totalContextTokens), maxOutputScope: scope(fields.maxOutputTokens),
    contextExact: fields.totalContextTokens.state === 'known' ? `${fields.totalContextTokens.value.toLocaleString('en-US')} tokens` : '',
    maxOutputExact: fields.maxOutputTokens.state === 'known' ? `${fields.maxOutputTokens.value.toLocaleString('en-US')} tokens` : '',
    note: [audit.note, conflicts.length && (Object.values(fields).some(fact => fact.unsupportedModalities?.length)
      ? '审计与既有规格有差异；以渠道官方明确排除项为准' : '审计与既有规格有差异；保留已知模态，未核实值回退')].filter(Boolean).join('；'),
    serviceDetails: model.specifications?.serviceDetails,
    productInput: model.capabilities?.referenceImages ? '文本、图像' : '文本',
    ...sources,
    checkedAt: audit.verifiedAt || Object.values(fields).find(f => f.verifiedAt)?.verifiedAt, unverified: audit.unverified,
    lifecycle,
    limitRows: [{label:'上下文窗口',value:context}, {label:'最大输出',value:maxOutput}],
  }
}
