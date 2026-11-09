import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fixturePath, coreProducts, executionRegistry, webDecisions } from '../../../test-support/execution-capability.mjs'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { mainModelCanReadImages } from '../src/constants.js'
import { workflowModelVisionStatus, workflowVisionError } from '../src/lib/workflow.js'
import { modelRefinePresentation } from '../src/lib/modelRegistry.js'

test('R22 Web static and live capabilities and reference-image consumers equal frozen main', async () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  const web = { mainModelCanReadImages, workflowModelVisionStatus, workflowVisionError, modelRefinePresentation }
  assert.deepEqual(executionRegistry(STATIC_MODEL_REGISTRY), fixture.web)
  assert.deepEqual(webDecisions(web, STATIC_MODEL_REGISTRY), fixture.webStaticDecisions)
  const { registry } = await coreProducts()
  assert.deepEqual(executionRegistry(registry), fixture.core)
  assert.deepEqual(webDecisions(web, registry), fixture.webLiveDecisions)
})
