const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
const {createRequire}=require('node:module')
const {auditedModelSpecs}=require('../miniprogram/utils/model-audit.js')
const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js')
const {displayModalities,sourceTitle}=require('../miniprogram/utils/card-presentation.js')
const filename=require.resolve('../miniprogram/components/model-picker/model-picker.js')
const context={Component(){},exports:{},require:createRequire(filename)}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})
test('R22B Mini uses only verified TokenDance pages and preserves seven main fallbacks',async()=>{
 const {assertReviewedLinks,expectedTokenDanceSources}=await import('../../../test-support/card-review-r22.mjs')
 assertReviewedLinks(id=>auditedModelSpecs('tokendance',id))
 for(const model of STATIC_MODEL_REGISTRY.tokendance.models){const card=context.present(model,'','','tokendance');assert.equal(card.specSources[0].url,expectedTokenDanceSources(model.id)[0])}
})
test('R22B Mini keeps distinct page titles and unique source rows for all 1064 cards',()=>{
 let count=0
 for(const [channel,provider] of Object.entries(STATIC_MODEL_REGISTRY))for(const model of provider.models){const rows=context.present(model,'','',channel).specSources;assert.equal(new Set(rows.map(r=>r.url)).size,rows.length);assert.equal(new Set(rows.map(r=>r.label)).size,rows.length);count++}
 assert.equal(count,1064)
 const card=context.present(STATIC_MODEL_REGISTRY.bailian.models.find(m=>m.id==='deepseek-v4.1-flash'),'','','bailian')
 assert.equal(card.specSources[0].label,'官方文档 · 百炼 · DeepSeek-V4.1-Flash')
 assert.equal(sourceTitle('https://help.aliyun.com/zh/model-studio/models'),'百炼 · 模型列表')
})
test('R22B compiled Mini sorts display copies and labels every vendor limit visibly without promoting vision roles',()=>{
 const template=fs.readFileSync(require('node:path').join(require('node:path').dirname(filename),'model-picker.wxml'),'utf8')
 assert.match(template, /<text wx:if="\{\{spec\.origin\}\}" class="card-note"> · \{\{spec\.origin\}\}<\/text>/)
 assert.match(template, /<text wx:if="\{\{!item\.specSources\.length\}\}" class="card-note">官方文档待确认<\/text>/)
 const raw=['audio','video','text','image','file'];assert.deepEqual(displayModalities(raw),['text','image','video','audio','file']);assert.deepEqual(raw,['audio','video','text','image','file'])
 let fields=0
 for(const model of STATIC_MODEL_REGISTRY.tokendance.models){const audit=auditedModelSpecs('tokendance',model.id),card=context.present(model,'','','tokendance');Object.values(audit.fields).forEach((fact,i)=>{if(fact.provenance==='vendor'&&fact.state==='known'){assert.equal(card.specRows[i].origin,'源自原厂');fields++}})
 if(model.id==='qwen3.6-plus'){assert.equal(card.specRows[3].origin,'源自原厂');assert.equal(card.specRows[3].value,'≈ 66K tokens');assert.equal(card.specRows[0].unsupportedText,'图像、视频、音频')}
 if(model.id==='kimi-k3.1-pro'){assert.equal(card.specRows[0].value,'文本、图像、视频');assert.ok(!card.capabilityText.includes('视觉理解'));assert.deepEqual(model.roles,['main'])}}
 assert.equal(fields,20)
})
