import test from 'node:test'
import assert from 'node:assert/strict'
import { applyThinkingSnapshot, applyThinkingTransport, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'

test('Together GLM 5.3 variants send the channel effort enum without raising budgets or accepting Off', () => {
  for (const modelId of ['zai-org/GLM-5.3','zai-org/GLM-5.3-Flash']) {
    const compile=(options:any)=>compileThinkingSelection({provider:'together',modelId,protocol:'openai-chat-completions',options},'main')
    const body={model:modelId,max_tokens:1024,temperature:0.4,top_p:0.8}
    for(const effort of ['low','medium','high','max']) {
      const request=applyThinkingTransport('https://api.together.xyz/v1/chat/completions',{method:'POST',body:JSON.stringify(body)},compile({effort}))
      assert.deepEqual(JSON.parse(String(request?.body)),{...body,reasoning_effort:effort})
    }
    assert.deepEqual(compile({}).wire,{})
    assert.deepEqual(applyThinkingSnapshot({...body,reasoning_effort:'max'},compile({})),body)
    for(const options of [{effort:'none'},{effort:'xhigh'},{mode:false},{mode:'disabled'},{budget:4096}]) assert.throws(()=>compile(options))
    for(const provider of ['siliconflow','tokendance']) {
      assert.throws(()=>compileThinkingSelection({provider,modelId:provider==='tokendance'?'glm-5.3':modelId,protocol:'openai-chat-completions',options:{effort:'medium'}},'main'))
    }
  }
})

test('Mistral Large 4 keeps its API identity and only supports documented none/high for text and vision', () => {
  const modelId='mistral-large-4'
  for(const role of ['main','vision'] as const) {
    const compile=(options:any)=>compileThinkingSelection({provider:'mistral',modelId,protocol:'openai-chat-completions',options},role)
    const body={model:modelId,messages:[{role:'user',content:'offline fixture'}],max_tokens:2048,temperature:0.3}
    for(const effort of ['none','high']) {
      const request=applyThinkingTransport('https://api.mistral.ai/v1/chat/completions',{method:'POST',body:JSON.stringify(body)},compile({effort}))
      assert.deepEqual(JSON.parse(String(request?.body)),{...body,reasoning_effort:effort})
    }
    assert.deepEqual(applyThinkingSnapshot({...body,reasoning_effort:'high'},compile({})),body)
    assert.deepEqual(applyThinkingSnapshot(body),body)
    for(const options of [{effort:'low'},{effort:'max'},{mode:'enabled'},{budget:1024}]) assert.throws(()=>compile(options))
  }
  assert.throws(()=>compileThinkingSelection({provider:'mistral',modelId:'mistral-large-4-0',protocol:'openai-chat-completions',options:{effort:'high'}},'main'))
})

test('SiliconFlow incomplete, conflicting and retired identities remain unconfirmed and preserve provider defaults', () => {
  for(const [modelId,reason] of [
    ['Qwen/Qwen3.6-35B-A3B','parameter-contract-incomplete'],
    ['deepseek-ai/DeepSeek-V3.2','parameter-contract-incomplete'],
    ['deepseek-ai/DeepSeek-V4-Pro','conflicting-docs'],
    ['zai-org/GLM-5.2','conflicting-docs'],
    ['Qwen/Qwen3.8-27B','conflicting-docs'],
    ['MiniMaxAI/MiniMax-M2.5','catalog-retired'],
    ['Pro/MiniMaxAI/MiniMax-M2.5','catalog-retired'],
    ['nex-agi/Nex-N2-Pro','catalog-retired'],
    ['Qwen/Qwen3.5-397B-A17B','catalog-retired'],
    ['zai-org/GLM-5.3','channel-contract-missing'],
  ]) {
    const p=thinkingProfile('siliconflow',modelId,'main','openai-chat-completions')
    assert.equal(p.status,'unconfirmed');assert.equal(p.statusReason,reason)
    const compile=(options:any)=>compileThinkingSelection({provider:'siliconflow',modelId,protocol:'openai-chat-completions',options},'main')
    for(const options of [{mode:true},{mode:'enabled'},{effort:'high'},{budget:32768}]) assert.throws(()=>compile(options),/尚未核实/)
    const body={model:modelId,max_tokens:1000,temperature:0.5}
    assert.deepEqual(applyThinkingSnapshot(body,compile({})),body)
  }
})

test('Together FLUX 1.1 schema status does not invent image thinking fields', () => {
  const modelId='black-forest-labs/FLUX.1.1-pro'
  const p=thinkingProfile('together',modelId,'image','provider-images')
  assert.equal(p.status,'unsupported');assert.equal(p.statusReason,'image-parameters')
  const compile=(options:any)=>compileThinkingSelection({provider:'together',modelId,protocol:'provider-images',options},'image')
  assert.throws(()=>compile({effort:'high'}))
  const body={model:modelId,prompt:'offline fixture',steps:20,guidance_scale:3.5}
  assert.deepEqual(applyThinkingSnapshot(body,compile({})),body)
})
