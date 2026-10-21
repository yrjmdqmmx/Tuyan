import '../../../../test-support/loopback-only.mjs'
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { MongoClient } from 'mongodb'
import sharp from 'sharp'
import { createRefineRuntime } from '../../../../test-support/refine-runtime.mjs'
import { createWorkspaceExecutionStore } from '../../../auth-gateway/src/workspace-execution.js'
import { createUniversalRuntime } from '../../src/universal-adapters.ts'
import { createProviderWorkflow } from '../../src/provider-workflow.ts'
import { normalizeUniversalRoute, UniversalApiError } from '../../../../packages/api/src/universal-api.js'

const uri = process.env.CONCURRENCY_TEST_MONGO_URI
if (!uri || new URL(uri).hostname !== '127.0.0.1') throw Error('Dedicated loopback Mongo required')
assert.equal(process.env.PAPERBANANA_CANDIDATE_CONCURRENCY, '1')
assert.throws(() => fetch('https://api.openai.com/v1/models'), /OFFLINE_TEST_EXTERNAL/)
const client = new MongoClient(uri)
const database = 'stage01_concurrency_' + randomBytes(8).toString('hex')
const db = client.db(database), owner = 'isolated-owner', origin = 'http://127.0.0.1:5173'
const secondOrigin = 'http://127.0.0.1:5174'
const limits = { maxActive: 8, maxPending: 32, maxPerOwner: 2, maxPerIp: 40 }
const routes = Object.fromEntries(['main', 'image'].map(role => [role, normalizeUniversalRoute({
  accessProvider: 'custom', modelId: 'fixture-' + role,
  custom: { version: 1, connectionId: role, protocol: role === 'image' ? 'openai-images' : 'openai-chat',
    baseUrl: `https://${role}.example.com/v1`, auth: 'bearer',
    capabilities: { text: role === 'main', vision: false, imageGeneration: role === 'image', imageEditing: false },
    inputLimits: { maxCount: 2, maxBytes: 5000000, maxTotalBytes: 10000000, maxDimension: 4096, maxPixels: 16000000, requestMaxBytes: 32000000, mimeTypes: ['image/png'] },
    outputLimits: { maxBytes: 10000000, maxDimension: 4096, maxPixels: 16000000, mimeTypes: ['image/png'] },
    outputSizes: role === 'image' ? [{ resolution: '1K', aspectRatio: '1:1', value: '1024x1024' }] : [],
  },
})]))
const library = { revision: 1,
  connections: Object.entries(routes).map(([role, route]) => ({ id: role, provider: 'custom', scope: 'account', custom: route.custom })),
  models: Object.entries(routes).map(([role, route]) => ({ id: role, connectionId: role, modelId: route.modelId, custom: route.custom })),
}
const models = Object.fromEntries(Object.entries(routes).map(([role, route]) =>
  [role, { libraryModelId: role, connectionId: role, accessProvider: 'custom', modelId: route.modelId }]))
const store = createWorkspaceExecutionStore({ db })
const workspaceStore = { get: async user => await db.collection('workspaceDocuments').findOne({ userId: user }) || {} }
const libraryStore = { get: async () => library, resolve: async () => 'offline-fixture-key' }
const receipt = { version: 1, startedAt: new Date().toISOString(), infrastructure: 'isolated loopback MongoDB replica set + actual Gateway/Core handlers + in-memory object store',
  realModelCalls: 0, limits, candidateConcurrency: 1, passed: [], calls: [], overlap: null, results: [] }
