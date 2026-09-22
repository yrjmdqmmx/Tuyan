import assert from 'node:assert/strict'
import test from 'node:test'
import { deflateSync } from 'node:zlib'
import { buildQianfanImageRequest, callQianfanImageChannel } from '../../../packages/api/src/qianfan-image-channel.js'
import type { ImageChannelCheckpoint, ImageChannelInput, ImageChannelTransport } from '../../../packages/api/src/image-channel-adapters.js'

// Small real PNG fixtures, with valid chunks/CRC rather than relying on declared source dimensions.
function png(width = 256, height = 256): NonNullable<ImageChannelInput['source']> {
  const crc32 = (data: Buffer) => { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0) } return (crc ^ 0xffffffff) >>> 0 }
  const chunk = (type: string, value: Buffer) => { const name = Buffer.from(type); const length = Buffer.alloc(4); length.writeUInt32BE(value.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, value]))); return Buffer.concat([length, name, value, crc]) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2
  const base64 = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.alloc((width * 3 + 1) * height))), chunk('IEND', Buffer.alloc(0))]).toString('base64')
  return { base64, mimeType: 'image/png', dataUrl: `data:image/png;base64,${base64}` }
}
const source = png()
const output = 'downloaded-png-base64'
const input: ImageChannelInput = { provider: 'qianfan', model: 'qwen-image', apiKey: 'fixture-secret', prompt: 'Scientific figure', aspectRatio: '1:1', resolution: '1K', size: { size: '1024x1024', width: 1024, height: 1024 } }
const edit: ImageChannelInput = { ...input, model: 'qwen-image-edit', source }
const ref = { objectKey: 'fixture/reference.png', purpose: 'style' as const }
function fixture(respond: (url: string, init: RequestInit) => Response | Promise<Response> = () => Response.json({ id: 'as-fixture', data: [{ url: 'https://asset.invalid/result.png' }] })) {
  let saved: ImageChannelCheckpoint | undefined
  const calls: Array<{ url: string; init: RequestInit; attempts: number }> = [], downloads: string[] = [], records: any[] = [], checkpoints: ImageChannelCheckpoint[] = []
  const io: ImageChannelTransport = {
    pending: async () => saved,
    checkpoint: async value => { saved = structuredClone(value); checkpoints.push(saved) },
    record: async value => { records.push(value) },
    request: async (url, init, _label, attempts) => { assert.equal(saved?.state?.phase, 'submitting'); calls.push({ url, init, attempts }); return respond(url, init) },
    json: async response => response.json(),
    download: async url => { downloads.push(url); return output },
    publicSource: async () => { throw new Error('No external upload allowed') },
    validate: value => value, now: () => 1234, sleep: async () => {},
  }
  return { io, calls, downloads, records, checkpoints, saved: () => saved, set: (value: ImageChannelCheckpoint) => { saved = value } }
}
const notSent = (error: any) => error.localInputFailure === true && error.requestState === 'not_sent'
const unknown = (error: any) => error.terminal === true && error.uncertain === true && error.recoveryAction === 'stop'

test('three ordinary models have exact JSON request contracts, with single and multiple edit images', () => {
  for (const model of ['musesteamer-air-image', 'qwen-image', 'qwen-image-edit']) {
    const request = buildQianfanImageRequest({ ...input, model, source: model === 'qwen-image-edit' ? source : null })
    const endpoint = model === 'musesteamer-air-image' ? 'musesteamer/images/generations' : model === 'qwen-image' ? 'images/generations' : 'images/edits'
    assert.equal(request.endpoint, `https://qianfan.baidubce.com/v2/${endpoint}`)
    assert.deepEqual(request.body, { model, prompt: input.prompt, size: '1024x1024', prompt_extend: false, ...(model === 'musesteamer-air-image' ? { response_format: 'url' } : { n: 1, watermark: false }), ...(model === 'qwen-image-edit' ? { image: source.dataUrl } : {}) })
  }
  assert.deepEqual(buildQianfanImageRequest({ ...edit, edit: { references: [source, source], inputs: { version: 1, references: [ref, ref] } } }).body.image, [source.dataUrl, source.dataUrl, source.dataUrl])
})

