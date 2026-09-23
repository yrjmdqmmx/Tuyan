import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash, randomUUID } from 'node:crypto'
import type { Db } from 'mongodb'
import { publicExecutionFailure } from '../../../packages/api/src/execution-errors.js'
import { normalizeUniversalRoute, universalCredential } from '../../../packages/api/src/universal-api.js'
import { createProviderWorkflow } from './provider-workflow.js'
import type { createTokenDanceService } from './tokendance-service.js'
import { FigureStudioError, figureStudioFailure, prepareFigureRequest, type createFigureStudioService } from './figure-studio.js'

type Row = Record<string, any>
type Workflow = ReturnType<typeof createProviderWorkflow>
type ConnectionService = ReturnType<typeof createTokenDanceService>
type Studio = ReturnType<typeof createFigureStudioService>
const VERSION = 'tuyan.figure-operation/v1'
const TTL = 7 * 86400_000
const sha = (value: string) => createHash('sha256').update(value).digest('hex')
const stable = (value: any): any => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, stable(value[key])])) : value
const fail = (status: number, code: string, message: string): never => { throw new FigureStudioError(status, code, message) }
const requestId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,120}$/.test(value)) fail(400, 'FIGURE_STUDIO_REQUEST_ID', '操作编号无效，请保留原操作编号查询结果。')
  return value as string
}
export function figureDocumentContext(value: unknown) {
  const c = value as Row
  if (!c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).some(key => !['id', 'revision', 'sha256'].includes(key))
    || typeof c.id !== 'string' || !c.id || c.id.length > 120 || /[\x00-\x1f]/.test(c.id)
    || !Number.isSafeInteger(c.revision) || c.revision < 0 || typeof c.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(c.sha256)) fail(400, 'FIGURE_STUDIO_DOCUMENT_CONTEXT', '缺少有效的图稿版本与 SHA-256，未发送模型请求。')
  return { id: (c as Row).id, revision: (c as Row).revision, sha256: (c as Row).sha256 }
}

/** Reuse the existing checkpoint engine; only the figure result namespace is
 * isolated from image-job admission and image-job resume dispatch. */
