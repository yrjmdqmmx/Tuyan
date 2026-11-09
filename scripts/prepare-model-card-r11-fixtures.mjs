// Explicit offline capture/refresh. Reads baseline only; all writes stay here.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { loadCard, readRegistry, packRegistry, unpackRegistry, rowsOf, countCards } from './lib/model-card-audit.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const base = path.resolve(root, process.argv[2] || '../Tuyan-wt-baseline')
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
for (const [side, codeRoot, commit] of [['head', root, '1576ee00'], ['main', base, 'c7b6a2fc']]) {
  const input = path.join(root, '.audit-input/r11/registry-' + side + '.json')
  const registry = readRegistry(input), packed = packRegistry(registry), card = await loadCard(codeRoot)
  const originalRows = rowsOf(registry), restoredRows = rowsOf(unpackRegistry(packed))
  for (let i = 0; i < originalRows.length; i++) assert.deepEqual(card(originalRows[i].channel, originalRows[i].model), card(restoredRows[i].channel, restoredRows[i].model), side + '/' + originalRows[i].model.id)
  const output = { capture: { commit, source: '.audit-input/r11/registry-' + side + '.json', sha256: sha256(input), models: originalRows.length, cardCodeSha256: sha256(path.join(codeRoot, 'apps/web/src/lib/modelCardSpecifications.js')) }, ...packed }
  // Line-delimited pool/rows keep the deduplicated fixture reviewable.
  fs.writeFileSync(path.join(root, 'apps/web/tests/fixtures/r11-registry-' + side + '.json'), JSON.stringify(output).replace(/\],\[/g, '],\n[') + '\n')
  if (side === 'main') fs.writeFileSync(path.join(root, 'apps/web/tests/fixtures/r11-main-rendered.json'), JSON.stringify({ capture: output.capture, fullObject: countCards(originalRows, card), idOnly: countCards(originalRows, card, true) }) + '\n')
}
const links = JSON.parse(fs.readFileSync(path.join(root, '.audit-input/r11/linkcheck-result.json'), 'utf8'))
fs.writeFileSync(path.join(root, 'apps/web/tests/fixtures/r11-link-check-20261109.json'), JSON.stringify({ method: links.method, rows: links.rows.map(({ channel, modelId, oldUrl, newUrl, newCheck }) => ({ channel, modelId, oldUrl, newUrl, status: newCheck.status, finalUrl: newCheck.finalUrl, redirected: newCheck.redirected, checkedAt: links.checkedAt })) }, null, 2) + '\n')
