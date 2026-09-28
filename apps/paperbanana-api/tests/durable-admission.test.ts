import assert from 'node:assert/strict'
import test from 'node:test'
import { memoryDb } from '../../../test-support/memory-db.mjs'
import { createProviderWorkflow } from '../src/provider-workflow.js'
import { createTokenDanceService } from '../src/tokendance-service.js'
import { reconcileInterruptedJobs } from '../src/mongo-adapter.js'

function fixture(secret: string | undefined = Buffer.alloc(32, 21).toString('base64')) {
  const db = memoryDb()
  let time = Date.parse('2026-09-28T00:00:00Z')
  const service = createTokenDanceService({ db: db as any, secret, now: () => time,
    fetcher: async () => { throw new Error('No external requests in admission tests') } })
  const restart = () => createProviderWorkflow({ db: db as any, service, now: () => time })
  const jobs = db.collection('paperbanana_jobs'), executions = db.collection('paperbanana_provider_executions')
  return { db, service, jobs, executions, workflow: restart(), restart, advance(ms: number) { time += ms } }
}
function task(kind = 'create') {
  return { jobId: `durable-${kind}`, kind, body: { userId: 'durable-owner', provider: 'openai', accountGeneration: 'generation-1',
    modelRoutes: { main: { accessProvider: 'openai', modelId: 'original-main' }, vision: { accessProvider: 'longcat', modelId: 'original-vision' }, image: { accessProvider: 'custom', modelId: 'original-image' } },
    thinkingSnapshot: { version: 1, roles: {} }, methodContent: 'original-input', sourceImageObjectKey: kind === 'refine' ? 'durable-refine/frozen.png' : undefined,
    refineInputs: kind === 'refine' ? { references: [{ objectKey: 'durable-refine/ref.png' }], mask: { objectKey: 'durable-refine/mask.png' } } : undefined },
    routeSecrets: { openai: 'private-main-key', longcat: 'private-vision-key', custom: 'private-image-key' }, numCandidates: 2, maxCriticRounds: 1 }
}

for (const kind of ['create', 'refine']) test(`${kind}: acknowledged queued snapshot survives instance loss and resumes the same task exactly once`, async () => {
  const f = fixture(), original = task(kind)
  await f.jobs.insertOne({ _id: original.jobId, userId: original.body.userId, status: 'queued' })
  let writeConcern: any
  const insert = f.executions.insertOne.bind(f.executions)
  f.executions.insertOne = async (value: any, options: any) => { writeConcern = options.writeConcern; return insert(value) }
  await f.workflow.prepare(original)
  assert.deepEqual(writeConcern, { w: 'majority', j: true, wtimeoutMS: 10_000 })
  const saved = await f.executions.findOne({ _id: original.jobId })
  assert.equal(saved.state, 'queued')
  assert.equal(saved.admissionVersion, 1)
  assert.equal(saved.needsTokenDance, false)
  assert.ok(saved.secret)
  assert.equal(JSON.stringify(saved).includes('private-'), false)
  assert.equal(await f.db.collection('paperbanana_provider_steps').countDocuments({}), 0)
  await f.workflow.reconcile(original.jobId)
  assert.equal((await f.executions.findOne({ _id: original.jobId })).state, 'queued', 'live queue is not interrupted')

  // Discard the executor instance, keep only durable Mongo state, and boot a new one.
  await reconcileInterruptedJobs(f.jobs as any)
  const restarted = f.restart()
  await restarted.reconcileUser(original.body.userId)
  const interrupted = await f.jobs.findOne({ _id: original.jobId })
  assert.equal(interrupted.status, 'failed')
  assert.equal(interrupted.retryable, false)
  assert.equal(interrupted.recovery.canResume, true)
  assert.equal(interrupted.recovery.requestState, 'not_sent')
  assert.equal(interrupted.recovery.billingStatus, 'not_called')
  assert.match(interrupted.recovery.message, /尚未开始/)
  let enqueued = 0, restored: any, calls = 0
  const enqueue = async (value: any) => { enqueued++; restored = value; return { jobId: value.jobId } }
  await f.db.collection('paperbanana_tokendance_connections').insertOne({ _id: 'another-owner', version: 'fixture', secret: f.service.cipher!.seal({ key: 'other-key' }, 'another-owner') })
  await assert.rejects(restarted.resume(original.jobId, 'another-owner', enqueue), { status: 409 })
  await assert.rejects(restarted.resume(original.jobId, 'guest:anonymous', enqueue), { status: 401 })
  const results = await Promise.allSettled([restarted.resume(original.jobId, original.body.userId, enqueue), restarted.resume(original.jobId, original.body.userId, enqueue)])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(enqueued, 1)
  assert.deepEqual(restored, JSON.parse(JSON.stringify(original)))
  // Stale in-memory entries cannot execute or delete the newly resumed snapshot.
  await f.workflow.cancelPrepared(original)
  await assert.rejects(f.workflow.run(original, async () => { calls++ }), { executionClaimLost: true })
  await restarted.run(restored, async () => {
    assert.equal(restarted.active(), true)
    await restarted.call(['mock-paid-step'], async () => { calls++; return { image: 'saved-result' } })
  })
  assert.equal(calls, 1)
  const done = await f.executions.findOne({ _id: original.jobId })
  assert.equal(done.state, 'complete')
  assert.equal(done.secret, undefined)
  assert.equal((await f.jobs.findOne({ _id: original.jobId })).recovery, undefined)
})

