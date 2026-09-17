import { pathToFileURL } from 'node:url'
import { MongoClient } from 'mongodb'
import { createScientificV2MongoRepository } from './scientific-v2-repository.js'

/** Uses the existing Core benchmark Mongo identity and only the repository's read-only inspector. */
export async function inspectScientificV2Lineage(env: NodeJS.ProcessEnv) {
  const releaseHash = String(env.SCIENTIFIC_V2_ACTIVE_RELEASE_HASH || '')
  const uri = String(env.PAPERBANANA_BENCH_MONGODB_URI || '')
  const secret = String(env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET || '')
  if (!/^[a-f0-9]{64}$/.test(releaseHash) || !uri || Buffer.byteLength(secret) < 32
    || Buffer.byteLength(secret) > 4096) throw new Error('SCIENTIFIC_V2_LINEAGE_INSPECTOR_INPUT_INVALID')
  const client = new MongoClient(uri, { maxPoolSize: 1, serverSelectionTimeoutMS: 15_000 })
  try {
    await client.connect()
    const db = client.db(env.PAPERBANANA_BENCH_MONGO_DB?.trim() || 'paperbanana_benchmark')
    const repository = createScientificV2MongoRepository(db, undefined, undefined, { operatorReportSecret: secret })
    return await repository.inspectPublishedGenerationSource({ releaseHash })
  } finally { await client.close() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await inspectScientificV2Lineage(process.env))}\n`) }
  catch (error) {
    const message = error instanceof Error && /^SCIENTIFIC_V2_[A-Z0-9_]{1,100}$/.test(error.message)
      ? error.message : 'SCIENTIFIC_V2_LINEAGE_INSPECTION_FAILED'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
