import { getModelRegistryState } from '../../utils/model-registry-store'
import { registryForRegions } from '../../utils/provider-regions'
import { EXTENDED_MODEL_CHANNELS } from '../../utils/static-model-catalog'
import { MODEL_PROVIDER_IDS, groupRegistryModels, partitionRegistryModels, type ModelProviderId, type ModelRegistry, type ModelRole, type RegistryModel } from '../../utils/model-registry'

const PROVIDER_LABELS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(EXTENDED_MODEL_CHANNELS).map(([id, channel]) => [id, channel.label])),
  deepseek: "DeepSeek",
  kimi: "Kimi（月之暗面）",
  zhipu: "智谱 GLM",
  siliconflow: "硅基流动 SiliconFlow",
  anthropic: "Anthropic Claude",
  recraft: "Recraft",
  xai: "xAI",

  gemini: 'Google Gemini API', openai: 'OpenAI', bailian: '阿里百炼', ark: '火山方舟', openrouter: 'OpenRouter',
}
const MODEL_PAGE_SIZE = 30

interface ProviderCard { id: ModelProviderId; label: string; kindText: string; count: number }
interface VendorCard { vendor: string; count: number; compatibleCount: number }
interface ModelCard extends Pick<RegistryModel, 'id' | 'label' | 'recommended' | 'requiresEntitlement' | 'availabilityNotes'> { lifecycleText: string; verificationText: string; selected: boolean }

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false, observer(this: any, show: boolean) { if (show) this.resetFlow() } },
    registryVersion: { type: String, value: '', observer(this: any) { if (this.properties.show) this.resetFlow() } },
    providerRegions: { type: Object, value: {} },
    role: { type: String, value: 'main' },
    outputFormat: { type: String, value: 'png' },
    selectedProvider: { type: String, value: '' },
    selectedModel: { type: String, value: '' },
  },
  data: {
    step: 'providers' as 'providers' | 'vendors' | 'models',
    roleLabel: '主模型',
    providerCards: [] as ProviderCard[],
    vendorCards: [] as VendorCard[],
    compatibleCount: 0,
    visibleCompatibleModels: [] as ModelCard[],
    activeProvider: '' as ModelProviderId | '',
    activeProviderLabel: '',
    activeVendor: '',
    activeProviderIsAggregator: false,
    query: '',
    catalogMode: 'recommended' as 'recommended' | 'all',
    visibleLimit: MODEL_PAGE_SIZE,
    hasMore: false,
  },
  methods: {
    noop() {},
    getRegistry(): ModelRegistry | null { return registryForRegions(getModelRegistryState().registry, this.properties.providerRegions) },
    resetFlow() {
      const registry = this.getRegistry()
      const role = normalizeRole(this.properties.role)
      if (!registry || !registry.providers) {
        this.setData({ step: 'providers', roleLabel: roleLabel(role), providerCards: [], vendorCards: [], compatibleCount: 0, visibleCompatibleModels: [] })
        return
      }
      const providerCards = MODEL_PROVIDER_IDS.map((id) => {
        const provider = registry.providers[id]
        const partition = partitionRegistryModels(provider?.models || [], { role, outputFormat: String(this.properties.outputFormat || '') })
        return {
          id,
          label: PROVIDER_LABELS[id],
          kindText: provider?.accessKind === 'aggregator' ? '聚合渠道' : '官方直连',
          count: partition.compatible.length,
        }
      }).filter((item) => item.count > 0)
      this.setData({
        step: 'providers', roleLabel: roleLabel(role), providerCards, vendorCards: [], compatibleCount: 0, visibleCompatibleModels: [],
        activeProvider: '', activeProviderLabel: '', activeVendor: '', activeProviderIsAggregator: false, query: '', catalogMode: 'recommended', visibleLimit: MODEL_PAGE_SIZE,
      })
    },
    selectProvider(event: WechatMiniprogram.TouchEvent) {
      const providerId = String(event.currentTarget.dataset.provider || '') as ModelProviderId
      const registry = this.getRegistry()
      const provider = registry?.providers[providerId]
      if (!provider) return
      const role = normalizeRole(this.properties.role)
      const partition = partitionRegistryModels(provider?.models || [], { role, outputFormat: String(this.properties.outputFormat || '') })
      const compatibleIds = new Set(partition.compatible.map((item) => item.id))
      const vendorCards = groupRegistryModels(partition.compatible).map((group) => ({
        vendor: group.vendor,
        count: group.models.length,
        compatibleCount: group.models.filter((item) => compatibleIds.has(item.id)).length,
      }))
      const isAggregator = provider.accessKind === 'aggregator'
      this.setData({
        activeProvider: providerId, activeProviderLabel: PROVIDER_LABELS[providerId] || providerId,
        activeProviderIsAggregator: isAggregator, activeVendor: '', vendorCards, query: '', catalogMode: 'recommended',
        visibleLimit: MODEL_PAGE_SIZE, step: isAggregator ? 'vendors' : 'models',
      })
      if (!isAggregator) this.refreshModelLists()
    },
    selectVendor(event: WechatMiniprogram.TouchEvent) {
      const vendor = String(event.currentTarget.dataset.vendor || '')
      if (!vendor) return
      this.setData({ activeVendor: vendor, step: 'models', query: '', visibleLimit: MODEL_PAGE_SIZE })
      this.refreshModelLists()
    },
    backStep() {
      if (this.data.step === 'models') {
        this.setData({ step: this.data.activeProviderIsAggregator ? 'vendors' : 'providers', query: '' })
        return
      }
      if (this.data.step === 'vendors') this.setData({ step: 'providers' })
    },
    refreshModelLists() {
      const registry = this.getRegistry()
      const providerId = this.data.activeProvider as ModelProviderId
      const provider = registry?.providers?.[providerId]
      if (!provider) return
      const role = normalizeRole(this.properties.role)
      const options = { role, query: this.data.query, outputFormat: String(this.properties.outputFormat || ''), recommendedOnly: providerId === 'openrouter' && this.data.catalogMode === 'recommended' }
      let partition = partitionRegistryModels(provider?.models || [], options)
      const inVendor = (model: RegistryModel) => !this.data.activeProviderIsAggregator || model.vendor === this.data.activeVendor
      if (options.recommendedOnly && !partition.compatible.some(inVendor)) {
        partition = partitionRegistryModels(provider?.models || [], { ...options, recommendedOnly: false })
        this.setData({ catalogMode: 'all' })
      }
      const compatibleModels = partition.compatible.filter(inVendor).map((model) => presentModel(model, this.properties.selectedProvider, this.properties.selectedModel, providerId))
      const visibleLimit = Math.max(MODEL_PAGE_SIZE, Number(this.data.visibleLimit) || MODEL_PAGE_SIZE)
      this.setData({ compatibleCount: compatibleModels.length, visibleCompatibleModels: compatibleModels.slice(0, visibleLimit), hasMore: visibleLimit < compatibleModels.length })
    },
    onSearch(event: WechatMiniprogram.Input) {
      this.setData({ query: event.detail.value, visibleLimit: MODEL_PAGE_SIZE })
      this.refreshModelLists()
    },
    setCatalogMode(event: WechatMiniprogram.TouchEvent) {
      const catalogMode = event.currentTarget.dataset.mode === 'all' ? 'all' : 'recommended'
      this.setData({ catalogMode, visibleLimit: MODEL_PAGE_SIZE })
      this.refreshModelLists()
    },
    loadMore() {
      this.setData({ visibleLimit: this.data.visibleLimit + MODEL_PAGE_SIZE })
      this.refreshModelLists()
    },
    choose(event: WechatMiniprogram.TouchEvent) {
      if (event.currentTarget.dataset.disabled) return
      this.triggerEvent('select', { provider: this.data.activeProvider, modelId: String(event.currentTarget.dataset.model || '') })
    },
    close() { this.triggerEvent('close') },
  },
})

