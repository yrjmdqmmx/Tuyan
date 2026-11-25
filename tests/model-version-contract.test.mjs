import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { STATIC_MODEL_REGISTRY as registry } from '../apps/web/src/lib/staticModelCatalog.js'
import { historicalModels, laterDisabled } from '../test-support/model-catalog-history.mjs'
import { catalogBeforeNovember24 } from '../test-support/retirement-projections.mjs'
import november24Retirements from '../config/channel-audit/retirements-20261124.json' with {type:'json'}
import removedLedger from '../config/removed-models.json' with {type:'json'}
import { readExecutionFixture } from '../test-support/execution-capability.mjs'
import { MODEL_AUDIT_DATA, removedModel } from '../apps/web/src/lib/modelAudit.js'
import { modelVersionDetail, openRouterModelVersion, presentRegistryModel } from '../apps/web/src/lib/modelPresentation.js'
const require = createRequire(import.meta.url)
const mini = require('../apps/miniprogram/miniprogram/utils/model-registry.js')
const audit = JSON.parse(fs.readFileSync(new URL('../config/model-version-audit.json', import.meta.url)))
const get = (p,id) => registry[p].models.find(m => m.id === id)
const november24Removed = new Set(november24Retirements.remove.map(({provider, id}) => provider+'/'+id))

test('all 760 historical identities retain their contracts or have exact reviewed changes', () => {
  const historical = catalogBeforeNovember24(structuredClone(registry))
  for (const [provider, ids] of [['openai', ['gpt-6-sol', 'gpt-6-luna']], ['anthropic', ['claude-opus-5-5']]]) {
    for (const id of ids) {
      assert.deepEqual(historical[provider].models.find(model => model.id === id).roles, ['main', 'vision'])
    }
  }
  for (const id of ['grok-4.7', 'grok-4.20-multi-agent-0309', 'grok-4.20-multi-agent']) {
    const added = historical.xai.models.find(m => m.id === id)
    assert.equal(added.selectable, true)
    assert.deepEqual(added.roles, ['main', 'vision'])
  }
  for (const [id, maxImages] of [['grok-imagine-image-2.0', 5], ['grok-imagine-image', 3], ['grok-imagine-image-quality', 3]]) {
    const model = historical.xai.models.find(m => m.id === id)
    assert.deepEqual(model.capabilities.refineControls, {
      version: 1, maxImages, sourceCounts: true, mask: false, maskWithReferences: false,
      structured: null, checkedAt: '2026-09-22',
      source: 'https://docs.x.ai/developers/rest-api-reference/inference/images',
    })
    delete model.capabilities.refineControls
  }
  const bria = historical.fal.models.find(m => m.id === 'bria/fibo-edit-1.5/edit')
  assert.equal(bria.capabilities.refineControls.structured, 'bria-fibo')
  assert.equal(bria.capabilities.refineControls.maxImages, 4)
  assert.ok(bria.capabilities.refineAspectRatios.includes('16:9'))
  bria.capabilities.refineAspectRatios = []
  bria.capabilities.refineAspectRatiosByResolution = {auto: []}
  delete bria.capabilities.refineControls
  const qwen = historical.replicate.models.find(m => m.id === 'qwen/qwen-image-edit-plus')
  assert.equal(qwen.capabilities.refineControls.maxImages, 3)
  delete qwen.capabilities.refineControls
  const digest = createHash('sha256').update(JSON.stringify(historicalModels)).digest('hex')
  assert.equal(digest, '9824866b06ef5f53e43ddb9a8bb3cee3d31d3e098d88a535835b7e1cf60df458')
  let retained = 0
  const removed = []
  for (const [provider, baseline] of Object.entries(historicalModels)) {
    assert.deepEqual(historical[provider].defaults, baseline.defaults, provider)
    for (const prior of baseline.models) {
      const key = provider+'/'+prior.id
      const model = historical[provider].models.find(m => m.id === prior.id)
      if (Object.hasOwn(MODEL_AUDIT_DATA.removed, key) && !november24Removed.has(key)) {
        assert.equal(model, undefined, key)
        removed.push(key)
        continue
      }
      assert.ok(model, key)
      const expected = {...prior}
      if (laterDisabled.has(key)) expected.selectable = false
      // The reviewed Replicate schema outputs video and accepts an image as its first frame.
      if (key === 'replicate/alibaba/wan-3') {
        expected.roles = []
        expected.capabilities = {maxReferenceImages:0, referenceImages:false, imageGeneration:false,
          imageEditing:false, imageEditMode:'none', outputFormats:[], refineResolutions:[], aspectRatios:[], refineAspectRatios:[]}
      }
      for (const field of Object.keys(prior)) assert.deepEqual(model[field], expected[field], key+'/'+field)
      retained++
    }
  }
  assert.equal(retained, 668)
  assert.equal(removed.length, 92)
  // Intersection of ec24b73 with the exact d9592e04 removal records (#245 and #254).
  assert.equal(createHash('sha256').update(JSON.stringify(removed.sort())).digest('hex'),
    'd350724c86f9a5dfcd77559239e967a28b1337c63d6ed8177b1e4622ab10bf37')
})

