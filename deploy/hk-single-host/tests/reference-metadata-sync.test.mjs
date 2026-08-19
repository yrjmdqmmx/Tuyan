import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import vm from 'node:vm'
import {
  REFERENCE_METADATA_ZH_CN_V2,
  REFERENCE_METADATA_ZH_CN_V2_VERSION,
} from '../../../apps/web/src/data/reference-metadata.zh-CN.v2.js'

const root = new URL('../../../', import.meta.url)
const emitter = new URL('../scripts/emit-reference-metadata-mongosh.mjs', import.meta.url)
const rollbackEmitter = new URL('../scripts/emit-reference-metadata-rollback-mongosh.mjs', import.meta.url)
const syncScriptUrl = new URL('../scripts/sync-reference-metadata.sh', import.meta.url)
const syncScript = readFileSync(syncScriptUrl, 'utf8')
const deployScript = readFileSync(new URL('../scripts/deploy.sh', import.meta.url), 'utf8')

function matches(document, query = {}) {
  return Object.entries(query).every(([field, condition]) => {
    if (field === '$or') return condition.some((branch) => matches(document, branch))
    if (field === '$and') return condition.every((branch) => matches(document, branch))
    const actual = document[field]
    if (condition && typeof condition === 'object') {
      if ('$in' in condition && !condition.$in.includes(actual)) return false
      if ('$type' in condition && condition.$type === 'string' && typeof actual !== 'string') return false
      if ('$type' in condition && condition.$type === 'array' && !Array.isArray(actual)) return false
      if ('$ne' in condition && JSON.stringify(actual) === JSON.stringify(condition.$ne)) return false
      if ('$regex' in condition && !condition.$regex.test(String(actual ?? ''))) return false
      if ('$exists' in condition && (actual !== undefined) !== condition.$exists) return false
      if ('$not' in condition) {
        const negated = condition.$not
        if (negated && typeof negated.test === 'function') {
          if (negated.test(String(actual ?? ''))) return false
        } else if (negated && typeof negated === 'object' && matches({ [field]: actual }, { [field]: negated })) {
          return false
        }
      }
      return true
    }
    return actual === condition
  })
}

function migrationFixture() {
  const documents = new Map(REFERENCE_METADATA_ZH_CN_V2.map(({ id, taskName }, index) => [id, {
    _id: `object-id-${index + 1}`,
    id,
    taskName,
    source: 'paperbanana-bench',
    title: `Preserved English title ${id}`,
    summary: `Preserved English summary ${id}`,
    imageObjectKey: `references/bench/${taskName}/${id}.jpg`,
  }]))
  const fallback = {
    _id: 'fallback-object-id', id: 'paperbanana-style-internal', taskName: 'diagram',
    source: 'paperbanana-fallback', titleZh: '不应改变', imageObjectKey: '',
  }
  documents.set(fallback.id, fallback)
  const references = {
    countDocuments(query) {
      return [...documents.values()].filter((document) => matches(document, query)).length
    },
    distinct(field, query) {
      return [...new Set([...documents.values()].filter((document) => matches(document, query)).map((document) => document[field]))]
    },
    bulkWrite(operations) {
      let matchedCount = 0
      let modifiedCount = 0
      for (const operation of operations) {
        const { filter, update } = operation.updateOne
        const document = documents.get(filter.id)
        if (!document || !matches(document, filter)) continue
        matchedCount += 1
        const before = JSON.stringify(document)
        Object.assign(document, update.$set || {})
        for (const field of Object.keys(update.$unset || {})) delete document[field]
        if (JSON.stringify(document) !== before) modifiedCount += 1
      }
      return { matchedCount, modifiedCount }
    },
  }
  return { documents, fallback, references }
}

