const assert = require('node:assert/strict')

let definition
global.Component = (value) => { definition = value }
require('../miniprogram/components/model-picker/model-picker.js')

assert.equal(typeof definition.methods.resetFlow, 'function')
assert.equal(typeof definition.methods.selectProvider, 'function')
assert.equal(typeof definition.methods.selectVendor, 'function')
assert.equal(typeof definition.methods.backStep, 'function')

function model(id, vendor, recommended = true) {
  return {
    id,
    label: id,
    vendor,
    lifecycle: 'stable',
    recommended,
    requiresEntitlement: false,
    entitlement: '',
    verified: true,
    verificationState: 'registry',
    selectable: true,
    disabledReason: '',
    roles: ['main'],
    roleReasons: {},
    inputModalities: [],
    outputModalities: [],
    protocol: '',
    availabilityNotes: '',
    releasedAt: '',
    capabilities: {},
  }
}

const registry = {
  providers: {
    gemini: { accessKind: 'direct', models: [model('gemini-main', 'Google')] },
    openai: { accessKind: 'direct', models: [model('openai-main', 'OpenAI')] },
    bailian: { accessKind: 'aggregator', models: [model('qwen-main', 'Alibaba Qwen'), model('deepseek-main', 'DeepSeek')] },
    ark: { accessKind: 'aggregator', models: [model('ark-main', 'ByteDance Doubao')] },
    openrouter: { accessKind: 'aggregator', models: [model('or-main', 'OpenAI'), model('or-claude', 'Anthropic', false)] },
  },
}

function context() {
  const state = JSON.parse(JSON.stringify(definition.data))
  return Object.assign({
    data: state,
    properties: { registry, role: 'main', outputFormat: 'png', selectedProvider: 'bailian', selectedModel: 'qwen-main' },
    setData(patch) { Object.assign(state, patch) },
    triggerEvent() {},
  }, definition.methods)
}

const picker = context()
picker.resetFlow()
assert.equal(picker.data.step, 'providers')

picker.selectProvider({ currentTarget: { dataset: { provider: 'bailian' } } })
assert.equal(picker.data.step, 'vendors')
assert.deepEqual(picker.data.vendorCards.map((item) => item.vendor), ['Alibaba Qwen', 'DeepSeek'])

picker.selectVendor({ currentTarget: { dataset: { vendor: 'DeepSeek' } } })
assert.equal(picker.data.step, 'models')
assert.deepEqual(picker.data.compatibleModels.map((item) => item.id), ['deepseek-main'])

picker.backStep()
assert.equal(picker.data.step, 'vendors')

picker.selectProvider({ currentTarget: { dataset: { provider: 'gemini' } } })
assert.equal(picker.data.step, 'models')
assert.deepEqual(picker.data.compatibleModels.map((item) => item.id), ['gemini-main'])

picker.backStep()
picker.selectProvider({ currentTarget: { dataset: { provider: 'openrouter' } } })
picker.selectVendor({ currentTarget: { dataset: { vendor: 'Anthropic' } } })
assert.equal(picker.data.catalogMode, 'all')
assert.deepEqual(picker.data.compatibleModels.map((item) => item.id), ['or-claude'])

delete global.Component
console.log('model-picker-flow.test.cjs passed')
