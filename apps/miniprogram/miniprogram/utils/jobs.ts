import { API_BASE, LOCAL_JOBS_KEY } from './config'
import { requestJson } from './api'
import { STATUS_LABELS } from './constants'
import {
  formatImageAsset,
  formatOutputFormat,
  normalizeOutputFormat,
  type ImageAsset,
  type OutputFormat,
} from './job-assets'
import { formatReferenceImageModeUsed, type ReferenceImageModeUsed } from './reference-mode'
import { imageExtension } from './media'
import type { ModelRoutes } from './model-routing'

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | string

export interface RetrievedReference {
  id: string
  task_name: string
  title: string
  summary: string
  image_url: string
  source: string
}

export interface JobStage {
  id: string
  candidate_id: number
  candidate_number: number
  type: string
  marker: string
  title: string
  round: number
  text: string
  suggestion: string
  image_url: string
  image_can_preview: boolean
  error: string
}

export interface Job {
  id: string
  status: JobStatus
  provider: string
  client_platform: string
  client_platform_text: string
  user_email: string
  configuration_mode: string
  routing_mode: string
  model_routing_source: string
  model_routes: ModelRoutes | Record<string, never>
  output_format: OutputFormat
  output_format_text: string
  method_content: string
  method_preview: string
  caption: string
  negative_prompt: string
  infographic_category: string
  task_name: string
  image_size: string
  retrieval_setting: string
  retrieval_setting_text: string
  retrieved_references: RetrievedReference[]
  stages: JobStage[]
  critic_mode: string
  main_model_name: string
  image_gen_model_name: string
  reference_vision_model_name: string
  reference_vision_model_text: string
  reference_image_mode: string
  reference_image_mode_used: ReferenceImageModeUsed
  reference_image_mode_text: string
  reference_image_count: number
  reference_images: ImageAsset[]
  aspect_ratio: string
  num_candidates: number
  result_image_count: number
  result_images: ImageAsset[]
  logs_tail: string
  error: string
  business_code: string
  created_at?: string | number
  updated_at?: string | number
  completed_at?: string | number
  created_text: string
  status_text: string
}

export function normalizeJob(input: unknown): Job {
  const job = (input || {}) as Record<string, any>
  const jobId = String(job.id || job._id || '')
  const methodContent = String(job.method_content || job.methodContent || '')
  const outputFormat = normalizeOutputFormat(job.output_format || job.outputFormat)
  const resultImages = (job.result_images || job.resultImages || []).map((image: Record<string, any>, index: number) => ({
    ...formatImageAsset(
      {
        ...image,
        url: resolveImageUrl(String(image.url || ''), jobId, index, image.mime_type || image.mimeType || '', outputFormat),
      },
      {
        fallbackFilename: `candidate-${index + 1}.${outputFormat}`,
        fallbackFormat: outputFormat,
      },
    ),
    candidate_id: Number(image.candidate_id != null ? image.candidate_id : image.candidateId != null ? image.candidateId : index),
  }))
  const referenceImages = (job.reference_images || job.referenceImages || []).map((image: Record<string, any>, index: number) => formatImageAsset(
    {
      ...image,
      url: resolveImageUrl(String(image.url || ''), `${jobId}-ref`, index, image.mime_type || image.mimeType || '', image.mime_type || image.mimeType || ''),
    },
    {
      fallbackFilename: String(image.filename || `reference-${index + 1}`),
      fallbackFormat: image.mime_type || image.mimeType || '',
    },
  ))
  const status = String(job.status || 'queued')
  const referenceModeUsed = normalizeReferenceImageModeUsed(job.reference_image_mode_used || job.referenceImageModeUsed)
  const referenceVisionModelName = String(job.reference_vision_model_name || job.referenceVisionModelName || '')
  const referenceImageCount = Number(job.reference_image_count || job.referenceImageCount || referenceImages.length || 0)
  const retrievalSetting = String(job.retrieval_setting || job.retrievalSetting || 'none')

  return {
    id: jobId,
    status,
    provider: String(job.provider || ''),
    client_platform: normalizeClientPlatform(job.client_platform || job.clientPlatform),
    client_platform_text: formatClientPlatform(job.client_platform || job.clientPlatform),
    user_email: String(job.user_email || job.userEmail || ''),
    configuration_mode: String(job.configuration_mode || job.configurationMode || 'simple'),
    routing_mode: String(job.routing_mode || job.routingMode || ''),
    model_routing_source: String(job.model_routing_source || job.modelRoutingSource || (job.model_routes || job.modelRoutes ? 'explicit' : 'legacy-derived')),
    model_routes: normalizeJobModelRoutes(job.model_routes || job.modelRoutes),
    output_format: outputFormat,
    output_format_text: formatOutputFormat(outputFormat),
    method_content: methodContent,
    method_preview: methodContent.length > 86 ? `${methodContent.slice(0, 86)}...` : methodContent,
    caption: String(job.caption || ''),
    negative_prompt: String(job.negative_prompt || job.negativePrompt || ''),
    infographic_category: String(job.infographic_category || job.infographicCategory || '方法框架图'),
    task_name: String(job.task_name || job.taskName || 'diagram'),
    image_size: String(job.image_size || job.imageSize || ''),
    retrieval_setting: retrievalSetting,
    retrieval_setting_text: formatRetrievalSetting(retrievalSetting),
    retrieved_references: (job.retrieved_references || job.retrievedReferences || []).map(normalizeRetrievedReference),
    stages: (job.stages || []).map((stage: unknown, index: number) => normalizeJobStage(stage, jobId, index)),
    critic_mode: String(job.critic_mode || job.criticMode || ''),
    main_model_name: String(job.main_model_name || job.mainModelName || ''),
    image_gen_model_name: String(job.image_gen_model_name || job.imageGenModelName || job.imageModelName || ''),
    reference_vision_model_name: referenceVisionModelName,
    reference_vision_model_text: referenceModeUsed === 'vision_model' ? referenceVisionModelName || '未记录' : '未使用',
    reference_image_mode: String(job.reference_image_mode || job.referenceImageMode || ''),
    reference_image_mode_used: referenceModeUsed,
    reference_image_mode_text: formatReferenceImageModeUsed(referenceModeUsed),
    reference_image_count: referenceImageCount,
    reference_images: referenceImages,
    aspect_ratio: String(job.aspect_ratio || job.aspectRatio || '16:9'),
    num_candidates: Number(job.num_candidates || job.numCandidates || 0),
    result_image_count: Number(job.result_image_count || job.resultImageCount || resultImages.length || 0),
    result_images: resultImages,
    logs_tail: String(job.logs_tail || (Array.isArray(job.logs) ? job.logs.slice(-10).join('\n') : '')),
    error: String(job.error || ''),
    business_code: String(job.business_code || job.businessCode || ''),
    created_at: job.created_at || job.createdAt,
    updated_at: job.updated_at || job.updatedAt,
    completed_at: job.completed_at || job.completedAt,
    created_text: formatDate(job.created_at || job.createdAt),
    status_text: STATUS_LABELS[status] || status || '未知',
  }
}

