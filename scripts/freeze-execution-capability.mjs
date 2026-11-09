// Read-only baseline generation: git show 8c456709:<path>, bundled/evaluated in
// memory with a fixed clock, empty environment and mocked metadata transport.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { baselineCommit, frozenTime, fixturePath, coreProducts, coreDecisions, catalogDecisions,
  executionRegistry, webProducts, webDecisions, miniProducts, miniDecisions, staticMiniRegistry, modelRows } from '../test-support/execution-capability.mjs'

const { core, registry } = await coreProducts(baselineCommit)
const web = await webProducts(baselineCommit), mini = miniProducts(baselineCommit)
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
// Compact each section entry without duplicating thousands of formatting lines
// for nested capabilities and the eight reference-mode scenarios per model.
const text = '{\n' + Object.entries(fixture).map(([key, value]) => '  ' + JSON.stringify(key) + ': ' +
  (value && typeof value === 'object' && !Array.isArray(value)
    ? '{\n' + Object.entries(value).map(([k, v]) => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n  }'
    : JSON.stringify(value))).join(',\n') + '\n}\n'
if (process.argv.includes('--check')) assert.ok(fs.readFileSync(fixturePath, 'utf8') === text, 'Frozen main execution fixture drift')
else { fs.mkdirSync(path.dirname(fixturePath), { recursive: true }); fs.writeFileSync(fixturePath, text) }
console.log(JSON.stringify({ ...fixture.counts, check: process.argv.includes('--check'), fixture: path.relative(process.cwd(), fixturePath) }))
