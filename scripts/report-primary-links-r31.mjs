import fs from 'node:fs'
import assert from 'node:assert/strict'
import {imageInputPresentations} from '../test-support/image-input-r27.mjs'
import {restoreI13} from '../test-support/primary-links-r31.mjs'
import {restoreI12} from '../test-support/pm-decisions-r30.mjs'
import prior from '../docs/model-modality-r30-i12-decisions.json' with {type:'json'}
import review from '../config/channel-audit/review-r31-20261110.json' with {type:'json'}
import {validatedPrimaryPages} from './lib/primary-links-r31.mjs'
import {siblingEndpoint} from '../packages/api/src/model-card-sources.mjs'
const current=await imageInputPresentations(),before=restoreI13(current),preI12=restoreI12(current),official=validatedPrimaryPages(review)
const rows=prior.primaryLinks.map(row=>{
 const channel=row.key.split('/')[0],candidate=review.candidates.find(r=>r.identity===row.key)
 const kept=siblingEndpoint(channel,row.before.url,row.after.url)
 const decision=kept?'kept':official[row.key]?'replaced-with-official-page':'restored'
 const expected=kept?row.after.url:official[row.key]?.url||row.before.url
 const after=current[row.key].web.sources[0]
 assert.equal(after.url,expected,row.key)
 assert.deepEqual((( {url,label})=>({url,label}))(current[row.key].mini.card.specSources[0]),after,row.key+' Web/Mini')
 const reason=kept?`Same-channel sibling ${row.before.url} is replaced by this card's own endpoint; the field citation remains.`
  :official[row.key]?`Exact identity and all known values verified on the model's Alibaba page; ${candidate.evidenceRef}.`
  :candidate?`Restore the Bailian model list: ${candidate.reason}.`
  :row.after.url.includes('huggingface.co')?`Restore ${row.before.label}: Hugging Face is not the card's channel and the old primary is not a sibling endpoint.`
  :`Restore ${row.before.label}: the old primary is a vendor document, catalog, notice or non-sibling API reference.`
 return {key:row.key,channel,optionA:row.optionA,decision,reason,beforeI12:row.before,afterI12:row.after,after,...(candidate?{validationEvidenceRef:candidate.evidenceRef,validationPassed:candidate.validated}:{})}
})
const countsByChannel={}
for(const row of rows){const c=countsByChannel[row.channel]||={kept:0,restored:0,'replaced-with-official-page':0};c[row.decision]++}
const casing=new Map()
for(const[key,row]of Object.entries(current)){
 assert.equal(row.web.sources[0]?.url,row.mini.card.specSources[0]?.url,key)
 if(!rows.some(r=>r.key===key))assert.equal(row.web.sources[0]?.url,before[key].web.sources[0]?.url,key+' outside 82')
 if(row.web.sources[0]?.url.includes('huggingface.co'))assert.equal(row.web.sources[0].url,preI12[key].web.sources[0]?.url,key+' newly promoted HF')
 for(const client of ['web','mini'])for(const source of client==='web'?row.web.sources:row.mini.card.specSources){
  const old=(client==='web'?before[key].web.sources:before[key].mini.card.specSources).find(s=>s.url===source.url)
  if(!old||old.label===source.label)continue
  const change=casing.get(source.url)||{url:source.url,before:old.label,after:source.label,occurrences:{web:0,mini:0},cards:[]}
  assert.equal(change.before,old.label);assert.equal(change.after,source.label)
  change.occurrences[client]++;if(!change.cards.includes(key))change.cards.push(key);casing.set(source.url,change)
 }
}
const counts={cards:rows.length,kept:rows.filter(r=>r.decision==='kept').length,restored:rows.filter(r=>r.decision==='restored').length,officialPages:rows.filter(r=>r.decision==='replaced-with-official-page').length}
const report={phase:'R31 Phase I13',head:'702175ea',mainBaseline:'52e0f161',cardsPerClient:1064,counts,countsByChannel,kept:rows.filter(r=>r.decision==='kept'),restored:rows.filter(r=>r.decision==='restored'),bailianOfficialPages:rows.filter(r=>r.decision==='replaced-with-official-page'),casing:{count:casing.size,changes:[...casing.values()]},dialogTitle:{web:'模型规格',mini:'模型规格',scope:'Shared by channel and direct/vendor cards. Web specification heading, accessible group and open/close controls use the same title. Mini source-copy/specification modal uses the same title; individual modality tap titles remain contextual. Mini retains verification data without displaying dates.'}}
const table=list=>'| Card | Decision | Before I12 | After I13 | Reason |\n| --- | --- | --- | --- | --- |\n'+list.map(r=>`| ${r.key} | ${r.decision} | ${r.beforeI12.url} | ${r.after.url} | ${r.reason} |`).join('\n')+'\n'
const md=`# R31 primary-link decisions\n\nR31 Phase I13, PR #251 head \`702175ea\`. All **82** I12 changes reviewed individually: **${counts.kept} kept**, **${counts.restored} restored**, **${counts.officialPages} replaced with validated Alibaba pages**. Primary sources agree across all 1,064 Web/Mini cards. No other card changes its primary URL.\n\nKeep only same-channel sibling endpoint → own endpoint. All 15 Option-A cards qualify, including Ideogram's own edit → generation endpoint (its vendor also operates the direct channel). Other vendor documents, catalogs and notices return to their pre-I12 position. The supplied 82-row inventory has 24 Alibaba-source → Hugging Face changes: 23 from the model list (11 Bailian cards) plus one Bailian retirement-notice source. These span several channels. We checked all 14 Bailian rows previously using the model list, including three GLM pages. Six pass; eight fail exact identity or numeric/modality checks and retain the list. Other Bailian vendor/notice primaries are restored unchanged.\n\nValidation uses cached public unauthenticated documentation GETs only: HTTP status, final URL, UTC/Asia-Shanghai time, SHA-256 and verbatim per-field quotes are in [R31 evidence](../config/channel-audit/review-r31-20261110.json). HTTP 200 alone is insufficient. A namespaced endpoint must appear exactly in the supplier sentence; 1,048,576 is not treated as 1,000,000. Existing known values must be present in their labeled fields; unknowns remain unknown. Navigation and nearby models are excluded. The model-list and Qwen family pages were discovery-only. Original facts and verification dates are retained.\n\n| Channel | Kept | Restored | Official page |\n| --- | ---: | ---: | ---: |\n`+Object.entries(countsByChannel).map(([channel,c])=>`| ${channel} | ${c.kept} | ${c.restored} | ${c['replaced-with-official-page']} |`).join('\n')+'\n\n## Kept\n\n'+table(report.kept)+'\n## Restored\n\n'+table(report.restored)+'\n## Validated Alibaba pages\n\n'+table(report.bailianOfficialPages)+`\n## Source-title casing\n\n**${casing.size} source URLs corrected** across the full catalog. Known acronyms retain canonical source casing in generated URL-wide titles and runtime fallbacks (GGUF, AWQ, GPTQ, FP8/FP16/BF16, INT4/INT8, MLX, ONNX, API/APIs, VL, MoE, LLM, OCR, SDXL, LoRA). Picker names remain unchanged. The fetched Bonsai model card gives “Ternary Bonsai 27B”; its format label gives “GGUF”, while its repository suffix is lowercase gguf. I10 URL normalization and one-title-per-URL rules remain unchanged.\n\n| URL | Before | After | Web / Mini source rows |\n| --- | --- | --- | --- |\n`+[...casing.values()].map(r=>`| ${r.url} | ${r.before} | ${r.after} | ${r.occurrences.web} / ${r.occurrences.mini} |`).join('\n')+'\n\n## Dialog title\n\n'+report.dialogTitle.scope+'\n\nBoth shared titles are **模型规格**. No distinct vendor-card title exists.\n'
for(const[extension,content]of [['json',JSON.stringify(report,null,2)+'\n'],['md',md]]){const file=new URL('../docs/model-card-primary-links-r31.'+extension,import.meta.url);if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),content);else fs.writeFileSync(file,content)}
console.log(JSON.stringify({counts,countsByChannel,casing:casing.size}))
