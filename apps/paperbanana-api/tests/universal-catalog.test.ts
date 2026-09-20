import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUniversalConnection, normalizeUniversalRoute, universalConnectionCredential, resolveUniversalCatalogStrategy, UniversalApiError, universalCatalogError } from '../../../packages/api/src/universal-api.js'
import { createUniversalRuntime, UNIVERSAL_CATALOG_LIMITS } from '../src/universal-adapters.js'
import { createUniversalTransport, type UniversalTransportRequest, type UniversalTransportResponse } from '../src/universal-transport.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

function connection(changes: any = {}) { return { version: 1, connectionId: 'directory', protocol: 'openai-chat', baseUrl: 'https://api.example.com/custom/v1', auth: 'bearer', catalogFormat: 'openai', ...changes } }
function envelope(c = connection(), changes = {}) { return JSON.stringify({ [c.connectionId]: { baseUrl: c.baseUrl, protocol: c.protocol, auth: c.auth, apiKey: 'catalog-fixture-key', ...changes } }) }
function fixture(pages: any[]) {
  const requests: UniversalTransportRequest[] = []
  const runtime = createUniversalRuntime({ transport: { checkUrl: async () => {}, request: async request => {
    requests.push(request)
    const page = pages[requests.length - 1]
    if (page instanceof Error) throw page
    if (page?.bytes) return page as UniversalTransportResponse
    return { status: 200, headers: new Headers(), bytes: Buffer.from(JSON.stringify(page)) }
  } } })
  return { requests, runtime }
}
function errorCode(code: string) { return (error: unknown) => error instanceof UniversalApiError && error.code === code && error.requestState === 'not_sent' && !error.uncertain }

test('connection-only validation and credentials have no model ID or capability preconditions; inference remains strict', async () => {
  const c = normalizeUniversalConnection(connection())
  assert.equal(c.baseUrl, 'https://api.example.com/custom/v1')
  assert.equal(universalConnectionCredential(c, envelope()), 'catalog-fixture-key')
  for (const modelId of ['', undefined]) assert.throws(() => normalizeUniversalRoute({ accessProvider: 'custom', modelId, custom: c }), errorCode('CONFIG_INVALID'))
  const { runtime, requests } = fixture([{ data: [{ id: 'unknown-exact:model' }] }])
  assert.equal((await runtime.checkConnection(c)).state, 'connection-valid'); assert.equal(requests.length, 0)
  const catalog = await runtime.catalog(c, 'key')
  assert.equal(catalog.selectedModelVisible, null); assert.equal(catalog.state, 'catalog-visible'); assert.equal(catalog.complete, true); assert.equal(catalog.truncated, false)
  assert.equal(catalog.verified, false); assert.equal(catalog.inferenceVerified, false); assert.ok(Number.isFinite(Date.parse(catalog.fetchedAt)))
  assert.deepEqual(catalog.models, [{ id: 'unknown-exact:model' }]); assert.equal(requests[0].method, 'GET'); assert.equal(requests[0].body, undefined)
})