test('new authenticated legacy native jobs get durable admission without changing direct historical run()', async () => {
  const f = fixture(), original = { jobId: 'native-legacy', kind: 'create', body: { userId: 'native-owner', provider: 'openai' }, routeSecrets: { openai: 'private-native-key' } }
  await f.workflow.prepare(original)
  assert.equal((await f.executions.findOne({ _id: original.jobId })).channel, 'openai')
  const restarted = f.restart()
  await restarted.reconcile(original.jobId)
  let restored: any
  await restarted.resume(original.jobId, original.body.userId, async value => { restored = value })
  await restarted.run(restored, async () => { assert.equal(restarted.active(), true) })
})

test('missing cipher and failed snapshot writes cannot enter execution; cancelled preparation removes only queued data', async () => {
  const noCipher = fixture(''), original = task()
  await assert.rejects(noCipher.workflow.prepare(original), { status: 503, requestState: 'not_sent' })
  assert.equal(await noCipher.executions.countDocuments({}), 0)
  const f = fixture()
  const insert = f.executions.insertOne.bind(f.executions)
  f.executions.insertOne = async () => { throw new Error('injected Mongo write failure') }
  await assert.rejects(f.workflow.prepare(original), /Mongo write failure/)
  assert.equal(await f.executions.countDocuments({}), 0)
  f.executions.insertOne = insert
  await f.workflow.prepare(original)
  await f.workflow.cancelPrepared(original)
  assert.equal(await f.executions.countDocuments({}), 0)
  let calls = 0
  await assert.rejects(f.workflow.run(original, async () => { calls++ }), /快照已过期或缺失/)
  assert.equal(calls, 0)
})

test('expired snapshots and missing snapshots cannot create a fresh paid execution', async () => {
  const f = fixture(), original = task()
  await f.jobs.insertOne({ _id: original.jobId, status: 'queued', userId: original.body.userId })
  await f.workflow.prepare(original)
  const restarted = f.restart()
  await restarted.reconcile(original.jobId)
  assert.equal((await f.jobs.findOne({ _id: original.jobId })).recovery.canResume, true)
  f.advance(7 * 86400_000 + 1)
  await restarted.reconcileUser(original.body.userId)
  assert.equal((await f.jobs.findOne({ _id: original.jobId })).recovery.canResume, false)
  let calls = 0
  await assert.rejects(restarted.resume(original.jobId, original.body.userId, async () => { calls++ }), { status: 409 })
  await f.executions.deleteOne({ _id: original.jobId })
  await assert.rejects(f.workflow.run(original, async () => { calls++ }), /快照已过期或缺失/)
  assert.equal(calls, 0)
  assert.equal(await f.executions.countDocuments({}), 0)
})

