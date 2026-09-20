import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import ModelPicker from '../src/components/ModelPicker.jsx'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'

let restore
function backend() {
  let state = 'partial', requests = 0, submissions = 0
  const old = globalThis.fetch, oldInterval = globalThis.setInterval
  let refresh
  globalThis.setInterval = (callback, delay, ...args) => {
    if (delay === 60_000) refresh = () => callback(...args)
    return oldInterval(callback, delay, ...args)
  }
  globalThis.fetch = async (_url, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null
    if (!body) return Response.json({ code: 0, runtime: 'laf' })
    if (body.action === 'referenceLibrary') return Response.json({ code: 0, references: [] })
    if (body.action === 'modelRegistry') {
      requests++
      if (state === 'network') throw new Error('目录请求网络超时，请重试')
      const providers = structuredClone(STATIC_MODEL_REGISTRY)
      const message = state === 'partial' ? '已隔离 deepseek-chat-v3-0324：supported_protocols 返回 null，其他正常模型仍可用。' : '目录读取超时，已保留原选择，请重试目录。'
      if (state === 'missing') delete providers.tokendance
      else if (state !== 'ready') for (const model of providers.tokendance.models) {
        if (state === 'unavailable' || state === 'image-disabled' && model.id === 'seedream-5.0-lite' || model.id === 'deepseek-chat-v3-0324') { model.selectable = false; model.disabledReason = message }
      }
      return Response.json({ code: 0, registryVersion: 'fixture', routeContractVersion: 1, supportsModelRoutes: true, providers,
        ...(state === 'partial' ? { catalogWarnings: { tokendance: message } } : state !== 'ready' ? { unavailableProviders: { tokendance: message } } : {}) })
    }
    if (body.action === 'createJob') submissions++
    throw new Error('Unexpected action: ' + body.action)
  }
  restore = () => { globalThis.fetch = old; globalThis.setInterval = oldInterval }
  return { set: value => { state = value }, requests: () => requests, submissions: () => submissions, refresh: () => act(async () => { assert.ok(refresh, 'automatic catalog refresh remains scheduled'); refresh() }) }
}
afterEach(() => { cleanup(); document.body.innerHTML = ''; restore?.() })

test('catalog partial, unavailable, missing, network failure and recovery preserve default channel, model IDs and exact inputs', async () => {
  const f = backend(), user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.equal(f.requests(), 1))
  assert.equal(screen.queryByText(/模型目录提示/), null)
  assert.equal(screen.queryByRole('button', { name: '重试目录' }), null)
  const summary = screen.getByRole('region', { name: '当前生成设置' })
  assert.match(summary.textContent, /Seedream[ -]5\.0[ -]Pro/i)
  fireEvent.change(screen.getByLabelText(/论文方法内容/u), { target: { value: '保留完整的方法输入 ABC' } })
  fireEvent.change(screen.getByLabelText(/目标图注/u), { target: { value: '保留完整图注 XYZ' } })
  fireEvent.change(screen.getByLabelText(/负向提示词（可选）/u), { target: { value: '不要替换我的输入' } })
  for (const state of ['unavailable', 'missing', 'network', 'ready']) {
    const before = f.requests(); f.set(state)
    await f.refresh()
    await waitFor(() => assert.ok(f.requests() > before))
    assert.equal(screen.queryByRole('button', { name: '重试目录' }), null)
    if (state === 'ready') await waitFor(() => assert.equal(screen.queryByText(/已保留所选模型/), null))
    else if (state === 'unavailable') await screen.findByText(/已保留所选模型/)
    if (state !== 'ready') {
      await act(async () => fireEvent.submit(document.querySelector('.generation-form')))
      assert.equal(f.submissions(), 0, 'unavailable or missing registry never submits a model call')
      if (screen.queryByRole('button', { name: '关闭生成设置' })) await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
    }
    assert.match(summary.textContent, /Seedream[ -]5\.0[ -]Pro/i)
    assert.doesNotMatch(summary.textContent, /GLM/)
    assert.equal(screen.getByLabelText(/论文方法内容/u).value, '保留完整的方法输入 ABC')
    assert.equal(screen.getByLabelText(/目标图注/u).value, '保留完整图注 XYZ')
    assert.equal(screen.getByLabelText(/负向提示词（可选）/u).value, '不要替换我的输入')
  }
})