test('whitelist, operation, region, prompt and refinement constraints fail before submission', async () => {
  const bad: ImageChannelInput[] = [
    { ...input, model: 'ernie-irag-edit' }, { ...input, model: '__proto__' }, { ...input, provider: 'other' }, { ...input, region: 'global' },
    { ...input, source }, { ...input, edit: { inputs: { version: 1 } } }, { ...edit, source: null },
    { ...input, prompt: '' }, { ...input, prompt: '文'.repeat(801) },
    { ...edit, edit: { references: [source, source, source], inputs: { version: 1, references: [ref, ref, ref] } } },
    { ...edit, edit: { references: [source], inputs: { version: 1 } } },
    { ...edit, edit: { mask: source, inputs: { version: 1, mask: { objectKey: 'mask.png' } } } },
    { ...edit, edit: { inputs: { version: 1, structured: { object: 'a', attributes: 'b', relationship: 'c', preserve: 'd' } } } },
  ]
  for (const value of bad) { const f = fixture(); await assert.rejects(callQianfanImageChannel(value, f.io), notSent); assert.equal(f.calls.length, 0); assert.equal(f.checkpoints.length, 0) }
  assert.doesNotThrow(() => buildQianfanImageRequest({ ...input, prompt: '😀'.repeat(800) }))
})

test('dimensions reject server fallback and preserve supported resolved pixel sizes', () => {
  for (const size of ['1024x1024', '1280x720', '720x1280', '1152x864', '864x1152', '1328x1328', '1664x928', '928x1664', '1472x1104', '1104x1472']) assert.equal(buildQianfanImageRequest({ ...input, model: 'musesteamer-air-image', size: { size } }).body.size, size)
  for (const size of [{ size: '1:1' }, { size: '1024x1024', width: 512, height: 512 }, { width: 1024 }, { width: 511, height: 1024 }, { width: 2049, height: 1024 }, { width: 512.5, height: 512 }, {}]) assert.throws(() => buildQianfanImageRequest({ ...input, size }), notSent)
  assert.throws(() => buildQianfanImageRequest({ ...input, model: 'musesteamer-air-image', size: { size: '2048x2048' } }), notSent)
  assert.equal(buildQianfanImageRequest({ ...input, size: { width: 512, height: 2048 } }).body.size, '512x2048')
  assert.equal(buildQianfanImageRequest({ ...input, aspectRatio: 'auto', resolution: 'auto', size: {} }).body.size, '1024x1024')
})

test('source byte, canonical PNG, pixel and aspect limits are enforced on every reference', () => {
  const oversized = Buffer.alloc(10 * 1024 * 1024).toString('base64')
  for (const image of [png(127, 256), png(128, 513), { ...source, mimeType: 'image/jpeg' }, { ...source, dataUrl: 'https://asset.invalid/other.png' }, { ...source, base64: source.base64 + ' ' }, { ...source, base64: oversized, dataUrl: `data:image/png;base64,${oversized}` }, { ...source, base64: 'c291cmNl', dataUrl: 'data:image/png;base64,c291cmNl' }]) {
    assert.throws(() => buildQianfanImageRequest({ ...edit, source: image }), notSent)
    assert.throws(() => buildQianfanImageRequest({ ...edit, edit: { references: [image], inputs: { version: 1, references: [ref] } } }), notSent)
  }
  assert.doesNotThrow(() => buildQianfanImageRequest({ ...edit, source: png(128, 512) }))
})

test('submission checkpoints before POST and separates usage, public price and unverified costs', async () => {
  const f = fixture(() => Response.json({ id: 'as-original', usage: { total_tokens: 23, image_count: 1, unsafe: input.apiKey }, cost: 99, data: [{ url: 'http://qianfan-img-gen.bj.bcebos.com/result.png?authorization=signed-fixture' }] }))
  assert.equal(await callQianfanImageChannel(input, f.io), output)
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].attempts, 1); assert.equal(f.calls[0].init.redirect, 'error')
  assert.equal(new Headers(f.calls[0].init.headers).get('Authorization'), `Bearer ${input.apiKey}`)
  assert.equal(new Headers(f.calls[0].init.headers).get('Content-Type'), 'application/json')
  assert.equal(f.checkpoints[0].state.phase, 'submitting'); assert.equal(f.saved()?.state.phase, 'completed')
  assert.equal(f.saved()?.taskId, undefined, 'diagnostic id must not imply queryable task')
  assert.deepEqual(f.downloads, ['https://qianfan-img-gen.bj.bcebos.com/result.png?authorization=signed-fixture'])
  assert.deepEqual(f.records[0].usage, { total_tokens: 23, image_count: 1 })
  assert.equal(f.records[0].requestId, 'as-original'); assert.equal(f.records[0].publicPrice.amount, 0.25)
  for (const field of ['estimatedCost', 'reportedCost', 'invoiceCost']) assert.equal(f.records[0][field], null)
  assert.ok(!JSON.stringify(f.records).includes(input.apiKey)); assert.ok(!JSON.stringify(f.records).includes(input.prompt)); assert.ok(!JSON.stringify(f.records).includes('signed-fixture'))
})

