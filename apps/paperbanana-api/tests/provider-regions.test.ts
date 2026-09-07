import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeProviderRegions, selectRegionApiKeys, regionApiKeySlot, registryForRegions } from '../../../packages/types/src/provider-regions.js'

test('MiniMax credentials remain isolated across region changes, including legacy keys and cleared keys',()=>{
 const keys={minimax:'legacy-global','minimax:cn':'china-fixture',openai:'openai-fixture'}
 assert.deepEqual(selectRegionApiKeys(keys,{minimax:'global'}),{minimax:'legacy-global',openai:'openai-fixture'})
 assert.deepEqual(selectRegionApiKeys(keys,{minimax:'cn'}),{minimax:'china-fixture',openai:'openai-fixture'})
 assert.equal(selectRegionApiKeys({minimax:'legacy-global'},{minimax:'cn'}).minimax,'')
 assert.equal(selectRegionApiKeys({...keys,'minimax:global':''}).minimax,'')
 assert.equal(regionApiKeySlot('minimax',{minimax:'cn'}),'minimax:cn')
 assert.equal(regionApiKeySlot('openai',{minimax:'cn'}),'openai')
 assert.deepEqual(keys,{minimax:'legacy-global','minimax:cn':'china-fixture',openai:'openai-fixture'})
})
test('MiniMax region metadata filters both clients without mutating the shared catalog',()=>{
 const registry={providers:{minimax:{models:[{id:'image-01',regions:['global','cn']},{id:'image-01-live',regions:['cn']}]}}}
 assert.deepEqual(registryForRegions(registry,{minimax:'cn'})?.providers.minimax.models.map((m:any)=>m.id),['image-01','image-01-live'])
 assert.deepEqual(registryForRegions(registry)?.providers.minimax.models.map((m:any)=>m.id),['image-01'])
 assert.equal(registry.providers.minimax.models.length,2)
 for(const value of [null,[],{minimax:'china'},{minimax:'https://arbitrary.invalid'},{other:'cn'}]) assert.throws(()=>normalizeProviderRegions(value))
})
