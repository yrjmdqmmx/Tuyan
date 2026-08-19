import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'

const registryV1 = {
  registryVersion: 'routing-test-v1',
  routeContractVersion: 1,
  supportsModelRoutes: true,
  providers: {
    bailian: {
      accessKind: 'aggregator', routeContractVersion: 1, accountCatalogRequired: true,
      defaults: { main: 'qwen3.8-max', image: 'wan2.7-image-pro', vision: 'qwen3.7-plus' },
      models: [
        { id: 'qwen3.8-max', label: 'Qwen Main', vendor: 'Alibaba Qwen', roles: ['main'], lifecycle: 'stable', selectable: true, recommended: true, capabilities: {} },
        { id: 'qwen3.7-plus', label: 'Qwen Vision', vendor: 'Alibaba Qwen', roles: ['main', 'vision'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: {} },
        { id: 'wan2.7-image-pro', label: 'Wan Image', vendor: 'Alibaba Wan', roles: ['image'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K', '4K'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
    openai: {
      accessKind: 'direct', routeContractVersion: 1, accountCatalogRequired: false,
      defaults: { main: 'gpt-5.6-sol', image: 'gpt-image-2', vision: 'gpt-5.6-sol' },
      models: [
        { id: 'gpt-5.6-sol', label: 'OpenAI Main', vendor: 'OpenAI', roles: ['main', 'vision'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: {} },
        { id: 'gpt-image-2', label: 'OpenAI Image', vendor: 'OpenAI', roles: ['image'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K', '4K'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
    gemini: {
      accessKind: 'direct', routeContractVersion: 1, accountCatalogRequired: false,
      defaults: { main: 'gemini-3.7-flash', image: 'gemini-3.1-flash-image', vision: 'gemini-3.7-flash' },
      models: [
        { id: 'gemini-3.7-flash', label: 'Google Vision', vendor: 'Google', roles: ['main', 'vision'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: {} },
        { id: 'gemini-3.1-flash-image', label: 'Google Image', vendor: 'Google', roles: ['image'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K', '4K'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
    ark: {
      accessKind: 'aggregator', routeContractVersion: 1, accountCatalogRequired: true,
      defaults: { main: 'doubao-text', image: 'doubao-image', vision: 'doubao-vision' },
      models: [
        { id: 'doubao-text', label: 'Doubao Main', vendor: 'ByteDance Doubao', roles: ['main'], lifecycle: 'stable', selectable: true, recommended: true, verified: false, capabilities: {} },
        { id: 'doubao-vision', label: 'Doubao Vision', vendor: 'ByteDance Doubao', roles: ['vision'], lifecycle: 'stable', selectable: true, recommended: true, verified: false, inputModalities: ['text', 'image'], capabilities: {} },
        { id: 'doubao-image', label: 'Seedream Image', vendor: 'ByteDance Seedream', roles: ['image'], lifecycle: 'stable', selectable: true, recommended: true, verified: false, inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K', '4K'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
  },
}

let restoreFetch = null

function installBackend(registry = registryV1) {
  const requests = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null
    requests.push({ url: String(input), body })
    if (!body) return Response.json({ code: 0, runtime: 'laf' })
    if (body.action === 'modelRegistry') return Response.json({ code: 0, ...registry })
    if (body.action === 'providerAccountCatalog') {
      return Response.json({
        code: 0,
        provider: 'ark',
        accountCatalogAvailable: false,
        catalogAuth: 'access-key-required',
        verificationMode: 'inference-smoke',
        providerRegistry: registry.providers.ark,
        probeResults: body.probes.map((probe) => ({ ...probe, state: 'verified', accountAvailable: true, verifiedBy: 'inference-smoke' })),
      })
    }
    if (body.action === 'createJob') return Response.json({ code: 0, jobId: `job-${requests.length}`, status: 'queued' })
    if (body.action === 'getJob') return Response.json({ code: 0, job: { id: body.jobId, status: 'succeeded', resultImages: [], stages: [] } })
    throw new Error(`unexpected request ${JSON.stringify(body)}`)
  }
  restoreFetch = () => { globalThis.fetch = previousFetch }
  return requests
}

async function renderReadyApp(registry = registryV1) {
  const requests = installBackend(registry)
  const user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))
  return { requests, user }
}

function submitButton() {
  return screen.getAllByRole('button', { name: '生成候选图' }).find((button) => button.type === 'submit')
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  restoreFetch?.()
  restoreFetch = null
})

test('simple mode uses one access channel default routes and sends only its reachable key', async () => {
  const { requests, user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '生成设置' }))
  assert.ok(screen.getByText('接入凭据'))
  await user.type(screen.getByLabelText('阿里百炼 接入密钥'), 'bailian-key')
  await user.click(submitButton())
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'createJob')))
  const body = requests.find((request) => request.body?.action === 'createJob').body
  assert.equal(body.configurationMode, 'simple')
  assert.equal(body.provider, 'bailian')
  assert.deepEqual(body.apiKeys, { bailian: 'bailian-key' })
  assert.deepEqual(body.modelRoutes, {
    main: { accessProvider: 'bailian', modelId: 'qwen3.8-max' },
    image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
    vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
  })
  assert.equal(body.mainModelName, body.modelRoutes.main.modelId)
  assert.equal(body.imageModelName, body.modelRoutes.image.modelId)
  assert.equal(body.referenceVisionModelName, body.modelRoutes.vision.modelId)
})

test('advanced mode selects mixed provider routes and deduplicates involved credentials', async () => {
  const { requests, user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '生成设置' }))
  await user.click(screen.getByRole('button', { name: /专业模式/ }))

  await user.click(screen.getByRole('button', { name: '主模型' }))
  await user.click(screen.getByRole('button', { name: 'OpenAI' }))
  await user.click(screen.getByRole('button', { name: /OpenAI Main/ }))
  await user.click(screen.getByRole('button', { name: '参考图识别模型' }))
  await user.click(screen.getByRole('button', { name: 'Google Gemini API' }))
  await user.click(screen.getByRole('button', { name: /Google Vision/ }))

  await user.type(screen.getByLabelText('OpenAI 接入密钥'), 'openai-key')
  await user.type(screen.getByLabelText('阿里百炼 接入密钥'), 'bailian-key')
  await user.type(screen.getByLabelText('Google Gemini API 接入密钥'), 'google-key')
  await user.click(submitButton())
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'createJob')))
  const body = requests.find((request) => request.body?.action === 'createJob').body
  assert.equal(body.configurationMode, 'advanced')
  assert.equal(body.provider, 'openai')
  assert.deepEqual(body.apiKeys, { openai: 'openai-key', bailian: 'bailian-key', gemini: 'google-key' })
  assert.deepEqual(body.modelRoutes, {
    main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
    vision: { accessProvider: 'gemini', modelId: 'gemini-3.7-flash' },
  })
})

test('Ark never probes on key input, requires paid confirmation, gates submit, and clears verification when key changes', async () => {
  const { requests, user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '生成设置' }))
  await user.click(screen.getByRole('button', { name: '火山方舟' }))
  await user.type(screen.getByLabelText('火山方舟 接入密钥'), 'ark-key')
  assert.equal(requests.some((request) => request.body?.action === 'providerAccountCatalog'), false)

  await user.click(submitButton())
  assert.equal(requests.some((request) => request.body?.action === 'createJob'), false)
  assert.ok(screen.getAllByText(/验证所选 Ark 模型/).length >= 1)
  const verifyButton = screen.getByRole('button', { name: '验证所选模型' })
  assert.equal(verifyButton.disabled, false)
  await user.click(verifyButton)
  await waitFor(() => assert.equal(requests.filter((request) => request.body?.action === 'providerAccountCatalog').length, 1))
  const freeProbe = requests.find((request) => request.body?.action === 'providerAccountCatalog').body
  assert.equal(freeProbe.confirmPaidImageProbe, false)
  assert.deepEqual(freeProbe.probes.map(({ role, modelId }) => [role, modelId]), [
    ['main', 'doubao-text'], ['vision', 'doubao-vision'],
  ])
  await user.click(submitButton())
  assert.equal(requests.some((request) => request.body?.action === 'createJob'), false)

  await user.click(screen.getByLabelText('会产生一次 1K 图片调用费用'))
  assert.equal(verifyButton.disabled, false)
  await user.click(verifyButton)
  await waitFor(() => assert.equal(requests.filter((request) => request.body?.action === 'providerAccountCatalog').length, 2))
  const probe = requests.filter((request) => request.body?.action === 'providerAccountCatalog')[1].body
  assert.equal(probe.confirmPaidImageProbe, true)
  assert.deepEqual(probe.probes.map(({ role, modelId }) => [role, modelId]), [
    ['image', 'doubao-image'],
  ])

  await user.click(submitButton())
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'createJob')))
  const firstCreateCount = requests.filter((request) => request.body?.action === 'createJob').length
  fireEvent.change(screen.getByLabelText('火山方舟 接入密钥'), { target: { value: 'changed-key' } })
  await user.click(submitButton())
  assert.equal(requests.filter((request) => request.body?.action === 'createJob').length, firstCreateCount)
  assert.ok(screen.getAllByText(/验证所选 Ark 模型/).length >= 1)
})

