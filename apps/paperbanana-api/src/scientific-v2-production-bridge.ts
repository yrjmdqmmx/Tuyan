import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { canonicalHash } from '@paperbanana/benchmark-core'

const hashPattern = /^[a-f0-9]{64}$/
const codeShaPattern = /^[a-f0-9]{40}$/
const MAX_AUTHORITY_AGE_MS = 24 * 60 * 60 * 1_000
const REGISTRY_AUTHORITY_DOMAIN = 'paperbanana/scientific-v2/registry-authority/v1'

type AnyRecord = Record<string, unknown>

export interface ScientificV2RegistryAuthority {
  schemaVersion: 1
  codeSha: string
  capturedAt: string
  registryVersion: string
  registryBytesHash: string
  registry: AnyRecord
  snapshotHash: string
  attestationHash: string
}

function fail(suffix: string): never {
  throw new Error(`SCIENTIFIC_V2_REGISTRY_AUTHORITY_${suffix}`)
}

function exactKeys(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('SCHEMA_INVALID')
  const ownKeys = Reflect.ownKeys(value)
  if (ownKeys.some((key) => typeof key !== 'string')) fail('SCHEMA_INVALID')
  const actual = (ownKeys as string[]).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail('SCHEMA_INVALID')
}

function validSecret(secret: unknown): secret is string {
  return typeof secret === 'string' && secret.trim() === secret
    && Buffer.byteLength(secret, 'utf8') >= 32 && Buffer.byteLength(secret, 'utf8') <= 4096
}

function canonicalRegistryBytes(registry: unknown) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) fail('REGISTRY_INVALID')
  let bytes: Buffer
  try { bytes = Buffer.from(JSON.stringify(registry)) } catch { fail('REGISTRY_INVALID') }
  if (bytes.length < 2 || bytes.length > 16 * 1024 * 1024) fail('REGISTRY_INVALID')
  return bytes
}

function scientificRegistrySubset(registry: unknown) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) fail('REGISTRY_INVALID')
  const source = registry as AnyRecord
  const unavailable = source.unavailableProviders
  const scientificUnavailable = Array.isArray(unavailable)
    ? unavailable.some((provider) => typeof provider === 'string' && ['bailian', 'ark', 'openrouter'].includes(provider))
    : unavailable && typeof unavailable === 'object'
      ? ['bailian', 'ark', 'openrouter'].some((provider) => Object.hasOwn(unavailable as object, provider))
      : false
  if (unavailable !== undefined && unavailable !== null && !Array.isArray(unavailable)
    && (typeof unavailable !== 'object' || scientificUnavailable)) fail('REGISTRY_INVALID')
  if (Array.isArray(unavailable)
    && (unavailable.some((provider) => typeof provider !== 'string') || scientificUnavailable)) fail('REGISTRY_INVALID')
  if (source.code !== 0 || typeof source.registryVersion !== 'string' || !source.registryVersion
    || source.routeContractVersion !== 1 || !source.providers || typeof source.providers !== 'object'
    || Array.isArray(source.providers)) {
    fail('REGISTRY_INVALID')
  }
  const providers = source.providers as AnyRecord
  const exactProviders: AnyRecord = {}
  for (const provider of ['bailian', 'ark', 'openrouter']) {
    const value = providers[provider]
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray((value as AnyRecord).models)) fail('REGISTRY_INVALID')
    exactProviders[provider] = structuredClone(value)
  }
  return {
    registryVersion: source.registryVersion,
    routeContractVersion: source.routeContractVersion,
    providers: exactProviders,
  }
}

function safeEqual(actual: unknown, expected: string) {
  return typeof actual === 'string' && hashPattern.test(actual) && actual.length === expected.length
    && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

function registryAuthorityKey(secret: string) {
  return createHmac('sha256', secret).update(REGISTRY_AUTHORITY_DOMAIN).digest()
}

export async function createScientificV2RegistryAuthority(input: {
  codeSha: string
  secret: string
  now?: () => Date
  loadCurrentRegistry(): Promise<unknown>
}): Promise<ScientificV2RegistryAuthority> {
  if (!codeShaPattern.test(input.codeSha) || !validSecret(input.secret)
    || typeof input.loadCurrentRegistry !== 'function') fail('INPUT_INVALID')
  const capturedAt = (input.now || (() => new Date()))().toISOString()
  const loadedRegistry = await input.loadCurrentRegistry()
  const registry = scientificRegistrySubset(loadedRegistry)
  const bytes = canonicalRegistryBytes(registry)
  const registryRecord = registry as AnyRecord
  const base = {
    schemaVersion: 1 as const,
    codeSha: input.codeSha,
    capturedAt,
    registryVersion: registryRecord.registryVersion as string,
    registryBytesHash: createHash('sha256').update(bytes).digest('hex'),
    registry: structuredClone(registryRecord),
  }
  const snapshotHash = canonicalHash(base)
  return Object.freeze({
    ...base,
    snapshotHash,
    attestationHash: createHmac('sha256', registryAuthorityKey(input.secret)).update(snapshotHash).digest('hex'),
  })
}

export function verifyScientificV2RegistryAuthority(value: unknown, options: {
  expectedCodeSha: string
  secret: string
  now?: () => Date
}): ScientificV2RegistryAuthority {
  if (!codeShaPattern.test(options.expectedCodeSha) || !validSecret(options.secret)) fail('INPUT_INVALID')
  exactKeys(value, [
    'schemaVersion', 'codeSha', 'capturedAt', 'registryVersion', 'registryBytesHash',
    'registry', 'snapshotHash', 'attestationHash',
  ])
  const authority = value as unknown as ScientificV2RegistryAuthority
  exactKeys(authority.registry, ['registryVersion', 'routeContractVersion', 'providers'])
  const verifiedSubset = scientificRegistrySubset({ code: 0, ...authority.registry })
  const parsedAt = new Date(authority.capturedAt)
  const current = (options.now || (() => new Date()))()
  if (authority.schemaVersion !== 1 || authority.codeSha !== options.expectedCodeSha
    || parsedAt.toISOString() !== authority.capturedAt
    || current.getTime() < parsedAt.getTime()
    || current.getTime() - parsedAt.getTime() > MAX_AUTHORITY_AGE_MS
    || typeof authority.registryVersion !== 'string' || !authority.registryVersion
    || authority.registry.registryVersion !== authority.registryVersion) fail('STALE_OR_MISMATCHED')
  const registryBytesHash = createHash('sha256').update(canonicalRegistryBytes(verifiedSubset)).digest('hex')
  if (registryBytesHash !== authority.registryBytesHash) fail('REGISTRY_BYTES_MISMATCH')
  const { snapshotHash, attestationHash, ...base } = authority
  const expectedSnapshotHash = canonicalHash(base)
  const expectedAttestationHash = createHmac('sha256', registryAuthorityKey(options.secret)).update(expectedSnapshotHash).digest('hex')
  if (snapshotHash !== expectedSnapshotHash || !safeEqual(attestationHash, expectedAttestationHash)) fail('ATTESTATION_INVALID')
  return Object.freeze(structuredClone(authority))
}
