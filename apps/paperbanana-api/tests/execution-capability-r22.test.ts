import {batchExecutionFixture} from '../../../test-support/retirement-evidence.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { coreProducts, coreDecisions, catalogDecisions, executionRegistry, webProducts } from '../../../test-support/execution-capability.mjs'

test('R22 Core full registry, catalog normalization and every reference-mode decision equal frozen main', async () => {
  const fixture = batchExecutionFixture()
  const { core, registry } = await coreProducts()
  assert.deepEqual(executionRegistry(registry), fixture.core)
  assert.deepEqual(await coreDecisions(core, registry), fixture.coreReferenceModes)
  const web = await webProducts()
  assert.deepEqual(catalogDecisions(core, web.STATIC_MODEL_REGISTRY), fixture.normalizedCatalog)
})
