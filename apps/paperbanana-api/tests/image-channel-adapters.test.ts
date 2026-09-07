import assert from 'node:assert/strict'
import test from 'node:test'
import { callExtendedImageChannel, type ImageChannelInput, type ImageChannelTransport } from '../../../packages/api/src/image-channel-adapters.js'
const png='fixture-image-bytes'
const source={base64:'c291cmNl',mimeType:'image/png',dataUrl:'data:image/png;base64,c291cmNl'}
const defaults:ImageChannelInput={provider:'bfl',model:'flux-2-pro',apiKey:'fixture-secret',prompt:'scientific diagram',aspectRatio:'16:9',resolution:'1K',size:{width:1280,height:720,size:'1280x720'}}
function fixture(respond:(url:string,init:RequestInit)=>Response) {
  const calls:Array<{url:string;init:RequestInit;attempts:number}>=[]
  let now=0
  const io:ImageChannelTransport={
    request:async(url,init,_label,attempts)=>{calls.push({url,init,attempts});return respond(url,init)},
    json:async(response)=>{if(!response.ok) throw new Error(`HTTP ${response.status}`);return response.json()},
    download:async(url)=>{calls.push({url,init:{},attempts:1});return png},
    publicSource:async()=> 'https://owned.invalid/source.png',
    validate:(value)=>{assert.ok(value);return value},
    sleep:async(ms)=>{now+=ms},now:()=>now,pollIntervalMs:5,pollTimeoutMs:20,
  }
  return {calls,io}
}

test('native JSON/multipart channels send exact fields and keep asset downloads credential-free', async()=>{
  for(const provider of ['ideogram','stability','minimax','together']) for(const editing of [false,true]) {
    if(provider==='minimax'&&editing)continue
    const model=provider==='ideogram'?'ideogram-v4':provider==='stability'?'stable-image-ultra':provider==='minimax'?'image-01':'black-forest-labs/FLUX.2-pro'
    const {io,calls}=fixture(()=>Response.json(provider==='stability'?{image:png,finish_reason:'SUCCESS'}:provider==='minimax'?{base_resp:{status_code:0},data:{image_base64:[png]}}:{data:[{url:'https://asset.invalid/output.png',is_image_safe:true}]}))
    assert.equal(await callExtendedImageChannel({...defaults,provider,model,source:editing?source:null},io),png)
    assert.equal(calls[0].attempts,1)
    const headers=new Headers(calls[0].init.headers)
    assert.equal(headers.get(provider==='ideogram'?'Api-Key':'Authorization'),provider==='ideogram'?'fixture-secret':'Bearer fixture-secret')
    if(provider==='ideogram'||provider==='stability') {
      const body=calls[0].init.body as FormData
      assert.equal(body.has('image'),editing)
      assert.equal(body.has('model'),false)
      assert.equal(headers.has('Content-Type'),false,'HTTP client must supply multipart boundary')
      if(provider==='ideogram'){assert.equal(body.get('resolution'),'1280x720');assert.equal(body.get('text_prompt'),defaults.prompt)}
      else {assert.equal(body.get('aspect_ratio'),'16:9');if(editing)assert.equal(body.get('strength'),'0.65')}
    } else {
      const body=JSON.parse(String(calls[0].init.body));assert.equal(body.width,1280);assert.equal(body.height,720)
      assert.equal(body.model,model);assert.equal('aspect_ratio' in body,false)
      if(editing)assert.deepEqual(body.reference_images,['https://owned.invalid/source.png'])
    }
    for(const call of calls.slice(1))assert.equal(new Headers(call.init.headers).has('Authorization'),false)
  }
})

test('async channels submit once, poll the returned URL, and encode distinct edit fields',async()=>{
 for(const provider of ['bfl','fal','replicate']) for(const editing of [false,true]) {
  let polls=0
  const host=provider==='bfl'?'https://api.us1.bfl.ai/v1/get_result?id=fixture':provider==='fal'?'https://queue.fal.run/fal-ai/flux-2-pro/requests/fixture/status':'https://api.replicate.com/v1/predictions/fixture'
  const {io,calls}=fixture((url,init)=>{
    if(init.method==='POST')return Response.json(provider==='bfl'?{id:'fixture',polling_url:host}:provider==='fal'?{status:'IN_QUEUE',request_id:'fixture',status_url:host,response_url:'https://queue.fal.run/fal-ai/flux-2-pro/requests/fixture'}:{status:'starting',urls:{get:host}})
    if(url.endsWith('/requests/fixture'))return Response.json({images:[{url:'https://asset.invalid/output.png'}]})
    polls++
    return Response.json(provider==='bfl'?{status:polls===1?'Pending':'Ready',result:{sample:'https://asset.invalid/output.png'}}:provider==='fal'?{status:polls===1?'IN_PROGRESS':'COMPLETED'}:{status:polls===1?'processing':'succeeded',output:'https://asset.invalid/output.png'})
  })
  const model=provider==='bfl'?'flux-2-pro':provider==='fal'?'fal-ai/flux-2-pro':'black-forest-labs/flux-2-pro'
  assert.equal(await callExtendedImageChannel({...defaults,provider,model,source:editing?source:null},io),png)
  assert.equal(calls.filter(c=>c.init.method==='POST').length,1)
  assert.equal(calls[0].attempts,1)
  assert.equal(calls[1].url,host)
  const body=JSON.parse(String(calls[0].init.body))
  if(provider==='bfl'){assert.equal(body.input_image,editing?source.base64:undefined);assert.equal(new Headers(calls[1].init.headers).get('x-key'),'fixture-secret')}
  if(provider==='fal'){assert.deepEqual(body.image_size,{width:1280,height:720});assert.equal(calls[0].url.endsWith('/edit'),editing);assert.deepEqual(body.image_urls,editing?[source.dataUrl]:undefined)}
  if(provider==='replicate'){assert.equal(body.input.aspect_ratio,'custom');assert.equal(body.input.resolution,undefined);assert.deepEqual(body.input.input_images,editing?[source.dataUrl]:undefined)}
  assert.deepEqual(calls.at(-1)?.init,{})
 }
})

