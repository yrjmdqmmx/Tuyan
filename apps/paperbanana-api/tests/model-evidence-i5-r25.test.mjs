import test from'node:test'
import assert from'node:assert/strict'
import{phase2Registry}from'../../../test-support/phase2-modality.mjs'
test('R25 I5 Core live projections keep independent spec fields and the verified Bailian retirement source',async()=>{
 const registry=await phase2Registry()
 for(const id of ['qwen3.5-plus','qwen3.5-plus-2026-02-15','qwen3.5-plus-2026-04-20']){
  const c=registry.providers.bailian.models.find(m=>m.id===id).cardSpecifications
  assert.equal(c.lifecycleSourceUrl,'https://www.aliyun.com/notice/118728')
  assert.deepEqual(c.retirementSources,['https://www.aliyun.com/notice/118728'])
  assert.equal(c.sourceUrl,'https://help.aliyun.com/zh/model-studio/qwen3-5-plus')
  for(const f of Object.values(c.fields))assert.equal(f.sourceUrl,c.sourceUrl)
  assert.ok(!c.excludedSources.includes(c.lifecycleSourceUrl))
 }
})
