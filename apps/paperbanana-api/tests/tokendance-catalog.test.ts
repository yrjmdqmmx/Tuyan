import test from 'node:test'
import assert from 'node:assert/strict'
import { createTokenDanceCatalogCache, parseTokenDanceCatalog, tokenDanceCatalogMessage, tokenDanceCatalogModelReason } from '../../../packages/api/src/tokendance-catalog.js'
import { publicExecutionFailure } from '../../../packages/api/src/execution-errors.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
const protocol = 'openai:chat-completions'
const good = (id = 'qwen3.8-flash') => ({ id, supported_protocols: [protocol] })

for (const [label, row, reason] of [
  ['null protocol regression', { ...good('deepseek-chat-v3-0324'), supported_protocols: null }, 'protocols_null'],
  ['missing protocol', { id: 'bad' }, 'protocols_missing'],
  ['wrong protocol type', { id: 'bad', supported_protocols: protocol }, 'protocols_type'],
  ['empty protocol', { id: 'bad', supported_protocols: [] }, 'protocols_empty'],
  ['invalid protocol item', { id: 'bad', supported_protocols: [null, protocol] }, 'protocols_item'],
  ['missing ID', { supported_protocols: [protocol] }, 'id_missing'],
  ['null ID', { ...good(), id: null }, 'id_null'],
  ['wrong ID type', { ...good(), id: 12 }, 'id_type'],
  ['empty ID', { ...good(), id: '' }, 'id_invalid'],
  ['unsafe ID', { ...good(), id: 'sk-secret\nINJECT' }, 'id_invalid'],
  ['null row', null, 'row_type'],
] as const) test(`isolates ${label} without losing good models`, () => {
  const parsed = parseTokenDanceCatalog({ data: [good(), row] })
  assert.deepEqual(parsed.models, [good()]); assert.equal(parsed.issues[0].reason, reason)
  assert.equal(JSON.stringify(parsed).includes('sk-secret'), false)
})

test('quarantines all duplicate rows regardless of order, including valid/invalid collisions', () => {
  for (const rows of [[good('dup'), good('dup')], [good('dup'), { id: 'dup', supported_protocols: null }]]) {
    for (const ordered of [rows, [...rows].reverse()]) {
      const parsed = parseTokenDanceCatalog({ data: [good(), ...ordered, { id: 'other', supported_protocols: [] }] })
      assert.deepEqual(parsed.models, [good()]); assert.deepEqual(parsed.issues.map(i => i.reason), ['duplicate_id', 'duplicate_id', 'protocols_empty'])
    }
  }
})

test('rejects whole malformed envelopes; empty and all-invalid are distinct', async () => {
  for (const body of [null, [], {}, { data: null }, { data: {} }]) assert.throws(() => parseTokenDanceCatalog(body), /envelope/)
  for (const [rows, cause] of [[[], 'empty'], [[null, { id: 'bad', supported_protocols: null }], 'all_invalid']] as const) {
    const cache = createTokenDanceCatalogCache({ appUrl: 'fixture', fetcher: async () => Response.json({ data: rows }) })
    const snapshot = await cache.get(); assert.equal(snapshot.cause, cause); assert.equal(snapshot.state, 'unavailable')
    assert.match(tokenDanceCatalogMessage(snapshot), /空目录|全部模型记录/)
    assert.ok(tokenDanceCatalogModelReason(snapshot, 'qwen3.8-flash', protocol))
  }
})

function fixture() {
  let time = 1_000_000, calls = 0
  let response: () => Promise<Response> = async () => Response.json({ data: [good()] })
  const events: any[] = []
  const cache = createTokenDanceCatalogCache({ appUrl: 'fixture', now: () => time, report: event => events.push(event),
    expectedModels: [{ id: 'qwen3.8-flash', protocol }], freshMs: 100, staleMs: 300, retryMs: 20,
    fetcher: async () => { calls++; return response() },
  })
  return { cache, events, calls: () => calls, advance: (ms: number) => { time += ms }, set: (fn: typeof response) => { response = fn } }
}

test('coalesces concurrent refreshes; calls force fresh protocol validation even inside display TTL', async () => {
  const f = fixture()
  await Promise.all([f.cache.get(), f.cache.get(), f.cache.get(true)])
  assert.equal(f.calls(), 1)
  await f.cache.get(); assert.equal(f.calls(), 1)
  f.set(async () => Response.json({ data: [{ ...good(), supported_protocols: ['other:protocol'] }] }))
  const changed = await f.cache.get(true)
  assert.equal(f.calls(), 2); assert.equal(changed.state, 'partial'); assert.match(tokenDanceCatalogModelReason(changed, good().id, protocol)!, /协议/)
  assert.equal(changed.issues[0].reason, 'protocol_changed')
  f.set(async () => Response.json({ data: [good()] }))
  assert.equal(tokenDanceCatalogModelReason(await f.cache.get(true), good().id, protocol), null)
  assert.equal(f.events.at(-1).state, 'ready')
})

