import test from 'node:test'
import assert from 'node:assert/strict'
import {phase2Registry} from '../../../test-support/phase2-modality.mjs'
import {assertQwenEvidence,retirementUrl,rejectedUrl} from '../../../test-support/evidence-i4-r24.mjs'
test('R24 I4 Core emits separate dated vendor specification and channel retirement evidence',async()=>{
 const registry=await phase2Registry(),card=registry.providers.tokendance.models.find(m=>m.id==='qwen3.5-plus').cardSpecifications
 assertQwenEvidence(card);assert.deepEqual(card.retirementSources,[retirementUrl]);assert.ok(!card.vendorSources.includes(rejectedUrl))
 for(const[p,id]of[['qianfan','qwen-image-edit'],['siliconflow','Qwen/Qwen-Image-Edit']])for(const field of ['totalContextTokens','maxOutputTokens']){
  const fact=registry.providers[p].models.find(m=>m.id===id).cardSpecifications.fields[field]
  assert.deepEqual([fact.value,fact.state,fact.sourceUrl],[null,'unknown',null])
 }
})
