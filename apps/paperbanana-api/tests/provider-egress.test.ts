import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  MockAgent,
  Request as UndiciRequest,
  getGlobalDispatcher,
  setGlobalDispatcher,
} from 'undici'

import {
  PROVIDER_EGRESS_UNAVAILABLE_MESSAGE,
  createProviderEgress,
} from '../src/provider-egress.js'

const proxyUrl = 'http://10.77.0.2:3128'
const sourcePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/provider-egress.ts')

async function withMockRouting(
  mode: 'disabled' | 'sg-required',
  run: (context: {
    direct: MockAgent
    proxy: MockAgent
    create(): ReturnType<typeof createProviderEgress>
  }) => Promise<void>,
) {
  const previous = getGlobalDispatcher()
  const direct = new MockAgent()
  const proxy = new MockAgent()
  direct.disableNetConnect()
  proxy.disableNetConnect()
  setGlobalDispatcher(direct)
  const created: Array<ReturnType<typeof createProviderEgress>> = []
  try {
    await run({
      direct,
      proxy,
      create() {
        const egress = createProviderEgress(
          mode === 'sg-required' ? { mode, proxyUrl } : { mode },
          {
            createProxyAgent: () => proxy,
            directDispatcher: direct,
          },
        )
        created.push(egress)
        return egress
      },
    })
  } finally {
    setGlobalDispatcher(previous)
    await Promise.allSettled(created.map((egress) => egress.close()))
    await Promise.allSettled([direct.close(), proxy.close()])
  }
}

test('request and URL compatibility does not depend on realm-specific instanceof checks', () => {
  assert.doesNotMatch(fs.readFileSync(sourcePath, 'utf8'), /\binstanceof\b/)
})

test('credential-bearing request URLs are rejected without dispatching or echoing credentials', async () => {
  await withMockRouting('sg-required', async ({ create }) => {
    const egress = create()
    for (const url of [
      'https://user:password@api.openai.com/v1/models',
      'https://user:password@ark.cn-beijing.volces.com/api/v3/models',
    ]) {
      await assert.rejects(egress.fetch(url), (error: any) => {
        assert.equal(error.message, 'Request URL must not include credentials')
        assert.doesNotMatch(JSON.stringify(error), /user|password|api\.openai|volces/i)
        return true
      })
    }
    assert.equal(egress.snapshot(), 'degraded')
  })
})

test('canonical providers use proxy while Bailian, OSS, Plot, signed URLs and lookalikes stay direct', async () => {
  await withMockRouting('sg-required', async ({ direct, proxy, create }) => {
    const proxied = [
      ['https://api.openai.com', '/v1/models'],
      ['https://generativelanguage.googleapis.com', '/v1/models'],
      ['https://openrouter.ai', '/api/v1/models'],
      ['https://ark.cn-beijing.volces.com', '/api/v3/models'],
    ] as const
    const bypassed = [
      ['https://dashscope.aliyuncs.com', '/compatible-mode/v1/models'],
      ['https://bucket.oss-cn-hongkong-internal.aliyuncs.com', '/reference.png'],
      ['https://bucket.oss-cn-hongkong.aliyuncs.com', '/result.png?Signature=signed'],
      ['http://plot-worker.internal', '/render'],
      ['https://api.openai.com.evil.example', '/v1/models'],
      ['https://ark.cn-beijing.volces.com.evil.example', '/api/v3/models'],
      ['https://ark.cn-beijing.volces.com..', '/api/v3/models'],
    ] as const
    for (const [origin, requestPath] of proxied) {
      direct.get(origin).intercept({ path: requestPath }).reply(200, 'DIRECT-LEAK')
      proxy.get(origin).intercept({ path: requestPath }).reply(200, 'PROXY')
    }
    for (const [origin, requestPath] of bypassed) {
      direct.get(origin).intercept({ path: requestPath }).reply(200, 'DIRECT')
      proxy.get(origin).intercept({ path: requestPath }).reply(200, 'PROXY-LEAK')
    }
    const egress = create()

    for (const [origin, requestPath] of proxied) {
      assert.equal(await (await egress.fetch(`${origin}${requestPath}`)).text(), 'PROXY')
    }
    for (const [origin, requestPath] of bypassed) {
      assert.equal(await (await egress.fetch(`${origin}${requestPath}`)).text(), 'DIRECT')
    }
  })
})

