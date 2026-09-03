import { formatError, requestHealth, requestJson, uploadReferenceFile } from '../../utils/api'
import {
  ASPECT_RATIO_OPTIONS,
  CANDIDATE_OPTIONS,
  CRITIC_ROUND_OPTIONS,
  INFOGRAPHIC_CATEGORIES,
  MANUAL_REFERENCE_LIMIT,
  OUTPUT_FORMATS,
  PIPELINE_OPTIONS,
  PLOT_CATEGORY_ID,
  PLOT_NOTE,
  PROVIDERS,
  QUICK_START_EXAMPLES,
  REFERENCE_IMAGE_LIMITS,
  REFERENCE_IMAGE_MODES,
  RESOLUTION_OPTIONS,
  RETRIEVAL_OPTIONS,
  STATUS_LABELS,
  getModelIndex,
  getModelLabel,
  mainModelCanReadImages,
  readDatasetBoolean,
  readPickerIndex,
  supportedResolutions,
  type ConfigurationMode,
  type ImageSize,
  type ProviderId,
  type RetrievalSetting,
} from '../../utils/constants'
import type { OutputFormat } from '../../utils/job-assets'
import {
  appendLocalJob,
  normalizeJob,
  toCurrentJobSummary,
  type Job,
} from '../../utils/jobs'
import { downloadShareFile, saveImageToAlbum } from '../../utils/media'
import { buildCreateJobPayload, type UploadedReferenceImage } from '../../utils/payload'
import { getApiKeys, replaceApiKeys } from '../../utils/api-keys'
import { attachFeaturedTemplateImages, FEATURED_TEMPLATES, featuredTemplateRequest, type FeaturedTemplate } from '../../utils/featured-templates'
import { findRegistryModel, type ModelRegistry, type ModelProviderId } from '../../utils/model-registry'
import { loadModelRegistry, subscribeModelRegistry, type ModelRegistryState } from '../../utils/model-registry-store'
import { providerDefaultRoutes, requiredCreateRouteRoles, uniqueProvidersForRoles, type ModelRoutes } from '../../utils/model-routing'
import {
  buildReferenceImage,
  filenameFromPath,
  mimeTypeFromPath,
  normalizeReferenceFileMimeType,
  sanitizeLocalFilename,
  type ReferenceImage,
} from '../../utils/reference-files'
import {
  buildReferenceModeState,
  defaultReferenceImageMode,
  normalizeReferenceImageMode,
  type ReferenceImageMode,
} from '../../utils/reference-mode'
import { getCurrentUser, isSessionChecked, signOut as sessionSignOut, subscribeSession } from '../../utils/session'

interface ReferenceUpload {
  clientId: string
  objectKey: string
  uploadUrl: string
  uploadToken: string
  mimeType: string
  size: number
}