test('fal accepts task-ID-only acknowledgements and polls the app root for generation and editing',async()=>{
 for(const model of ['fal-ai/flux-2-pro','fal-ai/flux/dev']) for(const editing of [false,true]) {
  if(model==='fal-ai/flux/dev'&&editing)continue
  const requestId='764cabcf-1234_5678'
  const resultUrl='https://queue.fal.run/'+model.split('/').slice(0,2).join('/')+'/requests/'+requestId
  const {io,calls}=fixture((url,init)=>{
    if(init.method==='POST')return Response.json({request_id:requestId})
    if(url===resultUrl+'/status')return Response.json({status:'COMPLETED'})
    assert.equal(url,resultUrl)
    return Response.json({images:[{url:'https://asset.invalid/output.png'}]})
  })
  assert.equal(await callExtendedImageChannel({...defaults,provider:'fal',model,size:{...defaults.size,size:'16:9'},source:editing?source:null},io),png)
  assert.equal(calls.filter(c=>c.init.method==='POST').length,1)
  assert.deepEqual(calls.slice(1,3).map(c=>c.url),[resultUrl+'/status',resultUrl])
 }
 for(const request_id of [undefined,'','../other','x?key=secret','x#status','a'.repeat(201)]) {
  const {io,calls}=fixture(()=>Response.json({request_id}))
  await assert.rejects(callExtendedImageChannel({...defaults,provider:'fal',model:'fal-ai/flux-2-pro'},io),/invalid task ID/)
  assert.equal(calls.length,1)
 }
 const invalid=fixture(()=>Response.json({request_id:'fixture',status_url:'https://evil.invalid/status'}))
 await assert.rejects(callExtendedImageChannel({...defaults,provider:'fal',model:'fal-ai/flux-2-pro'},invalid.io),/invalid task URL/)
 assert.equal(invalid.calls.length,1)
})

function asyncFixture(provider:string, respond:(phase:'poll'|'result')=>Response) {
 const polling=provider==='bfl'?'https://api.bfl.ai/v1/get_result?id=fixture':provider==='fal'?'https://queue.fal.run/fal-ai/flux-2-pro/requests/fixture/status':'https://api.replicate.com/v1/predictions/fixture'
 const resultUrl='https://queue.fal.run/fal-ai/flux-2-pro/requests/fixture'
 return fixture((url,init)=>init.method==='POST'
   ?Response.json(provider==='bfl'?{polling_url:polling}:provider==='fal'?{request_id:'fixture'}:{status:'starting',urls:{get:polling}})
   :respond(url===resultUrl?'result':'poll'))
}
const asyncInput=(provider:string):ImageChannelInput=>({...defaults,provider,model:provider==='fal'?'fal-ai/flux-2-pro':provider==='replicate'?'black-forest-labs/flux-2-pro':'flux-2-pro'})
const completed=(provider:string)=>Response.json(provider==='bfl'?{status:'Ready',result:{sample:'https://asset.invalid/output.png'}}:provider==='fal'?{status:'COMPLETED'}:{status:'succeeded',output:'https://asset.invalid/output.png'})

test('async status and fal result HTTP failures recover within the deadline without resubmitting',async()=>{
 for(const provider of ['bfl','fal','replicate']) for(const code of [408,429,500,502,503,504]) {
  let polls=0,results=0
  const {io,calls}=asyncFixture(provider,phase=>{
    if(phase==='poll')return ++polls===1?new Response('',{status:code}):completed(provider)
    return ++results===1?new Response('',{status:code}):Response.json({images:[{url:'https://asset.invalid/output.png'}]})
  })
  assert.equal(await callExtendedImageChannel(asyncInput(provider),io),png)
  assert.equal(polls,2);assert.equal(results,provider==='fal'?2:0)
  assert.equal(calls.filter(c=>c.init.method==='POST').length,1)
  assert.equal(calls[0].attempts,1)
 }
})

