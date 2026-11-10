import { fieldSourceLines, cardLifecycle, displayModalities, titleSourceRows, modalityIconStates } from '../../utils/card-presentation'
import { removedModelHint, modelDisplayName, removedModel, auditedModelSpecs, auditedModelLifecycle, AuditFact } from '../../utils/model-audit'
import { formatContextLimit, MODEL_CHANNEL_LABELS, modelDeveloper, orderModelChannels, modelVersionLabel, modelVersionDetail } from '../../utils/model-presentation'
import { getModelRegistryState } from '../../utils/model-registry-store'
import { registryForRegions } from '../../utils/provider-regions'
import { MODEL_PROVIDER_IDS, groupRegistryModels, partitionRegistryModels, type ModelProviderId, type ModelRegistry, type ModelRole, type RegistryModel } from '../../utils/model-registry'

const PROVIDER_LABELS = MODEL_CHANNEL_LABELS
const MODEL_PAGE_SIZE = 30
const visibleModels = (partition: ReturnType<typeof partitionRegistryModels>) => partition.compatible.concat(partition.incompatible.filter(m => m.catalogPresence?.status === 'unverified'))

interface ProviderCard { id: ModelProviderId; label: string; kindText: string; count: number }
interface VendorCard { vendor: string; count: number }
type ModelCard = ReturnType<typeof presentModel>

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
    savedLifecycle: '',
    removedHint: '',
    removed: null as ReturnType<typeof removedModel>,
    savedReplacement: '',
    replacementLabel: '',
    expandedModel: '',
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
    query: '',
    catalogMode: 'all' as 'recommended' | 'all',
    visibleLimit: MODEL_PAGE_SIZE,
    hasMore: false,
  },
  methods: {
    noop() {},
    getRegistry(): ModelRegistry | null { return registryForRegions(getModelRegistryState().registry, this.properties.providerRegions == null ? undefined : this.properties.providerRegions) },
    compatibleModels(providerId: string): RegistryModel[] {
      return visibleModels(partitionRegistryModels(this.getRegistry()?.providers?.[providerId as ModelProviderId]?.models || [], {
        role: normalizeRole(this.properties.role), outputFormat: String(this.properties.outputFormat || ''),
      })).filter(m => m.roles.includes(normalizeRole(this.properties.role)))
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
      const selectedProvider = this.properties.selectedProvider as ModelProviderId
      const selectedModel = this.properties.selectedModel
      const providerCards = orderModelChannels(MODEL_PROVIDER_IDS).map(id => ({
        id, label: PROVIDER_LABELS[id], kindText: registry?.providers[id]?.accessKind === 'aggregator' ? '聚合渠道' : '官方直连',
        count: this.compatibleModels(id).length,
      })).filter(item => item.count > 0 || item.id === 'tokendance' && registry?.providers.tokendance?.models.some(m => m.catalogPresence))
      const lifecycle = auditedModelLifecycle(selectedProvider, selectedModel)
      const removed = removedModel(selectedProvider, selectedModel)
      const replacement = this.compatibleModels(selectedProvider).find(model => !model.selectionDisabled && model.id === (removed?.replacementApiId || lifecycle?.replacement))
      this.setData({removed, removedHint: removedModelHint(selectedProvider, selectedModel), savedLifecycle: lifecycle?.message || '', savedReplacement: replacement?.id || '', replacementLabel: replacement?.label || ''})
      const activeProvider = providerCards.some(item => item.id === selectedProvider) ? selectedProvider : ''
      const vendorCards = activeProvider ? this.vendorsFor(activeProvider) : []
      const selected = this.compatibleModels(activeProvider).find(model => model.id === selectedModel)
      const activeVendor = selected ? modelDeveloper(activeProvider, selected).label : ''
      this.setData({
        step: 'providers', roleLabel: roleLabel(normalizeRole(this.properties.role)), providerCards, vendorCards,
        activeProvider, activeProviderLabel: activeProvider ? PROVIDER_LABELS[activeProvider] : '', activeVendor,
        activeModelLabel: selected?.label || '',
        query: '', expandedModel: '', catalogMode: 'all', visibleLimit: MODEL_PAGE_SIZE, compatibleCount: 0, visibleCompatibleModels: [], hasMore: false,
      })
    },
    selectProvider(event: WechatMiniprogram.TouchEvent) {
      const providerId = String(event.currentTarget.dataset.provider || '') as ModelProviderId
      if (!this.data.providerCards.some(item => item.id === providerId)) return
      const vendorCards = this.vendorsFor(providerId)
      const activeVendor = providerId === this.data.activeProvider && vendorCards.some(item => item.vendor === this.data.activeVendor) ? this.data.activeVendor : ''
      this.setData({
        activeProvider: providerId, activeProviderLabel: PROVIDER_LABELS[providerId] || providerId,
        activeVendor, activeModelLabel: this.selectedModelLabel(providerId, activeVendor), vendorCards,
        step: 'vendors', query: '', expandedModel: '', catalogMode: 'all', visibleLimit: MODEL_PAGE_SIZE,
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
      const compatibleModels = visibleModels(partition).filter(m => m.roles.includes(options.role)).filter(inVendor).map(model => presentModel(model, this.properties.selectedProvider, this.properties.selectedModel, providerId))
      const visibleLimit = Math.max(MODEL_PAGE_SIZE, Number(this.data.visibleLimit) || MODEL_PAGE_SIZE)
      const visible = compatibleModels.slice(0, visibleLimit), previous = this.data.visibleCompatibleModels
      const append = previous.length <= visible.length && previous.every((card, i) => JSON.stringify(card) === JSON.stringify(visible[i]))
      this.setData({ compatibleCount: compatibleModels.length, ...(append ? {} : {visibleCompatibleModels: []}), hasMore: visibleLimit < compatibleModels.length })
      // Long accessible evidence must not turn pagination into a large setData payload.
      for (let i = append ? previous.length : 0; i < visible.length; i += 16) {
        this.setData(Object.fromEntries(visible.slice(i, i + 16).map((card, offset) => [`visibleCompatibleModels[${i + offset}]`, card])))
      }
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
      if (!this.compatibleModels(this.data.activeProvider).some(model => !model.selectionDisabled && model.id === modelId && modelDeveloper(this.data.activeProvider, model).label === this.data.activeVendor)) return
      this.triggerEvent('select', { provider: this.data.activeProvider, modelId })
    },
    confirmReplacement() {
      const replacement = this.data.savedReplacement, provider = this.properties.selectedProvider
      if (!replacement || !this.compatibleModels(provider).some(model => !model.selectionDisabled && model.id === replacement)) return
      wx.showModal({title:'确认切换模型',content:`${modelDisplayName(provider, this.properties.selectedModel)} → ${modelDisplayName(provider, replacement)}。只修改当前选择，其他预设与历史记录保持不变。`,success: result => {
        if (result.confirm && this.compatibleModels(this.properties.selectedProvider).some(model => !model.selectionDisabled && model.id === replacement)) this.triggerEvent('select', {provider:this.properties.selectedProvider,modelId:replacement})
      }})
    },
    copySource(event: WechatMiniprogram.TouchEvent) { wx.showModal({title:'官方文档',content:[event.currentTarget.dataset.notice,event.currentTarget.dataset.source].filter(Boolean).join('\n'),confirmText:'复制链接',confirmColor:'#28634f',success: result => {if (result.confirm) wx.setClipboardData({data:String(event.currentTarget.dataset.url || '')})}}) },
    showModality(event: WechatMiniprogram.TouchEvent) { wx.showModal({title:String(event.currentTarget.dataset.label),content:String(event.currentTarget.dataset.detail),showCancel:false}) },
    copyId(event: WechatMiniprogram.TouchEvent) { wx.setClipboardData({ data: String(event.currentTarget.dataset.model || '') }) },
    toggleDetails(event: WechatMiniprogram.TouchEvent) { const id = String(event.currentTarget.dataset.model || ''); this.setData({ expandedModel: this.data.expandedModel === id ? '' : id }) },
    close() { this.triggerEvent('close') },
  },
})

