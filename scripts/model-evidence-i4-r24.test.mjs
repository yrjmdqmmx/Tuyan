import {applyEvidenceR24} from './lib/model-evidence-r24.mjs'
import data from '../config/model-audit.generated.json' with {type:'json'}
import test from'node:test'
import assert from'node:assert/strict'
import review from'../config/channel-audit/review-r24-20261110.json'with{type:'json'}
import{assertRetirementSpecEvidence}from'../test-support/evidence-i4-r24.mjs'
import{isApiSource}from'../packages/api/src/model-card-sources.mjs'
import{isMachineDocument}from'../packages/api/src/card-presentation.mjs'
test('R24 I4 evidence records 19 audited fields, preserves literal model/value quotes and rejects mismatches',()=>{
 assert.equal(review.scanBefore.cards,1064);assert.equal(review.scanBefore.matches.length,19);assert.equal(Object.keys(review.models).length,8)
 for(const model of Object.values(review.models))for(const f of Object.values(model.fields))if(f.state==='known'){
  const page=review.captures.find(c=>c.url===f.sourceUrl);assert.equal(page.httpStatus,200);assert.ok(page.excerpts.includes(f.quote));assert.ok(page.excerpts.includes(f.identityQuote))
 }
 const e=review.retirementSpecEvidence[0]
 assertRetirementSpecEvidence(e.key,e.field,{value:['text']},e.sourceUrl)
 assert.throws(()=>assertRetirementSpecEvidence(e.key,e.field,{value:65536},e.sourceUrl))
 assert.throws(()=>assertRetirementSpecEvidence('tokendance/qwen3.5-plus','maxOutputTokens',{value:65536},'https://help.aliyun.com/zh/model-studio/model-depreciation'))
})
test('R24 I4 human text exception is limited to the verified TokenDance retirement document',()=>{
 const url='https://tokendance.space/llms-full.txt'
 assert.equal(isMachineDocument(url),false);assert.equal(isApiSource(url),false)
 for(const other of ['https://tokendance.space/llms.txt','https://example.com/llms-full.txt','https://tokendance.space/portal/api/models/qwen3.5-plus'])assert.equal(isApiSource(other),true)
})

test('R24 I4 generator refuses values without matching archived excerpts',()=>{
 const broken=structuredClone(review)
 broken.models['tokendance/qwen3.5-plus'].fields.maxOutputTokens.value=131072
 assert.throws(()=>applyEvidenceR24(structuredClone(data),broken),/Invalid reviewed fact: tokendance\/qwen3.5-plus\/maxOutputTokens/)
 const missing=structuredClone(review)
 missing.captures.find(p=>p.url==='https://help.aliyun.com/zh/model-studio/qwen3-5-plus').excerpts=[]
 assert.throws(()=>applyEvidenceR24(structuredClone(data),missing),/Invalid reviewed fact/)
})
