import { createHash } from 'node:crypto'
import sharp from 'sharp'

type EvidenceStore = {
  put(key: string, bytes: Buffer, options: Record<string, any>): Promise<unknown>
  get(key: string): Promise<unknown>
}

type RenditionKind = 'thumbnail' | 'detail' | 'full'

const hashPattern = /^[a-f0-9]{64}$/i
const cacheControl = 'public, max-age=31536000, immutable'

function bytesFromGet(value: any) {
  const content = value?.content ?? value
  if (!content) throw new Error('BENCHMARK_PUBLIC_RENDITION_READ_FAILED')
  return Buffer.from(content)
}

async function putImmutable(store: EvidenceStore, objectKey: string, bytes: Buffer, imageHash: string) {
  try {
    await store.put(objectKey, bytes, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': cacheControl,
        'x-oss-forbid-overwrite': 'true',
      },
    })
  } catch (error: any) {
    if (![409, 'FileAlreadyExists'].includes(error?.status || error?.code)) throw error
    const existing = bytesFromGet(await store.get(objectKey))
    const existingHash = createHash('sha256').update(existing).digest('hex')
    if (existingHash !== imageHash) throw new Error('BENCHMARK_PUBLIC_RENDITION_COLLISION')
  }
}

export async function createPublicWebpRenditions(input: { png: Buffer; sourceHash: string; store: EvidenceStore }) {
  if (!hashPattern.test(input.sourceHash) || input.png.length < 24 || input.png.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('BENCHMARK_PUBLIC_RENDITION_SOURCE_INVALID')
  }
  const metadata = await sharp(input.png, { failOn: 'error' }).metadata()
  if (!metadata.width || !metadata.height) throw new Error('BENCHMARK_PUBLIC_RENDITION_SOURCE_INVALID')
  const specs: Array<{ kind: RenditionKind; width: number; suffix: string; quality: number; nearLossless?: boolean }> = [
    { kind: 'thumbnail', width: Math.min(640, metadata.width), suffix: 'w640', quality: 80 },
    { kind: 'detail', width: Math.min(1600, metadata.width), suffix: 'w1600', quality: 86 },
    { kind: 'full', width: metadata.width, suffix: 'full', quality: 90, nearLossless: true },
  ]
  const output = []
  for (const spec of specs) {
    const bytes = await sharp(input.png, { failOn: 'error' })
      .resize({ width: spec.width, withoutEnlargement: true })
      .webp({ quality: spec.quality, nearLossless: spec.nearLossless, smartSubsample: true, effort: 5 })
      .toBuffer()
    const renditionMetadata = await sharp(bytes).metadata()
    if (renditionMetadata.format !== 'webp' || !renditionMetadata.width || !renditionMetadata.height) {
      throw new Error('BENCHMARK_PUBLIC_RENDITION_FORMAT_INVALID')
    }
    const imageHash = createHash('sha256').update(bytes).digest('hex')
    const objectKey = `bench/public/evidence/${input.sourceHash}/${spec.suffix}.webp`
    await putImmutable(input.store, objectKey, bytes, imageHash)
    output.push({
      kind: spec.kind, objectKey, imageHash,
      width: renditionMetadata.width, height: renditionMetadata.height, fileSizeBytes: bytes.length,
      mimeType: 'image/webp' as const,
    })
  }
  return output
}
