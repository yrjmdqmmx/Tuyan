import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createApp } from '../src/app.js'
import { postInMemory } from '../../paperbanana-api/tests/helpers/in-memory-http.ts'
import { phase2Registry, assertPhase2Facts } from '../../../test-support/phase2-modality.mjs'

test('phase 2 Gateway relays all 1061 complete model objects and their display projections', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09T12:00:00Z'))
  const data = await phase2Registry()
  const app = createApp({config:{production:false,trustProxy:1,frontendOrigins:[],adminUserIds:new Set(),backend:{mode:'node'},maintenance:{retryAfterSeconds:120}},auth:{async optionalSession(){return null},async webHandler(){throw Error('Unexpected auth')}},backend:{async call(body){assert.equal(body.action,'modelRegistry');return {status:200,data}}},isMaintenance:()=>false,logger:{info(){},warn(){},error(){}}})
  const response = await postInMemory(createServer(app),'/paperbanana-api',{action:'modelRegistry'},{})
  assert.equal(response.status,200)
  assert.deepEqual(response.body,JSON.parse(JSON.stringify(data)))
  const models = new Map(Object.entries(response.body.providers).flatMap(([channel,provider])=>provider.models.map(model=>[channel+'/'+model.id,model])))
  assert.equal(models.size,1061)
  assertPhase2Facts(key=>models.get(key).cardSpecifications)
})
