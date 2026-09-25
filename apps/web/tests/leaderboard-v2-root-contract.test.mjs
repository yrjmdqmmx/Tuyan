import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const rootUrl = new URL('../src/components/LeaderboardRoot.jsx', import.meta.url)

test('every leaderboard route boots one unified root and session provider', () => {
  assert.match(main, /LeaderboardRoot/u)
  assert.match(main, /LeaderboardSessionProvider/u)
  assert.doesNotMatch(main.slice(main.indexOf('createRoot(document')), /leaderboardRoute\.methodology\s*\?/u)
})

test('unified leaderboard delegates account controls to the shared page shell', () => {
  assert.equal(existsSync(rootUrl), true)
  const source = readFileSync(rootUrl, 'utf8')
  assert.match(source, /BenchmarkSiteHeader/u)
  assert.match(source, /<SitePageShell section="leaderboard"/u)
  assert.match(source, /return <SiteSessionProvider/u)
  const shell = readFileSync(new URL('../src/components/SitePageShell.jsx', import.meta.url), 'utf8')
  assert.match(shell, /AuthPanel/u)
  assert.match(shell, /AuthUnavailablePanel/u)
  assert.match(shell, /AccountSettingsDialog/u)
  assert.match(shell, /lazy\(\(\)\s*=>\s*import\('\.\/AccountSettingsDialog\.jsx'\)\)/u)
  assert.match(shell, /FeedbackDialog/u)
  assert.match(shell, /auth\.signOut/u)
  assert.doesNotMatch(source, /clearPrivateWorkspace/u)
  assert.doesNotMatch(shell, /from ['"]\.\.\/App|document\.title\s*=/u)
})
