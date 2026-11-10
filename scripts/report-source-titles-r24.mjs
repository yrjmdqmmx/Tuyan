import {restoreI12Review} from '../test-support/pm-decisions-r30.mjs'
// Completed I2-I6 reports remain immutable; I7 uses the exact HEAD presentation fixture.
import fs from 'node:fs'
import reviewR28 from '../config/channel-audit/review-r28-20261110.json' with {type:'json'}
import {r28Baseline, expectedR28} from '../test-support/founder-fixes-r28.mjs'
import {historicalR29Rows} from '../test-support/source-title-history-r29.mjs'
import {r29Baseline, titleIdentity} from '../test-support/source-titles-r29.mjs'
import {buildR29TitleReport, r29TitleMarkdown} from '../test-support/source-title-report-r29.mjs'
import {sourceTitle} from '../packages/api/src/card-presentation.mjs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
import {scanTitles,scanDialogs} from '../test-support/source-titles-r24.mjs'
import corrections from '../test-support/fixtures/source-evidence-i7-r27.json' with {type:'json'}
import {baseline, imageInputPresentations, assertPresentationChanges} from '../test-support/image-input-r27.mjs'
const historical=JSON.parse(gunzipSync(fs.readFileSync(new URL('../test-support/fixtures/source-report-i6.json.gz',import.meta.url))))
const latest=await collectSourceReview(),current=restoreI12Review(latest),counts={},changes=[]
for(const client of ['web','mini','notices']) {assert.deepEqual(scanTitles(latest[client]),[]);assert.deepEqual(scanDialogs(latest[client].filter(c=>c.text)),[])}
for(const client of ['web','mini']) for(const card of current[client]) card.rows=historicalR29Rows(card.rows,card.card,client,true)
for(const card of current.mini) {
 assert.deepEqual(card.rows,expectedR28[card.card].mini.card.specSources)
 card.rows=structuredClone(r28Baseline[card.card].mini.card.specSources)
}
assertPresentationChanges(await imageInputPresentations())
for(const client of ['web','mini','notices']) {
 const after=current[client]
 assert.equal(after.length,client==='notices'?7:1064)
 assert.deepEqual(scanTitles(after),[]);assert.deepEqual(scanDialogs(after.filter(c=>c.text)),[])
 let beforeCount=0
 for(const card of after) {
  const old=client==='web'?baseline.rows[card.card].web.sources:client==='mini'?baseline.rows[card.card].mini.card.specSources:baseline.rows[card.card].mini.card.retirementSource?[baseline.rows[card.card].mini.card.retirementSource]:[]
  const correction=corrections[client].find(row=>row.card===card.card)
  if(correction)assert.deepEqual(correction.before,old)
  assert.deepEqual(card.rows,correction?.after||old,client+'/'+card.card)
  beforeCount+=old.length
  if(correction)changes.push({client,card:card.card,before:old,after:card.rows})
 }
 counts[client]={cards:after.length,sourceRowsBefore:beforeCount,sourceRows:after.reduce((n,c)=>n+c.rows.length,0),changedCards:corrections[client].length,titleFindings:0,dialogFindings:0}
}
const report={...historical.json,I9:{phase:'R28 Phase I9',counts:reviewR28.counts,review:'config/channel-audit/review-r28-20261110.json',fields:reviewR28.fields.map(row=>({identity:row.identity,field:row.field,decision:row.decision,url:row.sourceUrl,title:'渠道资料 · '+r29Baseline.unscopedTitles[titleIdentity(row.sourceUrl)]}))},I7:{phase:'R27 Phase I7',baseline:baseline.head,counts,changes,review:'config/channel-audit/review-r27-20261110.json'},I10:await buildR29TitleReport()}
const cell=v=>JSON.stringify(v).replaceAll('|','&#124;')
let markdown=historical.markdown+'\n## R27 I7\n\nFounder decision A (2026-11-10): exactly 15 cards per client now cite the verified edit/remix interface for image input. All 1,064 cards and seven retirement dialogs pass the existing strict title and copy scans. Unchanged output citations are preserved. The original I2-I6 reports above remain frozen. [Complete presentation diff](model-modality-r27-i7-card-diff.json).\n\n| Client | Cards | Source rows | Changed cards | Findings |\n| --- | ---: | ---: | ---: | ---: |\n'+Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRows} | ${c.changedCards} | 0 |`).join('\n')+'\n\n| Client | Card | Before | After |\n| --- | --- | --- | --- |\n'+changes.map(r=>`| ${r.client} | ${r.card} | ${cell(r.before)} | ${cell(r.after)} |`).join('\n')+'\n'
markdown+='\n## R28 fal sources\n\nAll **61 fields across 36 model pages moved** after public unauthenticated GET HTTP 200, exact endpoint identity and every modality value were verified in the corresponding Input/Output schema. **0 kept** the catalog source. Each URL was fetched once; [dated review](../config/channel-audit/review-r28-20261110.json) records status, UTC and Asia/Shanghai time, SHA-256, identity and verbatim schema evidence (visible page text, whitespace normalized, scripts/styles excluded). No execution facts changed.\n\nWeb and Mini share sourceTitle and preserve each field source. Tooltips/tap dialogs show the same 渠道资料 · fal · 页面 title; Mini source-copy rows now include secondary field pages. isApiSource still hides https://api.fal.ai/v1/models as a link. If retained in any field/custom fact, its attribution remains plain text 渠道资料 · fal 模型目录; it is never a clickable JSON URL.\n\n| Card | Field | Decision | Visible field source title | URL |\n| --- | --- | --- | --- | --- |\n'+report.I9.fields.map(row=>`| ${row.identity} | ${row.field} | ${row.decision} | ${row.title} | ${row.url} |`).join('\n')+'\n'
markdown += r29TitleMarkdown(report.I10)
for(const [name,body]of [['json',JSON.stringify(report,null,2)+'\n'],['md',markdown]]) {
 const file=new URL('../docs/model-card-source-titles-r24.'+name,import.meta.url)
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),body,'R24 source report drift')
 else fs.writeFileSync(file,body)
}
console.log(JSON.stringify(counts))
