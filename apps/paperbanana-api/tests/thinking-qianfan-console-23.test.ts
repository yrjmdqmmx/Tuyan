import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { applyThinkingSnapshot, compileThinkingSelection, thinkingProfile } from '../../../packages/api/src/thinking.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

const cases = [
  { id: 'ernie-5.1', roles: ['main'], modes: ['enabled', 'disabled'], field: 'thinking' },
  { id: 'qwen3.5-122b-a10b', roles: ['main', 'vision'], modes: [true, false], field: 'enable_thinking' },
  { id: 'qwen3.5-27b', roles: ['main', 'vision'], modes: [true, false], field: 'enable_thinking' },
  { id: 'qwen3.5-35b-a3b', roles: ['main', 'vision'], modes: [true, false], field: 'enable_thinking' },
]
const identity = (modelId: string) => ({ provider: 'qianfan', modelId, protocol: 'openai-chat-completions' })
const localFailure = (e: any) => e.businessCode === 'THINKING_CONFIG_INVALID' && e.requestState === 'not_sent'
const wire = (item: typeof cases[number], mode: string | boolean) => item.field === 'thinking' ? { thinking: { type: mode } } : { enable_thinking: mode }

test('console-supported exact Qianfan IDs serialize strict field types without assuming API defaults', () => {
  for (const item of cases) for (const role of item.roles as ('main' | 'vision')[]) {
    const profile = thinkingProfile('qianfan', item.id, role, 'openai-chat-completions')
    assert.equal(profile.status, 'supported')
    assert.equal(profile.controls[0].default, null)
    const body = { model: item.id, messages: [], max_tokens: 512 }
    for (const mode of item.modes) {
      const snapshot = compileThinkingSelection({ ...identity(item.id), options: { mode } }, role)
      assert.deepEqual(snapshot.wire, wire(item, mode))
      assert.deepEqual(applyThinkingSnapshot(body, snapshot), { ...body, ...wire(item, mode) })
    }
    assert.deepEqual(applyThinkingSnapshot(body, compileThinkingSelection({ ...identity(item.id), options: {} }, role)), body)
    for (const options of [{ budget: 60000 }, { effort: 'high' }, { mode: item.field === 'thinking' ? true : 'enabled' }] as Record<string, string | number | boolean>[]) {
      assert.throws(() => compileThinkingSelection({ ...identity(item.id), options }, role), localFailure)
    }
  }
})

test('actual Qianfan text and vision adapters keep field shapes and never expose reasoning as the answer', async () => {
  const runtime: any = await createRefineRuntime()
  const png = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#9a9' } }).png().toBuffer()
  let snapshot: any, captured: any[] = []
  try {
    runtime.legacy.configureProviderWorkflow({ ...runtime.workflow, active: () => true, key: async () => 'fixture-key', call: async (_d: any, fn: any) => fn(), thinking: () => snapshot, record: async () => {} })
    runtime.legacy.configureRuntimeFetch(async (url: any, init: any) => {
      captured.push({ url, body: JSON.parse(init.body) })
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Visible fixture', reasoning_content: 'Private fixture reasoning' }, finish_reason: 'stop' }] }), { headers: { 'Content-Type': 'application/json' } })
    })
    for (const item of cases) for (const role of item.roles as ('main' | 'vision')[]) for (const mode of [...item.modes, undefined]) {
      snapshot = compileThinkingSelection({ ...identity(item.id), options: mode === undefined ? {} : { mode } }, role)
      captured = []
      const answer = role === 'main'
        ? await runtime.legacy.callTextModel('qianfan', item.id, 'fixture-key', 'system', 'user', [], { thinkingRole: 'main' })
        : await runtime.legacy.callVisionModel('qianfan', item.id, 'fixture-key', 'method', 'caption', [{ url: `data:image/png;base64,${png.toString('base64')}`, mimeType: 'image/png' }])
      assert.equal(answer, 'Visible fixture')
      assert.equal(captured.length, 1)
      const { url, body } = captured[0]
      assert.equal(url, 'https://qianfan.baidubce.com/v2/chat/completions')
      assert.equal(body.model, item.id)
      assert.deepEqual(body.thinking, item.field === 'thinking' && mode !== undefined ? { type: mode } : undefined)
      assert.equal(body.enable_thinking, item.field === 'enable_thinking' ? mode : undefined)
      for (const field of ['extra_body', 'thinking_budget', 'reasoning_effort']) assert.equal(body[field], undefined)
      assert.ok(body.max_tokens > 0)
    }
  } finally { await runtime.close() }
})

test('incomplete and contradictory evidence does not enable adjacent IDs or different roles', () => {
  for (const id of ['deepseek-v4.1-flash', 'qwen3.5-397b-a17b', 'ernie-5.0-thinking-latest']) {
    assert.equal(thinkingProfile('qianfan', id, 'main', 'openai-chat-completions').status, 'unconfirmed')
    assert.throws(() => compileThinkingSelection({ ...identity(id), options: { mode: true } }, 'main'), localFailure)
  }
  assert.throws(() => compileThinkingSelection({ ...identity('ernie-5.1'), options: { mode: 'enabled' } }, 'vision'), localFailure)
  assert.throws(() => compileThinkingSelection({ ...identity('qwen3.5-27b'), protocol: 'bailian-openai-chat', options: { mode: true } }, 'main'), localFailure)
})
