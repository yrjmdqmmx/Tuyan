import { SCIENTIFIC_EDIT_SOURCE, canonicalHash, readScientificEditSourcePng } from '@paperbanana/benchmark-core'
import { createHash, randomUUID } from 'node:crypto'
import { constants, readFileSync } from 'node:fs'
import { lstat, open, readdir, statfs, unlink } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import sharp from 'sharp'

import type { BenchProvider } from './config.js'
import {
  SCIENTIFIC_V2_MAX_ARTIFACT_BYTES,
  deepFreezeScientificV2,
  inspectScientificV2Image,
  scientificV2Error,
} from './scientific-v2-common.js'
import { UnknownProviderOutcomeError } from './provider-operation.js'
import {
  ScientificConfirmedFailureError,
  ScientificV2ArtifactReconciliationRequiredError,
  type ScientificV2ArtifactSpoolBinding,
  type ScientificV2DispatchMarker,
  type ScientificV2ExecutorRequest,
  type ScientificV2RunnerRepository,
} from './scientific-v2-runner.js'
import {
  verifyScientificV2BatchState,
  verifyScientificV2BatchManifest,
  refreshScientificV2StateHash,
  type ScientificV2Attempt,
  type ScientificV2BatchManifest,
  type ScientificV2BatchState,
} from './scientific-v2-manifest.js'

const MAX_BASE64_LENGTH = Math.ceil(SCIENTIFIC_V2_MAX_ARTIFACT_BYTES / 3) * 4
const OUTPUT_DOWNLOAD_TIMEOUT_MS = 30_000

export function scientificV2PrivateArtifactObjectKey(imageHash: string, format: 'png' | 'jpeg' | 'webp') {
  if (!/^[a-f0-9]{64}$/.test(imageHash)) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_BINDING_INVALID')
  return `bench/scientific-v2/private/objects/${imageHash}.${format}`
}

export function readScientificV2ProductionEditSourcePng(path = process.env.PAPERBANANA_SCIENTIFIC_V2_EDIT_SOURCE_PNG_PATH
  || '/app/node_modules/@paperbanana/benchmark-core/assets/scientific-edit-source-v2.png') {
  const bytes = path === SCIENTIFIC_EDIT_SOURCE.pngPath ? readScientificEditSourcePng() : readFileSync(path)
  if (createHash('sha256').update(bytes).digest('hex') !== SCIENTIFIC_EDIT_SOURCE.sourceHash
    || bytes.length < 24 || bytes.readUInt32BE(16) !== SCIENTIFIC_EDIT_SOURCE.width
    || bytes.readUInt32BE(20) !== SCIENTIFIC_EDIT_SOURCE.height) {
    scientificV2Error('SCIENTIFIC_V2_EDIT_SOURCE_HASH_MISMATCH')
  }
  return bytes
}

export interface ScientificV2ProductionArtifactStore {
  persist(input: ScientificV2ProductionArtifact): Promise<void>
  createSignedReadUrl?(input: { objectKey: string; expiresSeconds: number }): Promise<string>
}

export interface ScientificV2ArtifactSpool {
  stage(input: { slotId: string; attemptIndex: number; payloadHash: string; imageHash: string; format: 'png' | 'jpeg' | 'webp'; bytes: Buffer }): Promise<ScientificV2ArtifactSpoolBinding>
  read(binding: ScientificV2ArtifactSpoolBinding): Promise<Buffer>
  remove(binding: ScientificV2ArtifactSpoolBinding): Promise<void>
}

function assertSpoolId(spoolId: string) {
  if (!/^[a-f0-9]{64}\.(png|jpeg|webp)$/.test(spoolId)) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_ID_INVALID')
}

function assertArtifactRecoveryBinding(
  binding: ScientificV2ArtifactSpoolBinding,
  marker: ScientificV2DispatchMarker,
  attempt: ScientificV2Attempt,
) {
  const expectedSpoolId = attempt.rawImageHash && attempt.format
    ? `${canonicalHash({ slotId: marker.slotId, attemptIndex: marker.attemptIndex, payloadHash: marker.payloadHash, imageHash: attempt.rawImageHash })}.${attempt.format}`
    : ''
  if (attempt.responseClass !== 'artifact_reconciliation_required' || binding.spoolId !== expectedSpoolId
    || binding.imageHash !== attempt.rawImageHash || binding.format !== attempt.format || binding.byteSize !== attempt.byteSize) {
    scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_BINDING_INVALID')
  }
}

