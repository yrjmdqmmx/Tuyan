import assert from 'node:assert/strict'
import test from 'node:test'

test('app paths apply a normalized non-root Vite base only to internal URLs', async () => {
  let paths
  try {
    paths = await import('./appPaths.js')
  } catch {}
  assert.equal(typeof paths?.appPath, 'function')
  assert.equal(paths.appPath('/', '/paperbanana/'), '/paperbanana/')
  assert.equal(paths.appPath('/leaderboard', '/paperbanana/'), '/paperbanana/leaderboard')
  assert.equal(paths.appPath('/leaderboard/aesthetics', '/paperbanana'), '/paperbanana/leaderboard/aesthetics')
  assert.equal(paths.appPath('https://github.com/example', '/paperbanana/'), 'https://github.com/example')
  assert.equal(paths.appPath('//cdn.example/logo.svg', '/paperbanana/'), '//cdn.example/logo.svg')
})

test('app-relative path matching strips only the configured base prefix', async () => {
  let paths
  try {
    paths = await import('./appPaths.js')
  } catch {}
  assert.equal(typeof paths?.appRelativePath, 'function')
  assert.equal(paths.appRelativePath('/paperbanana/leaderboard/aesthetics/', '/paperbanana/'), '/leaderboard/aesthetics/')
  assert.equal(paths.appRelativePath('/paperbanana/', '/paperbanana/'), '/')
  assert.equal(paths.appRelativePath('/leaderboard', '/paperbanana/'), null)
  assert.equal(paths.appRelativePath('/paperbanana-other/leaderboard', '/paperbanana/'), null)
})
