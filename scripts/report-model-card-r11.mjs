import { productBundle } from '../test-support/execution-capability.mjs'
// Read-only baseline import; reports/fixtures are always under this checkout.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCard, archivedAuditText, readRegistry, readPackedRegistry, rowsOf, countCards, fields, isKnown, writeOrCheck } from './lib/model-card-audit.mjs'
import { readModalityEvidence, modalityDisagreements } from './lib/model-card-modality-evidence.mjs'
import { modalityIconStates as currentIcons } from '../apps/web/src/lib/modelModalityIcons.js'
const modalityIconStates = process.argv.includes('--frozen-head') ? (await productBundle("export { modalityIconStates } from './apps/web/src/lib/modelModalityIcons.js'", '8c456709')).modalityIconStates : currentIcons
const root = fileURLToPath(new URL('../', import.meta.url))
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1] }
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const check = process.argv.includes('--check')
const baselineRoot = path.resolve(root, arg('--baseline') || '../Tuyan-wt-baseline')
const headRegistry = arg('--head-registry') ? readRegistry(arg('--head-registry')) : readPackedRegistry(path.join(root, 'apps/web/tests/fixtures/r11-registry-head.json'))
const mainRegistry = arg('--main-registry') ? readRegistry(arg('--main-registry')) : readPackedRegistry(path.join(root, 'apps/web/tests/fixtures/r11-registry-main.json'))
const frozenHead = process.argv.includes('--frozen-head') ? '8c456709' : null
const card = await loadCard(root, frozenHead), headRows = rowsOf(headRegistry), mainRows = rowsOf(mainRegistry)
// --frozen-main makes CI independent of a sibling worktree. The fixture was
// captured by actually loading main's own card code and records its SHA-256.
const main = process.argv.includes('--frozen-main') ? read('apps/web/tests/fixtures/r11-main-rendered.json') : await (async () => {
  const mainCard = await loadCard(baselineRoot)
  return { fullObject: countCards(mainRows, mainCard), idOnly: countCards(mainRows, mainCard, true) }
})()
const head = { fullObject: countCards(headRows, card), idOnly: countCards(headRows, card, true) }
const removed = read('config/removed-models.json')
const losses = []
for (const [key, before] of Object.entries(main.fullObject.values)) for (const field of fields) {
  const after = head.fullObject.values[key]
  if (isKnown(before[field]) && (!after || !isKnown(after[field]))) losses.push({ key, field, before: before[field], after: after?.[field] ?? null,
    reason: !after && removed[key] ? 'removed-model' : 'unexplained', ...(removed[key] ? { removalSource: removed[key].sourceUrl, removalStopDate: removed[key].stopDate } : {}) })
}
const lossCounts = Object.fromEntries(fields.map(field => [field, { total: losses.filter(row => row.field === field).length, removed: losses.filter(row => row.field === field && row.reason === 'removed-model').length, unexplained: losses.filter(row => row.field === field && row.reason === 'unexplained').length }]))
const summarize = side => Object.fromEntries(['fullObject', 'idOnly'].map(mode => [mode, { totals: side[mode].totals, perChannel: side[mode].perChannel }]))
const counts = { date: '2026-11-09', commits: { main: 'c7b6a2fc', head: '1576ee00' },
  basis: 'Captured Core modelRegistry models, each side rendered with its own web card code. Trimmed fixtures preserve all consumed fields; raw-to-trimmed card equality checked for every model.',
  knownRule: 'Displayed value != unknown. Baseline 待确认/官方未公布/未单列 and absent maximum-output row normalize to 未知. 不适用 is included, with numeric and not-applicable subtotals. main never renders max output, even when hidden limitRows contain it.',
  main: summarize(main), head: summarize(head), lossCounts, losses, unexplainedLosses: losses.filter(row => row.reason === 'unexplained') }