test('catalog resolver audits exact origin/path/protocol/auth; unknown compatible servers require explicit schema', async () => {
  const cases = [
    ['https://api.openai.com', 'openai-responses', 'bearer', 'openai'],
    ['https://api.openai.com/v1', 'openai-images', 'bearer', 'openai'],
    ['https://openrouter.ai/api/v1', 'openai-chat', 'bearer', 'openai'],
    ['https://api.anthropic.com', 'anthropic-messages', 'x-api-key', 'anthropic'],
    ['https://generativelanguage.googleapis.com', 'gemini-generate-content', 'x-goog-api-key', 'gemini'],
    ['https://generativelanguage.googleapis.com/v1beta', 'gemini-interactions', 'x-goog-api-key', 'gemini'],
  ]
  for (const [baseUrl, protocol, auth, format] of cases) assert.deepEqual(Object.values(resolveUniversalCatalogStrategy(connection({ baseUrl, protocol, auth, catalogFormat: 'auto' }))).slice(0, 3), [true, format, 'official'])
  for (const c of [connection({ catalogFormat: 'auto' }), connection({ baseUrl: 'https://api.openai.com.attacker.example/v1', catalogFormat: 'auto' }), connection({ baseUrl: 'https://api.openai.com/wrong/v1', catalogFormat: 'auto' }), connection({ baseUrl: 'https://api.openai.com/v1', protocol: 'anthropic-messages', catalogFormat: 'auto' }), connection({ baseUrl: 'https://api.openai.com/v1', auth: 'x-api-key', catalogFormat: 'auto' }), connection({ protocol: 'dashscope-multimodal', catalogFormat: 'auto' }), connection({ catalogFormat: 'none' })]) {
    const { runtime, requests } = fixture([])
    assert.equal(resolveUniversalCatalogStrategy(c).supported, false)
    const result = await runtime.catalog(c, 'key'); assert.equal(result.state, 'unsupported'); assert.equal(result.selectedModelVisible, null); assert.equal(requests.length, 0)
  }
  const explicit = connection({ protocol: 'anthropic-messages', auth: 'x-api-key', catalogFormat: 'openai' })
  assert.equal(resolveUniversalCatalogStrategy(explicit).source, 'explicit')
  const { runtime, requests } = fixture([{ data: [{ id: 'literal-id' }] }])
  assert.deepEqual((await runtime.catalog(explicit, 'key')).models, [{ id: 'literal-id' }]); assert.equal(requests[0].url, 'https://api.example.com/custom/v1/models')
  for (const catalogFormat of ['', null, 'unknown']) assert.throws(() => normalizeUniversalConnection(connection({ catalogFormat })), errorCode('CATALOG_CONFIG_INVALID'))
})

test('connection credential binding rejects endpoint, protocol, authentication and connection ID changes before any read', () => {
  const c = connection()
  for (const changes of [{ baseUrl: 'https://other.example.com/v1' }, { protocol: 'openai-images' }, { auth: 'x-api-key' }, { apiKey: 'line\nbreak' }]) assert.throws(() => universalConnectionCredential(c, envelope(c, changes)), errorCode('CREDENTIAL_MISMATCH'))
  assert.throws(() => universalConnectionCredential({ ...c, connectionId: 'another' }, envelope(c)), errorCode('CREDENTIAL_MISMATCH'))
  assert.equal(universalConnectionCredential({ ...c, catalogFormat: 'anthropic' }, envelope(c)), 'catalog-fixture-key')
})

test('Anthropic pagination uses version header, after_id and full-directory duplicate quarantine', async () => {
  const { runtime, requests } = fixture([
    { data: [{ id: 'keep-a' }, { id: 'duplicate' }], has_more: true, last_id: 'duplicate' },
    { data: [{ id: 'duplicate', supported_protocols: null }, null, { id: 'keep-b' }], has_more: false, last_id: 'keep-b' },
  ])
  const result = await runtime.catalog(connection({ protocol: 'anthropic-messages', auth: 'x-api-key', catalogFormat: 'anthropic' }), 'key', 'keep-b')
  assert.equal(requests.length, 2); assert.equal(requests[0].url, 'https://api.example.com/custom/v1/models?limit=1000'); assert.equal(requests[1].url, 'https://api.example.com/custom/v1/models?limit=1000&after_id=duplicate')
  assert.equal(requests[0].headers!['anthropic-version'], '2023-06-01'); assert.equal(requests[0].headers!['x-api-key'], 'key')
  assert.deepEqual(result.models, [{ id: 'keep-a' }, { id: 'keep-b' }]); assert.equal(result.complete, true); assert.equal(result.state, 'catalog-partial'); assert.equal(result.selectedModelVisible, true)
  assert.equal(result.warnings.length, 3); assert.ok(result.warnings.some(x => x.code === 'id_duplicate' && x.row === 1)); assert.ok(result.warnings.some(x => x.row === 2))
})

