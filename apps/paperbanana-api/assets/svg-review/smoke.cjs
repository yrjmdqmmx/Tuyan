'use strict'

// Runs against the deploy package in Docker, so missing fonts/worker/dependencies
// break the image build instead of silently omitting production figure labels.
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { join } = require('node:path')
const { renderSvgForReview } = require(join(__dirname, '../../dist/svg-review.cjs'))

async function main() {
  const source = text => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><rect width="400" height="100" fill="white"/>${text}</svg>`
  const empty = await renderSvgForReview(source(''))
  const text = await renderSvgForReview(source('<text x="12" y="60" font-size="30">科学研究 α ∑ 𝑥₂</text>'), {localQualityChecks:true})
  assert.equal(text.localQuality.status, 'not_applicable')
  assert.notEqual(text.pngHash, empty.pngHash)
  assert.equal(text.svgHash, createHash('sha256').update(text.svg).digest('hex'))
  assert.deepEqual([text.width, text.height], [400, 100])
  assert.equal(text.fontInfo.families.length, 3)
  assert.match(text.renderer, /memory-256MiB/)
  const full = await renderSvgForReview('<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="2000"><rect width="4000" height="2000" fill="white"/><text x="100" y="300" font-size="100">科研流程 α β ∑ ∫ ℝ 𝑥₂ H₂O</text></svg>')
  assert.deepEqual([full.width, full.height], [4000, 2000])
  assert.ok(full.png.length > 1000)
  console.log('SVG review runtime smoke passed: real 8MP Chinese/scientific text, pinned fonts, exact hashes, 256MiB WASM maximum')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
