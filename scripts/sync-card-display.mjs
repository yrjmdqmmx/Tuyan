// Package-local data keeps Core's bundle independent of Web/config COPY paths.
// Evidence remains canonical in config; --check never writes or uses network.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { transformSync } from 'esbuild'
const root = fileURLToPath(new URL('../', import.meta.url)), check = process.argv.includes('--check')
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const write = (file, value) => {
  const target = path.join(root, file)
  if (check) assert.equal(fs.readFileSync(target, 'utf8'), value, 'Card display drift: ' + file)
  else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value) }
}
// Compact only this component's generated JS; retain readable TS and names.
// The Mini build runs this after tsc so both size ceilings remain meaningful.
const ts = createRequire(new URL('../apps/miniprogram/package.json', import.meta.url))('typescript')
const picker = 'apps/miniprogram/miniprogram/components/model-picker/model-picker'
const options = ts.convertCompilerOptionsFromJson(read('apps/miniprogram/tsconfig.json').compilerOptions, root).options
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, picker + '.ts'), 'utf8'), { compilerOptions: options }).outputText
write(picker + '.js', transformSync(compiled, { minifyWhitespace: true, minifySyntax: true, charset: 'utf8', target: 'es2019' }).code)
if (process.argv.includes('--mini-picker')) process.exit(0)
for (const [name, source] of Object.entries({
  'reviewed-models': 'apps/web/src/data/model-card-specifications.json',
  'specific-pages': 'config/channel-audit/specific-model-page-overrides.json',
  'dead-links': 'config/channel-audit/dead-links-20261109.json',
})) write('packages/api/src/card-data/' + name + '.json', JSON.stringify(read(source)) + '\n')
const capture = read('config/channel-audit/tokendance-rendered-pages-20261110.json')
assert.equal(capture.pages.length, 74)
const historical = read('config/channel-audit/tokendance-historical-links-20261110.json')
write('packages/api/src/card-data/tokendance-pages.json', JSON.stringify(Object.fromEntries(capture.pages.map(row => [row.id, {
  verified: row.verified, checkedAt: row.checkedAt, evidenceSha256: row.evidenceSha256,
  ...(!row.verified ? { fallback: historical.rows[row.id] || null } : {}),
}]))) + '\n')
// Keep original captured wording separate from normalized display facts.
const snapshot = read('config/channel-audit/tokendance-catalog-snapshot-20261109b.json')
const phase2 = read('config/channel-audit/model-modality-phase2-20261109.json')
const quotes = {}
for (const row of capture.pages.filter(row => row.verified)) {
  const portal = snapshot.portal[row.id]
  assert.equal(portal.status, 200)
  const architecture = portal.architecture
  assert.equal(architecture.modality, architecture.input_modalities.join(',') + '→' + architecture.output_modalities.join(','))
  quotes['https://tokendance.space/models/' + row.id] = [architecture.modality.replace(/text|image|video|audio/g, id => ({text:'文本',image:'图像',video:'视频',audio:'音频'})[id]).replaceAll(',', '、'), portal.checkedAt.slice(0, 10)]
}
for (const [key, row] of Object.entries(phase2.tables)) {
  assert.ok(phase2.pages[row.sourceUrl].excerpts.includes(row.quote))
  quotes[row.sourceUrl + '#' + key.slice(key.indexOf('/') + 1)] = [row.quote, row.verifiedAt]
}
// This exact R10 table predates the Phase 2 set; keep its literal pipe syntax.
const kimi = read('config/channel-audit/modality-table-review-r10-20261109.json').pages.find(row => row.sourceUrl === 'https://help.aliyun.com/zh/model-studio/kimi-k3')
assert.equal(kimi.quotes.length, 1)
quotes[kimi.sourceUrl + '#kimi-k3'] = [kimi.quotes[0], kimi.verifiedAt]
const groups = new Map()
for (const [url, [quote, date]] of Object.entries(quotes)) {
  const slash = url.split('#')[0].lastIndexOf('/'), prefix = url.slice(0, slash + 1)
  const key = JSON.stringify([prefix, date])
  if (!groups.has(key)) groups.set(key, new Map())
  const rows = groups.get(key)
  if (!rows.has(quote)) rows.set(quote, [])
  rows.get(quote).push(url.slice(slash + 1))
}
const compactQuotes = [...groups].map(([key, rows]) => [...JSON.parse(key), [...rows].map(([quote, ids]) => [quote, ids.join('|')])])
write('packages/api/src/card-data/modality-evidence.json', JSON.stringify(compactQuotes) + '\n')
// Mini uses the same small title/order implementation, without shipping archives.
const presentation = fs.readFileSync(path.join(root, 'packages/api/src/card-presentation.mjs'), 'utf8')
// URL canonicalization is Web/Core-only: Mini has one primary source per card.
const mini = presentation.slice(0, presentation.indexOf('// Normalize identity')) + presentation.slice(presentation.indexOf('// Stored title:'))
const modality = fs.readFileSync(path.join(root, 'packages/api/src/modality-presentation.mjs'), 'utf8').replace(/^import .*\n/gm, '')
const combined = `const evidence = ${JSON.stringify(compactQuotes)};\n` + mini + modality
write('apps/miniprogram/miniprogram/utils/card-presentation.js', '// Generated by scripts/sync-card-display.mjs\n' + transformSync(combined, { minify: true, charset: 'utf8', format: 'cjs', target: 'es2019' }).code)
write('apps/miniprogram/miniprogram/utils/card-presentation.d.ts', 'export function displayModalities(values: string[]): string[]\nexport function displayModalityText(value: string): string\nexport function sourceTitle(value: string): string\nexport interface ModalityIcon { id: string; label: string; state: string; detail: string; accessibleLabel: string; tooltip: string }\nexport function modalityIconStates(value: string, fact?: object, provider?: string, modelId?: string): ModalityIcon[]\n')
console.log(`Shared card display data: ${check ? 'no drift' : 'generated'}; ${capture.pages.filter(row => row.verified).length}/74 verified TokenDance pages`)
