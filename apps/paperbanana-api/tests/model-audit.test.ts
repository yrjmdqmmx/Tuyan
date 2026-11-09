import test from 'node:test'
import assert from 'node:assert/strict'
import { removedModel, auditedModelLifecycle, auditedModelSpecs, assertAuditedModelAvailable } from '../../../packages/api/src/model-audit.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

test('scheduled notices change at the stated date and serverless restrictions are channel scoped', () => {
  const id='qwen3.5-plus'
  assert.equal(auditedModelLifecycle('bailian',id,Date.parse('2027-01-18T23:59:59Z'))?.state,'scheduled')
  assert.equal(removedModel('bailian',id,Date.parse('2027-01-19T00:00:00Z'))?.replacementApiId,'qwen3.8-flash')
  assert.throws(()=>assertAuditedModelAvailable('bailian',id,Date.parse('2027-01-19')), (e:any)=>e.code==='MODEL_UNAVAILABLE' && e.replacement==='qwen3.8-flash')
  assert.equal(removedModel('fireworks','accounts/fireworks/models/glm-5p2')?.replacementApiId,'accounts/fireworks/models/glm-5p3')
  assert.equal(auditedModelLifecycle('zhipu','glm-5.2'),null)
  assert.equal(auditedModelLifecycle('openai','unresolved'),null)
  assert.equal(auditedModelSpecs('openai','unresolved').unverified,true)
})
test('new text models use existing adapters with exact IDs; image additions stay disabled without size evidence', async () => {
  const runtime:any=await createRefineRuntime({startServer:false})
  const calls:{url:string,body:any}[]=[]
  try {
    runtime.legacy.configureRuntimeFetch(async (url:any,options:any)=>{
      calls.push({url:String(url),body:JSON.parse(options.body)})
      return Response.json({id:'fixture',choices:[{finish_reason:'stop',message:{content:'Fixture text'}}],usage:{prompt_tokens:1,completion_tokens:2}})
    })
    const routes = [
      ['fireworks','accounts/fireworks/models/kimi-k3p1-pro','https://api.fireworks.ai/inference/v1/chat/completions'],
      ['antling','Ling-3.1-flash','https://api.ant-ling.com/v1/chat/completions'],
      ['antling','Ling-3.2-flash','https://api.ant-ling.com/v1/chat/completions'],
      ['tokenhub','hy4','https://tokenhub.tencentmaas.com/v1/chat/completions'],
      ['longcat','LongCat-2.5','https://api.longcat.chat/openai/v1/chat/completions'],
    ]
    for (const [provider,id,url] of routes) {
      const before=calls.length
      assert.equal(await runtime.legacy.callTextModel(provider,id,'fixture','system','prompt'),'Fixture text')
      assert.equal(calls.length,before+1);assert.equal(calls.at(-1)?.url,url);assert.equal(calls.at(-1)?.body.model,id)
      assert.equal(auditedModelSpecs(provider,id).fields.maxOutputTokens.value,null)
    }
    for (const id of ['gpt-image-2.6-sunburst','gpt-image-2.6-flare']) {
      await assert.rejects(runtime.legacy.callImageModel('openai',id,'fixture','prompt','1:1'),/输出尺寸契约/)
    }
    assert.equal(calls.length,5)
  } finally { await runtime.close() }
})
test('retired text, image, vision and serverless requests fail before any transport, including saved routes', async () => {
  const runtime:any=await createRefineRuntime({startServer:false});let calls=0
  try {
    runtime.legacy.configureRuntimeFetch(async()=>{ calls++;throw Error('Transport must not be reached') })
    const expected=(code:string,replacement?:string)=>(e:any)=>e.businessCode===code&&e.requestState==='not_sent'&&(!replacement||e.replacement===replacement)&&/原型号已不可用，请重新选择/.test(e.message)
    await assert.rejects(runtime.legacy.callTextModel('xiaomi','mimo-v2.5','fixture','system','prompt'),expected('MODEL_UNAVAILABLE','mimo-v2.6-flash'))
    await assert.rejects(runtime.legacy.callImageModel('stepfun','step-image-edit-2','fixture','prompt','1:1'),expected('MODEL_UNAVAILABLE'))
    await assert.rejects(runtime.legacy.callVisionModel('xiaomi','mimo-v2.5-pro','fixture','prompt',[]),expected('MODEL_UNAVAILABLE','mimo-v2.6-pro'))
    await assert.rejects(runtime.legacy.callTextModel('fireworks','accounts/fireworks/models/glm-5p2','fixture','system','prompt'),expected('MODEL_UNAVAILABLE'))
    assert.throws(()=>runtime.legacy.resolveModelRouting({provider:'xiaomi',mainModelName:'mimo-v2.5',outputFormat:'svg',visionMode:'none'}),expected('MODEL_UNAVAILABLE'))
    const response = await runtime.invoke({action:'createJob',userId:'owner',provider:'xiaomi',mainModelName:'mimo-v2.5',outputFormat:'svg',visionMode:'none',methodContent:'Draw a diagram showing input, processing and output.',caption:'Fixture diagram',apiKey:'fixture'})
    assert.equal(response.businessCode,'MODEL_UNAVAILABLE');assert.match(response.message || response.error,/mimo-v2.6-flash/)
    assert.equal(calls,0)
  } finally { await runtime.close() }
})

test('account catalog refresh cannot resurrect a removed Fireworks identity', async () => {
  const runtime:any=await createRefineRuntime({startServer:false})
  try {
    runtime.legacy.configureRuntimeFetch(async()=>Response.json({data:[{id:'accounts/fireworks/models/glm-5p2'},{id:'accounts/fireworks/models/glm-5p3'}]}))
    const result=await runtime.legacy.readAccountModelCatalog({provider:'fireworks',apiKeys:{fireworks:'fixture'},privateModels:true})
    const registry=result.data?.providerRegistry || result.providerRegistry
    assert.ok(registry)
    assert.equal(registry.models.some((model:any)=>model.id==='accounts/fireworks/models/glm-5p2'),false)
    assert.equal(registry.models.some((model:any)=>model.id==='accounts/fireworks/models/glm-5p3'),true)
  } finally { await runtime.close() }
})