function normalizeRole(value: unknown): ModelRole { return value === 'image' || value === 'vision' ? value : 'main' }
function roleLabel(role: ModelRole): string { return role === 'image' ? '图像生成模型' : role === 'vision' ? '参考图识别模型' : '主模型' }
function presentModel(model: RegistryModel, selectedProvider: unknown, selectedModel: unknown, providerId: ModelProviderId): ModelCard {
  return {
    id: model.id, label: model.label, recommended: model.recommended, requiresEntitlement: model.requiresEntitlement,
    availabilityNotes: [model.availabilityNotes, model.capabilities?.requiresSourceImage ? '仅图像编辑' : '', model.expirationDate && !model.expirationDate.startsWith('2098') ? `官方到期日：${model.expirationDate}` : '', model.earliestRetirementDate ? `最早退役日：${model.earliestRetirementDate}，以正式公告为准` : '', model.replacementModelId ? `迁移目标：${model.replacementModelId}` : ''].filter(Boolean).join(' · '),
    lifecycleText: model.lifecycle === 'stable' ? '稳定版' : model.lifecycle === 'preview' ? '预览版' : model.lifecycle === 'legacy' ? '旧版维护' : '状态未知',
    verificationText: model.verificationState === 'inference-verified' ? '账号已验证' : model.verificationState === 'catalog' ? '官方目录' : model.verified ? '注册表验证' : '模型目录',
    selected: String(selectedProvider || '') === providerId && String(selectedModel || '') === model.id,
  }
}