test('an explicitly selected advanced model stays selected while quarantined, cannot be picked as usable, and recovers', async () => {
  const f = backend(), user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.equal(f.requests(), 1))
  assert.equal(screen.queryByText(/模型目录提示/), null)
  assert.equal(screen.queryByRole('button', { name: '重试目录' }), null)
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.click(screen.getByRole('button', { name: /专业模式/ }))
  await user.click(screen.getByRole('button', { name: '图像生成模型', exact: true }))
  await user.click(screen.getByRole('button', { name: '选择 Seedream 5.0 lite', exact: true }))
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  f.set('image-disabled')
  await f.refresh()
  await screen.findByText(/已保留所选模型/)
  assert.match(screen.getByRole('region', { name: '当前生成设置' }).textContent, /Seedream 5.0 lite/)
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.click(screen.getByRole('button', { name: '图像生成模型', exact: true }))
  assert.equal(screen.queryByRole('button', { name: '选择 Seedream 5.0 lite', exact: true }), null)
  const unavailable = screen.getByRole('region', { name: '暂不可用的模型' })
  assert.match(unavailable.textContent, /Seedream 5.0 lite/)
  assert.match(unavailable.textContent, /目录读取超时/)
  await user.click(screen.getByRole('button', { name: '关闭模型选择' }))
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  f.set('ready')
  await f.refresh()
  await waitFor(() => assert.equal(screen.queryByText(/已保留所选模型/), null))
  assert.match(screen.getByRole('region', { name: '当前生成设置' }).textContent, /Seedream 5.0 lite/)
})

test('quarantined TokenDance models remain searchable with reasons and recover without changing selection', async () => {
  const user = userEvent.setup(), changes = []
  const model = { id: 'deepseek-chat-v3-0324', label: 'DeepSeek V3', vendor: '深度求索', roles: ['main'], selectable: false, disabledReason: 'supported_protocols 返回 null，已暂停调用；请稍后重试目录。' }
  const props = { label: '主模型', role: 'main', provider: 'tokendance', value: 'qwen3.8-flash', onChange: id => changes.push(id), models: [
    { id: 'qwen3.8-flash', label: 'Qwen 3.8 Flash', roles: ['main'], selectable: true }, model,
  ] }
  const view = render(React.createElement(ModelPicker, props))
  await user.click(screen.getByRole('button', { name: '主模型', exact: true }))
  await waitFor(() => assert.ok(document.activeElement === screen.getByRole('button', { name: '关闭模型选择' })))
  await user.type(screen.getByRole('searchbox', { name: '搜索主模型' }), model.id)
  assert.equal(screen.getByRole('searchbox', { name: '搜索主模型' }).value, model.id)
  assert.match(screen.getByRole('region', { name: '暂不可用的模型' }).textContent, /supported_protocols 返回 null/)
  assert.equal(screen.queryByRole('button', { name: '选择 DeepSeek V3' }), null)
  assert.deepEqual(changes, [])
  view.rerender(React.createElement(ModelPicker, { ...props, models: [props.models[0], { ...model, selectable: true, disabledReason: '' }] }))
  assert.equal(screen.queryByRole('region', { name: '暂不可用的模型' }), null)
  assert.ok(screen.getByRole('button', { name: '选择 DeepSeek V3' }))
  assert.deepEqual(changes, [])
})

test('compact picker reaches reasons when every TokenDance model is quarantined', async () => {
  const previous = window.matchMedia
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  try {
    const user = userEvent.setup()
    render(React.createElement(ModelPicker, { label: '主模型', role: 'main', provider: 'tokendance', value: 'deepseek-chat-v3-0324', onChange() { assert.fail('must not select quarantined model') }, models: [
      { id: 'deepseek-chat-v3-0324', label: 'DeepSeek V3', vendor: '深度求索', roles: ['main'], selectable: false, disabledReason: '目录读取超时，请稍后重试目录。' },
    ] }))
    await user.click(screen.getByRole('button', { name: '主模型', exact: true }))
    await user.click(screen.getByRole('button', { name: /观猹/ }))
    await user.click(screen.getByRole('button', { name: '厂商 深度求索' }))
    assert.match(screen.getByRole('region', { name: '暂不可用的模型' }).textContent, /目录读取超时/)
    assert.equal(screen.queryByRole('button', { name: '选择 DeepSeek V3' }), null)
  } finally { window.matchMedia = previous }
})
