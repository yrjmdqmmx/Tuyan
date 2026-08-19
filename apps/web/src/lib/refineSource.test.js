import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeRefineSource, refineRequestSource } from './refineSource.js'

test('refine source captures camel and snake case object keys from an authoritative result', () => {
  assert.deepEqual(normalizeRefineSource('https://signed.example/result.png', { object_key: 'jobs/one/result.png' }), {
    url: 'https://signed.example/result.png',
    objectKey: 'jobs/one/result.png',
  })
  assert.equal(normalizeRefineSource('/result.png', { objectKey: 'jobs/two/result.png' }).objectKey, 'jobs/two/result.png')
})

test('refine submit prefers object key and treats URL as preview-only', () => {
  assert.deepEqual(refineRequestSource({ url: 'https://expired.example/result.png', objectKey: 'jobs/one/result.png' }), {
    sourceImageObjectKey: 'jobs/one/result.png',
  })
  assert.deepEqual(refineRequestSource({ url: 'https://legacy.example/result.png', objectKey: '' }), {
    sourceImageUrl: 'https://legacy.example/result.png',
  })
})
