import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { titleBaseline } from '../test-support/source-titles-r23.mjs'

test('R23F pre-title inventory is lossless and history independent for 1064 cards per client', () => {
  const bytes=gunzipSync(fs.readFileSync(new URL('../test-support/fixtures/source-titles-1dcd8b13.json.gz',import.meta.url)))
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'92df8770927c968eb0ef294b9a853eaede1ad6dd28c7372151a70e5ab026a5a9')
  assert.equal(titleBaseline.head,'1dcd8b13')
  for(const client of ['web','mini']) {
    assert.equal(titleBaseline[client].length,1064)
    assert.equal(new Set(titleBaseline[client].map(row=>row.card)).size,1064)
  }
})

test('R23F complete title inventory stays reproducible with no unresolved heuristic findings', () => {
  execFileSync(process.execPath,['scripts/report-source-titles-r23.mjs','--check'],{cwd:new URL('../',import.meta.url),stdio:'pipe'})
})
