import test from 'node:test'
import assert from 'node:assert/strict'
import {boundedPlusTransport,createPlusBudget} from '../src/plus-budget.js'
import {memoryDb} from '../../../test-support/memory-db.mjs'
import {fixturePlusPricing as pricing} from '../../../test-support/plus-fixture.mjs'
const url='https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const body=(maxCostMicros=100000)=>({userId:'fixture-owner',plusPreset:{mode:'fast'},plusBilling:{operationKey:'fixture-op',maxCostMicros,pricingVersion:pricing.version,tariff:pricing.tariff,limits:pricing.transportLimits}})
const init=()=>({method:'POST',body:JSON.stringify({model:'qwen3.8-flash',messages:[{role:'user',content:'fixture'}],thinking_budget:1024,max_tokens:99999})})
test('budget checks final wire model, endpoint, image count and output cap before dispatch',()=>{
 const guarded=boundedPlusTransport(url,init(),body());assert.equal(JSON.parse(String(guarded.init.body)).max_tokens,16384)
 assert.throws(()=>boundedPlusTransport(url,{...init(),body:JSON.stringify({model:'qwen3.8-flash',messages:[]})},body()),/思考/);
 for(const endpoint of ['https://other.invalid/compatible-mode/v1/chat/completions','https://dashscope.aliyuncs.com/unknown'])assert.throws(()=>boundedPlusTransport(endpoint,init(),body()))
 assert.throws(()=>boundedPlusTransport(url,{...init(),body:JSON.stringify({model:'foreign-model',messages:[]})},body()))
 assert.throws(()=>boundedPlusTransport(url,init(),body(1)),/预算/)
 assert.throws(()=>boundedPlusTransport(url,{...init(),body:JSON.stringify({model:'qwen3.8-flash',messages:[{role:'user',content:'X'.repeat(9000)}]})},body()),/材料/)
})
test('durable transport claims never repeat and unknown receipts prevent zero-cost settlement',async()=>{
 const db=memoryDb(),budget=createPlusBudget(db as any),task={jobId:'fixture-job',body:body()};await budget.indexes();await budget.prepare(task)
 const results=await Promise.allSettled(['step-a','step-b','step-c','step-d'].map(step=>budget.claim(task,step,url,init())))
 assert.equal(results.filter(r=>r.status==='fulfilled').length,2)
 assert.equal((await budget.summary(task.jobId,task.body.userId))?.complete,false)
 await assert.rejects(budget.claim(task,'step-a',url,init()),/不会再次/)
 for(const step of ['step-a','step-b'])await budget.record(task,step,{provider:'bailian',model:'qwen3.8-flash',requestId:step,usage:{prompt_tokens:100,prompt_tokens_details:{cached_tokens:0},completion_tokens:20}})
 const after=await budget.summary(task.jobId,task.body.userId);assert.equal(after?.complete,true);assert.equal(after?.calls.length,2)
 assert.equal(await budget.find('other-user','fixture-op'),null)
 await assert.rejects(budget.prepare({...task,body:body(200000)}))
})
test('Qwen image transport fixes candidate internals but preserves requested valid resolution',()=>{
 const imageUrl='https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
 const result=boundedPlusTransport(imageUrl,{method:'POST',body:JSON.stringify({model:'qwen-image-3.0-pro',input:{messages:[{content:[{text:'fixture'}]}]},parameters:{size:'2048*2048',n:4,seed:123}})},body(200000));
 assert.deepEqual(JSON.parse(String(result.init.body)).parameters,{size:'2048*2048',n:1,watermark:false,prompt_extend:true,prompt_extend_mode:'direct',enable_thinking:true});
})

