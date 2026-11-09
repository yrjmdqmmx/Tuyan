// R22 offline oracle. Historical product code is read with git show, never checked out.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

export const root = fileURLToPath(new URL('../', import.meta.url))
export const baselineCommit = '8c456709'
export const frozenTime = '2026-11-09T12:00:00.000Z'
export const fixturePath = path.join(root, 'test-support/fixtures/execution-capability-8c456709.json')
const require = createRequire(new URL('../apps/paperbanana-api/package.json', import.meta.url))
const deny = () => { throw Error('R22: infrastructure/network calls are forbidden') }
class FrozenDate extends Date {
  constructor(...args) { super(...(args.length ? args : [frozenTime])) }
  static now() { return Date.parse(frozenTime) }
}
export const readSource = (file, commit) => commit
  ? execFileSync('git', ['show', `${commit}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  : fs.readFileSync(path.join(root, file), 'utf8')

export async function productBundle(contents, commit) {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: 'js' }, bundle: true, format: 'cjs', platform: 'node', write: false,
    logLevel: 'silent', define: { 'import.meta.url': JSON.stringify('data:text/javascript,r22-offline'), 'import.meta.env': '{}' },
    nodePaths: [path.join(root, 'apps/paperbanana-api/node_modules')],
    plugins: [{ name: 'r22-offline-archive', setup(b) {
      b.onResolve({ filter: /(?:core-services\.(?:js|ts)|^sharp)$/ }, a => ({ path: a.path, namespace: 'r22-stubs' }))
      b.onLoad({ filter: /.*/, namespace: 'r22-stubs' }, a => ({ loader: 'js', contents: a.path === 'sharp'
        ? 'const sharp = () => { throw Error("R22: image processing forbidden") }; sharp.cache = sharp.concurrency = sharp.block = sharp.unblock = () => {}; export default sharp'
        : 'export const database = {collection: () => ({})}; export const objectStorage = {bucket: () => {throw Error("R22: storage forbidden")}}' }))
      if (commit) b.onLoad({ filter: /\.(?:[cm]?js|ts|json)$/ }, a => {
        if (!a.path.startsWith(root) || a.path.includes('/node_modules/')) return
        return { contents: readSource(path.relative(root, a.path), commit), loader: a.path.endsWith('.json') ? 'json' : a.path.endsWith('.ts') ? 'ts' : 'js' }
      })
    } }],
  })
  const module = { exports: {} }
  new Function('module', 'exports', 'require', 'process', 'Date', 'fetch', result.outputFiles[0].text)(
    module, module.exports, require, { env: {}, version: process.version, versions: process.versions, platform: process.platform }, FrozenDate, deny)
  return module.exports
}

// Exclude only display projections. All other fields (including unknown future
// execution flags, nested capabilities, protocols, limits and array order) count.
const displayFields = new Set(['specifications', 'specificModelSpecifications', 'cardSpecifications', 'auditSpecifications'])
export const executionModel = model => JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(model).filter(([key]) => !displayFields.has(key)))))
export function executionRegistry(registry) {
  return JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(registry.providers || registry).map(([provider, entry]) => [provider, {
    ...Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'models')),
    models: entry.models.map(executionModel),
  }]))))
}
export const modelRows = registry => Object.entries(registry.providers || registry).flatMap(([provider, entry]) => entry.models.map(model => ({ provider, model, key: provider + '/' + model.id })))

export async function webProducts(commit) {
  return productBundle(`
    export { STATIC_MODEL_REGISTRY } from './apps/web/src/lib/staticModelCatalog.js';
    export { mainModelCanReadImages, PROVIDERS } from './apps/web/src/constants.js';
    export { workflowModelVisionStatus, workflowVisionError } from './apps/web/src/lib/workflow.js';
    export { modelRefinePresentation } from './apps/web/src/lib/modelRegistry.js';
  `, commit)
}
export function webDecisions(web, registry) {
  return Object.fromEntries(modelRows(registry).map(({ provider, model, key }) => [key, {
    staticCanRead: web.mainModelCanReadImages(provider, model.id),
    visionStatus: web.workflowModelVisionStatus(model),
    directReferenceError: web.workflowVisionError({ referenceImages: [{}], visionMode: 'none', pipelineMode: 'planner_critic', taskName: 'diagram', outputFormat: 'svg' }, web.workflowModelVisionStatus(model), 'unknown'),
    refine: web.modelRefinePresentation(model),
  }]))
}

export async function coreProducts(commit) {
  const core = await productBundle(`
    export { modelRegistry, configureRuntimeFetch, resolveReferenceImageMode } from './apps/paperbanana-api/runtime/handler.ts';
    export { normalizeCatalogModel, PROVIDER_CATALOGS } from './packages/api/src/provider-catalog.ts';
  `, commit)
  // Identical inputs on both sides; the main snapshot is the pre-existing public
  // evidence. Synthetic OpenRouter metadata covers its three configured defaults.
  const snapshot = JSON.parse(readSource('config/channel-audit/tokendance-catalog-snapshot-20261109.json', baselineCommit))
  const baseWeb = await webProducts(baselineCommit)
  const defaults = baseWeb.PROVIDERS.openrouter
  const openrouter = ['mainModel', 'imageModel', 'visionModel'].map(role => ({ id: defaults[role], name: defaults[role],
    architecture: { input_modalities: ['text', 'image'], output_modalities: [role === 'imageModel' ? 'image' : 'text'] },
    supported_parameters: role === 'imageModel' ? { output_format: { values: ['png'] }, input_references: { max: 1 } } : [],
  }))
  const calls = []
  core.configureRuntimeFetch(async (url, init) => {
    assert.equal(String(init?.method || 'GET').toUpperCase(), 'GET')
    calls.push(String(url))
    if (String(url) === snapshot.sourceUrl) return Response.json({ data: snapshot.data })
    if (String(url) === 'https://openrouter.ai/api/v1/models') return Response.json({ data: openrouter.filter(m => m.architecture.output_modalities.includes('text')) })
    if (String(url) === 'https://openrouter.ai/api/v1/images/models') return Response.json({ data: openrouter.filter(m => m.architecture.output_modalities.includes('image')) })
    assert.ok(['api.fal.ai', 'api.runware.ai', 'api.novita.ai'].includes(new URL(url).hostname), String(url))
    return Response.json({ error: 'offline metadata fixture' }, { status: 503 })
  })
  return { core, registry: await core.modelRegistry({}), calls }
}
export async function coreDecisions(core, registry) {
  const results = {}
  for (const { provider, model, key } of modelRows(registry)) {
    results[key] = {}
    for (const pipelineMode of ['vanilla', 'planner_critic']) for (const visionMode of ['none', 'assist']) for (const hasReferences of [false, true]) {
      results[key][[pipelineMode, visionMode, hasReferences].join('/')] = await core.resolveReferenceImageMode({
        modelRoutes: { main: { accessProvider: provider, modelId: model.id } }, pipelineMode, visionMode,
        taskName: 'diagram', referenceImages: hasReferences ? [{}] : [], referenceImageMode: 'vision_model',
      })
    }
  }
  return results
}
export function catalogDecisions(core, registry) {
  return Object.fromEntries(modelRows(registry).map(({ provider, model, key }) => [key,
    [false, true].map(explicit => executionModel(core.normalizeCatalogModel(provider, {
      id: model.id, name: provider === 'gemini' ? 'models/' + model.id : model.id,
      ...(provider === 'replicate' ? { owner: model.id.split('/')[0], name: model.id.split('/').slice(1).join('/') } : {}),
      ...(explicit ? { input_modalities: ['text', 'image', 'video'], output_modalities: ['text'] } : {}),
    }, core.PROVIDER_CATALOGS[provider].url || core.PROVIDER_CATALOGS[provider].source))),
  ]))
}

// Evaluate the shipped Mini CommonJS, including the real component/page methods.
// Only session, transport, uploads and the final payload boundary are stubbed.
export function miniProducts(commit) {
  const base = 'apps/miniprogram/miniprogram/'
  const cache = new Map(), definitions = {}, state = { registry: null }, captured = []
  const overrides = {
    'utils/model-registry-store.js': { getModelRegistryState: () => state, loadModelRegistry: async () => state },
    'utils/session.js': { getCurrentUser: () => ({ id: 'offline-fixture' }), subscribeSession: () => () => {} },
    'utils/api-keys.js': { getApiKeys: () => ({}) },
    'utils/api.js': { requestJson: async () => ({ jobId: 'offline-fixture' }), formatError: e => e.message },
    'utils/payload.js': { buildCreateJobPayload: input => { captured.push(input.referenceImageMode); return {} } },
  }
  function load(relative) {
    if (!path.extname(relative)) relative += '.js'
    if (overrides[relative]) return overrides[relative]
    if (cache.has(relative)) return cache.get(relative).exports
    const module = { exports: {} }; cache.set(relative, module)
    vm.runInNewContext(readSource(base + relative, commit), {
      module, exports: module.exports, Date: FrozenDate, console,
      Component(value) { definitions[relative] = value },
      require(name) { assert.ok(name.startsWith('.'), name); return load(path.posix.normalize(path.posix.join(path.posix.dirname(relative), name))) },
      wx: { showLoading() {}, hideLoading() {}, showToast() {}, getStorageSync() {} },
      setTimeout, clearTimeout, setInterval, clearInterval,
    }, { filename: relative })
    return module.exports
  }
  const catalog = load('utils/static-model-catalog.js').STATIC_MODEL_REGISTRY
  const normalize = load('utils/model-registry.js').normalizeModelRegistry
  const constants = load('utils/constants.js')
  const inputPolicy = load('utils/audited-input-policy.js')
  function instance(file) {
    load(file)
    const def = definitions[file]
    return { ...def.methods, data: structuredClone(def.data),
      properties: Object.fromEntries(Object.entries(def.properties || {}).map(([k, v]) => [k, structuredClone(v.value)])),
      setData(patch) { Object.assign(this.data, patch) },
    }
  }
  return { catalog, normalize, constants, inputPolicy, state, captured, instance }
}
export function staticMiniRegistry(mini, openrouter) {
  return mini.normalize({ registryVersion: 'r22-fixture', routeContractVersion: 1, providerRegionContractVersion: 1, supportsModelRoutes: true, providers: { ...mini.catalog, openrouter } })
}
export async function miniDecisions(mini, rawRegistry) {
  const registry = mini.normalize(rawRegistry)
  mini.state.registry = registry
  const sheet = mini.instance('components/generation-settings-sheet/generation-settings-sheet.js')
  const page = mini.instance('pages/index/index.js')
  sheet.properties.purpose = 'create'; sheet.properties.referenceCount = 1
  page.refreshCanSubmit = () => {}; page.stopPolling = () => {}; page.startPolling = () => {}
  page.uploadReferencesForJob = async () => []
  const results = {}
  for (const { provider, model, key } of modelRows(registry)) {
    const route = { accessProvider: provider, modelId: model.id }
    const settings = { configurationMode: 'simple', simpleProvider: provider, modelRoutes: { main: route, image: route, vision: route },
      outputFormat: 'svg', pipelineMode: 'vanilla', maxCriticRounds: 0, retrievalSetting: 'none', providerRegions: {} }
    sheet.data.draft = settings
    Object.assign(page.data, { settings, registryReady: true, referenceImages: [{ filename: 'fixture.png', size: 1, mimeType: 'image/png' }],
      isAdvancedMode: false, referenceImageMode: 'vision_model', canSubmit: true, isSubmitting: false })
    page.refreshReferenceModeState()
    const count = mini.captured.length
    await page.submitJob()
    assert.equal(mini.captured.length, count + 1, key + ': actual index.submitJob must reach payload boundary: ' + page.data.error)
    results[key] = { staticCanRead: mini.constants.mainModelCanReadImages(provider, model.id),
      settingsRoles: sheet.effectiveRoles(), canSelectMainModelDirect: page.data.canSelectMainModelDirect,
      needsVisionModel: page.data.referenceNeedsVisionModel, submitMode: mini.captured.at(-1) }
  }
  return JSON.parse(JSON.stringify(results))
}
