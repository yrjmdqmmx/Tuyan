import { changeControl } from './menu-helpers.mjs';
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import { compileThinkingSelection } from '../src/lib/thinking.js'
import { reconcileThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings } from '../src/lib/thinkingSettings.js'

afterEach(() => { cleanup(); window.localStorage.clear() })
const identities = (provider, modelId, protocol) => Object.fromEntries(['main', 'vision', 'image'].map(role => [role, { provider, modelId: role === 'main' ? modelId : '', protocol }]))
function Harness({ identity, capture }) {
  const [settings, setSettings] = useState(() => reconcileThinkingSettings(null, identity))
  capture(settings)
  return React.createElement(ThinkingSettings, { role: 'main', settings, registry: { thinkingContractVersion: 1 }, operation: 'generation',
    onChange: (role, selection) => setSettings(current => ({ ...current, roles: { ...current.roles, [role]: selection } })) })
}

test('supplier toggles show documented defaults and persist on/off without extra controls', () => {
  for (const [model, on, off, wire] of [
    ['unisound/unisound-u2', 'enabled', 'disabled', mode => ({ thinking: { type: mode } })],
    ['vanchin/deepseek-v4-pro-0813', true, false, mode => ({ enable_thinking: mode })],
  ]) {
    let settings
    const identity = identities('bailian', model, 'bailian-openai-chat')
    render(React.createElement(Harness, { identity, capture: value => { settings = value } }))
    const control = screen.getByLabelText('主模型 / 规划思考模式')
    assert.equal(control.value, JSON.stringify(on))
    assert.equal(screen.queryByLabelText('主模型 / 规划思考强度'), null)
    assert.equal(screen.queryByRole('spinbutton'), null)
    for (const mode of [off, on]) {
      changeControl(control, { target: { value: JSON.stringify(mode) } })
      assert.equal(saveThinkingSettings(settings, window.localStorage), true)
      const restored = reconcileThinkingSettings(readThinkingSettings(window.localStorage), identity)
      const submitted = buildThinkingSubmission(restored, { thinkingContractVersion: 1 }, ['main'], 'generation')
      assert.deepEqual(compileThinkingSelection(submitted.thinkingConfig.roles.main, 'main').wire, wire(mode))
    }
    cleanup()
  }
})

test('confirmed no-control and pending evidence both hide the thinking section', () => {
  for (const [provider, model, protocol, label] of [
    ['bailian', 'vanchin/deepseek-v3', 'bailian-openai-chat', '接口无可调参数'],
    ['bailian', 'deepseek-v3', 'bailian-openai-chat', '尚未核实'],
    ['bailian', 'qwen3-coder-plus', 'bailian-openai-chat', '尚未核实'],
    ['qianfan', 'deepseek-v4-pro-0813', 'openai-chat-completions', '尚未核实'],
  ]) {
    render(React.createElement(Harness, { identity: identities(provider, model, protocol), capture: () => {} }))
    assert.equal(Boolean(screen.queryByRole('region')), false)
    assert.equal(Boolean(screen.queryByText(new RegExp(label))), false)
    assert.equal(screen.queryByRole('combobox'), null)
    assert.equal(screen.queryByRole('spinbutton'), null)
    cleanup()
  }
})
