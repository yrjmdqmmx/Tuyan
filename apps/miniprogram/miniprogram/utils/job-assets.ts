export type OutputFormat = 'png' | 'svg'

interface RawImageAsset {
  filename?: string
  url?: string
  candidate_id?: number
  candidateId?: number
  mime_type?: string
  mimeType?: string
  object_key?: string
  objectKey?: string
}

interface ImageAssetOptions {
  fallbackFilename: string
  fallbackFormat?: string
}

export interface ImageAsset {
  filename: string
  url: string
  candidate_id: number
  mime_type: string
  format: OutputFormat
  format_text: string
  can_preview: boolean
  action_label: string
  object_key: string
}

export function normalizeOutputFormat(format: unknown): OutputFormat {
  return String(format || '').toLowerCase() === 'svg' ? 'svg' : 'png'
}

export function formatOutputFormat(format: unknown): string {
  return normalizeOutputFormat(format) === 'svg' ? 'SVG 矢量图' : 'PNG 图片'
}

export function formatImageAsset(raw: RawImageAsset, options: ImageAssetOptions): ImageAsset {
  const mimeType = String(raw.mime_type || raw.mimeType || '')
  const filename = String(raw.filename || options.fallbackFilename || 'image')
  const format = inferImageFormat(mimeType, filename, options.fallbackFormat)
  const candidateId = raw.candidate_id != null
    ? Number(raw.candidate_id)
    : raw.candidateId != null
      ? Number(raw.candidateId)
      : 0

  return {
    filename,
    url: String(raw.url || ''),
    candidate_id: Number.isFinite(candidateId) ? candidateId : 0,
    mime_type: mimeType,
    format,
    format_text: format === 'svg' ? 'SVG' : 'PNG',
    can_preview: format !== 'svg',
    action_label: format === 'svg' ? '下载文件' : '保存图片',
    object_key: String(raw.object_key || raw.objectKey || ''),
  }
}

function inferImageFormat(mimeType: string, filename: string, fallbackFormat?: string): OutputFormat {
  const lowerMime = mimeType.toLowerCase()
  const lowerName = filename.toLowerCase()
  if (lowerMime.includes('svg') || lowerName.endsWith('.svg')) return 'svg'
  if (lowerMime.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName)) return 'png'
  return normalizeOutputFormat(fallbackFormat)
}
