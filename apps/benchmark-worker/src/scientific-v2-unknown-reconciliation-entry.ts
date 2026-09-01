import { MongoClient } from 'mongodb'

import { reconcileScientificV2UnknownNoArtifact } from './scientific-v2-unknown-reconciliation.js'
import type { ScientificV2BatchManifest, ScientificV2BatchState } from './scientific-v2-manifest.js'

const BATCHES = 'paperbanana_benchmark_scientific_v2_batches'
const DISPATCHES = 'paperbanana_benchmark_scientific_v2_dispatches'
const RECONCILIATIONS = 'paperbanana_benchmark_scientific_v2_review_artifacts'
type MongoRow = { _id: string; [key: string]: any }
const stageCodes = new Set(['ENV', 'LOAD', 'BINDING', 'LEASE', 'TRANSFORM', 'TRANSACTION', 'POST'])
function fail(stage: string): never {
  if (!stageCodes.has(stage)) throw new Error('SCIENTIFIC_V2_UNKNOWN_RECONCILIATION_FAILED_POST')
  throw new Error(`SCIENTIFIC_V2_UNKNOWN_RECONCILIATION_FAILED_${stage}`)
}

export async function runScientificV2UnknownReconciliationEntry(env: Record<string, string | undefined> = process.env) {
  const manifestHash = env.PAPERBANANA_SCIENTIFIC_V2_MANIFEST_HASH
  const expectedStateHash = env.PAPERBANANA_SCIENTIFIC_V2_EXPECTED_STATE_HASH
  const expectedCodeSha = env.PAPERBANANA_SCIENTIFIC_V2_EXPECTED_CODE_SHA
  const workflowRunId = Number(env.PAPERBANANA_SCIENTIFIC_V2_RECONCILIATION_RUN_ID)
  const mongoUri = env.PAPERBANANA_BENCH_MONGODB_URI
  const mongoDb = env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark'
  if (!manifestHash?.match(/^[a-f0-9]{64}$/) || !expectedStateHash?.match(/^[a-f0-9]{64}$/)
    || !expectedCodeSha?.match(/^[a-f0-9]{40}$/) || !Number.isSafeInteger(workflowRunId) || workflowRunId <= 0
    || !mongoUri) fail('ENV')
  let client: MongoClient
  try {
    client = new MongoClient(mongoUri)
    await client.connect()
  } catch { fail('LOAD') }
  try {
    const db = client.db(mongoDb)
    const batches = db.collection<MongoRow>(BATCHES)
    const dispatches = db.collection<MongoRow>(DISPATCHES)
    const reconciliations = db.collection<MongoRow>(RECONCILIATIONS)
    let row
    let existingAudit
    try {
      row = await batches.findOne({ manifestHash })
      const auditId = `scientific-v2-unknown-reconciliation:${manifestHash}:${expectedStateHash}`
      existingAudit = await reconciliations.findOne({ _id: auditId })
    } catch { fail('LOAD') }
    if (!row) fail('LOAD')
    if (row.manifest?.codeSha !== expectedCodeSha || row.manifestHash !== manifestHash) fail('BINDING')
    const auditId = `scientific-v2-unknown-reconciliation:${manifestHash}:${expectedStateHash}`
    if (!existingAudit) {
      if (row.stateHash !== expectedStateHash || row.status !== 'paused' || row.state?.status !== 'paused'
        || row.claimLeaseExpiresAt instanceof Date === false || row.claimLeaseExpiresAt > new Date()
        || await dispatches.countDocuments({ manifestHash, status: 'started' }) !== 0) fail('LEASE')
      const reconciledAt = new Date().toISOString()
      let transformed
      try {
        transformed = reconcileScientificV2UnknownNoArtifact(
          row.state as ScientificV2BatchState,
          row.manifest as ScientificV2BatchManifest,
          { workflowRunId, candidateCount: 0, spoolCandidateCount: 0, credentialStatus: 200, reconciledAt },
        )
      } catch { fail('TRANSFORM') }
      const session = client.startSession()
      try {
        try {
          await session.withTransaction(async () => {
            const inserted = await reconciliations.insertOne({ _id: auditId, artifactType: 'unknown_reconciliation',
              batchManifestHash: manifestHash, sourceSetHash: expectedStateHash,
              ...structuredClone(transformed.audit), createdAt: new Date() }, { session })
            if (!inserted.acknowledged) fail('TRANSACTION')
            const updated = await batches.updateOne(
              { _id: row!._id, manifestHash, stateHash: expectedStateHash, status: 'paused', claimToken: row!.claimToken,
                claimLeaseExpiresAt: row!.claimLeaseExpiresAt, 'state.status': 'paused', 'state.pauseReason': 'reconciliation_required' },
              { $set: { state: structuredClone(transformed.state), stateHash: transformed.state.stateHash,
                stateTransitionFromHash: expectedStateHash, status: 'running', updatedAt: new Date() } },
              { session },
            )
            if (updated.modifiedCount !== 1) fail('TRANSACTION')
          }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
        } catch { fail('TRANSACTION') }
      } finally { await session.endSession() }
      row = await batches.findOne({ manifestHash, stateHash: transformed.state.stateHash, status: 'running' })
    } else {
      if (existingAudit.workflowRunId !== workflowRunId || existingAudit.previousStateHash !== expectedStateHash
        || !row || row.stateHash !== existingAudit.stateHash || row.status !== 'running') fail('POST')
    }
    if (!row || row.state?.status !== 'running' || row.manifest?.codeSha !== expectedCodeSha
      || row.executionLineage !== undefined || !(row.claimLeaseExpiresAt instanceof Date) || row.claimLeaseExpiresAt > new Date()
      || await dispatches.countDocuments({ manifestHash, status: 'started' }) !== 0) fail('POST')
    const createdAt = new Date().toISOString()
    return {
      manifestCodeSha: expectedCodeSha,
      executionCodeSha: expectedCodeSha,
      legacyRecoveryStateHash: null,
      manifest: row.manifest,
      state: row.state,
      report: { batchId: row.batchId, revision: Number(row.revision || 0) + 1, createdAt },
    }
  } finally { await client.close().catch(() => undefined) }
}

void runScientificV2UnknownReconciliationEntry().then((continuation) => {
  process.stdout.write(JSON.stringify(continuation))
}).catch((error) => {
  const message = String((error as { message?: unknown })?.message || '')
  process.stderr.write(`${/^SCIENTIFIC_V2_UNKNOWN_RECONCILIATION_FAILED_[A-Z]+$/.test(message) ? message : 'SCIENTIFIC_V2_UNKNOWN_RECONCILIATION_FAILED_POST'}\n`)
  process.exitCode = 1
})