export function createFigureOperations({ db, service, studio, baseWorkflow, now = () => Date.now() }: {
  db: Db; service: ConnectionService; studio: Studio; baseWorkflow: Workflow; now?: () => number
}) {
  const names: Record<string, string> = {
    paperbanana_provider_executions: 'paperbanana_figure_provider_executions',
    paperbanana_provider_steps: 'paperbanana_figure_provider_steps',
    paperbanana_provider_step_chunks: 'paperbanana_figure_provider_step_chunks',
    paperbanana_jobs: 'paperbanana_figure_operations',
  }
  const workflow = createProviderWorkflow({
    db: { collection: (name: string) => db.collection(names[name] || name) } as Db,
    // The shared engine also checks this barrier when writing encrypted raw
    // checkpoints, so an old account generation cannot recreate deleted data.
    service: { ...service, async accepting(userId: string) { await service.accepting(userId); if (context.getStore()) await ensureCurrent() } }, now,
  })
  const operations = db.collection<any>('paperbanana_figure_operations')
  const executions = db.collection<any>(names.paperbanana_provider_executions)
  const admissions = db.collection<any>('paperbanana_figure_admissions')
  const context = new AsyncLocalStorage<{ id: string; owner: string; userId: string; kind: string; requestId: string; provider: string; model: string }>()
  const pending = new Set<Promise<void>>()
  const instanceId = randomUUID()
  let accepting = true
  const identity = (userId: string, id: string) => 'figure:' + sha(userId + '\0' + id)
  async function generation(userId: string) {
    await service.accepting(userId)
    const head = await db.collection<any>('paperbanana_account_deletions').findOne({ _id: `user:${userId}` })
    return head?.accountGeneration || ''
  }
  async function reserve(userId: string) {
    const owner = randomUUID()
    for (let slot = 0; slot < 2; slot++) {
      const id = identity(userId, 'admission-slot-' + slot)
      const lease = { _id: id, userId, owner, leaseUntil: new Date(now() + 60_000), expiresAt: new Date(now() + TTL) }
      try { await admissions.insertOne(lease); return { id, owner } }
      catch (error: any) { if (error?.code !== 11000) throw error }
      const claimed = await admissions.updateOne({ _id: id, userId, leaseUntil: { $lte: new Date(now()) } }, { $set: { userId, owner, leaseUntil: lease.leaseUntil, expiresAt: lease.expiresAt } })
      if (claimed.modifiedCount) return { id, owner }
    }
    return fail(429, 'FIGURE_STUDIO_BUSY', '当前账号已有两项图稿操作处理中，请先查询其结果。')
  }
  async function release(lease?: { id: string; owner: string }) {
    if (lease) await admissions.deleteOne({ _id: lease.id, owner: lease.owner })
  }
  async function ensureOwner(row: Row) {
    if (await generation(row.userId) !== row.accountGeneration) fail(409, 'FIGURE_STUDIO_ACCOUNT_CHANGED', '账号状态已变化，旧操作不再可用。')
  }
  async function ensureCurrent() {
    const current = context.getStore()
    if (!current) return
    const row = await operations.findOne({ _id: current.id, userId: current.userId, owner: current.owner, status: 'running', version: VERSION, leaseUntil: { $gt: new Date(now()) } })
    if (!row) fail(409, 'FIGURE_STUDIO_OPERATION_CHANGED', '原操作已结束或执行租约已失效，未发送新的模型请求。')
    if (!row.admission || !await admissions.findOne({ _id: row.admission.id, userId: row.userId, owner: row.admission.owner, leaseUntil: { $gt: new Date(now()) } })) fail(409, 'FIGURE_STUDIO_ADMISSION_EXPIRED', '原操作的并发占位已失效，未发送新的模型请求。')
    await ensureOwner(row)
  }
  const addCall = async (info: any) => {
    const current = context.getStore()
    if (!current) return baseWorkflow.record(info)
    await ensureCurrent()
    const record = { ...info, source: 'figure-studio', kind: current.kind, operationRequestId: current.requestId }
    if (['tokendance', 'custom'].includes(current.provider)) return workflow.record(record)
    await operations.updateOne({ _id: current.id, userId: current.userId, status: 'running' }, { $push: { providerCalls: record } } as any)
  }
  const currentWorkflow = () => context.getStore() ? workflow : baseWorkflow
  const hooks = {
    // This adapter is installed for the whole legacy runtime, including ordinary
    // workbench jobs. Preserve its complete transport/recovery contract while
    // selecting only the figure engine inside an active figure operation.
    run(...args: Parameters<Workflow['run']>) { return currentWorkflow().run(...args) },
    active() { return currentWorkflow().active() },
    thinkingAvailable() { return currentWorkflow().thinkingAvailable() },
    thinking() { return currentWorkflow().thinking() },
    async pending() { await ensureCurrent(); return currentWorkflow().pending() },
    async checkpoint(value: Parameters<Workflow['checkpoint']>[0]) { await ensureCurrent(); return currentWorkflow().checkpoint(value) },
    scope<T>(name: string, operation: () => Promise<T>) { return currentWorkflow().scope(name, operation) },
    async key(original: string) {
      if (!context.getStore()) return baseWorkflow.key(original)
      await ensureCurrent()
      const value = await workflow.key(original)
      await ensureCurrent()
      return value
    },
    record: addCall,
    async call<T>(descriptor: unknown, operation: () => Promise<T>, role?: 'main' | 'vision' | 'image'): Promise<T> {
      const current = context.getStore()
      if (!current) return baseWorkflow.call(descriptor, operation, role)
      await ensureCurrent()
      if (['tokendance', 'custom'].includes(current.provider)) return workflow.call(descriptor, async () => { await ensureCurrent(); return operation() }, role)
      // Native adapters do not enter the managed-provider engine. Their entire
      // single-call operation is claimed durably below and never auto-resumed.
      try {
        await ensureCurrent()
        const output = await operation()
        await addCall({ channel: current.provider, model: current.model, status: 'succeeded', billingStatus: 'unconfirmed' })
        return output
      } catch (error) {
        const failure = publicExecutionFailure(error)
        try { await addCall({ channel: current.provider, model: current.model, status: failure.requestState, billingStatus: failure.billingStatus }) } catch { /* Preserve the original provider error if recording also fails. */ }
        throw error
      }
    },
  }
  async function read(userId: string, externalId: string) {
    await generation(userId)
    const id = identity(userId, requestId(externalId))
    let row = await operations.findOne({ _id: id, userId })
    if (!row || row.expiresAt.getTime() <= now()) fail(404, 'FIGURE_STUDIO_OPERATION_NOT_FOUND', '找不到当前账号的操作，或恢复记录已超过 7 天。')
    await ensureOwner(row)
    if (row.version !== VERSION) {
      const recovery = { canResume: false, action: 'review_request', requestState: 'unknown', billingStatus: 'unknown', message: '原操作执行版本已变化，不能安全重放；请核对原渠道记录。' }
      await operations.updateOne({ _id: id, userId }, { $set: { status: 'blocked', recovery }, $unset: { result: '' } })
      row = { ...row, status: 'blocked', recovery, result: undefined }
    }
    if (row.status === 'failed' || ['running', 'queued'].includes(row.status) && (row.leaseUntil?.getTime() || 0) <= now()) {
      await workflow.reconcile(id)
      // The reused job facade writes 'failed' during reconciliation. Re-read
      // its atomic transition before mapping into the figure status contract.
      row = await operations.findOne({ _id: id, userId })
      if (!row) fail(404, 'FIGURE_STUDIO_OPERATION_NOT_FOUND', '操作记录已清理。')
      if (row.status === 'failed' || ['running', 'queued'].includes(row.status) && (row.leaseUntil?.getTime() || 0) <= now()) {
        const engine = await executions.findOne({ _id: id, userId })
        if (row.result && (!['tokendance', 'custom'].includes(row.mainRoute.accessProvider) || engine?.state === 'complete')) {
          // The validated result was committed before a process interruption
          // between result storage and the final public status transition.
          service.cipher!.open(row.result, id + ':result')
          await operations.updateOne({ _id: id, userId, status: row.status, leaseUntil: row.leaseUntil }, { $set: { status: 'succeeded', updatedAt: new Date(now()) }, $unset: { recovery: '', failure: '', leaseUntil: '' } })
        } else {
          const recovery = engine?.recovery || { channel: row.mainRoute.accessProvider, canResume: false, action: 'review_request', requestState: 'unknown', billingStatus: 'unknown', message: '服务中断时结果未确认，已停止重发；请核对渠道记录。', expiresAt: row.expiresAt }
          if (!recovery.requestState) Object.assign(recovery, { requestState: recovery.canResume ? 'not_sent' : 'unknown', billingStatus: recovery.canResume ? row.providerCalls?.length ? 'prior_calls' : 'not_called' : 'unknown' })
          await operations.updateOne({ _id: id, userId, status: row.status, leaseUntil: row.leaseUntil }, { $set: { status: 'blocked', recovery, updatedAt: new Date(now()) } })
        }
        row = await operations.findOne({ _id: id, userId })
      }
    }
    if (!row) fail(404, 'FIGURE_STUDIO_OPERATION_NOT_FOUND', '操作记录已清理。')
    await ensureOwner(row)
    const publicRow: Row = Object.fromEntries(['requestId', 'requestHash', 'kind', 'status', 'documentContext', 'mainRoute', 'providerRegions', 'createdAt', 'updatedAt', 'expiresAt', 'failure'].filter(key => row[key] !== undefined).map(key => [key, row[key]]))
    publicRow.recovery = row.recovery || null
    publicRow.providerCalls = row.providerCalls || []
    if (row.status === 'succeeded' && row.result) publicRow.result = service.cipher!.open(row.result, id + ':result')
    return { code: 0, operation: publicRow }
  }
  function enqueue(task: Row) {
    const work = execute(task).catch(() => {}).finally(() => pending.delete(work))
    pending.add(work)
  }
  async function execute(task: Row) {
    const row = await operations.findOne({ _id: task.jobId, userId: task.body.userId })
    if (!row) return
    const owner = randomUUID()
    const claimed = await operations.updateOne({ _id: row._id, userId: row.userId, status: 'queued', version: VERSION }, { $set: { status: 'running', owner, instanceId, updatedAt: new Date(now()), leaseUntil: new Date(now() + 60_000) }, $unset: { recovery: '', failure: '' } })
    if (!claimed.modifiedCount) return
    const heartbeat = setInterval(() => {
      void operations.updateOne({ _id: row._id, owner, status: 'running', leaseUntil: { $gt: new Date(now()) } }, { $set: { leaseUntil: new Date(now() + 60_000) } }).catch(() => {})
      if (row.admission) void admissions.updateOne({ _id: row.admission.id, owner: row.admission.owner, leaseUntil: { $gt: new Date(now()) } }, { $set: { leaseUntil: new Date(now() + 60_000) } }).catch(() => {})
    }, 10_000)
    heartbeat.unref()
    try {
      await ensureOwner(row)
      await context.run({ id: row._id, owner, userId: row.userId, kind: row.kind, requestId: row.requestId, provider: row.mainRoute.accessProvider, model: row.mainRoute.modelId }, async () => {
        await workflow.run(task as any, async () => {
          await ensureOwner(row)
          const result = await studio.execute({ ...task.body, apiKeys: task.routeSecrets, beforeProviderCall: ensureCurrent })
          await ensureOwner(row)
          const { code: _code, ...payload } = result
          await operations.updateOne({ _id: row._id, owner, status: 'running' }, { $set: { result: service.cipher!.seal(payload, row._id + ':result') } })
        })
      })
      await ensureOwner(row)
      // Commit only after the reused workflow has committed its checkpoints.
      await operations.updateOne({ _id: row._id, owner, status: 'running' }, { $set: { status: 'succeeded', updatedAt: new Date(now()) }, $unset: { recovery: '', failure: '', leaseUntil: '' } })
    } catch (error: any) {
      try {
        await ensureOwner(row)
        const current = await operations.findOne({ _id: row._id, owner })
        if (!current) return
        const response = figureStudioFailure(error)
        const failure = { ...publicExecutionFailure(error, current.providerCalls?.length || 0), ...Object.fromEntries(['errorCode', 'requestState', 'billingStatus', 'billingMessage'].filter(key => response[key] !== undefined).map(key => [key, response[key]])), message: response.error }
        const engine = await executions.findOne({ _id: row._id, userId: row.userId })
        const recovery = engine?.recovery || { channel: row.mainRoute.accessProvider, canResume: false, action: failure.requestState === 'not_sent' ? 'change_input' : 'review_request', message: failure.message, requestState: failure.requestState, billingStatus: failure.billingStatus, billingMessage: failure.billingMessage, expiresAt: row.expiresAt }
        if (response.requestState === 'not_sent' && !error?.uncertain && !await db.collection<any>(names.paperbanana_provider_steps).countDocuments({ jobId: row._id, state: { $in: ['running', 'unknown'] } })) Object.assign(recovery, { canResume: Boolean(engine?.recovery?.canResume), action: engine?.recovery?.canResume ? recovery.action : 'change_input', requestState: 'not_sent', billingStatus: current.providerCalls?.length ? 'prior_calls' : 'not_called', message: response.error })
        // Output validation is never a resumable input error, even if a raw
        // provider checkpoint was successfully saved.
        if (error?.modelReturned) Object.assign(recovery, { canResume: false, action: 'review_request', requestState: 'unknown', billingStatus: 'unconfirmed', message: response.error, billingMessage: response.billingMessage })
        await operations.updateOne({ _id: row._id, owner }, { $set: { status: 'blocked', failure, recovery, updatedAt: new Date(now()) }, $unset: { result: '', leaseUntil: '' } })
      } catch { /* Account deletion owns cleanup; never resurrect rows or erase unrelated new-generation data. */ }
    } finally { clearInterval(heartbeat); await release(row.admission) }
  }
  async function submit(body: Row) {
    if (!accepting) fail(503, 'FIGURE_STUDIO_STOPPING', '服务正在重启，尚未受理新操作。')
    const userId = body.userId, accountGeneration = await generation(userId)
    if (!service.cipher) fail(503, 'FIGURE_STUDIO_STORAGE_UNAVAILABLE', '安全恢复存储尚未配置，未发送模型请求。')
    const externalId = requestId(body.requestId), documentContext = figureDocumentContext(body.documentContext)
    const prepared = prepareFigureRequest(body)
    if (prepared.document && (documentContext.id !== prepared.document.id || documentContext.revision !== prepared.document.revision || documentContext.sha256 !== sha(JSON.stringify(body.document)))) fail(409, 'FIGURE_STUDIO_DOCUMENT_CONTEXT', '编辑请求与图稿版本或 SHA-256 不一致，未发送模型请求。')
    const { apiKeys, ...safeBody } = prepared
    const requestHash = sha(JSON.stringify(stable({ ...safeBody, documentContext })))
    const id = identity(userId, externalId)
    const existing = await operations.findOne({ _id: id, userId })
    if (existing) {
      if (existing.requestHash !== requestHash) fail(409, 'FIGURE_STUDIO_REQUEST_CONFLICT', '该操作编号已用于不同输入；请查询原操作，不要覆盖或重复发送。')
      return read(userId, externalId)
    }
    const provider = prepared.mainRoute.accessProvider
    const routeSecrets = { ...apiKeys }
    if (provider === 'tokendance') {
      try { routeSecrets.tokendance = (await service.credential(userId)).key }
      catch (error: any) { if (error && typeof error === 'object') error.requestState = 'not_sent'; throw error }
    }
    if (await generation(userId) !== accountGeneration) fail(409, 'FIGURE_STUDIO_ACCOUNT_CHANGED', '账号状态已变化，尚未受理操作。')
    const admission = await reserve(userId)
    const row = { _id: id, admission, version: VERSION, userId, accountGeneration, requestId: externalId, requestHash, documentContext, mainRoute: prepared.mainRoute, providerRegions: prepared.providerRegions || {}, kind: body.action === 'figureStudioPlan' ? 'plan' : 'edit', status: 'queued', providerCalls: [], instanceId, leaseUntil: new Date(now() + 60_000), createdAt: new Date(now()), updatedAt: new Date(now()), expiresAt: new Date(now() + TTL) }
    try { await operations.insertOne(row) } catch (error: any) {
      await release(admission)
      if (error?.code !== 11000) throw error
      const winner = await operations.findOne({ _id: id, userId })
      if (winner?.requestHash !== requestHash) fail(409, 'FIGURE_STUDIO_REQUEST_CONFLICT', '该操作编号已用于不同输入。')
      return read(userId, externalId)
    }
    // Credentials are passed only in routeSecrets. The shared engine encrypts
    // custom/native secrets, and resolves TokenDance again from account authority.
    enqueue({ jobId: id, kind: row.kind, body: { ...safeBody, userId, modelRoutes: { main: prepared.mainRoute } }, routeSecrets })
    return read(userId, externalId)
  }
  async function resume(body: Row) {
    if (!accepting) fail(503, 'FIGURE_STUDIO_STOPPING', '服务正在重启，请稍后查询原操作。')
    const current = await read(body.userId, body.requestId)
    if (!current.operation.recovery?.canResume || current.operation.status !== 'blocked') fail(409, 'FIGURE_STUDIO_NOT_RESUMABLE', '原操作不能安全恢复；请核对原渠道记录。')
    const id = identity(body.userId, body.requestId)
    let customKeys: string | undefined
    if (body.apiKeys?.custom !== undefined) {
      if (current.operation.mainRoute.accessProvider !== 'custom') fail(400, 'FIGURE_STUDIO_ROUTE_INVALID', '新密钥不属于原操作的连接。')
      const route = normalizeUniversalRoute(current.operation.mainRoute)
      universalCredential(route, body.apiKeys.custom)
      customKeys = body.apiKeys.custom
    }
    const admission = await reserve(body.userId)
    try { await workflow.resume(id, body.userId, async task => {
      const changed = await operations.updateOne({ _id: id, userId: body.userId, version: VERSION, status: 'blocked', 'recovery.canResume': true }, { $set: { status: 'queued', admission, leaseUntil: new Date(now() + 60_000), updatedAt: new Date(now()) }, $unset: { failure: '', recovery: '' } })
      if (!changed.modifiedCount) fail(409, 'FIGURE_STUDIO_NOT_RESUMABLE', '原操作正在恢复或不再可恢复。')
      enqueue(task)
    }, customKeys) } catch (error) { await release(admission); throw error }
    return read(body.userId, body.requestId)
  }
  async function remove(userId: string) { await workflow.remove(userId); await operations.deleteMany({ userId }); await admissions.deleteMany({ userId }) }
  return {
    hooks, workflow,
    async handle(body: Row): Promise<Row> {
      try {
        if (body.action === 'figureStudioOperation') return await read(body.userId, body.requestId)
        if (body.action === 'figureStudioResume') return await resume(body)
        if (body.action === 'figureStudioPlan' || body.action === 'figureStudioEdit') return await submit(body)
        const response = await studio.handle(body)
        if (body.action === 'figureStudioCapabilities' && !service.cipher) return { ...response, modelPlanning: false, modelPlanningReason: '安全恢复存储尚未配置，未发送模型请求。' }
        return response
      } catch (error) { return figureStudioFailure(error) }
    },
    async ensureIndexes() { await workflow.ensureIndexes(); await operations.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); await operations.createIndex({ userId: 1, status: 1 }); await admissions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }) },
    remove,
    stop() { accepting = false },
    async drain() { while (pending.size) await Promise.all([...pending]) },
  }
}
