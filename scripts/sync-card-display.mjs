// Package-local data keeps Core's bundle independent of Web/config COPY paths.
// Evidence remains canonical in config; --check never writes or uses network.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { transformSync } from 'esbuild'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
const root = fileURLToPath(new URL('../', import.meta.url)), check = process.argv.includes('--check')
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const write = (file, value) => {
  const target = path.join(root, file)
  if (check) assert.equal(fs.readFileSync(target, 'utf8'), value, 'Card display drift: ' + file)
  else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value) }
}
// Compact the picker and its audit helper's generated JS; retain readable TS and names.
// The Mini build runs this after tsc so both size ceilings remain meaningful.
const ts = createRequire(new URL('../apps/miniprogram/package.json', import.meta.url))('typescript')
const picker = 'apps/miniprogram/miniprogram/components/model-picker/model-picker'
const options = ts.convertCompilerOptionsFromJson(read('apps/miniprogram/tsconfig.json').compilerOptions, root).options
for (const target of [picker, 'apps/miniprogram/miniprogram/utils/model-audit']) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, target + '.ts'), 'utf8'), { compilerOptions: options }).outputText
  write(target + '.js', transformSync(compiled, { minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: true, ...(target === picker ? {} : { format: 'cjs' }), charset: 'utf8', target: 'es2019' }).code)
}
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
// Only captured human page titles are included; schema-property titles are not pages.
const sourceTitles = Object.fromEntries(Object.entries(read('config/channel-audit/model-audit-supplement-20261109.json').sourceChecks).filter(([, row]) => row.title).map(([url, row]) => [url.replace(/\/+$/, ''), row.title]))
for (const channel of ['qianfan', 'sensenova', 'stepfun']) for (const row of read('config/channel-audit/v24/' + channel + '.json').sources) {
  if (row.title && /[\u4e00-\u9fff]/.test(row.title) && !/[\/]|https?:|：/.test(row.title)) sourceTitles[row.url.replace(/\/+$/, '')] = row.title
}
// Compile only titles referenced by card inputs. Capture indexes also contain
// authentication/protocol pages that no card links to; keep those in evidence,
// not in either client. Include all fact/notice links, not just primary rows.
const referenced = new Set()
function collectUrls(value) {
  if (typeof value === 'string' && value.startsWith('https://')) referenced.add(value.split(/[?#]/)[0].replace(/\/+$/, ''))
  else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) if (key !== 'sourceChecks') collectUrls(child)
}
for (const value of [STATIC_MODEL_REGISTRY, read('config/model-audit.generated.json'), read('packages/api/src/card-data/reviewed-models.json'), read('packages/api/src/card-data/specific-pages.json'), historical]) collectUrls(value)
for (const url of Object.keys(sourceTitles)) if (!referenced.has(url)) delete sourceTitles[url]
write('packages/api/src/card-data/source-titles.json', JSON.stringify(sourceTitles) + '\n')
// Package-local names keep Core independent of the Web catalog. Mini reuses its
// existing catalog instead of shipping a second copy of these identities.
write('packages/api/src/card-data/source-model-names.json', JSON.stringify(Object.values(STATIC_MODEL_REGISTRY).flatMap(entry => entry.models.map(model => [model.id, model.label]))) + '\n')
// Mini uses the same small title/order implementation, without shipping archives.
const presentation = fs.readFileSync(path.join(root, 'packages/api/src/card-presentation.mjs'), 'utf8')
// URL canonicalization is Web/Core-only: Mini receives deduplicated source rows.
const mini = presentation.slice(0, presentation.indexOf('// Normalize identity')).replace(/^import .*\n/gm, '') + presentation.slice(presentation.indexOf('// Model subjects'))
const modality = fs.readFileSync(path.join(root, 'packages/api/src/modality-presentation.mjs'), 'utf8').replace(/^import .*\n/gm, '')
// Mini ships a smaller source projection. Compile its captured-title lookup
// against that projection, including every field and secondary vendor link.
referenced.clear()
const miniAudit = createRequire(import.meta.url)('../apps/miniprogram/miniprogram/utils/model-audit-data.js')
collectUrls(miniAudit)
// Reuse Mini's already-shipped primary URLs. Verify this compact projection
// against the captured page status; a future source-policy change must fail here.
for (const page of capture.pages) assert.equal(miniAudit.sources[miniAudit.rows['tokendance/' + page.id][5]] === 'https://tokendance.space/models/' + page.id, page.verified, page.id)
const miniPages = `const catalog = require('./static-model-catalog.js').STATIC_MODEL_REGISTRY;
const audit = require('./model-audit-data.js');
const tokenDancePages = Object.fromEntries(catalog.tokendance.models.map(({id}) => [id, {verified: audit.sources[audit.rows['tokendance/' + id][5]] === 'https://tokendance.space/models/' + id}]));
`
const miniTitles = Object.fromEntries(Object.entries(sourceTitles).filter(([url]) => referenced.has(url)))
// Losslessly reference TokenDance quote subjects through the existing catalog.
// Avoid shipping these long model IDs a second time in the Mini helper.
const tokenDanceIds = STATIC_MODEL_REGISTRY.tokendance.models.map(model => model.id)
const miniEvidence = compactQuotes.map(([prefix, date, rows]) => [prefix, date, rows.map(([quote, ids]) => [quote, prefix === 'https://tokendance.space/models/' ? ids.split('|').map(id => { const index = tokenDanceIds.indexOf(id); assert.ok(index >= 0); return index }) : ids])])
const combined = miniPages + `const knownModels = Object.values(catalog).flatMap(entry => entry.models.map(model => [model.id, model.label]));\nconst storedTitles = ${JSON.stringify(miniTitles)};\nconst evidence = ${JSON.stringify(miniEvidence)};\nfor (const group of evidence) for (const row of group[2]) if (Array.isArray(row[1])) row[1] = row[1].map(index => catalog.tokendance.models[index].id).join('|');\n` + mini + modality
// Explicit CommonJS exports avoid an unnecessary ESM interoperability facade
// in this native-only helper; the same public functions remain available.
const exports = [...combined.matchAll(/export (?:function|const) (\w+)/g)].map(match => match[1])
const commonjs = combined.replace(/export /g, '') + '\nmodule.exports = {' + exports.join(',') + '};\n'
write('apps/miniprogram/miniprogram/utils/card-presentation.js', '// Generated\n' + transformSync(commonjs, { minify: true, charset: 'utf8', format: 'cjs', target: 'es2019' }).code)
write('apps/miniprogram/miniprogram/utils/card-presentation.d.ts', 'export function displayModalities(values: string[]): string[]\nexport function displayModalityText(value: string): string\nexport function historicalChannelIds(pages: Record<string, {verified: boolean}>): Set<string>\nexport function sourceTitle(value: string, model?: {id?: string; label?: string; displayName?: string}): string\nexport function titleSourceRows<T extends {url: string; label: string}>(rows: T[], model?: {id?: string; label?: string; displayName?: string}): T[]\nexport interface ModalityIcon { id: string; label: string; state: string; detail: string; accessibleLabel: string; tooltip: string }\nexport function modalityIconStates(value: string, fact?: object, provider?: string, modelId?: string): ModalityIcon[]\n'.replace(/[ \t]*([:;,{}<>?])[ \t]*/g, '$1').replace(/\b(values|value|model|rows|fact|provider|modelId)(?=[?:])/g, name => ({values:'v',value:'v',model:'m',rows:'r',fact:'f',provider:'p',modelId:'i'})[name]))
console.log(`Shared card display data: ${check ? 'no drift' : 'generated'}; ${capture.pages.filter(row => row.verified).length}/74 verified TokenDance pages`)
