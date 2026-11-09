import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from '../src/server.js'
import {postInMemory} from './helpers/in-memory-http.js'
const config = {gatewayToken:'fixture',serviceName:'fixture',version:'test'}

test('custom and TokenDance credential prechecks preserve MODEL_UNAVAILABLE as HTTP 400', async () => {
  for (const provider of ['custom','tokendance']) {
    let calls = 0
    const precheck = async () => { throw Object.assign(new Error('原型号 mimo-v2.5 已不可用，可改选 mimo-v2.6-flash'), {businessCode:'MODEL_UNAVAILABLE',replacement:'mimo-v2.6-flash'}) }
    const server = createServer({handler:async () => {calls++;return {code:0}},readinessProbe:async()=>({ready:true}),healthSnapshot:()=>({ready:true}),config,logger:{info(){},warn(){},error(){}},requiresCustomCredential:precheck,requiresTokenDanceCredential:precheck})
    {
      const response = await postInMemory(server, '/paperbanana-api', {action:'createJob',modelRoutes:{main:{accessProvider:provider,modelId:'fixture'}}}, {'x-paperbanana-gateway-token':config.gatewayToken})
      assert.equal(response.status,400)
      const body = response.body
      assert.equal(body.businessCode,'MODEL_UNAVAILABLE');assert.equal(body.requestState,'not_sent')
      assert.match(body.error,/mimo-v2.6-flash/);assert.equal(calls,0)
    }
  }
})
