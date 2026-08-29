import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const routeEntries = [
  ['leaderboard', 'leaderboard/index.html'],
  ['leaderboard-faithfulness', 'leaderboard/faithfulness/index.html'],
  ['leaderboard-conciseness', 'leaderboard/conciseness/index.html'],
  ['leaderboard-readability', 'leaderboard/readability/index.html'],
  ['leaderboard-aesthetics', 'leaderboard/aesthetics/index.html'],
  ['leaderboard-text-accuracy', 'leaderboard/text-accuracy/index.html'],
  ['leaderboard-topology', 'leaderboard/topology/index.html'],
  ['leaderboard-instruction-adherence', 'leaderboard/instruction-adherence/index.html'],
]

test('Vite multi-page inputs include leaderboard overview and all seven dimension deep links', async () => {
  const { default: config } = await import('../vite.config.js')
  const input = config.build?.rollupOptions?.input || {}
  assert.ok(input.main)
  assert.ok(input.bench)
  assert.equal(typeof input['not-found'], 'string')
  assert.equal(input['not-found'].endsWith('404.html'), true)
  for (const [key, relativePath] of routeEntries) {
    assert.equal(typeof input[key], 'string', `${key} should be a Vite HTML input`)
    assert.equal(input[key].endsWith(relativePath), true, `${key} should point to ${relativePath}`)
  }
})

test('404 entry boots only the restricted leaderboard fallback module', () => {
  const html = readFileSync(new URL('../404.html', import.meta.url), 'utf8')
  assert.match(html, /页面未找到/u)
  assert.match(html, /data-app-home/u)
  assert.match(html, /<script type="module" src="\/src\/leaderboardFallback\.js"><\/script>/u)
  assert.doesNotMatch(html, /src="\/src\/main\.jsx"/u)
})

test('every leaderboard deep-link entry boots the shared React route resolver', () => {
  for (const [, relativePath] of routeEntries) {
    const url = new URL(`../${relativePath}`, import.meta.url)
    assert.equal(existsSync(url), true, `${relativePath} should exist`)
    const html = readFileSync(url, 'utf8')
    assert.match(html, /<title>PaperBanana 生图模型排行榜<\/title>/u)
    assert.match(html, /<script type="module" src="\/src\/main\.jsx"><\/script>/u)
  }
})
