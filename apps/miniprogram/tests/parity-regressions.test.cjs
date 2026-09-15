const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadComponent } = require('./helpers/component.cjs')
const { normalizeModelRegistry, MODEL_PROVIDER_IDS } = require('../miniprogram/utils/model-registry.js')
const { buildModelSubmission, requiredCreateRouteRoles } = require('../miniprogram/utils/model-routing.js')
const { refineRequestSource, buildRefineJobPayload } = require('../miniprogram/utils/refine.js')
const { buildCreateJobPayload } = require('../miniprogram/utils/payload.js')
const { toBusinessError } = require('../miniprogram/utils/business-errors.js')
const { formatError } = require('../miniprogram/utils/api.js')
function catalog() {
  const providers = Object.fromEntries(MODEL_PROVIDER_IDS.map(id => [id, { defaults: { main: 'text', image: 'image', vision: 'text' }, models: [
    { id: 'text', selectable: true, roles: ['main', 'vision'], inputModalities: ['text', 'image'], capabilities: {} },
    { id: 'image', selectable: true, roles: ['image'], inputModalities: ['text', 'image'], capabilities: { imageEditMode: 'direct-edit', resolutions: ['1K', '2K'], refineResolutions: ['auto', '2K'], aspectRatiosByResolution: { '1K': ['1:1'], '2K': ['1:1', '16:9'] }, refineAspectRatiosByResolution: { auto: ['1:1'], '2K': ['16:9'] }, outputFormats: ['png'] } },
  ] }]))
  return { supportsModelRoutes: true, registryVersion: 'test-v16', routeContractVersion: 1, providerRegionContractVersion: 1, providers }
}
const routes = { main: { accessProvider: 'bailian', modelId: 'text' }, vision: { accessProvider: 'bailian', modelId: 'text' }, image: { accessProvider: 'bailian', modelId: 'image' } }
const base = { registry: catalog(), modelRoutes: routes, configurationMode: 'advanced', apiKeys: { bailian: 'fixture-only' }, categoryId: 'method_framework', categoryLabel: '框架', methodContent: 'A sufficiently long method description', caption: 'Figure one', outputFormat: 'png', imageSize: '2K', aspectRatio: '16:9', pipelineMode: 'planner_critic', retrievalSetting: 'none', numCandidates: 1, maxCriticRounds: 1, uploadedReferenceImages: [], referenceImageMode: 'vision_model', manualReferenceIds: [] }