function normalizeJobModelRoutes(input: unknown): ModelRoutes | Record<string, never> {
  const source = input && typeof input === 'object' ? input as Record<string, any> : {}
  const route = (role: string) => {
    const item = source[role] && typeof source[role] === 'object' ? source[role] as Record<string, any> : {}
    return { accessProvider: String(item.accessProvider || item.access_provider || ''), modelId: String(item.modelId || item.model_id || '') }
  }
  const routes = { main: route('main'), image: route('image'), vision: route('vision') }
  return routes.main.accessProvider && routes.main.modelId && routes.image.accessProvider && routes.image.modelId && routes.vision.accessProvider && routes.vision.modelId
    ? routes
    : {}
}

function normalizeClientPlatform(value: unknown): string {
  const platform = String(value || '').trim().toLowerCase()
  return ['web', 'miniprogram', 'android', 'ios', 'windows', 'macos', 'harmony'].includes(platform) ? platform : ''
}

export function formatClientPlatform(value: unknown): string {
  const labels: Record<string, string> = {
    web: 'Web 网页', miniprogram: '微信小程序', android: 'Android', ios: 'iOS',
    windows: 'Windows', macos: 'macOS', harmony: 'HarmonyOS',
  }
  return labels[normalizeClientPlatform(value)] || '未记录'
}

export function normalizeRetrievedReference(input: unknown): RetrievedReference {
  const item = (input || {}) as Record<string, any>
  return {
    id: String(item.id || item._id || ''),
    task_name: String(item.task_name || item.taskName || 'diagram'),
    title: String(item.title || item.visualIntent || item.caption || ''),
    summary: String(item.summary || item.content || item.methodExcerpt || ''),
    image_url: String(item.image_url || item.imageUrl || item.url || ''),
    source: String(item.source || 'paperbanana-bench'),
  }
}

