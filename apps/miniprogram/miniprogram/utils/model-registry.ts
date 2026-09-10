import { presentRegistryModel, modelDeveloper, sortModelsNewestFirst } from './model-presentation'
export const MODEL_PROVIDER_IDS = ['gemini', 'openai', 'bailian', 'ark', 'openrouter', 'deepseek', 'kimi', 'zhipu', 'siliconflow', 'anthropic', 'recraft', 'xai', 'bfl', 'stability', 'ideogram', 'minimax', 'mistral', 'together', 'fireworks', 'fal', 'replicate', 'tokendance'] as const
export type ModelProviderId = typeof MODEL_PROVIDER_IDS[number]
export type ModelRole = 'main' | 'image' | 'vision'

export interface RegistryModel {
  id: string
  label: string
  vendor: string
  lifecycle: string
  recommended: boolean
  requiresEntitlement: boolean
  entitlement: string
  verified: boolean
  verificationState: string
  selectable: boolean
  disabledReason: string
  roles: ModelRole[]
  roleReasons: Partial<Record<ModelRole, string>>
  inputModalities: string[]
  outputModalities: string[]
  protocol: string
  availabilityNotes: string
  releasedAt: string | null
  vendorId?: string
  serviceTier?: string
  releaseKind?: string
  lifecycleSourceUrl?: string
  releaseFamily?: string
  releaseOrder?: number
  releaseSourceUrl?: string
  releaseOrderSourceUrl?: string
  expirationDate?: string
  expirationAt?: string
  earliestRetirementDate?: string
  replacementModelId?: string
  regions?: string[]
  roleProtocols?: Record<string, unknown>
  capabilities: Record<string, unknown>
  selectionDisabled?: boolean
  selectionDisabledReason?: string
}

export interface RegistryProvider {
  accessKind: string
  routeContractVersion: number
  accountCatalogRequired: boolean
  defaults: Record<ModelRole, string>
  models: RegistryModel[]
}

export interface ModelRegistry {
  referenceUpload?: { version: number; platform: Record<string, any> }
  providerRegionContractVersion?: number
  registryVersion: string
  routeContractVersion: number
  supportsModelRoutes: boolean
  providers: Partial<Record<ModelProviderId, RegistryProvider>>
}

export interface RegistryModelPartition {
  compatible: RegistryModel[]
  incompatible: RegistryModel[]
}

export function normalizeModelRegistry(input: unknown): ModelRegistry {
  const source = asRecord(input)
  const registryVersion = stringValue(source.registryVersion)
  const routeContractVersion = numberValue(source.routeContractVersion)
  if (!registryVersion) throw new Error('服务端模型目录缺少版本。')
  if (routeContractVersion < 1 || source.supportsModelRoutes !== true) {
    throw new Error('服务端模型路由契约不可用。')
  }
  const providerSource = asRecord(source.providers)
  const missingProviders = ['gemini', 'openai', 'bailian', 'ark', 'openrouter'].filter((id) => !providerSource[id])
  if (missingProviders.length) throw new Error('服务端模型目录必须包含五个 API 渠道。')

  const providers: Partial<Record<ModelProviderId, RegistryProvider>> = {}
  for (const providerId of MODEL_PROVIDER_IDS) {
    if (providerSource[providerId]) providers[providerId] = normalizeProvider(providerId, providerSource[providerId])
  }
  const referenceUpload = source.referenceUpload && typeof source.referenceUpload === 'object' ? asRecord(source.referenceUpload) : undefined
  return { ...(referenceUpload ? { referenceUpload: { version: numberValue(referenceUpload.version), platform: asRecord(referenceUpload.platform) } } : {}), registryVersion, routeContractVersion, providerRegionContractVersion: numberValue(source.providerRegionContractVersion), supportsModelRoutes: true, providers }
}

