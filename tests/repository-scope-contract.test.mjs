import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const exists = (path) => existsSync(new URL(path, root))
const read = (path) => readFileSync(new URL(path, root), 'utf8')

const retiredClients = ['android', 'desktop', 'harmony', 'ios', 'macos', 'windows']
const retainedApps = ['web', 'miniprogram', 'auth-gateway', 'paperbanana-api', 'laf-functions', 'plot-worker', 'benchmark-worker']

test('repository retains only Web and WeChat Mini Program user clients', () => {
  for (const app of retainedApps) assert.equal(exists(`apps/${app}/`), true, `apps/${app} must remain`)
  for (const app of retiredClients) assert.equal(exists(`apps/${app}/`), false, `apps/${app} must be removed`)
})

test('CI and release workflows no longer build retired clients', () => {
  const ci = read('.github/workflows/ci.yml')
  assert.doesNotMatch(ci, /apps\/(?:android|desktop|harmony|ios|macos|windows)|@paperbanana\/(?:android|desktop)|xcodebuild|dotnet build/u)
  assert.equal(exists('.github/workflows/release-desktop-windows.yml'), false)
})

test('current repository docs describe the two-client product line', () => {
  const readme = read('README.md')
  const agents = read('AGENTS.md')
  for (const source of [readme, agents]) {
    assert.match(source, /Web/u)
    assert.match(source, /微信小程序/u)
    assert.doesNotMatch(source, /apps\/(?:android|desktop|harmony|ios|macos|windows)/u)
  }
  const packageJson = JSON.parse(read('package.json'))
  assert.equal(packageJson.name, 'tuyan-clients')
  assert.match(packageJson.description, /Web.*WeChat Mini Program/u)
})

test('public legal copy names only the current user clients', () => {
  const privacy = read('apps/web/public/privacy-policy.html')
  assert.match(privacy, /可通过 Web 与微信小程序使用/u)
  assert.match(privacy, /available on the Web and WeChat Mini Program/u)
  assert.doesNotMatch(privacy, /可通过 Web、微信小程序、iOS、Android、Windows、macOS 与 HarmonyOS/u)
})

test('retained clients link to the renamed GitHub repository', () => {
  const sources = [
    read('apps/web/src/App.jsx'),
    read('apps/miniprogram/miniprogram/pages/guide/guide.ts'),
    read('apps/miniprogram/miniprogram/pages/guide/guide.js'),
  ]
  for (const source of sources) {
    assert.match(source, /https:\/\/github\.com\/yrjmdqmmx\/Tuyan-clients/u)
    assert.doesNotMatch(source, /paperbanana-clients|PaperBanana-clients/u)
  }
})
