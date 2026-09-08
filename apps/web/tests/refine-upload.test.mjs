import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import React from 'react'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import useRefineUpload from '../src/hooks/useRefineUpload.js'
import AspectRatioPicker, { ratioRectangle } from '../src/components/AspectRatioPicker.jsx'
import RefinePanel from '../src/components/RefinePanel.jsx'
import { refineRequestSource } from '../src/lib/refineSource.js'
import { refineUploadLimits, validateRefineDimensions, validateRefineFile } from '../src/lib/refineUpload.js'

const limits = { mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 5 * 1024 ** 2, maxDimension: 16384, maxPixels: 20 * 1024 ** 2 }
let restore = () => {}
afterEach(() => { cleanup(); restore(); restore = () => {} })

function uploadHarness() {
  const before = { fetch: globalThis.fetch, Image: globalThis.Image, XMLHttpRequest: globalThis.XMLHttpRequest, create: URL.createObjectURL, revoke: URL.revokeObjectURL }
  const requests = [], xhrs = [], revoked = []
  let counter = 0
  URL.createObjectURL = () => 'blob:test-' + ++counter
  URL.revokeObjectURL = url => revoked.push(url)
  globalThis.Image = class { naturalWidth = 120; naturalHeight = 80; set src(_value) { queueMicrotask(() => this.onload()) } }
  globalThis.XMLHttpRequest = class {
    upload = {}
    open() {}
    setRequestHeader() {}
    send() { xhrs.push(this) }
    abort() { this.onabort() }
    progress(value) { this.upload.onprogress({ lengthComputable: true, loaded: value, total: 100 }) }
    finish(status = 200) { this.status = status; this.onload() }
  }
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    if (body.action === 'prepareReferenceUpload') return Response.json({ code: 0, uploads: [{ ...body.files[0], objectKey: 'references/owner/' + counter + '.png', uploadUrl: 'https://local.invalid/upload', uploadToken: 'test-token' }] })
    return Response.json({ code: 0, source: { width: 120, height: 80 } })
  }
  restore = () => { Object.assign(globalThis, { fetch: before.fetch, Image: before.Image, XMLHttpRequest: before.XMLHttpRequest }); URL.createObjectURL = before.create; URL.revokeObjectURL = before.revoke }
  const hook = renderHook(() => useRefineUpload({ apiBase: 'https://local.invalid/paperbanana-api', health: { runtime: 'laf' }, limits, authReady: true, ownerId: 'owner' }))
  return { hook, requests, xhrs, revoked }
}

test('upload tracks actual bytes, waits for finalize, supports retry, replacement and removal', async () => {
  const { hook, requests, xhrs, revoked } = uploadHarness()
  const file = new File(['pixels'], 'source.png', { type: 'image/png' })
  act(() => { void hook.result.current.selectFiles([file]) })
  await waitFor(() => assert.equal(xhrs.length, 1))
  act(() => xhrs[0].progress(37))
  assert.equal(hook.result.current.upload.progress, 37)
  assert.deepEqual(refineRequestSource(hook.result.current.source), {})
  act(() => xhrs[0].finish(503))
  await waitFor(() => assert.equal(hook.result.current.upload.status, 'failed'))
  assert.match(hook.result.current.upload.error, /HTTP 503/)
  assert.ok(requests.some(request => request.action === 'abortReferenceUpload'))
  act(() => hook.result.current.retry())
  await waitFor(() => assert.equal(xhrs.length, 2))
  act(() => xhrs[1].finish())
  await waitFor(() => assert.equal(hook.result.current.upload.status, 'ready'))
  assert.equal(requests.find(request => request.action === 'finalizeReferenceUpload').purpose, 'refine')
  assert.deepEqual(refineRequestSource(hook.result.current.source), { sourceImageUpload: { objectKey: 'references/owner/2.png' } })
  act(() => { void hook.result.current.selectFiles([file]) })
  await waitFor(() => assert.equal(xhrs.length, 3))
  assert.equal(hook.result.current.source.objectKey, '')
  act(() => hook.result.current.setSource({ url: '', objectKey: '' }))
  await waitFor(() => assert.equal(hook.result.current.upload.status, 'idle'))
  assert.equal(hook.result.current.source.url, '')
  assert.ok(revoked.includes('blob:test-2'))
})