function normalizeProvider(providerId: ModelProviderId, input: unknown): RegistryProvider {
  const source = asRecord(input)
  const defaultsSource = asRecord(source.defaults)
  const modelsSource = Array.isArray(source.models) ? source.models : []
  if (!modelsSource.length) throw new Error(`${providerId} 模型目录为空。`)
  const models = sortModelsNewestFirst(modelsSource.map((model) => presentRegistryModel(providerId, normalizeModel(model))))
  const uniqueIds = new Set(models.map((model) => model.id))
  if (uniqueIds.size !== models.length) throw new Error(`${providerId} 模型目录包含重复 ID。`)

  const defaults = {
    main: stringValue(defaultsSource.main),
    image: stringValue(defaultsSource.image),
    vision: stringValue(defaultsSource.vision),
  }
  const labels: Record<ModelRole, string> = { main: '主模型', image: '图像模型', vision: '识别模型' }
  for (const role of ['main', 'image', 'vision'] as const) {
    if (!defaults[role] && !models.some((model) => model.selectable !== false && model.roles.includes(role))) continue
    const entry = models.find((model) => model.id === defaults[role])
    if (!entry || entry.selectable === false || !entry.roles.includes(role)) {
      throw new Error(`${providerId} 默认${labels[role]}无效。`)
    }
  }
  return {
    accessKind: stringValue(source.accessKind) || 'direct',
    routeContractVersion: numberValue(source.routeContractVersion) || 1,
    accountCatalogRequired: source.accountCatalogRequired === true,
    defaults,
    models,
  }
}

function normalizeModel(input: unknown): RegistryModel {
  const source = asRecord(input)
  const id = stringValue(source.id)
  if (!id) throw new Error('模型目录包含空 ID。')
  const roles = stringArray(source.roles).filter(isModelRole)
  const roleReasonsSource = asRecord(source.roleReasons)
  return {
    id,
    label: stringValue(source.label) || id,
    vendor: stringValue(source.vendor) || '其他',
    lifecycle: stringValue(source.lifecycle) || 'unknown',
    recommended: source.recommended === true,
    requiresEntitlement: source.requiresEntitlement === true,
    entitlement: stringValue(source.entitlement),
    verified: source.verified === true,
    verificationState: stringValue(source.verificationState) || 'unverified',
    selectable: source.selectable !== false,
    disabledReason: stringValue(source.disabledReason),
    roles,
    roleReasons: {
      main: stringValue(roleReasonsSource.main),
      image: stringValue(roleReasonsSource.image),
      vision: stringValue(roleReasonsSource.vision),
    },
    inputModalities: stringArray(source.inputModalities),
    outputModalities: stringArray(source.outputModalities),
    protocol: stringValue(source.protocol),
    availabilityNotes: stringValue(source.availabilityNotes),
    releasedAt: validReleasedAt(source.releasedAt),
    vendorId: stringValue(source.vendorId),
    serviceTier: stringValue(source.serviceTier),
    releaseKind: stringValue(source.releaseKind),
    lifecycleSourceUrl: stringValue(source.lifecycleSourceUrl),
    releaseFamily: stringValue(source.releaseFamily),
    releaseOrder: numberValue(source.releaseOrder),
    releaseSourceUrl: stringValue(source.releaseSourceUrl),
    releaseOrderSourceUrl: stringValue(source.releaseOrderSourceUrl),
    expirationDate: validReleasedAt(source.expirationDate),
    expirationAt: typeof source.expirationAt === 'string' && Number.isFinite(Date.parse(source.expirationAt)) ? source.expirationAt : '',
    earliestRetirementDate: validReleasedAt(source.earliestRetirementDate),
    replacementModelId: stringValue(source.replacementModelId),
    regions: stringArray(source.regions),
    roleProtocols: asRecord(source.roleProtocols),
    capabilities: asRecord(source.capabilities),
  }
}

