import test, {afterEach} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import WorkspaceModelCatalog, {catalogRows} from '../src/workspace/WorkspaceModelCatalog.jsx'
import ModelPicker from '../src/components/ModelPicker.jsx'
import {ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import {modelMissingFromCatalog} from '../src/lib/modelRegistry.js'
import absentIds from '../../../test-support/tokendance-absent-r17.json' with { type: 'json' }
afterEach(cleanup)
const id='qwen3.8-flash'
for (const mode of ['empty','timeout','missing','all_invalid']) test(`R14 Web Core-fed ${mode}: visible paused cards, channel retained and saved selection unchanged`,async()=>{
  const runtime=await createRefineRuntime({startServer:false,tokenDanceCatalogMode:mode==='missing'||mode==='all_invalid'?'snapshot':mode})
  try {
    if(mode==='missing'||mode==='all_invalid')runtime.legacy.configureRuntimeFetch(async()=>Response.json({data:mode==='missing'?[{id:'other',supported_protocols:['openai:chat-completions']}]:[null]}))
    const registry=await runtime.invoke({action:'modelRegistry',provider:'tokendance'})
    assert.equal(catalogRows(registry).length,mode==='missing'?0:65, 'two expired MiMo cards and seven audited absences remain hidden on failure')
    const visibleIds=catalogRows(registry).map(row=>row.model.id)
    for(const absentId of absentIds) assert.equal(visibleIds.includes(absentId),false,absentId)
    if(mode!=='missing') for(const row of catalogRows(registry)) {
      assert.equal(row.model.selectable,false)
      assert.equal(row.model.catalogPresence.status,'unverified')
      assert.match(row.model.disabledReason,/暂时无法确认/)
    }
    const model=registry.providers.tokendance.models.find(m=>m.id===id)
    registry.providers.tokendance.models=[model]
    assert.equal(model.catalogPresence.status,mode==='missing'?'absent':'unverified')
    const library={connections:[{id:'saved',provider:'tokendance',label:'保留连接'}],models:[{id:'selected',connectionId:'saved',modelId:id}]},before=JSON.stringify(library)
    const models={registry,library,ready:true,registryStatus:'ready',save:()=>assert.fail('viewing must not save')}
    const view=render(React.createElement(WorkspaceModelCatalog,{models}))
    assert.ok(within(screen.getByRole('complementary',{name:'模型渠道筛选'})).getByRole('button',{name:/观猹 TokenDance/}))
    if(mode==='missing')assert.equal(screen.queryAllByRole('article').length,0)
    else {
      assert.ok(screen.getByRole('article').classList.contains('is-paused'))
      assert.equal(screen.getByRole('button',{name:/^添加 /}).disabled,true)
      assert.match(screen.getByText('暂时无法确认').title,/暂时无法确认/)
    }
    view.unmount()
    const route={accessProvider:'tokendance',modelId:id},routeBefore=JSON.stringify(route)
    const picker=render(React.createElement(ModelPicker,{label:'测试模型',role:'main',registry,route,onRouteChange:()=>assert.fail('paused model cannot be selected')}))
    fireEvent.click(screen.getByRole('button',{name:'测试模型',exact:true}))
    assert.ok(screen.getByRole('button',{name:'观猹 TokenDance',exact:true}))
    const select=screen.queryByRole('button',{name:/^选择 Qwen/})
    if(mode==='missing')assert.equal(select,null)
    else { assert.ok(select);assert.equal(select.disabled,true);fireEvent.click(select) }
    assert.equal(JSON.stringify(route),routeBefore)
    assert.equal(JSON.stringify(library),before)
    picker.unmount()
  } finally {await runtime.close()}
})
test('R14 absence never depends on disabledReason wording and requires healthy evidence for omitted identities',()=>{
  for(const disabledReason of ['当前目录未列出该模型','当前渠道的完整公开目录已不再提供此精确型号','任意提示']) {
    const model={id:'fixture',selectable:false,disabledReason},registry={providers:{tokendance:{models:[model]}}}
    assert.equal(modelMissingFromCatalog(registry,'tokendance',model),false)
    assert.equal(modelMissingFromCatalog(registry,'tokendance',{...model,catalogPresence:{status:'absent'}}),true)
    assert.equal(modelMissingFromCatalog(registry,'tokendance','other'),false)
    registry.catalogHealth={tokendance:{state:'ready'}}
    assert.equal(modelMissingFromCatalog(registry,'tokendance','other'),true)
    registry.catalogHealth.tokendance={state:'unavailable',cause:'timeout',issues:[{id:'fixture',reason:'missing_live'}]}
    assert.equal(modelMissingFromCatalog(registry,'tokendance',{...model,catalogPresence:{status:'unverified'}}),false)
  }
})
test('R14 compact source keeps its full domain and URL while R16 prevents letter wrapping',()=>{
  render(React.createElement(ModelSpecifications,{provider:'replicate',model:{id:'google/imagen-3'},compactSources:true}))
  assert.match(screen.getByRole('link').textContent,/docs\.cloud\.google\.com$/)
  const css=fs.readFileSync(new URL('../src/workspace/workspaceModels.css',import.meta.url),'utf8')
  const link=screen.getByRole('link'),domain=link.querySelector('.model-spec-source-domain')
  assert.equal(domain.textContent,'docs.cloud.google.com')
  assert.equal(domain.title,link.href)
  assert.match(css,/\.model-spec-footer\s*{[^}]*flex-wrap:wrap;/)
  assert.doesNotMatch(css,/\.model-spec-sources[^{}]*\{[^}]*(?:overflow-wrap:anywhere|word-break:break-all|white-space:normal)/)
  assert.match(css,/\.tw-catalog-card\.is-paused\s*{\s*opacity:\s*\.6/)
})

test('R17 healthy TokenDance snapshot still hides exactly audited absences and expired MiMo cards',async()=>{
  const runtime=await createRefineRuntime({startServer:false,tokenDanceCatalogMode:'snapshot'})
  try {
    const registry=await runtime.invoke({action:'modelRegistry',provider:'tokendance'})
    const visible=catalogRows(registry)
    assert.equal(visible.length,65)
    assert.ok(visible.every(row=>row.model.selectable && row.model.catalogPresence.status==='listed'))
    for(const id of absentIds)assert.equal(visible.some(row=>row.model.id===id),false,id)
  } finally {await runtime.close()}
})
