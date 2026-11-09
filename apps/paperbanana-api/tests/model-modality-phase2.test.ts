import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { assertPhase2Facts, evidence, phase2Registry } from '../../../test-support/phase2-modality.mjs'
import { auditedModelSpecs, removedModel } from '../../../packages/api/src/model-audit.js'
import { exactModelDetails } from '../../../packages/api/src/provider-catalog.js'
import base from '../../../packages/api/src/provider-model-details.js'

test('phase 2 production bundle dependencies are all included in the Core Docker build context', async () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url)), packageRoot = path.join(root, 'apps/paperbanana-api')
  const dockerfile = fs.readFileSync(path.join(packageRoot, 'Dockerfile'), 'utf8')
  const copies = dockerfile.split('\n').filter(line => line.startsWith('COPY ') && !line.includes('--from='))
    .flatMap(line => line.trim().split(/\s+/).slice(1, -1)).map(source => path.resolve(root, source))
  const result = await build({entryPoints:['src/main.ts'],absWorkingDir:packageRoot,bundle:true,platform:'node',target:'node24',format:'cjs',write:false,metafile:true,logLevel:'silent',
    alias:{'jpeg-js':'./node_modules/jpeg-js'},external:['@resvg/resvg-wasm','ali-oss','express','mongodb','sharp']})
  const inputs = Object.keys(result.metafile!.inputs).map(input => path.resolve(packageRoot, input)).filter(input => !input.includes('/node_modules/'))
  assert.ok(inputs.includes(path.join(root, 'packages/api/src/model-card-projection.mjs')))
  for (const input of inputs) assert.ok(copies.some(source => input === source || input.startsWith(source + path.sep)), `Docker COPY missing ${path.relative(root, input)}`)
})

test('phase 2 Core channel tables and partial masks survive full registry enrichment without mutating base records', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-09T12:00:00Z'))
  const before = JSON.stringify(base), registry = await phase2Registry()
  const models = new Map<string, any>(Object.entries(registry.providers).flatMap(([channel, provider]: [string, any]) => provider.models.map((model: any) => [channel+'/'+model.id, model])))
  assert.equal(models.size, 1061)
  assertPhase2Facts(key => models.get(key).cardSpecifications)
  for (const [key, row] of Object.entries(evidence.tables) as [string, any][]) {
    const id = key.slice('bailian/'.length)
    for (const field of ['inputModalities','outputModalities']) {
      assert.deepEqual(auditedModelSpecs('bailian',id).fields[field].value, row[field])
      assert.deepEqual(exactModelDetails('bailian',id).specifications.modalityFacts[field].value, row[field])
      assert.deepEqual(models.get(key)[field], row[field])
    }
  }
  for (const key of Object.keys(evidence.links)) {
    assert.ok(models.has(key), key)
    const slash = key.indexOf('/')
    assert.equal(removedModel(key.slice(0,slash),key.slice(slash+1)), null)
    assert.equal(auditedModelSpecs(key.slice(0,slash),key.slice(slash+1)).unverified, true)
  }
  assert.equal(JSON.stringify(base), before)
})
