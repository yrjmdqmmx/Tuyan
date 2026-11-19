import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { unpackRegistry, rowsOf, countCards, loadCard } from '../../../scripts/lib/model-card-audit.mjs'
import { fileURLToPath } from 'node:url'
import headFixture from './fixtures/r11-registry-head.json' with { type: 'json' }
import linkFixture from './fixtures/r11-link-check-20261109.json' with { type: 'json' }
import counts from '../../../docs/model-card-audit-20261109-r11-counts.json' with { type: 'json' }
const registry = unpackRegistry(headFixture), rows = rowsOf(registry)

test('R11 captured full Core objects reproduce historical counts with their archived resolver; R21 has separate current coverage', async () => {
  const historicalCard = await loadCard(fileURLToPath(new URL('../../../', import.meta.url)), '8c456709')
  assert.equal(rows.length, 1061)
  for (const idOnly of [false, true]) {
    const result = countCards(rows, historicalCard, idOnly)
    const expected = counts.head[idOnly ? 'idOnly' : 'fullObject']
    assert.deepEqual(result.totals, expected.totals)
    assert.deepEqual(result.perChannel, expected.perChannel)
  }
  assert.deepEqual(Object.values(counts.head.fullObject.totals).slice(0, 5), [1061, 997, 967, 926, 616])
  assert.deepEqual(Object.values(counts.head.idOnly.totals).slice(0, 5), [1061, 403, 397, 390, 260])
  assert.ok(rows.filter(row => row.model.specificModelSpecifications).length > 500)
  assert.deepEqual(counts.unexplainedLosses, [])
  assert.ok(counts.losses.every(row => row.reason === 'removed-model' && row.removalSource))
})

// R12D owns current full-object links, DOM checks and explicit HTTP exceptions.
// Keep R11's ID-only scope solely as a check of the archived evidence.
test('R11 retains all 46 historical ID-only links and their original HTTP evidence', () => {
  const doc = fs.readFileSync(new URL('../../../docs/model-card-audit-20261109.md', import.meta.url), 'utf8')
  const section = doc.split('### R9 附录：46 张首链接变化完整列表')[1].split('\n## ')[0]
  const expected = [...section.matchAll(/^\| `([^/`]+)\/([^`]+)` \| (\S+) \| (\S+) \|$/gm)]
    .map(([, channel, modelId, oldUrl, newUrl]) => ({ channel, modelId, oldUrl, newUrl }))
  assert.equal(expected.length, 46)
  assert.deepEqual(linkFixture.rows.map(({ channel, modelId, oldUrl, newUrl }) => ({ channel, modelId, oldUrl, newUrl })), expected)
  assert.equal(new Set(linkFixture.rows.map(row => row.channel + '/' + row.modelId)).size, 46)
  assert.match(linkFixture.method, /GET.*browser.*follow.*25s/)
  for (const row of linkFixture.rows) {
    assert.ok(Object.hasOwn(row, 'status')); assert.ok(Number.isFinite(Date.parse(row.checkedAt)))
    assert.equal(row.checkedAt, '2026-11-09T09:45:47.209Z')
    assert.equal(row.status, 200); assert.equal(row.redirected, false); assert.equal(row.finalUrl, row.newUrl)
  }
})
