import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { modelSpecificationSummary } from '../src/lib/modelSpecifications.js'
import { modelCardName, modelCardSpecifications, safeOfficialSources } from '../src/lib/modelCardSpecifications.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { modalityIconStates } from '../src/lib/modelModalityIcons.js'
import { ModelBrandLogo } from '../src/components/ModelBrandLogo.jsx'
import logos from '../src/data/model-brand-logos.json' with { type: 'json' }
import { MODEL_CHANNEL_LABELS, presentRegistryModel } from '../src/lib/modelPresentation.js'
import fs from 'node:fs'
afterEach(cleanup)

test('Novita shows confirmed text-to-image facts offline and after conflicting catalog refresh', () => {
  const historical = STATIC_MODEL_REGISTRY.novita.models.find(m => m.id === 'ming-image-0.1-design')
  for (const specifications of [undefined, {
    version: 1, officialInputModalities: ['text', 'image', 'audio', 'video'],
    officialOutputModalities: ['text', 'image', 'audio', 'video'], contextWindowTokens: 0,
    sourceUrls: ['https://api.novita.ai/v3/openai/models'],
  }]) {
    const model = { ...historical, specifications }, before = structuredClone(model)
    const card = modelCardSpecifications('novita', model)
    assert.equal(card.input, '文本；其他模态待确认')
    assert.equal(card.output, '图像；其他模态待确认')
    assert.equal(card.context, '待确认')
    assert.deepEqual(modalityIconStates(card.input).map(x => x.state), ['supported', 'unknown', 'unknown', 'unknown'])
    assert.deepEqual(modalityIconStates(card.output).map(x => x.state), ['unknown', 'supported', 'unknown', 'unknown'])
    assert.ok(card.sources.includes('https://docs.novita.ai/api-reference/model-apis-ming-image-txt2img'))
    const view = render(React.createElement(ModelSpecifications, { provider: 'novita', model }))
    assert.equal(view.container.querySelectorAll('.is-unknown').length, 6)
    assert.match(screen.getByRole('note').textContent, /待确认/)
    assert.deepEqual(model, before, 'display correction never expands runtime capabilities or changes history')
    view.unmount()
  }
  assert.equal(modelCardSpecifications('custom', { id: historical.id }).input, '待确认')
})

test('documented specifications never change adapted capabilities or request limits', () => {
  const model = STATIC_MODEL_REGISTRY.gemini.models.find(m=>m.id==='gemini-nano-banana-2.1')
  const before = structuredClone(model)
  const summary = modelSpecificationSummary(model)
  assert.equal(summary.input.video,'unsupported')
  assert.equal(summary.output.text,'unsupported')
  assert.equal(summary.contextWindowTokens,undefined)
  assert.equal(summary.maxInputTokens,131072)
  const card=modelCardSpecifications('gemini',model)
  assert.match(card.input,/视频/)
  assert.equal(card.context,'未单列')
  render(React.createElement(ModelSpecifications,{provider:'gemini',model}))
  assert.ok(screen.getByText('上下文窗口'))
  assert.equal(screen.queryByText('131.072K tokens'),null)
  assert.equal(screen.queryByText('32.768K tokens'),null)
  assert.deepEqual(model,before)
})

test('official cards only contain input, output, context and source links',()=>{
  const model=STATIC_MODEL_REGISTRY.openai.models.find(m=>m.id==='gpt-6.1-sol')
  const {container}=render(React.createElement(ModelSpecifications,{provider:'openai',model}))
  assert.equal(container.querySelectorAll('dt').length,3)
  assert.ok(screen.getByText('上下文窗口'))
  assert.equal(container.querySelector('details'),null)
  assert.doesNotMatch(container.textContent,/思考规则|图研输出格式|已适配|复制 ID|发布日期|权益|最大输出/)
  assert.ok(screen.getAllByRole('link').length)
  for(const link of screen.getAllByRole('link')) {
    assert.match(link.href,/^https:/);assert.equal(link.target,'_blank');assert.ok(link.rel.includes('noopener'))
  }
})

