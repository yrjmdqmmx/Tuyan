const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {loadComponent}=require('./helpers/component.cjs')
test('R29 I11 all 1064 Mini cards: accessible text equals tap status, Web parity and no obsolete labels',async()=>{
 const {imageInputPresentations}=await import('../../../test-support/image-input-r27.mjs')
 const {assertAllSentences,obsoleteStatus}=await import('../../../test-support/status-sentences-r29.mjs')
 const rows=await imageInputPresentations();assertAllSentences(rows)
 const wxml=fs.readFileSync(__dirname+'/../miniprogram/components/model-picker/model-picker.wxml','utf8')
 assert.match(wxml,/aria-label="\{\{icon.accessibleLabel\}\}"/)
 assert.match(wxml,/data-detail="\{\{icon.tooltip\}\}" catchtap="showModality"/)
 assert.doesNotMatch(wxml,obsoleteStatus)
 let modal;const {instance}=loadComponent('components/model-picker/model-picker.js',{}, {wx:{showModal:value=>{modal=value}}})
 for(const [key,row]of Object.entries(rows))for(const spec of row.mini.card.specRows.slice(0,2))for(const icon of spec.icons){
  instance.showModality({currentTarget:{dataset:{label:spec.label+' · '+icon.accessibleLabel,detail:icon.tooltip}}})
  assert.equal(modal.content,icon.accessibleLabel,key)
  assert.doesNotMatch(modal.content,obsoleteStatus,key)
 }
})
