import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {render,cleanup} from '@testing-library/react'
import {ModelLifecycleBadge,ModelSpecifications} from '../src/components/ModelSpecifications.jsx'
import {STATIC_MODEL_REGISTRY as catalog} from '../src/lib/staticModelCatalog.js'
import {modelCardSpecifications} from '../src/lib/modelCardSpecifications.js'
import {auditedModelLifecycle,removedModel} from '../src/lib/modelAudit.js'

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