export async function createScientificV2ArtifactSpool(root: string, maxTotalBytes = 1024 * 1024 * 1024): Promise<ScientificV2ArtifactSpool> {
  if (!isAbsolute(root) || !Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) {
    scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CONFIG_INVALID')
  }
  const rootStat = await lstat(root).catch(() => null)
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink() || rootStat.uid !== process.getuid?.()
    || (rootStat.mode & 0o777) !== 0o700) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CONFIG_INVALID')
  const filesystem = await statfs(root)
  if (Number(filesystem.bavail) * Number(filesystem.bsize) < SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) {
    scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CAPACITY_INVALID')
  }
  const entries = await readdir(root, { withFileTypes: true })
  if (entries.length > 4096) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CAPACITY_INVALID')
  let currentBytes = 0
  for (const entry of entries) {
    if (!entry.isFile() || !/^[a-f0-9]{64}\.(png|jpeg|webp)$/.test(entry.name)) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_FILE_INVALID')
    currentBytes += (await lstat(join(root, entry.name))).size
  }
  if (currentBytes > maxTotalBytes - SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CAPACITY_INVALID')
  const syncRoot = async () => {
    const directory = await open(root, constants.O_RDONLY | constants.O_NOFOLLOW)
    try { await directory.sync() } finally { await directory.close() }
  }

  const readBinding = async (binding: ScientificV2ArtifactSpoolBinding) => {
    assertSpoolId(binding.spoolId)
    if (!/^[a-f0-9]{64}$/.test(binding.imageHash) || !Number.isInteger(binding.byteSize)
      || binding.byteSize < 1 || binding.byteSize > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_BINDING_INVALID')
    let handle
    try {
      handle = await open(join(root, binding.spoolId), constants.O_RDONLY | constants.O_NOFOLLOW)
      const facts = await handle.stat()
      if (!facts.isFile() || facts.uid !== process.getuid?.() || (facts.mode & 0o777) !== 0o600 || facts.size !== binding.byteSize) {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_FILE_INVALID')
      }
      const bytes = Buffer.alloc(binding.byteSize)
      const result = await handle.read(bytes, 0, bytes.length, 0)
      if (result.bytesRead !== bytes.length || createHash('sha256').update(bytes).digest('hex') !== binding.imageHash) {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CONTENT_INVALID')
      }
      return bytes
    } catch (error) {
      if ((error as { code?: string }).code === 'ELOOP') scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_FILE_INVALID')
      throw error
    } finally {
      await handle?.close()
    }
  }
  return Object.freeze({
    async stage(input: { slotId: string; attemptIndex: number; payloadHash: string; imageHash: string; format: 'png' | 'jpeg' | 'webp'; bytes: Buffer }) {
      if (!/^[a-f0-9]{64}$/.test(input.payloadHash) || !/^[a-f0-9]{64}$/.test(input.imageHash)
        || !Number.isInteger(input.attemptIndex) || input.attemptIndex < 1 || input.attemptIndex > 4
        || input.bytes.length < 1 || input.bytes.length > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES
        || createHash('sha256').update(input.bytes).digest('hex') !== input.imageHash) {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_BINDING_INVALID')
      }
      const spoolId = `${canonicalHash({ slotId: input.slotId, attemptIndex: input.attemptIndex, payloadHash: input.payloadHash, imageHash: input.imageHash })}.${input.format}`
      const binding = { spoolId, imageHash: input.imageHash, format: input.format, byteSize: input.bytes.length }
      if (currentBytes > maxTotalBytes - input.bytes.length) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CAPACITY_INVALID')
      try {
        const handle = await open(join(root, spoolId), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
        try { await handle.writeFile(input.bytes); await handle.sync() } finally { await handle.close() }
        currentBytes += input.bytes.length
        await syncRoot()
      } catch (error) {
        if ((error as { code?: string }).code !== 'EEXIST') throw error
        const existing = await readBinding(binding)
        if (!existing.equals(input.bytes)) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CONTENT_INVALID')
      }
      return binding
    },
    read: readBinding,
    async remove(binding: ScientificV2ArtifactSpoolBinding) {
      assertSpoolId(binding.spoolId)
      await unlink(join(root, binding.spoolId))
      currentBytes = Math.max(0, currentBytes - binding.byteSize)
      await syncRoot()
    },
  })
}
export interface ScientificV2ProductionArtifact {
    objectKey: string
    imageHash: string
    format: 'png' | 'jpeg' | 'webp'
    contentType: 'image/png' | 'image/jpeg' | 'image/webp'
    bytes: Buffer
}

export interface ScientificV2PublicEvidenceStore {
  put(key: string, bytes: Buffer, options: Record<string, unknown>): Promise<unknown>
  get(key: string): Promise<{ content: Uint8Array }>
  head(key: string): Promise<{ headers?: Record<string, unknown>; res?: { headers?: Record<string, unknown> } }>
  getACL(key: string): Promise<{ acl?: string }>
}

export interface ScientificV2EvidenceObjectStore extends ScientificV2PublicEvidenceStore {
  readPrivate(input: { objectKey: string; imageHash: string; format: 'png' | 'jpeg' | 'webp' }): Promise<Buffer>
  persistPrivate(input: ScientificV2ProductionArtifact): Promise<void>
}

type ScientificV2PublicVariant = {
  kind: 'thumbnail' | 'detail' | 'full'
  objectKey: string
  imageHash: string
  width: number
  height: number
  fileSizeBytes: number
  mimeType: 'image/webp'
}

async function putScientificV2PublicVariant(store: ScientificV2PublicEvidenceStore, variant: ScientificV2PublicVariant, bytes: Buffer) {
  const variantHeaders = (forbidOverwrite: boolean) => ({
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'x-oss-object-acl': 'private',
    ...(forbidOverwrite ? { 'x-oss-forbid-overwrite': 'true' } : {}),
    'x-oss-meta-sha256': variant.imageHash,
  })
  try {
    await store.put(variant.objectKey, bytes, { headers: variantHeaders(true) })
  } catch (error) {
    let existingResult: Awaited<ReturnType<ScientificV2PublicEvidenceStore['get']>>
    let metadata: Awaited<ReturnType<ScientificV2PublicEvidenceStore['head']>>
    try {
      [existingResult, metadata] = await Promise.all([store.get(variant.objectKey), store.head(variant.objectKey)])
    } catch {
      throw error
    }
    let aclVerified = false
    let aclUnavailable = false
    try {
      aclVerified = String((await store.getACL(variant.objectKey)).acl || '') === 'private'
    } catch (aclError) {
      const aclFacts = aclError as { status?: unknown; code?: unknown }
      if (aclFacts.status === 403 && aclFacts.code === 'AccessDenied') aclUnavailable = true
      else throw aclError
    }
    const existing = Buffer.from(existingResult.content)
    const metadataHeaders = metadata.headers || metadata.res?.headers || {}
    const header = (name: string) => {
      const found = Object.entries(metadataHeaders).find(([key]) => key.toLowerCase() === name)
      return found ? String(found[1]) : ''
    }
    if (!existing.equals(bytes)
      || createHash('sha256').update(existing).digest('hex') !== variant.imageHash
      || header('content-type').split(';', 1)[0].trim().toLowerCase() !== 'image/webp'
      || header('cache-control') !== 'public, max-age=31536000, immutable'
      || header('x-oss-meta-sha256') !== variant.imageHash
      || (!aclVerified && !aclUnavailable)) {
      scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDITION_COLLISION')
    }
  }
}

async function createScientificV2PublicVariants(
  source: { bytes: Buffer; imageHash: string; format: 'png' | 'jpeg' | 'webp' },
  store: ScientificV2PublicEvidenceStore,
) {
  if (createHash('sha256').update(source.bytes).digest('hex') !== source.imageHash) {
    scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDITION_SOURCE_INVALID')
  }
  const inspected = await inspectScientificV2Image(source.bytes)
  if (inspected.rawImageHash !== source.imageHash || inspected.format !== source.format) {
    scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDITION_SOURCE_INVALID')
  }
  const specs = [
    { kind: 'thumbnail' as const, width: Math.min(640, inspected.width), quality: 80 },
    { kind: 'detail' as const, width: Math.min(1600, inspected.width), quality: 86 },
    { kind: 'full' as const, width: inspected.width, quality: 90 },
  ]
  const variants: ScientificV2PublicVariant[] = []
  for (const spec of specs) {
    const bytes = await sharp(source.bytes, { failOn: 'error' })
      .resize({ width: spec.width, withoutEnlargement: true })
      .webp({ quality: spec.quality, smartSubsample: true, effort: 5 })
      .toBuffer()
    const metadata = await sharp(bytes, { failOn: 'error' }).metadata()
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height
      || metadata.width > inspected.width || metadata.height > inspected.height) {
      scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDITION_FORMAT_INVALID')
    }
    const imageHash = createHash('sha256').update(bytes).digest('hex')
    const variant: ScientificV2PublicVariant = {
      kind: spec.kind,
      objectKey: `bench/scientific-v2/public/${source.imageHash}/${spec.kind}.webp`,
      imageHash, width: metadata.width, height: metadata.height, fileSizeBytes: bytes.length, mimeType: 'image/webp',
    }
    await putScientificV2PublicVariant(store, variant, bytes)
    variants.push(variant)
  }
  return variants
}

export async function createScientificV2PublicEvidenceInput(input: {
  canonicalModelId: string
  caseId: string
  raw: { bytes: Buffer; imageHash: string; format: 'png' | 'jpeg' | 'webp' }
  editSource?: { bytes: Buffer; imageHash: string; format: 'png' }
  store: ScientificV2PublicEvidenceStore
}) {
  const variants = await createScientificV2PublicVariants(input.raw, input.store)
  const objectBindings = [{
    imageHash: input.raw.imageHash,
    objectKey: scientificV2PrivateArtifactObjectKey(input.raw.imageHash, input.raw.format),
  }]
  const evidence: Record<string, unknown> = {
    caseId: input.caseId, canonicalModelId: input.canonicalModelId, imageHash: input.raw.imageHash, variants,
  }
  if (input.editSource) {
    if (input.editSource.imageHash !== SCIENTIFIC_EDIT_SOURCE.sourceHash) {
      scientificV2Error('SCIENTIFIC_V2_EDIT_SOURCE_HASH_MISMATCH')
    }
    const beforeVariants = await createScientificV2PublicVariants(input.editSource, input.store)
    objectBindings.push({
      imageHash: input.editSource.imageHash,
      objectKey: scientificV2PrivateArtifactObjectKey(input.editSource.imageHash, input.editSource.format),
    })
    evidence.sourceHash = input.editSource.imageHash
    evidence.beforeVariants = beforeVariants
  }
  return deepFreezeScientificV2({ objectBindings, evidence: [evidence] })
}

export function createScientificV2OssArtifactStore(client: {
  put(key: string, bytes: Buffer, options: Record<string, unknown>): Promise<unknown>
  get(key: string): Promise<{ content: Uint8Array; headers?: Record<string, unknown>; res?: { headers?: Record<string, unknown> } }>
  getACL?(key: string): Promise<{ acl?: string }>
}, publicSigner?: {
  signatureUrlV4(method: 'GET', expires: number, request: undefined, objectName: string): Promise<string>
}): ScientificV2ProductionArtifactStore {
  const header = (headers: Record<string, unknown>, name: string) => {
    const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name)
    return found ? String(found[1]) : ''
  }
  const privateHeaders = (input: ScientificV2ProductionArtifact, forbidOverwrite: boolean) => ({
    'Content-Type': input.contentType,
    'Cache-Control': 'private, no-store',
    'x-oss-object-acl': 'private',
    ...(forbidOverwrite ? { 'x-oss-forbid-overwrite': 'true' } : {}),
    'x-oss-meta-sha256': input.imageHash,
  })
  const aclReadDenied = (error: unknown) => {
    const facts = error as { status?: unknown; code?: unknown }
    return facts.status === 403 && facts.code === 'AccessDenied'
  }
  const reconcile = async (input: ScientificV2ProductionArtifact) => {
    try {
      const result = await client.get(input.objectKey)
      const existing = Buffer.from(result.content)
      const headers = result.headers || result.res?.headers || {}
      if (existing.length > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES || !existing.equals(input.bytes)
        || header(headers, 'x-oss-meta-sha256') !== input.imageHash
        || header(headers, 'content-type').split(';', 1)[0] !== input.contentType
        || header(headers, 'cache-control') !== 'private, no-store') scientificV2Error('SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION')
      if (client.getACL) {
        try {
          if (String((await client.getACL(input.objectKey)).acl || '') !== 'private') {
            scientificV2Error('SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION')
          }
        } catch (error) {
          if (aclReadDenied(error)) return 'private_reassertion_required' as const
          throw error
        }
      } else if (header(headers, 'x-oss-object-acl') !== 'private') {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION')
      }
      return 'exists' as const
    } catch (error) {
      if ((error as { status?: unknown; code?: unknown })?.status === 404
        || (error as { status?: unknown; code?: unknown })?.code === 'NoSuchKey') return 'missing' as const
      if ((error as Error).message === 'SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION') throw error
      throw new ScientificV2ArtifactReconciliationRequiredError()
    }
  }
  const store: ScientificV2ProductionArtifactStore = {
    async persist(input: ScientificV2ProductionArtifact) {
      const computedHash = createHash('sha256').update(input.bytes).digest('hex')
      const expectedKey = scientificV2PrivateArtifactObjectKey(computedHash, input.format)
      if (input.bytes.length === 0 || input.bytes.length > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES
        || input.imageHash !== computedHash || input.objectKey !== expectedKey) {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_BINDING_INVALID')
      }
      const put = () => client.put(input.objectKey, input.bytes, { headers: privateHeaders(input, true) })
      const resolveExisting = async () => {
        const resolution = await reconcile(input)
        if (resolution === 'exists') return true
        if (resolution === 'private_reassertion_required') {
          try {
            await client.put(input.objectKey, input.bytes, { headers: privateHeaders(input, false) })
          } catch {
            throw new ScientificV2ArtifactReconciliationRequiredError()
          }
          return true
        }
        return false
      }
      try {
        await put()
      } catch (error) {
        const facts = error as { status?: unknown; code?: unknown }
        const knownDuplicate = [409, 'FileAlreadyExists'].includes(facts.status as string | number)
          || [409, 'FileAlreadyExists'].includes(facts.code as string | number)
        if (await resolveExisting()) return
        if (knownDuplicate) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION')
        try {
          await put()
        } catch {
          if (await resolveExisting()) return
          throw new ScientificV2ArtifactReconciliationRequiredError()
        }
      }
    },
    ...(publicSigner ? { async createSignedReadUrl(input: { objectKey: string; expiresSeconds: number }) {
      if (!/^bench\/scientific-v2\/private\/objects\/[a-f0-9]{64}\.(png|jpeg|webp)$/.test(input.objectKey)
        || !Number.isInteger(input.expiresSeconds) || input.expiresSeconds < 60 || input.expiresSeconds > 900) {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SIGNED_URL_INVALID')
      }
      const raw = await publicSigner.signatureUrlV4('GET', input.expiresSeconds, undefined, input.objectKey)
      let url: URL
      try { url = new URL(raw) } catch { scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SIGNED_URL_INVALID') }
      if (url.protocol !== 'https:' || url.username || url.password || raw.length > 8_192) {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SIGNED_URL_INVALID')
      }
      return raw
    } } : {}),
  }
  return Object.freeze(store)
}

export function createScientificV2OssEvidenceStore(client: {
  put(key: string, bytes: Buffer, options: Record<string, unknown>): Promise<unknown>
  get(key: string): Promise<{ content: Uint8Array }>
  head(key: string): Promise<{ headers?: Record<string, unknown>; res?: { headers?: Record<string, unknown> } }>
  getACL(key: string): Promise<{ acl?: string }>
  getStream(key: string, options?: Record<string, unknown>): Promise<{
    stream: AsyncIterable<unknown> & { destroy?(error?: Error): void }
    res?: { status?: number; headers?: Record<string, unknown> }
  }>
}): ScientificV2EvidenceObjectStore {
  const privateStore = createScientificV2OssArtifactStore(client)
  const header = (headers: Record<string, unknown>, name: string) => {
    const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name)
    return found ? String(found[1]) : ''
  }
  return Object.freeze({
    put: client.put.bind(client),
    get: client.get.bind(client),
    head: client.head.bind(client),
    getACL: client.getACL.bind(client),
    persistPrivate: privateStore.persist,
    async readPrivate(input: { objectKey: string; imageHash: string; format: 'png' | 'jpeg' | 'webp' }) {
      if (input.objectKey !== scientificV2PrivateArtifactObjectKey(input.imageHash, input.format)) {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_BINDING_INVALID')
      }
      const metadata = await client.head(input.objectKey)
      const headers = metadata.headers || metadata.res?.headers || {}
      const expectedContentType = input.format === 'jpeg' ? 'image/jpeg' : `image/${input.format}`
      if (header(headers, 'content-type').split(';', 1)[0].trim().toLowerCase() !== expectedContentType
        || header(headers, 'cache-control') !== 'private, no-store'
        || header(headers, 'x-oss-meta-sha256') !== input.imageHash) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION')
      let reassertPrivate = false
      try {
        if (String((await client.getACL(input.objectKey)).acl || '') !== 'private') {
          scientificV2Error('SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION')
        }
      } catch (error) {
        const facts = error as { status?: unknown; code?: unknown }
        if (facts.status === 403 && facts.code === 'AccessDenied') reassertPrivate = true
        else throw error
      }
      const streamResult = await client.getStream(input.objectKey, { headers: { Range: `bytes=0-${SCIENTIFIC_V2_MAX_ARTIFACT_BYTES}` } })
      const advertised = Number(header(streamResult.res?.headers || {}, 'content-length'))
      if (Number.isFinite(advertised) && advertised > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) {
        streamResult.stream.destroy?.()
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_BYTES_LIMIT_EXCEEDED')
      }
      const chunks: Buffer[] = []
      let total = 0
      for await (const value of streamResult.stream) {
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value as Uint8Array)
        total += chunk.length
        if (total > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) {
          streamResult.stream.destroy?.()
          scientificV2Error('SCIENTIFIC_V2_ARTIFACT_BYTES_LIMIT_EXCEEDED')
        }
        chunks.push(chunk)
      }
      const bytes = Buffer.concat(chunks, total)
      if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== input.imageHash) {
        scientificV2Error('SCIENTIFIC_V2_ARTIFACT_CONTENT_COLLISION')
      }
      if (reassertPrivate) {
        try {
          await client.put(input.objectKey, bytes, { headers: {
            'Content-Type': expectedContentType,
            'Cache-Control': 'private, no-store',
            'x-oss-object-acl': 'private',
            'x-oss-meta-sha256': input.imageHash,
          } })
        } catch {
          throw new ScientificV2ArtifactReconciliationRequiredError()
        }
      }
      return bytes
    },
  })
}

