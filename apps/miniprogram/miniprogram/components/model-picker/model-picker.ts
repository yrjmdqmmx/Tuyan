import { MODEL_CHANNEL_LABELS, modelDeveloper, orderModelChannels, modelLifecycleLabel } from '../../utils/model-presentation'
import { getModelRegistryState } from '../../utils/model-registry-store'
import { registryForRegions } from '../../utils/provider-regions'
import { MODEL_PROVIDER_IDS, groupRegistryModels, partitionRegistryModels, type ModelProviderId, type ModelRegistry, type ModelRole, type RegistryModel } from '../../utils/model-registry'

const PROVIDER_LABELS = MODEL_CHANNEL_LABELS
const MODEL_PAGE_SIZE = 30

interface ProviderCard { id: ModelProviderId; label: string; kindText: string; count: number }
interface VendorCard { vendor: string; count: number }
interface ModelCard extends Pick<RegistryModel, 'id' | 'label' | 'recommended' | 'requiresEntitlement' | 'availabilityNotes'> { lifecycleText: string; verificationText: string; serviceTier: string; capabilityText: string; releaseText: string; selected: boolean }

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false },
    registryVersion: { type: String, value: '' },
    providerRegions: { type: Object, value: {} },
    role: { type: String, value: 'main' },
    outputFormat: { type: String, value: 'png' },
    selectedProvider: { type: String, value: '' },
    selectedModel: { type: String, value: '' },
  },
  observers: {
    'show, registryVersion, providerRegions, role, outputFormat, selectedProvider, selectedModel'() {
      if (this.properties.show) this.resetFlow()
    },
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
    activeModelLabel: '',
    activeProviderIsAggregator: false,
    query: '',
    catalogMode: 'all' as 'recommended' | 'all',
    visibleLimit: MODEL_PAGE_SIZE,
    hasMore: false,
    expandedModel: '',
  },
  methods: {
    noop() {},
    getRegistry(): ModelRegistry | null { return registryForRegions(getModelRegistryState().registry, this.properties.providerRegions == null ? undefined : this.properties.providerRegions) },
    compatibleModels(providerId: string): RegistryModel[] {
      return partitionRegistryModels(this.getRegistry()?.providers?.[providerId as ModelProviderId]?.models || [], {
        role: normalizeRole(this.properties.role), outputFormat: String(this.properties.outputFormat || ''),
      }).compatible
    },
    vendorsFor(providerId: string): VendorCard[] {
      return groupRegistryModels(this.compatibleModels(providerId)).map(group => ({ vendor: group.vendor, count: group.models.length }))
    },
    selectedModelLabel(providerId: string, vendor: string): string {
      if (providerId !== this.properties.selectedProvider || !vendor) return ''
      return this.compatibleModels(providerId).find(model => model.id === this.properties.selectedModel && modelDeveloper(providerId, model).label === vendor)?.label || ''
    },
    resetFlow() {
      const registry = this.getRegistry()
      const providerCards = orderModelChannels(MODEL_PROVIDER_IDS).map(id => ({
        id, label: PROVIDER_LABELS[id], kindText: registry?.providers[id]?.accessKind === 'aggregator' ? '聚合渠道' : '官方直连',
        count: this.compatibleModels(id).length,
      })).filter(item => item.count > 0)
      const selectedProvider = String(this.properties.selectedProvider || '') as ModelProviderId
      const activeProvider = providerCards.some(item => item.id === selectedProvider) ? selectedProvider : ''
      const vendorCards = activeProvider ? this.vendorsFor(activeProvider) : []
      const selected = this.compatibleModels(activeProvider).find(model => model.id === this.properties.selectedModel)
      const activeVendor = selected ? modelDeveloper(activeProvider, selected).label : ''
      this.setData({
        step: 'providers', roleLabel: roleLabel(normalizeRole(this.properties.role)), providerCards, vendorCards,
        activeProvider, activeProviderLabel: activeProvider ? PROVIDER_LABELS[activeProvider] : '', activeVendor,
        activeModelLabel: selected?.label || '', activeProviderIsAggregator: registry?.providers[activeProvider as ModelProviderId]?.accessKind === 'aggregator',
        query: '', catalogMode: 'all', visibleLimit: MODEL_PAGE_SIZE, compatibleCount: 0, visibleCompatibleModels: [], hasMore: false, expandedModel: '',
      })
    },
    selectProvider(event: WechatMiniprogram.TouchEvent) {
      const providerId = String(event.currentTarget.dataset.provider || '') as ModelProviderId
      if (!this.data.providerCards.some(item => item.id === providerId)) return
      const vendorCards = this.vendorsFor(providerId)
      if (!vendorCards.length) return
      const activeVendor = providerId === this.data.activeProvider && vendorCards.some(item => item.vendor === this.data.activeVendor) ? this.data.activeVendor : ''
      this.setData({
        activeProvider: providerId, activeProviderLabel: PROVIDER_LABELS[providerId] || providerId,
        activeProviderIsAggregator: this.getRegistry()?.providers[providerId]?.accessKind === 'aggregator',
        activeVendor, activeModelLabel: this.selectedModelLabel(providerId, activeVendor), vendorCards,
        step: 'vendors', query: '', catalogMode: 'all', visibleLimit: MODEL_PAGE_SIZE, expandedModel: '',
        compatibleCount: 0, visibleCompatibleModels: [], hasMore: false,
      })
    },
    showProviders() { this.setData({ step: 'providers', query: '', expandedModel: '' }) },
    showVendors() {
      if (!this.data.activeProvider) return
      this.setData({ step: 'vendors', vendorCards: this.vendorsFor(this.data.activeProvider), query: '', expandedModel: '' })
    },
    showModels() {
      if (!this.data.activeVendor || !this.vendorsFor(this.data.activeProvider).some(item => item.vendor === this.data.activeVendor)) return
      this.setData({ step: 'models', query: '', expandedModel: '', visibleLimit: MODEL_PAGE_SIZE })
      this.refreshModelLists()
    },
    selectVendor(event: WechatMiniprogram.TouchEvent) {
      const vendor = String(event.currentTarget.dataset.vendor || '')
      if (!this.vendorsFor(this.data.activeProvider).some(item => item.vendor === vendor)) return
      this.setData({ activeVendor: vendor, activeModelLabel: this.selectedModelLabel(this.data.activeProvider, vendor) })
      this.showModels()
    },
    backStep() {
      if (this.data.step === 'models') this.showVendors()
      else if (this.data.step === 'vendors') this.showProviders()
    },
    refreshModelLists() {
      const providerId = this.data.activeProvider as ModelProviderId
      const provider = this.getRegistry()?.providers?.[providerId]
      if (!provider || !this.data.activeVendor) { this.setData({ compatibleCount: 0, visibleCompatibleModels: [], hasMore: false }); return }
      const options = { role: normalizeRole(this.properties.role), query: this.data.query, outputFormat: String(this.properties.outputFormat || ''), recommendedOnly: providerId === 'openrouter' && this.data.catalogMode === 'recommended' }
      let partition = partitionRegistryModels(provider.models, options)
      const inVendor = (model: RegistryModel) => modelDeveloper(providerId, model).label === this.data.activeVendor
      if (options.recommendedOnly && !partition.compatible.some(inVendor)) {
        partition = partitionRegistryModels(provider.models, { ...options, recommendedOnly: false })
        this.setData({ catalogMode: 'all' })
      }
      const compatibleModels = partition.compatible.filter(inVendor).map(model => presentModel(model, this.properties.selectedProvider, this.properties.selectedModel, providerId))
      const visibleLimit = Math.max(MODEL_PAGE_SIZE, Number(this.data.visibleLimit) || MODEL_PAGE_SIZE)
      this.setData({ compatibleCount: compatibleModels.length, visibleCompatibleModels: compatibleModels.slice(0, visibleLimit), hasMore: visibleLimit < compatibleModels.length })
    },
    onSearch(event: WechatMiniprogram.Input) {
      this.setData({ query: event.detail.value, visibleLimit: MODEL_PAGE_SIZE })
      this.refreshModelLists()
    },
    setCatalogMode(event: WechatMiniprogram.TouchEvent) {
      this.setData({ catalogMode: event.currentTarget.dataset.mode === 'all' ? 'all' : 'recommended', visibleLimit: MODEL_PAGE_SIZE })
      this.refreshModelLists()
    },
    loadMore() { this.setData({ visibleLimit: this.data.visibleLimit + MODEL_PAGE_SIZE }); this.refreshModelLists() },
    choose(event: WechatMiniprogram.TouchEvent) {
      if (this.data.step !== 'models' || !this.data.activeVendor || event.currentTarget.dataset.disabled) return
      const modelId = String(event.currentTarget.dataset.model || '')
      if (!this.compatibleModels(this.data.activeProvider).some(model => model.id === modelId && modelDeveloper(this.data.activeProvider, model).label === this.data.activeVendor)) return
      this.triggerEvent('select', { provider: this.data.activeProvider, modelId })
    },
    copyId(event: WechatMiniprogram.TouchEvent) { wx.setClipboardData({ data: String(event.currentTarget.dataset.model || '') }) },
    toggleDetails(event: WechatMiniprogram.TouchEvent) { const id = String(event.currentTarget.dataset.model || ''); this.setData({ expandedModel: this.data.expandedModel === id ? '' : id }) },
    close() { this.triggerEvent('close') },
  },
})