const mark = name => receipt.passed.push(name)
const deadline = async (promise, label, timeoutMs = 30000) => {
  let timer
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Timeout: ' + label)), timeoutMs) })]) }
  finally { clearTimeout(timer) }
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
let runtime
const gates = new Map(), entered = new Map(), active = new Map(), peak = new Map(), counts = new Map()
let globalActive = 0, globalPeak = 0
const unknown = new Set(), rejected = new Set()
const outputs = new Map()
async function imageFor(marker) {
  if (!outputs.has(marker)) {
    const color = '#' + createHash('sha256').update(marker).digest('hex').slice(0, 6)
    outputs.set(marker, await sharp({ create: { width: 1024, height: 1024, channels: 4, background: color } }).png().toBuffer())
  }
  return outputs.get(marker)
}
async function transport(request) {
  assert.ok(['https://main.example.com/v1/chat/completions', 'https://image.example.com/v1/images/generations'].includes(request.url))
  const marker = String(request.body).match(/CASE_[A-Z]+/)?.[0]
  assert.ok(marker, 'task-specific prompt survives the real planning/rendering pipeline')
  const image = request.url.includes('/images/')
  const call = { marker, kind: image ? 'image' : 'text', startedAt: Date.now(), endedAt: null, outcome: 'pending' }
  receipt.calls.push(call)
  if (!image) {
    call.endedAt = Date.now(); call.outcome = 'ok'
    return { status: 200, headers: new Headers(), bytes: Buffer.from(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: `Complete scientific workflow ${marker}: input, analysis, planning, output. Preserve labels and values.` } }] })) }
  }
  counts.set(marker, (counts.get(marker) || 0) + 1)
  active.set(marker, (active.get(marker) || 0) + 1)
  peak.set(marker, Math.max(peak.get(marker) || 0, active.get(marker)))
  globalActive++; globalPeak = Math.max(globalPeak, globalActive)
  entered.get(marker)?.resolve()
  try {
    if (counts.get(marker) === 1 && gates.has(marker)) await deadline(gates.get(marker).promise, marker + ' release', 60000)
    if (unknown.has(marker)) { call.outcome = 'unknown'; throw new UniversalApiError('RESULT_UNKNOWN', 'unknown', 504) }
    if (rejected.has(marker)) { call.outcome = 'rejected'; throw new UniversalApiError('UPSTREAM_REJECTED', 'rejected', 402) }
    const output = await imageFor(marker)
    call.outcome = 'ok'
    return { status: 200, headers: new Headers(), bytes: Buffer.from(JSON.stringify({ data: [{ b64_json: output.toString('base64') }] })) }
  } finally { call.endedAt = Date.now(); active.set(marker, active.get(marker) - 1); globalActive-- }
}
async function request(marker, extras = {}, user = owner, secondary = marker === 'CASE_BETA') {
  const taskId = 'task-' + marker, runId = 'run-' + marker
  if (extras.action === 'getJob') return runtime.post({ ...extras, workspaceExecution: { version: 1, taskId, runId } }, user,
    { origin: secondary ? secondOrigin : origin, 'x-workspace-account': user }, secondary ? runtime.secondaryBaseUrl : runtime.baseUrl)
  return runtime.post({
    action: 'createJob', provider: 'custom', configurationMode: 'advanced', modelRoutes: routes,
    methodContent: `研究流程 ${marker} 包括输入、分析、规划和输出四个阶段，准确保留全部科学信息。`,
    caption: `独立任务 ${marker}`, outputFormat: 'png', pipelineMode: 'planner_critic',
    retrievalSetting: 'none', visionMode: 'none', imageSize: '1K', aspectRatio: '1:1', numCandidates: 2, maxCriticRounds: 0,
    workspaceExecution: { version: 1, taskId, runId, libraryRevision: 1, models }, ...extras,
  }, user, { origin: secondary ? secondOrigin : origin, 'x-workspace-account': user }, secondary ? runtime.secondaryBaseUrl : runtime.baseUrl)
}
async function seed(marker, user = owner) {
  const task = { id: 'task-' + marker, activeRunId: 'run-' + marker, runs: [{ id: 'run-' + marker, status: 'submitting' }] }
  await db.collection('workspaceDocuments').updateOne({ userId: user }, { $push: { 'state.tasks': task } }, { upsert: true })
}
async function read(marker, jobId, user = owner) {
  return request(marker, { action: 'getJob', jobId }, user)
}
async function waitTerminal(marker, jobId, user = owner) {
  return deadline((async () => {
    for (;;) {
      const response = await read(marker, jobId, user)
      if (['succeeded', 'failed'].includes(response.data.job?.status)) return response.data.job
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  })(), marker + ' terminal')
}
const assertAccepted = response => { assert.equal(response.status, 200, JSON.stringify(response)); assert.equal(response.data.code, 0, JSON.stringify(response)); assert.ok(response.data.jobId) }

try {
  await client.connect()
  runtime = await createRefineRuntime({ database: db, tokenDance: true, authStores: { workspaceExecutionStore: store, workspaceStore, modelLibraryStore: libraryStore }, secondFrontendOrigin: secondOrigin, secondaryAuthStores: { workspaceExecutionStore: createWorkspaceExecutionStore({ db }) } })
  runtime.legacy.configureJobAdmission(limits)
  runtime.legacy.configureUniversalRuntime(createUniversalRuntime({ transport: { checkUrl: async () => {}, request: transport } }))
  await runtime.workflow.ensureIndexes()
  // Real database sentinel: validation must never alter an unrelated account, task or file.
  const sentinel = { _id: 'unrelated-existing-job', userId: 'unrelated-owner', status: 'succeeded', resultImages: [{ objectKey: 'existing.png' }] }
  await db.collection('paperbanana_jobs').insertOne(sentinel)
  runtime.objects.set('existing.png', { bytes: Buffer.from('existing-file'), mimeType: 'image/png' })
  for (const marker of ['CASE_ALPHA', 'CASE_BETA']) { await seed(marker); gates.set(marker, deferred()); entered.set(marker, deferred()) }
  const [a, b] = await Promise.all([request('CASE_ALPHA'), request('CASE_BETA')])
  assertAccepted(a); assertAccepted(b); assert.notEqual(a.data.jobId, b.data.jobId)
  await deadline(Promise.all([...entered.values()].map(value => value.promise)), 'two image calls active')
  const live = runtime.legacy.getJobAdmissionState()
  assert.equal(live.active, 2); assert.equal(globalActive, 2)
  assert.deepEqual([active.get('CASE_ALPHA'), active.get('CASE_BETA')], [1, 1])
  assert.equal(await db.collection('paperbanana_jobs').countDocuments({ userId: owner, status: 'running' }), 2)
  assert.equal(await db.collection('paperbanana_provider_executions').countDocuments({ userId: owner, state: 'running' }), 2)
  mark('two independent tasks under the same account through two Gateway instances actually overlap in Core and provider fixtures')

  await seed('CASE_THIRD'); gates.set('CASE_THIRD', deferred()); entered.set('CASE_THIRD', deferred())
  const third = await request('CASE_THIRD')
  assertAccepted(third)
  assert.equal(runtime.legacy.getJobAdmissionState().queued, 1)
  assert.equal(counts.get('CASE_THIRD'), undefined)
  mark('third same-account task queues before any provider call even while global slots remain free')
  const peers = ['CASE_GAMMA', 'CASE_DELTA', 'CASE_EPSILON', 'CASE_ZETA', 'CASE_ETA', 'CASE_THETA'].map((marker, index) => ({ marker, user: 'parallel-owner-' + Math.floor(index / 2) }))
  for (const { marker, user } of peers) { await seed(marker, user); gates.set(marker, deferred()); entered.set(marker, deferred()) }
  const peerJobs = await Promise.all(peers.map(({ marker, user }) => request(marker, {}, user, true)))
  peerJobs.forEach(assertAccepted)
  await deadline(Promise.all(peers.map(({ marker }) => entered.get(marker).promise)), 'eight independent tasks active')
  assert.equal(runtime.legacy.getJobAdmissionState().active, 8)
  assert.equal(runtime.legacy.getJobAdmissionState().queued, 1)
  assert.equal(globalActive, 8)
  for (const user of new Set([owner, ...peers.map(row => row.user)])) assert.equal(await db.collection('paperbanana_jobs').countDocuments({ userId: user, status: 'running' }), 2)
  mark('four accounts sharing one NAT run eight independent tasks; the ninth waits without blocking other accounts')
  const beforeReplay = receipt.calls.length
  const duplicates = await Promise.all([request('CASE_ALPHA'), request('CASE_ALPHA', {}, owner, true)])
  for (const response of duplicates) assert.equal(response.data.jobId, a.data.jobId)
  assert.equal(receipt.calls.length, beforeReplay)
  // The client cannot substitute B's job ID into A's workspace run.
  const substituted = await read('CASE_ALPHA', b.data.jobId)
  assert.ok(substituted.data.job, JSON.stringify(substituted))
  assert.equal(substituted.data.job.id, a.data.jobId)
  await seed('CASE_ALPHA', 'foreign-owner')
  const foreign = await read('CASE_ALPHA', a.data.jobId, 'foreign-owner')
  assert.equal(foreign.status, 409)
  const directForeign = await runtime.post({ action: 'getJob', jobId: a.data.jobId }, 'foreign-owner')
  assert.notEqual(directForeign.data.code, 0)
  mark('duplicate submissions and cross-task/cross-account result substitution cannot dispatch or read another result')

  gates.get('CASE_BETA').resolve()
  const doneB = await waitTerminal('CASE_BETA', b.data.jobId)
  assert.equal(doneB.status, 'succeeded')
  assert.equal((await read('CASE_ALPHA', a.data.jobId)).data.job.status, 'running')
  await deadline(entered.get('CASE_THIRD').promise, 'queued account task starts after prior completion')
  assert.equal(runtime.legacy.getJobAdmissionState().active, 8)
  gates.get('CASE_THIRD').resolve()
  for (const { marker } of peers) gates.get(marker).resolve()
  for (const { marker, user, response } of [{ marker: 'CASE_THIRD', user: owner, response: third }, ...peers.map((row, index) => ({ ...row, response: peerJobs[index] }))]) {
    const job = await waitTerminal(marker, response.data.jobId, user)
    assert.equal(job.status, 'succeeded'); assert.equal(counts.get(marker), 2); assert.equal(peak.get(marker), 1)
    const expected = await imageFor(marker)
    for (const image of job.resultImages) { assert.deepEqual(runtime.objects.get(image.objectKey)?.bytes, expected); assert.ok(image.objectKey.includes(response.data.jobId)) }
    assert.equal((await db.collection('paperbanana_jobs').findOne({ _id: response.data.jobId })).userId, user)
    const execution = await store.get(user, 'run-' + marker)
    assert.equal(execution.jobId, response.data.jobId); assert.equal(execution.taskId, 'task-' + marker)
    const calls = receipt.calls.filter(call => call.marker === marker).length
    assert.equal((await request(marker, {}, user, true)).data.jobId, response.data.jobId)
    assert.equal(receipt.calls.filter(call => call.marker === marker).length, calls)
    receipt.results.push({ marker, taskId: execution.taskId, runId: execution.runId, jobId: response.data.jobId, images: job.resultImages.length, sha256: createHash('sha256').update(expected).digest('hex') })
  }
  mark('queued and parallel results stay with their account/run and completed replay creates no provider calls')
  gates.get('CASE_ALPHA').resolve()
  await runtime.legacy.drainJobAdmission()
  const doneA = (await read('CASE_ALPHA', a.data.jobId)).data.job
  assert.equal(doneA.status, 'succeeded', JSON.stringify(doneA))
  for (const [marker, job, jobId] of [['CASE_ALPHA', doneA, a.data.jobId], ['CASE_BETA', doneB, b.data.jobId]]) {
    assert.equal(counts.get(marker), 2); assert.equal(peak.get(marker), 1)
    assert.equal(job.resultImages.length, 2)
    const expected = await imageFor(marker)
    for (const image of job.resultImages) {
      assert.deepEqual(runtime.objects.get(image.objectKey)?.bytes, expected)
      assert.ok(image.objectKey.includes(jobId))
    }
    const execution = await store.get(owner, 'run-' + marker)
    assert.equal(execution.jobId, jobId); assert.equal(execution.taskId, 'task-' + marker)
    const steps = await db.collection('paperbanana_provider_steps').find({ jobId }).toArray()
    assert.ok(steps.length > 0); assert.ok(steps.every(step => step.userId === owner && step.state === 'complete'))
    receipt.results.push({ marker, taskId: execution.taskId, runId: execution.runId, jobId, images: job.resultImages.length, sha256: createHash('sha256').update(expected).digest('hex') })
  }
  const firstA = receipt.calls.find(call => call.marker === 'CASE_ALPHA' && call.kind === 'image')
  const firstB = receipt.calls.find(call => call.marker === 'CASE_BETA' && call.kind === 'image')
  receipt.overlap = { globalPeak, perTaskPeak: Object.fromEntries(peak), milliseconds: Math.min(firstA.endedAt, firstB.endedAt) - Math.max(firstA.startedAt, firstB.startedAt) }
  assert.ok(receipt.overlap.milliseconds > 0)
  mark('candidate concurrency stays 1 while two jobs run; completion order does not mix image bytes or run ownership')

  for (const [marker, user] of [['CASE_NATONE', owner], ['CASE_NATTWO', 'nat-other-owner']]) {
    await seed(marker, user); gates.set(marker, deferred()); entered.set(marker, deferred())
  }
  const nat = await Promise.all([request('CASE_NATONE'), request('CASE_NATTWO', {}, 'nat-other-owner', true)])
  nat.forEach(assertAccepted)
  await deadline(Promise.all(['CASE_NATONE', 'CASE_NATTWO'].map(marker => entered.get(marker).promise)), 'two accounts sharing NAT')
  assert.equal(runtime.legacy.getJobAdmissionState().active, 2)
  gates.get('CASE_NATONE').resolve(); gates.get('CASE_NATTWO').resolve()
  await runtime.legacy.drainJobAdmission()
  for (const [index, user, marker] of [[0, owner, 'CASE_NATONE'], [1, 'nat-other-owner', 'CASE_NATTWO']]) {
    const job = (await read(marker, nat[index].data.jobId, user)).data.job
    assert.equal(job.status, 'succeeded')
    for (const image of job.resultImages) assert.deepEqual(runtime.objects.get(image.objectKey).bytes, await imageFor(marker))
    assert.equal((await db.collection('paperbanana_jobs').findOne({ _id: nat[index].data.jobId })).userId, user)
  }
  mark('two different accounts on one NAT execute concurrently through separate gateways without crossing results')

  // An uncertain result in one task must stop only that task, never another task.
  for (const marker of ['CASE_UNKNOWN', 'CASE_HEALTHY']) await seed(marker)
  unknown.add('CASE_UNKNOWN')
  const [uncertain, healthy] = await Promise.all([request('CASE_UNKNOWN'), request('CASE_HEALTHY')])
  assertAccepted(uncertain); assertAccepted(healthy)
  await runtime.legacy.drainJobAdmission()
  const failed = (await read('CASE_UNKNOWN', uncertain.data.jobId)).data.job
  assert.equal(failed.status, 'failed'); assert.equal(failed.recovery.canResume, false); assert.equal(failed.recovery.billingStatus, 'unknown')
  assert.equal(counts.get('CASE_UNKNOWN'), 1, 'next candidate is stopped after uncertain paid outcome')
  assert.equal((await read('CASE_HEALTHY', healthy.data.jobId)).data.job.status, 'succeeded')
  await request('CASE_UNKNOWN')
  await request('CASE_UNKNOWN', { action: 'providerResume', jobId: uncertain.data.jobId })
  const restarted = createProviderWorkflow({ db, service: runtime.tokenDanceService })
  await restarted.reconcile(uncertain.data.jobId)
  await assert.rejects(restarted.resume(uncertain.data.jobId, owner, () => assert.fail('unknown result must not be replayed')))
  assert.equal(counts.get('CASE_UNKNOWN'), 1)
  mark('uncertain outcome blocks repeat/candidate/fresh-instance resume without affecting another task')

  // Explicit rejection can be resumed, but completed planning checkpoints must be reused.
  await seed('CASE_REJECTED'); rejected.add('CASE_REJECTED')
  const retryable = await request('CASE_REJECTED'); assertAccepted(retryable)
  await runtime.legacy.drainJobAdmission()
  const stopped = (await read('CASE_REJECTED', retryable.data.jobId)).data.job
  assert.equal(stopped.recovery.canResume, true)
  const plans = receipt.calls.filter(call => call.marker === 'CASE_REJECTED' && call.kind === 'text').length
  assert.ok(plans > 0)
  rejected.delete('CASE_REJECTED')
  runtime.legacy.configureProviderWorkflow(restarted)
  const attempts = await Promise.allSettled([1, 2].map(() => restarted.resume(retryable.data.jobId, owner, runtime.legacy.resumeTokenDanceJob)))
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1)
  await runtime.legacy.drainJobAdmission()
  assert.equal((await read('CASE_REJECTED', retryable.data.jobId)).data.job.status, 'succeeded')
  // Candidate two has its own new plan; candidate one's plan remains a cache hit.
  assert.equal(receipt.calls.filter(call => call.marker === 'CASE_REJECTED' && call.kind === 'text').length, plans + 1)
  assert.equal(counts.get('CASE_REJECTED'), 3)
  mark('concurrent recovery is claimed once and completed first-candidate planning is not repeated')

  // Failure to persist a model result after it succeeded cannot make it safe to replay.
  await seed('CASE_JOURNAL')
  const wrappedDb = { collection(name) {
    const collection = db.collection(name)
    if (name !== 'paperbanana_provider_step_chunks') return collection
    return new Proxy(collection, { get(target, property) {
      if (property === 'insertMany') return async documents => {
        if (receipt.calls.some(call => call.marker === 'CASE_JOURNAL')) throw Error('injected durable result write failure')
        return target.insertMany(documents)
      }
      const value = target[property]; return typeof value === 'function' ? value.bind(target) : value
    } })
  } }
  const broken = createProviderWorkflow({ db: wrappedDb, service: runtime.tokenDanceService })
  runtime.legacy.configureProviderWorkflow(broken)
  const journal = await request('CASE_JOURNAL'); assertAccepted(journal)
  await runtime.legacy.drainJobAdmission()
  const journalJob = (await read('CASE_JOURNAL', journal.data.jobId)).data.job
  assert.equal(journalJob.status, 'failed'); assert.equal(journalJob.recovery.canResume, false)
  const journalCalls = receipt.calls.filter(call => call.marker === 'CASE_JOURNAL').length
  assert.ok(journalCalls > 0)
  await assert.rejects(restarted.resume(journal.data.jobId, owner, runtime.legacy.resumeTokenDanceJob))
  assert.equal(receipt.calls.filter(call => call.marker === 'CASE_JOURNAL').length, journalCalls)
  mark('checkpoint persistence failure after model acceptance stays unknown and is never redispatched')

  // Lost Gateway acceptance persistence leaves an occupied run, never a new paid task.
  runtime.legacy.configureProviderWorkflow(restarted)
  await seed('CASE_ACKLOSS')
  const update = store.update
  let dropAck = true
  store.update = async function(user, runId, patch) {
    if (runId === 'run-CASE_ACKLOSS' && patch.jobId && dropAck) { dropAck = false; throw Error('injected Gateway acknowledgement persistence loss') }
    return update.call(this, user, runId, patch)
  }
  const ackLoss = await request('CASE_ACKLOSS')
  assert.equal(ackLoss.status, 503)
  await runtime.legacy.drainJobAdmission()
  const acceptedCalls = receipt.calls.filter(call => call.marker === 'CASE_ACKLOSS').length
  assert.ok(acceptedCalls > 0)
  const replayAck = await request('CASE_ACKLOSS', {}, owner, true)
  assert.equal(replayAck.status, 409)
  assert.equal(receipt.calls.filter(call => call.marker === 'CASE_ACKLOSS').length, acceptedCalls)
  assert.equal((await store.get(owner, 'run-CASE_ACKLOSS')).jobId, null)
  store.update = update
  mark('lost Gateway acknowledgement cannot create a duplicate job through the other entry point')

  await seed('CASE_PRESEND')
  runtime.legacy.configureProviderWorkflow({ ...restarted, prepare: async () => { throw Error('injected durable admission failure') } })
  const preSend = await request('CASE_PRESEND')
  assert.equal(preSend.data.code, 503)
  assert.equal(receipt.calls.filter(call => call.marker === 'CASE_PRESEND').length, 0)
  assert.equal(runtime.legacy.getJobAdmissionState().active, 0)
  mark('durable admission failure before sending consumes no model calls and releases its slot')

  assert.deepEqual(await db.collection('paperbanana_jobs').findOne({ _id: sentinel._id }), sentinel)
  assert.equal(runtime.objects.get('existing.png').bytes.toString(), 'existing-file')
  assert.equal(await db.collection('workspaceExecutions').countDocuments({ userId: 'foreign-owner' }), 0)
  mark('unrelated existing account/job/file sentinel unchanged')
  receipt.metrics = runtime.legacy.operationalMetrics.snapshot()
  assert.ok(receipt.metrics.counters['admission.accepted_queued'] >= 1)
  assert.equal(globalPeak, 8)
  assert.ok(receipt.metrics.durations['model:image'].count > 0)
  assert.doesNotMatch(JSON.stringify(receipt.metrics), /CASE_ALPHA|isolated-owner|fixture-key|example.com/)
  receipt.completedAt = new Date().toISOString()
  if (process.env.CONCURRENCY_TEST_REPORT) await writeFile(process.env.CONCURRENCY_TEST_REPORT, JSON.stringify(receipt, null, 2) + '\n')
  console.log(JSON.stringify({ passed: receipt.passed, overlap: receipt.overlap, results: receipt.results, realModelCalls: 0 }))
} finally {
  for (const gate of gates.values()) gate.resolve()
  if (runtime) await runtime.close()
  await db.dropDatabase()
  await client.close()
}