export interface ScientificV2AuthoritativeImageRuntime {
  generate(input: {
    provider: BenchProvider
    model: string
    apiKey: string
    prompt: string
    aspectRatio: string
    imageSize: '1K' | '2K' | 'provider-default'
  }): Promise<string>
  edit(input: {
    provider: BenchProvider
    model: string
    apiKey: string
    prompt: string
    aspectRatio: '16:9'
    sourceImage: string
    imageSize: '1K' | '2K' | 'provider-default'
  }): Promise<string>
}

function decodeCanonicalBase64(value: string) {
  if (value.length === 0 || value.length > MAX_BASE64_LENGTH || value.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_INVALID')
  const bytes = Buffer.from(value, 'base64')
  if (bytes.length === 0 || bytes.length > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES || bytes.toString('base64') !== value) {
    scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_INVALID')
  }
  return bytes
}

async function readBoundedResponse(response: Response) {
  if (!response.ok || !response.body) scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_DOWNLOAD_INVALID')
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) {
    scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_BYTES_LIMIT_EXCEEDED')
  }
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_BYTES_LIMIT_EXCEEDED')
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  if (total === 0) scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_INVALID')
  return Buffer.concat(chunks, total)
}

async function resolveRuntimeOutput(value: unknown, fetchImpl: typeof fetch) {
  if (typeof value !== 'string' || !value) scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_INVALID')
  if (value.startsWith('data:')) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/.exec(value)
    if (!match) scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_INVALID')
    return decodeCanonicalBase64(match[2])
  }
  if (/^https:\/\//.test(value)) {
    // The authoritative runtime must normalize provider-hosted URLs itself. Worker never follows a provider URL.
    scientificV2Error('SCIENTIFIC_V2_RUNTIME_OUTPUT_URL_FORBIDDEN')
  }
  return decodeCanonicalBase64(value)
}

