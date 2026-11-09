import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
import {scanTitles,scanDialogs,titleRule} from '../test-support/source-titles-r24.mjs'
import {expectedHumanRows,expectedHumanUrl}from'../test-support/source-links-i3-r24.mjs'
// Preserve the reviewed I2 record verbatim. I3 is a new comparison to its clean
// starting HEAD, rather than silently rewriting I2's historical zero claim.
const historical=JSON.parse(gunzipSync(fs.readFileSync(new URL('../test-support/fixtures/source-report-i2.json.gz',import.meta.url))))
const baselineFile=new URL('../test-support/fixtures/source-review-9a7128d6.json.gz',import.meta.url)
const baseline=JSON.parse(gunzipSync(fs.readFileSync(baselineFile)))
const current=await collectSourceReview(),counts={},changes=[],dialogChanges=[]
const summary=findings=>({findings:findings.length,affectedCards:new Set(findings.map(r=>r.card)).size,byRule:Object.fromEntries([...new Set(findings.map(r=>r.issue))].sort().map(issue=>[issue,findings.filter(r=>r.issue===issue).length]))})
for(const client of ['web','mini','notices']) {
 const before=baseline[client],after=current[client]
 assert.equal(after.length,client==='notices'?7:1064)
 const titlesBefore=scanTitles(before),titlesAfter=scanTitles(after)
 const dialogsBefore=client==='notices'?[]:scanDialogs(before),dialogsAfter=client==='notices'?[]:scanDialogs(after)
 assert.deepEqual(titlesAfter,[]);assert.deepEqual(dialogsAfter,[])
 for(const [i,card]of after.entries()) {
  const old=before[i];assert.equal(card.card,old.card);assert.equal(card.name,old.name)
  assert.deepEqual(card.rows.map(r=>r.url),expectedHumanRows(old.rows).map(r=>r.url),client+'/'+card.card)
  assert.equal(new Set(card.rows.map(r=>r.label)).size,card.rows.length,card.card)
  for(const row of old.rows) {
   if(expectedHumanUrl(row.url)===null){changes.push({client,card:card.card,url:row.url,afterUrl:null,before:row.label,after:null,action:'hide machine document'});continue}
   const next=card.rows.find(r=>r.url===expectedHumanUrl(row.url))
   assert.ok(next,row.url);assert.equal(next.label.split(' · ')[0],expectedHumanRows(old.rows).find(r=>r.url===next.url).label.split(' · ')[0])
   if(next.label!==row.label||next.url!==row.url)changes.push({client,card:card.card,url:row.url,afterUrl:next.url,before:row.label,after:next.label,action:next.url!==row.url?(old.rows.some(r=>r.url===next.url)?'hide machine duplicate; retain HTML':'replace machine link with HTML'):'rename'})
  }
  if(client!=='notices'&&(card.text!==old.text||JSON.stringify(card.tooltips)!==JSON.stringify(old.tooltips)))dialogChanges.push({client,card:card.card,before:{text:old.text,tooltips:old.tooltips},after:{text:card.text,tooltips:card.tooltips}})
 }
 counts[client]={hiddenMachineRows:changes.filter(r=>r.client===client&&r.afterUrl===null).length,cards:after.length,sourceRowsBefore:before.reduce((n,c)=>n+c.rows.length,0),sourceRows:after.reduce((n,c)=>n+c.rows.length,0),changedRows:changes.filter(r=>r.client===client).length,renamedRows:changes.filter(r=>r.client===client&&r.action==='rename').length,htmlReplacements:changes.filter(r=>r.client===client&&r.afterUrl&&r.url!==r.afterUrl).length,titles:{before:summary(titlesBefore),after:summary(titlesAfter)},dialogs:{before:summary(dialogsBefore),after:summary(dialogsAfter)}}
}
const i3={phase:'R24 Phase I3',baseline:baseline.head,baselineSha256:createHash('sha256').update(fs.readFileSync(baselineFile)).digest('hex'),rule:titleRule,counts,changes,dialogChanges}
const report={...historical.json,I3:i3}
const cell=s=>String(s).replaceAll('|','&#124;').replaceAll('\n','<br>')
const markdown=historical.markdown+[
 '', '## R24 Phase I3', '',
 `Baseline: **${baseline.head}** (I2 committed). All 1,064 cards per client and seven Web notices are compared to the lossless starting-HEAD snapshot. The I2 section above is historical; its claim of zero defects missed meaningless disambiguation qualifiers and is superseded here.`, '',
 titleRule, '',
 'The former collision helper appended 文档, 文档 2 or Markdown, and the I2 scanner explicitly stripped those suffixes before checking the page. I3 rejects those counter/format-only suffixes, scans machine URLs too, and retains real model/date codes (0613, 0125, 2508) only when independently present in the card name or ID. Language, console/product namespaces and actual interface versions describe real distinctions.', '',
 'Qianfan: the captured v24 title for rmh4stp0j is 模型列表; the WENXINWORKSHOP namespace is labelled 千帆 ModelBuilder 旧版入口（平台首页）, reflecting the newly captured redirect to the platform index. The qianfan-docs page Jm8r1826a has the captured title 价格 and now reads AI 应用开发入门：价格. Volcengine 1330310 redirects to ark/model-list and now reads 模型列表. Capture time, status, final URL and body hash are stored in `config/channel-audit/source-titles-r24-i3.json`. Other collisions use path-derived Kimi Code/开放平台, xAI 开发者指南/模型指南, Ideogram interface versions and image operations, Fireworks 模型库/控制台, MiniMax site regions, and the AntLing chat API section. The other namespace distinctions are inferred from URL paths; only the three recorded captures are newly fetched titles or redirects.', '',
 'OpenAI documentation .md links map to the same captured human HTML page; the independent literal URL mapping contains 42 pairs and one raw MiniMax Markdown removal, used on 44 cards per client. Web removes 43 Markdown duplicates and one raw MiniMax Markdown row; one OpenAI card gains its HTML equivalent without removing a duplicate. Together keeps the primary 原厂规格 role when the HTML and Markdown rows merge. Web removes duplicate rows and Mini keeps its source access through HTML. Other raw .md/.mdx and llms text variants are hidden. GitHub/Hugging Face blob Markdown URLs are rendered HTML readers and remain human sources. Raw evidence, field provenance, picker identities, execution facts, 65,536 and the 15-model decision remain unchanged.', '',
 '### I3 counts', '',
 '| Client | Cards | Source rows before → after | Changed rows | Renamed human rows | HTML replacements | Strict findings before → after |',
 '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
 ...Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRowsBefore} → ${c.sourceRows} | ${c.changedRows} | ${c.renamedRows} | ${c.htmlReplacements} | ${c.titles.before.findings} → ${c.titles.after.findings} |`),'',
 '### I3 full before → after list','',
 '| Client | Card | Before URL | After URL | Before label | After label | Action |','| --- | --- | --- | --- | --- | --- | --- |',
 ...changes.map(r=>`| ${[r.client,r.card,r.url,r.afterUrl,r.before,r.after,r.action].map(cell).join(' | ')} |`),'',
 'The JSON I3 section contains this complete inventory plus every changed tooltip/dialog string. Reproduce both historical preservation and the current scan with `node scripts/report-source-titles-r24.mjs --check`.',''
].join('\n')
for(const [name,body]of [['json',JSON.stringify(report,null,2)+'\n'],['md',markdown]]) {
 const file=new URL('../docs/model-card-source-titles-r24.'+name,import.meta.url)
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),body,'R24 source report drift')
 else fs.writeFileSync(file,body)
}
console.log(JSON.stringify(counts))
