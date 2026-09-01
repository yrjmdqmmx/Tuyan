import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const workflow = readFileSync(new URL('../../../.github/workflows/finalize-v1-external-object-retirement.yml', import.meta.url), 'utf8')

test('externally deleted V1 objects are reverified before exact DB retirement', () => {
  assert.match(workflow, /33515513815/u)
  assert.match(workflow, /v1-retirement-inspect-33515513815/u)
  assert.match(workflow, /exclusiveObjects\.length\s*!==\s*253/u)
  assert.match(workflow, /sharedObjects\.length\s*!==\s*0/u)
  assert.match(workflow, /-e "ACTIVE_V2_RELEASE_HASH=\$ACTIVE_V2_RELEASE_HASH"/u)
  assert.match(workflow, /-e "INVENTORY_HASH=\$INVENTORY_HASH"/u)
  assert.match(workflow, /await oss\.head\(item\.objectKey\)/u)
  assert.match(workflow, /missing\s*!==\s*report\.inventory\.exclusiveObjects\.length/u)
  assert.match(workflow, /retire-v1-benchmark\.mongo\.js/u)
  assert.match(workflow, /generatedOrJudgeCalls:\s*0/u)
  assert.doesNotMatch(workflow, /\.delete\(|images\/generations|callImageModel|generate\(/u)
})