export function normalizeJobStage(input: unknown, jobId = '', index = 0): JobStage {
  const stage = (input || {}) as Record<string, any>
  const image = (stage.image || {}) as Record<string, any>
  const mimeType = String(image.mime_type || image.mimeType || '')
  // stage 图与结果图分开命名（jobId 加 -stage 后缀），避免 cacheDataImage 落盘文件互相覆盖。
  const imageUrl = resolveImageUrl(String(image.url || ''), `${jobId}-stage`, index, mimeType, mimeType)
  const candidateId = Number(stage.candidate_id != null ? stage.candidate_id : stage.candidateId != null ? stage.candidateId : 0)
  const type = String(stage.type || '')
  const title = String(stage.title || stage.type || '')
  return {
    id: String(stage.id || stage._id || `stage-${index}`),
    candidate_id: candidateId,
    candidate_number: candidateId + 1,
    type,
    marker: stageMarker(type, title),
    title,
    round: Number(stage.round || 0),
    text: String(stage.text || stage.description || stage.message || ''),
    suggestion: String(stage.suggestion || stage.criticSuggestion || ''),
    image_url: imageUrl,
    image_can_preview: Boolean(imageUrl) && !mimeType.includes('svg'),
    error: String(stage.error || ''),
  }
}

function stageMarker(type: string, title = ''): string {
  // 精修放大阶段后端用 type:'render'，靠标题区分（含"精修"/"放大"）
  if (title.includes('精修') || title.includes('放大') || type.includes('refine') || type.includes('upscale') || type.includes('enhance')) return '修'
  if (type === 'plan' || type === 'planner') return '规'
  if (type === 'render') return '绘'
  if (type === 'critic') return '审'
  if (type.includes('retriev')) return '检'
  return '步'
}

export function formatRetrievalSetting(setting: string): string {
  if (setting === 'auto') return '自动检索'
  if (setting === 'random') return '随机参考'
  if (setting === 'manual') return '手动参考'
  return '不检索'
}

export function resolveImageUrl(url: string, jobId = 'image', index = 0, mimeType = '', fallbackFormat: unknown = ''): string {
  if (!url) return ''
  // 开发者工具对 USER_DATA_PATH 文件生成的临时代理地址只在原模拟会话有效。
  // 旧地址进入 Storage 后会返回 500，必须在普通 http(s) 分支之前丢弃。
  if (/^https?:\/\/(?:127\.0\.0\.1|localhost):\d+\/__APP__\/paperbanana-/i.test(url)) return ''
  if (/^https?:\/\//i.test(url)) return stabilizeRemoteUrl(url)
  if (/^data:image\//i.test(url)) return cacheDataImage(url, jobId, index, mimeType, fallbackFormat)
  // 已落盘的本地缓存路径（如本机记录 round-trip）原样返回，不能拼到 API_BASE 上
  if (/^wxfile:/i.test(url) || (userDataPath() && url.indexOf(userDataPath()) === 0)) return localImageExists(url) ? url : ''
  return `${API_BASE}${url}`
}

function localImageExists(filePath: string): boolean {
  try {
    const fs = wx.getFileSystemManager()
    if (!fs || typeof fs.accessSync !== 'function') return true
    fs.accessSync(filePath)
    return true
  } catch {
    return false
  }
}

// 桶签名 URL 每次 getJob 都重新签发（查询串变化）。轮询期间 src 频变会让 <image>
// 反复重载闪烁——按"去查询串的路径"为键，在缓存期内复用首次拿到的签名 URL 保持 src 稳定。
// 缓存期取 30 分钟，远小于后端最短签名有效期（stage 图 1 小时），过期后换用新签名（仅闪一次）。
const STABLE_URL_TTL_MS = 30 * 60 * 1000
const stableUrlCache = new Map<string, { url: string; cachedAt: number }>()

function stabilizeRemoteUrl(url: string): string {
  const pathKey = url.split('?')[0]
  if (pathKey === url) return url
  const now = Date.now()
  const cached = stableUrlCache.get(pathKey)
  if (cached && now - cached.cachedAt < STABLE_URL_TTL_MS) return cached.url
  if (stableUrlCache.size > 500) stableUrlCache.clear()
  stableUrlCache.set(pathKey, { url, cachedAt: now })
  return url
}

function userDataPath(): string {
  const env = (wx as any).env
  return env && env.USER_DATA_PATH ? String(env.USER_DATA_PATH) : ''
}

const DATA_IMAGE_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
// 本会话已写过的缓存文件：轮询每 3s normalize 一次，避免同一图片反复同步写盘造成卡顿
const writtenCacheFiles = new Set<string>()

// data:URL 一律落盘成本地文件路径，避免 base64 进 setData（SYNC.md 用户反馈红线）。
export function cacheDataImage(dataUrl: string, jobId: string, index: number, hintedMimeType = '', fallbackFormat: unknown = ''): string {
  const base64Match = dataUrl.match(DATA_IMAGE_PATTERN)
  const utf8Match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+)(?:;charset=[^;,]+)?(?:;utf8|;utf-8)?,(.*)$/i)
  if (!base64Match && !utf8Match) return ''

  const mimeType = base64Match ? base64Match[1] : (utf8Match ? utf8Match[1] : hintedMimeType)
  const extension = imageExtension(mimeType || hintedMimeType || String(fallbackFormat || ''))
  const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'image'
  const filePath = `${userDataPath()}/paperbanana-${safeJobId}-${index}.${extension}`
  if (writtenCacheFiles.has(filePath)) return filePath

  try {
    if (base64Match) {
      wx.getFileSystemManager().writeFileSync(filePath, base64Match[2], 'base64')
    } else if (utf8Match) {
      wx.getFileSystemManager().writeFileSync(filePath, decodeURIComponent(utf8Match[2]), 'utf8')
    }
    writtenCacheFiles.add(filePath)
    return filePath
  } catch (error) {
    console.warn('Failed to cache generated image', error)
    return ''
  }
}