writeOrCheck(path.join(root, 'docs/model-card-audit-20261109-r11-counts.json'), JSON.stringify(counts, null, 2) + '\n', check)
const evidence = readModalityEvidence(root, frozenHead ? file => JSON.parse(archivedAuditText(root, frozenHead, file)) : undefined), misleading = [], noEvidence = [], partialEvidence = [], positiveOnlyEvidence = []
for (const { channel, model } of headRows) {
  const key = channel + '/' + model.id, facts = card(channel, model), official = evidence.index.get(key)
  if (!official) noEvidence.push(key)
  else if (!official.inputModalities || !official.outputModalities) partialEvidence.push(key)
  if (official && Object.values(official).some(field => field.positiveOnly)) positiveOnlyEvidence.push(key)
  for (const field of fields.slice(0, 2)) misleading.push(...modalityDisagreements(channel, model.id, field, modalityIconStates(null, facts.fields[field]), official?.[field]))
}
misleading.sort((a, b) => (a.channel + '/' + a.modelId + '/' + a.field).localeCompare(b.channel + '/' + b.modelId + '/' + b.field, 'en'))
const channels = Object.keys(headRegistry.providers).sort()
const byChannel = Object.fromEntries(channels.map(channel => {
  const entries = misleading.filter(row => row.channel === channel)
  return [channel, { cards: new Set(entries.map(row => row.modelId)).size, entries: entries.length,
    fields: Object.fromEntries([...new Set(entries.map(row => row.field))].sort().map(field => [field, entries.filter(row => row.field === field).length])),
    noEvidence: noEvidence.filter(key => key.startsWith(channel + '/')).length }]
}))
const report = { date: '2026-11-09', scope: '1061 captured head Core registry cards; only existing channel-owned official evidence. No online lookup or fact fixes.',
  method: 'Exact channel/id; explicit modality arrays, captured PDF-input notes, and positive-only official from/to task labels, never infer official capability from product roles/request caps. Prefer R10 tables, then generated channel-scoped facts, non-withdrawn input capture, October explicit specifications, exact model pages, September v24 arrays. Unknown icons are not unsupported. Omission means unlisted, not a proven exclusion. Cross-channel vendor sources excluded.',
  evidenceFiles: evidence.files, totalCards: headRows.length, misleadingCards: new Set(misleading.map(row => row.channel + '/' + row.modelId)).size,
  misleadingEntries: misleading.length, supportedButUnlisted: misleading.filter(row => row.cardValue !== '不支持').length, unsupportedButListed: misleading.filter(row => row.cardValue === '不支持').length,
  noChannelOfficialEvidence: noEvidence.length, noEvidence, partialEvidence, positiveOnlyEvidence, ambiguousTables: evidence.ambiguousTables.filter(row => head.fullObject.values[row.key]), byChannel, rows: misleading }
writeOrCheck(path.join(root, 'docs/model-card-audit-20261109-r11-misleading.json'), JSON.stringify(report, null, 2) + '\n', check)
const table = rows => ['| channel | model id | field | card value | official value | source URL |', '| --- | --- | --- | --- | --- | --- |', ...rows.map(row => `| ${row.channel} | \`${row.modelId}\` | ${row.field} | ${row.cardValue} | ${row.officialValue} | ${row.sourceUrl} |`)].join('\n')
const summaryTable = ['| 渠道 | 涉及卡片 | 差异项 | 按字段计数 | 无渠道模态证据卡片 |', '| --- | ---: | ---: | --- | ---: |', ...Object.entries(byChannel).map(([channel, row]) => `| ${channel} | ${row.cards} | ${row.entries} | ${Object.entries(row.fields).map(([field, count]) => `${field}: ${count}`).join('；') || '—'} | ${row.noEvidence} |`)].join('\n')
const markdown = `# R11 模态待复核清单（仅列出，不修正）\n\n完整 Core registry 共 ${report.totalCards} 卡；${report.misleadingCards} 卡 / ${report.misleadingEntries} 个字段图标差异，其中显示支持但官方未列/不支持 ${report.supportedButUnlisted} 项，显示不支持但官方列为支持 ${report.unsupportedButListed} 项。无渠道官方模态证据 ${noEvidence.length} 卡；仅一侧模态证据 ${partialEvidence.length} 卡；另有 ${positiveOnlyEvidence.length} 卡使用官方任务标签的正向证据，未把标签遗漏当作不支持。未知图标不算不支持。\n\n仅使用仓库已捕获证据，未联网补证。逐 channel/id 匹配，并验证来源属于该渠道；原厂页不能证明第三方渠道支持。已有结构化模态数组按 R10 表格 → generated 渠道事实 → 未撤回的输入快照 → 10 月规格 → 精确型号页 → v24 记录排序。产品 roles/capabilities、请求上限与通用接口能力不作为官方模态证据；明确记载 PDF 输入或 pdf_url 的渠道说明计入 file。Runware 的官方 text-to-image 等标签仅证明对应正向能力，不构成完整输入清单，不能据其遗漏判定多余模态。未列不等于明确不支持，以下为 PM 待复核项。\n\nR10 同页多变体表取并集，避免把较窄的表外推到全部 ID；歧义、证据文件及无证据卡片逐 ID 见 [JSON](model-card-audit-20261109-r11-misleading.json)。当前有 ${report.ambiguousTables.length} 个卡片字段使用这种保守口径。证据有日期差异，清单不代表今日在线规格或真实模型调用验收。\n\n${summaryTable}\n\n## 完整清单\n\n${table(misleading)}\n`
writeOrCheck(path.join(root, 'docs/model-card-audit-20261109-r11-misleading.md'), markdown, check)
console.log(JSON.stringify({ main: counts.main, head: counts.head, lossCounts, misleadingCards: report.misleadingCards, misleadingEntries: report.misleadingEntries, noEvidence: noEvidence.length, byChannel }, null, 2))
