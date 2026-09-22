import { openTokenDance, hasTokenDanceConnection } from '../../utils/tokendance'
import { MODEL_CHANNEL_LABELS, orderModelChannels } from '../../utils/model-presentation'
import { getModelRegistryState } from '../../utils/model-registry-store'
import { MINIMAX_REGIONS, minimaxRegion, regionApiKeySlot, selectRegionApiKeys, registryForRegions, type ProviderRegions } from '../../utils/provider-regions'
import { buildAspectRatioOptions, buildResolutionOptions, normalizeSelectedAspectRatio } from '../../utils/aspect-ratios'
import { formatError, requestJson } from '../../utils/api'
import { clearArkVerification, getArkVerification, setArkProbeResults } from '../../utils/ark-verification'
import { MANUAL_REFERENCE_LIMIT, PROVIDERS } from '../../utils/constants'
import { MODEL_PROVIDER_IDS, findRegistryModel, type ModelProviderId, type ModelRegistry, type ModelRole } from '../../utils/model-registry'
import { buildModelSubmission, requiredCreateRouteRoles, requiredRefineRouteRoles, arkProbesForRoles, missingArkVerifications, nextArkVerificationBatch, providerDefaultRoutes, uniqueProvidersForRoles, type ModelRoutes } from '../../utils/model-routing'
import { toggleReferenceSelection } from '../../utils/reference-library'

const PROVIDER_LABELS = MODEL_CHANNEL_LABELS

interface SettingsDraft {
  providerRegions?: ProviderRegions
  configurationMode: 'simple' | 'advanced'
  simpleProvider: ModelProviderId
  modelRoutes: ModelRoutes
  outputFormat: 'png' | 'svg'
  imageSize: string
  aspectRatio: string
  pipelineMode: string
  retrievalSetting: string
  numCandidates: number
  maxCriticRounds: number
}

