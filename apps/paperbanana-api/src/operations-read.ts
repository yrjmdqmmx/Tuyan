import type { Db } from 'mongodb'
import { parseOpsQuery, JOB_STATES, FAILURE_CATEGORIES, FAILURE_STAGES, REQUEST_STATES } from '../../../packages/api/src/ops-read-contract.mjs'

/** Only aggregate counts. No records, user identifiers or free-text errors leave Mongo. */
export function createOperationsRead(db: Db, now = Date.now) {
  const jobs = db.collection('paperbanana_jobs')
  const group = (field: string, allowed: string[]) => [
    { $group: { _id: { $cond: [{ $in: [field, allowed] }, field, 'unknown'] }, count: { $sum: 1 } } },
  ]
  const counts = (rows: any[], allowed: string[]) => Object.fromEntries(allowed.map(key => [key, rows.find(row => row._id === key)?.count || 0]))
  return async (kind: 'overview' | 'failures', input: unknown) => {
    const window = parseOpsQuery(kind, input, now())
    const match = { createdAt: { $gte: new Date(window.from!), $lt: new Date(window.to!) } }
    const sampledAt = new Date(now()).toISOString()
    if (kind === 'overview') {
      const rows = await jobs.aggregate([{ $match: match }, ...group('$status', JOB_STATES)], { maxTimeMS: 5000 }).toArray()
      return { sampledAt, counts: counts(rows, JOB_STATES) }
    }
    const [row] = await jobs.aggregate([
      { $match: { ...match, status: 'failed' } },
      { $facet: {
        categories: group('$failure.category', FAILURE_CATEGORIES),
        stages: group('$failure.stage', FAILURE_STAGES),
        requestStates: group('$failure.requestState', REQUEST_STATES),
      } },
    ], { maxTimeMS: 5000 }).toArray()
    return { sampledAt, categories: counts(row?.categories || [], FAILURE_CATEGORIES),
      stages: counts(row?.stages || [], FAILURE_STAGES), requestStates: counts(row?.requestStates || [], REQUEST_STATES) }
  }
}
