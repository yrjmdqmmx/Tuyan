import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const workflow = readFileSync(new URL('../../../.github/workflows/inspect-scientific-v2-remediation-routes.yml', import.meta.url), 'utf8')

test('remediation route inspection is read-only and bounded to the five requested models', () => {
  assert.match(workflow, /providerCalls:\s*0/u)
  for (const model of [
    'seedream-4.5',
    'seedream-5.0',
    'recraft\/recraft-v4-styles-vector',
    'recraft\/recraft-v4-styles-pro-vector',
    'recraft\/recraft-v4-pro-vector',
  ]) assert.match(workflow, new RegExp(model.replace(/[.]/g, '\\.'), 'u'))
  assert.match(workflow, /https:\/\/ark\.cn-beijing\.volces\.com\/api\/v3\/models/u)
  assert.match(workflow, /paperbanana_benchmark_scientific_v2_batches/u)
  assert.doesNotMatch(workflow, /images\/generations|callImageModel|generate\(/u)
})