for (const [label, response, cause] of [
  ['timeout', async () => { throw new DOMException('secret raw text', 'TimeoutError') }, 'timeout'],
  ['network', async () => { throw new Error('Bearer secret') }, 'network'],
  ['rejection', async () => new Response('secret raw body', { status: 403 }), 'rejected'],
  ['limit', async () => new Response('secret raw body', { status: 429 }), 'rate_limit'],
  ['provider', async () => new Response('secret raw body', { status: 502 }), 'provider'],
  ['JSON', async () => new Response('secret raw body'), 'envelope'],
] as const) test(`${label}: bounded display-only stale cache, backoff, expiration and recovery`, async () => {
  const f = fixture(); const first = await f.cache.get(); f.advance(101); f.set(response)
  const failed = await f.cache.get()
  assert.equal(failed.cause, cause); assert.equal(failed.stale, true); assert.equal(failed.checkedAt, first.checkedAt)
  assert.match(tokenDanceCatalogMessage(failed), /不能用于调用/)
  assert.ok(tokenDanceCatalogModelReason(failed, good().id, protocol)); assert.equal(failed.alert, 'critical')
  await f.cache.get(true); assert.equal(f.calls(), 2)
  f.advance(205); const expired = await f.cache.get(true)
  assert.equal(expired.stale, false); assert.equal(expired.models.length, 0); assert.equal(expired.checkedAt, null)
  f.advance(21); f.set(async () => Response.json({ data: [good()] }))
  const recovered = await f.cache.get(true); assert.equal(recovered.state, 'ready'); assert.equal(recovered.failureCount, 0)
  assert.equal(JSON.stringify(f.events).includes('secret'), false)
})

test('persistent partial anomalies escalate and recovery is observable without raw metadata', async () => {
  const f = fixture(); f.set(async () => Response.json({ data: [good(), { id: 'broken', supported_protocols: null, description: 'secret' }] }))
  let snapshot = await f.cache.get(true)
  assert.equal(snapshot.alert, 'warning'); assert.match(tokenDanceCatalogMessage(snapshot), /broken.*null.*正常模型/)
  await f.cache.get(true); snapshot = await f.cache.get(true)
  assert.equal(snapshot.alert, 'critical'); assert.equal(f.events.at(-1).consecutiveAnomalies, 3)
  f.set(async () => Response.json({ data: [good()] })); await f.cache.get(true)
  assert.equal(f.events.at(-1).alert, 'none'); assert.equal(JSON.stringify(f.events).includes('secret'), false)
})

test('real Core registry isolates the regression and call adapters block bad and changed models before transport', async () => {
  const runtime = await createRefineRuntime({ tokenDance: true })
  const paid: string[] = []; let rows: unknown[] = [good(), { id: 'deepseek-chat-v3-0324', supported_protocols: null }]
  try {
    runtime.legacy.configureRuntimeFetch(async (input: any) => {
      if (String(input).endsWith('/models')) return Response.json({ data: rows })
      paid.push(String(input))
      return Response.json({ choices: [{ message: { content: 'fixture success' } }], model: 'qwen3.8-flash' })
    })
    const registry = await runtime.invoke({ action: 'modelRegistry', provider: 'tokendance' })
    const models = registry.providers.tokendance.models
    assert.equal(models.find((m: any) => m.id === 'qwen3.8-flash').selectable, true)
    assert.equal(models.find((m: any) => m.id === 'deepseek-chat-v3-0324').selectable, false)
    assert.match(registry.catalogWarnings.tokendance, /deepseek-chat-v3-0324.*null/)
    await assert.rejects(runtime.legacy.callTextModel('tokendance', 'deepseek-chat-v3-0324', 'fixture', 's', 'u'), (e: any) => { const failure = publicExecutionFailure(e, 1); assert.match(failure.reason, /deepseek-chat-v3-0324.*null/); assert.equal(failure.billingStatus, 'prior_calls'); assert.match(failure.suggestion, /成功的步骤会复用/); return e.requestState === 'not_sent' && /null/.test(e.message) })
    assert.equal(paid.length, 0)
    assert.equal(await runtime.legacy.callTextModel('tokendance', 'qwen3.8-flash', 'fixture', 's', 'u'), 'fixture success')
    assert.equal(paid.length, 1)
    rows = [{ ...good(), supported_protocols: ['other:protocol'] }]
    await assert.rejects(runtime.legacy.callTextModel('tokendance', 'qwen3.8-flash', 'fixture', 's', 'u'), (e: any) => e.requestState === 'not_sent' && /协议/.test(e.message))
    assert.equal(paid.length, 1)
    rows = [good()]
    assert.equal(await runtime.legacy.callTextModel('tokendance', 'qwen3.8-flash', 'fixture', 's', 'u'), 'fixture success')
    assert.equal(paid.length, 2)
  } finally { await runtime.close() }
})


test('valid vendor protocol names with underscores remain metadata, never guessed into chat support', () => {
  const parsed = parseTokenDanceCatalog({ data: [good(), { id: 'minimax-h3', supported_protocols: ['minimax:video_generation_v2'] }] })
  assert.equal(parsed.models.length, 2)
  assert.equal(parsed.issues.length, 0)
  assert.match(tokenDanceCatalogModelReason({ ...parsed, state: 'ready', cause: null, stale: false, checkedAt: 1, expiresAt: 2, failureCount: 0, alert: 'none' }, 'minimax-h3', protocol), /协议/)
})
