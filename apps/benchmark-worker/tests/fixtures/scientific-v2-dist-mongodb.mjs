import { readFileSync } from 'node:fs'

const bundle = JSON.parse(readFileSync(process.env.PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH, 'utf8'))
const rows = new Map([
  ['paperbanana_benchmark_scientific_v2_batches', [{
    _id: 'scientific-v2-dist-batch', batchId: bundle.report.batchId,
    manifestHash: bundle.manifest.manifestHash, manifest: structuredClone(bundle.manifest),
    stateHash: bundle.state.stateHash, state: structuredClone(bundle.state), status: 'ready',
  }]],
  ['paperbanana_benchmark_scientific_v2_dispatches', []],
])

function pathValue(row, path) {
  return path.split('.').reduce((value, key) => value?.[key], row)
}

function matches(row, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((candidate) => matches(row, candidate))
    const actual = pathValue(row, key)
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
      if ('$exists' in expected) return (actual !== undefined) === expected.$exists
      if ('$lte' in expected) return actual instanceof Date && actual <= expected.$lte
      if ('$gt' in expected) return actual instanceof Date && actual > expected.$gt
    }
    return actual === expected
  })
}

function setPath(row, path, value) {
  const parts = path.split('.')
  let target = row
  for (const part of parts.slice(0, -1)) target = target[part] ||= {}
  target[parts.at(-1)] = structuredClone(value)
}

function unsetPath(row, path) {
  const parts = path.split('.')
  let target = row
  for (const part of parts.slice(0, -1)) target = target?.[part]
  if (target) delete target[parts.at(-1)]
}

function collection(name) {
  const documents = rows.get(name) || []
  rows.set(name, documents)
  return {
    async findOne(query) {
      const found = documents.find((row) => matches(row, query))
      return found ? structuredClone(found) : null
    },
    async findOneAndUpdate(query, update, options = {}) {
      let found = documents.find((row) => matches(row, query))
      if (!found && options.upsert) {
        if (documents.some((row) => row._id === query._id)) throw Object.assign(new Error('duplicate key'), { code: 11000 })
        found = { _id: query._id }
        documents.push(found)
        for (const [path, value] of Object.entries(update.$setOnInsert || {})) setPath(found, path, value)
      }
      if (!found) return null
      for (const [path, value] of Object.entries(update.$set || {})) setPath(found, path, value)
      for (const path of Object.keys(update.$unset || {})) unsetPath(found, path)
      return structuredClone(found)
    },
    async updateOne(query, update) {
      const found = documents.find((row) => matches(row, query))
      if (!found) return { modifiedCount: 0 }
      for (const [path, value] of Object.entries(update.$set || {})) setPath(found, path, value)
      for (const path of Object.keys(update.$unset || {})) unsetPath(found, path)
      return { modifiedCount: 1 }
    },
    async insertOne(document) {
      if (documents.some((row) => row._id === document._id)) throw Object.assign(new Error('duplicate key'), { code: 11000 })
      documents.push(structuredClone(document))
      return { acknowledged: true }
    },
  }
}

const db = {
  collection,
  client: {
    startSession() {
      return {
        async withTransaction(operation) { await operation() },
        async endSession() {},
      }
    },
  },
}

export class MongoClient {
  async connect() {}
  db() { return db }
  async close() {}
}
