import { REFERENCE_IMAGE_LIMITS } from './constants'
import { imageExtension } from './media'

export interface ReferenceImage {
  id: string
  path: string
  filename: string
  mimeType: string
  size: number
  width?: number
  height?: number
  sizeText: string
  canPreview: boolean
  formatText: string
}

export function buildReferenceImage(input: Omit<ReferenceImage, 'sizeText' | 'canPreview' | 'formatText'>): ReferenceImage {
  const canPreview = input.mimeType !== 'image/svg+xml'
  return {
    ...input,
    sizeText: formatBytes(input.size),
    canPreview,
    formatText: canPreview ? '图片' : 'SVG',
  }
}

export function normalizeReferenceFileMimeType(mimeType: string, filename = ''): string {
  const normalized = String(mimeType || '').toLowerCase().split(';', 1)[0].trim()
  if (normalized === 'image/jpg') return 'image/jpeg'
  if (REFERENCE_IMAGE_LIMITS.mimeTypes.includes(normalized)) return normalized
  return mimeTypeFromPath(filename)
}

export function mimeTypeFromPath(path: string): string {
  const lower = path.split('?')[0].toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return 'image/jpeg'
}

export function filenameFromPath(path: string, index: number, mimeType: string): string {
  const cleanPath = path.split('?')[0]
  const rawName = cleanPath.split('/').pop() || ''
  if (rawName.includes('.')) return rawName
  return `reference-${index}.${imageExtension(mimeType)}`
}

export function sanitizeLocalFilename(rawName: string, path: string, index: number, mimeType: string): string {
  const nameParts = rawName.split(/[\\/]/)
  const cleanName = (nameParts[nameParts.length - 1] || '').trim()
  if (cleanName) {
    return cleanName.includes('.') ? cleanName : `${cleanName}.${imageExtension(mimeType)}`
  }
  return filenameFromPath(path, index, mimeType)
}

export function formatBytes(size: number): string {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`
  if (size >= 1024) return `${Math.max(1, Math.round(size / 1024))}KB`
  return `${size}B`
}
