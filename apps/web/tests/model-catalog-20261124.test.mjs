import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,cleanup} from '@testing-library/react'
import {ModelLifecycleBadge,ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import {STATIC_MODEL_REGISTRY as catalog} from '../src/lib/staticModelCatalog.js'
import {modelCardSpecifications} from '../src/lib/modelCardSpecifications.js'
import {auditedModelLifecycle,removedModel} from '../src/lib/modelAudit.js'
import {modelOption} from '../src/workspace/workspaceModels.js'

test('Gemini forwarding cards retain their request IDs across the provider switch', t => {
  t.after(cleanup)
  for (const now of ['2026-11-30T23:59:59+08:00','2026-12-01T00:00:00+08:00']) {
    t.mock.method(Date,'now',() => Date.parse(now))
    for (const [id,target] of [['gemini-2.5-pro','gemini-3.8-flash'],['gemini-2.5-flash','gemini-3.5-flash-lite']]) {
      const model = catalog.gemini.models.find(m => m.id === id)
      assert.equal(model.selectable,true)
      assert.equal(removedModel('gemini',id),null)
      assert.equal(auditedModelLifecycle('gemini',id),null)
      const view = render(React.createElement(ModelSpecifications,{provider:'gemini',model}))
      const notice = view.container.querySelector('.model-routing-notice')
      assert.ok(notice.textContent.includes(target))
      assert.match(notice.textContent,/2026-12-01.*计费/)
      assert.equal(notice.querySelector('a').href,'https://ai.google.dev/gemini-api/docs/deprecations')
      view.unmount()
    }
  }
})

test('the dated Gemini retirement badge follows the Shanghai cutoff', t => {
  t.after(cleanup)
  const id = 'gemini-3.1-flash-lite'
  const stop = Date.parse('2027-05-07T00:00:00+08:00')
  const clock = t.mock.method(Date,'now',() => stop-1)
  const view = render(React.createElement(ModelLifecycleBadge,{provider:'gemini',modelId:id,lifecycle:auditedModelLifecycle('gemini',id)}))
  assert.equal(view.getByRole('button').textContent,'将下线 2027-05-07')
  clock.mock.mockImplementation(() => stop)
  assert.equal(auditedModelLifecycle('gemini',id),null)
  assert.equal(removedModel('gemini',id).sourceUrl,'https://ai.google.dev/gemini-api/docs/deprecations')
})

test('new catalog cards expose adapter inputs and sourced output limits', () => {
  for (const [provider,id,input,output,context,max] of [
    ['zhipu','glm-5.3-flashx-legal',['text','image'],['text'],1000000,128000],
    ...['flare','sunburst'].map(v => ['fal',`openai/gpt-image-2.6/${v}/text-to-image`,['text'],['image'],null,null]),
  ]) {
    const model = catalog[provider].models.find(m => m.id===id)
    assert.equal(model.selectable,true)
    const card = modelCardSpecifications(provider,model)
    assert.deepEqual(card.fields.inputModalities.value,input)
    assert.deepEqual(card.fields.outputModalities.value,output)
    assert.equal(card.fields.totalContextTokens.value,context)
    assert.equal(card.fields.maxOutputTokens.value,max)
    assert.equal(card.sources[0],model.officialSourceUrl)
    if (provider==='fal') assert.deepEqual([card.context,card.maxOutput],['不适用','不适用'])
  }
})

test('Ark Seed 2.0 Pro remains selectable on November 25 with the corrected January 22 badge', t => {
  t.after(cleanup)
  const id = 'doubao-seed-2-0-pro-260215'
  const clock = t.mock.method(Date, 'now', () => Date.parse('2026-11-25T10:00:00+08:00'))
  const lifecycle = auditedModelLifecycle('ark', id)
  const model = catalog.ark.models.find(row => row.id === id)
  assert.equal(model.selectable, true)
  assert.equal(model.expirationAt, '2027-01-22T14:00:00+08:00')
  assert.equal(removedModel('ark', id), null)
  const view = render(React.createElement(ModelLifecycleBadge, {provider:'ark', modelId:id, lifecycle}))
  assert.equal(view.getByRole('button').textContent, '将下线 2027-01-22')
  clock.mock.mockImplementation(() => Date.parse(model.expirationAt) - 1)
  assert.equal(removedModel('ark', id), null)
  clock.mock.mockImplementation(() => Date.parse(model.expirationAt))
  assert.equal(removedModel('ark', id).stopDate, model.expirationAt)
})

test('Qianfan DeepSeek Flash 0731 is selectable on November 25 and retired on December 5', t => {
  t.after(cleanup)
  const provider = 'qianfan', id = 'deepseek-v4-flash-0731'
  const entry = {id:'saved', connectionId:'c', modelId:id}
  const library = {connections:[{id:'c', provider, hasCredential:true}], models:[entry]}
  const option = () => modelOption(entry, library, {providers:catalog}, 'main', 'svg')
  const clock = t.mock.method(Date, 'now', () => Date.parse('2026-11-25T10:00:00+08:00'))
  assert.equal(option().reason, '')
  const lifecycle = auditedModelLifecycle(provider, id)
  assert.equal(lifecycle.replacement, 'deepseek-v4.1-flash-1017')
  const view = render(React.createElement(ModelLifecycleBadge, {provider, modelId:id, lifecycle}))
  assert.equal(view.getByRole('button').textContent, '将下线 2026-12-04')
  clock.mock.mockImplementation(() => Date.parse('2026-12-05T10:00:00+08:00'))
  assert.equal(auditedModelLifecycle(provider, id), null)
  assert.match(option().reason, /原型号已不可用，请重新选择/)
  assert.equal(removedModel(provider, id).replacementApiId, lifecycle.replacement)
})
