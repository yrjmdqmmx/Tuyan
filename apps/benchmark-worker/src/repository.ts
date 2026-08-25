import { canonicalHash } from '@paperbanana/benchmark-core'

interface WorkItem {
  runId: string
  workId: string
  leaseOwner?: string
  leaseUntil?: number
  completed?: boolean
}

export function benchmarkIdempotencyKey(kind: 'sample' | 'judgment', parts: readonly (string | number)[]) {
  return `${kind}:${canonicalHash(parts)}`
}

export class InMemoryBenchmarkRepository {
  private readonly queue = new Map<string, WorkItem>()
  constructor(private readonly now: () => number = Date.now) {}

  async enqueue(item: Pick<WorkItem, 'runId' | 'workId'>) {
    if (!this.queue.has(item.workId)) this.queue.set(item.workId, { ...item })
  }

  async acquire(workerId: string, leaseMs: number) {
    const timestamp = this.now()
    const item = [...this.queue.values()].find((candidate) =>
      !candidate.completed && (!candidate.leaseUntil || candidate.leaseUntil <= timestamp))
    if (!item) return null
    item.leaseOwner = workerId
    item.leaseUntil = timestamp + leaseMs
    return { ...item }
  }

  async heartbeat(workId: string, workerId: string, leaseMs: number) {
    const item = this.queue.get(workId)
    if (!item || item.completed || item.leaseOwner !== workerId || (item.leaseUntil || 0) <= this.now()) return false
    item.leaseUntil = this.now() + leaseMs
    return true
  }

  async complete(workId: string, workerId: string) {
    const item = this.queue.get(workId)
    if (!item || item.leaseOwner !== workerId) return false
    item.completed = true
    return true
  }
}
