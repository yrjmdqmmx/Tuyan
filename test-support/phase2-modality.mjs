import assert from 'node:assert/strict'
import historicalEvidence from '../config/channel-audit/model-modality-phase2-20261109.json' with { type: 'json' }
import imageInputR27 from '../config/channel-audit/review-r27-20261110.json' with { type: 'json' }
import snapshot from '../config/channel-audit/tokendance-catalog-snapshot-20261109b.json' with { type: 'json' }
import before from '../config/channel-audit/model-modality-phase2-before-20261109.json' with { type: 'json' }
import { tokenDanceTestRuntime } from './tokendance-runtime-r17.mjs'
export { historicalEvidence }
export const evidence = {...historicalEvidence, reviews:{...historicalEvidence.reviews, ...imageInputR27.reviews}}
export function assertPhase2Facts(get, compact = false, evidence = {...historicalEvidence, reviews:{...historicalEvidence.reviews, ...imageInputR27.reviews}}) {
  assert.equal(Object.keys(evidence.tables).length, 34)
  assert.equal(Object.keys(evidence.reviews).length, 27)
  let decisions = 0
  for (const [key, row] of Object.entries(evidence.tables)) for (const field of ['inputModalities', 'outputModalities']) {
    const fact = get(key).fields[field]
    assert.deepEqual(fact.value, row[field], key + '/' + field)
    assert.equal(fact.state, 'known', key)
    assert.equal(fact.provenance, 'channel', key)
    assert.equal(fact.verifiedAt, row.verifiedAt, key)
    if (!compact) assert.equal(fact.sourceUrl, row.sourceUrl, key)
    assert.deepEqual(fact.unsupportedModalities, ['text', 'image', 'audio', 'video'].filter(id => !row[field].includes(id)), key)
  }
  for (const [key, rows] of Object.entries(evidence.reviews)) for (const [field, row] of Object.entries(rows)) for (const [id, state] of Object.entries(row.decisions)) {
    const fact = get(key).fields[field]
    assert.equal(fact.value?.includes(id) || false, state === 'supported', key + '/' + field + '/' + id)
    assert.equal(fact.unsupportedModalities?.includes(id) || false, false, key + ' silence never becomes unsupported')
    if (row.mode === 'positive-only') {
      assert.equal(fact.provenance, 'channel', key)
      assert.equal(fact.verifiedAt, row.verifiedAt, key)
      if (!compact) assert.equal(fact.sourceUrl, row.sourceUrl, key)
    }
    if (row.mode === 'mask') for (const previous of before.rows[key].fields[field].value || []) {
      if (!(previous in row.decisions)) assert.ok(fact.value?.includes(previous), key + ' retains unrelated ' + previous)
    }
    decisions++
  }
  assert.equal(decisions, 30)
}
export async function phase2Registry() {
  const runtime = await tokenDanceTestRuntime('snapshot')
  try {
    runtime.legacy.configureRuntimeFetch(async url => String(url) === snapshot.sourceUrl
      ? Response.json({data:snapshot.data}) : Response.json({error:'offline fixture'}, {status:503}))
    const registry = await runtime.legacy.modelRegistry({})
    assert.equal(runtime.providerCalls.length, 0)
    return registry
  } finally { await runtime.close() }
}
