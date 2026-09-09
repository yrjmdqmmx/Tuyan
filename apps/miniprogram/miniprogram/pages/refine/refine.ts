import { uploadRefineSource, validateRefineFile, type RefineFile } from '../../utils/refine-upload'
import { saveImageToAlbum, downloadShareFile } from '../../utils/media'
import { selectRegionApiKeys, type ProviderRegions } from '../../utils/provider-regions'
import { formatError, requestJson, uploadReferenceFile } from '../../utils/api'
import { getApiKeys, replaceApiKeys } from '../../utils/api-keys'
import { buildAspectRatioOptions, buildResolutionOptions } from '../../utils/aspect-ratios'
import { findRegistryModel, type ModelProviderId, type ModelRegistry } from '../../utils/model-registry'
import { getModelRegistryState, loadModelRegistry, subscribeModelRegistry, type ModelRegistryState } from '../../utils/model-registry-store'
import { providerDefaultRoutes, requiredRefineRouteRoles, uniqueProvidersForRoles, type ModelRoutes } from '../../utils/model-routing'
import type { ImageAsset } from '../../utils/job-assets'
import { appendLocalJob, normalizeJob, readLocalJobs, type Job } from '../../utils/jobs'
import { buildRefineJobPayload } from '../../utils/refine'
import { getCurrentUser, isSessionChecked, subscribeSession } from '../../utils/session'

interface RefineSettings {
  providerRegions?: ProviderRegions
  configurationMode: 'simple' | 'advanced'; simpleProvider: ModelProviderId; modelRoutes: ModelRoutes
  outputFormat: 'png' | 'svg'; imageSize: string; aspectRatio: string; pipelineMode: string
  retrievalSetting: string; numCandidates: number; maxCriticRounds: number
}
interface RefineSourceOption { label: string; jobId: string; url: string; objectKey: string; uploaded?: boolean; path?: string; filename?: string; size?: number; mimeType?: string; width?: number; height?: number }

