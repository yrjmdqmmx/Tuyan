import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { applyPhase2 } from './lib/model-modality-phase2.mjs'
import evidence from '../config/channel-audit/model-modality-phase2-20261109.json' with { type: 'json' }
const snapshot = JSON.parse(fs.readFileSync(new URL('../config/model-audit.generated.json', import.meta.url)))
test('phase 2 generation rejects missing provenance, wrong channel/date and table values that disagree with exact quotes', () => {
  const key = Object.keys(evidence.tables)[0]
  for (const change of [row => row.quote = '', row => row.sourceUrl = 'https://example.com/model', row => row.verifiedAt = '2026-09-01', row => row.inputModalities = ['audio'], row => row.identityQuote = 'another-model']) {
    const bad = structuredClone(evidence); change(bad.tables[key])
    assert.throws(() => applyPhase2(structuredClone(snapshot), bad), /phase 2|table identity|Table values/)
  }
  const bad = structuredClone(evidence)
  bad.reviews['qianfan/kimi-k2.6'].inputModalities.decisions.video = 'unsupported'
  assert.throws(() => applyPhase2(structuredClone(snapshot), bad), /Invalid phase 2 decision/)
  const wrongLink = structuredClone(evidence)
  wrongLink.links['replicate/google/imagen-3'].attempts[0].finalUrl = 'https://example.com/model'
  assert.throws(() => applyPhase2(structuredClone(snapshot), wrongLink), /Invalid phase 2 availability evidence/)
})
test('phase 2 evidence covers every requested identity and treats seven unavailable pages as unverified', () => {
  const misleading = JSON.parse(fs.readFileSync(new URL('../docs/model-card-audit-20261109-r11-misleading.json', import.meta.url)))
  for (const row of misleading.rows) assert.ok(evidence.reviews[row.channel + '/' + row.modelId][row.field.split('/')[0] + 'Modalities'].decisions[row.field.split('/')[1]])
  assert.equal(Object.keys(evidence.links).length, 7)
  for (const [key, row] of Object.entries(evidence.links)) {
    assert.equal(row.availability, 'unverified', key)
    assert.ok(row.attempts.length > 0)
    assert.equal(snapshot.removed[key], undefined)
    for (const attempt of row.attempts) {
      assert.ok(attempt.quote.trim())
      assert.equal(attempt.checkedAt.slice(0, 10), evidence.verifiedAt)
      assert.ok([200, 404].includes(attempt.status))
    }
  }
})