function promptFor(request: ScientificV2ExecutorRequest) {
  if (request.operation === 'generation' && request.negativePrompt) {
    return `${request.instruction}\n\nNegative constraints:\n${request.negativePrompt}`
  }
  return request.instruction
}

function confirmedFailure(error: unknown, estimatedCny: number) {
  if (error instanceof UnknownProviderOutcomeError) throw error
  const descriptor = error && typeof error === 'object' ? Object.getOwnPropertyDescriptor(error, 'status') : undefined
  const status = descriptor && 'value' in descriptor ? descriptor.value : undefined
  if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599) {
    throw new ScientificConfirmedFailureError(`SCIENTIFIC_V2_CONFIRMED_HTTP_${status}`, {
      responseClass: status >= 500 ? 'confirmed_provider_failure' : 'confirmed_technical_failure',
      actualCny: estimatedCny,
    })
  }
  throw new UnknownProviderOutcomeError('UNKNOWN_PROVIDER_OUTCOME')
}

export function createScientificV2ProviderExecutor(input: {
  runtime: ScientificV2AuthoritativeImageRuntime
  credentials: Record<BenchProvider, string>
  artifactStore: ScientificV2ProductionArtifactStore
  fetchImpl: typeof fetch
  editSourcePng?: Buffer
  artifactSpool?: ScientificV2ArtifactSpool
}) {
  const editSourcePng = input.editSourcePng || readScientificEditSourcePng()
  if (createHash('sha256').update(editSourcePng).digest('hex') !== SCIENTIFIC_EDIT_SOURCE.sourceHash) {
    scientificV2Error('SCIENTIFIC_V2_EDIT_SOURCE_HASH_MISMATCH')
  }
  return Object.freeze({
    async execute(request: ScientificV2ExecutorRequest) {
      const apiKey = input.credentials[request.provider]
      if (!apiKey) scientificV2Error('SCIENTIFIC_V2_PRODUCTION_CREDENTIAL_MISSING')
      if (request.operation === 'edit' && request.sourceHash !== SCIENTIFIC_EDIT_SOURCE.sourceHash) {
        scientificV2Error('SCIENTIFIC_V2_EDIT_SOURCE_HASH_MISMATCH')
      }
      let sourceImage = `data:image/png;base64,${editSourcePng.toString('base64')}`
      let sourcePersisted = false
      if (request.operation === 'edit' && request.provider === 'bailian') {
        try {
          if (typeof input.artifactStore.createSignedReadUrl !== 'function') {
            scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SIGNED_URL_UNAVAILABLE')
          }
          const sourceObjectKey = scientificV2PrivateArtifactObjectKey(SCIENTIFIC_EDIT_SOURCE.sourceHash, 'png')
          await input.artifactStore.persist({
            objectKey: sourceObjectKey, imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash,
            format: 'png', contentType: 'image/png', bytes: editSourcePng,
          })
          sourcePersisted = true
          sourceImage = await input.artifactStore.createSignedReadUrl({ objectKey: sourceObjectKey, expiresSeconds: 900 })
        } catch {
          throw new ScientificConfirmedFailureError('SCIENTIFIC_V2_EDIT_SOURCE_HANDOFF_FAILED', {
            responseClass: 'confirmed_technical_failure', actualCny: 0,
          })
        }
      }
      let runtimeOutput!: string
      try {
        runtimeOutput = request.operation === 'generation'
          ? await input.runtime.generate({
            provider: request.provider, model: request.modelId, apiKey,
            prompt: promptFor(request), aspectRatio: request.aspectRatio || '16:9', imageSize: request.imageSize,
          })
          : await input.runtime.edit({
            provider: request.provider, model: request.modelId, apiKey,
            prompt: request.instruction, aspectRatio: '16:9', imageSize: request.imageSize,
            sourceImage,
          })
      } catch (error) {
        confirmedFailure(error, request.estimatedCny)
      }
      let bytes: Buffer | null = null
      let image: Awaited<ReturnType<typeof inspectScientificV2Image>>
      try {
        bytes = await resolveRuntimeOutput(runtimeOutput, input.fetchImpl)
        image = await inspectScientificV2Image(bytes)
      } catch (error) {
        if (error instanceof ScientificConfirmedFailureError) throw error
        throw new ScientificConfirmedFailureError('SCIENTIFIC_V2_POST_RUNTIME_TECHNICAL_FAILURE', {
          responseClass: 'confirmed_technical_failure', actualCny: request.estimatedCny,
        })
      }
      let spoolBinding: ScientificV2ArtifactSpoolBinding | null = null
      try {
        if (request.operation === 'edit' && !sourcePersisted) {
          await input.artifactStore.persist({
            objectKey: scientificV2PrivateArtifactObjectKey(SCIENTIFIC_EDIT_SOURCE.sourceHash, 'png'),
            imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash,
            format: 'png', contentType: 'image/png', bytes: editSourcePng,
          })
        }
        const contentType = `image/${image.format}` as const
        const objectKey = scientificV2PrivateArtifactObjectKey(image.rawImageHash, image.format)
        spoolBinding = input.artifactSpool ? await input.artifactSpool.stage({
          slotId: request.slotId, attemptIndex: request.attemptIndex, payloadHash: request.payloadHash,
          imageHash: image.rawImageHash, format: image.format, bytes,
        }) : null
        await input.artifactStore.persist({ objectKey, imageHash: image.rawImageHash, format: image.format, contentType, bytes })
        if (spoolBinding) await input.artifactSpool!.remove(spoolBinding).catch(() => undefined)
        return { responseClass: 'succeeded' as const, actualCny: request.estimatedCny, bytes }
      } catch (error) {
        if (!spoolBinding && input.artifactSpool) {
          try {
            spoolBinding = await input.artifactSpool.stage({
              slotId: request.slotId, attemptIndex: request.attemptIndex, payloadHash: request.payloadHash,
              imageHash: image.rawImageHash, format: image.format, bytes,
            })
          } catch { /* fail-stop without a recoverable local binding */ }
        }
        throw new ScientificV2ArtifactReconciliationRequiredError(bytes, request.estimatedCny, spoolBinding)
      }
    },
  })
}

