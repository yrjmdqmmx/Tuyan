import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import snapshot from '../config/channel-audit/tokendance-catalog-snapshot-20261109.json' with {type:'json'}
import {tokenDanceCatalogResponse} from '../test-support/tokendance-catalog.mjs'

test('R14 count and preview share a dated 119-row public snapshot with metadata only',async()=>{
  assert.equal(snapshot.sourceUrl,'https://tokendance.space/gateway/v1/models')
  assert.equal(snapshot.checkedAt,'2026-11-09T11:43:00Z')
  assert.equal(snapshot.data.length,119)
  assert.equal(new Set(snapshot.data.map(row=>row.id)).size,119)
  assert.ok(snapshot.data.every(row=>Object.keys(row).every(key=>['id','name','created','context_length','supported_protocols'].includes(key))))
  assert.deepEqual((await tokenDanceCatalogResponse().json()).data,snapshot.data)
  for(const file of ['../scripts/count-model-catalog.mjs','../test-support/refine-runtime.mjs'])
    assert.match(fs.readFileSync(new URL(file,import.meta.url),'utf8'),/tokenDanceCatalogResponse\(/)
})
test('R14 preview empty and timeout modes never access the network; invalid modes fail explicitly',async()=>{
  assert.deepEqual(await tokenDanceCatalogResponse('empty').json(),{data:[]})
  assert.throws(()=>tokenDanceCatalogResponse('timeout'),error=>error.name==='TimeoutError')
  assert.throws(()=>tokenDanceCatalogResponse('invalid'),/Unknown TUYAN_PREVIEW_TOKENDANCE_CATALOG/)
})