test('exact dates preserve different Seed 2.1 Pro context windows',()=>{
  assert.equal(modelCardSpecifications('ark',{id:'doubao-seed-2-1-pro-260628'}).context,'256K tokens')
  assert.equal(modelCardSpecifications('ark',{id:'doubao-seed-2-1-pro-260915'}).context,'≈ 1M tokens')
  assert.equal(modelCardSpecifications('tokendance',{id:'seed-2.1-pro'}).context,'待确认')
})

test('missing native window can use this exact channel with distinct provenance',()=>{
  const data=modelCardSpecifications('tokendance',{id:'seed-2.1-pro',specifications:{version:1,contextWindowTokens:262144,sourceUrls:['https://tokendance.space/models/seed-2.1-pro']}})
  assert.equal(data.inputScope,'原厂');assert.equal(data.context,'≈ 262K tokens');assert.equal(data.contextScope,'渠道')
  assert.ok(data.sources.includes('https://tokendance.space/models/seed-2.1-pro'))
})

test('similar names and unconfirmed manufacturer references cannot supply facts',()=>{
  const data=modelCardSpecifications('custom',{id:'unknown',label:'GPT-5 Pro',specifications:{version:1,manufacturer:{identity:'reference-only',contextWindowTokens:400000,officialInputModalities:['text','image'],sourceUrls:['https://developers.openai.com/api/docs/models/gpt-5-pro']}}})
  assert.equal(data.context,'待确认');assert.equal(data.input,'待确认');assert.equal(data.output,'待确认')
})

test('malformed links and invalid context values remain unknown',()=>{
  assert.deepEqual(safeOfficialSources(['https://','javascript:alert(1)','http://example.com','https://a:b@example.com']),[])
  for (const contextWindowTokens of [Infinity,NaN,-1,0,'1M']) {
    assert.equal(modelCardSpecifications('custom',{id:'unknown',specifications:{version:1,contextWindowTokens,sourceUrls:['https://example.com/docs']}}).context,'待确认')
  }
  render(React.createElement(ModelSpecifications,{provider:'custom',model:{id:'missing',releaseSourceUrl:'javascript:alert(1)'}}))
  assert.equal(screen.queryByRole('link'),null);assert.ok(screen.getByText('官方文档待确认'))
})

test('official facts are not inferred from application roles or output formats',()=>{
  const model={id:'unknown-image',roles:['image'],capabilities:{imageGeneration:true,referenceImages:true,outputFormats:['png']}}
  const data=modelCardSpecifications('custom',model)
  assert.equal(data.input,'待确认');assert.equal(data.output,'待确认')
  assert.equal(modelSpecificationSummary(model).output.image,'supported')
})

test('official alias migration never changes the same ID at another provider',()=>{
  const model={id:'deepseek-v4-flash-vision-exp',label:'DeepSeek V4 Flash Vision Exp'}
  assert.equal(modelCardName('deepseek',model),'DeepSeek V4.1 Flash 1017')
  assert.equal(modelCardName('tokendance',model),model.label)
  assert.equal(modelCardSpecifications('deepseek',model).context,'1M tokens')
  assert.equal(modelCardSpecifications('tokendance',model).context,'待确认')
  assert.equal(model.id,'deepseek-v4-flash-vision-exp')
})

test('service-specific quantization and Prime specs do not leak to unrelated providers',()=>{
  const model={id:'glm-5.2-fast-preview'}
  assert.equal(modelCardSpecifications('bailian',model).context,'1M tokens')
  assert.equal(modelCardSpecifications('bailian',model).contextScope,'渠道')
  assert.equal(modelCardSpecifications('custom',model).context,'待确认')
})

test('channel-only windows keep native modality provenance and do not cross providers',()=>{
  const model={id:'deepseek-ocr'}
  const qianfan=modelCardSpecifications('qianfan',model)
  assert.equal(qianfan.inputScope,'原厂');assert.equal(qianfan.contextScope,'渠道')
  assert.equal(qianfan.context,'8K tokens')
  assert.ok(qianfan.sources.includes('https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j'))
  assert.equal(modelCardSpecifications('custom',model).context,'待确认')
  assert.equal(modelCardSpecifications('bailian',{id:'qwen3-omni-flash'}).context,'≈ 66K tokens')
  assert.equal(modelCardSpecifications('bailian',{id:'qwen3-omni-flash-2025-09-15'}).context,'待确认')
})

