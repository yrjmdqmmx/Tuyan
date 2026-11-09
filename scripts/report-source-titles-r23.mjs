// Offline, deterministic title inventory. --check reads only; no Git history
// needed: the pre-F rows are losslessly frozen in the small gzip fixture.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { productBundle } from '../test-support/execution-capability.mjs'
import { titleBaseline, scanTitles, historicalIds } from '../test-support/source-titles-r23.mjs'
import { sourceTitle } from '../packages/api/src/card-presentation.mjs'
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
      assert.equal(row.label.split(' · ')[0],old.rows[i].label.split(' · ')[0],card.card)
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
const cell = value => String(value).replaceAll('|','&#124;').replaceAll('\n','<br>')
const report = [
  '# R23 Phase F — source title scan','',
  'Baseline: `1dcd8b13` (pre-F), frozen in `test-support/fixtures/source-titles-1dcd8b13.json.gz`. The fixture contains every Web/Mini card name, URL and label; tests require all 1,064 identities, names and ordered URL lists per client to remain identical. No network or Git writes.','',
  '| Client | Cards | Source rows | Changed titles | Changed cards | Unresolved heuristic findings |','| --- | ---: | ---: | ---: | ---: | ---: |',
  ...Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRows} | ${c.changedTitles} | ${c.changedCards} | ${c.suspiciousTitles} |`),'',
  `Also scanned **${notices.length} Web lifecycle dialogs**; **${notices.filter(row=>row.before!==row.after).length}** changed titles are listed separately below. Web tests open every rendered evidence dialog, check the card link/tooltip, and compare every anchor. Mini tests invoke every copy dialog and clipboard callback. Shared-helper parity is checked on all Mini rows.`, '',
  'Heuristics cover collapsed/split numeric versions, raw hosts/paths, API-prefix subjects, case/punctuation differing from the curated name, leftover slug separators, trailing ellipses and repeated words. Deliberate exact curated names and release codes are retained and enumerated below; negative examples prove the scanner rejects each defect class. Zero duplicate URLs/labels; role prefixes and source ordering are unchanged.', '',
  'Title priority: exact card/picker name for its own model page; captured human page title for a general page; readable path subject with numeric separators preserved. API documentation uses its model subject plus API 文档. Colliding labels get human format/language qualifiers, never a URL suffix. Captured-title data is compiled against referenced card inputs; Mini additionally uses its complete source projection, including vendor and field links. Original captures remain unchanged.', '',
  'Historical unknown hints: exactly these seven TokenDance IDs show **渠道页无此型号** with the existing verification date in Web tooltips/dialogs and Mini icon dialogs: '+historicalIds.map(id=>'`'+id+'`').join(', ')+'. Other hints and all modality states remain unchanged.', '',
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
