// Explicit review capture: never reads Git, saved settings or network.
// Usage: node scripts/freeze-model-pm-r30.mjs BEFORE_ROWS BEFORE_SOURCE_REVIEW
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gzipSync} from 'node:zlib'
import {imageInputPresentations} from '../test-support/image-input-r27.mjs'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
assert.ok(process.argv[2] && process.argv[3], 'Supply the reviewed I11 baseline captures')
const before=JSON.parse(fs.readFileSync(process.argv[2])), prior=JSON.parse(fs.readFileSync(process.argv[3]))
const current=await imageInputPresentations(), review=await collectSourceReview()
const roots=['web/data/context','web/data/maxOutput','web/data/limitRows','web/data/sources','web/sources',
 'mini/card/auditMessage','mini/card/retirementMessage','mini/card/specSources',
 ...[0,1,2,3].map(i=>'mini/card/specRows/'+i+'/origin'),...[2,3].map(i=>'mini/card/specRows/'+i+'/value'),
 'mini/audit/sourceUrl','mini/audit/sourceLabel','mini/audit/vendorSources','mini/audit/retirementSources',
 ...['inputModalities','outputModalities','totalContextTokens','maxOutputTokens'].map(f=>'mini/audit/fields/'+f+'/sourceUrl')]
const get=(row,path)=>path.split('/').reduce((r,k)=>r?.[k],row)
const assign=(row,path,value)=>{const keys=path.split('/'),last=keys.pop(),parent=keys.reduce((r,k)=>r[k],row);if(value===undefined)delete parent[last];else parent[last]=value}
const rows={}
for(const [key,now]of Object.entries(current)) {
 const copy=structuredClone(before[key]),patches=[]
 for(const path of roots){const a=get(copy,path),b=get(now,path);if(JSON.stringify(a)===JSON.stringify(b))continue;patches.push({path,...(a===undefined?{}:{before:a}),...(b===undefined?{}:{after:b})});assign(copy,path,b)}
 assert.deepEqual(copy,now,key+' change outside reviewed display fields')
 if(patches.length)rows[key]=patches
}
const sources={}
for(const client of ['web','mini','notices'])for(const [i,now]of review[client].entries()) {
 const old=prior[client][i];assert.equal(now.card,old.card);const changes=[]
 for(const key of new Set([...Object.keys(now),...Object.keys(old)]))if(JSON.stringify(now[key])!==JSON.stringify(old[key])){
  assert.ok(['rows','text','dialogs'].includes(key));changes.push({path:key,before:old[key],after:now[key]})
 }
 if(changes.length)sources[client+'/'+now.card]=changes
}
fs.writeFileSync(new URL('../test-support/fixtures/pm-decisions-r30.json.gz',import.meta.url),gzipSync(JSON.stringify({head:'588f1d67',roots,rows,sources}),{level:9}))
console.log('R30 display-only patches captured:',Object.keys(rows).length)
