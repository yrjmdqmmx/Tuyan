import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
import { MODEL_CHANNEL_LABELS, orderModelChannels } from '../apps/web/src/lib/modelPresentation.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const audit=JSON.parse(fs.readFileSync(path.join(root,'config/model-version-audit.json'),'utf8'))
const order=orderModelChannels(['gemini','openai','bailian','ark','openrouter','deepseek','kimi','zhipu','siliconflow','anthropic','recraft','xai','bfl','stability','ideogram','minimax','mistral','together','fireworks','fal','replicate','tokendance','tokenhub','runware','xiaomi'])
const kind={fixed:'固定版本',rolling:'滚动别名',unconfirmed:'固定性 / 对应版本待确认'}
const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"'
const allRows=[...audit.models].sort((a,b)=>order.indexOf(a.channel)-order.indexOf(b.channel)||a.apiModelId.localeCompare(b.apiModelId,'en'))
const uncertain=r=>r.kind==='unconfirmed'||!r.versionId||['unconfirmed','historical-version-unconfirmed'].includes(r.idEvidence)
function csv(models) {
  const header=['渠道','展示名称','配置 ID（保留）','实际 API model ID / 调用标识','固定版本 / 滚动别名','已核对具体版本 / 目录身份','核对日期','核对依据','ID 证据','范围 / 可选状态','说明']
  const values=models.map(r=>{
    const staticModel=STATIC_MODEL_REGISTRY[r.channel]?.models.find(m=>m.id===r.apiModelId)
    return [MODEL_CHANNEL_LABELS[r.channel]||r.channel,r.displayName,r.apiModelId,r.apiIdentifier||r.apiModelId,kind[r.kind],r.versionId||'待确认',r.checkedAt,r.sourceUrls.join(' ; '),r.idEvidence,staticModel?(staticModel.selectable?'静态可选':'停用身份保留'):'动态目录候选；仍经运行时能力过滤',r.notes]
  })
  return '\uFEFF'+[header,...values].map(v=>v.map(quote).join(',')).join('\n')+'\n'
}
function write(file,text) {
  const p=path.join(root,file)
  if(process.argv.includes('--check')) {if(fs.readFileSync(p,'utf8')!==text)throw new Error('Version report drift: '+file)}
  else fs.writeFileSync(p,text)
}
write('docs/model-version-mapping.csv',csv(allRows))
write('docs/model-version-unconfirmed.csv',csv(allRows.filter(uncertain)))
// Keep the dated v21 report historical; current CSVs include later audited channels.
const rows=allRows.filter(row => row.checkedAt <= '2026-09-21')
const changed=rows.filter(r=>r.previousDisplayName && r.previousDisplayName!==r.displayName)
write('docs/model-version-label-changes.csv','\uFEFF'+[['渠道','原展示名称','新展示名称','API ID（保持原样）','核对依据'],...changed.map(r=>[MODEL_CHANNEL_LABELS[r.channel],r.previousDisplayName,r.displayName,r.apiModelId,r.sourceUrls.join(' ; ')])].map(row=>row.map(quote).join(',')).join('\n')+'\n')
const counts={};for(const row of rows)counts[row.kind]=(counts[row.kind]||0)+1
const dynamic=rows.filter(r=>r.channel==='openrouter').length
const mapping=rows.filter(r=>(r.channel==='deepseek'&&['deepseek-flash','deepseek-v4-pro'].includes(r.apiModelId))||(r.channel==='openrouter'&&['deepseek/deepseek-v4-pro','deepseek/deepseek-v4-pro-0813','deepseek/deepseek-v4.1-flash'].includes(r.apiModelId))||(r.channel==='bailian'&&['deepseek-v4-pro','deepseek-v4-pro-0813'].includes(r.apiModelId))||(r.channel==='openai'&&r.apiModelId==='gpt-4o')||(r.channel==='mistral'&&r.apiModelId==='mistral-medium-3'))
write('docs/model-version-audit-20260921.md',`# 模型版本核对 · 2026-09-21

本次在目录 v20 的基础上修正展示与版本证据，v21 没有新增、删除或替换调用 ID。760 个静态条目（其中 6 个已停用身份保留）全部逐 ID 建立记录；另记录 ${dynamic} 个 OpenRouter 同步候选目录身份，实际可选项仍由能力、协议、生命周期过滤。Batch 专用 ID 不计入同步候选。历史任务、默认配置、能力与调用协议未迁移。

展示名称校准 ${changed.length} 项，见 [展示名称变更表](model-version-label-changes.csv)；API ID 更名 0 项。

完整对照表：[全部 ${rows.length} 行](model-version-mapping.csv)；[待确认 ${rows.filter(uncertain).length} 行](model-version-unconfirmed.csv)；[机器可读证据与来源哈希](../config/model-version-audit.json)。表中同时列出保存的配置 ID 和实际 API model ID / 端点 / version 参数，避免把展示名称当作调用 ID。

核对结果分为固定版本 ${counts.fixed} 行、滚动别名 ${counts.rolling} 行、固定性或版本待确认 ${counts.unconfirmed} 行。滚动别名中 ${rows.filter(r=>r.kind==='rolling'&&!r.versionId).length} 行尚无已确认的当前目标。固定性未知不等于型号不存在，也不等于停用；${rows.filter(r=>['unconfirmed','historical-version-unconfirmed'].includes(r.idEvidence)).length} 行仍有精确 ID 或历史版本证据缺口，详见独立 CSV。尝试读取 ${audit.sources.length} 个官方 URL，其中 ${audit.sources.filter(s=>s.httpStatus==='404').length} 个返回 404；应用外壳、404、目录缺失均不作为下架依据。

| 渠道 | 展示名称 | API model ID | 性质 | 已核对版本 | 依据 |
|---|---|---|---|---|---|
${mapping.map(r=>`| ${MODEL_CHANNEL_LABELS[r.channel]} | ${r.displayName} | \`${r.apiModelId}\` | ${kind[r.kind]} | ${r.versionId||'待确认'} | [官方来源](${r.sourceUrls[0]}) |`).join('\n')}