export function modelAvailabilityPresentation(model: Partial<RegistryModel>): {
  lifecycleLabel: string
  verificationLabel: string
  verifiedForAccount: boolean
} {
  const lifecycleLabel = model.lifecycle === 'stable'
    ? '稳定'
    : model.lifecycle === 'preview'
      ? '预览'
      : model.lifecycle === 'deprecated'
        ? '即将下线'
        : '生命周期未知'
  const state = stringValue(model.verificationState)
  return {
    lifecycleLabel,
    verificationLabel: state === 'inference-verified'
      ? '当前账号实测可用'
      : state === 'registry' && model.verified === true
        ? '注册表已验证'
        : state === 'catalog'
          ? '官方目录'
          : '模型目录',
    verifiedForAccount: state === 'inference-verified',
  }
}

export function partitionRegistryModels(
  models: RegistryModel[],
  options: { role: ModelRole; query?: string; outputFormat?: string; recommendedOnly?: boolean },
): RegistryModelPartition {
  const query = stringValue(options.query).toLocaleLowerCase('zh-CN')
  const annotated = models
    .filter((model) => model.roles.includes(options.role) || Boolean(model.roleReasons[options.role]))
    .filter((model) => !options.recommendedOnly || (model.recommended && model.lifecycle === 'stable'))
    .filter((model) => !query || modelSearchValues(model).some((value) => value.toLocaleLowerCase('zh-CN').includes(query)))
    .map((model) => annotateModel(model, options.role, stringValue(options.outputFormat)))

  return {
    compatible: sortModelsNewestFirst(annotated.filter((model) => !model.selectionDisabled)),
    incompatible: annotated.filter((model) => Boolean(model.selectionDisabled)),
  }
}

export function groupRegistryModels(models: RegistryModel[]): Array<{ vendor: string; models: RegistryModel[] }> {
  const groups = new Map<string, RegistryModel[]>()
  for (const model of models) {
    const vendor = modelDeveloper('', model).label
    const current = groups.get(vendor) || []
    current.push(model)
    groups.set(vendor, current)
  }
  return [...groups.entries()]
    .sort(([left], [right]) => vendorIndex(left) - vendorIndex(right) || left.localeCompare(right, 'zh-CN'))
    .map(([vendor, vendorModels]) => ({ vendor, models: sortModelsNewestFirst(vendorModels) }))
}

export function findRegistryModel(registry: ModelRegistry | null, provider: string, modelId: string): RegistryModel | null {
  if (!registry || !MODEL_PROVIDER_IDS.includes(provider as ModelProviderId)) return null
  return registry.providers[provider as ModelProviderId]?.models.find((model) => model.id === modelId) || null
}

function annotateModel(model: RegistryModel, role: ModelRole, outputFormat: string): RegistryModel {
  const expired = Boolean(model.expirationDate && !model.expirationDate.startsWith('2098') && Date.now() >= Date.parse(model.expirationAt || `${model.expirationDate}T00:00:00Z`))
  const capabilities = model.capabilities || {}
  const formats = stringArray(capabilities.outputFormats)
  const roleMismatch = !model.roles.includes(role)
  const formatMismatch = role === 'image' && Boolean(outputFormat) && formats.length > 0 && !formats.includes(outputFormat)
  return {
    ...model,
    selectionDisabled: expired || !model.selectable || roleMismatch || formatMismatch,
    selectionDisabledReason: (expired ? `官方服务已于 ${model.expirationDate} 到期` : '') || model.disabledReason
      || (roleMismatch ? model.roleReasons[role] || '服务端未授权该模型用于当前角色' : '')
      || (formatMismatch ? `该模型不支持 ${outputFormat.toUpperCase()} 输出` : ''),
  }
}

function modelSearchValues(model: RegistryModel): string[] {
  return [model.id, model.label, model.vendor, model.protocol, model.availabilityNotes, model.disabledReason, ...model.roles]
}

const VENDOR_ORDER = ['OpenAI', 'Google', 'Anthropic', '阿里巴巴', '深度求索', '智谱', '字节跳动', 'SpaceXAI']
function vendorIndex(vendor: string): number {
  const index = VENDOR_ORDER.indexOf(vendor)
  return index < 0 ? 999 : index
}

function validReleasedAt(value: unknown): string {
  const text = stringValue(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

function isModelRole(value: string): value is ModelRole {
  return value === 'main' || value === 'image' || value === 'vision'
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : []
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
