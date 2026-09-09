import { normalizeProviderRegions } from './providerRegions.js'
export const MODEL_ROUTE_ROLES = Object.freeze(['main', 'image', 'vision'])

export function providerDefaultRoutes(provider, registry, fallbackProviders) {
  const serverDefaults = registry?.providers?.[provider]?.defaults
  const fallback = fallbackProviders?.[provider]
  const defaults = serverDefaults || (fallback ? {
    main: fallback.mainModel,
    image: fallback.imageModel,
    vision: fallback.visionModel,
  } : null)
  if (!defaults?.main || !defaults?.image || !defaults?.vision) return null
  return Object.fromEntries(MODEL_ROUTE_ROLES.map((role) => [role, {
    accessProvider: provider,
    modelId: defaults[role],
  }]))
}

export function buildModelSubmission({ configurationMode, modelRoutes, registry, providerRegions }) {
  assertCompleteRoutes(modelRoutes)
  const explicitRoutesSupported = Number(registry?.routeContractVersion || 0) >= 1
  if (configurationMode === 'advanced' && !explicitRoutesSupported) {
    throw new Error('当前后端不支持专业模式的多渠道模型路由，请切回普通模式。')
  }
  const submission = {
    configurationMode,
    provider: modelRoutes.main.accessProvider,
    mainModelName: modelRoutes.main.modelId,
    imageGenModelName: modelRoutes.image.modelId,
    referenceVisionModelName: modelRoutes.vision.modelId,
  }
  if (providerRegions && Object.values(modelRoutes).some(route => route.accessProvider === 'minimax')) {
    submission.providerRegions = normalizeProviderRegions(providerRegions)
    if (submission.providerRegions.minimax === 'cn' && !registry?.providerRegionContractVersion) throw new Error('当前服务端尚未支持 MiniMax 国内区域。')
  }
  if (explicitRoutesSupported) submission.modelRoutes = modelRoutes
  return submission
}

export function requiredCreateRouteRoles(body, maxCriticRounds) {
  const roles = []
  const outputFormat = body.outputFormat === 'svg' ? 'svg' : 'png'
  const taskName = body.taskName === 'plot' ? 'plot' : 'diagram'
  const pipelineMode = body.pipelineMode || 'planner_critic'
  const imageRoute = body.modelRoutes?.image
  const nativeVector = imageRoute?.accessProvider === 'recraft' && /^recraftv(?:[23]|4(?:_1)?)(?:_utility)?(?:_pro)?_vector$/.test(imageRoute.modelId)
  if ((outputFormat === 'svg' && !nativeVector) || taskName === 'plot' || pipelineMode !== 'vanilla' || body.retrievalSetting === 'auto') roles.push('main')
  if ((outputFormat === 'png' || nativeVector) && taskName !== 'plot') roles.push('image')
  if (taskName === 'plot' && ['1.5K', '2K', '3K', '4K'].includes(body.imageSize) && body.imageRefineMode === 'direct-edit') roles.push('image')
  if ((body.referenceImages || []).length) roles.push((body.referenceImageModeUsed || body.referenceImageMode) === 'main_model' ? 'main' : 'vision')
  if (Number(maxCriticRounds || 0) > 0 && (taskName === 'plot' || (outputFormat === 'png' && pipelineMode !== 'vanilla'))) roles.push('vision')
  return orderedUniqueRoles(roles)
}

export function requiredRefineRouteRoles(body) {
  return body.refineMode === 'direct-edit' ? ['image'] : ['vision', 'image']
}

export function uniqueProvidersForRoles(modelRoutes, roles) {
  const providers = []
  for (const role of orderedUniqueRoles(roles)) {
    const provider = modelRoutes?.[role]?.accessProvider
    if (provider && !providers.includes(provider)) providers.push(provider)
  }
  return providers
}

export function scopedApiKeysForRoles(modelRoutes, roles, apiKeys) {
  return Object.fromEntries(uniqueProvidersForRoles(modelRoutes, roles).filter(provider => provider !== 'tokendance').map((provider) => [provider, apiKeys?.[provider] || '']))
}

export function arkProbesForRoles(modelRoutes, roles) {
  return orderedUniqueRoles(roles)
    .filter((role) => modelRoutes?.[role]?.accessProvider === 'ark')
    .map((role) => ({ role, modelId: modelRoutes[role].modelId }))
}

export function arkVerificationKey(probe) {
  return `${probe.role}:${probe.modelId}`
}

export function missingArkVerifications(probes, verification) {
  return (probes || []).filter((probe) => verification?.[arkVerificationKey(probe)] !== 'verified')
}

export function nextArkVerificationBatch(probes, verification, confirmPaidImageProbe) {
  const unverified = missingArkVerifications(probes, verification)
  const freeProbes = unverified.filter((probe) => probe.role !== 'image')
  if (freeProbes.length) return { probes: freeProbes, confirmPaidImageProbe: false }
  const imageProbes = confirmPaidImageProbe ? unverified.filter((probe) => probe.role === 'image') : []
  return { probes: imageProbes, confirmPaidImageProbe: imageProbes.length > 0 }
}

export function clearArkVerificationForRole(verification, role) {
  return Object.fromEntries(Object.entries(verification || {}).filter(([key]) => !key.startsWith(`${role}:`)))
}

export function firstInvalidRequiredRoute({ roles, entries, outputFormat }) {
  const messages = {
    main: '请选择可用的主模型。',
    image: '请选择可用的图像生成模型。',
    vision: '请选择可用的参考图识别模型。',
  }
  for (const role of MODEL_ROUTE_ROLES) {
    const entry = entries?.[role]
    if (!entry || entry.selectable === false || !entry.roles?.includes(role)) {
      return {
        setting: `${role}-model`,
        message: entry?.selectionDisabledReason || entry?.disabledReason || messages[role],
      }
    }
    if (role === 'image' && roles?.includes(role) && entry.capabilities?.outputFormats?.length && !entry.capabilities.outputFormats.includes(outputFormat)) {
      return { setting: 'image-model', message: `当前图像模型不支持 ${String(outputFormat).toUpperCase()} 输出。` }
    }
  }
  return null
}

function orderedUniqueRoles(roles) {
  const requested = new Set(roles || [])
  return MODEL_ROUTE_ROLES.filter((role) => requested.has(role))
}

function assertCompleteRoutes(modelRoutes) {
  for (const role of MODEL_ROUTE_ROLES) {
    const route = modelRoutes?.[role]
    if (!route?.accessProvider || !route?.modelId) throw new Error(`模型路线 ${role} 尚未完整选择。`)
  }
}
