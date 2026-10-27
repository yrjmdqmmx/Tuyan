import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModelPicker from '../src/components/ModelPicker.jsx'

afterEach(cleanup)
const selected = { id: 'selected-model', label: 'Existing model', roles: ['main'], selectable: true }
const initial = {
  providers: { bailian: { models: [selected] }, recraft: { models: [{ id: 'vector', roles: ['image'], selectable: true }] } },
  unavailableProviders: { openrouter: 'OpenRouter 目录读取失败，请稍后重试。' },
}

for (const compact of [false, true]) test(`empty dynamic channel is hidden and reappears with compatible models (${compact ? 'mobile' : 'desktop'})`, async () => {
  const oldMatch = window.matchMedia
  window.matchMedia = () => ({ matches: compact, addEventListener() {}, removeEventListener() {} })
  try {
    const changes = [], user = userEvent.setup()
    const props = { label: '主模型', role: 'main', route: { accessProvider: 'bailian', modelId: selected.id }, registry: initial, onRouteChange: route => changes.push(route) }
    const view = render(React.createElement(ModelPicker, props))
    await user.click(screen.getByRole('button', { name: '主模型', exact: true }))
    assert.equal(screen.queryByRole('button', { name: 'Recraft', exact: true }), null, 'unrelated incompatible roles stay filtered')
    assert.equal(screen.queryByRole('button', { name: 'OpenRouter', exact: true }), null)
    assert.deepEqual(changes, [], 'hiding an empty channel does not overwrite the existing route')
    const restored = { ...initial, unavailableProviders: {}, providers: { ...initial.providers, openrouter: { accessKind: 'aggregator', models: [{ id: 'openai/dynamic-model', label: 'Dynamic model', vendor: 'OpenAI', roles: ['main'], selectable: true }] } } }
    view.rerender(React.createElement(ModelPicker, { ...props, registry: restored }))
    assert.equal(screen.queryByRole('status'), null)
    await user.click(screen.getByRole('button', { name: 'OpenRouter', exact: true }))
    if (compact) await user.click(screen.getByRole('button', { name: '厂商 OpenAI', exact: true }))
    await user.click(screen.getByRole('button', { name: '选择 Dynamic model', exact: true }))
    assert.deepEqual(changes, [{ accessProvider: 'openrouter', modelId: 'openai/dynamic-model' }])
  } finally { window.matchMedia = oldMatch }
})


test('unavailable directory rows, vendors and diagnostics are hidden', async () => {
  const user = userEvent.setup()
  const rows = [{ id: 'retired', label: 'Retired model', vendor: 'Retired vendor', roles: ['main'], selectable: false, catalogDiscovered: true }]
  render(React.createElement(ModelPicker, { label: '主模型', role: 'main', route: { accessProvider: 'fal', modelId: '' }, registry: {
    providers: { fal: { models: rows } }, catalogProviders: { fal: { access: 'public', source: 'https://fal.ai/docs' } },
    catalogHealth: { fal: { state: 'partial', message: '已隔离 4 条异常记录，其他 109 条可用' } },
  } }))
  await user.click(screen.getByRole('button', { name: '主模型', exact: true }))
  assert.equal(screen.queryByText('Retired model'), null)
  assert.equal(screen.queryByRole('button', { name: '厂商 Retired vendor' }), null)
  assert.equal(screen.queryByRole('region', { name: '暂不可用的模型' }), null)
  assert.equal(screen.queryByRole('link', { name: '目录说明' }), null)
  assert.equal(screen.queryByText(/已隔离|限流|读取进度/), null)
  assert.equal(screen.queryByRole('button', { name: 'fal', exact: true }), null)
  assert.ok(screen.getByText('当前渠道暂无可选模型。'))
})

for (const role of ['main', 'image', 'vision']) test(`${role} card body selects the exact channel and model; sources stay independent`, async () => {
  const changes = [], modes = [], user = userEvent.setup()
  const model = { id: 'live-model', label: 'Live model', roles: [role], selectable: true,
    specifications: { version: 1, contextWindowTokens: 12345, sourceUrls: ['https://example.com/models/live-model'] } }
  render(React.createElement(ModelPicker, { label: '测试模型', role, route: { accessProvider: 'openrouter', modelId: '' },
    registry: { providers: { openrouter: { models: [model] } } }, onRouteChange: value => changes.push(value), onVisionModeChange: value => modes.push(value), visionMode: 'assist' }))
  await user.click(screen.getByRole('button', { name: '测试模型', exact: true }))
  await user.click(screen.getByRole('link', { name: /官方文档/ }))
  assert.deepEqual(changes, [], 'source clicks do not select a model')
  assert.ok(screen.getByRole('dialog'))
  await user.click(screen.getByText('≈ 12K tokens'))
  assert.equal(model.specifications.contextWindowTokens, 12345, 'display rounding preserves the exact source limit')
  assert.deepEqual(changes, [{ accessProvider: 'openrouter', modelId: 'live-model' }])
  assert.deepEqual(modes, role === 'vision' ? ['assist'] : [])
  assert.equal(screen.queryByRole('dialog'), null)
})