版本解释：

- DeepSeek 直连的两个 ID 是滚动别名，当前对应 V4.1 Flash / V4 Pro 0813。展示名更新，API ID 原样保留。
- 同名 OpenRouter Pro ID 的 canonical_slug 对应 20260423；独立 0813 ID 对应 20260813。canonical_slug 是永久目录身份，不额外宣称调用别名或权重永远不变。
- 百炼单列通用 Pro ID 与 0813 快照，不能套用原厂直连映射；TokenDance 的通用 Pro / Flash 仍显示其目录所称 Preview。
- 同时收紧 DeepSeek 通用 Pro / Flash 的发布日期规则：原厂滚动版本的更新日期只作用于直连，百炼和 OpenRouter 未确认的别名日期不再沿用旧缓存值。0423 条目不显示 0813 日期，也不从 canonical_slug 的数字推造发布日期。
- OpenAI 用具体型号页的 Default snapshot 字段，不按最新日期猜测。Claude 的无日期 ID 可为固定快照，依据其版本规则逐项处理。
- Replicate 固定 hash 请求继续使用原 hash；versionless 端点显示本轮 schema 的 version.id，仅为当时观察值。未用最新 hash 静默升级旧配置。
- 官方未披露更细版本时保留具体渠道 SKU，并标明固定性 / 具体目标待确认。没有用研发厂商资料补造聚合渠道的映射。

渠道分类次序（仅用于排序，界面名称及辅助标签不加国内 / 国外前缀；下面采用小程序 / 设置常量的既有同类顺序）：

1. 国内聚合：观猹 TokenDance → 硅基流动。
2. 国内官方直连：${['bailian','ark','deepseek','kimi','zhipu','minimax'].map(id=>MODEL_CHANNEL_LABELS[id]).join(' → ')}。
3. 国外官方直连：${['gemini','openai','anthropic','recraft','xai','bfl','stability','ideogram','mistral'].map(id=>MODEL_CHANNEL_LABELS[id]).join(' → ')}。
4. 国外聚合：OpenRouter → Together AI → Fireworks AI → fal.ai → Replicate。

同类内对传入顺序做稳定排序。Web 服务端注册表本来将深度求索 / Kimi / 智谱排在百炼 / 方舟之前，而小程序常量顺序相反；按本轮“保留现有相对顺序”要求保留该差异。四类优先级在所有入口一致，并非将同类全部重新排序。模型角色会过滤不支持该角色的渠道。

验证与部署记录见 [本地验证记录](model-version-validation-20260921.md)。本轮公开文档 / 目录使用只读请求，真实付费推理为 0；无 push、无自动部署、无微信上传发布。目录及本地模拟测试不能证明账号权益或真实推理成功。
`)
console.log(`Version reports: ${allRows.length} rows; ${rows.filter(uncertain).length} unresolved rows; ${process.argv.includes('--check')?'no drift':'generated'}`)
