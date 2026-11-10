const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {loadComponent}=require('./helpers/component.cjs')
test('R30 all 1064 compiled Mini cards and source dialogs use plain statuses, published/absent numeric values and model-page primaries',async()=>{
 const {imageInputPresentations}=await import('../../../test-support/image-input-r27.mjs')
 const {assertPMDecisions,forbiddenBody}=await import('../../../test-support/pm-decisions-r30.mjs')
 const rows=await imageInputPresentations();assertPMDecisions(rows)
 let modal;const {instance}=loadComponent('components/model-picker/model-picker.js',{}, {wx:{showModal:v=>{modal=v}}})
 for(const[key,row]of Object.entries(rows))for(const source of row.mini.card.specSources){
  instance.copySource({currentTarget:{dataset:{url:source.url,source:source.label,notice:row.mini.card.auditMessage}}})
  assert.doesNotMatch(modal.content,forbiddenBody,key);assert.ok(modal.content.endsWith(source.label),key)
 }
 const {numericStatus}=require('../miniprogram/utils/card-presentation.js')
 assert.equal(numericStatus('unknown'),'未公布');assert.equal(numericStatus('unsupported'),'不支持');assert.equal(numericStatus('not-applicable'),'不适用')
 const markup=fs.readFileSync(__dirname+'/../miniprogram/components/model-picker/model-picker.wxml','utf8')
 assert.match(markup,/data-notice="\{\{item.retirementMessage\}\}"/)
})