test('title selection remains keyboard accessible and fires once', async () => {
  const changes = [], user = userEvent.setup()
  render(React.createElement(ModelPicker, { label: '主模型', role: 'main', provider: 'bailian', value: '', models: [selected], onChange: id => changes.push(id) }))
  await user.click(screen.getByRole('button', { name: '主模型', exact: true }))
  // Opening the dialog focuses its first control on the next animation frame.
  // Wait for that focus before exercising keyboard selection inside the dialog.
  await waitFor(() => assert.ok(document.activeElement === screen.getByRole('button', { name: '关闭模型选择' }), 'dialog initial focus is ready'))
  screen.getByRole('button', { name: '选择 Existing model' }).focus()
  await user.keyboard('{Enter}')
  assert.deepEqual(changes, [selected.id])
  assert.equal(screen.queryByRole('dialog'), null)
})

test('account catalog reuses existing credentials without adding a picker credential form', async () => {
  const loads = [], user = userEvent.setup()
  const props = { label: '主模型', role: 'main', route: { accessProvider: 'openai', modelId: '' }, registry: {
    providers: { openai: { models: [selected] } }, catalogProviders: { openai: { access: 'key', source: 'https://example.com/catalog' } },
  }, catalogControls: { onLoad: (...args) => loads.push(args), apiKeys: {}, states: {} } }
  const view = render(React.createElement(ModelPicker, props))
  await user.click(screen.getByRole('button', { name: '主模型', exact: true }))
  assert.equal(screen.getByRole('button', { name: '刷新目录' }).disabled, true)
  assert.equal(document.querySelector('input[type="password"]'), null)
  assert.equal(screen.queryByRole('link', { name: '目录说明' }), null)
  view.rerender(React.createElement(ModelPicker, { ...props, catalogControls: { ...props.catalogControls, apiKeys: { openai: 'test-existing-key' } } }))
  assert.deepEqual(loads, [['openai']])
  assert.equal(screen.getByRole('button', { name: '刷新目录' }).disabled, false)
  await user.click(screen.getByRole('button', { name: '刷新目录' }))
  assert.deepEqual(loads, [['openai'], ['openai']])
  assert.equal(document.querySelector('input[type="password"]'), null)
})

const roleRegistry = {
  providers: {
    fal: { models: [{ id: 'fal-image', label: 'fal image', roles: ['image'], selectable: true, capabilities: { outputFormats: ['png'] } }] },
    deepseek: { models: [{ id: 'deepseek-text', label: 'DeepSeek text', roles: ['main', 'vision'], selectable: true }] },
    openai: { models: [{ id: 'all-roles', label: 'All roles', roles: ['main', 'image', 'vision'], selectable: true, capabilities: { outputFormats: ['png', 'svg'] } }] },
    recraft: { models: [{ id: 'svg-image', roles: ['image'], selectable: true, capabilities: { outputFormats: ['svg'] } }] },
    novita: { models: [{ id: 'unadapted', roles: [], selectable: false, catalogDiscovered: true }] },
    fireworks: { models: [{ id: 'retired', roles: ['main', 'image', 'vision'], selectable: false }] },
    mistral: { models: [{ id: 'expired', roles: ['main', 'image', 'vision'], selectable: true, expirationDate: '2000-01-01' }] },
  },
  catalogProviders: Object.fromEntries(['fal', 'deepseek', 'openai', 'recraft', 'novita', 'fireworks', 'mistral'].map(id => [id, { access: 'public' }])),
  unavailableProviders: { gemini: '暂时无法读取目录' },
}