interface GenerationSettings {
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
const DRAFT_STORAGE_KEY = 'paperbanana_mini_draft'

Component({
  data: {
    logoSrc: '/images/logo.png',
    providers: PROVIDERS,
    providerIndex: 0,
    providerLabel: PROVIDERS[0].label,
    providerMainModel: PROVIDERS[0].mainModel,
    providerImageModel: PROVIDERS[0].imageModel,
    providerGuideSteps: PROVIDERS[0].guideSteps,
    mainModelOptions: PROVIDERS[0].mainModels,
    mainModelIndex: getModelIndex(PROVIDERS[0].mainModels, PROVIDERS[0].mainModel),
    mainModelLabel: getModelLabel(PROVIDERS[0].mainModels, PROVIDERS[0].mainModel),
    imageModelOptions: PROVIDERS[0].imageModels,
    imageModelIndex: getModelIndex(PROVIDERS[0].imageModels, PROVIDERS[0].imageModel),
    imageModelLabel: getModelLabel(PROVIDERS[0].imageModels, PROVIDERS[0].imageModel),
    referenceVisionModelOptions: PROVIDERS[0].visionModels,
    referenceVisionModelIndex: getModelIndex(PROVIDERS[0].visionModels, PROVIDERS[0].visionModel),
    referenceVisionModelLabel: getModelLabel(PROVIDERS[0].visionModels, PROVIDERS[0].visionModel),
    configurationMode: 'simple' as ConfigurationMode,
    isAdvancedMode: false,
    pipelineOptions: PIPELINE_OPTIONS,
    pipelineIndex: 0,
    pipelineLabel: String(PIPELINE_OPTIONS[0].label),
    aspectRatioOptions: ASPECT_RATIO_OPTIONS,
    aspectRatioIndex: 0,
    aspectRatioLabel: String(ASPECT_RATIO_OPTIONS[0].label),
    candidateOptions: CANDIDATE_OPTIONS,
    candidateIndex: 0,
    candidateLabel: String(CANDIDATE_OPTIONS[0].label),
    criticRoundOptions: CRITIC_ROUND_OPTIONS,
    criticRoundIndex: 1,
    criticRoundLabel: String(CRITIC_ROUND_OPTIONS[1].label),
    outputFormatOptions: OUTPUT_FORMATS,
    outputFormat: 'png' as OutputFormat,
    outputFormatIndex: 0,
    outputFormatLabel: OUTPUT_FORMATS[0].label,
    // 输出清晰度：1K 仅基础渲染；2K/4K 出图后自动精修放大。选项按 provider/图像模型过滤。
    resolutionOptions: RESOLUTION_OPTIONS.filter((option) => supportedResolutions(PROVIDERS[0].id, PROVIDERS[0].imageModel).indexOf(option.value) >= 0),
    resolutionIndex: 0,
    imageSize: '1K' as ImageSize,
    imageSizeLabel: RESOLUTION_OPTIONS[0].label,
    // 检索设置（专业模式）：上传参考图后锁为不检索
    retrievalOptions: RETRIEVAL_OPTIONS,
    retrievalIndex: 0,
    retrievalSetting: 'none' as RetrievalSetting,
    retrievalLabel: RETRIEVAL_OPTIONS[0].label,
    manualReferenceIds: [] as string[],
    showReferenceLibrary: false,
    libraryTaskName: 'diagram',
    referenceImageModeOptions: REFERENCE_IMAGE_MODES,
    referenceImageMode: defaultReferenceImageMode(mainModelCanReadImages(PROVIDERS[0].id, PROVIDERS[0].mainModel)),
    referenceImages: [] as ReferenceImage[],
    referenceImageCount: 0,
    referenceCanAddImage: true,
    referenceModeNote: '',
    referenceModeCanSubmit: true,
    referenceNeedsVisionModel: false,
    shouldShowReferenceModeSelector: false,
    canSelectMainModelDirect: mainModelCanReadImages(PROVIDERS[0].id, PROVIDERS[0].mainModel),
    referenceUploadError: '',
    isUploadingReferences: false,
    mainModelName: PROVIDERS[0].mainModel,
    imageModelName: PROVIDERS[0].imageModel,
    referenceVisionModelName: PROVIDERS[0].visionModel,
    apiKey: '',
    apiKeyPlaceholder: PROVIDERS[0].keyPlaceholder,
    categories: INFOGRAPHIC_CATEGORIES,
    categoryIndex: 0,
    categoryLabel: INFOGRAPHIC_CATEGORIES[0].label,
    categoryDescription: INFOGRAPHIC_CATEGORIES[0].description,
    isPlotCategory: false,
    plotNote: PLOT_NOTE,
    methodContent: QUICK_START_EXAMPLES[0].methodContent,
    caption: QUICK_START_EXAMPLES[0].caption,
    quickStartExamples: QUICK_START_EXAMPLES,
    featuredTemplates: attachFeaturedTemplateImages([]),
    featuredTemplatesLoading: true,
    registry: {} as ModelRegistry | Record<string, never>,
    registryReady: false,
    registryVersion: '等待服务端目录',
    registryError: '',
    settings: {} as GenerationSettings | Record<string, never>,
    settingsSummary: '正在读取服务端默认路线…',
    settingsSummaryDetails: [] as string[],
    showGenerationSettings: false,
    apiKeysForSheet: {} as Record<string, string>,
    settingsExecutionRoles: [] as string[],
    negativePrompt: '',
    inputDirty: false,
    healthText: '检测中',
    healthOk: false,
    healthChecked: false,
    canSubmit: false,
    isSubmitting: false,
    currentJobId: '',
    job: null as Job | null,
    error: '',
    statusLabel: '',
    resultImages: [] as Job['result_images'],
    currentUserEmail: '',
    isLoggedIn: false,
    isAuthChecking: true,
    showAuthPanel: false,
    showFeedbackPanel: false,
    // 反馈悬浮按钮初始位置（px，attached 时按屏幕尺寸算到右下角）
    fabX: 0,
    fabY: 0,
  },

  lifetimes: {
    attached() {
      ;(this as any).isPageVisible = true
      this.restoreDraft()
      // 悬浮反馈按钮放到右下角（movable-view 的 x/y 是相对 movable-area 左上角的 px 值）
      try {
        // getSystemInfoSync 已废弃；优先用 getWindowInfo（基础库 2.20.1+），旧环境回退
        const getWindowInfo = (wx as any).getWindowInfo
        const info = typeof getWindowInfo === 'function' ? getWindowInfo() : wx.getSystemInfoSync()
        const rpx = info.windowWidth / 750
        this.setData({
          fabX: Math.max(0, info.windowWidth - 144 * rpx - 24 * rpx),
          fabY: Math.max(0, info.windowHeight - 76 * rpx - 48 * rpx),
        })
      } catch {
        // 取不到屏幕信息时停留在默认位置，可手动拖动
      }
      const unsubscribe = subscribeSession((user) => {
        this.setData({
          isLoggedIn: Boolean(user),
          currentUserEmail: user ? user.email : '',
          isAuthChecking: false,
        })
      })
      ;(this as any).unsubscribeSession = unsubscribe
      const user = getCurrentUser()
      this.setData({
        isLoggedIn: Boolean(user),
        currentUserEmail: user ? user.email : '',
        isAuthChecking: !isSessionChecked(),
      })
      this.refreshCanSubmit()
      this.checkHealth()
      const unsubscribeRegistry = subscribeModelRegistry((state) => this.applyRegistryState(state))
      ;(this as any).unsubscribeRegistry = unsubscribeRegistry
      void loadModelRegistry()
      void this.loadFeaturedTemplates()
    },
    detached() {
      this.stopPolling()
      const draftTimer = (this as any).draftTimer as number | undefined
      if (draftTimer) clearTimeout(draftTimer)
      this.persistDraft()
      const unsubscribe = (this as any).unsubscribeSession as (() => void) | undefined
      if (unsubscribe) unsubscribe()
      const unsubscribeRegistry = (this as any).unsubscribeRegistry as (() => void) | undefined
      if (unsubscribeRegistry) unsubscribeRegistry()
    },
  },

  pageLifetimes: {
    show() {
      ;(this as any).isPageVisible = true
      // tabBar 页不销毁：回到本页时若任务未到终态则恢复轮询
      if ((this as any).pollingTimer) return
      const status = this.data.job ? this.data.job.status : ''
      if (this.data.currentJobId && status !== 'succeeded' && status !== 'failed') {
        this.startPolling(this.data.currentJobId)
      }
    },
    hide() {
      ;(this as any).isPageVisible = false
      this.stopPolling()
    },
  },

  methods: {
    restoreDraft() {
      try {
        const draft = wx.getStorageSync(DRAFT_STORAGE_KEY) as Record<string, unknown>
        if (!draft || typeof draft !== 'object') return
        const categoryIndex = Number(draft.categoryIndex)
        const category = INFOGRAPHIC_CATEGORIES[Number.isInteger(categoryIndex) ? categoryIndex : 0] || INFOGRAPHIC_CATEGORIES[0]
        this.setData({
          categoryIndex: INFOGRAPHIC_CATEGORIES.indexOf(category), categoryLabel: category.label, categoryDescription: category.description,
          isPlotCategory: category.id === PLOT_CATEGORY_ID, libraryTaskName: category.id === PLOT_CATEGORY_ID ? 'plot' : 'diagram',
          methodContent: typeof draft.methodContent === 'string' ? draft.methodContent.slice(0, 12000) : this.data.methodContent,
          caption: typeof draft.caption === 'string' ? draft.caption.slice(0, 1000) : this.data.caption,
          negativePrompt: typeof draft.negativePrompt === 'string' ? draft.negativePrompt.slice(0, 1000) : '',
          inputDirty: draft.inputDirty === true,
        })
      } catch { /* 损坏草稿忽略 */ }
    },
    schedulePersistDraft() {
      const previous = (this as any).draftTimer as number | undefined
      if (previous) clearTimeout(previous)
      ;(this as any).draftTimer = setTimeout(() => this.persistDraft(), 300)
    },
    persistDraft() {
      wx.setStorageSync(DRAFT_STORAGE_KEY, { categoryIndex: this.data.categoryIndex, methodContent: this.data.methodContent, caption: this.data.caption, negativePrompt: this.data.negativePrompt, inputDirty: this.data.inputDirty })
    },
    applyRegistryState(state: ModelRegistryState) {
      if (!state.registry) {
        this.setData({ registry: {}, registryReady: false, registryVersion: '目录不可用', registryError: state.error })
        this.refreshCanSubmit()
        return
      }
      const current = this.data.settings as GenerationSettings
      const settings = current.modelRoutes ? current : defaultGenerationSettings(state.registry)
      this.setData({
        registry: state.registry,
        registryReady: true,
        registryVersion: state.registry.registryVersion,
        registryError: '',
        settings,
        settingsSummary: formatSettingsSummary(settings),
        settingsSummaryDetails: formatSettingsSummaryDetails(settings),
      })
      this.syncLegacySettings(settings)
      this.refreshCanSubmit()
      this.schedulePersistDraft()
    },

    async retryRegistry() { await loadModelRegistry(true) },

    async loadFeaturedTemplates() {
      this.setData({ featuredTemplatesLoading: true })
      try {
        const response = await requestJson<{ references?: unknown[] }>({ action: 'referenceLibrary', ...featuredTemplateRequest() }, { auth: false })
        this.setData({ featuredTemplates: attachFeaturedTemplateImages(response.references || []), featuredTemplatesLoading: false })
      } catch {
        this.setData({ featuredTemplates: attachFeaturedTemplateImages([]), featuredTemplatesLoading: false })
      }
    },

    openGenerationSettings() {
      if (!this.data.registryReady) {
        wx.showToast({ title: '模型目录不可用', icon: 'none' })
        return
      }
      const settings = this.data.settings as GenerationSettings
      this.setData({ showGenerationSettings: true, apiKeysForSheet: getApiKeys(), settingsExecutionRoles: this.createExecutionRoles(settings) })
    },

    closeGenerationSettings() { this.setData({ showGenerationSettings: false }) },

    saveGenerationSettings(event: WechatMiniprogram.CustomEvent<{ settings: GenerationSettings; apiKeys: Record<string, string>; manualReferenceIds: string[] }>) {
      const settings = event.detail.settings
      replaceApiKeys(event.detail.apiKeys)
      const manualReferenceIds = settings.retrievalSetting === 'manual' ? event.detail.manualReferenceIds || [] : []
      if (this.data.referenceImages.length && settings.retrievalSetting !== 'none') settings.retrievalSetting = 'none'
      this.setData({
        settings,
        settingsSummary: formatSettingsSummary(settings),
        settingsSummaryDetails: formatSettingsSummaryDetails(settings),
        manualReferenceIds: settings.retrievalSetting === 'manual' ? manualReferenceIds : [],
        showGenerationSettings: false,
        apiKeysForSheet: getApiKeys(),
      })
      this.syncLegacySettings(settings)
      this.refreshCanSubmit()
    },

    syncLegacySettings(settings: GenerationSettings) {
      const main = settings.modelRoutes.main
      const image = settings.modelRoutes.image
      const vision = settings.modelRoutes.vision
      this.setData({
        configurationMode: settings.configurationMode,
        isAdvancedMode: settings.configurationMode === 'advanced',
        mainModelName: main.modelId,
        imageModelName: image.modelId,
        referenceVisionModelName: vision.modelId,
        outputFormat: settings.outputFormat,
        imageSize: settings.imageSize as ImageSize,
        retrievalSetting: settings.retrievalSetting as RetrievalSetting,
        showReferenceLibrary: settings.retrievalSetting === 'manual' && this.data.referenceImages.length === 0,
      })
      this.refreshReferenceModeState()
    },

    createExecutionRoles(settings: GenerationSettings) {
      const category = INFOGRAPHIC_CATEGORIES[this.data.categoryIndex] || INFOGRAPHIC_CATEGORIES[0]
      return requiredCreateRouteRoles({ outputFormat: settings.outputFormat, taskName: category.id === PLOT_CATEGORY_ID ? 'plot' : 'diagram', pipelineMode: settings.pipelineMode, retrievalSetting: settings.retrievalSetting, imageSize: settings.imageSize, referenceImages: this.data.referenceImages, referenceImageMode: this.data.referenceImageMode }, settings.maxCriticRounds)
    },

    onFeaturedTemplateApply(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
      const template = FEATURED_TEMPLATES.find((item) => item.id === event.detail.id)
      if (!template) return
      if (!this.data.inputDirty) {
        this.applyFeaturedTemplate(template)
        return
      }
      wx.showModal({
        title: '替换当前内容？',
        content: '你已经修改了类别、方法、图注或负向提示词。套用模板会替换这些内容。',
        confirmText: '继续套用',
        success: (result) => { if (result.confirm) this.applyFeaturedTemplate(template) },
      })
    },

    applyFeaturedTemplate(template: FeaturedTemplate) {
      const categoryIndex = Math.max(0, INFOGRAPHIC_CATEGORIES.findIndex((item) => item.id === template.category))
      const category = INFOGRAPHIC_CATEGORIES[categoryIndex]
      this.setData({
        categoryIndex, categoryLabel: category.label, categoryDescription: category.description,
        isPlotCategory: category.id === PLOT_CATEGORY_ID, libraryTaskName: category.id === PLOT_CATEGORY_ID ? 'plot' : 'diagram',
        methodContent: template.methodContent, caption: template.caption, negativePrompt: template.negativePrompt,
        inputDirty: false, manualReferenceIds: [],
      })
      this.refreshCanSubmit()
      this.persistDraft()
      wx.showToast({ title: '模板已套用', icon: 'success' })
    },
    onProviderChange(event: WechatMiniprogram.PickerChange) {
      const providerIndex = readPickerIndex(event.detail.value, PROVIDERS.length)
      const provider = PROVIDERS[providerIndex] || PROVIDERS[0]
      this.setData({
        providerIndex,
        providerLabel: provider.label,
        providerMainModel: provider.mainModel,
        providerImageModel: provider.imageModel,
        providerGuideSteps: provider.guideSteps,
        mainModelOptions: provider.mainModels,
        mainModelIndex: getModelIndex(provider.mainModels, provider.mainModel),
        mainModelLabel: getModelLabel(provider.mainModels, provider.mainModel),
        imageModelOptions: provider.imageModels,
        imageModelIndex: getModelIndex(provider.imageModels, provider.imageModel),
        imageModelLabel: getModelLabel(provider.imageModels, provider.imageModel),
        referenceVisionModelOptions: provider.visionModels,
        referenceVisionModelIndex: getModelIndex(provider.visionModels, provider.visionModel),
        referenceVisionModelLabel: getModelLabel(provider.visionModels, provider.visionModel),
        mainModelName: provider.mainModel,
        imageModelName: provider.imageModel,
        referenceVisionModelName: provider.visionModel,
        referenceImageMode: defaultReferenceImageMode(mainModelCanReadImages(provider.id, provider.mainModel)),
        apiKeyPlaceholder: provider.keyPlaceholder,
      })
      this.refreshResolutionOptions()
      this.refreshReferenceModeState()
      this.refreshCanSubmit()
    },

    switchConfigurationMode(event: WechatMiniprogram.TouchEvent) {
      const requestedMode = String(event.currentTarget.dataset.mode || 'simple')
      const configurationMode: ConfigurationMode = requestedMode === 'advanced' ? 'advanced' : 'simple'
      const isAdvancedMode = configurationMode === 'advanced'
      this.setData({
        configurationMode,
        isAdvancedMode,
      })
      this.refreshResolutionOptions()
      this.refreshReferenceModeState()
      this.refreshRetrievalState()
      this.refreshCanSubmit()
    },

    onPipelineChange(event: WechatMiniprogram.PickerChange) {
      const pipelineIndex = readPickerIndex(event.detail.value, PIPELINE_OPTIONS.length)
      const option = PIPELINE_OPTIONS[pipelineIndex]
      this.setData({
        pipelineIndex,
        pipelineLabel: option.label,
      })
    },

    onAspectRatioChange(event: WechatMiniprogram.PickerChange) {
      const aspectRatioIndex = readPickerIndex(event.detail.value, ASPECT_RATIO_OPTIONS.length)
      const option = ASPECT_RATIO_OPTIONS[aspectRatioIndex]
      this.setData({
        aspectRatioIndex,
        aspectRatioLabel: option.label,
      })
    },

    onCandidateChange(event: WechatMiniprogram.PickerChange) {
      const candidateIndex = readPickerIndex(event.detail.value, CANDIDATE_OPTIONS.length)
      const option = CANDIDATE_OPTIONS[candidateIndex]
      this.setData({
        candidateIndex,
        candidateLabel: option.label,
      })
    },

    onCriticRoundChange(event: WechatMiniprogram.PickerChange) {
      const criticRoundIndex = readPickerIndex(event.detail.value, CRITIC_ROUND_OPTIONS.length)
      const option = CRITIC_ROUND_OPTIONS[criticRoundIndex]
      this.setData({
        criticRoundIndex,
        criticRoundLabel: option.label,
      })
    },

    onOutputFormatChange(event: WechatMiniprogram.PickerChange) {
      const outputFormatIndex = readPickerIndex(event.detail.value, OUTPUT_FORMATS.length)
      const option = OUTPUT_FORMATS[outputFormatIndex] || OUTPUT_FORMATS[0]
      this.setData({
        outputFormatIndex,
        outputFormat: option.value,
        outputFormatLabel: option.label,
      })
    },

    onResolutionChange(event: WechatMiniprogram.PickerChange) {
      const options = this.data.resolutionOptions
      const resolutionIndex = readPickerIndex(event.detail.value, options.length)
      const option = options[resolutionIndex] || options[0]
      this.setData({
        resolutionIndex,
        imageSize: option.value,
        imageSizeLabel: option.label,
      })
    },

    // provider / 图像生成模型 / 模式切换时重算清晰度可选项；当前档位不被支持时收敛到第一档
    refreshResolutionOptions() {
      const provider = PROVIDERS[this.data.providerIndex] || PROVIDERS[0]
      const activeImageModel = this.data.isAdvancedMode
        ? this.data.imageModelName.trim() || provider.imageModel
        : provider.imageModel
      const supported = supportedResolutions(provider.id, activeImageModel)
      const resolutionOptions = RESOLUTION_OPTIONS.filter((option) => supported.indexOf(option.value) >= 0)
      let imageSize = this.data.imageSize
      if (supported.indexOf(imageSize) < 0) {
        imageSize = supported[0]
      }
      const resolutionIndex = Math.max(0, resolutionOptions.findIndex((option) => option.value === imageSize))
      const option = resolutionOptions[resolutionIndex] || resolutionOptions[0]
      this.setData({
        resolutionOptions,
        resolutionIndex,
        imageSize: option.value,
        imageSizeLabel: option.label,
      })
    },

    onRetrievalChange(event: WechatMiniprogram.PickerChange) {
      if (this.data.referenceImageCount > 0) return
      const retrievalIndex = readPickerIndex(event.detail.value, RETRIEVAL_OPTIONS.length)
      const option = RETRIEVAL_OPTIONS[retrievalIndex] || RETRIEVAL_OPTIONS[0]
      this.setData({
        retrievalIndex,
        retrievalSetting: option.value,
        retrievalLabel: option.label,
      })
      this.refreshRetrievalState()
      this.refreshCanSubmit()
    },

    refreshRetrievalState() {
      this.setData({
        showReferenceLibrary:
          this.data.isAdvancedMode &&
          this.data.retrievalSetting === 'manual' &&
          this.data.referenceImages.length === 0,
      })
    },

    onManualReferenceToggle(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
      const id = String(event.detail.id || '')
      if (!id) return
      const current = this.data.manualReferenceIds
      let next: string[]
      if (current.indexOf(id) >= 0) {
        next = current.filter((item) => item !== id)
      } else if (current.length >= MANUAL_REFERENCE_LIMIT) {
        wx.showToast({ title: `最多选择 ${MANUAL_REFERENCE_LIMIT} 个案例`, icon: 'none' })
        return
      } else {
        next = [...current, id]
      }
      this.setData({ manualReferenceIds: next })
      this.refreshCanSubmit()
    },

    onMainModelChange(event: WechatMiniprogram.PickerChange) {
      const provider = PROVIDERS[this.data.providerIndex] || PROVIDERS[0]
      const mainModelIndex = readPickerIndex(event.detail.value, provider.mainModels.length)
      const option = provider.mainModels[mainModelIndex] || provider.mainModels[0]
      this.setData({
        mainModelIndex,
        mainModelLabel: option.label,
        mainModelName: option.value,
        // 参考图模式按固定能力重新派生（与 web 行为一致），之后仍可手动切换
        referenceImageMode: defaultReferenceImageMode(mainModelCanReadImages(provider.id, option.value)),
      })
      this.refreshReferenceModeState()
      this.refreshCanSubmit()
    },

    onImageModelChange(event: WechatMiniprogram.PickerChange) {
      const provider = PROVIDERS[this.data.providerIndex] || PROVIDERS[0]
      const imageModelIndex = readPickerIndex(event.detail.value, provider.imageModels.length)
      const option = provider.imageModels[imageModelIndex] || provider.imageModels[0]
      this.setData({
        imageModelIndex,
        imageModelLabel: option.label,
        imageModelName: option.value,
      })
      this.refreshResolutionOptions()
      this.refreshCanSubmit()
    },

    onReferenceVisionModelChange(event: WechatMiniprogram.PickerChange) {
      const provider = PROVIDERS[this.data.providerIndex] || PROVIDERS[0]
      const referenceVisionModelIndex = readPickerIndex(event.detail.value, provider.visionModels.length)
      const option = provider.visionModels[referenceVisionModelIndex] || provider.visionModels[0]
      this.setData({
        referenceVisionModelIndex,
        referenceVisionModelLabel: option.label,
        referenceVisionModelName: option.value,
      })
      this.refreshCanSubmit()
      this.schedulePersistDraft()
    },

    onApiKeyInput(event: WechatMiniprogram.Input) {
      this.setData({ apiKey: event.detail.value })
      this.refreshCanSubmit()
    },

    onCategoryChange(event: WechatMiniprogram.PickerChange) {
      const categoryIndex = Number(event.detail.value || 0)
      const category = INFOGRAPHIC_CATEGORIES[categoryIndex] || INFOGRAPHIC_CATEGORIES[0]
      const isPlotCategory = category.id === PLOT_CATEGORY_ID
      const libraryTaskName = isPlotCategory ? 'plot' : 'diagram'
      this.setData({
        categoryIndex,
        categoryLabel: category.label,
        categoryDescription: category.description,
        isPlotCategory,
        libraryTaskName,
        // diagram/plot 是两个不同参考库，类别切换后清空已选，避免把错库的 id 发给后端
        manualReferenceIds: libraryTaskName === this.data.libraryTaskName ? this.data.manualReferenceIds : [],
        inputDirty: true,
      })
      this.refreshCanSubmit()
      this.schedulePersistDraft()
    },

    onMethodInput(event: WechatMiniprogram.TextareaInput) {
      this.setData({ methodContent: event.detail.value, inputDirty: true })
      this.refreshCanSubmit()
      this.schedulePersistDraft()
    },

    onCaptionInput(event: WechatMiniprogram.Input) {
      this.setData({ caption: event.detail.value, inputDirty: true })
      this.refreshCanSubmit()
      this.schedulePersistDraft()
    },

    onNegativePromptInput(event: WechatMiniprogram.TextareaInput) {
      this.setData({ negativePrompt: event.detail.value, inputDirty: true })
      this.refreshCanSubmit()
      this.schedulePersistDraft()
    },

    applyExample(event: WechatMiniprogram.TouchEvent) {
      const exampleId = String(event.currentTarget.dataset.id || '')
      const example = QUICK_START_EXAMPLES.find((item) => item.id === exampleId)
      if (!example) return

      const categoryIndex = INFOGRAPHIC_CATEGORIES.findIndex((item) => item.id === example.category)
      const normalizedCategoryIndex = categoryIndex >= 0 ? categoryIndex : 0
      const category = INFOGRAPHIC_CATEGORIES[normalizedCategoryIndex]
      const isPlotCategory = category.id === PLOT_CATEGORY_ID
      const libraryTaskName = isPlotCategory ? 'plot' : 'diagram'
      this.setData({
        categoryIndex: normalizedCategoryIndex,
        categoryLabel: category.label,
        categoryDescription: category.description,
        isPlotCategory,
        libraryTaskName,
        manualReferenceIds: libraryTaskName === this.data.libraryTaskName ? this.data.manualReferenceIds : [],
        methodContent: example.methodContent,
        caption: example.caption,
      })
      this.refreshCanSubmit()
      this.persistDraft()
      wx.showToast({ title: '已填入案例', icon: 'success' })
    },

    chooseReferenceFile() {
      if (!this.data.referenceCanAddImage || this.data.isSubmitting || this.data.isUploadingReferences) return
      wx.showActionSheet({
        itemList: ['图片 / 相册 / 拍照', 'SVG 文件'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.chooseReferenceImages()
            return
          }
          if (res.tapIndex === 1) {
            this.chooseReferenceSvgFile()
          }
        },
      })
    },

    chooseReferenceImages() {
      const remaining = REFERENCE_IMAGE_LIMITS.maxCount - this.data.referenceImages.length
      if (remaining <= 0) {
        this.setData({ referenceUploadError: `最多只能上传 ${REFERENCE_IMAGE_LIMITS.maxCount} 张参考图。` })
        return
      }

      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: (res) => {
          const accepted: ReferenceImage[] = []
          let error = ''
          res.tempFiles.forEach((file, index) => {
            const path = file.tempFilePath
            const size = Number(file.size || 0)
            const mimeType = mimeTypeFromPath(path)
            if (REFERENCE_IMAGE_LIMITS.mimeTypes.indexOf(mimeType) < 0) {
              error = '参考图仅支持 PNG、JPG、WebP 或 SVG。'
              return
            }
            if (!size || size > REFERENCE_IMAGE_LIMITS.maxBytes) {
              error = '单张参考图不能超过 5MB。'
              return
            }
            accepted.push(buildReferenceImage({
              id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
              path,
              filename: filenameFromPath(path, accepted.length + this.data.referenceImages.length + 1, mimeType),
              mimeType,
              size,
            }))
          })

          this.appendReferenceImages(accepted, error)
        },
      })
    },