test('emitter produces an idempotent 306-item v2 Mongo update by business id with exact metadata postconditions', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(emitter)], { cwd: fileURLToPath(root), encoding: 'utf8' })
  assert.match(output, new RegExp(REFERENCE_METADATA_ZH_CN_V2_VERSION.replace('.', '\\.')))
  assert.match(output, /metadata\.length !== 306/)
  assert.match(output, /bulkWrite/)
  assert.match(output, /corpusVersion/)
  assert.match(output, /shortIntroZh/)
  assert.match(output, /detailZh/)
  assert.match(output, /visualCategory/)
  assert.match(output, /researchDomain/)
  assert.match(output, /keywords/)
  assert.match(output, /countDocuments/)
  assert.match(output, /distinct\("id"/)
  assert.match(output, /source: "paperbanana-bench"/)
  assert.match(output, /imageObjectKey/)
  assert.match(output, /title: \{\$type: "string", \$regex: \/\\S\/\}/)
  assert.match(output, /summary: \{\$type: "string", \$regex: \/\\S\/\}/)
  assert.match(output, /filter: \{\s*id: item\.id,\s*source: "paperbanana-bench"/)
  assert.doesNotMatch(output, /_id: \{\$in: ids\}|filter: \{_id: item\.id\}/)
  assert.doesNotMatch(output, /password|mongodb:\/\//i)

  const { documents, fallback, references } = migrationFixture()
  const run = () => {
    let summary
    vm.runInNewContext(output, {
      db: { getSiblingDB: () => ({ getCollection: () => references }) },
      print: (value) => { summary = JSON.parse(value) },
      Date,
      JSON,
      Error,
    })
    return summary
  }
  assert.equal(run().modified, 306)
  assert.equal(run().localized, 306)
  assert.equal(run().modified, 0)
  assert.equal(documents.get('ref_0').title, 'Preserved English title ref_0')
  assert.equal(documents.get('ref_0').summary, 'Preserved English summary ref_0')
  assert.equal(fallback.titleZh, '不应改变')
  assert.equal(fallback.corpusVersion, undefined)
})

test('emitter rejects duplicate business ids even when the image-backed document count is 306', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(emitter)], { cwd: fileURLToPath(root), encoding: 'utf8' })
  const ids = REFERENCE_METADATA_ZH_CN_V2.map(({ id }) => id)
  const references = {
    countDocuments() { return 306 },
    distinct(field) {
      assert.equal(field, 'id')
      return ids.slice(0, 305)
    },
    bulkWrite() { throw new Error('migration must fail before writing duplicate business ids') },
  }
  assert.throws(
    () => vm.runInNewContext(output, {
      db: { getSiblingDB: () => ({ getCollection: () => references }) }, print() {}, Date, JSON, Error,
    }),
    /306 distinct business ids/,
  )
})

test('emitter backfills only blank legacy English fields from the pinned 306-item corpus', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(emitter)], { cwd: fileURLToPath(root), encoding: 'utf8' })
  const { documents, references } = migrationFixture()
  documents.get('ref_260').summary = ''
  documents.get('ref_305').summary = '   \t'
  documents.get('ref_0').title = 'Existing curated English title'
  let result
  vm.runInNewContext(output, {
    db: { getSiblingDB: () => ({ getCollection: () => references }) },
    print: (value) => { result = JSON.parse(value) },
    Date, JSON, Error,
  })
  assert.equal(documents.get('ref_260').summary, REFERENCE_METADATA_ZH_CN_V2.find(({ id }) => id === 'ref_260').summary)
  assert.equal(documents.get('ref_305').summary, REFERENCE_METADATA_ZH_CN_V2.find(({ id }) => id === 'ref_305').summary)
  assert.equal(documents.get('ref_0').title, 'Existing curated English title')
  assert.equal(result.backfilledEnglish, 2)
  assert.equal(result.localized, 306)
})

test('emitter rejects whitespace-only image fields before counting a bench row as image-backed', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(emitter)], { cwd: fileURLToPath(root), encoding: 'utf8' })
  const { documents, references } = migrationFixture()
  documents.get('ref_0').imageObjectKey = '   \t'
  assert.throws(
    () => vm.runInNewContext(output, {
      db: { getSiblingDB: () => ({ getCollection: () => references }) }, print() {}, Date, JSON, Error,
    }),
    /expected 306 image-backed records/,
  )
  assert.equal(documents.get('ref_1').corpusVersion, undefined, 'migration must fail before writing')
})

