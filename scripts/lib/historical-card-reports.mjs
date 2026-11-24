// R31 Phase I14: verify today's display before projecting immutable main reports.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { projectionPaths } from './historical-card-projections.mjs'
import { beforeRetirements } from '../../test-support/retirement-projections.mjs'

const bytes = fs.readFileSync(new URL('../../test-support/fixtures/historical-card-reports-i14.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'), '8fc45a044f359c583a5c81a22d4de1f5daebca1cdbc5c2f4ae67587083da1b5d', 'I14 historical projection fixture drift')
const history = JSON.parse(gunzipSync(bytes))
assert.equal(history.baseline, '52e0f161')
assert.equal(history.reviewedHead, 'bdcc2baf')
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export function historicalCardRows(scope, rows) {
  const review = history.projections[scope]
  assert.ok(review && Object.hasOwn(projectionPaths, scope), 'Unknown historical report scope: ' + scope)
  const batchPolicy = []
  if (scope === 'r12Policy') {
    const added = new Map([
      ['https://cloud.baidu.com/doc/qianfan/s/zmh4stou3', 2],
      ['https://docs.mistral.ai/getting-started/models/', 1],
      ['https://docs.siliconflow.cn/cn/release-notes/overview', 1],
      ['https://docs.together.ai/docs/deprecations', 2],
      ['https://docs.volcengine.com/docs/ark/model-deprecation-notice?lang=zh', 2],
      ['https://runware.ai/docs/changelog', 2],
      ['https://www.alibabacloud.com/zh/notice/model_studio_notice_of_retirement_for_selected_legacy_models_7d9?_p_lc=1', 2],
      ['https://www.alibabacloud.com/zh/notice/model_studio_notice_on_the_postponed_retirement_of_selected_legacy_models_7d0?_p_lc=1', 2],
      ['https://developers.openai.com/api/docs/deprecations', 2],
      ['https://docs.siliconflow.cn/docs/release-notes/overview', 1],
      ['https://platform.minimax.io/docs/faq/models', 1],
      ['https://ai.google.dev/gemini-api/docs/deprecations', 2],
    ])
    assert.equal(rows.length, review.rows + added.size, scope + ' historical identity count drift')
    assert.deepEqual(rows.map(row => row.key), rows.map(row => row.key).sort(), scope + ' unreviewed current presentation drift')
    for (const [key, specificity] of added) {
      const row = rows.find(row => row.key === key)
      assert.deepEqual(row, {key, api:false, dead:false, specificity}, scope + ' unreviewed current presentation drift')
      batchPolicy.push(row)
    }
    rows = rows.filter(row => !added.has(row.key))
  } else {
    assert.equal(rows.length, review.rows, scope + ' historical identity count drift')
    const byKey = Object.fromEntries(rows.map(row => [row.key, row]))
    rows = Object.values(beforeRetirements(scope, byKey))
  }
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
  return batchPolicy.length ? [...copy,...batchPolicy].sort((a,b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0) : copy
}
