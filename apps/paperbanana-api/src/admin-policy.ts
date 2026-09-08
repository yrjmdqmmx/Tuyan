import { redactAdminText } from './admin-redaction.js'

export type Input = Record<string, any>
export class AdminError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function text(value: unknown, max = 200): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string' || value.length > max) throw new AdminError(400, '字段格式或长度不正确')
  return value.trim()
}
export function safe(value: unknown, max = 200): string { return redactAdminText(String(value ?? '')).slice(0, max) }
export function mask(value: unknown): string {
  const s = safe(value, 300)
  const at = s.indexOf('@')
  return at > 0 ? `${s.slice(0, 1)}***${s.slice(at)}` : s ? `${s.slice(0, 2)}***${s.length > 6 ? s.slice(-2) : ''}` : ''
}
export function literal(value: string): RegExp { return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
export function option(value: unknown, values: string[], fallback = ''): string {
  const selected = text(value)
  if (selected && !values.includes(selected)) throw new AdminError(400, '不支持的筛选或操作')
  return selected || fallback
}
export function paging(input: Input) {
  const page = Number(input.page ?? 1), pageSize = Number(input.pageSize ?? 20)
  if (!Number.isInteger(page) || page < 1 || page > 100000 || ![10, 20, 50].includes(pageSize)) throw new AdminError(400, '分页参数不正确')
  return { page, pageSize, skip: (page - 1) * pageSize }
}
export function timeFilter(input: Input) {
  const from = text(input.from, 40), to = text(input.to, 40)
  const parse = (v: string) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v) || !Number.isFinite(Date.parse(v))) throw new AdminError(400, '时间必须为 UTC ISO 格式')
    const date = new Date(v)
    if (date.toISOString() !== (v.includes('.') ? v : `${v.slice(0, -1)}.000Z`)) throw new AdminError(400, '日期不正确')
    return date
  }
  const start = from ? parse(from) : undefined, end = to ? parse(to) : undefined
  if (start && end && start >= end) throw new AdminError(400, '结束时间必须晚于开始时间')
  return start || end ? { createdAt: { ...(start ? { $gte: start } : {}), ...(end ? { $lt: end } : {}) } } : {}
}
export const COMMUNITY_STATES = ['pending', 'grouped', 'candidate', 'approved_for_next_suite', 'merged', 'rejected']
export const OPEN_COMMUNITY_STATES = ['pending', 'grouped', 'candidate']
export const JOB_STATES = ['reserved', 'queued', 'running', 'succeeded', 'failed']
export const FOLLOWUP_STATES = ['unreviewed', 'followup', 'resolved']
export const ADMIN_OPERATIONS_ACTIONS = [
  'adminOperationsOverview', 'adminTaskList', 'adminTaskDetail', 'adminTaskFollowup',
  'adminCommunityList', 'adminCommunityDetail', 'adminCommunityEdit',
  'adminContactMatches', 'adminFeedbackList',
]
export function revision(row: Input): string { return `${row.updatedAt ? new Date(row.updatedAt).toISOString() : ''}:${Number(row.adminVersion || 0)}` }
export function versionFilter(row: Input) {
  return { updatedAt: row.updatedAt ?? { $exists: false }, adminVersion: row.adminVersion ?? { $exists: false } }
}
export function requireRevision(input: Input, row: Input) {
  if (text(input.expectedRevision, 80) !== revision(row)) throw new AdminError(409, '记录已被其他操作更新，请刷新后重新确认')
}
