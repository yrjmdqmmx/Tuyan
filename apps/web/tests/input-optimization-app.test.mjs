import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import { FEATURED_TEMPLATES } from '../src/lib/featuredTemplates.js'

const capableRegistry = {
  registryVersion: 'input-optimization-test-v1',
  routeContractVersion: 1,
  inputOptimizationContractVersion: 1,
  supportsModelRoutes: true,
  providers: {
    bailian: {
      accessKind: 'aggregator',
      routeContractVersion: 1,
      accountCatalogRequired: false,
      defaults: { main: 'main', image: 'image', vision: 'vision' },
      models: [
        { id: 'main', label: '主模型', vendor: 'Qwen', roles: ['main'], selectable: true, lifecycle: 'stable', capabilities: {} },
        { id: 'vision', label: '识图模型', vendor: 'Qwen', roles: ['vision'], selectable: true, lifecycle: 'stable', capabilities: {} },
        { id: 'image', label: '图像模型', vendor: 'Wan', roles: ['image'], selectable: true, lifecycle: 'stable', inputModalities: ['text', 'image'], capabilities: { outputFormats: ['png'], resolutions: ['1K'], refineResolutions: ['2K'], aspectRatios: ['16:9'], refineAspectRatios: ['16:9'], imageEditMode: 'direct-edit', referenceImages: true } },
      ],
    },
    openai: {
      accessKind: 'direct',
      routeContractVersion: 1,
      accountCatalogRequired: false,
      defaults: { main: 'openai-main', image: 'openai-image', vision: 'openai-main' },
      models: [
        { id: 'openai-main', label: 'OpenAI Main', vendor: 'OpenAI', roles: ['main', 'vision'], selectable: true, lifecycle: 'stable', capabilities: {} },
        { id: 'openai-image', label: 'OpenAI Image', vendor: 'OpenAI', roles: ['image'], selectable: true, lifecycle: 'stable', capabilities: { outputFormats: ['png'], resolutions: ['1K'], refineResolutions: ['2K'], imageEditMode: 'direct-edit' } },
      ],
    },
  },
}

let restoreFetch

function deferred() {
  let resolve
  let reject
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

function installBackend(registry = capableRegistry, options = {}) {
  const requests = []
  let optimizationIndex = 0
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null
    requests.push({ url: String(input), body })
    if (!body) return Response.json({ code: 0, runtime: 'laf' })
    if (body.action === 'modelRegistry') return Response.json({ code: 0, ...registry })
    if (body.action === 'referenceLibrary') return Response.json({ code: 0, references: [] })
    if (body.action === 'optimizeInputs') {
      if (options.optimizeInputs) return options.optimizeInputs(body, optimizationIndex++)
      return Response.json({ code: 0, target: body.target, optimizedText: `优化后的${body.target}` })
    }
    if (body.action === 'createJob') return Response.json({ code: 0, jobId: 'input-optimization-job', status: 'queued' })
    if (body.action === 'getJob') return Response.json({ code: 0, job: { id: body.jobId, status: 'succeeded', resultImages: [], stages: [] } })
    throw new Error(`unexpected request ${JSON.stringify(body)}`)
  }
  restoreFetch = () => { globalThis.fetch = previousFetch }
  return requests
}

async function renderReady(registry = capableRegistry, options = {}) {
  const requests = installBackend(registry, options)
  const user = userEvent.setup()
  render(React.createElement(App))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))
  await screen.findByRole('button', { name: '优化输入：方法栏' })
  return { requests, user }
}

async function enterMainKey(user, value = ' single-main-key ') {
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.type(screen.getByLabelText('阿里百炼 接入密钥'), value)
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
}

async function configureAdvancedVanillaOpenAiMain(user) {
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  await user.click(screen.getByRole('button', { name: /专业模式/u }))
  await user.click(screen.getByRole('button', { name: '主模型' }))
  await user.click(screen.getByRole('button', { name: 'OpenAI' }))
  await user.click(screen.getByRole('button', { name: /OpenAI Main/u }))
  await user.selectOptions(screen.getByLabelText('生成流程'), 'vanilla')
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
}

