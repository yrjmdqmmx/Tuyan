import {expectedHumanRows} from '../../../test-support/source-links-i3-r24.mjs'
import test,{afterEach} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {render,screen,within,fireEvent,cleanup} from '@testing-library/react'
import {ModelSpecifications,ModelLifecycleBadge} from '../src/components/ModelSpecifications.jsx'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {modelCardSpecifications} from '../src/lib/modelCardSpecifications.js'
import {modalityIconStates} from '../../../packages/api/src/modality-presentation.mjs'
import {titleIssues,dialogIssues,reviewBaseline} from '../../../test-support/source-titles-r24.mjs'
afterEach(cleanup)

test('R24 I2 all 1064 Web evidence dialogs and seven notices have readable styled links and clean copy',t=>{
 const css=fs.readFileSync(new URL('../src/components/ModelSpecifications.css',import.meta.url),'utf8')
 assert.match(css,/\.tw-dialog\.model-evidence-dialog a\.model-evidence-source\s*\{[^}]*color: var\(--accent, #267f68\)/)
 assert.match(css,/\.tw-dialog\.model-evidence-dialog a\.model-evidence-source:focus-visible\s*\{[^}]*outline: 2px solid var\(--accent, #267f68\)/)
 assert.match(css,/\.tw-dialog\.model-evidence-dialog a\.model-evidence-source:hover\s*\{[^}]*text-decoration/)
 assert.match(css,/\.tw-dialog\.model-evidence-dialog a\.model-evidence-source\s*\{[^}]*white-space: normal; overflow-wrap: anywhere/)
 const style=document.createElement('style');style.textContent=css;document.head.append(style)
 let cards=0,rows=0,notices=0
 try {
  for(const [provider,entry] of Object.entries(STATIC_MODEL_REGISTRY))for(const model of entry.models) {
   const card=provider+'/'+model.id,old=reviewBaseline.web.find(c=>c.card===card)
   const {container}=render(React.createElement(ModelSpecifications,{provider,model}))
   for(const icon of container.querySelectorAll('.model-modality-icon'))assert.deepEqual(dialogIssues(icon.title),[],card)
   const footer=container.querySelector('.model-spec-sources a')
   fireEvent.click(screen.getByRole('button',{name:/^输入模态/}))
   const dialog=screen.getByRole('dialog'),links=within(dialog).queryAllByRole('link')
   assert.deepEqual(dialogIssues(dialog.querySelector('.tw-preserve-text').textContent),[],card)
   assert.deepEqual(links.map(a=>a.getAttribute('href')),expectedHumanRows(old.rows,card,'web').map(r=>r.url),card)
   assert.equal(new Set(links.map(a=>a.textContent)).size,links.length,card)
   for(const link of links) {
    assert.ok(link.classList.contains('model-evidence-source'),card)
    assert.ok(link.querySelector('svg.lucide-external-link[aria-hidden="true"]'),card)
    assert.deepEqual(titleIssues({url:link.href,label:link.textContent},old.name,model.id),[],card)
    // jsdom retains var() when it cannot resolve custom properties; both selectors
    // must still compute the identical existing accent expression, never black.
    assert.equal(getComputedStyle(link).color,getComputedStyle(footer).color,card)
    assert.notEqual(getComputedStyle(link).color,'rgb(0, 0, 0)',card)
    assert.equal(getComputedStyle(link).overflowWrap,'anywhere')
    rows++
   }
   cleanup();cards++
   const lifecycle=modelCardSpecifications(provider,model).lifecycle
   if(lifecycle?.state==='scheduled' && lifecycle.sourceUrl) {
    render(React.createElement(ModelLifecycleBadge,{provider,lifecycle}))
    fireEvent.click(screen.getByRole('button'))
    const link=within(screen.getByRole('dialog')).getByRole('link')
    assert.ok(link.classList.contains('model-evidence-source'))
    assert.ok(link.querySelector('svg.lucide-external-link'))
    assert.deepEqual(titleIssues({url:link.href,label:link.textContent}),[])
    assert.deepEqual(dialogIssues(screen.getByRole('dialog').querySelector('p').textContent),[])
    cleanup();notices++
   }
  }
 }finally{style.remove()}
 assert.equal(cards,1064);assert.equal(rows,2452);assert.equal(notices,7)
 t.diagnostic(JSON.stringify({cards,rows,notices,titleFindings:0,copyFindings:0}))
})

test('R24 I2 unknown modality keeps available source; absence stays unknown with no source claim',()=>{
 const states=modalityIconStates('',{state:'known',value:['text'],provenance:'vendor',sourceUrl:'https://api-docs.deepseek.com/news/news260424',verifiedAt:'2026-11-09'})
 assert.equal(states[1].state,'unknown');assert.equal(states[1].tooltip,'原厂资料 · DeepSeek · 更新日志 2026-04-24（2026-11-09）')
 assert.equal(modalityIconStates('',{state:'unknown',provenance:null})[1].tooltip,'暂无官方资料')
})
