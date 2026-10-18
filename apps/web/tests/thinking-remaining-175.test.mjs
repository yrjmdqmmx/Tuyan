import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import { compileThinkingSelection } from '../src/lib/thinking.js'
import { reconcileThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings } from '../src/lib/thinkingSettings.js'

afterEach(() => { cleanup(); window.localStorage.clear() })
const identities = (provider, modelId, protocol, role = 'main') => Object.fromEntries(['main', 'vision', 'image'].map(key => [key, { provider, modelId: key === role ? modelId : '', protocol }]))
function Harness({ identity, role = 'main', capture }) {
  const [settings, setSettings] = useState(() => reconcileThinkingSettings(null, identity))
  capture(settings)
  return React.createElement(ThinkingSettings, { role, settings, registry: { thinkingContractVersion: 1 }, operation: 'generation',
    onChange: (key, selection) => setSettings(current => ({ ...current, roles: { ...current.roles, [key]: selection } })) })
}

test('new boolean and string switches restore independently without unverified strength or budget controls', () => {
  for (const [provider, model, protocol, off, expected] of [
    ['bailian', 'qwen3.6-27b', 'bailian-openai-chat', false, { enable_thinking: false }],
    ['bailian', 'qwen3.5-plus-2026-04-20', 'bailian-openai-chat', false, { enable_thinking: false }],
    ['tokenhub', 'deepseek/deepseek-flash', 'openai-chat-completions', 'disabled', { thinking: { type: 'disabled' } }],
    ['tokenhub', 'deepseek/deepseek-v4-flash-vision-exp', 'openai-chat-completions', 'disabled', { thinking: { type: 'disabled' } }],
  ]) {
    let settings
    const identity = identities(provider, model, protocol)
    render(React.createElement(Harness, { identity, capture: value => { settings = value } }))
    const control = screen.getByLabelText('主模型 / 规划思考模式')
    assert.equal(screen.queryByLabelText('主模型 / 规划思考强度'), null)
    assert.equal(screen.queryByRole('spinbutton'), null)
    fireEvent.change(control, { target: { value: JSON.stringify(off) } })
    assert.equal(saveThinkingSettings(settings, window.localStorage), true)
    const restored = reconcileThinkingSettings(readThinkingSettings(window.localStorage), identity)
    const submitted = buildThinkingSubmission(restored, { thinkingContractVersion: 1 }, ['main'], 'generation')
    assert.deepEqual(compileThinkingSelection(submitted.thinkingConfig.roles.main, 'main').wire, expected)
    cleanup()
  }
})

test('no adjustable parameters and pending channel evidence are hidden in text and image settings', () => {
  for (const [provider, model, role, protocol, label] of [
    ['zhipu', 'glm-4v-flash', 'main', 'openai-chat-completions', '接口无可调参数'],
    ['mistral', 'mistral-large-2512', 'vision', 'openai-chat-completions', '接口无可调参数'],
    ['together', 'openai/gpt-image-2', 'image', 'provider-images', '接口无可调参数'],
    ['together', 'google/imagen-4.0-ultra', 'image', 'provider-images', '接口无可调参数'],
    ['ark', 'doubao-seedream-5-0-flash-260915', 'image', 'ark-images', '接口无可调参数'],
    ['tokenhub', 'deepseek-v4.1-flash', 'main', 'openai-chat-completions', '尚未核实'],
  ]) {
    render(React.createElement(Harness, { identity: identities(provider, model, protocol, role), role, capture: () => {} }))
    assert.equal(Boolean(screen.queryByRole('region')), false)
    assert.equal(Boolean(screen.queryByText(new RegExp(label))), false)
    assert.equal(screen.queryByRole('combobox'), null)
    assert.equal(screen.queryByRole('spinbutton'), null)
    cleanup()
  }
})