// 启动时清理上次会话落盘的缓存图，避免 USER_DATA_PATH（上限 200MB）越积越满
export function cleanupCachedImages() {
  const dir = userDataPath()
  if (!dir) return
  const fs = wx.getFileSystemManager()
  try {
    fs.readdirSync(dir).forEach((name) => {
      if (String(name).indexOf('paperbanana-') === 0) fs.unlinkSync(`${dir}/${name}`)
    })
    writtenCacheFiles.clear()
  } catch (error) {
    console.warn('Failed to clean cached images', error)
  }
}

function normalizeReferenceImageModeUsed(value: unknown): ReferenceImageModeUsed {
  if (value === 'main_model' || value === 'vision_model' || value === 'none' || value === 'auto') return value
  return ''
}

// 补拉详情用并发池（wx.request 真机最多 10 个并发，50 条全量 Promise.all 会直接 request:fail）
const HYDRATE_CONCURRENCY = 5

export async function hydrateRecordJobs(jobs: Job[]): Promise<Job[]> {
  const hydrated = jobs.slice()
  let cursor = 0

  async function worker() {
    while (cursor < hydrated.length) {
      const index = cursor++
      const job = hydrated[index]
      const hasImage = job.result_images.some((image) => image.url)
      const hasResult = job.result_image_count > 0 || job.result_images.length > 0
      const hasReferenceImage = job.reference_images.some((image) => image.url)
      const hasReference = job.reference_image_count > 0 || job.reference_images.length > 0
      if ((!hasResult || hasImage) && (!hasReference || hasReferenceImage)) continue
      try {
        const detail = await requestJson<{ job?: unknown }>({ action: 'getJob', jobId: job.id })
        hydrated[index] = normalizeJob(detail.job)
      } catch {
        // 补拉失败保留列表里的原始数据
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(HYDRATE_CONCURRENCY, hydrated.length) }, () => worker()))
  return hydrated
}

export function readLocalJobs(): Job[] {
  const jobs = wx.getStorageSync(LOCAL_JOBS_KEY)
  return Array.isArray(jobs) ? jobs.map(normalizeJob).filter((job) => job.id).map(toLocalJobSummary) : []
}

// 写入本机最近任务（最多 10 条），返回最新列表供页面 setData。
export function appendLocalJob(job: Job): Job[] {
  if (!job.id) return readLocalJobs()
  const nextJobs = [toLocalJobSummary(job), ...readLocalJobs().filter((item) => item.id !== job.id)].slice(0, 10)
  wx.setStorageSync(LOCAL_JOBS_KEY, nextJobs)
  return nextJobs
}

export function clearLocalJobs() {
  wx.removeStorageSync(LOCAL_JOBS_KEY)
}

const STAGE_TEXT_LIMIT = 300

function toStageSummary(stage: JobStage): JobStage {
  return {
    ...stage,
    text: stage.text.length > STAGE_TEXT_LIMIT ? `${stage.text.slice(0, STAGE_TEXT_LIMIT)}...` : stage.text,
    suggestion: stage.suggestion.length > STAGE_TEXT_LIMIT ? `${stage.suggestion.slice(0, STAGE_TEXT_LIMIT)}...` : stage.suggestion,
  }
}

// 生成页当前任务摘要：结果图单独存放在 resultImages，长文本剥离；stages 截断后保留供时间线展示。
export function toCurrentJobSummary(job: Job): Job {
  return {
    ...job,
    method_content: '',
    result_images: [],
    logs_tail: '',
    stages: job.stages.map(toStageSummary),
  }
}

// 记录列表摘要：时间线只在任务详情页展示，列表里剥离 stages 控制 setData 体积。
export function toRecordJobSummary(job: Job): Job {
  return {
    ...job,
    logs_tail: '',
    stages: [],
    retrieved_references: [],
  }
}

export function toLocalJobSummary(job: Job): Job {
  return {
    ...job,
    method_content: '',
    logs_tail: '',
    stages: [],
    retrieved_references: [],
  }
}

export function formatDate(value: unknown): string {
  if (!value) return ''
  const date = new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