function optimizationRequests(requests) {
  return requests.filter((request) => request.body?.action === 'optimizeInputs')
}

async function expectCandidate(dialog, value) {
  await waitFor(() => assert.equal(
    within(dialog).getByRole('region', { name: '优化稿，新增内容已标记' }).textContent,
    value,
  ))
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  restoreFetch?.()
  restoreFetch = null
})

test('only a registry that declares input optimization shows all three entry points', async () => {
  const legacyRegistry = structuredClone(capableRegistry)
  delete legacyRegistry.inputOptimizationContractVersion
  const requests = installBackend(legacyRegistry)
  render(React.createElement(App))
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))
  assert.equal(screen.queryByRole('button', { name: /优化输入：方法栏/u }), null)
  assert.equal(screen.queryByRole('button', { name: /优化输入：图注栏/u }), null)
  assert.equal(screen.queryByRole('button', { name: /优化输入：负向提示栏/u }), null)

  cleanup()
  restoreFetch()
  restoreFetch = null
  await renderReady()
  assert.ok(screen.getByRole('button', { name: '优化输入：方法栏' }))
  assert.ok(screen.getByRole('button', { name: '优化输入：图注栏' }))
  assert.ok(screen.getByRole('button', { name: '优化输入：负向提示栏' }))
})

test('blank requirements disable each entry with an accessible reason while an empty negative prompt can use other input context', async () => {
  await renderReady()
  const method = screen.getByLabelText(/论文方法内容/u)
  const caption = screen.getByLabelText(/目标图注/u)
  const negative = screen.getByLabelText(/负向提示词（可选）/u)
  fireEvent.change(method, { target: { value: '   ' } })
  fireEvent.change(caption, { target: { value: '\n' } })
  fireEvent.change(negative, { target: { value: '' } })

  for (const name of ['优化输入：方法栏', '优化输入：图注栏', '优化输入：负向提示栏']) {
    const button = screen.getByRole('button', { name })
    assert.equal(button.disabled, true)
    const reasonId = button.getAttribute('aria-describedby')
    assert.ok(reasonId)
    const reason = document.getElementById(reasonId)
    assert.match(reason?.textContent || '', /填写|至少/u)
    assert.equal(reason?.classList.contains('sr-only'), false)
  }

  fireEvent.change(method, { target: { value: '可作为上下文的方法内容' } })
  assert.equal(screen.getByRole('button', { name: '优化输入：方法栏' }).disabled, false)
  assert.equal(screen.getByRole('button', { name: '优化输入：图注栏' }).disabled, true)
  assert.equal(screen.getByRole('button', { name: '优化输入：负向提示栏' }).disabled, false)
})

test('invalid main route and missing main key open settings at the right focus target without a request', async () => {
  const invalidRegistry = structuredClone(capableRegistry)
  invalidRegistry.providers.bailian.models.find((model) => model.id === 'main').selectable = false
  let setup = await renderReady(invalidRegistry)
  fireEvent.click(screen.getByRole('button', { name: '优化输入：方法栏' }))
  assert.equal(optimizationRequests(setup.requests).length, 0)
  let drawer = screen.getByRole('dialog', { name: /生成设置/u })
  assert.equal(drawer.getAttribute('data-focus-target'), 'main-model')
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(document.activeElement?.closest('[data-focus-setting="main-model"]') !== null, true)
  assert.match(screen.getByRole('alert').textContent, /主模型/u)

  cleanup()
  restoreFetch()
  restoreFetch = null
  setup = await renderReady()
  fireEvent.click(screen.getByRole('button', { name: '优化输入：方法栏' }))
  assert.equal(optimizationRequests(setup.requests).length, 0)
  drawer = screen.getByRole('dialog', { name: /生成设置/u })
  assert.equal(drawer.getAttribute('data-focus-target'), 'api-key')
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(document.activeElement, screen.getByLabelText('阿里百炼 接入密钥'))
  assert.match(screen.getByRole('alert').textContent, /密钥/u)
})

