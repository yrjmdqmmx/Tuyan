import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import { compileThinkingSelection } from '../src/lib/thinking.js'
import { reconcileThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings } from '../src/lib/thinkingSettings.js'

afterEach(() => { cleanup(); window.localStorage.clear() })
const identities = modelId => Object.fromEntries(['main', 'vision', 'image'].map(role => [role, { provider: 'iflytek', modelId: role === 'image' ? '' : modelId, protocol: 'openai-chat-completions' }]))
function Harness({ identity, role, capture }) {
  const [settings, setSettings] = useState(() => reconcileThinkingSettings(null, identity))
  capture(settings)
  return React.createElement(ThinkingSettings, { role, settings, registry: { thinkingContractVersion: 1 }, operation: 'generation', onChange: (key, value) => setSettings(current => ({ ...current, roles: { ...current.roles, [key]: value } })) })
}

test('MaaS Kimi switch restores and submits independently for text and vision without strength or budget', () => {
  for (const role of ['main', 'vision']) for (const mode of [true, false]) {
    let settings
    const identity = identities('xopkimik25')
    render(React.createElement(Harness, { identity, role, capture: value => { settings = value } }))
    assert.equal(screen.getAllByRole('combobox').length, 1)
    assert.equal(screen.queryByRole('spinbutton'), null)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: JSON.stringify(mode) } })
    assert.equal(saveThinkingSettings(settings, window.localStorage), true)
    const restored = reconcileThinkingSettings(readThinkingSettings(window.localStorage), identity)
    const submitted = buildThinkingSubmission(restored, { thinkingContractVersion: 1 }, [role], 'generation')
    assert.deepEqual(compileThinkingSelection(submitted.thinkingConfig.roles[role], role).wire, { enable_thinking: mode })
    assert.equal(submitted.thinkingConfig.roles[role === 'main' ? 'vision' : 'main'], undefined)
    cleanup()
  }
})

test('neighbouring MaaS service IDs stay pending without controls', () => {
  for (const modelId of ['xopglm53', 'xopdeepseekv4pro0813', 'xopkimik26']) {
    render(React.createElement(Harness, { identity: identities(modelId), role: 'main', capture: () => {} }))
    assert.equal(Boolean(screen.queryByRole('region')), false)
    assert.equal(screen.queryByRole('combobox'), null)
    assert.equal(screen.queryByRole('spinbutton'), null)
    cleanup()
  }
})

test('MaaS effort explains activation, restores exact service choices and returns to the channel default', () => {
  for (const modelId of ['xopglm52', 'xopdeepseekv4pro']) {
    let settings
    const identity = identities(modelId)
    render(React.createElement(Harness, { identity, role: 'main', capture: value => { settings = value } }))
    const effort = screen.getByRole('combobox')
    assert.deepEqual([...effort.options].map(x => x.value), ['', '"high"', '"max"'])
    assert.equal(effort.value, '')
    assert.equal(screen.queryByRole('spinbutton'), null)
    assert.equal(screen.queryByLabelText('主模型 / 规划思考模式'), null)
    assert.match(screen.getByRole('region').textContent, /选择强度时会同时开启思考；恢复默认后不发送强度或开关/)
    const compile = value => compileThinkingSelection(buildThinkingSubmission(value, { thinkingContractVersion: 1 }, ['main'], 'generation').thinkingConfig.roles.main, 'main').wire
    assert.deepEqual(compile(settings), {})
    fireEvent.change(effort, { target: { value: '"max"' } })
    assert.equal(saveThinkingSettings(settings, window.localStorage), true)
    assert.deepEqual(compile(reconcileThinkingSettings(readThinkingSettings(window.localStorage), identity)), { reasoning_effort: 'max', enable_thinking: true })
    const otherIdentity = identities(modelId === 'xopglm52' ? 'xopdeepseekv4pro' : 'xopglm52')
    assert.deepEqual(compile(reconcileThinkingSettings(readThinkingSettings(window.localStorage), otherIdentity)), {})
    fireEvent.change(effort, { target: { value: '' } })
    assert.deepEqual(compile(settings), {})
    cleanup()
  }
})
