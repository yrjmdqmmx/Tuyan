import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, applyThinkingTransport, compileThinkingSelection, thinkingProfile, validateThinkingOptions } from '../../../packages/api/src/thinking.js'

test('MiMo UltraSpeed native Chat thinking preserves budgets, defaults and channel boundaries', () => {
  const modelId='mimo-v2.6-pro-ultraspeed'
  for (const role of ['main','vision'] as const) {
    const compile=(options:any)=>compileThinkingSelection({provider:'xiaomi',modelId,protocol:'openai-chat-completions',options},role)
    const body={model:modelId,thinking:{type:'disabled',unrelated:'keep'},max_completion_tokens:2048,temperature:0.7,top_p:0.8}
    for (const mode of ['enabled','disabled']) {
      const result=applyThinkingTransport('https://api.xiaomimimo.com/v1/chat/completions',{method:'POST',body:JSON.stringify(body)},compile({mode}))
      assert.deepEqual(JSON.parse(String(result?.body)),{model:modelId,thinking:{type:mode,unrelated:'keep'},max_completion_tokens:2048,...(mode==='disabled'?{temperature:0.7,top_p:0.8}:{})})
    }
    assert.deepEqual(compile({}).wire,{})
    assert.deepEqual(applyThinkingSnapshot(body,compile({})),{model:modelId,thinking:{unrelated:'keep'},max_completion_tokens:2048})
    assert.deepEqual(applyThinkingSnapshot(body),body)
    for(const options of [{mode:'auto'},{mode:true},{effort:'high'},{budget:1024}]) assert.throws(()=>compile(options))
  }
  for (const modelId of ['mimo-v2.6-ultraspeed','mimo-v2.6-pro-ultraspeed']) {
    assert.throws(()=>compileThinkingSelection({provider:'tokendance',modelId,protocol:'openai-chat-completions',options:{mode:'enabled'}},'main'),/尚未核实/)
  }
  assert.throws(()=>compileThinkingSelection({provider:'xiaomi',modelId,protocol:'openai-responses',options:{mode:'enabled'}},'main'),/尚未核实/)
})

test('TokenDance partial or other-protocol evidence never enables unverified Chat parameters', () => {
  for (const [modelId,reason] of [
    ['deepseek-v4-flash-0731','other-protocol-only'],
    ['deepseek-v4-pro-0813','parameter-contract-incomplete'],
    ['step-3.7-flash','parameter-contract-incomplete'],
    ['hy3','parameter-contract-incomplete'],
    ['hy3-preview','parameter-contract-incomplete'],
    ['glm-4.5-air','parameter-contract-incomplete'],
    ['deepseek-v3.2','catalog-entry-missing'],
    ['deepseek-chat-v3-0324','catalog-entry-missing'],
    ['deepseek-v4-flash-vision-exp','catalog-entry-missing'],
    ['qwen3-max','catalog-entry-missing'],
  ]) {
    const p=thinkingProfile('tokendance',modelId,'main','openai-chat-completions')
    assert.equal(p.status,'unconfirmed');assert.equal(p.statusReason,reason)
    const invalidOptions: Record<string,string|boolean>[] = [{effort:'high'},{effort:'none'},{mode:'enabled'},{mode:false}]
    for(const options of invalidOptions) {
      assert.throws(()=>compileThinkingSelection({provider:'tokendance',modelId,protocol:'openai-chat-completions',options},'main'),/尚未核实/)
    }
    const snapshot=compileThinkingSelection({provider:'tokendance',modelId,protocol:'openai-chat-completions',options:{}},'main')
    const body={model:modelId,max_tokens:1024,temperature:0.5}
    assert.deepEqual(applyThinkingSnapshot(body,snapshot),body)
  }
  const image=thinkingProfile('tokendance','seedream-5.0-pro','image','ark-images')
  assert.ok(image.sourceUrls.includes('https://tokendance.space/docs/ark-image-generations.md'))
  assert.ok(!image.sourceUrls.some((url:string)=>url.includes('chat-completions')))
})

test('Replicate schemas without thinking controls keep pinned requests unchanged', () => {
  for(const modelId of ['qwen/qwen3-7-plus','moonshotai/kimi-k2-thinking','qwen/qwen3-235b-a22b-instruct-2507']) {
    const p=thinkingProfile('replicate',modelId,'main','replicate-predictions')
    assert.equal(p.status,'unsupported')
    const compile=(options:any)=>compileThinkingSelection({provider:'replicate',modelId,protocol:'replicate-predictions',options},'main')
    assert.throws(()=>compile({mode:'enabled'}),/尚未核实/)
    const snapshot=compile({}),body={version:p.transport.pinnedSchemaVersion,input:{prompt:'offline fixture',max_tokens:1024,temperature:0.3}}
    assert.deepEqual(applyThinkingSnapshot(body,snapshot),body)
    assert.equal(snapshot.pinnedSchemaVersion,p.transport.pinnedSchemaVersion)
  }
})