    chooseReferenceSvgFile() {
      const remaining = REFERENCE_IMAGE_LIMITS.maxCount - this.data.referenceImages.length
      if (remaining <= 0) {
        this.setData({ referenceUploadError: `最多只能上传 ${REFERENCE_IMAGE_LIMITS.maxCount} 张参考图。` })
        return
      }

      wx.chooseMessageFile({
        count: remaining,
        type: 'file',
        extension: ['svg'],
        success: (res) => {
          const accepted: ReferenceImage[] = []
          let error = ''
          res.tempFiles.forEach((file, index) => {
            const path = String(file.path || '')
            const size = Number(file.size || 0)
            const filename = sanitizeLocalFilename(String(file.name || ''), path, accepted.length + this.data.referenceImages.length + 1, 'image/svg+xml')
            const mimeType = normalizeReferenceFileMimeType('image/svg+xml', filename)
            if (!path || mimeType !== 'image/svg+xml') {
              error = '请选择 .svg 文件。'
              return
            }
            if (!size || size > REFERENCE_IMAGE_LIMITS.maxBytes) {
              error = '单张参考图不能超过 5MB。'
              return
            }
            accepted.push(buildReferenceImage({
              id: `${Date.now()}-svg-${index}-${Math.random().toString(36).slice(2, 8)}`,
              path,
              filename,
              mimeType,
              size,
            }))
          })

          this.appendReferenceImages(accepted, error)
        },
      })
    },

