import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import GenerationSettingsDrawer from '../src/components/GenerationSettingsDrawer.jsx'
import ModelPicker from '../src/components/ModelPicker.jsx'
import ReferenceLibraryPanel from '../src/components/ReferenceLibraryPanel.jsx'
import ReferenceUploadPanel from '../src/components/ReferenceUploadPanel.jsx'

const bailianRegistry = {
  registryVersion: 'test-v2',
  providers: {
    bailian: {
      defaults: { main: 'main-model', image: 'image-png', vision: 'main-model' },
      models: [
        {
          id: 'main-model', label: 'Main Model', vendor: 'Alibaba Qwen', roles: ['main', 'vision'],
          selectable: true, inputModalities: ['text', 'image'], outputModalities: ['text'], capabilities: {},
        },
        {
          id: 'image-png', label: 'PNG Image Model', vendor: 'Alibaba Wan', roles: ['image'],
          selectable: true, inputModalities: ['text'], outputModalities: ['image'],
          capabilities: { resolutions: ['1K'], outputFormats: ['png'] },
        },
      ],
    },
  },
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

test('rendered SVG submit ignores the image model format because the main model generates SVG', async () => {
  const requests = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null
    requests.push({ url: String(input), body })
    if (!body) return Response.json({ code: 0, runtime: 'laf' })
    if (body.action === 'modelRegistry') return Response.json({ code: 0, ...bailianRegistry })
    if (body.action === 'createJob') return Response.json({ code: 0, jobId: 'job-svg', status: 'queued' })
    if (body.action === 'getJob') return Response.json({ code: 0, job: { id: 'job-svg', status: 'succeeded', resultImages: [], stages: [] } })
    throw new Error(`unexpected request ${JSON.stringify(body)}`)
  }

  try {
    const user = userEvent.setup()
    render(React.createElement(App))
    await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'modelRegistry')))

    await user.click(screen.getByRole('button', { name: '生成设置' }))
    fireEvent.change(screen.getByLabelText('导出格式'), { target: { value: 'svg' } })
    assert.ok(screen.getAllByText(/由主模型直接生成/).length >= 1)
    await user.type(screen.getByPlaceholderText('sk-...'), 'test-key')
    const submit = screen.getAllByRole('button', { name: '生成候选图' }).find((button) => button.type === 'submit')
    assert.ok(submit)
    await user.click(submit)

    await waitFor(() => assert.ok(requests.some((request) => request.body?.action === 'createJob')))
    const create = requests.find((request) => request.body?.action === 'createJob')
    assert.equal(create.body.outputFormat, 'svg')
    assert.equal(create.body.mainModelName, 'main-model')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('rendered OpenRouter full catalog shows incompatible image entries disabled with the server reason', async () => {
  const user = userEvent.setup()
  render(React.createElement(ModelPicker, {
    label: '图像生成模型',
    role: 'image',
    provider: 'openrouter',
    value: 'compatible',
    outputFormat: 'png',
    onChange() {},
    models: [
      { id: 'compatible', label: 'Compatible Model', vendor: 'OpenAI', roles: ['image'], selectable: true, recommended: true, outputModalities: ['image'], capabilities: { outputFormats: ['png'] } },
      { id: 'blocked', label: 'Blocked Model', vendor: 'Google', roles: [], selectable: false, protocol: 'openrouter-images', outputModalities: ['image'], disabledReason: '未声明 PNG/SVG 输出' },
    ],
  }))

  await user.click(screen.getByRole('button', { name: '图像生成模型' }))
  await user.click(screen.getByRole('button', { name: '全部兼容模型' }))
  const blocked = screen.getByText('Blocked Model').closest('button')
  assert.ok(blocked)
  assert.equal(blocked.disabled, true)
  assert.match(blocked.textContent, /未声明 PNG\/SVG 输出/)
})

test('rendered reference upload blocks file selection until advanced retrieval is set to none', () => {
  const added = []
  const { container } = render(React.createElement(ReferenceUploadPanel, {
    images: [],
    error: '',
    disabled: false,
    isUploading: false,
    retrievalBlocked: true,
    onAddFiles: (files) => added.push(files),
    onRemove() {},
  }))

  assert.ok(screen.getByText(/请先将检索设置切换为“不使用检索”/))
  const input = container.querySelector('input[type="file"]')
  assert.ok(input)
  assert.equal(input.disabled, true)
  fireEvent.change(input, { target: { files: [new window.File(['image'], 'reference.png', { type: 'image/png' })] } })
  assert.deepEqual(added, [])
})

