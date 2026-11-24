import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { publicExecutionFailure } from '../../../packages/api/src/execution-errors.js'
import { removedModel, auditedModelLifecycle, auditedModelSpecs, assertAuditedModelAvailable } from '../../../packages/api/src/model-audit.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

test('R8 all removed MODEL_UNAVAILABLE messages use main labels with unchanged machine fields', () => {
  const rows = JSON.parse(fs.readFileSync(new URL('../../../config/removed-models.json', import.meta.url), 'utf8'))
  for (const [key, row] of Object.entries(rows) as [string, any][]) {
    const slash = key.indexOf('/'), channel = key.slice(0, slash), id = key.slice(slash + 1)
    assert.throws(() => assertAuditedModelAvailable(channel, id), (error: any) => {
      assert.equal(error.message, `模型 ${row.displayName}：原型号已不可用，请重新选择。${row.replacementApiId ? `推荐：${row.replacementDisplayName}` : ''}`)
      assert.equal(error.businessCode, 'MODEL_UNAVAILABLE'); assert.equal(error.code, 'MODEL_UNAVAILABLE')
      assert.equal(error.statusCode, 400); assert.equal(error.replacement, row.replacementApiId); assert.equal(error.sourceUrl, row.sourceUrl)
      assert.equal(error.requestState, 'not_sent'); assert.equal(error.localInputFailure, true); assert.equal(error.retryable, false)
      for (const [apiId, name] of [[id, row.displayName], [row.replacementApiId, row.replacementDisplayName]]) {
        if (apiId && !name.includes(apiId)) assert.ok(!error.message.includes(apiId), key)
      }
      return true
    })
  }
})

