#!/usr/bin/env node
// Read-only, offline comparison. The UI functions are bundled from the selected
// checkout; no duplicated counting predicate and no generated baseline writes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { loadCard, displayValues, isKnown, countCards, readRegistry } from './lib/model-card-audit.mjs'
import { tokenDanceCatalogResponse } from '../test-support/tokendance-catalog.mjs'
import tokenDanceSnapshot from '../config/channel-audit/tokendance-catalog-snapshot-20261109.json' with { type: 'json' }
const scriptRoot = fileURLToPath(new URL('../', import.meta.url))
const root = path.resolve(process.argv[2]?.startsWith('--') ? scriptRoot : process.argv[2] || scriptRoot)
const registryArg = process.argv.indexOf('--registry')
const registryFile = registryArg < 0 ? null : process.argv[registryArg + 1]
const commitArg = process.argv.indexOf('--source-commit')
if (registryArg >= 0 && (!registryFile || registryFile.startsWith('--'))) throw new Error('--registry requires a JSON path')
const require = createRequire(path.join(scriptRoot, 'apps/web/package.json'))
const { register } = await import(pathToFileURL(path.join(scriptRoot, 'apps/paperbanana-api/node_modules/tsx/dist/esm/api/index.mjs')))
register()
// Guard all accidental HTTP calls in addition to the isolated runtime's mocks.
globalThis.fetch = async () => { throw new Error('Network disabled by count-model-catalog.mjs') }
Date.now = () => Date.parse('2026-11-09T12:00:00Z')
const uiDir = path.join(root, 'apps/web/src')
const auditFile = path.join(uiDir, 'lib/modelAudit.js')
const entry = `export {exactModelDetails} from ${JSON.stringify(path.join(root, 'packages/api/src/provider-catalog.ts'))};
export {catalogRows,libraryRows} from ${JSON.stringify(path.join(uiDir, 'workspace/WorkspaceModelCatalog.jsx'))};
export {STATIC_MODEL_REGISTRY} from ${JSON.stringify(path.join(uiDir, 'lib/staticModelCatalog.js'))};
export {partitionRegistryModels,modelRetiredFromCatalog} from ${JSON.stringify(path.join(uiDir, 'lib/modelRegistry.js'))};
${fs.existsSync(auditFile) ? `export * as audit from ${JSON.stringify(auditFile)};` : 'export const audit = null;'} `
try {
  const bundle = await build({stdin:{contents:entry,resolveDir:root,loader:'js'},bundle:true,format:'cjs',platform:'node',write:false,
    loader:{'.css':'empty','.svg':'dataurl','.png':'dataurl'},define:{'import.meta.env':'{}'},nodePaths:[path.join(scriptRoot,'apps/web/node_modules')],logLevel:'silent'})
  const module = { exports: {} }
  new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,require)
  const ui = module.exports
  const card = await loadCard(root) // Each checkout's own resolver and data.
  const catalogRequests = []
  let mock
  if (registryFile) mock = readRegistry(registryFile)
  else {
    const {memoryDb} = await import(pathToFileURL(path.join(scriptRoot,'test-support/memory-db.mjs')))
    globalThis.__catalogCountDb = memoryDb()
    globalThis.__catalogCountSharp = createRequire(path.join(scriptRoot,'apps/paperbanana-api/package.json'))('sharp')
    const coreBundle = await build({entryPoints:[path.join(root,'apps/paperbanana-api/src/core-entry.mjs')],bundle:true,format:'cjs',platform:'node',write:false,
      define:{'import.meta.url':JSON.stringify('data:text/javascript,offline-catalog-count')},nodePaths:[path.join(scriptRoot,'apps/paperbanana-api/node_modules')],logLevel:'silent',
      plugins:[{name:'offline-infrastructure',setup(builder){
        builder.onResolve({filter:/(?:core-services\.(?:js|ts)|^sharp)$/},args=>({path:args.path,namespace:'offline'}))
        builder.onLoad({filter:/.*/,namespace:'offline'},args=>({loader:'js',contents:args.path==='sharp'?'export default globalThis.__catalogCountSharp':'export const database=globalThis.__catalogCountDb; export const objectStorage={bucket:()=>({})};'}))
      }}]})
    const coreModule={exports:{}}
    new Function('module','exports','require',coreBundle.outputFiles[0].text)(coreModule,coreModule.exports,createRequire(path.join(scriptRoot,'apps/paperbanana-api/package.json')))
    coreModule.exports.configureRuntimeFetch(async url => {
      catalogRequests.push(String(url))
      // Public unauthenticated TokenDance snapshot, 2026-11-09 (119 rows).
      // public OpenRouter/fal/Runware/Novita catalogs are unavailable offline.
      return String(url)==='https://tokendance.space/gateway/v1/models' ? tokenDanceCatalogResponse() : Response.json({error:'Offline catalog fixture'},{status:503})
    })
    mock=await coreModule.exports.modelRegistry({})
  }
  if (!mock.providers) throw new Error('Mock modelRegistry response did not contain providers')
  const key = row => row.provider + '/' + row.model.id
  const registryRows = registry => Object.entries(registry.providers).flatMap(([provider, value]) => value.models.map(model => ({provider,model})))
  const staticRegistry = {providers:ui.STATIC_MODEL_REGISTRY}
  const mockRows = registryRows(mock)
  const fullByKey = new Map(mockRows.map(row => [key(row), row.model]))
  const staticRows = registryRows(staticRegistry).map(row => ({ ...row, model: fullByKey.get(key(row)) || { ...row.model, ...(ui.exactModelDetails(row.provider, row.model.id) ? { specificModelSpecifications: ui.exactModelDetails(row.provider, row.model.id).specifications } : {}) } }))
  const specifications = staticRows.map(row=>({...row,card:card(row.provider,row.model)}))
  const allSpecifications = [...specifications, ...mockRows.map(row=>({...row,card:card(row.provider,row.model)}))]
  const fieldNames = ['inputModalities','outputModalities','totalContextTokens','maxOutputTokens']
  const knownFieldKeys = Object.fromEntries(fieldNames.map(field=>[field,specifications.filter(row=>isKnown(displayValues(row.card)[field])).map(key)]))
  const visible = ui.catalogRows(mock)
  const knownKeysFor = rows => {
    const cards = rows.map(row => ({...row,card:card(row.provider,row.model)}))
    return Object.fromEntries(fieldNames.map(field=>[field,cards.filter(({card})=>isKnown(displayValues(card)[field])).map(key)]))
  }
  const knownFieldScopeKeys = {mockRegistry:knownKeysFor(mockRows),catalogVisible:knownKeysFor(visible)}
  const pick = registry => {
    const keys = new Set()
    for (const [provider, value] of Object.entries(registry.providers)) for (const [role, outputFormat] of [['main','svg'],['vision','svg'],['image','png']])
      for (const model of ui.partitionRegistryModels(value.models.map(m => ui.audit?.withModelAudit ? ui.audit.withModelAudit(provider,m) : m),{role,outputFormat,operation:'generation'}).compatible)
        if (!ui.audit?.removedModel?.(provider,model.id) && !model.catalogRemoval) keys.add(provider+'/'+model.id)
    return keys
  }
  const selectable = pick(mock)
  const deleted = JSON.parse(fs.readFileSync(path.join(scriptRoot,'config/removed-models.json'),'utf8'))
  const referenceAudit = JSON.parse(fs.readFileSync(path.join(scriptRoot,'config/model-audit.generated.json'),'utf8'))
  const added = referenceAudit.additions.map(m=>m.channel+'/'+m.id)
  const previewPairs = JSON.parse(fs.readFileSync(path.join(scriptRoot,'apps/web/tests/fixtures/model-card-preview.json'),'utf8'))
  const library = {connections:[...new Set(previewPairs.map(([provider])=>provider))].map(provider=>({id:provider,provider})),
    models:previewPairs.map(([connectionId,modelId],index)=>({id:'m'+index,connectionId,modelId}))}
  const stored = JSON.stringify(library), cards = ui.libraryRows(library,mock)
  if (JSON.stringify(library)!==stored) throw Error('UI changed the stored library')
  const scopes = {staticRegistry:staticRows.map(key),mockRegistry:mockRows.map(key),catalogVisible:visible.map(key),pickerSelectable:[...selectable]}
  const conflicts = new Map()
  const comparable = value => Array.isArray(value) ? [...value].sort() : value
  for (const row of allSpecifications) for (const conflict of row.card.conflicts || []) {
    const identity = JSON.stringify([row.provider,row.model.id,conflict.field,conflict.auditState,comparable(conflict.auditValue),comparable(conflict.existingValue)])
    const prior = conflicts.get(identity)
    conflicts.set(identity,{channel:row.provider,id:row.model.id,...conflict,sources:[...new Set([...(prior?.sources || []),...conflict.sources])]})
  }
  const output = {
    root:path.relative(scriptRoot,root) || '.',commit:commitArg < 0 ? execFileSync('git',['-C',root,'rev-parse','--short','HEAD'],{encoding:'utf8'}).trim() : process.argv[commitArg + 1],asOf:'2026-11-09',
    tokenDanceCatalogFixture: registryFile ? null : { sourceUrl: tokenDanceSnapshot.sourceUrl, checkedAt: tokenDanceSnapshot.checkedAt, models: tokenDanceSnapshot.data.length },
    modelObjectBasis: registryFile ? 'Captured Core modelRegistry JSON; full model objects. Static-only identities use full STATIC_MODEL_REGISTRY plus Core exactModelDetails.' : 'Offline Core modelRegistry with mocked catalogs; full static entries plus Core exactModelDetails, audit, lifecycle and reference capability enrichment. Static-only identities use full static plus exactModelDetails.',
    knownRule: 'Rendered value is not unknown; main legacy missing labels normalize to unknown; N/A included. Each root uses its own card code; hidden metadata is not counted.',
    fullObject: countCards(mockRows.map(row => ({ channel: row.provider, model: row.model })), card),
    idOnly: countCards(mockRows.map(row => ({ channel: row.provider, model: row.model })), card, true),
    knownFields:Object.fromEntries(fieldNames.map(field=>[field,knownFieldKeys[field].length])),
    knownFieldScopes:Object.fromEntries(Object.entries(knownFieldScopeKeys).map(([scope,fields])=>[scope,Object.fromEntries(Object.entries(fields).map(([field,keys])=>[field,keys.length]))])),
    knownFieldScopeKeys,
    knownFieldKeys,
    conflicts:[...conflicts.values()],
    counts:Object.fromEntries(Object.entries(scopes).map(([scope,keys])=>[scope,keys.length])),
    perChannel:Object.fromEntries(Object.keys(mock.providers).sort().map(provider=>[provider,{static:staticRows.filter(r=>r.provider===provider).length,mock:mock.providers[provider].models.length,catalog:visible.filter(r=>r.provider===provider).length,picker:[...selectable].filter(k=>k.startsWith(provider+'/')).length}])),
    hiddenDeprecated:mockRows.filter(row=>!visible.some(v=>key(v)===key(row))&&ui.modelRetiredFromCatalog(row.model)).length,
    channelUnavailable:mockRows.filter(row=>ui.audit?.auditedModelLifecycle?.(row.provider,row.model.id)?.state==='channel-unavailable').length,
    scheduled:staticRows.filter(row=>referenceAudit.notices[key(row)] && Date.parse(referenceAudit.notices[key(row)].stopDate)>Date.now()).length,
    scheduledUiState:staticRows.filter(row=>ui.audit?.auditedModelLifecycle?.(row.provider,row.model.id)?.state==='scheduled').length,
    unverified:ui.audit ? staticRows.filter(row=>ui.audit.auditedModelSpecs(row.provider,row.model.id).unverified).length : null,
    additions:added.filter(k=>scopes.staticRegistry.includes(k)).length,unselectableAdditions:added.filter(k=>scopes.staticRegistry.includes(k)&&!selectable.has(k)).length,
    removedStillInStatic:scopes.staticRegistry.filter(k=>deleted[k]),
    removedLookup:ui.audit?.MODEL_AUDIT_DATA?.removed ? Object.keys(ui.audit.MODEL_AUDIT_DATA.removed).length : 0,
    previewLibrary:{storedBefore:library.models.length,storedAfter:JSON.parse(stored).models.length,cards:cards.length,removedCardsOmitted:library.models.filter(m=>ui.audit?.removedModel?.(library.connections.find(c=>c.id===m.connectionId).provider,m.modelId)).length},
    mockedCatalogRequests:[...new Set(catalogRequests)],
    scopeDeltaBasis:Object.fromEntries(Object.entries(scopes).map(([scope,keys])=>[scope,{removedPresent:keys.filter(k=>deleted[k]).length,addedPresent:keys.filter(k=>added.includes(k)).length}])),
  }
  if (process.argv.includes('--keys')) output.scopeKeys = scopes
  console.log(JSON.stringify(output,null,2))
} catch(error) {
  console.error(`Unable to count ${root}: ${error.stack}\nNeeds the selected checkout's Web/Core modules and the invoking checkout's installed dependencies. Baseline was not modified.`)
  process.exitCode=1
}
