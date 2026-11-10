const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module')
const filename=require.resolve('../miniprogram/components/model-picker/model-picker.js')
let modal,definition
const context={Component(v){definition=v},exports:{},require:createRequire(filename),wx:{showModal(v){modal=v}}}
vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})
test('R28 all fal field titles match Web in compiled Mini tap dialogs and source copies',async()=>{
 const {imageInputPresentations}=await import('../../../test-support/image-input-r27.mjs')
 const review=require('../../../config/channel-audit/review-r28-20261110.json'),now=await imageInputPresentations()
 for(const row of review.fields){
  const card=now[row.identity],index=row.field==='inputModalities'?0:1
  const icons=card.mini.card.specRows[index].icons,web=index?card.web.outputIcons:card.web.inputIcons
  assert.deepEqual(icons,web,row.identity)
  for(const icon of icons){
   definition.methods.showModality({currentTarget:{dataset:{label:icon.accessibleLabel,detail:icon.tooltip}}})
   assert.equal(modal.content,web.find(i=>i.id===icon.id).tooltip)
   assert.doesNotMatch(modal.content,/渠道资料 · API · 模型列表|有条件支持/)
  }
  const source=card.mini.card.specSources.find(s=>s.url===row.sourceUrl)
  assert.ok(source,row.identity);assert.deepEqual(source,card.web.sources.find(s=>s.url===row.sourceUrl))
 }
})
test('R28 compiled Mini custom conditional uses dark 支持 with its full condition in the tap dialog; catalog text stays plain',()=>{
 const unknown={state:'unknown',value:null,provenance:null,sourceUrl:null}
 const model={id:'conditional',label:'Conditional',roles:['main'],cardSpecifications:{fields:{inputModalities:{state:'known',value:['text','audio'],displayValue:'文本、音频（需开启音频模式）',provenance:'channel',sourceUrl:'https://api.fal.ai/v1/models'},outputModalities:unknown,totalContextTokens:unknown,maxOutputTokens:unknown}}}
 const card=context.present(model,'','','custom'),audio=card.specRows[0].icons[3]
 assert.equal(audio.state,'conditional');assert.equal(audio.accessibleLabel,'支持音频输入（需开启音频模式）')
 assert.equal(audio.tooltip,'支持音频输入（需开启音频模式）')
 const css=fs.readFileSync(filename.replace(/\.js$/,'.wxss'),'utf8')
 assert.match(css,/\.modality-icon\{[^}]*color:#213b2f/);assert.doesNotMatch(css,/\.is-conditional/)
 definition.methods.showModality({currentTarget:{dataset:{label:audio.accessibleLabel,detail:audio.tooltip}}})
 assert.equal(modal.title,'支持音频输入（需开启音频模式）');assert.equal(modal.content,audio.tooltip)
 assert.ok(card.specSources.every(s=>s.url!=='https://api.fal.ai/v1/models'))
})