test('SiliconFlow exact hybrid IDs use channel booleans and cannot leak into similarly named models', () => {
  for (const modelId of ['Qwen/Qwen3-8B','Qwen/Qwen3-14B','Qwen/Qwen3-32B']) {
    for (const mode of [true,false]) {
      const snapshot=compileThinkingSelection({provider:'siliconflow',modelId,protocol:'openai-chat-completions',options:{mode}},'main')
      const request=applyThinkingTransport('https://api.siliconflow.cn/v1/chat/completions',{method:'POST',body:JSON.stringify({model:modelId,max_tokens:1000})},snapshot)
      assert.deepEqual(JSON.parse(String(request?.body)),{model:modelId,max_tokens:1000,enable_thinking:mode})
    }
    const p=thinkingProfile('siliconflow',modelId,'main','openai-chat-completions')
    assert.deepEqual(validateThinkingOptions(p,{mode:true,budget:128}),{mode:true,budget:128})
    assert.throws(()=>validateThinkingOptions(p,{mode:false,budget:128}),/关闭思考/)
    assert.throws(()=>validateThinkingOptions(p,{mode:true,budget:32769}),/整数/)
  }
  for(const modelId of ['Qwen/Qwen3-30B-A3B-Instruct-2507','Qwen/Qwen3.8-27B','deepseek-ai/DeepSeek-V4-Pro']) {
    assert.throws(()=>compileThinkingSelection({provider:'siliconflow',modelId,protocol:'openai-chat-completions',options:{mode:true}},'main'),/尚未核实/)
  }
})

test('TokenDance contracts do not inherit same-named original-provider fields',()=>{
  const compile=(modelId:string,options:any)=>compileThinkingSelection({provider:'tokendance',modelId,protocol:'openai-chat-completions',options},'main')
  for(const effort of ['low','high','max']) assert.deepEqual(compile('kimi-k3',{effort}).wire,{reasoning_effort:effort})
  for(const modelId of ['kimi-k2.5','kimi-k2.6']) for(const mode of ['enabled','disabled']) assert.deepEqual(compile(modelId,{mode}).wire,{thinking:{type:mode}})
  assert.throws(()=>compile('kimi-k3',{mode:'disabled'}),/不支持/)
  for(const modelId of ['kimi-k2.7-code','qwen3.8-flash','qwen3-30b-a3b-instruct-2507']) {
    assert.deepEqual(compile(modelId,{}).wire,{})
    assert.throws(()=>compile(modelId,{mode:true}),/尚未核实/)
  }
})

test('AntLing Ring uses top-level reasoning_effort and removes the obsolete nested field only',()=>{
  const snapshot=compileThinkingSelection({provider:'antling',modelId:'Ring-2.6-1T',protocol:'openai-chat-completions',options:{effort:'xhigh'}},'main')
  const body=applyThinkingSnapshot({model:'Ring-2.6-1T',reasoning:{effort:'high',other:'keep'},max_tokens:2048},snapshot)
  assert.deepEqual(body,{model:'Ring-2.6-1T',reasoning:{other:'keep'},max_tokens:2048,reasoning_effort:'xhigh'})
})

test('new image thinking validates channel-specific rewrite dependencies without raising output limits',()=>{
  for(const [provider,modelId,protocol,key,field,extend,modeField] of [
    ['bailian','qwen-image-3.0-pro','bailian-multimodal-generation','parameters','enable_thinking','prompt_extend','prompt_extend_mode'],
    ['runware','alibaba:qwen-image@2.1-pro','provider-images','settings','thinking','promptExtend','promptExtendMode'],
  ]) {
    for(const mode of [true,false]) {
      const snapshot=compileThinkingSelection({provider,modelId,protocol,options:{mode}},'image')
      const rewriteOptions={[extend]:true,[modeField]:'direct'}
      const body={model:modelId,[key]:rewriteOptions,input:{messages:[{content:[{image:'fixture-image'}]}]},max_tokens:1000}
      assert.deepEqual(applyThinkingSnapshot(body,snapshot),{...body,[key]:{...rewriteOptions,[field]:mode}})
      assert.throws(()=>applyThinkingSnapshot({...body,[key]:{[extend]:false}},snapshot),/提示词改写/)
      assert.throws(()=>applyThinkingSnapshot({...body,[key]:{[modeField]:'agent'}},snapshot),/Direct/)
      assert.equal(body.max_tokens,1000)
    }
    const implicit=compileThinkingSelection({provider,modelId,protocol,options:{}},'image')
    assert.deepEqual(implicit.wire,{})
  }
})

test('fal Krea exposes the documented common effort levels for generation and editing',()=>{
  for(const effort of ['low','medium']) {
    const snapshot=compileThinkingSelection({provider:'fal',modelId:'krea/v3/text-to-image',protocol:'provider-images',options:{effort}},'image')
    assert.deepEqual(applyThinkingSnapshot({model:'berry',reasoning_level:'low'},snapshot),{model:'berry',reasoning_level:effort})
    assert.deepEqual(snapshot.endpointAliases,['krea/v3/text-to-image','krea/v3/edit'])
  }
  assert.throws(()=>compileThinkingSelection({provider:'fal',modelId:'krea/v3/text-to-image',protocol:'provider-images',options:{effort:'high'}},'image'))
})

test('Mistral hosted GLM and Qianfan GLM have independent allowed controls',()=>{
  const mistral=thinkingProfile('mistral','zai-glm-5-3','main','openai-chat-completions')
  for(const effort of ['low','high','max']) assert.deepEqual(validateThinkingOptions(mistral,{effort}),{effort})
  assert.throws(()=>validateThinkingOptions(mistral,{effort:'none'}),/不适用/)
  assert.equal(thinkingProfile('qianfan','glm-5.3','main','openai-chat-completions').status,'fixed')
  assert.deepEqual(compileThinkingSelection({provider:'qianfan',modelId:'glm-5.2',protocol:'openai-chat-completions',options:{mode:'disabled'}},'main').wire,{thinking:{type:'disabled'}})
})
