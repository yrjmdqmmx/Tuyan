import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const routeEntries = [
  ['leaderboard', 'leaderboard/index.html'],
  ['leaderboard-methodology', 'leaderboard/methodology/index.html'],
  ['leaderboard-faithfulness', 'leaderboard/faithfulness/index.html'],
  ['leaderboard-conciseness', 'leaderboard/conciseness/index.html'],
  ['leaderboard-readability', 'leaderboard/readability/index.html'],
  ['leaderboard-aesthetics', 'leaderboard/aesthetics/index.html'],
  ['leaderboard-text-accuracy', 'leaderboard/text-accuracy/index.html'],
  ['leaderboard-topology', 'leaderboard/topology/index.html'],
  ['leaderboard-instruction-adherence', 'leaderboard/instruction-adherence/index.html'],
  ['leaderboard-scientific-faithfulness', 'leaderboard/scientific-faithfulness/index.html'],
  ['leaderboard-structural-topology', 'leaderboard/structural-topology/index.html'],
  ['leaderboard-text-symbol-accuracy', 'leaderboard/text-symbol-accuracy/index.html'],
  ['leaderboard-quantitative-accuracy', 'leaderboard/quantitative-accuracy/index.html'],
  ['leaderboard-readability-visual-hierarchy', 'leaderboard/readability-visual-hierarchy/index.html'],
  ['leaderboard-information-density', 'leaderboard/information-density/index.html'],
  ['leaderboard-publication-aesthetics', 'leaderboard/publication-aesthetics/index.html'],
  ['leaderboard-edit-target-accuracy', 'leaderboard/edit-target-accuracy/index.html'],
  ['leaderboard-non-target-preservation', 'leaderboard/non-target-preservation/index.html'],
  ['leaderboard-submit-prompt', 'leaderboard/submit-prompt/index.html'],
  ['leaderboard-prompt-admin', 'leaderboard/admin/prompt-submissions/index.html'],
]

test('Vite multi-page inputs include leaderboard overview, methodology, and all seven dimension deep links', async () => {
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

test('404 entry shows a neutral leaderboard loading state instead of a false not-found page while fallback boots', () => {
  const html = readFileSync(new URL('../404.html', import.meta.url), 'utf8')
  assert.match(html, /页面未找到/u)
  assert.match(html, /正在打开排行榜/u)
  assert.match(html, /data-leaderboard-loading/u)
  assert.match(html, /data-generic-not-found/u)
  assert.match(html, /leaderboard-fallback-route/u)
  assert.ok(html.indexOf('leaderboard-fallback-route') < html.indexOf('<body>'))
  assert.match(html, /data-app-home/u)
  assert.match(html, /<script type="module" src="\/src\/leaderboardFallback\.js"><\/script>/u)
  assert.doesNotMatch(html, /src="\/src\/main\.jsx"/u)
})

test('every leaderboard deep-link entry boots the shared React route resolver', () => {
  for (const [, relativePath] of routeEntries) {
    const url = new URL(`../${relativePath}`, import.meta.url)
    assert.equal(existsSync(url), true, `${relativePath} should exist`)
    const html = readFileSync(url, 'utf8')
    if (relativePath === 'leaderboard/methodology/index.html') {
      assert.match(html, /<title>图研 Tuyan Benchmark · 方法说明<\/title>/u)
    } else if (relativePath === 'leaderboard/submit-prompt/index.html') {
      assert.match(html, /<title>提交评估题 · 图研 Tuyan Benchmark<\/title>/u)
    } else if (relativePath === 'leaderboard/admin/prompt-submissions/index.html') {
      assert.match(html, /<title>社区评估题审核 · 图研 Tuyan Benchmark<\/title>/u)
    } else {
      assert.match(html, /<title>图研 Tuyan Benchmark · 科研图示生成与编辑模型基准评测<\/title>/u)
    }
    assert.match(html, /<script type="module" src="\/src\/main\.jsx"><\/script>/u)
  }
})
