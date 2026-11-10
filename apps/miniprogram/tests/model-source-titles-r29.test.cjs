const test=require('node:test'),assert=require('node:assert/strict')
const {loadComponent}=require('./helpers/component.cjs')
test('R29 all 1064 compiled Mini cards: footer/copy, modality and retirement dialogs share one URL title with Web',async()=>{
  const {currentTitlePresentations}=await import('../../../test-support/source-title-report-r29.mjs')
  const {sourceSurfaces,assertUnifiedTitles}=await import('../../../test-support/source-titles-r29.mjs')
  const rows=await currentTitlePresentations();let modal
  const {instance}=loadComponent('components/model-picker/model-picker.js',{}, {wx:{showModal:value=>{modal=value}}})
  for(const [key,row]of Object.entries(rows)){
    for(const source of [...row.mini.card.specSources,...(row.mini.card.scheduled?[row.mini.card.retirementSource]:[])].filter(Boolean)){
      instance.copySource({currentTarget:{dataset:{url:source.url,source:source.label,notice:row.mini.card.auditMessage}}})
      assert.equal(modal.content.split('\n').at(-1),source.label,key)
    }
    for(const spec of row.mini.card.specRows)for(const icon of spec.icons){
      instance.showModality({currentTarget:{dataset:{label:icon.accessibleLabel,detail:icon.tooltip}}})
      assert.equal(modal.title,icon.accessibleLabel,key);assert.equal(modal.content,icon.tooltip,key)
    }
  }
  assertUnifiedTitles(sourceSurfaces(rows))
})
test('R29 Mini/Web locale files and UI references contain no conditional-support labels',async()=>{
  const {assertNoConditionalLabels}=await import('../../../test-support/conditional-labels-r29.mjs');assertNoConditionalLabels()
})
