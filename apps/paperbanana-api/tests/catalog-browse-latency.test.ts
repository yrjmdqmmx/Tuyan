import test from 'node:test'
import assert from 'node:assert/strict'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

test('homepage catalog returns while schema pagination is pending; explicit refresh shares and awaits it',async()=>{
  const r:any=await createRefineRuntime()
  let release!:()=>void, calls=0
  const gate=new Promise<void>(resolve=>{release=resolve})
  try {
    r.legacy.configureRuntimeFetch(async(input:any)=>{
      const url=new URL(String(input))
      if(url.hostname==='api.fal.ai'){
        calls++
        if(!url.searchParams.has('endpoint_id'))await gate
        return Response.json({models:(url.searchParams.has('endpoint_id')?url.searchParams.getAll('endpoint_id'):['fal-ai/fixture']).map(endpoint_id=>({endpoint_id})),has_more:false})
      }
      return Response.json({data:[]})
    })
    const started=Date.now(),all=await r.legacy.modelRegistry({})
    assert.ok(Date.now()-started<5000,'slow catalog must not block the homepage')
    assert.equal(all.catalogHealth.fal.state,'partial')
    assert.match(all.catalogHealth.fal.message,/后台更新/)
    assert.equal(calls,1)
    let done=false
    const explicit=r.legacy.modelRegistry({provider:'fal'}).then((value:any)=>{done=true;return value})
    await new Promise(resolve=>setTimeout(resolve,20))
    assert.equal(done,false)
    assert.equal(calls,1,'no duplicate pagination request')
    release()
    assert.equal((await explicit).catalogHealth.fal.state,'ready')
  }finally{release();await r.close()}
})

test('background catalog browsing preserves retired selections and inference waits for its full guard',async()=>{
  const r:any=await createRefineRuntime()
  let slow=false, release!:()=>void, inference=0
  const gate=new Promise<void>(resolve=>{release=resolve})
  try {
    r.legacy.configureRuntimeFetch(async(input:any,init:any)=>{
      if(String(input)==='https://runware.ai/docs/models/index.json'){
        if(slow)await gate
        return Response.json([{id:'current'}])
      }
      if(init?.method==='POST'){inference++;throw new Error('inference forbidden')}
      return Response.json({data:[]})
    })
    const selected=(result:any)=>result.providers.runware.models.find((m:any)=>m.id==='anthropic:claude@fable-5')
    assert.equal(selected(await r.legacy.modelRegistry({provider:'runware'})).selectable,false)
    slow=true
    const refresh=r.legacy.modelRegistry({provider:'runware',refreshCatalog:true})
    await new Promise(resolve=>setTimeout(resolve,0))
    const all=await r.legacy.modelRegistry({})
    assert.equal(all.catalogHealth.runware.state,'partial')
    assert.equal(selected(all).selectable,false,'last complete retirement remains enforced')
    let done=false
    const blocked=r.legacy.callTextModel('runware','anthropic:claude@fable-5','fixture','system','prompt').then(
      ()=>{throw new Error('retired model must not run')},(error:any)=>{done=true;assert.equal(error.requestState,'not_sent')})
    await new Promise(resolve=>setTimeout(resolve,20))
    assert.equal(done,false,'inference cannot reuse the nonblocking browse result')
    release();await refresh;await blocked
    assert.equal(inference,0)
  }finally{release();await r.close()}
})