test('emitter rejects any extra bench document tagged as the current corpus version', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(emitter)], { cwd: fileURLToPath(root), encoding: 'utf8' })
  const ids = REFERENCE_METADATA_ZH_CN_V2.map(({ id }) => id)
  const references = {
    countDocuments(query) { return query.corpusVersion && !query.id ? 307 : 306 },
    distinct() { return ids },
    bulkWrite() { return { matchedCount: 306, modifiedCount: 306 } },
  }
  assert.throws(
    () => vm.runInNewContext(output, {
      db: { getSiblingDB: () => ({ getCollection: () => references }) }, print() {}, Date, JSON, Error,
    }),
    /current corpus version contains 307 documents instead of 306/,
  )
})

test('rollback removes only v2 metadata from bench IDs without deleting documents or image fields', () => {
  const syncOutput = execFileSync(process.execPath, [fileURLToPath(emitter)], { cwd: fileURLToPath(root), encoding: 'utf8' })
  const rollbackOutput = execFileSync(process.execPath, [fileURLToPath(rollbackEmitter)], { cwd: fileURLToPath(root), encoding: 'utf8' })
  assert.match(rollbackOutput, /corpusVersion: version/)
  assert.match(rollbackOutput, /source: "paperbanana-bench"/)
  assert.match(rollbackOutput, /\$unset/)
  assert.doesNotMatch(rollbackOutput, /deleteOne|deleteMany|drop\(/)
  assert.doesNotMatch(rollbackOutput, /imageObjectKey[^\n]*\$unset|imageUrl[^\n]*\$unset/)

  const { documents, fallback, references } = migrationFixture()
  const legacyTaskName = 'legacy-custom-task'
  documents.get('ref_0').taskName = legacyTaskName
  const context = () => ({
    db: { getSiblingDB: () => ({ getCollection: () => references }) }, print() {}, Date, JSON, Error,
  })
  vm.runInNewContext(syncOutput, context())
  vm.runInNewContext(rollbackOutput, context())
  assert.equal(documents.size, 307)
  assert.equal(documents.get('ref_0').imageObjectKey, 'references/bench/plot/ref_0.jpg')
  assert.equal(documents.get('ref_0').corpusVersion, undefined)
  assert.equal(documents.get('ref_0').taskName, legacyTaskName, 'metadata sync and rollback must preserve the pre-v2 taskName')
  assert.equal(fallback.titleZh, '不应改变')
})

test('deployment sync supports an explicit rollback using secret-mounted isolated tooling before smoke', () => {
  assert.match(syncScript, /mongo_business_password/)
  assert.match(syncScript, /--authenticationDatabase paperbanana_business/)
  assert.match(syncScript, /emit-reference-metadata-mongosh\.mjs/)
  assert.match(syncScript, /emit-reference-metadata-rollback-mongosh\.mjs/)
  assert.match(syncScript, /--rollback/)
  assert.doesNotMatch(syncScript, /(?:^|\n)node\s+"\$script_dir\/emit-reference-metadata-mongosh\.mjs"/)
  assert.match(syncScript, /PAPERBANANA_CORE_IMAGE/)
  assert.match(syncScript, /docker run --rm --network none --read-only --cap-drop ALL/)
  assert.match(syncScript, /--security-opt no-new-privileges/)
  assert.match(syncScript, /reference-metadata\.zh-CN\.v2\.js:\/paperbanana\/apps\/web\/src\/data\/reference-metadata\.zh-CN\.v2\.js:ro/)
  assert.match(syncScript, /reference-metadata\.zh-CN\.v1\.js:\/paperbanana\/apps\/web\/src\/data\/reference-metadata\.zh-CN\.v1\.js:ro/)
  assert.match(syncScript, /-v "\$metadata_script:\/tmp\/paperbanana-reference-metadata\.js:ro"/)
  assert.ok(deployScript.indexOf('sync-reference-metadata.sh') < deployScript.indexOf('smoke.sh'))

  const uncoordinated = spawnSync('bash', [fileURLToPath(syncScriptUrl), '--rollback'], {
    cwd: fileURLToPath(root), encoding: 'utf8',
  })
  assert.equal(uncoordinated.status, 2)
  assert.match(uncoordinated.stderr, /legacy Core image must be active before metadata rollback/i)
})
