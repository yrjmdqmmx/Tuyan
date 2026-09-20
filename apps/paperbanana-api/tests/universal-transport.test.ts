import test from 'node:test'
import assert from 'node:assert/strict'
import { createUniversalTransport, universalPublicIp } from '../src/universal-transport.js'
import { UniversalApiError } from '../../../packages/api/src/universal-api.js'

const publicDns = [{ address: '93.184.216.34', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }]
const request = { url: 'https://api.example.com/v1/responses', method: 'POST' as const, headers: { Authorization: 'Bearer hidden-secret', 'Content-Type': 'application/json' }, body: '{}', maxRequestBytes: 1000, maxResponseBytes: 1000, kind: 'inference' as const }
function state(expected: string) { return (error: unknown) => error instanceof UniversalApiError && error.requestState === expected && !JSON.stringify(error).includes('hidden-secret') && !JSON.stringify(error).includes('example.com') }

test('all local, link-local, shared, multicast, reserved, mapped and transition IP ranges are denied', () => {
  for (const ip of ['0.0.0.0', '10.4.1.2', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.254', '192.168.3.1', '100.64.0.1', '100.127.255.254', '192.0.0.8', '192.0.2.3', '192.88.99.1', '198.18.0.1', '198.19.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '255.255.255.255', '::', '::1', '::ffff:127.0.0.1', '::ffff:93.184.216.34', 'fc00::1', 'fe80::1', 'ff02::1', '2001:db8::1', '2001:0:4136:e378::1', '2002:7f00:1::1', '3fff::1', 'fe80::1%lo0']) assert.equal(universalPublicIp(ip), false, ip)
  for (const ip of ['93.184.216.34', '1.1.1.1', '8.8.8.8', '2606:4700:4700::1111', '2001:4860:4860::8888']) assert.equal(universalPublicIp(ip), true, ip)
})
test('DNS failures, empty/malformed answers, private and mixed records stop before credentials can leave', async () => {
  let calls = 0
  for (const addresses of [[], [{ address: '127.0.0.1', family: 4 }], [...publicDns, { address: '10.0.0.4', family: 4 }], [{ address: '93.184.216.34', family: 6 }], [null] as any]) {
    const transport = createUniversalTransport({ resolve: async () => addresses, fetch: async () => { calls++; return new Response('{}') } })
    await assert.rejects(transport.request(request), state('not_sent'))
  }
  const failing = createUniversalTransport({ resolve: async () => { throw new Error('hidden-secret api.example.com') }, fetch: async () => { calls++; return new Response('{}') } })
  await assert.rejects(failing.checkUrl(request.url), state('not_sent')); assert.equal(calls, 0)
})
test('literal aliases and non-HTTPS or credential-bearing targets cannot bypass address guards', async () => {
  let calls = 0
  const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async () => { calls++; return new Response('{}') } })
  for (const url of ['https://2130706433/v1', 'https://0x7f000001/v1', 'https://127.1/v1', 'https://[::1]/v1', 'https://[::ffff:127.0.0.1]/v1', 'http://api.example.com/v1', 'https://u:p@api.example.com/v1', 'https://api.example.com:444/v1', 'https://api.example.com/v1?key=hidden-secret']) await assert.rejects(transport.request({ ...request, url }), state('not_sent'))
  assert.equal(calls, 0)
})
test('custom host uses a pinned dispatcher, a single DNS snapshot and disabled redirects', async () => {
  let dnsCount = 0, fetchCount = 0
  const transport = createUniversalTransport({ resolve: async () => { dnsCount++; return dnsCount === 1 ? publicDns : [{ address: '127.0.0.1', family: 4 }] }, fetch: async (_url, init) => {
    fetchCount++; assert.ok(init.dispatcher); assert.equal(init.redirect, 'manual'); assert.equal(init.headers.Authorization, 'Bearer hidden-secret'); assert.equal(init.method, 'POST'); return new Response('{"ok":true}')
  } })
  const result = await transport.request(request); assert.equal(result.status, 200); assert.equal(dnsCount, 1); assert.equal(fetchCount, 1)
})
test('DNS is checked again at dispatch even after a successful admission check', async () => {
  let count = 0, calls = 0
  const transport = createUniversalTransport({ resolve: async () => ++count === 1 ? publicDns : [{ address: '169.254.169.254', family: 4 }], fetch: async () => { calls++; return new Response('{}') } })
  await transport.checkUrl('https://api.example.com/v1')
  await assert.rejects(transport.request(request), state('not_sent')); assert.equal(calls, 0)
})
test('audited official origins use existing egress while custom/lookalike hosts use pinned direct transport', async () => {
  const officialUrls: string[] = [], directUrls: string[] = []
  const transport = createUniversalTransport({ resolve: async () => publicDns, officialFetch: async (url, init) => { officialUrls.push(url); assert.equal(init.redirect, 'manual'); return new Response('{}') }, fetch: async url => { directUrls.push(url); return new Response('{}') } })
  await transport.request({ ...request, url: 'https://api.openai.com/v1/responses' })
  await transport.request({ ...request, url: 'https://api.openai.com.example.com/v1/responses' })
  assert.equal(officialUrls.length, 1); assert.equal(directUrls.length, 1)
})
test('redirects are never followed and their private Location or response text are never exposed', async () => {
  let calls = 0
  const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async () => { calls++; return new Response('hidden-secret', { status: 307, headers: { location: 'http://169.254.169.254/hidden-secret' } }) } })
  await assert.rejects(transport.request(request), state('unknown')); assert.equal(calls, 1)
})
test('post-dispatch status/network failures are sanitized, classified and never retried', async () => {
  for (const status of [400, 401, 402, 403, 429, 500, 503]) {
    let calls = 0
    const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async () => { calls++; return new Response('upstream hidden-secret api.example.com', { status }) } })
    await assert.rejects(transport.request(request), error => state(status < 500 ? 'rejected' : 'unknown')(error) && (error as UniversalApiError).status === status)
    assert.equal(calls, 1)
  }
  let calls = 0
  const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async () => { calls++; throw new Error('upstream hidden-secret api.example.com') } })
  await assert.rejects(transport.request(request), state('unknown')); assert.equal(calls, 1)
  await assert.rejects(transport.request({ ...request, method: 'GET', body: undefined, kind: 'catalog' }), state('not_sent')); assert.equal(calls, 2)
})
test('asset downloads allow signed queries, use the same DNS guard and strip every auth header', async () => {
  let calls = 0
  const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async (_url, init) => { calls++; assert.deepEqual(init.headers, {}); return new Response('image') } })
  await transport.request({ ...request, url: 'https://asset.example.com/image.png?signature=abc', method: 'GET', kind: 'asset', body: undefined, headers: { Authorization: 'Bearer hidden-secret', 'x-api-key': 'hidden-secret', 'x-goog-api-key': 'hidden-secret' } })
  await assert.rejects(transport.request({ ...request, url: 'https://user:hidden-secret@asset.example.com/image.png?signature=abc', method: 'GET', kind: 'asset', body: undefined }), state('not_sent'))
  const privateTransport = createUniversalTransport({ resolve: async () => [{ address: '192.168.1.1', family: 4 }], fetch: async () => { calls++; return new Response('image') } })
  await assert.rejects(privateTransport.request({ ...request, url: 'https://asset.example.com/image.png?signature=abc', kind: 'asset', method: 'GET', body: undefined }), state('not_sent')); assert.equal(calls, 1)
})
test('declared Content-Length and streamed response bytes enforce limits without reading unbounded data', async () => {
  let cancelled = 0
  const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(Buffer.from('long')); }, cancel() { cancelled++ } }), { headers: { 'content-length': '5000' } }) })
  await assert.rejects(transport.request(request), error => state('unknown')(error) && (error as UniversalApiError).code === 'RESPONSE_LIMIT'); assert.equal(cancelled, 1)
  const stream = createUniversalTransport({ resolve: async () => publicDns, fetch: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(Buffer.alloc(600)); controller.enqueue(Buffer.alloc(600)); }, cancel() { cancelled++ } })) })
  await assert.rejects(stream.request(request), error => state('unknown')(error) && (error as UniversalApiError).code === 'RESPONSE_LIMIT'); assert.equal(cancelled, 2)
})
test('encoded request size and pre-aborted calls stop before dispatch', async () => {
  let calls = 0
  const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async () => { calls++; return new Response('{}') } })
  await assert.rejects(transport.request({ ...request, body: '中'.repeat(400) }), state('not_sent'))
  const controller = new AbortController(); controller.abort()
  await assert.rejects(transport.request({ ...request, signal: controller.signal }), state('not_sent')); assert.equal(calls, 0)
})
test('DNS failures, DNS timeouts, request timeouts and provider failures have distinct controlled codes', async () => {
  const cases: [string, any, string][] = [
    ['DNS_RESOLUTION_FAILED', { resolve: async () => { throw new Error('lookup failed hidden-secret') } }, 'not_sent'],
    ['REQUEST_TIMEOUT', { resolve: async () => await new Promise(() => {}), dnsTimeoutMs: 5 }, 'not_sent'],
    ['REQUEST_TIMEOUT', { resolve: async () => publicDns, fetch: async () => { throw Object.assign(new Error('hidden-secret'), { name: 'TimeoutError' }) } }, 'unknown'],
    ['NETWORK_ERROR', { resolve: async () => publicDns, fetch: async () => { throw new Error('hidden-secret') } }, 'unknown'],
    ['UPSTREAM_FAILURE', { resolve: async () => publicDns, fetch: async () => new Response('hidden-secret', { status: 503 }) }, 'unknown'],
  ]
  for (const [code, options, expectedState] of cases) await assert.rejects(createUniversalTransport(options).request(request), error => state(expectedState)(error) && (error as UniversalApiError).code === code)
})
test('404 classification uses only a bounded allowlisted error code and discards upstream messages', async () => {
  for (const [body, code] of [[JSON.stringify({ error: { code: 'model_not_found', message: 'hidden-secret https://api.example.com' } }), 'MODEL_NOT_FOUND'], ['not-json hidden-secret', 'ENDPOINT_NOT_FOUND'], [JSON.stringify({ error: { code: 'arbitrary hidden-secret' } }), 'ENDPOINT_NOT_FOUND'], ['x'.repeat(9000), 'ENDPOINT_NOT_FOUND']]) {
    const transport = createUniversalTransport({ resolve: async () => publicDns, fetch: async () => new Response(body, { status: 404 }) })
    await assert.rejects(transport.request(request), error => state('rejected')(error) && (error as UniversalApiError).code === code)
  }
})
test('known billing codes are separated from rate limits without leaking arbitrary provider messages', async () => {
  for (const [status,body,category] of [
    [429,{error:{code:'insufficient_quota',message:'hidden-secret'}},'billing'],
    [400,{code:'Arrearage',message:'hidden-secret'},'billing'],
    [429,{error:{code:'rate_limit_exceeded',message:'hidden-secret'}},'rate_limit'],
    [403,{error:{code:'permission_denied',message:'hidden-secret'}},'authentication'],
  ] as const) {
    let calls=0
    const transport=createUniversalTransport({resolve:async()=>publicDns,fetch:async()=>{calls++;return Response.json(body,{status})}})
    await assert.rejects(transport.request(request),error=>state('rejected')(error)&&(error as UniversalApiError).category===category)
    assert.equal(calls,1)
  }
})