test('legacy registry keeps simple fallback without explicit routes', async () => {
  const legacyRegistry = { ...registryV1, routeContractVersion: 0, supportsModelRoutes: false }
  const { requests, user } = await renderReadyApp(legacyRegistry)
  await user.click(screen.getByRole('button', { name: '生成设置' }))
  await user.type(screen.getByLabelText('阿里百炼 接入密钥'), 'legacy-key')
  await user.click(submitButton())
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'createJob')))
  const body = requests.find((request) => request.body?.action === 'createJob').body
  assert.equal(body.modelRoutes, undefined)
  assert.equal(body.provider, 'bailian')
  assert.equal(body.mainModelName, 'qwen3.8-max')
  assert.equal(body.imageModelName, 'wan2.7-image-pro')
  assert.equal(body.referenceVisionModelName, 'qwen3.7-plus')
})

test('refine tab independently shows route summary and opens shared settings focused on refine models and credentials', async () => {
  const { user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  assert.ok(await screen.findByText(/图像：阿里百炼 · Wan Image/))
  assert.ok(screen.getByText(/视觉：阿里百炼 · Qwen Vision/))
  await user.click(screen.getByRole('button', { name: '精修设置' }))
  assert.ok(screen.getByRole('dialog', { name: /生成设置/ }))
  assert.ok(screen.getByRole('button', { name: /普通模式/ }).classList.contains('active'))
  assert.ok(screen.getByText('接入凭据'))
  assert.ok(screen.getByLabelText('阿里百炼 接入密钥'))
})

test('opening refine settings preserves legacy simple routing instead of forcing unsupported advanced mode', async () => {
  const legacyRegistry = { ...registryV1, routeContractVersion: 0, supportsModelRoutes: false }
  const { user } = await renderReadyApp(legacyRegistry)
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  await user.click(await screen.findByRole('button', { name: '精修设置' }))
  assert.ok(screen.getByRole('button', { name: /普通模式/ }).classList.contains('active'))
  assert.equal(screen.queryByText(/当前后端不支持专业模式/), null)
})

test('refine model selection stays PNG-capable after the generation output was changed to SVG', async () => {
  const { user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '生成设置' }))
  await user.selectOptions(screen.getByLabelText('导出格式'), 'svg')
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  await user.click(await screen.findByRole('button', { name: '精修设置' }))
  await user.click(screen.getByRole('button', { name: /专业模式/ }))
  await user.click(screen.getByRole('button', { name: '图像生成模型' }))
  const modelBrowser = screen.getByRole('region', { name: '具体模型列表' })
  assert.ok([...modelBrowser.querySelectorAll('button')].some((button) => button.textContent.includes('Wan Image')))
})
