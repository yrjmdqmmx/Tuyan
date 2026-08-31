import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'

import {
  createScientificV2RegistryAuthority,
  verifyScientificV2RegistryAuthority,
} from '../src/scientific-v2-production-bridge.js'
import { scientificV2FailureReason } from '../src/scientific-v2-repository.js'

const codeSha = 'a'.repeat(40)
const secret = 'scientific-v2-registry-authority-secret'
const capturedAt = '2026-08-31T08:00:00.000Z'
const registry = {
  code: 0,
  registryVersion: '2026-08-21.v9',
  routeContractVersion: 1,
  providers: {
    bailian: { models: [{ id: 'wan2.7-image-pro', selectable: true }] },
    ark: { models: [{ id: 'doubao-seedream-5-0-pro-260628', selectable: true }] },
    openrouter: { models: [{ id: 'vendor/image', selectable: true }] },
    gemini: { models: [{ id: 'must-not-enter-scientific-attestation' }] },
  },
}

test('registry authority captures server-loaded bytes and binds deployed SHA, current time and HMAC', async () => {
  let loads = 0
  const authority = await createScientificV2RegistryAuthority({
    codeSha,
    secret,
    now: () => new Date(capturedAt),
    async loadCurrentRegistry() { loads += 1; return registry },
  })
  assert.equal(loads, 1)
  assert.equal(authority.schemaVersion, 1)
  assert.equal(authority.codeSha, codeSha)
  assert.equal(authority.capturedAt, capturedAt)
  assert.deepEqual(authority.registry, {
    registryVersion: registry.registryVersion,
    routeContractVersion: 1,
    providers: { bailian: registry.providers.bailian, ark: registry.providers.ark, openrouter: registry.providers.openrouter },
  })
  assert.match(authority.registryBytesHash, /^[a-f0-9]{64}$/)
  assert.match(authority.snapshotHash, /^[a-f0-9]{64}$/)
  assert.match(authority.attestationHash, /^[a-f0-9]{64}$/)
  assert.deepEqual(verifyScientificV2RegistryAuthority(authority, {
    expectedCodeSha: codeSha,
    secret,
    now: () => new Date('2026-08-31T08:04:59.999Z'),
  }), authority)
  const crossDomain = { ...authority, attestationHash: createHmac('sha256', secret).update(authority.snapshotHash).digest('hex') }
  assert.throws(() => verifyScientificV2RegistryAuthority(crossDomain, {
    expectedCodeSha: codeSha, secret, now: () => new Date(capturedAt),
  }), /SCIENTIFIC_V2_REGISTRY_AUTHORITY_ATTESTATION_INVALID/)
})

test('registry authority rejects a missing or unavailable scientific provider', async () => {
  for (const candidate of [
    { ...registry, providers: { ...registry.providers, ark: undefined } },
    { ...registry, unavailableProviders: { openrouter: 'unavailable' } },
    { ...registry, unavailableProviders: ['ark'] },
    { ...registry, unavailableProviders: ['gemini', 7] },
  ]) {
    await assert.rejects(createScientificV2RegistryAuthority({
      codeSha, secret, now: () => new Date(capturedAt), async loadCurrentRegistry() { return candidate },
    }), /SCIENTIFIC_V2_REGISTRY_AUTHORITY_REGISTRY_INVALID/)
  }
})

test('registry authority schema rejects symbol-key smuggling with a controlled error', async () => {
  const authority = await createScientificV2RegistryAuthority({
    codeSha, secret, now: () => new Date(capturedAt), async loadCurrentRegistry() { return registry },
  })
  Object.defineProperty(authority.registry, Symbol('hidden'), { value: true, enumerable: true })
  assert.throws(() => verifyScientificV2RegistryAuthority(authority, {
    expectedCodeSha: codeSha, secret, now: () => new Date(capturedAt),
  }), /SCIENTIFIC_V2_REGISTRY_AUTHORITY_SCHEMA_INVALID/)
})

test('registry authority rejects stale replay, code drift, registry-byte drift and HMAC drift', async () => {
  const authority = await createScientificV2RegistryAuthority({
    codeSha,
    secret,
    now: () => new Date(capturedAt),
    async loadCurrentRegistry() { return registry },
  })
  const cases: Array<[string, unknown, Record<string, unknown>]> = [
    ['stale', authority, { expectedCodeSha: codeSha, secret, now: () => new Date('2026-08-31T08:05:00.001Z') }],
    ['code', authority, { expectedCodeSha: 'b'.repeat(40), secret, now: () => new Date(capturedAt) }],
    ['bytes', { ...authority, registry: { ...registry, registryVersion: 'old' } }, { expectedCodeSha: codeSha, secret, now: () => new Date(capturedAt) }],
    ['hmac', { ...authority, attestationHash: 'f'.repeat(64) }, { expectedCodeSha: codeSha, secret, now: () => new Date(capturedAt) }],
  ]
  for (const [name, value, options] of cases) {
    assert.throws(() => verifyScientificV2RegistryAuthority(value, options as never), /SCIENTIFIC_V2_REGISTRY_AUTHORITY_/, name)
  }
})

test('public V2 failure reasons keep generation capability gaps distinct from exhausted attempts', () => {
  assert.equal(scientificV2FailureReason({ status: 'unsupported', operation: 'generation', routeStatus: 'capability_unsupported' }), 'capability_unsupported')
  assert.equal(scientificV2FailureReason({ status: 'unsupported', operation: 'edit', routeStatus: 'unsupported' }), 'direct_edit_route_unavailable')
  assert.equal(scientificV2FailureReason({ status: 'failed', operation: 'generation', routeStatus: 'supported' }), 'confirmed_attempts_exhausted')
})
