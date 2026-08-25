import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BenchmarkBudget,
  InMemoryBenchmarkRepository,
  UnknownProviderOutcomeError,
  approveCandidate,
  benchmarkIdempotencyKey,
  detectImageCandidates,
  parseWorkerConfig,
  runProviderOperation,
  parseJudgeResponse,
  judgeWithSingleRepair,
  createSharedImageRuntime,
  executeBenchmarkRun,
  evaluateJudgeCalibration,
  redactHealthError,
  listIndexesOrEmpty,
} from '../src/index.js'

test('worker is disabled, single-concurrency and six-hour detection by default', () => {
  const config = parseWorkerConfig({})
  assert.equal(config.enabled, false)
  assert.equal(config.concurrency, 1)
  assert.equal(config.detectionIntervalMs, 6 * 60 * 60 * 1_000)
  assert.equal(config.ossPrefix, 'bench/')
  assert.deepEqual(config.availableProviders, [])
})

test('fresh benchmark database treats missing index namespace as empty', async () => {
  assert.deepEqual(await listIndexesOrEmpty({ async indexes() { throw Object.assign(new Error('namespace missing'), { code: 26 }) } }), [])
  await assert.rejects(() => listIndexesOrEmpty({ async indexes() { throw Object.assign(new Error('denied'), { code: 13 }) } }), /denied/)
})

test('judge epoch publication gate requires at least 85% red-line accuracy and stable agreement', () => {
  assert.deepEqual(evaluateJudgeCalibration({ correctRedLines: 11, totalRedLines: 12, agreement: 0.86 }), { accuracy: 11 / 12, agreement: 0.86, passed: true })
  assert.equal(evaluateJudgeCalibration({ correctRedLines: 10, totalRedLines: 12, agreement: 0.9 }).passed, false)
  assert.equal(evaluateJudgeCalibration({ correctRedLines: 12, totalRedLines: 12, agreement: 0.7 }).passed, false)
})

test('quick run generates all 12x2 samples before either judge phase', async () => {
  const events: string[] = []
  const samples = new Map<string, any>()
  const judgments: any[] = []
  const cases = Array.from({ length: 12 }, (_, index) => ({ id: `case-${index}`, renderPrompt: `prompt-${index}`, negativePrompt: '', aspectRatio: 'auto', rubric: {}, caption: `caption-${index}`, manifestHash: `rubric-${index}` }))
  const result = await executeBenchmarkRun({
    run: { runId: 'run-1', phase: 'quick', provider: 'ark', modelId: 'model', lane: '2K-standard', repetitions: 2 },
    cases,
    async generate(sample) { events.push(`generate:${sample.sampleId}`); return { imageBase64: 'png', imageHash: sample.sampleId } },
    async judge(provider, sample) { events.push(`judge:${provider}:${sample.sampleId}`); return { scores: Object.fromEntries(['faithfulness','conciseness','readability','aesthetics','text_accuracy','topology','instruction_adherence'].map((axis) => [axis, 8])), evidence: ['ok'], redLines: [], confidence: 1 } },
    repository: {
      async findSample(id) { return samples.get(id) || null },
      async saveSample(sample) { samples.set(sample.sampleId, sample) },
      async findJudgment(_sampleId, provider) { return judgments.find((item) => item.sampleId === _sampleId && item.provider === provider) || null },
      async saveJudgment(judgment) { judgments.push(judgment) },
      async completeRun(state) { events.push(`complete:${state}`) },
    },
  })
  assert.equal(samples.size, 24)
  assert.equal(judgments.length, 48)
  assert.equal(result.nextState, 'quick_review')
  const generationIndexes = events.map((event, index) => event.startsWith('generate:') ? index : -1).filter((index) => index >= 0)
  assert.ok(Math.max(...generationIndexes) < events.findIndex((event) => event.startsWith('judge:')))
})

test('shared image runtime preserves the authoritative Core request and returned PNG bytes', async () => {
  const calls: unknown[][] = []
  const runtime = createSharedImageRuntime(async (...args: unknown[]) => {
    calls.push(args)
    return 'png-base64'
  })
  const result = await runtime.generate({ provider: 'ark', model: 'seedream', apiKey: 'runtime-secret', prompt: 'prompt', aspectRatio: 'auto', imageSize: '2K-standard' })
  assert.equal(result, 'png-base64')
  assert.deepEqual(calls, [['ark', 'seedream', 'runtime-secret', 'prompt', 'auto', '', '2K', true]])
})

test('judge parser is strict and repairs malformed JSON at most once', async () => {
  const valid = JSON.stringify({
    scores: { faithfulness: 8, conciseness: 7, readability: 8, aesthetics: 7, text_accuracy: 9, topology: 8, instruction_adherence: 9 },
    evidence: ['required nodes are visible'], redLines: [], confidence: 0.9,
  })
  assert.equal(parseJudgeResponse(valid).scores.text_accuracy, 9)
  assert.throws(() => parseJudgeResponse('```json\n' + valid + '\n```'), /BENCHMARK_JUDGE_JSON_INVALID/)
  let calls = 0
  const repaired = await judgeWithSingleRepair(async (repair) => {
    calls += 1
    return repair ? valid : '{bad'
  })
  assert.equal(repaired.scores.topology, 8)
  assert.equal(calls, 2)
  await assert.rejects(() => judgeWithSingleRepair(async () => '{still-bad'), /BENCHMARK_JUDGE_JSON_INVALID/)
})

test('worker only reads dedicated Bench credentials and never returns their values', () => {
  const config = parseWorkerConfig({
    BAILIAN_API_KEY: 'user-key-must-be-ignored',
    PAPERBANANA_BENCH_BAILIAN_API_KEY: 'bench-secret',
    PAPERBANANA_BENCH_OPENROUTER_API_KEY: 'openrouter-secret',
  })
  assert.deepEqual(config.availableProviders, ['bailian', 'openrouter'])
  assert.equal(JSON.stringify(config).includes('secret'), false)
  assert.equal('credentials' in config, false)
})

