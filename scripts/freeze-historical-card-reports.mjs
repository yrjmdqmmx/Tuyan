// Explicit R31 I14 capture. Reads Git objects only; never rewrites report artifacts.
// Usage: node scripts/freeze-historical-card-reports.mjs
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { productBundle, root } from '../test-support/execution-capability.mjs'
import { gitText, requireHistory } from './lib/git-history.mjs'
import { readPackedRegistry } from './lib/model-card-audit.mjs'
import { r10Rows, r12Models, r12Links, r12SourceUrls, r12SourcePolicy, projectionPaths } from './lib/historical-card-projections.mjs'

const baseline = '52e0f161', reviewedHead = 'bdcc2baf'
requireHistory(root, [baseline, reviewedHead])
const read = file => JSON.parse(fs.readFileSync(root + file, 'utf8'))
for (const file of ['apps/web/tests/fixtures/r11-registry-head.json', 'apps/web/tests/fixtures/r12-links-before.json']) {
  assert.equal(fs.readFileSync(root + file, 'utf8'), gitText(root, baseline, file), file + ' historical input changed')
}
const registry = readPackedRegistry(root + 'apps/web/tests/fixtures/r11-registry-head.json')
const before = read('apps/web/tests/fixtures/r12-links-before.json')
const source = `
  export { modelCardSpecifications as card } from './apps/web/src/lib/modelCardSpecifications.js';
  export { modalityIconStates as icons } from './apps/web/src/lib/modelModalityIcons.js';
  export { STATIC_MODEL_REGISTRY as registry } from './apps/web/src/lib/staticModelCatalog.js';
  export { isApiSource, isDeadSource, sourceSpecificity } from './apps/web/src/lib/modelCardSources.js';
`
const products = new Map()
async function capture(commit) {
  const product = await productBundle(source, commit, gitText)
  products.set(commit, product)
  const models = r12Models(product.registry, registry)
  return {
    r10: r10Rows(registry, product.card, product.icons),
    r12Full: r12Links(before.rows, product.card, row => models.get(row.channel + '/' + row.modelId)),
    r12Static: r12Links(before.staticApiOnlyRows, product.card,
      row => product.registry[row.channel].models.find(model => model.id === row.modelId)),
  }
}
const historical = await capture(baseline), reviewed = await capture(reviewedHead), live = await capture(null)
const urls = r12SourceUrls(before, historical.r12Full, historical.r12Static, reviewed.r12Full, reviewed.r12Static)
const checksFile = 'config/channel-audit/model-audit-supplement-20261109.json'
for (const [commit, rows] of [[baseline, historical], [reviewedHead, reviewed], [null, live]]) {
  const checks = (commit ? JSON.parse(gitText(root, commit, checksFile)) : read(checksFile)).sourceChecks
  rows.r12Policy = r12SourcePolicy(urls, products.get(commit), checks)
}
// The capture is pinned to the task HEAD, never approved from a drifting worktree.
assert.deepEqual(live, reviewed, 'Current presentation differs from reviewed I14 HEAD')
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const get = (row, path) => path.split('/').reduce((value, key) => value[key], row)
const projections = {}
for (const [scope, paths] of Object.entries(projectionPaths)) {
  const old = historical[scope], current = reviewed[scope], patches = []
  assert.deepEqual(old.map(row => row.key), current.map(row => row.key), scope + ' identities/order')
  for (const [index, row] of current.entries()) for (const path of paths) {
    const before = get(old[index], path), after = get(row, path)
    if (JSON.stringify(before) !== JSON.stringify(after)) patches.push({ index, key: row.key, path, before, after })
  }
  projections[scope] = { rows: current.length, historicalSha256: hash(old), currentSha256: hash(current), patches }
}
const bytes = gzipSync(JSON.stringify({ baseline, reviewedHead, projections }), { level: 9 })
fs.writeFileSync(new URL('../test-support/fixtures/historical-card-reports-i14.json.gz', import.meta.url), bytes)
console.log(JSON.stringify({ sha256: createHash('sha256').update(bytes).digest('hex'),
  scopes: Object.fromEntries(Object.entries(projections).map(([key, value]) => [key, { rows: value.rows, patches: value.patches.length }])) }, null, 2))
