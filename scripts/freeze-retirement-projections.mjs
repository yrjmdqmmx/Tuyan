// Capture the November 9 report inputs before and after the November 17 batch.
// Supply a git archive of bf866c9b with the same local workspace dependencies.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { fileURLToPath, pathToFileURL } from 'node:url'
import batch from '../config/channel-audit/retirements-20261117.json' with { type: 'json' }
import { cardsBeforeVersionReview } from '../test-support/catalog-version-review.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const baseline = 'bf866c9ba4138e45019910b9b6ad947b4f3740f9'
const keyOf = row => row.provider + '/' + row.id
const affected = new Set([...batch.remove, ...batch.upcoming].map(keyOf))
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
async function capture(directory) {
  const load = file => import(pathToFileURL(path.resolve(directory, file)))
  const {imageInputPresentations} = await load('test-support/image-input-r27.mjs')
  const {collectSourceReview} = await load('test-support/source-review-r24.mjs')
  const {loadCard, readPackedRegistry} = await load('scripts/lib/model-card-audit.mjs')
  const {r10Rows, r12Models, r12Links} = await load('scripts/lib/historical-card-projections.mjs')
  const {modalityIconStates} = await load('apps/web/src/lib/modelModalityIcons.js')
  const {STATIC_MODEL_REGISTRY: catalog} = await load('apps/web/src/lib/staticModelCatalog.js')
  const card = await loadCard(directory)
  const registry = readPackedRegistry(path.join(directory,'apps/web/tests/fixtures/r11-registry-head.json'))
  const models = r12Models(catalog, registry)
  const before = JSON.parse(fs.readFileSync(path.join(directory,'apps/web/tests/fixtures/r12-links-before.json')))
  const review = await collectSourceReview()
  const byKey = rows => Object.fromEntries(rows.map(row => [row.key, row]))
  return {
    cards: await imageInputPresentations(),
    ...Object.fromEntries(Object.entries(review).map(([client, rows]) => [client, Object.fromEntries(rows.map(row => [row.card,row]))])),
    r10: byKey(r10Rows(registry,card,modalityIconStates)),
    r12Full: byKey(r12Links(before.rows,card,row => models.get(row.channel+'/'+row.modelId))),
    r12Static: byKey(r12Links(before.staticApiOnlyRows,card,row => catalog[row.channel].models.find(m => m.id === row.modelId))),
  }
}
const archive = process.argv.slice(2).find(arg => !arg.startsWith('--'))
if (!archive) throw Error('Expected path to extracted bf866c9b archive')
const prior = await capture(path.resolve(archive)), current = await capture(root)
current.cards = cardsBeforeVersionReview(current.cards)
assert.equal(hash(prior), '71dacbbacf9ace8889a250a74e0dc9c99720d19b8058dffa1019c31f6fe1cb28',
  'The supplied archive must reproduce the independently captured bf866c9b presentation')
const scopes = {}, sources = {web:{}, mini:{}}
for (const [name, previous] of Object.entries(prior)) {
  const next = current[name], patches = []
  const keys = Object.keys(previous)
  for (const key of new Set([...keys, ...Object.keys(next)])) {
    const before = previous[key] ?? null, after = next[key] ?? null
    if (hash(before) === hash(after)) continue
    assert.ok(affected.has(key), name + ': unexpected change outside retirement batch: ' + key)
    patches.push({ key, index:keys.indexOf(key), before, afterSha256:hash(after) })
    if (sources[name] && before && after && hash(before.rows) !== hash(after.rows))
      sources[name][key] = { before:before.rows, after:after.rows }
  }
  scopes[name] = {rows:Object.keys(next).length, patches}
}
const output = new URL('../test-support/fixtures/retirement-projections-20261117.json.gz', import.meta.url)
const bytes = gzipSync(JSON.stringify({baseline,scopes,sources}), {level:9})
if (process.argv.includes('--check')) assert.deepEqual(fs.readFileSync(output), bytes, 'Retirement projection fixture drift')
else fs.writeFileSync(output, bytes)
console.log(createHash('sha256').update(bytes).digest('hex'))
