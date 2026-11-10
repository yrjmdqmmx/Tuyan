const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs')
const {loadComponent}=require('./helpers/component.cjs')
const {modalityIconStates}=require('../miniprogram/utils/card-presentation.js')
test('R27 I8 all 1064 compiled Mini cards use one solid grey non-supported glyph and exact modal distinctions',async()=>{
 const {imageInputPresentations,review}=await import('../../../test-support/image-input-r27.mjs')
 const {expectedR28}=await import('../../../test-support/founder-fixes-r28.mjs')
 const root=__dirname+'/../miniprogram/components/model-picker/',wxml=fs.readFileSync(root+'model-picker.wxml','utf8'),css=fs.readFileSync(root+'model-picker.wxss','utf8')
 // Exact shipped template: the state only selects the wrapper class; the sole child depends on modality ID.
 assert.match(wxml,/class="modality-icon is-\{\{icon.state\}\}" data-state="\{\{icon.state\}\}" aria-role="button" aria-label="\{\{icon.accessibleLabel\}\}" data-label="\{\{spec.label\}\} · \{\{icon.accessibleLabel\}\}" data-detail="\{\{icon.tooltip\}\}" catchtap="showModality"><view class="modality-glyph glyph-\{\{icon.id\}\}" aria-hidden="true"\/><\/view>/)
 assert.doesNotMatch(wxml+css,/modality-strike|modality-question|stroke-dasharray|dashed|icon.state ===|::(?:before|after)/)
 const stateRules=[...css.matchAll(/([^{}]*\.modality-icon\.is-[^{}]*)\{([^{}]*)\}/g)]
 assert.equal(stateRules.length,1);assert.equal(stateRules[0][2],'color:#68786d')
 assert.deepEqual(stateRules[0][1].trim().split(',').sort(),['unknown','unlisted','unsupported'].map(s=>'.modality-icon.is-'+s).sort())
 assert.match(css,/\.modality-icon\{[^}]*color:#213b2f/)
 assert.match(css,/\.modality-glyph\{[^}]*background:currentColor/)
 let modal
 const {instance,events}=loadComponent('components/model-picker/model-picker.js',{}, {wx:{showModal:value=>{modal=value}}})
 const now=await imageInputPresentations();let cards=0,decisionA=0
 for(const [key,row] of Object.entries(now)){
  row.mini.card.specRows.slice(0,2).forEach((spec,index)=>spec.icons.forEach((icon,j)=>{
   const before=expectedR28[key].mini
   assert.deepEqual(icon,before.card.specRows[index].icons[j],key)
   assert.match(icon.accessibleLabel,/^(文本|图像|视频|音频)：(支持|暂不支持|未标注 · .+)$/)
   assert.match(css,new RegExp('\\.glyph-'+icon.id+'\\{'))
   instance.showModality({currentTarget:{dataset:{label:spec.label+' · '+icon.accessibleLabel,detail:icon.tooltip}}})
   assert.equal(modal.title,spec.label+' · '+icon.accessibleLabel);assert.equal(modal.content,icon.tooltip)
  }))
  if(review.reviews[key]){
   const image=row.mini.card.specRows[0].icons.find(i=>i.id==='image')
   assert.equal(image.state,'supported');assert.equal(image.accessibleLabel,'图像：支持');decisionA++
  }
  cards++
 }
 assert.equal(cards,1064);assert.equal(decisionA,15);assert.equal(events.length,0)
 const vendor=modalityIconStates('',{state:'unsupported',provenance:'vendor',sourceUrl:'https://example.com/spec',verifiedAt:'2026-11-09'})
 for(const icon of vendor)assert.equal(icon.tooltip,'原厂资料标明不支持。原厂资料 · Example · Spec（2026-11-09）')
 const legacy=modalityIconStates('文本、音频（有限支持）')
 assert.equal(legacy[1].accessibleLabel,'图像：未标注 · 暂无官方资料');assert.equal(legacy[3].accessibleLabel,'音频：支持')
 assert.equal(legacy[3].tooltip,'支持（条件：音频（有限支持）） · 暂无官方资料')
 for(const icon of [...vendor,...legacy]){
  instance.showModality({currentTarget:{dataset:{label:icon.accessibleLabel,detail:icon.tooltip}}})
  assert.equal(modal.content,icon.tooltip)
 }
})
