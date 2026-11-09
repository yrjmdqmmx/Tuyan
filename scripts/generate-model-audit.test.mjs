import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { generateModelAudit } from './generate-model-audit.mjs'
import { supplementModelAudit } from './lib/model-audit-supplement.mjs'

const sourceUrl = 'https://vendor.example/models/exact'
test('R10 only Bailian Kimi has reviewed modality exclusions; missing or conflicting evidence fails generation', () => {
  const read = name => JSON.parse(fs.readFileSync(new URL('../config/' + name, import.meta.url), 'utf8'))
  const snapshot = read('model-audit.generated.json'), supplement = read('channel-audit/model-audit-supplement-20261109.json'), removed = read('removed-models.json')
  const key = 'bailian/kimi-k3'
  assert.deepEqual(Object.keys(supplement.modalityExclusions), [key])
  for (const [field, values] of [['inputModalities', ['audio', 'video']], ['outputModalities', ['image', 'audio', 'video']]]) {
    const evidence = supplement.modalityExclusions[key][field]
    assert.deepEqual(evidence.values, values)
    assert.equal(evidence.quote, '| 输入模态 | Text Image | 输出模态 | Text |')
    assert.equal(evidence.sourceUrl, 'https://help.aliyun.com/zh/model-studio/kimi-k3')
    assert.equal(evidence.verifiedAt, '2026-11-09')
    assert.deepEqual(snapshot.details[key].unsupportedModalities[field], values)
  }
  for (const patch of [{ quote: '' }, { sourceUrl }, { verifiedAt: '2026-10-16' }, { values: ['text'] }, { values: [] }]) {
    const invalid = structuredClone(supplement)
    Object.assign(invalid.modalityExclusions[key].inputModalities, patch)
    assert.throws(() => supplementModelAudit(snapshot, invalid, removed), /Invalid modality exclusion/)
  }
  assert.deepEqual(supplementModelAudit(snapshot, supplement, removed), snapshot)
})
test('R8 removed names match frozen main labels with one documented R9 override; missing names fail generation', () => {
  const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'))
  const removed = read('../config/removed-models.json')
  const oracle = read('../apps/web/tests/fixtures/removed-model-names-main-c7b6a2fc.json')
  const overrides = read('../apps/web/tests/fixtures/removed-model-name-overrides-r9.json')
  assert.deepEqual(Object.keys(overrides), ['bailian/deepseek-v4-flash'])
  assert.equal(overrides['bailian/deepseek-v4-flash'].displayName, 'DeepSeek-V4-Flash')
  assert.ok(overrides['bailian/deepseek-v4-flash'].reason.trim())
  const input = read('../config/model-audit.generated.json')
  const supplement = read('../config/channel-audit/model-audit-supplement-20261109.json')
  assert.equal(Object.keys(removed).length, 68)
  for (const [key, row] of Object.entries(removed)) {
    assert.ok(row.displayName?.trim(), key)
    assert.equal(row.displayName, overrides[key]?.displayName || oracle.models[key].displayName, key)
    assert.equal(row.replacementDisplayName, oracle.models[key].replacementDisplayName, key)
    const missing = structuredClone(removed)
    delete missing[key].displayName
    assert.throws(() => supplementModelAudit(input, supplement, missing), /Missing display name/)
  }
})

