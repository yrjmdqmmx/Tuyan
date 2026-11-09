const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { loadComponent } = require('./helpers/component.cjs')
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js')
const { normalizeModelRegistry, partitionRegistryModels } = require('../miniprogram/utils/model-registry.js')
for (const cause of ['empty', 'timeout', 'all_invalid', 'missing']) test(`R14 compiled mini ${cause}: channel retained, only confirmed absence hidden, paused selection blocked`, () => {
  const providers = structuredClone(STATIC_MODEL_REGISTRY)
  providers.openrouter = structuredClone(providers.openai)
  const original = providers.tokendance.models.find(m => m.id === 'qwen3.8-flash')
  const model = {...original, selectable:false, catalogPresence:{status:cause === 'missing' ? 'absent' : 'unverified',cause,checkedAt:null}, disabledReason:cause === 'missing' ? '当前目录未列出该模型' : '当前目录暂时无法确认该模型，已暂停调用；请稍后刷新目录。'}
  providers.tokendance = {...providers.tokendance, models:[model], defaults:{main:model.id,image:'',vision:model.id}}
  const wire = {registryVersion:'r14',routeContractVersion:1,supportsModelRoutes:true,providers}
  const before = JSON.stringify(wire), registry = normalizeModelRegistry(wire)
  assert.deepEqual(registry.providers.tokendance.models[0].catalogPresence, model.catalogPresence)
  const partition = partitionRegistryModels(registry.providers.tokendance.models, {role:'main'})
  assert.equal(partition.compatible.length,0)
  assert.equal(partition.incompatible.length,cause === 'missing' ? 0 : 1)
  const p = loadComponent('components/model-picker/model-picker.js', {}).instance
  p.getRegistry = () => registry
  Object.assign(p.properties,{role:'main',outputFormat:'svg',selectedProvider:'tokendance',selectedModel:model.id})
  p.resetFlow()
  assert.ok(p.data.providerCards.some(row => row.id === 'tokendance'))
  if(cause !== 'missing') {
    p.selectProvider({currentTarget:{dataset:{provider:'tokendance'}}})
    p.selectVendor({currentTarget:{dataset:{vendor:p.data.vendorCards[0].vendor}}})
    const card=p.data.visibleCompatibleModels[0]
    assert.equal(card.id,model.id);assert.equal(card.disabled,true);assert.match(card.disabledReason,/暂时无法确认/)
    p.triggerEvent = () => assert.fail('paused selection must never emit a change')
    p.choose({currentTarget:{dataset:{model:model.id}}})
    assert.equal(p.properties.selectedModel,model.id)
  }
  assert.equal(JSON.stringify(wire),before)
})
test('R14 mini paused cards bind both muted style and disabled button while retaining source links',()=>{
  const wxml=fs.readFileSync(new URL('../miniprogram/components/model-picker/model-picker.wxml',`file://${__filename}`),'utf8')
  const css=fs.readFileSync(new URL('../miniprogram/components/model-picker/model-picker.wxss',`file://${__filename}`),'utf8')
  assert.match(wxml,/item.disabled \? 'is-paused'/);assert.match(wxml,/disabled="{{item.disabled}}"/);assert.match(wxml,/{{item.disabledReason}}/)
  assert.match(css,/\.model-row\.is-paused\s*{\s*opacity:\s*\.55/)
})

const absentIds = require('../../../test-support/tokendance-absent-r17.json')
for (const mode of ['empty','timeout','snapshot']) test(`R17 compiled mini Core-fed ${mode}: seven audited absences hidden and 65 cards retained`,async()=>{
  const {tokenDanceTestRuntime}=await import('../../../test-support/tokendance-runtime-r17.mjs')
  const runtime=await tokenDanceTestRuntime(mode)
  try {
    const response=await runtime.invoke({action:'modelRegistry',provider:'tokendance'})
    const providers=structuredClone(STATIC_MODEL_REGISTRY)
    providers.openrouter=structuredClone(providers.openai)
    providers.tokendance=response.providers.tokendance
    const wire={...response,providers},before=JSON.stringify(wire)
    const registry=normalizeModelRegistry(wire),models=registry.providers.tokendance.models
    assert.equal(models.length,74)
    const visible=new Map()
    for(const role of ['main','image','vision']){
      const partition=partitionRegistryModels(models,{role})
      for(const model of [...partition.compatible,...partition.incompatible])visible.set(model.id,model)
      if(mode!=='snapshot')assert.equal(partition.compatible.length,0)
    }
    for(const id of absentIds)assert.equal(visible.has(id),false,id)
    assert.equal(visible.size,65)
    for(const model of visible.values()){
      assert.equal(model.catalogPresence.status,mode==='snapshot'?'listed':'unverified')
      assert.equal(model.selectable,mode==='snapshot')
      if(mode!=='snapshot')assert.match(model.disabledReason,/暂时无法确认/)
    }
    assert.equal(JSON.stringify(wire),before)
    assert.equal(runtime.providerCalls.length,0)
    assert.equal(runtime.tokenDanceCalls.length,0)
  }finally{await runtime.close()}
})
