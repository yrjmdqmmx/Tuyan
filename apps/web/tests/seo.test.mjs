import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import config from '../vite.config.js'
import { resolveWorkspaceLocation } from '../src/workspace/workspaceRoutes.js'

const origin = 'https://tuyansci.cn'
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const sitemap = new JSDOM(read('public/sitemap.xml'), { contentType: 'application/xml' }).window.document
const urls = [...sitemap.querySelectorAll('url > loc')].map(node => new URL(node.textContent))
const robots = read('public/robots.txt')
const disallowed = [...robots.matchAll(/^Disallow: (.+)$/gm)].map(([, path]) =>
  new RegExp(`^${path.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}`))
const canCrawl = url => !disallowed.some(rule => rule.test(url.pathname + url.search))

function assertMetadata(source, canonical) {
  const { document } = new JSDOM(source).window
  const single = selector => {
    const nodes = document.head.querySelectorAll(selector)
    assert.equal(nodes.length, 1, `${canonical}: ${selector} must occur once`)
    return nodes[0]
  }
  assert.equal(single('link[rel="canonical"]').getAttribute('href'), canonical)
  const description = single('meta[name="description"]').content
  assert.match(description, /[\u4e00-\u9fff]/u)
  assert.ok(description.length <= 160)
  assert.equal(single('meta[property="og:title"]').content, document.title)
  assert.equal(single('meta[property="og:description"]').content, description)
  assert.equal(single('meta[property="og:url"]').content, canonical)
  assert.equal(single('meta[property="og:type"]').content, 'website')
  assert.doesNotMatch(document.querySelector('meta[name="robots"]')?.content || '', /noindex/i)
}

test('sitemap URLs are distinct public, indexable files with matching metadata', () => {
  assert.equal(sitemap.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9')
  assert.equal(new Set(urls.map(url => url.href)).size, urls.length)
  for (const required of ['/', '/about.html', '/privacy-policy.html', '/terms-of-service.html', '/changelog/', '/leaderboard/', '/leaderboard/methodology/']) {
    assert.ok(urls.some(url => url.pathname === required), required)
  }
  for (const url of urls) {
    assert.equal(url.origin, origin)
    assert.equal(url.search + url.hash, '')
    assert.ok(canCrawl(url), `${url.href} must be crawlable`)
    const source = url.pathname.endsWith('.html') ? `public${url.pathname}`
      : url.pathname === '/' ? 'index.html' : `${url.pathname.slice(1)}index.html`
    if (!source.startsWith('public/')) {
      assert.ok(Object.values(config.build.rollupOptions.input).includes(fileURLToPath(new URL(`../${source}`, import.meta.url))))
      if (url.pathname !== '/') assert.equal(resolveWorkspaceLocation(url).publicPage, true)
    }
    assertMetadata(read(source), url.href)
  }
  assert.ok(!urls.some(url => url.pathname.startsWith('/bench')), 'legacy bench is not a second canonical page')
  assertMetadata(read('bench/index.html'), `${origin}/leaderboard/`)
})

test('robots allows public pages and excludes real account, API, admin and private query views', () => {
  assert.match(robots, /^User-agent: \*$/m)
  assert.match(robots, /^Allow: \/$/m)
  assert.match(robots, /^Sitemap: https:\/\/tuyansci\.cn\/sitemap\.xml$/m)
  for (const path of ['/api/auth/get-session', '/paperbanana-api', '/health', '/ready', '/account/reset-password.html', '/leaderboard/admin/prompt-submissions/']) {
    assert.equal(canCrawl(new URL(path, origin)), false, path)
  }
  for (const query of ['admin=overview', 'admin', 'tokendance_wallet=1', 'view=account', 'view=records', 'view=models', 'view=ecosystem', 'view=feedback', 'view=generate', 'view=refine']) {
    for (const prefix of ['/?', '/?source=link&']) {
      const url = new URL(prefix + query, origin)
      assert.equal(resolveWorkspaceLocation(url).publicPage, false, url.href)
      assert.equal(canCrawl(url), false, url.href)
    }
  }
  assert.equal(canCrawl(new URL('/?auth=sign-in', origin)), false)
  for (const path of ['/', '/?view=guide', '/?view=agents', '/?view=contact', '/?view=miniprogram', '/leaderboard/scientific-faithfulness/', '/assets/main.js', '/logo.svg']) {
    assert.equal(canCrawl(new URL(path, origin)), true, path)
  }
})
