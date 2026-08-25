import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { benchmarkImmutableRunBinding, canonicalHash } from '@paperbanana/benchmark-core'

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
  JUDGE_CALIBRATION_FIXTURES,
  buildJudgeCalibrationReport,
  BENCHMARK_CANARY_CASE_IDS,
  executeBenchmarkCanary,
  executeJudgeCalibration,
  parseBenchmarkOperatorAuthorization,
  benchmarkJudgePrompt,
  redactHealthError,
  listIndexesOrEmpty,
  loadBuildProvenance,
  parseBenchmarkPhaseAuthorization,
  assertRunMatchesPhaseAuthorization,
  buildBenchmarkPhaseOperatorReport,
  diagnoseJudgeProviderAccess,
  classifyOperatorError,
  createOpenRouterJudgeEgress,
  selectRecoverableCalibrationReport,
} from '../src/index.js'
import { callBlindJudge } from '../src/judge-provider.js'
import { runOpenRouterJudgeProbe } from '../src/openrouter-judge-probe.js'
import { createWorkerMongoRepository } from '../src/mongo-repository.js'

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

test('worker reads immutable build provenance from a regular file and rejects malformed content', async () => {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-build-provenance-'))
  const provenancePath = join(root, 'build-provenance.json')
  try {
    writeFileSync(provenancePath, JSON.stringify({ codeSha: 'a'.repeat(40) }), { mode: 0o444 })
    assert.deepEqual(await loadBuildProvenance(provenancePath), { codeSha: 'a'.repeat(40) })
    chmodSync(provenancePath, 0o600)
    writeFileSync(provenancePath, JSON.stringify({ codeSha: 'mutable' }), { mode: 0o444 })
    await assert.rejects(() => loadBuildProvenance(provenancePath), /BENCHMARK_BUILD_PROVENANCE_INVALID/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('judge epoch publication gate requires at least 85% red-line accuracy and stable agreement', () => {
  assert.deepEqual(evaluateJudgeCalibration({ correctRedLines: 11, totalRedLines: 12, agreement: 0.86 }), { accuracy: 11 / 12, agreement: 0.86, passed: true })
  assert.equal(evaluateJudgeCalibration({ correctRedLines: 10, totalRedLines: 12, agreement: 0.9 }).passed, false)
  assert.equal(evaluateJudgeCalibration({ correctRedLines: 12, totalRedLines: 12, agreement: 0.7 }).passed, false)
})

test('judge calibration fixtures are immutable original gold cases covering every required defect', () => {
  assert.equal(Object.isFrozen(JUDGE_CALIBRATION_FIXTURES), true)
  assert.deepEqual(
    JUDGE_CALIBRATION_FIXTURES.map((fixture) => fixture.expectedRedLines[0]),
    ['missing_node', 'reversed_arrow', 'garbled_text', 'occlusion', 'low_contrast', 'aspect_ratio_violation'],
  )
  for (const fixture of JUDGE_CALIBRATION_FIXTURES) {
    assert.match(fixture.id, /^judge-calibration-v1-/)
    assert.equal(fixture.license.spdx, 'CC-BY-4.0')
    assert.equal(fixture.license.source, 'original')
    assert.match(fixture.svg, /^<svg[\s\S]*<\/svg>$/)
    assert.match(fixture.manifestHash, /^[a-f0-9]{64}$/)
  }
  const reversedArrow = JUDGE_CALIBRATION_FIXTURES.find((fixture) => fixture.expectedRedLines[0] === 'reversed_arrow')!
  assert.match(reversedArrow.svg, /M595 250 H485/)
  assert.match(reversedArrow.svg, /M503 236 L485 250 L503 264/)
})

test('Judge provider access diagnostics use authenticated read-only endpoints and fixed stage codes', async () => {
  const openrouterCalls: Array<{ url: string; method: string }> = []
  const directCalls: Array<{ url: string; method: string }> = []
  const stages: string[] = []
  const result = await diagnoseJudgeProviderAccess({
    openrouterKey: 'test-openrouter', bailianKey: 'test-bailian',
    emit(stage) { stages.push(stage) },
    async openrouterFetchImpl(input, init) {
      const url = String(input)
      openrouterCalls.push({ url, method: String(init?.method || 'GET') })
      if (url.endsWith('/api/v1/key')) return Response.json({ data: { is_management_key: false, limit_remaining: 10 } })
      if (url === 'https://openrouter.ai/api/v1/models/user') return Response.json({ data: [{ id: 'google/gemini-3.7-flash' }] })
      return new Response('{}', { status: 404 })
    },
    async fetchImpl(input, init) {
      const url = String(input)
      directCalls.push({ url, method: String(init?.method || 'GET') })
      if (url === 'https://dashscope.aliyuncs.com/compatible-mode/v1/models') return Response.json({ data: [{ id: 'qwen3.7-plus' }] })
      return new Response('{}', { status: 404 })
    },
  })
  assert.deepEqual(result, { openrouterModel: 'google/gemini-3.7-flash', bailianModel: 'qwen3.7-plus' })
  assert.deepEqual(stages, ['openrouter-auth-ok', 'openrouter-model-ok', 'bailian-auth-ok', 'bailian-model-ok', 'diagnostic-complete'])
  assert.deepEqual(openrouterCalls.map((call) => call.url), ['https://openrouter.ai/api/v1/key', 'https://openrouter.ai/api/v1/models/user'])
  assert.deepEqual(directCalls.map((call) => call.url), ['https://dashscope.aliyuncs.com/compatible-mode/v1/models'])
  assert.ok([...openrouterCalls, ...directCalls].every((call) => call.method === 'GET'))
})

test('OpenRouter Judge egress is fixed, fail-closed, host-scoped and closes once', async () => {
  const fixed = 'http://10.77.0.2:3128'
  for (const env of [
    {},
    { PAPERBANANA_BENCH_OPENROUTER_EGRESS_MODE: 'disabled', PAPERBANANA_BENCH_SG_PROXY_URL: fixed },
    { PAPERBANANA_BENCH_OPENROUTER_EGRESS_MODE: 'sg-required', PAPERBANANA_BENCH_SG_PROXY_URL: 'http://127.0.0.1:3128' },
  ]) assert.throws(() => createOpenRouterJudgeEgress(env), /BENCHMARK_OPENROUTER_EGRESS_CONFIG_INVALID/)

  let closeCalls = 0
  const dispatched: Array<{ input: string; proxy: unknown }> = []
  const proxy = { async close() { closeCalls += 1 } }
  const egress = createOpenRouterJudgeEgress({
    PAPERBANANA_BENCH_OPENROUTER_EGRESS_MODE: 'sg-required',
    PAPERBANANA_BENCH_SG_PROXY_URL: fixed,
  }, {
    createProxyAgent(url) { assert.equal(url, fixed); return proxy as any },
    async fetchWithDispatcher(input, init) {
      dispatched.push({ input: String(input), proxy: (init as any).dispatcher })
      return Response.json({ ok: true })
    },
  })
  assert.equal((await egress.fetch('https://openrouter.ai/api/v1/key')).status, 200)
  assert.deepEqual(dispatched, [{ input: 'https://openrouter.ai/api/v1/key', proxy }])
  for (const url of [
    'http://openrouter.ai/api/v1/key',
    'https://openrouter.ai:444/api/v1/key',
    'https://user:pass@openrouter.ai/api/v1/key',
    'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
  ]) await assert.rejects(() => egress.fetch(url), /BENCHMARK_OPENROUTER_EGRESS_TARGET_INVALID/)
  await Promise.all([egress.close(), egress.close()])
  assert.equal(closeCalls, 1)
})

test('Judge provider diagnostics and operator failures expose only fixed classifications', async () => {
  await assert.rejects(() => diagnoseJudgeProviderAccess({
    openrouterKey: 'secret-openrouter-value', bailianKey: 'secret-bailian-value', emit() {},
    fetchImpl: async () => new Response('{}', { status: 401 }),
  }), /BENCHMARK_JUDGE_ACCESS_OPENROUTER_AUTH/)
  assert.equal(classifyOperatorError(new Error('BENCHMARK_JUDGE_HTTP_401')), 'BENCHMARK_JUDGE_HTTP_401')
  assert.equal(classifyOperatorError(new Error('secret-openrouter-value leaked')), 'BENCHMARK_OPERATOR_FAILURE_REDACTED')
})

test('judge calibration report scores exact red-line sets, pair agreement and immutable fixture hash', () => {
  const judgments = JUDGE_CALIBRATION_FIXTURES.flatMap((fixture, index) => [
    { fixtureId: fixture.id, provider: 'openrouter' as const, redLines: fixture.expectedRedLines },
    { fixtureId: fixture.id, provider: 'bailian' as const, redLines: index === 0 ? [] : fixture.expectedRedLines },
  ])
  const report = buildJudgeCalibrationReport({ fixtures: JUDGE_CALIBRATION_FIXTURES, judgments })
  assert.equal(report.totalRedLines, 12)
  assert.equal(report.correctRedLines, 11)
  assert.equal(report.accuracy, 11 / 12)
  assert.equal(report.agreement, 5 / 6)
  assert.equal(report.passed, true)
  assert.match(report.fixtureHash, /^[a-f0-9]{64}$/)
  assert.deepEqual(Object.keys(report).sort(), ['accuracy', 'agreement', 'correctRedLines', 'fixtureHash', 'passed', 'totalRedLines'])
})

test('calibration recovery selects one exact immutable passed report without making provider calls', () => {
  const codeSha = 'a'.repeat(40)
  const binding = {
    codeSha,
    notBefore: '2026-08-25T23:13:00.000Z',
    maxJudgeCalls: 14,
    maxEstimatedUsd: 1.4,
    estimatedPerJudgeCallUsd: 0.1,
    priceSource: 'https://openrouter.ai/google/gemini-3.7-flash',
    priceCapturedAt: '2026-08-25T22:54:13.000Z',
  }
  const priceSnapshot = { currency: 'USD', source: binding.priceSource, capturedAt: binding.priceCapturedAt, estimatedPerGenerationUsd: 0, estimatedPerJudgeCallUsd: 0.1 }
  const priceHash = canonicalHash(priceSnapshot)
  const authorizationBase = {
    mode: 'calibration', codeSha, maxGenerations: 0, maxJudgeCalls: 14, maxEstimatedUsd: 1.4,
    estimatedPerGenerationUsd: 0, estimatedPerJudgeCallUsd: 0.1, priceSnapshot, priceHash,
  }
  const authorizationHash = canonicalHash(authorizationBase)
  const reportBase = {
    operatorMode: 'calibration',
    codeSha,
    judgeEpoch: 'judge-2026-08-v1',
    judgeStackHash: 'b'.repeat(64),
    authorizationHash,
    authorization: { ...authorizationBase, authorizationHash },
    priceHash,
    priceSnapshot,
    usage: { generations: 0, judgments: 12, estimatedUsd: 1.2 },
    createdAt: '2026-08-25T23:16:20.000Z',
    result: { fixtureHash: 'e'.repeat(64), correctRedLines: 11, totalRedLines: 12, accuracy: 11 / 12, agreement: 5 / 6, passed: true },
  }
  const operatorReportHash = canonicalHash(reportBase)
  const report = { ...reportBase, operatorReportHash }
  assert.deepEqual(
    selectRecoverableCalibrationReport([
      { objectKey: `bench/operator-reports/${'f'.repeat(64)}.json`, report: { ...report, codeSha: '0'.repeat(40) } },
      { objectKey: `bench/operator-reports/${operatorReportHash}.json`, report },
    ], binding),
    { ...report, reportObjectKey: `bench/operator-reports/${operatorReportHash}.json` },
  )
  assert.throws(() => selectRecoverableCalibrationReport([], binding), /BENCHMARK_CALIBRATION_RECOVERY_NOT_FOUND/)
  assert.throws(() => selectRecoverableCalibrationReport([
    { objectKey: `bench/operator-reports/${operatorReportHash}.json`, report },
    { objectKey: `bench/operator-reports/${operatorReportHash}.json`, report },
  ], binding), /BENCHMARK_CALIBRATION_RECOVERY_AMBIGUOUS/)
})

test('two-image canary uses fixed diagnostic cases and never expands into the 24-image quick set', async () => {
  const generated: string[] = []
  const judged: string[] = []
  const result = await executeBenchmarkCanary({
    provider: 'ark',
    modelId: 'doubao-seedream-test',
    lane: '2K-standard',
    async generate(sample) {
      generated.push(sample.caseId)
      return { imageHash: `hash-${sample.caseId}`, imageObjectKey: `bench/canary/${sample.caseId}.png`, latencyMs: 1000 }
    },
    async judge(provider, sample) {
      judged.push(`${provider}:${sample.caseId}`)
      return {
        scores: Object.fromEntries(['faithfulness','conciseness','readability','aesthetics','text_accuracy','topology','instruction_adherence'].map((axis) => [axis, 8])),
        evidence: ['visible evidence'], redLines: [], confidence: 0.9,
      }
    },
  })
  assert.deepEqual(generated, [...BENCHMARK_CANARY_CASE_IDS])
  assert.equal(generated.length, 2)
  assert.equal(judged.length, 4)
  assert.equal(result.sampleCount, 2)
  assert.equal(result.judgmentCount, 4)
  assert.equal(result.passed, true)
  assert.match(result.reportHash, /^[a-f0-9]{64}$/)
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

test('automatic red-line ordering does not create a false audit conflict', async () => {
  const samples = new Map<string, any>()
  const judgments: any[] = []
  const marked: string[][] = []
  const cases = Array.from({ length: 12 }, (_, index) => ({ id: `ordered-${index}`, renderPrompt: 'prompt', negativePrompt: '', aspectRatio: 'auto', rubric: {}, caption: 'caption', manifestHash: 'hash' }))
  const result = await executeBenchmarkRun({
    run: { runId: 'ordered-red-lines', phase: 'quick', provider: 'ark', modelId: 'model', lane: '2K-standard', repetitions: 1, runHash: canonicalHash('ordered-red-lines') },
    cases,
    async generate(sample) { return { imageHash: canonicalHash(sample.sampleId), latencyMs: 1_000 } },
    async judge(provider) {
      return {
        scores: Object.fromEntries(['faithfulness','conciseness','readability','aesthetics','text_accuracy','topology','instruction_adherence'].map((axis) => [axis, 8])),
        evidence: ['ok'], redLines: provider === 'openrouter' ? ['missing_node', 'reversed_arrow'] : ['reversed_arrow', 'missing_node'], confidence: 1,
      }
    },
    repository: {
      async findSample(id) { return samples.get(id) || null },
      async saveSample(sample) { samples.set(sample.sampleId, sample) },
      async findJudgment(sampleId, provider) { return judgments.find((item) => item.sampleId === sampleId && item.provider === provider) || null },
      async saveJudgment(judgment) { judgments.push(judgment) },
      async markAudits(ids) { marked.push(ids) },
      async completeRun() {},
    },
  })
  assert.equal(result.auditSampleIds.length, 2)
  assert.deepEqual(marked[0], result.auditSampleIds)
})

test('full phase never reuses quick samples or automatic judgments from the same run', async () => {
  const generated: string[] = []
  const judgments: any[] = []
  const samples = new Map<string, any>()
  const summaries: any[] = []
  const cases = [{ id: 'case-1', renderPrompt: 'prompt', negativePrompt: '', aspectRatio: 'auto', rubric: {}, caption: 'caption', manifestHash: 'rubric' }]
  const repository = {
    async findSample(id: string) { return samples.get(id) || null },
    async saveSample(sample: any) { samples.set(sample.sampleId, sample) },
    async findJudgment(sampleId: string, provider: string) { return judgments.find((item) => item.sampleId === sampleId && item.provider === provider) || null },
    async saveJudgment(judgment: any) { judgments.push(judgment) },
    async completeRun(_state: string, summary: any) { summaries.push(summary) },
  }
  const generate = async (sample: { sampleId: string }) => {
    generated.push(sample.sampleId)
    return { imageHash: canonicalHash(sample.sampleId), imageObjectKey: `bench/objects/${canonicalHash(sample.sampleId)}.png` }
  }
  const judge = async () => ({
    scores: Object.fromEntries(['faithfulness','conciseness','readability','aesthetics','text_accuracy','topology','instruction_adherence'].map((axis) => [axis, 8])),
    evidence: ['ok'], redLines: [], confidence: 1,
  })

  await executeBenchmarkRun({
    run: { runId: 'shared-run', phase: 'quick', provider: 'ark', modelId: 'model', lane: '2K-standard', repetitions: 2 },
    cases, generate, judge, repository,
  })
  const quickSampleIds = new Set(samples.keys())
  await executeBenchmarkRun({
    run: { runId: 'shared-run', phase: 'full', provider: 'ark', modelId: 'model', lane: '2K-standard', repetitions: 3, expectedCaseCount: 2, capabilityGaps: ['case=fixed-1;aspectRatio=4:3'] },
    cases, generate, judge, repository,
  })
  const fullSamples = [...samples.values()].filter((sample) => sample.phase === 'full')

  assert.equal(generated.length, 5)
  assert.equal(samples.size, 5)
  assert.equal(fullSamples.length, 3)
  assert.equal(judgments.length, 10)
  assert.ok(fullSamples.every((sample) => !quickSampleIds.has(sample.sampleId)))
  assert.deepEqual(summaries[1].capabilityGaps, ['case=fixed-1;aspectRatio=4:3'])
  assert.deepEqual(summaries[1].releaseDraft.models[0].capabilityGaps, ['case=fixed-1;aspectRatio=4:3'])
  assert.equal(summaries[1].releaseDraft.models[0].coverage, 1)
  assert.equal(summaries[1].releaseDraft.models[0].capabilityCoverage, 0.5)
  assert.equal(summaries[1].releaseDraft.models[0].successRate, 1)
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

test('judge prompt fixes the six calibration red-line codes and visible-evidence contract', () => {
  const prompt = benchmarkJudgePrompt({ rubric: {}, caption: 'expected' })
  for (const code of ['missing_node', 'reversed_arrow', 'garbled_text', 'occlusion', 'low_contrast', 'aspect_ratio_violation']) {
    assert.match(prompt, new RegExp(code))
  }
  assert.match(prompt, /visible evidence/i)
  assert.match(prompt, /redLines/i)
})

test('judge provider caps output tokens on every fixed Judge request', async () => {
  let requestBody: any
  const valid = {
    scores: { faithfulness: 8, conciseness: 8, readability: 8, aesthetics: 8, text_accuracy: 8, topology: 8, instruction_adherence: 8 },
    evidence: ['visible'], redLines: [], confidence: 0.9,
  }
  await callBlindJudge({
    provider: 'openrouter', apiKey: 'fake-key', imageBase64: 'cG5n', rubric: {}, caption: 'caption',
    async fetchImpl(_url, init) {
      requestBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(valid) } }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, cost: 0.01 } }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })
  assert.equal(requestBody.max_tokens, 4096)
  assert.deepEqual(requestBody.reasoning, { effort: 'low', exclude: true })
  assert.equal(requestBody.response_format.type, 'json_schema')
  assert.equal(requestBody.response_format.json_schema.strict, true)
  assert.deepEqual(requestBody.response_format.json_schema.schema.required.sort(), ['confidence', 'evidence', 'redLines', 'scores'])
  assert.equal(requestBody.response_format.json_schema.schema.additionalProperties, false)
  assert.deepEqual(Object.keys(requestBody.response_format.json_schema.schema.properties.scores.properties).sort(), [
    'aesthetics', 'conciseness', 'faithfulness', 'instruction_adherence', 'readability', 'text_accuracy', 'topology',
  ])
  assert.deepEqual(requestBody.provider, { require_parameters: true })
})

test('Bailian Judge uses the same strict JSON Schema without OpenRouter routing fields', async () => {
  let requestBody: any
  const valid = JSON.stringify({
    scores: { faithfulness: 8, conciseness: 8, readability: 8, aesthetics: 8, text_accuracy: 8, topology: 8, instruction_adherence: 8 },
    evidence: ['visible'], redLines: [], confidence: 0.9,
  })
  await callBlindJudge({
    provider: 'bailian', apiKey: 'fake-key', imageBase64: 'cG5n', rubric: {}, caption: 'caption',
    async fetchImpl(_url, init) {
      requestBody = JSON.parse(String(init?.body || '{}'))
      return new Response(JSON.stringify({ choices: [{ message: { content: valid } }] }), { status: 200 })
    },
  })
  assert.equal(requestBody.response_format.type, 'json_schema')
  assert.equal(requestBody.response_format.json_schema.strict, true)
  assert.deepEqual(requestBody.response_format.json_schema.schema.required.sort(), ['confidence', 'evidence', 'redLines', 'scores'])
  assert.equal(requestBody.provider, undefined)
  assert.equal(requestBody.reasoning, undefined)
  assert.equal(requestBody.max_tokens, 4096)
})

test('Judge JSON failures identify only the fixed provider after the single repair', async () => {
  for (const provider of ['openrouter', 'bailian'] as const) {
    let dispatches = 0
    await assert.rejects(() => callBlindJudge({
      provider, apiKey: 'fake-key', imageBase64: 'cG5n', rubric: {}, caption: 'caption',
      async fetchImpl() {
        dispatches += 1
        return Response.json({ choices: [{ message: { content: '{invalid' } }] })
      },
    }), new RegExp(`BENCHMARK_JUDGE_JSON_INVALID_${provider.toUpperCase()}`))
    assert.equal(dispatches, 2)
  }
})

test('OpenRouter 403 responses are reduced to fixed safe failure classes', async () => {
  const cases = [
    [{ error: { message: 'Insufficient credits for this request' } }, /BENCHMARK_JUDGE_FORBIDDEN_BUDGET/],
    [{ error: { message: 'Request blocked', metadata: { patterns: ['prompt injection'] } }, openrouter_metadata: { pipeline: [{ type: 'guardrail', name: 'regex_pi_detection' }] } }, /BENCHMARK_JUDGE_FORBIDDEN_GUARDRAIL/],
    [{ error: { message: 'Model is not in the allowed model list' } }, /BENCHMARK_JUDGE_FORBIDDEN_ACCESS_POLICY/],
  ] as const
  for (const [body, expected] of cases) {
    let requestHeaders: Headers | undefined
    await assert.rejects(callBlindJudge({
      provider: 'openrouter', apiKey: 'fake-key', imageBase64: 'cG5n', rubric: {}, caption: 'caption',
      async fetchImpl(_url, init) {
        requestHeaders = new Headers(init?.headers)
        return new Response(JSON.stringify(body), { status: 403, headers: { 'content-type': 'application/json' } })
      },
    }), expected)
    assert.equal(requestHeaders?.get('x-openrouter-metadata'), 'enabled')
  }
})

test('OpenRouter Judge probe makes exactly one request and returns only fixed safe classifications', async () => {
  const cases = [
    [new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }), 'OPENROUTER_JUDGE_PROBE_OK'],
    [new Response('<html>cloud edge denied</html>', { status: 403, headers: { 'content-type': 'text/html' } }), 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_EDGE'],
    [new Response(JSON.stringify({ error: { message: 'Provider returned error', metadata: { raw: '<html>upstream denied</html>', provider_name: 'redacted-provider' } } }), { status: 403, headers: { 'content-type': 'application/json' } }), 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_UPSTREAM'],
    [new Response(JSON.stringify({ error: { message: 'blocked', metadata: { patterns: ['prompt injection'] } }, openrouter_metadata: { pipeline: [{ type: 'guardrail' }] } }), { status: 403, headers: { 'content-type': 'application/json' } }), 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_GUARDRAIL'],
    [new Response(JSON.stringify({ error: { message: 'unclassified secret response text' } }), { status: 403, headers: { 'content-type': 'application/json' } }), 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_OPAQUE'],
  ] as const

  for (const [response, expected] of cases) {
    let dispatches = 0
    const result = await runOpenRouterJudgeProbe({
      kind: 'text_only', apiKey: 'probe-secret-key',
      async fetchImpl(_url, init) {
        dispatches += 1
        const headers = new Headers(init?.headers)
        assert.equal(headers.get('authorization'), 'Bearer probe-secret-key')
        assert.equal(headers.get('x-openrouter-metadata'), 'enabled')
        return response
      },
    })
    assert.equal(result, expected)
    assert.equal(dispatches, 1)
    assert.doesNotMatch(result, /secret|response text|redacted-provider/i)
  }
})

test('OpenRouter Judge probe kinds isolate text, minimal image, and exact benchmark fixture payloads', async () => {
  const bodies: Record<string, any> = {}
  for (const kind of ['text_only', 'minimal_image', 'benchmark_fixture'] as const) {
    const result = await runOpenRouterJudgeProbe({
      kind, apiKey: 'fake-key', imageBase64: kind === 'text_only' ? undefined : 'cG5n',
      async fetchImpl(_url, init) {
        bodies[kind] = JSON.parse(String(init?.body || '{}'))
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
      },
    })
    assert.equal(result, 'OPENROUTER_JUDGE_PROBE_OK')
  }
  assert.equal(typeof bodies.text_only.messages[0].content, 'string')
  assert.equal(bodies.text_only.messages[0].content.includes('image_url'), false)
  assert.deepEqual(bodies.minimal_image.messages[0].content.map((item: any) => item.type), ['text', 'image_url'])
  assert.equal(bodies.minimal_image.messages[0].content[1].image_url.url, 'data:image/png;base64,cG5n')
  assert.match(bodies.benchmark_fixture.messages[0].content[0].text, /redLines/)
  assert.equal(bodies.benchmark_fixture.max_tokens, 1200)
})

test('one logical judgment can use explicitly bounded repair plus one 429 retry headroom', async () => {
  const valid = JSON.stringify({
    scores: { faithfulness: 8, conciseness: 8, readability: 8, aesthetics: 8, text_accuracy: 8, topology: 8, instruction_adherence: 8 },
    evidence: ['visible'], redLines: [], confidence: 0.9,
  })
  let dispatches = 0
  const responses = [
    new Response(JSON.stringify({ choices: [{ message: { content: '{bad' } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
    new Response('rate limited', { status: 429, headers: { 'retry-after': '0' } }),
    new Response(JSON.stringify({ choices: [{ message: { content: '{bad' } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
    new Response(JSON.stringify({ choices: [{ message: { content: valid } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
  ]
  const result = await runProviderOperation(() => callBlindJudge({
    provider: 'openrouter', apiKey: 'fake-key', imageBase64: 'cG5n', rubric: {}, caption: 'caption',
    beforeDispatch: async () => { dispatches += 1 },
    async fetchImpl() { return responses.shift()! },
  }), { maxRetries: 1, wait: async () => undefined })
  assert.equal(result.scores.topology, 8)
  assert.equal(dispatches, 4)
  const budget = new BenchmarkBudget({ maxGenerations: 1, maxJudgeCalls: 4, maxEstimatedUsd: 1 })
  for (let index = 0; index < 4; index += 1) budget.reserve({ kind: 'judgment', estimatedUsd: 0.1 })
  assert.throws(() => budget.reserve({ kind: 'judgment', estimatedUsd: 0.1 }), /BENCHMARK_BUDGET_PAUSED:JUDGMENTS/)
})

test('judge calibration executes six original fixtures against both fixed judges', async () => {
  const calls: string[] = []
  const result = await executeJudgeCalibration({
    async render(fixture) { return Buffer.from(fixture.svg) },
    async judge(provider, fixture) {
      calls.push(`${provider}:${fixture.id}`)
      return { redLines: fixture.expectedRedLines }
    },
  })
  assert.equal(calls.length, 12)
  assert.equal(result.correctRedLines, 12)
  assert.equal(result.totalRedLines, 12)
  assert.equal(result.agreement, 1)
  assert.equal(result.passed, true)
  assert.match(result.fixtureHash, /^[a-f0-9]{64}$/)
  assert.match(result.reportHash, /^[a-f0-9]{64}$/)
})

test('operator authorization fails closed unless daemon stays disabled and paid caps are exact', () => {
  const base = {
    PAPERBANANA_BENCH_ENABLED: 'false',
    PAPERBANANA_CODE_SHA: 'a'.repeat(40),
    PAPERBANANA_BENCH_OPERATOR_CONFIRM: 'run-two-image-canary-disabled-worker',
    PAPERBANANA_BENCH_OPERATOR_MODE: 'canary',
    PAPERBANANA_BENCH_OPERATOR_PROVIDER: 'ark',
    PAPERBANANA_BENCH_OPERATOR_MODEL_ID: 'doubao-seedream-test',
    PAPERBANANA_BENCH_OPERATOR_LANE: '2K-standard',
    PAPERBANANA_BENCH_MAX_GENERATIONS: '2',
    PAPERBANANA_BENCH_MAX_JUDGE_CALLS: '6',
    PAPERBANANA_BENCH_MAX_ESTIMATED_USD: '3',
    PAPERBANANA_BENCH_ESTIMATED_PER_GENERATION_USD: '0.05',
    PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD: '0.01',
    PAPERBANANA_BENCH_PRICE_CURRENCY: 'USD',
    PAPERBANANA_BENCH_PRICE_SOURCE: 'https://openrouter.ai/api/v1/models',
    PAPERBANANA_BENCH_PRICE_CAPTURED_AT: '2026-08-25T08:00:00.000Z',
  }
  const authorization = parseBenchmarkOperatorAuthorization(base)
  assert.equal(authorization.mode, 'canary')
  assert.equal(authorization.maxGenerations, 2)
  assert.equal(authorization.maxJudgeCalls, 6)
  assert.equal(authorization.priceSnapshot.currency, 'USD')
  assert.match(authorization.priceHash, /^[a-f0-9]{64}$/)
  assert.equal(canonicalHash(Object.fromEntries(Object.entries(authorization).filter(([key]) => key !== 'authorizationHash'))), authorization.authorizationHash)
  assert.equal(JSON.stringify(authorization).includes('API_KEY'), false)
  const calibration = parseBenchmarkOperatorAuthorization({
    ...base,
    PAPERBANANA_BENCH_OPERATOR_CONFIRM: 'calibrate-judge-disabled-worker',
    PAPERBANANA_BENCH_OPERATOR_MODE: 'calibration',
    PAPERBANANA_BENCH_MAX_GENERATIONS: '0',
    PAPERBANANA_BENCH_MAX_JUDGE_CALLS: '24',
    PAPERBANANA_BENCH_MAX_ESTIMATED_USD: '2.40',
    PAPERBANANA_BENCH_ESTIMATED_PER_GENERATION_USD: '0',
    PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD: '0.10',
  })
  assert.equal(calibration.maxEstimatedUsd, 2.4)
  assert.throws(() => parseBenchmarkOperatorAuthorization({ ...base, PAPERBANANA_BENCH_ENABLED: 'true' }), /BENCHMARK_OPERATOR_REQUIRES_DISABLED_WORKER/)
  assert.throws(() => parseBenchmarkOperatorAuthorization({ ...base, PAPERBANANA_BENCH_MAX_GENERATIONS: '3' }), /BENCHMARK_OPERATOR_AUTHORIZATION_INVALID/)
  assert.throws(() => parseBenchmarkOperatorAuthorization({ ...base, PAPERBANANA_BENCH_MAX_JUDGE_CALLS: '7' }), /BENCHMARK_OPERATOR_AUTHORIZATION_INVALID/)
})

function phaseAuthorizationEnv(phase: 'quick' | 'full' = 'quick') {
  const priceSnapshot = {
    currency: 'USD', source: 'https://example.com/pricing/image-model', capturedAt: '2026-08-25T08:00:00.000Z',
    estimatedPerGeneration: 0.1, estimatedPerJudgeCall: 0.05,
  }
  const codeSha = 'a'.repeat(40)
  const runFacts = {
    runId: 'bench-run-0123456789abcdef0123', modelCandidateId: 'ark:model', provider: 'ark', modelId: 'doubao-seedream-test',
    developer: 'Maker', lane: '2K-standard', aspectRatios: ['16:9', '1:1'], suiteId: 'pb-image-diagnostic-v1', suiteHash: 'b'.repeat(64),
    judgeEpoch: 'judge-2026-08-v1', reviewerEpoch: 'codex-2026-08-v1', registryHash: 'registry-hash', codeSha,
    createdAt: new Date('2026-08-25T06:00:00.000Z'),
  }
  const candidateSnapshot = { schemaVersion: 1, candidateId: 'ark:model', provider: 'ark', modelId: 'doubao-seedream-test', developer: 'Maker', lane: '2K-standard', aspectRatios: ['16:9', '1:1'], registryHash: 'registry-hash', displayName: 'Model', providerLabel: 'Ark' }
  const immutable = benchmarkImmutableRunBinding({ runHash: canonicalHash(runFacts), runFacts, candidateSnapshot, runIntegrityAttestation: 'f'.repeat(64) })
  const approval = {
    entitlementConfirmed: true, priceSnapshot,
    maxGenerations: phase === 'quick' ? 24 : 144, maxJudgments: phase === 'quick' ? 48 : 288,
    maxJudgeCalls: phase === 'quick' ? 192 : 1152,
    maxEstimatedUsd: phase === 'quick' ? 12 : 72, approvedBy: 'immutable-admin-id', approvedAt: new Date('2026-08-25T07:00:00.000Z'),
  }
  return {
    PAPERBANANA_BENCH_ENABLED: 'false',
    PAPERBANANA_BENCH_CONCURRENCY: '1',
    PAPERBANANA_CODE_SHA: codeSha,
    PAPERBANANA_BENCH_PHASE_OPERATOR_PHASE: phase,
    PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_ID: 'bench-run-0123456789abcdef0123',
    PAPERBANANA_BENCH_PHASE_OPERATOR_PROVIDER: 'ark',
    PAPERBANANA_BENCH_PHASE_OPERATOR_MODEL_ID: 'doubao-seedream-test',
    PAPERBANANA_BENCH_PHASE_OPERATOR_LANE: '2K-standard',
    PAPERBANANA_BENCH_PHASE_OPERATOR_SUITE_ID: 'pb-image-diagnostic-v1',
    PAPERBANANA_BENCH_PHASE_OPERATOR_SUITE_HASH: 'b'.repeat(64),
    PAPERBANANA_BENCH_PHASE_OPERATOR_JUDGE_EPOCH: 'judge-2026-08-v1',
    PAPERBANANA_BENCH_PHASE_OPERATOR_JUDGE_STACK_HASH: 'c'.repeat(64),
    PAPERBANANA_BENCH_PHASE_OPERATOR_SIGNED_AUTHORIZATION_HASH: canonicalHash({ phase, approval, codeSha }),
    PAPERBANANA_BENCH_PHASE_OPERATOR_PRICE_HASH: canonicalHash(priceSnapshot),
    PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_HASH: immutable.runHash,
    PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_FACTS_HASH: immutable.runFactsHash,
    PAPERBANANA_BENCH_PHASE_OPERATOR_CANDIDATE_SNAPSHOT_HASH: immutable.candidateSnapshotHash,
    PAPERBANANA_BENCH_PHASE_OPERATOR_ASPECT_RATIOS_HASH: immutable.aspectRatiosHash,
    PAPERBANANA_BENCH_PHASE_OPERATOR_REGISTRY_HASH: immutable.registryHash,
    PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_INTEGRITY_ATTESTATION: immutable.runIntegrityAttestation,
    PAPERBANANA_BENCH_PHASE_OPERATOR_IMMUTABLE_FACTS_HASH: immutable.immutableFactsHash,
    PAPERBANANA_BENCH_MAX_GENERATIONS: phase === 'quick' ? '24' : '144',
    PAPERBANANA_BENCH_MAX_JUDGMENTS: phase === 'quick' ? '48' : '288',
    PAPERBANANA_BENCH_MAX_JUDGE_CALLS: phase === 'quick' ? '192' : '1152',
    PAPERBANANA_BENCH_MAX_ESTIMATED_USD: phase === 'quick' ? '12' : '72',
    PAPERBANANA_BENCH_ESTIMATED_PER_GENERATION_USD: '0.1',
    PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD: '0.05',
    PAPERBANANA_BENCH_PRICE_CURRENCY: 'USD',
    PAPERBANANA_BENCH_PRICE_SOURCE: priceSnapshot.source,
    PAPERBANANA_BENCH_PRICE_CAPTURED_AT: '2026-08-25T08:00:00.000Z',
    PAPERBANANA_BENCH_PHASE_OPERATOR_CONFIRM: phase === 'quick'
      ? 'run-exact-approved-quick-phase-disabled-worker'
      : 'run-exact-approved-full-phase-disabled-worker',
  }
}

test('phase operator authorization canonically binds exact run identity, signed approval, price and bounded calls', () => {
  for (const phase of ['quick', 'full'] as const) {
    const authorization = parseBenchmarkPhaseAuthorization(phaseAuthorizationEnv(phase))
    assert.equal(authorization.phase, phase)
    assert.equal(authorization.expectedState, `${phase}_running`)
    assert.equal(authorization.runId, 'bench-run-0123456789abcdef0123')
    assert.match(authorization.signedAuthorizationHash, /^[a-f0-9]{64}$/)
    assert.equal(authorization.priceHash, canonicalHash(authorization.priceSnapshot))
    assert.match(authorization.immutableFactsHash, /^[a-f0-9]{64}$/)
    assert.equal(authorization.maxJudgeCalls, phase === 'quick' ? 192 : 1152)
    assert.match(authorization.authorizationHash, /^[a-f0-9]{64}$/)
    assert.equal(canonicalHash(Object.fromEntries(Object.entries(authorization).filter(([key]) => key !== 'authorizationHash'))), authorization.authorizationHash)
    assert.equal(JSON.stringify(authorization).includes('SECRET'), false)
  }
})

test('phase operator authorization rejects every widened, malformed or mismatched boundary', () => {
  const base = phaseAuthorizationEnv('quick')
  const invalid: Array<[string, Record<string, string>]> = [
    ['enabled', { PAPERBANANA_BENCH_ENABLED: 'true' }],
    ['concurrency', { PAPERBANANA_BENCH_CONCURRENCY: '2' }],
    ['sha', { PAPERBANANA_CODE_SHA: 'short' }],
    ['run', { PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_ID: '../other' }],
    ['phase', { PAPERBANANA_BENCH_PHASE_OPERATOR_PHASE: 'full' }],
    ['provider', { PAPERBANANA_BENCH_PHASE_OPERATOR_PROVIDER: 'gemini' }],
    ['model', { PAPERBANANA_BENCH_PHASE_OPERATOR_MODEL_ID: 'x' }],
    ['lane', { PAPERBANANA_BENCH_PHASE_OPERATOR_LANE: '8K' }],
    ['suite hash', { PAPERBANANA_BENCH_PHASE_OPERATOR_SUITE_HASH: 'b'.repeat(63) }],
    ['judge stack', { PAPERBANANA_BENCH_PHASE_OPERATOR_JUDGE_STACK_HASH: 'c'.repeat(63) }],
    ['signed authorization', { PAPERBANANA_BENCH_PHASE_OPERATOR_SIGNED_AUTHORIZATION_HASH: 'd'.repeat(63) }],
    ['price hash', { PAPERBANANA_BENCH_PHASE_OPERATOR_PRICE_HASH: 'e'.repeat(63) }],
    ['immutable facts', { PAPERBANANA_BENCH_PHASE_OPERATOR_IMMUTABLE_FACTS_HASH: 'e'.repeat(63) }],
    ['generation cap', { PAPERBANANA_BENCH_MAX_GENERATIONS: '25' }],
    ['logical judgment cap', { PAPERBANANA_BENCH_MAX_JUDGMENTS: '49' }],
    ['judge dispatch cap', { PAPERBANANA_BENCH_MAX_JUDGE_CALLS: '193' }],
    ['cost formula', { PAPERBANANA_BENCH_MAX_ESTIMATED_USD: '1' }],
    ['currency', { PAPERBANANA_BENCH_PRICE_CURRENCY: 'CNY' }],
    ['price source', { PAPERBANANA_BENCH_PRICE_SOURCE: 'http://example.com/pricing' }],
    ['captured at', { PAPERBANANA_BENCH_PRICE_CAPTURED_AT: 'yesterday' }],
    ['confirm', { PAPERBANANA_BENCH_PHASE_OPERATOR_CONFIRM: 'yes' }],
  ]
  for (const [name, replacement] of invalid) {
    assert.throws(() => parseBenchmarkPhaseAuthorization({ ...base, ...replacement }), /BENCHMARK_PHASE_OPERATOR_AUTHORIZATION_INVALID|BENCHMARK_PHASE_OPERATOR_REQUIRES_DISABLED_WORKER/, name)
  }
  assert.throws(() => parseBenchmarkPhaseAuthorization({
    ...phaseAuthorizationEnv('full'), PAPERBANANA_BENCH_MAX_GENERATIONS: '145',
  }), /BENCHMARK_PHASE_OPERATOR_AUTHORIZATION_INVALID/)
})

test('worker repository exact-run lease cannot acquire another running run', async () => {
  let query: any
  const target = { _id: 'bench-run-target', state: 'quick_running' }
  const runs = {
    async findOneAndUpdate(nextQuery: any) { query = nextQuery; return target },
  }
  const db = { collection(name: string) { return name === 'paperbanana_benchmark_runs' ? runs : { createIndex: async () => undefined } } }
  const repository = createWorkerMongoRepository(db as any, () => new Date('2026-08-25T08:00:00.000Z'))
  assert.equal((await repository.acquireRunById('bench-run-target', 'quick_running', 'phase-worker', 60_000))?._id, 'bench-run-target')
  assert.equal(query._id, 'bench-run-target')
  assert.equal(query.state, 'quick_running')
  assert.deepEqual(query.$or, [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: new Date('2026-08-25T08:00:00.000Z') } }])
})

test('phase operator compares every run identity, signed approval, price and cap before execution', () => {
  const authorization = parseBenchmarkPhaseAuthorization(phaseAuthorizationEnv('quick'))
  const approval = {
    entitlementConfirmed: true,
    priceSnapshot: authorization.priceSnapshot,
    maxGenerations: authorization.maxGenerations,
    maxJudgments: authorization.maxJudgments,
    maxJudgeCalls: authorization.maxJudgeCalls,
    maxEstimatedUsd: authorization.maxEstimatedUsd,
    approvedBy: 'immutable-admin-id',
    approvedAt: new Date('2026-08-25T07:00:00.000Z'),
  }
  const run: any = {
    _id: authorization.runId, state: authorization.expectedState, codeSha: authorization.codeSha,
    provider: authorization.provider, modelId: authorization.modelId, lane: authorization.lane,
    suiteId: authorization.suiteId, suiteHash: authorization.suiteHash,
    judgeEpoch: authorization.judgeEpoch, judgeStackHash: authorization.judgeStackHash,
    authorizationHash: authorization.signedAuthorizationHash, priceHash: authorization.priceHash,
    runHash: authorization.runHash,
    runFacts: { runId: authorization.runId, modelCandidateId: 'ark:model', provider: authorization.provider, modelId: authorization.modelId, developer: 'Maker', lane: authorization.lane, aspectRatios: ['16:9', '1:1'], suiteId: authorization.suiteId, suiteHash: authorization.suiteHash, judgeEpoch: authorization.judgeEpoch, reviewerEpoch: 'codex-2026-08-v1', registryHash: authorization.registryHash, codeSha: authorization.codeSha, createdAt: new Date('2026-08-25T06:00:00.000Z') },
    candidateSnapshot: { schemaVersion: 1, candidateId: 'ark:model', provider: authorization.provider, modelId: authorization.modelId, developer: 'Maker', lane: authorization.lane, aspectRatios: ['16:9', '1:1'], registryHash: authorization.registryHash, displayName: 'Model', providerLabel: 'Ark' },
    aspectRatios: ['16:9', '1:1'], registryHash: authorization.registryHash,
    runIntegrityAttestation: authorization.runIntegrityAttestation,
    approval, approvalVersions: [{ schemaVersion: 1, phase: 'quick', authorizationHash: authorization.signedAuthorizationHash, priceHash: authorization.priceHash, approval }],
  }
  assert.doesNotThrow(() => assertRunMatchesPhaseAuthorization(run, authorization, authorization.codeSha))
  const mismatches: Array<[string, string, unknown]> = [
    ['run', '_id', 'bench-run-ffffffffffffffffffff'], ['phase', 'state', 'full_running'],
    ['code', 'codeSha', 'f'.repeat(40)], ['provider', 'provider', 'bailian'], ['model', 'modelId', 'other-model'],
    ['lane', 'lane', '4K-standard'], ['suite', 'suiteId', 'other-suite'], ['suite hash', 'suiteHash', 'f'.repeat(64)],
    ['judge epoch', 'judgeEpoch', 'other-epoch'], ['judge stack', 'judgeStackHash', 'f'.repeat(64)],
    ['authorization hash', 'authorizationHash', 'f'.repeat(64)], ['price hash', 'priceHash', 'f'.repeat(64)],
  ]
  for (const [name, field, value] of mismatches) {
    assert.throws(() => assertRunMatchesPhaseAuthorization({ ...run, [field]: value }, authorization, authorization.codeSha), /BENCHMARK_PHASE_OPERATOR_RUN_MISMATCH/, name)
  }
  for (const [name, mutate] of [
    ['run hash', (value: any) => ({ ...value, runHash: 'e'.repeat(64) })],
    ['run facts aspect ratios', (value: any) => ({ ...value, runFacts: { ...value.runFacts, aspectRatios: ['16:9'] } })],
    ['top-level aspect ratios', (value: any) => ({ ...value, aspectRatios: ['16:9'] })],
    ['run facts registry', (value: any) => ({ ...value, runFacts: { ...value.runFacts, registryHash: 'other-registry' } })],
    ['top-level registry', (value: any) => ({ ...value, registryHash: 'other-registry' })],
    ['candidate snapshot', (value: any) => ({ ...value, candidateSnapshot: { ...value.candidateSnapshot, displayName: 'Mutated' } })],
    ['integrity attestation', (value: any) => ({ ...value, runIntegrityAttestation: 'e'.repeat(64) })],
  ] as const) assert.throws(() => assertRunMatchesPhaseAuthorization(mutate(run), authorization, authorization.codeSha), /BENCHMARK_PHASE_OPERATOR_RUN_MISMATCH/, name)
  for (const [name, field, value] of [
    ['generation cap', 'maxGenerations', 23], ['logical judgment cap', 'maxJudgments', 47], ['judge call cap', 'maxJudgeCalls', 191], ['usd cap', 'maxEstimatedUsd', 11.9],
  ] as const) {
    const changedApproval = { ...approval, [field]: value }
    assert.throws(() => assertRunMatchesPhaseAuthorization({
      ...run, approval: changedApproval,
      approvalVersions: [{ ...run.approvalVersions[0], approval: changedApproval }],
    }, authorization, authorization.codeSha), /BENCHMARK_PHASE_OPERATOR_RUN_MISMATCH/, name)
  }
  assert.throws(() => assertRunMatchesPhaseAuthorization(run, authorization, 'f'.repeat(40)), /BENCHMARK_PHASE_OPERATOR_RUN_MISMATCH/)
})

test('phase operator report is an explicit secret-free allowlist', () => {
  const report = buildBenchmarkPhaseOperatorReport({
    runId: 'bench-run-0123456789abcdef0123', phase: 'quick', authorizationHash: 'a'.repeat(64),
    state: 'quick_review', usage: { generations: 24, judgments: 48, estimatedUsd: 4.8 },
    sampleCount: 24, judgmentCount: 48, auditCount: 3,
    apiKey: 'sk-never-report-this', mongodbUri: 'mongodb://user:secret@mongo/db', arbitrary: { secret: 'never' },
  } as any)
  assert.deepEqual(Object.keys(report).sort(), ['auditCount', 'authorizationHash', 'judgmentCount', 'phase', 'runId', 'sampleCount', 'state', 'usage'].sort())
  assert.equal(JSON.stringify(report).includes('never-report'), false)
  assert.equal(JSON.stringify(report).includes('mongodb://'), false)
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
  assert.throws(() => approveCandidate({
    candidateId: 'c1', entitlementConfirmed: true,
    priceSnapshot: { currency: 'USD', estimatedPerGeneration: 0.04, capturedAt: '2026-08-25T00:00:00Z' },
    maxGenerations: 24, maxJudgeCalls: 192, maxEstimatedUsd: 12, approvedBy: 'immutable-admin-id',
  } as never), /BENCHMARK_APPROVAL_INCOMPLETE/)
  const approved = approveCandidate({
    candidateId: 'c1',
    entitlementConfirmed: true,
    priceSnapshot: { currency: 'USD', estimatedPerGeneration: 0.04, capturedAt: '2026-08-25T00:00:00Z' },
    maxGenerations: 24,
    maxJudgments: 48,
    maxJudgeCalls: 192,
    maxEstimatedUsd: 12,
    approvedBy: 'immutable-admin-id',
  })
  assert.equal(approved.state, 'approved')
  assert.equal(approved.maxGenerations, 24)
  assert.equal(approved.maxJudgments, 48)
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

test('budget accepts decimal reservations exactly at the approved cap', () => {
  const budget = new BenchmarkBudget({ maxGenerations: 0, maxJudgeCalls: 24, maxEstimatedUsd: 2.4 })
  for (let index = 0; index < 24; index += 1) {
    budget.reserve({ kind: 'judgment', estimatedUsd: 0.1 })
  }
  assert.equal(budget.snapshot().judgments, 24)
  assert.equal(budget.snapshot().estimatedUsd, 2.4)
})

test('full budget accounting is phase-pure and never consumes quick usage', async () => {
  const run: any = {
    _id: 'run-phase-budget', state: 'full_running', leaseOwner: 'worker-1', leaseToken: 'lease-1', leaseUntil: new Date('2026-08-25T09:00:00.000Z'),
    approval: { maxGenerations: 144, maxJudgments: 288, maxJudgeCalls: 1152, maxEstimatedUsd: 500 },
    usage: { generations: 144, judgments: 288, estimatedUsd: 200 },
    usageByPhase: {
      quick: { generations: 24, judgments: 48, estimatedUsd: 28.8 },
      full: { generations: 0, judgments: 0, estimatedUsd: 0 },
    },
  }
  let update: any
  const runs = {
    async findOne() { return run },
    async updateOne(_query: any, next: any) { update = next; return { modifiedCount: 1 } },
  }
  const db = { collection(name: string) { return name === 'paperbanana_benchmark_runs' ? runs : {} } }
  const repository = createWorkerMongoRepository(db as any, () => new Date('2026-08-25T08:00:00.000Z'))
  await repository.reserveBudget(run._id, 'worker-1', 'lease-1', 'full_running', 'generation', 1)
  assert.deepEqual(update.$set['usageByPhase.full'], { generations: 1, judgments: 0, judgeCalls: 0, estimatedUsd: 1 })
  assert.equal(update.$set.state, undefined)
})

test('repository budget accounting accepts repeated decimal costs at the exact phase cap', async () => {
  const run: any = {
    _id: 'run-decimal-budget', state: 'quick_running', leaseOwner: 'worker-1', leaseToken: 'lease-1', leaseUntil: new Date('2026-08-25T09:00:00.000Z'),
    approval: { maxGenerations: 3, maxJudgments: 0, maxJudgeCalls: 0, maxEstimatedUsd: 0.3 },
    usageByPhase: { quick: { generations: 0, judgments: 0, judgeCalls: 0, estimatedUsd: 0 } },
  }
  const runs = {
    async findOne() { return run },
    async updateOne(_query: any, next: any) {
      if (next.$set?.['usageByPhase.quick']) run.usageByPhase.quick = next.$set['usageByPhase.quick']
      return { modifiedCount: 1 }
    },
  }
  const db = { collection(name: string) { return name === 'paperbanana_benchmark_runs' ? runs : {} } }
  const repository = createWorkerMongoRepository(db as any, () => new Date('2026-08-25T08:00:00.000Z'))
  for (let index = 0; index < 3; index += 1) {
    await repository.reserveBudget(run._id, 'worker-1', 'lease-1', 'quick_running', 'generation', 0.1)
  }
  assert.equal(run.usageByPhase.quick.estimatedUsd, 0.3)
  assert.equal(run.usageByPhase.quick.generations, 3)
})

test('repository enforces logical judgments independently from dispatch attempts', async () => {
  const run: any = {
    _id: 'run-logical-budget', state: 'quick_running', leaseOwner: 'worker-1', leaseToken: 'lease-1', leaseUntil: new Date('2026-08-25T09:00:00.000Z'),
    approval: { maxGenerations: 24, maxJudgments: 1, maxJudgeCalls: 4, maxEstimatedUsd: 10 },
    usageByPhase: { quick: { generations: 0, judgments: 1, judgeCalls: 1, estimatedUsd: 0.1 } },
  }
  let update: any
  const runs = {
    async findOne() { return run },
    async updateOne(_query: any, next: any) { update = next; return { modifiedCount: 1 } },
  }
  const db = { collection(name: string) { return name === 'paperbanana_benchmark_runs' ? runs : {} } }
  const repository = createWorkerMongoRepository(db as any, () => new Date('2026-08-25T08:00:00.000Z'))
  await assert.rejects(repository.reserveBudget(run._id, 'worker-1', 'lease-1', 'quick_running', 'judgment', 0), /BENCHMARK_BUDGET_PAUSED:JUDGMENTS/)
  assert.equal(update.$set.state, 'paused')
})

test('durable Judge dispatch markers bind phase, logical provider, index and current epoch', async () => {
  const inserted: any[] = []
  let judgmentInsertCalled = false
  const run: any = { _id: 'run-marker', state: 'full_running', leaseToken: 'lease-1', judgeEpoch: 'judge-current' }
  const db = { collection(name: string) {
    if (name === 'paperbanana_benchmark_runs') return { async findOne() { return run } }
    if (name === 'paperbanana_benchmark_dispatches') return { async insertOne(value: any) { inserted.push(value) } }
    if (name === 'paperbanana_benchmark_judgments') return { async insertOne() { judgmentInsertCalled = true } }
    return {}
  } }
  const repository = createWorkerMongoRepository(db as any, () => new Date('2026-08-25T08:00:00.000Z'))
  await repository.beginJudgeDispatch(run, 'worker-1', 'sample-1', 'openrouter', 2)
  assert.deepEqual(inserted[0], {
    _id: 'dispatch:openrouter:sample-1:2', runId: 'run-marker', sampleId: 'sample-1', phase: 'full',
    logicalProvider: 'openrouter', dispatchIndex: 2, judgeEpoch: 'judge-current',
  })
  assert.equal(judgmentInsertCalled, false)
})

test('dispatch marker insert failure is an unknown outcome before any Judge fetch', async () => {
  let fetchCalls = 0
  const run: any = { _id: 'run-marker-failure', state: 'full_running', leaseToken: 'lease-1', judgeEpoch: 'judge-current' }
  const db = { collection(name: string) {
    if (name === 'paperbanana_benchmark_runs') return { async findOne() { return run } }
    if (name === 'paperbanana_benchmark_dispatches') return { async insertOne() { throw new Error('mongo unavailable') } }
    return {}
  } }
  const repository = createWorkerMongoRepository(db as any)
  await assert.rejects(repository.beginJudgeDispatch(run, 'worker-1', 'sample-1', 'openrouter', 0), UnknownProviderOutcomeError)
  await assert.rejects(callBlindJudge({
    provider: 'openrouter', apiKey: 'test-only', imageBase64: 'AA==', rubric: {}, caption: 'test',
    beforeDispatch: async () => repository.beginJudgeDispatch(run, 'worker-1', 'sample-1', 'openrouter', 0),
    fetchImpl: async () => { fetchCalls += 1; return new Response('{}') },
  }), UnknownProviderOutcomeError)
  assert.equal(fetchCalls, 0)
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
