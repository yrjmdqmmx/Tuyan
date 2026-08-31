import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import {
  buildScientificV2CanonicalManifest,
  buildScientificV2PriceSnapshot,
  canonicalHash,
  deriveScientificV2PriceRequirements,
  verifyScientificV2PriceSnapshot,
  type ScientificV2PriceSnapshotV2,
} from '@paperbanana/benchmark-core'

import { assertExactScientificV2Keys, isScientificV2Hash, scientificV2Error } from './scientific-v2-common.js'
import {
  extractScientificV2OfficialPriceObservations,
  type ScientificV2OfficialPriceCapture,
  type ScientificV2OfficialPriceRefreshReport,
} from './scientific-v2-price-refresh.js'
import { scientificV2ConservativeUnitCny } from './scientific-v2-price-policy.js'

type CanonicalManifest = Parameters<typeof verifyScientificV2PriceSnapshot>[1] & { manifestHash: string }
const PRICE_ATTESTATION_DOMAIN = 'paperbanana/scientific-v2/price-attestation/v2'

export interface ScientificV2SignedPriceSnapshot {
  schemaVersion: 2
  kind: 'scientific-v2-authoritative-price-v2'
  codeSha: string
  canonicalManifestHash: string
  registryAuthorityHash: string
  capturesHash: string
  requirementsHash: string
  operatorAuthorizationHash: string | null
  priceSnapshotHash: string
  capturedAt: string
  priceSnapshot: ScientificV2PriceSnapshotV2
  envelopeHash: string
  attestationHash: string
}

function secretBytes(secret: unknown) {
  if (typeof secret !== 'string' || secret.trim() !== secret
    || Buffer.byteLength(secret, 'utf8') < 32 || Buffer.byteLength(secret, 'utf8') > 4096) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_SECRET_INVALID')
  }
  return createHmac('sha256', Buffer.from(secret, 'utf8')).update(PRICE_ATTESTATION_DOMAIN).digest()
}

function safeHexEqual(left: unknown, right: string) {
  if (typeof left !== 'string' || !isScientificV2Hash(left)) return false
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'))
}

export function verifyScientificV2SignedPriceSnapshot(value: unknown, options: {
  secret: string
  canonicalManifest: CanonicalManifest
  expectedCodeSha: string
  now: Date | (() => Date)
  maxAgeMs: number
}) {
  const key = secretBytes(options.secret)
  assertExactScientificV2Keys(value, [
    'schemaVersion', 'kind', 'codeSha', 'canonicalManifestHash', 'registryAuthorityHash', 'capturesHash',
    'requirementsHash', 'operatorAuthorizationHash', 'priceSnapshotHash', 'capturedAt',
    'priceSnapshot', 'envelopeHash', 'attestationHash',
  ], 'SCIENTIFIC_V2_PRICE_ATTESTATION_INVALID')
  const { envelopeHash, attestationHash, ...base } = value
  const expectedEnvelopeHash = canonicalHash(base)
  const expectedAttestationHash = createHmac('sha256', key).update(expectedEnvelopeHash).digest('hex')
  if (value.schemaVersion !== 2 || value.kind !== 'scientific-v2-authoritative-price-v2'
    || !safeHexEqual(envelopeHash, expectedEnvelopeHash) || !safeHexEqual(attestationHash, expectedAttestationHash)) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_INVALID')
  }
  if (value.codeSha !== options.expectedCodeSha || !/^[a-f0-9]{40}$/.test(options.expectedCodeSha)
    || value.canonicalManifestHash !== options.canonicalManifest.manifestHash
    || !isScientificV2Hash(value.registryAuthorityHash) || !isScientificV2Hash(value.capturesHash)
    || !isScientificV2Hash(value.requirementsHash)
    || !(value.operatorAuthorizationHash === null || isScientificV2Hash(value.operatorAuthorizationHash))
    || typeof value.capturedAt !== 'string') {
    scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH')
  }
  const priceSnapshot = value.priceSnapshot as ScientificV2PriceSnapshotV2
  if (value.priceSnapshotHash !== priceSnapshot?.snapshotHash || value.capturedAt !== priceSnapshot?.capturedAt
    || value.capturesHash !== priceSnapshot?.capturesHash || value.requirementsHash !== priceSnapshot?.requirementsHash
    || value.operatorAuthorizationHash !== priceSnapshot?.operatorAuthorizationHash
    || value.canonicalManifestHash !== priceSnapshot?.canonicalManifestHash) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH')
  }
  const verified = verifyScientificV2PriceSnapshot(priceSnapshot, options.canonicalManifest)
  const now = typeof options.now === 'function' ? options.now() : options.now
  const capturedAt = new Date(value.capturedAt as string)
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) || !Number.isInteger(options.maxAgeMs) || options.maxAgeMs < 0
    || !Number.isFinite(capturedAt.getTime()) || capturedAt > now || now.getTime() - capturedAt.getTime() > options.maxAgeMs) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_EXPIRED')
  }
  return verified
}

