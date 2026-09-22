import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOfficialImageRequest, callOfficialImageChannel, STEP_IMAGE_SUBMISSION_CUTOFF } from '../../../packages/api/src/official-image-channels.js'
import type { ImageChannelCheckpoint, ImageChannelInput, ImageChannelTransport } from '../../../packages/api/src/image-channel-adapters.js'

const OUTPUT = 'validated-output-base64'
function source(width = 1024, height = 1024, byteLength = 24) {
  // The upstream image freezer validates the complete PNG. These fixtures test
  // the adapter's header/byte constraints without allocating giant bitmaps.
  const bytes = Buffer.alloc(byteLength)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes)
  bytes.write('IHDR', 12)
  bytes.writeUInt32BE(width, 16)
  bytes.writeUInt32BE(height, 20)
  const base64 = bytes.toString('base64')
  return { base64, mimeType: 'image/png', dataUrl: 'data:image/png;base64,' + base64 }
}
function input(provider = 'sensenova', model = 'sensenova-u1.5-lite'): ImageChannelInput {
  return { provider, model, apiKey: 'fixture-secret-never-log', prompt: '科学示意图', aspectRatio: '1:1', resolution: '1K', size: { width: 1024, height: 1024, size: '1024x1024' } }
}
const SKUS = [
  ['sensenova', 'sensenova-u1.5-lite'], ['sensenova', 'sensenova-u1.5-fast'],
  ['stepfun', 'step-2x-large'], ['stepfun', 'step-image-edit-2'],
]
function fixture(respond: (url: string, init: RequestInit) => Response | Promise<Response> = () => Response.json({ data: [{ url: 'https://assets.invalid/result.png', finish_reason: 'success' }] })) {
  const requests: { url: string; init: RequestInit; attempts: number }[] = []
  const downloads: string[] = [], records: any[] = [], checkpoints: ImageChannelCheckpoint[] = []
  let current: ImageChannelCheckpoint | undefined
  let time = Date.parse('2026-09-22T00:00:00Z')
  const io: ImageChannelTransport = {
    pending: async () => current,
    checkpoint: async value => { current = structuredClone(value); checkpoints.push(current) },
    request: async (url, init, _label, attempts) => {
      assert.equal(current?.state.submitting, true, 'durable checkpoint precedes the only billed POST')
      requests.push({ url, init, attempts })
      return respond(url, init)
    },
    json: async response => response.json(),
    download: async url => { downloads.push(url); return OUTPUT },
    publicSource: async () => { throw new Error('Unexpected public source upload') },
    validate: value => { assert.ok(value); return value },
    sleep: async () => { throw new Error('No polling exists for these synchronous APIs') },
    now: () => time,
    record: async value => { records.push(value) },
  }
  return { io, requests, downloads, records, checkpoints, state: () => current,
    seed: (value: ImageChannelCheckpoint) => { current = value }, time: (value: number) => { time = value } }
}