test('existing channel and manufacturer runtime limit semantics are preserved',()=>{
  const kimi=STATIC_MODEL_REGISTRY.tokendance.models.find(m=>m.id==='kimi-k3')
  assert.equal(modelSpecificationSummary(kimi).tokenSummary.value,1048576)
  const model=STATIC_MODEL_REGISTRY.replicate.models.find(m=>m.id==='google/gemini-3.5-flash')
  const summary=modelSpecificationSummary(model)
  assert.equal(summary.contextWindowTokens,undefined);assert.equal(summary.maxInputTokens,undefined)
  assert.equal(summary.input.audio,'unsupported');assert.equal(summary.input.video,'unsupported')
  assert.deepEqual(summary.tokenSummary,{kind:'input',value:1048576,origin:'manufacturer',approximate:false})
})

test('non-thinking declarations cannot invent a channel control or output limit',()=>{
  const summary=modelSpecificationSummary(STATIC_MODEL_REGISTRY.replicate.models.find(m=>m.id==='qwen/qwen3-235b-a22b-instruct-2507'))
  assert.equal(summary.reasoning,'unknown');assert.equal(summary.manufacturer.reasoning,'unsupported');assert.equal(summary.manufacturer.maxOutputTokens,undefined)
})

test('default generation and configuration capacity do not become runtime maxima',()=>{
  assert.equal(STATIC_MODEL_REGISTRY.kimi.models.find(m=>m.id==='kimi-k2.6').specifications.maxOutputTokens,undefined)
  const deepseek=STATIC_MODEL_REGISTRY.replicate.models.find(m=>m.id==='deepseek-ai/deepseek-v3.1')
  assert.equal(deepseek.specifications.manufacturer.contextWindowTokens,128000)
  assert.equal(deepseek.specifications.manufacturer.contextWindowApproximate,true)
  assert.equal(deepseek.specifications.maxOutputTokens,undefined)
})

test('modality icons distinguish known, missing and conditional published capabilities',()=>{
  assert.deepEqual(modalityIconStates('待确认').map(x=>x.state),['unknown','unknown','unknown','unknown'])
  const states=modalityIconStates('文本、图像、视频、文件（PDF）；音频（有限支持）')
  assert.equal(states.find(x=>x.id==='audio').state,'conditional')
  assert.equal(states.find(x=>x.id==='file').detail,'文件（PDF）')
  assert.equal(modalityIconStates('文本')[1].state,'unlisted')
  const {container}=render(React.createElement(ModelSpecifications,{provider:'custom',model:{id:'unknown'}}))
  assert.equal(container.querySelectorAll('.is-unknown').length,8)
  assert.equal(screen.getAllByRole('img',{name:'图像：待确认'}).length,2)
  assert.doesNotMatch(container.textContent,/（原厂）|（渠道）/)
})

test('new official specifications remain bound to exact IDs and channels',()=>{
  assert.equal(modelCardSpecifications('zhipu',{id:'glm-4v-flash'}).context,'16K tokens')
  assert.equal(modelCardSpecifications('zhipu',{id:'glm-4.1v-thinking-flash'}).context,'64K tokens')
  assert.equal(modelCardSpecifications('siliconflow',{id:'XingChenAGI/Xing4.0-29B'}).context,'256K tokens')
  assert.equal(modelCardSpecifications('runware',{id:'google:gemini@3.1-pro'}).context,'1M tokens')
  assert.equal(modelCardSpecifications('runware',{id:'google:gemini@3.1-pro'}).contextScope,'渠道')
  assert.equal(modelCardSpecifications('custom',{id:'google:gemini@3.1-pro'}).context,'待确认')
  assert.equal(modelCardName('deepseek',{id:'deepseek-v4-pro'}),'DeepSeek V4 Pro')
  assert.equal(modelCardName('tokendance',{id:'deepseek-v4-pro',label:'Preview'}),'Preview')
  assert.equal(modelCardSpecifications('sensenova',{id:'sensenova-6.8-flash-lite'}).context,'待确认')
})

