import test from'node:test'
import assert from'node:assert/strict'
import{auditedModelSpecs,auditedModelLifecycle}from'../src/model-audit.js'
import{cardLifecycle}from'../../../packages/api/src/card-presentation.mjs'
test('R25 I5 Gateway exposes a verified display citation while retaining the execution notice',()=>{
 for(const id of ['qwen3.5-plus','qwen3.5-plus-2026-02-15','qwen3.5-plus-2026-04-20']){
  const audit=auditedModelSpecs('bailian',id),execution=auditedModelLifecycle('bailian',id,Date.parse('2026-11-10')),display=cardLifecycle(execution,audit)
  assert.equal(execution.sourceUrl,'https://help.aliyun.com/zh/model-studio/model-depreciation');assert.equal(execution.stopDate,'2027-01-19')
  assert.equal(display.sourceUrl,'https://www.aliyun.com/notice/118728');assert.equal(display.stopDate,execution.stopDate)
  for(const f of Object.values(audit.fields))assert.equal(f.sourceUrl,'https://help.aliyun.com/zh/model-studio/qwen3-5-plus')
 }
})
