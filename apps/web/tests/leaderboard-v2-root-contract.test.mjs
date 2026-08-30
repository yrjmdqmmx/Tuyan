import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const rootUrl = new URL('../src/components/LeaderboardRoot.jsx', import.meta.url)

test('every leaderboard route boots one unified root and session provider', () => {
  assert.match(main, /LeaderboardRoot/u)
  assert.match(main, /LeaderboardSessionProvider/u)
  assert.doesNotMatch(main, /leaderboardRoute\.methodology\s*\?/u)
})

test('unified leaderboard header owns auth, account, feedback, and sign-out controls', () => {
  assert.equal(existsSync(rootUrl), true)
  const source = readFileSync(rootUrl, 'utf8')
  assert.match(source, /BenchmarkSiteHeader/u)
  assert.match(source, /AuthPanel/u)
  assert.match(source, /AuthUnavailablePanel/u)
  assert.match(source, /AccountSettingsDialog/u)
  assert.match(source, /lazy\(\(\)\s*=>\s*import\('\.\/AccountSettingsDialog\.jsx'\)\)/u)
  assert.match(source, /FeedbackDialog/u)
  assert.match(source, /authClient\.signOut/u)
  assert.doesNotMatch(source, /clearPrivateWorkspace/u)
})
