import type { Collection } from 'mongodb'
import { AdminError, OPEN_COMMUNITY_STATES, revision, safe, text, versionFilter, type Input } from './admin-policy.js'

// The original submission and released suites are never rewritten. The edit and
// its audit event commit together on the submission document, using compare-and-swap.
export async function mutateCommunityPrompt(collection: Collection<Input>, input: Input, {
  now = () => new Date(), editOnly = false, assertAccountAcceptingWork,
}: { now?: () => Date; editOnly?: boolean; assertAccountAcceptingWork?: (id: string) => Promise<unknown> } = {}) {
  const submissionId = text(input.submissionId, 200)
  const actorId = text(input.adminUserId, 200)
  if (!actorId) throw new AdminError(403, '需要管理员身份')
  const decision = text(input.decision)
  if (!editOnly && !['approved_for_next_suite', 'merged', 'rejected'].includes(decision)) throw new AdminError(400, '审核操作不正确')
  const row = await collection.findOne({ submissionId }, { projection: {
    submissionId: 1, status: 1, userId: 1, updatedAt: 1, adminVersion: 1, adminHistory: 1,
    prompt: 1, capability: 1, adminEditedPrompt: 1, adminEditedCapability: 1,
  } })
  if (!row) throw new AdminError(404, '社区提交不存在或已随账号清理')
  if (!OPEN_COMMUNITY_STATES.includes(row.status) || (input.expectedRevision !== undefined && input.expectedRevision !== revision(row))) throw new AdminError(409, '记录已更新或已完成审核，请刷新后重新确认')
  if ((row.adminHistory || []).length >= 200) throw new AdminError(409, '处理记录已达上限，请保留记录并联系维护人员')
  if (assertAccountAcceptingWork && row.userId) await assertAccountAcceptingWork(String(row.userId))
  const fields: Input = {}
  if (input.editedPrompt !== undefined) {
    fields.adminEditedPrompt = safe(text(input.editedPrompt, 4000), 4000)
    if (!fields.adminEditedPrompt) throw new AdminError(400, '题目内容不能为空')
  }
  if (input.editedCapability !== undefined) fields.adminEditedCapability = safe(text(input.editedCapability, 1000), 1000)
  const notes = safe(text(input.decisionNotes, 1000), 1000)
  if ((editOnly || (input.expectedRevision !== undefined && (decision === 'rejected' || decision === 'merged'))) && !notes) throw new AdminError(400, '请填写处理说明')
  const at = now()
  const changes = Object.entries(fields).map(([field, after]) => ({ field, before: safe(row[field] ?? row[field === 'adminEditedPrompt' ? 'prompt' : 'capability'], 4000), after }))
  const event = { kind: editOnly ? 'edit' : 'decision', actorId, at, fromStatus: row.status, toStatus: editOnly ? row.status : decision, notes, changes }
  const result = await collection.updateOne({ submissionId, status: row.status, ...versionFilter(row) }, {
    $set: { ...fields, updatedAt: at, ...(!editOnly ? { status: decision, decisionNotes: notes, decidedBy: actorId, decidedAt: at } : {}) },
    $inc: { adminVersion: 1 }, $push: { adminHistory: event },
  } as any)
  if (result.modifiedCount !== 1) throw new AdminError(409, '记录已被其他操作更新，请刷新后重新确认')
  return { submissionId, status: editOnly ? row.status : decision, revision: revision({ updatedAt: at, adminVersion: Number(row.adminVersion || 0) + 1 }) }
}
