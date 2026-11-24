import test from 'node:test'
import assert from 'node:assert/strict'
import {phase2Registry} from '../../../test-support/phase2-modality.mjs'
import {assertQwenEvidence,retirementUrl,rejectedUrl} from '../../../test-support/evidence-i4-r24.mjs'
test('R24 I4 Core emits separate dated vendor specification and channel retirement evidence',async()=>{
 const registry=await phase2Registry(),card=registry.providers.tokendance.models.find(m=>m.id==='qwen3.5-plus').cardSpecifications
 assertQwenEvidence(card)
 assert.deepEqual(card.retirementSources.toSorted(), [retirementUrl, 'https://tokendance.space/docs/changelog.md'].toSorted())
 assert.ok(!card.vendorSources.includes(rejectedUrl))
 assert.equal(registry.providers.qianfan.models.some(m=>m.id==='qwen-image-edit'),false)
 for(const field of ['totalContextTokens','maxOutputTokens']){
  const fact=registry.providers.siliconflow.models.find(m=>m.id==='Qwen/Qwen-Image-Edit').cardSpecifications.fields[field]
  assert.deepEqual([fact.value,fact.state,fact.sourceUrl],[null,'unknown',null])
 }
})
