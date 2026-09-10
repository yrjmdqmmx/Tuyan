const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildOptimizationRequest, validateOptimizationResult } = require('../miniprogram/utils/input-optimization.js')
const { loadComponent } = require('./helpers/component.cjs')
const registry = { inputOptimizationContractVersion: 1, inputOptimizationTargets: ['methodContent', 'caption', 'negativePrompt', 'editInstruction'], providerRegionContractVersion: 1, providers: { minimax: { models: [{ id: 'text', selectable: true, roles: ['main'], regions: ['cn', 'global'] }] } } }
const input = { target: 'methodContent', inputs: { methodContent: 'A controlled method', caption: 'Figure 1', negativePrompt: '' }, mainRoute: { accessProvider: 'minimax', modelId: 'text' }, providerRegions: { minimax: 'cn' }, apiKeys: { minimax: 'global-test', 'minimax:cn': 'cn-test' }, registry }

test('optimization uses only the selected main route and region key; refine sends no generation context', () => {
  const request = buildOptimizationRequest(input)
  assert.equal(request.apiKey, 'cn-test')
  assert.equal(request.apiKeys, undefined)
  const refined = buildOptimizationRequest({ ...input, target: 'editInstruction', inputs: { ...input.inputs, editInstruction: 'Make labels larger' } })
  assert.deepEqual(refined.inputs, { editInstruction: 'Make labels larger' })
  assert.equal(refined.providerRegions.minimax, 'cn')
})
test('unsupported optimization, invalid main role, missing key and invalid results fail before writes', () => {
  assert.throws(() => buildOptimizationRequest({ ...input, registry: { ...registry, inputOptimizationContractVersion: 0 } }))
  assert.throws(() => buildOptimizationRequest({ ...input, apiKeys: {} }))
  assert.throws(() => buildOptimizationRequest({ ...input, mainRoute: { ...input.mainRoute, modelId: 'unknown' } }))
  assert.throws(() => buildOptimizationRequest({ ...input, inputs: { ...input.inputs, methodContent: '' } }))
  assert.throws(() => validateOptimizationResult('caption', 'original', { target: 'methodContent', optimizedText: 'wrong' }))
  assert.throws(() => validateOptimizationResult('caption', 'original', { target: 'caption', optimizedText: 'original' }))
  assert.throws(() => validateOptimizationResult('caption', 'original', { target: 'caption', optimizedText: 'x'.repeat(1001) }))
})

function optimizer(requestJson) {
  const loaded = loadComponent('components/input-optimizer/input-optimizer.js', {
    '../../utils/api': { requestJson, formatError: e => e.message },
    '../../utils/api-keys': { getApiKeys: () => input.apiKeys },
    '../../utils/model-registry-store': { getModelRegistryState: () => ({ registry }), subscribeModelRegistry: () => () => {} },
  })
  Object.assign(loaded.instance.properties, input, { target: 'methodContent', disabled: false })
  return loaded
}
test('optimization previews first, applies explicitly, restores once and rejects changes since request', async () => {
  const { instance, events, patches } = optimizer(async () => ({ target: 'methodContent', optimizedText: 'A better controlled method' }))
  await instance.optimize()
  assert.equal(events.filter(e => e.name === 'apply').length, 0)
  assert.equal(instance.data.candidate, 'A better controlled method')
  assert.ok(!JSON.stringify(patches).includes('cn-test'))
  instance.apply()
  assert.equal(events.find(e => e.name === 'apply').detail.value, 'A better controlled method')
  instance.properties.inputs = { ...input.inputs, methodContent: 'A better controlled method' }
  instance.restore()
  assert.equal(events.filter(e => e.name === 'apply').at(-1).detail.value, input.inputs.methodContent)
  assert.equal(instance.data.hasUndo, false)
  instance.properties.inputs = { ...input.inputs }
  await instance.optimize()
  instance.properties.inputs = { ...input.inputs, methodContent: 'manual edit' }
  instance.apply()
  assert.match(instance.data.error, /已修改/)
})
test('cancelled optimization cannot overwrite a later field value', async () => {
  let finish
  const { instance, events } = optimizer(() => new Promise(r => { finish = r }))
  const pending = instance.optimize(); instance.cancel()
  finish({ target: 'methodContent', optimizedText: 'late result' }); await pending
  assert.equal(instance.data.open, false)
  assert.equal(instance.data.candidate, '')
  assert.equal(events.filter(e => e.name === 'apply').length, 0)
})

test('WeChat serializes absent optional Object bindings as null; optimization keeps the default region', async () => {
  const { instance } = optimizer(async () => ({ target: 'methodContent', optimizedText: 'A better controlled method' }))
  instance.properties.providerRegions = null
  await instance.optimize()
  assert.equal(instance.data.error, '')
  assert.ok(instance.data.candidate)
})


test('all four TokenDance optimizer targets require connection, omit keys and retain preview/apply/undo', async () => {
  const td = { ...registry, providers: { tokendance: { models: [{ id: 'qwen3.8-flash', roles: ['main'], selectable: true }] } } }
  for (const target of registry.inputOptimizationTargets) {
    const args = { ...input, target, inputs: { methodContent: 'original method', caption: 'original caption', negativePrompt: 'original exclusion', editInstruction: 'original edit' }, mainRoute: { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' }, providerRegions: {}, apiKeys: { tokendance: 'must-not-leak' }, registry: td }
    assert.throws(() => buildOptimizationRequest(args), /连接观猹/)
    const payload = buildOptimizationRequest({ ...args, tokenDanceConnected: true })
    assert.equal(Object.hasOwn(payload, 'apiKey'), false)
    const { instance, events, patches } = loadComponent('components/input-optimizer/input-optimizer.js', {
      '../../utils/api': { requestJson: async body => { assert.equal(Object.hasOwn(body, 'apiKey'), false); assert.equal(body.target, target); return { target, optimizedText: 'improved scientific wording' } }, formatError: e => e.message },
      '../../utils/api-keys': { getApiKeys: () => args.apiKeys },
      '../../utils/tokendance': { hasTokenDanceConnection: () => true },
      '../../utils/model-registry-store': { getModelRegistryState: () => ({ registry: td }) },
    })
    Object.assign(instance.properties, args)
    await instance.optimize(); assert.equal(instance.data.candidate, 'improved scientific wording'); assert.equal(events.some(e => e.name === 'apply'), false)
    instance.apply(); assert.equal(events.find(e => e.name === 'apply').detail.target, target)
    instance.properties.inputs = { ...args.inputs, [target]: 'improved scientific wording' }; instance.restore()
    assert.equal(events.filter(e => e.name === 'apply').at(-1).detail.value, args.inputs[target])
    assert.ok(!JSON.stringify(patches).includes('must-not-leak'))
  }
})
