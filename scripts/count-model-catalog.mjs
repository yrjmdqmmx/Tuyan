#!/usr/bin/env node
// Read-only, offline comparison. The UI functions are bundled from the selected
// checkout; no duplicated counting predicate and no generated baseline writes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
const scriptRoot = fileURLToPath(new URL('../', import.meta.url))
const root = path.resolve(process.argv[2] || scriptRoot)
const require = createRequire(path.join(scriptRoot, 'apps/web/package.json'))
const { register } = await import(pathToFileURL(path.join(scriptRoot, 'apps/paperbanana-api/node_modules/tsx/dist/esm/api/index.mjs')))
register()
// Guard all accidental HTTP calls in addition to the isolated runtime's mocks.
globalThis.fetch = async () => { throw new Error('Network disabled by count-model-catalog.mjs') }
Date.now = () => Date.parse('2026-11-09T12:00:00Z')
const uiDir = path.join(root, 'apps/web/src')
const auditFile = path.join(uiDir, 'lib/modelAudit.js')
const entry = `export {catalogRows,libraryRows} from ${JSON.stringify(path.join(uiDir, 'workspace/WorkspaceModelCatalog.jsx'))};
export {STATIC_MODEL_REGISTRY} from ${JSON.stringify(path.join(uiDir, 'lib/staticModelCatalog.js'))};
export {partitionRegistryModels,modelRetiredFromCatalog} from ${JSON.stringify(path.join(uiDir, 'lib/modelRegistry.js'))};
${fs.existsSync(auditFile) ? `export * as audit from ${JSON.stringify(auditFile)};` : 'export const audit = null;'} `
try {
  const bundle = await build({stdin:{contents:entry,resolveDir:root,loader:'js'},bundle:true,format:'cjs',platform:'node',write:false,
    loader:{'.css':'empty','.svg':'dataurl','.png':'dataurl'},define:{'import.meta.env':'{}'},nodePaths:[path.join(scriptRoot,'apps/web/node_modules')],logLevel:'silent'})
  const module = { exports: {} }
  new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,require)
  const ui = module.exports
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
  const catalogRequests = []
  coreModule.exports.configureRuntimeFetch(async url => {
    catalogRequests.push(String(url))
    // Match the local preview fixture: no TokenDance account/catalog rows;
    // public OpenRouter/fal/Runware/Novita catalogs are unavailable offline.
    return String(url)==='https://tokendance.space/gateway/v1/models' ? Response.json({data:[]}) : Response.json({error:'Offline catalog fixture'},{status:503})
  })
  const mock=await coreModule.exports.modelRegistry({})
  if (!mock.providers) throw new Error('Mock modelRegistry response did not contain providers')
  const key = row => row.provider + '/' + row.model.id
  const registryRows = registry => Object.entries(registry.providers).flatMap(([provider, value]) => value.models.map(model => ({provider,model})))
  const staticRegistry = {providers:ui.STATIC_MODEL_REGISTRY}
  const staticRows = registryRows(staticRegistry), mockRows = registryRows(mock)
  const visible = ui.catalogRows(mock)
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
  const library = {connections:[{id:'c1',provider:'xiaomi'},{id:'c2',provider:'fireworks'},{id:'c3',provider:'bailian'},{id:'c4',provider:'antling'},{id:'c5',provider:'openai'}],models:[
    {id:'r1',connectionId:'c1',modelId:'mimo-v2.5'},{id:'r2',connectionId:'c2',modelId:'accounts/fireworks/models/glm-5p2'},
    {id:'s',connectionId:'c3',modelId:'qwen3.5-plus'},{id:'l1',connectionId:'c4',modelId:'Ling-3.1-flash'},{id:'l2',connectionId:'c4',modelId:'Ling-3.2-flash'},
    {id:'unknown',connectionId:'c5',modelId:'gpt-6.1-sol'},{id:'partial',connectionId:'c4',modelId:'Ling-3.0-tiny'}]}
  const stored = JSON.stringify(library), cards = ui.libraryRows(library,mock)
  if (JSON.stringify(library)!==stored) throw Error('UI changed the stored library')
  const scopes = {staticRegistry:staticRows.map(key),mockRegistry:mockRows.map(key),catalogVisible:visible.map(key),pickerSelectable:[...selectable]}
  const output = {
    root,commit:execFileSync('git',['-C',root,'rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),asOf:'2026-11-09',
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
