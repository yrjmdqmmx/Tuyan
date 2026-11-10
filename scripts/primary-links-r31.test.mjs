import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {imageInputPresentations} from '../test-support/image-input-r27.mjs'
import {restoreI12} from '../test-support/pm-decisions-r30.mjs'
import {restoreI13} from '../test-support/primary-links-r31.mjs'
import report from '../docs/model-card-primary-links-r31.json' with {type:'json'}
import prior from '../docs/model-modality-r30-i12-decisions.json' with {type:'json'}
import options from '../docs/model-modality-image-input-decision.json' with {type:'json'}
import review from '../config/channel-audit/review-r31-20261110.json' with {type:'json'}
import {validatedPrimaryPages} from './lib/primary-links-r31.mjs'
import {visibleSourceTitle,sourceAcronyms} from '../packages/api/src/card-presentation.mjs'
import {siblingEndpoint} from '../packages/api/src/model-card-sources.mjs'
import {sourceSurfaces,assertUnifiedTitles} from '../test-support/source-titles-r29.mjs'
test('R31 all 82 decisions match generated Web/Mini; all 1064 retain only authorized primary and source changes',async()=>{
 const rows=await imageInputPresentations(),old=restoreI12(rows),i12=restoreI13(rows)
 const decisions=[...report.kept,...report.restored,...report.bailianOfficialPages]
 assert.deepEqual(decisions.map(r=>r.key).sort(),prior.primaryLinks.map(r=>r.key).sort())
 assert.deepEqual(report.counts,{cards:82,kept:15,restored:61,officialPages:6})
 for(const decision of decisions){const row=rows[decision.key];assert.deepEqual(row.web.sources[0],decision.after);assert.equal(row.mini.card.specSources[0].url,decision.after.url);assert.equal(row.mini.card.specSources[0].label,decision.after.label);assert.ok(decision.reason)
  if(decision.decision==='restored')assert.equal(decision.after.url,decision.beforeI12.url)
  if(decision.decision==='kept')assert.equal(siblingEndpoint(decision.channel,decision.beforeI12.url,decision.after.url),true)
  if(decision.decision==='replaced-with-official-page')assert.equal(validatedPrimaryPages(review)[decision.key].url,decision.after.url)
 }
 assert.deepEqual(report.kept.map(r=>r.key).sort(),options.rows.map(r=>r.identity).sort())
 assert.equal(rows['fal/fal-ai/flux-2-pro'].web.sources[0].url,'https://fal.ai/models/fal-ai/flux-2-pro/api')
 for(const[key,row]of Object.entries(rows)){
  assert.equal(row.web.sources[0]?.url,row.mini.card.specSources[0]?.url,key)
  if(row.web.sources[0]?.url.includes('huggingface.co'))assert.equal(row.web.sources[0].url,old[key].web.sources[0]?.url,key)
  if(!decisions.some(r=>r.key===key))assert.equal(row.web.sources[0]?.url,i12[key].web.sources[0]?.url,key)
  assert.deepEqual(row.web.data.fields,i12[key].web.data.fields,key+' evidence facts/dates unchanged')
 }
 assertUnifiedTitles(sourceSurfaces(rows))
 const bad=structuredClone(rows);bad['replicate/google/gemini-3.5-flash'].web.sources[0].url+='oops';assert.throws(()=>restoreI13(bad))
})
test('R31 strict Alibaba validator rejects bad status, wrong identity, missing quote and numeric drift',()=>{
 const good=review.candidates.find(r=>r.validated)
 assert.equal(Object.keys(validatedPrimaryPages(review)).length,6)
 for(const mutate of [r=>r.pages[good.url].status=403,r=>r.pages[good.url].excerpts=[],r=>r.candidates.find(c=>c.identity===good.identity).identityQuote='other model',r=>r.candidates.find(c=>c.identity===good.identity).fields[2].value=1]){const bad=structuredClone(review);mutate(bad);assert.throws(()=>validatedPrimaryPages(bad))}
 assert.equal(review.pages[review.bonsai.url].status,200)
 for(const quote of review.bonsai.quotes)assert.ok(review.pages[review.bonsai.url].excerpts.includes(quote))
})
test('R31 sibling rule rejects vendors, catalogs, notices, unrelated variants and other channels',()=>{
 const own='https://fal.ai/models/fal-ai/flux-2-pro/api'
 for(const old of ['https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image','https://fal.ai/models','https://huggingface.co/fal-ai/flux-2-pro','https://fal.ai/models/fal-ai/flux-2-pro-ultra/edit/api'])assert.equal(siblingEndpoint('fal',old,own),false)
 assert.equal(siblingEndpoint('fal','https://fal.ai/models/fal-ai/flux-2-pro/edit/api',own),true)
})
test('R31 acronym casing across all source titles and unseen URLs, shared Web/Mini',async()=>{
 const mini=createRequire(import.meta.url)('../apps/miniprogram/miniprogram/utils/card-presentation.js')
 for(const token of ['GGUF','AWQ','GPTQ','FP8','FP16','BF16','INT4','INT8','MLX','ONNX','API','APIs','VL','MoE','LLM','OCR','SDXL','LoRA']){
  assert.equal(sourceAcronyms(token.toLowerCase()),token)
  const url='https://huggingface.co/example/Test-27B-'+token.toLowerCase()
  assert.ok(visibleSourceTitle(url).endsWith(token),url);assert.equal(mini.visibleSourceTitle(url),visibleSourceTitle(url))
 }
 const rows=await imageInputPresentations()
 for(const surface of sourceSurfaces(rows)){assert.equal(mini.visibleSourceTitle(surface.url),visibleSourceTitle(surface.url));assert.doesNotMatch(surface.title,/\b(?:Gguf|Awq|Gptq|Fp8|Fp16|Bf16|Int4|Int8|Mlx|Onnx|Api|Apis|Vl|Moe|Llm)\b/)}
 assert.equal(visibleSourceTitle(review.bonsai.url),'官方文档 · Hugging Face · Ternary Bonsai 27B GGUF')
 assert.equal(report.casing.count,4)
})
test('R31 reports and official-page projection reproduce exactly offline',()=>{
 for(const script of ['scripts/sync-primary-links-r31.mjs','scripts/report-primary-links-r31.mjs'])execFileSync(process.execPath,[script,'--check'],{stdio:'pipe'})
})
