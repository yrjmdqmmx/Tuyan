const assert = require('node:assert/strict')

const {
  arkProbesForRoles,
  buildModelSubmission,
  nextArkVerificationBatch,
  providerDefaultRoutes,
  requiredCreateRouteRoles,
  requiredRefineRouteRoles,
  scopedApiKeysForRoles,
} = require('../miniprogram/utils/model-routing.js')

const registry = {
  routeContractVersion: 1,
  providers: {
    bailian: { defaults: { main: 'qwen-main', image: 'wan-image', vision: 'qwen-vision' } },
  },
}
const simple = providerDefaultRoutes('bailian', registry)
assert.deepEqual(simple, {
  main: { accessProvider: 'bailian', modelId: 'qwen-main' },
  image: { accessProvider: 'bailian', modelId: 'wan-image' },
  vision: { accessProvider: 'bailian', modelId: 'qwen-vision' },
})

const mixed = {
  main: { accessProvider: 'openai', modelId: 'gpt-main' },
  image: { accessProvider: 'ark', modelId: 'seedream-image' },
  vision: { accessProvider: 'gemini', modelId: 'gemini-vision' },
}
assert.deepEqual(buildModelSubmission({ configurationMode: 'advanced', modelRoutes: mixed, registry }), {
  configurationMode: 'advanced', provider: 'openai', modelRoutes: mixed,
  mainModelName: 'gpt-main', imageModelName: 'seedream-image', referenceVisionModelName: 'gemini-vision',
})
assert.throws(() => buildModelSubmission({ configurationMode: 'advanced', modelRoutes: mixed, registry: null }), /目录不可用/)

assert.deepEqual(requiredCreateRouteRoles({ outputFormat: 'svg', retrievalSetting: 'none' }, 0), ['main'])
assert.deepEqual(requiredCreateRouteRoles({ outputFormat: 'png', pipelineMode: 'vanilla', retrievalSetting: 'none', imageSize: '1K' }, 0), ['image'])
assert.deepEqual(requiredCreateRouteRoles({ outputFormat: 'png', pipelineMode: 'planner_critic', retrievalSetting: 'auto', imageSize: '2K' }, 1), ['main', 'image', 'vision'])
assert.deepEqual(requiredRefineRouteRoles({ refineMode: 'direct-edit' }), ['image'])
assert.deepEqual(requiredRefineRouteRoles({ refineMode: 'analyze-redraw' }), ['vision', 'image'])
assert.deepEqual(scopedApiKeysForRoles(mixed, ['image'], { openai: 'unused', ark: 'ark-key', gemini: 'unused' }), { ark: 'ark-key' })

const probes = arkProbesForRoles({ ...mixed, main: { accessProvider: 'ark', modelId: 'doubao-main' } }, ['main', 'image', 'vision'])
assert.deepEqual(probes, [{ role: 'main', modelId: 'doubao-main' }, { role: 'image', modelId: 'seedream-image' }])
assert.deepEqual(nextArkVerificationBatch(probes, {}, true), { probes: [probes[0]], confirmPaidImageProbe: false })
assert.deepEqual(nextArkVerificationBatch(probes, { 'main:doubao-main': 'verified' }, false), { probes: [], confirmPaidImageProbe: false })
assert.deepEqual(nextArkVerificationBatch(probes, { 'main:doubao-main': 'verified' }, true), { probes: [probes[1]], confirmPaidImageProbe: true })

console.log('model-routing.test.cjs passed')