test('advanced vanilla optimization reveals and focuses its otherwise unreachable main-provider key without sending a request', async () => {
  const { requests, user } = await renderReady()
  await configureAdvancedVanillaOpenAiMain(user)

  fireEvent.click(screen.getByRole('button', { name: '优化输入：方法栏' }))

  assert.equal(optimizationRequests(requests).length, 0)
  const drawer = screen.getByRole('dialog', { name: /生成设置/u })
  assert.equal(drawer.getAttribute('data-focus-target'), 'api-key')
  const openAiKey = screen.getByLabelText('OpenAI 接入密钥')
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(document.activeElement, openAiKey)
  assert.ok(screen.getByLabelText('阿里百炼 接入密钥'), 'generation image key remains available')
})

test('closing settings clears the temporary optimization credential provider', async () => {
  const { user } = await renderReady()
  await configureAdvancedVanillaOpenAiMain(user)
  fireEvent.click(screen.getByRole('button', { name: '优化输入：方法栏' }))
  await user.type(screen.getByLabelText('OpenAI 接入密钥'), 'configured-openai-key')

  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))
  await user.click(screen.getByRole('button', { name: '打开完整设置' }))
  assert.equal(screen.queryByLabelText('OpenAI 接入密钥'), null)
  assert.ok(screen.getByLabelText('阿里百炼 接入密钥'))
})

test('temporary optimization credentials never expand vanilla generation key scope', async () => {
  const { requests, user } = await renderReady()
  await configureAdvancedVanillaOpenAiMain(user)
  fireEvent.click(screen.getByRole('button', { name: '优化输入：方法栏' }))
  await user.type(screen.getByLabelText('OpenAI 接入密钥'), 'openai-optimization-key')
  await user.type(screen.getByLabelText('阿里百炼 接入密钥'), 'bailian-image-key')
  await user.click(screen.getByRole('button', { name: '关闭生成设置' }))

  const submit = screen.getAllByRole('button', { name: '生成候选图' }).find((button) => button.type === 'submit')
  await user.click(submit)
  await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'createJob')))
  const create = requests.find((request) => request.body?.action === 'createJob').body
  assert.deepEqual(create.apiKeys, { bailian: 'bailian-image-key' })
  assert.equal(create.modelRoutes.main.accessProvider, 'openai')
})

test('changing the main route clears the temporary optimization credential provider', async () => {
  const { user } = await renderReady()
  await configureAdvancedVanillaOpenAiMain(user)
  fireEvent.click(screen.getByRole('button', { name: '优化输入：方法栏' }))
  assert.ok(screen.getByLabelText('OpenAI 接入密钥'))

  await user.click(screen.getByRole('button', { name: '主模型' }))
  await user.click(screen.getByRole('button', { name: '阿里百炼' }))
  await user.click(screen.getByRole('button', { name: /^主模型main/u }))
  await waitFor(() => assert.equal(screen.queryByLabelText('OpenAI 接入密钥'), null))
  assert.ok(screen.getByLabelText('阿里百炼 接入密钥'))
})

test('a valid click sends only the three-input snapshot, selected main route, and its single trimmed key', async () => {
  const { requests, user } = await renderReady()
  const method = screen.getByLabelText(/论文方法内容/u)
  const caption = screen.getByLabelText(/目标图注/u)
  const negative = screen.getByLabelText(/负向提示词（可选）/u)
  fireEvent.change(method, { target: { value: '本轮方法原文' } })
  fireEvent.change(caption, { target: { value: '本轮图注原文' } })
  fireEvent.change(negative, { target: { value: '本轮负向原文' } })
  await enterMainKey(user)
  await user.click(screen.getByRole('button', { name: '优化输入：图注栏' }))
  await waitFor(() => assert.equal(optimizationRequests(requests).length, 1))
  assert.deepEqual(optimizationRequests(requests)[0].body, {
    action: 'optimizeInputs',
    target: 'caption',
    inputs: {
      methodContent: '本轮方法原文',
      caption: '本轮图注原文',
      negativePrompt: '本轮负向原文',
    },
    mainRoute: { accessProvider: 'bailian', modelId: 'main' },
    apiKey: 'single-main-key',
  })
})

