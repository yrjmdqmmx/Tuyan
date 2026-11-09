import test,{afterEach}from'node:test'
import assert from'node:assert/strict'
import React from'react'
import{render,screen,within,fireEvent,cleanup}from'@testing-library/react'
import{STATIC_MODEL_REGISTRY}from'../src/lib/staticModelCatalog.js'
import{modelCardSpecifications}from'../src/lib/modelCardSpecifications.js'
import{modelSourceRows,isApiSource}from'../src/lib/modelCardSources.js'
import{auditedModelLifecycle}from'../src/lib/modelAudit.js'
import{ModelSpecifications,ModelLifecycleBadge}from'../src/components/ModelSpecifications.jsx'
import{assertQwenEvidence,scanRetirementSpecs,specUrl,retirementUrl,rejectedUrl,inheritanceNote,specLabel,retirementLabel}from'../../../test-support/evidence-i4-r24.mjs'
afterEach(cleanup)
test('R24 I4 Web renders exact vendor max output, inheritance/date and separate channel retirement evidence',()=>{
 const provider='tokendance',model=STATIC_MODEL_REGISTRY[provider].models.find(m=>m.id==='qwen3.5-plus'),card=modelCardSpecifications(provider,model)
 assertQwenEvidence(card);assert.equal(card.maxOutputExact,'65,536 tokens');assert.equal(isApiSource(retirementUrl),false)
 assert.deepEqual(modelSourceRows(card).slice(1),[{url:specUrl,label:specLabel},{url:retirementUrl,label:retirementLabel}]);assert.ok(!card.sources.includes(rejectedUrl))
 render(React.createElement(ModelSpecifications,{provider,model}));fireEvent.click(screen.getByRole('button',{name:/^输入模态/}))
 const dialog=screen.getByRole('dialog');assert.ok(dialog.textContent.includes(inheritanceNote));assert.match(dialog.textContent,/最大输出核实日期 2026-11-10/);assert.match(dialog.textContent,/65,536 tokens/)
 for(const[url,label]of[[specUrl,specLabel],[retirementUrl,retirementLabel]])assert.equal(within(dialog).getByRole('link',{name:label}).getAttribute('href'),url)
 assert.ok(!dialog.innerHTML.includes(rejectedUrl))
})
test('R24 I4 Web scans every card: retirement spec citations need exact recorded model/value quotes',t=>{
 const cards=[]
 for(const[p,e]of Object.entries(STATIC_MODEL_REGISTRY))for(const m of e.models){const c=modelCardSpecifications(p,m);cards.push({key:p+'/'+m.id,fields:c.fields,rows:modelSourceRows(c)})}
 t.diagnostic(JSON.stringify(scanRetirementSpecs(cards)))
 for(const key of ['qianfan/qwen-image-edit','siliconflow/Qwen/Qwen-Image-Edit']){
  const[p,...id]=key.split('/'),c=modelCardSpecifications(p,{id:id.join('/')})
  for(const f of ['totalContextTokens','maxOutputTokens'])assert.deepEqual([c.fields[f].state,c.fields[f].value,c.fields[f].sourceUrl],['unknown',null,null])
  assert.equal(c.context,'未知');assert.equal(c.maxOutput,'未知');assert.ok(!c.sources.includes(rejectedUrl))
 }
})

test('R24 I4 actual lifecycle badges omit unsupported Bailian links without changing cutoff dates',()=>{
 for(const modelId of ['qwen3.5-plus','qwen3.5-plus-2026-02-15','qwen3.5-plus-2026-04-20']){
  const lifecycle=auditedModelLifecycle('bailian',modelId,Date.parse('2026-11-10'))
  assert.equal(lifecycle.stopDate,'2027-01-19')
  render(React.createElement(ModelLifecycleBadge,{provider:'bailian',modelId,lifecycle}))
  fireEvent.click(screen.getByRole('button',{name:/^将下线/}))
  const dialog=screen.getByRole('dialog');assert.match(dialog.textContent,/2027-01-19/);assert.equal(within(dialog).queryAllByRole('link').length,0)
  cleanup()
 }
})
