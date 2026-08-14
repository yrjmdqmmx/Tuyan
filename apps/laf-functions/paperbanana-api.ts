import cloud from '@lafjs/cloud'
import * as crypto from 'crypto'

declare const require: any

type Provider = 'openrouter' | 'gemini' | 'openai' | 'bailian'
type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'
type OutputFormat = 'png' | 'svg'
type TaskName = 'diagram' | 'plot'
type RetrievalSetting = 'none' | 'auto' | 'random' | 'manual'
type ReferenceImageRole = 'original' | 'analysis'
type ReferenceImageMode = 'auto' | 'main_model' | 'vision_model'
type ReferenceImageModeUsed = 'none' | 'main_model' | 'vision_model'
type ModelCapabilityStatus = 'supported' | 'unsupported' | 'unknown'
type FeedbackCategory = 'bug' | 'feature' | 'experience' | 'other'
type FeedbackPlatform = 'web' | 'miniprogram' | 'android' | 'ios' | 'windows' | 'macos'

type ApiKeys = {
  openrouter?: string
  gemini?: string
  openai?: string
  bailian?: string
}

type CreateJobBody = {
  action: 'createJob'
  provider: Provider
  apiKeys: ApiKeys
  configurationMode?: string
  taskName?: TaskName
  methodContent: string
  caption: string
  infographicCategory?: string
  userId?: string
  userEmail?: string
  outputFormat?: OutputFormat
  output_format?: OutputFormat
  mainModelName: string
  imageModelName: string
  referenceVisionModelName?: string
  referenceImageMode?: ReferenceImageMode
  referenceImageModeUsed?: ReferenceImageModeUsed
  referenceImages?: ReferenceImageInput[]
  pipelineMode?: 'planner_critic' | 'full' | 'vanilla'
  retrievalSetting?: RetrievalSetting
  manualReferenceIds?: string[]
  aspectRatio?: '16:9' | '21:9' | '3:2' | '1:1'
  imageSize?: '1K' | '2K' | '4K'
  numCandidates?: number
  maxCriticRounds?: number
}

type RefineImageBody = {
  action: 'refineImage'
  provider: Provider
  apiKeys: ApiKeys
  mainModelName?: string
  imageModelName: string
  referenceVisionModelName?: string
  sourceImageUrl?: string
  sourceImageObjectKey?: string
  editInstruction: string
  aspectRatio?: '16:9' | '21:9' | '3:2' | '1:1'
  imageSize?: '2K' | '4K'
  userId?: string
  userEmail?: string
}

type CreateExecutionBody = Omit<CreateJobBody, 'apiKeys'>
type RefineExecutionBody = Omit<RefineImageBody, 'apiKeys'>
type JobAdmissionConfig = {
  maxActive: number
  maxPending: number
  maxPerOwner: number
  maxPerIp: number
}
type JobPrincipal = { ownerKey: string; ipKey: string }
type AdmittedJobTask = {
  jobId: string
  kind: 'create' | 'refine'
  body: CreateExecutionBody | RefineExecutionBody
  apiKey: string
  numCandidates?: number
  maxCriticRounds?: number
}

export function toCreateExecutionBody(body: CreateJobBody): CreateExecutionBody {
  const { apiKeys: _apiKeys, ...executionBody } = body
  return executionBody
}

export function toRefineExecutionBody(body: RefineImageBody): RefineExecutionBody {
  const { apiKeys: _apiKeys, ...executionBody } = body
  return executionBody
}

export function createJobAdmissionController(
  config: JobAdmissionConfig,
  dependencies: {
    execute(task: AdmittedJobTask): Promise<void>
    markFailed(jobId: string, error: string): Promise<void>
    logError(message: string): void
  },
) {
  type Entry = {
    id: number
    principal: JobPrincipal
    slot: 'active' | 'queued'
    committed: boolean
    task?: AdmittedJobTask
  }

  let accepting = true
  let nextId = 1
  const entries = new Map<number, Entry>()
  const pendingOrder: Entry[] = []
  const tracked = new Set<Promise<void>>()
  const ownerCounts = new Map<string, number>()
  const ipCounts = new Map<string, number>()
  const drainWaiters = new Set<() => void>()

  const countFor = (counts: Map<string, number>, key: string) => key ? (counts.get(key) || 0) : 0
  const increment = (counts: Map<string, number>, key: string) => {
    if (key) counts.set(key, countFor(counts, key) + 1)
  }
  const decrement = (counts: Map<string, number>, key: string) => {
    if (!key) return
    const next = countFor(counts, key) - 1
    if (next > 0) counts.set(key, next)
    else counts.delete(key)
  }
  const activeSlots = () => [...entries.values()].filter((entry) => entry.slot === 'active').length
  const notifyDrained = () => {
    if (entries.size || tracked.size) return
    for (const resolve of drainWaiters) resolve()
    drainWaiters.clear()
  }

  const release = (entry: Entry) => {
    if (!entries.delete(entry.id)) return
    const pendingIndex = pendingOrder.indexOf(entry)
    if (pendingIndex >= 0) pendingOrder.splice(pendingIndex, 1)
    decrement(ownerCounts, entry.principal.ownerKey)
    decrement(ipCounts, entry.principal.ipKey)
    pump()
    notifyDrained()
  }

  const launch = (entry: Entry) => {
    if (!entry.task) return
    const task = entry.task
    const promise = (async () => {
      try {
        await dependencies.execute(task)
      } catch (error: any) {
        try {
          await dependencies.markFailed(task.jobId, error?.message || String(error))
        } catch (persistenceError: any) {
          try {
            dependencies.logError(
              `Failed to persist terminal state for ${task.jobId}: ${persistenceError?.message || String(persistenceError)}`,
            )
          } catch {
            // Logging must never re-reject a tracked job.
          }
        }
      } finally {
        release(entry)
      }
    })()
    tracked.add(promise)
    void promise.finally(() => {
      tracked.delete(promise)
      notifyDrained()
    })
  }

  function pump() {
    while (activeSlots() < config.maxActive && pendingOrder.length) {
      const entry = pendingOrder.shift()!
      entry.slot = 'active'
      if (!entry.committed) break
      launch(entry)
    }
  }

  return {
    reserve(principal: JobPrincipal) {
      if (!accepting) {
        return { ok: false as const, code: 503, error: 'Job admission is draining. Please retry after restart.' }
      }
      if (countFor(ownerCounts, principal.ownerKey) >= config.maxPerOwner) {
        return { ok: false as const, code: 429, error: 'Job owner limit exceeded. Please wait for the current job to finish.' }
      }
      if (countFor(ipCounts, principal.ipKey) >= config.maxPerIp) {
        return { ok: false as const, code: 429, error: 'Job IP limit exceeded. Please wait for the current job to finish.' }
      }

      const slot = activeSlots() < config.maxActive
        ? 'active' as const
        : pendingOrder.length < config.maxPending
          ? 'queued' as const
          : null
      if (!slot) return { ok: false as const, code: 429, error: 'Job queue is full. Please try again later.' }

      const entry: Entry = { id: nextId++, principal, slot, committed: false }
      entries.set(entry.id, entry)
      if (slot === 'queued') pendingOrder.push(entry)
      increment(ownerCounts, principal.ownerKey)
      increment(ipCounts, principal.ipKey)
      return { ok: true as const, id: entry.id }
    },
    commit(reservation: { ok: true; id: number }, task: AdmittedJobTask) {
      const entry = entries.get(reservation.id)
      if (!entry || entry.committed) return
      entry.committed = true
      entry.task = task
      if (entry.slot === 'active') launch(entry)
      else pump()
    },
    cancel(reservation: { ok: true; id: number }) {
      const entry = entries.get(reservation.id)
      if (entry) release(entry)
    },
    stop() {
      accepting = false
    },
    snapshot() {
      const values = [...entries.values()]
      return {
        accepting,
        active: values.filter((entry) => entry.committed && entry.slot === 'active').length,
        queued: values.filter((entry) => entry.committed && entry.slot === 'queued').length,
        reserved: values.filter((entry) => !entry.committed).length,
        tracked: tracked.size,
      }
    },
    drain() {
      if (!entries.size && !tracked.size) return Promise.resolve()
      return new Promise<void>((resolve) => drainWaiters.add(resolve))
    },
  }
}

type PrepareReferenceUploadBody = {
  action: 'prepareReferenceUpload'
  files?: ReferenceUploadDescriptor[]
  userId?: string
  userEmail?: string
}

type ReferenceUploadDescriptor = {
  clientId?: string
  role?: ReferenceImageRole
  filename: string
  mimeType: string
  size: number
}

type ReferenceImageInput = {
  filename: string
  mimeType: string
  size: number
  objectKey: string
  uploadToken?: string
  analysisObjectKey?: string
  analysisMimeType?: string
  analysisSize?: number
  analysisUploadToken?: string
}

type StoredReferenceImage = {
  filename: string
  mimeType: string
  size: number
  objectKey: string
  storage: 'bucket'
  analysisObjectKey?: string
  analysisMimeType?: string
  analysisSize?: number
}

type GetJobBody = {
  action: 'getJob'
  jobId: string
}

type AdminJobsBody = {
  action: 'adminJobs'
  adminToken: string
  limit?: number
}

type SubmitFeedbackBody = {
  action: 'submitFeedback'
  message: string
  category?: FeedbackCategory
  jobId?: string
  platform: FeedbackPlatform
  clientVersion?: string
  contact?: string
  userId?: string
  userEmail?: string
}

type AdminFeedbackBody = {
  action: 'adminFeedback'
  adminToken: string
  limit?: number
  status?: string
}

type UserJobsBody = {
  action: 'userJobs'
  userId: string
  userEmail?: string
  limit?: number
}

type DeleteAccountBody = {
  action: 'deleteAccount'
  userId?: string
  userEmail?: string
}

type ImportReferencesBody = {
  action: 'importReferences'
  adminToken: string
  mode?: 'probe' | 'inspect' | 'import'
  limit?: number
  offset?: number
  taskName?: string
  zipUrl?: string
}

type EvaluateJobBody = {
  action: 'evaluateJob'
  adminToken: string
  jobId: string
  apiKey?: string
  provider?: Provider
  model?: string
}

type ModelCapabilityBody = {
  action: 'modelCapability'
  provider: Provider
  model: string
}

type ReferenceLibraryBody = {
  action: 'referenceLibrary'
  taskName?: TaskName
  query?: string
  limit?: number
}

type HealthBody = {
  action: 'health'
}

type ModelCapabilityResult = {
  status: ModelCapabilityStatus
  supportsReferenceImages: boolean
  reason: string
  source: string
  cached: boolean
}

type VisionImageInput = {
  filename: string
  mimeType: string
  url: string
  objectKey?: string
}

type ResvgWasmModule = {
  initWasm: (bytes: any) => Promise<void> | void
  Resvg: any
}

type RetrievedReference = {
  id: string
  taskName: TaskName
  title: string
  summary: string
  imageUrl: string
  imageObjectKey: string
  source: string
}

type JobStage = {
  id: string
  candidateId: number
  type: string
  title: string
  round?: number
  text?: string
  suggestion?: string
  image?: any
  startedAt: Date
  completedAt: Date
  durationMs: number
  error?: string
}

type RequestBody =
  | CreateJobBody
  | RefineImageBody
  | PrepareReferenceUploadBody
  | GetJobBody
  | AdminJobsBody
  | SubmitFeedbackBody
  | AdminFeedbackBody
  | UserJobsBody
  | DeleteAccountBody
  | ModelCapabilityBody
  | ReferenceLibraryBody
  | ImportReferencesBody
  | EvaluateJobBody
  | HealthBody

const db = cloud.mongo.db
const jobs = db.collection('paperbanana_jobs')
const feedback = db.collection('paperbanana_feedback')
const references = db.collection('paperbanana_references')
const bucketName = process.env.PAPERBANANA_BUCKET || 'paperbanana'
const maxReferenceImages = Number(process.env.PAPERBANANA_MAX_REFERENCE_IMAGES || 3)
const maxReferenceBytes = Number(process.env.PAPERBANANA_MAX_REFERENCE_BYTES || 5 * 1024 * 1024)
const maxProviderImageBytes = Number(process.env.PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES || 20 * 1024 * 1024)
const maxProviderImageResponseBytes = Math.ceil(maxProviderImageBytes * 4 / 3) + 1024 * 1024
const referenceUploadTtlSeconds = Number(process.env.PAPERBANANA_REFERENCE_UPLOAD_TTL_SECONDS || 900)
const allowedReferenceMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
const allowedAnalysisMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const svgReferenceRasterWidth = clamp(Number(process.env.PAPERBANANA_SVG_REFERENCE_RASTER_WIDTH || 1024), 320, 1536)
const openRouterModelCacheTtlMs = Number(process.env.OPENROUTER_MODEL_CACHE_TTL_MS || 3600 * 1000)
const feedbackRateLimitWindowMs = 10 * 60 * 1000
const feedbackRateLimitMax = 5
const allowedFeedbackCategories = new Set<FeedbackCategory>(['bug', 'feature', 'experience', 'other'])
const allowedFeedbackPlatforms = new Set<FeedbackPlatform>(['web', 'miniprogram', 'android', 'ios', 'windows', 'macos'])
const allowedRetrievalSettings = new Set<RetrievalSetting>(['none', 'auto', 'random', 'manual'])
let openRouterModelCache: { expiresAt: number; modalities: Map<string, string[]> } | null = null
let resvgWasmPromise: Promise<ResvgWasmModule> | null = null

const benchZipUrlDefault = 'https://huggingface.co/datasets/dwzhu/PaperBananaBench/resolve/main/PaperBananaBench.zip'
const benchZipCachePath = '/tmp/paperbananabench.zip'
type BenchImportCache = {
  zipUrl: string
  zipBytes: number
  entries: Record<string, Uint8Array>
  entryNames: string[]
  refDir: string
  refItems: any[]
}
let importCache: BenchImportCache | null = null

const openaiVisionMainModels = new Set([
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-5.1',
  'gpt-5-mini',
  'gpt-5.2',
  'gpt-5.3-chat',
  'gpt-5.4',
  'gpt-5.4-pro',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-5.5',
  'gpt-5.5-pro',
  'gpt-chat-latest',
])

const geminiVisionMainModels = new Set([
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-pro',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.5-flash',
])

const fallbackReferences: RetrievedReference[] = [
  {
    id: 'paperbanana-style-agent-flow',
    taskName: 'diagram',
    title: 'Agent workflow with retrieval, planning, generation, and critique',
    summary: 'Use a left-to-right multi-agent workflow: input paper content, retrieval examples, planner, stylist, visualizer, critic loop, and final figure. Group agents in soft rounded containers with arrows showing feedback.',
    imageUrl: '',
    imageObjectKey: '',
    source: 'paperbanana-fallback',
  },
  {
    id: 'paperbanana-style-model-pipeline',
    taskName: 'diagram',
    title: 'Academic model pipeline with modules and tensor/data flow',
    summary: 'Use a modular scientific diagram with input data on the left, stacked processing blocks in the center, auxiliary losses or memory paths in dashed connectors, and output artifacts on the right.',
    imageUrl: '',
    imageObjectKey: '',
    source: 'paperbanana-fallback',
  },
  {
    id: 'paperbanana-style-macro-micro',
    taskName: 'diagram',
    title: 'Macro-micro layout with zoomed module detail',
    summary: 'Use one large system container plus a zoomed-in breakout box for an important module. Connect the high-level block to the detail view with thin lines and keep labels short.',
    imageUrl: '',
    imageObjectKey: '',
    source: 'paperbanana-fallback',
  },
  {
    id: 'paperbanana-style-comparison',
    taskName: 'diagram',
    title: 'Method comparison or ablation diagram',
    summary: 'Use parallel lanes for baseline and proposed method. Highlight the added component with one accent color, keep shared parts grey or muted, and show the final performance/output comparison at the right edge.',
    imageUrl: '',
    imageObjectKey: '',
    source: 'paperbanana-fallback',
  },
]

function newGlobalJobAdmission(config: JobAdmissionConfig) {
  return createJobAdmissionController(config, {
    async execute(task) {
      if (task.kind === 'create') {
        await runJob(
          task.jobId,
          task.body as CreateExecutionBody,
          task.apiKey,
          task.numCandidates || 1,
          task.maxCriticRounds || 0,
        )
      } else {
        await runRefineJob(task.jobId, task.body as RefineExecutionBody, task.apiKey)
      }
    },
    markFailed,
    logError(message) {
      console.error(`[paperbanana-api] ${message}`)
    },
  })
}

let jobAdmission = newGlobalJobAdmission({
  maxActive: Number.MAX_SAFE_INTEGER,
  maxPending: 0,
  maxPerOwner: Number.MAX_SAFE_INTEGER,
  maxPerIp: Number.MAX_SAFE_INTEGER,
})

export function configureJobAdmission(config: JobAdmissionConfig) {
  const state = jobAdmission.snapshot()
  if (state.active || state.queued || state.reserved || state.tracked) {
    throw new Error('Cannot reconfigure job admission while jobs are reserved or running')
  }
  jobAdmission = newGlobalJobAdmission(config)
}

export function getJobAdmissionState() {
  return jobAdmission.snapshot()
}

export function stopJobAdmission() {
  jobAdmission.stop()
}

export function drainJobAdmission() {
  return jobAdmission.drain()
}

// Actions that read or write a specific user's data while trusting
// caller-supplied userId/userEmail. These must arrive through the auth-gateway
// (which injects the shared PAPERBANANA_GATEWAY_TOKEN) or carry a valid
// ADMIN_TOKEN. See requireTrustedCaller — this is the IDOR / direct-call guard.
// Public read-only actions (health/modelCapability/referenceLibrary) and
// ADMIN_TOKEN-gated actions are intentionally NOT listed here.
const identityScopedActions = new Set([
  'createJob',
  'refineImage',
  'submitFeedback',
  'userJobs',
  'getJob',
  'prepareReferenceUpload',
  'deleteAccount',
])

export default async function (ctx: FunctionContext) {
  setCorsHeaders(ctx)
  if (ctx.request?.method === 'OPTIONS') {
    ctx.response.status(204)
    return ''
  }

  const body = normalizeBody(ctx.body) as RequestBody
  const action = body?.action || 'health'

  try {
    if (identityScopedActions.has(action)) {
      const denied = requireTrustedCaller(body)
      if (denied) return denied
    }

    if (action === 'health') {
      return ok({ ok: true, runtime: 'laf', version: '0.1.14' })
    }
    if (action === 'createJob') {
      return await createJob(body as CreateJobBody, ctx)
    }
    if (action === 'refineImage') {
      return await refineImage(body as RefineImageBody, ctx)
    }
    if (action === 'prepareReferenceUpload') {
      return await prepareReferenceUpload(body as PrepareReferenceUploadBody)
    }
    if (action === 'modelCapability') {
      return await modelCapability(body as ModelCapabilityBody)
    }
    if (action === 'referenceLibrary') {
      return await referenceLibrary(body as ReferenceLibraryBody)
    }
    if (action === 'getJob') {
      return await getJob((body as GetJobBody).jobId)
    }
    if (action === 'adminJobs') {
      return await adminJobs(body as AdminJobsBody)
    }
    if (action === 'submitFeedback') {
      return await submitFeedback(body as SubmitFeedbackBody, ctx)
    }
    if (action === 'adminFeedback') {
      return await adminFeedback(body as AdminFeedbackBody)
    }
    if (action === 'userJobs') {
      return await userJobs(body as UserJobsBody)
    }
    if (action === 'deleteAccount') {
      return await deleteAccount(body as DeleteAccountBody)
    }
    if (action === 'importReferences') {
      return await importReferences(body as ImportReferencesBody)
    }
    if (action === 'evaluateJob') {
      return await evaluateJob(body as EvaluateJobBody)
    }
    if (action === 'pingPlotWorker') {
      return await pingPlotWorker(body as any)
    }
    return fail(`Unknown action: ${action}`, 400)
  } catch (error: any) {
    return fail(error?.message || String(error), 500)
  }
}

function setCorsHeaders(ctx: FunctionContext) {
  ctx.response.setHeader('Access-Control-Allow-Origin', '*')
  ctx.response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  ctx.response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Token')
  ctx.response.setHeader('Access-Control-Max-Age', '86400')
}

async function prepareReferenceUpload(body: PrepareReferenceUploadBody) {
  const files = Array.isArray(body.files) ? body.files : []
  if (!files.length) return fail('files is required', 400)
  const originalCount = files.filter((file) => file?.role !== 'analysis').length
  if (originalCount > maxReferenceImages) return fail(`Reference image count exceeds ${maxReferenceImages}`, 400)
  if (files.length > maxReferenceImages * 2) return fail('Too many reference upload files', 400)

  const owner = sanitizePathPart(body.userId || body.userEmail || 'anon')
  const bucket = cloud.storage.bucket(bucketName)
  const uploads = []

  for (const file of files) {
    const descriptor = normalizeUploadDescriptor(file)
    const ext = extensionForMimeType(descriptor.mimeType)
    const role = descriptor.role === 'analysis' ? 'analysis' : 'original'
    const objectKey = `references/${owner}/${randomId()}-${role}.${ext}`
    const expiresAt = Date.now() + referenceUploadTtlSeconds * 1000
    const uploadToken = signReferenceUpload(objectKey, descriptor.mimeType, descriptor.size, expiresAt)
    const uploadResult = await bucket.getUploadUrl(objectKey, referenceUploadTtlSeconds, {
      ContentType: descriptor.mimeType,
      ContentLength: descriptor.size,
    })
    const uploadUrl = typeof uploadResult === 'string'
      ? uploadResult
      : uploadResult?.url || uploadResult?.uploadUrl || uploadResult?.signedUrl || ''

    if (!uploadUrl) throw new Error('Failed to create reference upload URL')
    uploads.push({
      clientId: file.clientId || '',
      role,
      filename: descriptor.filename,
      mimeType: descriptor.mimeType,
      size: descriptor.size,
      objectKey,
      uploadUrl,
      uploadToken,
      expiresAt,
    })
  }

  return ok({ uploads })
}

async function modelCapability(body: ModelCapabilityBody) {
  if (!['openrouter', 'gemini', 'openai', 'bailian'].includes(body.provider)) return fail('Invalid provider', 400)
  if (!body.model) return fail('model is required', 400)
  return ok(await referenceModelCapability(body.provider, normalizeModelName(body.provider, body.model)))
}

async function referenceLibrary(body: ReferenceLibraryBody) {
  const taskName = normalizeTaskName(body.taskName)
  const limit = clamp(Number(body.limit || 24), 1, 60)
  const query = limitText(body.query, 120).toLowerCase()
  const docs = await loadReferenceLibrary(taskName, { limit: Math.max(limit, 24) })
  const filtered = query
    ? docs.filter((item) => [item.title, item.summary, item.id].join(' ').toLowerCase().includes(query))
    : docs
  return ok({ references: filtered.slice(0, limit) })
}

