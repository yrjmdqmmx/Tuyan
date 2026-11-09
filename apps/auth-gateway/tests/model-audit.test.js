import test from 'node:test';
import assert from 'node:assert/strict';
function memoryDb() {
  const rows = new Map();
  return {collection:()=>({
    findOne:async query=>structuredClone(rows.get(query._id) || null),
    insertOne:async row=>rows.set(row._id,structuredClone(row)),
    replaceOne:async (query,row)=>{if(rows.get(query._id)?.revision!==query.revision)return {matchedCount:0};rows.set(row._id,structuredClone(row));return {matchedCount:1};},
    deleteMany:async()=>rows.clear(),
  })};
}
import {createModelLibraryStore} from '../src/model-library.js';

test('model library rejects new retired bindings while allowing existing saved identities to round-trip',async t=>{
  t.mock.method(Date,'now',()=>Date.parse('2026-09-01'));
  const store=createModelLibraryStore({db:memoryDb(),secret:'isolated-test-only'});
  const original=await store.put('owner',{revision:0,connections:[{id:'c',provider:'xiaomi',scope:'browser',label:'Local'}],models:[{id:'old',connectionId:'c',modelId:'mimo-v2.5'}]});
  Date.now.mock.mockImplementation(()=>Date.parse('2026-11-09'));
  const retained=await store.put('owner',original);
  assert.deepEqual(retained.models,original.models);
  await assert.rejects(store.put('owner',{...retained,models:[...retained.models,{id:'new',connectionId:'c',modelId:'mimo-v2.5'}]}),e=>e.status===400&&e.businessCode==='MODEL_RETIRED'&&e.replacement==='mimo-v2.6-flash');
  assert.deepEqual(await store.get('owner'),retained);
  const replaced=await store.put('owner',{...retained,models:[{...retained.models[0],disabled:true},{id:'replacement',connectionId:'c',modelId:'mimo-v2.6-flash'}]});
  assert.equal(replaced.models[0].modelId,'mimo-v2.5');assert.equal(replaced.models[0].disabled,true);
});

test('serverless removal is exact-channel scoped and scheduled models remain addable',async t=>{
  t.mock.method(Date,'now',()=>Date.parse('2026-11-09'));
  const store=createModelLibraryStore({db:memoryDb(),secret:'isolated-test-only'});
  const input={revision:0,connections:[{id:'c',provider:'fireworks',scope:'browser',label:'Local'}],models:[{id:'old',connectionId:'c',modelId:'accounts/fireworks/models/glm-5p2'}]};
  await assert.rejects(store.put('owner',input),e=>e.businessCode==='MODEL_CHANNEL_UNAVAILABLE');
  assert.equal((await store.get('owner')).revision,0);
  const row=await store.put('owner',{...input,connections:[{...input.connections[0],provider:'bailian'}],models:[{...input.models[0],modelId:'qwen3.5-plus'}]});
  assert.equal(row.models[0].modelId,'qwen3.5-plus');
});
