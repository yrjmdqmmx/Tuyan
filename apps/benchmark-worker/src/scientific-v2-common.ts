import { createHash } from 'node:crypto'
import sharp, { type Metadata } from 'sharp'

export const SCIENTIFIC_V2_PROVIDERS = ['bailian', 'ark', 'openrouter'] as const
export type ScientificV2Provider = typeof SCIENTIFIC_V2_PROVIDERS[number] | 'codex'
export type ScientificV2Operation = 'generation' | 'edit'
export const SCIENTIFIC_V2_MAX_ARTIFACT_BYTES = 25 * 1024 * 1024
export const SCIENTIFIC_V2_MAX_IMAGE_PIXELS = 40_000_000
const CNY_SCALE = 100_000_000

export function scientificV2Error(code: string): never {
  throw new Error(code)
}

export function deepFreezeScientificV2<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Reflect.ownKeys(value)) {
      if (Array.isArray(value) && key === 'length') continue
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (typeof key !== 'string' || !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
        scientificV2Error('SCIENTIFIC_V2_DESCRIPTOR_INVALID')
      }
      deepFreezeScientificV2(descriptor.value)
    }
  }
  return value
}

export function isScientificV2Hash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

export function assertScientificV2Iso(value: unknown, code: string): asserts value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) scientificV2Error(code)
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) scientificV2Error(code)
}

export function assertExactScientificV2Keys(value: unknown, keys: readonly string[], code: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || Reflect.ownKeys(value).some((key) => {
      if (typeof key !== 'string') return true
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      return !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')
    })) scientificV2Error(code)
  const actual = Reflect.ownKeys(value).map(String).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) scientificV2Error(code)
}

export function assertDenseScientificV2Array(value: unknown, maxLength: number, code: string): asserts value is unknown[] {
  if (!Array.isArray(value) || !Number.isInteger(maxLength) || maxLength < 0 || value.length > maxLength) scientificV2Error(code)
  const keys = Reflect.ownKeys(value)
  if (keys.length !== value.length + 1 || keys.at(-1) !== 'length') scientificV2Error(code)
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) scientificV2Error(code)
  }
}

export function assertBoundedScientificV2PlainData(value: unknown, limits: {
  maxDepth: number
  maxNodes: number
  maxArrayLength: number
  maxStringLength: number
}, code: string) {
  let nodes = 0
  const pending: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }]
  while (pending.length) {
    const current = pending.pop()!
    nodes += 1
    if (nodes > limits.maxNodes || current.depth > limits.maxDepth) scientificV2Error(code)
    if (current.value === null || typeof current.value === 'boolean') continue
    if (typeof current.value === 'string') {
      if (current.value.length > limits.maxStringLength) scientificV2Error(code)
      continue
    }
    if (typeof current.value === 'number') {
      if (!Number.isFinite(current.value)) scientificV2Error(code)
      continue
    }
    if (!current.value || typeof current.value !== 'object') scientificV2Error(code)
    if (Array.isArray(current.value)) {
      assertDenseScientificV2Array(current.value, limits.maxArrayLength, code)
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        pending.push({ value: Object.getOwnPropertyDescriptor(current.value, String(index))!.value, depth: current.depth + 1 })
      }
      continue
    }
    if (Object.getPrototypeOf(current.value) !== Object.prototype) scientificV2Error(code)
    const keys = Reflect.ownKeys(current.value)
    if (keys.length > limits.maxArrayLength) scientificV2Error(code)
    for (const key of keys) {
      if (typeof key !== 'string' || key.length > limits.maxStringLength) scientificV2Error(code)
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key)
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) scientificV2Error(code)
      pending.push({ value: descriptor.value, depth: current.depth + 1 })
    }
  }
}

export function scientificV2CnyToUnits(value: unknown, code = 'SCIENTIFIC_V2_CNY_PRECISION_INVALID'): bigint {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) scientificV2Error(code)
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(value.toString())
  if (!match) scientificV2Error(code)
  const fraction = match[2] || ''
  const exponent = Number(match[3] || 0)
  if (!Number.isSafeInteger(exponent)) scientificV2Error(code)
  const unitExponent = 8 + exponent - fraction.length
  if (unitExponent < 0 || unitExponent > 32) scientificV2Error(code)
  const digits = `${match[1]}${fraction}`.replace(/^0+(?=\d)/, '')
  const units = BigInt(digits) * (10n ** BigInt(unitExponent))
  if (units > BigInt(Number.MAX_SAFE_INTEGER)) scientificV2Error(code)
  return units
}

export function scientificV2CnyFromUnits(value: bigint) {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) scientificV2Error('SCIENTIFIC_V2_CNY_PRECISION_INVALID')
  const normalized = Number(value) / CNY_SCALE
  if (scientificV2CnyToUnits(normalized) !== value) scientificV2Error('SCIENTIFIC_V2_CNY_PRECISION_INVALID')
  return normalized
}

export async function inspectScientificV2Image(bytes: unknown) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) scientificV2Error('SCIENTIFIC_V2_OUTPUT_BYTES_INVALID')
  if (bytes.length > SCIENTIFIC_V2_MAX_ARTIFACT_BYTES) scientificV2Error('SCIENTIFIC_V2_OUTPUT_BYTES_LIMIT_EXCEEDED')
  const digest = createHash('sha256').update(bytes).digest('hex')
  let metadata: Metadata
  try {
    metadata = await sharp(bytes, {
      animated: true,
      pages: -1,
      failOn: 'error',
      limitInputPixels: SCIENTIFIC_V2_MAX_IMAGE_PIXELS,
    }).metadata()
  } catch {
    scientificV2Error('SCIENTIFIC_V2_OUTPUT_IMAGE_INVALID')
  }
  if ((metadata.pages !== undefined && metadata.pages > 1)
    || (metadata.pageHeight !== undefined && metadata.pageHeight !== metadata.height)) {
    scientificV2Error('SCIENTIFIC_V2_OUTPUT_ANIMATION_UNSUPPORTED')
  }
  if (!metadata.width || !metadata.height || !metadata.format
    || metadata.width * metadata.height > SCIENTIFIC_V2_MAX_IMAGE_PIXELS
    || !['png', 'jpeg', 'webp'].includes(metadata.format)) scientificV2Error('SCIENTIFIC_V2_OUTPUT_IMAGE_INVALID')
  try {
    await sharp(bytes, { failOn: 'error', limitInputPixels: SCIENTIFIC_V2_MAX_IMAGE_PIXELS }).stats()
  } catch {
    scientificV2Error('SCIENTIFIC_V2_OUTPUT_IMAGE_INVALID')
  }
  const completeContainer = metadata.format === 'png'
    ? bytes.length >= 12 && bytes.readUInt32BE(bytes.length - 12) === 0 && bytes.toString('ascii', bytes.length - 8, bytes.length - 4) === 'IEND'
    : metadata.format === 'jpeg'
      ? bytes.length >= 2 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
      : bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.readUInt32LE(4) + 8 === bytes.length && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (!completeContainer) scientificV2Error('SCIENTIFIC_V2_OUTPUT_IMAGE_INVALID')
  const decodedByteSize = metadata.width * metadata.height * Math.max(1, metadata.channels || 4)
  return {
    rawImageHash: digest,
    byteSize: bytes.length,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format as 'png' | 'jpeg' | 'webp',
    decodedByteSize,
  }
}
