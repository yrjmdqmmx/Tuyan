import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { MongoClient } from 'mongodb'
import { createTokenDanceService } from '../../src/tokendance-service.ts'
import { createProviderWorkflow } from '../../src/provider-workflow.ts'
import { TokenDanceError, TOKENDANCE_APP_URL } from '../../../../packages/api/src/tokendance.ts'

const uri = process.env.TOKENDANCE_TEST_MONGO_URI
if (!uri || new URL(uri).hostname !== '127.0.0.1') throw new Error('A dedicated loopback Mongo test instance is required')
const database = 'tokendance_test_' + randomBytes(8).toString('hex')
const secret = randomBytes(32).toString('base64')
let client = new MongoClient(uri), paymentPosts = 0
const fetcher = async (url, init) => {
  assert.equal(init.headers['X-App-URL'], TOKENDANCE_APP_URL)
  if (url.endsWith('/auth/keys')) return Response.json({ key: 'fixture-user-key' })
  if (url.endsWith('/payment/sessions') && init.method === 'POST') {
    paymentPosts++
    return Response.json({ session: { id: 'fixture-order', amount: 10, status: 'pending', created_at: Math.floor(Date.now() / 1000), expired_at: Math.floor(Date.now() / 1000) + 600, status_url: 'https://tokendance.space/portal/api/v1/payment/sessions/fixture-order', payment_url: 'https://pay.example.com/fixture', alipay_url: 'alipays://platformapi/startapp?appId=fixture' } })
  }
  throw new Error('Unexpected fixture endpoint')
}
try {
  await client.connect()
  let db = client.db(database)
  let service = createTokenDanceService({ db, secret, fetcher })
  let workflow = createProviderWorkflow({ db, service })
  await service.ensureIndexes(); await workflow.ensureIndexes()
  const flow = await service.handle({ action: 'tokenDanceAuthorize' }, 'test-owner')
  await service.handle({ action: 'tokenDanceExchange', state: flow.state, code: 'fixture-code' }, 'test-owner')
  await assert.rejects(service.handle({ action: 'tokenDanceExchange', state: flow.state, code: 'fixture-code' }, 'test-owner'))
  const owner = await db.collection('paperbanana_tokendance_connections').findOne({ _id: 'test-owner' })
  assert.equal(JSON.stringify(owner).includes('fixture-user-key'), false)
  const attempts = await Promise.allSettled(['mongo-order-00001', 'mongo-order-00002'].map(attemptId => service.handle({ action: 'tokenDancePaymentCreate', amount: 10, attemptId }, 'test-owner')))
  assert.equal(attempts.filter(row => row.status === 'fulfilled').length, 1); assert.equal(paymentPosts, 1)
  const indexes = await db.collection('paperbanana_tokendance_payments').listIndexes().toArray()
  assert.ok(indexes.some(row => row.unique && row.partialFilterExpression?.active === true))
  assert.ok(indexes.some(row => row.expireAfterSeconds === 0))

  const task = { jobId: 'mongo-recovery', kind: 'create', body: { userId: 'test-owner', prompt: 'private-test-prompt' }, routeSecrets: { tokendance: 'fixture-user-key', openai: 'fixture-other-key' } }
  await db.collection('paperbanana_jobs').insertOne({ _id: task.jobId, userId: 'test-owner' })
  let planned = 0, rendered = 0, blocked = true
  const execute = currentTask => workflow.run(currentTask, async () => {
    await workflow.call(['composite'], async () => {
      await workflow.call(['planner'], async () => { planned++; return 'stored planned result' })
      return workflow.call(['image'], async () => { rendered++; if (blocked) throw new TokenDanceError(402, 'balance', 'top_up_balance'); return 'fixture result' })
    })
  })
  await assert.rejects(execute(task))
  const snapshot = await db.collection('paperbanana_provider_executions').findOne({ _id: task.jobId })
  for (const value of ['private-test-prompt', 'fixture-user-key', 'fixture-other-key']) assert.equal(JSON.stringify(snapshot).includes(value), false)
  await client.close()
  // Fresh client, service and execution context: results must come from Mongo.
  client = new MongoClient(uri); await client.connect(); db = client.db(database)
  service = createTokenDanceService({ db, secret, fetcher }); workflow = createProviderWorkflow({ db, service }); blocked = false
  const resumes = await Promise.allSettled([workflow.resume(task.jobId, 'test-owner', execute), workflow.resume(task.jobId, 'test-owner', execute)])
  assert.equal(resumes.filter(row => row.status === 'fulfilled').length, 1)
  assert.equal(planned, 1); assert.equal(rendered, 2)
  assert.equal((await db.collection('paperbanana_provider_executions').findOne({ _id: task.jobId })).state, 'complete')
  await service.eraseUserData('test-owner'); await workflow.remove('test-owner')
  for (const name of ['paperbanana_tokendance_connections', 'paperbanana_tokendance_flows', 'paperbanana_tokendance_payments', 'paperbanana_provider_executions', 'paperbanana_provider_steps', 'paperbanana_provider_step_chunks']) assert.equal(await db.collection(name).countDocuments({}), 0)
  console.log(JSON.stringify({ mongo: 'real isolated MongoDB', provider: 'fixtures only', passed: ['one-use exchange', 'encrypted storage', 'unique active order', 'TTL indexes', 'fresh-client nested-step recovery', 'concurrent resume CAS', 'account erasure'], planned, rendered, paymentPosts }))
} finally {
  await client.db(database).dropDatabase().catch(() => {})
  await client.close()
}
