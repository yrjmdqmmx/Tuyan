import {
  PB_SCIENTIFIC_FIGURE_V2,
  buildScientificV2PriceSnapshot,
  buildScientificV2CanonicalManifest,
  canonicalHash,
  deriveScientificV2PriceRequirements,
} from '@paperbanana/benchmark-core'

import { buildScientificV2Batch, type ScientificV2PriceSnapshot } from '../src/scientific-v2-manifest.js'

const CREATED_AT = '2026-08-30T00:00:00.000Z'
const LOCK_NAME = '/run/lock/paperbanana-hk-production.lock'

export function productionBatchFixture(unitCny = 1) {
  const registry = { providers: { bailian: { models: [{
    id: 'bailian-scientific-production-test', canonicalModelId: 'test:scientific-model',
    label: 'Scientific production test', vendor: 'Test vendor', selectable: true, roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
  }] } } }
  const registryHash = canonicalHash(registry)
  const canonicalManifest = buildScientificV2CanonicalManifest({ registryVersion: 'production-test-v1', registryHash, registry })
  const registryBase = { registryVersion: canonicalManifest.registryVersion, registryHash, registry }
  const registrySnapshot = { ...registryBase, snapshotHash: canonicalHash(registryBase) }
  const priceSnapshot: ScientificV2PriceSnapshot = buildScientificV2PriceSnapshot({
    canonicalManifest, capturedAt: CREATED_AT,
    observations: deriveScientificV2PriceRequirements(canonicalManifest).map((requirement) => ({
      provider: requirement.provider, modelId: requirement.modelId, operation: requirement.operation, imageSize: requirement.imageSize,
      billingRegion: 'cn-beijing', outputWidth: 2048, outputHeight: 1152,
      charges: [{ billable: 'output_image', unit: 'image', rateDecimal: String(unitCny), quantityDecimal: '1', resolutionTier: requirement.imageSize }],
      source: { url: `https://prices.example/${requirement.operation}`, mediaType: 'text/html', capturedAt: CREATED_AT, bytesSha256: 'b'.repeat(64) },
      openRouterEvidence: null, fxEvidence: null,
    })),
  })
  return buildScientificV2Batch({
    canonicalManifest, registrySnapshot, suite: PB_SCIENTIFIC_FIGURE_V2,
    codeSha: 'a'.repeat(40), priceSnapshot, createdAt: CREATED_AT, lockName: LOCK_NAME,
  })
}

type Row = Record<string, any>

function pathValue(row: Row, path: string) {
  return path.split('.').reduce<any>((value, key) => value?.[key], row)
}

function matches(row: Row, query: Row): boolean {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return (expected as Row[]).some((candidate) => matches(row, candidate))
    const actual = pathValue(row, key)
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
      if ('$exists' in expected) return (actual !== undefined) === expected.$exists
      if ('$lte' in expected) return actual instanceof Date && actual <= expected.$lte
      if ('$gt' in expected) return actual instanceof Date && actual > expected.$gt
    }
    return actual === expected
  })
}

function setPath(row: Row, path: string, value: unknown) {
  const parts = path.split('.')
  let target = row
  for (const part of parts.slice(0, -1)) target = target[part] ||= {}
  target[parts.at(-1)!] = structuredClone(value)
}

function unsetPath(row: Row, path: string) {
  const parts = path.split('.')
  let target = row
  for (const part of parts.slice(0, -1)) target = target?.[part]
  if (target) delete target[parts.at(-1)!]
}

export function productionAtomicDb(fixture = productionBatchFixture()) {
  const rows = new Map<string, Row[]>([
    ['paperbanana_benchmark_scientific_v2_batches', [{
      _id: 'scientific-v2-production-batch', batchId: 'scientific-v2-production-batch',
      manifestHash: fixture.manifest.manifestHash, manifest: structuredClone(fixture.manifest),
      stateHash: fixture.state.stateHash, state: structuredClone(fixture.state), status: 'ready', revision: 0,
    }]],
    ['paperbanana_benchmark_scientific_v2_dispatches', []],
  ])
  let loseCommitAck = false
  let transactionDepth = 0
  let transactionCallsWithoutSession = 0
  let failDispatchUpdate = false
  const findOneAndUpdateCalls: Array<{ collection: string; query: Row; update: Row }> = []
  const collection = (name: string) => {
    const documents = rows.get(name) || []
    rows.set(name, documents)
    return {
      async findOne(query: Row, options: Row = {}) {
        if (transactionDepth && !options.session) transactionCallsWithoutSession += 1
        const found = documents.find((row) => matches(row, query))
        return found ? structuredClone(found) : null
      },
      async findOneAndUpdate(query: Row, update: Row, options: Row = {}) {
        findOneAndUpdateCalls.push({ collection: name, query: structuredClone(query), update: structuredClone(update) })
        let found = documents.find((row) => matches(row, query))
        if (!found && options.upsert) {
          const id = query._id
          if (documents.some((row) => row._id === id)) {
            const error = Object.assign(new Error('duplicate key'), { code: 11000 })
            throw error
          }
          found = { _id: id }
          documents.push(found)
          for (const [path, value] of Object.entries(update.$setOnInsert || {})) setPath(found, path, value)
        }
        if (!found) return null
        for (const [path, value] of Object.entries(update.$set || {})) setPath(found, path, value)
        for (const path of Object.keys(update.$unset || {})) unsetPath(found, path)
        return structuredClone(found)
      },
      async updateOne(query: Row, update: Row, options: Row = {}) {
        if (transactionDepth && !options.session) transactionCallsWithoutSession += 1
        if (name === 'paperbanana_benchmark_scientific_v2_dispatches' && failDispatchUpdate
          && ['committed', 'unknown'].includes(update.$set?.status)) {
          failDispatchUpdate = false
          throw new Error('SIMULATED_DISPATCH_UPDATE_FAILURE')
        }
        const found = documents.find((row) => matches(row, query))
        if (!found) return { matchedCount: 0, modifiedCount: 0 }
        for (const [path, value] of Object.entries(update.$set || {})) setPath(found, path, value)
        for (const path of Object.keys(update.$unset || {})) unsetPath(found, path)
        return { matchedCount: 1, modifiedCount: 1 }
      },
      async insertOne(document: Row) {
        if (documents.some((row) => row._id === document._id)) throw Object.assign(new Error('duplicate key'), { code: 11000 })
        documents.push(structuredClone(document))
        return { acknowledged: true, insertedId: document._id }
      },
    }
  }
  const db = {
    collection,
    client: {
      startSession() {
        return {
          async withTransaction(operation: () => Promise<void>) {
            const snapshot = structuredClone([...rows.entries()])
            transactionDepth += 1
            try { await operation() }
            catch (error) {
              const snapshotRows = new Map(snapshot)
              for (const [name, documents] of rows) {
                documents.splice(0, documents.length, ...structuredClone(snapshotRows.get(name) || []))
              }
              for (const [name, documents] of snapshot) {
                if (!rows.has(name)) rows.set(name, structuredClone(documents))
              }
              throw error
            } finally {
              transactionDepth -= 1
            }
            if (loseCommitAck) {
              loseCommitAck = false
              throw new Error('SIMULATED_ACK_LOSS')
            }
          },
          async endSession() {},
        }
      },
    },
  }
  return {
    db, rows,
    loseNextCommitAck() { loseCommitAck = true },
    failNextDispatchUpdate() { failDispatchUpdate = true },
    transactionCallsWithoutSession() { return transactionCallsWithoutSession },
    findOneAndUpdateCalls,
  }
}
