import { modelDeveloper, sortModelsNewestFirst } from './modelPresentation.js'
// Missing catalogue entries are hidden in every selectable list, without
// deleting saved identities or treating a failed catalogue load as removal.
export function modelMissingFromCatalog(registry, provider, modelOrId) {
  if (provider === 'custom') return false
  const id = typeof modelOrId === 'string' ? modelOrId : modelOrId?.id
  if (!id) return false
  const channel = registry?.providers?.[provider]
  const unavailable = Boolean(registry?.unavailableProviders?.[provider])
  const model = typeof modelOrId === 'object' ? modelOrId : channel?.models?.find(entry => entry.id === id)
  return Boolean(registry?.catalogHealth?.[provider]?.issues?.some(issue => issue.id === id && issue.reason === 'missing_live')
    || model?.catalogPresence?.status === 'absent'
    || model?.disabledReason?.startsWith('当前目录未列出该模型')
    || (!unavailable && registry?.providers && !channel)
    || (!unavailable && Array.isArray(channel?.models) && !channel.models.some(entry => entry.id === id)))
}
// Browsing hides confirmed retirements, not temporary failures or adapter gaps.
// Historical identities remain in the registry and saved task configuration.
export function modelRetiredFromCatalog(model, now = Date.now()) {
  const cutoff = model?.expirationAt || (model?.expirationDate && !model.expirationDate.startsWith('2098') ? `${model.expirationDate}T00:00:00Z` : '');
  const cutoffTime = Date.parse(cutoff);
  if (Number.isFinite(cutoffTime)) return now >= cutoffTime;
  return model?.selectable === false && Boolean(model.lifecycleSourceUrl)
    && /已确认.*停用|官方已.*(?:停服|退役)|公告此型号.*停用|完整托管目录已不再提供/.test(model.disabledReason || '');
}
export function modelUnavailableForSelection(model) {
  return model?.catalogPresence?.status === 'absent' || model?.selectable === false || Boolean(model?.expirationDate && !model.expirationDate.startsWith('2098') && Date.now() >= Date.parse(model.expirationAt || `${model.expirationDate}T00:00:00Z`))
}
export function mergeProviderRegistry(fallback, registry) {
  if (!registry?.defaults || !Array.isArray(registry.models)) return fallback

  const optionsForRole = (role) => registry.models
    .filter((model) => !modelUnavailableForSelection(model))
    .filter((model) => Array.isArray(model.roles) && model.roles.includes(role) && model.selectable !== false)
    .map((model) => [model.id, model.label || model.id])

  const mainModels = optionsForRole('main')
  const imageModels = optionsForRole('image')
  const visionModels = optionsForRole('vision')

  const safeDefault = (role, requested, options) => {
    const match = registry.models.find((model) => model.id === requested)
    // An unavailable configured default remains visible until the user chooses.
    return match?.roles?.includes(role) && (match.selectable !== false || match.disabledReason) ? requested : options[0]?.[0] || ''
  }

  return {
    ...fallback,
    accessKind: registry.accessKind || fallback.accessKind || 'direct',
    routeContractVersion: registry.routeContractVersion || 0,
    accountCatalogRequired: registry.accountCatalogRequired === true,
    mainModel: safeDefault('main', registry.defaults.main, mainModels),
    imageModel: safeDefault('image', registry.defaults.image, imageModels),
    visionModel: safeDefault('vision', registry.defaults.vision, visionModels),
    mainModels,
    imageModels,
    visionModels,
    registryModels: registry.models,
  }
}

const VENDOR_ORDER = ['OpenAI', 'Google', 'Anthropic', '阿里巴巴', '深度求索', '智谱', '字节跳动', 'SpaceXAI']

export function filterRegistryModels(models, { role, query = '', outputFormat = '', recommendedOnly = false } = {}) {
  const needle = query.trim().toLocaleLowerCase('zh-CN')
  return sortModelsNewestFirst((models || [])
    .filter((model) => model?.roles?.includes(role)
      || (role === 'image' && (model?.outputModalities?.includes('image') || model?.protocol === 'openrouter-images')))
    .filter((model) => !modelUnavailableForSelection(model))
    .filter((model) => !recommendedOnly || (model.recommended === true && model.lifecycle === 'stable'))
    .filter((model) => !needle || registryModelSearchValues(model)
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(needle)))
    .map((model) => annotateModelForRole(model, { role, outputFormat })))
    .sort((left, right) => Number(left.selectionDisabled) - Number(right.selectionDisabled)
      || Number(left.selectable === false) - Number(right.selectable === false))
}

