import type { Collection, Db } from 'mongodb'
import { mutateCommunityPrompt } from './admin-community.js'
import { AdminError, COMMUNITY_STATES, FOLLOWUP_STATES, JOB_STATES, OPEN_COMMUNITY_STATES, literal, mask, option, paging, requireRevision, revision, safe, text, timeFilter, versionFilter, type Input } from './admin-policy.js'

const JOB_PROJECTION = { resultCount: { $size: { $ifNull: ['$resultImages', []] } }, _id: 1, userId: 1, user_id: 1, userEmail: 1, user_email: 1, taskName: 1, caption: 1, status: 1, jobType: 1, provider: 1, mainModelName: 1, imageModelName: 1, referenceVisionModelName: 1, 'modelRoutes.main.modelId': 1, 'modelRoutes.image.modelId': 1, 'modelRoutes.vision.modelId': 1, createdAt: 1, updatedAt: 1, startedAt: 1, completedAt: 1, errorCode: 1, adminVersion: 1, 'adminOperations.status': 1 }
const COMMUNITY_PROJECTION = { _id: 0, submissionId: 1, status: 1, prompt: 1, capability: 1, requiredElements: 1, forbiddenResults: 1, notes: 1, userId: 1, createdAt: 1, updatedAt: 1, digestId: 1, adminEditedPrompt: 1, adminEditedCapability: 1, adminVersion: 1, decisionNotes: 1, decidedBy: 1, decidedAt: 1 }
const FEEDBACK_PROJECTION = { _id: 1, id: 1, message: 1, category: 1, jobId: 1, platform: 1, contact: 1, userId: 1, userEmail: 1, status: 1, createdAt: 1 }