test('Gemini pagination retains exact models/name identities and never embeds credentials in page tokens', async () => {
  const token = 'opaque=token+with/slashes?'
  const { runtime, requests } = fixture([{ models: [{ name: 'models/model-a' }], nextPageToken: token }, { models: [{ name: 'models/model-b' }] }])
  const result = await runtime.catalog(connection({ baseUrl: 'https://generativelanguage.googleapis.com/v1beta', protocol: 'gemini-interactions', auth: 'x-goog-api-key', catalogFormat: 'auto' }), 'catalog-secret', 'models/model-b')
  assert.deepEqual(result.models, [{ id: 'models/model-a' }, { id: 'models/model-b' }]); assert.equal(result.complete, true); assert.equal(result.selectedModelVisible, true)
  assert.equal(requests.length, 2); assert.equal(new URL(requests[1].url).searchParams.get('pageToken'), token)
  for (const r of requests) { assert.equal(new URL(r.url).origin, 'https://generativelanguage.googleapis.com'); assert.equal(r.headers!['x-goog-api-key'], 'catalog-secret'); assert.equal(r.url.includes('catalog-secret'), false) }
})

test('catalog shape, wholly invalid, empty and mixed-row results stay distinct without inferred capabilities', async () => {
  for (const data of [[], null, {}, { models: [] }, { data: {} }, { error: { message: 'hidden-secret' }, data: [] }]) await assert.rejects(fixture([data]).runtime.catalog(connection(), 'key'), errorCode('CATALOG_RESPONSE_INVALID'))
  for (const [data, state, length] of [[{ data: [] }, 'catalog-empty', 0], [{ data: [null, {}, { id: '../path' }] }, 'catalog-invalid', 0], [{ data: [null, { id: 'gpt-image-vision-powerful' }] }, 'catalog-partial', 1]] as const) {
    const result = await fixture([data]).runtime.catalog(connection(), 'key')
    assert.equal(result.state, state); assert.equal(result.models.length, length); assert.equal(result.complete, true)
    for (const row of result.models) assert.deepEqual(Object.keys(row), ['id'])
  }
})

test('invalid/repeated pagination and halfway errors never claim a complete or empty directory', async () => {
  for (const pages of [
    [{ models: [{ name: 'a' }], nextPageToken: 'same' }, { models: [{ name: 'b' }], nextPageToken: 'same' }],
    [{ models: [{ name: 'a' }], nextPageToken: 42 }],
    [{ models: [{ name: 'a' }], nextPageToken: 'next' }, new UniversalApiError('REQUEST_TIMEOUT', 'not_sent', 504)],
  ]) {
    const result = await fixture(pages).runtime.catalog(connection({ catalogFormat: 'gemini' }), 'key', 'absent')
    assert.equal(result.state, 'catalog-partial'); assert.equal(result.complete, false); assert.equal(result.truncated, false); assert.ok(result.error); assert.ok(result.warnings.some(x => x.code === 'page_fetch_failed'))
  }
  const anthropic = await fixture([{ data: [{ id: 'a' }], has_more: true, last_id: 'wrong' }]).runtime.catalog(connection({ catalogFormat: 'anthropic' }), 'key')
  assert.equal(anthropic.complete, false); assert.equal(anthropic.error?.code, 'CATALOG_RESPONSE_INVALID')
  const unknownPagination = await fixture([{ data: [{ id: 'a' }], has_more: true, last_id: 'a' }]).runtime.catalog(connection(), 'key')
  assert.equal(unknownPagination.complete, false); assert.equal(unknownPagination.state, 'catalog-partial')
})

