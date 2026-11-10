// Read-only baseline generation: git show 8c456709:<path>, bundled/evaluated in
// memory with a fixed clock, empty environment and mocked metadata transport.
import fs from 'node:fs'
import { gzipSync, gunzipSync } from 'node:zlib'
import path from 'node:path'
import assert from 'node:assert/strict'
import { gitText, requireHistory } from './lib/git-history.mjs'
import { root, baselineCommit, frozenTime, fixturePath, inputPath, executionInputs, coreProducts, coreDecisions, catalogDecisions,
  executionRegistry, webProducts, webDecisions, miniProducts, miniDecisions, staticMiniRegistry, modelRows } from '../test-support/execution-capability.mjs'

requireHistory(root, [baselineCommit])
const inputs = await executionInputs(gitText)
const { core, registry } = await coreProducts(baselineCommit, gitText)
const web = await webProducts(baselineCommit, gitText), mini = miniProducts(baselineCommit, gitText)
const staticMini = staticMiniRegistry(mini, registry.providers.openrouter)
const fixture = {
  commit: baselineCommit, frozenTime,
  method: 'git show of baseline product sources; in-memory esbuild/CommonJS; empty environment; offline TokenDance snapshot and synthetic OpenRouter metadata; no inference, storage or sockets',
  counts: { providers: Object.keys(registry.providers).length, coreModels: modelRows(registry).length, staticModels: modelRows(web.STATIC_MODEL_REGISTRY).length },
  core: executionRegistry(registry), coreReferenceModes: await coreDecisions(core, registry),
  normalizedCatalog: catalogDecisions(core, web.STATIC_MODEL_REGISTRY),
  web: executionRegistry(web.STATIC_MODEL_REGISTRY),
  webStaticDecisions: webDecisions(web, web.STATIC_MODEL_REGISTRY), webLiveDecisions: webDecisions(web, registry),
  mini: executionRegistry(mini.catalog), miniNormalizedStatic: executionRegistry(staticMini),
  miniNormalizedLive: executionRegistry(mini.normalize(registry)), miniInputPolicy: mini.inputPolicy,
  miniStaticDecisions: await miniDecisions(mini, staticMini), miniLiveDecisions: await miniDecisions(mini, registry),
}
// Minification is lossless; --check still regenerates every field and decision.
for (const [file, value] of [[inputPath, inputs], [fixturePath, fixture]]) {
  const text = JSON.stringify(value) + '\n'
  if (process.argv.includes('--check')) assert.equal((file.endsWith('.gz') ? gunzipSync(fs.readFileSync(file)).toString('utf8') : fs.readFileSync(file, 'utf8')), text, 'Frozen main execution fixture drift: ' + file)
  else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, file.endsWith('.gz') ? gzipSync(text, { level: 9 }) : text) }
}
console.log(JSON.stringify({ ...fixture.counts, check: process.argv.includes('--check'), fixture: path.relative(process.cwd(), fixturePath) }))