test('loading blocks duplicate calls and closing invalidates a late result until the original request settles', async () => {
  const gate = deferred()
  const { requests, user } = await renderReady(capableRegistry, {
    optimizeInputs: () => gate.promise,
  })
  const original = screen.getByLabelText(/目标图注/u).value
  await enterMainKey(user)
  await user.click(screen.getByRole('button', { name: '优化输入：图注栏' }))
  const dialog = screen.getByRole('dialog', { name: /优化目标图注/u })
  assert.match(within(dialog).getByRole('status').textContent, /正在/u)
  assert.equal(optimizationRequests(requests).length, 1)
  assert.equal(screen.getByRole('button', { name: '优化输入：方法栏' }).disabled, true)
  assert.equal(screen.getByRole('button', { name: '优化输入：图注栏' }).disabled, true)

  await user.click(within(dialog).getByRole('button', { name: '关闭输入优化' }))
  assert.equal(screen.queryByRole('dialog', { name: /优化目标图注/u }), null)
  assert.equal(screen.getByRole('button', { name: '优化输入：方法栏' }).disabled, true)
  await user.click(screen.getByRole('button', { name: '优化输入：方法栏' }))
  assert.equal(optimizationRequests(requests).length, 1)

  gate.resolve(Response.json({ code: 0, target: 'caption', optimizedText: '迟到且必须忽略的候选' }))
  await waitFor(() => assert.equal(screen.getByRole('button', { name: '优化输入：方法栏' }).disabled, false))
  assert.equal(screen.queryByText('迟到且必须忽略的候选'), null)
  assert.equal(screen.getByLabelText(/目标图注/u).value, original)
})

test('error and cancel are lossless, re-optimize replaces the candidate, and adopt changes only its target', async () => {
  const responses = [
    new Error('上游优化失败'),
    '候选版本一',
    '候选版本二',
  ]
  const { requests, user } = await renderReady(capableRegistry, {
    optimizeInputs: (_body, index) => {
      const value = responses[index]
      if (value instanceof Error) throw value
      return Response.json({ code: 0, target: 'caption', optimizedText: value })
    },
  })
  await enterMainKey(user)
  const before = {
    methodContent: screen.getByLabelText(/论文方法内容/u).value,
    caption: screen.getByLabelText(/目标图注/u).value,
    negativePrompt: screen.getByLabelText(/负向提示词（可选）/u).value,
  }

  await user.click(screen.getByRole('button', { name: '优化输入：图注栏' }))
  let dialog = await screen.findByRole('dialog', { name: /优化目标图注/u })
  await waitFor(() => assert.match(within(dialog).getByRole('alert').textContent, /失败/u))
  await user.click(within(dialog).getByRole('button', { name: '取消' }))
  assert.equal(screen.getByLabelText(/目标图注/u).value, before.caption)

  await user.click(screen.getByRole('button', { name: '优化输入：图注栏' }))
  dialog = await screen.findByRole('dialog', { name: /优化目标图注/u })
  await within(dialog).findByText('候选版本一')
  await user.click(within(dialog).getByRole('button', { name: '重新优化' }))
  await within(dialog).findByText('候选版本二')
  assert.equal(optimizationRequests(requests).length, 3)
  assert.deepEqual(optimizationRequests(requests)[1].body.inputs, optimizationRequests(requests)[2].body.inputs)
  await user.click(within(dialog).getByRole('button', { name: '采用优化稿' }))

  assert.equal(screen.getByLabelText(/论文方法内容/u).value, before.methodContent)
  assert.equal(screen.getByLabelText(/目标图注/u).value, '候选版本二')
  assert.equal(screen.getByLabelText(/负向提示词（可选）/u).value, before.negativePrompt)
  assert.ok(screen.getByRole('button', { name: '恢复图注栏优化前内容' }))
})