test('pagination stops at the page/row limits and caps response bytes; no hidden retries occur', async () => {
  const pages = Array.from({ length: UNIVERSAL_CATALOG_LIMITS.maxPages }, (_, i) => ({ models: [{ name: `models/${i}` }], nextPageToken: `page-${i + 1}` }))
  const f = fixture(pages), result = await f.runtime.catalog(connection({ catalogFormat: 'gemini' }), 'key')
  assert.equal(f.requests.length, UNIVERSAL_CATALOG_LIMITS.maxPages); assert.equal(result.truncated, true); assert.equal(result.complete, false); assert.equal(result.models.length, 10)
  const rows = Array.from({ length: UNIVERSAL_CATALOG_LIMITS.maxRows }, (_, i) => ({ name: `models/${i}` }))
  const rowBound = fixture([{ models: rows, nextPageToken: 'next' }]); assert.equal((await rowBound.runtime.catalog(connection({ catalogFormat: 'gemini' }), 'key')).truncated, true); assert.equal(rowBound.requests.length, 1)
  for (const r of f.requests) assert.equal(r.maxResponseBytes, UNIVERSAL_CATALOG_LIMITS.maxPageBytes)
  const paddedPages = Array.from({ length: 4 }, (_, i) => {
    const json = JSON.stringify({ models: [{ name: `models/large-${i}` }], nextPageToken: `large-${i + 1}` })
    return { status: 200, headers: new Headers(), bytes: Buffer.from(json.padEnd(UNIVERSAL_CATALOG_LIMITS.maxPageBytes, ' ')) }
  })
  const byteBound = fixture(paddedPages), byteResult = await byteBound.runtime.catalog(connection({ catalogFormat: 'gemini' }), 'key')
  assert.equal(byteResult.truncated, true); assert.equal(byteBound.requests.length, 4); assert.equal(byteResult.complete, false)
  await assert.rejects(fixture([{ status: 200, headers: new Headers(), bytes: Buffer.alloc(UNIVERSAL_CATALOG_LIMITS.maxPageBytes + 1) }]).runtime.catalog(connection(), 'key'), errorCode('CATALOG_RESPONSE_LIMIT'))
})

test('catalog network/permission/rate/timeout/provider errors are Chinese and contain no charged-inference language or raw secrets', async () => {
  for (const [error, code] of [
    [new UniversalApiError('UPSTREAM_REJECTED', 'not_sent', 401), 'CATALOG_AUTH_FAILED'],
    [new UniversalApiError('UPSTREAM_REJECTED', 'not_sent', 403), 'CATALOG_PERMISSION_DENIED'],
    [new UniversalApiError('UPSTREAM_REJECTED', 'not_sent', 429), 'CATALOG_RATE_LIMITED'],
    [new UniversalApiError('REQUEST_TIMEOUT', 'not_sent', 504), 'CATALOG_TIMEOUT'],
    [new UniversalApiError('DNS_RESOLUTION_FAILED', 'not_sent', 503), 'CATALOG_NETWORK_ERROR'],
    [new UniversalApiError('NETWORK_ERROR', 'not_sent', 502), 'CATALOG_NETWORK_ERROR'],
    [new UniversalApiError('UPSTREAM_FAILURE', 'not_sent', 503), 'CATALOG_PROVIDER_ERROR'],
    [new UniversalApiError('ENDPOINT_NOT_FOUND', 'not_sent', 404), 'CATALOG_ENDPOINT_NOT_FOUND'],
  ] as const) {
    const f = fixture([error]); await assert.rejects(f.runtime.catalog(connection(), 'key'), (value: unknown) => {
      assert.ok(errorCode(code)(value)); const serialized = JSON.stringify(value)
      assert.doesNotMatch(serialized, /可能已产生费用|核对本次请求与费用|结果尚未确认|hidden-secret/); assert.match(serialized, /目录/); return true
    }); assert.equal(f.requests.length, 1)
  }
  assert.equal(universalCatalogError({ name: 'UniversalApiError', code: 'CATALOG_TIMEOUT', status: 504, message: 'hidden-secret' }).code, 'CATALOG_TIMEOUT')
  assert.doesNotMatch(JSON.stringify(universalCatalogError(new Error('hidden-secret'))), /hidden-secret/)
})

test('real catalog transport permits only bounded pagination queries and GET while preserving private DNS/redirect safeguards', async () => {
  const urls: string[] = [], publicDns = [{ address: '8.8.8.8', family: 4 }]
  const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async url => { urls.push(url); return new Response('{}') } })
  const request = { url: 'https://api.example.com/v1/models?limit=1000&after_id=opaque%2Fcursor', method: 'GET' as const, kind: 'catalog' as const, maxResponseBytes: 1024 }
  await transport.request(request)
  await transport.request({ ...request, url: 'https://api.example.com/v1/models?pageSize=1000&pageToken=a%3Db%2Bc' })
  for (const url of ['https://api.example.com/v1/models?key=secret', 'https://api.example.com/v1/models?limit=1001', 'https://api.example.com/v1/models?limit=1&limit=2', 'https://api.example.com/v1/models?pageToken=a&after_id=b', 'https://api.example.com/v1/models?after_id=%0A', 'https://api.example.com/v1/messages?after_id=a']) await assert.rejects(transport.request({ ...request, url }), errorCode('ENDPOINT_UNSAFE'))
  await assert.rejects(transport.request({ ...request, method: 'POST' }), errorCode('ENDPOINT_UNSAFE'))
  await assert.rejects(transport.request({ ...request, kind: 'inference' }), errorCode('ENDPOINT_UNSAFE'))
  assert.equal(urls.length, 2)
  const privateTransport = createUniversalTransport({ resolve: async () => [{ address: '127.0.0.1', family: 4 }], fetch: async () => { throw new Error('must not send') } })
  await assert.rejects(privateTransport.request(request), errorCode('ENDPOINT_UNSAFE'))
  const redirected = createUniversalRuntime({ resolve: async () => publicDns, fetch: async () => new Response(null, { status: 302, headers: { location: 'https://other.example.com' } }) })
  await assert.rejects(redirected.catalog(connection(), 'key'), errorCode('ENDPOINT_UNSAFE'))
})

