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
const formatFactModalities = (facts, key) => {
  const text = formatModalities(facts?.[key])
  return text && `${text}${facts.modalitiesComplete === false ? '；其他模态待确认' : ''}`
}
const formatDecimalLimit = value => {
  const million = value >= 1_000_000
  // Keep the exact integer limit when scaling; K/M are decimal, never binary.
  const number = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: million ? 6 : 3 })
    .format(value / (million ? 1_000_000 : 1_000))
  return `${number}${million ? 'M' : 'K'}`
}
const formatContext = facts => Number.isSafeInteger(facts?.contextWindowTokens) && facts.contextWindowTokens > 0
  ? `${facts.contextWindowApproximate ? '≈ ' : ''}${formatDecimalLimit(facts.contextWindowTokens)} tokens` : null
const formatReviewedContext = value => {
  if (!value) return null
  const match = /^([\d,]+(?:\.\d+)?)\s*([KM]?)(.*)$/i.exec(value)
  if (!match) return `${value} tokens`
  const count = Number(match[1].replaceAll(',', '')) * ({ K: 1_000, M: 1_000_000 }[match[2].toUpperCase()] || 1)
  return Number.isSafeInteger(count) && count > 0 ? `${formatDecimalLimit(count)}${match[3]} tokens` : null
}

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
  const reviewed = reviewedSpecification(provider, model)
  const channel = model.specifications?.version === 1 ? model.specifications : null
  const manufacturer = channel?.manufacturer?.identity === 'matched' ? channel.manufacturer : null
  const layers = []
  const detailed = model.specificModelSpecifications
  if (detailed) layers.push({
    input:formatFactModalities(detailed, 'officialInputModalities'), output:formatFactModalities(detailed, 'officialOutputModalities'),
    context:formatContext(detailed), sources:safeOfficialSources(detailed.sourceUrls), scope:detailed.sourceScope === 'service' || provider === 'runware' ? '渠道' : '原厂',
  })
  if (reviewed) layers.push({
    input: reviewed.input, output: reviewed.output,
    context: formatReviewedContext(reviewed.context),
    sources: safeOfficialSources(reviewed.sources), scope: reviewed.sourceScope === 'service' ? '渠道' : '原厂',
    sourcesByField: Object.fromEntries(['input', 'output', 'context'].filter(key => reviewed[`${key}Sources`]).map(key => [key, safeOfficialSources(reviewed[`${key}Sources`])])),
    scopeByField: Object.fromEntries(['input', 'output', 'context'].filter(key => reviewed[`${key}SourceScope`]).map(key => [key, reviewed[`${key}SourceScope`] === 'service' ? '渠道' : '原厂'])),
  })
  // A reviewed unresolved variant must not inherit old manufacturer references.
  if (!reviewed && manufacturer) layers.push({
    input: formatModalities(manufacturer.officialInputModalities), output: formatModalities(manufacturer.officialOutputModalities),
    context: formatContext(manufacturer), sources: safeOfficialSources(manufacturer.sourceUrls), scope: '原厂',
  })
  if (channel) layers.push({
    input: formatModalities(channel.officialInputModalities) && `${formatModalities(channel.officialInputModalities)}${channel.modalitiesComplete === false ? '；其他模态待确认' : ''}`, output: formatModalities(channel.officialOutputModalities) && `${formatModalities(channel.officialOutputModalities)}${channel.modalitiesComplete === false ? '；其他模态待确认' : ''}`,
    context: formatContext(channel), sources: safeOfficialSources(channel.sourceUrls), scope: '渠道',
  })
  const data = { sources: [], limitRows: [] }
  for (const key of ['input', 'output', 'context']) {
    // A hosted API's numeric window takes precedence over native weight configuration.
    const ordered = key === 'context' && detailed?.sourceScope !== 'service' && formatContext(channel)
      ? [layers.find(item => item.scope === '渠道' && item.context === formatContext(channel)), ...layers].filter(Boolean) : layers
    const layer = ordered.find(item => item[key] && (item.sourcesByField?.[key] || item.sources).length)
    data[key] = layer?.[key] || '待确认'
    data[`${key}Scope`] = layer?.scopeByField?.[key] || layer?.scope || ''
    if (layer) data.sources.push(...(layer.sourcesByField?.[key] || layer.sources))
  }
  // Input/output token limits never substitute for a published context window.
  if (data.context === '待确认' && (detailed?.contextWindowStatus === 'not-published' || channel?.contextWindowStatus === 'not-published')) data.context = '官方未公布'
  if (data.context === '待确认' && (reviewed?.maxInputTokens || channel?.maxInputTokens)) data.context = '未单列'
  // Image prompt lengths replace an unpublished context row, keeping their actual units.
  // A prompt limit cannot override a published token context or any runtime request cap.
  const hasContext = layers.some(layer => layer.context && layer.sources.length)
  if (!hasContext && /图像/.test(data.output)) {
    for (const kind of ['generation', 'editing']) {
      const limit = [detailed, channel, reviewed, ...(!reviewed && manufacturer ? [manufacturer] : [])]
        .flatMap(facts => Array.isArray(facts?.promptLimits) ? facts.promptLimits : [])
        .find(item => item?.kind === kind && Number.isSafeInteger(item.max) && item.max > 0
          && ['characters', 'bytes', 'tokens'].includes(item.unit) && safeOfficialSources(item.sourceUrls).length)
      if (limit) {
        const sources = safeOfficialSources(limit.sourceUrls)
        data.limitRows.push({ label: kind === 'generation' ? '生图提示词上限' : '编辑提示词上限',
          value: `${formatDecimalLimit(limit.max)} ${{ characters: '字符', bytes: '字节', tokens: 'tokens' }[limit.unit]}`, sources })
        data.sources.push(...sources)
      }
    }
  }
  if (!data.limitRows.length) data.limitRows.push({ label: '上下文窗口', value: data.context, sources: [] })
  if (!data.sources.length) data.sources.push(...(detailed?.sourceUrls || []), ...(channel?.sourceUrls || []), ...(reviewed?.sources || []), model.officialSourceUrl, model.releaseSourceUrl, model.releaseOrderSourceUrl)
  data.sources = safeOfficialSources(data.sources)
  return data
}
