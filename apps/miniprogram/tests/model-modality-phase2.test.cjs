const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { auditedModelSpecs } = require('../miniprogram/utils/model-audit.js')
const { normalizeModelRegistry } = require('../miniprogram/utils/model-registry.js')
test('phase 2 compiled Mini retains every table/mask and uses full live projections before static fallback', async t => {
  t.mock.method(Date,'now',()=>Date.parse('2026-11-09T12:00:00Z'))
  const { assertPhase2Facts, phase2Registry } = await import('../../../test-support/phase2-modality.mjs')
  assertPhase2Facts(key => {const slash=key.indexOf('/');return auditedModelSpecs(key.slice(0,slash),key.slice(slash+1))},true)
  const raw = await phase2Registry()
  assert.equal(raw.providers.openrouter, undefined)
  assert.throws(()=>normalizeModelRegistry({...raw,unavailableProviders:{}}),/五个 API 渠道/)
  const { readExecutionFixture } = await import('../../../test-support/execution-capability.mjs')
  const registry = normalizeModelRegistry({...raw, providers: {...raw.providers, openrouter: readExecutionFixture().core.openrouter}})
  const filename = require.resolve('../miniprogram/components/model-picker/model-picker.js')
  const context = {Component(){},exports:{},require:createRequire(filename)}
  vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})
  let count=0
  for (const [channel,provider] of Object.entries(registry.providers)) for (const model of provider.models) {
    if (channel === 'openrouter') continue // Offline filler satisfies the required-provider contract; all 1,061 live projections remain checked.
    const card=context.present(model,'','',channel)
    assert.equal(card.specSources[0]?.url,model.cardSpecifications.sourceUrl || undefined)
    for (const [i,field] of ['inputModalities','outputModalities'].entries()) {
      const fact=model.cardSpecifications.fields[field], row=card.specRows[i]
      assert.equal(row.unknown,fact.state==='unknown')
      for (const value of fact.value || []) if (typeof value==='string') assert.ok(row.value.includes({text:'文本',image:'图像',audio:'音频',video:'视频',file:'文件',document:'文件'}[value]))
    }
    count++
  }
  assert.equal(count,1061)
})


test('Mini rejects each missing required provider even when unavailableProviders explains it', async () => {
  const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
  const { readExecutionFixture } = await import('../../../test-support/execution-capability.mjs')
  const complete = {...STATIC_MODEL_REGISTRY, openrouter:readExecutionFixture().core.openrouter}
  assert.doesNotThrow(() => normalizeModelRegistry({registryVersion:'offline', routeContractVersion:1, supportsModelRoutes:true, providers:complete}))
  for (const id of ['gemini', 'openai', 'bailian', 'ark', 'openrouter']) {
    const providers = {...complete}
    delete providers[id]
    assert.throws(() => normalizeModelRegistry({registryVersion:'offline', routeContractVersion:1, supportsModelRoutes:true,
      providers, unavailableProviders:{[id]:'offline fixture'}}), {message:'服务端模型目录必须包含五个 API 渠道。'}, id)
  }
})
