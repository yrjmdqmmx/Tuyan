import { MongoClient, type Db } from 'mongodb'

type MongoConfig = {
  uri: string
  database: string
}

type UpdateManyCollection = {
  updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount: number }>
}

type MongoClientLike = {
  db(name: string): Db
  connect(): Promise<unknown>
  close(): Promise<unknown>
}

export async function reconcileInterruptedJobs(
  collection: UpdateManyCollection,
  now = new Date(),
): Promise<number> {
  const result = await collection.updateMany(
    { status: { $in: ['queued', 'running'] } },
    {
      $set: {
        status: 'failed',
        error: 'Service restarted before this job completed. Retry the request.',
        errorCode: 'RUNTIME_RESTARTED_RETRY',
        retryable: true,
        completedAt: now,
        updatedAt: now,
      },
    },
  )
  return result.modifiedCount
}

export function createMongoAdapter(
  config: MongoConfig,
  dependencies: { client?: MongoClientLike } = {},
) {
  const client = dependencies.client || new MongoClient(config.uri)
  const db = client.db(config.database)

  return {
    db,
    async connect(): Promise<void> {
      await client.connect()
    },
    async probe(): Promise<void> {
      await db.command({ ping: 1 })
    },
    async reconcileInterruptedJobs(now = new Date()): Promise<number> {
      return reconcileInterruptedJobs(db.collection('paperbanana_jobs'), now)
    },
    async close(): Promise<void> {
      await client.close()
    },
  }
}

export type MongoAdapter = ReturnType<typeof createMongoAdapter>
