import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { canonicalHash } from '@paperbanana/benchmark-core'

import {
  normalizeScientificV2StateOperationReport,
  scientificV2StateOperationReportHmacPayload,
} from '../src/scientific-v2-state-report.js'

test('Worker canonical state report exactly matches the API JSON fixture without importing API runtime', () => {
  const fixturePath = new URL('../../paperbanana-api/tests/fixtures/scientific-v2-state-operation-report.json', import.meta.url)
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  const normalized = normalizeScientificV2StateOperationReport(fixture)
  const { reportHash, ...payload } = normalized

  assert.deepEqual(normalized, fixture)
  assert.equal(reportHash, canonicalHash(payload))
  assert.equal(scientificV2StateOperationReportHmacPayload(normalized), fixture.reportHash)
  assert.equal(Object.isFrozen(normalized), true)
  assert.equal(Object.isFrozen(normalized.identity), true)
})

test('Worker canonical state report rejects identity, inner hash and extra-field drift', () => {
  const fixturePath = new URL('../../paperbanana-api/tests/fixtures/scientific-v2-state-operation-report.json', import.meta.url)
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  for (const mutate of [
    (value: Record<string, unknown>) => { delete value.identity },
    (value: Record<string, unknown>) => { (value.identity as Record<string, unknown>).suiteId = 'wrong-suite' },
    (value: Record<string, unknown>) => { value.reportHash = '0'.repeat(64) },
    (value: Record<string, unknown>) => { value.extra = true },
  ]) {
    const changed = structuredClone(fixture)
    mutate(changed)
    assert.throws(() => normalizeScientificV2StateOperationReport(changed), /SCIENTIFIC_V2_OPERATION_REPORT_/)
  }
})
