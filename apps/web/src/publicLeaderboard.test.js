import assert from 'node:assert/strict'
import test from 'node:test'
import { publicLeaderboardEnabled } from './publicLeaderboard.js'

test('published leaderboard pages remain readable with execution and legacy flags off', () => {
  for (const env of [{}, { VITE_BENCH_ENABLED: 'false' }, { PAPERBANANA_BENCH_ENABLED: 'false' }, { VITE_BENCH_ENABLED: 'false', PAPERBANANA_BENCH_ENABLED: 'false' }]) {
    assert.equal(publicLeaderboardEnabled(env), true)
  }
})

test('only the explicit public-page maintenance override hides published pages', () => {
  assert.equal(publicLeaderboardEnabled({ VITE_PUBLIC_LEADERBOARD_ENABLED: 'false', VITE_BENCH_ENABLED: 'true' }), false)
  assert.equal(publicLeaderboardEnabled({ VITE_PUBLIC_LEADERBOARD_ENABLED: 'true', PAPERBANANA_BENCH_ENABLED: 'false' }), true)
})
