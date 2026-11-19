// Public, unauthenticated model documentation only. --check is strictly offline.
// Chrome launch is blocked in this sandbox; evaluate the actual portal ES modules
// in isolated JSDOM contexts, without CSS/layout, credentials, or arbitrary I/O.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'config/channel-audit/tokendance-rendered-pages-20261110.json')
const sha256 = value => createHash('sha256').update(value).digest('hex')
const ids = STATIC_MODEL_REGISTRY.tokendance.models.map(model => model.id)
if (process.argv.includes('--check')) {
  const data = JSON.parse(fs.readFileSync(output, 'utf8'))
  assert.equal(data.checkedAt, '2026-11-10')
  assert.deepEqual(data.pages.map(page => page.id), ids)
  for (const page of data.pages) {
    for (const kind of ['html', 'portal', 'rendered']) assert.equal(page[kind].sha256, sha256(page[kind].body), page.id + '/' + kind)
    const real = page.portal.status === 200 && JSON.parse(page.portal.body).slug === page.id && page.rendered.headings.includes(JSON.parse(page.portal.body).name) && !/Model not found/i.test(page.rendered.body)
    assert.equal(page.verified, real, page.id)
    for (const dependency of page.dependencies || []) assert.equal(dependency.sha256, sha256(dependency.body), dependency.url)
    assert.equal(page.evidenceSha256, sha256([page.html.sha256, page.portal.sha256, page.rendered.sha256].join('\n')))
  }
  console.log(`TokenDance rendered evidence: ${data.pages.filter(p => p.verified).length}/${ids.length} verified; hashes intact`)
} else {
  assert.ok(process.argv.includes('--capture'), 'Use --check offline or --capture for public documentation GETs')
  const { JSDOM, VirtualConsole } = createRequire(path.join(root, 'apps/web/package.json'))('jsdom')
  const assets = new Map(), assetEvidence = new Map()
  const get = async url => {
    const parsed = new URL(url)
    assert.equal(parsed.origin, 'https://tokendance.space')
    assert.match(parsed.pathname, /^\/(?:models\/[^/]+|portal\/api\/models\/[^/]+(?:\/endpoints\/(?:stats|timeseries))?|assets\/[^/]+\.js)$/)
    const response = await fetch(url, { method: 'GET', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(30000) })
    const body = await response.text()
    return { url, status: response.status, fetchedAt: new Date().toISOString(), sha256: sha256(body), body }
  }
  const asset = url => {
    if (!assets.has(url)) assets.set(url, get(url).then(record => { assert.equal(record.status, 200); assetEvidence.set(url, { ...record, body: undefined }); return record.body }))
    return assets.get(url)
  }
  const pages = []
  for (const id of ids) {
    const url = 'https://tokendance.space/models/' + id
    const [html, portal] = await Promise.all([get(url), get('https://tokendance.space/portal/api/models/' + id)])
    const errors = [], blocked = new Set(), dependencies = []
    const dom = new JSDOM(html.body, { url, runScripts: 'outside-only', pretendToBeVisual: true,
      virtualConsole: new VirtualConsole().on('jsdomError', error => errors.push(error.message)) })
    const w = dom.window, context = dom.getInternalVMContext()
    // The main module preloads chunks; the module loader below fetches them once.
    // API responses replay the exact independently captured public response.
    w.fetch = async (input, init = {}) => {
      const target = new URL(input, url)
      if ((init.method || 'GET') === 'GET' && target.origin === new URL(url).origin) {
        if (target.pathname === '/portal/api/models/' + id && !target.search) return new Response(portal.body, { status: portal.status, headers: { 'content-type': 'application/json' } })
        if (target.pathname === '/portal/api/models/' + id + '/endpoints/stats' || target.pathname === '/portal/api/models/' + id + '/endpoints/timeseries') { const record = await get(target.href); dependencies.push(record); return new Response(record.body, { status: record.status, headers: { 'content-type': 'application/json' } }) }
        if (/^\/assets\/[^/]+\.js$/.test(target.pathname)) return new Response('')
      }
      blocked.add((init.method || 'GET') + ' ' + target.origin + target.pathname)
      return Response.json({ error: { message: 'Not part of model documentation capture' } }, { status: 403 })
    }
    Object.assign(w, { Headers, Request, Response, TextEncoder, TextDecoder,
      ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
      matchMedia: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) })
    w.XMLHttpRequest = class { constructor() { throw Error('XHR disabled') } }
    w.WebSocket = class { constructor() { throw Error('WebSocket disabled') } }
    const append = w.document.head.appendChild.bind(w.document.head)
    w.document.head.appendChild = node => { const result = append(node); if (node.tagName === 'LINK') setTimeout(() => node.dispatchEvent(new w.Event('load')), 0); return result }
    const modules = new Map()
    const load = async target => {
      if (!modules.has(target)) modules.set(target, asset(target).then(code => new vm.SourceTextModule(code, {
        context, identifier: target, initializeImportMeta: meta => { meta.url = target },
        importModuleDynamically: async (specifier, ref) => {
          const module = await load(new URL(specifier, ref.identifier).href)
          if (module.status === 'unlinked') await module.link(link)
          if (module.status === 'linked') await module.evaluate()
          return module
        },
      })))
      return modules.get(target)
    }
    const link = (specifier, ref) => load(new URL(specifier, ref.identifier).href)
    const entry = await load('https://tokendance.space' + html.body.match(/src="(\/assets\/[^" ]+\.js)"/)[1])
    await entry.link(link)
    await entry.evaluate()
    const data = JSON.parse(portal.body)
    for (let attempt = 0; attempt < 100; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50))
      if (/Model not found/i.test(w.document.body.textContent) || [...w.document.querySelectorAll('h1,h2')].some(h => h.textContent === data.name)) break
    }
    const body = w.document.body.textContent.trim()
    const headings = [...w.document.querySelectorAll('h1,h2')].map(h => h.textContent)
    const rendered = { engine: 'actual SPA ES modules in JSDOM; no CSS/layout', capturedAt: new Date().toISOString(), title: w.document.title, headings, body, sha256: sha256(body), errors: [...new Set(errors)], blockedRequests: [...blocked] }
    const verified = portal.status === 200 && data.slug === id && headings.includes(data.name) && !/Model not found/i.test(body)
    pages.push({ id, checkedAt: '2026-11-10', url, verified, result: verified ? 'model-rendered' : /Model not found/i.test(body) ? 'model-not-found' : 'empty-or-unverified', html, portal, dependencies, rendered,
      evidenceSha256: sha256([html.sha256, portal.sha256, rendered.sha256].join('\n')) })
    dom.window.close()
    console.log(`${pages.length}/${ids.length} ${id}: ${pages.at(-1).result}`)
    fs.writeFileSync(output, JSON.stringify({ checkedAt: '2026-11-10', auditTimezone: 'Asia/Shanghai', method: 'Public unauthenticated GET HTML + exact portal JSON; actual SPA rendered using captured JSON. Public model-page stats/timeseries dependencies captured; all other API requests blocked. Browser launch attempted with Chrome headless: SIGABRT / kill EPERM; JSDOM is text/DOM evidence, not browser visual QA.', assets: [...assetEvidence.values()], pages }, null, 2) + '\n')
  }
}
