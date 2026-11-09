import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
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
import {cleanModelLibrary,createModelLibraryStore} from '../src/model-library.js';
import {assertAuditedModelAvailable} from '../src/model-audit.js';

test('R8 generated gateway errors preserve machine fields and use main display names for all removals',()=>{
  const rows=JSON.parse(fs.readFileSync(new URL('../../../config/removed-models.json',import.meta.url),'utf8'));
  for(const [key,row] of Object.entries(rows)) {
    const slash=key.indexOf('/'),provider=key.slice(0,slash),id=key.slice(slash+1);
    assert.throws(()=>assertAuditedModelAvailable(provider,id),error=>{
      assert.equal(error.message,`模型 ${row.displayName}：原型号已不可用，请重新选择。${row.replacementApiId ? `推荐：${row.replacementDisplayName}` : ''}`);
      assert.equal(error.businessCode,'MODEL_UNAVAILABLE');assert.equal(error.code,'MODEL_UNAVAILABLE');assert.equal(error.statusCode,400);
      assert.equal(error.replacement,row.replacementApiId);assert.equal(error.sourceUrl,row.sourceUrl);assert.equal(error.requestState,'not_sent');
      for(const [apiId,name] of [[id,row.displayName],[row.replacementApiId,row.replacementDisplayName]]) if(apiId && apiId!==name) assert.ok(!error.message.includes(apiId),key);
      return true;
    });
  }
});

test('first sync and explicit import preserve removed entries without a server archive',async()=>{
  const store=createModelLibraryStore({db:memoryDb(),secret:'isolated-test-only'});
  const input={revision:0,connections:[{id:'c',provider:'xiaomi',scope:'browser',label:'Imported'}],models:[{id:'old',connectionId:'c',modelId:'mimo-v2.5'}]};
  const first=await store.put('owner',input);
  assert.deepEqual(first.models,cleanModelLibrary(input).models);
  const imported=await store.put('owner',{...first,intent:'import',models:[...first.models,{id:'imported',connectionId:'c',modelId:'mimo-v2.5-pro'}]});
  assert.equal(imported.models.length,2);
  assert.equal(imported.models[0].modelId,'mimo-v2.5');assert.equal(imported.models[0].disabled,false);
  await assert.rejects(store.put('owner',{...imported,intent:'add',models:[...imported.models,{id:'new',connectionId:'c',modelId:'mimo-v2.5'}]}),e=>e.businessCode==='MODEL_UNAVAILABLE');
  await assert.rejects(store.put('new-owner',{...input,intent:'add'}),e=>e.businessCode==='MODEL_UNAVAILABLE');
});

test('model library rejects new retired bindings while allowing existing saved identities to round-trip',async t=>{
  const db=memoryDb(),store=createModelLibraryStore({db,secret:'isolated-test-only'});
  const originalInput=cleanModelLibrary({connections:[{id:'c',provider:'xiaomi',scope:'browser',label:'Local'}],models:[{id:'old',connectionId:'c',modelId:'mimo-v2.5'}]});
  await db.collection().insertOne({_id:createHash('sha256').update('owner').digest('hex'),revision:1,...originalInput});
  const original=await store.get('owner');
  const retained=await store.put('owner',original);
  assert.deepEqual(retained.models,original.models);
  assert.equal(retained.models.length,original.models.length);
  await assert.rejects(store.put('owner',{...retained,models:[...retained.models,{id:'new',connectionId:'c',modelId:'mimo-v2.5'}]}),e=>e.status===400&&e.businessCode==='MODEL_UNAVAILABLE'&&e.replacement==='mimo-v2.6-flash');
  assert.deepEqual(await store.get('owner'),retained);
  const replaced=await store.put('owner',{...retained,models:[{...retained.models[0],disabled:true},{id:'replacement',connectionId:'c',modelId:'mimo-v2.6-flash'}]});
  assert.equal(replaced.models[0].modelId,'mimo-v2.5');assert.equal(replaced.models[0].disabled,true);
});

test('serverless removal is exact-channel scoped and scheduled models remain addable',async t=>{
  t.mock.method(Date,'now',()=>Date.parse('2026-11-09'));
  const store=createModelLibraryStore({db:memoryDb(),secret:'isolated-test-only'});
  const input={revision:0,intent:'add',connections:[{id:'c',provider:'fireworks',scope:'browser',label:'Local'}],models:[{id:'old',connectionId:'c',modelId:'accounts/fireworks/models/glm-5p2'}]};
  await assert.rejects(store.put('owner',input),e=>e.businessCode==='MODEL_UNAVAILABLE');
  assert.equal((await store.get('owner')).revision,0);
  const row=await store.put('owner',{...input,connections:[{...input.connections[0],provider:'bailian'}],models:[{...input.models[0],modelId:'qwen3.5-plus'}]});
  assert.equal(row.models[0].modelId,'qwen3.5-plus');
});

test('the thirteen-entry preview library round-trips unchanged, including all three removed IDs',async()=>{
  const db=memoryDb(),store=createModelLibraryStore({db,secret:'isolated-fixture-only'});
  const channels=['xiaomi','fireworks','bailian','antling','openai'];
  const connections=channels.map(provider=>({id:provider,provider,label:provider,scope:'browser'}));
  const pairs=JSON.parse(fs.readFileSync(new URL('../../web/tests/fixtures/model-card-preview.json',import.meta.url),'utf8'));
  await db.collection().insertOne({_id:createHash('sha256').update('owner').digest('hex'),revision:1,...cleanModelLibrary({connections,models:pairs.map(([connectionId,modelId],index)=>({id:'m'+index,connectionId,modelId}))})});
  const before=await store.get('owner'),after=await store.put('owner',before);
  assert.equal(before.models.length,13);assert.equal(after.models.length,13);
  assert.deepEqual(after.models,before.models);assert.deepEqual(after.connections,before.connections);
});

test('Ant Ling saved bindings round-trip after the exact deadline while new ones are rejected',async t=>{
  t.mock.method(Date,'now',()=>Date.parse('2026-11-14T15:59:59.999Z'));
  const store=createModelLibraryStore({db:memoryDb(),secret:'isolated-test-only'});
  const input={revision:0,connections:[{id:'c',provider:'antling',scope:'browser',label:'Local'}],models:['Ling-2.6-1T','Ling-2.6-flash','Ring-2.6-1T'].map((modelId,i)=>({id:'m'+i,connectionId:'c',modelId}))};
  const before=await store.put('owner',input);
  Date.now.mock.mockImplementation(()=>Date.parse('2026-11-14T16:00:00Z'));
  const retained=await store.put('owner',before);
  assert.deepEqual(retained.models,before.models);
  for(const model of before.models) await assert.rejects(store.put('owner',{...retained,models:[...retained.models,{...model,id:'new'}]}),e=>e.businessCode==='MODEL_UNAVAILABLE'&&e.replacement==='Ling-3.1-flash');
});