const REGISTRY_AUTHORITY_DOMAIN = 'paperbanana/scientific-v2/registry-authority/v1'
const MAX_REGISTRY_AUTHORITY_AGE_MS = 24 * 60 * 60 * 1000

type RegistryAuthority = {
  schemaVersion: 1
  codeSha: string
  capturedAt: string
  registryVersion: string
  registryBytesHash: string
  registry: Record<string, unknown>
  snapshotHash: string
  attestationHash: string
}

export interface ScientificV2OperatorPriceAuthorization {
  schemaVersion: 1
  kind: 'scientific-v2-operator-price-upper-bound-v1'
  codeSha: string
  canonicalManifestHash: string
  requirementsHash: string
  capturedAt: string
  confirmation: 'authorize-scientific-v2-conservative-upper-bound'
  entries: Array<{ requirementHash: string; unitCny: string }>
  authorizationHash: string
}

export function assertScientificV2RootSnapshotFileFacts(facts: {
  uid: number
  mode: number
  nlink: number
  size: number
  isFile: boolean
}) {
  if (!facts.isFile || facts.uid !== 0 || (facts.mode & 0o777) !== 0o600 || facts.nlink !== 1
    || !Number.isSafeInteger(facts.size) || facts.size < 1) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_SIGNER_FILE_INVALID')
  }
}

export function verifyScientificV2RegistryAuthority(value: unknown, input: { codeSha: string; secret: string; now: Date }) {
  assertExactScientificV2Keys(value, [
    'schemaVersion', 'codeSha', 'capturedAt', 'registryVersion', 'registryBytesHash',
    'registry', 'snapshotHash', 'attestationHash',
  ], 'SCIENTIFIC_V2_REGISTRY_AUTHORITY_INVALID')
  const authority = value as RegistryAuthority
  const capturedAt = new Date(authority.capturedAt)
  const { snapshotHash, attestationHash, ...base } = authority
  const expectedSnapshotHash = canonicalHash(base)
  const key = createHmac('sha256', Buffer.from(input.secret, 'utf8')).update(REGISTRY_AUTHORITY_DOMAIN).digest()
  const expectedAttestationHash = createHmac('sha256', key).update(expectedSnapshotHash).digest('hex')
  let registryBytes: Buffer
  try { registryBytes = Buffer.from(JSON.stringify(authority.registry)) } catch { scientificV2Error('SCIENTIFIC_V2_REGISTRY_AUTHORITY_INVALID') }
  if (authority.schemaVersion !== 1 || authority.codeSha !== input.codeSha
    || authority.registryVersion !== authority.registry?.registryVersion
    || authority.registryBytesHash !== createHash('sha256').update(registryBytes).digest('hex')
    || !safeHexEqual(snapshotHash, expectedSnapshotHash) || !safeHexEqual(attestationHash, expectedAttestationHash)
    || !Number.isFinite(capturedAt.getTime()) || capturedAt > input.now
    || input.now.getTime() - capturedAt.getTime() > MAX_REGISTRY_AUTHORITY_AGE_MS) {
    scientificV2Error('SCIENTIFIC_V2_REGISTRY_AUTHORITY_INVALID')
  }
  return authority
}

