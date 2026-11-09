import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertPhase2Facts, phase2Registry, evidence } from '../../../test-support/phase2-modality.mjs'
import { modelCardSpecifications, resolveCardModel } from '../src/lib/modelCardSpecifications.js'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { libraryRows, catalogRows } from '../src/workspace/WorkspaceModelCatalog.jsx'
import { modelOption } from '../src/workspace/workspaceModels.js'
import { modalityIconStates } from '../src/lib/modelModalityIcons.js'

test('phase 2 full Core objects, saved IDs, library rows, picker options and Mini live projections agree for every card', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09T12:00:00Z'))
  const registry = await phase2Registry(), byKey = new Map()
  const require = createRequire(import.meta.url)
  const { normalizeModelRegistry } = require('../../miniprogram/miniprogram/utils/model-registry.js')
  const mini = normalizeModelRegistry(registry)
  let count = 0, differences = 0
  for (const [channel, provider] of Object.entries(registry.providers)) for (const model of provider.models) {
    const key = channel + '/' + model.id, card = modelCardSpecifications(channel, model)
    byKey.set(key, card)
    assert.deepEqual(resolveCardModel(channel, {id:model.id}, registry), model)
    assert.deepEqual(modelCardSpecifications(channel, {id:model.id}, registry), card, key + '/saved-ID')
    assert.deepEqual(model.cardSpecifications.fields, card.fields, key + '/Core projection')
    assert.equal(model.cardSpecifications.sourceUrl, card.sources[0] || null, key)
    const normalized = mini.providers[channel].models.find(row => row.id === model.id)
    assert.deepEqual(normalized.cardSpecifications, model.cardSpecifications, key + '/Mini full object')
    const offline = modelCardSpecifications(channel, {id:model.id})
    const view = value => ({source:value.sources[0],icons:['inputModalities','outputModalities'].map(field => modalityIconStates(null, value.fields[field]).map(({id,state})=>[id,state]))})
    if (JSON.stringify(view(offline)) !== JSON.stringify(view(card))) differences++
    const library = {connections:[{id:'connection',provider:channel,hasCredential:true}],models:[{id:'saved',connectionId:'connection',modelId:model.id}]}
    const option = modelOption(library.models[0], library, registry, model.roles[0] || 'main', 'svg', false)
    assert.equal(option.model, model, key + '/picker option preserves full object')
    for (const row of libraryRows(library, registry)) assert.deepEqual(modelCardSpecifications(channel,row.model).fields,card.fields,key+'/library')
    count++
  }
  assert.equal(count, 1061)
  assert.equal(differences, 0, 'full vs ID resolution: first link and all modality icons')
  for (const row of catalogRows(registry)) assert.deepEqual(modelCardSpecifications(row.provider,row.model).fields,byKey.get(row.provider+'/'+row.model.id).fields)
  assertPhase2Facts(key => byKey.get(key))
  for (const [key, reviews] of Object.entries(evidence.reviews)) {
    const channel = key.split('/')[0], id = key.slice(channel.length+1), model = registry.providers[channel].models.find(row=>row.id===id)
    const html = renderToStaticMarkup(React.createElement(ModelSpecifications,{provider:channel,model}))
    for (const [field, row] of Object.entries(reviews)) for (const [id, state] of Object.entries(row.decisions)) if (id !== 'file') {
      const label = {text:'文本',image:'图像',audio:'音频',video:'视频'}[id]
      assert.ok(html.includes(`aria-label="${label}：${state === 'supported' ? '支持' : '未知'}"`),key+'/'+field+'/'+id)
    }
  }
})
