import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import vm from 'node:vm'
import { REFERENCE_METADATA_ZH_CN } from '../../../apps/web/src/data/reference-metadata.zh-CN.v1.js'

const root = new URL('../../../', import.meta.url)
const emitter = new URL('../scripts/emit-reference-metadata-mongosh.mjs', import.meta.url)
const syncScript = readFileSync(new URL('../scripts/sync-reference-metadata.sh', import.meta.url), 'utf8')
const deployScript = readFileSync(new URL('../scripts/deploy.sh', import.meta.url), 'utf8')

test('emitter produces a versioned 295-item idempotent Mongo update with postcondition checks', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(emitter)], { cwd: fileURLToPath(root), encoding: 'utf8' })
  assert.match(output, /2026-08-19\.v1/)
  assert.match(output, /metadata\.length !== 295/)
  assert.match(output, /bulkWrite/)
  assert.match(output, /localizationVersion/)
  assert.match(output, /countDocuments/)
  assert.match(output, /countDocuments\(\{id: \{\$in: ids\}\}\)/)
  assert.match(output, /filter: \{\s*id: item\.id,\s*\$or:/)
  assert.doesNotMatch(output, /_id: \{\$in: ids\}|filter: \{_id: item\.id\}/)
  assert.doesNotMatch(output, /password|mongodb:\/\//i)

  const documents = new Map(REFERENCE_METADATA_ZH_CN.map(({ id }, index) => [id, { _id: `object-id-${index + 1}`, id }]))
  const run = () => {
    let summary
    const references = {
      countDocuments(query) {
        const ids = query?.id?.$in || []
        return ids.filter((id) => {
          const document = documents.get(id)
          if (!document) return false
          if (query.localizationVersion && document.localizationVersion !== query.localizationVersion) return false
          if (query.titleZh && !document.titleZh) return false
          if (query.introZh && !document.introZh) return false
          return true
        }).length
      },
      bulkWrite(operations) {
        let modifiedCount = 0
        for (const operation of operations) {
          const { filter, update } = operation.updateOne
          const document = documents.get(filter.id)
          if (!document) continue
          const differs = (filter.$or || []).some((condition) => {
            const [field, predicate] = Object.entries(condition)[0]
            return document[field] !== predicate.$ne
          })
          if (!differs) continue
          Object.assign(document, update.$set)
          modifiedCount += 1
        }
        return { matchedCount: operations.length, modifiedCount }
      },
    }
    vm.runInNewContext(output, {
      db: { getSiblingDB: () => ({ getCollection: () => references }) },
      print: (value) => { summary = JSON.parse(value) },
      Date,
      JSON,
      Error,
    })
    return summary
  }
  assert.equal(run().modified, 295)
  assert.equal(run().modified, 0)
})

test('deployment syncs metadata through the secret-mounted mongo-init container before smoke', () => {
  assert.match(syncScript, /mongo_business_password/)
  assert.match(syncScript, /--authenticationDatabase paperbanana_business/)
  assert.match(syncScript, /emit-reference-metadata-mongosh\.mjs/)
  assert.doesNotMatch(syncScript, /(?:^|\n)node\s+"\$script_dir\/emit-reference-metadata-mongosh\.mjs"/)
  assert.match(syncScript, /PAPERBANANA_CORE_IMAGE/)
  assert.match(syncScript, /docker run --rm --network none --read-only --cap-drop ALL/)
  assert.match(syncScript, /--security-opt no-new-privileges/)
  assert.match(syncScript, /reference-metadata\.zh-CN\.v1\.js:\/paperbanana\/apps\/web\/src\/data\/reference-metadata\.zh-CN\.v1\.js:ro/)
  assert.match(syncScript, /\/paperbanana\/deploy\/hk-single-host\/scripts\/emit-reference-metadata-mongosh\.mjs/)
  assert.match(syncScript, /-v "\$metadata_script:\/tmp\/paperbanana-reference-metadata\.js:ro"/)
  assert.ok(deployScript.indexOf('sync-reference-metadata.sh') < deployScript.indexOf('smoke.sh'))
})