async function createJob(body: CreateJobBody, ctx: FunctionContext) {
  validateCreateBody(body)
  const normalizedReferenceImages = normalizeReferenceImages(body.referenceImages || [])
  // 二选一：用户上传了参考图时，以上传图为唯一视觉风格锚点，自动关闭检索
  // （否则检索到的多张图会与上传图的风格相互打架）。检索一律不跑、不附检索图、徽标显示“不检索”。
  const hasUploadedReference = normalizedReferenceImages.length > 0
  const normalizedBodyWithSecrets = {
    ...body,
    taskName: normalizeTaskName(body.taskName),
    infographicCategory: limitText(body.infographicCategory, 80),
    mainModelName: normalizeModelName(body.provider, body.mainModelName),
    imageModelName: normalizeModelName(body.provider, body.imageModelName),
    referenceVisionModelName: normalizeModelName(body.provider, body.referenceVisionModelName || body.mainModelName),
    referenceImageMode: normalizeReferenceImageMode(body.referenceImageMode),
    referenceImages: normalizedReferenceImages,
    outputFormat: normalizeOutputFormat(body.outputFormat || body.output_format),
    // 清晰度三档：1K = 仅基础渲染；2K/4K = 基础渲染后再自动精修放大到该分辨率。
    // 默认 1K（最快、最省），未知值同样归一到 1K。
    imageSize: body.imageSize === '4K' ? '4K' as const : body.imageSize === '2K' ? '2K' as const : '1K' as const,
    retrievalSetting: hasUploadedReference ? ('none' as const) : normalizeRetrievalSetting(body.retrievalSetting),
    manualReferenceIds: hasUploadedReference ? [] : normalizeManualReferenceIds(body.manualReferenceIds || []),
  }
  const apiKey = selectApiKey(normalizedBodyWithSecrets.provider, normalizedBodyWithSecrets.apiKeys)
  if (!apiKey) {
    return fail(`Missing API key for provider ${normalizedBodyWithSecrets.provider}`, 400)
  }

  const normalizedBody = toCreateExecutionBody(normalizedBodyWithSecrets)
  const reservation = jobAdmission.reserve(jobAdmissionPrincipal(normalizedBody, ctx))
  if (!reservation.ok) return fail(reservation.error, reservation.code)
  let committed = false

  try {
    try {
      await verifyUploadedReferenceObjects(normalizedReferenceImages)
    } catch (error: any) {
      return fail(error?.message || String(error), Number(error?.statusCode || 503))
    }
    const modeResolution = await resolveReferenceImageMode(normalizedBody)
    if (modeResolution.error) {
      return fail(modeResolution.error, 400)
    }
    const jobBody = {
      ...normalizedBody,
      referenceImageMode: modeResolution.referenceImageMode,
      referenceImageModeUsed: modeResolution.referenceImageModeUsed,
    }

  const now = new Date()
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const safeNumCandidates = clamp(Number(body.numCandidates || 1), 1, Number(process.env.PAPERBANANA_MAX_CANDIDATES || 3))
  const safeCriticRounds = clamp(Number(body.maxCriticRounds || 1), 0, Number(process.env.PAPERBANANA_MAX_CRITIC_ROUNDS || 2))

  const record = {
    _id: jobId,
    status: 'queued' as JobStatus,
    provider: normalizedBody.provider,
    configurationMode: limitText(normalizedBody.configurationMode, 40) || 'advanced',
    taskName: normalizedBody.taskName,
    userId: normalizedBody.userId || '',
    userEmail: normalizedBody.userEmail || '',
    methodContent: normalizedBody.methodContent,
    caption: normalizedBody.caption,
    infographicCategory: normalizedBody.infographicCategory,
    mainModelName: normalizedBody.mainModelName,
    imageModelName: normalizedBody.imageModelName,
    referenceVisionModelName: normalizedBody.referenceVisionModelName,
    referenceImageMode: jobBody.referenceImageMode,
    referenceImageModeUsed: jobBody.referenceImageModeUsed,
    referenceImages: normalizedBody.referenceImages,
    outputFormat: normalizedBody.outputFormat,
    pipelineMode: normalizedBody.pipelineMode || 'planner_critic',
    retrievalSetting: normalizedBody.retrievalSetting,
    manualReferenceIds: normalizedBody.manualReferenceIds,
    retrievedReferenceIds: [],
    retrievedReferences: [],
    stages: [],
    criticMode: normalizedBody.outputFormat === 'svg' ? 'text' : 'image',
    aspectRatio: normalizedBody.aspectRatio || '16:9',
    imageSize: normalizedBody.imageSize,
    numCandidates: safeNumCandidates,
    maxCriticRounds: safeCriticRounds,
    promptCharCount: normalizedBody.methodContent.length + normalizedBody.caption.length,
    resultImages: [],
    logs: [],
    error: '',
    clientIp: getClientIp(ctx),
    userAgent: ctx.headers?.['user-agent'] || '',
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
  }

    await jobs.insertOne(record)

    // BYOK 只把已选中的单个 key 作为独立参数交给后台执行；jobBody 已移除
    // 完整 apiKeys map，避免其它 provider key 被后台 Promise/DTO 继续持有。
    startCreateJobInBackground(reservation, jobId, jobBody, apiKey, safeNumCandidates, safeCriticRounds)
    committed = true

    return ok({ jobId, status: 'queued' })
  } finally {
    if (!committed) jobAdmission.cancel(reservation)
  }
}

