import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { refineControlsFor, refineInputIssue } from '../../../packages/api/src/refine-controls.js'

async function upload(f: Awaited<ReturnType<typeof createRefineRuntime>>, bytes=f.image, owner='refine-owner') {
  const response=await f.post({action:'prepareReferenceUpload',files:[{filename:'image.png',mimeType:'image/png',size:bytes.length}]},owner)
  assert.equal(response.data.code,0,JSON.stringify(response))
  const file=response.data.uploads[0]
  await fetch(file.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:new Uint8Array(bytes)})
  assert.equal((await f.post({action:'finalizeReferenceUpload',uploads:[file]},owner)).data.code,0)
  return file
}
function request(provider:string,model:string,source:string,inputs:any={version:1}) {
  return {action:'refineImage',provider:'openai',configurationMode:'advanced',modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-4.1'},vision:{accessProvider:'openai',modelId:'gpt-4.1'},image:{accessProvider:provider,modelId:model}},apiKeys:{[provider]:'private-fixture-key'},sourceImageUpload:{objectKey:source},editInstruction:'修改节点边框，保持所有数值与箭头关系不变。',imageSize:provider==='fal'||provider==='replicate'?'auto':'1K',aspectRatio:'auto',refineInputs:inputs}
}
const firstSubmission=(f:any,provider:string)=>f.providerCalls.find((call:any)=>call.options.method==='POST'&&call.url.includes(provider==='tokenhub'?'tokenhub.tencentmaas':provider==='runware'?'api.runware':provider==='fal'?'queue.fal':'api.replicate'))

test('model controls distinguish image slots, mask combinations, native structure and inherited dimensions',()=>{
  const bria=refineControlsFor('fal','bria/fibo-edit-1.5/edit')
  assert.equal(bria?.maxImages,4)
  const ref={objectKey:'fixture',purpose:'style'}
  assert.match(refineInputIssue(bria,{version:1,references:[ref],mask:{objectKey:'mask'}}),/不能同时/)
  assert.match(refineInputIssue(bria,{version:1},'16:9','auto'),/继承原图/)
  assert.equal(refineInputIssue(bria,{version:1,references:[ref]},'16:9','auto'),'')
  assert.match(refineInputIssue(null,{version:1,references:[ref]}),/0 张/)
  assert.match(refineInputIssue(refineControlsFor('runware','alibaba:qwen-image-edit@2511'),{version:1,references:[ref,ref,ref]}),/2 张/)
})

for (const [provider,model] of [['fal','bria/fibo-edit-1.5/edit'],['replicate','qwen/qwen-image-edit-plus'],['runware','alibaba:qwen-image-edit@2511'],['tokenhub','hy-image-v3']]) test(`${provider} sends source and auxiliary bytes to final image model and freezes metadata`,async()=>{
  const f=await createRefineRuntime({tokenDance:true})
  try {
    const source=await upload(f), ref=await upload(f,await sharp(f.image).negate().png().toBuffer())
    const submitted=await f.post(request(provider,model,source.objectKey,{version:1,references:[{objectKey:ref.objectKey,purpose:'color',note:'只参考配色'}]}))
    assert.equal(submitted.data.code,0,JSON.stringify(submitted))
    await f.post({action:'abortReferenceUpload',uploads:[source,ref]})
    await f.legacy.drainJobAdmission()
    const done=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
    assert.equal(done.status,'succeeded',JSON.stringify(done))
    assert.equal(done.refineInputMetadata.referenceCount,1)
    assert.match(done.refineInputs.references[0].objectKey,new RegExp('^'+done.id+'/'))
    const call=firstSubmission(f,provider)!, sent=JSON.parse(String(call.options.body))
    const images=provider==='runware'?sent[0].inputs.referenceImages:provider==='tokenhub'?sent.images:provider==='replicate'?sent.input.image:sent.image_urls
    assert.equal(images.length,2)
    assert.notEqual(images[0],images[1]);assert.match(JSON.stringify(sent),/只参考配色/)
    for (const [i,key] of images.entries()) {
      const bytes=Buffer.from(key.replace(/^data:[^,]+,/,''),'base64')
      assert.deepEqual(await sharp(bytes).raw().toBuffer(),await sharp(i===0?f.image:await sharp(f.image).negate().png().toBuffer()).raw().toBuffer())
    }
    assert.equal(done.providerCalls.length,1)
    assert.equal(done.providerCalls[0].invoiceCost,null)
    if (provider==='runware') assert.equal(done.providerCalls[0].reportedCost.amount,.012)
    if (provider==='tokenhub') {assert.equal(done.providerCalls[0].usage.total_tokens,4000);assert.equal(done.providerCalls[0].reportedCost,null);assert.equal(sent.revise,false)}
    assert.equal(JSON.stringify(done).includes('private-fixture-key'),false)
  } finally {await f.close()}
})

test('fal mask and structured fields are native; invalid combinations, ownership and dimensions make zero calls',async()=>{
  const f=await createRefineRuntime({tokenDance:true})
  try {
    const source=await upload(f), mask=await upload(f,await sharp({create:{width:120,height:80,channels:3,background:'#fff'}}).png().toBuffer())
    const other=await upload(f,f.image,'other-owner')
    const small=await upload(f,await sharp({create:{width:60,height:40,channels:3,background:'#fff'}}).png().toBuffer())
    const gray=await upload(f,await sharp({create:{width:120,height:80,channels:3,background:'#777'}}).png().toBuffer())
    const oversized=await upload(f,await sharp({create:{width:4100,height:100,channels:3,background:'#fff'}}).png().toBuffer())
    const base=request('fal','bria/fibo-edit-1.5/edit',source.objectKey)
    const reference={objectKey:source.objectKey,purpose:'layout'}
    for (const inputs of [{version:1,references:[reference],mask:{objectKey:mask.objectKey}},{version:1,references:[{...reference,objectKey:other.objectKey}]},{version:1,mask:{objectKey:small.objectKey}},{version:1,mask:{objectKey:gray.objectKey}},{version:1,references:[{...reference,objectKey:oversized.objectKey}]}]) {
      const rejected=await f.post({...base,refineInputs:inputs});assert.notEqual(rejected.data.code,0,JSON.stringify(rejected));assert.equal(f.providerCalls.length,0)
    }
    const structured={object:'节点 A',attributes:'蓝色边框',relationship:'与 B 的箭头连接不变',preserve:'所有数值和文字内容'}
    const submitted=await f.post({...base,refineInputs:{version:1,mask:{objectKey:mask.objectKey},structured}})
    assert.equal(submitted.data.code,0,JSON.stringify(submitted));await f.legacy.drainJobAdmission()
    const done=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
    assert.equal(done.status,'succeeded',JSON.stringify(done))
    const wire=JSON.parse(String(firstSubmission(f,'fal')!.options.body))
    assert.equal(wire.instruction,undefined)
    assert.equal(wire.structured_instruction.objects[0].shape_and_color,'蓝色边框')
    assert.match(wire.structured_instruction.context,/所有数值/)
    assert.ok(wire.mask_url);assert.equal(wire.image_urls.length,1);assert.equal(wire.aspect_ratio,undefined)
    assert.equal(done.refineInputMetadata.mask.semantics,'white-edit-black-preserve')
    assert.ok(done.providerCalls[0].structuredInstruction)
  } finally {await f.close()}
})

test('refining an owned historical image freezes its orientation-corrected pixels before applying a mask',async()=>{
  const f=await createRefineRuntime({tokenDance:true})
  try {
    const key='historical-owned/source.jpg'
    const jpeg=await sharp(f.image).jpeg().withMetadata({orientation:6}).toBuffer()
    f.objects.set(key,{bytes:jpeg,mimeType:'image/jpeg'})
    await f.db.collection('paperbanana_jobs').insertOne({_id:'historical-owned',userId:'refine-owner',status:'succeeded',provider:'openai',stages:[],resultImages:[]})
    const mask=await upload(f,await sharp({create:{width:80,height:120,channels:3,background:'#fff'}}).png().toBuffer())
    const body:any=request('fal','bria/fibo-edit-1.5/edit','',{version:1,mask:{objectKey:mask.objectKey}})
    delete body.sourceImageUpload;body.sourceImageObjectKey=key
    const submitted=await f.post(body)
    assert.equal(submitted.data.code,0,JSON.stringify(submitted));await f.legacy.drainJobAdmission()
    const done=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
    assert.equal(done.status,'succeeded',JSON.stringify(done))
    const sent=JSON.parse(String(firstSubmission(f,'fal')!.options.body))
    const metadata=await sharp(Buffer.from(sent.image_urls[0].split(',')[1],'base64')).metadata()
    assert.equal(metadata.format,'png');assert.equal(metadata.width,80);assert.equal(metadata.height,120)
    assert.match((await f.db.collection('paperbanana_jobs').findOne({_id:submitted.data.jobId})).sourceImageObjectKey,new RegExp('^'+submitted.data.jobId+'/'))
    assert.deepEqual(f.objects.get(key)?.bytes,jpeg,'historical original is unchanged')
  } finally {await f.close()}
})

for (const [provider,model,scenario,resumable] of [['runware','alibaba:qwen-image-edit@2511','lost-submit',true],['tokenhub','hy-image-v3','lost-submit',false],['fal','bria/fibo-edit-1.5/edit','lost-submit',false],['fal','bria/fibo-edit-1.5/edit','download',true],['tokenhub','hy-image-v3','download',true],['sensenova','sensenova-u1.5-lite','lost-submit',false],['sensenova','sensenova-u1.5-lite','download',true],['qianfan','qwen-image-edit','lost-submit',false],['qianfan','qwen-image-edit','download',true],['stepfun','step-2x-large','lost-submit',false],['stepfun','step-2x-large','download',true]] as const) test(`${provider} ${scenario}: recovery never repeats billed submission`,async()=>{
  const f=await createRefineRuntime({tokenDance:true})
  try {
    const source=await upload(f,['sensenova','qianfan','stepfun'].includes(provider)?await sharp({create:{width:1024,height:1024,channels:3,background:'#b1c5ae'}}).png().toBuffer():f.image);f.setChannelFailure(scenario)
    const submitted=await f.post(request(provider,model,source.objectKey));assert.equal(submitted.data.code,0,JSON.stringify(submitted));await f.legacy.drainJobAdmission()
    const failed=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
    assert.equal(failed.status,'failed',JSON.stringify(failed));assert.equal(failed.recovery.canResume,resumable,JSON.stringify(failed));assert.equal(failed.recovery.channel,provider)
    const submissions=()=>f.providerCalls.filter(call=>call.options.method==='POST'&&(provider!=='runware'||JSON.parse(String(call.options.body))[0].taskType==='imageInference')).length
    assert.equal(submissions(),1)
    f.setChannelFailure('')
    const resumed=await f.post({action:'providerResume',jobId:submitted.data.jobId})
    if (resumable) {
      assert.equal(resumed.data.jobId,submitted.data.jobId,JSON.stringify(resumed));await f.legacy.drainJobAdmission()
      const done=(await f.post({action:'getJob',jobId:submitted.data.jobId})).data.job
      assert.equal(done.status,'succeeded',JSON.stringify(done));assert.equal(done.providerCalls.length,1)
    } else assert.notEqual(resumed.data.code,0)
    assert.equal(submissions(),1);assert.equal(f.tokenDanceCalls.length,0)
  } finally {await f.close()}
})