type MongoRow = Record<string, unknown>
interface ScientificV2MongoCollection {
  findOne(query: MongoRow, options?: MongoRow): Promise<MongoRow | null>
  findOneAndUpdate(query: MongoRow, update: MongoRow, options?: MongoRow): Promise<MongoRow | null>
  updateOne(query: MongoRow, update: MongoRow, options?: MongoRow): Promise<{ modifiedCount: number }>
  insertOne(document: MongoRow, options?: MongoRow): Promise<unknown>
}
interface ScientificV2MongoSession {
  withTransaction(operation: () => Promise<void>, options?: MongoRow): Promise<void>
  endSession(): Promise<void>
}
export interface ScientificV2MongoDatabase {
  collection(name: string): ScientificV2MongoCollection
  client: { startSession(): ScientificV2MongoSession }
}

export interface ScientificV2ProductionRepository extends ScientificV2RunnerRepository {
  recordArtifactCleanupFailure(input: { manifestHash: string; stateHash: string; spoolId: string }): Promise<void>
  loadCompletedBatch(input: { batchId: string; manifestHash: string; stateHash: string }): Promise<{
    manifest: ScientificV2BatchManifest
    state: ScientificV2BatchState
  }>
  reconcileArtifact(input: {
    batchId: string
    manifestHash: string
    expectedStateHash: string
    marker: ScientificV2DispatchMarker
    imageHash: string
    nextState: ScientificV2BatchState
  }): Promise<ScientificV2BatchState>
}

const BATCH_COLLECTION = 'paperbanana_benchmark_scientific_v2_batches'
const DISPATCH_COLLECTION = 'paperbanana_benchmark_scientific_v2_dispatches'

function markerId(marker: ScientificV2DispatchMarker) {
  return `scientific-v2-dispatch:${canonicalHash({ manifestHash: marker.manifestHash, slotId: marker.slotId, attemptIndex: marker.attemptIndex })}`
}

function assertDispatchMarker(marker: ScientificV2DispatchMarker) {
  if (!marker || !/^[a-f0-9]{64}$/.test(marker.manifestHash) || !/^[a-f0-9]{64}$/.test(marker.payloadHash)
    || typeof marker.slotId !== 'string' || !marker.slotId || !Number.isInteger(marker.attemptIndex)
    || marker.attemptIndex < 1 || marker.attemptIndex > 4) scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
}

