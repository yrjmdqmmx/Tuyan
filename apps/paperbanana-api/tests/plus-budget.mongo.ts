import test from 'node:test'
import assert from 'node:assert/strict'
import {MongoClient} from 'mongodb'
import {randomUUID} from 'node:crypto'
import {createPlusBudget,boundedPlusTransport} from '../src/plus-budget.js'
import {fixturePlusPricing as pricing} from '../../../test-support/plus-fixture.mjs'
const uri=process.env.PLUS_TEST_MONGO_URI
if(!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri||''))throw Error('Explicit isolated loopback Mongo is required')
const client=new MongoClient(uri!),database='tuyan_plus_core_budget_'+randomUUID().replaceAll('-','')
const url='https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const init={method:'POST',body:JSON.stringify({model:'qwen3.8-flash',messages:[{role:'user',content:'synthetic'}],thinking_budget:1024})}
test('real Mongo: concurrent confirmed receipt replay frees capacity once; unknown claims remain bounded',async()=>{
 await client.connect();const db=client.db(database),budget=createPlusBudget(db)
 try{
  await budget.indexes();const body={userId:'synthetic-owner',plusPreset:{mode:'fast'},plusBilling:{operationKey:'synthetic-op',maxCostMicros:100000,pricingVersion:pricing.version,tariff:pricing.tariff,limits:pricing.transportLimits}},task={jobId:'synthetic-job',body};
  await budget.prepare(task);await budget.claim(task,'first',url,init)
  const receipt={provider:'bailian',model:'qwen3.8-flash',requestId:'synthetic-receipt',usage:{prompt_tokens:100,completion_tokens:20,prompt_tokens_details:{cached_tokens:0}}}
  await Promise.all(Array.from({length:40},()=>budget.record(task,'first',receipt)))
  assert.equal((await db.collection<any>('paperbanana_plus_budgets').findOne({_id:task.jobId}))?.committedMicros,140)
  const claimed=await Promise.allSettled(Array.from({length:16},(_,i)=>budget.claim(task,'pending-'+i,url,init)))
  assert.equal(claimed.filter(r=>r.status==='fulfilled').length,2)
  const upper=boundedPlusTransport(url,init,body).upperMicros
  assert.equal((await db.collection<any>('paperbanana_plus_budgets').findOne({_id:task.jobId}))?.committedMicros,140+2*upper)
  assert.equal((await budget.summary(task.jobId,body.userId))?.complete,false)
  await assert.rejects(budget.record(task,'first',{...receipt,usage:{...receipt.usage,completion_tokens:21}}),/不一致/)
  await assert.rejects(budget.claim(task,'blocked',url,init),/待核对/)
 }finally{await db.dropDatabase();await client.close()}
})
