import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,fireEvent,cleanup} from '@testing-library/react'
import {ModelSpecifications,ModelLifecycleBadge} from '../src/components/ModelSpecifications.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {currentTitlePresentations} from '../../../test-support/source-title-report-r29.mjs'
import {sourceSurfaces,assertUnifiedTitles,attributionTitle} from '../../../test-support/source-titles-r29.mjs'
import {assertNoConditionalLabels} from '../../../test-support/conditional-labels-r29.mjs'
test('R29 all 1064 rendered cards: footer, field/dialog, links and retirement sources have exactly one title per URL',async()=>{
  const rows=await currentTitlePresentations()
  for(const [provider,entry]of Object.entries(STATIC_MODEL_REGISTRY))for(const model of entry.models){
    const key=provider+'/'+model.id,row=rows[key]
    try{
      const ui=render(React.createElement(ModelSpecifications,{provider,model}))
      const footer=ui.container.querySelector('.model-spec-sources a')
      if(footer)assert.equal(footer.textContent,row.web.sources[0].label,key)
      const icons=[...ui.container.querySelectorAll('.model-modality-icon')]
      for(const [i,expected]of [...row.web.inputIcons,...row.web.outputIcons].entries()){
        assert.equal(icons[i].title,expected.tooltip,key)
        assert.equal(icons[i].getAttribute('aria-label'),expected.accessibleLabel,key)
      }
      fireEvent.click(ui.container.querySelector('.model-modality-trigger'))
      const dialog=document.querySelector('.model-evidence-dialog')
      const links=[...dialog.querySelectorAll('a')].map(a=>({url:a.getAttribute('href'),label:a.textContent}))
      assert.deepEqual(links,row.web.sources,key)
      for(const [i,icon]of icons.entries()){
        const fact=i<row.web.inputIcons.length?row.web.data.inputFact:row.web.data.outputFact
        const title=attributionTitle(icon.title,['unknown','unlisted'].includes(icon.dataset.state)?null:fact.verifiedAt)
        if(title)assert.ok(dialog.textContent.includes(title),key+' dialog lost/changed field title '+title)
      }
      cleanup()
      if(row.web.noticeSource){
        render(React.createElement(ModelLifecycleBadge,{provider,modelId:model.id,lifecycle:row.web.data.lifecycle}))
        fireEvent.click(document.querySelector('[role="button"]'))
        const a=document.querySelector('.model-evidence-dialog a')
        assert.deepEqual({url:a.getAttribute('href'),label:a.textContent},row.web.noticeSource,key)
      }
    }finally{cleanup()}
  }
  assertUnifiedTitles(sourceSurfaces(rows))
})
test('R29 Web and Mini locales and UI references contain no conditional-support labels',()=>assertNoConditionalLabels())
