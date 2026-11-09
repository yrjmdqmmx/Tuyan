import { menuOptions, changeControl } from './menu-helpers.mjs';
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import { compileThinkingSelection } from '../src/lib/thinking.js'
import { reconcileThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings } from '../src/lib/thinkingSettings.js'

afterEach(() => { cleanup(); window.localStorage.clear() })
const identity = modelId => ({
  main: { provider: 'tokenhub', modelId, protocol: 'openai-chat-completions' },
  vision: { provider: 'tokenhub', modelId: '', protocol: 'openai-chat-completions' },
  image: { provider: 'tokenhub', modelId: '', protocol: 'provider-images' },
})
function Harness({ modelId, capture }) {
  const [settings, setSettings] = useState(() => reconcileThinkingSettings(null, identity(modelId)))
  capture(settings)
  return React.createElement(ThinkingSettings, { role: 'main', settings, registry: { thinkingContractVersion: 1 }, operation: 'generation',
    onChange: (role, selection) => setSettings(current => ({ ...current, roles: { ...current.roles, [role]: selection } })) })
}

test('TokenHub K2.8 UI offers only audited effort levels and preserves explicit selection across reload', () => {
  let settings
  render(React.createElement(Harness, { modelId: 'kimi-k2.8-preview', capture: value => { settings = value } }))
  assert.equal(screen.queryByLabelText('主模型 / 规划思考模式'), null)
  const effort = screen.getByLabelText('主模型 / 规划思考强度')
  assert.deepEqual([...menuOptions(effort)].map(x => x.textContent), ['默认（最高）', '低', '高', '最高'])
  assert.equal(effort.value, '')
  assert.deepEqual(compileThinkingSelection(settings.roles.main, 'main').wire, {})
  changeControl(effort, { target: { value: '"high"' } })
  assert.equal(saveThinkingSettings(settings, window.localStorage), true)
  const restored = reconcileThinkingSettings(readThinkingSettings(window.localStorage), identity('kimi-k2.8-preview'))
  const submitted = buildThinkingSubmission(restored, { thinkingContractVersion: 1 }, ['main'], 'generation').thinkingConfig.roles.main
  assert.deepEqual(compileThinkingSelection(submitted, 'main').wire, { reasoning_effort: 'high' })
  changeControl(effort, { target: { value: '' } })
  assert.deepEqual(compileThinkingSelection(settings.roles.main, 'main').wire, {})
  assert.equal(screen.getByRole('link', { name: /依据 1/ }).getAttribute('href'), 'https://cloud.tencent.com/document/product/1823/132232')
})

test('TokenHub MiMo toggles are separate from unknown and image interfaces without controls', () => {
  for (const modelId of ['mimo-v2.5-pro', 'mimo-v2.6-pro', 'mimo-v2.6-flash']) {
    let settings
    render(React.createElement(Harness, { modelId, capture: value => { settings = value } }))
    const mode = screen.getByLabelText('主模型 / 规划思考模式')
    assert.equal(mode.value, '"enabled"')
    assert.equal(screen.queryByLabelText('主模型 / 规划思考强度'), null)
    changeControl(mode, { target: { value: '"disabled"' } })
    const submitted = buildThinkingSubmission(settings, { thinkingContractVersion: 1 }, ['main'], 'generation').thinkingConfig.roles.main
    assert.deepEqual(compileThinkingSelection(submitted, 'main').wire, { thinking: { type: 'disabled' } })
    cleanup()
  }
  for (const [role, modelId, protocol, label] of [
    ['main', 'step-5-preview', 'openai-chat-completions', '尚未核实'],
    ['image', 'hy-image-v3.5-preview', 'provider-images', '接口无可调参数'],
  ]) {
    const settings = reconcileThinkingSettings(null, { [role]: { provider: 'tokenhub', modelId, protocol } })
    render(React.createElement(ThinkingSettings, { role, settings, registry: { thinkingContractVersion: 1 }, operation: 'generation', onChange() {} }))
    assert.equal(Boolean(screen.queryByRole('region')), false)
    assert.equal(Boolean(screen.queryByText(new RegExp(label))), false)
    assert.equal(screen.queryByRole('combobox'), null)
    cleanup()
  }
})