test('R8 Kimi exact fields keep the supplied source, verbatim quotes and verification date', () => {
  const input = JSON.parse(fs.readFileSync(new URL('../config/channel-audit/input-20261109.json', import.meta.url), 'utf8'))
  const row = input.pairs.find(row => row.channel === 'bailian' && row.apiModelId === 'kimi-k3')
  assert.deepEqual(row.inputModalities, ['text', 'image']); assert.deepEqual(row.outputModalities, ['text'])
  assert.equal(row.totalContextTokens, 1048576); assert.equal(row.maxOutputTokens, 1048576)
  for (const fact of Object.values(row.fieldProvenance)) {
    assert.equal(fact.sourceUrl, 'https://help.aliyun.com/zh/model-studio/kimi-k3')
    assert.equal(fact.verifiedAt, '2026-11-09'); assert.match(fact.quote, /^\| .+ \|$/)
  }
  assert.equal(row.fieldProvenance.inputModalities.quote, '| 输入模态 | Text Image | 输出模态 | Text |')
  assert.equal(row.fieldProvenance.totalContextTokens.quote, '| 上下文长度 | 1048576 | 最大输入长度（思考模式下） | 1048576 |')
})
const fixture = () => ({
  pairs: [], mappings: [], canonical: {}, deprecations: [],
  claims: [
    { officialPageExists: { 'gpt-image-2.6-sunburst': true, 'gpt-image-2.6-flare': true }, inputModalities:['text','image'], outputModalities:['image'] },
    { officialApiIdsObserved: ['accounts/fireworks/models/kimi-k3p1-pro'], totalContextTokens:1048576 }, {},
    { status:'official_ids_checked_against_antling_docs', pageMentions:{'Ling-3.1-flash':true,'Ling-3.2-flash':true} },
    { officialApiIdsObserved:['hy4'] }, {status:'official_GA_checked',pageMentions:{'LongCat-2.5':true}},
  ], channels:{antling:{catalogUrls:[sourceUrl]},longcat:{catalogUrls:[sourceUrl,sourceUrl]}},
})
test('all original 85 conflicts have an evidence decision and unproven exclusions are withdrawn', () => {
  const read = name => JSON.parse(fs.readFileSync(new URL('../config/' + name, import.meta.url), 'utf8'))
  const review = read('channel-audit/review-r6a-20261109.json')
  const input = read('channel-audit/input-20261109.json')
  const supplement = read('channel-audit/model-audit-supplement-20261109.json')
  const pairs = new Map(input.pairs.map(row => [row.channel + '/' + row.apiModelId, row]))
  assert.equal(review.conflicts.length, 85)
  assert.deepEqual(review.conflicts.map(row => row.number), Array.from({ length: 85 }, (_, i) => i + 1))
  for (const row of review.conflicts) {
    const key = row.channel + '/' + row.id
    if (row.decision === 'verified') {
      assert.match(row.evidence.sourceUrl, /^https:\/\//)
      assert.ok(row.evidence.quote.trim(), key)
      assert.deepEqual((supplement.models[key] || pairs.get(key))[row.field], row.evidence.value, key)
    } else {
      assert.equal(row.decision, 'fallback')
      const pair = pairs.get(key)
      assert.ok(pair[row.field] === null || pair.fieldProvenance[row.field]?.kind === 'product-config', key)
    }
  }
  for (const row of input.pairs) {
    if (row.channel !== 'deepseek' && /deepseek.*flash/i.test(row.apiModelId)) {
      assert.doesNotMatch(row.fieldProvenance.inputModalities?.sourceUrl || '', /api-docs\.deepseek\.com/)
    }
  }
})
test('Web identity projection restores every card fact and lifecycle without the generator inventory', async () => {
  const {MODEL_AUDIT_DATA} = await import('../apps/web/src/lib/modelAudit.js')
  const archive = JSON.parse(fs.readFileSync(new URL('../config/model-audit.generated.json',import.meta.url),'utf8'))
  const {additions, ...cardData} = archive
  assert.equal(additions.length,7)
  assert.deepEqual(MODEL_AUDIT_DATA,cardData)
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
  input.pairs.push({channel:'host',apiModelId:'unsupported',inputModalities:false,fieldProvenance:{inputModalities:{kind:'channel-published',sourceUrl,quote:'This endpoint does not accept input.'}}})
  input.pairs.push({channel:'host',apiModelId:'unproven-exclusion',inputModalities:false,fieldProvenance:{inputModalities:{kind:'channel-published',sourceUrl}}})
  input.pairs.push({channel:'host',apiModelId:'unlisted',inputModalities:[],fieldProvenance:{inputModalities:{kind:'channel-published',sourceUrl}}})
  const data = generateModelAudit(input)
  assert.deepEqual(data.facts[data.rows['host/unlisted'][0]].slice(0,2),[null,'unknown'])
  for (let i=0;i<4;i++) assert.deepEqual(data.facts[data.rows[`host/${i}`][2]].slice(0,2),[null,'unknown'])
  assert.deepEqual(data.facts[data.rows['tokendance/exact'][3]].slice(0,2),[null,'unknown'])
  assert.deepEqual(data.facts[data.rows['host/unsupported'][0]].slice(0,2),[null,'unsupported'])
  assert.deepEqual(data.facts[data.rows['host/unproven-exclusion'][0]].slice(0,2),[null,'unknown'])
  assert.deepEqual(data.facts[data.rows['openai/gpt-image-2.6-flare'][2]].slice(0,2),[null,'not-applicable'])
  assert.deepEqual(generateModelAudit(input), data)
})
test('committed snapshot has only the seven permitted additions and seven scheduled notices plus 68 message-only removals', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../config/model-audit.generated.json',import.meta.url),'utf8'))
  assert.equal(data.verifiedAt,'2026-11-09')
  assert.equal(data.additions.length,7)
  assert.equal(Object.keys(data.notices).length,7)
  const counts = {retired:0,scheduled:0,unavailable:0}
  for (const notice of Object.values(data.notices)) counts[Date.parse(notice.stopDate)>Date.parse('2026-11-09')?'scheduled':notice.scope==='full'?'retired':'unavailable']++
  assert.deepEqual(counts,{retired:0,scheduled:7,unavailable:0})
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
    ['Ling-3.2-flash','1M',['text','image','video'],['audio']],
    ['Ling-3.1-flash','1M',['text'],['image','audio','video']],
    ['Ling-3.0-flash-VL','256K',['text','image','video'],['audio']],
    ['Ling-3.0-flash','256K',['text'],['image','audio','video']],
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

test('versioned Ant Ling deprecations regenerate deterministically without private audit input', async () => {
  const { supplementModelAudit } = await import('./lib/model-audit-supplement.mjs')
  const read = name => JSON.parse(fs.readFileSync(new URL('../config/' + name, import.meta.url), 'utf8'))
  const data = read('model-audit.generated.json'), supplement = read('channel-audit/model-audit-supplement-20261109.json'), removed = read('removed-models.json'), addendum = read('channel-audit/deprecations-addendum-20261109.json')
  const original = structuredClone(data)
  for (const notice of addendum.scheduledDeprecations) delete original.notices[notice.channel + '/' + notice.apiModelId]
  assert.deepEqual(supplementModelAudit(original, supplement, removed, addendum), data)
  assert.deepEqual(supplementModelAudit(data, supplement, removed, addendum), data)
  for (const notice of addendum.scheduledDeprecations) {
    assert.equal(data.notices[notice.channel + '/' + notice.apiModelId].stopDate, '2026-11-15T00:00:00+08:00')
    assert.equal(data.notices[notice.channel + '/' + notice.apiModelId].replacement, 'Ling-3.1-flash')
    assert.equal(removed[notice.channel + '/' + notice.apiModelId], undefined)
  }
  const catalog = read('model-catalog-updates.json')
  for (const old of addendum.alreadyRetiredOnOfficialPage) assert.equal(catalog.providers.antling.some(m => m.id === old.apiModelId), false)
})

test('R13 generator filters denied Core/API source pointers, preserves field evidence and never creates channel retirements', () => {
  const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url)))
  const data = read('config/model-audit.generated.json'), supplement = read('config/channel-audit/model-audit-supplement-20261109.json')
  const removed = read('config/removed-models.json'), dead = read('config/channel-audit/dead-links-20261109.json')
  const repaired = read('apps/web/tests/fixtures/r12-final-link-check-20261109.json').filter(row => row.originalStatus === 404)
  assert.equal(repaired.length, 7); assert.equal(dead.length, 14)
  const denied = new Set(dead.map(row => row.url))
  for (const { url, ...check } of dead) assert.deepEqual(data.sourceChecks[url], check)
  for (const { channel, modelId, finalUrl, oldUrl, previousUrl } of repaired) {
    const key = channel + '/' + modelId, row = data.rows[key]
    assert.ok(!denied.has(data.sources[row[5]]))
    assert.equal(data.details[key].sourceLinks[0].url, finalUrl)
    assert.equal(data.details[key].sourceLinks[0].scope, 'vendor')
    assert.equal(data.removed[key], undefined); assert.equal(data.notices[key], undefined)
    assert.deepEqual(dead.filter(item => item.cards.includes(key)).map(item => item.url).sort(), [oldUrl, previousUrl].sort())
    const noFallback = structuredClone(supplement), original = structuredClone(data)
    delete noFallback.sourceLinks[key]
    original.rows[key][5] = original.sources.push(oldUrl) - 1
    const result = supplementModelAudit(original, noFallback, removed)
    assert.equal(result.rows[key][5], null, 'unknown source must not restore a 404')
    for (let i = 0; i < 4; i++) {
      const before = data.facts[row[i]], after = result.facts[result.rows[key][i]]
      assert.deepEqual(after.slice(0, 3), before.slice(0, 3))
      assert.equal(result.sources[after[3]], data.sources[before[3]])
    }
  }
  for (const [key, row] of Object.entries(data.rows)) {
    assert.ok(!denied.has(data.sources[row[5]]), key)
    for (const link of data.details[key]?.sourceLinks || []) assert.ok(!denied.has(link.url), key)
  }
})