async function refineImage(body: RefineImageBody, ctx: FunctionContext) {
  validateRefineBody(body)
  const normalizedBodyWithSecrets = {
    ...body,
    mainModelName: normalizeModelName(body.provider, body.mainModelName || body.imageModelName),
    imageModelName: normalizeModelName(body.provider, body.imageModelName),
    referenceVisionModelName: body.referenceVisionModelName
      ? normalizeModelName(body.provider, body.referenceVisionModelName)
      : undefined,
    aspectRatio: normalizeAspectRatio(body.aspectRatio),
    imageSize: body.imageSize === '4K' ? '4K' as const : '2K' as const,
  }
  const apiKey = selectApiKey(normalizedBodyWithSecrets.provider, normalizedBodyWithSecrets.apiKeys)
  if (!apiKey) {
    return fail(`Missing API key for provider ${normalizedBodyWithSecrets.provider}`, 400)
  }

  const normalizedBody = toRefineExecutionBody(normalizedBodyWithSecrets)
  const reservation = jobAdmission.reserve(jobAdmissionPrincipal(normalizedBody, ctx))
  if (!reservation.ok) return fail(reservation.error, reservation.code)
  let committed = false

  try {
    const now = new Date()
    const jobId = `refine-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const record = {
    _id: jobId,
    status: 'queued' as JobStatus,
    jobType: 'refine',
    provider: normalizedBody.provider,
    configurationMode: 'advanced',
    taskName: 'diagram',
    userId: normalizedBody.userId || '',
    userEmail: normalizedBody.userEmail || '',
    methodContent: normalizedBody.editInstruction,
    caption: 'Refine existing PaperBanana image',
    infographicCategory: '图片精修',
    mainModelName: normalizedBody.mainModelName,
    imageModelName: normalizedBody.imageModelName,
    referenceVisionModelName: normalizedBody.referenceVisionModelName || '',
    outputFormat: 'png',
    pipelineMode: 'refine',
    retrievalSetting: 'none',
    manualReferenceIds: [],
    retrievedReferenceIds: [],
    retrievedReferences: [],
    referenceImages: [],
    resultImages: [],
    stages: [],
    criticMode: 'image',
    aspectRatio: normalizedBody.aspectRatio,
    imageSize: normalizedBody.imageSize,
    numCandidates: 1,
    maxCriticRounds: 0,
    promptCharCount: normalizedBody.editInstruction.length,
    sourceImageUrl: limitText(normalizedBody.sourceImageUrl, 1200),
    sourceImageObjectKey: limitText(normalizedBody.sourceImageObjectKey, 300),
    logs: [],
    error: '',
    clientIp: getClientIp(ctx),
    userAgent: ctx.headers?.['user-agent'] || '',
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
  }

    await jobs.insertOne(record)

    startRefineJobInBackground(reservation, jobId, normalizedBody, apiKey)
    committed = true

    return ok({ jobId, status: 'queued' })
  } finally {
    if (!committed) jobAdmission.cancel(reservation)
  }
}

async function getJob(jobId: string) {
  if (!jobId) return fail('jobId is required', 400)
  const job = await jobs.findOne({ _id: jobId })
  if (!job) return fail('Job not found', 404)
  return ok({ job: await publicJob(job) })
}

async function adminJobs(body: AdminJobsBody) {
  const expected = process.env.ADMIN_TOKEN || ''
  if (!expected) return fail('Admin API disabled: ADMIN_TOKEN is not configured', 503)
  if (body.adminToken !== expected) return fail('Invalid admin token', 401)
  const limit = clamp(Number(body.limit || 50), 1, 200)
  const list = await jobs.find({}).sort({ createdAt: -1 }).limit(limit).toArray()
  return ok({ jobs: await Promise.all(list.map(publicJob)) })
}

async function submitFeedback(body: SubmitFeedbackBody, ctx: FunctionContext) {
  const message = String(body.message || '').trim()
  if (!message) return fail('message is required', 400)
  if (message.length > 2000) return fail('message exceeds 2000 characters', 400)

  const platform = normalizeFeedbackPlatform(body.platform)
  if (!platform) return fail('platform is required', 400)

  const clientIp = getClientIp(ctx) || 'unknown'
  const recentSince = new Date(Date.now() - feedbackRateLimitWindowMs)
  const recent = await feedback.find({ clientIp, createdAt: { $gte: recentSince } }).limit(feedbackRateLimitMax).toArray()
  if (recent.length >= feedbackRateLimitMax) {
    return fail('Feedback rate limit exceeded. Please try again later.', 429)
  }

  const now = new Date()
  const id = `feedback-${randomId()}`
  const record = {
    _id: id,
    message,
    category: normalizeFeedbackCategory(body.category),
    jobId: limitText(body.jobId, 120),
    platform,
    clientVersion: limitText(body.clientVersion, 80),
    contact: limitText(body.contact, 300),
    userId: limitText(body.userId, 120),
    userEmail: limitText(body.userEmail, 160),
    clientIp,
    userAgent: limitText(ctx.headers?.['user-agent'], 300),
    status: 'new',
    createdAt: now,
  }

  await feedback.insertOne(record)
  return ok({ ok: true, id })
}

async function adminFeedback(body: AdminFeedbackBody) {
  const expected = process.env.ADMIN_TOKEN || ''
  if (!expected) return fail('Admin API disabled: ADMIN_TOKEN is not configured', 503)
  if (body.adminToken !== expected) return fail('Invalid admin token', 401)
  const limit = clamp(Number(body.limit || 50), 1, 200)
  const status = limitText(body.status, 32)
  const query = status && status !== 'all' ? { status } : {}
  const list = await feedback.find(query).sort({ createdAt: -1 }).limit(limit).toArray()
  return ok({ feedback: list.map(publicFeedback) })
}

async function userJobs(body: UserJobsBody) {
  const userId = body.userId?.trim() || ''
  const userEmail = body.userEmail?.trim() || ''
  if (!userId && !userEmail) return fail('userId is required', 400)
  const limit = clamp(Number(body.limit || 50), 1, 200)
  const query = userId
    ? { $or: [{ userId }, { user_id: userId }] }
    : { $or: [{ userEmail }, { user_email: userEmail }] }
  const list = await jobs.find(query).sort({ createdAt: -1 }).limit(limit).toArray()
  return ok({ jobs: await Promise.all(list.map(publicJob)) })
}

// Account deletion (App Store guideline 5.1.1(v)). Only reachable through the
// auth-gateway (gatewayToken) or admin tooling (adminToken) — see
// identityScopedActions / requireTrustedCaller — because it trusts the
// caller-supplied userId/userEmail. The gateway has already re-authenticated the
// user (session + password) before forwarding this call.
//
// Scope: purge this user's business data. Generation jobs and feedback are hard
// deleted. Reference images in object storage are best-effort deleted (failures
// only logged, never block). Result images (`<jobId>/...`) are intentionally
// kept. Deletion of the Better Auth user/session lives in the gateway.
//
// Idempotent: deleteMany / deleteFile are safe to re-run, so the gateway can
// retry this action without leaving the account half-deleted.
async function deleteAccount(body: DeleteAccountBody) {
  const userId = String(body.userId || '').trim()
  const userEmail = String(body.userEmail || '').trim()
  if (!userId && !userEmail) return fail('userId or userEmail is required', 400)

  const jobIdConditions: any[] = []
  const feedbackIdConditions: any[] = []
  if (userId) {
    jobIdConditions.push({ userId }, { user_id: userId })
    feedbackIdConditions.push({ userId }, { user_id: userId })
  }
  if (userEmail) {
    jobIdConditions.push({ userEmail }, { user_email: userEmail })
    feedbackIdConditions.push({ userEmail }, { user_email: userEmail })
  }

  const jobsResult = await jobs.deleteMany({ $or: jobIdConditions })
  const feedbackResult = await feedback.deleteMany({ $or: feedbackIdConditions })

  // Best-effort purge of the user's uploaded reference images. They are stored
  // under references/<owner>/... where owner = sanitizePathPart(userId || userEmail
  // || 'anon') at upload time (see prepareReferenceUpload). We try both possible
  // owner prefixes. Any storage error is logged and swallowed so it never blocks
  // account deletion.
  const ownerPrefixes = new Set<string>()
  if (userId) ownerPrefixes.add(sanitizePathPart(userId))
  if (userEmail) ownerPrefixes.add(sanitizePathPart(userEmail))
  let deletedReferenceObjectCount = 0
  for (const owner of ownerPrefixes) {
    deletedReferenceObjectCount += await deleteReferenceObjectsForOwner(owner)
  }

  return ok({
    ok: true,
    deletedJobCount: jobsResult?.deletedCount || 0,
    deletedFeedbackCount: feedbackResult?.deletedCount || 0,
    deletedReferenceObjectCount,
  })
}

// List and delete every object under references/<owner>/. Pure best-effort:
// returns the number of objects deleted, logs and swallows all errors.
async function deleteReferenceObjectsForOwner(owner: string): Promise<number> {
  const prefix = `references/${owner}/`
  let deleted = 0
  try {
    const bucket = cloud.storage.bucket(bucketName)
    let continuationMarker: string | undefined
    // ListObjects is paginated (max 1000 keys); loop until the bucket reports
    // no more truncation.
    do {
      const listing: any = await bucket.listFiles({ Prefix: prefix, Marker: continuationMarker })
      const contents: any[] = listing?.Contents || []
      for (const object of contents) {
        const key = object?.Key
        if (!key) continue
        try {
          await bucket.deleteFile(key)
          deleted += 1
        } catch (error: any) {
          console.warn(`[deleteAccount] failed to delete reference object ${key}: ${error?.message || error}`)
        }
      }
      continuationMarker = listing?.IsTruncated
        ? (listing?.NextMarker || (contents.length ? contents[contents.length - 1]?.Key : undefined))
        : undefined
    } while (continuationMarker)
  } catch (error: any) {
    console.warn(`[deleteAccount] failed to list reference objects for ${prefix}: ${error?.message || error}`)
  }
  return deleted
}

async function resolveReferenceImageMode(body: CreateExecutionBody & { referenceImageMode: ReferenceImageMode }) {
  const requestedMode = body.referenceImageMode
  const hasReferences = Boolean((body.referenceImages || []).length)
  if (!hasReferences) {
    return {
      referenceImageMode: requestedMode,
      referenceImageModeUsed: 'none' as ReferenceImageModeUsed,
    }
  }

  if (requestedMode === 'vision_model') {
    return {
      referenceImageMode: requestedMode,
      referenceImageModeUsed: 'vision_model' as ReferenceImageModeUsed,
    }
  }

  const capability = await referenceModelCapability(body.provider, body.mainModelName)
  if (requestedMode === 'auto') {
    return {
      referenceImageMode: requestedMode,
      referenceImageModeUsed: capability.status === 'supported' ? 'main_model' as const : 'vision_model' as const,
      capability,
    }
  }

  if (capability.status === 'unsupported') {
    // Silent fallback: the user picked 主模型直读 but the main model is text-only.
    // Serve them via the independent vision model instead of failing the request.
    return {
      referenceImageMode: requestedMode,
      referenceImageModeUsed: 'vision_model' as ReferenceImageModeUsed,
      capability,
    }
  }

  return {
    referenceImageMode: requestedMode,
    referenceImageModeUsed: 'main_model' as ReferenceImageModeUsed,
    capability,
  }
}

function startCreateJobInBackground(
  reservation: { ok: true; id: number },
  jobId: string,
  body: CreateExecutionBody,
  apiKey: string,
  numCandidates: number,
  maxCriticRounds: number,
) {
  jobAdmission.commit(reservation, {
    jobId,
    kind: 'create',
    body,
    apiKey,
    numCandidates,
    maxCriticRounds,
  })
}

function startRefineJobInBackground(
  reservation: { ok: true; id: number },
  jobId: string,
  body: RefineExecutionBody,
  apiKey: string,
) {
  jobAdmission.commit(reservation, {
    jobId,
    kind: 'refine',
    body,
    apiKey,
  })
}

async function runJob(
  jobId: string,
  body: CreateExecutionBody,
  apiKey: string,
  numCandidates: number,
  maxCriticRounds: number,
) {
  await jobs.updateOne(
    { _id: jobId },
    { $set: { status: 'running', startedAt: new Date(), updatedAt: new Date() } },
  )

  const retrievedReferences = await resolveRetrievedReferences(body, apiKey)
  await jobs.updateOne(
    { _id: jobId },
    {
      $set: {
        retrievedReferenceIds: retrievedReferences.map((item) => item.id),
        retrievedReferences,
        updatedAt: new Date(),
      },
    },
  )
  if (retrievedReferences.length) {
    await appendLog(jobId, `Retrieved ${retrievedReferences.length} PaperBanana reference example${retrievedReferences.length > 1 ? 's' : ''}`)
  }

  let referenceAnalysis = ''
  let uploadedVisionInputs: VisionImageInput[] = []

  if ((body.referenceImages || []).length) {
    if (body.referenceImageModeUsed === 'main_model') {
      await appendLog(jobId, 'Reference mode: main model direct')
      uploadedVisionInputs = await buildVisionImageInputs(body.referenceImages || [], jobId)
    } else {
      await appendLog(jobId, 'Reference mode: independent vision model')
      referenceAnalysis = await analyzeReferenceImages(jobId, body, apiKey)
    }
  }

  const retrievalContext = buildRetrievalContext(retrievedReferences)
  const retrievedVisionInputs = await buildRetrievedVisionInputs(retrievedReferences)
  const referenceVisionInputs = [...uploadedVisionInputs, ...retrievedVisionInputs]
  const results: any[] = []
  const candidateIndexes = Array.from({ length: numCandidates }, (_, index) => index)
  const concurrency = clamp(Number(process.env.PAPERBANANA_CANDIDATE_CONCURRENCY || 1), 1, numCandidates)
  await runWithConcurrency(candidateIndexes, concurrency, async (i) => {
    const candidateNo = i + 1
    await appendLog(jobId, `Candidate ${candidateNo}: planning`)
    const result = await runCandidate(jobId, i, body, apiKey, maxCriticRounds, referenceAnalysis, retrievalContext, referenceVisionInputs, async (message) => {
      await appendLog(jobId, `Candidate ${candidateNo}: ${message}`)
    })
    await appendLog(jobId, `Candidate ${candidateNo}: saving result`)
    const saved = await saveResult(jobId, i, result.content, result.mimeType, result.encoding)
    results[i] = {
      candidateId: i,
      filename: saved.filename,
      url: saved.url,
      storage: saved.storage,
      mimeType: result.mimeType,
      description: result.description,
    }
  })

  await jobs.updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'succeeded',
        resultImages: results.filter(Boolean),
        referenceAnalysis,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  )
}

async function runCandidate(
  jobId: string,
  candidateId: number,
  body: CreateExecutionBody,
  apiKey: string,
  maxCriticRounds: number,
  referenceAnalysis = '',
  retrievalContext = '',
  referenceImages: VisionImageInput[] = [],
  logStage: (message: string) => Promise<void> = async () => {},
) {
  // Plot task: instead of calling an image model, generate matplotlib CODE and
  // render it via the external plot-worker. Keep the diagram path 100% intact.
  if (normalizeTaskName(body.taskName) === 'plot') {
    return await runPlotCandidate(jobId, candidateId, body, apiKey, maxCriticRounds, referenceAnalysis, retrievalContext, referenceImages, logStage)
  }

  if (normalizeOutputFormat(body.outputFormat) === 'svg') {
    const description = await buildVisualDescription(jobId, candidateId, body, apiKey, maxCriticRounds, referenceAnalysis, retrievalContext, referenceImages, true)
    await logStage('plan ready')
    await logStage('rendering SVG')
    const svgRenderStartedAt = new Date()
    const svg = await callSvgModel(body.provider, body.mainModelName, apiKey, description)
    const stageImage = await saveStageImage(jobId, candidateId, 'svg-final', svg, 'image/svg+xml', 'utf8')
    await recordStage(jobId, {
      candidateId,
      type: 'render',
      title: 'SVG 渲染',
      text: 'Final SVG rendered from the current visual description.',
      image: stageImage,
      startedAt: svgRenderStartedAt,
      completedAt: new Date(),
    })
    return { content: svg, encoding: 'utf8' as const, mimeType: 'image/svg+xml', description }
  }

  if ((body.pipelineMode || 'planner_critic') === 'vanilla') {
    const prompt = diagramPrompt(body.methodContent, body.caption, referenceAnalysis, retrievalContext)
    await recordStage(jobId, {
      candidateId,
      type: 'planner',
      title: '直出提示',
      text: prompt,
    })
    await logStage('rendering PNG')
    const vanillaRenderStartedAt = new Date()
    const base64 = await callImageModel(body.provider, body.imageModelName, apiKey, prompt, body.aspectRatio || '16:9', '', body.imageSize || '2K')
    const stageImage = await saveStageImage(jobId, candidateId, 'vanilla-render', base64, 'image/png', 'base64')
    await recordStage(jobId, {
      candidateId,
      type: 'render',
      title: '直出渲染',
      text: 'Initial image rendered without planner/stylist pipeline.',
      image: stageImage,
      startedAt: vanillaRenderStartedAt,
      completedAt: new Date(),
    })
    return { content: base64, encoding: 'base64' as const, mimeType: 'image/png', description: prompt }
  }

  let description = await buildVisualDescription(jobId, candidateId, body, apiKey, 0, referenceAnalysis, retrievalContext, referenceImages, false)
  await logStage('plan ready')
  let imagePrompt = diagramPromptFromDescription(description)
  await logStage('rendering PNG')
  const initialRenderStartedAt = new Date()
  let base64 = await callImageModel(body.provider, body.imageModelName, apiKey, imagePrompt, body.aspectRatio || '16:9', '', body.imageSize || '2K')
  let stageImage = await saveStageImage(jobId, candidateId, 'render-0', base64, 'image/png', 'base64')
  await recordStage(jobId, {
    candidateId,
    type: 'render',
    title: '初次渲染',
    text: imagePrompt,
    image: stageImage,
    startedAt: initialRenderStartedAt,
    completedAt: new Date(),
  })

  // Track the last image+description that rendered successfully so we can roll
  // back if a critic re-render throws (mirrors paperviz_processor.py rollback).
  let lastGoodImage = base64
  let lastGoodDescription = description

  for (let round = 1; round <= maxCriticRounds; round += 1) {
    await logStage(`critic round ${round}`)
    const criticStartedAt = new Date()
    const critique = await critiqueRenderedDiagram(body, apiKey, description, base64, referenceAnalysis, retrievalContext)
    const decision = criticDecision(critique, description)
    const noChanges = decision.noChanges
    await recordStage(jobId, {
      candidateId,
      type: 'critic',
      title: `图像评审（第${round}轮）`,
      round,
      text: critique,
      suggestion: noChanges ? '' : critique,
      image: stageImage,
      startedAt: criticStartedAt,
      completedAt: new Date(),
    })
    if (noChanges) break

    description = decision.description
    imagePrompt = diagramPromptFromDescription(description)
    await logStage(`rerender round ${round}`)
    const rerenderStartedAt = new Date()
    try {
      base64 = await callImageModel(body.provider, body.imageModelName, apiKey, imagePrompt, body.aspectRatio || '16:9', '', body.imageSize || '2K')
      stageImage = await saveStageImage(jobId, candidateId, `render-${round}`, base64, 'image/png', 'base64')
      await recordStage(jobId, {
        candidateId,
        type: 'render',
        title: `重渲染（第${round}轮）`,
        round,
        text: imagePrompt,
        image: stageImage,
        startedAt: rerenderStartedAt,
        completedAt: new Date(),
      })
      lastGoodImage = base64
      lastGoodDescription = description
    } catch (error: any) {
      // Re-render failed this round: roll back to the last successful
      // image+description and stop the loop rather than failing the candidate.
      const message = error?.message || String(error)
      await logStage(`rerender round ${round} failed, rolling back: ${message}`)
      await recordStage(jobId, {
        candidateId,
        type: 'render',
        title: `重渲染（第${round}轮，已回滚）`,
        round,
        text: imagePrompt,
        startedAt: rerenderStartedAt,
        completedAt: new Date(),
        error: message,
      })
      base64 = lastGoodImage
      description = lastGoodDescription
      break
    }
  }

  // 清晰度驱动的自动精修：1K 仅基础渲染；2K/4K 在 PNG 图（非 SVG）最终图上再跑一遍
  // 升清放大。失败时 enhanceCandidateToResolution 内部已回退到基础图。
  if (body.imageSize === '2K' || body.imageSize === '4K') {
    base64 = await enhanceCandidateToResolution(jobId, candidateId, body, apiKey, base64, description, body.imageSize, logStage)
  }

  return { content: base64, encoding: 'base64' as const, mimeType: 'image/png', description }
}

// Plot candidate: planner(plot) -> optional stylist(plot) -> matplotlib code via
// the visualizer prompt -> render via the external plot-worker. Then the SAME
// image-critic loop as the diagram path, but using the PLOT critic, the
// worker-rendered PNG as the inspected image, and re-rendering the matplotlib
// code from the revised description on each "revise". When the worker returns
// a code error, the critic is fed via the [SYSTEM NOTICE] failure path so it
// revises the code (mirrors critic_agent.py + PLOT_CRITIC failure section).
async function runPlotCandidate(
  jobId: string,
  candidateId: number,
  body: CreateExecutionBody,
  apiKey: string,
  maxCriticRounds: number,
  referenceAnalysis = '',
  retrievalContext = '',
  referenceImages: VisionImageInput[] = [],
  logStage: (message: string) => Promise<void> = async () => {},
) {
  let description = await buildPlotDescription(jobId, candidateId, body, apiKey, referenceAnalysis, retrievalContext, referenceImages)
  await logStage('plan ready')

  // Generate the matplotlib code from the plot description and render it.
  await logStage('generating matplotlib code')
  let code = await generatePlotCode(body, apiKey, description)
  await logStage('rendering plot via worker')
  let renderStartedAt = new Date()
  let rendered = await renderPlotViaWorker(code)
  let stageImage = rendered.base64
    ? await saveStageImage(jobId, candidateId, 'plot-render-0', rendered.base64, 'image/png', 'base64')
    : null
  await recordStage(jobId, {
    candidateId,
    type: 'render',
    title: '统计图初次渲染',
    text: code,
    image: stageImage,
    startedAt: renderStartedAt,
    completedAt: new Date(),
    error: rendered.error,
  })

  // Track the last image+description+code that rendered successfully so we can
  // roll back if a critic re-render throws (mirrors the diagram rollback).
  let base64 = rendered.base64
  let lastGoodImage = rendered.base64
  let lastGoodDescription = description
  let lastGoodCode = code

  for (let round = 1; round <= maxCriticRounds; round += 1) {
    await logStage(`plot critic round ${round}`)
    const criticStartedAt = new Date()
    const critique = await critiqueRenderedPlot(body, apiKey, description, base64, rendered.error, referenceAnalysis, retrievalContext)
    const decision = criticDecision(critique, description)
    const noChanges = decision.noChanges
    await recordStage(jobId, {
      candidateId,
      type: 'critic',
      title: `统计图评审（第${round}轮）`,
      round,
      text: critique,
      suggestion: noChanges ? '' : critique,
      image: stageImage,
      startedAt: criticStartedAt,
      completedAt: new Date(),
    })
    // Only stop when the critic signals "no changes" AND we already have a
    // valid image. If the current render failed, keep iterating so the critic
    // can repair the code via the failure path.
    if (noChanges && base64) break

    description = decision.description
    await logStage(`regenerating matplotlib code round ${round}`)
    renderStartedAt = new Date()
    try {
      code = await generatePlotCode(body, apiKey, description)
      rendered = await renderPlotViaWorker(code)
      if (rendered.error || !rendered.base64) {
        // Worker rejected the code this round. Record the failure and let the
        // next critic round see it via the [SYSTEM NOTICE] path. Keep the last
        // good image as the candidate result if we have one.
        await logStage(`plot render round ${round} failed: ${rendered.error || 'no image'}`)
        await recordStage(jobId, {
          candidateId,
          type: 'render',
          title: `统计图重渲染（第${round}轮，失败）`,
          round,
          text: code,
          startedAt: renderStartedAt,
          completedAt: new Date(),
          error: rendered.error || 'plot-worker returned no image',
        })
        base64 = ''
        continue
      }
      stageImage = await saveStageImage(jobId, candidateId, `plot-render-${round}`, rendered.base64, 'image/png', 'base64')
      await recordStage(jobId, {
        candidateId,
        type: 'render',
        title: `统计图重渲染（第${round}轮）`,
        round,
        text: code,
        image: stageImage,
        startedAt: renderStartedAt,
        completedAt: new Date(),
      })
      base64 = rendered.base64
      lastGoodImage = rendered.base64
      lastGoodDescription = description
      lastGoodCode = code
    } catch (error: any) {
      const message = error?.message || String(error)
      await logStage(`plot rerender round ${round} failed, rolling back: ${message}`)
      await recordStage(jobId, {
        candidateId,
        type: 'render',
        title: `统计图重渲染（第${round}轮，已回滚）`,
        round,
        text: code,
        startedAt: renderStartedAt,
        completedAt: new Date(),
        error: message,
      })
      base64 = lastGoodImage
      description = lastGoodDescription
      code = lastGoodCode
      break
    }
  }

  // Fall back to the last good image if the final round left us without one.
  if (!base64) base64 = lastGoodImage
  if (!base64) {
    throw new Error(`Plot generation failed: the plot-worker could not render the matplotlib code${rendered.error ? ` (${rendered.error})` : ''}`)
  }

  // 清晰度驱动的自动精修（plot）：仅对支持图生图的 provider 做"像素级升清"——把
  // plot-worker 渲染出的 PNG 直接放大；不支持图生图的 provider 跳过（避免用图描述
  // 重画统计图导致内容失真）。1K 不做额外处理。
  if ((body.imageSize === '2K' || body.imageSize === '4K') && providerSupportsImageEdit(body.provider)) {
    base64 = await enhanceCandidateToResolution(jobId, candidateId, body, apiKey, base64, description, body.imageSize, logStage)
  }

  return { content: base64, encoding: 'base64' as const, mimeType: 'image/png', description }
}

// 清晰度驱动的自动精修放大。在 2K/4K 模式下，基础候选图渲染完成后再跑一遍
// "升清"：能做图生图的 provider（gemini/openrouter/openai）直接以基础图为输入做
// 高清重绘（保内容、保排版、保文字、保配色，仅提升清晰度与分辨率）；不支持图生图
// 的 provider（bailian）则用既有的最终描述以更大尺寸重渲染一次。
//
// 该步永远不能让整个候选失败：任何错误都回退到 baseBase64 并记录日志。返回值是新的
// base64（成功）或 baseBase64（失败回退）。
async function enhanceCandidateToResolution(
  jobId: string,
  candidateId: number,
  body: CreateExecutionBody,
  apiKey: string,
  baseBase64: string,
  baseDescription: string,
  targetSize: string,
  logStage: (message: string) => Promise<void> = async () => {},
): Promise<string> {
  const startedAt = new Date()
  try {
    await logStage(`enhancing candidate to ${targetSize}`)
    let upscaled: string
    if (providerSupportsImageEdit(body.provider)) {
      // 图生图升清：把基础图作为源图直接交给图像模型，只让它提升清晰度/分辨率。
      const editPrompt = refineEditPrompt(
        'Upscale and sharpen this academic diagram; preserve ALL content, text, layout and colors exactly — only increase resolution and crispness.',
        targetSize,
      )
      upscaled = await callImageModel(
        body.provider,
        body.imageModelName,
        apiKey,
        editPrompt,
        body.aspectRatio || '16:9',
        'data:image/png;base64,' + baseBase64,
        targetSize,
      )
    } else {
      // 无图生图能力（bailian）：用最终描述以更大的安全尺寸重渲染一次。
      upscaled = await callImageModel(
        body.provider,
        body.imageModelName,
        apiKey,
        diagramPromptFromDescription(baseDescription),
        body.aspectRatio || '16:9',
        '',
        targetSize,
      )
    }
    if (!upscaled) throw new Error('enhance pass returned no image data')
    const stageImage = await saveStageImage(jobId, candidateId, `enhance-${targetSize}`, upscaled, 'image/png', 'base64')
    await recordStage(jobId, {
      candidateId,
      type: 'render',
      title: `精修放大（${targetSize}）`,
      text: `Auto-enhance pass to reach ${targetSize} resolution.`,
      image: stageImage,
      startedAt,
      completedAt: new Date(),
    })
    return upscaled
  } catch (error: any) {
    // 升清失败绝不连累整张候选图：回退到基础图并记录。
    const message = error?.message || String(error)
    await logStage(`enhance to ${targetSize} failed, keeping base image: ${message}`)
    await recordStage(jobId, {
      candidateId,
      type: 'render',
      title: `精修放大（${targetSize}，已回退）`,
      text: `Auto-enhance pass to reach ${targetSize} resolution.`,
      startedAt,
      completedAt: new Date(),
      error: message,
    })
    return baseBase64
  }
}

// Plot planner(+optional stylist). Mirrors buildVisualDescription's structure
// but uses the PLOT_* prompts ported from the root agents. No text-critic here;
// the plot critic operates on the rendered image inside runPlotCandidate.
async function buildPlotDescription(
  jobId: string,
  candidateId: number,
  body: CreateExecutionBody,
  apiKey: string,
  referenceAnalysis = '',
  retrievalContext = '',
  referenceImages: VisionImageInput[] = [],
) {
  const hasReferenceImages = referenceImages.length > 0
  const plannerStartedAt = new Date()
  const planner = await callTextModel(
    body.provider,
    body.mainModelName,
    apiKey,
    plotPlannerSystemPrompt(),
    plotPlannerUserPrompt(body.methodContent, body.caption, referenceAnalysis, retrievalContext, hasReferenceImages),
    referenceImages,
  )
  await recordStage(jobId, {
    candidateId,
    type: 'planner',
    title: '统计图规划',
    text: planner,
    startedAt: plannerStartedAt,
    completedAt: new Date(),
  })

  let description = planner

  if ((body.pipelineMode || 'planner_critic') === 'full') {
    const stylistStartedAt = new Date()
    description = await callTextModel(
      body.provider,
      body.mainModelName,
      apiKey,
      plotStylistSystemPrompt(),
      plotStylistUserPrompt(body.methodContent, body.caption, planner, referenceAnalysis, retrievalContext, hasReferenceImages),
    )
    await recordStage(jobId, {
      candidateId,
      type: 'stylist',
      title: '统计图风格',
      text: description,
      startedAt: stylistStartedAt,
      completedAt: new Date(),
    })
  }

  return description
}

// Turn a plot description into self-contained matplotlib code (visualizer).
async function generatePlotCode(body: CreateExecutionBody, apiKey: string, description: string) {
  const raw = await callTextModel(
    body.provider,
    body.mainModelName,
    apiKey,
    plotVisualizerSystemPrompt(),
    plotVisualizerUserPrompt(description),
  )
  return extractPythonCode(raw)
}

// Strip Markdown fences and any prose so the worker receives runnable code.
function extractPythonCode(raw: string) {
  const text = String(raw || '').trim()
  const fenced = text.match(/```(?:python)?\s*([\s\S]*?)```/i)
  if (fenced && fenced[1].trim()) return fenced[1].trim()
  return text
}

// POST the matplotlib code to the external plot-worker, which executes it in a
// sandbox and returns a base64 PNG of the produced figure.
async function renderPlotViaWorker(code: string): Promise<{ base64: string; error: string }> {
  const workerUrl = String(process.env.PLOT_WORKER_URL || '').trim()
  if (!workerUrl) {
    throw new Error('Plot rendering is not configured: PLOT_WORKER_URL is unset')
  }
  if (!code || !code.trim()) {
    return { base64: '', error: 'No matplotlib code was generated' }
  }
  const endpoint = `${workerUrl.replace(/\/+$/, '')}/render`
  let response: Response
  // Hard client-side timeout (~28s, just above the worker's 20s wall clock).
  // Do NOT use fetchWithRetry here: a wedged worker would otherwise block Laf
  // indefinitely (it retries x2, after a paid LLM call per critic round x
  // candidate). We bound the wait with Promise.race rather than AbortController
  // because the Laf runtime does not expose a global AbortController. On timeout
  // we return an error so the critic loop reacts instead of hanging.
  let timer: any
  try {
    response = await Promise.race([
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, token: process.env.PLOT_WORKER_TOKEN || '' }),
      }),
      new Promise<Response>((_, reject) => {
        timer = setTimeout(() => reject(new Error('plot-worker timed out')), 28000)
      }),
    ])
  } catch (error: any) {
    return { base64: '', error: error?.message || String(error) }
  } finally {
    clearTimeout(timer)
  }
  let data: any
  try {
    data = await parseModelResponse(response)
  } catch (error: any) {
    return { base64: '', error: error?.message || String(error) }
  }
  const base64 = String(data?.image_base64 || '').trim()
  if (data?.ok && base64) return { base64, error: '' }
  return { base64, error: String(data?.error || (base64 ? '' : 'plot-worker returned no image')) }
}

// Admin-only diagnostic: render a trivial matplotlib snippet through the
// plot-worker to verify the Laf -> worker network path, token, and rendering
// without needing a BYOK key. Returns whether a PNG came back.
async function pingPlotWorker(body: any) {
  const expected = process.env.ADMIN_TOKEN || ''
  if (!expected) return fail('Admin API disabled: ADMIN_TOKEN is not configured', 503)
  if (!body || body.adminToken !== expected) return fail('Invalid admin token', 401)
  const code = typeof body.code === 'string' && body.code.trim()
    ? body.code
    : "import matplotlib.pyplot as plt\nfig, ax = plt.subplots()\nax.plot([1, 2, 3], [2, 3, 1], marker='o')\nax.set_title('plot-worker ping')"
  const workerUrl = String(process.env.PLOT_WORKER_URL || '').trim()
  const startedAt = Date.now()
  try {
    const { base64, error } = await renderPlotViaWorker(code)
    return ok({
      workerUrl,
      ok: Boolean(base64),
      base64Length: base64.length,
      error,
      ms: Date.now() - startedAt,
    })
  } catch (error: any) {
    return ok({ workerUrl, ok: false, base64Length: 0, error: error?.message || String(error), ms: Date.now() - startedAt })
  }
}

// Plot critic: same image-critic loop shape as critiqueRenderedDiagram, but uses
// the PLOT critic rubric and routes a worker render error into the [SYSTEM
// NOTICE] failure path so the critic repairs the code (mirrors critic_agent.py).
async function critiqueRenderedPlot(
  body: CreateExecutionBody,
  apiKey: string,
  description: string,
  imageBase64: string,
  renderError = '',
  referenceAnalysis = '',
  retrievalContext = '',
) {
  const hasImage = typeof imageBase64 === 'string' && imageBase64.trim().length > 100
  if (!hasImage) {
    const notice = renderError
      ? `[SYSTEM NOTICE] The plot image could not be generated based on the current description (likely due to invalid code). Worker error: ${renderError}. Please check the description for errors (e.g., syntax issues, missing data) and provide a revised, simplified, and robust version.`
      : '[SYSTEM NOTICE] The plot image could not be generated based on the current description (likely due to invalid code). Please check the description for errors (e.g., syntax issues, missing data) and provide a revised, simplified, and robust version.'
    return await callTextModel(
      body.provider,
      body.mainModelName,
      apiKey,
      plotCriticSystemPrompt(),
      [
        notice,
        '',
        plotCriticUserPrompt(body.methodContent, body.caption, description, referenceAnalysis, retrievalContext),
      ].join('\n'),
    )
  }
  return await callTextModel(
    body.provider,
    body.mainModelName,
    apiKey,
    plotCriticSystemPrompt(),
    plotCriticUserPrompt(body.methodContent, body.caption, description, referenceAnalysis, retrievalContext),
    [{ filename: 'candidate.png', mimeType: 'image/png', url: `data:image/png;base64,${imageBase64}` }],
  )
}

async function buildVisualDescription(
  jobId: string,
  candidateId: number,
  body: CreateExecutionBody,
  apiKey: string,
  textCriticRounds: number,
  referenceAnalysis = '',
  retrievalContext = '',
  referenceImages: VisionImageInput[] = [],
  includeTextCritic = false,
) {
  if ((body.pipelineMode || 'planner_critic') === 'vanilla') {
    return withRetrievalContext(withReferenceAnalysis(
      `Create an academic method diagram for this methodology:\n${body.methodContent}\n\nVisual intent:\n${body.caption}`,
      referenceAnalysis,
    ), retrievalContext)
  }

  const infographicCategory = limitText(body.infographicCategory, 80)
  const hasReferenceImages = referenceImages.length > 0
  const plannerStartedAt = new Date()
  const planner = await callTextModel(
    body.provider,
    body.mainModelName,
    apiKey,
    plannerSystemPrompt(),
    plannerUserPrompt(body.methodContent, body.caption, referenceAnalysis, retrievalContext, infographicCategory, hasReferenceImages),
    referenceImages,
  )
  await recordStage(jobId, {
    candidateId,
    type: 'planner',
    title: '规划',
    text: planner,
    startedAt: plannerStartedAt,
    completedAt: new Date(),
  })

  let description = planner

  if ((body.pipelineMode || 'planner_critic') === 'full') {
    const stylistStartedAt = new Date()
    description = await callTextModel(
      body.provider,
      body.mainModelName,
      apiKey,
      stylistSystemPrompt(),
      stylistUserPrompt(body.methodContent, body.caption, planner, referenceAnalysis, retrievalContext, infographicCategory, hasReferenceImages),
    )
    await recordStage(jobId, {
      candidateId,
      type: 'stylist',
      title: '风格',
      text: description,
      startedAt: stylistStartedAt,
      completedAt: new Date(),
    })
  }

  if (!includeTextCritic) return description

  for (let round = 1; round <= textCriticRounds; round += 1) {
    const criticStartedAt = new Date()
    const critique = await callTextModel(
      body.provider,
      body.mainModelName,
      apiKey,
      criticSystemPrompt(),
      criticUserPrompt(body.methodContent, body.caption, description, referenceAnalysis, retrievalContext),
    )
    const decision = criticDecision(critique, description)
    const noChanges = decision.noChanges
    await recordStage(jobId, {
      candidateId,
      type: 'critic',
      title: `文本评审（第${round}轮）`,
      round,
      text: critique,
      suggestion: noChanges ? '' : critique,
      startedAt: criticStartedAt,
      completedAt: new Date(),
    })
    if (noChanges) break
    description = decision.description
  }

  return description
}

async function runRefineJob(jobId: string, body: RefineExecutionBody, apiKey: string) {
  await jobs.updateOne(
    { _id: jobId },
    { $set: { status: 'running', startedAt: new Date(), updatedAt: new Date() } },
  )

  const sourceUrl = await resolveSourceImageUrl(body)
  const sourceImage = {
    filename: 'source-image',
    mimeType: inferMimeTypeFromUrl(sourceUrl),
    url: sourceUrl,
  }

  let base64: string
  let description: string

  if (providerSupportsImageEdit(body.provider)) {
    // True image-to-image: forward the source image bytes directly to the
    // image model so it edits the actual pixels (mirrors polish_agent.py).
    await appendLog(jobId, 'Refine: editing source image (image-to-image)')
    const editPrompt = refineEditPrompt(body.editInstruction, body.imageSize || '2K')
    description = editPrompt
    const renderStartedAt = new Date()
    base64 = await callImageModel(body.provider, body.imageModelName, apiKey, editPrompt, body.aspectRatio || '16:9', sourceUrl)
    const stageImage = await saveStageImage(jobId, 0, 'refine-render', base64, 'image/png', 'base64')
    await recordStage(jobId, {
      candidateId: 0,
      type: 'render',
      title: '精修渲染',
      text: body.editInstruction,
      image: stageImage,
      startedAt: renderStartedAt,
      completedAt: new Date(),
    })
  } else {
    // Fallback for providers without image-edit support: describe the source
    // image, then regenerate from the description.
    await appendLog(jobId, 'Refine: analyzing source image')
    const planStartedAt = new Date()
    // This analysis step reads the source image as a CHAT/VISION request — it
    // must NEVER use the image-gen model (DashScope rejects image-gen models as
    // chat models). Prefer the explicit vision model, then the main chat model.
    // For bailian the existing toBailianImageUrl + isBailianImageContentError
    // fallback to qwen-vl in callTextModel handles the image read.
    description = await callTextModel(
      body.provider,
      body.referenceVisionModelName || body.mainModelName,
      apiKey,
      refineSystemPrompt(),
      refineUserPrompt(body.editInstruction, body.imageSize || '2K'),
      [sourceImage],
    )
    await recordStage(jobId, {
      candidateId: 0,
      type: 'planner',
      title: '精修规划',
      text: description,
      startedAt: planStartedAt,
      completedAt: new Date(),
    })

    await appendLog(jobId, 'Refine: rendering edited image')
    const renderStartedAt = new Date()
    base64 = await callImageModel(body.provider, body.imageModelName, apiKey, diagramPromptFromDescription(description), body.aspectRatio || '16:9')
    const stageImage = await saveStageImage(jobId, 0, 'refine-render', base64, 'image/png', 'base64')
    await recordStage(jobId, {
      candidateId: 0,
      type: 'render',
      title: '精修渲染',
      text: body.editInstruction,
      image: stageImage,
      startedAt: renderStartedAt,
      completedAt: new Date(),
    })
  }

  const saved = await saveResult(jobId, 0, base64, 'image/png', 'base64')
  await jobs.updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'succeeded',
        resultImages: [{
          candidateId: 0,
          filename: saved.filename,
          url: saved.url,
          storage: saved.storage,
          mimeType: 'image/png',
          description,
        }],
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  )
}

async function resolveRetrievedReferences(body: CreateExecutionBody, apiKey: string): Promise<RetrievedReference[]> {
  const setting = normalizeRetrievalSetting(body.retrievalSetting)
  if (setting === 'none') return []

  const taskName = normalizeTaskName(body.taskName)
  const library = await loadReferenceLibrary(taskName, { limit: 200 })
  if (!library.length) return []

  if (setting === 'manual') {
    const ids = new Set(normalizeManualReferenceIds(body.manualReferenceIds || []))
    return library.filter((item) => ids.has(item.id)).slice(0, 10)
  }

  if (setting === 'random') {
    return shuffle(library).slice(0, 10)
  }

  const selectedIds = await autoSelectReferenceIds(body, apiKey, library)
  const selected = selectedIds
    .map((id) => library.find((item) => item.id === id))
    .filter(Boolean) as RetrievedReference[]
  // On an empty/garbled auto result, return no references rather than dumping
  // the entire library (which would flood the prompt with irrelevant context).
  return selected.slice(0, 10)
}

async function autoSelectReferenceIds(body: CreateExecutionBody, apiKey: string, library: RetrievedReference[]) {
  const candidates = library.slice(0, 200).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary.slice(0, 1500),
  }))
  const raw = await callTextModel(
    body.provider,
    body.mainModelName,
    apiKey,
    retrievalSystemPrompt(),
    retrievalUserPrompt(body.methodContent, body.caption, candidates),
  )
  const ids = parseReferenceIds(raw)
  return ids.filter((id: string) => library.some((item: RetrievedReference) => item.id === id)).slice(0, 10)
}

async function loadReferenceLibrary(taskName: TaskName, options: { limit: number }): Promise<RetrievedReference[]> {
  const limit = clamp(Number(options.limit || 24), 1, 200)
  const rows = await references.find({ taskName }).sort({ createdAt: -1, _id: 1 }).limit(limit).toArray()
  const normalizedRows = await Promise.all(rows.map(normalizeStoredReference))
  const fallback = fallbackReferences.filter((item) => item.taskName === taskName)
  const seen = new Set(normalizedRows.map((item) => item.id))
  return [
    ...normalizedRows,
    ...fallback.filter((item) => !seen.has(item.id)),
  ].slice(0, limit)
}

async function normalizeStoredReference(item: any): Promise<RetrievedReference> {
  const imageObjectKey = item.imageObjectKey || item.image_object_key || item.objectKey || ''
  // Always re-sign from the object key so seeded references never serve a stale
  // (expired) presigned URL; fall back to a stored direct URL only when there is
  // no object key (e.g. external http reference links).
  let imageUrl = ''
  if (imageObjectKey) {
    try {
      imageUrl = await cloud.storage.bucket(bucketName).getDownloadUrl(imageObjectKey, 3600 * 24 * 7)
    } catch {
      imageUrl = ''
    }
  }
  if (!imageUrl) imageUrl = item.imageUrl || item.image_url || item.url || ''
  return {
    id: String(item._id || item.id || ''),
    taskName: normalizeTaskName(item.taskName || item.task_name),
    title: limitText(item.title || item.visualIntent || item.caption || item.id, 160),
    summary: limitText(item.summary || item.methodExcerpt || item.content || item.description, 1200),
    imageUrl,
    imageObjectKey,
    source: limitText(item.source, 80) || 'paperbanana-bench',
  }
}

async function buildRetrievedVisionInputs(items: RetrievedReference[]) {
  const inputs: VisionImageInput[] = []
  for (const item of items) {
    let url = item.imageUrl
    if (!url && item.imageObjectKey) {
      try {
        url = await cloud.storage.bucket(bucketName).getDownloadUrl(item.imageObjectKey, 3600)
      } catch {
        url = ''
      }
    }
    if (!url) continue
    inputs.push({
      filename: `${item.id}.png`,
      mimeType: inferMimeTypeFromUrl(url),
      url,
      objectKey: item.imageObjectKey || undefined,
    })
  }
  return inputs
}

function buildRetrievalContext(items: RetrievedReference[]) {
  if (!items.length) return ''
  return items.map((item, index) => [
    `Reference ${index + 1} (${item.id}): ${item.title}`,
    item.summary,
  ].filter(Boolean).join('\n')).join('\n\n')
}

async function critiqueRenderedDiagram(
  body: CreateExecutionBody,
  apiKey: string,
  description: string,
  imageBase64: string,
  referenceAnalysis = '',
  retrievalContext = '',
) {
  // If the rendered image is missing or effectively empty, degrade to a
  // text-only critique and inject a SYSTEM NOTICE instead of sending an empty
  // image (mirrors critic_agent.py's text-only fallback).
  const hasImage = typeof imageBase64 === 'string' && imageBase64.trim().length > 100
  if (!hasImage) {
    return await callTextModel(
      body.provider,
      body.mainModelName,
      apiKey,
      imageCriticSystemPrompt(),
      [
        '[SYSTEM NOTICE] The diagram image could not be generated based on the current description. Check the description for errors and revise it.',
        '',
        imageCriticUserPrompt(body.methodContent, body.caption, description, referenceAnalysis, retrievalContext),
      ].join('\n'),
    )
  }
  return await callTextModel(
    body.provider,
    body.mainModelName,
    apiKey,
    imageCriticSystemPrompt(),
    imageCriticUserPrompt(body.methodContent, body.caption, description, referenceAnalysis, retrievalContext),
    [{ filename: 'candidate.png', mimeType: 'image/png', url: `data:image/png;base64,${imageBase64}` }],
  )
}

// The critic agents return strict JSON {critic_suggestions, revised_description}
// where revised_description === 'No changes needed.' (or empty) means "stop,
// keep the current description". We parse that contract here while remaining
// backward-compatible with plain-text critic responses.
function isNoChangesSignal(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return true
  return /^no changes? needed\.?$/i.test(trimmed)
}

function criticDecision(critique: string, previous: string): { noChanges: boolean; description: string } {
  const trimmed = String(critique || '').trim()
  if (!trimmed) return { noChanges: true, description: previous }

  const json = parseJsonObject(trimmed)
  if (json && typeof json === 'object') {
    // Read the revised description under any of the supported key spellings.
    const revisedRaw =
      json.revised_description ?? json.revisedDescription ?? json.description
    if (revisedRaw !== undefined && revisedRaw !== null) {
      const revised = String(revisedRaw)
      // Only the revised_description field carries the stop signal; the
      // critic_suggestions field legitimately holds prose that may mention
      // changes even when the revision is "No changes needed.".
      if (isNoChangesSignal(revised)) return { noChanges: true, description: previous }
      return { noChanges: false, description: revised }
    }
  }

  // Backward-compat: plain-text critic response (no JSON / no revised field).
  if (/no changes needed/i.test(trimmed)) return { noChanges: true, description: previous }
  return { noChanges: false, description: trimmed }
}

function extractRevisedDescription(critique: string, previous: string) {
  return criticDecision(critique, previous).description
}

async function analyzeReferenceImages(jobId: string, body: CreateExecutionBody, apiKey: string) {
  const references = body.referenceImages || []
  if (!references.length) return ''

  if (!body.referenceVisionModelName) {
    throw new Error('referenceVisionModelName is required when referenceImages are provided')
  }

  await appendLog(jobId, `Analyzing ${references.length} reference image${references.length > 1 ? 's' : ''}`)
  const visionInputs = await buildVisionImageInputs(references, jobId)
  const analysis = await callVisionModel(
    body.provider,
    body.referenceVisionModelName,
    apiKey,
    body.methodContent,
    body.caption,
    visionInputs,
  )

  const trimmed = analysis.trim()
  if (!trimmed) throw new Error('Reference vision model returned empty analysis')
  await jobs.updateOne(
    { _id: jobId },
    { $set: { referenceAnalysis: trimmed, updatedAt: new Date() } },
  )
  return trimmed
}

async function buildVisionImageInputs(referenceImages: ReferenceImageInput[], jobId = '') {
  const bucket = cloud.storage.bucket(bucketName)
  const inputs: VisionImageInput[] = []
  let referencesChanged = false

  for (const image of referenceImages) {
    if (!image.objectKey) throw new Error(`Reference image ${image.filename || ''} is missing objectKey`)
    let objectKey = image.analysisObjectKey || image.objectKey
    let mimeType = image.analysisMimeType || image.mimeType
    let url = ''

    if (image.mimeType === 'image/svg+xml' && !image.analysisObjectKey) {
      const analysis = await rasterizeSvgReferenceImage(bucket, image)
      image.analysisObjectKey = analysis.objectKey
      image.analysisMimeType = analysis.mimeType
      image.analysisSize = analysis.size
      objectKey = analysis.objectKey
      mimeType = analysis.mimeType
      url = analysis.url
      referencesChanged = true
    }

    if (!allowedAnalysisMimeTypes.has(mimeType)) {
      throw new Error('Reference image analysis input must be PNG, JPG, or WebP')
    }
    if (!url) url = await bucket.getDownloadUrl(objectKey, 3600)
    inputs.push({
      filename: image.filename,
      mimeType,
      url,
      objectKey,
    })
  }

  if (referencesChanged && jobId) {
    await jobs.updateOne(
      { _id: jobId },
      { $set: { referenceImages, updatedAt: new Date() } },
    )
  }

  return inputs
}

async function rasterizeSvgReferenceImage(bucket: any, image: ReferenceImageInput) {
  const label = `SVG reference image ${image.filename || ''} download`
  const svgText = (await readStoredObject(bucket, image.objectKey, maxReferenceBytes, label)).toString('utf8')
  if (!svgText.trim()) throw new Error(`${label} returned empty content`)
  const pngBuffer = await rasterizeSvgReferenceToPng(svgText)
  if (!pngBuffer.length) throw new Error('SVG reference image rasterization returned empty PNG')
  if (pngBuffer.length > maxReferenceBytes) throw new Error('SVG reference image rasterized PNG exceeds 5MB limit')

  const analysisObjectKey = analysisObjectKeyForSvg(image.objectKey)
  await bucket.writeFile(analysisObjectKey, pngBuffer, { ContentType: 'image/png' })
  return {
    objectKey: analysisObjectKey,
    mimeType: 'image/png',
    size: pngBuffer.length,
    url: await bucket.getDownloadUrl(analysisObjectKey, 3600),
  }
}

async function rasterizeSvgReferenceToPng(rawSvg: string) {
  const svg = sanitizeReferenceSvg(rawSvg)
  const { Resvg } = await loadResvgWasm()
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: svgReferenceRasterWidth },
  })
  return Buffer.from(resvg.render().asPng())
}

async function loadResvgWasm(): Promise<ResvgWasmModule> {
  if (!resvgWasmPromise) {
    resvgWasmPromise = (async () => {
      const fs = require('fs')
      const resvg = require('@resvg/resvg-wasm') as ResvgWasmModule
      const basePath = process.env.CUSTOM_DEPENDENCY_BASE_PATH || '/tmp/custom_dependency'
      const wasmPath = process.env.RESVG_WASM_PATH || `${basePath}/node_modules/@resvg/resvg-wasm/index_bg.wasm`
      const wasmBytes = fs.readFileSync(wasmPath)
      await resvg.initWasm(wasmBytes)
      return resvg
    })()
  }
  return resvgWasmPromise
}

async function fetchText(url: string, label: string) {
  const response = await fetchWithRetry(url, undefined, label)
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`)
  const text = (await readResponseWithLimit(response, maxReferenceBytes, label)).toString('utf8')
  if (!text.trim()) throw new Error(`${label} returned empty content`)
  return text
}

