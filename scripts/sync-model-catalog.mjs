// --check verifies generated catalog drift without file writes or network.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from '../apps/paperbanana-api/node_modules/typescript/lib/typescript.js'
import { packModelCatalog } from './lib/pack-model-catalog.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/model-catalog-updates.json'), 'utf8'))
const backend = path.join(root, 'apps/laf-functions/paperbanana-api.ts')
let source = fs.readFileSync(backend, 'utf8')
const start = '// BEGIN GENERATED AUDITED CATALOG'
const end = '// END GENERATED AUDITED CATALOG'
const sizeConfig = JSON.parse(fs.readFileSync(path.join(root, 'config/image-size-contracts.json'), 'utf8'))
const sizeRuntime = fs.readFileSync(path.join(root, 'packages/types/src/image-size-contract.ts'), 'utf8')
const lines = [start, '// Source: config/model-catalog-updates.json; run node scripts/sync-model-catalog.mjs.']
const presentation = JSON.parse(fs.readFileSync(path.join(root, 'config/model-presentation.json'), 'utf8'))
const presentationData = `export const MODEL_PRESENTATION: {
  channels: Record<string, string>;
  vendors: Record<string, {label: string; labelEn?: string; labelZh?: string; nameSource?: string; aliases: string[]; source: string; legalName?: string; parentCompany?: string}>;
  routes: {channels: string[]; pattern: string; vendorId: string; source: string}[];
  families: {id: string; vendorId: string; newestFirst: string[]; source: string}[];
  releases: {vendorId: string; pattern: string; releasedAt: string | null; source: string; channels?: string[]; lifecycle?: string; releaseKind?: string}[];
  reviewedAt: string;
} = ${JSON.stringify(presentation)}\n`
write(path.join(root, 'packages/types/src/model-presentation-data.ts'), '// Generated from config/model-presentation.json\n' + presentationData)
const presentationRuntime = presentationData + fs.readFileSync(path.join(root, 'packages/types/src/model-presentation.ts'), 'utf8').replace(/^import .*model-presentation-data\.js'\n/m, '')
lines.push(presentationRuntime)
write(path.join(root, 'apps/web/src/lib/modelPresentation.js'), '// Generated from packages/types/src/model-presentation.ts and config/model-presentation.json\n' + ts.transpileModule(presentationRuntime, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)
// Keep the dictionary once, rather than in both Mini TS and compiled JS.
write(path.join(root, 'apps/miniprogram/miniprogram/utils/model-presentation-data.js'), '// Generated from config/model-presentation.json\nmodule.exports = ' + JSON.stringify(presentation) + '\n')
const miniPresentation = presentationRuntime.replace(JSON.stringify(presentation), "require('./model-presentation-data.js')")
write(path.join(root, 'apps/miniprogram/miniprogram/utils/model-presentation.ts'), '// Generated from packages/types/src/model-presentation.ts and config/model-presentation.json\n' + miniPresentation)
const aspectRuntime = fs.readFileSync(path.join(root, 'packages/types/src/aspect-ratios.ts'), 'utf8')
write(path.join(root, 'apps/web/src/lib/aspectRatios.js'), '// Generated from packages/types/src/aspect-ratios.ts\n' + ts.transpileModule(aspectRuntime, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)
write(path.join(root, 'apps/miniprogram/miniprogram/utils/aspect-ratios.ts'), '// Generated from packages/types/src/aspect-ratios.ts\n' + aspectRuntime)
const imageChannelRoutes = JSON.parse(fs.readFileSync(path.join(root, 'config/image-channel-routes.json'), 'utf8'))
const routeModule = '// Generated from config/image-channel-routes.json.\nexport const IMAGE_CHANNEL_ROUTES: Record<string, any> = ' + JSON.stringify(imageChannelRoutes) + '\n'
write(path.join(root, 'packages/api/src/image-channel-routes.ts'), routeModule)
const channelAuditDir = path.join(root, 'config/channel-audit')
const auditContracts = Object.assign({}, ...['runware-contracts.json','cn-contracts.json','official-contracts.json'].map(name => JSON.parse(fs.readFileSync(path.join(channelAuditDir,name),'utf8'))))
const auditRefine = Object.assign({}, ...['runware-refine-controls.json','cn-refine-controls.json','official-refine-controls.json'].map(name => JSON.parse(fs.readFileSync(path.join(channelAuditDir,name),'utf8'))))
const auditData = 'export const AUDITED_CHANNEL_CONTRACTS: Record<string, any> = ' + JSON.stringify(auditContracts) + '\n'
const auditedInputPolicy = Object.fromEntries(Object.entries(auditContracts).filter(([,c])=>c.generateInputPolicy!==false).map(([key,c]) => {
  const policy = {maxCount:c.productImageCap ?? Math.min(3,c.maxImages || 0),source:c.source}
  if (c.taskType==='vidu') Object.assign(policy,{minDimension:128,maxAspectRatio:4})
  if (c.taskType==='seedream') Object.assign(policy,{minDimension:14,maxAspectRatio:16})
  for (const x of c.schema?.['x-constraints'] || []) {
    if(x.scope!=='each'||x.when)continue
    if(['width','height'].includes(x.operation)) { if(x.minimum)policy.minDimension=Math.max(policy.minDimension || 1,x.minimum);if(x.maximum)policy.maxDimension=Math.min(policy.maxDimension || 4096,x.maximum) }
    if(x.operation==='ratio')policy.maxAspectRatio=Math.min(x.maximum || 200,1/(x.minimum || .005))
    if(x.operation==='fileSize'&&x.maximum)policy.maxBytes=Math.min(4*1024*1024,x.maximum)
  }
  return [key,policy]
}))
const policyFile=path.join(root,'packages/api/src/reference-upload.ts')
let policySource=fs.readFileSync(policyFile,'utf8')
const policyStart='// BEGIN GENERATED CHANNEL INPUT POLICY',policyEnd='// END GENERATED CHANNEL INPUT POLICY'
const policyBlock=policyStart+'\nconst auditedInputPolicy: Record<string, Partial<ReferenceSubmissionPolicy>> = '+JSON.stringify(auditedInputPolicy)+'\n'+policyEnd
policySource=policySource.includes(policyStart)?policySource.slice(0,policySource.indexOf(policyStart))+policyBlock+policySource.slice(policySource.indexOf(policyEnd)+policyEnd.length):policySource+'\n'+policyBlock+'\n'
write(policyFile,policySource)
const auditRefineData = 'export const AUDITED_REFINE_CONTROLS: Record<string, any> = ' + JSON.stringify(auditRefine) + '\n'
write(path.join(root,'packages/api/src/audited-channel-data.ts'),'// Generated from config/channel-audit.\n'+auditData)
write(path.join(root,'packages/api/src/audited-refine-data.ts'),'// Generated from config/channel-audit.\n'+auditRefineData)
lines.push(auditData,fs.readFileSync(path.join(root,'packages/api/src/audited-channel-contracts.ts'),'utf8').replace(/^import .* from .*\n/gm,''))
const refineRuntime = auditRefineData + fs.readFileSync(path.join(root, 'packages/types/src/refine.ts'), 'utf8') + fs.readFileSync(path.join(root, 'packages/api/src/refine-controls.ts'), 'utf8').replace(/^(?:import|import type|export type) .* from .*\n/gm, '')
write(path.join(root, 'apps/web/src/lib/refineControls.js'), '// Generated from packages/api/src/refine-controls.ts\n' + ts.transpileModule(refineRuntime, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)
lines.push(refineRuntime)
const channelRuntime = fs.readFileSync(path.join(root, 'packages/api/src/image-channel-adapters.ts'), 'utf8').replace(/^import .* from .*\n/gm, '')
const regionRuntime = fs.readFileSync(path.join(root, 'packages/types/src/provider-regions.ts'), 'utf8')
lines.push(regionRuntime)
const regionJs = ts.transpileModule(regionRuntime, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
write(path.join(root, 'apps/web/src/lib/providerRegions.js'), '// Generated from packages/types/src/provider-regions.ts\n' + regionJs)
write(path.join(root, 'apps/miniprogram/miniprogram/utils/provider-regions.ts'), '// Generated from packages/types/src/provider-regions.ts\n' + regionRuntime)
const textChannelRuntime = fs.readFileSync(path.join(root, 'packages/api/src/text-channel-adapters.ts'), 'utf8').replace(/^import .* from .*\n/gm, '')
for (const [file, names] of [['official-image-channels.ts',['callOfficialImageChannel','buildOfficialImageRequest','STEP_IMAGE_SUBMISSION_CUTOFF']],['qianfan-image-channel.ts',['callQianfanImageChannel','buildQianfanImageRequest']]]) {
  const moduleSource=fs.readFileSync(path.join(root,'packages/api/src',file),'utf8').replace(/^import .* from .*\n/gm,'').replace(/\bexport /g,'')
  lines.push(`const {${names.join(',')}} = (()=>{${moduleSource}\nreturn {${names.join(',')}}})()`)
}
lines.push(routeModule, channelRuntime, textChannelRuntime, `const extendedModelChannels: Record<string, any> = ${JSON.stringify(config.channels || {})}`)
lines.push(`const auditedModelAliases: Record<string, Record<string, string>> = ${JSON.stringify(config.aliases || {})}`)
lines.push(`const auditedDisabledIdentities: Record<string, Record<string, any>> = ${JSON.stringify(config.disabled || {})}`)
for (const [provider, channel] of Object.entries(config.channels || {})) {
  lines.push(`staticModelRegistry[${JSON.stringify(provider)}] = ${JSON.stringify({accessKind:channel.accessKind, routeContractVersion:1, accountCatalogRequired:false, defaults:channel.defaults, models:[]})}`)
}
const tokenDanceCatalog = JSON.parse(fs.readFileSync(path.join(root, 'config/tokendance/catalog.json'), 'utf8'))
// TokenDance has one canonical audit snapshot; derive all clients from it.
config.providers.tokendance = [...tokenDanceCatalog.models].filter(m => m.roles.length).sort((a,b) => b.created-a.created || a.id.localeCompare(b.id)).map(m => {
  const image = m.roles.includes('image'), vision = m.roles.includes('vision')
  return { id:m.id, label:m.name.replace('：',': ').split(': ').slice(1).join(': ') || m.name,
    roles:m.roles.filter(role => ['main','vision','image'].includes(role)), protocol:image?'ark-images':'openai-chat-completions',
    availabilityNotes:'官方目录及协议已核对，真实调用待验证。'+m.conflicts.join(''),
    capabilities:{referenceImages:vision||image,maxReferenceImages:vision?3:image?1:0,imageGeneration:image,imageEditing:image,imageEditMode:image?'direct-edit':'none',outputFormats:image?['png']:[],...(image?{providerMaxReferenceImages:m.id.endsWith('pro')?10:14}:{})},
    metadata:{vendor:m.vendorId,lifecycle:m.lifecycle || 'unknown',releaseKind:m.releaseKind || '',lifecycleSourceUrl:m.lifecycleSourceUrl,verified:false,verificationState:'catalog',officialSourceUrl:m.sourceUrl,inputModalities:m.inputModalities,outputModalities:m.outputModalities,regions:['tokendance-global']}}
})
const tokenDanceModels = 'export const TOKENDANCE_MODELS: {id: string; roles: string[]; protocols: string[]}[] = ' + JSON.stringify(tokenDanceCatalog.models.map(m => ({id:m.id, roles:m.roles, protocols:m.supported_protocols}))) + '\n'
write(path.join(root, 'packages/api/src/tokendance-models.ts'), '// Generated from config/tokendance/catalog.json\n' + tokenDanceModels)
lines.push(fs.readFileSync(path.join(root, 'packages/api/src/execution-errors.ts'), 'utf8'), fs.readFileSync(path.join(root, 'packages/api/src/reference-selection.ts'), 'utf8'))
const universalRuntime = fs.readFileSync(path.join(root, 'packages/api/src/universal-api.ts'), 'utf8')
lines.push(universalRuntime)
write(path.join(root, 'apps/web/src/lib/universalContract.js'), '// Generated from packages/api/src/universal-api.ts\n' + ts.transpileModule(universalRuntime, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)
const universalMiniTypes = universalRuntime.slice(0, universalRuntime.indexOf('const universalErrorMessages')) + universalRuntime.slice(universalRuntime.indexOf('export interface UniversalInputLimits'), universalRuntime.indexOf('export const UNIVERSAL_PLATFORM_LIMITS'))
write(path.join(root, 'apps/miniprogram/miniprogram/utils/universal-api.ts'), '// Generated shared history types; configuration and execution are Web/Core-only.\n' + universalMiniTypes)
lines.push(fs.readFileSync(path.join(root, 'packages/api/src/tokendance-catalog.ts'), 'utf8'))
lines.push(tokenDanceModels, fs.readFileSync(path.join(root, 'packages/api/src/tokendance.ts'), 'utf8').replace(/^import .* from .*\n/gm, ''))
lines.push(sizeRuntime, `const imageSizeProfiles: Record<string, ImageSizeContract> = ${JSON.stringify(sizeConfig.profiles)}`, `const imageSizeRoutes: Record<string, {generation: string | null; editing: string | null; reviewedAt: string; sources: string[]; notes: string}> = ${JSON.stringify(sizeConfig.routes)}`)
lines.push(`export function resolveModelImageSize(provider: string, model: string, ratio: string, resolution: string, editing = false): ResolvedImageSize {
  const route = imageSizeRoutes[provider + '/' + model]
  const profile = route?.[editing ? 'editing' : 'generation']
  if (!profile) throw new Error('No image size contract for ' + provider + '/' + model + (editing ? ' edit' : ' generation'))
  return resolveImageSize(imageSizeProfiles[profile], ratio, resolution)
}`)
for (const [provider, models] of Object.entries(config.providers)) {
  for (const model of models) {
    const args = [model.id, model.label, model.roles, model.protocol, model.availabilityNotes, model.capabilities, model.metadata]
    lines.push(`upsertAuditedModel('${provider}', registryEntry(${args.map((x) => JSON.stringify(x)).join(', ')}))`)
  }
}
for (const [provider, models] of Object.entries(config.lifecycle)) {
  for (const [id, metadata] of Object.entries(models)) lines.push(`Object.assign(staticModelRegistry.${provider}.models.find((model) => model.id === ${JSON.stringify(id)})!, ${JSON.stringify(metadata)})`)
}
for (const [provider, regions] of Object.entries(config.regions || {})) lines.push(`for (const model of staticModelRegistry.${provider}.models) model.regions = ${JSON.stringify(regions)}`)
for (const [provider, models] of Object.entries(config.disabled || {})) {
  for (const [id, decision] of Object.entries(models)) {
    lines.push(`staticModelRegistry[${JSON.stringify(provider)}].models = staticModelRegistry[${JSON.stringify(provider)}].models.filter(model => model.id !== ${JSON.stringify(id)})`)
  }
}
lines.push(`for (const [key, route] of Object.entries(imageSizeRoutes)) {
  const slash = key.indexOf('/')
  const provider = key.slice(0, slash) as Exclude<Provider, 'openrouter'>
  const model = staticModelRegistry[provider]?.models.find((model) => model.id === key.slice(slash + 1))
  if (!model) throw new Error('Image contract references missing model: ' + key)
  const caps = model.capabilities
  const refineControls = refineControlsFor(provider, model.id)
  if (refineControls) caps.refineControls = refineControls
  caps.imageGeneration = Boolean(route.generation)
  caps.requiresSourceImage = !route.generation
  caps.sizeReviewedAt = route.reviewedAt
  caps.sizeSourceUrls = route.sources
  for (const operation of ['generation', 'editing'] as const) {
    const profile = route[operation] ? imageSizeProfiles[route[operation]!] : undefined
    const map = profile ? imageAspectRatiosByResolution(profile, allFixedAspectRatios) : {}
    const ratios = canonicalAspectRatios(Object.values(map).flat())
    if (operation === 'generation') {
      caps.resolutions = Object.keys(map)
      caps.aspectRatiosByResolution = map
      caps.aspectRatios = ratios
    } else {
      caps.refineResolutions = canonicalRefineResolutions(Object.keys(map))
      caps.refineAspectRatiosByResolution = map
      caps.refineAspectRatios = ratios
    }
  }
}`)
const versionAudit = JSON.parse(fs.readFileSync(path.join(root, 'config/model-version-audit.json'), 'utf8'))
for (const row of versionAudit.models.filter(row => row.channel !== 'openrouter')) {
  const version = {kind:row.kind, id:row.versionId, checkedAt:row.checkedAt, sourceUrl:row.sourceUrls[0]}
  lines.push(`Object.assign(staticModelRegistry[${JSON.stringify(row.channel)}].models.find(model => model.id === ${JSON.stringify(row.apiModelId)})!, ${JSON.stringify({label:row.displayName,version,...(row.apiIdentifier ? {apiIdentifier:row.apiIdentifier} : {})})})`)
}
lines.push(`for (const [provider, registry] of Object.entries(staticModelRegistry)) {
  registry.models = sortModelsNewestFirst(registry.models.map(model => presentRegistryModel(provider, model)))
}`)
lines.push(end)
const block = lines.join('\n')
source = source.includes(start)
  ? source.slice(0, source.indexOf(start)) + block + source.slice(source.indexOf(end) + end.length)
  : source.replace('const fallbackReferences:', block + '\n\nconst fallbackReferences:')
source = source.replace(/const modelRegistryVersion = '[^']+'/, `const modelRegistryVersion = '${config.version}'`)
function write(file, content) {
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
  if (previous === content) return
  if (check) throw new Error(`Generated model catalog drift: ${path.relative(root, file)}`)
  fs.writeFileSync(file, content)
}
write(backend, source)
// Evaluate pure catalog declarations only: no cloud import, secrets or calls.
const ast = ts.createSourceFile('catalog.ts', source, ts.ScriptTarget.Latest, true)
const names = new Set(['routeContractVersion', 'canonicalImageResolutions', 'canonicalFixedAspectRatios', 'allFixedAspectRatios', 'canonicalAspectRatioSet', 'commonImageAspectRatios', 'openAiImageAspectRatios', 'arkConservativeAspectRatios', 'staticModelRegistry'])
const functions = new Set(['registryEntry', 'officialSourceUrlForProtocol', 'canonicalRefineResolutions', 'canonicalAspectRatios', 'upsertAuditedModel'])
const selected = ast.statements.filter((statement) =>
  ts.isFunctionDeclaration(statement) && functions.has(statement.name?.text)
  || ts.isVariableStatement(statement) && statement.declarationList.declarations.some((node) => names.has(node.name.getText(ast))))
const js = ts.transpileModule(selected.map((node) => node.getText(ast)).join('\n') + '\n' + block.replace(/^export /gm, '') + '\nglobalThis.catalog = staticModelRegistry', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
const context = vm.createContext({})
vm.runInContext(js, context, { timeout: 5000 })
const providers = JSON.parse(JSON.stringify(context.catalog))
for (const [provider, registry] of Object.entries(providers)) {
  const ids = new Set()
  for (const model of registry.models) {
    if (ids.has(model.id)) throw new Error(`Duplicate ${provider}/${model.id}`)
    ids.add(model.id)
  }
}
const generated = `export const EXTENDED_MODEL_CHANNELS = ${JSON.stringify(config.channels || {})}\n// Generated by scripts/sync-model-catalog.mjs. Do not edit by hand.\nexport const STATIC_MODEL_REGISTRY_VERSION = ${JSON.stringify(config.version)}\nexport const STATIC_MODEL_REGISTRY = {\n${Object.entries(providers).map(([p, value]) => `  ${JSON.stringify(p)}: ${JSON.stringify({...value, models: undefined}).slice(0,-1)}, "models": [\n${value.models.map((m) => '    ' + JSON.stringify(m)).join(',\n')}\n  ]}`).join(',\n')}\n}\n`
write(path.join(root, 'apps/web/src/lib/staticModelCatalog.js'), generated)
// Keep the dictionary in one generated JS asset, rather than duplicating the
// full catalog in both the TS source and its compiled JS. Public exports and
// every model field remain identical to Web and the service catalog.
const packed = packModelCatalog({ channels: config.channels || {}, registry: providers })
write(path.join(root, 'apps/miniprogram/miniprogram/utils/static-model-catalog-data.js'),
  '// Generated by scripts/sync-model-catalog.mjs. Do not edit by hand.\nmodule.exports = ' + JSON.stringify(packed) + '\n')
write(path.join(root, 'apps/miniprogram/miniprogram/utils/static-model-catalog.ts'),
  `// Generated by scripts/sync-model-catalog.mjs. Do not edit by hand.
import { unpackModelCatalog } from './unpack-model-catalog'
const catalog = unpackModelCatalog(require('./static-model-catalog-data.js'))
export const EXTENDED_MODEL_CHANNELS: Record<string, any> = catalog.channels
export const STATIC_MODEL_REGISTRY_VERSION = ${JSON.stringify(config.version)}
export const STATIC_MODEL_REGISTRY: Record<string, any> = catalog.registry
`)
console.log(`Catalog ${config.version}: ${Object.values(providers).reduce((n, p) => n + p.models.length, 0)} static models; ${check ? 'no drift' : 'generated'}`)