test('rendered model search resets both virtual state and a deeply scrolled DOM window', async () => {
  const models = Array.from({ length: 36 }, (_, index) => ({
    id: `model-${index}`,
    label: `Model ${index}`,
    vendor: index % 2 ? 'Google' : 'OpenAI',
    roles: ['image'],
    selectable: true,
    outputModalities: ['image'],
    capabilities: { outputFormats: ['png'] },
  }))
  const { container } = render(React.createElement(ModelPicker, {
    label: '图像生成模型', role: 'image', provider: 'openai', value: 'model-0', outputFormat: 'png', models, onChange() {},
  }))
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: '图像生成模型' }))
  const modelWindow = container.querySelector('.model-picker-window')
  assert.ok(modelWindow)
  modelWindow.scrollTop = 1260
  fireEvent.scroll(modelWindow)
  assert.equal(modelWindow.scrollTop, 1260)

  fireEvent.change(screen.getByRole('searchbox', { name: '搜索图像生成模型' }), { target: { value: 'Model 35' } })

  assert.equal(modelWindow.scrollTop, 0)
  assert.ok(screen.getByText('Model 35'))
})

test('rendered generation drawer focuses its target, closes on Escape, restores focus, and preserves mounted state', async () => {
  function Harness() {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState('')
    return React.createElement(React.Fragment, null,
      React.createElement('button', { type: 'button', onClick: () => setOpen(true) }, '打开设置'),
      React.createElement(GenerationSettingsDrawer, { open, onClose: () => setOpen(false), focusSetting: 'target' },
        React.createElement('label', { 'data-focus-setting': 'target' },
          '测试字段',
          React.createElement('input', { value, onChange: (event) => setValue(event.target.value) }),
        ),
      ),
    )
  }

  render(React.createElement(Harness))
  const trigger = screen.getByRole('button', { name: '打开设置' })
  trigger.focus()
  fireEvent.click(trigger)
  const input = screen.getByRole('textbox', { name: '测试字段' })
  await new Promise((resolve) => setTimeout(resolve, 120))
  assert.equal(document.activeElement === input, true)
  fireEvent.change(input, { target: { value: '保留的配置' } })

  fireEvent.keyDown(window, { key: 'Escape' })

  assert.equal(screen.getByRole('dialog', { hidden: true }).closest('.generation-drawer-backdrop')?.getAttribute('aria-hidden'), 'true')
  assert.equal(document.activeElement === trigger, true)
  assert.equal(input.value, '保留的配置')
  fireEvent.click(trigger)
  assert.equal(screen.getByRole('textbox', { name: '测试字段' }).value, '保留的配置')
})

test('rendered reference gallery paginates, previews full images, and preserves cross-page selection', async () => {
  const pageOne = [
    { id: 'one-a', titleZh: '第一页 A', shortIntroZh: '介绍 A', detailZh: '详情 A', title: 'Page one A', summary: 'Summary A', visualCategory: '方法框架图', researchDomain: '通用', keywords: ['A'], imageUrl: 'data:image/png;base64,YQ==' },
    { id: 'one-b', titleZh: '第一页 B', shortIntroZh: '介绍 B', detailZh: '详情 B', title: 'Page one B', summary: 'Summary B', visualCategory: '流程图', researchDomain: '通用', keywords: ['B'], imageUrl: 'data:image/png;base64,Yg==' },
  ]
  const pageTwo = [
    { id: 'two-a', titleZh: '第二页 A', shortIntroZh: '介绍 C', detailZh: '详情 C', title: 'Page two A', summary: 'Summary C', visualCategory: '系统架构图', researchDomain: '机器学习', keywords: ['C'], imageUrl: 'data:image/png;base64,Yw==' },
  ]
  function GalleryHarness() {
    const [page, setPage] = React.useState(1)
    const [selectedIds, setSelectedIds] = React.useState([])
    const references = page === 1 ? pageOne : pageTwo
    return React.createElement(ReferenceLibraryPanel, {
      references,
      selectedIds,
      pageInfo: { page, pageSize: 12, totalItems: 24, totalPages: 2, corpusVersion: 'zh-CN.v2', facets: { visualCategories: [], researchDomains: [] } },
      isLoading: false,
      error: '',
      onToggle: (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]),
      onClear: () => setSelectedIds([]),
      onRequest: ({ page: requestedPage }) => setPage(requestedPage),
    })
  }

  const user = userEvent.setup()
  render(React.createElement(GalleryHarness))
  await user.click(screen.getByRole('button', { name: /打开参考图库/ }))
  await user.click(screen.getAllByRole('button', { name: '选用' })[0])
  assert.ok(screen.getAllByText('第一页 A').length >= 1)
  await user.click(screen.getByRole('button', { name: '下一页' }))
  assert.ok(await screen.findByText('第二页 A'))
  await user.click(screen.getByRole('button', { name: '选用' }))
  assert.ok(screen.getByTitle('移除 第一页 A'))
  assert.ok(screen.getByTitle('移除 第二页 A'))

  await user.click(screen.getByRole('button', { name: '预览 第二页 A 大图' }))
  assert.equal(screen.getAllByRole('dialog').length, 2)
  assert.ok(screen.getByRole('button', { name: '关闭大图预览' }))
  assert.ok(screen.getByText('详情 C'))
  await user.click(screen.getByRole('button', { name: '关闭大图预览' }))
  await user.click(screen.getByRole('button', { name: '上一页' }))
  const selectedAgain = await screen.findByRole('button', { name: /已选用，点击取消/ })
  assert.equal(selectedAgain.getAttribute('aria-pressed'), 'true')
})