function analysisObjectKeyForSvg(objectKey: string) {
  const key = String(objectKey || '')
  return /\.svg$/i.test(key) ? key.replace(/\.svg$/i, '-server-analysis.png') : `${key}-server-analysis.png`
}

// Bailian (DashScope OpenAI-compatible) only accepts image inputs through a
// vision-capable model. A text-only main like qwen3.7-max rejects image
// content entirely ([Unexpected item type in content.]). Route all bailian
// image reads through this VL model regardless of the configured main model.
function bailianVisionModel(): string {
  return (process.env.BAILIAN_VISION_MODEL || 'qwen-vl-max').trim()
}

// True when a Bailian/DashScope error means the chosen model cannot accept image
// content (so we should retry the SAME request with a VL-capable model). Most
// bailian models read images fine; only some text-only ones (e.g. qwen3.7-max)
// reject image items with "Unexpected item type in content".
function isBailianImageContentError(error: any): boolean {
  const m = (error?.message || String(error || '')).toLowerCase()
  return (
    m.includes('unexpected item type') ||
    m.includes('image format is illegal') ||
    (m.includes('invalid') && (m.includes('content') || m.includes('messages')))
  )
}

// Bailian REJECTS 'data:image/...;base64,...' URLs (400 "The image format is
// illegal and cannot be opened"); it only accepts PUBLIC https URLs. So for the
// bailian path we must materialize any data: URL into the bucket and hand back
// a signed download URL. http(s) URLs are passed through unchanged.
async function toBailianImageUrl(url: string): Promise<string> {
  if (typeof url !== 'string') {
    throw new Error('Bailian image url is missing')
  }
  if (!url.startsWith('data:')) {
    return url
  }
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url)
  if (!match || !match[2]) {
    throw new Error('Bailian image upload failed: unsupported data URL (expected base64)')
  }
  const mime = (match[1] || 'image/png').trim() || 'image/png'
  const payload = match[3] || ''
  try {
    const bytes = Buffer.from(payload, 'base64')
    if (!bytes.length) throw new Error('decoded image is empty')
    const ext = resultExtension(mime)
    const digest = crypto.createHash('sha1').update(bytes).digest('hex')
    const key = `bailian-vision/${digest || Date.now()}.${ext}`
    const bucket = cloud.storage.bucket(bucketName)
    await bucket.writeFile(key, bytes, { ContentType: mime })
    return await bucket.getDownloadUrl(key, 3600 * 24)
  } catch (error: any) {
    throw new Error(`Bailian image upload failed: ${error?.message || String(error)}`)
  }
}

async function callVisionModel(
  provider: Provider,
  model: string,
  apiKey: string,
  methodContent: string,
  caption: string,
  images: VisionImageInput[],
): Promise<string> {
  if (!images.length) return ''
  if (provider === 'gemini') {
    return callGeminiVision(model, apiKey, methodContent, caption, images)
  }

  const baseUrl = textApiBaseUrl(provider)
  // Respect the chosen recognition model. bailian only needs a PUBLIC image url
  // (data: URLs are rejected), so route each image url through the bucket first;
  // we keep the user's selected vision model and only fall back to a VL model if
  // it turns out it cannot read images (see the catch below).
  const requestImages =
    provider === 'bailian'
      ? await Promise.all(images.map(async (image) => ({ ...image, url: await toBailianImageUrl(image.url) })))
      : images
  const content: any[] = [{ type: 'text', text: referenceVisionUserPrompt(methodContent, caption) }]
  for (const image of requestImages) {
    content.push({ type: 'image_url', image_url: { url: image.url } })
  }
  const chosenModel = provider === 'openrouter' ? toOpenRouterModel(model) : model

  const runVision = async (visionModelName: string) => {
    const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: visionModelName,
        messages: [
          { role: 'system', content: referenceVisionSystemPrompt() },
          { role: 'user', content },
        ],
        temperature: 0.2,
      }),
    }, `${provider} vision model ${visionModelName}`)
    const data = await parseModelResponse(response)
    return data.choices?.[0]?.message?.content || ''
  }

  try {
    return await runVision(chosenModel)
  } catch (error: any) {
    // Only override the user's chosen model when it genuinely cannot accept
    // images (e.g. a text-only bailian model). Retry once with a VL model.
    if (provider === 'bailian' && isBailianImageContentError(error) && chosenModel !== bailianVisionModel()) {
      return await runVision(bailianVisionModel())
    }
    throw error
  }
}

async function callGeminiVision(
  model: string,
  apiKey: string,
  methodContent: string,
  caption: string,
  images: VisionImageInput[],
): Promise<string> {
  const parts: any[] = [{ text: referenceVisionUserPrompt(methodContent, caption) }]
  for (const image of images) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: await visionImageBase64(image, 'Gemini reference image download'),
      },
    })
  }

  const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: referenceVisionSystemPrompt() }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2 },
    }),
  }, `gemini vision model ${model}`)
  const data = await parseModelResponse(response)
  return data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || ''
}

async function callTextModel(
  provider: Provider,
  model: string,
  apiKey: string,
  system: string,
  user: string,
  images: VisionImageInput[] = [],
): Promise<string> {
  if (provider === 'gemini') {
    try {
      return await callGeminiText(model, apiKey, system, user, images)
    } catch (error: any) {
      if (images.length) throw new Error(mainModelReferenceError(provider, model, error))
      throw error
    }
  }
  const baseUrl = textApiBaseUrl(provider)
  const chosenModel = provider === 'openrouter' ? toOpenRouterModel(model) : model
  // Bailian only accepts PUBLIC image urls (data: URLs are rejected), so when a
  // bailian call carries images, materialize each url into a bucket url first.
  // We RESPECT the chosen model and only fall back to a VL model if it cannot
  // read images (e.g. text-only qwen3.7-max). Non-bailian providers untouched.
  // Resolve urls before JSON.stringify.
  let requestImages = images
  if (provider === 'bailian' && images.length) {
    requestImages = await Promise.all(
      images.map(async (image) => ({ ...image, url: await toBailianImageUrl(image.url) })),
    )
  }

  const runText = async (textModelName: string) => {
    const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: textModelName,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: chatUserContent(user, requestImages) },
        ],
        temperature: 1,
      }),
    }, `${provider} text model ${textModelName}`)
    const data = await parseModelResponse(response)
    return data.choices?.[0]?.message?.content || ''
  }

  try {
    return await runText(chosenModel)
  } catch (error: any) {
    // Bailian + images: if the chosen model rejects image content, retry once
    // with a VL-capable model before surfacing the error.
    if (provider === 'bailian' && images.length && isBailianImageContentError(error) && chosenModel !== bailianVisionModel()) {
      try {
        return await runText(bailianVisionModel())
      } catch (retryError: any) {
        throw new Error(mainModelReferenceError(provider, bailianVisionModel(), retryError))
      }
    }
    if (images.length) throw new Error(mainModelReferenceError(provider, chosenModel, error))
    throw error
  }
}

async function callSvgModel(provider: Provider, model: string, apiKey: string, description: string): Promise<string> {
  const rawSvg = await callTextModel(
    provider,
    model,
    apiKey,
    svgSystemPrompt(),
    svgUserPrompt(description),
  )
  return sanitizeSvg(rawSvg)
}

async function callImageModel(
  provider: Provider,
  model: string,
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  sourceImage = '',
  imageSize = '2K',
): Promise<string> {
  // When a source image is supplied, route to a true image-to-image / edit
  // request for providers that support image input. Otherwise fall back to
  // plain text-to-image generation.
  const source = await normalizeSourceImage(sourceImage)

  if (provider === 'openai') {
    if (source) {
      return callOpenAiImageEdit(model, apiKey, prompt, source)
    }
    const response = await fetchWithRetry('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        // OpenAI gpt-image sizes are an enum; '1536x1024' is the largest safe
        // landscape value. Higher imageSize requests are served by the separate
        // auto-refine pass, so we keep a known-good size here (never 400).
        size: '1536x1024',
        quality: 'high',
        background: 'opaque',
        output_format: 'png',
      }),
    }, `openai image model ${model}`)
    const data = await parseBoundedModelResponse(response, maxProviderImageResponseBytes, 'OpenAI image response')
    return validateProviderImageBase64(data.data?.[0]?.b64_json || '', maxProviderImageBytes, 'OpenAI image')
  }

  if (provider === 'gemini') {
    return callGeminiImage(model, apiKey, prompt, aspectRatio, source, imageSize)
  }

  if (provider === 'bailian') {
    // Bailian image model does not support a conditioned edit here; fall back
    // to the describe-then-regenerate path (source image is ignored).
    return callBailianImage(model, apiKey, prompt, aspectRatio, imageSize)
  }

  const userContent: any[] = [{ type: 'text', text: prompt }]
  if (source) {
    userContent.push({ type: 'image_url', image_url: { url: source.dataUrl } })
  }
  const response = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: toOpenRouterModel(model),
      messages: [{ role: 'user', content: userContent }],
      modalities: ['image', 'text'],
      image_config: {
        aspect_ratio: aspectRatio,
        image_size: '1k',
      },
    }),
  }, `openrouter image model ${toOpenRouterModel(model)}`)
  const data = await parseBoundedModelResponse(response, maxProviderImageResponseBytes, 'OpenRouter image response')
  const message = data.choices?.[0]?.message || {}
  const imageUrl = message.images?.[0]?.image_url?.url || ''
  if (imageUrl.includes(',')) {
    return validateProviderImageBase64(imageUrl.split(',', 2)[1] || '', maxProviderImageBytes, 'OpenRouter image')
  }
  if (typeof message.content === 'string' && message.content.startsWith('data:image')) {
    return validateProviderImageBase64(message.content.split(',', 2)[1] || '', maxProviderImageBytes, 'OpenRouter image')
  }
  throw new Error('Image model did not return image data')
}

type NormalizedSourceImage = { base64: string; mimeType: string; dataUrl: string }

// Accepts a data URL, a bare base64 string, or a remote/bucket URL and returns
// a normalized base64 + data URL pair for conditioning image-edit requests.
async function normalizeSourceImage(sourceImage: string): Promise<NormalizedSourceImage | null> {
  const value = String(sourceImage || '').trim()
  if (!value) return null

  const dataMatch = value.match(/^data:([^;,]+);base64,(.*)$/i)
  if (dataMatch) {
    const mimeType = dataMatch[1] || 'image/png'
    const base64 = dataMatch[2] || ''
    if (!base64) return null
    return { base64, mimeType, dataUrl: value }
  }

  if (/^https?:\/\//i.test(value)) {
    const mimeType = inferMimeTypeFromUrl(value)
    const base64 = await fetchImageAsBase64(value, 'Refine source image download', maxReferenceBytes)
    if (!base64) return null
    return { base64, mimeType, dataUrl: `data:${mimeType};base64,${base64}` }
  }

  // Treat as a bare base64 payload.
  return { base64: value, mimeType: 'image/png', dataUrl: `data:image/png;base64,${value}` }
}

async function callOpenAiImageEdit(model: string, apiKey: string, prompt: string, source: NormalizedSourceImage): Promise<string> {
  const form = new FormData()
  form.append('model', model)
  form.append('prompt', prompt)
  form.append('size', '1536x1024')
  form.append('quality', 'high')
  const ext = source.mimeType === 'image/jpeg' ? 'jpg' : source.mimeType === 'image/webp' ? 'webp' : 'png'
  const blob = new Blob([Buffer.from(source.base64, 'base64')], { type: source.mimeType })
  form.append('image', blob, `source.${ext}`)

  const response = await fetchWithRetry('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form as any,
  }, `openai image edit model ${model}`)
  const data = await parseBoundedModelResponse(response, maxProviderImageResponseBytes, 'OpenAI image edit response')
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI image edit did not return image data')
  return validateProviderImageBase64(b64, maxProviderImageBytes, 'OpenAI edited image')
}

function textApiBaseUrl(provider: Provider) {
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1'
  if (provider === 'bailian') return 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  return 'https://api.openai.com/v1'
}

async function callGeminiText(
  model: string,
  apiKey: string,
  system: string,
  user: string,
  images: VisionImageInput[] = [],
): Promise<string> {
  const parts: any[] = [{ text: user }]
  for (const image of images) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: await visionImageBase64(image, 'Gemini main model reference image download'),
      },
    })
  }

  const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 1 },
    }),
  }, `gemini text model ${model}`)
  const data = await parseModelResponse(response)
  return data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || ''
}

async function callGeminiImage(model: string, apiKey: string, prompt: string, aspectRatio: string, source: NormalizedSourceImage | null = null, imageSize = '2K'): Promise<string> {
  const actualModel = normalizeModelName('gemini', model)
  const parts: any[] = [{ text: prompt }]
  if (source) {
    parts.push({ inlineData: { mimeType: source.mimeType, data: source.base64 } })
  }
  const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1/models/${actualModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        // Gemini imageConfig.imageSize accepts '1K'/'2K'. Map our '2K'/'4K' to a
        // safe accepted value: '2K' → '2K', '4K' → '2K' (4K not supported here),
        // anything else (incl. legacy '1K') → '1K'. A wrong size must not break
        // generation, so keep to known-good Gemini values.
        imageConfig: { aspectRatio, imageSize: geminiImageSize(imageSize) },
      },
    }),
  }, `gemini image model ${actualModel}`)
  const data = await parseBoundedModelResponse(response, maxProviderImageResponseBytes, 'Gemini image response')
  for (const part of data.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return validateProviderImageBase64(part.inlineData.data, maxProviderImageBytes, 'Gemini image')
    }
    if (part.inline_data?.data) {
      return validateProviderImageBase64(part.inline_data.data, maxProviderImageBytes, 'Gemini image')
    }
  }
  throw new Error('Gemini image model did not return image data')
}

// Gemini imageConfig.imageSize only accepts '1K'/'2K'. CLAMP our resolution
// setting onto a known-good value: '4K' → '2K' (4K unsupported here), '2K' → '2K',
// '1K'/unknown → '1K'. Never emit '4K' (unsupported → would 400).
function geminiImageSize(imageSize: string) {
  if (imageSize === '4K') return '2K'
  if (imageSize === '2K') return '2K'
  return '1K'
}

async function callBailianImage(model: string, apiKey: string, prompt: string, aspectRatio: string, imageSize = '2K'): Promise<string> {
  const response = await fetchWithRetry('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
      },
      parameters: {
        size: bailianImageSize(aspectRatio, imageSize),
        n: 1,
        watermark: false,
      },
    }),
  }, `bailian image model ${model}`)
  const data = await parseDashScopeResponse(response, maxProviderImageResponseBytes, 'Bailian image response')
  const imageUrl = extractDashScopeImageUrl(data)
  if (!imageUrl) throw new Error('阿里百炼图片模型没有返回图片地址')
  return await fetchImageAsBase64(imageUrl, 'Bailian generated image download', maxProviderImageBytes)
}

function extractDashScopeImageUrl(data: any) {
  const contents = data?.output?.choices?.[0]?.message?.content || []
  for (const item of contents) {
    if (item?.type === 'image' && item?.image) return item.image
    if (item?.image) return item.image
  }
  return ''
}

// Resolve a model-SAFE pixel size for DashScope wan/qwen-image. The non-hires
// sizes below are the existing known-good values already used in production and
// are also reused for '1K' (the base render just uses the safe default size).
// The '4K' sizes are modestly larger but are CLAMPED to stay inside the
// wan/qwen-image limit (long side <= ~1664 px, total area < ~1.6M px) so a
// too-large request can NEVER 400. When unsure, fall through to the safe size.
function bailianImageSize(aspectRatio: string, imageSize = '1K') {
  // Only '4K' bumps to the larger (still clamped) size; '1K'/'2K'/unknown use
  // the conservative base size.
  const hires = imageSize === '4K'
  if (aspectRatio === '21:9') return hires ? '1664*720' : '1792*768'
  if (aspectRatio === '3:2') return hires ? '1664*1108' : '1536*1024'
  if (aspectRatio === '1:1') return hires ? '1328*1328' : '1024*1024'
  return hires ? '1664*936' : '1536*864'
}

export async function readResponseWithLimit(response: Response, maxBytes: number, label: string): Promise<Buffer> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('Response byte limit must be a positive integer')
  const advertised = Number(response.headers.get('content-length'))
  if (Number.isFinite(advertised) && advertised > maxBytes) {
    await response.body?.cancel().catch(() => {})
    throw new Error(`${label} exceeds ${maxBytes} byte limit`)
  }
  if (!response.body) throw new Error(`${label} returned no response body`)

  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = Buffer.from(value)
      total += chunk.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new Error(`${label} exceeds ${maxBytes} byte limit`)
      }
      chunks.push(chunk)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, total)
}

export async function readStoredObject(bucket: any, key: string, maxBytes: number, label: string): Promise<Buffer> {
  if (typeof bucket?.readFile === 'function') {
    const value = await bucket.readFile(key, maxBytes)
    if (Buffer.isBuffer(value)) return value
    if (value instanceof Uint8Array) return Buffer.from(value)
    if (Buffer.isBuffer(value?.content)) return value.content
    if (value?.content instanceof Uint8Array) return Buffer.from(value.content)
    throw new Error(`${label} returned unsupported object bytes`)
  }
  if (process.env.PAPERBANANA_STRICT_OBJECT_STORAGE === 'true') {
    throw new Error('Bounded internal object download is unavailable')
  }
  const url = await bucket.getDownloadUrl(key, 3600)
  const response = await fetchWithRetry(url, undefined, label)
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`)
  return await readResponseWithLimit(response, maxBytes, label)
}

async function visionImageBase64(image: VisionImageInput, label: string) {
  if (image.objectKey) {
    const bucket = cloud.storage.bucket(bucketName)
    return (await readStoredObject(bucket, image.objectKey, maxReferenceBytes, label)).toString('base64')
  }
  return await fetchImageAsBase64(image.url, label, maxReferenceBytes)
}

export function validateProviderImageBase64(value: string, maxBytes: number, label: string): string {
  const normalized = String(value || '').replace(/\s+/g, '')
  if (!normalized) throw new Error(`${label} did not return image data`)
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) throw new Error(`${label} returned invalid base64 data`)
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  const decodedBytes = Math.floor(normalized.length * 3 / 4) - padding
  if (decodedBytes > maxBytes) throw new Error(`${label} exceeds ${maxBytes} byte limit`)
  return normalized
}

async function fetchImageAsBase64(url: string, label = 'image download', maxBytes = maxProviderImageBytes) {
  const response = await fetchWithRetry(url, undefined, label)
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status}`)
  return (await readResponseWithLimit(response, maxBytes, label)).toString('base64')
}

export async function saveResult(
  jobId: string,
  candidateId: number,
  content: string,
  mimeType: string,
  encoding: 'base64' | 'utf8',
) {
  const filename = `${jobId}/candidate-${candidateId}.${resultExtension(mimeType)}`
  const buffer = encoding === 'base64' ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8')
  const base64 = encoding === 'base64' ? content : buffer.toString('base64')
  try {
    const bucket = cloud.storage.bucket(bucketName)
    await bucket.writeFile(filename, buffer, { ContentType: mimeType })
    return {
      storage: 'bucket',
      filename,
      url: await bucket.getDownloadUrl(filename, 3600 * 24 * 7),
    }
  } catch (error: any) {
    if (process.env.PAPERBANANA_STRICT_OBJECT_STORAGE === 'true') throw error
    return {
      storage: 'database-data-url',
      filename,
      url: `data:${mimeType};base64,${base64}`,
      storageError: error?.message || String(error),
    }
  }
}

