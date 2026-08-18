import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PROVIDER_EGRESS_UNAVAILABLE_MESSAGE,
  createProviderEgress,
} from '../src/provider-egress.js'

const proxyUrl = 'http://10.77.0.2:3128'

test('sg-required routes only exact overseas provider hosts through one dispatcher', async () => {
  const dispatcher = { async close() {} }
  const calls: Array<{ url: string; dispatcher?: unknown }> = []
  let agentCreations = 0
  const egress = createProviderEgress(
    { mode: 'sg-required', proxyUrl },
    {
      createProxyAgent(url) {
        agentCreations += 1
        assert.equal(url, proxyUrl)
        return dispatcher
      },
      async fetch(input, init) {
        calls.push({ url: String(input), dispatcher: (init as any)?.dispatcher })
        return new Response('{}')
      },
    },
  )

  for (const url of [
    'https://api.openai.com/v1/chat/completions',
    'https://generativelanguage.googleapis.com/v1/models/gemini:generateContent?key=secret',
    'https://openrouter.ai/api/v1/models',
    'http://api.openai.com/v1/models',
  ]) {
    await egress.fetch(url)
  }
  for (const url of [
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    'https://paperbanana-private.oss-cn-hongkong-internal.aliyuncs.com/reference.png',
    'https://paperbanana-private.oss-cn-hongkong.aliyuncs.com/result.png?Signature=signed',
    'http://plot-worker.internal/render',
    'https://api.openai.com.evil.example/v1/models',
    'https://images.example.com/reference.png',
  ]) {
    await egress.fetch(url)
  }

  assert.equal(agentCreations, 1)
  assert.deepEqual(calls.map((call) => Boolean(call.dispatcher)), [true, true, true, true, false, false, false, false, false, false])
  assert.equal(new Set(calls.slice(0, 4).map((call) => call.dispatcher)).size, 1)
})

test('disabled fails closed for targeted hosts while preserving direct non-target requests', async () => {
  const direct: string[] = []
  const egress = createProviderEgress(
    { mode: 'disabled' },
    { async fetch(input) { direct.push(String(input)); return new Response('direct') } },
  )

  await assert.rejects(egress.fetch('https://api.openai.com/v1/models'), (error: any) => {
    assert.equal(error.message, PROVIDER_EGRESS_UNAVAILABLE_MESSAGE)
    assert.equal(error.code, 'PROVIDER_EGRESS_UNAVAILABLE')
    return true
  })
  assert.deepEqual(direct, [])

  assert.equal(await (await egress.fetch('https://dashscope.aliyuncs.com/v1/models')).text(), 'direct')
  assert.deepEqual(direct, ['https://dashscope.aliyuncs.com/v1/models'])
})

test('proxy transport failure never falls back direct and exposes no transport secrets', async () => {
  const sensitiveFailure = new Error('CONNECT http://user:pass@10.77.0.2:3128 failed for https://generativelanguage.googleapis.com/v1/models/x?key=gemini-secret prompt=private')
  let calls = 0
  const egress = createProviderEgress(
    { mode: 'sg-required', proxyUrl },
    {
      createProxyAgent: () => ({ async close() {} }),
      async fetch() { calls += 1; throw sensitiveFailure },
    },
  )

  await assert.rejects(egress.fetch('https://openrouter.ai/api/v1/models'), (error: any) => {
    assert.equal(error.message, PROVIDER_EGRESS_UNAVAILABLE_MESSAGE)
    assert.doesNotMatch(JSON.stringify(error), /user|pass|10\.77|gemini-secret|private|openrouter/i)
    return true
  })
  assert.equal(calls, 1)
})

test('provider egress health recovers after a successful targeted proxy request', async () => {
  let fail = false
  const egress = createProviderEgress(
    { mode: 'sg-required', proxyUrl },
    {
      createProxyAgent: () => ({ async close() {} }),
      async fetch() {
        if (fail) throw new Error('proxy down')
        return new Response('{}')
      },
    },
  )

  assert.equal(egress.snapshot(), 'ready')
  fail = true
  await assert.rejects(egress.fetch('https://api.openai.com/v1/models'))
  assert.equal(egress.snapshot(), 'degraded')
  fail = false
  await egress.fetch('https://api.openai.com/v1/models')
  assert.equal(egress.snapshot(), 'ready')
})

test('closing provider egress closes its single ProxyAgent exactly once', async () => {
  let closes = 0
  const egress = createProviderEgress(
    { mode: 'sg-required', proxyUrl },
    { createProxyAgent: () => ({ async close() { closes += 1 } }) },
  )

  await egress.close()
  await egress.close()
  assert.equal(closes, 1)
})
