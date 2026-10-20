import type { Db } from 'mongodb'

/** Cheap cached read-only aggregates. No documents, owners, prompts or provider keys leave Mongo. */
export function createDatabaseObservation(db: Db, now = Date.now) {
  let cached: unknown
  let expiresAt = 0
  let pending: Promise<unknown> | undefined
  async function collect() {
    const sampledAt = new Date(now()).toISOString()
    const settled = await Promise.allSettled([
      db.command({ serverStatus: 1, maxTimeMS: 1000 }),
      db.collection('paperbanana_jobs').aggregate([
        { $match: { status: { $in: ['queued', 'running', 'awaiting_provider'] } } },
        { $group: { _id: '$status', count: { $sum: 1 }, oldest: { $min: '$createdAt' } } },
      ], { maxTimeMS: 1000 }).toArray(),
    ])
    const server = settled[0].status === 'fulfilled' ? settled[0].value as any : null
    const jobs = settled[1].status === 'fulfilled' ? settled[1].value as any[] : null
    return {
      sampledAt,
      server: server ? { available: true, uptimeSeconds: server.uptime,
        connections: { current: server.connections?.current, available: server.connections?.available },
        residentMiB: server.mem?.resident,
        cacheBytes: server.wiredTiger?.cache?.['bytes currently in the cache'],
        cacheMaxBytes: server.wiredTiger?.cache?.['maximum bytes configured'],
        queuedReaders: server.globalLock?.currentQueue?.readers, queuedWriters: server.globalLock?.currentQueue?.writers,
      } : { available: false, reason: 'permission_or_probe_unavailable' },
      jobs: jobs ? { available: true, states: Object.fromEntries(['queued', 'running', 'awaiting_provider'].map(state => {
        const row = jobs.find(row => row._id === state), oldest = row?.oldest ? new Date(row.oldest).getTime() : NaN
        return [state, { count: row?.count || 0, oldestAgeSeconds: Number.isFinite(oldest) ? Math.max(0, (now() - oldest) / 1000) : null }]
      })) } : { available: false, reason: 'probe_unavailable' },
    }
  }
  return () => {
    if (cached && now() < expiresAt) return Promise.resolve(cached)
    if (!pending) pending = collect().then(value => { cached = value; expiresAt = now() + 15000; return value }).finally(() => { pending = undefined })
    return pending
  }
}