export async function saveStageImage(
  jobId: string,
  candidateId: number,
  stageName: string,
  content: string,
  mimeType: string,
  encoding: 'base64' | 'utf8',
) {
  const safeStageName = sanitizePathPart(stageName)
  const filename = `${jobId}/candidate-${candidateId}-${safeStageName}.${resultExtension(mimeType)}`
  const buffer = encoding === 'base64' ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8')
  const base64 = encoding === 'base64' ? content : buffer.toString('base64')
  try {
    const bucket = cloud.storage.bucket(bucketName)
    await bucket.writeFile(filename, buffer, { ContentType: mimeType })
    return {
      storage: 'bucket',
      filename,
      url: await bucket.getDownloadUrl(filename, 3600 * 24 * 7),
      mimeType,
    }
  } catch (error: any) {
    if (process.env.PAPERBANANA_STRICT_OBJECT_STORAGE === 'true') throw error
    return {
      storage: 'database-data-url',
      filename,
      url: `data:${mimeType};base64,${base64}`,
      mimeType,
      storageError: error?.message || String(error),
    }
  }
}

function resultExtension(mimeType: string) {
  if (mimeType === 'image/svg+xml') return 'svg'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/jpeg') return 'jpg'
  return 'png'
}

async function markFailed(jobId: string, error: string) {
  await jobs.updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'failed',
        error,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      $push: { logs: `ERROR: ${error}` },
    },
  )
}

async function appendLog(jobId: string, message: string) {
  await jobs.updateOne(
    { _id: jobId },
    {
      $set: { updatedAt: new Date() },
      $push: { logs: `${new Date().toISOString()} ${message}` },
    },
  )
}

async function recordStage(jobId: string, input: Partial<JobStage> & { candidateId: number; type: string; title: string }) {
  const now = new Date()
  const startedAt = input.startedAt || now
  const completedAt = input.completedAt || now
  const stage = {
    id: input.id || `stage-${randomId()}`,
    candidateId: Number(input.candidateId || 0),
    type: input.type,
    title: input.title,
    round: Number(input.round || 0),
    text: limitText(input.text, 12000),
    suggestion: limitText(input.suggestion, 6000),
    image: input.image || null,
    startedAt,
    completedAt,
    durationMs: Number(input.durationMs || (completedAt.getTime() - startedAt.getTime())),
    error: limitText(input.error, 1200),
  }
  await jobs.updateOne(
    { _id: jobId },
    {
      $set: { updatedAt: new Date() },
      $push: { stages: stage },
    },
  )
  return stage
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let index = 0
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < items.length) {
      const current = items[index]
      index += 1
      await worker(current)
    }
  })
  await Promise.all(workers)
}

async function fetchWithRetry(url: string, options: RequestInit | undefined, label: string, attempts = 2) {
  let lastError: any
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options)
    } catch (error: any) {
      lastError = error
      if (attempt < attempts) {
        await sleep(800 * attempt)
      }
    }
  }
  throw new Error(`${label} request failed: ${lastError?.message || String(lastError)}`)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function chatUserContent(user: string, images: VisionImageInput[]) {
  if (!images.length) return user
  return [
    { type: 'text', text: user },
    ...images.map((image) => ({
      type: 'image_url',
      image_url: { url: image.url },
    })),
  ]
}

function mainModelReferenceError(provider: Provider, model: string, error: any) {
  const message = error?.message || String(error)
  const hint = '请改用独立识别模型或更换主模型。'
  if (message.includes(hint)) return message
  return `主模型 ${provider}/${model} 直读参考图失败：${message}。${hint}`
}

async function referenceModelCapability(provider: Provider, model: string): Promise<ModelCapabilityResult> {
  const normalizedModel = normalizeModelName(provider, model)
  if (provider === 'bailian') {
    // 阿里百炼"图像理解"模型可直读参考图:qwen3.7-plus / qwen3.5-omni-plus / kimi-k2.6
    // (+ omni、遗留 qwen-vl/qvq 容错)。纯文本模型(qwen3.7-max、deepseek、glm、MiniMax…)
    // 需经独立识别模型读图。
    const isVisionModel = /qwen3\.7-plus|qwen3\.5-omni|omni|kimi-k2\.6|qwen-?vl|qwen3-?vl|-vl-|qvq/i.test(normalizedModel)
    return {
      status: isVisionModel ? 'supported' : 'unsupported',
      supportsReferenceImages: isVisionModel,
      reason: isVisionModel
        ? '该主模型支持图像理解，可直读参考图'
        : '该主模型为文本模型，已自动改用独立识别模型读参考图',
      source: 'paperbanana-static',
      cached: true,
    }
  }

  if (provider === 'openai') {
    const supported = openaiVisionMainModels.has(normalizedModel)
    return {
      status: supported ? 'supported' : 'unknown',
      supportsReferenceImages: supported,
      reason: supported ? 'OpenAI static vision-capable model list' : '模型不在当前 OpenAI 静态白名单内，能力未知',
      source: 'paperbanana-static',
      cached: true,
    }
  }

  if (provider === 'gemini') {
    const supported = geminiVisionMainModels.has(normalizedModel)
    return {
      status: supported ? 'supported' : 'unknown',
      supportsReferenceImages: supported,
      reason: supported ? 'Gemini static vision-capable model list' : '模型不在当前 Gemini 静态白名单内，能力未知',
      source: 'paperbanana-static',
      cached: true,
    }
  }

  return await openRouterReferenceCapability(normalizedModel)
}

async function openRouterReferenceCapability(model: string): Promise<ModelCapabilityResult> {
  const actualModel = toOpenRouterModel(model)
  try {
    const { modalities, cached } = await fetchOpenRouterModelModalities()
    if (!modalities.has(actualModel)) {
      return {
        status: 'unknown',
        supportsReferenceImages: false,
        reason: 'OpenRouter metadata did not include this model id',
        source: 'openrouter-models',
        cached,
      }
    }
    const inputModalities = modalities.get(actualModel) || []
    const supported = inputModalities.includes('image')
    return {
      status: supported ? 'supported' : 'unsupported',
      supportsReferenceImages: supported,
      reason: supported
        ? 'OpenRouter input_modalities includes image'
        : `OpenRouter input_modalities: ${inputModalities.join(', ') || 'none'}`,
      source: 'openrouter-models',
      cached,
    }
  } catch (error: any) {
    return {
      status: 'unknown',
      supportsReferenceImages: false,
      reason: `OpenRouter metadata unavailable: ${error?.message || String(error)}`,
      source: 'openrouter-models',
      cached: false,
    }
  }
}

async function fetchOpenRouterModelModalities() {
  const now = Date.now()
  if (openRouterModelCache && openRouterModelCache.expiresAt > now) {
    return { modalities: openRouterModelCache.modalities, cached: true }
  }

  const response = await fetchWithRetry('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }, 'OpenRouter model metadata')
  const data = await parseModelResponse(response)
  const modalities = new Map<string, string[]>()
  for (const model of data?.data || []) {
    if (!model?.id) continue
    modalities.set(String(model.id), Array.isArray(model?.architecture?.input_modalities)
      ? model.architecture.input_modalities.map((item: any) => String(item))
      : [])
  }
  openRouterModelCache = {
    expiresAt: now + openRouterModelCacheTtlMs,
    modalities,
  }
  return { modalities, cached: false }
}

async function parseModelResponse(response: Response) {
  return parseModelResponseText(response, await response.text())
}

export async function parseBoundedModelResponse(response: Response, maxBytes: number, label: string) {
  const text = (await readResponseWithLimit(response, maxBytes, label)).toString('utf8')
  return parseModelResponseText(response, text)
}

function parseModelResponseText(response: Response, text: string) {
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || text || `HTTP ${response.status}`)
  }
  return data
}

async function parseDashScopeResponse(response: Response, maxBytes?: number, label = 'DashScope response') {
  const data = maxBytes
    ? await parseBoundedModelResponse(response, maxBytes, label)
    : await parseModelResponse(response)
  if (data?.status_code && data.status_code !== 200) {
    throw new Error(data?.message || data?.code || `DashScope HTTP ${data.status_code}`)
  }
  if (data?.code) {
    throw new Error(data?.message || data.code)
  }
  return data
}

function plannerSystemPrompt() {
  return [
    "I am working on a task: given the 'Methodology' section of a paper, and the caption of the desired figure, automatically generate a corresponding illustrative diagram. I will input the text of the 'Methodology' section, the figure caption, and your output should be a detailed description of an illustrative figure that effectively represents the methods described in the text.",
    '',
    'To help you understand the task better, and grasp the principles for generating such figures, I will also provide you with several examples. You should learn from these examples to provide your figure description.',
    '',
    '** IMPORTANT: **',
    'Your description should be as detailed as possible. Semantically, clearly describe each element and their connections. Formally, include various details such as background style (typically pure white or very light pastel), colors, line thickness, icon styles, etc. Remember: vague or unclear specifications will only make the generated figure worse, not better.',
    '',
    'If reference image analysis is provided, use it as structure and style guidance without copying irrelevant content. Do not include the figure title or caption text inside the image.',
  ].join('\n')
}

function plannerUserPrompt(method: string, caption: string, referenceAnalysis = '', retrievalContext = '', infographicCategory = '', hasReferenceImages = false) {
  return withReferenceImageInstruction(withInfographicCategory(withRetrievalContext(withReferenceAnalysis(
    `Methodology Section:\n${method}\n\nFigure Caption:\n${caption}\n\nDetailed description of the target figure:`,
    referenceAnalysis,
  ), retrievalContext), infographicCategory), hasReferenceImages)
}

function stylistSystemPrompt() {
  return [
    '## ROLE',
    'You are a Lead Visual Designer for top-tier AI conferences (e.g., NeurIPS 2025).',
    '',
    '## TASK',
    'Our goal is to generate high-quality, publication-ready diagrams, given the methodology section and the caption of the desired diagram. The diagram should illustrate the logic of the methodology section, while adhering to the scope defined by the caption. Before you, a planner agent has already generated a preliminary description of the target diagram. However, this description may lack specific aesthetic details, such as element shapes, color palettes, and background styling. Your task is to refine and enrich this description based on the provided [NeurIPS 2025 Style Guidelines] to ensure the final generated image is a high-quality, publication-ready diagram that adheres to the NeurIPS 2025 aesthetic standards where appropriate.',
    '',
    '## INPUT DATA',
    '-   **Detailed Description**: [The preliminary description of the figure]',
    '-   **Style Guidelines**: [NeurIPS 2025 Style Guidelines]',
    '-   **Methodology Section**: [Contextual content from the methodology section]',
    '-   **Diagram Caption**: [Target diagram caption]',
    '',
    "Note that you should primary focus on the detailed description and style guidelines. The methodology section and diagram caption are provided for context only, there's no need to regenerate a description from scratch, solely based on them, while ignoring the detailed description we already have.",
    '',
    '**Crucial Instructions:**',
    '1.  **Preserve Semantic Content:** Do NOT alter the semantic content, logic, or structure of the diagram. Your job is purely aesthetic refinement, not content editing. However, if you find some phrases or descriptions too verbose, you may simplify them appropriately while referencing the original methodology section to ensure semantic accuracy.',
    '2.  **Preserve High-Quality Aesthetics and Intervene Only When Necessary:** First, evaluate the aesthetic quality implied by the input description. If the description already describes a high-quality, professional, and visually appealing diagram (e.g., nice 3D icons, rich textures, good color harmony), **PRESERVE IT**. Only apply strict Style Guide adjustments if the current description lacks detail, looks outdated, or is visually cluttered. Your goal is specific refinement, not blind standardization.',
    '3.  **Respect Diversity:** Different domains have different styles. If the input describes a specific style (e.g., illustrative for agents) that works well, keep it.',
    '4.  **Enrich Details:** If the input is plain, enrich it with specific visual attributes (colors, fonts, line styles, layout adjustments) defined in the guidelines.',
    '5.  **Handle Icons with Care:** Be cautious when modifying icons as they may carry specific semantic meanings. Some icons have conventional technical meanings (e.g., snowflake = frozen/non-trainable, flame = trainable) - when encountering such icons, reference the original methodology section to verify their intent before making changes. However, purely decorative or symbolic icons can be freely enhanced and beautified. For examples, agent papers often use cute 2D robot avatars to represent agents.',
    '',
    '## OUTPUT',
    'Output ONLY the final polished Detailed Description. Do not include any conversational text or explanations.',
    '',
    '## [NeurIPS 2025 Style Guidelines]',
    neuripsDiagramStyleGuide(),
  ].join('\n')
}

function stylistUserPrompt(method: string, caption: string, description: string, referenceAnalysis = '', retrievalContext = '', infographicCategory = '', hasReferenceImages = false) {
  return withReferenceImageInstruction(withInfographicCategory(withRetrievalContext(withReferenceAnalysis(
    `Initial Description:\n${description}\n\nMethodology Section:\n${method}\n\nFigure Caption:\n${caption}\n\nPolished detailed description:`,
    referenceAnalysis,
  ), retrievalContext), infographicCategory), hasReferenceImages)
}

function criticSystemPrompt() {
  return diagramCriticSystemPrompt()
}

function diagramCriticSystemPrompt() {
  return [
    '## ROLE',
    'You are a Lead Visual Designer for top-tier AI conferences (e.g., NeurIPS 2025).',
    '',
    '## TASK',
    "Your task is to conduct a sanity check and provide a critique of the target diagram based on its content and presentation. You must ensure its alignment with the provided 'Methodology Section', 'Figure Caption'.",
    '',
    "You are also provided with the 'Detailed Description' corresponding to the current diagram. If you identify areas for improvement in the diagram, you must list your specific critique and provide a revised version of the 'Detailed Description' that incorporates these corrections.",
    '',
    '## CRITIQUE & REVISION RULES',
    '',
    '1. Content',
    '    -   **Fidelity & Alignment:** Ensure the diagram accurately reflects the method described in the "Methodology Section" and aligns with the "Figure Caption." Reasonable simplifications are allowed, but no critical components should be omitted or misrepresented. Also, the diagram should not contain any hallucinated content. Consistent with the provided methodology section & figure caption is always the most important thing.',
    '    -   **Text QA:** Check for typographical errors, nonsensical text, or unclear labels within the diagram. Suggest specific corrections.',
    '    -   **Validation of Examples:** Verify the accuracy of illustrative examples. If the diagram includes specific examples to aid understanding (e.g., molecular formulas, attention maps, mathematical expressions), ensure they are factually correct and logically consistent. If an example is incorrect, provide the correct version.',
    '    -   **Caption Exclusion:** Ensure the figure caption text (e.g., "Figure 1: Overview...") is **not** included within the image visual itself. The caption should remain separate.',
    '',
    '2. Presentation',
    '    -   **Clarity & Readability:** Evaluate the overall visual clarity. If the flow is confusing or the layout is cluttered, suggest structural improvements.',
    '    -   **Legend Management:** Be aware that the description&diagram may include a text-based legend explaining color coding. Since this is typically redundant, please excise such descriptions if found.',
    '',
    '** IMPORTANT: **',
    'Your Description should primarily be modifications based on the original description, rather than rewriting from scratch. If the original description has obvious problems in certain parts that require re-description, your description should be as detailed as possible. Semantically, clearly describe each element and their connections. Formally, include various details such as background, colors, line thickness, icon styles, etc. Remember: vague or unclear specifications will only make the generated figure worse, not better.',
    '',
    '## INPUT DATA',
    '-   **Target Diagram**: [The generated figure]',
    '-   **Detailed Description**: [The detailed description of the figure]',
    '-   **Methodology Section**: [Contextual content from the methodology section]',
    '-   **Figure Caption**: [Target figure caption]',
    '',
    '## OUTPUT',
    'Provide your response strictly in the following JSON format.',
    '',
    '```json',
    '{',
    '    "critic_suggestions": "Insert your detailed critique and specific suggestions for improvement here. If the diagram is perfect, write \'No changes needed.\'",',
    '    "revised_description": "Insert the fully revised detailed description here, incorporating all your suggestions. If no changes are needed, write \'No changes needed.\'"',
    '}',
    '```',
  ].join('\n')
}

function criticUserPrompt(method: string, caption: string, description: string, referenceAnalysis = '', retrievalContext = '') {
  return withRetrievalContext(withReferenceAnalysis(
    `Current Description:\n${description}\n\nMethodology Section:\n${method}\n\nFigure Caption:\n${caption}\n\nCritique or revised description:`,
    referenceAnalysis,
  ), retrievalContext)
}

function imageCriticSystemPrompt() {
  // Same rubric and strict JSON contract as the text critic, but a rendered
  // diagram image is attached for inspection.
  return diagramCriticSystemPrompt()
}

function imageCriticUserPrompt(method: string, caption: string, description: string, referenceAnalysis = '', retrievalContext = '') {
  return withRetrievalContext(withReferenceAnalysis(
    `Rendered diagram is attached.\n\nCurrent Description:\n${description}\n\nMethodology Section:\n${method}\n\nFigure Caption:\n${caption}\n\nImage-aware critique or revised description:`,
    referenceAnalysis,
  ), retrievalContext)
}

// ---------------------------------------------------------------------------
// PLOT prompt builders (ported verbatim from the root PLOT_* agents). The plot
// task feeds raw data + visual intent through methodContent/caption, the same
// fields the diagram task uses.
// ---------------------------------------------------------------------------
function plotPlannerSystemPrompt() {
  return [
    'I am working on a task: given the raw data (typically in tabular or json format) and a visual intent of the desired plot, automatically generate a corresponding statistical plot that are both accurate and aesthetically pleasing. I will input the raw data and the plot visual intent, and your output should be a detailed description of an illustrative plot that effectively represents the data.  Note that your description should include all the raw data points to be plotted.',
    '',
    'To help you understand the task better, and grasp the principles for generating such plots, I will also provide you with several examples. You should learn from these examples to provide your plot description.',
    '',
    '** IMPORTANT: **',
    "Your description should be as detailed as possible. For content, explain the precise mapping of variables to visual channels (x, y, hue) and explicitly enumerate every raw data point's coordinate to be drawn to ensure accuracy. For presentation, specify the exact aesthetic parameters, including specific HEX color codes, font sizes for all labels, line widths, marker dimensions, legend placement, and grid styles. You should learn from the examples' content presentation and aesthetic design (e.g., color schemes).",
  ].join('\n')
}

function plotPlannerUserPrompt(rawData: string, visualIntent: string, referenceAnalysis = '', retrievalContext = '', hasReferenceImages = false) {
  return withReferenceImageInstruction(withRetrievalContext(withReferenceAnalysis(
    `Plot Raw Data:\n${rawData}\n\nVisual Intent of the Desired Plot:\n${visualIntent}\n\nDetailed description of the target figure to be generated:`,
    referenceAnalysis,
  ), retrievalContext), hasReferenceImages)
}

function plotStylistSystemPrompt() {
  return [
    '## ROLE',
    'You are a Lead Visual Designer for top-tier AI conferences (e.g., NeurIPS 2025).',
    '',
    '## TASK',
    'You are provided with a preliminary description of a statistical plot to be generated. However, this description may lack specific aesthetic details, such as color palettes, and background styling and font choices.',
    '',
    'Your task is to refine and enrich this description based on the provided [NeurIPS 2025 Style Guidelines] to ensure the final generated image is a high-quality, publication-ready plot that strictly adheres to the NeurIPS 2025 aesthetic standards.',
    '',
    '**Crucial Instructions:**',
    '1.  **Enrich Details:** Focus on specifying visual attributes (colors, fonts, line styles, layout adjustments) defined in the guidelines.',
    '2.  **Preserve Content:** Do NOT alter the semantic content, logic, or quantitative results of the plot. Your job is purely aesthetic refinement, not content editing.',
    '3.  **Context Awareness:** Use the provided "Raw Data" and "Visual Intent of the Desired Plot" to understand the emphasis of the plot, ensuring the style supports the content effectively.',
    '',
    '## INPUT DATA',
    '-   **Detailed Description**: [The preliminary description of the plot]',
    '-   **Style Guidelines**: [NeurIPS 2025 Style Guidelines]',
    '-   **Raw Data**: [The raw data to be visualized]',
    '-   **Visual Intent of the Desired Plot**: [Visual intent of the desired plot]',
    '',
    '## OUTPUT',
    'Output ONLY the final polished Detailed Description. Do not include any conversational text or explanations.',
    '',
    '## [NeurIPS 2025 Style Guidelines]',
    neuripsPlotStyleGuide(),
  ].join('\n')
}

function plotStylistUserPrompt(rawData: string, visualIntent: string, description: string, referenceAnalysis = '', retrievalContext = '', hasReferenceImages = false) {
  return withReferenceImageInstruction(withRetrievalContext(withReferenceAnalysis(
    `Detailed Description: ${description}\nRaw Data: ${rawData}\nVisual Intent of the Desired Plot: ${visualIntent}\nYour Output:`,
    referenceAnalysis,
  ), retrievalContext), hasReferenceImages)
}

function plotCriticSystemPrompt() {
  return [
    '## ROLE',
    'You are a Lead Visual Designer for top-tier AI conferences (e.g., NeurIPS 2025).',
    '',
    '## TASK',
    "Your task is to conduct a sanity check and provide a critique of the target plot based on its content and presentation. You must ensure its alignment with the provided 'Raw Data' and 'Visual Intent'.",
    '',
    "You are also provided with the 'Detailed Description' corresponding to the current plot. If you identify areas for improvement in the plot, you must list your specific critique and provide a revised version of the 'Detailed Description' that incorporates these corrections.",
    '',
    '## CRITIQUE & REVISION RULES',
    '',
    '1. Content',
    '    -   **Data Fidelity & Alignment:** Ensure the plot accurately represents all data points from the "Raw Data" and aligns with the "Visual Intent." All quantitative values must be correct. No data should be hallucinated, omitted, or misrepresented.',
    '    -   **Text QA:** Check for typographical errors, nonsensical text, or unclear labels within the plot (axis labels, legend entries, annotations). Suggest specific corrections.',
    '    -   **Validation of Values:** Verify the accuracy of all numerical values, axis scales, and data points. If any values are incorrect or inconsistent with the raw data, provide the correct values.',
    '    -   **Caption Exclusion:** Ensure the figure caption text (e.g., "Figure 1: Performance comparison...") is **not** included within the image visual itself. The caption should remain separate.',
    '',
    '2. Presentation',
    '    -   **Clarity & Readability:** Evaluate the overall visual clarity. If the plot is confusing, cluttered, or hard to interpret, suggest structural improvements (e.g., better axis labeling, clearer legend, appropriate plot type).',
    '    -   **Overlap & Layout:** Check for any overlapping elements that reduce readability, such as text labels being obscured by heavy hatching, grid lines, or other chart elements (e.g., pie chart labels inside dark slices). If overlaps exist, suggest adjusting element positions (e.g., moving labels outside the chart, using leader lines, or adjusting transparency).',
    '    -   **Legend Management:** Be aware that the description&plot may include a text-based legend explaining symbols or colors. Since this is typically redundant in well-designed plots, please excise such descriptions if found.',
    '',
    '3. Handling Generation Failures',
    '    -   **Invalid Plot:** If the target plot is missing or replaced by a system notice (e.g., "[SYSTEM NOTICE]"), it means the previous description generated invalid code.',
    '    -   **Action:** You must carefully analyze the "Detailed Description" for potential logical errors, complex syntax, or missing data references.',
    '    -   **Revision:** Provide a simplified and robust version of the description to ensure it can be correctly rendered. Do not just repeat the same description.',
    '',
    '## INPUT DATA',
    '-   **Target Plot**: [The generated plot]',
    '-   **Detailed Description**: [The detailed description of the plot]',
    '-   **Raw Data**: [The raw data to be visualized]',
    '-   **Visual Intent**: [Visual intent of the desired plot]',
    '',
    '## OUTPUT',
    'Provide your response strictly in the following JSON format.',
    '',
    '```json',
    '{',
    '    "critic_suggestions": "Insert your detailed critique and specific suggestions for improvement here. If the plot is perfect, write \'No changes needed.\'",',
    '    "revised_description": "Insert the fully revised detailed description here, incorporating all your suggestions. If no changes are needed, write \'No changes needed.\'"',
    '}',
    '```',
  ].join('\n')
}

function plotCriticUserPrompt(rawData: string, visualIntent: string, description: string, referenceAnalysis = '', retrievalContext = '') {
  return withRetrievalContext(withReferenceAnalysis(
    `Target Plot for Critique:\nDetailed Description: ${description}\nRaw Data: ${rawData}\nVisual Intent: ${visualIntent}\nYour Output:`,
    referenceAnalysis,
  ), retrievalContext)
}

function plotVisualizerSystemPrompt() {
  return 'You are an expert statistical plot illustrator. Write code to generate high-quality statistical plots based on user requests.'
}

function plotVisualizerUserPrompt(description: string) {
  return [
    `Use python matplotlib to generate a statistical plot based on the following detailed description: ${description}`,
    '',
    'Requirements for the code:',
    "- Use the non-interactive Agg backend (the figure is captured automatically; do NOT call plt.show()).",
    '- Build exactly one matplotlib figure.',
    '- The code must be fully self-contained and runnable as-is.',
    '- Do not read or write any files, and do not access the network.',
    '- Only use the matplotlib, numpy, pandas, and math libraries (import what you need).',
    '- Embed all required data inline; do not rely on external data sources.',
    '',
    'Only provide the code without any explanations. Code:',
  ].join('\n')
}

