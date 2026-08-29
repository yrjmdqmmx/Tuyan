import assert from 'node:assert/strict'
import test from 'node:test'

test('fallback redirects only leaderboard and bench prefixes with an encoded original route', async () => {
  let fallback
  try {
    fallback = await import('./leaderboardFallback.js')
  } catch {}
  assert.equal(typeof fallback?.leaderboardFallbackTarget, 'function')
  assert.equal(fallback.leaderboardFallbackTarget({ pathname: '/leaderboard/not-real', search: '?q=模型', hash: '#rank' }), '/leaderboard?q=%E6%A8%A1%E5%9E%8B&__route=%2Fleaderboard%2Fnot-real#rank')
  assert.equal(fallback.leaderboardFallbackTarget({ pathname: '/bench/anything', search: '', hash: '' }), '/leaderboard?__route=%2Fbench%2Fanything')
  assert.equal(
    fallback.leaderboardFallbackTarget({ pathname: '/paperbanana/leaderboard/not-real', search: '?q=1', hash: '#rank' }, '/paperbanana/'),
    '/paperbanana/leaderboard?q=1&__route=%2Fleaderboard%2Fnot-real#rank',
  )
  assert.equal(fallback.leaderboardFallbackTarget({ pathname: '/leaderboard/not-real', search: '', hash: '' }, '/paperbanana/'), null)
})

test('fallback leaves every unrelated unknown static path on the generic 404 page', async () => {
  let fallback
  try {
    fallback = await import('./leaderboardFallback.js')
  } catch {}
  assert.equal(typeof fallback?.leaderboardFallbackTarget, 'function')
  for (const pathname of ['/privacy-missing', '/assets/nope', '/leaderboards', '/benchmark']) {
    assert.equal(fallback.leaderboardFallbackTarget({ pathname, search: '?x=1', hash: '#nope' }), null)
  }
})

test('generic 404 home link stays inside a non-root app base', async () => {
  const fallback = await import('./leaderboardFallback.js')
  let href = ''
  fallback.configureFallbackHomeLink({
    querySelector() {
      return { setAttribute(name, value) { if (name === 'href') href = value } }
    },
  }, '/paperbanana/')
  assert.equal(href, '/paperbanana/')
})
