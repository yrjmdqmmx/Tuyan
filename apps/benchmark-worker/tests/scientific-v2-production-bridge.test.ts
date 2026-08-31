import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { chmod, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  buildScientificV2CanonicalManifest,
  buildScientificV2PriceSnapshot,
  canonicalHash,
  deriveScientificV2PriceRequirements,
} from '@paperbanana/benchmark-core'
import { executeScientificV2OperatorBundle } from '../src/scientific-v2-operator-runtime.js'
import { readScientificV2ProtectedArtifactReference } from '../src/scientific-v2-production-bridge.js'

const LOCK_NAME = '/run/lock/paperbanana-hk-production.lock'

test('fake prepare produces executable inspect and admin freeze/attest inputs from one signed snapshot', async () => {
  const secret = 'scientific-v2-fake-prepare-secret-32-bytes'
  const codeSha = 'a'.repeat(40)
  const createdAt = '2026-08-30T00:00:00.000Z'
  const registry = {
    registryVersion: 'fake-production-v1', routeContractVersion: 1,
    providers: { bailian: { models: [{
      id: 'bailian-scientific-production-test', canonicalModelId: 'test:scientific-model',
      label: 'Scientific production test', vendor: 'Test vendor', selectable: true, roles: ['image'],
      capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
    }] } },
  }
  const canonicalManifest = buildScientificV2CanonicalManifest({
    registryVersion: registry.registryVersion, registryHash: canonicalHash(registry), registry,
  })
  const priceSnapshot = buildScientificV2PriceSnapshot({
    canonicalManifest, capturedAt: createdAt,
    observations: deriveScientificV2PriceRequirements(canonicalManifest).map((requirement) => ({
      provider: requirement.provider, modelId: requirement.modelId, operation: requirement.operation,
      imageSize: requirement.imageSize, billingRegion: 'cn-beijing', outputWidth: 2048, outputHeight: 1152,
      charges: [{ billable: 'output_image', unit: 'image', rateDecimal: '1', quantityDecimal: '1', resolutionTier: requirement.imageSize }],
      source: { url: 'https://prices.example/scientific-v2', mediaType: 'text/html', capturedAt: createdAt, bytesSha256: 'b'.repeat(64) },
      openRouterEvidence: null, fxEvidence: null,
    })),
  })
  const authorityBase = {
    schemaVersion: 1,
    codeSha,
    capturedAt: createdAt,
    registryVersion: registry.registryVersion,
    registryBytesHash: createHash('sha256').update(JSON.stringify(registry)).digest('hex'),
    registry,
  }
  const registryAuthority = {
    ...authorityBase,
    snapshotHash: canonicalHash(authorityBase),
    attestationHash: 'a'.repeat(64),
  }
  const signedPriceBase = {
    schemaVersion: 2 as const, kind: 'scientific-v2-authoritative-price-v2' as const,
    codeSha, canonicalManifestHash: canonicalManifest.manifestHash, priceSnapshotHash: priceSnapshot.snapshotHash,
    capturedAt: createdAt, priceSnapshot,
  }
  const envelopeHash = canonicalHash(signedPriceBase)
  const priceKey = createHmac('sha256', secret).update('paperbanana/scientific-v2/price-attestation/v2').digest()
  const signedPriceSnapshot = {
    ...signedPriceBase, envelopeHash,
    attestationHash: createHmac('sha256', priceKey).update(envelopeHash).digest('hex'),
  }
  const freshContext = {
    env: { PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET: secret },
    productionDependencies: {} as never,
    now: () => new Date(createdAt),
  }
  const prepared = await executeScientificV2OperatorBundle({
    operation: 'prepare', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    input: { registryAuthority, signedPriceSnapshot, codeSha, createdAt },
  }, freshContext)
  assert.equal(prepared.providerCalls, 0)
  assert.match(String((prepared.manifest as any).manifestHash), /^[a-f0-9]{64}$/)
  assert.deepEqual(Object.keys(prepared.freezeInput as object).sort(), [
    'batchId', 'canonicalManifest', 'initialState', 'manifest', 'registryAuthority', 'registrySnapshot',
  ])
  assert.deepEqual(Object.keys(prepared.attestInput as object).sort(), ['batchId', 'manifestHash'])
  const inspected = await executeScientificV2OperatorBundle(prepared.inspectBundle as any)
  assert.equal(inspected.manifestHash, (prepared.manifest as any).manifestHash)
  await assert.rejects(executeScientificV2OperatorBundle({
    operation: 'prepare', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    input: { registryAuthority, signedPriceSnapshot: { ...signedPriceSnapshot, attestationHash: 'f'.repeat(64) }, codeSha, createdAt },
  }, freshContext), /SCIENTIFIC_V2_PRICE_ATTESTATION_INVALID/)
  await assert.rejects(executeScientificV2OperatorBundle({
    operation: 'prepare', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    input: { registryAuthority, signedPriceSnapshot, codeSha, createdAt: '2026-08-30T00:00:00.001Z' },
  }, freshContext), /SCIENTIFIC_V2_PRICE_ATTESTATION_BINDING_MISMATCH/)
  await assert.rejects(executeScientificV2OperatorBundle({
    operation: 'prepare', gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    input: { registryAuthority, signedPriceSnapshot, codeSha, createdAt },
  }, {
    ...freshContext,
    now: () => new Date('2026-08-31T00:00:00.001Z'),
  }), /SCIENTIFIC_V2_PRICE_ATTESTATION_EXPIRED/)
})