function diagramPrompt(method: string, caption: string, referenceAnalysis = '', retrievalContext = '') {
  return diagramPromptFromDescription(
    withRetrievalContext(withReferenceAnalysis(
      `Create an academic method diagram for this methodology:\n${method}\n\nVisual intent:\n${caption}`,
      referenceAnalysis,
    ), retrievalContext),
  )
}

function diagramPromptFromDescription(description: string) {
  return [
    'Render a high-quality scientific diagram based on the following detailed description.',
    'Use a clean white or very light background, crisp vector-like shapes, readable labels, professional academic style.',
    'Do not include a figure title or caption inside the image.',
    '',
    description,
  ].join('\n')
}

function svgSystemPrompt() {
  return [
    'You are the SVG Diagram Agent for PaperBanana.',
    'Return one standalone, valid SVG document only. Do not use Markdown fences.',
    'Use inline SVG elements such as rect, circle, ellipse, path, line, polyline, polygon, text, defs, marker, linearGradient, and g.',
    'Do not use script, style, foreignObject, image, external URLs, event handlers, JavaScript links, or embedded HTML.',
    'Use a clean academic diagram style with readable labels, balanced whitespace, and a light background.',
    'Do not include the figure title or caption text inside the SVG.',
  ].join('\n')
}

function svgUserPrompt(description: string) {
  return [
    'Create an editable SVG academic diagram from this visual specification.',
    'Use viewBox="0 0 1600 900" unless the layout clearly needs another proportional viewBox.',
    'Prefer simple geometric shapes, arrows, concise labels, and semantic grouping.',
    '',
    description,
  ].join('\n')
}

function referenceVisionSystemPrompt() {
  return [
    'You are the Reference Image Analyst for PaperBanana.',
    'Analyze uploaded reference diagrams for reusable academic visual structure and style.',
    'Focus on layout, grouping, arrows, hierarchy, label placement, shape vocabulary, color palette, and visual density.',
    'Do not transcribe private details. Do not ask the generator to copy the reference image pixel-for-pixel.',
  ].join('\n')
}

function referenceVisionUserPrompt(method: string, caption: string) {
  return [
    'Analyze the attached reference image(s) for generating a new academic diagram.',
    'The new figure must be based on the methodology and caption below, not on the reference content itself.',
    '',
    `Methodology Section:\n${method}`,
    '',
    `Figure Caption:\n${caption}`,
    '',
    'Return a concise but detailed reference analysis with these sections:',
    '1. Layout structure to reuse',
    '2. Visual style cues to reuse',
    '3. Elements that should not be copied',
    '4. Practical guidance for an SVG/PNG diagram generator',
  ].join('\n')
}

function retrievalSystemPrompt() {
  return [
    '# Background & Goal',
    'We are building an **AI system to automatically generate method diagrams for academic papers**. Given a paper\'s methodology section and a figure caption, the system needs to create a high-quality illustrative diagram that visualizes the described method.',
    '',
    'To help the AI learn how to generate appropriate diagrams, we use a **few-shot learning approach**: we provide it with reference examples of similar diagrams. The AI will learn from these examples to understand what kind of diagram to create for the target.',
    '',
    '# Your Task',
    '**You are the Retrieval Agent.** Your job is to select the most relevant reference diagrams from a candidate pool that will serve as few-shot examples for the diagram generation model.',
    '',
    'You will receive:',
    '- **Target Input:** The methodology section and caption of the diagram we need to generate',
    '- **Candidate Pool:** Existing diagrams (each with methodology and caption)',
    '',
    'You must select the **Top 10 candidates** that would be most helpful as examples for teaching the AI how to draw the target diagram.',
    '',
    '# Selection Logic (Topic + Intent)',
    '',
    'Your goal is to find examples that match the Target in both **Domain** and **Diagram Type**.',
    '',
    '**1. Match Research Topic (Use Methodology & Caption):**',
    '* What is the domain? (e.g., Agent & Reasoning, Vision & Perception, Generative & Learning, Science & Applications).',
    '* Select candidates that belong to the **same research domain**.',
    '* *Why?* Similar domains share similar terminology (e.g., "Actor-Critic" in RL).',
    '',
    '**2. Match Visual Intent (Use Caption & Keywords):**',
    '* What type of diagram is implied? (e.g., "Framework", "Pipeline", "Detailed Module", "Performance Chart").',
    '* Select candidates with **similar visual structures**.',
    '* *Why?* A "Framework" diagram example is useless for drawing a "Performance Bar Chart", even if they are in the same domain.',
    '',
    '**Ranking Priority:**',
    '1.  **Best Match:** Same Topic AND Same Visual Intent (e.g., Target is "Agent Framework" -> Candidate is "Agent Framework", Target is "Dataset Construction Pipeline" -> Candidate is "Dataset Construction Pipeline").',
    '2.  **Second Best:** Same Visual Intent (e.g., Target is "Agent Framework" -> Candidate is "Vision Framework"). *Structure is more important than Topic for drawing.*',
    '3.  **Avoid:** Different Visual Intent (e.g., Target is "Pipeline" -> Candidate is "Bar Chart").',
    '',
    '# Output Format',
    'Provide your output strictly as a single valid JSON object containing only the **exact IDs** of the Top 10 selected diagrams (use the exact IDs from the Candidate Pool). Select at most 10 ids.',
    'Return JSON only: {"ids":["id-1","id-2"]}.',
  ].join('\n')
}

function retrievalUserPrompt(method: string, caption: string, candidates: any[]) {
  return [
    `Methodology Section:\n${method}`,
    '',
    `Figure Caption:\n${caption}`,
    '',
    'Candidate reference examples:',
    JSON.stringify(candidates),
    '',
    'Choose examples whose layout and visual intent best match the target figure.',
  ].join('\n')
}

// Edit prompt sent directly to an image model that accepts the source image
// as input (true image-to-image conditioned edit).
function refineEditPrompt(instruction: string, imageSize: string) {
  return [
    'You are editing the attached source diagram image directly.',
    'Apply the requested edits to the existing image while preserving everything else: keep the original layout, structure, labels, colors, and style intact except where the instruction requires a change.',
    'Produce a high-quality academic diagram. Do not add a figure title or caption text inside the image.',
    '',
    `Edit instruction:\n${instruction}`,
    '',
    `Target quality: ${imageSize}`,
  ].join('\n')
}

function refineSystemPrompt() {
  return [
    'You are the PaperBanana Refine Agent.',
    'The user provides an existing generated diagram image and an edit instruction.',
    'Inspect the image, preserve its useful structure, and write a complete revised visual description for a new high-quality academic diagram that applies the requested edits.',
    'The next model will render the edited diagram from your description.',
  ].join('\n')
}

function refineUserPrompt(instruction: string, imageSize: string) {
  return [
    'Source image is attached.',
    `Edit instruction:\n${instruction}`,
    '',
    `Target quality: ${imageSize}`,
    '',
    'Return the complete revised visual description only, preserving the parts of the original image not covered by the edit instruction.',
  ].join('\n')
}

function neuripsDiagramStyleGuide() {
  return [
    '### 1. The "NeurIPS Look"',
    'The prevailing aesthetic for 2025 is **"Soft Tech & Scientific Pastels."**',
    'Gone are the days of harsh primary colors and sharp black boxes. The modern NeurIPS diagram feels approachable yet precise. It utilizes high-value (light) backgrounds to organize complexity, reserving saturation for the most critical active elements. The vibe balances **clean modularity** (clear separation of parts) with **narrative flow** (clear left-to-right progression).',
    '',
    '---',
    '',
    '### 2. Detailed Style Options',
    '',
    '#### **A. Color Palettes**',
    '*Design Philosophy: Use color to group logic, not just to decorate. Avoid fully saturated backgrounds.*',
    '',
    '**Background Fills (The "Zone" Strategy)**',
    '*Used to encapsulate stages (e.g., "Pre-training phase") or environments.*',
    '*   **Most papers use:** Very light, desaturated pastels (Opacity ~10–15%).',
    '*   **Aesthetically pleasing options include:**',
    '    *   🍦 **Cream / Beige** (e.g., `#F5F5DC`) – *Warm, academic feel.*',
    '    *   ☁️ **Pale Blue / Ice** (e.g., `#E6F3FF`) – *Clean, technical feel.*',
    '    *   🌿 **Mint / Sage** (e.g., `#E0F2F1`) – *Soft, organic feel.*',
    '    *   🌸 **Pale Lavender** (e.g., `#F3E5F5`) – *distinctive, modern feel.*',
    '*   **Alternative (~20%):** White backgrounds with colored *dashed borders* for a high-contrast, minimalist look (common in theoretical papers).',
    '',
    '**Functional Element Colors**',
    '*   **For "Active" Modules (Encoders, MLP, Attention):** Medium saturation is preferred.',
    '    *   *Common pairings:* Blue/Orange, Green/Purple, or Teal/Pink.',
    '    *   *Observation:* Colors are often used to distinguish **status** rather than component type:',
    '        *   **Trainable Elements:** Often Warm tones (Red, Orange, Deep Pink).',
    '        *   **Frozen/Static Elements:** Often Cool tones (Grey, Ice Blue, Cyan).',
    '*   **For Highlights/Results:** High saturation (Primary Red, Bright Gold) is strictly reserved for "Error/Loss," "Ground Truth," or the final output.',
    '',
    '#### **B. Shapes & Containers**',
    '*Design Philosophy: "Softened Geometry." Sharp corners are for data; rounded corners are for processes.*',
    '',
    '**Core Components**',
    '*   **Process Nodes (The Standard):** Rounded Rectangles (Corner radius 5–10px). This is the dominant shape (~80%) for generic layers or steps.',
    '*   **Tensors & Data:**',
    '    *   **3D Stacks/Cuboids:** Used to imply depth/volume (e.g., $B \\times H \\times W$).',
    '    *   **Flat Squares/Grids:** Used for matrices, tokens, or attention maps.',
    '    *   **Cylinders:** Exclusively reserved for Databases, Buffers, or Memory.',
    '',
    '**Grouping & Hierarchy**',
    '*   **The "Macro-Micro" Pattern:** A solid, light-colored container represents the global view, with a specific module (e.g., "Attention Block") connected via lines to a "zoomed-in" detailed breakout box.',
    '*   **Borders:**',
    '    *   **Solid:** For physical components.',
    '    *   **Dashed:** Highly prevalent for indicating "Logical Stages," "Optional Paths," or "Scopes."',
    '',
    '#### **C. Lines & Arrows**',
    '*Design Philosophy: Line style dictates flow type.*',
    '',
    '**Connector Styles**',
    '*   **Orthogonal / Elbow (Right Angles):** Most papers use this for **Network Architectures** (implies precision, matrices, and tensors).',
    '*   **Curved / Bezier:** Common choices include this for **System Logic, Feedback Loops, or High-Level Data Flow** (implies narrative and connection).',
    '',
    '**Line Semantics**',
    '*   **Solid Black/Grey:** Standard data flow (Forward pass).',
    '*   **Dashed Lines:** Universally recognized as "Auxiliary Flow."',
    '    *   *Used for:* Gradient updates, Skip connections, or Loss calculations.',
    '*   **Integrated Math:** Standard operators ($\\oplus$ for Add, $\\otimes$ for Concat/Multiply) are frequently placed *directly* on the line or intersection.',
    '',
    '#### **D. Typography & Icons**',
    '*Design Philosophy: Strict separation between "Labeling" and "Math."*',
    '',
    '**Typography**',
    '*   **Labels (Module Names):** **Sans-Serif** (Arial, Roboto, Helvetica).',
    '    *   *Style:* Bold for headers, Regular for details.',
    '*   **Variables (Math):** **Serif** (Times New Roman, LaTeX default).',
    '    *   *Rule:* If it is a variable in your equation (e.g., $x, \\theta, \\mathcal{L}$), it **must** be Serif and Italicized in the diagram.',
    '',
    '**Iconography Options**',
    '*   **For Model State:**',
    '    *   *Trainable:* 🔥 Fire, ⚡ Lightning.',
    '    *   *Frozen:* ❄️ Snowflake, 🔒 Padlock, 🛑 Stop Sign (Greyed out).',
    '*   **For Operations:**',
    '    *   *Inspection:* 🔍 Magnifying Glass.',
    '    *   *Processing/Computation:* ⚙️ Gear, 🖥️ Monitor.',
    '*   **For Content:**',
    '    *   *Text/Prompt:* 📄 Document, 💬 Chat Bubble.',
    '    *   *Image:* 🖼️ Actual thumbnail of an image (not just a square).',
    '',
    '---',
    '',
    '### 3. Common Pitfalls (How to look "Amateur")',
    '*   ❌ **The "PowerPoint Default" Look:** Using standard Blue/Orange presets with heavy black outlines.',
    '*   ❌ **Font Mixing:** Using Times New Roman for "Encoder" labels (makes the paper look dated to the 1990s).',
    '*   ❌ **Inconsistent Dimension:** Mixing flat 2D boxes and 3D isometric cubes without a clear reason (e.g., 2D for logic, 3D for tensors is fine; random mixing is not).',
    '*   ❌ **Primary Backgrounds:** Using saturated Yellow or Blue backgrounds for grouping (distracts from the content).',
    '*   ❌ **Ambiguous Arrows:** Using the same line style for "Data Flow" and "Gradient Flow."',
    '',
    '---',
    '',
    '### 4. Domain-Specific Styles',
    '',
    '**If you are writing an AGENT / LLM Paper:**',
    '*   **Vibe:** Illustrative, Narrative, "Friendly.", Cartoony.',
    '*   **Key Elements:** Use "User Interface" aesthetics. Chat bubbles for prompts, document icons for retrieval.',
    "*   **Characters:** It is common to use cute 2D vector robots, human avatars, or emojis to humanize the agent's reasoning steps.",
    '',
    '**If you are writing a COMPUTER VISION / 3D Paper:**',
    '*   **Vibe:** Spatial, Dense, Geometric.',
    '*   **Key Elements:** Frustums (camera cones), Ray lines, and Point Clouds.',
    '*   **Color:** Often uses RGB color coding to denote axes or channel correspondence. Use heatmaps (Rainbow/Viridis) to show activation.',
    '',
    '**If you are writing a THEORETICAL / OPTIMIZATION Paper:**',
    '*   **Vibe:** Minimalist, Abstract, "Textbook."',
    '*   **Key Elements:** Focus on graph nodes (circles) and manifolds (planes/surfaces).',
    '*   **Color:** Restrained. mostly Grayscale/Black/White with one highlight color (e.g., Gold or Blue). Avoid "cartoony" elements.',
  ].join('\n')
}

function neuripsPlotStyleGuide() {
  return [
    '# NeurIPS 2025 Statistical Plot Aesthetics Guide',
    '',
    '## 1. The "NeurIPS Look": A High-Level Overview',
    'The prevailing aesthetic for 2025 is defined by **precision, accessibility, and high contrast**. The "default" academic look has shifted away from bare-bones styling toward a more graphic, publication-ready presentation.',
    '',
    '*   **Vibe:** Professional, clean, and information-dense.',
    '*   **Backgrounds:** There is a heavy bias toward **stark white backgrounds** for maximum contrast in print and PDF reading, though the "Seaborn-style" light grey background remains an accepted variant.',
    '*   **Accessibility:** A strong emphasis on distinguishing data not just by color, but by texture (patterns) and shape (markers) to support black-and-white printing and colorblind readers.',
    '',
    '---',
    '',
    '## 2. Detailed Style Options',
    '',
    '### **Color Palettes**',
    '*   **Categorical Data:**',
    '    *   **Soft Pastels:** Matte, low-saturation colors (salmon, sky blue, mint, lavender) are frequently used to prevent visual fatigue.',
    '    *   **Muted Earth Tones:** "Academic" palettes using olive, beige, slate grey, and navy.',
    '    *   **High-Contrast Primaries:** Used sparingly when categories must be distinct (e.g., deep orange vs. vivid purple).',
    '    *   **Accessibility Mode:** A growing trend involves combining color with **geometric patterns** (hatches, dots, stripes) to differentiate categories.',
    '*   **Sequential & Heatmaps:**',
    '    *   **Perceptually Uniform:** "Viridis" (blue-to-yellow) and "Magma/Plasma" (purple-to-orange) are the standard.',
    '    *   **Diverging:** "Coolwarm" (blue-to-red) is used for positive/negative value splits.',
    '    *   **Avoid:** The traditional "Jet/Rainbow" scale is almost entirely absent.',
    '',
    '### **Axes & Grids**',
    '*   **Grid Style:**',
    '    *   **Visibility:** Grid lines are almost rarely solid. Common choices include **fine dashed (`--`)** or **dotted (`:`)** lines in light gray.',
    '    *   **Placement:** Grids are consistently rendered *behind* data elements (low Z-order).',
    '*   **Spines (Borders):**',
    '    *   **The "Boxed" Look:** A full enclosure (black spines on all 4 sides) is very common.',
    '    *   **The "Open" Look:** Removing the top and right spines for a minimalist appearance.',
    '*   **Ticks:**',
    '    *   **Style:** Ticks are generally subtle, facing inward, or removed entirely in favor of grid alignment.',
    '',
    '### **Layout & Typography**',
    '*   **Typography:**',
    '    *   **Font Family:** Exclusively **Sans-Serif** (resembling Helvetica, Arial, or DejaVu Sans). Serif fonts are rarely used for labels.',
    '    *   **Label Rotation:** X-axis labels are rotated **45 degrees** only when necessary to prevent overlap; otherwise, horizontal orientation is preferred.',
    '*   **Legends:**',
    '    *   **Internal Placement:** Floating the legend *inside* the plot area (top-left or top-right) to maximize the "data-ink ratio."',
    '    *   **Top Horizontal:** Placing the legend in a single row above the plot title.',
    '*   **Annotations:**',
    '    *   **Direct Labeling:** Instead of forcing readers to reference a legend, text is often placed directly next to lines or on top of bars.',
    '',
    '---',
    '',
    '## 3. Type-Specific Guidelines',
    '',
    '### **Bar Charts & Histograms**',
    '*   **Borders:** Two distinct styles are accepted:',
    '    *   **High-Definition:** Using **black outlines** around colored bars for a "comic-book" or high-contrast look.',
    '    *   **Borderless:** Solid color fills with no outline (often used with light grey backgrounds).',
    '*   **Grouping:** Bars are grouped tightly, with significant whitespace between categorical groups.',
    '*   **Error Bars:** Consistently styled with **black, flat caps**.',
    '',
    '### **Line Charts**',
    '*   **Markers:** A critical observation: Lines almost always include **geometric markers** (circles, squares, diamonds) at data points, rather than just being smooth strokes.',
    '*   **Line Styles:** Use **dashed lines** (`--`) for theoretical limits, baselines, or secondary data, and **solid lines** for primary experimental data.',
    '*   **Uncertainty:** Represented by semi-transparent **shaded bands** (confidence intervals) rather than simple vertical error bars.',
    '',
    '### **Tree & Pie/Donut Charts**',
    '*   **Separators:** Thick **white borders** are standard to separate slices or treemap blocks.',
    '*   **Structure:** Thick **Donut charts** are preferred over traditional Pie charts.',
    '*   **Emphasis:** "Exploding" (detaching) a specific slice is a common technique to highlight a key statistic.',
    '',
    '### **Scatter Plots**',
    '*   **Shape Coding:** Use different marker shapes (e.g., circles vs. triangles) to encode a categorical dimension alongside color.',
    '*   **Fills:** Markers are typically solid and fully opaque.',
    '*   **3D Plots:** Depth is emphasized by drawing "walls" with grids or using drop-lines to the "floor" of the plot.',
    '',
    '### **Heatmaps**',
    '*   **Aspect Ratio:** Cells are almost strictly **square**.',
    '*   **Annotation:** Writing the exact value (in white or black text) **inside the cell** is highly preferred over relying solely on a color bar.',
    '*   **Borders:** Cells are often borderless (smooth gradient look) or separated by very thin white lines.',
    '',
    '### **Radar Charts**',
    '*   **Fills:** The polygon area uses **translucent fills** (alpha ~0.2) to show grid lines underneath.',
    '*   **Perimeter:** The outer boundary is marked by a solid, darker line.',
    '',
    '### **Miscellaneous**',
    '*   **Dot Plots:** Used as a modern alternative to bar charts; often styled as "lollipops" (dots connected to the axis by a thin line).',
    '',
    '---',
    '',
    '## 4. Common Pitfalls (What to Avoid)',
    '*   **The "Excel Default" Look:** Avoid heavy 3D effects on bars, shadow drops, or serif fonts (Times New Roman) on axes.',
    '*   **The "Rainbow" Map:** Avoid the Jet/Rainbow colormap; it is considered outdated and perceptually misleading.',
    '*   **Ambiguous Lines:** A line chart *without* markers can look ambiguous if data points are sparse; always add markers.',
    '*   **Over-reliance on Color:** Failing to use patterns or shapes to distinguish groups makes the plot inaccessible to colorblind readers.',
    '*   **Cluttered Grids:** Avoid solid black grid lines; they compete with the data. Always use light grey/dashed grids.',
  ].join('\n')
}

function withReferenceAnalysis(text: string, referenceAnalysis = '') {
  if (!referenceAnalysis.trim()) return text
  return [
    text,
    '',
    'Reference image analysis for VISUAL STYLE guidance (not structure):',
    referenceAnalysis.trim(),
    '',
    'Adopt the reference\'s visual style — its color palette, shape/line language, iconography, and typography — so the final figure clearly and strongly feels stylistically consistent with the reference. However, do NOT copy the reference\'s spatial layout or composition: the figure\'s structure — the number, type, and arrangement of blocks and the overall flow — MUST be derived from the provided methodology and caption, not from the reference. Let the content drive the layout so the result stays internally coherent, even when the reference depicts an unrelated subject.',
  ].join('\n')
}

// When reference images are attached to the model call, the prompt itself must
// explicitly instruct the model to adopt them — otherwise the model sees the
// image with zero instruction to use it (e.g. main_model mode, where no textual
// analysis is produced). No-op when no images are attached.
function withReferenceImageInstruction(text: string, hasReferenceImages = false) {
  if (!hasReferenceImages) return text
  return [
    text,
    '',
    'IMPORTANT: One or more reference images are ATTACHED to this request. Treat them as VISUAL STYLE references only: distil a single coherent visual style from them — color palette, shape/line language, iconography, and typography — so the generated figure feels clearly and strongly stylistically consistent. Do NOT replicate any reference\'s spatial layout or composition, and when several references are attached do not merge their structures. The figure\'s layout — the number, type, and arrangement of blocks and the overall flow — MUST be derived from the provided methodology/data and caption, never from the references, so the result stays internally coherent even when a reference depicts an unrelated subject. Keep the semantic content faithful to the methodology/data and caption.',
  ].join('\n')
}

function withRetrievalContext(text: string, retrievalContext = '') {
  if (!retrievalContext.trim()) return text
  return [
    text,
    '',
    'Retrieved PaperBanana reference examples for layout/style guidance:',
    retrievalContext.trim(),
    '',
    'Use these examples as high-level few-shot guidance. Do not copy their scientific content unless it matches the provided methodology.',
  ].join('\n')
}

function withInfographicCategory(text: string, infographicCategory = '') {
  const category = String(infographicCategory || '').trim()
  if (!category) return text
  return [
    text,
    '',
    `Infographic category: ${category} — emphasize the conventions of this figure type.`,
  ].join('\n')
}

function sanitizeSvg(raw: string) {
  return sanitizeSvgMarkup(raw, false, 'SVG output')
}

function sanitizeReferenceSvg(raw: string) {
  return sanitizeSvgMarkup(raw, true, 'SVG reference image')
}

