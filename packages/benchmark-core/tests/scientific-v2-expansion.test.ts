import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildScientificV2CanonicalManifest,
  canonicalHash,
  deriveScientificV2ExecutionCanonicalManifest,
  type ScientificV2Expansion,
} from '../src/index.js'

const registry = { providers: { openrouter: { models: [
  'microsoft/mai-image-2.5', 'microsoft/mai-image-2.6',
].map((id) => ({ id, vendor: 'Microsoft', selectable: true, roles: ['image'],
  capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['1K'] },
})) } } }
const full = buildScientificV2CanonicalManifest({ registryVersion: 'expansion-test', registryHash: canonicalHash(registry), registry })
const expansion: ScientificV2Expansion = {
  schemaVersion: 1, kind: 'single_model_expansion',
  baseline: { releaseId: 'baseline-release', releaseHash: 'a'.repeat(64), batchId: 'baseline-batch', manifestHash: 'b'.repeat(64) },
  targetModelId: 'microsoft/mai-image-2.6',
}

test('execution projection preserves the complete canonical authority and scopes only the new model', () => {
  const before = JSON.stringify(full)
  assert.equal(deriveScientificV2ExecutionCanonicalManifest(full), full)
  const projection = deriveScientificV2ExecutionCanonicalManifest(full, expansion)
  assert.equal(projection.canonicalModelCount, 1)
  assert.equal(projection.rawRouteCount, 1)
  assert.deepEqual(projection.models, full.models.filter((model) => model.canonicalModelId === expansion.targetModelId))
  assert.equal(projection.registryHash, full.registryHash)
  assert.notEqual(projection.manifestHash, full.manifestHash)
  const { manifestHash, ...base } = projection
  assert.equal(manifestHash, canonicalHash(base))
  assert.equal(JSON.stringify(full), before)
  assert.equal(Object.isFrozen(projection.models[0]), true)
})

test('projection rejects ambiguous descriptors, missing targets, Codex and forged full manifests', () => {
  for (const malformed of [
    null, { ...expansion, targetModelIds: [expansion.targetModelId] },
    { ...expansion, schemaVersion: 2 }, { ...expansion, targetModelId: 'codex:gpt-image-2' },
    { ...expansion, baseline: { ...expansion.baseline, releaseHash: 'bad' } },
    { ...expansion, baseline: { ...expansion.baseline, extra: true } },
  ]) assert.throws(() => deriveScientificV2ExecutionCanonicalManifest(full, malformed as any), /EXPANSION_INVALID/)
  assert.throws(() => deriveScientificV2ExecutionCanonicalManifest(full, { ...expansion, targetModelId: 'missing-model' }), /EXPANSION_TARGET_INVALID/)
  assert.throws(() => deriveScientificV2ExecutionCanonicalManifest({ ...full, canonicalModelCount: 99 }, expansion), /CANONICAL_MANIFEST_HASH_MISMATCH/)
})

test('expansion descriptor rejects symbols and accessors before reading their values', () => {
  let accessed = false
  const accessor = { ...expansion }
  Object.defineProperty(accessor, 'targetModelId', { enumerable: true, get() { accessed = true; return expansion.targetModelId } })
  assert.throws(() => deriveScientificV2ExecutionCanonicalManifest(full, accessor), /EXPANSION_INVALID/)
  assert.equal(accessed, false)
  assert.throws(() => deriveScientificV2ExecutionCanonicalManifest(full, { ...expansion, [Symbol('hidden')]: true }), /EXPANSION_INVALID/)
})