test('brand assets exist locally and model branding follows the vendor rather than aggregator',()=>{
  for(const entry of Object.values(logos)) {
    assert.match(entry.src,/^\/brand\/catalog\/[a-z0-9-]+\.(svg|png|jpeg|jpg|ico|webp)$/)
    assert.ok(fs.existsSync(new URL('../public'+entry.src,import.meta.url)))
    assert.match(entry.source,/^https:\/\//)
  }
  for(const id of Object.keys(MODEL_CHANNEL_LABELS)) assert.ok(logos[{kimi:'moonshot',gemini:'google',xai:'spacexai'}[id]||id],id)
  for(const [provider,entry] of Object.entries(STATIC_MODEL_REGISTRY)) for(const model of entry.models) {
    const {vendorId}=presentRegistryModel(provider,model)
    if(vendorId!=='unconfirmed') assert.ok(logos[vendorId],vendorId)
  }
  const model=presentRegistryModel('tokendance',STATIC_MODEL_REGISTRY.tokendance.models.find(x=>x.id==='seedream-5.0-pro'))
  const {container}=render(React.createElement(ModelBrandLogo,{brand:model.vendorId}))
  assert.equal(container.querySelector('img').getAttribute('src'),logos.bytedance.src)
  assert.equal(container.querySelector('img').getAttribute('alt'),'')
})

test('image prompt limits remain in evidence without substituting for the card context window',()=>{
  const source='https://example.com/model/edit'
  const model={id:'specific-image',roles:['image'],capabilities:{maxPromptLength:500},specifications:{version:1,officialOutputModalities:['image'],sourceUrls:[source],promptLimits:[{kind:'editing',max:4096,unit:'bytes',sourceUrls:[source]}]}}
  const before=structuredClone(model)
  const data=modelCardSpecifications('custom',model)
  assert.deepEqual(data.limitRows,[{label:'编辑提示词上限',value:'4.096K 字节',sources:[source]}])
  const {container}=render(React.createElement(ModelSpecifications,{provider:'custom',model}))
  assert.ok(screen.getByText('上下文窗口'));assert.ok(screen.getByText('待确认'));assert.equal(screen.queryByText('编辑提示词上限'),null);assert.equal(screen.queryByText('生图提示词上限'),null)
  assert.doesNotMatch(container.textContent,/tokens/);assert.deepEqual(model,before)
  model.specifications.contextWindowTokens=128000
  assert.deepEqual(modelCardSpecifications('custom',model).limitRows,[{label:'上下文窗口',value:'128K tokens',sources:[]}])
})

test('prompt limits need a valid exact-model source; text models and examples cannot acquire image limits',()=>{
  const model={id:'unknown',specifications:{version:1,officialOutputModalities:['image'],sourceUrls:['https://example.com/model'],promptLimits:[{kind:'generation',max:32000,unit:'characters',sourceUrls:['javascript:alert(1)']},{kind:'editing',max:1000,unit:'words',sourceUrls:['https://example.com/model']}]}}
  assert.equal(modelCardSpecifications('custom',model).limitRows[0].label,'上下文窗口')
  model.specifications.promptLimits=[{kind:'generation',max:32000,unit:'characters',sourceUrls:['https://example.com/generate']},{kind:'editing',max:16000,unit:'characters',sourceUrls:['https://example.com/edit']}]
  const data=modelCardSpecifications('custom',model)
  assert.equal(data.limitRows.length,2);assert.equal(data.limitRows[1].value,'16K 字符');assert.ok(data.sources.includes('https://example.com/edit'))
  model.specifications.officialOutputModalities=['text']
  assert.equal(modelCardSpecifications('custom',model).limitRows[0].label,'上下文窗口')
})

test('specific channel pages preserve partial modalities and served context',()=>{
 const source='https://fireworks.ai/models/fireworks/exact-model'
 const model={id:'exact-model',specificModelSpecifications:{sourceScope:'service',officialInputModalities:['text','image'],modalitiesComplete:false,contextWindowTokens:512000,sourceUrls:[source]}}
 const card=modelCardSpecifications('fireworks',model)
 assert.equal(card.input,'文本、图像；其他模态待确认');assert.equal(card.inputScope,'渠道')
 assert.equal(card.context,'512K tokens');assert.equal(card.output,'待确认')
 model.specificModelSpecifications.sourceScope='manufacturer'
 model.specifications={version:1,contextWindowTokens:1048576,sourceUrls:['https://provider.example/model/exact-model']}
 assert.equal(modelCardSpecifications('fireworks',model).context,'≈ 1M tokens')
 model.specificModelSpecifications.sourceScope='service'
 assert.equal(modelCardSpecifications('fireworks',model).context,'512K tokens')
})
test('verified alias display keeps request identity and newer prompt limits win',()=>{
 const model={id:'mimo-v2.5',label:'MiMo V2.5',specificModelSpecifications:{resolvedModel:{modelId:'mimo-v2.6-flash',displayName:'MiMo V2.6 Flash（mimo-v2.5 别名）',sourceUrls:['https://mimo.mi.com/docs/en-US/updates/deprecate']}}}
 assert.match(modelCardName('xiaomi',model),/V2.6 Flash/);assert.equal(model.id,'mimo-v2.5')
 const image={id:'new-prompt-test',specificModelSpecifications:{officialOutputModalities:['image'],sourceUrls:['https://example.com/model'],promptLimits:[{kind:'generation',max:1300,unit:'tokens',sourceUrls:['https://example.com/model/api']}]},specifications:{version:1,sourceUrls:['https://example.com/catalog'],promptLimits:[{kind:'generation',max:800,unit:'characters',sourceUrls:['https://example.com/legacy']}]}}
 assert.equal(modelCardSpecifications('bailian',image).limitRows[0].value,'1.3K tokens')
})

test('context rounds for display while image prompt limits keep exact decimal values and units',()=>{
  const source='https://example.com/model'
  for(const [max,expected,context] of [[1,'0.001K','1'],[800,'0.8K','800'],[1000,'1K','1K'],[4096,'4.096K','≈ 4K'],[262144,'262.144K','≈ 262K'],[999999,'999.999K','≈ 1M'],[1000000,'1M','1M'],[1000001,'1.000001M','≈ 1M'],[1048576,'1.048576M','≈ 1M'],[1500000,'1.5M','1.5M'],[10000000,'10M','10M']]) {
    const text={id:'decimal-text',specifications:{version:1,contextWindowTokens:max,sourceUrls:[source]}}
    assert.equal(modelCardSpecifications('custom',text).context,`${context} tokens`)
    assert.equal(text.specifications.contextWindowTokens,max)
    text.specifications.contextWindowApproximate=true
    assert.equal(modelCardSpecifications('custom',text).context,`≈ ${context.replace(/^≈ /,'')} tokens`)
    for(const [unit,label] of [['characters','字符'],['bytes','字节'],['tokens','tokens']]) {
      const image={id:'decimal-image',specifications:{version:1,officialOutputModalities:['image'],sourceUrls:[source],promptLimits:['generation','editing'].map(kind=>({kind,max,unit,sourceUrls:[source]}))}}
      const before=structuredClone(image)
      const rows=modelCardSpecifications('custom',image).limitRows
      assert.deepEqual(rows.map(row=>row.label),['生图提示词上限','编辑提示词上限'])
      assert.deepEqual(rows.map(row=>row.value),[`${expected} ${label}`,`${expected} ${label}`])
      assert.deepEqual(image,before)
    }
  }
})

test('reviewed context strings normalize decimal prefixes without dropping published conditions',()=>{
  assert.equal(modelCardSpecifications('custom',{id:'xqwen14bchat'}).context,'≈ 131K（需 YaRN） tokens')
  assert.equal(modelCardSpecifications('custom',{id:'THUDM/GLM-4-9B-0414'}).context,'128K（需 YaRN；原生 32K） tokens')
  assert.equal(modelCardSpecifications('custom',{id:'xsparkx2'}).context,'192K tokens')
})
