import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { removedModelHint, assertAuditedModelAvailable } from '../src/lib/modelAudit.js'
import { unavailableModelHint } from '../src/lib/modelUnavailablePresentation.js'
import ModelPicker from '../src/components/ModelPicker.jsx'
import WorkspaceModelCatalog from '../src/workspace/WorkspaceModelCatalog.jsx'
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx'

beforeEach(t => t.mock.method(Date, 'now', () => Date.parse('2026-11-09')))
afterEach(cleanup)
const cases = [
  ['xiaomi', 'mimo-v2.5', 'MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash'],
  ['fireworks', 'accounts/fireworks/models/glm-5p2', 'GLM 5.2：原型号已不可用，请重新选择。推荐：GLM 5.3'],
  ['stepfun', 'step-2x-large', 'Step 2x Large：原型号已不可用，请重新选择。'],
]

test('R7 notice helpers use the same exact short names and punctuation with and without replacements', () => {
  for (const [provider, id, expected] of cases) {
    assert.equal(removedModelHint(provider, id), expected)
    assert.equal(unavailableModelHint(provider, id), expected)
  }
  assert.equal(removedModelHint('xiaomi', 'mimo-v2.6-flash'), '')
  assert.equal(unavailableModelHint('xiaomi', 'mimo-v2.6-flash'), '')
})

for (const [provider, id, expected] of cases) {
  test(`R7 single unavailable ${provider} has an exact notice in My Models and both pickers`, () => {
    const registry = { providers: STATIC_MODEL_REGISTRY }
    const models = { registry, ready: true, busy: false, registryStatus: 'ready',
      library: { connections: [{ id: 'c', provider, label: '连接', hasCredential: true }],
        models: [{ id: 'old', connectionId: 'c', modelId: id }] },
      save: () => assert.fail('Viewing must not save') }
    const current = { libraryModelId: 'old', connectionId: 'c', accessProvider: provider, modelId: id }
    const before = structuredClone(models.library)
    for (const element of [
      React.createElement(WorkspaceModelCatalog, { models, mode: 'library' }),
      React.createElement(WorkspaceModelPicker, { models, current, role: 'main', path: 'svg', onChange: () => assert.fail('No automatic replacement') }),
      React.createElement(ModelPicker, { registry, route: current, label: '主模型', role: 'main', outputFormat: 'svg', onChange: () => assert.fail('No automatic replacement') }),
    ]) {
      const view = render(element)
      assert.equal(screen.getAllByRole('status').length, 1)
      assert.equal(screen.getByRole('status').firstChild.textContent, expected)
      if (provider === 'stepfun') assert.equal(screen.queryByRole('button', { name: '改选' }), null)
      assert.deepEqual(models.library, before)
      view.unmount()
    }
  })
}

test('R7 original and replacement names both prefer catalog display names when available', () => {
  const registry = { providers: { fireworks: { models: [
    { id: 'accounts/fireworks/models/glm-5p2', label: 'GLM 5.2' },
    { id: 'accounts/fireworks/models/glm-5p3', label: 'GLM 5.3' },
  ] } } }
  assert.equal(unavailableModelHint('fireworks', 'accounts/fireworks/models/glm-5p2', registry),
    'GLM 5.2：原型号已不可用，请重新选择。推荐：GLM 5.3')
})

test('R7 an expired catalog model keeps its display name in both notice helpers', () => {
  Date.now.mock.mockImplementation(() => Date.parse('2026-11-16'))
  const expected = 'Ling 2.6-flash：原型号已不可用，请重新选择。推荐：Ling-3.1-flash'
  assert.equal(removedModelHint('antling', 'Ling-2.6-flash'), expected)
  assert.equal(unavailableModelHint('antling', 'Ling-2.6-flash'), expected)
})

test('R8 MODEL_UNAVAILABLE errors share the display-name wording', () => {
  for (const [provider, id, message] of [
    ['xiaomi', 'mimo-v2.5', '模型 MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash'],
    ['stepfun', 'step-2x-large', '模型 Step 2x Large：原型号已不可用，请重新选择。'],
  ]) assert.throws(() => assertAuditedModelAvailable(provider, id), { message, code: 'MODEL_UNAVAILABLE', requestState: 'not_sent' })
})