test('Codex artifact references read same protected bytes by hash without accepting arbitrary paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'scientific-v2-artifact-ref-'))
  try {
    await chmod(root, 0o700)
    const bytes = Buffer.from('scientific-v2-artifact-bytes')
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const fileName = `${sha256}.png`
    await writeFile(join(root, fileName), bytes, { mode: 0o600 })
    const result = await readScientificV2ProtectedArtifactReference({
      root,
      reference: { schemaVersion: 1, fileName, sha256, byteSize: bytes.length, format: 'png' },
    })
    assert.deepEqual(result, bytes)
    await assert.rejects(
      readScientificV2ProtectedArtifactReference({ root, reference: { schemaVersion: 1, fileName: '../escape.png', sha256, byteSize: bytes.length, format: 'png' } }),
      /SCIENTIFIC_V2_CODEX_ARTIFACT_REFERENCE_INVALID/,
    )
    await chmod(root, 0o755)
    await assert.rejects(
      readScientificV2ProtectedArtifactReference({ root, reference: { schemaVersion: 1, fileName, sha256, byteSize: bytes.length, format: 'png' } }),
      /SCIENTIFIC_V2_CODEX_ARTIFACT_ROOT_INVALID/,
    )
    await chmod(root, 0o700)
    const mismatchedHash = 'f'.repeat(64)
    await writeFile(join(root, `${mismatchedHash}.png`), bytes, { mode: 0o600 })
    await assert.rejects(
      readScientificV2ProtectedArtifactReference({ root, reference: { schemaVersion: 1, fileName: `${mismatchedHash}.png`, sha256: mismatchedHash, byteSize: bytes.length, format: 'png' } }),
      /SCIENTIFIC_V2_CODEX_ARTIFACT_HASH_MISMATCH/,
    )
    await symlink(join(root, fileName), join(root, `${sha256}.jpeg`))
    await assert.rejects(
      readScientificV2ProtectedArtifactReference({ root, reference: { schemaVersion: 1, fileName: `${sha256}.jpeg`, sha256, byteSize: bytes.length, format: 'jpeg' } }),
      /SCIENTIFIC_V2_CODEX_ARTIFACT_FILE_INVALID/,
    )
  } finally { await rm(root, { recursive: true, force: true }) }
})
