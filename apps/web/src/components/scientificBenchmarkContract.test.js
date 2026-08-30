import assert from 'node:assert/strict'
import test from 'node:test'

import { PB_SCIENTIFIC_FIGURE_V2, SCIENTIFIC_BENCHMARK_AXES, SCIENTIFIC_BENCHMARK_IDENTITY } from '../../../../packages/benchmark-core/src/index.ts'

test('browser-safe scientific contract exactly mirrors the authoritative Core suite', async () => {
  let browserContract
  try { browserContract = await import('./scientificBenchmarkContract.js') } catch {}
  assert.ok(browserContract?.SCIENTIFIC_WEB_CONTRACT)
  assert.deepEqual(browserContract.SCIENTIFIC_WEB_CONTRACT.identity, SCIENTIFIC_BENCHMARK_IDENTITY)
  assert.deepEqual(browserContract.SCIENTIFIC_WEB_CONTRACT.axes, [...SCIENTIFIC_BENCHMARK_AXES])
  assert.equal(browserContract.SCIENTIFIC_WEB_CONTRACT.suiteId, PB_SCIENTIFIC_FIGURE_V2.id)
  assert.equal(browserContract.SCIENTIFIC_WEB_CONTRACT.suiteHash, PB_SCIENTIFIC_FIGURE_V2.manifestHash)
  assert.deepEqual(browserContract.SCIENTIFIC_WEB_CONTRACT.cases, PB_SCIENTIFIC_FIGURE_V2.cases.map((item) => ({
    id: item.id,
    kind: item.kind,
    manifestHash: item.manifestHash,
    applicableAxes: [...item.applicableAxes],
    ...(item.kind === 'edit' ? { sourceHash: item.sourceHash, region: item.region } : {}),
  })))
})
