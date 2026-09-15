const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '../miniprogram')
const packed = require('../miniprogram/utils/static-model-catalog-data.js')
const { unpackModelCatalog } = require('../miniprogram/utils/unpack-model-catalog.js')
const catalog = require('../miniprogram/utils/static-model-catalog.js')

test('packed catalog restores every canonical field without sharing mutable model data', () => {
  const restored = { channels: catalog.EXTENDED_MODEL_CHANNELS, registry: catalog.STATIC_MODEL_REGISTRY }
  assert.equal(createHash('sha256').update(JSON.stringify(restored)).digest('hex'), packed.sourceDigest)
  const reference = unpackModelCatalog(packed)
  assert.deepEqual(restored, reference)
  // The uncompressed Web output remains an independent source-side oracle.
  const web = path.resolve(__dirname, '../../web/src/lib/staticModelCatalog.js')
  if (fs.existsSync(web)) {
    const source = fs.readFileSync(web, 'utf8').replace(/export const /g, 'const ')
    const original = require('node:vm').runInNewContext(`${source}; ({channels: EXTENDED_MODEL_CHANNELS, registry: STATIC_MODEL_REGISTRY})`)
    assert.equal(JSON.stringify(restored), JSON.stringify(original))
  }
  const containers = new Set()
  function walk(value) {
    if (!value || typeof value !== 'object') return
    assert.ok(!containers.has(value), 'decoded objects and arrays must not alias between models')
    containers.add(value)
    Object.values(value).forEach(walk)
  }
  walk(restored)
})

test('main package and static media stay within conservative source byte budgets', () => {
  function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name)
      return entry.isDirectory() ? files(file) : [file]
    })
  }
  const all = files(root)
  const bytes = (list) => list.reduce((n, file) => n + fs.statSync(file).size, 0)
  assert.ok(bytes(all) < 1.5 * 1024 * 1024, `including TS sources, total is ${bytes(all)} bytes`)
  const media = all.filter((file) => /\.(png|jpe?g|svg|webp|gif|mp3|wav|aac|mp4)$/i.test(file))
  assert.ok(bytes(media) < 200 * 1024, `media total is ${bytes(media)} bytes`)
  // WeChat compiles TS and minifies JS; even the unminified runtime stays below
  // the quality threshold. This check is not a substitute for its native scan.
  const runtime = all.filter((file) => !file.endsWith('.ts'))
  assert.ok(bytes(runtime) < 1.5 * 1024 * 1024, `runtime source total is ${bytes(runtime)} bytes`)
})
