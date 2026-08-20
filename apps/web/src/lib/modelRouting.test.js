import assert from 'node:assert/strict'
import test from 'node:test'

import {
  arkProbesForRoles,
  buildModelSubmission,
  clearArkVerificationForRole,
  firstInvalidRequiredRoute,
  missingArkVerifications,
  nextArkVerificationBatch,
  providerDefaultRoutes,
  requiredCreateRouteRoles,
  requiredRefineRouteRoles,
  scopedApiKeysForRoles,
  uniqueProvidersForRoles,
} from './modelRouting.js'
import { PROVIDERS } from '../constants.js'

const fallbackProviders = {
  openai: { mainModel: 'fallback-main', imageModel: 'fallback-image', visionModel: 'fallback-vision' },
  bailian: { mainModel: 'fallback-qwen', imageModel: 'fallback-wan', visionModel: 'fallback-vision-qwen' },
}

const registry = {
  routeContractVersion: 1,
  providers: {
    openai: { defaults: { main: 'gpt-5.6-sol', image: 'gpt-image-2', vision: 'gpt-5.6-sol' } },
    bailian: { defaults: { main: 'qwen3.8-max', image: 'wan2.7-image-pro', vision: 'qwen3.7-plus' } },
    ark: { defaults: { main: 'doubao-text', image: 'doubao-image', vision: 'doubao-vision' } },
  },
}

test('simple provider defaults produce one complete non-mixed route state', () => {
  assert.deepEqual(providerDefaultRoutes('bailian', registry, fallbackProviders), {
    main: { accessProvider: 'bailian', modelId: 'qwen3.8-max' },
    image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
    vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
  })
})

test('safe bootstrap uses current official defaults and Google user-facing naming', () => {
  assert.equal(PROVIDERS.gemini.label, 'Google Gemini API')
  assert.deepEqual([
    PROVIDERS.gemini.mainModel, PROVIDERS.gemini.imageModel, PROVIDERS.gemini.visionModel,
  ], ['gemini-3.7-flash', 'gemini-3.1-flash-image', 'gemini-3.7-flash'])
  assert.deepEqual([
    PROVIDERS.openrouter.mainModel, PROVIDERS.openrouter.imageModel, PROVIDERS.openrouter.visionModel,
  ], ['openai/gpt-5.6-sol', 'sourceful/riverflow-v2.5-pro', 'google/gemini-3.7-flash'])
  assert.equal(PROVIDERS.bailian.visionModel, 'qwen3.7-plus')
  assert.deepEqual([
    PROVIDERS.ark.mainModel, PROVIDERS.ark.imageModel, PROVIDERS.ark.visionModel,
  ], ['doubao-seed-2-1-pro-260628', 'doubao-seedream-5-0-pro-260628', 'doubao-seed-2-1-pro-260628'])
  assert.match(PROVIDERS.ark.guideSteps.join(' '), /最低支持分辨率/)
  assert.doesNotMatch(PROVIDERS.ark.guideSteps.join(' '), /一次 1K 调用/)
})

test('advanced submission keeps mixed routes and legacy fields aligned to each role', () => {
  const routes = {
    main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
    vision: { accessProvider: 'ark', modelId: 'doubao-vision' },
  }
  assert.deepEqual(buildModelSubmission({ configurationMode: 'advanced', modelRoutes: routes, registry }), {
    configurationMode: 'advanced',
    provider: 'openai',
    modelRoutes: routes,
    mainModelName: 'gpt-5.6-sol',
    imageGenModelName: 'wan2.7-image-pro',
    referenceVisionModelName: 'doubao-vision',
  })
})

test('old backends use simple legacy fallback and fail closed for advanced routes', () => {
  const routes = providerDefaultRoutes('openai', null, fallbackProviders)
  assert.deepEqual(buildModelSubmission({ configurationMode: 'simple', modelRoutes: routes, registry: null }), {
    configurationMode: 'simple',
    provider: 'openai',
    mainModelName: 'fallback-main',
    imageGenModelName: 'fallback-image',
    referenceVisionModelName: 'fallback-vision',
  })
  assert.throws(
    () => buildModelSubmission({ configurationMode: 'advanced', modelRoutes: routes, registry: { routeContractVersion: 0 } }),
    /不支持专业模式/,
  )
})