function normalizeRole(value: unknown): ModelRole { return value === 'image' || value === 'vision' ? value : 'main' }
function roleLabel(role: ModelRole): string { return role === 'image' ? '图像生成模型' : role === 'vision' ? '参考图识别模型' : '主模型' }
function presentModel(model: RegistryModel, selectedProvider: unknown, selectedModel: unknown, providerId: ModelProviderId): ModelCard {
  return {
    id: model.id, label: model.label, recommended: model.recommended, requiresEntitlement: model.requiresEntitlement,
    availabilityNotes: [model.availabilityNotes, model.capabilities?.requiresSourceImage ? '仅图像编辑' : '', model.expirationDate && !model.expirationDate.startsWith('2098') ? `官方到期日：${model.expirationDate}` : '', model.earliestRetirementDate ? `最早退役日：${model.earliestRetirementDate}，以正式公告为准` : '', model.replacementModelId ? `迁移目标：${model.replacementModelId}` : ''].filter(Boolean).join(' · '),
    serviceTier: model.serviceTier || '',
    capabilityText: [model.roles.includes('main') ? '文本' : '', model.roles.includes('vision') ? '视觉理解' : '', model.roles.includes('image') && !model.capabilities?.requiresSourceImage ? '生图' : '', model.capabilities?.imageEditMode === 'direct-edit' ? '编辑' : ''].filter(Boolean).join(' · '),
    releaseText: [model.releasedAt || (model.releaseOrder ? '按官方版本排序 · 日期待确认' : '发布日期待确认'), model.releaseKind === 'snapshot' ? '日期快照' : ''].filter(Boolean).join(' · '),
    lifecycleText: modelLifecycleLabel(model.lifecycle),
    verificationText: model.verificationState === 'inference-verified' ? '账号已验证' : model.verificationState === 'catalog' ? '官方目录' : model.verified ? '注册表验证' : '模型目录',
    selected: String(selectedProvider || '') === providerId && String(selectedModel || '') === model.id,
  }
}