test('generation excludes edit-only models and channels while editing retains them', async () => {
  const user = userEvent.setup(), changes = []
  const registry = { providers: {
    fal: { models: [
      { id: 'generate', label: 'Generate', roles: ['image'], capabilities: { imageGeneration: true, refineResolutions: [] } },
      { id: 'edit', label: 'Edit', roles: ['image'], capabilities: { imageGeneration: false } },
    ] },
    ideogram: { models: [{ id: 'source-required', label: 'Source required', roles: ['image'], capabilities: { requiresSourceImage: true } }] },
  } }
  const props = { label: '图像模型', role: 'image', registry, route: { accessProvider: 'fal', modelId: 'edit' }, onRouteChange: route => changes.push(route) }
  const view = render(React.createElement(ModelPicker, props))
  await user.click(screen.getByRole('button', { name: '图像模型', exact: true }))
  assert.ok(screen.getByRole('button', { name: '选择 Generate' }))
  assert.equal(screen.queryByRole('button', { name: '选择 Edit' }), null)
  assert.equal(screen.queryByRole('button', { name: 'Ideogram', exact: true }), null)
  assert.deepEqual(changes, [], 'filtering does not change saved routes')
  view.rerender(React.createElement(ModelPicker, { ...props, operation: 'editing' }))
  assert.ok(screen.getByRole('button', { name: '选择 Edit' }))
  assert.equal(screen.queryByRole('button', { name: '选择 Generate' }), null)
  await user.click(screen.getByRole('button', { name: 'Ideogram', exact: true }))
  await user.click(screen.getByRole('button', { name: '选择 Source required' }))
  assert.deepEqual(changes, [{ accessProvider: 'ideogram', modelId: 'source-required' }])
})
for (const compact of [false, true]) for (const role of ['main', 'image', 'vision']) test(`channel rail only contains compatible ${role} models (${compact ? 'mobile' : 'desktop'})`, async () => {
  const oldMatch = window.matchMedia
  window.matchMedia = () => ({ matches: compact, addEventListener() {}, removeEventListener() {} })
  try {
    const changes = [], user = userEvent.setup()
    render(React.createElement(ModelPicker, { label: '测试模型', role, outputFormat: 'png', allowCustom: true,
      route: { accessProvider: 'openai', modelId: 'all-roles' }, registry: roleRegistry, onRouteChange: value => changes.push(value) }))
    await user.click(screen.getByRole('button', { name: '测试模型', exact: true }))
    assert.ok(screen.getByRole('button', { name: '通用 API', exact: true }))
    assert.ok(screen.getByRole('button', { name: 'OpenAI', exact: true }))
    assert.equal(Boolean(screen.queryByRole('button', { name: 'fal', exact: true })), role === 'image')
    assert.equal(Boolean(screen.queryByRole('button', { name: '深度求索', exact: true })), role !== 'image')
    for (const name of ['Recraft', 'Novita AI', 'Fireworks AI', 'Mistral AI', 'Google']) assert.equal(screen.queryByRole('button', { name, exact: true }), null, name)
    assert.deepEqual(changes, [])
  } finally { window.matchMedia = oldMatch }
})

test('output-format changes update channels without changing the saved selection', async () => {
  const changes = [], user = userEvent.setup()
  const props = { label: '图像模型', role: 'image', outputFormat: 'png', route: { accessProvider: 'fal', modelId: 'fal-image' }, registry: roleRegistry, onRouteChange: value => changes.push(value) }
  const view = render(React.createElement(ModelPicker, props))
  await user.click(screen.getByRole('button', { name: '图像模型', exact: true }))
  assert.ok(screen.getByRole('button', { name: 'fal', exact: true }))
  assert.equal(screen.queryByRole('button', { name: 'Recraft', exact: true }), null)
  view.rerender(React.createElement(ModelPicker, { ...props, outputFormat: 'svg' }))
  assert.equal(screen.queryByRole('button', { name: 'fal', exact: true }), null)
  assert.ok(screen.getByRole('button', { name: 'Recraft', exact: true }))
  assert.equal(screen.queryByRole('button', { name: '选择 fal image', exact: true }), null)
  assert.match(screen.getByRole('button', { name: '图像模型', exact: true }).textContent, /fal image/)
  assert.deepEqual(changes, [])
})

for (const compact of [false, true]) test(`catalog refresh hides the last unavailable channel without replacing its saved model (${compact ? 'mobile' : 'desktop'})`, async () => {
  const oldMatch = window.matchMedia
  window.matchMedia = () => ({ matches: compact, addEventListener() {}, removeEventListener() {} })
  try {
    const changes = [], user = userEvent.setup()
    const props = { label: '主模型', role: 'main', route: { accessProvider: 'deepseek', modelId: 'deepseek-text' }, registry: roleRegistry, onRouteChange: value => changes.push(value) }
    const view = render(React.createElement(ModelPicker, props))
    await user.click(screen.getByRole('button', { name: '主模型', exact: true }))
    await user.click(screen.getByRole('button', { name: '深度求索', exact: true }))
    const unavailable = { ...roleRegistry, providers: { ...roleRegistry.providers, deepseek: { models: [{ ...roleRegistry.providers.deepseek.models[0], selectable: false }] } } }
    view.rerender(React.createElement(ModelPicker, { ...props, registry: unavailable }))
    assert.equal(screen.queryByRole('button', { name: '深度求索', exact: true }), null)
    assert.ok(screen.getByRole('button', { name: 'OpenAI', exact: true }))
    assert.match(screen.getByRole('button', { name: '主模型', exact: true }).textContent, /DeepSeek text/)
    assert.deepEqual(changes, [])
    await user.click(screen.getByRole('button', { name: '关闭模型选择', exact: true }))
    await user.click(screen.getByRole('button', { name: '主模型', exact: true }))
    assert.equal(screen.queryByRole('button', { name: '深度求索', exact: true }), null)
    assert.deepEqual(changes, [])
  } finally { window.matchMedia = oldMatch }
})