test('equivalent root-dot and percent-dot provider hosts always use the proxy dispatcher', async () => {
  await withMockRouting('sg-required', async ({ direct, proxy, create }) => {
    for (const path of ['/root-dot', '/percent-dot']) {
      direct.get('https://api.openai.com.').intercept({ path }).reply(200, `DIRECT:${path}`)
      proxy.get('https://api.openai.com.').intercept({ path }).reply(200, `PROXY:${path}`)
    }
    for (const path of ['/ark-root-dot', '/ark-percent-dot']) {
      direct.get('https://ark.cn-beijing.volces.com.').intercept({ path }).reply(200, `DIRECT:${path}`)
      proxy.get('https://ark.cn-beijing.volces.com.').intercept({ path }).reply(200, `PROXY:${path}`)
    }
    const egress = create()

    assert.equal(await (await egress.fetch('https://api.openai.com./root-dot')).text(), 'PROXY:/root-dot')
    assert.equal(await (await egress.fetch(new URL('https://api.openai.com%2e/percent-dot'))).text(), 'PROXY:/percent-dot')
    assert.equal(await (await egress.fetch('https://ark.cn-beijing.volces.com./ark-root-dot')).text(), 'PROXY:/ark-root-dot')
    assert.equal(await (await egress.fetch(new URL('https://ark.cn-beijing.volces.com%2e/ark-percent-dot'))).text(), 'PROXY:/ark-percent-dot')
  })
})

test('disabled mode fails closed for equivalent provider FQDNs instead of using direct dispatch', async () => {
  await withMockRouting('disabled', async ({ direct, create }) => {
    direct.get('https://openrouter.ai.').intercept({ path: '/models' }).reply(200, 'DIRECT')
    direct.get('https://generativelanguage.googleapis.com.').intercept({ path: '/models' }).reply(200, 'DIRECT')
    direct.get('https://ark.cn-beijing.volces.com.').intercept({ path: '/models' }).reply(200, 'DIRECT')
    const egress = create()

    for (const url of [
      'https://openrouter.ai./models',
      'https://generativelanguage.googleapis.com%2e/models',
      'https://ark.cn-beijing.volces.com./models',
      'https://ark.cn-beijing.volces.com%2e/models',
    ]) {
      await assert.rejects(egress.fetch(url), (error: any) => {
        assert.equal(error.message, PROVIDER_EGRESS_UNAVAILABLE_MESSAGE)
        assert.equal(error.code, 'PROVIDER_EGRESS_UNAVAILABLE')
        return true
      })
    }
  })
})

test('global and Undici Request objects both retain request semantics and use the proxy', async () => {
  await withMockRouting('sg-required', async ({ direct, proxy, create }) => {
    for (const [path, kind] of [['/global-request', 'global'], ['/undici-request', 'undici']]) {
      direct.get('https://api.openai.com').intercept({ path, method: 'POST' }).reply(200, `DIRECT:${path}`)
      proxy.get('https://api.openai.com').intercept({
        path,
        method: 'POST',
      }).reply((options) => ({
        statusCode: 200,
        data: `${String(options.method)}:${String((options.headers as any)['x-request-kind'])}:${String((options.headers as any)['content-length'])}`,
      }))
    }
    const egress = create()

    const globalRequest = new globalThis.Request('https://api.openai.com/global-request', {
      method: 'POST',
      headers: { 'x-request-kind': 'global' },
      body: 'global-payload',
    })
    assert.equal(await (await egress.fetch(globalRequest)).text(), 'POST:global:14')
    assert.equal(globalRequest.bodyUsed, false)

    const undiciRequest = new UndiciRequest('https://api.openai.com/undici-request', {
      method: 'POST',
      headers: { 'x-request-kind': 'undici' },
      body: 'undici-payload',
    })
    assert.equal(await (await egress.fetch(undiciRequest)).text(), 'POST:undici:14')
    assert.equal(undiciRequest.bodyUsed, false)
  })
})