test('authenticated legacy bridge accepts connection-only GET and rejects blank inference routes/key hijacking', async () => {
  const f = await createRefineRuntime({ tokenDance: true }), catalog = fixture([{ data: [{ id: 'pick-me' }] }])
  try {
    f.legacy.configureUniversalRuntime(catalog.runtime)
    const body = { action: 'universalApiCheck', check: 'catalog', connection: connection(), apiKeys: { custom: envelope() } }
    assert.equal((await f.post(body, 'anonymous')).status, 401); assert.equal(catalog.requests.length, 0)
    const result = await f.post(body)
    assert.equal(result.data.code, 0, JSON.stringify(result)); assert.equal(result.data.state, 'catalog-visible'); assert.deepEqual(result.data.models, [{ id: 'pick-me' }]); assert.equal(catalog.requests.length, 1)
    assert.notEqual((await f.post({ ...body, connection: connection({ baseUrl: 'https://other.example.com/v1' }) })).data.code, 0); assert.equal(catalog.requests.length, 1)
    assert.notEqual((await f.post({ action: 'universalApiCheck', check: 'config', route: { accessProvider: 'custom', modelId: '', custom: connection() } })).data.code, 0); assert.equal(catalog.requests.length, 1)
    assert.notEqual((await f.post({ action: 'universalApiCheck', check: 'catalog', route: { accessProvider: 'custom', modelId: '', custom: connection() }, apiKeys: { custom: envelope() } })).data.code, 0); assert.equal(catalog.requests.length, 1)
    const oldRoute = { accessProvider: 'custom', modelId: 'legacy-id', custom: { ...connection(), capabilities: { text: true, vision: false, imageGeneration: false, imageEditing: false }, inputLimits: { maxCount: 0, maxBytes: 1024, maxTotalBytes: 1024, maxDimension: 100, maxPixels: 10000, requestMaxBytes: 4096, mimeTypes: ['image/png'] }, outputLimits: { maxBytes: 1024, maxDimension: 100, maxPixels: 10000, mimeTypes: ['image/png'] } } }
    const oldCatalog = fixture([{ data: [{ id: 'legacy-id' }] }]); f.legacy.configureUniversalRuntime(oldCatalog.runtime)
    const legacy = await f.post({ action: 'universalApiCheck', check: 'catalog', route: oldRoute, apiKeys: { custom: envelope() } })
    assert.equal(legacy.data.state, 'catalog-visible'); assert.equal(legacy.data.selectedModelVisible, true); assert.equal(oldCatalog.requests.length, 1)
    const oldConfig = await f.post({ action: 'universalApiCheck', check: 'config', route: oldRoute })
    assert.equal(oldConfig.data.state, 'configuration-valid'); assert.equal(oldCatalog.requests.length, 1)
    f.legacy.configureUniversalRuntime(fixture([new UniversalApiError('NETWORK_ERROR', 'not_sent', 502)]).runtime)

    const failed = await f.post(body)
    assert.match(JSON.stringify(failed.data), /CATALOG_NETWORK_ERROR/); assert.doesNotMatch(JSON.stringify(failed.data), /可能已产生费用|核对本次请求与费用|billingMessage|任务执行/)
  } finally { await f.close() }
})
