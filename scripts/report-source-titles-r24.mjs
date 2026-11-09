// Preserve completed I2/I3 reports; compare I4 to its exact starting HEAD.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
import {scanTitles,scanDialogs} from '../test-support/source-titles-r24.mjs'
import corrections from '../test-support/fixtures/source-evidence-i4-r24.json' with {type:'json'}
const frozen=name=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../test-support/fixtures/'+name,import.meta.url))))
const historical=frozen('source-report-i3.json.gz'),baseline=frozen('source-review-f8ff7648.json.gz')
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
 counts[client]={cards:after.length,sourceRowsBefore:before.reduce((n,c)=>n+c.rows.length,0),sourceRows:after.reduce((n,c)=>n+c.rows.length,0),changedCards:corrections[client].length,titleFindings:0,dialogFindings:0}
}
const report={...historical.json,I4:{phase:'R24 Phase I4',baseline:baseline.head,counts,changes}}
const cell=v=>JSON.stringify(v).replaceAll('|','&#124;')
const markdown=historical.markdown+'\n## R24 Phase I4\n\nI2/I3 above are immutable historical records. I4 corrects evidence attribution on six cards per client; three unsupported Bailian notice links are removed from public dialogs. Seven existing lifecycle schedules and all execution cutoffs remain unchanged. The single exact TokenDance llms-full.txt URL is a human-readable retirement citation; all other machine-document filters remain active. [Evidence, quotes and decisions](model-card-qwen35plus-evidence-r24.md#real-browser-verification-2026-11-10).\n\n| Client | Cards | Source rows before → after | Changed cards | Title/copy findings |\n| --- | ---: | ---: | ---: | ---: |\n'+Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRowsBefore} → ${c.sourceRows} | ${c.changedCards} | 0 |`).join('\n')+'\n\n| Client | Card | Before | After |\n| --- | --- | --- | --- |\n'+changes.map(r=>`| ${r.client} | ${r.card} | ${cell(r.before)} | ${cell(r.after)} |`).join('\n')+'\n'
for(const [name,body]of [['json',JSON.stringify(report,null,2)+'\n'],['md',markdown]]) {
 const file=new URL('../docs/model-card-source-titles-r24.'+name,import.meta.url)
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),body,'R24 source report drift')
 else fs.writeFileSync(file,body)
}
console.log(JSON.stringify(counts))
