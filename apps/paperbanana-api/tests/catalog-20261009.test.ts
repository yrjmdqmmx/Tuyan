import test from 'node:test'
import assert from 'node:assert/strict'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { compileThinkingSelection, applyThinkingSnapshot } from '../../../packages/api/src/thinking.js'
// @ts-ignore generated client catalogue is an independent consumer
import { STATIC_MODEL_REGISTRY as catalog } from '../../web/src/lib/staticModelCatalog.js'

test('new native Claude controls reject invalid mode/effort combinations and preserve omission',()=>{
  for(const [modelId,off] of [['claude-sonnet-5-5','between_tools'],['claude-haiku-5-5','disabled']]) {
    const selection={provider:'anthropic',modelId,protocol:'anthropic-messages',options:{}}
    assert.deepEqual(compileThinkingSelection(selection,'main').wire,{})
    assert.throws(()=>compileThinkingSelection({...selection,options:{mode:off,effort:'max'}},'main'),/low/)
    const snapshot=compileThinkingSelection({...selection,options:{mode:off,effort:'high'}},'main')
    const body=applyThinkingSnapshot({model:modelId,max_tokens:16384,temperature:0.2},snapshot)
    assert.equal(body.thinking.type,off);assert.equal(body.output_config.effort,'high')
    assert.equal(body.max_tokens,16384);assert.equal(body.temperature,undefined)
  }
  assert.throws(()=>compileThinkingSelection({provider:'anthropic',modelId:'claude-sonnet-5-5',protocol:'anthropic-messages',options:{mode:'disabled'}},'main'))
  assert.throws(()=>compileThinkingSelection({provider:'openai',modelId:'gpt-6.1-sol',protocol:'openai-responses',options:{effort:'none'}},'main'))
})

test('retired identities and defaults survive; corrected Gemini shutdown does not expire early',()=>{
  assert.equal(catalog.openai.defaults.main,'gpt-5.6-sol')
  assert.ok(catalog.mistral.models.find((m:any)=>m.id==='labs-leanstral-1-5'))
  assert.equal(catalog.mistral.models.find((m:any)=>m.id==='labs-leanstral-1-5').selectable,false)
  assert.equal(catalog.gemini.models.find((m:any)=>m.id==='gemini-2.5-flash-image').expirationDate,'2027-03-15')
  assert.equal(catalog.deepseek.defaults.vision,'deepseek-v4-flash-vision-exp')
})

test('new native text and image routes send exact IDs and retain request ceilings (mock transport)',async()=>{
  const r:any=await createRefineRuntime();const calls:any[]=[]
  try {
    r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
      const body=JSON.parse(init.body);calls.push({url:String(url),body})
      if(String(url).endsWith('/responses'))return Response.json({status:'completed',output_text:'answer'})
      if(String(url).endsWith('/messages'))return Response.json({content:[{type:'text',text:'answer'}],stop_reason:'end_turn'})
      if(String(url).endsWith('/chat/completions'))return Response.json({choices:[{finish_reason:'stop',message:{content:'answer'}}]})
      if(String(url).endsWith('/interactions'))return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'image',mime_type:'image/png',data:r.output.toString('base64')}]}]})
      if(String(url).endsWith('/images/generations'))return Response.json({data:[{b64_json:r.output.toString('base64')}]})
      throw new Error('Unexpected fixture request '+url)
    })
    for(const [provider,id]of [['openai','gpt-6.1-sol'],['anthropic','claude-sonnet-5-5'],['anthropic','claude-haiku-5-5'],['mistral','mistral-large-4']]) {
      assert.equal(await r.legacy.callTextModel(provider,id,'fixture-key','system','prompt'),'answer')
      assert.equal(calls.at(-1).body.model,id)
      assert.equal(calls.at(-1).body.temperature,undefined)
    }
    for(const [provider,id,size]of [['gemini','gemini-nano-banana-2.1','4K'],['recraft','recraftv4_1_flash','1K'],['ark','doubao-seedream-5-0-flash-260915','2K']]) {
      assert.ok(await r.legacy.callImageModel(provider,id,'fixture-key','a scientific figure','1:1','',size))
      assert.equal(calls.at(-1).body.model,id)
      if(provider==='gemini')assert.equal(calls.at(-1).body.response_format.image_size,'4K')
    }
  } finally { await r.close() }
})

test('live OpenRouter specifications remain channel-specific, reject invalid limits and preserve image admission gates',async()=>{
  const r:any=await createRefineRuntime()
  try {
    r.legacy.configureRuntimeFetch(async(url:any)=>{
      if(String(url).endsWith('/images/models'))return Response.json({data:[{id:'google/gemini-nano-banana-2.1',architecture:{input_modalities:['text','image'],output_modalities:['image']},supported_parameters:{resolution:{values:['1K','2K','4K']},aspect_ratio:{values:['1:1']},input_references:{max:14}}}]})
      return Response.json({data:[{id:'google/gemini-nano-banana-2.1',name:'Nano Banana 2.1',context_length:65536,top_provider:{max_completion_tokens:58982},architecture:{input_modalities:['text','image','video'],output_modalities:['text','image']},supported_parameters:['reasoning']},{id:'fixture/unknown',context_length:-1,top_provider:{max_completion_tokens:'128K'},architecture:{input_modalities:['text'],output_modalities:['text']}},{id:'openai/gpt-6.1-sol:batch',architecture:{input_modalities:['text'],output_modalities:['text']}}]})
    })
    const result=(await r.post({action:'modelRegistry',provider:'openrouter'})).data
    assert.equal(result.code,0)
    const models=result.providers.openrouter.models, model=models.find((m:any)=>m.id==='google/gemini-nano-banana-2.1')
    assert.equal(model.specifications.contextWindowTokens,65536)
    assert.equal(model.specifications.maxOutputTokens,58982)
    assert.equal(model.specifications.reasoning,'supported')
    assert.equal(model.specificationsByRole.image.contextWindowTokens,undefined,'chat token limits are never assigned to the dedicated image endpoint')
    assert.equal(model.verified,false)
    assert.equal(model.roles.includes('image'),false,'a missing explicit output-format contract still blocks image admission')
    assert.equal(models.find((m:any)=>m.id.endsWith(':batch'))?.selectable,false)
    assert.equal(models.find((m:any)=>m.id==='fixture/unknown').specifications.contextWindowTokens,undefined)
    assert.equal(models.find((m:any)=>m.id==='fixture/unknown').specifications.maxOutputTokens,undefined)
  } finally { await r.close() }
})
