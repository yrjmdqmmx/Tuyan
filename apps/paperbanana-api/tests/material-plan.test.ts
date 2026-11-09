import test from 'node:test'
import assert from 'node:assert/strict'
import {parseMaterialPlan} from '../src/material-plan.js'
import {isLocalInputFailure,publicExecutionFailure} from '../../../packages/api/src/execution-errors.js'
test('accepts full structured plan losslessly, preserving nested values and sources',()=>{
 const plan={layout:{nodes:['Input','Check','Output'],values:{Alpha:35,Beta:12}},source:{file:'中文材料.pptx',page:2},notes:['unit: samples']}
 assert.deepEqual(JSON.parse(parseMaterialPlan(JSON.stringify({status:'ready',missingInputs:[],plan}))),plan)
 assert.equal(parseMaterialPlan('{"status":"ready","missingInputs":[],"plan":"完整方案"}'),'完整方案')
})
test('known invalid or needs-input responses stop locally with prior-call billing and no unknown request',()=>{
 for(const value of ['bad JSON',JSON.stringify({status:'ready',missingInputs:[],plan:{}}),JSON.stringify({status:'needs_input',missingInputs:['units'],plan:''})]){
  assert.throws(()=>parseMaterialPlan(value),(e:any)=>{assert.ok(isLocalInputFailure(e));const f=publicExecutionFailure(e);assert.equal(f.requestState,'not_sent');assert.equal(f.billingStatus,'prior_calls');assert.equal(f.stage,'planning');assert.notEqual(f.code,'MODEL_PROVIDER');return true})
 }
})

test('new styling contract preserves full nested plans and rejects missing-input, malformed and no-op outputs before rendering',()=>{
 const plan={labels:['A','B'],values:[35,12],style:{fill:'#123456'}}
 assert.deepEqual(JSON.parse(parseMaterialPlan(JSON.stringify({status:'ready',missingInputs:[],plan}),'styling')),plan)
 for(const raw of ['A nice picture','No changes needed.',JSON.stringify({status:'needs_input',missingInputs:['units'],plan:''}),JSON.stringify({status:'ready',missingInputs:['scale'],plan:'Incomplete'}),JSON.stringify({status:'ready',missingInputs:[],plan:''}),JSON.stringify({status:'ready',missingInputs:[],plan:'No changes needed.'})]){
  assert.throws(()=>parseMaterialPlan(raw,'styling'),(error:any)=>{const failure=publicExecutionFailure(error);assert.equal(failure.stage,'styling');assert.equal(failure.requestState,'not_sent');assert.equal(failure.billingStatus,'prior_calls');return true})
 }
})
