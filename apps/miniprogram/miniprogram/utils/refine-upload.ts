import { requestJson, uploadReferenceFile } from './api'
import type { RefineUploadCapability } from './model-registry'
import type { ModelRoute } from './model-routing'
import { activeReferenceUploadPolicy, referenceModelDimensionsError } from './reference-upload-policy'

export interface RefineFile { path: string; filename: string; mimeType: string; size: number; width: number; height: number }
export interface RefineUploadDescriptor { objectKey: string; uploadToken: string; uploadUrl?: string; filename: string; mimeType: string; size: number }
export interface UploadedRefineSource extends RefineFile { url: string; objectKey: string; uploaded: true }

export function validateRefineFile(file: RefineFile, limits: RefineUploadCapability | undefined, route: ModelRoute): void {
  if (!limits?.mimeTypes?.length || ![1, 2].includes(limits.version)) throw new Error('当前服务端尚未提供精修上传能力，请稍后重试。')
  if (!limits.mimeTypes.includes(file.mimeType)) throw new Error('请选择 PNG、JPG 或 WebP 图片。')
  const maxBytes = limits.version >= 2 ? limits.maxBytes : Math.min(limits.maxBytes, limits.modelMaxBytes?.[`${route.accessProvider}/${route.modelId}`] || Infinity)
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes) throw new Error(`图片不能为空，且不能超过 ${(maxBytes / 1024 / 1024).toFixed(1)} MB。`)
  if (![file.width, file.height].every(n => Number.isInteger(n) && n > 0 && n <= limits.maxDimension) || file.width * file.height > limits.maxPixels) throw new Error(`图片尺寸超限：单边最多 ${limits.maxDimension} 像素，总像素不超过 ${limits.maxPixels / 1000000} MP。`)
}

export async function uploadRefineSource(file: RefineFile, options: {
  limits: RefineUploadCapability | undefined; route: ModelRoute; isCurrent: () => boolean; canCleanup: () => boolean
  onStage: (stage: 'preparing' | 'uploading' | 'checking' | 'ready') => void
  request?: (body: Record<string, unknown>) => Promise<any>
  put?: (path: string, url: string, mime: string, expiresAt?: number) => Promise<void>
}) {
  validateRefineFile(file, options.limits, options.route)
  const request = options.request || requestJson
  const put = options.put || uploadReferenceFile
  let uploads: RefineUploadDescriptor[] = []
  let cleaned = false
  const check = () => { if (!options.isCurrent()) throw new Error('已取消上传。') }
  const cleanup = async () => {
    if (cleaned || !uploads.length || !options.canCleanup()) return
    cleaned = true
    await request({ action: 'abortReferenceUpload', uploads }).catch(() => undefined)
  }
  try {
    check(); options.onStage('preparing')
    const prepared = await request({ action: 'prepareReferenceUpload', files: [{ clientId: 'refine-source', filename: file.filename, mimeType: file.mimeType, size: file.size }] })
    const raw = Array.isArray(prepared?.uploads) ? prepared.uploads : []
    uploads = raw.map(({ objectKey, uploadToken, filename, mimeType, size }: RefineUploadDescriptor) => ({ objectKey, uploadToken, filename, mimeType, size }))
    check()
    if (raw.length !== 1 || !raw[0].uploadUrl || !raw[0].objectKey || !raw[0].uploadToken) throw new Error('无法获取图片上传地址，请重试。')
    options.onStage('uploading')
    await put(file.path, raw[0].uploadUrl, file.mimeType, raw[0].expiresAt)
    check(); options.onStage('checking')
    const finalized = await request({ action: 'finalizeReferenceUpload', uploads, purpose: 'refine' })
    check()
    const dimensions = { width: Number(finalized?.source?.width), height: Number(finalized?.source?.height) }
    validateRefineFile({ ...file, ...dimensions }, options.limits, options.route)
    options.onStage('ready')
    const source: UploadedRefineSource = { ...file, ...dimensions, url: file.path, objectKey: uploads[0].objectKey, uploaded: true }
    return { source, cleanup }
  } catch (error) { await cleanup(); throw error }
}

export function validateRefineModelInput(file: { width?: number; height?: number }, contract: unknown, route: ModelRoute, workflow: string) {
  const policy = activeReferenceUploadPolicy(contract, route, workflow)
  const issue = referenceModelDimensionsError(file, policy)
  if (issue) throw new Error(issue)
}