test('all four exact SKUs support generation/editing with their official encoding, one POST and no credentialed download', async () => {
  for (const [provider, model] of SKUS) for (const editing of [false, true]) {
    const f = fixture(), request = { ...input(provider, model), source: editing ? source() : null }
    assert.equal(await callOfficialImageChannel(request, f.io), OUTPUT)
    assert.equal(f.requests.length, 1)
    assert.equal(f.requests[0].attempts, 1)
    assert.equal(f.requests[0].init.redirect, 'error')
    const headers = new Headers(f.requests[0].init.headers)
    assert.equal(headers.get('Authorization'), 'Bearer ' + request.apiKey)
    assert.deepEqual(f.downloads, ['https://assets.invalid/result.png'])
    assert.equal(f.state()?.result?.url, f.downloads[0])
    assert.equal(f.state()?.state.submitting, false)
    assert.equal(f.records[0].estimatedCost, null)
    assert.equal(f.records[0].reportedCost, null)
    assert.equal(f.records[0].invoiceCost, null)
    if (provider === 'sensenova') {
      assert.equal(f.requests[0].url, 'https://token.sensenova.cn/v1/images/' + (editing ? 'edits' : 'generations'))
      const body = JSON.parse(String(f.requests[0].init.body))
      assert.deepEqual(body.images, editing ? [{ image_url: source().dataUrl }] : undefined)
      assert.equal(body.n, 1); assert.equal(body.output_format, 'png')
      assert.equal(body.prompt_extend, false); assert.equal(body.watermark, true)
      assert.equal(f.records[0].publicPrice.amount, null)
    } else if (model === 'step-image-edit-2' && editing) {
      assert.equal(f.requests[0].url, 'https://api.stepfun.com/v1/images/edits')
      assert.equal(headers.has('Content-Type'), false)
      const form = f.requests[0].init.body as FormData
      assert.equal(form.get('model'), model)
      assert.equal((form.get('image') as File).type, 'image/png')
      assert.equal((form.get('image') as File).name, 'source.png')
      assert.deepEqual(Buffer.from(await (form.get('image') as File).arrayBuffer()), Buffer.from(source().base64, 'base64'))
      for (const ignored of ['n', 'mask', 'size', 'source_url']) assert.equal(form.has(ignored), false)
    } else {
      const body = JSON.parse(String(f.requests[0].init.body))
      assert.equal(f.requests[0].url, 'https://api.stepfun.com/v1/images/' + (editing ? 'image2image' : 'generations'))
      assert.equal(body.model, model); assert.equal(body.n, 1)
      assert.equal(body.source_url, editing ? source().dataUrl : undefined)
      assert.equal(body.source_weight, editing ? 0.5 : undefined)
      assert.equal(body.steps, model === 'step-2x-large' ? 50 : 8)
    }
    assert.equal(JSON.stringify(f.records).includes(request.apiKey), false)
    assert.equal(JSON.stringify(f.checkpoints).includes(request.apiKey), false)
  }
})

test('SenseNova retains primary/reference order with total five-image policy and rebuilds frozen Data URLs', () => {
  const original = source(), refs = [source(640, 640), source(768, 768), source(800, 800), source(832, 832)]
  const req = { ...input(), source: { ...original, dataUrl: 'https://untrusted.invalid/different.png' },
    edit: { references: refs, inputs: { version: 1 as const, references: refs.map((_, n) => ({ objectKey: 'ref-' + n, purpose: 'content' as const })) } } }
  const body = buildOfficialImageRequest(req).body as any
  assert.deepEqual(body.images, [original, ...refs].map(image => ({ image_url: image.dataUrl })))
  assert.throws(() => buildOfficialImageRequest({ ...req, edit: { references: [...refs, source()], inputs: { version: 1, references: [...refs, source()].map((_, n) => ({ objectKey: 'ref-' + n, purpose: 'content' as const })) } } }), /最多接收 5/)
})

test('Step Image Edit 2 converts actual width/height to HxW and refuses silent edit resizing', () => {
  const i = input('stepfun', 'step-image-edit-2')
  assert.equal((buildOfficialImageRequest({ ...i, size: { width: 1360, height: 768, size: '1360x768' } }).body as any).size, '768x1360')
  assert.equal((buildOfficialImageRequest({ ...i, size: { width: 768, height: 1360 } }).body as any).size, '1360x768')
  assert.equal((buildOfficialImageRequest({ ...input('stepfun', 'step-2x-large'), size: { width: 1280, height: 800 } }).body as any).size, '1280x800')
  assert.throws(() => buildOfficialImageRequest({ ...i, source: source(1360, 768) }), /仅保持原图尺寸/)
  assert.ok(buildOfficialImageRequest({ ...i, source: source(1360, 768), aspectRatio: 'auto', resolution: 'auto', size: {} }).multipart)
  assert.throws(() => buildOfficialImageRequest({ ...i, source: source(1360, 768), size: {} }), /自动保留/)
})

