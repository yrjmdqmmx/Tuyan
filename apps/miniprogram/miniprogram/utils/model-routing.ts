import type { ModelRegistry, ModelRole } from './model-registry'

export const MODEL_ROUTE_ROLES: ModelRole[] = ['main', 'image', 'vision']
export interface ModelRoute { accessProvider: string; modelId: string }
export type ModelRoutes = Record<ModelRole, ModelRoute>

export function providerDefaultRoutes(provider: string, registry: ModelRegistry | { providers?: Record<string, { defaults?: Record<string, string> }> } | null): ModelRoutes {
  const providers = registry?.providers as Record<string, { defaults?: Record<string, string> }> | undefined
  const defaults = providers?.[provider]?.defaults
  if (!defaults?.main || !defaults.image || !defaults.vision) throw new Error('当前 API 渠道没有完整默认路由。')
  return {
    main: { accessProvider: provider, modelId: defaults.main },
    image: { accessProvider: provider, modelId: defaults.image },
    vision: { accessProvider: provider, modelId: defaults.vision },
  }
}

export function buildModelSubmission(input: {
  configurationMode: 'simple' | 'advanced'
  modelRoutes: ModelRoutes
  registry: { routeContractVersion?: number } | null
}): Record<string, unknown> {
  assertCompleteRoutes(input.modelRoutes)
  if (!input.registry || Number(input.registry.routeContractVersion || 0) < 1) {
    throw new Error('服务端模型目录不可用，已禁止新建付费任务。')
  }
  return {
    configurationMode: input.configurationMode,
    provider: input.modelRoutes.main.accessProvider,
    modelRoutes: input.modelRoutes,
    mainModelName: input.modelRoutes.main.modelId,
    imageModelName: input.modelRoutes.image.modelId,
    referenceVisionModelName: input.modelRoutes.vision.modelId,
  }
}

export function requiredCreateRouteRoles(body: Record<string, unknown>, maxCriticRounds: number): ModelRole[] {
  const roles: ModelRole[] = []
  const outputFormat = body.outputFormat === 'svg' ? 'svg' : 'png'
  const taskName = body.taskName === 'plot' ? 'plot' : 'diagram'
  const pipelineMode = typeof body.pipelineMode === 'string' ? body.pipelineMode : 'planner_critic'
  if (outputFormat === 'svg' || taskName === 'plot' || pipelineMode !== 'vanilla' || body.retrievalSetting === 'auto') roles.push('main')
  if (outputFormat === 'png' && taskName !== 'plot') roles.push('image')
  const references = Array.isArray(body.referenceImages) ? body.referenceImages : []
  if (references.length) roles.push(body.referenceImageMode === 'main_model' ? 'main' : 'vision')
  if (maxCriticRounds > 0 && (taskName === 'plot' || (outputFormat === 'png' && pipelineMode !== 'vanilla'))) roles.push('vision')
  return orderedUniqueRoles(roles)
}

export function requiredRefineRouteRoles(body: { refineMode?: string }): ModelRole[] {
  return body.refineMode === 'direct-edit' ? ['image'] : ['vision', 'image']
}

export function uniqueProvidersForRoles(modelRoutes: ModelRoutes, roles: ModelRole[]): string[] {
  const providers: string[] = []
  for (const role of orderedUniqueRoles(roles)) {
    const provider = modelRoutes[role]?.accessProvider
    if (provider && !providers.includes(provider)) providers.push(provider)
  }
  return providers
}

export function scopedApiKeysForRoles(modelRoutes: ModelRoutes, roles: ModelRole[], apiKeys: Record<string, string>): Record<string, string> {
  return Object.fromEntries(uniqueProvidersForRoles(modelRoutes, roles).map((provider) => [provider, apiKeys[provider] || '']))
}

export interface ArkProbe { role: ModelRole; modelId: string }
export function arkProbesForRoles(modelRoutes: ModelRoutes, roles: ModelRole[]): ArkProbe[] {
  return orderedUniqueRoles(roles)
    .filter((role) => modelRoutes[role]?.accessProvider === 'ark')
    .map((role) => ({ role, modelId: modelRoutes[role].modelId }))
}

export function arkVerificationKey(probe: ArkProbe): string {
  return `${probe.role}:${probe.modelId}`
}

export function missingArkVerifications(probes: ArkProbe[], verification: Record<string, string>): ArkProbe[] {
  return probes.filter((probe) => verification[arkVerificationKey(probe)] !== 'verified')
}

export function nextArkVerificationBatch(
  probes: ArkProbe[],
  verification: Record<string, string>,
  confirmPaidImageProbe: boolean,
): { probes: ArkProbe[]; confirmPaidImageProbe: boolean } {
  const unverified = missingArkVerifications(probes, verification)
  const freeProbes = unverified.filter((probe) => probe.role !== 'image')
  if (freeProbes.length) return { probes: freeProbes, confirmPaidImageProbe: false }
  const imageProbes = confirmPaidImageProbe ? unverified.filter((probe) => probe.role === 'image') : []
  return { probes: imageProbes, confirmPaidImageProbe: imageProbes.length > 0 }
}

function orderedUniqueRoles(roles: ModelRole[]): ModelRole[] {
  const requested = new Set(roles)
  return MODEL_ROUTE_ROLES.filter((role) => requested.has(role))
}

function assertCompleteRoutes(routes: ModelRoutes) {
  for (const role of MODEL_ROUTE_ROLES) {
    if (!routes[role]?.accessProvider || !routes[role]?.modelId) throw new Error(`模型路线 ${role} 尚未完整选择。`)
  }
}
