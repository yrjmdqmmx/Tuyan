import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import { compileThinkingSelection } from '../src/lib/thinking.js'
import { reconcileThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings } from '../src/lib/thinkingSettings.js'

afterEach(() => { cleanup(); window.localStorage.clear() })
const identities = (provider, modelId, protocol = 'openai-chat-completions') => ({
  main: { provider, modelId, protocol }, vision: { provider, modelId: '', protocol }, image: { provider, modelId: '', protocol },
})
function Harness({ identity, capture }) {
  const [settings, setSettings] = useState(() => reconcileThinkingSettings(null, identity))
  capture(settings)
  return React.createElement(ThinkingSettings, { role: 'main', settings, registry: { thinkingContractVersion: 1 }, operation: 'generation',
    onChange: (role, selection) => setSettings(current => ({ ...current, roles: { ...current.roles, [role]: selection } })) })
}
const wire = settings => compileThinkingSelection(buildThinkingSubmission(settings, { thinkingContractVersion: 1 }, ['main'], 'generation').thinkingConfig.roles.main, 'main').wire

test('Bailian defaults and boolean overrides are preserved independently by exact model', () => {
  for (const [modelId, initial] of [['xiaomi/mimo-v2.5-pro', true], ['qwen3-vl-flash', false]]) {
    let settings
    const identity = identities('bailian', modelId, 'bailian-openai-chat')
    render(React.createElement(Harness, { identity, capture: value => { settings = value } }))
    const mode = screen.getByLabelText('主模型 / 规划思考模式')
    assert.equal(mode.value, String(initial))
    assert.equal(screen.queryByRole('spinbutton'), null, 'unconfirmed budget limits are not offered')
    assert.equal(screen.queryByLabelText('主模型 / 规划思考强度'), null)
    fireEvent.change(mode, { target: { value: String(!initial) } })
    assert.equal(saveThinkingSettings(settings, window.localStorage), true)
    assert.deepEqual(wire(reconcileThinkingSettings(readThinkingSettings(window.localStorage), identity)), { enable_thinking: !initial })
    cleanup()
  }
})

test('Mistral aliases distinguish minimal reasoning from off and remember the selection', () => {
  for (const modelId of ['mistral-medium-3', 'mistral-medium-latest']) {
    let settings
    const identity = identities('mistral', modelId)
    render(React.createElement(Harness, { identity, capture: value => { settings = value } }))
    const effort = screen.getByLabelText('主模型 / 规划思考强度')
    assert.deepEqual([...effort.options].map(option => option.textContent), ['默认（未确认）', '最少思考', '高'])
    assert.match(screen.getByRole('region').textContent, /不代表完全关闭思考/)
    fireEvent.change(effort, { target: { value: '"none"' } })
    saveThinkingSettings(settings, window.localStorage)
    assert.deepEqual(wire(reconcileThinkingSettings(readThinkingSettings(window.localStorage), identity)), { reasoning_effort: 'none' })
    fireEvent.change(effort, { target: { value: '' } })
    assert.deepEqual(wire(settings), {})
    cleanup()
  }
})

test('fixed, unavailable and unconfirmed contracts have no thinking section', () => {
  for (const [provider, modelId, label, detail] of [
    ['zhipu', 'glm-4.1v-thinking-flash', '固定模式', '不能关闭'],
    ['zhipu', 'glm-4-flash-250414', '接口无可调参数', '按渠道默认执行'],
    ['mistral', 'labs-leanstral-1-5', '尚未核实', '已公告此型号下线'],
    ['qianfan', 'ernie-5.1', '可调', '已核实'],
  ]) {
    let settings
    render(React.createElement(Harness, { identity: identities(provider, modelId), capture: value => { settings = value } }))
    if (label === '可调') {
      assert.match(screen.getByRole('region').textContent, new RegExp(label))
      assert.match(screen.getByRole('region').textContent, new RegExp(detail))
    } else {
      assert.equal(Boolean(screen.queryByRole('region')), false)
      assert.equal(Boolean(screen.queryByText(new RegExp(detail))), false)
    }
    assert.equal(Boolean(screen.queryByRole('combobox')), label === '可调')
    assert.equal(screen.queryByRole('spinbutton'), null)
    cleanup()
  }
})
