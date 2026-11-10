// R31 Phase I14: verify today's display before projecting immutable main reports.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { projectionPaths } from './historical-card-projections.mjs'

const bytes = fs.readFileSync(new URL('../../test-support/fixtures/historical-card-reports-i14.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'), '8fc45a044f359c583a5c81a22d4de1f5daebca1cdbc5c2f4ae67587083da1b5d', 'I14 historical projection fixture drift')
const history = JSON.parse(gunzipSync(bytes))
assert.equal(history.baseline, '52e0f161')
assert.equal(history.reviewedHead, 'bdcc2baf')
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export function historicalCardRows(scope, rows) {
  const review = history.projections[scope]
  assert.ok(review && Object.hasOwn(projectionPaths, scope), 'Unknown historical report scope: ' + scope)
  assert.equal(rows.length, review.rows, scope + ' historical identity count drift')
  assert.equal(hash(rows), review.currentSha256, scope + ' unreviewed current presentation drift')
  const copy = structuredClone(rows)
  for (const patch of review.patches) {
    assert.ok(projectionPaths[scope].includes(patch.path), scope + ' non-presentation patch')
    assert.equal(copy[patch.index].key, patch.key, scope + ' historical identity/order drift')
    const keys = patch.path.split('/'), last = keys.pop()
    const parent = keys.reduce((value, key) => value[key], copy[patch.index])
    assert.deepEqual(parent[last], patch.after, patch.key + '/' + patch.path + ' reviewed presentation drift')
    parent[last] = structuredClone(patch.before)
  }
  assert.equal(hash(copy), review.historicalSha256, scope + ' main presentation drift')
  return copy
}