Component({
  options: { styleIsolation: 'apply-shared', multipleSlots: true },
  properties: {
    show: { type: Boolean, value: false, observer(this: any, show: boolean) {
      this.epoch = Number(this.epoch || 0) + 1
      if (show) {
        this.resetDraft()
        const measure = () => { this.baseHeight = (wx as any).getWindowInfo?.().windowHeight || 0 }
        measure(); wx.hideTabBar?.({ animation: false, success: measure })
      } else {
        wx.showTabBar?.({ animation: false }); this.focusedProvider = ''
        this.setData({ draftKeys: {}, keyFields: [], autoFocusProvider: '', showModelPicker: false, verifyingArk: false, keyboardHeight: 0, keyboardOpen: false, focusedKeyId: '' })
      }
    } },
    focusProvider: { type: String, value: '', observer(this: any, value: string) { if (this.properties.show && value) this.focusCredential(value) } },
    purpose: { type: String, value: '' },
    referenceCount: { type: Number, value: 0 },
    referenceImageMode: { type: String, value: 'vision_model' },
    registryVersion: { type: String, value: '', observer(this: any) { if (this.properties.show) this.refreshPresentation() } },
    settings: { type: Object, value: {} },
    apiKeys: { type: Object, value: {} },
    executionRoles: { type: Array, value: [] as string[] },
    manualReferenceIds: { type: Array, value: [] as string[] },
    libraryTaskName: { type: String, value: 'diagram' },
  },
  data: {
    emptyObject: {}, advancedExpanded: false, credentialsExpanded: false, autoFocusProvider: '', credentialSummary: '', tokenDanceConnected: false, keyboardHeight: 0, keyboardOpen: false, focusedKeyId: '', normalizationNotice: '',
    draft: null as SettingsDraft | null,
    minimaxRegionOptions: [{value:'global',label:'国际'}, {value:'cn',label:'中国大陆'}],
    minimaxRegionIndex: 0, minimaxApiBase: '',
    providerOptions: orderModelChannels(MODEL_PROVIDER_IDS).map((value) => ({ value, label: PROVIDER_LABELS[value] })),
    providerIndex: 0,
    routeRows: [] as Array<{ role: ModelRole; label: string; provider: string; providerLabel: string; modelId: string; modelLabel: string }>,
    ratioOptions: [] as Array<{ value: string; label: string }>,
    ratioIndex: 0,
    resolutionOptions: [] as Array<{ value: string; label: string }>,
    resolutionIndex: 0,
    outputOptions: [{ value: 'png', label: 'PNG 图片' }, { value: 'svg', label: 'SVG 矢量图' }],
    outputIndex: 0,
    pipelineOptions: [{ value: 'planner_critic', label: '规划器 + 评审器' }, { value: 'full', label: '完整流程' }, { value: 'vanilla', label: '基础生成' }],
    pipelineIndex: 0,
    retrievalOptions: [{ value: 'none', label: '不使用检索' }, { value: 'auto', label: '自动检索' }, { value: 'random', label: '随机参考' }, { value: 'manual', label: '手动参考' }],
    retrievalIndex: 0,
    candidateOptions: [{ value: 1, label: '1 张' }, { value: 2, label: '2 张' }, { value: 3, label: '3 张' }],
    candidateIndex: 0,
    criticOptions: [{ value: 0, label: '0 轮' }, { value: 1, label: '1 轮' }, { value: 2, label: '2 轮' }],
    criticIndex: 1,
    keyFields: [] as Array<{ provider: string; label: string; value: string; placeholder: string; guideSteps: string[]; guideUrl: string; guideHost: string }>,
    encryptedRecovery: false,
    draftKeys: {} as Record<string, string>,
    draftManualReferenceIds: [] as string[],
    showModelPicker: false,
    editingRole: 'main' as ModelRole,
    pickerProvider: '',
    pickerModel: '',
    error: '',
    arkStatus: '',
    verifyingArk: false,
  },
  lifetimes: {
    attached() {
      const listener = (event: { height: number }) => {
        if (!this.properties.show) return
        const currentHeight = (wx as any).getWindowInfo?.().windowHeight || (this as any).baseHeight
        const shrink = Math.max(0, ((this as any).baseHeight || currentHeight) - currentHeight)
        this.setData({ keyboardHeight: Math.max(0, event.height - shrink), keyboardOpen: event.height > 0, focusedKeyId: '' }, () => {
          if (event.height > 0 && (this as any).focusedProvider) this.setData({ focusedKeyId: 'credential-' + (this as any).focusedProvider })
        })
      }
      ;(this as any).keyboardListener = listener; wx.onKeyboardHeightChange?.(listener)
    },
    detached() { wx.offKeyboardHeightChange?.((this as any).keyboardListener); if (this.properties.show) wx.showTabBar?.({ animation: false }) },
  },
  methods: {
    openTokenDance,
    configureRoleKey(event: WechatMiniprogram.TouchEvent) { this.focusCredential(String(event.currentTarget.dataset.provider || '')) },
    focusCredential(provider: string) {
      if (!this.data.keyFields.some(field => field.provider === provider)) return
      this.setData({ credentialsExpanded: true, focusedKeyId: '', autoFocusProvider: '' }, () => {
        this.setData({ focusedKeyId: 'credential-' + provider, autoFocusProvider: provider === 'tokendance' ? '' : provider })
      })
    },
    toggleAdvanced() { this.setData({ advancedExpanded: !this.data.advancedExpanded }) },
    toggleCredentials() { this.setData({ credentialsExpanded: !this.data.credentialsExpanded }) },
    noop() {},
    onKeyFocus(event: WechatMiniprogram.InputFocus) { (this as any).focusedProvider = String(event.currentTarget.dataset.provider || ''); this.setData({ focusedKeyId: 'credential-' + (this as any).focusedProvider }) },
    // Keep full capability metadata in the logic-layer store, outside setData.
    getRegistry(): ModelRegistry | null { return registryForRegions(getModelRegistryState().registry, this.data.draft?.providerRegions) },
    effectiveRoles(): ModelRole[] {
      const draft = this.data.draft
      if (!draft || !this.properties.purpose) return normalizeRoles(this.properties.executionRoles)
      if (this.properties.purpose === 'optimize') return ['main']
      const registry = this.getRegistry()
      const image = findRegistryModel(registry, draft.modelRoutes.image.accessProvider, draft.modelRoutes.image.modelId)
      if (this.properties.purpose === 'refine') return requiredRefineRouteRoles({ refineMode: String(image?.capabilities.imageEditMode || 'none') })
      const main = findRegistryModel(registry, draft.modelRoutes.main.accessProvider, draft.modelRoutes.main.modelId)
      const referenceMode = draft.configurationMode === 'simple' ? (main?.inputModalities.includes('image') || main?.capabilities.referenceImages === true ? 'main_model' : 'vision_model') : this.properties.referenceImageMode
      return requiredCreateRouteRoles({ ...draft, taskName: this.properties.libraryTaskName, imageRefineMode: image?.capabilities.imageEditMode, referenceImages: this.properties.referenceCount > 0 ? [{}] : [], referenceImageMode: referenceMode }, draft.maxCriticRounds)
    },
    resetDraft() {
      const registry = getModelRegistryState().registry
      const incoming = this.properties.settings as SettingsDraft | null
      if (!registry || !incoming) {
        this.setData({ draft: null, error: '模型目录尚未就绪，暂时不能编辑生成设置。' })
        return
      }
      const draft = cloneDraft(incoming)
      draft.providerRegions = draft.providerRegions || {}
      this.setData({
        draft,
        draftKeys: { ...(this.properties.apiKeys as Record<string, string> || {}) },
        draftManualReferenceIds: [...(this.properties.manualReferenceIds as string[] || [])],
        error: '', advancedExpanded: false, credentialsExpanded: false, normalizationNotice: '',
      })
      this.refreshPresentation()
      if (this.properties.focusProvider) this.focusCredential(this.properties.focusProvider)
    },
    refreshPresentation() {
      const draft = this.data.draft
      const registry = this.getRegistry()
      if (!draft || !registry) return
      const providerOptions = orderModelChannels(MODEL_PROVIDER_IDS).filter((id) => {
        const defaults = registry.providers[id]?.defaults
        return defaults?.main && defaults?.image && defaults?.vision
      }).map((value) => ({ value, label: PROVIDER_LABELS[value] }))
      const previousSize = draft.imageSize, previousRatio = draft.aspectRatio
      const imageEntry = findRegistryModel(registry, draft.modelRoutes.image.accessProvider, draft.modelRoutes.image.modelId)
      const refinement = this.properties.purpose === 'refine' || (this.properties.libraryTaskName === 'plot' && imageEntry?.capabilities.imageEditMode === 'direct-edit')
      const resolutionOptions = buildResolutionOptions(imageEntry?.capabilities || {}, refinement ? 'refineResolutions' : 'resolutions')
      if (this.properties.purpose !== 'optimize' && draft.outputFormat === 'png' && !resolutionOptions.some((item) => item.value === draft.imageSize)) {
        draft.imageSize = resolutionOptions[0]?.value || ''
      }
      const ratioAll = buildAspectRatioOptions({ capabilities: imageEntry?.capabilities || {}, capabilityField: refinement ? 'refineAspectRatios' : 'aspectRatios', modelLabel: imageEntry?.label, resolution: draft.imageSize })
      const ratioOptions = ratioAll.filter((item) => !item.disabled).map((item) => ({ value: item.value, label: item.label }))
      if (this.properties.purpose !== 'optimize') draft.aspectRatio = normalizeSelectedAspectRatio(draft.aspectRatio, ratioAll)
      const executionRoles = this.effectiveRoles()
      const selectedKeys = selectRegionApiKeys(this.data.draftKeys, draft.providerRegions)
      const connected = hasTokenDanceConnection()
      const routeRows = (this.properties.purpose === 'optimize' ? ['main'] as ModelRole[] : ['main', 'image', 'vision'] as ModelRole[]).map((role) => {
        const route = draft.modelRoutes[role]
        const model = findRegistryModel(registry, route.accessProvider, route.modelId)
        return {
          role, label: role === 'main' ? '主模型' : role === 'image' ? '图像生成模型' : '参考图识别模型',
          provider: route.accessProvider, providerLabel: PROVIDER_LABELS[route.accessProvider] || route.accessProvider,
          modelId: route.modelId, modelLabel: model?.label || route.modelId,
          required: executionRoles.includes(role),
          credentialAction: route.accessProvider === 'tokendance' ? (connected ? '管理授权' : '连接账户') : '配置 Key',
          credentialReady: route.accessProvider === 'tokendance' ? connected : Boolean(selectedKeys[route.accessProvider]?.trim()),
          credentialStatus: route.accessProvider === 'tokendance' ? (connected ? '已连接 · 使用观猹账户额度' : '未连接观猹账户') : (selectedKeys[route.accessProvider]?.trim() ? '已配置' : '缺少 API Key'),
        }
      })
      const providers = uniqueProvidersForRoles(draft.modelRoutes, this.effectiveRoles())
      const keyFields = uniqueProvidersForRoles(draft.modelRoutes, routeRows.map(row => row.role)).map((provider) => {
        const config = PROVIDERS.find(item => item.id === provider)
        const region = MINIMAX_REGIONS[minimaxRegion(draft.providerRegions)]
        const guideUrl = provider === 'tokendance' ? '' : provider === 'minimax' ? region.keyUrl : config?.guideUrl || ''
        return {
          provider, label: PROVIDER_LABELS[provider] || provider, value: selectedKeys[provider] || '',
          placeholder: config?.keyPlaceholder || 'API Key',
          guideSteps: provider === 'minimax' ? [`登录稀宇科技 ${region.label}平台，进入 API Key 页面创建密钥。`, ...(config?.guideSteps || []).slice(1)] : config?.guideSteps || [],
          guideUrl, guideHost: guideUrl.match(/^https:\/\/([^/]+)/)?.[1] || '',
        }
      })
      const probes = arkProbesForRoles(draft.modelRoutes, this.effectiveRoles())
      const missing = missingArkVerifications(probes, getArkVerification())
      const arkStatus = probes.length ? (missing.length ? `${missing.length} 条 Ark 路线可选验证` : 'Ark 路线已验证') : ''
      this.setData({
        draft, routeRows, ratioOptions, resolutionOptions, keyFields, tokenDanceConnected: connected,
        credentialSummary: [...new Set(routeRows.filter(row => row.required && !row.credentialReady).map(row => row.providerLabel + (row.provider === 'tokendance' ? ' 未连接' : ' 缺少 API Key')))].join('；') || '本次任务所需凭据已就绪',
        normalizationNotice: previousSize !== draft.imageSize || previousRatio !== draft.aspectRatio ? '已按当前模型调整不兼容的清晰度或比例，保存后生效。' : this.data.normalizationNotice, encryptedRecovery: providers.some(provider => ['tokendance', 'fal', 'replicate', 'runware', 'tokenhub', 'xiaomi', 'sensenova', 'stepfun', 'qianfan', 'iflytek', 'longcat', 'xai'].includes(provider)),
        providerOptions,
        minimaxRegionIndex: minimaxRegion(draft.providerRegions) === 'cn' ? 1 : 0,
        minimaxApiBase: MINIMAX_REGIONS[minimaxRegion(draft.providerRegions)].apiBase,
        providerIndex: Math.max(0, providerOptions.findIndex((item) => item.value === draft.simpleProvider)),
        ratioIndex: Math.max(0, ratioOptions.findIndex((item) => item.value === draft.aspectRatio)),
        resolutionIndex: Math.max(0, resolutionOptions.findIndex((item) => item.value === draft.imageSize)),
        outputIndex: draft.outputFormat === 'svg' ? 1 : 0,
        pipelineIndex: Math.max(0, this.data.pipelineOptions.findIndex((item) => item.value === draft.pipelineMode)),
        retrievalIndex: Math.max(0, this.data.retrievalOptions.findIndex((item) => item.value === draft.retrievalSetting)),
        candidateIndex: Math.max(0, this.data.candidateOptions.findIndex((item) => item.value === draft.numCandidates)),
        criticIndex: Math.max(0, this.data.criticOptions.findIndex((item) => item.value === draft.maxCriticRounds)),
        arkStatus,
      })
    },
    setMode(event: WechatMiniprogram.TouchEvent) {
      const draft = this.data.draft
      if (!draft) return
      const mode = event.currentTarget.dataset.mode === 'advanced' ? 'advanced' : 'simple'
      if (mode === draft.configurationMode) return
      draft.configurationMode = mode
      const registry = this.getRegistry()
      if (!registry) return
      if (draft.configurationMode === 'simple' && Object.values(draft.modelRoutes).some(route => route.accessProvider !== draft.simpleProvider)) draft.modelRoutes = providerDefaultRoutes(draft.simpleProvider, registry)
      this.setData({ draft })
      this.refreshPresentation()
    },
    onProviderChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      const index = Number(event.detail.value) || 0
      const provider = this.data.providerOptions[index]?.value
      if (!provider || provider === draft.simpleProvider) return
      draft.simpleProvider = provider
      const registry = this.getRegistry()
      if (!registry) return
      draft.modelRoutes = providerDefaultRoutes(provider, registry)
      this.setData({ draft })
      this.refreshPresentation()
    },
    openModelPicker(event: WechatMiniprogram.TouchEvent) {
      const draft = this.data.draft
      const role = normalizeRole(event.currentTarget.dataset.role)
      if (!draft) return
      wx.hideKeyboard?.()
      this.setData({ autoFocusProvider: '', editingRole: role, showModelPicker: true, pickerProvider: draft.modelRoutes[role].accessProvider, pickerModel: draft.modelRoutes[role].modelId })
    },
    closeModelPicker() { this.setData({ showModelPicker: false }) },
    selectModel(event: WechatMiniprogram.CustomEvent<{ provider: string; modelId: string }>) {
      const draft = this.data.draft
      if (!draft) return
      if (this.properties.purpose === 'optimize' || event.detail.provider !== draft.simpleProvider) draft.configurationMode = 'advanced'
      draft.modelRoutes[this.data.editingRole] = { accessProvider: event.detail.provider, modelId: event.detail.modelId }
      this.setData({ draft, showModelPicker: false })
      this.refreshPresentation()
    },
    onOutputChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      draft.outputFormat = Number(event.detail.value) === 1 ? 'svg' : 'png'
      this.setData({ draft })
      this.refreshPresentation()
    },
    selectRatio(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
      const index = this.data.ratioOptions.findIndex(item => item.value === event.detail.value)
      if (index >= 0) this.onRatioChange({ detail: { value: String(index) } } as WechatMiniprogram.PickerChange)
    },
    onRatioChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      draft.aspectRatio = this.data.ratioOptions[Number(event.detail.value) || 0]?.value || 'auto'
      this.setData({ draft, ratioIndex: Number(event.detail.value) || 0 })
      this.refreshPresentation()
    },
    onResolutionChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      draft.imageSize = this.data.resolutionOptions[Number(event.detail.value) || 0]?.value || ''
      this.setData({ draft, resolutionIndex: Number(event.detail.value) || 0 })
      this.refreshPresentation()
    },
    onPipelineChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      draft.pipelineMode = this.data.pipelineOptions[Number(event.detail.value) || 0]?.value || 'planner_critic'
      this.setData({ draft, pipelineIndex: Number(event.detail.value) || 0 })
      this.refreshPresentation()
    },
    onRetrievalChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      draft.retrievalSetting = this.data.retrievalOptions[Number(event.detail.value) || 0]?.value || 'none'
      this.setData({ draft, retrievalIndex: Number(event.detail.value) || 0 })
      this.refreshPresentation()
    },
    selectRetrieval(event: WechatMiniprogram.TouchEvent) {
      const draft = this.data.draft
      if (!draft) return
      const value = String(event.currentTarget.dataset.value || 'none')
      const retrievalIndex = Math.max(0, this.data.retrievalOptions.findIndex((item) => item.value === value))
      draft.retrievalSetting = this.data.retrievalOptions[retrievalIndex]?.value || 'none'
      this.setData({ draft, retrievalIndex }); this.refreshPresentation()
    },
    onManualReferenceToggle(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
      const result = toggleReferenceSelection(this.data.draftManualReferenceIds, String(event.detail.id || ''), MANUAL_REFERENCE_LIMIT)
      this.setData({ draftManualReferenceIds: result.ids, error: result.error })
    },
    onCandidateChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      draft.numCandidates = this.data.candidateOptions[Number(event.detail.value) || 0]?.value || 1
      this.setData({ draft, candidateIndex: Number(event.detail.value) || 0 })
      this.refreshPresentation()
    },
    onCriticChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      draft.maxCriticRounds = this.data.criticOptions[Number(event.detail.value) || 0]?.value || 0
      this.setData({ draft, criticIndex: Number(event.detail.value) || 0 })
      this.refreshPresentation()
    },
    onMiniMaxRegionChange(event: WechatMiniprogram.PickerChange) {
      const draft = this.data.draft
      if (!draft) return
      const region = Number(event.detail.value) === 1 ? 'cn' : 'global'
      if (region === 'cn' && !this.getRegistry()?.providerRegionContractVersion) {
        this.setData({error: '当前服务端尚未支持 稀宇科技国内区域。'}); return
      }
      draft.providerRegions = {minimax: region}
      if (region === 'global' && draft.modelRoutes.image.accessProvider === 'minimax' && draft.modelRoutes.image.modelId === 'image-01-live') draft.modelRoutes.image.modelId = 'image-01'
      this.setData({draft, error: ''})
      this.refreshPresentation()
    },
    copyKeyGuide(event: WechatMiniprogram.TouchEvent) {
      const provider = String(event.currentTarget.dataset.provider || '')
      const field = this.data.keyFields.find(item => item.provider === provider)
      if (!field?.guideUrl.startsWith('https://')) return
      wx.setClipboardData({ data: field.guideUrl, success: () => wx.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' }), fail: () => wx.showToast({ title: '复制失败，请重试', icon: 'none' }) })
    },
    onKeyInput(event: WechatMiniprogram.Input) {
      const provider = String(event.currentTarget.dataset.provider || '')
      if (provider === 'ark' && this.data.draftKeys.ark !== event.detail.value) clearArkVerification()
      const draftKeys = { ...this.data.draftKeys, [regionApiKeySlot(provider, this.data.draft?.providerRegions)]: event.detail.value }
      this.setData({ draftKeys })
      this.refreshPresentation()
    },
    verifyArkRoutes() {
      const draft = this.data.draft
      if (!draft || this.data.verifyingArk) return
      const probes = arkProbesForRoles(draft.modelRoutes, this.effectiveRoles())
      if (!probes.length) return
      if (!String(this.data.draftKeys.ark || '').trim()) { this.setData({ error: '请先填写火山方舟 API Key。' }); return }
      const freeBatch = nextArkVerificationBatch(probes, getArkVerification(), false)
      if (freeBatch.probes.length) { void this.runArkProbeBatch(freeBatch.probes, false); return }
      const paidBatch = nextArkVerificationBatch(probes, getArkVerification(), true)
      if (!paidBatch.probes.length) { wx.showToast({ title: 'Ark 路线已验证', icon: 'success' }); return }
      wx.showModal({ title: '确认付费图像验证', content: '图像路线 probe 会调用一次图片生成接口，可能产生费用。仅在你明确确认后执行。', confirmText: '确认验证', success: (result) => { if (result.confirm) void this.runArkProbeBatch(paidBatch.probes, true) } })
    },
    async runArkProbeBatch(probes: Array<{ role: ModelRole; modelId: string }>, confirmPaidImageProbe: boolean) {
      const epoch = (this as any).epoch
      this.setData({ verifyingArk: true, error: '' })
      try {
        const response = await requestJson<{ probeResults?: Array<{ role?: string; modelId?: string; state?: string }> }>({ action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: String(this.data.draftKeys.ark || '').trim() }, probes, confirmPaidImageProbe })
        if (epoch !== (this as any).epoch) return
        setArkProbeResults(response.probeResults || [])
        this.refreshPresentation()
        wx.showToast({ title: confirmPaidImageProbe ? '图像路线已验证' : '免费路线已验证', icon: 'success' })
      } catch (error) { if (epoch === (this as any).epoch) this.setData({ error: formatError(error) }) }
      finally { if (epoch === (this as any).epoch) this.setData({ verifyingArk: false }) }
    },
    cancel() { wx.hideKeyboard?.(); this.setData({ showModelPicker: false }); this.triggerEvent('close') },
    save() {
      const draft = this.data.draft
      if (!draft) return
      if (this.properties.purpose !== 'optimize' && draft.outputFormat === 'png' && !draft.imageSize) {
        this.setData({ error: '当前图像模型未声明可用清晰度，请更换模型。' })
        return
      }
      try { if (this.properties.purpose !== 'optimize') buildModelSubmission({ ...draft, registry: this.getRegistry() }) } catch (error) { this.setData({ error: formatError(error) }); return }
      this.triggerEvent('save', {
        settings: cloneDraft(draft),
        apiKeys: { ...this.data.draftKeys },
        manualReferenceIds: draft.retrievalSetting === 'manual' ? [...this.data.draftManualReferenceIds] : [],
      })
    },
  },
})

function normalizeRole(value: unknown): ModelRole { return value === 'image' || value === 'vision' ? value : 'main' }
function normalizeRoles(value: unknown): ModelRole[] { return Array.isArray(value) ? value.map(normalizeRole) : [] }
function cloneDraft(value: SettingsDraft): SettingsDraft { return JSON.parse(JSON.stringify(value)) as SettingsDraft }
