import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { compileThinkingSelection, normalizeThinkingConfiguration } from '../../../packages/api/src/thinking.js'

const contracts = JSON.parse(readFileSync(new URL('../../../config/channel-audit/frontier-refresh-contracts.json', import.meta.url), 'utf8'))
const effort = ['none', 'low', 'medium', 'high', 'xhigh', 'max']
const selection = (c: any, options = {}) => ({ provider: c.provider, modelId: c.model, protocol: c.textProtocol, options })

test('the real dynamic catalog exposes five synchronous routes and excludes five Batch variants without granting image output', async () => {
  const r: any = await createRefineRuntime()
  const directory = JSON.parse(readFileSync(new URL('../../../config/channel-audit/2026-09-23/openrouter-models.json', import.meta.url), 'utf8'))
  try {
    r.legacy.configureRuntimeFetch(async (url: any, init: any) => {
      assert.notEqual(init?.method, 'POST', 'only free catalog reads are mocked')
      if (String(url) === 'https://openrouter.ai/api/v1/models') return Response.json({ data: directory.models })
      if (String(url) === 'https://openrouter.ai/api/v1/images/models') return Response.json({ data: [] })
      throw new Error('Unexpected request: ' + url)
    })
    const result = (await r.post({ action: 'modelRegistry', provider: 'openrouter' })).data
    assert.equal(result.code, 0)
    assert.equal(result.registryVersion, '2026-09-23.v25')
    const models = result.providers.openrouter.models
    assert.equal(models.length, 5)
    for (const model of models) {
      assert.deepEqual(model.roles, ['main', 'vision'])
      assert.equal(model.protocol, 'openrouter-chat-completions')
      assert.equal(model.verified, false)
      assert.equal(model.capabilities.imageGeneration, false)
      assert.equal(model.capabilities.imageEditing, false)
      assert.equal(model.id.endsWith(':batch'), false)
    }
    for (const row of directory.models.filter((m: any) => m.id.endsWith(':batch'))) await assert.rejects(r.legacy.callTextModel('openrouter', row.id, 'fixture-key', 'system', 'user'), /Batch/)
  } finally { await r.close() }
})

test('all eight exact routes and both roles use audited native fields, omit defaults, and record usage without inventing charges', async () => {
  const r: any = await createRefineRuntime()
  let snapshot: any, requests: any[] = [], records: any[] = []
  try {
    r.legacy.configureProviderWorkflow({ ...r.workflow, active: () => true, call: async (_d: any, fn: any) => fn(), thinking: () => snapshot, record: async (v: any) => { records.push(v) } })
    r.legacy.configureRuntimeFetch(async (url: any, init: any) => {
      const body = JSON.parse(init.body); requests.push({ url: String(url), body })
      const common = { id: 'fixture-request', model: body.model, usage: { input_tokens: 120, output_tokens: 80, output_tokens_details: { reasoning_tokens: 65 } } }
      if (String(url).endsWith('/messages')) return Response.json({ ...common, stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Visible answer' }] })
      if (String(url).endsWith('/responses')) return Response.json({ ...common, status: 'completed', output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: 'Visible answer' }] }] })
      return Response.json({ ...common, usage: { prompt_tokens: 120, completion_tokens: 80, completion_tokens_details: { reasoning_tokens: 65 }, cost: 0.001 }, choices: [{ finish_reason: 'stop', message: { content: 'Visible answer' } }] })
    })
    for (const c of Object.values(contracts) as any[]) for (const role of ['main', 'vision'] as const) {
      const values = c.model.includes('claude') ? effort.slice(1) : effort
      const modes = c.provider === 'openai' ? [undefined, 'standard', 'pro'] : [undefined]
      const options: any[] = [undefined, {}, ...values.flatMap(e => modes.map(mode => ({ effort: e, ...(mode ? { mode } : {}) })))]
      for (const option of options) {
        requests = []; records = []
        snapshot = option === undefined ? undefined : compileThinkingSelection(selection(c, option), role)
        const images = role === 'vision' ? [{ filename: 'fixture.png', mimeType: 'image/png', url: `data:image/png;base64,${r.image.toString('base64')}` }] : []
        const answer = role === 'vision'
          ? await r.legacy.callVisionModel(c.provider, c.model, 'fixture-key', 'method', 'caption', images)
          : await r.legacy.callTextModel(c.provider, c.model, 'fixture-key', 'system', 'user', images, { thinkingRole: role })
        assert.equal(answer, 'Visible answer')
        assert.equal(requests.length, 1, c.model)
        const { url, body } = requests[0]
        assert.equal(body.model, c.model)
        assert.match(url, c.provider === 'openai' ? /^https:\/\/api.openai.com\/v1\/responses$/ : c.provider === 'anthropic' ? /^https:\/\/api.anthropic.com\/v1\/messages$/ : /^https:\/\/openrouter.ai\/api\/v1\/chat\/completions$/)
        if (c.provider === 'anthropic') {
          assert.equal(body.output_config?.effort, option?.effort)
          assert.equal(body.thinking, undefined, 'always-on adaptive does not need an explicit field')
          assert.equal(body.max_tokens, 16384, 'do not increase output ceiling to fit reasoning')
        } else {
          assert.equal(body.reasoning?.effort, option?.effort)
          assert.equal(body.reasoning?.mode, c.provider === 'openai' ? option?.mode : undefined)
        }
        if (c.provider !== 'openrouter' || c.model.startsWith('openai/')) assert.equal(body.temperature, undefined)
        assert.equal(records.length, 1)
        assert.equal(records[0].usage.output_tokens || records[0].usage.completion_tokens, 80)
        assert.equal(records[0].invoiceCost, null)
        assert.equal(records[0].estimatedCost, null)
        assert.deepEqual(records[0].reportedCost, c.provider === 'openrouter' ? { amount: 0.001, currency: 'USD', source: 'provider-response' } : null)
        assert.equal(records[0].billingStatus, 'unconfirmed')
      }
    }
  } finally { await r.close() }
})