test('a non-target redirect to a provider is re-dispatched through the proxy', async () => {
  await withMockRouting('sg-required', async ({ direct, proxy, create }) => {
    direct.get('https://redirect.example').intercept({ path: '/start' }).reply(302, '', {
      headers: { location: 'https://openrouter.ai/api/v1/models' },
    })
    direct.get('https://openrouter.ai').intercept({ path: '/api/v1/models' }).reply(200, 'DIRECT-LEAK')
    proxy.get('https://openrouter.ai').intercept({ path: '/api/v1/models' }).reply(200, 'PROXY-TARGET')
    const egress = create()

    const response = await egress.fetch('https://redirect.example/start')
    assert.equal(await response.text(), 'PROXY-TARGET')
    assert.equal(egress.snapshot(), 'ready')
  })
})

test('a target redirect to another origin follows direct policy without leaking provider secrets', async () => {
  await withMockRouting('sg-required', async ({ direct, proxy, create }) => {
    let directOptions: any
    proxy.get('https://ark.cn-beijing.volces.com').intercept({ path: '/api/v3/start?key=ark-query-secret' }).reply(302, '', {
      headers: { location: 'https://result.example/final' },
    })
    proxy.get('https://result.example').intercept({ path: '/final' }).reply(200, 'PROXY-LEAK')
    direct.get('https://result.example').intercept({ path: '/final' }).reply((options) => {
      directOptions = options
      return { statusCode: 200, data: 'DIRECT-RESULT' }
    })
    const egress = create()
    const request = new UndiciRequest('https://ark.cn-beijing.volces.com/api/v3/start?key=ark-query-secret', {
      headers: { authorization: 'Bearer ark-provider-secret', 'x-safe': 'preserved' },
    })

    const response = await egress.fetch(request)
    assert.equal(await response.text(), 'DIRECT-RESULT')
    assert.equal(directOptions.headers.authorization, undefined)
    assert.equal(directOptions.headers['x-safe'], 'preserved')
    assert.doesNotMatch(JSON.stringify(directOptions), /ark-provider-secret|ark-query-secret/)
  })
})

test('only target dispatch outcomes change health or receive the safe egress error', async () => {
  await withMockRouting('sg-required', async ({ direct, proxy, create }) => {
    proxy.get('https://api.openai.com').intercept({ path: '/success' }).reply(503, 'provider unavailable')
    direct.get('https://ordinary.example').intercept({ path: '/failure' }).replyWithError(new Error('ordinary direct failure'))
    proxy.get('https://api.openai.com').intercept({ path: '/failure' }).replyWithError(new Error('CONNECT leaked-secret'))
    const egress = create()

    assert.equal(egress.snapshot(), 'degraded')
    assert.equal((await egress.fetch('https://api.openai.com/success')).status, 503)
    assert.equal(egress.snapshot(), 'ready')

    await assert.rejects(egress.fetch('https://ordinary.example/failure'), (error: any) => {
      assert.notEqual(error.message, PROVIDER_EGRESS_UNAVAILABLE_MESSAGE)
      return true
    })
    assert.equal(egress.snapshot(), 'ready')

    await assert.rejects(egress.fetch('https://api.openai.com/failure'), (error: any) => {
      assert.equal(error.message, PROVIDER_EGRESS_UNAVAILABLE_MESSAGE)
      assert.doesNotMatch(JSON.stringify(error), /CONNECT|leaked-secret/)
      return true
    })
    assert.equal(egress.snapshot(), 'degraded')
  })
})

test('non-target dispatch uses the direct dispatcher captured at construction', async () => {
  await withMockRouting('sg-required', async ({ direct, proxy, create }) => {
    direct.get('https://ordinary.example').intercept({ path: '/captured' }).reply(200, 'CAPTURED')
    proxy.get('https://ordinary.example').intercept({ path: '/captured' }).reply(200, 'LATER-GLOBAL')
    const egress = create()
    setGlobalDispatcher(proxy)

    assert.equal(await (await egress.fetch('https://ordinary.example/captured')).text(), 'CAPTURED')
  })
})

test('closing provider egress closes its single proxy dispatcher exactly once', async () => {
  await withMockRouting('sg-required', async ({ direct, proxy }) => {
    let closes = 0
    const close = proxy.close.bind(proxy)
    proxy.close = async () => { closes += 1; await close() }
    const egress = createProviderEgress(
      { mode: 'sg-required', proxyUrl },
      { createProxyAgent: () => proxy, directDispatcher: direct },
    )

    await egress.close()
    await egress.close()
    assert.equal(closes, 1)
  })
})