test('R13B generator carries the exact DeepSeek vendor release without replacing field evidence', () => {
  const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url)))
  const data = read('config/model-audit.generated.json'), supplement = read('config/channel-audit/model-audit-supplement-20261109.json')
  const key = 'tokendance/deepseek-chat-v3-0324', url = 'https://api-docs.deepseek.com/news/news250325'
  assert.equal(supplement.sourceLinks[key][0].url, url)
  assert.equal(supplement.sourceLinks[key][0].scope, 'vendor')
  assert.equal(supplement.sourceLinks[key][0].checkedAt, '2026-11-09')
  assert.deepEqual(data.details[key].sourceLinks, supplement.sourceLinks[key])
  assert.deepEqual(data.sourceChecks[url], { status: 200, contentType: 'text/html', checkedAt: '2026-11-09', finalUrl: url + '/', title: 'V3-0324 Release | DeepSeek API Docs' })
  const original = read('config/channel-audit/input-20261109.json').pairs.find(row => row.channel + '/' + row.apiModelId === key)
  for (const field of data.fields) {
    const fact = data.facts[data.rows[key][data.fields.indexOf(field)]]
    const evidence = original.fieldProvenance[field]?.sourceUrl
    if (evidence) assert.equal(data.sources[fact[3]], evidence)
  }
})
