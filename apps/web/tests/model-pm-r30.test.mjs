import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,fireEvent,cleanup} from '@testing-library/react'
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {imageInputPresentations} from '../../../test-support/image-input-r27.mjs'
import {assertPMDecisions,forbiddenBody} from '../../../test-support/pm-decisions-r30.mjs'
test('R30 all 1064 rendered dialogs omit verification/provenance rows, preserve source-hover dates and match Mini numeric absence',async()=>{
 const rows=await imageInputPresentations();assertPMDecisions(rows)
 let unknown=0
 for(const [provider,entry]of Object.entries(STATIC_MODEL_REGISTRY))for(const model of entry.models){
  const key=provider+'/'+model.id,row=rows[key]
  try{
   const ui=render(React.createElement(ModelSpecifications,{provider,model}))
   assert.equal(ui.container.querySelector('.model-spec-sources a')?.getAttribute('href'),row.web.sources[0]?.url,key)
   const limits=[...ui.container.querySelectorAll('.model-specs dd')].slice(2)
   for(const [i,value]of [row.web.data.context,row.web.data.maxOutput].entries()){
    assert.ok(limits[i].textContent.startsWith(value),key)
    if(value==='未公布'){unknown++;assert.doesNotMatch(limits[i].textContent,/暂不支持|未知|∞|^0/)}
   }
   fireEvent.click(ui.container.querySelector('.model-modality-trigger'))
   const dialog=document.querySelector('.model-evidence-dialog')
   assert.doesNotMatch(dialog.textContent,forbiddenBody,key)
   assert.doesNotMatch(dialog.querySelector('.tw-preserve-text').textContent,/源自原厂/,key)
   assert.equal(dialog.querySelector('.tw-preserve-text').textContent,row.mini.card.auditMessage,key+' Web/Mini dialog parity')
   for(const link of dialog.querySelectorAll('a.model-evidence-source'))if(row.web.data.checkedAt)assert.ok(link.title.endsWith('（核实日期：'+row.web.data.checkedAt+'）'),key)
  }finally{cleanup()}
 }
 assert.equal(unknown,584)
})
