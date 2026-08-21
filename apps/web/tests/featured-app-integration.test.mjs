import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import { FEATURED_TEMPLATE_REFERENCE_IDS, FEATURED_TEMPLATES } from '../src/lib/featuredTemplates.js'

const registry = {
  registryVersion: 'featured-test-v1',
  routeContractVersion: 1,
  supportsModelRoutes: true,
  providers: {
    bailian: {
      accessKind: 'aggregator', routeContractVersion: 1, accountCatalogRequired: false,
      defaults: { main: 'main', image: 'image', vision: 'vision' },
      models: [
        { id: 'main', label: '主模型 Alpha', vendor: 'Qwen', roles: ['main'], selectable: true, lifecycle: 'stable', capabilities: {} },
        { id: 'vision', label: '识图模型 Beta', vendor: 'Qwen', roles: ['vision'], selectable: true, lifecycle: 'stable', capabilities: {} },
        { id: 'image', label: '图像模型 Gamma', vendor: 'Wan', roles: ['image'], selectable: true, lifecycle: 'stable', inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K'], refineResolutions: ['2K'], aspectRatios: ['1:1', '3:2', '16:9', '4:1'], refineAspectRatios: ['1:1', '2:3', '16:9'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
    openai: {
      accessKind: 'direct', routeContractVersion: 1, accountCatalogRequired: false,
      defaults: { main: 'openai-main', image: 'openai-image', vision: 'openai-main' },
      models: [
        { id: 'openai-main', label: 'OpenAI Main', vendor: 'OpenAI', roles: ['main', 'vision'], selectable: true, lifecycle: 'stable', inputModalities: ['text', 'image'], capabilities: {} },
        { id: 'openai-image', label: 'OpenAI Image', vendor: 'OpenAI', roles: ['image'], selectable: true, lifecycle: 'stable', inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K'], refineResolutions: ['2K'], aspectRatios: ['1:1', '16:9'], refineAspectRatios: ['1:1'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
  },
}

let restoreFetch

function installBackend({ failFeatured = false } = {}) {
  const requests = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null
    requests.push({ url: String(input), body })
    if (!body) return Response.json({ code: 0, runtime: 'laf' })
    if (body.action === 'modelRegistry') return Response.json({ code: 0, ...registry })
    if (body.action === 'referenceLibrary') {
      if (failFeatured) return Response.json({ code: 500, error: 'featured unavailable' })
      return Response.json({
        code: 0,
        references: FEATURED_TEMPLATE_REFERENCE_IDS.map((id) => ({ id, imageUrl: `https://images.example/${id}.png` })),
      })
    }
    if (body.action === 'createJob') return Response.json({ code: 0, jobId: 'featured-job', status: 'queued' })
    if (body.action === 'getJob') return Response.json({ code: 0, job: { id: 'featured-job', status: 'succeeded', resultImages: [], stages: [] } })
    throw new Error(`unexpected request ${JSON.stringify(body)}`)
  }
  restoreFetch = () => { globalThis.fetch = previousFetch }
  return requests
}

async function renderReady(options) {
  const requests = installBackend(options)
  const user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'referenceLibrary')))
  return { requests, user }
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  restoreFetch?.()
  restoreFetch = null
})

test('App fetches featured references once by exact IDs only and uses returned images', async () => {
  const { requests } = await renderReady()
  const featured = requests.filter((request) => request.body?.action === 'referenceLibrary')
  assert.equal(featured.length, 1)
  assert.deepEqual(featured[0].body, { action: 'referenceLibrary', referenceIds: FEATURED_TEMPLATE_REFERENCE_IDS })
  await waitFor(() => assert.ok(screen.getByAltText(`${FEATURED_TEMPLATES[0].title}参考图`)))
})

test('featured request failure leaves all six usable with polished artwork fallbacks', async () => {
  const { user } = await renderReady({ failFeatured: true })
  assert.ok(screen.getAllByText('结构预览').length >= 1)
  await user.click(screen.getByRole('button', { name: '浏览模板' }))
  assert.equal(screen.getByRole('dialog', { name: '精选模板库' }).querySelectorAll('.featured-template-card').length, 6)
})

test('initial sample is clean, then edited text requires confirmation and cancel preserves exact input', async () => {
  const { user } = await renderReady()
  await user.click(screen.getByRole('button', { name: '浏览模板' }))
  await user.click(screen.getByRole('button', { name: `预览模板 ${FEATURED_TEMPLATES[1].title}` }))
  await user.click(screen.getByRole('button', { name: '套用到输入区' }))
  assert.equal(screen.queryByRole('dialog', { name: '替换输入内容？' }), null)
  assert.equal(screen.getByLabelText(/论文方法内容/u).value, FEATURED_TEMPLATES[1].methodContent)
  assert.equal(screen.getByLabelText(/目标图注/u).value, FEATURED_TEMPLATES[1].caption)
  assert.equal(screen.getByLabelText(/负向提示词（可选）/u).value, FEATURED_TEMPLATES[1].negativePrompt)

  fireEvent.change(screen.getByLabelText(/目标图注/u), { target: { value: '我精确修改过的图注' } })
  const exactMethod = screen.getByLabelText(/论文方法内容/u).value
  const exactNegative = screen.getByLabelText(/负向提示词（可选）/u).value
  await user.click(screen.getByRole('button', { name: '浏览模板' }))
  await user.click(screen.getByRole('button', { name: `预览模板 ${FEATURED_TEMPLATES[2].title}` }))
  await user.click(screen.getByRole('button', { name: '套用到输入区' }))
  await user.click(screen.getByRole('button', { name: '取消' }))
  assert.equal(screen.getByLabelText(/论文方法内容/u).value, exactMethod)
  assert.equal(screen.getByLabelText(/目标图注/u).value, '我精确修改过的图注')
  assert.equal(screen.getByLabelText(/负向提示词（可选）/u).value, exactNegative)
})

test('prominent settings summary opens full settings and negative prompt is counted and submitted with simple-mode ratio', async () => {
  const { requests, user } = await renderReady()
  const summary = screen.getByRole('region', { name: '当前生成设置' })
  assert.match(summary.textContent, /主模型 Alpha/u)
  assert.match(summary.textContent, /图像模型 Gamma/u)
  assert.match(summary.textContent, /识图模型 Beta/u)
  assert.match(summary.textContent, /16:9/u)
  assert.match(summary.textContent, /1K/u)
  assert.match(summary.textContent, /PNG/u)
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  assert.ok(screen.getByRole('dialog', { name: /生成设置/u }))
  await user.click(screen.getByRole('button', { name: '画面比例 4:1' }))
  await user.type(screen.getByLabelText('阿里百炼 接入密钥'), 'test-key')
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))

  const negative = screen.getByLabelText(/负向提示词（可选）/u)
  await user.clear(negative)
  await user.type(negative, '不要拥挤文字与模糊箭头')
  assert.ok(screen.getByText('11 / 1,000 字符'))
  await user.click(screen.getAllByRole('button', { name: '生成候选图' }).find((button) => button.type === 'submit'))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'createJob')))
  const create = requests.find((request) => request.body?.action === 'createJob').body
  assert.equal(create.negativePrompt, '不要拥挤文字与模糊箭头')
  assert.equal(create.aspectRatio, '4:1')
})

test('model capability changes normalize an unsupported fixed ratio to auto', async () => {
  const { user } = await renderReady()
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.click(screen.getByRole('button', { name: '画面比例 4:1' }))
  await user.click(screen.getByRole('button', { name: 'OpenAI' }))
  await waitFor(() => assert.equal(screen.getByRole('button', { name: '画面比例 自动' }).getAttribute('aria-pressed'), 'true'))
  assert.equal(screen.getByRole('button', { name: /画面比例 4:1，OpenAI Image 不支持 4:1 比例/u }).disabled, true)
})

test('refine panel renders all ratios and consumes refineAspectRatios truthfully', async () => {
  const { user } = await renderReady()
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  assert.equal((await screen.findAllByRole('button', { name: /^目标比例 /u })).length, 11)
  assert.equal(screen.getByRole('button', { name: '目标比例 2:3' }).disabled, false)
  assert.equal(screen.getByRole('button', { name: /目标比例 4:1，图像模型 Gamma 不支持 4:1 比例/u }).disabled, true)
})
