import { MongoClient } from 'mongodb'

import { reconcileScientificV2UnknownNoArtifact } from './scientific-v2-unknown-reconciliation.js'
import type { ScientificV2BatchManifest, ScientificV2BatchState } from './scientific-v2-manifest.js'

const BATCHES = 'paperbanana_benchmark_scientific_v2_batches'
const DISPATCHES = 'paperbanana_benchmark_scientific_v2_dispatches'
const RECONCILIATIONS = 'paperbanana_benchmark_scientific_v2_reconciliations'
type MongoRow = { _id: string; [key: string]: any }
function fail(): never { throw new Error('SCIENTIFIC_V2_UNKNOWN_RECONCILIATION_ENTRY_INVALID') }

export async function runScientificV2UnknownReconciliationEntry(env: Record<string, string | undefined> = process.env) {
  const manifestHash = env.PAPERBANANA_SCIENTIFIC_V2_MANIFEST_HASH
  const expectedStateHash = env.PAPERBANANA_SCIENTIFIC_V2_EXPECTED_STATE_HASH
  const expectedCodeSha = env.PAPERBANANA_SCIENTIFIC_V2_EXPECTED_CODE_SHA
  const workflowRunId = Number(env.PAPERBANANA_SCIENTIFIC_V2_RECONCILIATION_RUN_ID)
  const mongoUri = env.PAPERBANANA_BENCH_MONGODB_URI
  const mongoDb = env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark'
  const signingSecret = env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET
  if (!manifestHash?.match(/^[a-f0-9]{64}$/) || !expectedStateHash?.match(/^[a-f0-9]{64}$/)
    || !expectedCodeSha?.match(/^[a-f0-9]{40}$/) || !Number.isSafeInteger(workflowRunId) || workflowRunId <= 0
    || !mongoUri || !signingSecret || Buffer.byteLength(signingSecret) < 32 || Buffer.byteLength(signingSecret) > 4096) fail()
  const client = new MongoClient(mongoUri)
  await client.connect()
  try {
    const db = client.db(mongoDb)
    const batches = db.collection<MongoRow>(BATCHES)
    const dispatches = db.collection<MongoRow>(DISPATCHES)
    const reconciliations = db.collection<MongoRow>(RECONCILIATIONS)
    let row = await batches.findOne({ manifestHash })
    if (!row || row.manifest?.codeSha !== expectedCodeSha || row.manifestHash !== manifestHash) fail()
    const auditId = `scientific-v2-unknown-reconciliation:${manifestHash}:${expectedStateHash}`
    const existingAudit = await reconciliations.findOne({ _id: auditId })
    if (!existingAudit) {
      if (row.stateHash !== expectedStateHash || row.status !== 'paused' || row.state?.status !== 'paused'
        || row.claimLeaseExpiresAt instanceof Date === false || row.claimLeaseExpiresAt > new Date()
        || await dispatches.countDocuments({ manifestHash, status: 'started' }) !== 0) fail()
      const reconciledAt = new Date().toISOString()
      const transformed = reconcileScientificV2UnknownNoArtifact(
        row.state as ScientificV2BatchState,
        row.manifest as ScientificV2BatchManifest,
        { workflowRunId, candidateCount: 0, spoolCandidateCount: 0, credentialStatus: 200, reconciledAt },
      )
      const session = client.startSession()
      try {
        await session.withTransaction(async () => {
          const inserted = await reconciliations.insertOne({ _id: auditId, ...structuredClone(transformed.audit), createdAt: new Date() }, { session })
          if (!inserted.acknowledged) fail()
          const updated = await batches.updateOne(
            { _id: row!._id, manifestHash, stateHash: expectedStateHash, status: 'paused', claimToken: row!.claimToken,
              claimLeaseExpiresAt: row!.claimLeaseExpiresAt, 'state.status': 'paused', 'state.pauseReason': 'reconciliation_required' },
            { $set: { state: structuredClone(transformed.state), stateHash: transformed.state.stateHash,
              stateTransitionFromHash: expectedStateHash, status: 'running', updatedAt: new Date() } },
            { session },
          )
          if (updated.modifiedCount !== 1) fail()
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
      } finally { await session.endSession() }
      row = await batches.findOne({ manifestHash, stateHash: transformed.state.stateHash, status: 'running' })
    } else {
      if (existingAudit.workflowRunId !== workflowRunId || existingAudit.previousStateHash !== expectedStateHash
        || !row || row.stateHash !== existingAudit.stateHash || row.status !== 'running') fail()
    }
    if (!row || row.state?.status !== 'running' || row.manifest?.codeSha !== expectedCodeSha
      || row.executionLineage !== undefined || !(row.claimLeaseExpiresAt instanceof Date) || row.claimLeaseExpiresAt > new Date()
      || await dispatches.countDocuments({ manifestHash, status: 'started' }) !== 0) fail()
    const createdAt = new Date().toISOString()
    const bundle = {
      operation: 'run',
      gate: { enabled: false, concurrency: 1, lockName: '/run/lock/paperbanana-hk-production.lock' },
      executionPhase: 'full',
      manifestCodeSha: expectedCodeSha,
      executionCodeSha: expectedCodeSha,
      legacyRecoveryStateHash: null,
      manifest: row.manifest,
      state: row.state,
      report: { batchId: row.batchId, revision: Number(row.revision || 0) + 1, createdAt, attestationSecret: signingSecret },
    }
    return bundle
  } finally { await client.close() }
}

void runScientificV2UnknownReconciliationEntry().then((bundle) => {
  process.stdout.write(JSON.stringify(bundle))
}).catch(() => {
  process.stderr.write('SCIENTIFIC_V2_UNKNOWN_RECONCILIATION_FAILED\n')
  process.exitCode = 1
})
