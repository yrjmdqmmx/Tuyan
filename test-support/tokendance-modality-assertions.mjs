import assert from 'node:assert/strict'
import fs from 'node:fs'
export const tokenDanceSnapshot = JSON.parse(fs.readFileSync(new URL('../config/channel-audit/tokendance-catalog-snapshot-20261109b.json', import.meta.url)))
export const tokenDanceBefore = JSON.parse(fs.readFileSync(new URL('../config/channel-audit/tokendance-card-before-r21.json', import.meta.url)))
export function assertTokenDanceFacts(resolve) {
  let known = 0, unknown = 0
  for (const { id } of tokenDanceBefore.rows) {
    const fields = resolve(id).fields, capture = tokenDanceSnapshot.portal[id]
    for (const [field, wire] of [['inputModalities', 'input_modalities'], ['outputModalities', 'output_modalities']]) {
      const fact = fields[field]
      if (capture?.status === 200) {
        assert.deepEqual(fact.value, capture.architecture[wire], id + '/' + field)
        assert.equal(fact.state, 'known', id)
        assert.equal(fact.provenance, 'channel', id)
        assert.equal(fact.sourceUrl, 'https://tokendance.space/models/' + id, id)
        assert.equal(fact.verifiedAt, '2026-11-09', id)
        assert.deepEqual(fact.unsupportedModalities, ['text', 'image', 'audio', 'video'].filter(value => !fact.value.includes(value)), id)
      } else {
        assert.equal(fact.value, null, id)
        assert.equal(fact.state, 'unknown', id)
        assert.equal(fact.provenance, null, id)
        assert.equal(fact.sourceUrl, null, id)
        assert.equal(fact.suppressFallback, true, id)
      }
    }
    capture?.status === 200 ? known++ : unknown++
  }
  assert.deepEqual({ known, unknown }, { known: 67, unknown: 7 })
  const qwen = resolve('qwen3.6-plus').fields.inputModalities
  assert.deepEqual(qwen.value, ['text'])
  for (const value of ['image', 'video']) assert.ok(qwen.unsupportedModalities.includes(value))
  for (const [id, values] of [['kimi-k3.1-pro', ['image', 'video']], ['minimax-m3.1-flash', ['image']], ['deepseek-v4.1-flash-1017', ['image']]])
    for (const value of values) assert.ok(resolve(id).fields.inputModalities.value.includes(value), id + '/' + value)
}
