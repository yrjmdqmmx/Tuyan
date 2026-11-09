import { changeControl } from './menu-helpers.mjs';
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import { compileThinkingSelection } from '../src/lib/thinking.js'
import { reconcileThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings } from '../src/lib/thinkingSettings.js'

afterEach(() => { cleanup(); window.localStorage.clear() })
const modelId = 'qwen3-omni-flash-2025-12-01'
const identities = (id = modelId) => Object.fromEntries(['main', 'vision', 'image'].map(role => [role, { provider: 'bailian', modelId: role === 'image' ? '' : id, protocol: 'bailian-openai-chat' }]))
function Harness({ identity, role, capture }) {
  const [settings, setSettings] = useState(() => reconcileThinkingSettings(null, identity))
  capture(settings)
  return React.createElement(ThinkingSettings, { role, settings, registry: { thinkingContractVersion: 1 }, operation: 'generation',
    onChange: (changedRole, selection) => setSettings(current => ({ ...current, roles: { ...current.roles, [changedRole]: selection } })) })
}

test('December Omni switch defaults off and persists independently for main and vision roles', () => {
  for (const [role, label] of [['main', '主模型 / 规划思考模式'], ['vision', '视觉识别思考模式']]) {
    let settings
    const identity = identities()
    render(React.createElement(Harness, { identity, role, capture: value => { settings = value } }))
    const control = screen.getByLabelText(label)
    assert.equal(control.value, 'false')
    assert.equal(screen.getAllByRole('combobox').length, 1)
    assert.equal(screen.queryByRole('spinbutton'), null)
    for (const mode of [true, false]) {
      changeControl(control, { target: { value: JSON.stringify(mode) } })
      assert.equal(saveThinkingSettings(settings, window.localStorage), true)
      const restored = reconcileThinkingSettings(readThinkingSettings(window.localStorage), identity)
      const submitted = buildThinkingSubmission(restored, { thinkingContractVersion: 1 }, [role], 'generation')
      assert.deepEqual(compileThinkingSelection(submitted.thinkingConfig.roles[role], role).wire, { enable_thinking: mode })
      const otherRole = role === 'main' ? 'vision' : 'main'
      assert.notEqual(restored.roles[otherRole].options.mode, true)
    }
    cleanup()
  }
})

test('September snapshot hides unconfirmed settings without the December toggle', () => {
  for (const role of ['main', 'vision']) {
    render(React.createElement(Harness, { identity: identities('qwen3-omni-flash-2025-09-15'), role, capture: () => {} }))
    assert.equal(Boolean(screen.queryByRole('region')), false)
    assert.equal(screen.queryByRole('combobox'), null)
    assert.equal(screen.queryByRole('spinbutton'), null)
    cleanup()
  }
})
