import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { resolveImageSize, imageAspectRatiosByResolution, type ImageSizeContract } from '../../../packages/types/src/image-size-contract.js'
// @ts-ignore Generated browser catalog intentionally has no TypeScript declarations.
import { STATIC_MODEL_REGISTRY } from '../../web/src/lib/staticModelCatalog.js'
// @ts-ignore Browser presentation is exercised against the generated contracts.
import { buildAspectRatioOptions, CANONICAL_ASPECT_RATIOS } from '../../web/src/lib/aspectRatios.js'
const config = JSON.parse(fs.readFileSync(new URL('../../../config/image-size-contracts.json', import.meta.url), 'utf8'))

test('every advertised model/channel/operation/resolution/ratio resolves to a legal wire size', (t) => {
  let combinations = 0
  for (const [key, route] of Object.entries(config.routes) as Array<[string, any]>) {
    const slash = key.indexOf('/'), provider = key.slice(0, slash), id = key.slice(slash + 1)
    const model = STATIC_MODEL_REGISTRY[provider].models.find((m: any) => m.id === id)
    assert.ok(model, key)
    assert.ok(route.sources.every((s: string) => s.startsWith('https://')), key)
    for (const operation of ['generation', 'editing']) {
      const field = operation === 'generation' ? 'aspectRatios' : 'refineAspectRatios'
      const contract: ImageSizeContract | undefined = config.profiles[route[operation]]
      const maps = model.capabilities[field + 'ByResolution']
      if (!contract) { assert.deepEqual(maps, {}, key); continue }
      assert.deepEqual(maps, imageAspectRatiosByResolution(contract, CANONICAL_ASPECT_RATIOS), key)
      for (const resolution of Object.keys(contract.tiers)) {
        const options = buildAspectRatioOptions({capabilities:model.capabilities, capabilityField:field, resolution})
        for (const {value:ratio,disabled} of options) {
          if (disabled) { assert.throws(() => resolveImageSize(contract, ratio, resolution), key); continue }
          const result = resolveImageSize(contract, ratio, resolution); combinations++
          if (result.width && result.height && contract.mode === 'pixels') {
            const w = result.width, h = result.height
            assert.ok(Number.isInteger(w) && Number.isInteger(h), key)
            assert.ok(w >= (contract.minSide ?? 1) && h >= (contract.minSide ?? 1), key)
            assert.ok(w <= (contract.maxSide ?? 16384) && h <= (contract.maxSide ?? 16384), key)
            assert.ok(w * h >= (contract.minPixels ?? 1) && w * h <= (contract.maxPixels ?? 20 * 1024 ** 2), key)
            assert.equal(w % (contract.alignment ?? 1), 0, key); assert.equal(h % (contract.alignment ?? 1), 0, key)
            const [rw, rh] = (ratio === 'auto' ? '1:1' : ratio).split(':').map(Number)
            assert.ok(Math.abs(w / h - rw / rh) < 1e-10, key)
          }
        }
      }
      assert.throws(() => resolveImageSize(contract, '1:1', '8K'), key)
      assert.throws(() => resolveImageSize(contract, '0:0', Object.keys(contract.tiers)[0]), key)
    }
  }
  t.diagnostic(`${combinations} legal selections checked`)
  assert.ok(combinations > 3500, `expected broad coverage, got ${combinations}`)
})

test('regressions: minimum area, decimal ratios, alignment, channel differences and operation limits', () => {
  const q = resolveImageSize(config.profiles.qwen, '1:8', '1K')
  assert.ok(q.width! * q.height! >= 262144)
  const ark = resolveImageSize(config.profiles.ark45, '16:9', '2K')
  assert.ok(ark.width! * ark.height! >= 3686400)
  assert.equal(ark.width! / ark.height!, 16 / 9)
  assert.equal(resolveImageSize(config.profiles.ark45, 'auto', '2K').size, '2K')
  const decimal = resolveImageSize(config.profiles.gpt2, '19.5:9', '4K')
  assert.equal(decimal.width! % 16, 0); assert.equal(decimal.height! % 16, 0)
  assert.throws(() => resolveImageSize(config.profiles.gpt2, '1:4', '4K'))
  assert.throws(() => resolveImageSize(config.profiles.wan, '1:1', '4K'))
  assert.ok(resolveImageSize(config.profiles.wanPro, '1:8', '4K').width)
  assert.throws(() => resolveImageSize(config.profiles.wanOld, '1:8', '1K'))
  assert.equal(resolveImageSize(config.profiles['siliconflow-Qwen-Qwen-Image'], '4:3', '1K').size, '1472x1140')
  assert.equal(resolveImageSize(config.profiles['siliconflow-Kwai-Kolors-Kolors'], '1:2', '1K').size, '720x1440')
  assert.throws(() => resolveImageSize({mode:'pixels',tiers:{'1K':{}},minSide:1024,maxSide:512},'1:1','1K'))
})