test('health errors redact credentials, authorization headers and credentialed URLs', () => {
  const message = redactHealthError('Bearer short-secret PAPERBANANA_BENCH_ARK_API_KEY=ark-secret mongodb://bench:password@mongodb/db sk-providersecret')
  assert.equal(message.includes('short-secret'), false)
  assert.equal(message.includes('ark-secret'), false)
  assert.equal(message.includes('password'), false)
  assert.equal(message.includes('sk-providersecret'), false)
})

test('registry detection creates only new selectable image candidates and performs no calls', () => {
  const previous = { providers: { bailian: { models: [{ id: 'old', selectable: true, roles: ['image'] }] } } }
  const current = { providers: {
    bailian: { models: [
      { id: 'old', selectable: true, roles: ['image'] },
      { id: 'promoted', selectable: true, roles: ['image'], vendor: 'Alibaba Qwen', capabilities: { resolutions: ['2K'] } },
      { id: 'new-image', selectable: true, roles: ['image'], vendor: 'Alibaba Qwen', capabilities: { resolutions: ['2K'] } },
      { id: 'hidden', selectable: false, roles: ['image'] },
      { id: 'text-only', selectable: true, roles: ['main'] },
    ] },
    gemini: { models: [{ id: 'unsupported-key', selectable: true, roles: ['image'], capabilities: { resolutions: ['2K'] } }] },
  } }
  previous.providers.bailian.models.push({ id: 'promoted', selectable: true, roles: ['main'] })
  const candidates = detectImageCandidates(previous, current, 'registry-hash')
  assert.deepEqual(candidates.map((item) => item.modelId), ['new-image', 'promoted'])
  assert.equal(candidates[0].state, 'detected')
  assert.equal(candidates[0].registryHash, 'registry-hash')
  assert.equal(candidates[0].developer, 'Alibaba Qwen')
})

test('approval fails closed until entitlement, price, limits and budget are explicit', () => {
  assert.throws(() => approveCandidate({ candidateId: 'c1' } as never), /BENCHMARK_APPROVAL_INCOMPLETE/)
  const approved = approveCandidate({
    candidateId: 'c1',
    entitlementConfirmed: true,
    priceSnapshot: { currency: 'USD', estimatedPerGeneration: 0.04, capturedAt: '2026-08-25T00:00:00Z' },
    maxGenerations: 24,
    maxJudgeCalls: 48,
    maxEstimatedUsd: 2,
    approvedBy: 'immutable-admin-id',
  })
  assert.equal(approved.state, 'approved')
  assert.equal(approved.maxGenerations, 24)
})

test('budget pauses before generation, judgment or estimated cost can exceed a cap', () => {
  const budget = new BenchmarkBudget({ maxGenerations: 2, maxJudgeCalls: 3, maxEstimatedUsd: 1 })
  budget.reserve({ kind: 'generation', estimatedUsd: 0.4 })
  budget.reserve({ kind: 'generation', estimatedUsd: 0.4 })
  assert.throws(() => budget.reserve({ kind: 'generation', estimatedUsd: 0.1 }), /BENCHMARK_BUDGET_PAUSED:GENERATIONS/)

  const judges = new BenchmarkBudget({ maxGenerations: 10, maxJudgeCalls: 1, maxEstimatedUsd: 1 })
  judges.reserve({ kind: 'judgment', estimatedUsd: 0.1 })
  assert.throws(() => judges.reserve({ kind: 'judgment', estimatedUsd: 0.1 }), /BENCHMARK_BUDGET_PAUSED:JUDGMENTS/)

  const cost = new BenchmarkBudget({ maxGenerations: 10, maxJudgeCalls: 10, maxEstimatedUsd: 0.3 })
  assert.throws(() => cost.reserve({ kind: 'generation', estimatedUsd: 0.31 }), /BENCHMARK_BUDGET_PAUSED:COST/)
})

test('repository leases expire, heartbeats extend ownership and idempotency keys are stable', async () => {
  let now = 1_000
  const repository = new InMemoryBenchmarkRepository(() => now)
  await repository.enqueue({ runId: 'run-1', workId: 'work-1' })
  assert.equal((await repository.acquire('worker-a', 100))?.workId, 'work-1')
  assert.equal(await repository.acquire('worker-b', 100), null)
  now = 1_050
  assert.equal(await repository.heartbeat('work-1', 'worker-a', 100), true)
  now = 1_120
  assert.equal(await repository.acquire('worker-b', 100), null)
  now = 1_151
  assert.equal((await repository.acquire('worker-b', 100))?.workId, 'work-1')
  assert.equal(benchmarkIdempotencyKey('sample', ['run-1', 'case-1', 2]), benchmarkIdempotencyKey('sample', ['run-1', 'case-1', 2]))
})

test('429 retries only with bounded Retry-After, while unknown provider outcomes never retry', async () => {
  let attempts = 0
  const result = await runProviderOperation(async () => {
    attempts += 1
    if (attempts === 1) throw Object.assign(new Error('rate limited'), { status: 429, retryAfterMs: 1 })
    return 'ok'
  }, { wait: async () => undefined, maxRetries: 1 })
  assert.equal(result, 'ok')
  assert.equal(attempts, 2)

  attempts = 0
  await assert.rejects(() => runProviderOperation(async () => {
    attempts += 1
    throw new UnknownProviderOutcomeError('request timed out after dispatch')
  }, { wait: async () => undefined, maxRetries: 5 }), UnknownProviderOutcomeError)
  assert.equal(attempts, 1)
})
