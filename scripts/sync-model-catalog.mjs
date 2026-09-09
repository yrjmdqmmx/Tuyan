// --check verifies generated catalog drift without file writes or network.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from '../apps/paperbanana-api/node_modules/typescript/lib/typescript.js'
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
  vendors: Record<string, {label: string; aliases: string[]; source: string; legalName?: string; parentCompany?: string}>;
  routes: {channels: string[]; pattern: string; vendorId: string; source: string}[];
  families: {id: string; vendorId: string; newestFirst: string[]; source: string}[];
  releases: {vendorId: string; pattern: string; releasedAt: string; source: string; channels?: string[]}[];
  reviewedAt: string;
} = ${JSON.stringify(presentation)}\n`
write(path.join(root, 'packages/types/src/model-presentation-data.ts'), '// Generated from config/model-presentation.json\n' + presentationData)
const presentationRuntime = presentationData + fs.readFileSync(path.join(root, 'packages/types/src/model-presentation.ts'), 'utf8').replace(/^import .*model-presentation-data\.js'\n/m, '')
lines.push(presentationRuntime)
write(path.join(root, 'apps/web/src/lib/modelPresentation.js'), '// Generated from packages/types/src/model-presentation.ts and config/model-presentation.json\n' + ts.transpileModule(presentationRuntime, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)
write(path.join(root, 'apps/miniprogram/miniprogram/utils/model-presentation.ts'), '// Generated from packages/types/src/model-presentation.ts and config/model-presentation.json\n' + presentationRuntime)
const aspectRuntime = fs.readFileSync(path.join(root, 'packages/types/src/aspect-ratios.ts'), 'utf8')
write(path.join(root, 'apps/web/src/lib/aspectRatios.js'), '// Generated from packages/types/src/aspect-ratios.ts\n' + ts.transpileModule(aspectRuntime, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)
write(path.join(root, 'apps/miniprogram/miniprogram/utils/aspect-ratios.ts'), '// Generated from packages/types/src/aspect-ratios.ts\n' + aspectRuntime)
const imageChannelRoutes = JSON.parse(fs.readFileSync(path.join(root, 'config/image-channel-routes.json'), 'utf8'))
const routeModule = '// Generated from config/image-channel-routes.json.\nexport const IMAGE_CHANNEL_ROUTES: Record<string, any> = ' + JSON.stringify(imageChannelRoutes) + '\n'
write(path.join(root, 'packages/api/src/image-channel-routes.ts'), routeModule)
const channelRuntime = fs.readFileSync(path.join(root, 'packages/api/src/image-channel-adapters.ts'), 'utf8').replace(/^import .*image-channel-routes.js'\n/m, '')
const regionRuntime = fs.readFileSync(path.join(root, 'packages/types/src/provider-regions.ts'), 'utf8')
lines.push(regionRuntime)
const regionJs = ts.transpileModule(regionRuntime, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
write(path.join(root, 'apps/web/src/lib/providerRegions.js'), '// Generated from packages/types/src/provider-regions.ts\n' + regionJs)
write(path.join(root, 'apps/miniprogram/miniprogram/utils/provider-regions.ts'), '// Generated from packages/types/src/provider-regions.ts\n' + regionRuntime)
lines.push(routeModule, channelRuntime, `const extendedModelChannels: Record<string, any> = ${JSON.stringify(config.channels || {})}`)
lines.push(`const auditedModelAliases: Record<string, Record<string, string>> = ${JSON.stringify(config.aliases || {})}`)
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
    metadata:{vendor:m.vendorId,lifecycle:/preview|exp/.test(m.id)?'preview':'stable',verified:false,verificationState:'catalog',officialSourceUrl:m.sourceUrl,inputModalities:m.inputModalities,outputModalities:m.outputModalities,regions:['tokendance-global']}}
})
const tokenDanceModels = 'export const TOKENDANCE_MODELS: {id: string; roles: string[]; protocols: string[]}[] = ' + JSON.stringify(tokenDanceCatalog.models.map(m => ({id:m.id, roles:m.roles, protocols:m.supported_protocols}))) + '\n'
write(path.join(root, 'packages/api/src/tokendance-models.ts'), '// Generated from config/tokendance/catalog.json\n' + tokenDanceModels)
lines.push(tokenDanceModels, fs.readFileSync(path.join(root, 'packages/api/src/tokendance.ts'), 'utf8').replace(/^import .*tokendance-models.js'\n/m, ''))
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
write(path.join(root, 'apps/miniprogram/miniprogram/utils/static-model-catalog.ts'), generated.replace('export const STATIC_MODEL_REGISTRY =', 'export const STATIC_MODEL_REGISTRY: Record<string, any> ='))
console.log(`Catalog ${config.version}: ${Object.values(providers).reduce((n, p) => n + p.models.length, 0)} static models; ${check ? 'no drift' : 'generated'}`)