test('every static ID carries reviewed version metadata through Web, Mini normalization, and repeated presentation', () => {
  const normalized = mini.normalizeModelRegistry({registryVersion:'test',routeContractVersion:1,supportsModelRoutes:true,providers:{...registry,openrouter:{accessKind:'aggregator',defaults:{main:'example',vision:'',image:''},models:[{id:'example',roles:['main']}]}}})
  // Only these two raw TokenDance directory names have a vendor prefix.
  const vendorPrefixes = {'tokendance/kimi-k3.1-pro':'MoonshotAI: ', 'tokendance/minimax-m3.1-flash':'MiniMax: '}
  const rows = new Map(audit.models.map(row => [row.channel+'/'+row.apiModelId, row]))
  assert.equal(rows.size, audit.models.length)
  for (const [channel, provider] of Object.entries(registry)) for (const model of provider.models) {
    const key = channel+'/'+model.id
    const row = rows.get(key)
    assert.ok(row, key)
    assert.equal(typeof row.versionId, 'string', key)
    assert.match(row.sourceUrls[0], /^https:\/\//, key)
    assert.match(row.checkedAt, /^\d{4}-\d{2}-\d{2}$/, key)
    assert.deepEqual(model.version, {kind:row.kind,id:row.versionId,checkedAt:row.checkedAt,sourceUrl:row.sourceUrls[0]})
    assert.equal((vendorPrefixes[key] ?? '') + model.label, row.displayName, key)
    const client = normalized.providers[channel].models.find(m=>m.id===model.id)
    assert.deepEqual(client.version,model.version)
    assert.equal(client.label,model.label)
    assert.equal(presentRegistryModel(channel,model).label,model.label)
  }
})

test('DeepSeek direct and hosted IDs have distinct versions without alias substitution', () => {
  const hostedFlash = get('siliconflow','deepseek-ai/DeepSeek-V4.1-Flash')
  assert.equal(hostedFlash.version.kind, 'rolling')
  assert.equal(hostedFlash.version.id, 'deepseek-v4.1-flash-1017')
  assert.equal(hostedFlash.version.id, hostedFlash.specifications.resolvedModel.modelId)
  assert.equal(hostedFlash.version.sourceUrl, hostedFlash.specifications.resolvedModel.sourceUrls[0])
  assert.equal(get('deepseek','deepseek-flash').label,'DeepSeek-V4.1-Flash')
  assert.equal(get('deepseek','deepseek-v4-pro').label,'DeepSeek-V4-Pro-0813')
  assert.equal(get('deepseek','deepseek-v4-pro').version.kind,'rolling')
  assert.equal(get('bailian','deepseek-v4-pro').version.kind,'unconfirmed')
  assert.equal(get('bailian','deepseek-v4-pro').label,'DeepSeek-V4-Pro')
  assert.equal(get('bailian','deepseek-v4-pro').version.id,'deepseek-v4-pro')
  assert.equal(get('bailian','deepseek-v4-pro').releasedAt,null)
  assert.equal(get('bailian','vanchin/deepseek-v4-pro').releasedAt,null)
  assert.equal(get('bailian','deepseek-v4-flash'),undefined)
  assert.equal(removedModel('bailian','deepseek-v4-flash').stopDate,'2026-10-10')
  assert.ok(get('deepseek','deepseek-v4-flash'))
  assert.equal(get('bailian','deepseek-v4-pro-0813').version.kind,'fixed')
  assert.match(get('tokendance','deepseek-v4-pro').label,/Preview/)
  const or = audit.models.find(m=>m.channel==='openrouter' && m.apiModelId==='deepseek/deepseek-v4-pro')
  assert.equal(or.versionId,'deepseek/deepseek-v4-pro-20260423')
  assert.match(or.displayName,/0423/)
})

test('rolling pointers use documented defaults, not the newest snapshot or a date heuristic', () => {
  assert.equal(get('openai','gpt-4o').version.id,'gpt-4o-2024-08-06')
  const historicalPreview = readExecutionFixture().web.openai.models.find(m => m.id === 'gpt-4-1106-preview')
  assert.equal(historicalPreview.version.id,'gpt-4-1106-preview')
  assert.equal(historicalPreview.version.kind,'unconfirmed')
  assert.doesNotMatch(historicalPreview.label,/0613/)
  assert.equal(get('openai','gpt-4-1106-preview'),undefined)
  const preview = removedModel('openai','gpt-4-1106-preview')
  assert.equal(preview.displayName,'GPT-4-1106-preview')
  assert.equal(preview.stopDate,'2026-10-23')
  assert.equal(preview.replacementApiId,null)
  assert.equal(preview.sourceUrl,'https://developers.openai.com/api/docs/deprecations')
  assert.equal(get('openai','gpt-5.3-codex').version.id,'gpt-5.3-codex')
  assert.equal(get('openai','gpt-5.3-codex').version.kind,'unconfirmed')
  assert.equal(get('anthropic','claude-opus-5').version.kind,'fixed')
  assert.match(get('anthropic','claude-opus-4-5-20251101').label,/20251101/)
  assert.equal(get('mistral','mistral-medium-3').version.id,'mistral-medium-3-5')
  assert.equal(get('openai','chat-latest').version.kind,'rolling')
  assert.equal(get('openai','chat-latest').version.id,'')
  assert.equal(modelVersionDetail(get('openai','chat-latest')), '滚动别名 · 具体版本未知 · 核对于 2026-09-21')
})

test('live aggregator metadata never borrows direct-provider targets or keeps a stale canonical identity', () => {
  const old=openRouterModelVersion('deepseek/deepseek-v4-pro','deepseek/deepseek-v4-pro-20260423','2026-09-21')
  const next=openRouterModelVersion('deepseek/deepseek-v4-pro','different-reviewed-catalog-id','2026-09-22')
  assert.equal(old.kind,'unconfirmed')
  assert.equal(presentRegistryModel('openrouter',{id:'deepseek/deepseek-v4-pro',label:'DeepSeek: DeepSeek V4 Pro 0423',version:old}).label,'DeepSeek V4 Pro 0423')
  // Drop a date inherited from an earlier family-wide rule as well as avoiding new guesses.
  assert.equal(presentRegistryModel('openrouter',{id:'deepseek/deepseek-v4-pro',version:old,releasedAt:'2026-08-13'}).releasedAt,null)
  assert.equal(presentRegistryModel('openrouter',{id:'deepseek/deepseek-v4-pro-0813'}).releasedAt,'2026-08-13')
  assert.notEqual(old.id,next.id)
  assert.equal(openRouterModelVersion('~deepseek/deepseek-pro-latest','~deepseek/deepseek-pro-latest','2026-09-21').id,'')
  assert.equal(openRouterModelVersion('deepseek/deepseek-v4-pro','','2026-09-22').id,'')
})

test('channel geography remains a sort rule and never appears in picker labels', () => {
  for (const file of ['../apps/web/src/components/ModelPicker.jsx','../apps/miniprogram/miniprogram/components/model-picker/model-picker.ts']) {
    const source=fs.readFileSync(new URL(file,import.meta.url),'utf8')
    assert.doesNotMatch(source,/国内|国外|modelChannelCategoryLabel/)
  }
})

test('each November 24 retirement is absent from the live registry and retains its reviewed evidence', () => {
  assert.equal(november24Retirements.recordedAt, '2026-11-24')
  assert.equal(november24Retirements.remove.length, 68)
  assert.equal(november24Removed.size, 68)
  for (const row of november24Retirements.remove) {
    const key = row.provider+'/'+row.id
    assert.equal(get(row.provider, row.id), undefined, key)
    assert.match(row.source, /^https:\/\//, key)
    assert.match(row.evidence_read, /^\d{4}-\d{2}-\d{2}$/, key)
    assert.ok(row.evidence.trim(), key)
    assert.ok(removedLedger[key], key)
    assert.equal(removedLedger[key].sourceUrl, row.source, key)
    assert.equal(removedLedger[key].stopDate, row.time ?? row.date, key)
    assert.deepEqual(MODEL_AUDIT_DATA.removed[key], removedLedger[key], key)
  }
})
