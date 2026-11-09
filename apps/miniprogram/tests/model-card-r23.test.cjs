const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm')
const {createRequire}=require('node:module')
const {STATIC_MODEL_REGISTRY}=require('../miniprogram/utils/static-model-catalog.js')
const {auditedModelSpecs}=require('../miniprogram/utils/model-audit.js')
const filename=require.resolve('../miniprogram/components/model-picker/model-picker.js')
let definition,modal,clipboard
const context={Component(value){definition=value},exports:{},require:createRequire(filename),wx:{showModal(value){modal=value},setClipboardData(value){clipboard=value.data}}}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})

test('R23 all 1064 compiled Mini cards link vendor fields and expose no machine source in rows or copy dialogs',async t=>{
 const {isApiSource}=await import('../../../packages/api/src/model-card-sources.mjs')
 const {sourceIdentity}=await import('../../../packages/api/src/card-presentation.mjs')
 const {productBundle}=await import('../../../test-support/execution-capability.mjs')
 const web=await productBundle(`export {modelCardSpecifications} from './apps/web/src/lib/modelCardSpecifications.js'; export {STATIC_MODEL_REGISTRY} from './apps/web/src/lib/staticModelCatalog.js'`)
 const offending=[],apiLinks=[];let cards=0,vendorFields=0
 const template=fs.readFileSync(filename.replace(/\.js$/,'.wxml'),'utf8')
 assert.match(template,/wx:for="\{\{item.specSources\}\}"[^>]*data-url="\{\{source.url\}\}"[^>]*catchtap="copySource"/)
 for(const [channel,provider] of Object.entries(STATIC_MODEL_REGISTRY))for(const model of provider.models){
  const key=channel+'/'+model.id,card=context.present(model,'','',channel),audit=auditedModelSpecs(channel,model.id)
  const expected=web.modelCardSpecifications(channel,web.STATIC_MODEL_REGISTRY[channel].models.find(m=>m.id===model.id))
  const vendorKeys=new Set(expected.vendorSources.map(sourceIdentity))
  for(const [i,field]of Object.keys(expected.fields).entries())if(card.specRows[i].origin==='源自原厂'){
   vendorFields++;const fact=expected.fields[field],urls=(fact.sourceUrls||[fact.sourceUrl]).filter(Boolean).map(sourceIdentity)
   if(!card.specSources.some(s=>(s.role==='vendor'||s.label.startsWith('原厂规格 · '))&&vendorKeys.has(sourceIdentity(s.url))&&urls.includes(sourceIdentity(s.url))))offending.push(key+'/'+field)
  }
  for(const url of [audit.sourceUrl,...audit.sourceUrls,...audit.vendorSources,...card.specSources.map(s=>s.url)].filter(Boolean))if(isApiSource(url))apiLinks.push(key+': '+url)
  for(const source of card.specSources){
   definition.methods.copySource({currentTarget:{dataset:{url:source.url,source:source.label,notice:card.auditMessage}}})
   assert.ok(modal.content.includes(source.label));assert.equal(modal.confirmText,'复制链接');modal.success({confirm:true});assert.equal(clipboard,source.url)
  }
  if(key==='stability/sd3.5-flash')assert.equal(card.specSources[0].url,'https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post')
  cards++
 }
 assert.equal(cards,1064);assert.ok(vendorFields>20);assert.deepEqual(offending,[]);assert.deepEqual(apiLinks,[])
 t.diagnostic(JSON.stringify({cards,vendorFields,offendingCards:new Set(offending).size,visibleApiLinks:apiLinks.length}))
})
