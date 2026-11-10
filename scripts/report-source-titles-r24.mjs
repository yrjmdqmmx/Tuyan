// Completed I2-I6 reports remain immutable; I7 uses the exact HEAD presentation fixture.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
import {scanTitles,scanDialogs} from '../test-support/source-titles-r24.mjs'
import corrections from '../test-support/fixtures/source-evidence-i7-r27.json' with {type:'json'}
import {baseline, imageInputPresentations, assertPresentationChanges} from '../test-support/image-input-r27.mjs'
const historical=JSON.parse(gunzipSync(fs.readFileSync(new URL('../test-support/fixtures/source-report-i6.json.gz',import.meta.url))))
const current=await collectSourceReview(),counts={},changes=[]
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
const report={...historical.json,I7:{phase:'R27 Phase I7',baseline:baseline.head,counts,changes,review:'config/channel-audit/review-r27-20261110.json'}}
const cell=v=>JSON.stringify(v).replaceAll('|','&#124;')
const markdown=historical.markdown+'\n## R27 I7\n\nFounder decision A (2026-11-10): exactly 15 cards per client now cite the verified edit/remix interface for image input. All 1,064 cards and seven retirement dialogs pass the existing strict title and copy scans. Unchanged output citations are preserved. The original I2-I6 reports above remain frozen. [Complete presentation diff](model-modality-r27-i7-card-diff.json).\n\n| Client | Cards | Source rows | Changed cards | Findings |\n| --- | ---: | ---: | ---: | ---: |\n'+Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRows} | ${c.changedCards} | 0 |`).join('\n')+'\n\n| Client | Card | Before | After |\n| --- | --- | --- | --- |\n'+changes.map(r=>`| ${r.client} | ${r.card} | ${cell(r.before)} | ${cell(r.after)} |`).join('\n')+'\n'
for(const [name,body]of [['json',JSON.stringify(report,null,2)+'\n'],['md',markdown]]) {
 const file=new URL('../docs/model-card-source-titles-r24.'+name,import.meta.url)
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),body,'R24 source report drift')
 else fs.writeFileSync(file,body)
}
console.log(JSON.stringify(counts))
