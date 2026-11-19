import { gitText as archivedAuditText, requireHistory } from './lib/git-history.mjs'
import { loadCard as loadCardFrom } from './lib/model-card-audit.mjs'
const loadCard = (root, commit) => loadCardFrom(root, commit, archivedAuditText)
const productBundle = (source, commit) => bundleFrom(source, commit, archivedAuditText)
if (process.argv.includes('--frozen-head')) requireHistory(fileURLToPath(new URL('../', import.meta.url)), ['8c456709'])
import { productBundle as bundleFrom } from '../test-support/execution-capability.mjs'
// Offline review only: exact catalog identities and captured official table evidence.
// Run after generators. --check verifies the committed report without writes.
import fs from 'node:fs'
import { modalityIconStates as currentIcons } from '../apps/web/src/lib/modelModalityIcons.js'
const icons = process.argv.includes('--frozen-head') ? (await productBundle("export { modalityIconStates } from './apps/web/src/lib/modelModalityIcons.js'", '8c456709')).modalityIconStates : currentIcons
import { fileURLToPath } from 'node:url'
import { readRegistry, readPackedRegistry } from './lib/model-card-audit.mjs'
import { r10Rows } from './lib/historical-card-projections.mjs'
import { historicalCardRows } from './lib/historical-card-reports.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const read = name => JSON.parse(fs.readFileSync(root + name, 'utf8'))
const card = await loadCard(root, process.argv.includes('--frozen-head') ? '8c456709' : null)
const arg = process.argv.indexOf('--registry')
const registry = (arg >= 0 ? readRegistry(process.argv[arg + 1]) : readPackedRegistry(root + 'apps/web/tests/fixtures/r11-registry-head.json')).providers
const pairs = new Map(read('config/channel-audit/input-20261109.json').pairs.map(row => [row.channel + '/' + row.apiModelId, row]))
const evidence = read('config/channel-audit/modality-table-review-r10-20261109.json')
const fields = ['inputModalities', 'outputModalities']
const current = r10Rows(registry, card, icons)
// Explicit custom/frozen captures keep their original behavior. The default
// historical report checks current display inputs before restoring main's view.
const presented = arg >= 0 || process.argv.includes('--frozen-head') ? current : historicalCardRows('r10', current)
const presentations = new Map(presented.map(row => [row.key, row]))
const view = data => ({ source: data.sources[0] || null, modalities: data.modalities })
const counts = {}, differences = [], tableUnknown = []
for (const [channel, provider] of Object.entries(registry)) {
  const count = counts[channel] = { cards: provider.models.length, tableUnknown: 0, sourceDiff: 0, modalityDiff: 0, eitherDiff: 0 }
  for (const model of provider.models) {
    const key = channel + '/' + model.id, { full, minimal } = presentations.get(key)
    const a = view(minimal), b = view(full)
    const sourceDiff = a.source !== b.source, modalityDiff = JSON.stringify(a.modalities) !== JSON.stringify(b.modalities)
    if (sourceDiff) count.sourceDiff++
    if (modalityDiff) count.modalityDiff++
    if (sourceDiff || modalityDiff) { count.eitherDiff++; differences.push({ key, sourceDiff, modalityDiff }) }
    const row = pairs.get(key)
    const channelSources = new Set([...full.sources, ...Object.values(row?.fieldProvenance || {}).filter(f => f.kind === 'channel-published').map(f => f.sourceUrl)])
    const pages = evidence.pages.filter(page => page.channel === channel && channelSources.has(page.sourceUrl))
    const unknown = fields.flatMap((field, i) => full.modalities[i].filter(([, state]) => state === 'unknown').map(([id]) => `${field}/${id}`))
    if (key !== 'bailian/kimi-k3' && pages.length && unknown.length) {
      count.tableUnknown++
      tableUnknown.push({ key, unknown, pages: pages.map(page => page.sourceUrl) })
    }
  }
}
const report = { date: '2026-11-09', scope: 'R11 captured Core registry (1061 cards); R10 table matching rules retained.', tableEvidenceScope: evidence.scope, fullObject: 'R11: captured Core modelRegistry full objects (compact fixture by default, --registry for raw JSON); minimal object is {id}. First visible source and four input/output icon states; R10 static counts are historical.',
  totals: Object.fromEntries(Object.keys(Object.values(counts)[0]).map(key => [key, Object.values(counts).reduce((sum, row) => sum + row[key], 0)])), counts, tableUnknown, differences }
const output = root + 'docs/model-card-audit-20261109-r10-counts.json', content = JSON.stringify(report, null, 2) + '\n'
if (process.argv.includes('--check')) { if (fs.readFileSync(output, 'utf8') !== content) throw new Error('R10 report drift') }
else fs.writeFileSync(output, content)
console.log(JSON.stringify({ totals: report.totals, counts }, null, 2))