    appendReferenceImages(accepted: ReferenceImage[], error: string) {
      if (accepted.length) {
        const referenceImages = [...this.data.referenceImages, ...accepted].slice(0, REFERENCE_IMAGE_LIMITS.maxCount)
        this.setData({
          referenceImages,
          referenceImageCount: referenceImages.length,
          referenceCanAddImage: referenceImages.length < REFERENCE_IMAGE_LIMITS.maxCount,
          referenceUploadError: error,
        })
        this.refreshReferenceModeState()
        this.refreshRetrievalState()
        this.refreshCanSubmit()
      } else if (error) {
        this.setData({ referenceUploadError: error })
      }
    },

    removeReferenceImage(event: WechatMiniprogram.TouchEvent) {
      const id = String(event.currentTarget.dataset.id || '')
      const referenceImages = this.data.referenceImages.filter((image) => image.id !== id)
      this.setData({
        referenceImages,
        referenceImageCount: referenceImages.length,
        referenceCanAddImage: referenceImages.length < REFERENCE_IMAGE_LIMITS.maxCount,
        referenceUploadError: '',
      })
      this.refreshReferenceModeState()
      this.refreshRetrievalState()
      this.refreshCanSubmit()
    },

    previewReferenceImage(event: WechatMiniprogram.TouchEvent) {
      const path = String(event.currentTarget.dataset.path || '')
      if (!path) return
      const current = this.data.referenceImages.find((image) => image.path === path)
      if (!current || !current.canPreview) {
        wx.showToast({ title: 'SVG 参考图会在服务端解析', icon: 'none' })
        return
      }
      const urls = this.data.referenceImages.filter((image) => image.canPreview).map((image) => image.path)
      wx.previewImage({ current: path, urls: urls.length ? urls : [path] })
    },

