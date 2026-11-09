// Offline, deterministic title inventory. --check reads only; no Git history
// needed: the pre-F rows are losslessly frozen in the small gzip fixture.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { productBundle } from '../test-support/execution-capability.mjs'
import { titleBaseline, scanTitles, historicalIds, titleIssues, f3TitleExamples } from '../test-support/source-titles-r23.mjs'
import { sourceTitle } from '../packages/api/src/card-presentation.mjs'
import r24 from '../test-support/fixtures/model-card-r24.json' with { type: 'json' }
const root = fileURLToPath(new URL('../', import.meta.url)), require = createRequire(import.meta.url)
const web = await productBundle(`export {STATIC_MODEL_REGISTRY} from './apps/web/src/lib/staticModelCatalog.js'; export {modelCardSpecifications} from './apps/web/src/lib/modelCardSpecifications.js'; export {modelSourceRows} from './apps/web/src/lib/modelCardSources.js'`)
const filename = require.resolve('../apps/miniprogram/miniprogram/components/model-picker/model-picker.js')
const context = {Component(){},exports:{},require:createRequire(filename)}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})
const mini = require('../apps/miniprogram/miniprogram/utils/static-model-catalog.js')
const current = {web:[],mini:[]}, notices = []
for (const [provider, entry] of Object.entries(web.STATIC_MODEL_REGISTRY)) for (const model of entry.models) {
  const card = provider+'/'+model.id, data = web.modelCardSpecifications(provider,model)
  current.web.push({card,name:data.sourceModel.displayName,rows:web.modelSourceRows(data)})
  if (data.lifecycle?.state === 'scheduled') {
    const url = data.lifecycle.sourceUrl
    const old = titleBaseline.web.find(row=>row.card===card).rows.find(row=>row.url===url)
    assert.ok(old,card+' lifecycle URL in baseline')
    notices.push({client:'Web notice dialog',card,url,before:'下线公告 · '+old.label.split(' · ').slice(1).join(' · '),after:'下线公告 · '+sourceTitle(url)})
  }
}
for (const [provider, entry] of Object.entries(mini.STATIC_MODEL_REGISTRY)) for (const model of entry.models) {
  const data = context.present(model,'','',provider)
  current.mini.push({card:provider+'/'+model.id,name:data.label,rows:structuredClone(data.specSources)})
}
const counts = {}, changes = [], retained = []
for (const client of ['web','mini']) {
  const cards = current[client], prior = titleBaseline[client]
  assert.equal(cards.length,1064); assert.equal(prior.length,1064)
  const suspicious = scanTitles(cards)
  assert.deepEqual(suspicious,[])
  for (const card of cards) {
    const old = prior.find(row=>row.card===card.card)
    assert.equal(card.name,old.name,card.card)
    assert.deepEqual(card.rows.map(row=>row.url),old.rows.map(row=>row.url),card.card)
    for (const [i,row] of card.rows.entries()) {
      const retirementCorrection = r24.noticeCards.includes(card.card) && row.url === r24.noticeUrl
      assert.equal(row.label.split(' · ')[0], retirementCorrection ? '下线公告' : old.rows[i].label.split(' · ')[0], card.card)
      if(row.label!==old.rows[i].label) changes.push({client,card:card.card,url:row.url,before:old.rows[i].label,after:row.label})
      const subject=row.label.split(' · ').slice(2).join(' · ').replace(/（(?:Markdown|控制台|英文|文档)(?: \d+)?）$/,'').replace(/ API 文档$/,'')
      const reason = subject===card.name && /[-_/]|^[a-z]/.test(subject)
        ? 'Exact curated picker name; required to retain its spelling and separators.'
        : /(?:^| · )(?:文档 \d+|[A-Z][a-z]*\d{5,}|[A-Z][a-z]*\d[a-z0-9]*|\d+(?:\.\d+)+ Chat)$/.test(subject) && !subject.includes(card.name)
          ? 'Opaque documentation/news identifier; no captured page title available in the offline inputs. Kept intact, without inventing a subject.'
          : /codestral-25-08/.test(row.url) ? '2508 is the curated release code; the page spells that date code 25-08. No model version was collapsed.' : null
      if(reason)retained.push({client,card:card.card,url:row.url,title:row.label,reason})
    }
  }
  const changed=changes.filter(row=>row.client===client)
  counts[client]={cards:cards.length,sourceRows:cards.reduce((n,c)=>n+c.rows.length,0),changedTitles:changed.length,changedCards:new Set(changed.map(row=>row.card)).size,suspiciousTitles:suspicious.length}
}
changes.push(...notices.filter(row=>row.before!==row.after))
assert.deepEqual(notices.flatMap(row => titleIssues({url:row.url,label:row.after})), [])
for (const [url, model, expected] of f3TitleExamples) assert.equal(sourceTitle(url, model), expected)
const cell = value => String(value).replaceAll('|','&#124;').replaceAll('\n','<br>')
const report = [
  '# R23 Phase F / F3 — source title scan','',
  'Baseline: `1dcd8b13` (pre-F), frozen in `test-support/fixtures/source-titles-1dcd8b13.json.gz`. The fixture contains every Web/Mini card name, URL and label; tests require all 1,064 identities, names and ordered URL lists per client to remain identical. No network or Git writes.','',
  '| Client | Cards | Source rows | Changed titles | Changed cards | Unresolved heuristic findings |','| --- | ---: | ---: | ---: | ---: | ---: |',
  ...Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRows} | ${c.changedTitles} | ${c.changedCards} | ${c.suspiciousTitles} |`),'',
  `Also scanned **${notices.length} Web lifecycle dialogs**; **${notices.filter(row=>row.before!==row.after).length}** changed titles are listed separately below. Web tests open every rendered evidence dialog, check the card link/tooltip, and compare every anchor. Mini tests invoke every copy dialog and clipboard callback. Shared-helper parity is checked on all Mini rows.`, '',
  'Heuristics cover collapsed/split numeric versions, hyphens replacing known dotted versions (letter/version tokens such as Qwen3-8, K2-7 and V4-1), raw hosts/paths, API-prefix subjects, case/punctuation differing from the curated name, leftover slug separators, trailing ellipses and repeated words. The dotted-version oracle independently reads every catalog ID/name, plus the current card ID/name. Genuine parameter/release hyphens such as Qwen3-8B, Qwen3.8-27B and DeepSeek-R1-0528 remain valid. Zero duplicate URLs/labels; source ordering is unchanged. R24 restores 下线公告 on the three explicitly reviewed vendor notice rows per client; every other role prefix remains unchanged.', '',
  'Title priority: curated card/picker name for its own model page, correcting a known dotted version even if its picker label encodes a slug; captured human page title for a general page; longest separator-normalized catalog name/ID match, including family prefixes and quickstart suffixes; readable path fallback. API documentation uses its model subject plus API 文档. Colliding labels get human format/language qualifiers, never a URL suffix. Mini reuses its existing catalog; package-local shared name data is generated from the same registry. Original captures remain unchanged.', '',
  '## R23 F3 corrections', '',
  'Shared/general pages now recover version dots from known model identities across providers, even when the current card is a dated or different model. Surrounding page words remain readable. These regression cases run against both shared Web and compiled Mini helpers:', '',
  '| Page slug | Corrected subject |', '| --- | --- |',
  ...f3TitleExamples.slice(0,12).map(([url,, expected]) => `| ${url.split('/').at(-1)} | ${expected.split(' · ').slice(1).join(' · ')} |`), '',
  '**Stability confirmed:** `stable diffusion 35` → `Stable Diffusion 3.5`. The actual Web `stability/sd3.5-flash` row at `https://docs.stability.ai/api-reference/generate/stable-diffusion-35` is listed below; Mini tests also exercise that page with all four `sd3.5-*` cards. Mini currently exposes the existing generic API-reference link for those cards, so its generic title remains `API 文档`.', '',
  '**BFL casing:** the committed picker name is `FLUX-2-klein-4b`, so that own-page title stays exact. A separate shared/Mini regression supplies the curated name `FLUX.2 [klein] 4B` and requires that exact punctuation/casing. All 1,064 picker names remain unchanged. The two Replicate source rows whose picker name is `qwen3-7-plus` now say `Qwen3.7 Plus`; the picker itself remains unchanged.', '',
  'Historical unknown hints: exactly these seven TokenDance IDs show **渠道页无此型号** with the existing verification date in Web tooltips/dialogs and Mini icon dialogs: '+historicalIds.map(id=>'`'+id+'`').join(', ')+'. Other hints and all modality states remain unchanged.', '',
  '## R24 Phase I1 role corrections', '', 'The retirement notice at https://help.aliyun.com/zh/model-studio/model-depreciation retains 下线公告 on tokendance/qwen3.5-plus, qianfan/qwen-image-edit and siliconflow/Qwen/Qwen-Image-Edit in both clients. Vendor provenance and links remain intact. The role guard permits only these three card/URL pairs to differ from the frozen baseline. New R24 tests scan all 1,064 cards per client and require every retirement source to keep its role.', '',
  '## Every changed title','',
  '| Client | Card | URL | Before | After |','| --- | --- | --- | --- | --- |',
  ...changes.map(row=>`| ${[row.client,row.card,row.url,row.before,row.after].map(cell).join(' | ')} |`),'',
  '## Retained spelling and opaque identifiers','',
  `The following **${retained.length}** source-row instances merit manual explanation but are not unresolved defects. These are exact curated spellings, release codes, or page identifiers with no captured human title; changing their model names would violate the picker-name lock.`, '',
  '| Client | Card | URL | Retained title | Justification |','| --- | --- | --- | --- | --- |',
  ...retained.map(row=>`| ${[row.client,row.card,row.url,row.title,row.reason].map(cell).join(' | ')} |`),'',
  'Reproduce: `node scripts/report-source-titles-r23.mjs --check`; both client `model-card-source-titles-r23` tests exercise the actual render/copy-dialog paths.','',
].join('\n')
const target=root+'docs/model-card-source-titles-r23.md'
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),report,'R23F title report drift')
else fs.writeFileSync(target,report)
console.log(JSON.stringify({counts,noticeDialogs:notices.length,changedNoticeTitles:notices.filter(row=>row.before!==row.after).length,retained:retained.length}))