function normalizeRole(value: unknown): ModelRole { return value === 'image' || value === 'vision' ? value : 'main' }
function roleLabel(role: ModelRole): string { return role === 'image' ? '图像生成模型' : role === 'vision' ? '参考图识别模型' : '主模型' }
function presentModel(model: RegistryModel, selectedProvider: unknown, selectedModel: unknown, providerId: ModelProviderId) {
  const audit = model.cardSpecifications || auditedModelSpecs(providerId, model.id), lifecycle = cardLifecycle(auditedModelLifecycle(providerId, model.id), audit)
  const names: Record<string,string> = {text:'文本',image:'图像',audio:'音频',video:'视频',file:'文件',document:'文件'}
  const display = (fact: AuditFact) => fact.state === 'known' ? Array.isArray(fact.value) ? displayModalities(fact.value as string[]).map(x => names[x]).join('、') : `${typeof fact.value === 'string' ? fact.value.replace(/[km]$/i, unit => unit.toUpperCase()) : formatContextLimit(Number(fact.value), fact.approximate)} tokens${fact.suffix || ''}` : fact.state === 'unsupported' ? '暂不支持' : fact.state === 'not-applicable' ? '不适用' : '未知'
  const origin = (fact: AuditFact) => fact.provenance === 'vendor' ? '源自原厂' : fact.provenance === 'catalog' ? '图研既有核实' : fact.provenance === 'product' ? '图研输入要求' : ''
  const image = model.roles.includes('image') && !(audit.fields.outputModalities.value as string[] || []).includes('text') && !['totalContextTokens','maxOutputTokens'].some(k => audit.fields[k].state === 'known')
  const specRows = [['inputModalities','输入'],['outputModalities','输出'],['totalContextTokens','上下文窗口'],['maxOutputTokens','最大输出']].map(([key,label]) => {
    const fact = audit.fields[key], modality = key.endsWith('Modalities')
    const icons = modality ? modalityIconStates(display(fact), fact, providerId, model.id) : []
    return {label, value:image && !modality && fact.state === 'unknown' && !fact.suppressFallback ? '不适用' : modality && fact.state === 'unknown' ? '模态未知' : display(fact), origin:origin(fact), unknown:fact.state === 'unknown', icons,
      unknownText:fact.state === 'known' ? icons.filter(i => i.state === 'unknown').map(i => i.label).join('、') : '',
      unsupportedText:displayModalities(fact.unsupportedModalities || []).map(id => names[id]).join('、')}
  })
  return {
    disabled: model.selectionDisabled, disabledReason: model.selectionDisabledReason,
    scheduled: lifecycle?.state === 'scheduled',
    retirementSource: lifecycle ? titleSourceRows([{url:lifecycle.sourceUrl,label:'下线公告'}])[0] : null,
    vendorLabel:modelDeveloper(providerId, model).label,channelLabel:PROVIDER_LABELS[providerId],
    specRows,
    specSources: titleSourceRows([...(audit.sourceUrl ? [{...(audit.sourceLabel === '下线公告' && Object.values(audit.fields).some(f => f.provenance === 'vendor' && f.sourceUrl === audit.sourceUrl) ? {role:'vendor'} : {}),url:audit.sourceUrl,label:audit.sourceLabel}] : []), ...Object.values(audit.fields).filter(f => providerId === 'fal' && f.provenance === 'channel' && /^https:\/\/fal\.ai\/models\//.test(f.sourceUrl || '')).map(f => ({url:f.sourceUrl!,label:'官方文档'})), ...(audit.vendorSources || []).filter((url: string) => url !== audit.sourceUrl).map((url: string) => ({url,label:'原厂规格'})), ...(audit.retirementSources || []).map((url: string) => ({url,label:'下线公告'}))], model),
    auditMessage:[...new Set([audit.verifiedAt && `核实日期：${audit.verifiedAt}`, ...fieldSourceLines(audit.fields, audit.verifiedAt), lifecycle?.message, audit.note, ...[['totalContextTokens','上下文窗口'],['maxOutputTokens','最大输出']].map(([key,label]) => audit.fields[key].state === 'known' ? `${label}：${audit.fields[key].value} tokens` : '')].filter(Boolean).flatMap(value => value.split('\n')))].join('\n'),
    id: model.id, label: model.label,
    availabilityNotes: [model.availabilityNotes, model.capabilities?.requiresSourceImage ? '仅图像编辑' : '', model.expirationDate && !model.expirationDate.startsWith('2098') ? `官方到期日：${model.expirationDate}` : '', model.earliestRetirementDate ? `最早退役日：${model.earliestRetirementDate}，以正式公告为准` : '', model.replacementModelId ? `迁移目标：${model.replacementModelId}` : ''].filter(Boolean).join(' · '),
    versionLabel:modelVersionLabel(model), versionText:modelVersionDetail(model), apiIdentifier:model.apiIdentifier || model.id,
    capabilityText: [model.roles.includes('main') ? '文本' : '', model.roles.includes('vision') ? '视觉理解' : '', model.roles.includes('image') && !model.capabilities?.requiresSourceImage ? '生图' : '', model.capabilities?.imageEditMode === 'direct-edit' ? '编辑' : ''].filter(Boolean).join(' · '),
    selected: String(selectedProvider || '') === providerId && String(selectedModel || '') === model.id,
  }
}
