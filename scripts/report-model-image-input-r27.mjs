import fs from 'node:fs'
import assert from 'node:assert/strict'
import {imageInputPresentations, assertPresentationChanges} from '../test-support/image-input-r27.mjs'

const report = assertPresentationChanges(await imageInputPresentations())
const target = new URL('../docs/model-modality-r27-i7-card-diff.json', import.meta.url)
const content = JSON.stringify(report, null, 2) + '\n'
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target, 'utf8'), content)
else fs.writeFileSync(target, content)
console.log(JSON.stringify({...report, rows:report.rows.map(row => row.key)}, null, 2))
