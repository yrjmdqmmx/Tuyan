import { sourceTitle } from '../../../packages/api/src/card-presentation.mjs'
import test, {afterEach, beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import {render, screen, within, fireEvent, cleanup} from '@testing-library/react'
import {STATIC_MODEL_REGISTRY} from '../src/lib/staticModelCatalog.js'
import {modelCardSpecifications} from '../src/lib/modelCardSpecifications.js'
import {ModelSpecifications, ModelLifecycleBadge} from '../src/components/ModelSpecifications.jsx'
import {auditedModelLifecycle} from '../src/lib/modelAudit.js'
import WorkspaceModelCatalog from '../src/workspace/WorkspaceModelCatalog.jsx'
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx'

beforeEach(t => t.mock.method(Date, 'now', () => Date.parse('2026-11-09')))
afterEach(cleanup)
const fixture = (provider, ids) => ({
  registry:{providers:STATIC_MODEL_REGISTRY}, ready:true, busy:false, registryStatus:'ready',
  library:{connections:[{id:'connection-123456789',provider,label:'团队连接',hasCredential:true}],
    models:ids.map((modelId,i)=>({id:`m${i}`,connectionId:'connection-123456789',modelId}))},
  save:async()=>assert.fail('Viewing and cancelling must not save'),
})

test('R6B 4: all nine qualified windows put tokens before the qualifier, retaining R6A values', () => {
  const rows=Object.entries(STATIC_MODEL_REGISTRY).flatMap(([provider,p])=>p.models.map(model=>({provider,model,card:modelCardSpecifications(provider,model)})))
    .filter(({card})=>card.fields.totalContextTokens.suffix)
  assert.equal(rows.length,9)
  assert.deepEqual(rows.reduce((counts,{provider})=>({...counts,[provider]:(counts[provider]||0)+1}),{}),{siliconflow:6,runware:2,iflytek:1})
  for(const {provider,model,card} of rows) {
    const view=render(React.createElement(ModelSpecifications,{provider,model}))
    const row=screen.getByText('上下文窗口').parentElement
    assert.match(row.querySelector('dd').textContent,/ tokens（[^）]+）$/)
    assert.equal(row.querySelector('dd').title,card.contextExact)
    if(provider==='runware') assert.equal(card.context,'≈ 33K tokens（默认）')
    else assert.match(card.context,/^(≈ 131K tokens（需 YaRN）|128K tokens（需 YaRN；原生 32K）)$/)
    view.unmount()
  }
})

test('R6B 6: unknown modalities use muted icons without question badges and output has a distinct icon', () => {
  const {container}=render(React.createElement(ModelSpecifications,{provider:'custom',model:{id:'unknown'}}))
  assert.equal(screen.getAllByRole('img',{name:/：未知$/}).length,8)
  assert.equal(container.querySelectorAll('.model-modality-icon.is-unknown > svg').length,8)
  assert.equal(container.querySelectorAll('sup').length,0)
  const context=screen.getByText('上下文窗口').querySelector('svg')
  const output=screen.getByText('最大输出').querySelector('svg')
  assert.ok(context.classList.contains('lucide-scan-text'))
  assert.ok(output.classList.contains('lucide-text-cursor-input'))
})

test('R6B 7/8: one or multiple removed notices suppress empty states and use short recommendations and secondary actions', () => {
  for(const ids of [['mimo-v2.5'],['mimo-v2.5','mimo-v2.5-pro']]) {
    const models=fixture('xiaomi',ids), before=structuredClone(models.library)
    const {container,unmount}=render(React.createElement(WorkspaceModelCatalog,{models,mode:'library'}))
    const notice=container.querySelector('.tw-info')
    if(ids.length>1) { assert.equal(notice.querySelector('summary').textContent,'2 个已保存型号已不可用'); fireEvent.click(notice.querySelector('summary')); notice.open=true }
    assert.deepEqual([...notice.querySelectorAll(ids.length > 1 ? 'p' : ':scope > span')].map(p=>p.textContent), ['MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash','MiMo-v2.5-pro：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Pro'].slice(0,ids.length))
    assert.equal(container.querySelector('.tw-catalog-empty'),null)
    assert.equal(screen.queryByText('清除筛选'),null)
    fireEvent.change(screen.getByRole('textbox',{name:'搜索已添加模型'}),{target:{value:'no-match'}})
    assert.equal(container.querySelector('.tw-catalog-empty'),null)
    const button=within(notice).getAllByRole('button',{name:'改选'})[0]
    assert.ok(button.classList.contains('tw-secondary'))
    fireEvent.click(button)
    const dialog=screen.getByRole('dialog',{name:'确认切换模型'})
    assert.match(dialog.textContent,/MiMo-V2.6-Flash/)
    assert.doesNotMatch(dialog.textContent,/mimo-v2.6-flash/)
    fireEvent.click(within(dialog).getByRole('button',{name:'取消'}))
    assert.deepEqual(models.library,before)
    unmount()
  }
})

test('R6B 8: picker helper and confirmation use the same short name without exposing the replacement API path', () => {
  const models=fixture('fireworks',['accounts/fireworks/models/glm-5p2'])
  render(React.createElement(WorkspaceModelPicker,{models,role:'main',path:'svg',current:{libraryModelId:'m0',connectionId:'connection-123456789',accessProvider:'fireworks',modelId:'accounts/fireworks/models/glm-5p2'}}))
  assert.equal(screen.getByRole('status').firstChild.textContent,'GLM 5.2：原型号已不可用，请重新选择。推荐：GLM 5.3')
  fireEvent.click(screen.getByRole('button',{name:'改选'}))
  assert.match(screen.getByRole('dialog').textContent,/GLM 5.3/)
  assert.doesNotMatch(screen.getByRole('dialog').textContent,/accounts\/fireworks\/models\/glm-5p3/)
})

test('R6B 9: touch evidence and deprecation sheets use content height and named domains', t => {
  const matchMedia=window.matchMedia
  window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}})
  t.after(()=>{window.matchMedia=matchMedia})
  const style=document.createElement('style')
  style.textContent='.tw-dialog { min-height:45dvh; }\n'+fs.readFileSync(new URL('../src/components/ModelSpecifications.css',import.meta.url),'utf8')
  document.head.append(style)
  try {
    const provider='antling', model=STATIC_MODEL_REGISTRY.antling.models.find(m=>m.id==='Ling-2.6-flash')
    for(const source of [true,false]) {
      const view=render(source ? React.createElement(ModelSpecifications,{provider,model}) : React.createElement(ModelLifecycleBadge,{lifecycle:auditedModelLifecycle(provider,model.id)}))
      fireEvent.click(source ? screen.getByRole('link') : screen.getByRole('button',{name:/将下线：/}))
      const dialog=screen.getByRole('dialog')
      assert.equal(window.getComputedStyle(dialog).minHeight,'0px')
      assert.equal(window.getComputedStyle(dialog).height,'auto')
      for(const link of within(dialog).getAllByRole('link')) {
        assert.match(link.textContent,/^(下线公告|官方文档|原厂规格) · /)
        assert.ok(link.textContent.endsWith(sourceTitle(link.href)))
      }
      assert.doesNotMatch(dialog.textContent,/https:\/\//)
      view.unmount()
    }
  } finally {style.remove()}
})

