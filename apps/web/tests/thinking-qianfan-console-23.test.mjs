import { changeControl } from './menu-helpers.mjs';
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import { compileThinkingSelection } from '../src/lib/thinking.js'
import { reconcileThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings } from '../src/lib/thinkingSettings.js'

afterEach(() => { cleanup(); window.localStorage.clear() })
const identities = id => Object.fromEntries(['main', 'vision', 'image'].map(role => [role, { provider: 'qianfan', modelId: role === 'image' ? '' : id, protocol: 'openai-chat-completions' }]))
function Harness({ id, role, capture }) {
  const [settings, setSettings] = useState(() => reconcileThinkingSettings(null, identities(id)))
  capture(settings)
  return React.createElement(ThinkingSettings, { role, settings, registry: { thinkingContractVersion: 1 }, operation: 'generation',
    onChange: (changedRole, selection) => setSettings(current => ({ ...current, roles: { ...current.roles, [changedRole]: selection } })) })
}

test('Qianfan exact switches survive save/reload with correct wire types and no speculative budget', () => {
  for (const id of ['ernie-5.1', 'qwen3.5-122b-a10b', 'qwen3.5-27b', 'qwen3.5-35b-a3b']) for (const role of id === 'ernie-5.1' ? ['main'] : ['main', 'vision']) {
    let settings
    render(React.createElement(Harness, { id, role, capture: value => { settings = value } }))
    const control = screen.getByLabelText(role === 'main' ? '主模型 / 规划思考模式' : '视觉识别思考模式')
    assert.equal(screen.queryByRole('spinbutton'), null)
    assert.equal(screen.getAllByRole('combobox').length, 1)
    assert.match(screen.getByRole('region').textContent, /接口默认状态尚未确认/)
    const modes = id === 'ernie-5.1' ? ['enabled', 'disabled'] : [true, false]
    for (const mode of modes) {
      changeControl(control, { target: { value: JSON.stringify(mode) } })
      assert.equal(saveThinkingSettings(settings, window.localStorage), true)
      const restored = reconcileThinkingSettings(readThinkingSettings(window.localStorage), identities(id))
      const submitted = buildThinkingSubmission(restored, { thinkingContractVersion: 1 }, [role], 'generation')
      const expected = id === 'ernie-5.1' ? { thinking: { type: mode } } : { enable_thinking: mode }
      assert.deepEqual(compileThinkingSelection(submitted.thinkingConfig.roles[role], role).wire, expected)
      assert.deepEqual(restored.roles[role === 'main' ? 'vision' : 'main'].options, {})
    }
    cleanup(); window.localStorage.clear()
  }
})

test('conflicting DeepSeek contract hides unconfirmed settings without controls', () => {
  render(React.createElement(Harness, { id: 'deepseek-v4.1-flash', role: 'main', capture: () => {} }))
  assert.equal(Boolean(screen.queryByRole('region')), false)
  assert.equal(screen.queryByRole('combobox'), null)
  assert.equal(screen.queryByRole('spinbutton'), null)
})
