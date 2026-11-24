// Restore dated report inputs only after checking the exact reviewed batch deltas.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { cardsBeforeVersionReview } from './catalog-version-review.mjs'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const bytes = fs.readFileSync(new URL('./fixtures/retirement-projections-20261117.json.gz', import.meta.url))
assert.equal(hash(bytes), '3f7a5c02f553cd9246c2584c8dd8a76e567775dd668818a698c059f3388b3ee0')
const {scopes, sources} = JSON.parse(gunzipSync(bytes))

const november24 = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/catalog-projections-20261124.json.gz', import.meta.url))))
export const november24Projection = (scope, key) => november24[scope].find(row => row.key === key)
export function beforeNovember24(scope, rows) {
  return restoreBatch({...rows}, november24[scope])
}

export function catalogBeforeNovember24(catalog) {
  const models = Object.fromEntries(Object.entries(catalog).flatMap(([provider,entry]) => entry.models.map(model => [provider+'/'+model.id, model])))
  assert.equal(catalog.tokenhub.defaults.image, '')
  catalog = {...catalog, tokenhub:{...catalog.tokenhub, defaults:{...catalog.tokenhub.defaults,image:'hy-image-v3'}}}
  const before = Object.entries(beforeNovember24('catalog',models))
  return Object.fromEntries(Object.entries(catalog).map(([provider,entry]) =>
    [provider, {...entry, models:before.filter(([key]) => key.startsWith(provider+'/')).map(([,model]) => model)}]))
}

export function beforeRetirements(scope, rows) {
  rows = beforeNovember24(scope, rows)
  const {patches, rows:count} = scopes[scope]
  assert.equal(Object.keys(rows).length, count, scope + ' historical identity count drift')
  const previous = scope === 'cards' ? cardsBeforeVersionReview(rows) : {...rows}
  return restoreBatch(previous, patches)
}

function restoreBatch(copy, patches) {
  const missing = []
  for (const {key, before, afterSha256, index} of patches) {
    const actual = copy[key] ?? null
    assert.equal(hash(JSON.stringify(actual)), afterSha256, key + ' unreviewed current presentation drift')
    if (actual === null) missing.push([index, key, before])
    else if (before === null) delete copy[key]
    else copy[key] = structuredClone(before)
  }
  const entries = Object.entries(copy)
  for (const [index, key, value] of missing) entries.splice(index, 0, [key, structuredClone(value)])
  return Object.fromEntries(entries)
}
export function previousSourceReview(review) {
  return Object.fromEntries(Object.entries(review).map(([client, rows]) => [client,
    Object.values(beforeRetirements(client, Object.fromEntries(rows.map(row => [row.card, row]))))]))
}
export function batchSourceRows(client, key, prior) {
  const change = sources[client][key]
  if (!change) return prior
  assert.deepEqual(prior.map(r => r.url), change.before.map(r => r.url), key + ' previous source order')
  return structuredClone(change.after)
}
export function batchPrimary(key, fallback) {
  return sources.web[key]?.after[0] || fallback
}

export function previousBatchSources(client, key, rows) {
  const change = sources[client][key]
  if (!change) return rows
  assert.deepEqual(rows, change.after, key+' batch source drift')
  return structuredClone(change.before)
}
