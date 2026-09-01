import { canonicalHash } from '@paperbanana/benchmark-core'
import OSS from 'ali-oss'
import { MongoClient } from 'mongodb'

import { buildV1RetirementInventory, deleteExclusiveV1Objects } from './v1-retirement.js'

type AnyRecord = Record<string, any>
const env = process.env

function required(name: string) {
  const value = String(env[name] || '').trim()
  if (!value) throw new Error('V1_RETIREMENT_INPUT_INVALID')
  return value
}

function missingObject(error: any) {
  return Number(error?.status) === 404 || Number(error?.statusCode) === 404 || ['NoSuchKey', 'NoSuchObject'].includes(String(error?.code || ''))
}

async function main() {
  const mode = required('PAPERBANANA_V1_RETIREMENT_MODE')
  if (!['inspect', 'delete-objects'].includes(mode)
    || env.PAPERBANANA_BENCH_ENABLED !== 'false' || env.PAPERBANANA_BENCH_CONCURRENCY !== '1') {
    throw new Error('V1_RETIREMENT_WORKER_GUARD')
  }
  const releaseHash = required('PAPERBANANA_V1_RETIREMENT_RELEASE_HASH').toLowerCase()
  const activeV2ReleaseHash = required('PAPERBANANA_V1_RETIREMENT_ACTIVE_V2_RELEASE_HASH').toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(releaseHash) || !/^[a-f0-9]{64}$/.test(activeV2ReleaseHash)) throw new Error('V1_RETIREMENT_INPUT_INVALID')
  if (mode === 'delete-objects' && required('PAPERBANANA_V1_RETIREMENT_CONFIRM') !== 'delete-v1-release-2688db534f05256b6ce2-disabled-worker') {
    throw new Error('V1_RETIREMENT_INPUT_INVALID')
  }

  const client = new MongoClient(required('PAPERBANANA_BENCH_MONGODB_URI'), {
    serverSelectionTimeoutMS: 10_000, connectTimeoutMS: 10_000, socketTimeoutMS: 30_000, waitQueueTimeoutMS: 10_000,
  })
  const oss = new OSS({
    region: required('PAPERBANANA_BENCH_OSS_REGION'),
    accessKeyId: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID'),
    accessKeySecret: required('PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET'),
    bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
    endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'),
    secure: true,
    authorizationV4: true,
  })
  const deleteOss = mode === 'delete-objects' ? new OSS({
    region: required('PAPERBANANA_BENCH_OSS_REGION'),
    accessKeyId: required('PAPERBANANA_V1_RETIREMENT_DELETE_OSS_ACCESS_KEY_ID'),
    accessKeySecret: required('PAPERBANANA_V1_RETIREMENT_DELETE_OSS_ACCESS_KEY_SECRET'),
    bucket: required('PAPERBANANA_BENCH_OSS_BUCKET'),
    endpoint: required('PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT'),
    secure: true,
    authorizationV4: true,
  }) : null
  try {
    await client.connect()
    const db = client.db(env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark')
    const releases = await db.collection<AnyRecord>('paperbanana_benchmark_releases').find({}).maxTimeMS(30_000).toArray()
    const activeV2 = releases.filter((release) => release.releaseHash === activeV2ReleaseHash)
    if (activeV2.length !== 1 || activeV2[0].suiteId !== 'pb-scientific-figure-v2'
      || activeV2[0].evaluationMode !== 'codex_scientific_v2' || activeV2[0].profileStatus !== 'published') {
      throw new Error('V1_RETIREMENT_ACTIVE_V2_INVALID')
    }
    const [runs, samples, judgments, dispatches, publicEvidence, otherEvidence] = await Promise.all([
      db.collection<AnyRecord>('paperbanana_benchmark_runs').find({}).maxTimeMS(30_000).toArray(),
      db.collection<AnyRecord>('paperbanana_benchmark_samples').find({}).maxTimeMS(30_000).toArray(),
      db.collection<AnyRecord>('paperbanana_benchmark_judgments').find({}).maxTimeMS(30_000).toArray(),
      db.collection<AnyRecord>('paperbanana_benchmark_dispatches').find({}).maxTimeMS(30_000).toArray(),
      db.collection<AnyRecord>('paperbanana_benchmark_public_evidence').find({}).maxTimeMS(30_000).toArray(),
      db.collection<AnyRecord>('paperbanana_benchmark_scientific_v2_public_evidence').find({}).maxTimeMS(30_000).toArray(),
    ])
    const inventory = await buildV1RetirementInventory({
      expectedReleaseHash: releaseHash,
      releases, runs, samples, judgments, dispatches, publicEvidence, otherEvidence,
      readObject: async (objectKey) => Buffer.from((await oss.get(objectKey)).content),
    })
    let objectDeletion = null
    if (mode === 'delete-objects') {
      const expectedInventoryHash = required('PAPERBANANA_V1_RETIREMENT_INVENTORY_HASH').toLowerCase()
      const probeKey = `bench/retirement-probes/${expectedInventoryHash}.capability`
      const confirmMissing = async (objectKey: string, code: string) => {
        try {
          await oss.head(objectKey)
          throw new Error(code)
        } catch (error: any) {
          if (!missingObject(error)) throw error
        }
      }
      objectDeletion = await deleteExclusiveV1Objects(inventory, expectedInventoryHash, {
        preflight: async () => {
          await confirmMissing(probeKey, 'V1_RETIREMENT_DELETE_PROBE_COLLISION')
          await deleteOss!.delete(probeKey)
          await confirmMissing(probeKey, 'V1_RETIREMENT_DELETE_PROBE_UNCONFIRMED')
        },
        deleteObject: async (objectKey) => {
          await deleteOss!.delete(objectKey)
          await confirmMissing(objectKey, 'V1_RETIREMENT_OBJECT_DELETE_UNCONFIRMED')
        },
      })
    }
    const reportBase = {
      schemaVersion: 1,
      mode,
      releaseHash,
      activeV2ReleaseHash,
      inventory,
      objectDeletion,
      generatedOrJudgeCalls: 0,
    }
    process.stdout.write(`${JSON.stringify({ ...reportBase, reportHash: canonicalHash(reportBase) })}\n`)
  } finally {
    await client.close(true).catch(() => {})
  }
}

await main()
