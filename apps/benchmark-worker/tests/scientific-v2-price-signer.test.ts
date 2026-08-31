import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { chmod, link, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { PB_SCIENTIFIC_FIGURE_V2, buildScientificV2CanonicalManifest, canonicalHash, deriveScientificV2PriceRequirements } from '@paperbanana/benchmark-core'
import {
  createScientificV2OfficialSignedPriceSnapshot,
  assertScientificV2RootSnapshotFileFacts,
  persistScientificV2OfficialSignedPriceSnapshot,
  verifyScientificV2SignedPriceSnapshot,
} from '../src/scientific-v2-price-attestation.js'
import {
  refreshScientificV2OfficialPriceSources,
  refreshScientificV2OfficialPriceSourcesFromAuthority,
} from '../src/scientific-v2-price-refresh.js'
import { buildScientificV2Batch } from '../src/scientific-v2-manifest.js'

const SECRET = 'official-price-signer-secret-value-32-bytes'
const CODE_SHA = 'a'.repeat(40)
const CAPTURED_AT = '2026-08-31T05:00:00.000Z'

async function fixture() {
  const registry = {
    registryVersion: 'official-price-authority-v1', routeContractVersion: 1,
    providers: { ark: { models: [{
      id: 'doubao-seedream-5-0-pro-260628', canonicalModelId: 'seedream-5.0-pro', selectable: true, roles: ['image'],
      capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
    }] } },
  }
  const canonicalManifest = buildScientificV2CanonicalManifest({
    registryVersion: registry.registryVersion, registryHash: canonicalHash(registry), registry,
  })
  const authorityBase = {
    schemaVersion: 1 as const, codeSha: CODE_SHA, capturedAt: CAPTURED_AT,
    registryVersion: registry.registryVersion,
    registryBytesHash: createHash('sha256').update(JSON.stringify(registry)).digest('hex'),
    registry,
  }
  const snapshotHash = canonicalHash(authorityBase)
  const registryKey = createHmac('sha256', SECRET).update('paperbanana/scientific-v2/registry-authority/v1').digest()
  const registryAuthority = {
    ...authorityBase, snapshotHash,
    attestationHash: createHmac('sha256', registryKey).update(snapshotHash).digest('hex'),
  }
  const rawByHash = new Map<string, Buffer>()
  const refreshReport = await refreshScientificV2OfficialPriceSources({
    canonicalManifest, capturedAt: CAPTURED_AT,
    persistCapture: async (capture, bytes) => { rawByHash.set(capture.bytesSha256, Buffer.from(bytes)) },
    fetchImpl: async (input) => {
      assert.equal(String(input), 'https://docs.volcengine.com/docs/82379/1544106?lang=zh')
      return new Response(`doubao-seedream-5-0-pro 首张输入图片免费，第2张起 0.02元；输出不超过261万像素 0.30元/张，超过261万像素 0.60元/张。
        doubao-seedream-5-0-lite 0.22元/张；doubao-seedream-4-5 0.25元/张；doubao-seedream-4-0 0.20元/张。`, {
        status: 200, headers: { 'content-type': 'text/html' },
      })
    },
  })
  return { canonicalManifest, registryAuthority, refreshReport, rawByHash }
}

test('official signer binds server authority, captures and requirements without exposing the master secret', async () => {
  const input = await fixture()
  const signed = await createScientificV2OfficialSignedPriceSnapshot({
    ...input, codeSha: CODE_SHA, secret: SECRET, now: () => new Date(CAPTURED_AT),
    loadCaptureBytes: async (capture) => input.rawByHash.get(capture.bytesSha256)!,
  })
  assert.equal(signed.registryAuthorityHash, input.registryAuthority.snapshotHash)
  assert.equal(signed.capturesHash, input.refreshReport.capturesHash)
  assert.equal(signed.requirementsHash, signed.priceSnapshot.requirementsHash)
  assert.equal(signed.priceSnapshot.canonicalManifestHash, input.canonicalManifest.manifestHash)
  assert.equal(signed.priceSnapshot.capturesHash, input.refreshReport.capturesHash)
  assert.equal(JSON.stringify(signed).includes(SECRET), false)
  assert.equal(verifyScientificV2SignedPriceSnapshot(signed, {
    secret: SECRET, canonicalManifest: input.canonicalManifest, expectedCodeSha: CODE_SHA,
    now: new Date(CAPTURED_AT), maxAgeMs: 24 * 60 * 60 * 1000,
  }).snapshotHash, signed.priceSnapshotHash)

  const capture = input.refreshReport.captures[0]
  input.rawByHash.set(capture.bytesSha256, Buffer.from('tampered'))
  await assert.rejects(createScientificV2OfficialSignedPriceSnapshot({
    ...input, codeSha: CODE_SHA, secret: SECRET, now: () => new Date(CAPTURED_AT),
    loadCaptureBytes: async (item) => input.rawByHash.get(item.bytesSha256)!,
  }), /SCIENTIFIC_V2_PRICE_CAPTURE_HASH_MISMATCH/)
})

test('authority timestamp drives the real refresh orchestration and its report signs without time drift', async () => {
  const input = await fixture()
  const rawByHash = new Map<string, Buffer>()
  const refreshReport = await refreshScientificV2OfficialPriceSourcesFromAuthority({
    canonicalManifest: input.canonicalManifest,
    registryAuthority: input.registryAuthority,
    persistCapture: async (capture, bytes) => { rawByHash.set(capture.bytesSha256, Buffer.from(bytes)) },
    fetchImpl: async () => new Response(`doubao-seedream-5-0-pro 首张输入图片免费，第2张起 0.02元；输出不超过261万像素 0.30元/张，超过261万像素 0.60元/张。
      doubao-seedream-5-0-lite 0.22元/张；doubao-seedream-4-5 0.25元/张；doubao-seedream-4-0 0.20元/张。`, {
      status: 200, headers: { 'content-type': 'text/html' },
    }),
  })
  assert.equal(refreshReport.capturedAt, input.registryAuthority.capturedAt)
  assert.ok(refreshReport.captures.every((capture) => capture.capturedAt === input.registryAuthority.capturedAt))
  const signed = await createScientificV2OfficialSignedPriceSnapshot({
    canonicalManifest: input.canonicalManifest,
    registryAuthority: input.registryAuthority,
    refreshReport,
    codeSha: CODE_SHA,
    secret: SECRET,
    now: () => new Date(CAPTURED_AT),
    loadCaptureBytes: async (capture) => rawByHash.get(capture.bytesSha256)!,
  })
  assert.equal(signed.capturedAt, input.registryAuthority.capturedAt)
})

test('authority and refresh stay signable through 24 hours but fail closed beyond the shared window', async () => {
  const input = await fixture()
  const signAt = (now: string) => createScientificV2OfficialSignedPriceSnapshot({
    ...input, codeSha: CODE_SHA, secret: SECRET, now: () => new Date(now),
    loadCaptureBytes: async (capture) => input.rawByHash.get(capture.bytesSha256)!,
  })
  await assert.doesNotReject(signAt('2026-08-31T05:06:00.000Z'))
  await assert.doesNotReject(signAt('2026-09-01T05:00:00.000Z'))
  await assert.rejects(signAt('2026-09-01T05:00:00.001Z'), /SCIENTIFIC_V2_REGISTRY_AUTHORITY_INVALID/)
})

test('root entry writes one content-addressed 0600 snapshot and never accepts secret through argv', async () => {
  const input = await fixture()
  const outputDirectory = await mkdtemp(join(tmpdir(), 'scientific-v2-price-signer-'))
  await chmod(outputDirectory, 0o700)
  const originalArgv = process.argv
  try {
    process.argv = ['node', 'scientific-v2-price-signer']
    if (process.getuid?.() !== 0) {
      await assert.rejects(persistScientificV2OfficialSignedPriceSnapshot({
        ...input, codeSha: CODE_SHA, secret: SECRET, outputDirectory, now: () => new Date(CAPTURED_AT),
        loadCaptureBytes: async (capture) => input.rawByHash.get(capture.bytesSha256)!,
      }), /SCIENTIFIC_V2_PRICE_SIGNER_ROOT_REQUIRED/)
      return
    }
    const result = await persistScientificV2OfficialSignedPriceSnapshot({
      ...input, codeSha: CODE_SHA, secret: SECRET, outputDirectory, now: () => new Date(CAPTURED_AT),
      loadCaptureBytes: async (capture) => input.rawByHash.get(capture.bytesSha256)!,
    })
    assert.equal(result.path, join(outputDirectory, `${result.fileSha256}.json`))
    const bytes = await readFile(result.path)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), result.fileSha256)
    assert.equal((await stat(result.path)).mode & 0o777, 0o600)
    assert.equal(bytes.includes(Buffer.from(SECRET)), false)
    assert.deepEqual(process.argv, ['node', 'scientific-v2-price-signer'])
    await link(result.path, `${result.path}.hardlink`)
    await assert.rejects(persistScientificV2OfficialSignedPriceSnapshot({
      ...input, codeSha: CODE_SHA, secret: SECRET, outputDirectory, now: () => new Date(CAPTURED_AT),
      loadCaptureBytes: async (capture) => input.rawByHash.get(capture.bytesSha256)!,
    }), /SCIENTIFIC_V2_PRICE_SIGNER_FILE_INVALID/)
  } finally {
    process.argv = originalArgv
    await rm(outputDirectory, { recursive: true, force: true })
  }
})