test('registry retains optimization and validated upload limits, malformed declarations fail closed', () => {
  const limits = { version: 1, mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'], maxBytes: 5242880, maxDimension: 16384, maxPixels: 20971520, modelMaxBytes: { 'bailian/image': 1024, bad: -1 } }
  const raw = { ...catalog(), inputOptimizationContractVersion: 1, inputOptimizationTargets: ['editInstruction'], refineUpload: limits }
  const normalized = normalizeModelRegistry(raw)
  assert.deepEqual(normalized.inputOptimizationTargets, ['editInstruction'])
  assert.deepEqual(normalized.refineUpload.mimeTypes, ['image/png', 'image/jpeg', 'image/webp'])
  assert.equal(normalized.refineUpload.modelMaxBytes.bad, undefined)
  assert.equal(normalizeModelRegistry({ ...raw, refineUpload: { ...limits, maxPixels: 0 } }).refineUpload, undefined)
})
test('request builders reject stale routes, unavailable regions, edit-only generation and invalid size pairs', () => {
  assert.equal(buildCreateJobPayload(base).aspectRatio, '16:9')
  assert.throws(() => buildModelSubmission({ ...base, modelRoutes: { ...routes, main: { ...routes.main, modelId: 'missing' } } }), /已失效/)
  const disabled = catalog(); disabled.providers.bailian.models[0].selectable = false
  assert.throws(() => buildCreateJobPayload({ ...base, registry: disabled }), /已失效/)
  assert.throws(() => buildCreateJobPayload({ ...base, imageSize: '1K' }), /比例或清晰度/)
  const editOnly = catalog(); editOnly.providers.bailian.models[1].capabilities.requiresSourceImage = true
  assert.throws(() => buildCreateJobPayload({ ...base, registry: editOnly }), /仅支持图像编辑/)
  const cn = catalog(); cn.providers.minimax.models[0].regions = ['global']
  assert.throws(() => buildModelSubmission({ ...base, registry: cn, providerRegions: { minimax: 'cn' }, modelRoutes: { ...routes, main: { accessProvider: 'minimax', modelId: 'text' } } }), /区域不可用/)
  assert.deepEqual(requiredCreateRouteRoles({ taskName: 'plot', outputFormat: 'png', pipelineMode: 'vanilla', imageSize: '2K', imageRefineMode: 'direct-edit' }, 0), ['main', 'image'])
})
test('uploaded refine sources use their exclusive contract and auto resolution remains legal', () => {
  assert.deepEqual(refineRequestSource({ uploaded: true, objectKey: 'references/test/original', url: 'wxfile://preview' }), { sourceImageUpload: { objectKey: 'references/test/original' } })
  assert.throws(() => refineRequestSource({ uploaded: true, url: 'wxfile://pending' }))
  const payload = buildRefineJobPayload({ ...base, source: { uploaded: true, objectKey: 'references/test/original' }, editInstruction: '放大标签', refineMode: 'direct-edit', imageSize: 'auto', aspectRatio: '1:1' })
  assert.equal(payload.sourceImageUrl, undefined); assert.equal(payload.sourceImageObjectKey, undefined)
  assert.equal(payload.imageSize, 'auto')
  assert.throws(() => buildRefineJobPayload({ ...base, source: {}, editInstruction: '放大标签', refineMode: 'direct-edit' }))
})
test('business errors keep lifecycle and optimization guidance instead of leaking raw identifiers', () => {
  assert.match(formatError(toBusinessError(409, { error: 'Account deletion is in progress. New jobs and uploads are disabled.' })), /正在注销/)
  assert.match(formatError(toBusinessError(400, { businessCode: 'REFINE_UPLOAD_INVALID', error: 'invalid' })), /重新上传/)
  assert.match(formatError(toBusinessError(504, { businessCode: 'INPUT_OPTIMIZATION_PROVIDER_TIMEOUT', error: 'timed out' })), /原文已保留/)
})
test('local history preserves unowned legacy entries but displays only the current immutable account ID', () => {
  const session = require('../miniprogram/utils/session.js'); const previous = session.getCurrentUser
  let user = { id: 'a' }; let stored = [{ id: 'legacy', caption: 'unknown owner' }]
  session.getCurrentUser = () => user
  global.wx = { getStorageSync: () => stored, setStorageSync: (_, value) => { stored = value }, env: {}, getFileSystemManager: () => ({}) }
  const jobs = require('../miniprogram/utils/jobs.js')
  try {
    jobs.appendLocalJob(jobs.normalizeJob({ id: 'a-job', userId: 'a', jobType: 'refine', refineMode: 'direct-edit', methodContent: '放大标签' }))
    assert.deepEqual(jobs.readLocalJobs().map(j => j.id), ['a-job'])
    assert.equal(jobs.readLocalJobs()[0].job_type, 'refine')
    user = { id: 'b' }; assert.equal(jobs.readLocalJobs().length, 0)
    jobs.appendLocalJob(jobs.normalizeJob({ id: 'a-private', userId: 'a' })); assert.equal(jobs.readLocalJobs().length, 0)
    user = null; assert.equal(jobs.readLocalJobs().length, 0)
    assert.ok(stored.some(j => j.id === 'legacy'))
  } finally { session.getCurrentUser = previous }
})
test('clearing history affects only the current owner and keeps other accounts and legacy rows', () => {
  const session = require('../miniprogram/utils/session.js'), previous = session.getCurrentUser
  let user = { id: 'a' }, stored = [{ id: 'a', user_id: 'a' }, { id: 'a-alias', userId: 'a' }, { id: 'b', user_id: 'b' }, { id: 'legacy' }]
  session.getCurrentUser = () => user
  global.wx = { getStorageSync: () => stored, setStorageSync: (_, value) => { stored = value }, removeStorageSync: () => { stored = undefined } }
  const jobs = require('../miniprogram/utils/jobs.js')
  try {
    jobs.clearLocalJobs()
    assert.deepEqual(stored, [{ id: 'b', user_id: 'b' }, { id: 'legacy' }])
    user = null; jobs.clearLocalJobs()
    assert.deepEqual(stored, [{ id: 'b', user_id: 'b' }, { id: 'legacy' }])
    user = { id: 'b' }; jobs.clearLocalJobs()
    assert.deepEqual(stored, [{ id: 'legacy' }])
    stored = [{ id: 'b-only', user_id: 'b' }]; jobs.clearLocalJobs()
    assert.equal(stored, undefined)
  } finally { session.getCurrentUser = previous }
})

function refinePage(requestJson) {
  let user = { id: 'a' }; let listener
  const loaded = loadComponent('pages/refine/refine.js', {
    '../../utils/api': { requestJson, formatError: e => e.message },
    '../../utils/session': { getCurrentUser: () => user, isSessionChecked: () => true, subscribeSession: fn => { listener = fn; return () => {} } },
    '../../utils/jobs': { readLocalJobs: () => [], normalizeJob: x => x, appendLocalJob: () => {} },
    '../../utils/model-registry-store': { getModelRegistryState: () => ({ registry: catalog() }), subscribeModelRegistry: () => () => {}, loadModelRegistry: async () => ({ registry: catalog() }) },
    '../../utils/api-keys': { getApiKeys: () => ({ bailian: 'fixture-only' }) },
  })
  loaded.instance.data.settings = { modelRoutes: routes }
  loaded.definition.lifetimes.attached.call(loaded.instance)
  return { ...loaded, switchUser(value) { user = value; listener(value) } }
}
test('refine source responses from an old account are ignored, and finalized uploads survive list refresh', async () => {
  const pending = []; const { instance, switchUser, definition } = refinePage(() => new Promise(resolve => pending.push(resolve)))
  switchUser({ id: 'b' })
  for (const resolve of pending.splice(0, pending.length - 1)) resolve({ jobs: [{ id: 'a-job', result_images: [{ url: 'https://private/a.png', object_key: 'a', can_preview: true }] }] })
  await new Promise(setImmediate)
  assert.equal(instance.data.source, null)
  pending.pop()({ jobs: [] }); await new Promise(setImmediate)
  instance.data.source = { uploaded: true, jobId: '', objectKey: 'references/b/file', url: 'wxfile://selected' }
  const refresh = instance.loadSources(); pending.pop()({ jobs: [] }); await refresh
  assert.equal(instance.data.source.uploaded, true)
  definition.lifetimes.detached.call(instance)
})
test('refine polling does not overlap and rejects results after account switch', async () => {
  let complete; let getCalls = 0
  const { instance, switchUser, definition } = refinePage(body => body.action === 'getJob' ? (getCalls++, new Promise(resolve => { complete = resolve })) : Promise.resolve({ jobs: [] }))
  instance.data.currentJobId = 'task-a'
  const pending = instance.loadJob('task-a'); await instance.loadJob('task-a')
  assert.equal(getCalls, 1)
  switchUser({ id: 'b' }); complete({ job: { id: 'task-a', status: 'succeeded', result_images: [] } }); await pending
  assert.equal(instance.data.job, null); assert.equal(instance.data.currentJobId, '')
  definition.lifetimes.detached.call(instance)
})
test('input optimizer discards candidate and undo state when account identity changes', async () => {
  let user = { id: 'a' }; let listener; let complete
  const { instance, definition } = loadComponent('components/input-optimizer/input-optimizer.js', {
    '../../utils/session': { getCurrentUser: () => user, subscribeSession: fn => { listener = fn; return () => {} } },
    '../../utils/api': { requestJson: () => new Promise(resolve => { complete = resolve }), formatError: e => e.message },
    '../../utils/api-keys': { getApiKeys: () => ({ bailian: 'fixture-only' }) },
    '../../utils/model-registry-store': { getModelRegistryState: () => ({ registry: { ...catalog(), inputOptimizationContractVersion: 1 } }), subscribeModelRegistry: () => () => {} },
  })
  Object.assign(instance.properties, { target: 'methodContent', inputs: { methodContent: 'Original' }, mainRoute: routes.main })
  definition.lifetimes.attached.call(instance)
  const pending = instance.optimize(); user = { id: 'b' }; listener(user)
  complete({ target: 'methodContent', optimizedText: 'Improved' }); await pending
  assert.equal(instance.data.open, false); assert.equal(instance.data.candidate, ''); assert.equal(instance.data.hasUndo, false)
  definition.lifetimes.detached.call(instance)
})

test('settings recompute ratio and reachable keys from unsaved changes; refine accepts edit-only tiers', () => {
  const registry = catalog()
  const { instance } = loadComponent('components/generation-settings-sheet/generation-settings-sheet.js', {
    '../../utils/model-registry-store': { getModelRegistryState: () => ({ registry }) },
  })
  Object.assign(instance.properties, { purpose: 'create', settings: { ...base, simpleProvider: 'bailian' }, apiKeys: {}, executionRoles: ['main', 'image', 'vision'], libraryTaskName: 'diagram' })
  instance.resetDraft()
  instance.onResolutionChange({ detail: { value: 0 } })
  assert.equal(instance.data.draft.imageSize, '1K')
  assert.equal(instance.data.ratioOptions.some(x => x.value === '16:9'), false)
  instance.data.draft.pipelineMode = 'vanilla'; instance.data.draft.maxCriticRounds = 0
  instance.refreshPresentation(); assert.deepEqual(Array.from(instance.effectiveRoles()), ['image'])
  instance.selectRetrieval({ currentTarget: { dataset: { value: 'auto' } } })
  assert.deepEqual(Array.from(instance.effectiveRoles()), ['main', 'image'])
  registry.providers.bailian.models[1].capabilities.resolutions = []
  registry.providers.bailian.models[1].capabilities.requiresSourceImage = true
  instance.properties.purpose = 'refine'; instance.refreshPresentation()
  assert.ok(instance.data.resolutionOptions.some(x => x.value === 'auto'))
  assert.ok(instance.data.draft.imageSize)
  instance.properties.purpose = 'optimize'; instance.refreshPresentation()
  assert.deepEqual(Array.from(instance.effectiveRoles()), ['main'])
  assert.equal(instance.data.routeRows.length, 1)
})

test('verification-status requests omit session cookies and never persist a server cookie response', async () => {
  const session = require('../miniprogram/utils/session.js'); let seen; const writes = []
  global.wx = { getStorageSync: () => 'existing-session=private-fixture', setStorageSync: (...args) => writes.push(args), request: options => {
    seen = options
    options.success({ statusCode: 200, data: { status: 'verified' }, header: { 'set-cookie': 'unwanted=fixture' }, cookies: ['unwanted=fixture'] })
  } }
  assert.equal(await session.getVerificationStatus('observer-fixture'), 'verified')
  assert.equal(seen.header.Cookie, undefined)
  assert.equal(seen.data.token, 'observer-fixture')
  assert.equal(writes.length, 0)
})