    onReferenceModeTap(event: WechatMiniprogram.TouchEvent) {
      const mode = normalizeReferenceImageMode(String(event.currentTarget.dataset.mode || ''), this.data.referenceImageMode)
      if (mode === 'main_model' && !this.data.canSelectMainModelDirect) {
        wx.showToast({ title: '当前主模型不支持直读', icon: 'none' })
        return
      }
      this.setData({ referenceImageMode: mode })
      this.refreshReferenceModeState()
      this.refreshCanSubmit()
    },

    refreshReferenceModeState() {
      const settings = this.data.settings as GenerationSettings
      const mainRoute = settings.modelRoutes?.main
      const mainEntry = mainRoute && this.data.registryReady
        ? findRegistryModel(this.data.registry as ModelRegistry, mainRoute.accessProvider, mainRoute.modelId)
        : null
      const mainCanRead = Boolean(mainEntry && (mainEntry.inputModalities.includes('image') || mainEntry.capabilities.referenceImages === true))
      const modeState = buildReferenceModeState({
        hasReferenceImages: this.data.referenceImages.length > 0,
        isAdvancedMode: this.data.isAdvancedMode,
        requestedMode: this.data.referenceImageMode,
        mainModelCanRead: mainCanRead,
      })
      this.setData({
        referenceModeCanSubmit: modeState.referenceModeCanSubmit,
        referenceModeNote: this.data.referenceImages.length ? modeState.referenceModeNote : '',
        shouldShowReferenceModeSelector: this.data.referenceImages.length > 0 && modeState.shouldShowReferenceModeSelector,
        canSelectMainModelDirect: modeState.canSelectMainModelDirect,
        referenceNeedsVisionModel: this.data.referenceImages.length > 0 && modeState.needsVisionModel,
      })
    },

