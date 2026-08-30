import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SVG_HASH = '63301dfa409425e311f73af69c8ce3aa844893ce8706560a6c4c211c45167c18'
const PNG_SOURCE_HASH = '484ca42fba92295797cf8875ac8c2a8e80edf242bc9710e6b9fb23aa1b24a0f3'
const WIDTH = 2048
const HEIGHT = 1152
const svgPath = fileURLToPath(new URL('../assets/scientific-edit-source-v2.svg', import.meta.url))
const pngPath = fileURLToPath(new URL('../assets/scientific-edit-source-v2.png', import.meta.url))

function sha256(value: Uint8Array) {
  return createHash('sha256').update(value).digest('hex')
}

export function readScientificEditSourcePng() {
  const svg = readFileSync(svgPath)
  if (sha256(svg) !== SVG_HASH) throw new Error('SCIENTIFIC_EDIT_SVG_HASH_MISMATCH')
  const png = readFileSync(pngPath)
  if (sha256(png) !== PNG_SOURCE_HASH) throw new Error('SCIENTIFIC_EDIT_PNG_HASH_MISMATCH')
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || png.readUInt32BE(16) !== WIDTH
    || png.readUInt32BE(20) !== HEIGHT) {
    throw new Error('SCIENTIFIC_EDIT_PNG_DIMENSION_MISMATCH')
  }
  return png
}

export const SCIENTIFIC_EDIT_SOURCE = Object.freeze({
  svgPath,
  pngPath,
  svgHash: SVG_HASH,
  sourceHash: PNG_SOURCE_HASH,
  width: WIDTH,
  height: HEIGHT,
  regions: Object.freeze(['01-text-label', '02-node-arrow', '03-color-legend-callout'] as const),
})
