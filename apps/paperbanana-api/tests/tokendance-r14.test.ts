import test from 'node:test'
import assert from 'node:assert/strict'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { createTokenDanceCatalogCache, tokenDanceCatalogPresence, tokenDanceCatalogModelReason } from '../../../packages/api/src/tokendance-catalog.js'
// @ts-expect-error Independent untyped Web consumer verifies the wire contract.
import { modelMissingFromCatalog } from '../../web/src/lib/modelRegistry.js'
const id = 'qwen3.8-flash', protocol = 'openai:chat-completions'
const row = (id: string) => ({ id, supported_protocols: [protocol] })

for (const mode of ['empty', 'timeout', 'missing', 'all_invalid'] as const) test(`R14 Core ${mode}: structured presence, retained models/defaults, no inference`, async () => {
  const runtime = await createRefineRuntime({ startServer: false, tokenDanceCatalogMode: mode === 'missing' || mode === 'all_invalid' ? 'snapshot' : mode })
  try {
    if (mode === 'missing' || mode === 'all_invalid') runtime.legacy.configureRuntimeFetch(async url => {
      assert.equal(String(url), 'https://tokendance.space/gateway/v1/models')
      return Response.json({ data: mode === 'missing' ? [row('other')] : [{ id, supported_protocols: null }] })
    })
    const registry = await runtime.invoke({ action: 'modelRegistry', provider: 'tokendance' })
    const channel = registry.providers.tokendance
    assert.equal(channel.models.length, 74, 'channel and every historical identity remain in the wire response')
    assert.ok(channel.defaults.main)
    for (const model of channel.models) {
      assert.equal(model.selectable, false)
      assert.equal(model.catalogPresence.status, mode === 'missing' ? 'absent' : 'unverified')
      assert.equal(modelMissingFromCatalog(registry, 'tokendance', model), mode === 'missing')
      const retired = ['mimo-v2.5', 'mimo-v2.5-pro'].includes(model.id)
      assert.match(model.disabledReason, retired ? /官方服务已于 2026-10-21 到期/ : mode === 'missing' ? /当前目录未列出/ : /暂时无法确认/)
      if (mode !== 'missing') {
        assert.equal(model.catalogPresence.cause, mode)
        assert.doesNotMatch(model.disabledReason, /未列出|下线|不再提供/)
      }
    }
    assert.equal(registry.catalogHealth.tokendance.issues.some((issue: any) => issue.reason === 'missing_live'), mode === 'missing')
    const original = JSON.stringify(channel.defaults)
    await assert.rejects(runtime.legacy.callTextModel('tokendance', id, 'fixture-only', 'system', 'prompt'), (e: any) => e.requestState === 'not_sent')
    assert.equal(JSON.stringify(channel.defaults), original)
    assert.equal(runtime.providerCalls.length, 0)
    assert.equal(runtime.tokenDanceCalls.length, 0)
  } finally { await runtime.close() }
})

test('R14 failed refresh supersedes both cached listed and absent evidence, then recovers', async () => {
  let response = async () => Response.json({ data: [row(id)] })
  const cache = createTokenDanceCatalogCache({ appUrl: 'offline-test', fetcher: () => response(), retryMs: 0, expectedModels: [{ id: 'missing', protocol }] })
  for (const fail of [async () => Response.json({ data: [] }), async () => { throw new DOMException('', 'TimeoutError') }]) {
    response = async () => Response.json({ data: [row(id)] })
    const good = await cache.get(true)
    assert.equal(tokenDanceCatalogPresence(good, id).status, 'listed')
    assert.equal(tokenDanceCatalogPresence(good, 'missing').status, 'absent')
    response = fail
    const failed = await cache.get(true)
    for (const model of [id, 'missing']) {
      assert.equal(tokenDanceCatalogPresence(failed, model).status, 'unverified')
      assert.match(tokenDanceCatalogModelReason(failed, model, protocol)!, /暂时无法确认/)
    }
  }
  response = async () => Response.json({ data: [row(id), null] })
  const partial = await cache.get(true)
  assert.equal(tokenDanceCatalogPresence(partial, 'missing').status, 'unverified')
  assert.equal(partial.issues.some(issue => issue.reason === 'missing_live'), false)
})

test('R14 preview defaults to the dated public 119-row snapshot', async () => {
  const runtime = await createRefineRuntime({ startServer: false })
  try {
    const registry = await runtime.invoke({ action: 'modelRegistry', provider: 'tokendance' })
    assert.equal(registry.catalogHealth.tokendance.total, 119)
    const model = registry.providers.tokendance.models.find((model: any) => model.id === id)
    assert.equal(model.catalogPresence.status, 'listed')
    assert.equal(model.selectable, true)
    assert.equal(runtime.providerCalls.length, 0)
  } finally { await runtime.close() }
})