test('all unsupported input combinations fail locally without creating a checkpoint or sending', async () => {
  const bad: ImageChannelInput[] = [
    { ...input(), model: 'sensenova-u1-fast' },
    { ...input(), region: 'global' },
    { ...input('stepfun', 'step-1x-edit') },
    { ...input(), apiKey: '' },
    { ...input(), apiKey: 'test\r\nHeader: injected' },
    { ...input(), prompt: '  ' },
    { ...input(), size: { width: 1000, height: 1024 } },
    { ...input(), size: { width: 512, height: 2048 } },
    { ...input(), size: { width: 4097, height: 1024 } },
    { ...input(), size: { width: 1024, height: 1024, size: '2048x2048' } },
    { ...input(), source: { ...source(), base64: 'not-png' } },
    { ...input(), source: { ...source(), mimeType: 'image/jpeg' } },
    { ...input(), source: source(), edit: { mask: source(), inputs: { version: 1, mask: { objectKey: 'mask' } } } },
    { ...input(), edit: { inputs: { version: 1 } } },
    { ...input(), source: source(), edit: { references: [source()], inputs: { version: 1 } } },
    { ...input(), source: source(), edit: { inputs: { version: 1, structured: { object: 'cell', attributes: 'blue', relationship: 'inside', preserve: 'labels' } } } },
    { ...input('stepfun', 'step-2x-large'), prompt: '字'.repeat(513) },
    { ...input('stepfun', 'step-2x-large'), prompt: '字'.repeat(1025), source: source() },
    { ...input('stepfun', 'step-2x-large'), source: source(2049, 10) },
    { ...input('stepfun', 'step-2x-large'), source: source(1024, 1024, 10 * 1024 * 1024 + 1) },
    { ...input('stepfun', 'step-2x-large'), source: source(), edit: { references: [source()], inputs: { version: 1, references: [{ objectKey: 'ref', purpose: 'content' }] } } },
    { ...input('stepfun', 'step-2x-large'), size: { width: 1920, height: 1080 } },
    { ...input('stepfun', 'step-image-edit-2'), prompt: '字'.repeat(513), source: source() },
    { ...input('stepfun', 'step-image-edit-2'), source: source(4097, 1024) },
    { ...input('stepfun', 'step-image-edit-2'), size: { width: 2048, height: 2048 } },
  ]
  for (const i of bad) {
    const f = fixture()
    await assert.rejects(callOfficialImageChannel(i, f.io), (e: any) => e.localInputFailure && e.requestState === 'not_sent')
    assert.equal(f.requests.length, 0); assert.equal(f.checkpoints.length, 0)
  }
  const accepted = buildOfficialImageRequest({ ...input('stepfun', 'step-2x-large'), source: source(), prompt: '字'.repeat(1024) })
  assert.equal((accepted.body as any).source_weight, 0.5)
})

test('transport failures, 5xx, broken JSON and prior submitting/task IDs never resubmit or claim resumable polling', async () => {
  for (const [provider, model] of SKUS) for (const kind of ['network', '5xx', 'json']) {
    const f = fixture(() => {
      if (kind === 'network') throw new Error('transport includes fixture-secret-never-log')
      return kind === '5xx' ? new Response('provider error', { status: 502 }) : new Response('not json')
    })
    const i = input(provider, model)
    for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(callOfficialImageChannel(i, f.io), (e: any) =>
      e.terminal === true && e.uncertain === true && e.pollOnly === false && e.requestState === 'unknown' && !e.message.includes(i.apiKey))
    assert.equal(f.requests.length, 1); assert.equal(f.state()?.state.submitting, true)
  }
  for (const state of [{ submitting: true }, {}]) {
    const f = fixture()
    f.seed({ provider: 'sensenova', model: 'sensenova-u1.5-lite', taskId: 'not-a-query-contract', state })
    await assert.rejects(callOfficialImageChannel(input(), f.io), (e: any) => e.terminal && e.uncertain && !e.pollOnly)
    assert.equal(f.requests.length, 0)
  }
})

test('rejections, filtered images, error bodies and invalid results stay terminal with sanitized errors', async () => {
  for (const response of [
    () => new Response('fixture-secret-never-log', { status: 401 }),
    () => new Response('fixture-secret-never-log', { status: 429 }),
    () => Response.json({ error: { message: 'fixture-secret-never-log' } }),
    () => Response.json({ data: [{ finish_reason: 'content_filtered', url: 'https://assets.invalid/no.png' }] }),
    () => Response.json({ data: [] }),
    () => Response.json({ data: [{}, {}] }),
    () => Response.json({ data: [{ url: 'http://assets.invalid/no.png' }] }),
    () => Response.json({ data: [{ url: 'https://user:secret@assets.invalid/no.png' }] }),
    () => Response.json({ data: [{ url: 'file:///tmp/image.png' }] }),
    () => Response.json({ data: [{}] }),
  ]) {
    const f = fixture(response)
    for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(callOfficialImageChannel(input('stepfun', 'step-image-edit-2'), f.io),
      (e: any) => e.terminal === true && !e.message.includes('fixture-secret-never-log'))
    assert.equal(f.requests.length, 1); assert.equal(f.downloads.length, 0); assert.equal(f.state()?.failed, true)
  }
})