test('root sink file facts require uid 0 mode 0600 and one link', () => {
  assert.doesNotThrow(() => assertScientificV2RootSnapshotFileFacts({ uid: 0, mode: 0o100600, nlink: 1, size: 100, isFile: true }))
  for (const facts of [
    { uid: 501, mode: 0o100600, nlink: 1, size: 100, isFile: true },
    { uid: 0, mode: 0o100644, nlink: 1, size: 100, isFile: true },
    { uid: 0, mode: 0o100600, nlink: 2, size: 100, isFile: true },
    { uid: 0, mode: 0o100600, nlink: 1, size: 100, isFile: false },
  ]) assert.throws(() => assertScientificV2RootSnapshotFileFacts(facts), /SCIENTIFIC_V2_PRICE_SIGNER_FILE_INVALID/)
})

test('operator-authorized conservative upper bounds close unresolved requirements and bind the batch manifest', async () => {
  const registry = {
    registryVersion: 'operator-upper-bound-v1', routeContractVersion: 1,
    providers: { bailian: { models: [{
      id: 'wan2.7-image', canonicalModelId: 'wan2.7-image', selectable: true, roles: ['image'],
      capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
    }] } },
  }
  const canonicalManifest = buildScientificV2CanonicalManifest({ registryVersion: registry.registryVersion, registryHash: canonicalHash(registry), registry })
  const authorityBase = {
    schemaVersion: 1 as const, codeSha: CODE_SHA, capturedAt: CAPTURED_AT, registryVersion: registry.registryVersion,
    registryBytesHash: createHash('sha256').update(JSON.stringify(registry)).digest('hex'), registry,
  }
  const authorityHash = canonicalHash(authorityBase)
  const registryKey = createHmac('sha256', SECRET).update('paperbanana/scientific-v2/registry-authority/v1').digest()
  const registryAuthority = { ...authorityBase, snapshotHash: authorityHash, attestationHash: createHmac('sha256', registryKey).update(authorityHash).digest('hex') }
  const rawByHash = new Map<string, Buffer>()
  const refreshReport = await refreshScientificV2OfficialPriceSources({
    canonicalManifest, capturedAt: CAPTURED_AT,
    persistCapture: async (capture, bytes) => { rawByHash.set(capture.bytesSha256, Buffer.from(bytes)) },
    fetchImpl: async () => new Response('official pricing bytes without a deterministic row', { status: 200, headers: { 'content-type': 'text/html' } }),
  })
  const common = {
    canonicalManifest, registryAuthority, refreshReport, codeSha: CODE_SHA, secret: SECRET,
    now: () => new Date(CAPTURED_AT), loadCaptureBytes: async (capture: { bytesSha256: string }) => rawByHash.get(capture.bytesSha256)!,
  }
  await assert.rejects(createScientificV2OfficialSignedPriceSnapshot(common), /SCIENTIFIC_V2_PRICE_UNRESOLVED/)
  const requirements = deriveScientificV2PriceRequirements(canonicalManifest)
  const authorizationBase = {
    schemaVersion: 1 as const,
    kind: 'scientific-v2-operator-price-upper-bound-v1' as const,
    codeSha: CODE_SHA,
    canonicalManifestHash: canonicalManifest.manifestHash,
    requirementsHash: canonicalHash(requirements),
    capturedAt: CAPTURED_AT,
    confirmation: 'authorize-scientific-v2-conservative-upper-bound' as const,
    entries: requirements.map((requirement) => ({ requirementHash: requirement.requirementHash, unitCny: requirement.operation === 'generation' ? '0.50' : '0.50' })),
  }
  const operatorAuthorization = { ...authorizationBase, authorizationHash: canonicalHash(authorizationBase) }
  const signed = await createScientificV2OfficialSignedPriceSnapshot({ ...common, operatorAuthorization })
  assert.equal(signed.operatorAuthorizationHash, operatorAuthorization.authorizationHash)
  assert.equal(signed.priceSnapshot.operatorAuthorizationHash, operatorAuthorization.authorizationHash)
  assert.ok(signed.priceSnapshot.entries.every((entry) => entry.charges[0].resolutionTier === 'operator_authorized_conservative_upper_bound'))
  const registryBase = { registryVersion: canonicalManifest.registryVersion, registryHash: canonicalHash(registry), registry }
  const registrySnapshot = { ...registryBase, snapshotHash: canonicalHash(registryBase) }
  const batch = buildScientificV2Batch({
    canonicalManifest, registrySnapshot, suite: PB_SCIENTIFIC_FIGURE_V2, codeSha: CODE_SHA,
    priceSnapshot: signed.priceSnapshot, createdAt: CAPTURED_AT, lockName: '/run/lock/paperbanana-hk-production.lock',
  })
  assert.equal(batch.manifest.priceOperatorAuthorizationHash, operatorAuthorization.authorizationHash)
  assert.equal(Object.isFrozen(batch.manifest), true)
})
