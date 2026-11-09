import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { generateModelAudit } from './generate-model-audit.mjs'

const sourceUrl = 'https://vendor.example/models/exact'
const fixture = () => ({
  pairs: [], mappings: [], canonical: {}, deprecations: [],
  claims: [
    { officialPageExists: { 'gpt-image-2.6-sunburst': true, 'gpt-image-2.6-flare': true }, inputModalities:['text','image'], outputModalities:['image'] },
    { officialApiIdsObserved: ['accounts/fireworks/models/kimi-k3p1-pro'], totalContextTokens:1048576 }, {},
    { status:'official_ids_checked_against_antling_docs', pageMentions:{'Ling-3.1-flash':true,'Ling-3.2-flash':true} },
    { officialApiIdsObserved:['hy4'] }, {status:'official_GA_checked',pageMentions:{'LongCat-2.5':true}},
  ], channels:{antling:{catalogUrls:[sourceUrl]},longcat:{catalogUrls:[sourceUrl,sourceUrl]}},
})
test('inheritance requires exact mapping and matching canonical value, never a similar name', () => {
  const input = fixture()
  input.pairs = [{channel:'host',apiModelId:'exact',totalContextTokens:123456,fieldProvenance:{totalContextTokens:{kind:'inherited-from-vendor',canonicalId:'native',sourceUrl}}}]
  input.canonical.native = {totalContextTokens:123456}
  assert.throws(() => generateModelAudit(input), /Unmapped inheritance/)
  input.mappings = [{channel:'host',apiModelId:'exact-similar',canonicalId:'native'}]
  assert.throws(() => generateModelAudit(input), /Unmapped inheritance/)
  input.mappings[0].apiModelId = 'exact'
  const data = generateModelAudit(input)
  assert.deepEqual(data.facts[data.rows['host/exact'][2]], [123456,'known','vendor',0])
  input.canonical.native.totalContextTokens = 999
  assert.throws(() => generateModelAudit(input), /Unmapped inheritance/)
})
test('null, unsupported and N/A stay distinct; invalid numbers and request defaults stay unknown', () => {
  const input = fixture()
  input.pairs = [0,Infinity,-1,undefined].map((value,i) => ({channel:'host',apiModelId:String(i),totalContextTokens:value,fieldProvenance:{totalContextTokens:{kind:'channel-published',sourceUrl}}}))
  input.pairs.push({channel:'tokendance',apiModelId:'exact',maxOutputTokens:8192,fieldProvenance:{maxOutputTokens:{kind:'channel-published',sourceUrl}}})
  input.pairs.push({channel:'host',apiModelId:'unsupported',inputModalities:false,fieldProvenance:{inputModalities:{kind:'channel-published',sourceUrl}}})
  const data = generateModelAudit(input)
  for (let i=0;i<4;i++) assert.deepEqual(data.facts[data.rows[`host/${i}`][2]].slice(0,2),[null,'unknown'])
  assert.deepEqual(data.facts[data.rows['tokendance/exact'][3]].slice(0,2),[null,'unknown'])
  assert.deepEqual(data.facts[data.rows['host/unsupported'][0]].slice(0,2),[null,'unsupported'])
  assert.deepEqual(data.facts[data.rows['openai/gpt-image-2.6-flare'][2]].slice(0,2),[null,'not-applicable'])
  assert.deepEqual(generateModelAudit(input), data)
})
test('committed snapshot has only the seven permitted additions and four scheduled notices plus 68 message-only removals', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../config/model-audit.generated.json',import.meta.url),'utf8'))
  assert.equal(data.verifiedAt,'2026-11-09')
  assert.equal(data.additions.length,7)
  assert.equal(Object.keys(data.notices).length,4)
  const counts = {retired:0,scheduled:0,unavailable:0}
  for (const notice of Object.values(data.notices)) counts[Date.parse(notice.stopDate)>Date.parse('2026-11-09')?'scheduled':notice.scope==='full'?'retired':'unavailable']++
  assert.deepEqual(counts,{retired:0,scheduled:4,unavailable:0})
  assert.equal(Object.keys(data.removed).length,68)
  for (const key of Object.keys(data.removed)) assert.equal(data.rows[key],undefined)
  assert.ok(!data.additions.some(row=>row.id==='glm-5.3-flashx-legal'))
  assert.ok(data.rows['antling/Ling-3.1-flash']);assert.ok(data.rows['antling/Ling-3.2-flash'])
  const catalog = JSON.parse(fs.readFileSync(new URL('../config/model-catalog-updates.json',import.meta.url),'utf8'))
  for (const {channel,id} of data.additions) {
    const model=catalog.providers[channel].find(row=>row.id===id)
    for (const [index,field] of ['inputModalities','outputModalities'].entries()) {
      const [value,state]=data.facts[data.rows[channel+'/'+id][index]]
      assert.deepEqual(model.metadata[field] ?? null,state==='known'?value:null,`${channel}/${id}/${field}`)
    }
  }
})

test('Ling supplementary evidence is deterministic, exact and does not infer unsupported or shared windows', async () => {
  const {supplementModelAudit} = await import('./lib/model-audit-supplement.mjs')
  const read = name => JSON.parse(fs.readFileSync(new URL('../config/'+name,import.meta.url),'utf8'))
  const data=read('model-audit.generated.json'), supplement=read('channel-audit/model-audit-supplement-20261109.json'), removed=read('removed-models.json')
  assert.deepEqual(supplementModelAudit(data,supplement,removed),data)
  for(const [id,context,input,unknown] of [
    ['Ling-3.2-flash',1048576,['text','image','video'],['audio']],
    ['Ling-3.1-flash',1048576,['text'],['image','audio','video']],
    ['Ling-3.0-flash-VL',262144,['text','image','video'],['audio']],
    ['Ling-3.0-flash',262144,['text'],['image','audio','video']],
    ['Ling-3.0-tiny',null,['text'],['image','audio','video']],
  ]) {
    const row=data.rows['antling/'+id]
    assert.equal(data.facts[row[2]][0],context)
    assert.deepEqual(data.facts[row[0]][0],input)
    assert.deepEqual(data.facts[row[1]][0],['text'])
    assert.equal(data.facts[row[3]][0],null)
    assert.deepEqual(data.details['antling/'+id].unknownInputModalities,unknown)
    assert.ok(data.details['antling/'+id].sourceUrls.every(url=>url.startsWith('https://developer.ant-ling.com/')))
    assert.doesNotMatch(data.details['antling/'+id].note,/共享|shared/i)
  }
})
