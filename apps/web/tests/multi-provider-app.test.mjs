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
        { id: 'wan2.7-image-pro', label: 'Wan Image', vendor: 'Alibaba Wan', roles: ['image'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K', '4K'], refineResolutions: ['1K', '2K'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
    openai: {
      accessKind: 'direct', routeContractVersion: 1, accountCatalogRequired: false,
      defaults: { main: 'gpt-5.6-sol', image: 'gpt-image-2', vision: 'gpt-5.6-sol' },
      models: [
        { id: 'gpt-5.6-sol', label: 'OpenAI Main', vendor: 'OpenAI', roles: ['main', 'vision'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: {} },
        { id: 'gpt-image-2', label: 'OpenAI Image', vendor: 'OpenAI', roles: ['image'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K', '4K'], refineResolutions: ['2K'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
    gemini: {
      accessKind: 'direct', routeContractVersion: 1, accountCatalogRequired: false,
      defaults: { main: 'gemini-3.7-flash', image: 'gemini-3.1-flash-image', vision: 'gemini-3.7-flash' },
      models: [
        { id: 'gemini-3.7-flash', label: 'Google Vision', vendor: 'Google', roles: ['main', 'vision'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: {} },
        { id: 'gemini-3.1-flash-image', label: 'Google Image', vendor: 'Google', roles: ['image'], lifecycle: 'stable', selectable: true, recommended: true, inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K', '4K'], refineResolutions: ['1K', '2K', '4K'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
    ark: {
      accessKind: 'aggregator', routeContractVersion: 1, accountCatalogRequired: true,
      defaults: { main: 'doubao-text', image: 'doubao-image', vision: 'doubao-vision' },
      models: [
        { id: 'doubao-text', label: 'Doubao Main', vendor: 'ByteDance Doubao', roles: ['main'], lifecycle: 'stable', selectable: true, recommended: true, verified: false, capabilities: {} },
        { id: 'doubao-vision', label: 'Doubao Vision', vendor: 'ByteDance Doubao', roles: ['vision'], lifecycle: 'stable', selectable: true, recommended: true, verified: false, inputModalities: ['text', 'image'], capabilities: {} },
        { id: 'doubao-image', label: 'Seedream Image', vendor: 'ByteDance Seedream', roles: ['image'], lifecycle: 'stable', selectable: true, recommended: true, verified: false, inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K', '2K', '4K'], refineResolutions: ['1K', '2K', '4K'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
  },
}

let restoreFetch = null

function installBackend(registry = registryV1, options = {}) {
  const requests = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null
    requests.push({ url: String(input), body })
    if (!body) return Response.json({ code: 0, runtime: 'laf' })
    if (body.action === 'modelRegistry') return Response.json({ code: 0, ...registry })
    if (body.action === 'providerAccountCatalog') {
      if (options.providerAccountCatalog) return options.providerAccountCatalog(body)
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
    if (body.action === 'refineImage') return Response.json({ code: 0, jobId: `refine-${requests.length}`, status: 'queued' })
    if (body.action === 'getJob') {
      if (options.getJob) return Response.json({ code: 0, job: options.getJob(body) })
      return Response.json({ code: 0, job: { id: body.jobId, status: 'succeeded', resultImages: [], stages: [] } })
    }
    throw new Error(`unexpected request ${JSON.stringify(body)}`)
  }
  restoreFetch = () => { globalThis.fetch = previousFetch }
  return requests
}

async function renderReadyApp(registry = registryV1, options = {}) {
  const requests = installBackend(registry, options)
  const user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))
  const defaultImageId = registry.providers.bailian.defaults.image
  const defaultImageLabel = registry.providers.bailian.models.find((model) => model.id === defaultImageId)?.label
  await waitFor(() => assert.ok(defaultImageLabel && document.body.textContent.includes(defaultImageLabel)))
  return { requests, user }
}

function deferred() {
  let resolve
  const promise = new Promise((next) => { resolve = next })
  return { promise, resolve }
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

test('generation settings drawer never steals focus after the user enters a credential field', async () => {
  const { user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  const keyInput = screen.getByLabelText('阿里百炼 接入密钥')
  keyInput.focus()
  assert.equal(document.activeElement === keyInput, true)
  await new Promise((resolve) => setTimeout(resolve, 120))
  assert.equal(document.activeElement === keyInput, true)
})

test('simple mode uses one access channel default routes and sends only its reachable key', async () => {
  const { requests, user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  const modeGroup = screen.getByRole('group', { name: '使用模式' })
  assert.equal(modeGroup.querySelector('button[aria-pressed="true"]')?.textContent.includes('普通模式'), true)
  const providerGroup = screen.getByRole('group', { name: 'API 接入渠道' })
  assert.equal(providerGroup.querySelector('button[aria-pressed="true"]')?.textContent.includes('阿里百炼'), true)
  assert.ok(screen.getByText('接入凭据'))
  await new Promise((resolve) => setTimeout(resolve, 100))
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
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
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
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
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

  await user.click(screen.getByLabelText('会按所选图片模型的最低支持分辨率产生一次图片调用费用'))
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

test('Ark discards an in-flight verification response after the key changes', async () => {
  const gate = deferred()
  const requests = installBackend(registryV1, {
    providerAccountCatalog: () => gate.promise,
  })
  const user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))

  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.click(screen.getByRole('button', { name: '火山方舟' }))
  const keyInput = screen.getByLabelText('火山方舟 接入密钥')
  await user.type(keyInput, 'first-key')
  await user.click(screen.getByRole('button', { name: '验证所选模型' }))
  await waitFor(() => assert.equal(requests.filter((request) => request.body?.action === 'providerAccountCatalog').length, 1))

  fireEvent.change(keyInput, { target: { value: 'replacement-key' } })
  gate.resolve(Response.json({
    code: 0,
    provider: 'ark',
    probeResults: [
      { role: 'main', modelId: 'doubao-text', state: 'verified' },
      { role: 'vision', modelId: 'doubao-vision', state: 'verified' },
    ],
  }))

  await waitFor(() => assert.equal(screen.getByRole('button', { name: '验证所选模型' }).disabled, false))
  assert.equal(screen.queryAllByText('已验证').length, 0)
})

test('Ark stale completion releases its own busy state after generation switches to refine', async () => {
  const gate = deferred()
  const requests = installBackend(registryV1, {
    providerAccountCatalog: () => gate.promise,
  })
  const user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))

  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.click(screen.getByRole('button', { name: '火山方舟' }))
  await user.type(screen.getByLabelText('火山方舟 接入密钥'), 'context-key')
  await user.click(screen.getByRole('button', { name: '验证所选模型' }))
  await waitFor(() => assert.equal(requests.filter((request) => request.body?.action === 'providerAccountCatalog').length, 1))

  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  await user.click(await screen.findByRole('button', { name: '精修设置' }))
  await user.click(screen.getByLabelText('会按所选图片模型的最低支持分辨率产生一次图片调用费用'))
  const verifyButton = screen.getByRole('button', { name: '验证所选模型' })
  assert.equal(verifyButton.disabled, true)

  gate.resolve(Response.json({
    code: 0,
    provider: 'ark',
    probeResults: [
      { role: 'main', modelId: 'doubao-text', state: 'verified' },
      { role: 'vision', modelId: 'doubao-vision', state: 'verified' },
    ],
  }))

  await waitFor(() => assert.equal(verifyButton.disabled, false))
  assert.equal(screen.queryAllByText('已验证').length, 0)
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  await user.click(screen.getByRole('button', { name: '生成候选图' }))
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  assert.equal(screen.queryAllByText('已验证').length, 0, 'stale generation probes must not be restored after returning from refine')
})

test('an older Ark completion cannot clear the busy state owned by a newer request', async () => {
  const firstGate = deferred()
  const secondGate = deferred()
  let probeRequestCount = 0
  const requests = installBackend(registryV1, {
    providerAccountCatalog: () => [firstGate, secondGate][probeRequestCount++].promise,
  })
  const user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))

  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.click(screen.getByRole('button', { name: '火山方舟' }))
  const keyInput = screen.getByLabelText('火山方舟 接入密钥')
  await user.type(keyInput, 'first-key')
  const verifyButton = screen.getByRole('button', { name: '验证所选模型' })
  await user.click(verifyButton)
  await waitFor(() => assert.equal(probeRequestCount, 1))

  fireEvent.change(keyInput, { target: { value: 'second-key' } })
  await user.click(verifyButton)
  await waitFor(() => assert.equal(probeRequestCount, 2))
  assert.ok(verifyButton.querySelector('.spin'))

  firstGate.resolve(Response.json({ code: 0, provider: 'ark', probeResults: [] }))
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.ok(verifyButton.querySelector('.spin'), 'older completion must not clear the newer request spinner')

  secondGate.resolve(Response.json({ code: 0, provider: 'ark', probeResults: [] }))
  await waitFor(() => assert.equal(Boolean(verifyButton.querySelector('.spin')), false))
})

test('SVG generation rejects a disabled image route even though image execution is unreachable', async () => {
  const invalidRegistry = structuredClone(registryV1)
  const image = invalidRegistry.providers.bailian.models.find((model) => model.id === 'wan2.7-image-pro')
  image.selectable = false
  image.disabledReason = '图像模型已停用'
  const { requests, user } = await renderReadyApp(invalidRegistry)
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.selectOptions(screen.getByLabelText('导出格式'), 'svg')
  await user.type(screen.getByLabelText('阿里百炼 接入密钥'), 'bailian-key')
  await user.click(submitButton())

  assert.equal(requests.some((request) => request.body?.action === 'createJob'), false)
  assert.ok(screen.getByText('图像模型已停用'))
})

test('legacy registry keeps simple fallback without explicit routes', async () => {
  const legacyRegistry = { ...registryV1, routeContractVersion: 0, supportsModelRoutes: false }
  const { requests, user } = await renderReadyApp(legacyRegistry)
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
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

test('refine resolution choices use refine metadata while generation keeps its separate resolution metadata', async () => {
  const { user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  assert.deepEqual([...screen.getByLabelText('输出清晰度').options].map((option) => option.value), ['1K', '2K', '4K'])
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))

  await user.click(screen.getByRole('button', { name: '精修图片' }))
  const refineResolutionSelect = await screen.findByLabelText('清晰度')
  assert.deepEqual([...refineResolutionSelect.options].map((option) => option.value), ['1K', '2K'])

  await user.click(screen.getByRole('button', { name: '精修设置' }))
  await user.click(screen.getByRole('button', { name: 'OpenAI' }))
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  assert.deepEqual([...screen.getByLabelText('清晰度').options].map((option) => option.value), ['2K'])
})

test('Gemini and Ark expose their declared 4K refine capability', async () => {
  const { user } = await renderReadyApp()
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  await user.click(await screen.findByRole('button', { name: '精修设置' }))
  await user.click(screen.getByRole('button', { name: 'Google Gemini API' }))
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  assert.deepEqual([...screen.getByLabelText('清晰度').options].map((option) => option.value), ['1K', '2K', '4K'])

  await user.click(screen.getByRole('button', { name: '精修设置' }))
  await user.click(screen.getByRole('button', { name: '火山方舟' }))
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  assert.deepEqual([...screen.getByLabelText('清晰度').options].map((option) => option.value), ['1K', '2K', '4K'])
})

test('legacy registry without refine resolution metadata fails safe to 2K only', async () => {
  const legacyRegistry = structuredClone(registryV1)
  delete legacyRegistry.providers.bailian.models.find((model) => model.id === 'wan2.7-image-pro').capabilities.refineResolutions
  const { user } = await renderReadyApp(legacyRegistry)
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  const refineResolutionSelect = await screen.findByLabelText('清晰度')
  assert.deepEqual([...refineResolutionSelect.options].map((option) => option.value), ['2K'])
})

test('model without supported refine resolutions shows an honest disabled capability state', async () => {
  const unsupportedRegistry = structuredClone(registryV1)
  unsupportedRegistry.providers.bailian.models.find((model) => model.id === 'wan2.7-image-pro').capabilities.refineResolutions = []
  const { user } = await renderReadyApp(unsupportedRegistry)
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  assert.ok((await screen.findAllByText(/未声明可执行的精修清晰度/)).length >= 1)
  assert.equal(screen.queryByLabelText('清晰度'), null)
  assert.equal(screen.getByRole('button', { name: '提交精修' }).disabled, true)
})

test('switching from a 4K refine model to a 2K-only model normalizes before rendered submit', async () => {
  const { requests, user } = await renderReadyApp(registryV1, {
    getJob: ({ jobId }) => ({
      id: jobId,
      status: 'succeeded',
      outputFormat: 'png',
      resultImages: [{ filename: 'result.png', candidateId: 0, mimeType: 'image/png', url: '/result.png', objectKey: `jobs/${jobId}/result.png` }],
      stages: [],
    }),
  })
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.type(screen.getByLabelText('阿里百炼 接入密钥'), 'bailian-key')
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  await user.click(submitButton())
  await user.click(await screen.findByRole('button', { name: '精修候选图 1' }, { timeout: 5_000 }))

  await user.click(await screen.findByRole('button', { name: '精修设置' }))
  await user.click(screen.getByRole('button', { name: 'Google Gemini API' }))
  await user.type(screen.getByLabelText('Google Gemini API 接入密钥'), 'gemini-key')
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  await user.selectOptions(screen.getByLabelText('清晰度'), '4K')

  await user.click(screen.getByRole('button', { name: '精修设置' }))
  await user.click(screen.getByRole('button', { name: 'OpenAI' }))
  await user.type(screen.getByLabelText('OpenAI 接入密钥'), 'openai-key')
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  await waitFor(() => assert.equal(screen.getByLabelText('清晰度').value, '2K'))
  await user.type(screen.getByLabelText('精修指令'), '放大标签并保持版式')
  await user.click(screen.getByRole('button', { name: '提交精修' }))

  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'refineImage')))
  assert.equal(requests.find((request) => request.body?.action === 'refineImage').body.imageSize, '2K')
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
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.selectOptions(screen.getByLabelText('导出格式'), 'svg')
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  await user.click(screen.getByRole('button', { name: '精修图片' }))
  await user.selectOptions(await screen.findByLabelText('清晰度'), '1K')
  await user.click(screen.getByRole('button', { name: '目标比例 1:1' }))
  await user.click(await screen.findByRole('button', { name: '精修设置' }))
  assert.equal(screen.queryByLabelText('导出格式'), null)
  assert.equal(screen.queryByLabelText('输出清晰度'), null)
  assert.ok(screen.getByText(/精修固定输出 PNG/))
  await user.click(screen.getByRole('button', { name: /专业模式/ }))
  await user.click(screen.getByRole('button', { name: '图像生成模型' }))
  const modelBrowser = screen.getByRole('region', { name: '具体模型列表' })
  assert.ok([...modelBrowser.querySelectorAll('button')].some((button) => button.textContent.includes('Wan Image')))
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  assert.equal(screen.getByLabelText('清晰度').value, '1K')
  assert.equal(screen.getByRole('button', { name: '目标比例 1:1' }).getAttribute('aria-pressed'), 'true')
})
