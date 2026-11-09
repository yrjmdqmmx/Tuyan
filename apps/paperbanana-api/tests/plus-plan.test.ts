import test from 'node:test'
import assert from 'node:assert/strict'
import {plusThinking,plusPhase} from '../src/plus-plan.js'
import {compileThinkingSelection} from '../../../packages/api/src/thinking.js'
import {PLUS_PRESETS,PLUS_PRESET_VERSION,type PlusMode} from '../../../packages/api/src/plus.mjs'
import {memoryDb} from '../../../test-support/memory-db.mjs'
import {createProviderWorkflow} from '../src/provider-workflow.js'
import {createTokenDanceService} from '../src/tokendance-service.js'
const snapshot=(mode:PlusMode,role:'main'|'vision'='main')=>compileThinkingSelection({provider:'bailian',modelId:PLUS_PRESETS[mode].mainModel,protocol:'bailian-openai-chat',options:{mode:true,budget:1024}},role)
const body=(mode:PlusMode,outputFormat='svg')=>({outputFormat,plusPreset:{version:PLUS_PRESET_VERSION,mode}})
test('Plus uses fixed stage budgets without sending reasoning_effort',()=>{
 for(const mode of ['fast','balanced','extreme']as const)for(const phase of ['material','plan','code','observation','review']as const){
   const result=plusThinking(body(mode),snapshot(mode),'main',phase)!
   assert.equal(result.wire.thinking_budget,PLUS_PRESETS[mode].svgThinkingBudgets[phase]);assert.equal(result.wire.reasoning_effort,undefined)
 }
 assert.equal(plusThinking(body('extreme','png'),snapshot('extreme'),'main','review')!.wire.thinking_budget,4096)
 assert.equal(plusThinking(body('balanced'),snapshot('balanced','vision'),'vision','review')!.wire.thinking_budget,512)
 assert.equal(plusPhase('refining'),'code')
 assert.equal(plusPhase('review'),'review');assert.equal(plusPhase('reference_analysis'),'observation')
})
test('legacy workflows remain unchanged; mismatched Plus models fail before dispatch',()=>{
 const original=snapshot('fast');assert.equal(plusThinking({},original,'main','code'),original)
 assert.throws(()=>plusThinking(body('balanced'),original,'main'),/预算快照/)
 assert.throws(()=>plusThinking({...body('fast'),plusPreset:{version:'old',mode:'fast'}},original,'main'),/预算快照/)
})
test('encrypted workflow applies actual stage budgets and persists usage with its original step identity',async()=>{
 const db=memoryDb(),service=createTokenDanceService({db:db as any,secret:Buffer.alloc(32,19).toString('base64'),fetcher:async()=>{throw Error('External calls forbidden in this test')}})
 const workflow=createProviderWorkflow({db:db as any,service})
 const task={jobId:'plus-stage-fixture',kind:'create',routeSecrets:{bailian:'fixture-not-a-key'},body:{...body('extreme'),userId:'plus-fixture-owner',thinkingSnapshot:{version:1,roles:{main:snapshot('extreme'),vision:snapshot('extreme','vision')}}}}
 await db.collection('paperbanana_jobs').insertOne({_id:task.jobId,userId:task.body.userId,providerCalls:[]});await workflow.prepare(task)
 const observed:number[]=[]
 const call=(name:string,role:'main'|'vision'='main')=>workflow.call([role==='vision'?'vision':'text','bailian',PLUS_PRESETS.extreme.mainModel,name],async()=>{observed.push(Number(workflow.thinking()?.wire.thinking_budget));await workflow.record({provider:'bailian',model:PLUS_PRESETS.extreme.mainModel,requestId:name,usage:{prompt_tokens:10,completion_tokens:20}});return name},role)
 await workflow.run(task,async()=>{
   await workflow.call(['materials','read'],()=>call('material'))
   await workflow.stage('rendering',()=>call('code'))
   await workflow.stage('review',()=>call('observation','vision'))
   await workflow.stage('review',()=>call('review'))
 })
 assert.deepEqual(observed,[1024,8192,1024,2048])
 const saved=await db.collection('paperbanana_jobs').findOne({_id:task.jobId});assert.equal(saved.providerCalls.length,4);assert.ok(saved.providerCalls.every((c:any)=>c.workflowStepId&&c.thinking))
})

test('PNG refinement uses fixed PNG budgets after execution normalization drops outputFormat',()=>{
 for(const mode of ['fast','balanced','extreme'] as const)for(const role of ['main','vision'] as const){
  const normalized={action:'refineImage',plusPreset:{version:PLUS_PRESET_VERSION,mode}}
  assert.equal(plusThinking(normalized,snapshot(mode,role),role,'review')!.wire.thinking_budget,PLUS_PRESETS[mode].pngThinkingBudget)
 }
})