    async uploadReferencesForJob(): Promise<UploadedReferenceImage[]> {
      if (!this.data.referenceImages.length) return []

      this.setData({
        isUploadingReferences: true,
        referenceUploadError: '',
      })
      this.refreshCanSubmit()

      let preparedUploads: ReferenceUpload[] = []
      try {
        const files = this.data.referenceImages.map((image) => ({
          clientId: `${image.id}:original`,
          role: 'original',
          filename: image.filename,
          mimeType: image.mimeType,
          size: image.size,
        }))
        const prepared = await requestJson<{ uploads?: ReferenceUpload[] }>({
          action: 'prepareReferenceUpload',
          files,
        })
        preparedUploads = prepared.uploads || []
        const uploadMap = new Map(preparedUploads.map((upload) => [upload.clientId, upload]))

        for (const image of this.data.referenceImages) {
          const upload = uploadMap.get(`${image.id}:original`)
          if (!upload || !upload.uploadUrl) throw new Error('参考图上传地址创建失败。')
          await uploadReferenceFile(image.path, upload.uploadUrl, image.mimeType)
        }

        const uploaded = this.data.referenceImages.map((image) => {
          const upload = uploadMap.get(`${image.id}:original`)
          if (!upload) throw new Error('参考图上传结果缺少原图记录。')
          return {
            filename: image.filename,
            mimeType: image.mimeType,
            size: image.size,
            objectKey: upload.objectKey,
            uploadToken: upload.uploadToken,
          }
        })
        await requestJson({ action: 'finalizeReferenceUpload', uploads: uploaded })
        return uploaded
      } catch (error) {
        if (preparedUploads.length) {
          await requestJson({ action: 'abortReferenceUpload', uploads: preparedUploads }).catch(() => undefined)
        }
        const message = formatError(error)
        this.setData({ referenceUploadError: message })
        throw new Error(message)
      } finally {
        this.setData({ isUploadingReferences: false })
        this.refreshCanSubmit()
      }
    },

