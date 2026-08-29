import assert from 'node:assert/strict'
import test from 'node:test'

test('leaderboard route resolver recognizes overview, methodology, all seven dimensions, and invalid slugs', async () => {
  let routes
  try {
    routes = await import('./leaderboardRoutes.js')
  } catch {}
  assert.equal(typeof routes?.resolveLeaderboardRoute, 'function')
  assert.deepEqual(routes.resolveLeaderboardRoute('/leaderboard'), { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: false })
  assert.deepEqual(routes.resolveLeaderboardRoute('/leaderboard/methodology'), { isLeaderboard: true, methodology: true, dimension: null, invalidSlug: false })
  assert.deepEqual(routes.resolveLeaderboardRoute('/leaderboard/methodology/'), { isLeaderboard: true, methodology: true, dimension: null, invalidSlug: false })
  for (const slug of ['faithfulness', 'conciseness', 'readability', 'aesthetics', 'text-accuracy', 'topology', 'instruction-adherence']) {
    const result = routes.resolveLeaderboardRoute(`/leaderboard/${slug}`)
    assert.equal(result.isLeaderboard, true)
    assert.equal(result.methodology, false)
    assert.equal(result.invalidSlug, false)
    assert.ok(result.dimension)
  }
  assert.deepEqual(routes.resolveLeaderboardRoute('/leaderboard/nope'), { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: true })
  assert.deepEqual(routes.resolveLeaderboardRoute('/workspace'), { isLeaderboard: false, methodology: false, dimension: null, invalidSlug: false })
})

test('all seven static dimension directory URLs resolve with a trailing slash', async () => {
  const { resolveLeaderboardRoute } = await import('./leaderboardRoutes.js')
  for (const slug of ['faithfulness', 'conciseness', 'readability', 'aesthetics', 'text-accuracy', 'topology', 'instruction-adherence']) {
    const result = resolveLeaderboardRoute(`/leaderboard/${slug}/`)
    assert.equal(result.isLeaderboard, true)
    assert.equal(result.methodology, false)
    assert.equal(result.invalidSlug, false, `${slug}/ should remain a valid dimension route`)
    assert.equal(result.dimension?.slug, slug)
  }
})

test('legacy bench paths replace to one canonical leaderboard entry while preserving query and hash', async () => {
  let routes
  try {
    routes = await import('./leaderboardRoutes.js')
  } catch {}
  assert.equal(typeof routes?.canonicalizeLeaderboardLocation, 'function')
  const calls = []
  const location = { pathname: '/bench/aesthetics', search: '?from=old', hash: '#scores' }
  const result = routes.canonicalizeLeaderboardLocation(location, { replaceState: (...args) => calls.push(args) })
  assert.equal(result.pathname, '/leaderboard')
  assert.deepEqual(calls, [[{}, '', '/leaderboard?from=old#scores']])
  assert.equal(routes.canonicalizeLeaderboardLocation({ pathname: '/leaderboard', search: '', hash: '' }, { replaceState() { throw new Error('must not replace') } }).pathname, '/leaderboard')
})

test('restricted 404 route parameter restores invalid leaderboard slugs but collapses old bench paths', async () => {
  const routes = await import('./leaderboardRoutes.js')
  const invalidCalls = []
  const invalid = routes.canonicalizeLeaderboardLocation({ pathname: '/leaderboard', search: '?source=404&__route=%2Fleaderboard%2Fnot-real', hash: '#missing' }, { replaceState: (...args) => invalidCalls.push(args) })
  assert.equal(invalid.pathname, '/leaderboard/not-real')
  assert.equal(invalid.search, '?source=404')
  assert.deepEqual(invalidCalls, [[{}, '', '/leaderboard/not-real?source=404#missing']])

  const calls = []
  const legacy = routes.canonicalizeLeaderboardLocation({ pathname: '/leaderboard', search: '?source=404&__route=%2Fbench%2Faesthetics', hash: '#scores' }, { replaceState: (...args) => calls.push(args) })
  assert.equal(legacy.pathname, '/leaderboard')
  assert.equal(legacy.search, '?source=404')
  assert.deepEqual(calls, [[{}, '', '/leaderboard?source=404#scores']])
})

test('canonicalization restores a valid fallback route under a non-root app base and cleans __route', async () => {
  const routes = await import('./leaderboardRoutes.js')
  const calls = []
  const restored = routes.canonicalizeLeaderboardLocation(
    { pathname: '/leaderboard', search: '?source=404&__route=%2Fleaderboard%2Faesthetics', hash: '#rank' },
    { replaceState: (...args) => calls.push(args) },
    '/paperbanana/',
  )
  assert.equal(restored.pathname, '/leaderboard/aesthetics')
  assert.equal(restored.search, '?source=404')
  assert.deepEqual(calls, [[{}, '', '/paperbanana/leaderboard/aesthetics?source=404#rank']])
})
