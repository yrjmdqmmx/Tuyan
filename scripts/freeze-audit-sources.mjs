// Archive only the two card dependency graphs and the static catalog used by tests.
// No runtime/Core history is shipped: execution tests already have frozen outputs.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { loadCard } from './lib/model-card-audit.mjs'
import { gitText, requireHistory } from './lib/git-history.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const commits = ['8c456709', 'd1fe6ff6']
requireHistory(root, commits)
const sources = {}
for (const commit of commits) {
  const files = {}
  const capture = (root, revision, file) => files[file] ??= gitText(root, revision, file)
  await loadCard(root, commit, capture)
  if (commit === 'd1fe6ff6') capture(root, commit, 'apps/web/src/lib/staticModelCatalog.js')
  sources[commit] = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en')))
}
const manifest = Object.fromEntries(Object.entries(sources).map(([commit, files]) => [commit,
  Object.fromEntries(Object.entries(files).map(([file, text]) => [file, {
    bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex'),
  }])),
]))
const archive = path.join(root, 'test-support/archive/model-card-sources.json.gz')
const index = path.join(root, 'test-support/archive/manifest.json')
const indexText = JSON.stringify(manifest, null, 2) + '\n'
if (process.argv.includes('--check')) {
  // Compare decompressed sources byte for byte, independent of zlib versions.
  assert.deepEqual(JSON.parse(gunzipSync(fs.readFileSync(archive))), sources, 'Frozen audit source bytes differ from git show')
  assert.equal(fs.readFileSync(index, 'utf8'), indexText, 'Frozen audit source manifest drift')
} else {
  fs.mkdirSync(path.dirname(archive), { recursive: true })
  fs.writeFileSync(archive, gzipSync(JSON.stringify(sources), { level: 9 }))
  fs.writeFileSync(index, indexText)
}
console.log(JSON.stringify({ commits, files: Object.values(sources).reduce((n, files) => n + Object.keys(files).length, 0), bytes: fs.statSync(archive).size, check: process.argv.includes('--check') }))
