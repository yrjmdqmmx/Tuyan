import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'

import { canonicalHash } from '@paperbanana/benchmark-core'
import {
  verifyScientificV2SignedPriceSnapshot,
} from '../src/scientific-v2-price-attestation.js'
import { productionBatchFixture } from './scientific-v2-production-fixture.js'

const SECRET = 'price-attestation-secret-value-32-bytes-minimum'
const NOW = new Date('2026-08-30T00:30:00.000Z')

function signedFixture() {
  const fixture = productionBatchFixture()
  const base = {
    schemaVersion: 2 as const, kind: 'scientific-v2-authoritative-price-v2' as const,
    codeSha: fixture.manifest.codeSha, canonicalManifestHash: fixture.manifest.canonicalManifest.manifestHash,
    registryAuthorityHash: 'e'.repeat(64), capturesHash: fixture.manifest.priceSnapshot.capturesHash,
    requirementsHash: fixture.manifest.priceSnapshot.requirementsHash,
    operatorAuthorizationHash: null,
    priceSnapshotHash: fixture.manifest.priceSnapshot.snapshotHash, capturedAt: fixture.manifest.createdAt,
    priceSnapshot: structuredClone(fixture.manifest.priceSnapshot),
  }
  const envelopeHash = canonicalHash(base)
  const key = createHmac('sha256', SECRET).update('paperbanana/scientific-v2/price-attestation/v2').digest()
  return { fixture, signed: { ...base, envelopeHash, attestationHash: createHmac('sha256', key).update(envelopeHash).digest('hex') } }
}

test('signs and verifies an exact code/manifest/price envelope with a bounded age', () => {
  const { fixture, signed } = signedFixture()
  const verified = verifyScientificV2SignedPriceSnapshot(signed, {
    secret: SECRET,
    canonicalManifest: fixture.manifest.canonicalManifest,
    expectedCodeSha: fixture.manifest.codeSha,
    now: NOW,
    maxAgeMs: 60 * 60 * 1000,
  })
  assert.equal(verified.snapshotHash, fixture.manifest.priceSnapshot.snapshotHash)
  assert.doesNotMatch(JSON.stringify(signed), new RegExp(SECRET))
  const directReviewDomainSignature = createHmac('sha256', SECRET).update(signed.envelopeHash).digest('hex')
  const priceDomainKey = createHmac('sha256', SECRET).update('paperbanana/scientific-v2/price-attestation/v2').digest()
  assert.notEqual(signed.attestationHash, directReviewDomainSignature)
  assert.equal(signed.attestationHash, createHmac('sha256', priceDomainKey).update(signed.envelopeHash).digest('hex'))
})

test('rejects signature, code, manifest and freshness drift before prepare', () => {
  const { fixture, signed } = signedFixture()
  const options = {
    secret: SECRET,
    canonicalManifest: fixture.manifest.canonicalManifest,
    expectedCodeSha: fixture.manifest.codeSha,
    now: NOW,
    maxAgeMs: 60 * 60 * 1000,
  }
  assert.throws(() => verifyScientificV2SignedPriceSnapshot({ ...signed, attestationHash: '0'.repeat(64) }, options), /SCIENTIFIC_V2_PRICE_ATTESTATION_INVALID/)
  assert.throws(() => verifyScientificV2SignedPriceSnapshot(signed, { ...options, expectedCodeSha: 'b'.repeat(40) }), /SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH/)
  assert.throws(() => verifyScientificV2SignedPriceSnapshot(signed, { ...options, now: new Date('2026-08-30T02:00:00.001Z') }), /SCIENTIFIC_V2_PRICE_ATTESTATION_EXPIRED/)
})

test('production module exposes no signer for caller-built example.com observations', async () => {
  const fixture = productionBatchFixture()
  assert.ok(fixture.manifest.priceSnapshot.entries.some((entry) => entry.source.url.includes('prices.example')))
  const productionModule = await import('../src/scientific-v2-price-attestation.js')
  assert.equal(Object.hasOwn(productionModule, 'createScientificV2SignedPriceSnapshot'), false)
})
