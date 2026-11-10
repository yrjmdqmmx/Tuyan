import {restoreI12Sources} from '../test-support/pm-decisions-r30.mjs'
import { gitText as archivedAuditText, requireHistory } from './lib/git-history.mjs'
import { loadCard as loadCardFrom } from './lib/model-card-audit.mjs'
const loadCard = (root, commit) => loadCardFrom(root, commit, archivedAuditText)
const productBundle = (source, commit) => bundleFrom(source, commit, archivedAuditText)
requireHistory(fileURLToPath(new URL('../', import.meta.url)), ['c76e9c2a'])
// Current Phase B evidence, separate from the frozen R21/Phase 2 reports.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { writeOrCheck } from './lib/model-card-audit.mjs'
import { phase2Registry } from '../test-support/phase2-modality.mjs'
import { assertReviewedLinks, evidence, historical } from '../test-support/card-review-r22.mjs'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
import { modelSourceRows } from '../packages/api/src/model-card-sources.mjs'
import { sourceIdentity } from '../packages/api/src/card-presentation.mjs'
import { productBundle as bundleFrom } from '../test-support/execution-capability.mjs'
const root=fileURLToPath(new URL('../',import.meta.url))
Date.now=()=>Date.parse('2026-11-09T12:00:00Z')
const card=await loadCard(root), before=await loadCard(root,'c76e9c2a'), registry=await phase2Registry()
const {modelSourceName:oldSourceName}=await productBundle("export { modelSourceName } from './apps/web/src/lib/modelCardSources.js'",'c76e9c2a')
const current=Object.entries(STATIC_MODEL_REGISTRY).flatMap(([channel,p])=>p.models.map(model=>({channel,model,card:card(channel,model)})))
assert.equal(current.length,1064)
const full=Object.entries(registry.providers).flatMap(([channel,p])=>p.models.map(model=>({channel,model,card:card(channel,model)})))
assert.equal(full.length,1061)
for(const row of full){assert.equal(row.card.sources[0],card(row.channel,{id:row.model.id}).sources[0]);assert.deepEqual(row.card.fields,row.model.cardSpecifications.fields)}
assertReviewedLinks(id=>card('tokendance',{id}))
const {modelCardName,presentRegistryModel}=await productBundle("export { modelCardName } from './apps/web/src/lib/modelCardSpecifications.js'; export { presentRegistryModel } from './apps/web/src/lib/modelPresentation.js'")
const names=JSON.parse(fs.readFileSync(root+'apps/web/tests/fixtures/model-picker-names-8c456709.json')).names
for(const row of current)assert.equal(modelCardName(row.channel,presentRegistryModel(row.channel,row.model)),names[row.channel][row.model.id])
const counts={staticCards:current.length,fullCoreCards:full.length,unchangedPickerNames:current.length,verifiedPages:67,historicalFallbacks:7,missingFallbacks:0,sourceRowsBefore:0,sourceRowsAfter:0,duplicateUrlRowsBefore:0,duplicateUrlRowsAfter:0,duplicateLabelsBefore:0,duplicateLabelsAfter:0,vendorTokenFields:0,vendorTokenCards:0,unknownTokenFields:0}
const vendor=[], links=[]
for(const row of current){
 const prior=before(row.channel,row.model), rows=restoreI12Sources(modelSourceRows(row.card),row.channel+'/'+row.model.id,'web')
 counts.sourceRowsBefore+=prior.sources.length;counts.sourceRowsAfter+=rows.length
 counts.duplicateUrlRowsBefore+=prior.sources.length-new Set(prior.sources.map(sourceIdentity)).size
 counts.duplicateUrlRowsAfter+=rows.length-new Set(rows.map(r=>sourceIdentity(r.url))).size
 counts.duplicateLabelsBefore+=prior.sources.length-new Set(prior.sources.map(url=>oldSourceName(prior,url)+' · '+new URL(url).hostname)).size
 counts.duplicateLabelsAfter+=rows.length-new Set(rows.map(r=>r.label)).size
 if(row.channel==='tokendance'){
  const fields=['totalContextTokens','maxOutputTokens'].filter(key=>row.card.fields[key].provenance==='vendor'&&row.card.fields[key].state==='known')
  counts.vendorTokenFields+=fields.length;counts.vendorTokenCards+=fields.length>0
  counts.unknownTokenFields+=['totalContextTokens','maxOutputTokens'].filter(key=>row.card.fields[key].state==='unknown').length
  if(fields.length)vendor.push({id:row.model.id,fields:Object.fromEntries(fields.map(key=>[key,row.card.fields[key]]))})
  const page=evidence.pages.find(p=>p.id===row.model.id)
  links.push({id:row.model.id,checkedAt:page.checkedAt,verified:page.verified,result:page.result,evidenceSha256:page.evidenceSha256,source:rows[0]||null})
 }
}
assert.equal(counts.duplicateUrlRowsAfter,0);assert.equal(counts.duplicateLabelsAfter,0)
assert.equal(counts.vendorTokenFields,20)
const report={phase:'R22 Phase B',date:'2026-11-10',auditTimezone:'Asia/Shanghai',base:'8c456709',phaseA:'c76e9c2a',counts,
 rules:{links:'Only exact TokenDance model pages with successful rendered-content evidence, date and hash may be linked. Seven failures use original main vendor links.',sources:'One normalized URL per source list. R29 URL-wide ownership roles and readable titles are shared by all surfaces; meaningful namespaces distinguish separate pages. Mini preserves the primary source and copy dialog; R23 appends vendor field sources.',modalities:'Display-only order: text, image, video, audio, then other modalities. Stored arrays unchanged.',vendor:'All known vendor-only fields visibly show 源自原厂; null/unknown stays unknown. Four prior catalog fallbacks sourced solely from vendor pages are classified vendor at the display boundary; original evidence and verification dates remain.',vision:'视觉理解 is derived from the execution vision role in ModelPicker/presentRegistryModel and Mini. kimi-k3.1-pro has roles=[main]; image/video display facts do not enable vision execution.'},
 checks:{fullVsStaticFirstSources:0,coreVsWebFieldDifferences:0,previousPhaseReports:'Frozen read-only source reconstruction; original reports/evidence unchanged',rendering:evidence.method},links,vendor,
 bailian:modelSourceRows(card('bailian',{id:'deepseek-v4.1-flash'})),historical:historical.rows}
writeOrCheck(root+'docs/model-modality-r22b-results.json',JSON.stringify(report,null,2)+'\n',process.argv.includes('--check'))
console.log(JSON.stringify(counts,null,2))