test('reachable create roles mirror Core route secret selection', () => {
  assert.deepEqual(requiredCreateRouteRoles({ outputFormat: 'svg', retrievalSetting: 'none' }, 0), ['main'])
  assert.deepEqual(requiredCreateRouteRoles({ outputFormat: 'png', pipelineMode: 'vanilla', retrievalSetting: 'none', imageSize: '1K' }, 1), ['image'])
  assert.deepEqual(requiredCreateRouteRoles({ outputFormat: 'png', pipelineMode: 'planner_critic', retrievalSetting: 'auto', imageSize: '2K' }, 1), ['main', 'image', 'vision'])
  assert.deepEqual(requiredCreateRouteRoles({ taskName: 'plot', outputFormat: 'svg', pipelineMode: 'planner_critic', imageSize: '1K' }, 1), ['main', 'vision'])
})

test('reachable refine roles distinguish direct edit from analyze and redraw', () => {
  assert.deepEqual(requiredRefineRouteRoles({ refineMode: 'direct-edit' }), ['image'])
  assert.deepEqual(requiredRefineRouteRoles({ refineMode: 'analyze-redraw' }), ['vision', 'image'])
})

test('credential providers and payload keys cover only reachable deduplicated roles', () => {
  const routes = {
    main: { accessProvider: 'openai', modelId: 'main' },
    image: { accessProvider: 'ark', modelId: 'image' },
    vision: { accessProvider: 'openai', modelId: 'vision' },
  }
  assert.deepEqual(uniqueProvidersForRoles(routes, ['main', 'vision']), ['openai'])
  assert.deepEqual(scopedApiKeysForRoles(routes, ['image'], { openai: 'unused', ark: 'ark-key', bailian: 'unused' }), { ark: 'ark-key' })
})

test('Ark inference probes and submit gate cover only reachable exact selected routes', () => {
  const routes = {
    main: { accessProvider: 'ark', modelId: 'doubao-text' },
    image: { accessProvider: 'openai', modelId: 'gpt-image-2' },
    vision: { accessProvider: 'ark', modelId: 'doubao-vision' },
  }
  const probes = arkProbesForRoles(routes, ['main', 'image', 'vision'])
  assert.deepEqual(probes, [
    { role: 'main', modelId: 'doubao-text' },
    { role: 'vision', modelId: 'doubao-vision' },
  ])
  assert.deepEqual(missingArkVerifications(probes, {
    'main:doubao-text': 'verified',
    'vision:doubao-vision': 'failed',
  }), [{ role: 'vision', modelId: 'doubao-vision' }])
})

test('changing one route clears only that role Ark verification', () => {
  assert.deepEqual(clearArkVerificationForRole({
    'main:doubao-text': 'verified',
    'image:doubao-image': 'verified',
    'vision:doubao-vision': 'verified',
  }, 'image'), {
    'main:doubao-text': 'verified',
    'vision:doubao-vision': 'verified',
  })
})

test('Ark verification always finishes free roles before a separately confirmed image probe', () => {
  const probes = [
    { role: 'main', modelId: 'doubao-text' },
    { role: 'image', modelId: 'doubao-image' },
    { role: 'vision', modelId: 'doubao-vision' },
  ]
  assert.deepEqual(nextArkVerificationBatch(probes, {}, true), {
    probes: [probes[0], probes[2]],
    confirmPaidImageProbe: false,
  })
  assert.deepEqual(nextArkVerificationBatch(probes, {
    'main:doubao-text': 'verified',
    'vision:doubao-vision': 'verified',
  }, true), {
    probes: [probes[1]],
    confirmPaidImageProbe: true,
  })
})

test('explicit route validation rejects an invalid unreachable route', () => {
  const entries = {
    main: { id: 'main', roles: ['main'], selectable: true },
    image: { id: 'image', roles: ['vision'], selectable: false, selectionDisabledReason: '图像权益未开通' },
    vision: { id: 'vision', roles: ['vision'], selectable: true },
  }
  assert.deepEqual(firstInvalidRequiredRoute({ roles: ['main'], entries, outputFormat: 'svg' }), {
    setting: 'image-model',
    message: '图像权益未开通',
  })
})

test('unreachable image route still needs registry role capability but not the current output format', () => {
  const entries = {
    main: { id: 'main', roles: ['main'], selectable: true },
    image: { id: 'image', roles: ['image'], selectable: true, capabilities: { outputFormats: ['png'] } },
    vision: { id: 'vision', roles: ['vision'], selectable: true },
  }
  assert.equal(firstInvalidRequiredRoute({ roles: ['main'], entries, outputFormat: 'svg' }), null)
  assert.deepEqual(firstInvalidRequiredRoute({ roles: ['image'], entries, outputFormat: 'svg' }), {
    setting: 'image-model',
    message: '当前图像模型不支持 SVG 输出。',
  })
})