test('async reads fail permanent HTTP errors immediately and bound transient errors and Retry-After',async()=>{
 for(const provider of ['bfl','fal','replicate']) for(const phase of provider==='fal'?['poll','result']:['poll']) {
  for(const code of [400,401,403,404,422]) {
   const {io,calls}=asyncFixture(provider,current=>current===phase?new Response('',{status:code}):completed(provider))
   await assert.rejects(callExtendedImageChannel(asyncInput(provider),io),new RegExp('HTTP '+code))
   assert.equal(calls.length,phase==='poll'?2:3)
  }
  for(const retryAfter of [null,'invalid','0','120','Thu, 01 Jan 1970 00:02:00 GMT']) {
   const {io,calls}=asyncFixture(provider,current=>current===phase?new Response('',{status:429,headers:retryAfter==null?{}:{'Retry-After':retryAfter}}):completed(provider))
   await assert.rejects(callExtendedImageChannel(asyncInput(provider),io),/timed out; do not submit a duplicate/)
   assert.equal(io.now(),20)
   assert.equal(calls.filter(c=>c.init.method==='POST').length,1)
   const affected=calls.filter(c=>c.init.method!=='POST'&&(phase==='poll'||!c.url.endsWith('/status')))
   assert.equal(affected.length,retryAfter==='120'||retryAfter?.startsWith('Thu')?1:3)
  }
 }
})

test('submission errors, task failures, missing results, timeout, and URL redirects never create duplicate work',async()=>{
 for(const code of [400,401,403,422,429,500,503]){
  const {io,calls}=fixture(()=>new Response('',{status:code}))
  await assert.rejects(callExtendedImageChannel(defaults,io),new RegExp(`HTTP ${code}`));assert.equal(calls.length,1);assert.equal(calls[0].attempts,1)
 }
 for(const status of ['Error','Failed','Request Moderated','Content Moderated','Task not found']){
  const {io,calls}=fixture((_url,init)=>Response.json(init.method==='POST'?{polling_url:'https://api.bfl.ai/v1/get_result?id=fixture'}:{status}))
  await assert.rejects(callExtendedImageChannel(defaults,io),new RegExp(status));assert.equal(calls.filter(c=>c.init.method==='POST').length,1)
 }
 for(const url of ['https://evil.invalid/poll','https://api.bfl.ai.evil.invalid/poll','http://api.bfl.ai/poll','https://user:pass@api.bfl.ai/poll']){
  const {io,calls}=fixture(()=>Response.json({polling_url:url}));await assert.rejects(callExtendedImageChannel(defaults,io),/invalid task URL/);assert.equal(calls.length,1)
 }
 const timeout=fixture((_u,init)=>Response.json(init.method==='POST'?{polling_url:'https://api.bfl.ai/v1/get_result?id=fixture'}:{status:'Pending'}))
 await assert.rejects(callExtendedImageChannel(defaults,timeout.io),/timed out; do not submit a duplicate/)
 assert.equal(timeout.calls.filter(c=>c.init.method==='POST').length,1)
 const missing=fixture((_u,init)=>Response.json(init.method==='POST'?{polling_url:'https://api.bfl.ai/v1/get_result?id=fixture'}:{status:'Ready'}))
 await assert.rejects(callExtendedImageChannel(defaults,missing.io),/without an image/)
 const cancelled=fixture((_u,init)=>Response.json(init.method==='POST'?{status:'starting',urls:{get:'https://api.replicate.com/v1/predictions/x'}}:{status:'canceled'}))
 await assert.rejects(callExtendedImageChannel({...defaults,provider:'replicate',model:'black-forest-labs/flux-2-pro'},cancelled.io),/canceled/)
 const failed=fixture(()=>Response.json({base_resp:{status_code:1008},data:{image_base64:[png]}}))
 await assert.rejects(callExtendedImageChannel({...defaults,provider:'minimax',model:'image-01'},failed.io),/1008/)
})

test('MiniMax binds each region to its endpoint and keeps image-01-live fixed and China-only', async()=>{
 for(const region of ['global','cn'] as const) {
  const {io,calls}=fixture(()=>Response.json({base_resp:{status_code:0},data:{image_base64:[png]}}))
  await callExtendedImageChannel({...defaults,provider:'minimax',model:'image-01',region},io)
  assert.equal(calls[0].url,`https://api.minimax.${region==='cn'?'cn':'io'}/v1/image_generation`)
  assert.equal(JSON.parse(String(calls[0].init.body)).aspect_ratio,undefined)
 }
 const {io,calls}=fixture(()=>Response.json({base_resp:{status_code:0},data:{image_base64:[png]}}))
 await callExtendedImageChannel({...defaults,provider:'minimax',model:'image-01-live',region:'cn'},io)
 const body=JSON.parse(String(calls[0].init.body));assert.equal(body.aspect_ratio,'16:9');assert.equal(body.width,undefined);assert.equal(body.height,undefined)
 await assert.rejects(callExtendedImageChannel({...defaults,provider:'minimax',model:'image-01-live',region:'global'},io),/unavailable/)
 await assert.rejects(callExtendedImageChannel({...defaults,provider:'minimax',model:'image-01',region:'invalid' as any},io),/Unsupported/)
 assert.equal(calls.length,1)
})
