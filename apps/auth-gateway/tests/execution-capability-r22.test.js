import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createServer } from 'node:http'
import { createApp } from '../src/app.js'
import { withModelAudit } from '../src/model-audit.js'
import { postInMemory } from '../../paperbanana-api/tests/helpers/in-memory-http.ts'
import { fixturePath, coreProducts, executionRegistry, executionModel, modelRows } from '../../../test-support/execution-capability.mjs'

test('R22 Gateway preserves frozen main capability on the registry wire and in its audit decorator', async () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  const { registry } = await coreProducts()
  for (const { provider, model } of modelRows(registry)) {
    const before = structuredClone(model)
    assert.deepEqual(executionModel(withModelAudit(provider, model)), executionModel(model))
    assert.deepEqual(model, before)
  }
  const app = createApp({ config: { production: false, trustProxy: 1, frontendOrigins: [], adminUserIds: new Set(), backend: { mode: 'node' }, maintenance: { retryAfterSeconds: 120 } },
    auth: { async optionalSession() { return null }, async webHandler() { throw Error('Unexpected auth') } },
    backend: { async call(body) { assert.equal(body.action, 'modelRegistry'); return { status: 200, data: registry } } },
    isMaintenance: () => false, logger: { info() {}, warn() {}, error() {} } })
  const response = await postInMemory(createServer(app), '/paperbanana-api', { action: 'modelRegistry' }, {})
  assert.equal(response.status, 200)
  assert.deepEqual(executionRegistry(response.body), fixture.core)
  assert.deepEqual(response.body, JSON.parse(JSON.stringify(registry)))
})