test('each target supports one-step restore and manual edits or applying a template clear its undo', async () => {
  const { user } = await renderReady()
  await enterMainKey(user)
  const targets = [
    ['论文方法内容', '方法栏', 'methodContent'],
    ['目标图注', '图注栏', 'caption'],
    ['负向提示词', '负向提示栏', 'negativePrompt'],
  ]

  for (const [label, controlLabel, target] of targets) {
    const input = screen.getByLabelText(new RegExp(label, 'u'))
    if (target === 'negativePrompt' && !input.value) fireEvent.change(input, { target: { value: '原始负向内容' } })
    const original = input.value
    await user.click(screen.getByRole('button', { name: `优化输入：${controlLabel}` }))
    const dialog = await screen.findByRole('dialog', { name: new RegExp(`优化${label}`, 'u') })
    await expectCandidate(dialog, `优化后的${target}`)
    await user.click(within(dialog).getByRole('button', { name: '采用优化稿' }))
    assert.equal(input.value, `优化后的${target}`)
    const restore = screen.getByRole('button', { name: `恢复${controlLabel}优化前内容` })
    await user.click(restore)
    assert.equal(input.value, original)
    assert.equal(screen.queryByRole('button', { name: `恢复${controlLabel}优化前内容` }), null)
  }

  await user.click(screen.getByRole('button', { name: '优化输入：图注栏' }))
  let dialog = await screen.findByRole('dialog', { name: /优化目标图注/u })
  await expectCandidate(dialog, '优化后的caption')
  await user.click(within(dialog).getByRole('button', { name: '采用优化稿' }))
  fireEvent.change(screen.getByLabelText(/目标图注/u), { target: { value: '用户手工改写' } })
  assert.equal(screen.queryByRole('button', { name: '恢复图注栏优化前内容' }), null)

  await user.click(screen.getByRole('button', { name: '优化输入：方法栏' }))
  dialog = await screen.findByRole('dialog', { name: /优化论文方法内容/u })
  await expectCandidate(dialog, '优化后的methodContent')
  await user.click(within(dialog).getByRole('button', { name: '采用优化稿' }))
  assert.ok(screen.getByRole('button', { name: '恢复方法栏优化前内容' }))
  await user.click(screen.getByRole('button', { name: '浏览模板' }))
  await user.click(screen.getByRole('button', { name: `预览模板 ${FEATURED_TEMPLATES[1].title}` }))
  await user.click(screen.getByRole('button', { name: '套用到输入区' }))
  await user.click(screen.getByRole('button', { name: '确认替换' }))
  assert.equal(screen.queryByRole('button', { name: /恢复.*优化前内容/u }), null)
})

test('adopting a later optimization replaces the old undo with the target value from that round', async () => {
  const candidates = ['图注候选一', '图注候选二']
  const { user } = await renderReady(capableRegistry, {
    optimizeInputs: (body, index) => Response.json({
      code: 0,
      target: body.target,
      optimizedText: candidates[index],
    }),
  })
  await enterMainKey(user)

  for (const candidate of candidates) {
    await user.click(screen.getByRole('button', { name: '优化输入：图注栏' }))
    const dialog = await screen.findByRole('dialog', { name: /优化目标图注/u })
    await expectCandidate(dialog, candidate)
    await user.click(within(dialog).getByRole('button', { name: '采用优化稿' }))
  }

  await user.click(screen.getByRole('button', { name: '恢复图注栏优化前内容' }))
  assert.equal(screen.getByLabelText(/目标图注/u).value, candidates[0])
})
