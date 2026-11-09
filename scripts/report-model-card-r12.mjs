import { gitText as archivedAuditText, requireHistory } from './lib/git-history.mjs'
import { loadCard as loadCardFrom } from './lib/model-card-audit.mjs'
const loadCard = (root, commit) => loadCardFrom(root, commit, archivedAuditText)
if (process.argv.includes('--frozen-head')) requireHistory(fileURLToPath(new URL('../', import.meta.url)), ['8c456709'])
// Offline final-link manifest, reconciled with the operator's recorded HTTP checks.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { readPackedRegistry, rowsOf, writeOrCheck } from './lib/model-card-audit.mjs'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
import { isApiSource, sourceSpecificity, isDeadSource } from '../apps/web/src/lib/modelCardSources.js'
const root = fileURLToPath(new URL('../', import.meta.url)), check = process.argv.includes('--check')
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const before = read('apps/web/tests/fixtures/r12-links-before.json')
const frozenHead = process.argv.includes('--frozen-head') ? '8c456709' : null
const card = await loadCard(root, frozenHead)
// Freeze the input objects as well as their renderer; current static objects
// now include full specifications and cannot reproduce an older ID-only audit.
const staticRegistry = frozenHead ? vm.runInNewContext(archivedAuditText(root, frozenHead, 'apps/web/src/lib/staticModelCatalog.js').replace(/export const /g, 'const ') + ';STATIC_MODEL_REGISTRY') : STATIC_MODEL_REGISTRY
const models = new Map(rowsOf(staticRegistry).map(row => [row.channel + '/' + row.model.id, row.model]))
for (const row of rowsOf(readPackedRegistry(path.join(root, 'apps/web/tests/fixtures/r11-registry-head.json')))) models.set(row.channel + '/' + row.model.id, row.model)
const checks = read('config/channel-audit/model-audit-supplement-20261109.json').sourceChecks
const all = before.rows.map(row => {
  const finalUrl = card(row.channel, models.get(row.channel + '/' + row.modelId)).sources[0] || null
  if (!finalUrl || isApiSource(finalUrl, checks)) throw new Error('Missing human-readable source: ' + row.channel + '/' + row.modelId)
  return { ...row, finalUrl }
})
const changed = all.filter(row => row.oldUrl !== row.finalUrl).map(({ channel, modelId, oldUrl, finalUrl }) => ({ channel, modelId, oldUrl, finalUrl }))
const api = all.filter(row => isApiSource(row.r11Url, checks)).map(({ channel, modelId, r11Url, finalUrl }) => ({ channel, modelId, oldUrl: r11Url, finalUrl }))
const reasonFor = row => {
  if (isDeadSource(row.oldUrl) || isDeadSource(row.r11Url)) return '已核实死链改用原厂具体页/公告'
  if (row.finalUrl === row.r11Url) return '保留 R9–R11 渠道来源优先'
  if (row.finalUrl.includes('/model-depreciation')) return '下线公告优先'
  if (row.channel === 'tokendance' && row.finalUrl.startsWith('https://tokendance.space/models/')) return 'Chrome 核实的渠道型号页'
  if (isApiSource(row.r11Url, checks)) return sourceSpecificity(row.finalUrl) < 2 ? 'API/JSON 无具体人可读页，按夹具回退' : 'API/JSON 替换为同型号人可读页'
  return '渠道具体型号页优先于总表'
}
const changedSinceR11 = all.filter(row => row.r11Url !== row.finalUrl)
const categorized = all.filter(row => row.oldUrl !== row.finalUrl).map(row => ({ channel: row.channel, modelId: row.modelId, reason: reasonFor(row) }))
const channels = [...new Set(categorized.map(row => row.channel))].sort()
const summary = channels.flatMap(channel => [...new Set(categorized.filter(row => row.channel === channel).map(row => row.reason))].sort().map(reason => ({
  channel, reason, count: categorized.filter(row => row.channel === channel && row.reason === reason).length,
})))
const exceptions = read('apps/web/tests/fixtures/r12-specificity-exceptions.json')
const staticApi = before.staticApiOnlyRows.map(row => {
  const finalUrl = card(row.channel, staticRegistry[row.channel].models.find(model => model.id === row.modelId)).sources[0]
  if (!finalUrl || isApiSource(finalUrl, checks)) throw new Error('Missing static fallback: ' + row.channel + '/' + row.modelId)
  return { ...row, finalUrl }
})
const json = value => JSON.stringify(value, null, 2) + '\n'
writeOrCheck(path.join(root, 'apps/web/tests/fixtures/r12-final-changed-links.json'), json(changed), check)
// CI needs no private audit directory. The operator's requested deliverable is
// additionally written here when that input directory is present.
if (fs.existsSync(path.join(root, '.audit-input/r12'))) {
  writeOrCheck(path.join(root, '.audit-input/r12/final-changed-links.json'), json(changed), check)
  writeOrCheck(path.join(root, '.audit-input/r12/api-source-replacements.json'), json(api), check)
  writeOrCheck(path.join(root, '.audit-input/r12/static-api-source-replacements.json'), json(staticApi), check)
  writeOrCheck(path.join(root, '.audit-input/r12/link-change-summary.json'), json({ basis: 'R8 vs final; full captured model objects, with 3 static-only identities', rows: summary }), check)
}
const counts = rows => Object.fromEntries([...new Set(rows.map(row => row.channel))].sort().map(channel => [channel, rows.filter(row => row.channel === channel).length]))
const table = rows => ['| channel | model id | old URL | final URL |', '| --- | --- | --- | --- |', ...rows.map(row => `| ${row.channel} | \`${row.modelId}\` | ${row.oldUrl || '—'} | ${row.finalUrl} |`)].join('\n')
const summaryTable = ['| 渠道 | 变化原因（R8 → 最终） | 卡数 |', '| --- | --- | ---: |', ...summary.map(row => `| ${row.channel} | ${row.reason} | ${row.count} |`)].join('\n')
const exceptionTable = ['| 渠道 / 型号 | 原因（完整与静态投影均逐项登记） | 最终 URL |', '| --- | --- | --- |', ...exceptions.rows.filter(row => row.scope === 'full').map(row => `| ${row.channel} / \`${row.modelId}\` | ${row.reason} | ${row.finalUrl} |`)].join('\n')
const http = read('apps/web/tests/fixtures/r12-final-link-check-20261109.json')
const distinctUrls = new Set(changed.map(row => row.finalUrl)).size
if (JSON.stringify(http.map(({ channel, modelId, oldUrl, finalUrl }) => ({ channel, modelId, oldUrl, finalUrl }))) !== JSON.stringify(changed) || http.some(row => row.status !== 200)) throw new Error('Final HTTP evidence does not match selected links')
const markdown = `# R13B 最终首链接清单\n\n口径：完整 R11 Core 捕获 1061 卡，加 3 个仅静态目录身份；相同对象分别由 R8/pre-R9（785b99df）与当前卡片代码计算。共 ${all.length} 卡，${changed.length} 张相对 R8 首链接变化，${changedSinceR11.length} 张相对 R11 变化。交付 JSON 保持 channel/modelId/oldUrl/finalUrl 四字段；“完整对象”指各侧计算使用完整 Core model，而非仅 id。**最终检查：${changed.length} 卡 / ${distinctUrls} 个不同 URL / 全部 200（HTML），404 例外为空。**沿用操作方 2026-11-09 18:38 UTC+8 检查；七条替换链接使用 R13 约 19:05 UTC+8 的 GET / 浏览器 UA / 跟随重定向核验；R13B 的 DeepSeek V3-0324 原厂发布页另经操作方 2026-11-09 核实为 200 / text/html（尾斜杠重定向）。这八条 checkedAt 为 2026-11-09。旧可见 URL 与原 API/schema 的 404 证据保留在死链夹具和[主验收表](model-card-audit-20261109.md#r12d最终链接-http-检查当前验收)。\n\n## 按渠道和原因汇总\n\n${summaryTable}\n\n## 具体程度例外\n\n完整与静态目录各 1064 卡逐一对照 R11，除以下 8 个身份的 API/JSON 回退外不得降低具体程度。夹具 \`apps/web/tests/fixtures/r12-specificity-exceptions.json\` 记录每个投影的旧/新 URL、理由和全部可用人可读来源；测试同时排除“已有具体页面却回退”及过期例外。只表示当前捕获证据未含具体页，不声称全网不存在。\n\n${exceptionTable}\n\n## 原首链接命中 API/JSON 规则的卡片\n\n共 ${api.length} 张；逐渠道 ${Object.entries(counts(api)).map(([channel, count]) => `${channel} ${count}`).join('、')}。精确识别 api. 主机上的 models 列表、/gateway/、/v\\d+/models 边界、/api/v\\d+/、.json 后缀、已记录 JSON content-type 和重定向；Replicate /owner/model/api/schema 转同型号主页。普通 /api/ 段不再排除人可读文档，OpenAI .md 与 fal 型号 /api 页保留。Runware schema.json 转同型号文档。\n\n${table(api)}\n\n## 静态卡片补充\n\n另有 ${staticApi.length} 个身份仅在静态对象下为 API 首链接，完整 Core 对象已有额外人可读来源；静态与完整对象合计 ${api.length + staticApi.length} 个身份。下面分别列出静态旧/新链接，也已验证小程序目标一致。\n\n${table(staticApi)}\n\n## 相对 R8 的最终变化（397 卡 / ${distinctUrls} URL / 全部 200）\n\n${table(changed)}\n`
writeOrCheck(path.join(root, 'docs/model-card-audit-20261109-r12-links.md'), markdown, check)
console.log(JSON.stringify({ cards: all.length, changed: changed.length, changedByChannel: counts(changed), changedSinceR11: changedSinceR11.length, r11ByChannel: counts(changedSinceR11), categorized: summary, apiReplacements: api.length, apiByChannel: counts(api), staticApiOnly: staticApi.length }, null, 2))