test('lost response, malformed success and ambiguous status never repeat the POST', async () => {
  const responses = [
    () => { throw new Error(`connection lost ${input.apiKey}`) }, () => new Response('bad json'),
    () => Response.json({ id: 'diagnostic-only' }), () => new Response('', { status: 503 }), () => new Response('', { status: 408 }),
    () => Response.json({ data: [{ url: 'http://other.invalid/image.png' }] }),
    () => Response.json({ data: [{ url: 'https://user:secret@asset.invalid/image.png' }] }),
  ]
  for (const respond of responses) {
    const f = fixture(respond)
    await assert.rejects(callQianfanImageChannel(input, f.io), error => { assert.ok(!String(error).includes(input.apiKey)); return unknown(error) })
    await assert.rejects(callQianfanImageChannel(input, f.io), unknown)
    assert.equal(f.calls.length, 1); assert.equal(f.downloads.length, 0)
  }
})

test('explicit failures are durable, terminal and never treated as zero cost', async () => {
  for (const respond of [() => new Response('', { status: 429 }), () => Response.json({ code: 'invalid_argument', message: input.apiKey }), () => Response.json({ data: [{ task_status: 'FAILED' }] })]) {
    const f = fixture(respond)
    await assert.rejects(callQianfanImageChannel(input, f.io), (error: any) => error.terminal && !error.uncertain)
    assert.equal(f.saved()?.failed, true)
    await assert.rejects(callQianfanImageChannel(input, f.io), (error: any) => error.terminal)
    assert.equal(f.calls.length, 1); assert.equal(f.records.length, 0)
  }
})

test('saved result recovery needs no secret or source and only downloads without submitting', async () => {
  const f = fixture(); let downloadAttempts = 0
  f.io.download = async url => { f.downloads.push(url); if (++downloadAttempts === 1) throw new Error('asset unavailable'); return output }
  await assert.rejects(callQianfanImageChannel(edit, f.io), (error: any) => error.recoveryAction === 'resume' && error.pollOnly && !error.uncertain)
  assert.equal(f.saved()?.result?.url, 'https://asset.invalid/result.png')
  assert.equal(await callQianfanImageChannel({ ...edit, apiKey: '', source: null, prompt: '' }, f.io), output)
  assert.equal(f.calls.length, 1); assert.equal(f.downloads.length, 2)
  assert.ok(!JSON.stringify(f.saved()).includes(input.apiKey))
})

test('durability failures and mismatched previous operations fail closed', async () => {
  const f = fixture(); f.io.checkpoint = async () => { throw new Error('storage unavailable') }
  await assert.rejects(callQianfanImageChannel(input, f.io)); assert.equal(f.calls.length, 0)
  const missing = fixture(); delete missing.io.pending
  await assert.rejects(callQianfanImageChannel(input, missing.io), notSent); assert.equal(missing.calls.length, 0)
  for (const previous of [{ provider: 'qianfan', model: 'other' }, { provider: 'other', model: input.model }, { provider: 'qianfan', model: input.model, state: { phase: 'submitting' } }]) {
    const g = fixture(); g.set(previous)
    await assert.rejects(callQianfanImageChannel(input, g.io), (error: any) => error.terminal)
    assert.equal(g.calls.length, 0)
  }
  const resultSave = fixture(); const save = resultSave.io.checkpoint!
  resultSave.io.checkpoint = async value => { if (value.result) throw new Error('lost persistence'); await save(value) }
  await assert.rejects(callQianfanImageChannel(input, resultSave.io), unknown)
  await assert.rejects(callQianfanImageChannel(input, resultSave.io), unknown)
  assert.equal(resultSave.calls.length, 1); assert.equal(resultSave.downloads.length, 0)
})