function expectedPayloadHash(manifest: ScientificV2BatchManifest, slot: ScientificV2BatchState['slots'][number]) {
  const scientificCase = manifest.cases.find((candidate) => candidate.id === slot.caseId)
  if (!scientificCase) scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
  return canonicalHash({
    route: { provider: slot.provider, modelId: slot.modelId }, operation: slot.operation,
    imageSize: slot.imageSize,
    caseId: scientificCase.id, instruction: scientificCase.instruction,
    ...(scientificCase.kind === 'generation'
      ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
      : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
  })
}

function frozenState(value: unknown, manifest: ScientificV2BatchManifest) {
  verifyScientificV2BatchState(value as ScientificV2BatchState, manifest)
  return deepFreezeScientificV2(structuredClone(value)) as ScientificV2BatchState
}

function batchManifest(row: MongoRow) {
  const manifest = row.manifest as ScientificV2BatchManifest
  if (!manifest || typeof manifest !== 'object') scientificV2Error('SCIENTIFIC_V2_REPOSITORY_BATCH_INVALID')
  return manifest
}

export function createScientificV2MongoRepository(
  db: ScientificV2MongoDatabase,
  now = () => new Date(),
  createClaimToken: () => string = () => randomUUID(),
  claimLeaseMs = 120_000,
): ScientificV2ProductionRepository {
  const batches = db.collection(BATCH_COLLECTION)
  const dispatches = db.collection(DISPATCH_COLLECTION)
  return {
    async loadCompletedBatch(input) {
      const current = await batches.findOne({
        batchId: input.batchId, manifestHash: input.manifestHash, stateHash: input.stateHash,
        status: { $in: ['completed', 'review_ready', 'review_dispute', 'review_finalized', 'published'] },
        'state.status': 'completed',
      })
      if (!current) scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDER_BATCH_BINDING_INVALID')
      const manifest = batchManifest(current)
      const state = frozenState(current.state, manifest)
      return { manifest, state }
    },
    async recordArtifactCleanupFailure(input) {
      assertSpoolId(input.spoolId)
      const updated = await batches.updateOne(
        { manifestHash: input.manifestHash, stateHash: input.stateHash },
        { $set: { artifactCleanupFailure: 'spool_remove_failed', artifactCleanupFailureAt: now(), artifactCleanupSpoolId: input.spoolId } },
      )
      if (updated.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_CLEANUP_AUDIT_FAILED')
    },
    async claimReady(input) {
      const claimNow = now()
      const claimableState = [
        { 'state.status': 'ready' },
        { 'state.status': 'canary_complete' },
        { 'state.status': 'blocked', 'state.blockReason': 'provider_canary_failed' },
      ]
      let current = await batches.findOne({
        manifestHash: input.manifestHash, stateHash: input.expectedReadyStateHash,
        $or: claimableState, claimToken: { $exists: false },
      })
      let reclaim = false
      if (!current) {
        current = await batches.findOne({
          manifestHash: input.manifestHash, status: 'running', claimLeaseExpiresAt: { $lte: claimNow },
        })
        if (!current) return null
        reclaim = true
        const unresolved = await dispatches.findOne({ manifestHash: input.manifestHash, status: 'started' })
        if (unresolved) scientificV2Error('SCIENTIFIC_V2_STALE_CLAIM_RECONCILIATION_REQUIRED')
      }
      const claimToken = createClaimToken()
      if (typeof claimToken !== 'string' || claimToken.length < 8) scientificV2Error('SCIENTIFIC_V2_CLAIM_TOKEN_INVALID')
      const state = structuredClone(frozenState(current.state, batchManifest(current))) as ScientificV2BatchState
      const execution = input.execution || {
        manifestCodeSha: batchManifest(current).codeSha,
        executionCodeSha: batchManifest(current).codeSha,
        legacyRecoveryStateHash: null,
      }
      const existingLineage = current.executionLineage
      const exactLineage = (value: unknown) => value && typeof value === 'object'
        && !Array.isArray(value) && canonicalHash(value) === canonicalHash(execution)
      if (execution.manifestCodeSha !== batchManifest(current).codeSha
        || !/^[a-f0-9]{40}$/.test(execution.executionCodeSha)
        || (execution.manifestCodeSha === execution.executionCodeSha
          ? execution.legacyRecoveryStateHash !== null
          : !/^[a-f0-9]{64}$/.test(String(execution.legacyRecoveryStateHash || '')))) {
        scientificV2Error('SCIENTIFIC_V2_EXECUTION_LINEAGE_INVALID')
      }
      const legacyRecovery = state.status === 'blocked' && state.blockReason === 'provider_canary_failed'
      if (execution.manifestCodeSha !== execution.executionCodeSha
        && !(legacyRecovery && execution.legacyRecoveryStateHash === state.stateHash && !existingLineage)
        && !exactLineage(existingLineage)) scientificV2Error('SCIENTIFIC_V2_EXECUTION_LINEAGE_INVALID')
      if (!reclaim) {
        if (state.status === 'blocked' && state.blockReason === 'provider_canary_failed') {
          const failedCanary = state.slots.find((slot) => slot.isProviderCanary && slot.status === 'failed')
          if (!failedCanary?.provider) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_BATCH_INVALID')
          for (const slot of state.slots) if (slot.status === 'not_executed') {
            if (slot.provider === failedCanary.provider
              && slot.canonicalModelId === failedCanary.canonicalModelId && slot.supported) {
              slot.status = 'failed'
              slot.attempts = []
              slot.costCny = 0
            } else {
              slot.status = 'pending'
            }
          }
          state.blockReason = null
        }
        state.status = 'running'
        state.updatedAt = claimNow.toISOString()
        const { stateHash: _oldStateHash, ...stateBase } = state
        state.stateHash = canonicalHash(stateBase)
      }
      verifyScientificV2BatchState(state, batchManifest(current))
      const claimLeaseExpiresAt = new Date(claimNow.getTime() + claimLeaseMs)
      const claimed = await batches.findOneAndUpdate(
        reclaim
          ? { _id: current._id, stateHash: current.stateHash, status: 'running', claimToken: current.claimToken, claimLeaseExpiresAt: { $lte: claimNow } }
          : { _id: current._id, stateHash: input.expectedReadyStateHash,
            $or: claimableState, claimToken: { $exists: false } },
        { $set: {
          state, stateHash: state.stateHash,
          ...(reclaim ? {} : { stateTransitionFromHash: input.expectedReadyStateHash }),
          ...(execution.manifestCodeSha === execution.executionCodeSha ? {} : { executionLineage: structuredClone(execution) }),
          status: 'running', claimToken, claimedAt: claimNow, claimHeartbeatAt: claimNow, claimLeaseExpiresAt,
        } },
        { returnDocument: 'after' },
      )
      if (!claimed) return null
      return {
        claimToken, state: frozenState(state, batchManifest(current)),
        batchId: String(current.batchId || ''), revision: Number(current.revision || 0) + 1,
      }
    },
    async saveClaimed(input) {
      const current = await batches.findOne({ manifestHash: input.nextState.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash })
      if (!current) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      verifyScientificV2BatchState(input.nextState, batchManifest(current))
      const releaseForFullResume = input.nextState.status === 'canary_complete'
      const updated = await batches.findOneAndUpdate(
        { manifestHash: input.nextState.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash },
        { $set: {
          state: structuredClone(input.nextState), stateHash: input.nextState.stateHash, stateTransitionFromHash: input.expectedStateHash,
          status: input.nextState.status, updatedAt: now(),
          ...(releaseForFullResume ? {} : { claimHeartbeatAt: now(), claimLeaseExpiresAt: new Date(now().getTime() + claimLeaseMs) }),
        }, ...(releaseForFullResume ? { $unset: {
          claimToken: '', claimLeaseExpiresAt: '', claimHeartbeatAt: '', claimedAt: '', workerId: '',
        } } : {}) },
        { returnDocument: 'after' },
      )
      if (!updated) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      return frozenState(input.nextState, batchManifest(current))
    },
    async beginDispatch(input) {
      assertDispatchMarker(input.marker)
      const batch = await batches.findOne({ manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash })
      if (!batch) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      const state = batch.state as ScientificV2BatchState
      const slot = state.slots.find((candidate) => candidate.slotId === input.marker.slotId)
      if (!slot || input.marker.attemptIndex !== slot.attempts.length + 1
        || input.marker.payloadHash !== expectedPayloadHash(batchManifest(batch), slot)) scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
      const id = markerId(input.marker)
      try {
        await dispatches.insertOne({
          _id: id, ...structuredClone(input.marker), claimToken: input.claimToken,
          expectedStateHash: input.expectedStateHash, status: 'started', startedAt: now(),
        })
        return { status: 'started' as const }
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error
        const existing = await dispatches.findOne({ _id: id })
        if (!existing || existing.payloadHash !== input.marker.payloadHash || existing.claimToken !== input.claimToken) {
          scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_CONFLICT')
        }
        return { status: 'existing_uncommitted' as const }
      }
    },
    async heartbeatClaim(input) {
      const heartbeatAt = now()
      const updated = await batches.updateOne(
        { manifestHash: input.manifestHash, claimToken: input.claimToken, status: 'running', claimLeaseExpiresAt: { $gt: heartbeatAt } },
        { $set: { claimHeartbeatAt: heartbeatAt, claimLeaseExpiresAt: new Date(heartbeatAt.getTime() + claimLeaseMs) } },
      )
      if (updated.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_CLAIM_LEASE_LOST')
    },
    async commitAttempt(input) {
      assertDispatchMarker(input.marker)
      const id = markerId(input.marker)
      const replay = await dispatches.findOne({ _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'committed' })
      if (replay) {
        const batch = await batches.findOne({ manifestHash: input.marker.manifestHash })
        if (!batch) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_BATCH_INVALID')
        return frozenState(replay.state, batchManifest(batch))
      }
      const authoritative = await batches.findOne({ manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash })
      if (!authoritative) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      const manifest = batchManifest(authoritative)
      verifyScientificV2BatchState(input.nextState, manifest)
      const previousSlot = (authoritative.state as ScientificV2BatchState).slots.find((candidate) => candidate.slotId === input.marker.slotId)
      const nextSlot = input.nextState.slots.find((candidate) => candidate.slotId === input.marker.slotId)
      const persistedAttempt = nextSlot?.attempts[input.marker.attemptIndex - 1]
      if (!previousSlot || !nextSlot || previousSlot.attempts.length !== input.marker.attemptIndex - 1
        || canonicalHash(persistedAttempt) !== canonicalHash(input.attempt)
        || input.attempt.attemptIndex !== input.marker.attemptIndex || input.attempt.payloadHash !== input.marker.payloadHash) {
        scientificV2Error('SCIENTIFIC_V2_ATTEMPT_MISMATCH')
      }
      if (input.artifactRecovery) assertArtifactRecoveryBinding(input.artifactRecovery, input.marker, input.attempt)
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const sessionOptions = { session }
          const marker = await dispatches.findOne({
            _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash,
            status: 'started', expectedStateHash: input.expectedStateHash,
          }, sessionOptions)
          if (!marker) scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
          const updatedBatch = await batches.updateOne(
            { manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash },
            { $set: {
              state: structuredClone(input.nextState), stateHash: input.nextState.stateHash, stateTransitionFromHash: input.expectedStateHash,
              status: input.nextState.status, updatedAt: now(), claimHeartbeatAt: now(), claimLeaseExpiresAt: new Date(now().getTime() + claimLeaseMs),
            } }, sessionOptions,
          )
          if (updatedBatch.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
          const updatedMarker = await dispatches.updateOne(
            { _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'started', expectedStateHash: input.expectedStateHash },
            { $set: {
              status: 'committed', attempt: structuredClone(input.attempt), state: structuredClone(input.nextState), committedAt: now(),
              ...(input.artifactRecovery ? { artifactRecovery: structuredClone(input.artifactRecovery) } : {}),
            } }, sessionOptions,
          )
          if (updatedMarker.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return frozenState(input.nextState, manifest)
    },
    async resolveDispatch(input) {
      assertDispatchMarker(input.marker)
      const marker = await dispatches.findOne({ _id: markerId(input.marker), claimToken: input.claimToken, payloadHash: input.marker.payloadHash })
      if (!marker) scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
      if (marker.status === 'committed') {
        const batch = await batches.findOne({ manifestHash: input.marker.manifestHash })
        if (!batch) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_BATCH_INVALID')
        return { status: 'committed' as const, state: frozenState(marker.state, batchManifest(batch)) }
      }
      if (marker.status === 'started') return { status: 'started' as const }
      scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
    },
    async markUnknown(input) {
      assertDispatchMarker(input.marker)
      if (!Number.isFinite(input.conservativeCny) || input.conservativeCny < 0) scientificV2Error('SCIENTIFIC_V2_UNKNOWN_COST_INVALID')
      const authoritative = await batches.findOne({ manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash })
      if (!authoritative) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
      const manifest = batchManifest(authoritative)
      verifyScientificV2BatchState(input.nextState, manifest)
      const previousSlot = (authoritative.state as ScientificV2BatchState).slots.find((candidate) => candidate.slotId === input.marker.slotId)
      const nextSlot = input.nextState.slots.find((candidate) => candidate.slotId === input.marker.slotId)
      const persistedAttempt = nextSlot?.attempts[input.marker.attemptIndex - 1]
      if (!previousSlot || !nextSlot || previousSlot.attempts.length !== input.marker.attemptIndex - 1
        || canonicalHash(persistedAttempt) !== canonicalHash(input.attempt)
        || nextSlot.status !== 'unknown' || input.attempt.responseClass !== 'unknown_provider_outcome') scientificV2Error('SCIENTIFIC_V2_ATTEMPT_MISMATCH')
      const id = markerId(input.marker)
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const sessionOptions = { session }
          const marker = await dispatches.findOne({
            _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash,
            status: 'started', expectedStateHash: input.expectedStateHash,
          }, sessionOptions)
          if (!marker) scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
          const updatedBatch = await batches.updateOne(
            { manifestHash: input.marker.manifestHash, claimToken: input.claimToken, stateHash: input.expectedStateHash },
            { $set: {
              state: structuredClone(input.nextState), stateHash: input.nextState.stateHash, stateTransitionFromHash: input.expectedStateHash,
              status: input.nextState.status, updatedAt: now(), claimHeartbeatAt: now(), claimLeaseExpiresAt: new Date(now().getTime() + claimLeaseMs),
            } }, sessionOptions,
          )
          if (updatedBatch.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_REPOSITORY_CAS_FAILED')
          const updatedMarker = await dispatches.updateOne(
            { _id: id, claimToken: input.claimToken, payloadHash: input.marker.payloadHash, status: 'started', expectedStateHash: input.expectedStateHash },
            { $set: { status: 'unknown', attempt: structuredClone(input.attempt), conservativeCny: input.conservativeCny, state: structuredClone(input.nextState), resolvedAt: now() } }, sessionOptions,
          )
          if (updatedMarker.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_DISPATCH_MARKER_INVALID')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return frozenState(input.nextState, manifest)
    },
    async reconcileArtifact(input) {
      assertDispatchMarker(input.marker)
      const current = await batches.findOne({
        batchId: input.batchId, manifestHash: input.manifestHash, stateHash: input.expectedStateHash,
        status: 'paused', 'state.pauseReason': 'artifact_reconciliation_required',
      })
      if (!current) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_CAS_FAILED')
      const manifest = batchManifest(current)
      verifyScientificV2BatchState(input.nextState, manifest)
      const markerKey = markerId(input.marker)
      const session = db.client.startSession()
      try {
        await session.withTransaction(async () => {
          const sessionOptions = { session }
          const dispatch = await dispatches.findOne({
            _id: markerKey, payloadHash: input.marker.payloadHash, status: 'committed',
            'artifactRecovery.imageHash': input.imageHash,
          }, sessionOptions)
          if (!dispatch) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_BINDING_INVALID')
          assertArtifactRecoveryBinding(dispatch.artifactRecovery as ScientificV2ArtifactSpoolBinding, input.marker, dispatch.attempt as ScientificV2Attempt)
          const updatedBatch = await batches.updateOne(
            { batchId: input.batchId, manifestHash: input.manifestHash, stateHash: input.expectedStateHash,
              status: 'paused', 'state.pauseReason': 'artifact_reconciliation_required' },
            { $set: {
              state: structuredClone(input.nextState), stateHash: input.nextState.stateHash,
              stateTransitionFromHash: input.expectedStateHash, status: 'running', updatedAt: now(),
              claimLeaseExpiresAt: new Date(0),
            } }, sessionOptions,
          )
          if (updatedBatch.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_CAS_FAILED')
          const slot = input.nextState.slots.find((candidate) => candidate.slotId === input.marker.slotId)
          const attempt = slot?.attempts[input.marker.attemptIndex - 1]
          const updatedDispatch = await dispatches.updateOne(
            { _id: markerKey, payloadHash: input.marker.payloadHash, status: 'committed',
              'artifactRecovery.imageHash': input.imageHash },
            { $set: { attempt: structuredClone(attempt), state: structuredClone(input.nextState), artifactReconciledAt: now() } }, sessionOptions,
          )
          if (updatedDispatch.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_CAS_FAILED')
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally {
        await session.endSession()
      }
      return frozenState(input.nextState, manifest)
    },
    async recordReleaseFailure(input) {
      if (input.failureClass !== 'lock_release_failed') scientificV2Error('SCIENTIFIC_V2_RELEASE_FAILURE_INVALID')
      await batches.updateOne(
        { manifestHash: input.manifestHash, ...(input.claimToken ? { claimToken: input.claimToken } : {}) },
        { $set: { releaseFailure: input.failureClass, releaseFailureAt: now() } },
      )
    },
  }
}

export async function reconcileScientificV2Artifact(input: {
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  batchId: string
  slotId: string
  attemptIndex: number
  imageHash: string
  repository: ScientificV2ProductionRepository
  artifactStore: ScientificV2ProductionArtifactStore
  artifactSpool: ScientificV2ArtifactSpool
  editSourcePng?: Buffer
}) {
  verifyScientificV2BatchState(input.state, input.manifest)
  if (input.state.status !== 'paused' || input.state.pauseReason !== 'artifact_reconciliation_required') {
    scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_STATE_INVALID')
  }
  const slot = input.state.slots.find((candidate) => candidate.slotId === input.slotId)
  const attempt = slot?.attempts[input.attemptIndex - 1]
  if (!slot || slot.status !== 'artifact_reconciliation' || attempt?.responseClass !== 'artifact_reconciliation_required'
    || attempt.rawImageHash !== input.imageHash || !attempt.format || !attempt.byteSize) {
    scientificV2Error('SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_BINDING_INVALID')
  }
  const spoolId = `${canonicalHash({ slotId: slot.slotId, attemptIndex: input.attemptIndex, payloadHash: attempt.payloadHash, imageHash: input.imageHash })}.${attempt.format}`
  const binding = { spoolId, imageHash: input.imageHash, format: attempt.format, byteSize: attempt.byteSize }
  const bytes = await input.artifactSpool.read(binding)
  const image = await inspectScientificV2Image(bytes)
  if (image.rawImageHash !== input.imageHash || image.format !== attempt.format || image.byteSize !== attempt.byteSize) {
    scientificV2Error('SCIENTIFIC_V2_ARTIFACT_SPOOL_CONTENT_INVALID')
  }
  if (slot.operation === 'edit') {
    const sourceBytes = input.editSourcePng || readScientificV2ProductionEditSourcePng()
    await input.artifactStore.persist({
      objectKey: scientificV2PrivateArtifactObjectKey(SCIENTIFIC_EDIT_SOURCE.sourceHash, 'png'),
      imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, format: 'png', contentType: 'image/png', bytes: sourceBytes,
    })
  }
  await input.artifactStore.persist({
    objectKey: scientificV2PrivateArtifactObjectKey(input.imageHash, attempt.format), imageHash: input.imageHash,
    format: attempt.format, contentType: `image/${attempt.format}` as ScientificV2ProductionArtifact['contentType'], bytes,
  })
  const next = structuredClone(input.state)
  const nextSlot = next.slots.find((candidate) => candidate.slotId === input.slotId)!
  const nextAttempt = { ...nextSlot.attempts[input.attemptIndex - 1], responseClass: 'succeeded' as const }
  const { attemptHash: _oldAttemptHash, ...attemptBase } = nextAttempt
  nextSlot.attempts[input.attemptIndex - 1] = { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
  nextSlot.status = 'succeeded'
  for (const later of next.slots) if (later.sequence > nextSlot.sequence && later.status === 'not_executed') later.status = 'pending'
  next.status = 'running'
  next.pauseReason = null
  next.blockReason = null
  next.updatedAt = new Date().toISOString()
  refreshScientificV2StateHash(next)
  const marker = { manifestHash: input.manifest.manifestHash, slotId: slot.slotId, attemptIndex: input.attemptIndex, payloadHash: attempt.payloadHash }
  const persisted = await input.repository.reconcileArtifact({
    batchId: input.batchId, manifestHash: input.manifest.manifestHash, expectedStateHash: input.state.stateHash,
    marker, imageHash: input.imageHash, nextState: deepFreezeScientificV2(next),
  })
  try {
    await input.artifactSpool.remove(binding)
  } catch {
    await input.repository.recordArtifactCleanupFailure({
      manifestHash: input.manifest.manifestHash, stateHash: persisted.stateHash, spoolId: binding.spoolId,
    }).catch(() => undefined)
  }
  return { state: persisted, spoolId }
}

export async function renderScientificV2PublicEvidence(input: {
  batchId: string
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  repository: ScientificV2ProductionRepository
  store: ScientificV2EvidenceObjectStore
  editSourcePng?: Buffer
}) {
  verifyScientificV2BatchManifest(input.manifest)
  verifyScientificV2BatchState(input.state, input.manifest)
  if (input.state.status !== 'completed') scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDER_STATE_INVALID')
  const authoritative = await input.repository.loadCompletedBatch({
    batchId: input.batchId, manifestHash: input.manifest.manifestHash, stateHash: input.state.stateHash,
  })
  verifyScientificV2BatchManifest(authoritative.manifest)
  verifyScientificV2BatchState(authoritative.state, authoritative.manifest)
  if (authoritative.manifest.manifestHash !== input.manifest.manifestHash || authoritative.state.stateHash !== input.state.stateHash) {
    scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDER_BATCH_BINDING_INVALID')
  }
  const objectBindings = new Map<string, { imageHash: string; objectKey: string }>()
  const evidence: unknown[] = []
  const sourceObjectKey = scientificV2PrivateArtifactObjectKey(SCIENTIFIC_EDIT_SOURCE.sourceHash, 'png')
  const fixedSourceBytes = input.editSourcePng || readScientificV2ProductionEditSourcePng()
  await input.store.persistPrivate({
    objectKey: sourceObjectKey, imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash,
    format: 'png', contentType: 'image/png', bytes: fixedSourceBytes,
  })
  objectBindings.set(SCIENTIFIC_EDIT_SOURCE.sourceHash, { imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, objectKey: sourceObjectKey })
  let editSource: { bytes: Buffer; imageHash: string; format: 'png' } | undefined
  for (const slot of authoritative.state.slots) {
    if (slot.status !== 'succeeded') continue
    const attempt = slot.attempts.at(-1)
    if (!attempt?.rawImageHash || !attempt.format || !['succeeded', 'succeeded_low_quality'].includes(attempt.responseClass)) {
      scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDER_STATE_INVALID')
    }
    if (!Number.isInteger(attempt.width) || Number(attempt.width) < 1
      || !Number.isInteger(attempt.height) || Number(attempt.height) < 1
      || !Number.isInteger(attempt.byteSize) || Number(attempt.byteSize) < 1) {
      scientificV2Error('SCIENTIFIC_V2_PUBLIC_RENDER_STATE_INVALID')
    }
    const actualWidth = attempt.width as number
    const actualHeight = attempt.height as number
    const actualByteSize = attempt.byteSize as number
    const rawObjectKey = scientificV2PrivateArtifactObjectKey(attempt.rawImageHash, attempt.format)
    const rawBytes = await input.store.readPrivate({ objectKey: rawObjectKey, imageHash: attempt.rawImageHash, format: attempt.format })
    let sourceInput: typeof editSource
    if (slot.operation === 'edit') {
      if (!editSource) {
        const bytes = await input.store.readPrivate({ objectKey: sourceObjectKey, imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, format: 'png' })
        editSource = { bytes, imageHash: SCIENTIFIC_EDIT_SOURCE.sourceHash, format: 'png' }
      }
      sourceInput = editSource
    }
    const rendered = await createScientificV2PublicEvidenceInput({
      canonicalModelId: slot.canonicalModelId, caseId: slot.caseId,
      raw: { bytes: rawBytes, imageHash: attempt.rawImageHash, format: attempt.format },
      ...(sourceInput ? { editSource: sourceInput } : {}), store: input.store,
    })
    for (const binding of rendered.objectBindings) objectBindings.set(binding.imageHash, binding)
    evidence.push(...rendered.evidence.map((item) => ({
      ...item,
      requestedResolution: slot.imageSize,
      actualOutputPixels: {
        width: actualWidth,
        height: actualHeight,
        megapixels: Number(((actualWidth * actualHeight) / 1_000_000).toFixed(4)),
        fileSizeBytes: actualByteSize,
      },
    })))
  }
  const publishInput = deepFreezeScientificV2({ batchId: input.batchId, objectBindings: [...objectBindings.values()], evidence })
  return { publishInput, publishInputHash: canonicalHash(publishInput) }
}

export function createScientificV2MongoLeaseLock(db: ScientificV2MongoDatabase, options: {
  ownerToken: string
  now?: () => Date
  leaseMs?: number
  heartbeatIntervalMs?: number
}) {
  const collection = db.collection(DISPATCH_COLLECTION)
  const now = options.now || (() => new Date())
  const leaseMs = options.leaseMs ?? 120_000
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000
  if (typeof options.ownerToken !== 'string' || options.ownerToken.length < 8
    || !Number.isInteger(leaseMs) || !Number.isInteger(heartbeatIntervalMs)
    || heartbeatIntervalMs < 1 || leaseMs < 2 || heartbeatIntervalMs >= leaseMs) {
    scientificV2Error('SCIENTIFIC_V2_LOCK_LEASE_INVALID')
  }
  const lockId = (name: string) => `scientific-v2-lock:${canonicalHash(name)}`
  return Object.freeze({
    leaseMs,
    heartbeatIntervalMs,
    async acquire(name: string) {
      const timestamp = now()
      try {
        const acquired = await collection.findOneAndUpdate(
          { _id: lockId(name), $or: [{ leaseUntil: { $lte: timestamp } }, { leaseUntil: { $exists: false } }, { ownerToken: options.ownerToken }] },
          { $set: { kind: 'scientific-v2-production-lock', lockName: name, status: 'lease', ownerToken: options.ownerToken, leaseUntil: new Date(timestamp.getTime() + leaseMs), updatedAt: timestamp }, $setOnInsert: { _id: lockId(name), createdAt: timestamp } },
          { upsert: true, returnDocument: 'after' },
        )
        if (!acquired || acquired.ownerToken !== options.ownerToken) scientificV2Error('SCIENTIFIC_V2_PRODUCTION_LOCK_HELD')
        return options.ownerToken
      } catch (error) {
        if ((error as { code?: number })?.code === 11000) scientificV2Error('SCIENTIFIC_V2_PRODUCTION_LOCK_HELD')
        throw error
      }
    },
    async heartbeat(token: string) {
      const timestamp = now()
      const result = await collection.updateOne(
        { _id: lockId('/run/lock/paperbanana-hk-production.lock'), ownerToken: token, status: 'lease', leaseUntil: { $gt: timestamp } },
        { $set: { leaseUntil: new Date(timestamp.getTime() + leaseMs), heartbeatAt: timestamp, updatedAt: timestamp } },
      )
      if (result.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_PRODUCTION_LOCK_LOST')
    },
    async release(token: string) {
      const timestamp = now()
      const result = await collection.updateOne(
        { _id: lockId('/run/lock/paperbanana-hk-production.lock'), ownerToken: token, status: 'lease' },
        { $set: { status: 'released', releasedAt: timestamp, updatedAt: timestamp }, $unset: { ownerToken: '', leaseUntil: '' } },
      )
      if (result.modifiedCount !== 1) scientificV2Error('SCIENTIFIC_V2_PRODUCTION_LOCK_RELEASE_FAILED')
    },
  })
}
