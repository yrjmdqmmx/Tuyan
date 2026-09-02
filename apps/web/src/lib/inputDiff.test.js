import assert from 'node:assert/strict'
import test from 'node:test'
import { createInputDiff } from './inputDiff.js'

function joined(segments) {
  return segments.map((segment) => segment.text).join('')
}

function containsUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true
    }
  }
  return false
}

test('input diff preserves complete text and marks fine-grained Chinese removals and additions', () => {
  const before = '研究流程：采集数据，然后训练模型。'
  const after = '研究流程：清洗数据，然后评估模型。'
  const diff = createInputDiff(before, after)

  assert.equal(diff.mode, 'detailed')
  assert.equal(joined(diff.before), before)
  assert.equal(joined(diff.after), after)
  assert.match(diff.before.filter((segment) => segment.type === 'removed').map((segment) => segment.text).join(''), /采集|训练/u)
  assert.match(diff.after.filter((segment) => segment.type === 'added').map((segment) => segment.text).join(''), /清洗|评估/u)
})

test('input diff bounds work for 12000 characters and safely falls back to shared edges', () => {
  const before = `共同开头${'甲'.repeat(11_980)}共同结尾`
  const after = `共同开头${'乙'.repeat(11_980)}共同结尾`
  const startedAt = performance.now()
  const diff = createInputDiff(before, after)

  assert.equal(diff.mode, 'fallback')
  assert.equal(joined(diff.before), before)
  assert.equal(joined(diff.after), after)
  assert.equal(diff.before.some((segment) => segment.type === 'removed'), true)
  assert.equal(diff.after.some((segment) => segment.type === 'added'), true)
  assert.ok(performance.now() - startedAt < 250, 'fallback should remain linear for maximum-length input')
})

test('fallback never splits emoji surrogate pairs across semantic segments', () => {
  const before = '😀'.repeat(241)
  const after = '😁'.repeat(241)
  const diff = createInputDiff(before, after)

  assert.equal(diff.mode, 'fallback')
  assert.equal(joined(diff.before), before)
  assert.equal(joined(diff.after), after)
  assert.equal([...diff.before, ...diff.after].some((segment) => containsUnpairedSurrogate(segment.text)), false)
})
