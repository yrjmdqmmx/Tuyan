import test from 'node:test'
import assert from 'node:assert/strict'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

test('public delisting blocks saved routes before inference, survives refresh errors and can recover',async()=>{
 const r:any=await createRefineRuntime();let mode='missing',inference=0
 try {
  r.legacy.configureRuntimeFetch(async(input:any)=>{
   if(String(input)==='https://runware.ai/docs/models/index.json'){
    if(mode==='error')throw new Error('fixture unavailable')
    return Response.json([{id:'current'},...(mode==='restored'?[{id:'anthropic:claude@fable-5'}]:[])])
   }
   inference++;throw new Error('inference must not be sent')
  })
  const selected=(result:any)=>result.providers.runware.models.find((m:any)=>m.id==='anthropic:claude@fable-5')
  assert.equal(selected(await r.legacy.modelRegistry({provider:'runware'})).selectable,false)
  await assert.rejects(r.legacy.callTextModel('runware','anthropic:claude@fable-5','fixture','system','prompt'),(e:any)=>e.requestState==='not_sent'&&/完整公开目录/.test(e.message))
  mode='error'
  assert.equal(selected(await r.legacy.modelRegistry({provider:'runware',refreshCatalog:true})).selectable,false)
  assert.equal(inference,0)
  mode='restored'
  assert.equal(selected(await r.legacy.modelRegistry({provider:'runware',refreshCatalog:true})).selectable,true)
 }finally{await r.close()}
})

test('OpenAI shutdown metadata is account-scoped and announced future retirements stay selectable until cutoff',async()=>{
 const r:any=await createRefineRuntime(),now=Date.now
 try {
  r.legacy.configureRuntimeFetch(async(input:any)=>{
   assert.equal(String(input),'https://api.openai.com/v1/models')
   return Response.json({data:[{id:'gpt-6-sol',shutdown_date:'2026-10-01'}]})
  })
  const account=await r.legacy.readAccountModelCatalog({provider:'openai',apiKeys:{openai:'fixture'}})
  assert.equal(account.providerRegistry.models.find((m:any)=>m.id==='gpt-6-sol').selectable,false)
  assert.equal((await r.legacy.modelRegistry({provider:'openai'})).providers.openai.models.find((m:any)=>m.id==='gpt-6-sol').selectable,true)
  const id='gpt-4o-2024-11-20',cutoff=Date.parse('2027-01-14T00:00:00Z')
  Date.now=()=>cutoff-1
  assert.equal((await r.legacy.modelRegistry({provider:'openai'})).providers.openai.models.find((m:any)=>m.id===id).selectable,true)
  Date.now=()=>cutoff
  assert.equal((await r.legacy.modelRegistry({provider:'openai'})).providers.openai.models.find((m:any)=>m.id===id).selectable,false)
 }finally{Date.now=now;await r.close()}
})
