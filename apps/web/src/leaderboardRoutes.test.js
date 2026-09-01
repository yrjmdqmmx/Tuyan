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
  assert.equal(routes.resolveLeaderboardRoute('/leaderboard/models/profile%3Aone').modelProfileId, 'profile:one')
  assert.equal(
    routes.resolveLeaderboardRoute('/leaderboard/models/krea%2Fkrea-2-medium%3Acodex_single%3Acodex-single-2026-08-v1/').modelProfileId,
    'krea/krea-2-medium:codex_single:codex-single-2026-08-v1',
  )
  assert.equal(routes.resolveLeaderboardRoute('/leaderboard/cases/math_symbols-01').caseId, 'math_symbols-01')
  assert.equal(routes.resolveLeaderboardRoute('/leaderboard/submit-prompt').promptSubmission, true)
  assert.equal(routes.resolveLeaderboardRoute('/leaderboard/admin/prompt-submissions').promptAdmin, true)
  for (const slug of ['faithfulness', 'conciseness', 'readability', 'aesthetics', 'text-accuracy', 'topology', 'instruction-adherence']) {
    const result = routes.resolveLeaderboardRoute(`/leaderboard/${slug}`)
    assert.equal(result.isLeaderboard, true)
    assert.equal(result.methodology, false)
    assert.equal(result.invalidSlug, false)
    assert.ok(result.dimension)
  }
  assert.deepEqual(routes.resolveLeaderboardRoute('/leaderboard/nope'), { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: true })
  assert.equal(routes.resolveLeaderboardRoute('/leaderboard/models/').invalidSlug, true)
  assert.equal(routes.resolveLeaderboardRoute('/leaderboard/cases/unknown').invalidSlug, true)
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

test('route resolver accepts all nine scientific v2 evidence cases', async () => {
  const { resolveLeaderboardRoute } = await import('./leaderboardRoutes.js')
  const caseIds = [
    'scientific-gen-01-method-flow', 'scientific-gen-02-biological-pathway', 'scientific-gen-03-model-architecture',
    'scientific-gen-04-quantitative-panels', 'scientific-gen-05-math-bilingual', 'scientific-gen-06-controls-negative-constraints',
    'scientific-edit-01-text-label', 'scientific-edit-02-node-arrow', 'scientific-edit-03-color-legend-callout',
  ]
  caseIds.forEach((caseId) => assert.equal(resolveLeaderboardRoute(`/leaderboard/cases/${caseId}`).caseId, caseId))
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

test('GitHub Pages trailing-slash fallback restores a real encoded model profile route', async () => {
  const routes = await import('./leaderboardRoutes.js')
  const calls = []
  const restored = routes.canonicalizeLeaderboardLocation(
    {
      pathname: '/leaderboard/',
      search: '?__route=%2Fleaderboard%2Fmodels%2Fkrea%252Fkrea-2-medium%253Acodex_single%253Acodex-single-2026-08-v1%2F',
      hash: '',
    },
    { replaceState: (...args) => calls.push(args) },
  )
  assert.equal(restored.pathname, '/leaderboard/models/krea%2Fkrea-2-medium%3Acodex_single%3Acodex-single-2026-08-v1/')
  assert.equal(restored.search, '')
  assert.deepEqual(calls, [[{}, '', '/leaderboard/models/krea%2Fkrea-2-medium%3Acodex_single%3Acodex-single-2026-08-v1/']])
  assert.equal(routes.resolveLeaderboardRoute(restored.pathname).invalidSlug, false)
})

test('dynamic leaderboard detail links enter through the static 200 route and canonicalize after boot', async () => {
  const routes = await import('./leaderboardRoutes.js')
  assert.equal(typeof routes.leaderboardDetailHref, 'function')
  assert.equal(
    routes.leaderboardDetailHref('/leaderboard/models/qwen-image-3.0-pro%3Acodex_scientific_v2%3Acodex-scientific-2026-09-v1'),
    '/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fqwen-image-3.0-pro%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1',
  )
  assert.equal(
    routes.leaderboardDetailHref('/leaderboard/models/krea%2Fkrea-2-medium%3Acodex_scientific_v2%3Acodex-scientific-2026-09-v1', '/paperbanana/'),
    '/paperbanana/leaderboard?__route=%2Fleaderboard%2Fmodels%2Fkrea%252Fkrea-2-medium%253Acodex_scientific_v2%253Acodex-scientific-2026-09-v1',
  )
})
