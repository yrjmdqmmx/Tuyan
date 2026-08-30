import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScientificV2CanonicalManifest } from '../src/index.js'

function image(
  id: string,
  canonicalModelId: string,
  editMode: 'direct-edit' | 'analyze-redraw' = 'direct-edit',
  resolutions: string[] = ['2K'],
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    canonicalModelId,
    label: id,
    vendor: 'Acme',
    selectable: true,
    roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode: editMode, resolutions },
    ...overrides,
  }
}

function manifest(models: ReturnType<typeof image>[]) {
  return buildScientificV2CanonicalManifest({
    registryVersion: 'route-collision-v1',
    registryHash: 'a'.repeat(64),
    registry: { providers: { ark: { models } } },
  })
}

test('uppercase execution IDs are rejected instead of silently lowercased', () => {
  assert.throws(() => manifest([
    image('CaseSensitive/Model-X', 'case-sensitive-model'),
  ]), /INVALID_SCIENTIFIC_MODEL_ID/)
})

test('case aliases collide deterministically in either registry order', () => {
  const upper = image('Same-Route', 'shared-model')
  const lower = image('same-route', 'shared-model')
  for (const models of [[upper, lower], [lower, upper]]) {
    assert.throws(() => manifest(models), /SCIENTIFIC_ROUTE_COLLISION/)
  }
})

test('exact physical route metadata conflicts reject in either order', () => {
  const analyze1k = image('same-route', 'shared-model', 'analyze-redraw', ['1K'])
  const direct2k = image('same-route', 'shared-model', 'direct-edit', ['2K'])
  for (const models of [[analyze1k, direct2k], [direct2k, analyze1k]]) {
    assert.throws(() => manifest(models), /SCIENTIFIC_ROUTE_COLLISION/)
  }

  const otherCanonical = image('same-route', 'other-model', 'analyze-redraw', ['1K'])
  for (const models of [[analyze1k, otherCanonical], [otherCanonical, analyze1k]]) {
    assert.throws(() => manifest(models), /SCIENTIFIC_ROUTE_COLLISION/)
  }
})

test('identical exact duplicates are idempotent and order independent', () => {
  const first = image('same-route', 'shared-model', 'direct-edit', ['2K', '1K', '2K'])
  const duplicate = image('same-route', 'SHARED-MODEL', 'direct-edit', ['1K', '2K'])
  const forward = manifest([first, duplicate])
  const reverse = manifest([duplicate, first])
  assert.equal(forward.manifestHash, reverse.manifestHash)
  assert.deepEqual(forward, reverse)
  const shared = forward.models.find((model) => model.canonicalModelId === 'shared-model')!
  assert.equal(shared.routes.length, 1)
  assert.equal(shared.generationRoute?.modelId, 'same-route')
  assert.equal(shared.editRoute?.modelId, 'same-route')
  assert.deepEqual(shared.routes[0].resolutions, ['1K', '2K'])
})

test('representative production execution IDs remain exact and lowercase', () => {
  const production = buildScientificV2CanonicalManifest({
    registryVersion: 'production-lowercase-v1',
    registryHash: 'b'.repeat(64),
    registry: { providers: {
      bailian: { models: [image('wan2.7-image-pro', 'wan2.7-image-pro')] },
      ark: { models: [image('doubao-seedream-5-0-260128', 'seedream-5.0')] },
      openrouter: { models: [image('sourceful/riverflow-v2.5-pro', 'riverflow-v2.5-pro')] },
    } },
  })
  const routeIds = production.models.flatMap((model) => model.routes.map((route) => route.modelId))
  for (const expected of ['wan2.7-image-pro', 'doubao-seedream-5-0-260128', 'sourceful/riverflow-v2.5-pro']) {
    assert.ok(routeIds.includes(expected))
  }
})