export async function createScientificV2OfficialSignedPriceSnapshot(input: {
  canonicalManifest: CanonicalManifest
  registryAuthority: unknown
  refreshReport: ScientificV2OfficialPriceRefreshReport
  loadCaptureBytes(capture: ScientificV2OfficialPriceCapture): Promise<Uint8Array>
  codeSha: string
  secret: string
  operatorAuthorization?: ScientificV2OperatorPriceAuthorization
  now?: () => Date
}): Promise<ScientificV2SignedPriceSnapshot> {
  if (!/^[a-f0-9]{40}$/.test(input.codeSha)) scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH')
  const key = secretBytes(input.secret)
  const now = (input.now || (() => new Date()))()
  if (!Number.isFinite(now.getTime())) scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_EXPIRED')
  const authority = verifyScientificV2RegistryAuthority(input.registryAuthority, { codeSha: input.codeSha, secret: input.secret, now })
  const registryHash = canonicalHash(authority.registry)
  const canonicalManifest = buildScientificV2CanonicalManifest({
    registryVersion: authority.registryVersion, registryHash, registry: authority.registry,
  })
  const capturedAt = new Date(input.refreshReport?.capturedAt)
  if (canonicalManifest.manifestHash !== input.canonicalManifest.manifestHash
    || input.refreshReport.capturedAt !== authority.capturedAt
    || !Number.isFinite(capturedAt.getTime()) || capturedAt > now
    || now.getTime() - capturedAt.getTime() > 24 * 60 * 60 * 1000) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH')
  }
  const extracted = await extractScientificV2OfficialPriceObservations({
    canonicalManifest, refreshReport: input.refreshReport, loadCaptureBytes: input.loadCaptureBytes,
  })
  const requirements = deriveScientificV2PriceRequirements(canonicalManifest)
  let operatorAuthorizationHash: string | null = null
  const observations = [...extracted.observations]
  if (extracted.unresolved.length > 0) {
    const authorization = input.operatorAuthorization
    if (!authorization) scientificV2Error('SCIENTIFIC_V2_PRICE_UNRESOLVED')
    assertExactScientificV2Keys(authorization, [
      'schemaVersion', 'kind', 'codeSha', 'canonicalManifestHash', 'requirementsHash', 'capturedAt',
      'confirmation', 'entries', 'authorizationHash',
    ], 'SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
    const { authorizationHash, ...authorizationBase } = authorization
    if (authorization.schemaVersion !== 1 || authorization.kind !== 'scientific-v2-operator-price-upper-bound-v1'
      || authorization.codeSha !== input.codeSha || authorization.canonicalManifestHash !== canonicalManifest.manifestHash
      || authorization.requirementsHash !== canonicalHash(requirements) || authorization.capturedAt !== input.refreshReport.capturedAt
      || authorization.confirmation !== 'authorize-scientific-v2-conservative-upper-bound'
      || authorizationHash !== canonicalHash(authorizationBase) || !Array.isArray(authorization.entries)
      || authorization.entries.length !== extracted.unresolved.length) {
      scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
    }
    const bounds = new Map<string, string>()
    for (const entry of authorization.entries) {
      assertExactScientificV2Keys(entry, ['requirementHash', 'unitCny'], 'SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
      if (!/^[a-f0-9]{64}$/.test(entry.requirementHash) || !/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(entry.unitCny)
        || Number(entry.unitCny) <= 0 || bounds.has(entry.requirementHash)) scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
      bounds.set(entry.requirementHash, entry.unitCny)
    }
    for (const unresolved of extracted.unresolved) {
      const requirement = requirements.find((item) => item.requirementHash === unresolved.requirementHash)
      const unitCny = bounds.get(unresolved.requirementHash)
      if (!requirement || !unitCny || Number(unitCny) < Number(scientificV2ConservativeUnitCny(requirement))) {
        scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
      }
      const output = requirement.imageSize === '1K' ? { outputWidth: 1280, outputHeight: 720 } : { outputWidth: 2048, outputHeight: 1152 }
      observations.push({
        provider: requirement.provider, modelId: requirement.modelId, operation: requirement.operation,
        imageSize: requirement.imageSize, billingRegion: 'operator-authorized-upper-bound', ...output,
        charges: [{
          billable: 'output_image', unit: 'request', rateDecimal: unitCny, quantityDecimal: '1',
          resolutionTier: 'operator_authorized_conservative_upper_bound',
        }],
        source: {
          url: 'https://paperbanana.asia/benchmark/scientific-v2/operator-authorized-conservative-upper-bound',
          mediaType: 'application/json', capturedAt: input.refreshReport.capturedAt, bytesSha256: authorizationHash,
        },
        openRouterEvidence: null, fxEvidence: null,
      })
    }
    operatorAuthorizationHash = authorizationHash
  } else if (input.operatorAuthorization !== undefined) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
  }
  const priceSnapshot = buildScientificV2PriceSnapshot({
    canonicalManifest, capturedAt: input.refreshReport.capturedAt, observations,
    capturesHash: input.refreshReport.capturesHash, operatorAuthorizationHash,
  })
  const base = {
    schemaVersion: 2 as const,
    kind: 'scientific-v2-authoritative-price-v2' as const,
    codeSha: input.codeSha,
    canonicalManifestHash: canonicalManifest.manifestHash,
    registryAuthorityHash: authority.snapshotHash,
    capturesHash: input.refreshReport.capturesHash,
    requirementsHash: priceSnapshot.requirementsHash,
    operatorAuthorizationHash,
    priceSnapshotHash: priceSnapshot.snapshotHash,
    capturedAt: priceSnapshot.capturedAt,
    priceSnapshot,
  }
  const envelopeHash = canonicalHash(base)
  return Object.freeze({
    ...base,
    envelopeHash,
    attestationHash: createHmac('sha256', key).update(envelopeHash).digest('hex'),
  })
}

