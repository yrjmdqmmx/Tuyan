import { formatError, requestJson } from '../../utils/api'
import { getApiKeys, replaceApiKeys } from '../../utils/api-keys'
import { buildAspectRatioOptions, buildResolutionOptions } from '../../utils/aspect-ratios'
import { findRegistryModel, type ModelProviderId, type ModelRegistry } from '../../utils/model-registry'
import { loadModelRegistry, subscribeModelRegistry, type ModelRegistryState } from '../../utils/model-registry-store'
import { providerDefaultRoutes, requiredRefineRouteRoles, uniqueProvidersForRoles, type ModelRoutes } from '../../utils/model-routing'
import type { ImageAsset } from '../../utils/job-assets'
import { normalizeJob, readLocalJobs, type Job } from '../../utils/jobs'
import { buildRefineJobPayload } from '../../utils/refine'
import { getCurrentUser, isSessionChecked, subscribeSession } from '../../utils/session'

interface RefineSettings {
  configurationMode: 'simple' | 'advanced'; simpleProvider: ModelProviderId; modelRoutes: ModelRoutes
  outputFormat: 'png' | 'svg'; imageSize: string; aspectRatio: string; pipelineMode: string
  retrievalSetting: string; numCandidates: number; maxCriticRounds: number
}
interface RefineSourceOption { label: string; jobId: string; url: string; objectKey: string }

