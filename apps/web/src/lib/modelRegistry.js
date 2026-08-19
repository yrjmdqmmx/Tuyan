export function mergeProviderRegistry(fallback, registry) {
  if (!registry?.defaults || !Array.isArray(registry.models)) return fallback

  const optionsForRole = (role) => registry.models
    .filter((model) => Array.isArray(model.roles) && model.roles.includes(role) && model.selectable !== false)
    .map((model) => [model.id, model.label || model.id])

  const mainModels = optionsForRole('main')
  const imageModels = optionsForRole('image')
  const visionModels = optionsForRole('vision')
  if (!mainModels.length || !imageModels.length || !visionModels.length) return fallback

  const safeDefault = (role, requested, options) => {
    const match = registry.models.find((model) => model.id === requested)
    return match?.selectable !== false && match?.roles?.includes(role) ? requested : options[0][0]
  }

  return {
    ...fallback,
    mainModel: safeDefault('main', registry.defaults.main, mainModels),
    imageModel: safeDefault('image', registry.defaults.image, imageModels),
    visionModel: safeDefault('vision', registry.defaults.vision, visionModels),
    mainModels,
    imageModels,
    visionModels,
    registryModels: registry.models,
  }
}

const VENDOR_ORDER = ['OpenAI', 'Google', 'Anthropic', 'Alibaba Qwen', 'Alibaba Wan', 'Qwen', 'DeepSeek', 'xAI']

export function filterRegistryModels(models, { role, query = '', outputFormat = '', recommendedOnly = false } = {}) {
  const needle = query.trim().toLocaleLowerCase('zh-CN')
  return (models || [])
    .filter((model) => model?.roles?.includes(role))
    .filter((model) => !recommendedOnly || model.recommended === true)
    .filter((model) => !needle || [model.id, model.label, model.vendor, model.availabilityNotes, model.disabledReason]
      .some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(needle)))
    .map((model) => {
      const outputFormats = model.capabilities?.outputFormats || []
      const formatMismatch = role === 'image' && outputFormat && outputFormats.length && !outputFormats.includes(outputFormat)
      return {
        ...model,
        selectionDisabled: model.selectable === false || Boolean(formatMismatch),
        selectionDisabledReason: model.disabledReason
          || (formatMismatch ? `该模型不支持 ${outputFormat.toUpperCase()} 输出` : ''),
      }
    })
    .sort((left, right) => Number(right.recommended === true) - Number(left.recommended === true)
      || Number(left.selectionDisabled) - Number(right.selectionDisabled)
      || Number(left.selectable === false) - Number(right.selectable === false)
      || String(left.vendor || '').localeCompare(String(right.vendor || ''), 'en')
      || String(left.label || left.id).localeCompare(String(right.label || right.id), 'zh-CN'))
}

export function groupRegistryModels(models) {
  const groups = new Map()
  for (const model of models || []) {
    const vendor = model.vendor || '其他'
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
    .map(([vendor, vendorModels]) => ({ vendor, models: vendorModels }))
}

export function modelRefinePresentation(model) {
  const serverMode = model?.capabilities?.imageEditMode || 'none'
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
