import test,{afterEach}from'node:test'
import assert from'node:assert/strict'
import React from'react'
import{render,screen,within,fireEvent,cleanup}from'@testing-library/react'
import{STATIC_MODEL_REGISTRY}from'../src/lib/staticModelCatalog.js'
import{auditedModelSpecs,auditedModelLifecycle}from'../src/lib/modelAudit.js'
import{modelCardSpecifications}from'../src/lib/modelCardSpecifications.js'
import{ModelSpecifications,ModelLifecycleBadge}from'../src/components/ModelSpecifications.jsx'
import{WorkspaceModelConfig}from'../src/workspace/WorkspaceModelPanels.jsx'
import{newDraft}from'../src/workspace/workspaceState.js'
const notice='https://www.aliyun.com/notice/118728',spec='https://help.aliyun.com/zh/model-studio/qwen3-5-plus'
const ids=['qwen3.5-plus','qwen3.5-plus-2026-02-15','qwen3.5-plus-2026-04-20']
afterEach(cleanup)
test('R25 I5 all 1064 Web cards: every displayed retirement badge opens a non-excluded source',()=>{
 let cards=0,badges=0
 for(const[p,e]of Object.entries(STATIC_MODEL_REGISTRY))for(const m of e.models){
  cards++;const audit=auditedModelSpecs(p,m.id),lifecycle=auditedModelLifecycle(p,m.id,Date.parse('2026-11-10'))
  render(React.createElement(ModelLifecycleBadge,{provider:p,modelId:m.id,lifecycle}))
  const badge=screen.queryByRole('button',{name:/^(?:将下线|已下线)/})
  if(badge){badges++;fireEvent.click(badge);const links=within(screen.getByRole('dialog')).getAllByRole('link');assert.equal(links.length,1)
   const url=links[0].getAttribute('href');assert.match(url,/^https:\/\//);assert.ok(!audit.excludedSources.includes(url),p+'/'+m.id)
   if(p==='bailian'&&ids.includes(m.id)){assert.equal(url,notice);assert.match(screen.getByRole('dialog').textContent,/2027-01-19/)}
  }else assert.ok(!lifecycle||!lifecycle.sourceUrl||audit.excludedSources.includes(lifecycle.sourceUrl))
  cleanup()
 }
 assert.equal(cards,1064);assert.equal(badges,7)
})
test('R25 I5 all three Bailian cards separate specification and retirement sources and use colon dates',()=>{
 for(const id of ids){
  const model=STATIC_MODEL_REGISTRY.bailian.models.find(m=>m.id===id),data=modelCardSpecifications('bailian',model)
  assert.equal(data.lifecycle.sourceUrl,notice);assert.equal(data.lifecycle.stopDate,'2027-01-19')
  for(const fact of Object.values(data.fields))assert.equal(fact.sourceUrl,spec)
  render(React.createElement(ModelSpecifications,{provider:'bailian',model}));fireEvent.click(screen.getByRole('button',{name:/^输入模态/}))
  const dialog=screen.getByRole('dialog');assert.equal(within(dialog).getByRole('link',{name:'下线公告 · 百炼 · 部分 Qwen3.5 系列旧版本模型下线通知'}).getAttribute('href'),notice)
  assert.ok(within(dialog).getAllByRole('link').some(a=>a.getAttribute('href')===spec))
  assert.match(dialog.textContent,/核实日期：2026-11-09/);assert.match(dialog.textContent,/上下文窗口核实日期：2026-11-10/)
  assert.doesNotMatch(dialog.textContent,/日期\s+\d{4}-\d{2}-\d{2}/);cleanup()
 }
})
test('R25 I5 a missing or excluded source suppresses the badge instead of opening an empty notice',()=>{
 for(const sourceUrl of [null,'https://help.aliyun.com/zh/model-studio/model-depreciation']){
  render(React.createElement(ModelLifecycleBadge,{provider:'qianfan',modelId:'qwen-image-edit',lifecycle:{state:'scheduled',stopDate:'2027-01-19',sourceUrl}}))
  assert.equal(screen.queryByRole('button',{name:/将下线|已下线/}),null);cleanup()
 }
})

test('R25 I5 saved role badges open the same sourced retirement dialog',()=>{
 const models={ready:true,busy:false,registryStatus:'ready',summary:{},registry:{providers:STATIC_MODEL_REGISTRY},library:{connections:[{id:'c',provider:'bailian',label:'连接',scope:'browser',hasCredential:true}],models:[{id:'m',connectionId:'c',modelId:'qwen3.5-plus'}]}}
 const draft=newDraft();draft.settings.simple.models={main:{libraryModelId:'m',connectionId:'c',accessProvider:'bailian',modelId:'qwen3.5-plus'}}
 render(React.createElement(WorkspaceModelConfig,{models,draft,path:'svg',onChange:()=>assert.fail('Opening evidence must not change selection')}))
 fireEvent.click(screen.getByRole('button',{name:/^将下线/}))
 const dialog=screen.getByRole('dialog');assert.match(dialog.textContent,/2027-01-19/);assert.equal(within(dialog).getByRole('link').getAttribute('href'),notice)
})