function duration(row: Input) {
  if (!row.startedAt || !row.completedAt) return null
  const ms = +new Date(row.completedAt) - +new Date(row.startedAt)
  return Number.isFinite(ms) && ms >= 0 ? ms : null
}
function jobSummary(row: Input) {
  return {
    id: String(row._id), userId: safe(row.userId || row.user_id), email: mask(row.userEmail || row.user_email),
    title: safe(row.taskName || row.caption || '未命名任务', 160), type: safe(row.jobType || 'generate'), status: safe(row.status),
    provider: safe(row.provider), models: { main: safe(row.modelRoutes?.main?.modelId || row.mainModelName), image: safe(row.modelRoutes?.image?.modelId || row.imageModelName), vision: safe(row.modelRoutes?.vision?.modelId || row.referenceVisionModelName) },
    createdAt: row.createdAt ?? null, startedAt: row.startedAt ?? null, completedAt: row.completedAt ?? null, updatedAt: row.updatedAt ?? null,
    durationMs: duration(row), resultCount: Number(row.resultCount || 0), errorCode: safe(row.errorCode), followup: safe(row.adminOperations?.status || 'unreviewed'), revision: revision(row),
  }
}
function communitySummary(row: Input) {
  return { submissionId: safe(row.submissionId), status: safe(row.status), prompt: safe(row.adminEditedPrompt || row.prompt, 4000), capability: safe(row.adminEditedCapability ?? row.capability, 1000),
    userId: safe(row.userId), createdAt: row.createdAt ?? null, updatedAt: row.updatedAt ?? null, digestId: safe(row.digestId), revision: revision(row),
    source: 'community_submission', publication: 'not_tracked',
  }
}
function history(rows: unknown) {
  return (Array.isArray(rows) ? rows : []).slice(-200).map((e: Input) => ({
    kind: safe(e.kind), actorId: safe(e.actorId), at: e.at ?? null, fromStatus: safe(e.fromStatus), toStatus: safe(e.toStatus), notes: safe(e.notes, 1000),
    changes: (Array.isArray(e.changes) ? e.changes : []).map((c: Input) => ({ field: safe(c.field), before: safe(c.before, 4000), after: safe(c.after, 4000) })),
  }))
}
async function page(collection: Collection<Input>, match: Input, input: Input, projection: Input, mapper: (row: Input) => Input, extra: Input[] = []) {
  const { page, pageSize, skip } = paging(input)
  const sort = option(input.sort, ['newest', 'oldest', 'duration_desc'], 'newest')
  if (sort === 'duration_desc' && !extra.length) throw new AdminError(400, '此列表不支持耗时排序')
  const [result] = await collection.aggregate([
    { $match: match }, ...(sort === 'duration_desc' ? extra : []),
    { $sort: sort === 'duration_desc' ? { adminDuration: -1, _id: -1 } : { createdAt: sort === 'oldest' ? 1 : -1, _id: sort === 'oldest' ? 1 : -1 } },
    { $facet: { count: [{ $count: 'total' }], rows: [{ $skip: skip }, { $limit: pageSize }, { $project: projection }] } },
  ], { maxTimeMS: 10000 }).toArray()
  const total = Number(result?.count?.[0]?.total || 0)
  return { rows: (result?.rows || []).map(mapper), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
}
function ownerFilter(userId: string) { return { $or: [{ userId }, { user_id: userId }] } }
function commonFilter(input: Input, searchFields: string[]) {
  const filters: Input[] = [timeFilter(input)]
  const q = text(input.q, 120), userId = text(input.userId)
  if (q) filters.push({ $or: searchFields.map((field) => ({ [field]: literal(q) })) })
  if (userId) filters.push(ownerFilter(userId))
  return filters
}
export function createAdminOperations({ db, benchmarkDb, publicJob, now = () => new Date() }: {
  db: Db; benchmarkDb?: Db; publicJob: (id: string) => Promise<Input>; now?: () => Date
}) {
  const jobs = db.collection<Input>('paperbanana_jobs')
  const feedback = db.collection<Input>('paperbanana_feedback')
  const submissions = () => {
    if (!benchmarkDb) throw new AdminError(503, '社区评估题数据库未配置，暂不可查询')
    return benchmarkDb.collection<Input>('paperbanana_benchmark_prompt_submissions')
  }
  const assertAccountAcceptingWork = async (userId: string) => {
    const head = await db.collection<Input>('paperbanana_account_deletions').findOne({ _id: `user:${userId}` } as any, { projection: { status: 1, contractVersion: 1 } })
    if (head && !(head.contractVersion === 3 && head.status === 'active')) throw new AdminError(409, '账号正在注销或等待人工复核，暂不可修改关联记录')
  }
  return {
    async ensureIndexes() {
      await Promise.all([
        jobs.createIndex({ createdAt: -1, _id: -1 }), jobs.createIndex({ userId: 1, createdAt: -1 }), jobs.createIndex({ status: 1, createdAt: -1 }),
        feedback.createIndex({ userId: 1, createdAt: -1 }), feedback.createIndex({ createdAt: -1, _id: -1 }),
        ...(benchmarkDb ? [submissions().createIndex({ userId: 1, createdAt: -1 }), submissions().createIndex({ createdAt: -1, _id: -1 })] : []),
      ])
    },
    async handle(input: Input, isAdmin: boolean): Promise<Input> {
      if (!isAdmin) throw new AdminError(403, '需要管理员身份')
      const action = String(input.action)
      if (action === 'adminOperationsOverview') {
        const window = timeFilter(input)
        const rows = await jobs.aggregate([{ $match: window }, { $group: { _id: '$status', count: { $sum: 1 } } }], { maxTimeMS: 10000 }).toArray()
        const counts = Object.fromEntries(rows.map((r) => [r._id, r.count]))
        const total = rows.reduce((n, r) => n + r.count, 0), succeeded = counts.succeeded || 0, failed = counts.failed || 0
        let community: Input = { available: false, pending: null, error: '社区评估题数据库未配置' }
        if (benchmarkDb) {
          try { community = { available: true, pending: await submissions().countDocuments({ status: { $in: OPEN_COMMUNITY_STATES } }, { maxTimeMS: 10000 }) } }
          catch { community = { available: false, pending: null, error: '社区评估题统计暂不可用' } }
        }
        return { code: 0, tasks: { total, counts, successRate: succeeded + failed ? succeeded / (succeeded + failed) : null }, community, asOf: now() }
      }
      if (action === 'adminTaskList') {
        const filters = commonFilter(input, ['_id', 'taskName', 'caption', 'userId', 'user_id', 'userEmail', 'user_email'])
        const state = option(input.status, JOB_STATES), type = option(input.type, ['generate', 'refine'])
        const model = text(input.model, 120), followup = option(input.followup, FOLLOWUP_STATES)
        if (state) filters.push({ status: state })
        if (type) filters.push(type === 'generate' ? { $or: [{ jobType: type }, { jobType: { $exists: false } }] } : { jobType: type })
        if (model) filters.push({ $or: ['mainModelName', 'imageModelName', 'referenceVisionModelName', 'modelRoutes.main.modelId', 'modelRoutes.image.modelId', 'modelRoutes.vision.modelId'].map((key) => ({ [key]: literal(model) })) })
        if (followup) filters.push(followup === 'unreviewed' ? { $or: [{ 'adminOperations.status': followup }, { 'adminOperations.status': { $exists: false } }] } : { 'adminOperations.status': followup })
        const result = await page(jobs, { $and: filters }, input, JOB_PROJECTION, jobSummary, [{ $set: { adminDuration: { $cond: [{ $and: [{ $eq: [{ $type: '$startedAt' }, 'date'] }, { $eq: [{ $type: '$completedAt' }, 'date'] }] }, { $subtract: ['$completedAt', '$startedAt'] }, null] } } }])
        return { code: 0, ...result }
      }
      if (action === 'adminTaskDetail' || action === 'adminTaskFollowup') {
        const id = text(input.id)
        const { ['adminOperations.status']: _status, ...detailProjection } = JOB_PROJECTION
        const row = await jobs.findOne({ _id: id } as any, { projection: { ...detailProjection, adminOperations: 1, error: 1 } })
        if (!row) throw new AdminError(404, '任务不存在或已随账号清理')
        if (action === 'adminTaskFollowup') {
          requireRevision(input, row)
          const status = option(input.followup, FOLLOWUP_STATES)
          const notes = safe(text(input.notes, 1000), 1000), actorId = text(input.adminUserId)
          if (!status || !notes || !actorId) throw new AdminError(400, '请选择跟进状态并填写说明')
          if ((row.adminOperations?.history || []).length >= 200) throw new AdminError(409, '处理记录已达上限，请联系维护人员')
          await assertAccountAcceptingWork(String(row.userId || row.user_id || ''))
          const event = { kind: 'followup', actorId, at: now(), fromStatus: row.adminOperations?.status || 'unreviewed', toStatus: status, notes }
          const result = await jobs.updateOne({ _id: id, ...versionFilter(row) } as any, { $set: { 'adminOperations.status': status, 'adminOperations.updatedAt': event.at }, $inc: { adminVersion: 1 }, $push: { 'adminOperations.history': event } } as any)
          if (result.modifiedCount !== 1) throw new AdminError(409, '任务已更新，请刷新后重新确认')
          return { code: 0, saved: true }
        }
        const result = await publicJob(id)
        if (result.code !== 0 || !result.job) throw new AdminError(502, '任务结果暂不可读取，请重试')
        const job = result.job
        const image = (v: Input) => ({ filename: safe(v.filename), url: /^https?:\/\//.test(String(v.url || '')) ? v.url : '', mimeType: safe(v.mimeType || v.mime_type) })
        return { code: 0, task: { ...jobSummary(row), methodContent: safe(job.methodContent, 16000), caption: safe(job.caption, 2000), negativePrompt: safe(job.negativePrompt, 2000), error: safe(row.error || job.error, 6000),
          results: (job.resultImages || []).map(image), references: (job.referenceImages || []).map(image),
          stages: (job.stages || []).map((s: Input) => ({ title: safe(s.title), type: safe(s.type), text: safe(s.text || s.description || s.message, 12000), error: safe(s.error, 4000), startedAt: s.startedAt, completedAt: s.completedAt, durationMs: Number(s.durationMs || 0), image: s.image ? image(s.image) : null })),
          logs: (Array.isArray(job.logs) ? job.logs : []).slice(-200).map((s: unknown) => safe(typeof s === 'string' ? s : JSON.stringify(s), 2000)), history: history(row.adminOperations?.history),
        } }
      }
      if (action === 'adminCommunityList') {
        const filters = commonFilter(input, ['submissionId', 'prompt', 'capability', 'adminEditedPrompt', 'adminEditedCapability', 'userId', 'digestId'])
        const state = option(input.status, [...COMMUNITY_STATES, 'open']), category = text(input.category, 120)
        if (state) filters.push({ status: state === 'open' ? { $in: OPEN_COMMUNITY_STATES } : state })
        if (category) filters.push({ $expr: { $regexMatch: { input: { $ifNull: ['$adminEditedCapability', { $ifNull: ['$capability', ''] }] }, regex: literal(category) } } })
        return { code: 0, ...await page(submissions(), { $and: filters }, input, COMMUNITY_PROJECTION, communitySummary) }
      }
      if (action === 'adminCommunityDetail') {
        const row = await submissions().findOne({ submissionId: text(input.id) }, { projection: { ...COMMUNITY_PROJECTION, adminHistory: 1 } })
        if (!row) throw new AdminError(404, '社区提交不存在或已随账号清理')
        const digests = await benchmarkDb!.collection<Input>('paperbanana_benchmark_prompt_digests').find({ sourceSubmissionIds: row.submissionId }, { projection: { _id: 0, digestId: 1, createdAt: 1, candidates: 1 } }).sort({ createdAt: -1 }).limit(21).toArray()
        return { code: 0, submission: { ...communitySummary(row), originalPrompt: safe(row.prompt, 4000), originalCapability: safe(row.capability, 1000), requiredElements: safe(row.requiredElements, 1000), forbiddenResults: safe(row.forbiddenResults, 1000), notes: safe(row.notes, 1000),
          decisionNotes: safe(row.decisionNotes, 1000), decidedBy: safe(row.decidedBy), decidedAt: row.decidedAt ?? null, history: history(row.adminHistory),
          digestHasMore: digests.length > 20, digests: digests.slice(0, 20).map((d) => ({ id: safe(d.digestId), createdAt: d.createdAt, candidates: (d.candidates || []).filter((c: Input) => c.sourceSubmissionIds?.includes(row.submissionId)).map((c: Input) => ({ id: safe(c.candidateId), prompt: safe(c.normalizedPrompt, 4000), capability: safe(c.capability, 1000), mergeReason: safe(c.mergeReason, 1000) })) })),
        } }
      }
      if (action === 'adminCommunityEdit') {
        if (input.expectedRevision === undefined) throw new AdminError(400, '缺少记录版本，请刷新后重试')
        return { code: 0, submission: await mutateCommunityPrompt(submissions(), input, { now, editOnly: true, assertAccountAcceptingWork }) }
      }
      if (action === 'adminContactMatches') {
        const q = text(input.q, 120)
        if (q.length < 3) throw new AdminError(400, '联系方式搜索至少输入 3 个字符')
        const rows = await feedback.aggregate([{ $match: { contact: literal(q), userId: { $type: 'string', $ne: '' } } }, { $group: { _id: '$userId' } }, { $limit: 2001 }], { maxTimeMS: 10000 }).toArray()
        if (rows.length > 2000) throw new AdminError(422, '匹配联系方式的用户过多，请缩小搜索范围')
        return { code: 0, userIds: rows.map((r) => String(r._id)) }
      }
      if (action === 'adminFeedbackList') {
        const filters = commonFilter(input, ['id', 'message', 'contact', 'userEmail', 'userId', 'jobId'])
        const status = text(input.status, 80)
        if (status) filters.push({ status })
        // Revealing contact is an explicit detail action scoped to one account.
        const reveal = input.revealContact === true && Boolean(text(input.userId))
        return { code: 0, ...await page(feedback, { $and: filters }, input, FEEDBACK_PROJECTION, (r) => ({ id: safe(r.id || r._id), message: safe(r.message, 2000), category: safe(r.category), jobId: safe(r.jobId), platform: safe(r.platform), userId: safe(r.userId), email: mask(r.userEmail), contact: reveal ? safe(r.contact, 300) : mask(r.contact), contactSource: 'feedback_unverified', status: safe(r.status), createdAt: r.createdAt })) }
      }
      throw new AdminError(400, '不支持的后台操作')
    },
  }
}
