import test from 'node:test'
import assert from 'node:assert/strict'
import{auditedModelSpecs}from'../src/model-audit.js'
import{modelCardSources,modelSourceRows}from'../../../packages/api/src/model-card-sources.mjs'
import{assertQwenEvidence,specUrl,specLabel,retirementUrl,retirementLabel,rejectedUrl}from'../../../test-support/evidence-i4-r24.mjs'
test('R24 I4 Gateway source facts and rows retain vendor date/note and the separate retirement citation',()=>{
 const audit=auditedModelSpecs('tokendance','qwen3.5-plus');assertQwenEvidence(audit)
 const c=modelCardSources({channel:'tokendance',model:{id:'qwen3.5-plus'},audit,fields:audit.fields})
 assert.deepEqual(modelSourceRows(c).slice(1),[{url:specUrl,label:specLabel},{url:retirementUrl,label:retirementLabel}]);assert.ok(!c.sources.includes(rejectedUrl))
})