test('confirmed receipts release only unused bounds once; uncertain calls keep their reservation',async()=>{
 const db=memoryDb(),budget=createPlusBudget(db as any),task={jobId:'receipt-job',body:body(100000)};await budget.prepare(task);
 await budget.claim(task,'first',url,init());const upper=(await db.collection('paperbanana_plus_budgets').findOne({_id:task.jobId})).committedMicros;
 const receipt={provider:'bailian',model:'qwen3.8-flash',requestId:'r-first',usage:{prompt_tokens:100,prompt_tokens_details:{cached_tokens:0},completion_tokens:20}};
 await Promise.all(Array.from({length:12},()=>budget.record(task,'first',receipt)));
 assert.equal((await db.collection('paperbanana_plus_budgets').findOne({_id:task.jobId})).committedMicros,140);
 await budget.claim(task,'second',url,init());assert.equal((await db.collection('paperbanana_plus_budgets').findOne({_id:task.jobId})).committedMicros,upper+140);
 await budget.notSent(task,'second');await budget.notSent(task,'second');assert.equal((await db.collection('paperbanana_plus_budgets').findOne({_id:task.jobId})).committedMicros,140);
 await assert.rejects(budget.record(task,'first',{...receipt,usage:{...receipt.usage,completion_tokens:21}}),/不一致/);
 await assert.rejects(budget.claim(task,'third',url,init()),/待核对/);assert.equal((await budget.summary(task.jobId,task.body.userId))?.complete,false);
});
test('persisted usage recovers a crash before budget settlement without replaying the provider',async()=>{
 const db=memoryDb(),budget=createPlusBudget(db as any),task={jobId:'crash-job',body:body(50000)};await budget.prepare(task);await budget.claim(task,'first',url,init());
 await db.collection('paperbanana_plus_calls').updateOne({_id:'first'},{$set:{state:'reported',receipt:{provider:'bailian',model:'qwen3.8-flash',requestId:'r-crash',usage:{prompt_tokens:100,prompt_tokens_details:{cached_tokens:0},completion_tokens:20},workflowStepId:'first'}}});
 await budget.claim(task,'after-crash',url,init());const upper=boundedPlusTransport(url,init(),task.body).upperMicros;
 assert.equal((await db.collection('paperbanana_plus_budgets').findOne({_id:task.jobId})).committedMicros,upper+140);
});
test('persisted no-transport release recovers after a crash and never releases twice',async()=>{
 const db=memoryDb(),budget=createPlusBudget(db as any),task={jobId:'not-sent-crash',body:body(50000)};await budget.prepare(task);await budget.claim(task,'first',url,init());
 await db.collection('paperbanana_plus_calls').updateOne({_id:'first'},{$set:{state:'not_sent',reason:'stopped_before_transport'}});
 await budget.claim(task,'next',url,init());await budget.notSent(task,'first');
 assert.equal((await db.collection('paperbanana_plus_budgets').findOne({_id:task.jobId})).committedMicros,boundedPlusTransport(url,init(),task.body).upperMicros);
});
test('usage exceeding the claimed upper bound halts future calls and stays unsettled',async()=>{
 const db=memoryDb(),budget=createPlusBudget(db as any),task={jobId:'overrun-job',body:body(100000)};await budget.prepare(task);await budget.claim(task,'first',url,init());
 await assert.rejects(budget.record(task,'first',{provider:'bailian',model:'qwen3.8-flash',requestId:'overrun',usage:{prompt_tokens:100000,completion_tokens:20000,prompt_tokens_details:{cached_tokens:0}}}),/超过预留/);
 await assert.rejects(budget.claim(task,'next',url,init()),/待核对/);assert.equal((await budget.summary(task.jobId,task.body.userId))?.complete,false);
});

test('visible output can be smaller than thinking budget; the cost bound includes both',()=>{
 const result=boundedPlusTransport(url,{...init(),body:JSON.stringify({model:'qwen3.8-flash',messages:[],thinking_budget:1024,max_tokens:512})},body());
 const wire=JSON.parse(String(result.init.body));assert.equal(wire.max_tokens,512);assert.equal(wire.thinking_budget,1024);
 // Fixture output tariff is 2 micro-CNY/token; empty messages cost 4 bytes.
 assert.equal(result.upperMicros,4+2*(512+1024));
});