test('an abandoned paid claim stays unknown even if its execution row looks queued', async () => {
  const f = fixture(), original = task()
  await f.jobs.insertOne({ _id: original.jobId, status: 'queued', userId: original.body.userId })
  await f.workflow.prepare(original)
  await f.db.collection('paperbanana_provider_steps').insertOne({ _id: 'abandoned', jobId: original.jobId, state: 'running' })
  const restarted = f.restart()
  await restarted.reconcile(original.jobId)
  const job = await f.jobs.findOne({ _id: original.jobId })
  assert.equal(job.recovery.canResume, false)
  assert.equal(job.recovery.requestState, 'unknown')
  assert.equal(job.recovery.billingStatus, 'unknown')
  let calls = 0
  await assert.rejects(restarted.resume(original.jobId, original.body.userId, async () => { calls++ }), { status: 409 })
  assert.equal(calls, 0)
})

test('TokenDance admission stores only a connection reference and rechecks its current credential on resume', async () => {
  const f = fixture(), original = { ...task(), routeSecrets: { tokendance: 'private-original-tokendance-key' } }
  await f.workflow.prepare(original)
  const stored = await f.executions.findOne({ _id: original.jobId })
  assert.equal(stored.needsTokenDance, true)
  assert.deepEqual(f.service.cipher!.open(stored.secret, original.jobId).secrets, {})
  await f.db.collection('paperbanana_tokendance_connections').insertOne({ _id: original.body.userId, version: 'fixture', secret: f.service.cipher!.seal({ key: 'private-current-connection-key' }, original.body.userId) })
  const restarted = f.restart()
  await restarted.resume(original.jobId, original.body.userId, async value => { assert.equal(value.routeSecrets.tokendance, 'private-current-connection-key') })
})

test('cloud/tool extensions and expiring credentials survive queued crash as exact immutable snapshot', async()=>{
 const f=fixture(),original:any=task('cloud-tool')
 original.body.modelRoutes.image={accessProvider:'custom',modelId:'call-deployment',custom:{version:1,connectionId:'custom_image',protocol:'openai-responses',baseUrl:'https://example-resource.openai.azure.com/openai/v1',auth:'bearer-expiring',azure:{deploymentModel:'gpt-5'},imageTool:{provider:'azure',model:'gpt-image-1.5',deployment:'image-deployment',quality:'high'}}}
 original.routeSecrets.custom=JSON.stringify({custom_image:{baseUrl:original.body.modelRoutes.image.custom.baseUrl,protocol:'openai-responses',auth:'bearer-expiring',apiKey:'private-cloud-token',expiresAt:'2026-09-29T00:00:00Z'}})
 original.body.thinkingSnapshot={version:1,roles:{image:{provider:'custom',modelId:'call-deployment',protocol:'openai-responses',role:'image',options:{effort:'low'},wire:{reasoning:{effort:'low'}}}}}
 await f.jobs.insertOne({_id:original.jobId,userId:original.body.userId,status:'queued'})
 await f.workflow.prepare(original)
 const saved=await f.executions.findOne({_id:original.jobId});assert.equal(JSON.stringify(saved).includes('private-cloud-token'),false)
 await reconcileInterruptedJobs(f.jobs as any);const restart=f.restart();await restart.reconcileUser(original.body.userId)
 let restored:any;await restart.resume(original.jobId,original.body.userId,async value=>{restored=value;return {jobId:value.jobId}})
 assert.deepEqual(restored,JSON.parse(JSON.stringify(original)))
})

test('BFL-only legacy executions also require durable workflow context before their async submission',async()=>{
 const f=fixture(),original:any=task('bfl-only');original.routeSecrets={bfl:'private-bfl-key'}
 let active=false
 await f.workflow.run(original,async()=>{active=f.workflow.active();await f.workflow.call(['image','bfl','flux-2-pro'],async()=>{await f.workflow.checkpoint({provider:'bfl',model:'flux-2-pro',state:{phase:'submitting'}});assert.equal((await f.workflow.pending()).state.phase,'submitting');return 'fixture-result'})})
 assert.equal(active,true);assert.equal((await f.executions.findOne({_id:original.jobId})).state,'complete')
})
