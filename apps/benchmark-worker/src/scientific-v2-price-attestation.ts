import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  canonicalHash,
  verifyScientificV2PriceSnapshot,
  type ScientificV2PriceSnapshotV2,
} from '@paperbanana/benchmark-core'

import { assertExactScientificV2Keys, isScientificV2Hash, scientificV2Error } from './scientific-v2-common.js'

type CanonicalManifest = Parameters<typeof verifyScientificV2PriceSnapshot>[1] & { manifestHash: string }
const PRICE_ATTESTATION_DOMAIN = 'paperbanana/scientific-v2/price-attestation/v2'

export interface ScientificV2SignedPriceSnapshot {
  schemaVersion: 2
  kind: 'scientific-v2-authoritative-price-v2'
  codeSha: string
  canonicalManifestHash: string
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
    'schemaVersion', 'kind', 'codeSha', 'canonicalManifestHash', 'priceSnapshotHash', 'capturedAt',
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
    || typeof value.capturedAt !== 'string') {
    scientificV2Error('SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH')
  }
  const priceSnapshot = value.priceSnapshot as ScientificV2PriceSnapshotV2
  if (value.priceSnapshotHash !== priceSnapshot?.snapshotHash || value.capturedAt !== priceSnapshot?.capturedAt) {
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