    async checkHealth() {
      try {
        // 公开只读探测不带登录 Cookie；仅连接被关闭时内部再探测一次。
        const data = await requestHealth<{ code?: number; ok?: boolean; runtime?: string; laf?: { ok?: boolean } }>()
        const laf = data.laf || {}
        const ok = Boolean(data.ok || laf.ok || data.code === 0)
        this.setData({
          healthOk: ok,
          healthChecked: true,
          healthText: ok ? '后端可用' : '后端异常，生成功能可能暂不可用',
        })
      } catch (error) {
        this.setData({
          healthOk: false,
          healthChecked: true,
          healthText: `后端异常：${formatError(error)}`,
        })
      }
    },

    async submitJob() {
      if (!this.data.canSubmit || this.data.isSubmitting) return

      // 生产目录是每次付费任务的唯一真相。提交前强制重新读取，失败时在任何上传或任务写入前停止。
      this.setData({ isSubmitting: true, error: '' })
      const registryState = await loadModelRegistry(true)
      const registry = registryState.registry
      if (!registry) {
        this.setData({ isSubmitting: false, error: '模型目录不可用，已禁止新建任务。' })
        this.refreshCanSubmit()
        return
      }

      // 先停掉上一个任务的轮询，避免旧任务在途响应污染"提交中"状态（见 loadJob 的 jobId 校验）
      this.stopPolling()

      const settings = this.data.settings as GenerationSettings
      if (!settings.modelRoutes) {
        this.setData({ isSubmitting: false, error: '模型设置不完整，请重新打开设置。' })
        this.refreshCanSubmit()
        return
      }
      const category = INFOGRAPHIC_CATEGORIES[this.data.categoryIndex] || INFOGRAPHIC_CATEGORIES[0]
      const mainRoute = settings.modelRoutes.main
      const mainEntry = findRegistryModel(registry, mainRoute.accessProvider, mainRoute.modelId)
      const mainCanRead = Boolean(mainEntry && (mainEntry.inputModalities.includes('image') || mainEntry.capabilities.referenceImages === true))
      const activeReferenceImageMode: ReferenceImageMode = settings.configurationMode === 'advanced'
        ? this.data.referenceImageMode
        : defaultReferenceImageMode(mainCanRead)
      this.setData({
        isSubmitting: true,
        error: '',
        job: null,
        resultImages: [],
        statusLabel: '',
      })

      wx.showLoading({ title: '提交中' })
      try {
        const uploadedReferenceImages = await this.uploadReferencesForJob()
        const payload = buildCreateJobPayload({
          configurationMode: settings.configurationMode,
          provider: mainRoute.accessProvider as ProviderId,
          registry,
          modelRoutes: settings.modelRoutes,
          apiKeys: getApiKeys(),
          categoryId: category.id,
          categoryLabel: category.label,
          methodContent: this.data.methodContent,
          caption: this.data.caption,
          negativePrompt: this.data.negativePrompt,
          outputFormat: settings.outputFormat,
          imageSize: settings.imageSize as ImageSize,
          referenceImageMode: activeReferenceImageMode,
          uploadedReferenceImages,
          pipelineMode: settings.pipelineMode,
          retrievalSetting: settings.retrievalSetting as RetrievalSetting,
          manualReferenceIds: this.data.manualReferenceIds,
          aspectRatio: settings.aspectRatio,
          numCandidates: settings.numCandidates,
          maxCriticRounds: settings.maxCriticRounds,
        })

        const data = await requestJson<{ jobId?: string; id?: string; status?: string }>(payload)

        const jobId = data.jobId || data.id || ''
        if (!jobId) throw new Error('后端没有返回任务 ID')

        this.setData({
          currentJobId: jobId,
          statusLabel: STATUS_LABELS[data.status || 'queued'] || String(data.status || '排队中'),
        })
        wx.hideLoading()
        wx.showToast({ title: '任务已提交', icon: 'success' })
        // 提交等待期间用户可能已切到别的 tab：隐藏时不起 timer，回到本页由 pageLifetimes.show 恢复
        if ((this as any).isPageVisible !== false) {
          this.startPolling(jobId)
        }
      } catch (error) {
        this.setData({ error: formatError(error) })
        wx.hideLoading()
        wx.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        this.setData({ isSubmitting: false })
        this.refreshCanSubmit()
      }
    },

    async refreshCurrentJob() {
      if (!this.data.currentJobId) return
      await this.loadJob(this.data.currentJobId)
    },

