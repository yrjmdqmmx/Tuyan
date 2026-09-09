import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash, randomUUID } from 'node:crypto'
import type { Db } from 'mongodb'
import { TokenDanceError } from '../../../packages/api/src/tokendance.js'
import type { createTokenDanceService } from './tokendance-service.js'

type ConnectionService = ReturnType<typeof createTokenDanceService>
type Task = { jobId: string; kind: string; body: any; routeSecrets: Record<string, string>; numCandidates?: number; maxCriticRounds?: number }
type Context = { task: Task; scope: string; counts: Map<string, number> }
const version = 'tokendance-workflow-v1'

/** Paid calls are durably claimed BEFORE transport and committed AFTER their
 * complete result is stored. An abandoned claim is never automatically retried. */
export function createProviderWorkflow({ db, service, now = () => Date.now() }: { db: Db; service: ConnectionService; now?: () => number }) {
  const context = new AsyncLocalStorage<Context>()
  const instanceId = randomUUID()
  const executions = db.collection<any>('paperbanana_provider_executions')
  const steps = db.collection<any>('paperbanana_provider_steps')
  const chunks = db.collection<any>('paperbanana_provider_step_chunks')
  const jobs = db.collection<any>('paperbanana_jobs')
  const isManaged = (task: Task) => Boolean(task.routeSecrets.tokendance)
  const expires = () => new Date(now() + 7 * 86400_000)
  async function acceptingData(userId: string) {
    try { await service.accepting(userId) }
    catch (error: any) {
      if (error?.name === 'TokenDanceError' && error.status === 409) {
        for (const collection of [executions, steps, chunks]) await collection.deleteMany({ userId })
      }
      throw error
    }
  }
  async function writeResult(id: string, userId: string, output: any) {
    await acceptingData(userId)
    const text = JSON.stringify(output), size = 512 * 1024, count = Math.ceil(text.length / size)
    if (count > 200) throw new TokenDanceError(502, '模型结果超过任务恢复存储限制。', 'review_request', 0, true)
    const rows = Array.from({ length: count }, (_, i) => ({ _id: `${id}:${i}`, userId, expiresAt: expires(), data: service.cipher!.seal(text.slice(i * size, (i + 1) * size), `${id}:${i}`) }))
    if (rows.length) await chunks.insertMany(rows)
    await acceptingData(userId)
    return count
  }
  async function readResult(id: string, count: number) {
    const parts = []
    for (let i = 0; i < count; i++) {
      const row = await chunks.findOne({ _id: `${id}:${i}` })
      if (!row) throw new TokenDanceError(409, '恢复结果已过期或不完整，请核对原任务。', 'review_request', 0, true)
      parts.push(service.cipher!.open(row.data, `${id}:${i}`))
    }
    return JSON.parse(parts.join(''))
  }
  async function call<T>(descriptor: unknown, operation: () => Promise<T>): Promise<T> {
    const current = context.getStore()
    if (!current) return operation()
    const digest = createHash('sha256').update(JSON.stringify(descriptor)).digest('hex')
    const occurrence = current.counts.get(digest) || 0
    current.counts.set(digest, occurrence + 1)
    const id = `${current.task.jobId}:${current.scope}:${digest}:${occurrence}`
    const existing = await steps.findOne({ _id: id })
    if (existing?.state === 'complete') return readResult(id, existing.chunks)
    if (existing && existing.state !== 'rejected') throw new TokenDanceError(409, '上次调用结果不确定，已暂停以避免重复扣费，请核对 TokenDance 调用记录。', 'review_request', 0, true)
    if (existing?.retryAt && existing.retryAt.getTime() > now()) throw new TokenDanceError(429, '限流等待时间尚未结束。', 'rate_limit', Math.ceil((existing.retryAt.getTime() - now()) / 1000))
    if (existing) {
      const claim = await steps.updateOne({ _id: id, state: 'rejected' }, { $set: { state: 'running', startedAt: new Date(now()) } })
      if (!claim.modifiedCount) throw new TokenDanceError(409, '该调用正在处理。', 'review_request', 0, true)
    } else {
      try { await steps.insertOne({ _id: id, userId: current.task.body.userId, jobId: current.task.jobId, state: 'running', startedAt: new Date(now()), expiresAt: expires() }) }
      catch { throw new TokenDanceError(409, '该调用已被占用，请核对任务。', 'review_request', 0, true) }
    }
    try {
      // Composite steps (e.g. reference selection) may contain multiple paid
      // calls. Keep their own checkpoints when the enclosing step fails later.
      const result = await context.run({ ...current, scope: current.scope + '/' + digest + ':' + occurrence, counts: new Map() }, operation)
      const count = await writeResult(id, current.task.body.userId, result)
      await steps.updateOne({ _id: id, state: 'running' }, { $set: { state: 'complete', chunks: count, completedAt: new Date(now()) } })
      return result
    } catch (error: any) {
      const rejected = error?.name === 'TokenDanceError' && !error.uncertain && Boolean(error.recoveryAction)
      await steps.updateOne({ _id: id }, { $set: { state: rejected ? 'rejected' : 'unknown', retryAt: new Date(now() + (error.retryAfterSeconds || 0) * 1000) } })
      throw error
    }
  }
  async function run(task: Task, operation: () => Promise<void>) {
    if (!isManaged(task)) return operation()
    const userId = task.body.userId
    if (!service.cipher) throw new TokenDanceError(503, 'TokenDance 任务恢复服务尚未配置。')
    await service.accepting(userId)
    const owner = randomUUID()
    const old = await executions.findOne({ _id: task.jobId })
    if (!old) {
      const secrets = { ...task.routeSecrets }; delete secrets.tokendance
      await executions.insertOne({ _id: task.jobId, userId, state: 'queued', instanceId, version, secret: service.cipher.seal({ task: { ...task, routeSecrets: undefined }, secrets }, task.jobId), expiresAt: expires() })
    }
    await acceptingData(userId)
    const claimed = await executions.findOneAndUpdate({ _id: task.jobId, userId, version, state: 'queued' }, { $set: { state: 'running', owner, leaseUntil: new Date(now() + 45_000) } }, { returnDocument: 'after' })
    if (!claimed) throw new TokenDanceError(409, '原任务正在运行或不能恢复。')
    const heartbeat = setInterval(() => { void executions.updateOne({ _id: task.jobId, owner, state: 'running' }, { $set: { leaseUntil: new Date(now() + 45_000) } }).catch(() => {}) }, 10_000)
    heartbeat.unref()
    try {
      await context.run({ task, scope: 'root', counts: new Map() }, operation)
      await executions.updateOne({ _id: task.jobId, owner }, { $set: { state: 'complete' }, $unset: { secret: '' } })
      await jobs.updateOne({ _id: task.jobId }, { $unset: { recovery: '' } })
    } catch (error: any) {
      await acceptingData(userId)
      const unsafe = error?.uncertain || !error?.recoveryAction || error.recoveryAction === 'review_request'
      const recovery = { channel: 'tokendance', canResume: !unsafe, action: unsafe ? 'review_request' : error.recoveryAction, message: unsafe ? '调用结果尚未确认，请核对调用记录；自动重试已停止。' : error.message, retryAt: new Date(now() + (error.retryAfterSeconds || 0) * 1000), expiresAt: expires() }
      await executions.updateOne({ _id: task.jobId, owner }, { $set: { state: 'blocked', recovery } })
      await jobs.updateOne({ _id: task.jobId }, { $set: { recovery } })
      throw error
    } finally { clearInterval(heartbeat) }
  }
  async function reconcile(jobId: string) {
    const row = await executions.findOne({ _id: jobId, state: { $in: ['running', 'queued'] } })
    if (!row) return
    if (row.state === 'queued' ? row.instanceId === instanceId : (row.leaseUntil?.getTime() || 0) > now()) return
    const uncertain = await steps.countDocuments({ jobId, state: { $in: ['running', 'unknown'] } })
    const recovery = { channel: 'tokendance', canResume: uncertain === 0, action: uncertain ? 'review_request' : 'resume', message: uncertain ? '服务中断时存在未确认调用，请核对记录。' : '服务曾中断，可从已保存步骤恢复。', expiresAt: row.expiresAt }
    const updated = await executions.updateOne({ _id: jobId, state: row.state, instanceId: row.instanceId, leaseUntil: row.leaseUntil }, { $set: { state: 'blocked', recovery } })
    if (updated.modifiedCount) await jobs.updateOne({ _id: jobId }, { $set: { status: 'failed', error: recovery.message, recovery } })
  }
  return {
    run, call, reconcile,
    async reconcileUser(userId: string) {
      if (!userId) return
      const active = await executions.find({ userId, state: { $in: ['running', 'queued'] } }).limit(100).toArray()
      for (const row of active) await reconcile(row._id)
    },
    scope<T>(name: string, operation: () => Promise<T>) {
      const current = context.getStore()
      return current ? context.run({ ...current, scope: current.scope + '/' + name, counts: new Map() }, operation) : operation()
    },
    async key(original: string) { const current = context.getStore(); return current ? (await service.credential(current.task.body.userId)).key : original },
    async record(info: unknown) { const current = context.getStore(); if (current) await jobs.updateOne({ _id: current.task.jobId }, { $push: { providerCalls: info } } as any) },
    async resume(jobId: string, userId: string, enqueue: (task: any) => Promise<any>) {
      await reconcile(jobId); await service.accepting(userId)
      const connected = await service.credential(userId)
      const row = await executions.findOneAndUpdate({ _id: jobId, userId, state: 'blocked', version, 'recovery.canResume': true, expiresAt: { $gt: new Date(now()) } }, { $set: { state: 'queued', instanceId } }, { returnDocument: 'before' })
      if (!row) throw new TokenDanceError(409, '原任务不可恢复、已过期或正在执行。')
      try {
        const snapshot = service.cipher!.open(row.secret, jobId)
        const task = { ...snapshot.task, routeSecrets: { ...snapshot.secrets, tokendance: connected.key } }
        return await enqueue(task)
      } catch (error) { await executions.updateOne({ _id: jobId, state: 'queued' }, { $set: { state: 'blocked' } }); throw error }
    },
    async ensureIndexes() {
      for (const collection of [executions, steps, chunks]) await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      await steps.createIndex({ jobId: 1, state: 1 })
    },
    async remove(userId: string) { for (const collection of [executions, steps, chunks]) await collection.deleteMany({ userId }) },
  }
}
