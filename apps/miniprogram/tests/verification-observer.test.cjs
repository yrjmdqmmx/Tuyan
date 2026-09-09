const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createVerificationObserver } = require('../miniprogram/utils/verification-observer.js')

test('verification observer stays read-only, pauses and resumes, and ends on verified', async () => {
  const states = []; let queries = 0; let timer; let now = 100
  const observer = createVerificationObserver({ query: async () => ++queries === 1 ? 'pending' : 'verified', onStatus: s => states.push(s), now: () => now, schedule: fn => { timer = fn; return 1 }, cancel: () => { timer = null } })
  await observer.resume()
  assert.equal(states.at(-1), 'pending')
  observer.pause(); assert.equal(timer, null)
  await observer.refresh(); assert.equal(queries, 1)
  await observer.resume(); assert.equal(states.at(-1), 'verified'); assert.equal(timer, null)
  await observer.resume(); assert.equal(queries, 2)
})

test('verification observer expires after one hour and rejects a stale response after stop', async () => {
  let now = 0; let done; const states = []
  const observer = createVerificationObserver({ query: () => new Promise(r => { done = r }), onStatus: s => states.push(s), now: () => now, schedule: () => 1, cancel() {} })
  const pending = observer.resume(); observer.stop(); done('verified'); await pending
  assert.equal(states.length, 0)
  let calls = 0
  const expired = createVerificationObserver({ query: async () => { calls++; return 'pending' }, onStatus: s => states.push(s), now: () => now, schedule: () => 1, cancel() {} })
  now = 3600001; await expired.resume()
  assert.equal(states.at(-1), 'expired'); assert.equal(calls, 0)
})

test('verification observer never overlaps requests and recovers from temporary failure', async () => {
  let done; let calls = 0; const states = []
  const observer = createVerificationObserver({ query: () => { calls++; return new Promise(r => { done = r }) }, onStatus: s => states.push(s), schedule: () => 1, cancel() {} })
  const first = observer.resume(); await observer.refresh(); assert.equal(calls, 1)
  done('pending'); await first; observer.stop()
  let attempts = 0
  const recovery = createVerificationObserver({ query: async () => { if (++attempts === 1) throw new Error('offline'); return 'verified' }, onStatus: s => states.push(s), schedule: () => 1, cancel() {} })
  await recovery.resume(); assert.equal(states.at(-1), 'unavailable')
  await recovery.refresh(); assert.equal(states.at(-1), 'verified')
})