export async function persistScientificV2OfficialSignedPriceSnapshot(input: Parameters<typeof createScientificV2OfficialSignedPriceSnapshot>[0] & {
  outputDirectory: string
}) {
  if (typeof process.getuid !== 'function' || process.getuid() !== 0) scientificV2Error('SCIENTIFIC_V2_PRICE_SIGNER_ROOT_REQUIRED')
  if (!isAbsolute(input.outputDirectory) || resolve(input.outputDirectory) !== input.outputDirectory) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_SIGNER_DIRECTORY_INVALID')
  }
  const directory = await lstat(input.outputDirectory).catch(() => null)
  if (!directory?.isDirectory() || directory.isSymbolicLink() || directory.uid !== 0 || (directory.mode & 0o777) !== 0o700) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_SIGNER_DIRECTORY_INVALID')
  }
  const signed = await createScientificV2OfficialSignedPriceSnapshot(input)
  const bytes = Buffer.from(JSON.stringify(signed))
  const fileSha256 = createHash('sha256').update(bytes).digest('hex')
  const path = join(input.outputDirectory, `${fileSha256}.json`)
  let handle
  try {
    handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    await handle.writeFile(bytes)
    await handle.sync()
    const facts = await handle.stat()
    assertScientificV2RootSnapshotFileFacts({
      uid: facts.uid, mode: facts.mode, nlink: facts.nlink, size: facts.size, isFile: facts.isFile(),
    })
    if (facts.size !== bytes.length) scientificV2Error('SCIENTIFIC_V2_PRICE_SIGNER_FILE_INVALID')
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') throw error
    const existingHandle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null)
    if (!existingHandle) scientificV2Error('SCIENTIFIC_V2_PRICE_SIGNER_COLLISION')
    try {
      const before = await existingHandle.stat()
      assertScientificV2RootSnapshotFileFacts({
        uid: before.uid, mode: before.mode, nlink: before.nlink, size: before.size, isFile: before.isFile(),
      })
      if (before.size !== bytes.length) scientificV2Error('SCIENTIFIC_V2_PRICE_SIGNER_COLLISION')
      const existing = await existingHandle.readFile()
      const after = await existingHandle.stat()
      const pathFacts = await lstat(path)
      if (!existing.equals(bytes) || pathFacts.isSymbolicLink()
        || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
        || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
        || before.dev !== pathFacts.dev || before.ino !== pathFacts.ino) {
        scientificV2Error('SCIENTIFIC_V2_PRICE_SIGNER_COLLISION')
      }
    } finally {
      await existingHandle.close()
    }
  } finally {
    await handle?.close()
  }
  const directoryHandle = await open(input.outputDirectory, constants.O_RDONLY | constants.O_NOFOLLOW)
  try { await directoryHandle.sync() } finally { await directoryHandle.close() }
  return Object.freeze({ path, fileSha256, snapshotHash: signed.priceSnapshotHash, capturedAt: signed.capturedAt })
}