    async loadJob(jobId: string) {
      try {
        const data = await requestJson<{ job?: unknown }>({
          action: 'getJob',
          jobId,
        })
        // 在途响应可能晚于新任务提交落地：只接受当前任务的响应，避免旧任务覆盖状态/误停新轮询
        if (jobId !== this.data.currentJobId) return
        const job = normalizeJob(data.job)
        this.setData({
          job: toCurrentJobSummary(job),
          statusLabel: STATUS_LABELS[job.status] || job.status || '未知',
          resultImages: job.result_images,
          error: job.status === 'failed' ? formatError(job.error || job.logs_tail || '生成失败') : '',
        })
        appendLocalJob(job)

        if (job.status === 'succeeded' || job.status === 'failed') {
          this.stopPolling()
        }
      } catch (error) {
        if (jobId !== this.data.currentJobId) return
        this.setData({ error: formatError(error) })
      }
    },

    startPolling(jobId: string) {
      this.stopPolling()
      this.loadJob(jobId)
      const timer = setInterval(() => {
        this.loadJob(jobId)
      }, 3000)
      ;(this as any).pollingTimer = timer
    },

    stopPolling() {
      const timer = (this as any).pollingTimer as number | undefined
      if (timer) clearInterval(timer)
      ;(this as any).pollingTimer = undefined
    },

    previewImage(event: WechatMiniprogram.TouchEvent) {
      const url = String(event.currentTarget.dataset.url || '')
      const canPreview = readDatasetBoolean(event.currentTarget.dataset.canPreview, true)
      if (!url) return
      if (!canPreview) {
        downloadShareFile(url)
        return
      }
      const urls = this.data.resultImages.filter((image) => image.can_preview).map((image) => image.url).filter(Boolean)
      wx.previewImage({
        current: url,
        urls: urls.length ? urls : [url],
      })
    },

    handleImageAction(event: WechatMiniprogram.TouchEvent) {
      const url = String(event.currentTarget.dataset.url || '')
      const canPreview = readDatasetBoolean(event.currentTarget.dataset.canPreview, true)
      if (!url) return
      if (!canPreview) {
        downloadShareFile(url)
        return
      }
      saveImageToAlbum(url)
    },

    copyJobId() {
      if (!this.data.currentJobId) return
      wx.setClipboardData({ data: this.data.currentJobId })
    },

    openJobDetail() {
      if (!this.data.currentJobId) return
      wx.navigateTo({ url: `/pages/job-detail/job-detail?jobId=${this.data.currentJobId}` })
    },

    refreshCanSubmit() {
      const settings = this.data.settings as GenerationSettings
      if (!this.data.registryReady || !settings.modelRoutes) {
        this.setData({ canSubmit: false })
        return
      }
      const hasManualReferences =
        settings.configurationMode !== 'advanced' ||
        this.data.referenceImages.length > 0 ||
        settings.retrievalSetting !== 'manual' ||
        this.data.manualReferenceIds.length > 0
      const category = INFOGRAPHIC_CATEGORIES[this.data.categoryIndex] || INFOGRAPHIC_CATEGORIES[0]
      const roles = requiredCreateRouteRoles({
        outputFormat: settings.outputFormat,
        taskName: category.id === PLOT_CATEGORY_ID ? 'plot' : 'diagram',
        pipelineMode: settings.pipelineMode,
        retrievalSetting: settings.retrievalSetting,
        imageSize: settings.imageSize,
        referenceImages: this.data.referenceImages,
        referenceImageMode: this.data.referenceImageMode,
      }, settings.maxCriticRounds)
      const apiKeys = getApiKeys()
      const hasRequiredKeys = uniqueProvidersForRoles(settings.modelRoutes, roles).every((provider) => Boolean(apiKeys[provider]?.trim()))
      const canSubmit = Boolean(
        hasRequiredKeys &&
          this.data.methodContent.trim().length >= 20 &&
          this.data.caption.trim().length >= 3 &&
          this.data.negativePrompt.length <= 1000 &&
          (settings.outputFormat === 'svg' || Boolean(settings.imageSize)) &&
          hasManualReferences &&
          this.data.referenceModeCanSubmit &&
          !this.data.isUploadingReferences &&
          !this.data.isSubmitting,
      )
      this.setData({ canSubmit })
    },

    openAuthPanel() {
      this.setData({ showAuthPanel: true })
    },

    closeAuthPanel() {
      this.setData({ showAuthPanel: false })
    },

    onAuthed() {
      this.setData({ showAuthPanel: false })
    },

    async signOut() {
      await sessionSignOut()
      wx.showToast({ title: '已退出', icon: 'success' })
    },

    openFeedbackPanel() {
      this.setData({ showFeedbackPanel: true })
    },

    closeFeedbackPanel() {
      this.setData({ showFeedbackPanel: false })
    },

    onShareAppMessage() {
      return { title: '图研Tuyan · 开源学术图示工作台', path: '/pages/index/index' }
    },
  },
})

function defaultGenerationSettings(registry: ModelRegistry): GenerationSettings {
  const simpleProvider: ModelProviderId = 'bailian'
  return {
    configurationMode: 'simple',
    simpleProvider,
    modelRoutes: providerDefaultRoutes(simpleProvider, registry),
    outputFormat: 'png',
    imageSize: '1K',
    aspectRatio: 'auto',
    pipelineMode: 'planner_critic',
    retrievalSetting: 'none',
    numCandidates: 1,
    maxCriticRounds: 1,
  }
}

function formatSettingsSummary(settings: GenerationSettings): string {
  const routes = settings.modelRoutes
  return `主 ${routes.main.modelId} · 图 ${routes.image.modelId} · 识 ${routes.vision.modelId}`
}

function formatSettingsSummaryDetails(settings: GenerationSettings): string[] {
  const pipelineLabels: Record<string, string> = { planner_critic: '规划器 + 评审器', full: '完整流程', vanilla: '基础生成' }
  const retrievalLabels: Record<string, string> = { none: '不检索', auto: '自动检索', random: '随机参考', manual: '手动参考' }
  return [
    `${settings.aspectRatio === 'auto' ? '自动比例' : settings.aspectRatio} · ${settings.outputFormat.toUpperCase()}${settings.outputFormat === 'png' ? ` · ${settings.imageSize}` : ''}`,
    `${pipelineLabels[settings.pipelineMode] || settings.pipelineMode} · ${retrievalLabels[settings.retrievalSetting] || settings.retrievalSetting}`,
    `${settings.numCandidates} 张候选 · ${settings.maxCriticRounds} 轮评审`,
  ]
}