Component({
  data: {
    registry: {} as ModelRegistry | Record<string, never>, registryReady: false, registryVersion: '等待目录', registryError: '',
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
      ;(this as any).unsubscribeRegistry = subscribeModelRegistry((state) => this.applyRegistryState(state))
      ;(this as any).unsubscribeSession = subscribeSession((user) => {
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
      this.stopPolling()
    },
  },
  pageLifetimes: { show() { this.loadSources() }, hide() { this.stopPolling() } },
  methods: {
    applyRegistryState(state: ModelRegistryState) {
      if (!state.registry) { this.setData({ registry: {}, registryReady: false, registryError: state.error }); this.refreshCanSubmit(); return }
      const current = this.data.settings as RefineSettings
      const settings = current.modelRoutes ? current : defaultSettings(state.registry)
      this.setData({ registry: state.registry, registryReady: true, registryVersion: state.registry.registryVersion, registryError: '', settings })
      this.refreshCapabilities(); this.refreshCanSubmit()
    },
    async retryRegistry() { await loadModelRegistry(true) },
    async loadSources() {
      let jobs = readLocalJobs()
      if (this.data.isLoggedIn) {
        try {
          const response = await requestJson<{ jobs?: unknown[] }>({ action: 'myJobs', limit: 50 })
          const accountJobs = (response.jobs || []).map(normalizeJob)
          const known = new Set(jobs.map((job) => job.id)); jobs = [...jobs, ...accountJobs.filter((job) => !known.has(job.id))]
        } catch { /* 本机来源仍可用 */ }
      }
      const sourceOptions = jobs.flatMap((job) => job.result_images.map((image, index) => sourceOption(job, image, index))).filter((item) => Boolean(item.url || item.objectKey))
      const previous = this.data.source
      const sourceIndex = Math.max(0, sourceOptions.findIndex((item) => item.jobId === previous?.jobId && item.objectKey === previous?.objectKey))
      this.setData({ sourceOptions, sourceIndex, source: sourceOptions[sourceIndex] || null })
      this.refreshCanSubmit()
    },
    onSourceChange(event: WechatMiniprogram.PickerChange) { const sourceIndex = Number(event.detail.value) || 0; this.setData({ sourceIndex, source: this.data.sourceOptions[sourceIndex] || null }); this.refreshCanSubmit() },
    onInstructionInput(event: WechatMiniprogram.TextareaInput) { this.setData({ instruction: event.detail.value }); this.refreshCanSubmit() },
    onRatioChange(event: WechatMiniprogram.PickerChange) { this.setData({ ratioIndex: Number(event.detail.value) || 0 }); this.refreshCanSubmit() },
    onResolutionChange(event: WechatMiniprogram.PickerChange) { this.setData({ resolutionIndex: Number(event.detail.value) || 0 }); this.refreshCanSubmit() },
    openSettings() { if (this.data.registryReady) this.setData({ showSettings: true, apiKeysForSheet: getApiKeys(), settingsExecutionRoles: requiredRefineRouteRoles({ refineMode: this.data.refineMode }) }) },
    closeSettings() { this.setData({ showSettings: false }) },
    saveSettings(event: WechatMiniprogram.CustomEvent<{ settings: RefineSettings; apiKeys: Record<string, string> }>) { replaceApiKeys(event.detail.apiKeys); this.setData({ settings: event.detail.settings, apiKeysForSheet: getApiKeys(), showSettings: false }); this.refreshCapabilities(); this.refreshCanSubmit() },
    refreshCapabilities() {
      const registry = this.data.registryReady ? this.data.registry as ModelRegistry : null
      const settings = this.data.settings as RefineSettings
      if (!registry || !settings.modelRoutes) return
      const entry = findRegistryModel(registry, settings.modelRoutes.image.accessProvider, settings.modelRoutes.image.modelId)
      const capability = String(entry?.capabilities.imageEditMode || 'none')
      const refineMode = capability === 'direct-edit' && (entry?.inputModalities.includes('image') || entry?.capabilities.referenceImages === true) ? 'direct-edit' : entry?.roles.includes('image') ? 'analyze-redraw' : 'none'
      const ratioOptions = buildAspectRatioOptions({ capabilities: entry?.capabilities || {}, capabilityField: 'refineAspectRatios', modelLabel: entry?.label }).filter((item) => !item.disabled).map((item) => ({ value: item.value, label: item.label }))
      const resolutionOptions = buildResolutionOptions(entry?.capabilities || {}, 'refineResolutions')
      this.setData({ refineMode, refineModeLabel: refineMode === 'direct-edit' ? '直接编辑' : refineMode === 'analyze-redraw' ? '分析后重绘' : '不支持精修', ratioOptions, resolutionOptions, ratioIndex: 0, resolutionIndex: 0 })
    },
    refreshCanSubmit() {
      const settings = this.data.settings as RefineSettings
      if (!this.data.registryReady || !settings.modelRoutes) { this.setData({ canSubmit: false }); return }
      const roles = requiredRefineRouteRoles({ refineMode: this.data.refineMode })
      const keys = getApiKeys()
      const hasKeys = uniqueProvidersForRoles(settings.modelRoutes, roles).every((provider) => Boolean(keys[provider]?.trim()))
      this.setData({ canSubmit: Boolean(this.data.source && this.data.instruction.trim().length >= 3 && this.data.refineMode !== 'none' && this.data.ratioOptions.length && this.data.resolutionOptions.length && hasKeys && !this.data.isSubmitting) })
    },
    async submitRefine() {
      if (!this.data.canSubmit || this.data.isSubmitting || !this.data.source) return
      this.setData({ isSubmitting: true, error: '', job: null })
      const registryState = await loadModelRegistry(true)
      const registry = registryState.registry
      if (!registry) {
        this.setData({ isSubmitting: false, error: '模型目录不可用，已禁止精修任务。' })
        this.refreshCanSubmit()
        return
      }
      const settings = this.data.settings as RefineSettings
      try {
        const payload = buildRefineJobPayload({ configurationMode: settings.configurationMode, modelRoutes: settings.modelRoutes, registry, apiKeys: getApiKeys(), source: { url: this.data.source.url, objectKey: this.data.source.objectKey }, editInstruction: this.data.instruction, aspectRatio: this.data.ratioOptions[this.data.ratioIndex]?.value || 'auto', imageSize: this.data.resolutionOptions[this.data.resolutionIndex]?.value || '', refineMode: this.data.refineMode === 'direct-edit' ? 'direct-edit' : 'analyze-redraw' })
        const response = await requestJson<{ jobId?: string; id?: string }>(payload)
        const jobId = response.jobId || response.id || ''; if (!jobId) throw new Error('后端没有返回精修任务 ID')
        this.setData({ currentJobId: jobId }); this.startPolling(jobId); wx.showToast({ title: '精修已提交', icon: 'success' })
      } catch (error) { this.setData({ error: formatError(error) }) }
      finally { this.setData({ isSubmitting: false }); this.refreshCanSubmit() }
    },
    async loadJob(jobId: string) { try { const response = await requestJson<{ job?: unknown }>({ action: 'getJob', jobId }); if (jobId !== this.data.currentJobId) return; const job = normalizeJob(response.job); this.setData({ job, error: job.status === 'failed' ? formatError(job.error || job.business_code) : '' }); if (job.status === 'succeeded' || job.status === 'failed') this.stopPolling() } catch (error) { this.setData({ error: formatError(error) }) } },
    startPolling(jobId: string) { this.stopPolling(); void this.loadJob(jobId); (this as any).pollingTimer = setInterval(() => { void this.loadJob(jobId) }, 3000) },
    stopPolling() { const timer = (this as any).pollingTimer as number | undefined; if (timer) clearInterval(timer); (this as any).pollingTimer = undefined },
    openAuthPanel() { this.setData({ showAuthPanel: true }) }, closeAuthPanel() { this.setData({ showAuthPanel: false }) }, onAuthed() { this.setData({ showAuthPanel: false }); this.loadSources() },
    onShareAppMessage() { return { title: '图研Tuyan · 独立精修', path: '/pages/refine/refine' } },
  },
})

function defaultSettings(registry: ModelRegistry): RefineSettings { const simpleProvider: ModelProviderId = 'bailian'; return { configurationMode: 'simple', simpleProvider, modelRoutes: providerDefaultRoutes(simpleProvider, registry), outputFormat: 'png', imageSize: '1K', aspectRatio: 'auto', pipelineMode: 'planner_critic', retrievalSetting: 'none', numCandidates: 1, maxCriticRounds: 1 } }
function sourceOption(job: Job, image: ImageAsset, index: number): RefineSourceOption { return { label: `${job.caption || job.id} · 结果 ${index + 1}`, jobId: job.id, url: image.url, objectKey: image.object_key } }