Component({
  data: {
    emptyObject: {},
    settingsPurpose: 'refine',
    uploadEnabled: false, uploadBusy: false, uploadStage: '', uploadError: '', canRetryUpload: false,
    optimizationBusy: false, optimizationInputs: { editInstruction: '' },
    registryReady: false, registryVersion: '等待目录', registryError: '',
    settings: {} as RefineSettings | Record<string, never>, showSettings: false, apiKeysForSheet: {} as Record<string, string>,
    settingsExecutionRoles: [] as string[],
    sourceOptions: [] as RefineSourceOption[], sourceIndex: 0, source: null as RefineSourceOption | null,
    instruction: '', ratioOptions: [] as Array<{ value: string; label: string }>, ratioIndex: 0,
    resolutionOptions: [] as Array<{ value: string; label: string }>, resolutionIndex: 0, refineMode: 'none', refineModeLabel: '暂不可用',
    canSubmit: false, isSubmitting: false, error: '', currentJobId: '', job: null as Job | null,
    isLoggedIn: false, isAuthChecking: true, showAuthPanel: false,
  },
  lifetimes: {
    attached() {
      ;(this as any).ownerId = getCurrentUser()?.id || ''
      ;(this as any).ownerEpoch = 0
      ;(this as any).visible = true
      ;(this as any).unsubscribeRegistry = subscribeModelRegistry((state) => this.applyRegistryState(state))
      ;(this as any).unsubscribeSession = subscribeSession((user) => {
        if ((this as any).ownerId !== (user?.id || '')) {
          ;(this as any).ownerEpoch++
          ;(this as any).ownerId = user?.id || ''
          this.stopPolling(); this.resetUpload()
          this.setData({ sourceOptions: [], source: null, currentJobId: '', job: null, error: '', instruction: '', isSubmitting: false, apiKeysForSheet: {}, showSettings: false })
        }
        this.setData({ isLoggedIn: Boolean(user), isAuthChecking: false })
        this.loadSources()
      })
      this.setData({ isLoggedIn: Boolean(getCurrentUser()), isAuthChecking: !isSessionChecked() })
      void loadModelRegistry()
      this.loadSources()
    },
    detached() {
      const registry = (this as any).unsubscribeRegistry as (() => void) | undefined; if (registry) registry()
      const session = (this as any).unsubscribeSession as (() => void) | undefined; if (session) session()
      ;(this as any).detached = true
      this.stopPolling(); this.resetUpload()
    },
  },
  pageLifetimes: {
    show() { (this as any).visible = true; this.loadSources(); if (this.data.currentJobId && !['succeeded', 'failed'].includes(this.data.job?.status || '')) this.startPolling(this.data.currentJobId) },
    hide() { (this as any).visible = false; this.stopPolling() },
  },
  methods: {
    applyRegistryState(state: ModelRegistryState) {
      if (!state.registry) { this.setData({ registryReady: false, registryError: state.error, uploadEnabled: false }); this.refreshCanSubmit(); return }
      const current = this.data.settings as RefineSettings
      const settings = current.modelRoutes ? current : defaultSettings(state.registry)
      this.setData({ registryReady: true, registryVersion: state.registry.registryVersion, registryError: '', settings, uploadEnabled: state.registry.refineUpload?.version === 1 })
      this.refreshCapabilities(); this.refreshCanSubmit()
    },
    async retryRegistry() { await loadModelRegistry(true) },
    async loadSources() {
      const owner = getCurrentUser()?.id || ''
      const epoch = (this as any).ownerEpoch
      const sequence = (this as any).sourcesSequence = Number((this as any).sourcesSequence || 0) + 1
      let jobs = readLocalJobs()
      if (this.data.isLoggedIn) {
        try {
          const response = await requestJson<{ jobs?: unknown[] }>({ action: 'myJobs', limit: 50 })
          const accountJobs = (response.jobs || []).map(normalizeJob)
          const known = new Set(jobs.map((job) => job.id)); jobs = [...jobs, ...accountJobs.filter((job) => !known.has(job.id))]
        } catch { /* 本机来源仍可用 */ }
      }
      if (owner !== (getCurrentUser()?.id || '') || epoch !== (this as any).ownerEpoch || sequence !== (this as any).sourcesSequence || (this as any).detached) return
      const sourceOptions = jobs.flatMap((job) => job.result_images.filter(image => image.can_preview).map((image, index) => sourceOption(job, image, index))).filter((item) => Boolean(item.url || item.objectKey))
      const previous = this.data.source
      const sourceIndex = Math.max(0, sourceOptions.findIndex((item) => item.jobId === previous?.jobId && item.objectKey === previous?.objectKey))
      this.setData({ sourceOptions, sourceIndex, source: previous?.uploaded || this.data.uploadBusy ? previous : sourceOptions[sourceIndex] || null })
      this.refreshCanSubmit()
    },
    onSourceChange(event: WechatMiniprogram.PickerChange) { this.resetUpload(); const sourceIndex = Number(event.detail.value) || 0; this.setData({ sourceIndex, source: this.data.sourceOptions[sourceIndex] || null }); this.refreshCanSubmit() },
    onInstructionInput(event: WechatMiniprogram.TextareaInput) { this.setData({ instruction: event.detail.value, optimizationInputs: { editInstruction: event.detail.value } }); this.refreshCanSubmit() },
    onOptimizationBusy(event: WechatMiniprogram.CustomEvent<{ busy: boolean }>) { this.setData({ optimizationBusy: event.detail.busy }); this.refreshCanSubmit() },
    onOptimizationApply(event: WechatMiniprogram.CustomEvent<{ target: string; value: string }>) { if (event.detail.target === 'editInstruction') { this.setData({ instruction: event.detail.value, optimizationInputs: { editInstruction: event.detail.value } }); this.refreshCanSubmit() } },
    openOptimizationSettings() { this.setData({ settingsPurpose: 'optimize', showSettings: true, apiKeysForSheet: getApiKeys(), settingsExecutionRoles: ['main'] }) },
    resetUpload() {
      ;(this as any).uploadSequence = Number((this as any).uploadSequence || 0) + 1
      ;(this as any).uploadTask?.abort?.(); (this as any).uploadTask = undefined
      void (this as any).uploadCleanup?.(); (this as any).uploadCleanup = undefined; (this as any).uploadFile = undefined
      this.setData({ uploadBusy: false, uploadStage: '', uploadError: '', canRetryUpload: false })
    },
    removeSource() { this.resetUpload(); this.setData({ source: null }); this.refreshCanSubmit() },
    chooseSourceFile() {
      if (!this.data.isLoggedIn) { this.openAuthPanel(); return }
      if (!this.data.uploadEnabled || this.data.isSubmitting || this.data.optimizationBusy) return
      wx.showActionSheet({ itemList: ['从相册选择原图', '从聊天文件选择'], success: result => {
        if (result.tapIndex === 0) wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album'], sizeType: ['original'], success: result => {
          const file = result.tempFiles[0]; if (file) void this.inspectSourceFile(file.tempFilePath, file.size)
        } })
        else wx.chooseMessageFile({ count: 1, type: 'file', extension: ['png', 'jpg', 'jpeg', 'webp'], success: result => {
          const file = result.tempFiles[0]; if (file) void this.inspectSourceFile(file.path, file.size, file.name)
        } })
      } })
    },
    async inspectSourceFile(path: string, size: number, filename?: string) {
      const epoch = (this as any).ownerEpoch
      try {
        const info = await new Promise<WechatMiniprogram.GetImageInfoSuccessCallbackResult>((resolve, reject) => wx.getImageInfo({ src: path, success: resolve, fail: reject }))
        if (epoch !== (this as any).ownerEpoch || (this as any).detached) return
        const extension = String(info.type).toLowerCase().replace('jpeg', 'jpg')
        const mimeType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`
        const file = { path, size, filename: filename || `refine-source.${extension}`, mimeType, width: info.width, height: info.height }
        validateRefineFile(file, getModelRegistryState().registry?.refineUpload, (this.data.settings as RefineSettings).modelRoutes.image)
        await this.uploadSource(file)
      } catch (error) { if (epoch === (this as any).ownerEpoch) this.setData({ uploadError: formatError(error) }) }
    },
    async uploadSource(file: RefineFile) {
      this.resetUpload()
      const sequence = (this as any).uploadSequence
      const epoch = (this as any).ownerEpoch
      const owner = getCurrentUser()?.id || ''
      const sameOwner = () => Boolean(owner && owner === (getCurrentUser()?.id || '') && epoch === (this as any).ownerEpoch)
      const isCurrent = () => sameOwner() && sequence === (this as any).uploadSequence && !(this as any).detached
      ;(this as any).uploadFile = file
      this.setData({ source: null, uploadBusy: true, uploadError: '', canRetryUpload: false })
      this.refreshCanSubmit()
      try {
        const result = await uploadRefineSource(file, {
          limits: getModelRegistryState().registry?.refineUpload, route: (this.data.settings as RefineSettings).modelRoutes.image,
          isCurrent, canCleanup: sameOwner,
          onStage: stage => { if (isCurrent()) this.setData({ uploadStage: { preparing: '准备上传', uploading: '正在上传原图', checking: '校验图片', ready: '原图已就绪' }[stage] }) },
          put: (path, url, mime) => uploadReferenceFile(path, url, mime, task => { if (isCurrent()) (this as any).uploadTask = task; else task.abort?.() }),
        })
        if (!isCurrent()) { await result.cleanup(); return }
        ;(this as any).uploadCleanup = result.cleanup
        this.setData({ source: { ...result.source, jobId: '', label: result.source.filename } })
      } catch (error) { if (isCurrent()) this.setData({ uploadError: formatError(error), canRetryUpload: true, uploadStage: '上传未完成' }) }
      finally { if (isCurrent()) { (this as any).uploadTask = undefined; this.setData({ uploadBusy: false }); this.refreshCanSubmit() } }
    },
    retryUpload() { const file = (this as any).uploadFile as RefineFile | undefined; if (file && !this.data.uploadBusy) void this.uploadSource(file) },
    onRatioChange(event: WechatMiniprogram.PickerChange) { this.setData({ ratioIndex: Number(event.detail.value) || 0 }); this.refreshCanSubmit() },
    onResolutionChange(event: WechatMiniprogram.PickerChange) { this.setData({ resolutionIndex: Number(event.detail.value) || 0 }); this.refreshRatioOptions(); this.refreshCanSubmit() },
    refreshRatioOptions() {
      const registry = getModelRegistryState().registry
      const settings = this.data.settings as RefineSettings
      if (!registry || !settings.modelRoutes) return
      const route = settings.modelRoutes.image
      const entry = findRegistryModel(registry, route.accessProvider, route.modelId)
      const resolution = this.data.resolutionOptions[this.data.resolutionIndex]?.value
      const previous = this.data.ratioOptions[this.data.ratioIndex]?.value
      const ratioOptions = buildAspectRatioOptions({capabilities: entry?.capabilities || {}, capabilityField: 'refineAspectRatios', resolution}).filter(item => !item.disabled).map(item => ({value: item.value, label: item.label}))
      this.setData({ratioOptions, ratioIndex: Math.max(0, ratioOptions.findIndex(item => item.value === previous))})
    },
    openSettings() { if (this.data.registryReady && !this.data.isSubmitting && !this.data.uploadBusy) this.setData({ settingsPurpose: 'refine', showSettings: true, apiKeysForSheet: getApiKeys(), settingsExecutionRoles: requiredRefineRouteRoles({ refineMode: this.data.refineMode }) }) },
    closeSettings() { this.setData({ showSettings: false }) },
    saveSettings(event: WechatMiniprogram.CustomEvent<{ settings: RefineSettings; apiKeys: Record<string, string> }>) { replaceApiKeys(event.detail.apiKeys); this.setData({ settings: event.detail.settings, apiKeysForSheet: getApiKeys(), showSettings: false }); this.refreshCapabilities(); this.refreshCanSubmit() },
    refreshCapabilities() {
      const registry = this.data.registryReady ? getModelRegistryState().registry : null
      const settings = this.data.settings as RefineSettings
      if (!registry || !settings.modelRoutes) return
      const entry = findRegistryModel(registry, settings.modelRoutes.image.accessProvider, settings.modelRoutes.image.modelId)
      const capability = String(entry?.capabilities.imageEditMode || 'none')
      const refineMode = capability === 'direct-edit' || capability === 'analyze-redraw' ? capability : 'none'
      const ratioOptions = buildAspectRatioOptions({ capabilities: entry?.capabilities || {}, capabilityField: 'refineAspectRatios', modelLabel: entry?.label, resolution: settings.imageSize }).filter((item) => !item.disabled).map((item) => ({ value: item.value, label: item.label }))
      const resolutionOptions = buildResolutionOptions(entry?.capabilities || {}, 'refineResolutions')
      const resolutionIndex = Math.max(0, resolutionOptions.findIndex(item => item.value === settings.imageSize))
      this.setData({ refineMode, refineModeLabel: refineMode === 'direct-edit' ? '直接编辑' : refineMode === 'analyze-redraw' ? '分析后重绘' : '不支持精修', ratioOptions, resolutionOptions, ratioIndex: Math.max(0, ratioOptions.findIndex(item => item.value === settings.aspectRatio)), resolutionIndex })
      this.refreshRatioOptions()
    },
    refreshCanSubmit() {
      this.setData({ optimizationInputs: { editInstruction: this.data.instruction } })
      const settings = this.data.settings as RefineSettings
      if (!this.data.registryReady || !settings.modelRoutes) { this.setData({ canSubmit: false }); return }
      const roles = requiredRefineRouteRoles({ refineMode: this.data.refineMode })
      const keys = selectRegionApiKeys(getApiKeys(), settings.providerRegions)
      const hasKeys = uniqueProvidersForRoles(settings.modelRoutes, roles).every((provider) => Boolean(keys[provider]?.trim()))
      this.setData({ canSubmit: Boolean(this.data.source && this.data.instruction.trim().length >= 3 && this.data.refineMode !== 'none' && this.data.ratioOptions.length && this.data.resolutionOptions.length && hasKeys && this.data.isLoggedIn && !this.data.uploadBusy && !this.data.optimizationBusy && !this.data.isSubmitting) })
    },
    async submitRefine() {
      if (!this.data.canSubmit || this.data.isSubmitting || !this.data.source) return
      const epoch = (this as any).ownerEpoch
      const source = this.data.source
      this.setData({ isSubmitting: true, error: '', job: null })
      this.stopPolling()
      const registryState = await loadModelRegistry(true)
      const registry = registryState.registry
      if (epoch !== (this as any).ownerEpoch || (this as any).detached) return
      if (!registry) {
        this.setData({ isSubmitting: false, error: '模型目录不可用，已禁止精修任务。' })
        this.refreshCanSubmit()
        return
      }
      const settings = this.data.settings as RefineSettings
      try {
        if (source.uploaded) validateRefineFile(source as RefineFile, registry.refineUpload, settings.modelRoutes.image)
        const payload = buildRefineJobPayload({ providerRegions: settings.providerRegions, configurationMode: settings.configurationMode, modelRoutes: settings.modelRoutes, registry, apiKeys: getApiKeys(), source, editInstruction: this.data.instruction, aspectRatio: this.data.ratioOptions[this.data.ratioIndex]?.value || 'auto', imageSize: this.data.resolutionOptions[this.data.resolutionIndex]?.value || '', refineMode: this.data.refineMode === 'direct-edit' ? 'direct-edit' : 'analyze-redraw' })
        const response = await requestJson<{ jobId?: string; id?: string }>(payload)
        if (epoch !== (this as any).ownerEpoch || (this as any).detached) return
        // The accepted task owns the uploaded object now; removal must not abort it.
        if (source.uploaded) { (this as any).uploadCleanup = undefined; (this as any).uploadFile = undefined; this.setData({ source: null, uploadStage: '' }) }
        const jobId = response.jobId || response.id || ''; if (!jobId) throw new Error('后端没有返回精修任务 ID')
        this.setData({ currentJobId: jobId }); if ((this as any).visible !== false) this.startPolling(jobId); wx.showToast({ title: '精修已提交', icon: 'success' })
      } catch (error) { if (epoch === (this as any).ownerEpoch) this.setData({ error: formatError(error) }) }
      finally { if (epoch === (this as any).ownerEpoch) { this.setData({ isSubmitting: false }); this.refreshCanSubmit() } }
    },
    async loadJob(jobId: string) {
      const epoch = (this as any).ownerEpoch
      const key = `${epoch}:${jobId}`
      if ((this as any).pollingRequest === key) return
      ;(this as any).pollingRequest = key
      const current = () => epoch === (this as any).ownerEpoch && jobId === this.data.currentJobId && !(this as any).detached
      try {
        const response = await requestJson<{ job?: unknown }>({ action: 'getJob', jobId })
        if (!current()) return
        const job = normalizeJob(response.job); appendLocalJob(job)
        this.setData({ job, error: job.status === 'failed' ? formatError(job.business_code || job.error) : '' })
        if (job.status === 'succeeded' || job.status === 'failed') this.stopPolling()
      } catch (error) { if (current()) this.setData({ error: formatError(error) }) }
      finally { if ((this as any).pollingRequest === key) (this as any).pollingRequest = undefined }
    },
    refreshCurrentJob() { if (this.data.currentJobId) void this.loadJob(this.data.currentJobId) },
    openJobDetail() { if (this.data.currentJobId) wx.navigateTo({ url: `/pages/job-detail/job-detail?jobId=${this.data.currentJobId}` }) },
    previewImage(event: WechatMiniprogram.TouchEvent) { const url = String(event.currentTarget.dataset.url || ''); if (url) wx.previewImage({ current: url, urls: this.data.job?.result_images.filter(image => image.can_preview).map(image => image.url) || [url] }) },
    saveImage(event: WechatMiniprogram.TouchEvent) { const url = String(event.currentTarget.dataset.url || ''); if (url) void saveImageToAlbum(url) },
    shareImage(event: WechatMiniprogram.TouchEvent) { const url = String(event.currentTarget.dataset.url || ''); if (url) void downloadShareFile(url) },
    startPolling(jobId: string) { this.stopPolling(); void this.loadJob(jobId); (this as any).pollingTimer = setInterval(() => { void this.loadJob(jobId) }, 3000) },
    stopPolling() { const timer = (this as any).pollingTimer as number | undefined; if (timer) clearInterval(timer); (this as any).pollingTimer = undefined },
    openAuthPanel() { this.setData({ showAuthPanel: true }) }, closeAuthPanel() { this.setData({ showAuthPanel: false }) }, onAuthed() { this.setData({ showAuthPanel: false }); this.loadSources() },
    onShareAppMessage() { return { title: '图研Tuyan · 独立精修', path: '/pages/refine/refine' } },
  },
})

function defaultSettings(registry: ModelRegistry): RefineSettings { const simpleProvider: ModelProviderId = 'bailian'; return { configurationMode: 'simple', simpleProvider, modelRoutes: providerDefaultRoutes(simpleProvider, registry), outputFormat: 'png', imageSize: '1K', aspectRatio: 'auto', pipelineMode: 'planner_critic', retrievalSetting: 'none', numCandidates: 1, maxCriticRounds: 1 } }
function sourceOption(job: Job, image: ImageAsset, index: number): RefineSourceOption { return { label: `${job.caption || job.id} · 结果 ${index + 1}`, jobId: job.id, url: image.url, objectKey: image.object_key } }
