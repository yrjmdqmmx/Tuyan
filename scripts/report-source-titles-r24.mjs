// Completed I2/I3/I4 reports are immutable; I5 compares the exact starting HEAD.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
import {scanTitles,scanDialogs} from '../test-support/source-titles-r24.mjs'
import corrections from '../test-support/fixtures/source-evidence-i5-r25.json' with {type:'json'}
import captures from '../config/channel-audit/source-titles-r25-i5.json' with {type:'json'}
const frozen=name=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../test-support/fixtures/'+name,import.meta.url))))
const historical=frozen('source-report-i4.json.gz'),baseline=frozen('source-review-d29097c0.json.gz')
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
  changedTitles:after.reduce((n,c,i)=>n+c.rows.filter(r=>before[i].rows.some(old=>old.url===r.url&&old.label!==r.label)).length,0)}
}
const report={...historical.json,I5:{phase:'R25 Phase I5',baseline:baseline.head,counts,changes,captures}}
const cell=v=>JSON.stringify(v).replaceAll('|','&#124;')
const previousPage=url=>[...baseline.web,...baseline.mini,...baseline.notices].flatMap(c=>c.rows).find(r=>r.url===url)?.label.split(' · ').slice(2).join(' · ') || '新增来源'
const markdown=historical.markdown+'\n## R25 I5\n\nR25 Phase I5 preserves the completed phase reports above. **Six of 20 numeric-document URLs now have captured page titles; 14 remain on the exact unfetchable allow-list.** The new Aliyun retirement notice has its own captured title as well. Plain unauthenticated public GETs only; date **2026-11-10**. Raw body SHA-256, status, final URL, UTC and Asia/Shanghai timestamps, extraction paths and redirect attempts are retained in [capture data](../config/channel-audit/source-titles-r25-i5.json). The empty Volcengine HTML title is resolved from the matching current-route `curDoc.Title`, never from a guessed slug.\n\nTitles remain `角色 · 站点 · 页面`. Site suffixes and the redundant 百炼 product prefix are stripped. `Kimi K3 (Bailian hosted)` becomes `Kimi K3（百炼托管）`; `(Free)` becomes `（免费）`. Other English parentheses were reviewed: model/version or product-mode names (e.g. Nano Banana, FLUX dev/schnell, Grok Imagine Image Quality, Fibo Edit 1.5, Krea 2 Turbo, Z Image Turbo, NVFP4) remain unchanged. Picker names and all 15 deferred image-input decisions stay fixed. Date labels in source dialogs and modality tooltips use `日期：YYYY-MM-DD`. The strict scan now rejects numeric document/page IDs unless the exact URL is documented below, untranslated documentation/hosting qualifiers, and missing date colons.\n\nThree Bailian badges now cite notice 118728, with the matching **2027-01-19** retirement date and exact model IDs from the public page-entry JSON. Mini badges copy their own retirement source, independently of the first specification link. Missing/excluded sources suppress a display badge; execution notices remain unchanged. [Evidence](model-card-qwen35plus-evidence-r24.md#r25-phase-i5).\n\n| Client | Cards | Source rows before → after | Changed cards | Changed title rows | Title/copy findings |\n| --- | ---: | ---: | ---: | ---: | ---: |\n'+Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRowsBefore} → ${c.sourceRows} | ${c.changedCards} | ${c.changedTitles} | 0 |`).join('\n')+'\n\n### Captured page titles\n\n| URL | Before → after page title | Extraction | SHA-256 |\n| --- | --- | --- | --- |\n'+captures.captures.map(r=>`| ${r.url} | ${previousPage(r.url)} → ${r.displayTitle} | ${r.extraction} | \`${r.sha256}\` |`).join('\n')+'\n\n### Unfetchable allow-list\n\nThese exact URLs keep their ID form. HTTP 200 is not treated as a successfully captured title. No bot challenge was executed.\n\n| URL | HTTP | Reason | SHA-256 |\n| --- | ---: | --- | --- |\n'+captures.unfetchable.map(r=>`| ${r.url} | ${r.httpStatus} | ${r.reason} | \`${r.sha256}\` |`).join('\n')+'\n\n### Complete before → after list\n\nEach changed card is listed below with its full ordered source rows, including retained URLs and newly restored retirement links.\n\n| Client | Card | Before | After |\n| --- | --- | --- | --- |\n'+changes.map(r=>`| ${r.client} | ${r.card} | ${cell(r.before)} | ${cell(r.after)} |`).join('\n')+'\n'
for(const [name,body]of [['json',JSON.stringify(report,null,2)+'\n'],['md',markdown]]) {
 const file=new URL('../docs/model-card-source-titles-r24.'+name,import.meta.url)
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),body,'R24 source report drift')
 else fs.writeFileSync(file,body)
}
console.log(JSON.stringify(counts))