test('download failures recover solely from persisted URLs, even after cutoff and without a live API key', async () => {
  for (const [provider, model] of SKUS) {
    const f = fixture(), i = input(provider, model)
    f.io.download = async () => { throw new Error('download secret details') }
    await assert.rejects(callOfficialImageChannel(i, f.io), (e: any) => e.recoveryAction === 'resume' && e.pollOnly && !e.uncertain)
    assert.equal(f.state()?.result?.url, 'https://assets.invalid/result.png')
    f.time(Date.parse(STEP_IMAGE_SUBMISSION_CUTOFF) + 1000)
    f.io.download = async url => { f.downloads.push(url); return OUTPUT }
    assert.equal(await callOfficialImageChannel({ ...i, apiKey: '', source: null, prompt: '', size: {} }, f.io), OUTPUT)
    assert.equal(f.requests.length, 1)
    assert.deepEqual(f.downloads, ['https://assets.invalid/result.png'])
  }
})

test('base64 results are validated and persisted for recovery, with provider usage kept separate from price', async () => {
  for (const [provider, model] of SKUS) {
    const f = fixture(() => Response.json({ request_id: 'request-123', usage: { total_tokens: 700 }, data: [{ b64_json: 'raw-base64', finish_reason: 'success', seed: 17 }] }))
    const validated: string[] = []
    f.io.validate = value => { validated.push(value); return OUTPUT }
    assert.equal(await callOfficialImageChannel(input(provider, model), f.io), OUTPUT)
    assert.equal(f.state()?.state.inlineBase64, OUTPUT)
    assert.equal(f.state()?.taskId, 'request-123')
    assert.equal(f.records[0].usage.total_tokens, 700); assert.equal(f.records[0].invoiceCost, null)
    assert.equal(await callOfficialImageChannel(input(provider, model), f.io), OUTPUT)
    assert.deepEqual(validated, ['raw-base64', OUTPUT])
    assert.equal(f.requests.length, 1); assert.equal(f.downloads.length, 0)
  }
  const bad = fixture(() => Response.json({ data: [{ b64_json: 'invalid-bytes' }] }))
  bad.io.validate = () => { throw new Error('decoder includes a secret') }
  await assert.rejects(callOfficialImageChannel(input(), bad.io), (e: any) => e.terminal && !e.message.includes('secret'))
  assert.equal(bad.state()?.failed, true)
})

test('missing durability and checkpoint-write failures prevent submission; completed-state write failures never replay', async () => {
  const unavailable = fixture()
  unavailable.io.checkpoint = undefined
  await assert.rejects(callOfficialImageChannel(input(), unavailable.io), (e: any) => e.localInputFailure)
  assert.equal(unavailable.requests.length, 0)
  const before = fixture()
  before.io.checkpoint = async () => { throw new Error('storage secret') }
  await assert.rejects(callOfficialImageChannel(input(), before.io), (e: any) => e.localInputFailure && !e.message.includes('secret'))
  assert.equal(before.requests.length, 0)
  const after = fixture(), save = after.io.checkpoint!
  after.io.checkpoint = async value => { if (value.result) throw new Error('storage secret'); await save(value) }
  for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(callOfficialImageChannel(input(), after.io), (e: any) => e.terminal && e.uncertain)
  assert.equal(after.requests.length, 1)
})

test('China retirement date gates new Step image submissions but not SenseNova or preserved results', async () => {
  for (const model of ['step-2x-large', 'step-image-edit-2']) {
    const f = fixture(); f.time(Date.parse(STEP_IMAGE_SUBMISSION_CUTOFF))
    await assert.rejects(callOfficialImageChannel(input('stepfun', model), f.io), (e: any) => e.localInputFailure && /停服日期/.test(e.message))
    assert.equal(f.requests.length, 0); assert.equal(f.checkpoints.length, 0)
  }
  const sense = fixture(); sense.time(Date.parse(STEP_IMAGE_SUBMISSION_CUTOFF))
  assert.equal(await callOfficialImageChannel(input(), sense.io), OUTPUT)
})
