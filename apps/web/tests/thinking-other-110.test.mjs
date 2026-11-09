import { menuOptions, changeControl } from './menu-helpers.mjs';
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThinkingSettings from '../src/components/ThinkingSettings.jsx'
import { compileThinkingSelection } from '../src/lib/thinking.js'
import { reconcileThinkingSettings, buildThinkingSubmission, saveThinkingSettings, readThinkingSettings } from '../src/lib/thinkingSettings.js'

afterEach(() => { cleanup(); window.localStorage.clear() })
const identities = (provider, id) => Object.fromEntries(['main', 'vision', 'image'].map(role => [role, { provider, modelId: role === 'image' ? '' : id, protocol: 'openai-chat-completions' }]))
function Harness({ provider = 'fireworks', id, role = 'main', capture = () => {} }) {
  const [settings, setSettings] = useState(() => reconcileThinkingSettings(null, identities(provider, id)))
  capture(settings)
  return React.createElement(ThinkingSettings, { role, settings, registry: { thinkingContractVersion: 1 }, operation: 'generation',
    onChange: (changedRole, selection) => setSettings(current => ({ ...current, roles: { ...current.roles, [changedRole]: selection } })) })
}

test('Fireworks exact effort lists persist and reset without adding an unsupported off switch or budget', () => {
  for (const [slug, efforts] of [['step-3p7-flash-nvfp4', ['low', 'medium', 'high']], ['muse-glimmer-30b', ['low', 'medium', 'high', 'xhigh']]]) for (const role of ['main', 'vision']) {
    const id = `accounts/fireworks/models/${slug}`
    let settings
    render(React.createElement(Harness, { id, role, capture: value => { settings = value } }))
    const control = screen.getByLabelText(role === 'main' ? '主模型 / 规划思考强度' : '视觉识别思考强度')
    assert.equal(screen.getAllByRole('combobox').length, 1)
    assert.equal(screen.queryByRole('spinbutton'), null)
    assert.deepEqual(Array.from(menuOptions(control)).map(o => o.value), ['', ...efforts.map(JSON.stringify)])
    assert.match(menuOptions(control)[0].textContent, /默认.*未确认/)
    for (const effort of [...efforts, undefined]) {
      changeControl(control, { target: { value: effort === undefined ? '' : JSON.stringify(effort) } })
      assert.equal(saveThinkingSettings(settings, window.localStorage), true)
      const restored = reconcileThinkingSettings(readThinkingSettings(window.localStorage), identities('fireworks', id))
      const submitted = buildThinkingSubmission(restored, { thinkingContractVersion: 1 }, [role], 'generation')
      assert.deepEqual(compileThinkingSelection(submitted.thinkingConfig.roles[role], role).wire, effort === undefined ? {} : { reasoning_effort: effort })
      assert.deepEqual(restored.roles[role === 'main' ? 'vision' : 'main'].options, {})
    }
    cleanup(); window.localStorage.clear()
  }
})

test('confirmed non-thinking service and incomplete channel evidence both hide informational thinking sections', () => {
  render(React.createElement(Harness, { provider: 'iflytek', id: 'xop3qwen80bnext' }))
  assert.equal(Boolean(screen.queryByRole('region')), false)
  assert.equal(screen.queryByRole('combobox'), null)
  assert.equal(screen.queryByRole('spinbutton'), null)
  cleanup()
  render(React.createElement(Harness, { provider: 'iflytek', id: 'xop3qwen0b6' }))
  assert.equal(Boolean(screen.queryByRole('region')), false)
  assert.equal(screen.queryByRole('combobox'), null)
})
