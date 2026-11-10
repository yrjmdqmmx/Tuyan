// Completed I2-I5 reports are immutable; I6 compares the exact starting HEAD.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
import {scanTitles,scanDialogs} from '../test-support/source-titles-r24.mjs'
import corrections from '../test-support/fixtures/source-evidence-i6-r26.json' with {type:'json'}
import captures from '../config/channel-audit/source-titles-r26-i6.json' with {type:'json'}
const frozen=name=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../test-support/fixtures/'+name,import.meta.url))))
const historical=frozen('source-report-i5.json.gz'),baseline=frozen('source-review-6864824a.json.gz')
const current=await collectSourceReview(),counts={},changes=[]
for(const client of ['web','mini','notices']) {
 const before=baseline[client],after=current[client]
 assert.equal(after.length,client==='notices'?7:1064)
 assert.deepEqual(scanTitles(after),[]);assert.deepEqual(scanDialogs(after.filter(c=>c.text)),[])
 for(const [i,card]of after.entries()) {
  const old=before[i],correction=corrections[client].find(row=>row.card===card.card)
  assert.equal(card.card,old.card);assert.equal(card.name,old.name)
  if(correction)assert.deepEqual(correction.before,old.rows)
  assert.deepEqual(card.rows,correction?.after||old.rows,client+'/'+card.card)
  if(correction)changes.push({client,card:card.card,before:old.rows,after:card.rows})
 }
 counts[client]={cards:after.length,sourceRowsBefore:before.reduce((n,c)=>n+c.rows.length,0),sourceRows:after.reduce((n,c)=>n+c.rows.length,0),changedCards:corrections[client].length,titleFindings:0,dialogFindings:0,
  changedTitles:after.reduce((n,c,i)=>n+c.rows.filter(r=>before[i].rows.some(old=>old.url===r.url&&old.label!==r.label)).length,0),
  changedDialogs:after.filter((c,i)=>c.text!==before[i].text).length}
}
const report={...historical.json,I6:{phase:'R26 Phase I6',baseline:baseline.head,counts,changes,captures}}
const cell=v=>JSON.stringify(v).replaceAll('|','&#124;')
const markdown=historical.markdown+'\n## R26 I6\n\nAll **1,064 cards per client** and all seven retirement dialogs were scanned. One promotional title (one Web row; absent from Mini source rows) was found. The curated capture override changes `官方文档 · 火山方舟 · 豆包编程模型发布！AI 程序员双十一大促9.9元到岗` to `官方文档 · 火山方舟 · 豆包编程模型发布公告`, preserving the role and site prefixes. The strict scanner now rejects 大促, 元到岗, 限时, 秒杀, 优惠, 爆款, 免费领, 抢, 狂欢, 折, exclamation marks, emoji and prices. Captured original titles remain evidence; generated display titles use the override. The existing 14 unfetchable numeric-page exceptions are unchanged.\n\nBailian qwen3.5-397b-a17b now cites notice 118728 instead of the generic depreciation page. The other six badges retain verified sources; no allow-list exceptions. See [R26 retirement source audit](model-card-qwen35plus-evidence-r24.md#r26-retirement-source-audit).\n\n**Date rule:** show the card verification date once, as the first line. Known-field dates equal to it are omitted; differing dates appear only inside that field\'s source line, e.g. `最大输出：源自原厂（核实日期：2026-11-10）`. Unknown fields and unknown modality icons never carry a verification date. The dialog\'s expanded modality descriptions omit tooltip dates because field provenance is already above; standalone known-icon tooltips retain their own dated evidence. Unknown source attribution remains visible. Both clients use `该渠道页面与图研之前记录的信息不一致，这里只保留已经核实过的内容，没核实的显示为「未知」。` on the same 66 conflict cards. Historical reports and raw captures above remain frozen.\n\n| Client | Cards | Source rows | Changed title rows | Changed dialogs | Findings |\n| --- | ---: | ---: | ---: | ---: | ---: |\n'+Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRows} | ${c.changedTitles} | ${c.changedDialogs} | 0 |`).join('\n')+'\n\n### Captured neutral title override\n\n| URL | Before → after | SHA-256 | Fetch UTC / Asia/Shanghai |\n| --- | --- | --- | --- |\n'+captures.captures.map(r=>`| ${r.url} | ${r.title} → ${r.displayTitle} | \`${r.sha256}\` | ${r.fetchStartUTC} / ${r.fetchTimeAsiaShanghai} |`).join('\n')+'\n\n### Complete source-row changes\n\n| Client | Card | Before | After |\n| --- | --- | --- | --- |\n'+changes.map(r=>`| ${r.client} | ${r.card} | ${cell(r.before)} | ${cell(r.after)} |`).join('\n')+'\n'
for(const [name,body]of [['json',JSON.stringify(report,null,2)+'\n'],['md',markdown]]) {
 const file=new URL('../docs/model-card-source-titles-r24.'+name,import.meta.url)
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),body,'R24 source report drift')
 else fs.writeFileSync(file,body)
}
console.log(JSON.stringify(counts))
