import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { applyThinkingSnapshot, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

const cases = [
  { id: 'accounts/fireworks/models/step-3p7-flash-nvfp4', efforts: ['low', 'medium', 'high'] },
  { id: 'accounts/fireworks/models/muse-glimmer-30b', efforts: ['low', 'medium', 'high', 'xhigh'] },
]
const identity = (modelId: string) => ({ provider: 'fireworks', modelId, protocol: 'openai-chat-completions' })
const localFailure = (error: any) => error.businessCode === 'THINKING_CONFIG_INVALID' && error.requestState === 'not_sent'

test('exact Fireworks tiers serialize without inventing defaults, switches, budgets or sampling changes', () => {
  for (const item of cases) for (const role of ['main', 'vision'] as const) {
    const profile = thinkingProfile('fireworks', item.id, role, 'openai-chat-completions')
    assert.equal(profile.status, 'supported')
    assert.deepEqual(profile.controls.map((c: { key: string }) => c.key), ['effort'])
    assert.deepEqual(profile.controls[0].values, item.efforts)
    assert.equal(profile.controls[0].default, null)
    const body = { model: item.id, messages: [], temperature: 0.6, top_p: 0.9, max_tokens: 512 }
    for (const effort of item.efforts) {
      const snapshot = compileThinkingSelection({ ...identity(item.id), options: { effort } }, role)
      assert.deepEqual(snapshot.wire, { reasoning_effort: effort })
      assert.deepEqual(applyThinkingSnapshot(body, snapshot), { ...body, reasoning_effort: effort })
    }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection({ ...identity(item.id), options: {} }, role)), body)
    for (const options of [
      ...['none', 'max', 'adaptive', true, false, 4096].map(effort => ({ effort })),
      { mode: true }, { budget: 4096 }, { effort: 'high', mode: false }, { effort: 'high', budget: 4096 },
    ] as Record<string, string | number | boolean>[]) assert.throws(() => compileThinkingSelection({ ...identity(item.id), options }, role), localFailure)
  }
  assert.throws(() => compileThinkingSelection({ ...identity(cases[0].id), options: { effort: 'xhigh' } }, 'main'), localFailure)
})

test('real Fireworks adapter functions send only allowlisted effort via stubbed text and vision requests', async () => {
  const runtime: any = await createRefineRuntime()
  const png = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#9a9' } }).png().toBuffer()
  let snapshot: any, captured: any[] = []
  try {
    runtime.legacy.configureProviderWorkflow({ ...runtime.workflow, active: () => true, key: async () => 'fixture-key', call: async (_d: any, fn: any) => fn(), thinking: () => snapshot, record: async () => {} })
    runtime.legacy.configureRuntimeFetch(async (url: any, init: any) => {
      captured.push({ url, body: JSON.parse(init.body) })
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Visible fixture', reasoning_content: 'Private fixture reasoning' }, finish_reason: 'stop' }] }), { headers: { 'Content-Type': 'application/json' } })
    })
    for (const item of cases) for (const role of ['main', 'vision'] as const) for (const effort of [...item.efforts, undefined]) {
      snapshot = compileThinkingSelection({ ...identity(item.id), options: effort === undefined ? {} : { effort } }, role)
      captured = []
      const answer = role === 'main'
        ? await runtime.legacy.callTextModel('fireworks', item.id, 'fixture-key', 'system', 'user', [], { thinkingRole: 'main' })
        : await runtime.legacy.callVisionModel('fireworks', item.id, 'fixture-key', 'method', 'caption', [{ url: `data:image/png;base64,${png.toString('base64')}`, mimeType: 'image/png' }])
      assert.equal(answer, 'Visible fixture')
      assert.equal(captured.length, 1)
      const { url, body } = captured[0]
      assert.equal(url, 'https://api.fireworks.ai/inference/v1/chat/completions')
      assert.equal(body.model, item.id)
      assert.equal(body.reasoning_effort, effort)
      for (const field of ['extra_body', 'thinking_budget', 'thinking', 'enable_thinking']) assert.equal(body[field], undefined)
    }
  } finally { await runtime.close() }
})

test('channel-hosted non-thinking Instruct evidence changes status without injecting or inheriting fields', () => {
  const selection = { provider: 'iflytek', modelId: 'xop3qwen80bnext', protocol: 'openai-chat-completions' }
  assert.equal(thinkingProfile(selection.provider, selection.modelId, 'main', selection.protocol).status, 'unsupported')
  const body = { model: selection.modelId, messages: [], max_tokens: 512 }
  assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection({ ...selection, options: {} }, 'main')), body)
  for (const options of [{ mode: true }, { effort: 'high' }, { budget: 4096 }] as Record<string, string | number | boolean>[]) {
    assert.throws(() => compileThinkingSelection({ ...selection, options }, 'main'), localFailure)
  }
  assert.equal(thinkingProfile('iflytek', 'xop3qwen0b6', 'main', 'openai-chat-completions').status, 'unconfirmed')
})

test('contracts remain isolated from other providers, deployment IDs, protocols and unsupported roles', () => {
  for (const item of cases) {
    for (const selection of [
      { ...identity(item.id), provider: 'together' },
      { ...identity(item.id), modelId: item.id + '#accounts/example/deployments/example' },
      { ...identity(item.id), protocol: 'anthropic-messages' },
    ]) assert.throws(() => compileThinkingSelection({ ...selection, options: { effort: 'high' } }, 'main'), localFailure)
    assert.throws(() => compileThinkingSelection({ ...identity(item.id), options: { effort: 'high' } }, 'image'), localFailure)
  }
  for (const slug of ['glm-5p3', 'kimi-k2p5', 'qwen3p8-max']) {
    assert.equal(thinkingProfile('fireworks', `accounts/fireworks/models/${slug}`, 'main', 'openai-chat-completions').status, 'unconfirmed')
  }
})
