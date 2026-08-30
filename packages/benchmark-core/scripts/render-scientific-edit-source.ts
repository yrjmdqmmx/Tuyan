import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

import { SCIENTIFIC_EDIT_SOURCE } from '../src/scientific-edit-source.js'
import { renderScientificEditPng } from './scientific-edit-assets.js'

const svg = readFileSync(SCIENTIFIC_EDIT_SOURCE.svgPath)
const png = await renderScientificEditPng(svg)
const sourceHash = createHash('sha256').update(png).digest('hex')

if (png.readUInt32BE(16) !== SCIENTIFIC_EDIT_SOURCE.width
  || png.readUInt32BE(20) !== SCIENTIFIC_EDIT_SOURCE.height
  || sourceHash !== SCIENTIFIC_EDIT_SOURCE.sourceHash) {
  throw new Error(`SCIENTIFIC_EDIT_RENDER_DRIFT:${png.readUInt32BE(16)}x${png.readUInt32BE(20)}:${sourceHash}`)
}
writeFileSync(SCIENTIFIC_EDIT_SOURCE.pngPath, png)