test('unsupported roles, fictitious variants, mismatched protocols and invalid thinking never become wire requests', () => {
  for (const c of Object.values(contracts) as any[]) {
    for (const options of [{ budget: 1024 }, { effort: 'ultra' }, { effort: 'minimal' }, { mode: 'disabled' }]) assert.throws(() => compileThinkingSelection(selection(c, options), 'main'), { businessCode: 'THINKING_CONFIG_INVALID' })
    assert.throws(() => compileThinkingSelection(selection(c, { effort: 'high' }), 'image'), { businessCode: 'THINKING_CONFIG_INVALID' })
    assert.throws(() => compileThinkingSelection({ ...selection(c, { effort: 'high' }), protocol: 'provider-images' }, 'main'), { businessCode: 'THINKING_CONFIG_INVALID' })
  }
  assert.throws(() => compileThinkingSelection({ provider: 'openai', modelId: 'gpt-6-sol-pro', protocol: 'openai-responses', options: { effort: 'high' } }, 'main'))
  const opus = selection(contracts['anthropic/claude-opus-5-5'], { effort: 'none' })
  assert.throws(() => compileThinkingSelection(opus, 'main'))
  assert.throws(() => normalizeThinkingConfiguration({ version: 1, roles: { main: { ...opus, options: { effort: 'low' } } } }, { main: { ...opus, modelId: 'claude-opus-5' } }))
})

test('refusal and truncated output retain billed usage but never trigger fallback or a second transport', async () => {
  const r: any = await createRefineRuntime(); let calls = 0, records: any[] = []
  try {
    r.legacy.configureProviderWorkflow({ ...r.workflow, active: () => true, call: async (_d: any, fn: any) => fn(), thinking: () => undefined, record: async (v: any) => { records.push(v) } })
    for (const [provider, model, response] of [
      ['anthropic', 'claude-opus-5-5', { stop_reason: 'refusal', content: [{ type: 'thinking', thinking: '' }], usage: { output_tokens: 20 } }],
      ['openai', 'gpt-6-sol', { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, usage: { output_tokens: 20 } }],
      ['openai', 'gpt-6-luna', { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'fixture refusal' }] }], usage: { output_tokens: 20 } }],
      ['openrouter', 'openai/gpt-6-luna', { choices: [{ finish_reason: 'length', message: { content: '' } }], usage: { completion_tokens: 20 } }],
    ] as any[]) {
      calls = 0; records = []
      r.legacy.configureRuntimeFetch(async () => { calls++; return Response.json(response) })
      await assert.rejects(r.legacy.callTextModel(provider, model, 'fixture-key', 'system', 'user'))
      assert.equal(calls, 1); assert.equal(records.length, 1)
      assert.equal(records[0].invoiceCost, null)
    }
  } finally { await r.close() }
})