test('R6B 10: full title and connection ID are available on hover while card metadata stays on one row', () => {
  const models=fixture('bailian',['qwen3.5-plus-2026-04-20'])
  const {container}=render(React.createElement(WorkspaceModelCatalog,{models,mode:'library'}))
  const title=container.querySelector('h3'), subtitle=container.querySelector('.tw-catalog-card-head p')
  assert.equal(title.title,title.textContent)
  assert.match(title.title,/2026-04-20/)
  assert.match(subtitle.textContent,/团队连接/)
  assert.ok(!subtitle.textContent.includes('connection-123456789'))
  assert.ok(subtitle.title.includes('connection-123456789'))
  const style=document.createElement('style')
  style.textContent=fs.readFileSync(new URL('../src/workspace/workspaceModels.css',import.meta.url),'utf8')
  document.head.append(style)
  try {
    assert.equal(window.getComputedStyle(container.querySelector('.tw-catalog-grid')).alignItems,'start')
    assert.equal(window.getComputedStyle(container.querySelector('.tw-catalog-card-meta')).flexWrap,'nowrap')
    assert.equal(window.getComputedStyle(title).whiteSpace,'normal')
    assert.equal(window.getComputedStyle(title).getPropertyValue('-webkit-line-clamp'),'2')
  } finally {style.remove()}
})
