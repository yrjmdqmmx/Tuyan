// Explicit read-only Git capture. Never check out or write a baseline worktree.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { gitText, requireHistory } from './lib/git-history.mjs'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { readPackedRegistry, rowsOf } from './lib/model-card-audit.mjs'
import { isApiSource } from '../apps/web/src/lib/modelCardSources.js'
const root = fileURLToPath(new URL('../', import.meta.url))
requireHistory(root, ['6d88b28f', '785b99df', '8c456709'])
async function cardAt(commit) {
  const result = await build({ entryPoints: [root + 'apps/web/src/lib/modelCardSpecifications.js'], bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'read-commit', setup(build) { build.onLoad({ filter: /\.(js|json)$/ }, ({ path: file }) => ({
      contents: gitText(root, commit, path.relative(root, file)),
      loader: file.endsWith('.json') ? 'json' : 'js', resolveDir: path.dirname(file),
    })) } }] })
  const module = { exports: {} }; new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports)
  return module.exports.modelCardSpecifications
}
const before = await cardAt('6d88b28f'), r8 = await cardAt('785b99df')
// Preserve the original input objects as well as the two historical renderers.
const STATIC_MODEL_REGISTRY = vm.runInNewContext(gitText(root, '8c456709', 'apps/web/src/lib/staticModelCatalog.js')
  .replace(/export const /g, 'const ') + ';STATIC_MODEL_REGISTRY')
const full = rowsOf(readPackedRegistry(root + 'apps/web/tests/fixtures/r11-registry-head.json'))
const rows = new Map(rowsOf(STATIC_MODEL_REGISTRY).map(row => [row.channel + '/' + row.model.id, row]))
for (const row of full) rows.set(row.channel + '/' + row.model.id, row)
const fixture = { baseline: '785b99df (R8/pre-R9)', before: '6d88b28f (R11)', scope: 'Full captured registry models; 3 static-only models included. Both revisions rendered with their own code/data, same model objects.',
  rows: [...rows.values()].map(({ channel, model }) => ({ channel, modelId: model.id, oldUrl: r8(channel, model).sources[0] || null, r11Url: before(channel, model).sources[0] || null }))
    .sort((a,b) => (a.channel+'/'+a.modelId).localeCompare(b.channel+'/'+b.modelId, 'en')) }
// Check specificity for the static/Mini projection independently of Core.
fixture.staticRows = rowsOf(STATIC_MODEL_REGISTRY).map(({ channel, model }) => ({ channel, modelId: model.id, r11Url: before(channel, model).sources[0] || null }))
  .sort((a, b) => (a.channel + '/' + a.modelId).localeCompare(b.channel + '/' + b.modelId, 'en'))
fixture.staticApiOnlyRows = fixture.staticRows.flatMap(({ channel, modelId, r11Url }) => {
  const fullUrl = fixture.rows.find(row => row.channel === channel && row.modelId === modelId).r11Url
  return r11Url && isApiSource(r11Url) && !isApiSource(fullUrl) ? [{ channel, modelId, oldUrl: r11Url }] : []
})
const output = root + 'apps/web/tests/fixtures/r12-links-before.json', text = JSON.stringify(fixture, null, 2) + '\n'
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(output, 'utf8'), text, 'R12 link fixture drift')
else fs.writeFileSync(output, text)