export function partitionRegistryModels(models, { role, query = '', outputFormat = '', operation = '', recommendedOnly = false } = {}) {
  const needle = query.trim().toLocaleLowerCase('zh-CN')
  const annotated = (models || [])
    .filter((model) => model?.roles?.includes(role)
      || model?.catalogDiscovered === true
      || Boolean(model?.roleReasons?.[role])
      || (role === 'image' && model?.protocol === 'openrouter-images'))
    .filter((model) => !recommendedOnly || (model.recommended === true && model.lifecycle === 'stable'))
    .filter((model) => !needle || registryModelSearchValues(model)
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(needle)))
    .map((model) => annotateModelForRole(model, { role, outputFormat, operation }))

  return {
    compatible: sortModelsNewestFirst(annotated.filter((model) => !model.selectionDisabled)),
    incompatible: annotated.filter((model) => model.selectionDisabled),
  }
}

function registryModelSearchValues(model) {
  const roleTerms = (model?.roles || []).flatMap((role) => {
    if (role === 'main') return ['main', '主模型', '文本生成']
    if (role === 'image') return ['image', '图像生成', '图片生成']
    if (role === 'vision') return ['vision', '视觉', '图像理解', '图片理解']
    return [role]
  })
  const capabilityTerms = model?.capabilities?.imageEditMode === 'direct-edit'
    ? ['direct-edit', '直接编辑', '图生图']
    : model?.capabilities?.imageEditMode === 'analyze-redraw'
      ? ['analyze-redraw', '分析后重绘']
      : []
  return [
    model?.id, model?.label, model?.vendor, model?.availabilityNotes, model?.disabledReason, model?.protocol,
    ...roleTerms,
    ...capabilityTerms,
    ...(model?.inputModalities || []),
    ...(model?.outputModalities || []),
    ...(model?.capabilities?.outputFormats || []),
    ...(model?.capabilities?.resolutions || []),
  ].map((value) => String(value || ''))
}

function annotateModelForRole(model, { role, outputFormat, operation }) {
  const expired = Boolean(model.expirationDate && !model.expirationDate.startsWith('2098') && Date.now() >= Date.parse(model.expirationAt || `${model.expirationDate}T00:00:00Z`))
  const outputFormats = model.capabilities?.outputFormats || []
  const roleMismatch = !model.roles?.includes(role)
  const formatMismatch = role === 'image' && outputFormat && outputFormats.length && !outputFormats.includes(outputFormat)
  const generationMismatch = role === 'image' && operation === 'generation'
    && (model.capabilities?.requiresSourceImage === true || model.capabilities?.imageGeneration === false)
  const editingMismatch = role === 'image' && operation === 'editing'
    && Array.isArray(model.capabilities?.refineResolutions) && !model.capabilities.refineResolutions.length
  return {
    ...model,
    selectionDisabled: expired || model.selectable === false || roleMismatch || Boolean(formatMismatch) || generationMismatch || editingMismatch,
    selectionDisabledReason: (expired ? `官方服务已于 ${model.expirationDate} 到期` : '') || model.disabledReason
      || (roleMismatch ? model.roleReasons?.[role] || `服务端未授权该模型用于${role === 'image' ? '图像生成' : '当前角色'}` : '')
      || (formatMismatch ? `该模型不支持 ${outputFormat.toUpperCase()} 输出` : '')
      || (generationMismatch ? '该模型仅支持图像编辑' : '')
      || (editingMismatch ? '该模型没有可用的精修输出参数' : ''),
  }
}

export function groupRegistryModels(models) {
  const groups = new Map()
  for (const model of models || []) {
    const vendor = modelDeveloper('', model).label
    if (!groups.has(vendor)) groups.set(vendor, [])
    groups.get(vendor).push(model)
  }
  return [...groups.entries()]
    .sort(([left], [right]) => {
      const leftIndex = VENDOR_ORDER.indexOf(left)
      const rightIndex = VENDOR_ORDER.indexOf(right)
      if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex)
      return left.localeCompare(right, 'zh-CN')
    })
    .map(([vendor, vendorModels]) => ({ vendor, models: sortModelsNewestFirst(vendorModels) }))
}

export function modelRefinePresentation(model) {
  const serverMode = model?.capabilities?.imageEditMode || 'none'
  if (model?.verificationState === 'user-declared' && serverMode === 'none') return {mode:'none',label:'未声明直接编辑能力',directEdit:false}
  const acceptsImages = model?.inputModalities?.includes('image') || model?.capabilities?.referenceImages === true
  if (serverMode === 'direct-edit' && acceptsImages) {
    return { mode: 'direct-edit', label: '直接编辑', directEdit: true }
  }
  if (serverMode === 'analyze-redraw' || model?.roles?.includes('image') || serverMode === 'direct-edit') {
    return { mode: 'analyze-redraw', label: '分析后重绘', directEdit: false }
  }
  return { mode: 'none', label: '不支持精修', directEdit: false }
}

export function uniqueRegistryModels(models) {
  const seen = new Set()
  return (models || []).filter((model) => {
    const key = `${model?.id || ''}\n${model?.protocol || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
