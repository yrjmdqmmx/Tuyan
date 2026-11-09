import assert from 'node:assert/strict'
import test from 'node:test'
import { readMaterialBytes } from '../src/material-files.js'
import { operationalMetrics } from '../src/operational-metrics.js'

test('simultaneous worker discovery cannot exceed two material processes and never mixes documents', async () => {
  const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) =>
    readMaterialBytes(Buffer.from(`isolated-document-${i}\nMeasured value: ${i + 10}`), `document-${i}.txt`, { op: 'read' })))
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 2)
  results.forEach((result, i) => {
    if (result.status === 'rejected') assert.equal(result.reason.statusCode, 429)
    else {
      const text = JSON.stringify(result.value)
      assert.ok(text.includes(`isolated-document-${i}`))
      for (let other = 0; other < 8; other++) if (other !== i) assert.ok(!text.includes(`isolated-document-${other}`))
    }
  })
  const report = operationalMetrics.snapshot()
  assert.deepEqual(report.gauges['material.active'], { current: 0, peak: 2 })
  assert.equal(report.counters['material.busy'], 6)
  assert.equal(report.counters['material.completed'], 2)
  // Released slots remain usable after a concurrent rejection.
  assert.equal((await readMaterialBytes(Buffer.from('later document'), 'later.txt', { op: 'read' })).status, 'read')
})