test('scheduled notices change at the stated date and serverless restrictions are channel scoped', () => {
  const id='qwen3.5-plus'
  assert.equal(auditedModelLifecycle('bailian',id,Date.parse('2027-01-18T23:59:59Z'))?.state,'scheduled')
  assert.equal(removedModel('bailian',id,Date.parse('2027-01-19T10:00:00+08:00'))?.replacementApiId,'qwen3.8-flash')
  assert.throws(()=>assertAuditedModelAvailable('bailian',id,Date.parse('2027-01-19T10:00:00+08:00')), (e:any)=>e.code==='MODEL_UNAVAILABLE' && e.replacement==='qwen3.8-flash')
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
    const expected=(code:string,replacement?:string)=>(e:any)=>e.businessCode===code&&e.requestState==='not_sent'&&(!replacement||e.replacement===replacement)&&/^模型 .+：原型号已不可用，请重新选择。/.test(e.message)
    await assert.rejects(runtime.legacy.callTextModel('xiaomi','mimo-v2.5','fixture','system','prompt'),expected('MODEL_UNAVAILABLE','mimo-v2.6-flash'))
    await assert.rejects(runtime.legacy.callImageModel('stepfun','step-image-edit-2','fixture','prompt','1:1'),expected('MODEL_UNAVAILABLE'))
    await assert.rejects(runtime.legacy.callVisionModel('xiaomi','mimo-v2.5-pro','fixture','prompt',[]),expected('MODEL_UNAVAILABLE','mimo-v2.6-pro'))
    await assert.rejects(runtime.legacy.callTextModel('fireworks','accounts/fireworks/models/glm-5p2','fixture','system','prompt'),expected('MODEL_UNAVAILABLE'))
    assert.throws(()=>runtime.legacy.resolveModelRouting({provider:'xiaomi',mainModelName:'mimo-v2.5',outputFormat:'svg',visionMode:'none'}),expected('MODEL_UNAVAILABLE'))
    const response = await runtime.invoke({action:'createJob',userId:'owner',provider:'xiaomi',mainModelName:'mimo-v2.5',outputFormat:'svg',visionMode:'none',methodContent:'Draw a diagram showing input, processing and output.',caption:'Fixture diagram',apiKey:'fixture'})
    assert.equal(response.businessCode,'MODEL_UNAVAILABLE');assert.match(response.message || response.error,/MiMo-V2.6-Flash/)
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

test('optimization returns the removed-model 400 and hint before registry or provider transport', async () => {
  const runtime:any = await createRefineRuntime({startServer:false}); let calls = 0
  try {
    runtime.legacy.configureRuntimeFetch(async () => { calls++; throw Error('No provider transport') })
    const result = await runtime.invoke({action:'optimizeInputs',target:'methodContent',inputs:{methodContent:'Draw input, process and output',caption:'',negativePrompt:''},mainRoute:{accessProvider:'xiaomi',modelId:'mimo-v2.5'},apiKey:'fixture'})
    assert.equal(result.code,400)
    assert.equal(result.businessCode,'MODEL_UNAVAILABLE')
    assert.equal(result.requestState,'not_sent')
    assert.match(result.message || result.error,/MiMo-V2.6-Flash/)
    assert.equal(calls,0)
  } finally { await runtime.close() }
})

test('batch 1 removed identities retain evidence and reject saved routes before transport', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-24T12:00:00+08:00'))
  const runtime:any = await createRefineRuntime({startServer:false}); let calls = 0
  try {
    runtime.legacy.configureRuntimeFetch(async () => { calls++; throw Error('No transport for removed models') })
    for (const [provider, id] of [['openai','o1'], ['antling','Ling-2.6-1T'], ['antling','Ling-2.6-flash'], ['antling','Ring-2.6-1T'], ['siliconflow','Pro/zai-org/GLM-5.1'], ['ark', 'doubao-seed-1-6-250615'], ['bailian', 'qwen3-max'], ['runware', 'openai:1@1'], ...['MiniMax-M2.5','MiniMax-M2.5-highspeed','MiniMax-M2.7','MiniMax-M2.7-highspeed'].map(id=>['minimax',id])]) {
      assert.equal(auditedModelLifecycle(provider,id),null)
      const removed = removedModel(provider,id)
      assert.ok(removed)
      if (provider === 'antling') assert.equal(removed.stopDate,'2026-11-15T00:00:00+08:00')
      assert.equal(removedModel('other',id),null)
      await assert.rejects(runtime.legacy.callTextModel(provider,id,'fixture','system','prompt'), (e:any) => e.businessCode === 'MODEL_UNAVAILABLE' && e.requestState === 'not_sent')
    }
    await assert.rejects(runtime.legacy.callImageModel('openai','gpt-image-1','fixture','prompt','1:1'), (e:any) => e.businessCode === 'MODEL_UNAVAILABLE' && e.requestState === 'not_sent')
    assert.equal(calls,0)
  } finally { await runtime.close() }
})

test('Zhipu legal chat sends text and image and explains model authorization errors', async () => {
  const runtime:any = await createRefineRuntime({startServer:false})
  const model = 'glm-5.3-flashx-legal'
  try {
    for (const [status, code, message, expected] of [
      [401, 1000, 'invalid', /身份验证失败/], [403, 1220, 'denied', /服务商模型权限/],
      [200, 1311, 'denied', /服务商模型权限/], [400, 1220, 'denied', /服务商模型权限/],
      [400, 1314, 'denied', /服务商模型权限/], [400, 1315, 'denied', /服务商模型权限/],
      [429, 1113, '账户已欠费', /欠费/],
      [400, 1211, '模型不存在', /模型不存在/], [400, 1261, 'Prompt 超长', /超长/],
    ] as const) {
      let submissions = 0
      runtime.legacy.configureRuntimeFetch(async (url:string, init:RequestInit) => {
        submissions++
        assert.match(url, /\/chat\/completions$/)
        const body = JSON.parse(String(init.body))
        assert.equal(body.model, model)
        assert.deepEqual(body.messages[1].content.map((part:any) => part.type), ['text','image_url'])
        assert.notEqual(body.thinking?.type, 'disabled')
        return Response.json({error:{code,message}}, {status})
      })
      await assert.rejects(runtime.legacy.callTextModel('zhipu',model,'fixture','system','prompt',[{url:'https://asset.invalid/fixture.png',mimeType:'image/png'}]), (error: any) => {
        assert.match(error.message, expected)
        if (status === 401 || message === 'denied') {
          const failure = publicExecutionFailure(error)
          assert.equal(failure.category, 'permission')
          assert.equal(failure.requestState, 'rejected')
          assert.match(failure.message, expected)
          assert.match(failure.suggestion, /联系管理员/)
          assert.equal(error.retryable, false)
        } else assert.equal(error.status, status)
        return true
      })
      assert.equal(submissions,1)
    }
  } finally { await runtime.close() }
})