function sanitizeSvgMarkup(raw: string, allowImageElement: boolean, label: string) {
  let svg = extractSvg(raw)
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()

  if (!/^<svg[\s>]/i.test(svg)) {
    throw new Error(`${label} did not contain a valid <svg> root`)
  }

  const forbiddenElement = allowImageElement
    ? /<(script|foreignObject|iframe|object|embed|link|meta|base|audio|video|canvas)\b/i
    : /<(script|foreignObject|iframe|object|embed|link|meta|base|audio|video|canvas|image)\b/i
  if (forbiddenElement.test(svg)) {
    throw new Error(`${label} contained unsupported unsafe elements`)
  }

  const styleBlocks = [...svg.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1] || '')
  const unsafeStylePattern = /(@import|javascript:|url\s*\(\s*['"]?\s*(?:https?:|data:|file:|javascript:))/i
  if (styleBlocks.some((style) => unsafeStylePattern.test(style))) {
    throw new Error(`${label} contained unsupported unsafe style references`)
  }

  const unsafePattern = /(on[a-z]+\s*=|javascript:|data:text\/html|@import|url\s*\(\s*['"]?\s*(?:https?:|data:|file:|javascript:)|href\s*=\s*['"]?\s*(?:https?:|data:|file:|javascript:)|xlink:href\s*=\s*['"]?\s*(?:https?:|data:|file:|javascript:))/i
  if (unsafePattern.test(svg)) {
    throw new Error(`${label} contained unsupported unsafe references`)
  }

  svg = svg.replace(/\s+xmlns:xlink=(["'])[^"']*\1/gi, '')
  if (!/\sxmlns=/.test(svg)) {
    svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  return svg
}

function extractSvg(raw: string) {
  const text = String(raw || '')
    .trim()
    .replace(/^```(?:svg|xml)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  const start = text.search(/<svg[\s>]/i)
  const end = text.toLowerCase().lastIndexOf('</svg>')
  if (start < 0 || end < 0) {
    throw new Error('SVG model did not return SVG markup')
  }
  return text.slice(start, end + '</svg>'.length)
}

function normalizeUploadDescriptor(file: ReferenceUploadDescriptor) {
  const filename = sanitizeFilename(file?.filename || 'reference')
  const mimeType = normalizeReferenceMimeType(file?.mimeType, filename)
  const size = Number(file?.size || 0)
  const isAnalysis = file?.role === 'analysis'
  const allowed = isAnalysis ? allowedAnalysisMimeTypes : allowedReferenceMimeTypes
  if (!allowed.has(mimeType)) throw new Error(`Unsupported reference image type: ${mimeType || 'unknown'}`)
  if (!size || size < 1) throw new Error('Reference image size is required')
  if (size > maxReferenceBytes) throw new Error('Reference image exceeds 5MB limit')
  return {
    filename,
    mimeType,
    size,
    role: isAnalysis ? 'analysis' as const : 'original' as const,
  }
}

function normalizeReferenceImages(images: ReferenceImageInput[]): StoredReferenceImage[] {
  if (!Array.isArray(images) || !images.length) return []
  if (images.length > maxReferenceImages) throw new Error(`Reference image count exceeds ${maxReferenceImages}`)

  return images.map((image) => {
    const filename = sanitizeFilename(image.filename || 'reference')
    const mimeType = normalizeReferenceMimeType(image.mimeType, filename)
    const size = Number(image.size || 0)
    validateReferenceFileMeta(mimeType, size, allowedReferenceMimeTypes)
    validateObjectKey(image.objectKey)
    verifyReferenceUploadToken(image.objectKey, mimeType, size, image.uploadToken || '')

    const normalized: StoredReferenceImage = {
      filename,
      mimeType,
      size,
      objectKey: image.objectKey,
      storage: 'bucket',
    }

    if (image.analysisObjectKey || image.analysisMimeType || image.analysisUploadToken) {
      const analysisMimeType = normalizeReferenceMimeType(image.analysisMimeType || '', image.analysisObjectKey || 'analysis.png')
      const analysisSize = Number(image.analysisSize || 0)
      validateReferenceFileMeta(analysisMimeType, analysisSize, allowedAnalysisMimeTypes)
      validateObjectKey(image.analysisObjectKey || '')
      verifyReferenceUploadToken(image.analysisObjectKey || '', analysisMimeType, analysisSize, image.analysisUploadToken || '')
      normalized.analysisObjectKey = image.analysisObjectKey
      normalized.analysisMimeType = analysisMimeType
      normalized.analysisSize = analysisSize
    }

    return normalized
  })
}

export async function verifyUploadedReferenceObjects(
  images: StoredReferenceImage[],
  storageBucket: any = cloud.storage.bucket(bucketName),
): Promise<void> {
  if (!images.length) return
  if (typeof storageBucket?.headFile !== 'function') {
    if (process.env.PAPERBANANA_STRICT_OBJECT_STORAGE === 'true') {
      const error: any = new Error('Object metadata verification is unavailable')
      error.statusCode = 503
      throw error
    }
    // Historical Laf buckets did not expose HEAD/stat. Keep the rollback path
    // backward compatible; the Node service always enables strict mode and its
    // adapter always implements headFile.
    return
  }

  const declaredObjects: Array<{ key: string; mimeType: string; size: number }> = []
  for (const image of images) {
    declaredObjects.push({ key: image.objectKey, mimeType: image.mimeType, size: image.size })
    if (image.analysisObjectKey) {
      declaredObjects.push({
        key: image.analysisObjectKey,
        mimeType: image.analysisMimeType || '',
        size: Number(image.analysisSize || 0),
      })
    }
  }

  for (const declared of declaredObjects) {
    let actual: { size?: number; mimeType?: string }
    try {
      actual = await storageBucket.headFile(declared.key)
    } catch (cause: any) {
      const error: any = new Error(`Unable to verify uploaded reference object ${declared.key}: ${cause?.message || String(cause)}`)
      error.statusCode = 503
      throw error
    }
    const actualSize = Number(actual?.size)
    const actualMimeType = String(actual?.mimeType || '').split(';', 1)[0]!.trim().toLowerCase()
    const matches = Number.isSafeInteger(actualSize)
      && actualSize >= 1
      && actualSize <= maxReferenceBytes
      && actualSize === declared.size
      && actualMimeType === declared.mimeType.toLowerCase()
    if (!matches) {
      try { await storageBucket.deleteFile(declared.key) } catch {}
      const error: any = new Error(`Uploaded reference metadata does not match the signed declaration: ${declared.key}`)
      error.statusCode = 400
      throw error
    }
  }
}

function validateReferenceFileMeta(mimeType: string, size: number, allowedTypes: Set<string>) {
  if (!allowedTypes.has(mimeType)) throw new Error(`Unsupported reference image type: ${mimeType || 'unknown'}`)
  if (!size || size < 1) throw new Error('Reference image size is required')
  if (size > maxReferenceBytes) throw new Error('Reference image exceeds 5MB limit')
}

function signReferenceUpload(objectKey: string, mimeType: string, size: number, expiresAt: number) {
  const signature = referenceUploadSignature(objectKey, mimeType, size, expiresAt)
  return `v1.${expiresAt}.${signature}`
}

function verifyReferenceUploadToken(objectKey: string, mimeType: string, size: number, token: string) {
  const [version, expiresAtRaw, signature] = String(token || '').split('.')
  const expiresAt = Number(expiresAtRaw)
  if (version !== 'v1' || !expiresAt || !signature) throw new Error('Invalid reference upload token')
  if (Date.now() > expiresAt) throw new Error('Reference upload token expired')
  const expected = referenceUploadSignature(objectKey, mimeType, size, expiresAt)
  if (!safeEqual(signature, expected)) throw new Error('Invalid reference upload token')
}

function referenceUploadSignature(objectKey: string, mimeType: string, size: number, expiresAt: number) {
  return crypto
    .createHmac('sha256', referenceUploadSecret())
    .update([objectKey, mimeType, String(size), String(expiresAt)].join('\n'))
    .digest('hex')
}

function referenceUploadSecret() {
  return process.env.REFERENCE_UPLOAD_TOKEN_SECRET || process.env.ADMIN_TOKEN || 'paperbanana-reference-upload-dev-secret'
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function validateObjectKey(objectKey: string) {
  if (!/^references\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.(png|jpg|jpeg|webp|svg)$/i.test(objectKey || '')) {
    throw new Error('Invalid reference object key')
  }
}

function normalizeReferenceMimeType(mimeType: string, filename = '') {
  const normalized = String(mimeType || '').toLowerCase().split(';', 1)[0].trim()
  if (normalized === 'image/jpg') return 'image/jpeg'
  if (normalized) return normalized
  const lower = filename.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return ''
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/svg+xml') return 'svg'
  throw new Error(`Unsupported reference image type: ${mimeType}`)
}

function sanitizeFilename(filename: string) {
  const safe = String(filename || 'reference')
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^\w.\-\u4e00-\u9fa5 ]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return safe || 'reference'
}

function sanitizePathPart(value: string) {
  return String(value || 'anon').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80) || 'anon'
}

function randomId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function validateCreateBody(body: CreateJobBody) {
  if (!['openrouter', 'gemini', 'openai', 'bailian'].includes(body.provider)) throw new Error('Invalid provider')
  if (body.taskName && !['diagram', 'plot'].includes(body.taskName)) throw new Error('Invalid taskName. Must be diagram or plot.')
  if (!body.methodContent || body.methodContent.trim().length < 20) throw new Error('methodContent is too short')
  if (!body.caption || body.caption.trim().length < 3) throw new Error('caption is required')
  const requestedFormat = body.outputFormat || body.output_format
  if (requestedFormat && !['png', 'svg'].includes(requestedFormat)) throw new Error('Invalid outputFormat')
  if (!body.mainModelName) throw new Error('mainModelName is required')
  if (!body.imageModelName) throw new Error('imageModelName is required')
  if (body.referenceImageMode && !['auto', 'main_model', 'vision_model'].includes(body.referenceImageMode)) throw new Error('Invalid referenceImageMode')
  if (body.retrievalSetting && !allowedRetrievalSettings.has(body.retrievalSetting)) throw new Error('Invalid retrievalSetting')
  if (body.retrievalSetting === 'manual' && !normalizeManualReferenceIds(body.manualReferenceIds || []).length) {
    throw new Error('manualReferenceIds is required when retrievalSetting is manual')
  }
}

function validateRefineBody(body: RefineImageBody) {
  if (!['openrouter', 'gemini', 'openai', 'bailian'].includes(body.provider)) throw new Error('Invalid provider')
  if (!body.imageModelName) throw new Error('imageModelName is required')
  if (!body.sourceImageUrl && !body.sourceImageObjectKey) throw new Error('source image is required')
  const instruction = String(body.editInstruction || '').trim()
  if (instruction.length < 3) throw new Error('editInstruction is required')
  if (instruction.length > 2000) throw new Error('editInstruction exceeds 2000 characters')
}

function selectApiKey(provider: Provider, apiKeys: ApiKeys) {
  if (provider === 'openrouter') return apiKeys?.openrouter?.trim() || ''
  if (provider === 'gemini') return apiKeys?.gemini?.trim() || ''
  if (provider === 'openai') return apiKeys?.openai?.trim() || ''
  if (provider === 'bailian') return apiKeys?.bailian?.trim() || ''
  return ''
}

// Providers whose image model accepts a source image for a conditioned edit
// (true image-to-image). Bailian only supports text-to-image here, so it falls
// back to the describe-then-regenerate path.
function providerSupportsImageEdit(provider: Provider) {
  return provider === 'gemini' || provider === 'openrouter' || provider === 'openai'
}

async function publicJob(job: any) {
  return {
    id: job._id,
    status: job.status,
    provider: job.provider,
    jobType: job.jobType || 'generate',
    userId: job.userId || job.user_id || '',
    userEmail: job.userEmail || job.user_email || '',
    configurationMode: job.configurationMode || 'advanced',
    taskName: job.taskName || 'diagram',
    methodContent: job.methodContent,
    caption: job.caption,
    infographicCategory: job.infographicCategory || '',
    outputFormat: job.outputFormat || 'png',
    mainModelName: job.mainModelName,
    imageModelName: job.imageModelName,
    referenceVisionModelName: job.referenceVisionModelName || '',
    referenceImageMode: job.referenceImageMode || 'vision_model',
    referenceImageModeUsed: job.referenceImageModeUsed || ((job.referenceImages || []).length ? 'vision_model' : 'none'),
    pipelineMode: job.pipelineMode,
    retrievalSetting: job.retrievalSetting || 'none',
    manualReferenceIds: job.manualReferenceIds || [],
    retrievedReferenceIds: job.retrievedReferenceIds || [],
    retrievedReferences: job.retrievedReferences || [],
    stages: await refreshStageImages(job.stages || []),
    criticMode: job.criticMode || '',
    aspectRatio: job.aspectRatio,
    imageSize: job.imageSize || '',
    numCandidates: job.numCandidates,
    maxCriticRounds: job.maxCriticRounds,
    promptCharCount: job.promptCharCount,
    referenceImageCount: (job.referenceImages || []).length,
    referenceImages: await refreshReferenceImageUrls(job.referenceImages || []),
    resultImages: await refreshStoredImageUrls(job.resultImages || []),
    logs: job.logs || [],
    error: job.error || '',
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }
}

async function refreshStageImages(stages: any[]) {
  if (!stages.length) return []
  return await Promise.all(stages.map(async (stage) => {
    if (!stage?.image) return stage
    const refreshed = await refreshStoredImageUrls([stage.image])
    return { ...stage, image: refreshed[0] || stage.image }
  }))
}

async function refreshReferenceImageUrls(images: any[]) {
  if (!images.length) return []
  const refreshed = await refreshStoredImageUrls(images)
  const bucket = cloud.storage.bucket(bucketName)
  return await Promise.all(refreshed.map(async (image) => {
    let analysisUrl = image.analysisUrl || ''
    if (image.analysisObjectKey && !String(analysisUrl).startsWith('data:')) {
      try {
        analysisUrl = await bucket.getDownloadUrl(image.analysisObjectKey, 3600 * 24 * 7)
      } catch {
        analysisUrl = ''
      }
    }
    return {
      filename: image.filename || '',
      objectKey: image.objectKey || '',
      url: image.url || '',
      storage: image.storage || 'bucket',
      mimeType: image.mimeType || '',
      size: Number(image.size || 0),
      analysisObjectKey: image.analysisObjectKey || '',
      analysisUrl,
      analysisMimeType: image.analysisMimeType || '',
      analysisSize: Number(image.analysisSize || 0),
    }
  }))
}

async function refreshStoredImageUrls(images: any[]) {
  if (!images.length) return []
  const bucket = cloud.storage.bucket(bucketName)
  return await Promise.all(images.map(async (image) => {
    const objectKey = image?.objectKey || image?.filename
    if (!objectKey || String(image.url || '').startsWith('data:')) return image
    try {
      return {
        ...image,
        url: await bucket.getDownloadUrl(objectKey, 3600 * 24 * 7),
      }
    } catch {
      return image
    }
  }))
}

function ok(data: any) {
  return { code: 0, ...data }
}

function fail(message: string, status = 400) {
  return { code: status, error: message }
}

// ---------------------------------------------------------------------------
// Gateway trust boundary (IDOR guard).
//
// The public Laf endpoint trusts caller-supplied userId/userEmail, so any
// action that reads or writes a specific user's data must only be reachable
// through the auth-gateway. The gateway proves it forwarded an authenticated
// session by injecting the shared PAPERBANANA_GATEWAY_TOKEN; admin tooling may
// also call these actions directly with ADMIN_TOKEN. Without this check anyone
// can hit the Laf URL directly with a forged userId and read another user's
// jobs (method_content / caption / result image URLs), bypassing the gateway's
// session auth.
//
// Fail-open ONLY while PAPERBANANA_GATEWAY_TOKEN is unset, mirroring the
// gateway's opt-in design (withGatewayToken injects the token only when it is
// configured). Set the same secret on both the auth-gateway and this function
// to enforce the gate; until then the warning below flags the open state.
// ---------------------------------------------------------------------------
function isValidGatewayToken(body: any) {
  const expected = process.env.PAPERBANANA_GATEWAY_TOKEN || ''
  return Boolean(expected && body?.gatewayToken === expected)
}

function isValidAdminToken(body: any) {
  const expected = process.env.ADMIN_TOKEN || ''
  return Boolean(expected && body?.adminToken === expected)
}

function requireTrustedCaller(body: any) {
  const expected = process.env.PAPERBANANA_GATEWAY_TOKEN || ''
  if (!expected) {
    console.warn(
      '[paperbanana-api] PAPERBANANA_GATEWAY_TOKEN is not set; identity-scoped actions are open to direct calls. Set it to the same value as the auth-gateway to enforce the gateway trust boundary.',
    )
    return null
  }
  if (isValidGatewayToken(body) || isValidAdminToken(body)) return null
  return fail('Unauthorized: requests must go through the auth gateway.', 401)
}

function normalizeBody(body: any) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return {}
    }
  }
  return body || {}
}

function getClientIp(ctx: FunctionContext) {
  const authenticated = ctx.headers?.['x-paperbanana-client-ip']
  if (Array.isArray(authenticated)) return String(authenticated[0] || '').split(',')[0].trim()
  if (authenticated) return String(authenticated).split(',')[0].trim()
  const forwarded = ctx.headers?.['x-forwarded-for']
  if (Array.isArray(forwarded)) return String(forwarded[0] || '').split(',')[0].trim()
  if (forwarded) return String(forwarded).split(',')[0].trim()
  return String(ctx.headers?.['x-real-ip'] || '').split(',')[0].trim()
}

function jobAdmissionPrincipal(
  body: Pick<CreateExecutionBody | RefineExecutionBody, 'userId' | 'userEmail'>,
  ctx: FunctionContext,
): JobPrincipal {
  const ip = getClientIp(ctx) || 'unknown'
  const userId = String(body.userId || '').trim()
  const userEmail = String(body.userEmail || '').trim().toLowerCase()
  const owner = userId ? `user:${userId}` : userEmail ? `email:${userEmail}` : `anonymous:${ip}`
  return { ownerKey: owner, ipKey: `ip:${ip}` }
}

function toOpenRouterModel(model: string) {
  const raw = normalizeModelName('openrouter', model).replace(/^openrouter\//, '')
  if (raw.includes('/')) return raw
  if (raw.startsWith('gemini')) return `google/${raw}`
  return raw
}

function normalizeModelName(provider: string, model: string) {
  if (provider === 'gemini' && model === 'gemini-3.1-flash-image-preview') return 'gemini-3.1-flash-image'
  return model
}

function normalizeOutputFormat(format?: string): OutputFormat {
  return format === 'svg' ? 'svg' : 'png'
}

function normalizeTaskName(taskName?: string): TaskName {
  return taskName === 'plot' ? 'plot' : 'diagram'
}

function normalizeRetrievalSetting(setting?: string): RetrievalSetting {
  return allowedRetrievalSettings.has(setting as RetrievalSetting) ? setting as RetrievalSetting : 'none'
}

function normalizeManualReferenceIds(ids: string[]) {
  if (!Array.isArray(ids)) return []
  return [...new Set(ids.map((id) => limitText(id, 120)).filter(Boolean))].slice(0, 10)
}

function normalizeAspectRatio(aspectRatio?: string): '16:9' | '21:9' | '3:2' | '1:1' {
  if (aspectRatio === '21:9' || aspectRatio === '3:2' || aspectRatio === '1:1') return aspectRatio
  return '16:9'
}

function normalizeReferenceImageMode(mode?: string): ReferenceImageMode {
  if (mode === 'auto' || mode === 'main_model' || mode === 'vision_model') return mode
  return 'vision_model'
}

function normalizeFeedbackCategory(category?: string): FeedbackCategory {
  return allowedFeedbackCategories.has(category as FeedbackCategory) ? category as FeedbackCategory : 'other'
}

function normalizeFeedbackPlatform(platform?: string): FeedbackPlatform | '' {
  return allowedFeedbackPlatforms.has(platform as FeedbackPlatform) ? platform as FeedbackPlatform : ''
}

function limitText(value: any, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength)
}

async function resolveSourceImageUrl(body: RefineExecutionBody) {
  const direct = limitText(body.sourceImageUrl, 1200)
  if (direct) return direct
  const objectKey = limitText(body.sourceImageObjectKey, 300)
  if (!objectKey) throw new Error('source image is required')
  const mimeType = inferMimeTypeFromUrl(objectKey)
  const bytes = await readStoredObject(
    cloud.storage.bucket(bucketName),
    objectKey,
    maxReferenceBytes,
    'Refine source image download',
  )
  return `data:${mimeType};base64,${bytes.toString('base64')}`
}

function inferMimeTypeFromUrl(url: string) {
  const value = String(url || '').toLowerCase()
  const dataMatch = value.match(/^data:([^;,]+)/)
  if (dataMatch?.[1]) return dataMatch[1]
  if (value.includes('.svg')) return 'image/svg+xml'
  if (value.includes('.webp')) return 'image/webp'
  if (value.includes('.jpg') || value.includes('.jpeg')) return 'image/jpeg'
  return 'image/png'
}

function parseReferenceIds(raw: string): string[] {
  const json = parseJsonObject(raw)
  if (Array.isArray(json?.ids)) return json.ids.map((id: any) => String(id)).filter(Boolean)
  if (Array.isArray(json)) return json.map((id: any) => String(id)).filter(Boolean)
  return [...String(raw || '').matchAll(/[A-Za-z0-9][A-Za-z0-9._:-]{2,}/g)].map((match) => match[0])
}

function parseJsonObject(raw: string) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function publicFeedback(item: any) {
  return {
    _id: item._id,
    id: item._id,
    message: item.message || '',
    category: item.category || 'other',
    jobId: item.jobId || '',
    platform: item.platform || '',
    clientVersion: item.clientVersion || '',
    contact: item.contact || '',
    userId: item.userId || '',
    userEmail: item.userEmail || '',
    clientIp: redactClientIp(item.clientIp || ''),
    userAgent: limitText(item.userAgent, 160),
    status: item.status || 'new',
    createdAt: item.createdAt,
  }
}

function redactClientIp(ip: string) {
  const value = String(ip || '')
  if (!value || value === 'unknown') return value
  if (value.includes(':')) {
    const parts = value.split(':').filter(Boolean)
    if (parts.length <= 2) return `${parts[0] || ''}:*`
    return `${parts.slice(0, 3).join(':')}:*`
  }
  const parts = value.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`
  return value.replace(/.{3}$/, '***')
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(value, max))
}

// ---------------------------------------------------------------------------
// Admin-only / diagnostic: LLM-judge evaluation of a finished job's result
// image across 4 dimensions (faithfulness / conciseness / readability /
// aesthetics), ported from the root diagram_eval_prompts rubric. If the job has
// a reference/GT image, it runs a REFERENCED pairwise-style judge of the result
// vs. the reference; otherwise it runs a reference-free single-image quality
// scoring using the same dimensions. Self-contained; changes no existing action.
// ---------------------------------------------------------------------------
type EvalDimension = 'faithfulness' | 'conciseness' | 'readability' | 'aesthetics'
const evalDimensions: EvalDimension[] = ['faithfulness', 'conciseness', 'readability', 'aesthetics']

async function evaluateJob(body: EvaluateJobBody) {
  // ADMIN-GATE first, exactly like adminJobs/importReferences.
  const expected = process.env.ADMIN_TOKEN || ''
  if (!expected) return fail('Admin API disabled: ADMIN_TOKEN is not configured', 503)
  if (body.adminToken !== expected) return fail('Invalid admin token', 401)

  const jobId = limitText(body.jobId, 200)
  if (!jobId) return fail('jobId is required', 400)
  const job = await jobs.findOne({ _id: jobId })
  if (!job) return fail('Job not found', 404)

  // Resolve the judge model. Default to the job's main model + provider, but
  // allow the caller to override provider/model/apiKey for a dedicated judge.
  const provider = (['openrouter', 'gemini', 'openai', 'bailian'].includes(String(body.provider))
    ? body.provider
    : job.provider) as Provider
  const model = normalizeModelName(provider, limitText(body.model, 120) || job.mainModelName || job.referenceVisionModelName)
  const apiKey = limitText(body.apiKey, 400)
  if (!apiKey) return fail('apiKey is required to run the LLM judge', 400)
  if (!model) return fail('No judge model available for this job', 400)

  // The result image to grade.
  const resultUrl = await firstResultImageUrl(job)
  if (!resultUrl) return fail('Job has no result image to evaluate', 400)

  // Pairwise GT ("referenced") mode requires a TRUE same-figure ground truth:
  // a user-UPLOADED reference image attached to THIS job. Retrieved bench
  // references are a DIFFERENT paper's figure, so they do NOT qualify (see
  // uploadedReferenceImageUrl). Without an uploaded reference we fall back to
  // reference-free single-image scoring.
  const referenceUrl = await uploadedReferenceImageUrl(job)
  const method = String(job.methodContent || '')
  const caption = String(job.caption || '')

  if (referenceUrl) {
    const scores = {} as Record<EvalDimension, number>
    const winners = {} as Record<EvalDimension, string>
    const reasoningParts: string[] = []
    for (const dimension of evalDimensions) {
      const raw = await callTextModel(
        provider,
        model,
        apiKey,
        referencedEvalSystemPrompt(dimension),
        referencedEvalUserPrompt(dimension, method, caption),
        [
          { filename: 'reference.png', mimeType: 'image/png', url: referenceUrl },
          { filename: 'model.png', mimeType: 'image/png', url: resultUrl },
        ],
      )
      const parsed = parseReferencedVerdict(raw)
      scores[dimension] = parsed.score
      winners[dimension] = parsed.winner
      reasoningParts.push(`${dimension}: ${parsed.winner} — ${parsed.reasoning}`)
    }
    // Tiered outcome (ported from root _determine_tier_outcome,
    // utils/eval_toolkits.py:299-312): Tier 1 = Faithfulness + Readability
    // decides; only on a Tier-1 tie does Tier 2 = Conciseness + Aesthetics
    // decide. This tiered verdict is the PRIMARY 'overall'.
    const tier = tieredOutcome(winners)
    return ok({
      mode: 'referenced',
      referenceSource: 'uploaded',
      jobId,
      judge: { provider, model },
      scores,
      winners,
      overall: tier.outcome,
      overallNumeric: roundScore(averageScores(scores)),
      decisionPath: tier.decisionPath,
      reasoning: reasoningParts.join('\n\n'),
    })
  }

  const scores = {} as Record<EvalDimension, number>
  const reasoningParts: string[] = []
  for (const dimension of evalDimensions) {
    const raw = await callTextModel(
      provider,
      model,
      apiKey,
      referenceFreeEvalSystemPrompt(dimension),
      referenceFreeEvalUserPrompt(dimension, method, caption),
      [{ filename: 'model.png', mimeType: 'image/png', url: resultUrl }],
    )
    const parsed = parseReferenceFreeScore(raw)
    scores[dimension] = parsed.score
    reasoningParts.push(`${dimension}: ${parsed.score}/10 — ${parsed.reasoning}`)
  }
  const overall = roundScore(averageScores(scores))
  return ok({
    mode: 'reference_free',
    referenceSource: 'none',
    jobId,
    judge: { provider, model },
    scores,
    overall,
    reasoning: reasoningParts.join('\n\n'),
  })
}

async function firstResultImageUrl(job: any): Promise<string> {
  const images = await refreshStoredImageUrls(job.resultImages || [])
  for (const image of images) {
    const url = String(image?.url || '')
    if (url) return url
  }
  return ''
}

async function uploadedReferenceImageUrl(job: any): Promise<string> {
  // ONLY a user-UPLOADED reference image attached to THIS job qualifies as a
  // true same-figure ground truth for the pairwise "Human-drawn figure of THIS
  // paper" judge. Retrieved PaperBananaBench references belong to DIFFERENT
  // papers, so they are intentionally NOT considered here (they would make the
  // pairwise verdict meaningless). Prefer the analysis raster when present.
  const uploaded = await refreshReferenceImageUrls(job.referenceImages || [])
  for (const image of uploaded) {
    const url = String(image?.analysisUrl || image?.url || '')
    if (url && !String(image?.mimeType || '').includes('svg')) return url
    if (url) return url
  }
  return ''
}

// Maps a pairwise verdict to a 0-10 score: Model wins -> 9, Both good -> 7,
// Human wins (model loses but is acceptable) -> 4, Both bad -> 2.
function parseReferencedVerdict(raw: string): { winner: string; score: number; reasoning: string } {
  const json = parseJsonObject(raw) || {}
  const winnerRaw = String(json.winner || '').trim().toLowerCase()
  const reasoning = limitText(json.comparison_reasoning || json.reasoning || raw, 4000)
  let winner = 'Both are good'
  let score = 7
  if (winnerRaw === 'model') { winner = 'Model'; score = 9 }
  else if (winnerRaw === 'human') { winner = 'Human'; score = 4 }
  else if (winnerRaw === 'both are bad') { winner = 'Both are bad'; score = 2 }
  else if (winnerRaw === 'both are good') { winner = 'Both are good'; score = 7 }
  return { winner, score, reasoning }
}

function parseReferenceFreeScore(raw: string): { score: number; reasoning: string } {
  const json = parseJsonObject(raw) || {}
  const score = clamp(Math.round(Number(json.score)), 0, 10)
  const reasoning = limitText(json.reasoning || raw, 4000)
  return { score: Number.isFinite(score) ? score : 0, reasoning }
}

function averageScores(scores: Record<EvalDimension, number>) {
  const values = evalDimensions.map((dimension) => Number(scores[dimension] || 0))
  return values.reduce((sum, value) => sum + value, 0) / (values.length || 1)
}

// Ported from root _determine_tier_outcome (utils/eval_toolkits.py:96-117):
// given two pairwise dimension outcomes, decide the tier winner.
function determineTierOutcome(dim1Outcome: string, dim2Outcome: string): string {
  const o1 = String(dim1Outcome || '').trim()
  const o2 = String(dim2Outcome || '').trim()
  const neutral = (o: string) => o === 'Both are good' || o === 'Both are bad'
  // Both agree on a clear winner.
  if (o1 === o2) {
    if (neutral(o1)) return 'Tie'
    return o1
  }
  // One Model, one neutral.
  if ((o1 === 'Model' && neutral(o2)) || (o2 === 'Model' && neutral(o1))) return 'Model'
  // One Human, one neutral.
  if ((o1 === 'Human' && neutral(o2)) || (o2 === 'Human' && neutral(o1))) return 'Human'
  // Conflicting winners, etc.
  return 'Tie'
}

// Ported from root tiered rule (utils/eval_toolkits.py:299-312): Tier 1 =
// Faithfulness + Readability decides; only on a Tier-1 tie does Tier 2 =
// Conciseness + Aesthetics decide.
function tieredOutcome(winners: Record<EvalDimension, string>): { outcome: string; decisionPath: string } {
  const faithfulness = winners.faithfulness || 'Unknown'
  const readability = winners.readability || 'Unknown'
  const conciseness = winners.conciseness || 'Unknown'
  const aesthetics = winners.aesthetics || 'Unknown'
  const tier1 = determineTierOutcome(faithfulness, readability)
  if (tier1 === 'Model' || tier1 === 'Human') {
    return {
      outcome: tier1,
      decisionPath: `Tier1(${faithfulness}, ${readability}) -> ${tier1} [Decided at Tier 1]`,
    }
  }
  const tier2 = determineTierOutcome(conciseness, aesthetics)
  return {
    outcome: tier2,
    decisionPath: `Tier1(${faithfulness}, ${readability}) -> Tie; Tier2(${conciseness}, ${aesthetics}) -> ${tier2} [Decided at Tier 2]`,
  }
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100
}

// LLM-judge prompts ported from /tmp/pb-root/prompts/diagram_eval_prompts.py.
// The "referenced" variants are the pairwise Human-vs-Model judges; the
// "reference_free" variants reuse the same Core Definitions and Veto Rules to
// score a single image on a 0-10 scale.
function evalDimensionDefinition(dimension: EvalDimension) {
  if (dimension === 'faithfulness') {
    return [
      '# Core Definition: What is Faithfulness?',
      "**Faithfulness** is the technical alignment between the figure and the paper's content. A faithful figure must be factually correct, logically sound, and strictly follow the figure scope described in the **Caption**. It must preserve the **core logic flow** and **module interactions** mentioned in the Method Section without introducing fabrication. While simplification is encouraged (e.g., using a single block for a standard module), any visual element present must have a direct, non-contradictory basis in the text.",
      '',
      "**Important**: Since \"smart simplification\" is typically allowed and encouraged in academic figures, a figure which looks simpler is not necessarily less faithful, as long as it preserves the core logic flow and module interactions mentioned in the Method Section without introducing fabrication, and adheres to the caption.",
      '',
      '# Veto Rules (The "Red Lines")',
      '**If a figure commits any of the following errors, it fails the faithfulness test immediately:**',
      '1.  **Major Hallucination:** Inventing modules, entities, or functional connections that are not mentioned in the method section.',
      '2.  **Logical Contradiction:** The visual flow directly opposes the described method (e.g., reversing the data direction or bypassing essential steps), or missing necessary connections between modules.',
      '3.  **Scope Violation:** The content presented in the figure is inconsistent with the figure scope described in the **Caption**.',
      '4.  **Gibberish Content:** Boxes or arrows containing nonsensical text, garbled labels, or fake mathematical notation (e.g., broken LaTeX characters).',
    ].join('\n')
  }
  if (dimension === 'conciseness') {
    return [
      '# Core Definition: What is Conciseness?',
      '**Conciseness** is the "Visual Signal-to-Noise Ratio." A concise figure acts as a high-level **visual abstraction** of the method, not a literal translation of the text. It must distill complex logic into clean blocks, flowcharts, or icons. The ideal figure relies on **structural shorthand** (arrows, grouping) and **keywords** rather than explicit descriptions, heavy mathematical notation, or dense textual explanations.',
      '',
      '# Veto Rules (The "Red Lines")',
      '**If a figure commits any of the following errors, it fails the conciseness test immediately:**',
      '1.  **Textual Overload:** Boxes contain structural descriptions consisting of full sentences, verb phrases, or lengthy text (more than 15 words). *Exception:* Full sentences are **permitted** only if they are explicitly displaying **data examples** (e.g., an input query or sample text).',
      '2.  **Literal Copying:** The figure appears to be a "box-ified" copy-paste of the Method Section text with no visual abstraction.',
      '3.  **Math Dump:** The figure is cluttered with raw equations instead of conceptual blocks.',
    ].join('\n')
  }
  if (dimension === 'readability') {
    return [
      '# Core Definition: What is Readability?',
      '**Readability** measures how easily a reader can **extract and navigate** the core information within a figure. A readable figure must have a **clear visual flow**, **high legibility**, and **minimal visual interference**. The goal is for a reader to understand the data paths at a glance. Readability is a **baseline requirement**, not a differentiator; only severe violations of the Veto Rules below constitute readability failures.',
      '',
      '# Veto Rules (The "Red Lines")',
      '**If a figure commits any of the following errors, it fails the readability test immediately:**',
      '1.  **Visual Noise & Extraneous Elements:** The Figure Title or full caption text rendered within the image pixels (subfigure labels like (a), (b) are permitted), duplicated text labels without semantic purpose, or watermarks that clutter the visual space.',
      '2.  **Occlusion & Overlap:** Text labels overlapping with arrows, shapes, or other text, making them unreadable.',
      '3.  **Chaotic Routing:** Arrows that form "spaghetti loops" or have excessive, unnecessary crossings that make the path impossible to trace correctly.',
      '4.  **Illegible Font Size:** Text that is too small to be read without extreme zooming, or font sizes that vary inconsistently throughout the figure.',
      '5.  **Low Contrast:** Light-colored text on light backgrounds (or dark on dark) that makes labels invisible or extremely hard to decipher.',
      '6.  **Inefficient Layout:** The figure fails to use a compact rectangular layout, leaving large empty margins, protruding elements, or unbalanced empty corners.',
      '7.  **Using black background:** A black background is typically not compatible with academic publications.',
    ].join('\n')
  }
  return [
    '# Core Definition: What is Aesthetics?',
    '**Aesthetics** refers to the visual polish, professional maturity, and design harmony of the figure. A high-aesthetic figure meets the publication standards of top-tier AI conferences (e.g., NeurIPS, CVPR). It features a refined visual hierarchy, balanced use of white space, consistent typography, and a harmonious color palette. The design should feel "scientific" and precise, avoiding amateurish artifacts or overly simplistic clip-art styles.',
    '',
    '# Veto Rules (The "Red Lines")',
    '**If a figure commits any of the following errors, it fails the aesthetics test immediately:**',
    '1.  **Low Quality Artifacts:** Visible background grids (e.g., from draw.io), pixelation, blurry elements, or distorted shapes.',
    '2.  **Harmful Color Violations:** Using jarring, high-saturation "neon" colors or inconsistent color schemes that lack professional balance.',
    '3.  **Amateurish Styling:** Overly rounded "bubbly" styles, "Corporate Blog" clip-art, or decorative elements that lack scientific precision.',
    '4.  **Inconsistent Typography:** Mixing multiple unrelated fonts or having misaligned text blocks.',
    '5.  **Using black background:** A black background is typically considered unprofessional in academic publications.',
  ].join('\n')
}

function referencedEvalSystemPrompt(dimension: EvalDimension) {
  const label = dimension.charAt(0).toUpperCase() + dimension.slice(1)
  return [
    '# Role',
    `You are an expert judge in academic visual design. Your task is to evaluate the **${label}** of a **Model-generated figure** by comparing it against a **Human-drawn figure**.`,
    '',
    '# Inputs',
    '1.  **Method Section**: [content]',
    '2.  **Figure Caption**: [content]',
    '3.  **Human-drawn figure (Human)**: the FIRST attached image.',
    '4.  **Model-generated figure (Model)**: the SECOND attached image.',
    '',
    evalDimensionDefinition(dimension),
    '',
    '# Decision Criteria',
    `Compare the two figures and select the strictly best option based solely on the **Core Definition** and **Veto Rules** above for **${label}**.`,
    '-   **Model**: The Model better embodies the Core Definition while avoiding all Veto errors.',
    '-   **Human**: The Human better embodies the Core Definition while avoiding all Veto errors.',
    '-   **Both are good**: Both figures successfully embody the Core Definition without any Veto errors. (For Readability, this is the DEFAULT when neither figure violates a Veto Rule.)',
    '-   **Both are bad**: BOTH figures violate one or more Veto Rules or fail the Core Definition. Do not force a winner if both fail.',
    '',
    '# Output Format (Strict JSON)',
    'Provide your response strictly in the following JSON format:',
    '```json',
    '{',
    '    "comparison_reasoning": "Human: ...; Model: ...; Conclusion: ...",',
    '    "winner": "Model" | "Human" | "Both are good" | "Both are bad"',
    '}',
    '```',
  ].join('\n')
}

function referencedEvalUserPrompt(dimension: EvalDimension, method: string, caption: string) {
  const includeMethod = dimension === 'faithfulness' || dimension === 'conciseness'
  return [
    includeMethod ? `Method Section:\n${method}\n` : '',
    `Figure Caption:\n${caption}`,
    '',
    'The first attached image is the Human-drawn figure; the second is the Model-generated figure.',
    'Provide your JSON verdict.',
  ].filter(Boolean).join('\n')
}

function referenceFreeEvalSystemPrompt(dimension: EvalDimension) {
  const label = dimension.charAt(0).toUpperCase() + dimension.slice(1)
  return [
    '# Role',
    `You are an expert judge in academic visual design. Your task is to evaluate the **${label}** of a single **Model-generated figure** (NO human reference is available — this is a reference-free quality assessment).`,
    '',
    '# Inputs',
    '1.  **Method Section**: [content]',
    '2.  **Figure Caption**: [content]',
    '3.  **Model-generated figure (Model)**: the attached image.',
    '',
    evalDimensionDefinition(dimension),
    '',
    '# Scoring',
    `Score the figure's **${label}** on an integer scale from 0 to 10, where 10 is flawless and fully embodies the Core Definition, and 0 means it grossly violates the Veto Rules. Any Veto Rule violation should cap the score at 4 or below.`,
    '',
    '# Output Format (Strict JSON)',
    'Provide your response strictly in the following JSON format:',
    '```json',
    '{',
    '    "score": 0,',
    '    "reasoning": "Explain the score with reference to the Core Definition and Veto Rules."',
    '}',
    '```',
  ].join('\n')
}

function referenceFreeEvalUserPrompt(dimension: EvalDimension, method: string, caption: string) {
  const includeMethod = dimension === 'faithfulness' || dimension === 'conciseness'
  return [
    includeMethod ? `Method Section:\n${method}\n` : '',
    `Figure Caption:\n${caption}`,
    '',
    'The attached image is the Model-generated figure. Provide your JSON score.',
  ].filter(Boolean).join('\n')
}

// ---------------------------------------------------------------------------
// Admin-only: seed the reference library from the public PaperBananaBench zip.
// Safe + re-runnable in batches. Loads even when fflate is absent (lazy require).
// ---------------------------------------------------------------------------
async function importReferences(body: ImportReferencesBody) {
  // ADMIN-GATE first, mirroring adminJobs/adminFeedback.
  const expected = process.env.ADMIN_TOKEN || ''
  if (!expected) return fail('Admin API disabled: ADMIN_TOKEN is not configured', 503)
  if (body.adminToken !== expected) return fail('Invalid admin token', 401)

  const zipUrl = limitText(body.zipUrl, 600) || benchZipUrlDefault
  const taskName = normalizeTaskName(body.taskName) // 'diagram' | 'plot', defaults to 'diagram'
  const mode = body.mode === 'probe' || body.mode === 'inspect' ? body.mode : 'import'

  // PROBE: must NOT require fflate. Range GET because HEAD may be unsupported.
  if (mode === 'probe') {
    try {
      const response = await fetch(zipUrl, { method: 'GET', headers: { Range: 'bytes=0-0' } })
      const contentRange = response.headers.get('content-range') || ''
      const contentLength = response.headers.get('content-length') || ''
      let totalBytes = ''
      const rangeMatch = contentRange.match(/\/(\d+)\s*$/)
      if (rangeMatch) totalBytes = rangeMatch[1]
      else if (contentLength) totalBytes = contentLength
      // Drain the tiny range body so the socket can be reused/released.
      try { await response.arrayBuffer() } catch {}
      return ok({
        reachable: response.ok || response.status === 206 || response.status === 200,
        status: response.status,
        contentLength: totalBytes || contentLength || contentRange || null,
        zipUrl,
      })
    } catch (error: any) {
      return ok({ reachable: false, status: 0, contentLength: null, zipUrl, error: error?.message || String(error) })
    }
  }

  // INSPECT + IMPORT both need the unzipped bench. Lazily require fflate.
  let bench: BenchImportCache
  try {
    bench = await ensureBenchImport(zipUrl, taskName)
  } catch (error: any) {
    if (error && error.code === 'MISSING_FFLATE') {
      return fail('Missing dependency fflate: add it in the Sealaf NPM deps panel', 503)
    }
    return fail(`importReferences failed: ${error?.message || String(error)}`, 500)
  }

  const totalRefs = bench.refItems.length

  if (mode === 'inspect') {
    return ok({
      zipBytes: bench.zipBytes,
      entryCount: bench.entryNames.length,
      refCount: totalRefs,
      refDir: bench.refDir,
      sampleEntryNames: bench.entryNames.slice(0, 15),
      sampleRef: bench.refItems[0] || null,
      taskName,
      zipUrl,
    })
  }

  // mode === 'import'
  const offset = Math.max(0, Number(body.offset) || 0)
  const limit = clamp(Number(body.limit || 25), 1, 200)
  const slice = bench.refItems.slice(offset, offset + limit)
  const bucket = cloud.storage.bucket(bucketName)

  let imported = 0
  const skipped: Array<{ index: number; id: string; skipReason: string }> = []

  for (let i = 0; i < slice.length; i++) {
    const absoluteIndex = offset + i
    const item = slice[i] || {}
    const rawId = item.id || item.paper_id || item.uid || item.name || `${taskName}-${absoluteIndex}`
    const id = limitText(rawId, 120)
    try {
      const relImagePath = item.path_to_gt_image || item.image_path || item.gt_image || ''
      if (!relImagePath) {
        skipped.push({ index: absoluteIndex, id, skipReason: 'no path_to_gt_image' })
        continue
      }
      const entryName = resolveZipEntryPath(bench, String(relImagePath))
      const bytes = entryName ? bench.entries[entryName] : undefined
      if (!bytes) {
        skipped.push({ index: absoluteIndex, id, skipReason: `image not found in zip: ${relImagePath}` })
        continue
      }
      const mimeType = mimeTypeForPath(entryName || String(relImagePath))
      const ext = resultExtension(mimeType)
      const imageObjectKey = `references/bench/${sanitizePathPart(taskName)}/${sanitizePathPart(id)}.${ext}`

      // Upload image bytes to the bucket; NEVER store base64 in Mongo.
      await bucket.writeFile(imageObjectKey, Buffer.from(bytes), { ContentType: mimeType })
      let imageUrl = ''
      try {
        imageUrl = await bucket.getDownloadUrl(imageObjectKey, 3600 * 24 * 7)
      } catch {
        imageUrl = ''
      }

      const content = item.content
      const summary = limitText(typeof content === 'string' ? content : JSON.stringify(content ?? ''), 2000)
      const title = limitText(item.visual_intent || id, 160)

      // Idempotent upsert by id so batches/re-runs do not duplicate.
      await references.updateOne(
        { id },
        {
          $set: {
            id,
            title,
            summary,
            imageObjectKey,
            imageUrl,
            mimeType,
            source: 'paperbanana-bench',
            taskName,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      )
      imported++
    } catch (error: any) {
      skipped.push({ index: absoluteIndex, id, skipReason: error?.message || String(error) })
    }
  }

  const nextOffset = offset + slice.length
  return ok({
    imported,
    skipped,
    totalRefs,
    offset,
    limit,
    nextOffset,
    done: nextOffset >= totalRefs,
    taskName,
    zipUrl,
  })
}

// Ensure the bench zip is downloaded (cached to /tmp + in module memory) and
// the requested task's ref.json is parsed. Lazily requires fflate; throws a
// tagged error (code MISSING_FFLATE) when the dependency is absent.
async function ensureBenchImport(zipUrl: string, taskName: TaskName): Promise<BenchImportCache> {
  // Reuse the in-memory cache when it matches this zip. The zip entries are
  // shared across tasks; only refDir/refItems are task-specific, so re-resolve
  // ref.json from the already-unzipped entries when the task differs.
  if (importCache && importCache.zipUrl === zipUrl && importCache.entryNames.length) {
    if (importCache.refDir.endsWith(`/${taskName}`)) {
      return importCache
    }
    const located = locateRefJson(importCache.entries, importCache.entryNames, taskName)
    importCache.refDir = located.refDir
    importCache.refItems = located.refItems
    return importCache
  }

  const req: any = (globalThis as any).require || (typeof require !== 'undefined' ? require : null)
  if (!req) {
    const err: any = new Error('require unavailable')
    err.code = 'MISSING_FFLATE'
    throw err
  }
  const fs: any = req('fs')

  // Download (or reuse the /tmp cache) the full zip.
  let zipBuffer: Buffer
  if (fs.existsSync(benchZipCachePath) && fs.statSync(benchZipCachePath).size > 0) {
    zipBuffer = fs.readFileSync(benchZipCachePath)
  } else {
    const response = await fetch(zipUrl, { method: 'GET' })
    if (!response.ok) throw new Error(`Failed to download zip: HTTP ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    zipBuffer = Buffer.from(arrayBuffer)
    try { fs.writeFileSync(benchZipCachePath, zipBuffer) } catch {}
  }

  // Lazily require fflate ONLY here (inspect/import path), never at module top.
  let unzipSync: (data: Uint8Array) => Record<string, Uint8Array>
  try {
    const fflate = req('fflate')
    unzipSync = fflate.unzipSync
    if (typeof unzipSync !== 'function') throw new Error('unzipSync missing')
  } catch {
    const err: any = new Error('fflate not installed')
    err.code = 'MISSING_FFLATE'
    throw err
  }

  const entries = unzipSync(new Uint8Array(zipBuffer))
  const entryNames = Object.keys(entries)
  const located = locateRefJson(entries, entryNames, taskName)

  importCache = {
    zipUrl,
    zipBytes: zipBuffer.length,
    entries,
    entryNames,
    refDir: located.refDir,
    refItems: located.refItems,
  }
  return importCache
}

// Find the requested task's ref.json (entry path ending /<task>/ref.json),
// parse it into an array, and return both the items and its directory.
function locateRefJson(
  entries: Record<string, Uint8Array>,
  entryNames: string[],
  taskName: TaskName,
): { refDir: string; refItems: any[] } {
  const suffix = `/${taskName}/ref.json`
  let refEntry =
    entryNames.find((name) => name.endsWith(suffix)) ||
    entryNames.find((name) => name.endsWith(`${taskName}/ref.json`)) ||
    entryNames.find((name) => name.toLowerCase().endsWith('/ref.json') && name.toLowerCase().includes(`/${taskName}/`))
  if (!refEntry) {
    return { refDir: '', refItems: [] }
  }
  const refDir = refEntry.slice(0, refEntry.length - '/ref.json'.length).replace(/\/+$/, '')
  let parsed: any
  try {
    const text = Buffer.from(entries[refEntry]).toString('utf8')
    parsed = JSON.parse(text)
  } catch {
    return { refDir, refItems: [] }
  }
  let items: any[] = []
  if (Array.isArray(parsed)) items = parsed
  else if (Array.isArray(parsed?.data)) items = parsed.data
  else if (Array.isArray(parsed?.items)) items = parsed.items
  else if (Array.isArray(parsed?.references)) items = parsed.references
  else if (parsed && typeof parsed === 'object') {
    // Mapping of id -> item; flatten to an array while preserving the key as id.
    items = Object.entries(parsed).map(([key, value]: [string, any]) =>
      value && typeof value === 'object' ? { id: value.id || key, ...value } : { id: key, value })
  }
  return { refDir, refItems: items }
}

// Resolve an image path that is relative to the ref.json directory into a real
// zip entry name. Tries the joined path plus a few normalized fallbacks.
function resolveZipEntryPath(bench: BenchImportCache, relPath: string): string | null {
  const cleaned = String(relPath || '').replace(/^\.\//, '').replace(/^\/+/, '')
  const candidates: string[] = []
  if (bench.refDir) candidates.push(`${bench.refDir}/${cleaned}`)
  candidates.push(cleaned)
  // Collapse any ../ segments against the ref dir.
  if (bench.refDir && cleaned.includes('../')) {
    const dirParts = bench.refDir.split('/')
    const relParts = cleaned.split('/')
    for (const part of relParts) {
      if (part === '..') dirParts.pop()
      else if (part !== '.') dirParts.push(part)
    }
    candidates.push(dirParts.join('/'))
  }
  for (const candidate of candidates) {
    if (bench.entries[candidate]) return candidate
  }
  // Last resort: match by basename suffix.
  const base = cleaned.split('/').pop() || ''
  if (base) {
    const hit = bench.entryNames.find((name) => name.endsWith(`/${base}`) || name === base)
    if (hit) return hit
  }
  return null
}

function mimeTypeForPath(path: string) {
  const value = String(path || '').toLowerCase()
  if (value.endsWith('.svg')) return 'image/svg+xml'
  if (value.endsWith('.webp')) return 'image/webp'
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg'
  if (value.endsWith('.gif')) return 'image/png' // store gif frames as png-extension safe default
  return 'image/png'
}
