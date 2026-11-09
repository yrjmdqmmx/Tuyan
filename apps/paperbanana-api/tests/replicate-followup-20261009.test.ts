import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { callExtendedImageChannel, type ImageChannelTransport } from '../../../packages/api/src/image-channel-adapters.js'
import { channelSchemaAccepts } from '../../../packages/api/src/audited-channel-contracts.js'
import { resolveImageSize } from '../../../packages/types/src/image-size-contract.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
// @ts-ignore Generated independent client data.
import { STATIC_MODEL_REGISTRY as catalog } from '../../web/src/lib/staticModelCatalog.js'

const read = (name: string) => JSON.parse(readFileSync(new URL('../../../config/' + name, import.meta.url), 'utf8'))
const reviewedIds = ['google/nano-banana-2.1', 'black-forest-labs/flux-3-image', 'ideogram-ai/ideogram-4-5', 'ideogram-ai/ideogram-4-5-precise-edit']
const allSchemas = read('model-channel-schemas.json')
const schemas = Object.fromEntries(reviewedIds.map(id => ['replicate/' + id, allSchemas['replicate/' + id]]))
const sizes = read('image-size-contracts.json')
function source(width = 1024, height = 1024) {
  const bytes = Buffer.alloc(24); bytes.writeUInt32BE(0x89504e47, 0); bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20)
  const base64 = bytes.toString('base64')
  return { base64, mimeType: 'image/png', dataUrl: 'data:image/png;base64,' + base64 }
}
function transport() {
  const calls: { url: string; body: any }[] = []; let pending: any
  const io: ImageChannelTransport = {
    pending: async () => pending, checkpoint: async value => { pending = structuredClone(value) },
    request: async (url, init, _label, attempts) => {
      assert.equal(attempts, 1); assert.equal(init.method, 'POST')
      calls.push({ url, body: JSON.parse(String(init.body)) })
      return Response.json({ id: 'original', status: 'succeeded', output: 'https://asset.invalid/result.png', urls: { get: 'https://api.replicate.com/v1/predictions/original' } })
    },
    json: async response => response.json(), download: async () => 'validated-png', validate: value => value,
    publicSource: async () => { throw Error('No public upload needed') }, sleep: async () => {}, now: () => 0,
  }
  return { io, calls }
}

test('all four Replicate identities use their inspected versions and independently captured schemas for every advertised size', async (t) => {
  let combinations = 0
  for (const [key, snapshot] of Object.entries(schemas) as [string, any][]) {
    const model = key.slice('replicate/'.length), row = catalog.replicate.models.find((m: any) => m.id === model)
    assert.equal(row.verified, false); assert.equal(row.specifications.checkedAt, '2026-10-09')
    assert.equal(row.version.kind, 'fixed'); assert.equal(row.version.id, snapshot.version)
    for (const operation of ['generation', 'editing']) {
      const profile = sizes.profiles[sizes.routes[key][operation]]
      if (!profile) continue
      const maps = row.capabilities[(operation === 'editing' ? 'refineAspectRatios' : 'aspectRatios') + 'ByResolution']
      for (const [resolution, ratios] of Object.entries(maps) as [string, string[]][]) for (const ratio of ratios) {
        const f = transport(), editing = operation === 'editing'
        const input = { provider: 'replicate', model, apiKey: 'fixture-key', prompt: 'scientific figure', aspectRatio: ratio, resolution, size: resolveImageSize(profile, ratio, resolution), ...(editing ? { source: source() } : {}) }
        assert.equal(await callExtendedImageChannel(input, f.io), 'validated-png')
        assert.equal(f.calls.length, 1); assert.equal(f.calls[0].url, 'https://api.replicate.com/v1/predictions')
        const body = f.calls[0].body
        assert.equal(body.version, snapshot.version)
        assert.ok(channelSchemaAccepts(snapshot.input, body.input), key + '/' + ratio + '/' + resolution)
        assert.ok(Object.keys(body.input).every(field => field in snapshot.input.properties), 'no guessed fields')
        assert.equal('mask' in body.input, false); assert.equal('reference_images' in body.input, false)
        if (model.startsWith('google/')) { assert.equal(body.input.google_search, false); assert.equal(body.input.image_search, false); assert.equal(body.input.output_format, 'png') }
        if (model.startsWith('black-forest-labs/')) { assert.equal(body.input.grounding, false); assert.equal(body.input.output_format, 'png') }
        const imageField = model.startsWith('google/') ? 'image_input' : model.endsWith('precise-edit') ? 'image' : 'images'
        if (editing) assert.deepEqual(body.input[imageField], imageField === 'image' ? input.source!.dataUrl : [input.source!.dataUrl])
        else assert.equal(imageField in body.input, false)
        combinations++
      }
    }
  }
  assert.ok(combinations > 100); t.diagnostic(`${combinations} exact Replicate operation/size requests checked against captured schemas`)
})

test('Replicate Flux input limits and edit-only Ideogram identity reject invalid requests before transport', async () => {
  const f = transport(), model = 'black-forest-labs/flux-3-image'
  const input = { provider: 'replicate', model, apiKey: 'fixture-key', prompt: 'edit', aspectRatio: '1:1', resolution: '1K', size: { size: '1:1' } }
  for (const image of [source(255, 1024), source(1024, 255), source(4001, 4001)]) await assert.rejects(callExtendedImageChannel({ ...input, source: image }, f.io))
  await assert.rejects(callExtendedImageChannel({ ...input, model: 'ideogram-ai/ideogram-4-5-precise-edit', aspectRatio: 'auto', resolution: 'auto', size: {} }, f.io))
  await assert.rejects(callExtendedImageChannel({ ...input, source: source(), edit: { inputs: { version: 1, mask: { objectKey: 'fixture' } }, mask: source() } }, f.io))
  assert.equal(f.calls.length, 0)
})

test('SiliconFlow ERNIE Image retirement preserves the historical ID but prevents new paid requests', async () => {
  const row = catalog.siliconflow.models.find((m: any) => m.id === 'baidu/ERNIE-Image-Turbo')
  assert.ok(row); assert.equal(row.selectable, false); assert.equal(row.expirationDate, '2026-09-30')
  const r: any = await createRefineRuntime(); let calls = 0
  try {
    r.legacy.configureRuntimeFetch(async () => { calls++; throw Error('must not send') })
    await assert.rejects(r.legacy.callImageModel('siliconflow', row.id, 'fixture-key', 'scientific figure', '1:1', '', '1K'), /停用|到期|下线/)
    assert.equal(calls, 0)
  } finally { await r.close() }
})
