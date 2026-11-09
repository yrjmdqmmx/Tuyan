import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { applyThinkingSnapshot, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

const modelId = 'qwen3-omni-flash-2025-12-01'
const identity = { provider: 'bailian', modelId, protocol: 'bailian-openai-chat' }
const localFailure = (error: any) => error.businessCode === 'THINKING_CONFIG_INVALID' && error.requestState === 'not_sent'

test('documented Omni snapshot supports strict boolean switches for text and vision without injecting defaults', () => {
  const body = { model: modelId, messages: [], stream: true, modalities: ['text'], max_tokens: 256 }
  for (const role of ['main', 'vision'] as const) {
    assert.equal(thinkingProfile(identity.provider, modelId, role, identity.protocol).controls[0].default, false)
    for (const mode of [true, false]) {
      const snapshot = compileThinkingSelection({ ...identity, options: { mode } }, role)
      assert.deepEqual(snapshot.wire, { enable_thinking: mode })
      assert.deepEqual(applyThinkingSnapshot(body, snapshot), { ...body, enable_thinking: mode })
    }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection({ ...identity, options: {} }, role)), body)
    for (const options of [{ mode: 'false' }, { mode: 'enabled' }, { effort: 'high' }, { budget: 32768 }] as Record<string, string | number | boolean>[]) {
      assert.throws(() => compileThinkingSelection({ ...identity, options }, role), localFailure)
    }
  }
  assert.deepEqual(applyThinkingSnapshot(body), body)
  assert.throws(() => compileThinkingSelection({ ...identity, options: { mode: true } }, 'image'), localFailure)
  assert.throws(() => compileThinkingSelection({ ...identity, protocol: 'openai-chat-completions', options: { mode: true } }, 'main'), localFailure)
})

test('actual Omni text and vision adapters preserve text-only streaming and omit unknown effort/budget', async () => {
  const runtime: any = await createRefineRuntime()
  const png = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#9a9' } }).png().toBuffer()
  let snapshot: any, captured: any[] = []
  try {
    runtime.legacy.configureProviderWorkflow({ ...runtime.workflow, active: () => true, key: async () => 'fixture-key', call: async (_d: any, fn: any) => fn(), thinking: () => snapshot, record: async () => {} })
    runtime.legacy.configureRuntimeFetch(async (url: any, init: any) => {
      captured.push({ url, body: JSON.parse(init.body) })
      return new Response([
        { choices: [{ index: 0, delta: { reasoning_content: 'Private fixture reasoning' } }] },
        { choices: [{ index: 0, delta: { content: 'Visible fixture' }, finish_reason: 'stop' }] },
      ].map(value => `data: ${JSON.stringify(value)}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
    })
    for (const role of ['main', 'vision'] as const) for (const mode of [true, false, undefined]) {
      snapshot = compileThinkingSelection({ ...identity, options: mode === undefined ? {} : { mode } }, role)
      captured = []
      const output = role === 'main'
        ? await runtime.legacy.callTextModel('bailian', modelId, 'fixture-key', 'system', 'user', [], { thinkingRole: 'main' })
        : await runtime.legacy.callVisionModel('bailian', modelId, 'fixture-key', 'method', 'caption', [{ url: `data:image/png;base64,${png.toString('base64')}`, mimeType: 'image/png' }])
      assert.equal(output, 'Visible fixture')
      assert.equal(captured.length, 1)
      const { body, url } = captured[0]
      assert.equal(url, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
      assert.equal(body.model, modelId)
      assert.equal(body.stream, true)
      assert.deepEqual(body.modalities, ['text'])
      assert.equal(body.enable_thinking, mode)
      for (const field of ['audio', 'reasoning_effort', 'thinking_budget', 'extra_body']) assert.equal(body[field], undefined)
    }
  } finally { await runtime.close() }
})

test('December alias evidence cannot enable adjacent snapshots, realtime IDs, or other channels', () => {
  for (const id of ['qwen3-omni-flash-2025-09-15', 'qwen3-omni-flash-2025-12-02', 'qwen3-omni-flash-realtime-2025-09-15']) {
    for (const role of ['main', 'vision'] as const) assert.throws(() => compileThinkingSelection({ ...identity, modelId: id, options: { mode: true } }, role), localFailure)
  }
  assert.throws(() => compileThinkingSelection({ ...identity, provider: 'qianfan', options: { mode: true } }, 'main'), localFailure)
  assert.equal(thinkingProfile('bailian', 'qwen3-omni-flash-2025-09-15', 'main', identity.protocol).status, 'unconfirmed')
  assert.equal(thinkingProfile('bailian', 'qwen3-omni-flash', 'main', identity.protocol).status, 'supported')
})