test('format, byte and dimension validation fails before upload and an invalid replacement preserves the ready original', async () => {
  const selected = refineUploadLimits({ ...limits, modelMaxBytes: { 'channel/model': 1024 } }, { accessProvider: 'channel', modelId: 'model' })
  assert.equal(selected.maxBytes, 1024)
  assert.throws(() => validateRefineFile({ type: 'image/png', size: 1025 }, selected), /MB/)
  assert.throws(() => validateRefineFile({ type: 'image/svg+xml', size: 100 }, limits), /PNG/)
  assert.throws(() => validateRefineFile({ type: 'image/png', size: limits.maxBytes + 1 }, limits), /MB/)
  assert.throws(() => validateRefineDimensions({ width: 17000, height: 1 }, limits), /尺寸超限/)
  assert.throws(() => validateRefineDimensions({ width: 8000, height: 8000 }, limits), /尺寸超限/)
  const { hook, requests } = uploadHarness()
  act(() => hook.result.current.setSource({ url: '/old.png', objectKey: 'job/old.png' }))
  await act(() => hook.result.current.selectFiles([new File(['svg'], 'image.svg', { type: 'image/svg+xml' })]))
  assert.equal(hook.result.current.source.url, '/old.png')
  assert.equal(requests.length, 0)
  assert.match(hook.result.current.upload.error, /PNG/)
})

test('the rendered dropzone passes a dropped file through the same prepare, PUT and finalize pipeline', async () => {
  const { hook, xhrs, requests } = uploadHarness()
  const view = render(React.createElement(RefinePanel, {
    instruction: '', source: {}, upload: {}, uploadLimits: limits, uploadEnabled: true,
    onUpload: hook.result.current.selectFiles, aspectRatioOptions: [],
  }))
  const zone = view.container.querySelector('.refine-dropzone')
  const file = new File(['pixels'], 'dragged.png', { type: 'image/png' })
  fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'] } })
  assert.ok(zone.classList.contains('dragging'))
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
  assert.equal(zone.classList.contains('dragging'), false)
  await waitFor(() => assert.equal(xhrs.length, 1))
  act(() => xhrs[0].finish())
  await waitFor(() => assert.equal(hook.result.current.upload.status, 'ready'))
  assert.equal(requests[0].files[0].filename, 'dragged.png')
  assert.equal(hook.result.current.source.uploaded, true)
})

test('all ratio backgrounds preserve exact geometry, auto is distinct, unsupported choices hide and expanded selection stays visible', () => {
  const ratios = ['1:1', '16:9', '9:16', '1:8', '8:1']
  for (const ratio of ratios) {
    const [width, height] = ratio.split(':').map(Number)
    const rect = ratioRectangle(ratio)
    assert.ok(Math.abs(rect.width / rect.height - width / height) < 1e-12)
    assert.ok(rect.width <= 48 && rect.height <= 28)
  }
  assert.equal(ratioRectangle('auto'), null)
  const options = ['auto', ...ratios].map(value => ({ value, label: value === 'auto' ? '自动' : value }))
  let selected
  const view = render(React.createElement(AspectRatioPicker, { label: '目标比例', value: '8:1', options: [...options, { value: '2:1', label: '2:1', disabled: true }], maxVisible: 3, onChange: value => { selected = value } }))
  assert.ok(screen.getByRole('button', { name: '目标比例 8:1' }))
  assert.equal(screen.queryByRole('button', { name: /目标比例 2:1/ }), null)
  const auto = screen.getByRole('button', { name: '目标比例 自动' })
  assert.ok(auto.querySelector('.aspect-ratio-auto'))
  assert.equal(auto.querySelector('rect'), null)
  fireEvent.click(screen.getByRole('button', { name: /展开全部/ }))
  const portrait = screen.getByRole('button', { name: '目标比例 1:8' })
  fireEvent.click(portrait)
  assert.equal(selected, '1:8')
  const rect = portrait.querySelector('rect')
  assert.equal(Number(rect.getAttribute('width')) / Number(rect.getAttribute('height')), 1 / 8)
  assert.equal(view.container.querySelectorAll('.aspect-ratio-options button').length, options.length)
})
