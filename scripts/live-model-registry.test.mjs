import assert from 'node:assert/strict'
import test from 'node:test'
import { createLiveModelRegistry } from './lib/live-model-registry.mjs'

test('live catalogue uses Core normalization and only reads public GET metadata', async () => {
  const calls = []
  const read = await createLiveModelRegistry({ fetcher: async (url, init) => {
    calls.push({ url, init })
    if (url.endsWith('/images/models')) return Response.json({ data: [] })
    assert.equal(url, 'https://openrouter.ai/api/v1/models')
    return Response.json({ data: [{ id: 'openai/live-only-model', name: 'Live only model', context_length: 123456,
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] }, supported_parameters: [] }] })
  } })
  const result = await read('openrouter')
  const model = result.providers.openrouter.models.find(model => model.id === 'openai/live-only-model')
  assert.ok(model)
  assert.deepEqual(model.roles, ['main', 'vision'])
  assert.equal(model.specifications.contextWindowTokens, 123456)
  assert.equal(model.selectable, true)
  assert.equal(calls.length, 2)
  for (const { init } of calls) {
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error')
    assert.deepEqual(init.headers, { Accept: 'application/json' })
  }
  await read('openrouter')
  assert.equal(calls.length, 2, 'Core TTL cache avoids repeatedly fetching the catalogue')
})

test('provider outage is reported rather than filled with a static OpenRouter fallback', async () => {
  const read = await createLiveModelRegistry({ fetcher: async () => { throw new Error('offline') } })
  const result = await read('openrouter')
  assert.equal(result.providers.openrouter, undefined)
  assert.match(result.unavailableProviders.openrouter, /temporarily unavailable/)
})


test('public checkpoint resumes all pages, keeps permissions closed, and never restores account catalogs', async () => {
  const fetchedAt = new Date(Date.now()-120000).toISOString()
  const row = {id:'checkpoint-only',label:'Checkpoint model',roles:['main'],selectable:true,catalogAliases:['checkpoint-only'],specifications:{officialInputModalities:['text'],officialOutputModalities:['image']}}
  const calls=[], exactCalls=[]
  const read = await createLiveModelRegistry({ publicCheckpoint:{fal:{state:'partial',pages:1,fetchedAt,models:[row],sourceUrls:[],message:'',continuation:{cursor:'next',page:2,offset:1}},openai:{state:'ready',pages:1,fetchedAt,models:[row],sourceUrls:[],message:''}},fetcher:async url=>{
    if(new URL(url).searchParams.has('endpoint_id')){exactCalls.push(url);return Response.json({models:[],has_more:false})}
    calls.push(url);assert.equal(new URL(url).searchParams.get('cursor'),'next')
    return Response.json({models:[{endpoint_id:'final-model',metadata:{category:'text-to-image'}}]})
  }})
  const value=await read('fal');const models=value.providers.fal.models
  assert.equal(value.catalogHealth.fal.state,'ready');assert.equal(value.catalogHealth.fal.modelCount,2)
  assert.equal(models.find(m=>m.id==='checkpoint-only').selectable,false)
  assert.deepEqual(models.find(m=>m.id==='checkpoint-only').roles,[])
  assert.equal((await read.checkpoint()).openai,undefined);assert.equal(calls.length,1)
  assert.ok(exactCalls.length>0, 'completed browse verifies missing known IDs before becoming ready')
})

test('forced public refresh respects upstream Retry-After', async () => {
  let calls=0
  const read=await createLiveModelRegistry({fetcher:async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'300'}})}})
  await read('fal');await read('fal',{refresh:true})
  assert.equal(calls,1)
})

test('exact-ID verification rate limits also survive forced refresh',async()=>{
  let calls=0
  const read=await createLiveModelRegistry({fetcher:async url=>{
    calls++
    return new URL(url).searchParams.has('endpoint_id')
      ? new Response('',{status:429,headers:{'retry-after':'300'}})
      : Response.json({models:[{endpoint_id:'new-only'}],has_more:false})
  }})
  const first=await read('fal')
  assert.equal(first.catalogHealth.fal.state,'partial');assert.equal(first.catalogHealth.fal.retryAfterSeconds,300)
  await read('fal',{refresh:true});assert.equal(calls,2)
})

test('a partial refresh retains the last complete public directory until every new page completes',async()=>{
 const row={id:'prior-only',catalogAliases:['prior-only'],specifications:{contextWindowTokens:42}}
 let calls=0
 const read=await createLiveModelRegistry({publicCheckpoint:{fal:{state:'ready',fetchedAt:new Date().toISOString(),pages:1,models:[row],sourceUrls:[],message:''}},fetcher:async url=>{
   if(new URL(url).searchParams.has('endpoint_id'))return Response.json({models:[],has_more:false})
   calls++;if(calls===1)return Response.json({models:[{endpoint_id:'new-only',metadata:{category:'text-to-image'}}],next_cursor:'two'})
   if(calls===2)throw new Error('temporary network error')
   return Response.json({models:[{endpoint_id:'last-only',metadata:{category:'text-to-image'}}]})
 }})
 const partial=await read('fal',{refresh:true});assert.equal(partial.catalogHealth.fal.state,'partial');assert.ok(partial.providers.fal.models.find(m=>m.id==='prior-only'))
 assert.equal(partial.catalogHealth.fal.previousModelCount,1);assert.equal(partial.catalogHealth.fal.previousModels,undefined)
 const complete=await read('fal',{refresh:true});assert.equal(complete.catalogHealth.fal.state,'ready');assert.equal(complete.providers.fal.models.find(m=>m.id==='prior-only'),undefined)
 assert.ok(complete.providers.fal.models.find(m=>m.id==='new-only'))
})
