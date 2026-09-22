import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { STATIC_MODEL_REGISTRY as registry } from '../apps/web/src/lib/staticModelCatalog.js'
import { modelVersionDetail, openRouterModelVersion, presentRegistryModel } from '../apps/web/src/lib/modelPresentation.js'
const require = createRequire(import.meta.url)
const mini = require('../apps/miniprogram/miniprogram/utils/model-registry.js')
const audit = JSON.parse(fs.readFileSync(new URL('../config/model-version-audit.json', import.meta.url)))
const get = (p,id) => registry[p].models.find(m => m.id === id)

test('760 historical identities and capabilities remain unchanged except the explicitly added refine controls', () => {
  const historical = structuredClone(registry)
  for (const p of ['tokenhub', 'xiaomi', 'runware', 'sensenova', 'stepfun', 'qianfan', 'iflytek', 'longcat']) delete historical[p]
  for (const id of ['grok-4.7', 'grok-4.20-multi-agent-0309', 'grok-4.20-multi-agent']) {
    const added = historical.xai.models.find(m => m.id === id)
    assert.equal(added.selectable, true)
    assert.deepEqual(added.roles, ['main', 'vision'])
    historical.xai.models = historical.xai.models.filter(m => m.id !== id)
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
  assert.equal(Object.values(historical).reduce((n,p) => n + p.models.length, 0), 760)
  const stable = Object.fromEntries(Object.entries(historical).sort(([a],[b]) => a < b ? -1 : 1).map(([p,v]) => [p, {defaults:v.defaults,models:[...v.models].sort((a,b) => a.id < b.id ? -1 : 1).map(m => Object.fromEntries(['id','roles','protocol','capabilities','selectable'].map(k=>[k,m[k]])))}]))
  // Captured from the pre-change ec24b73 catalog, independent of the new metadata.
  assert.equal(createHash('sha256').update(JSON.stringify(stable)).digest('hex'), '9824866b06ef5f53e43ddb9a8bb3cee3d31d3e098d88a535835b7e1cf60df458')
})

test('every static ID carries reviewed version metadata through Web, Mini normalization, and repeated presentation', () => {
  const normalized = mini.normalizeModelRegistry({registryVersion:'test',routeContractVersion:1,supportsModelRoutes:true,providers:{...registry,openrouter:{accessKind:'aggregator',defaults:{main:'example',vision:'',image:''},models:[{id:'example',roles:['main']}]}}})
  for (const [channel, provider] of Object.entries(registry)) for (const model of provider.models) {
    const row = audit.models.find(r => r.channel===channel && r.apiModelId===model.id)
    assert.ok(row, channel+'/'+model.id)
    assert.deepEqual(model.version, {kind:row.kind,id:row.versionId,checkedAt:row.checkedAt,sourceUrl:row.sourceUrls[0]})
    assert.equal(model.label,row.displayName,channel+'/'+model.id)
    const client = normalized.providers[channel].models.find(m=>m.id===model.id)
    assert.deepEqual(client.version,model.version)
    assert.equal(client.label,model.label)
    assert.equal(presentRegistryModel(channel,model).label,model.label)
  }
})

test('DeepSeek direct and hosted IDs have distinct versions without alias substitution', () => {
  assert.equal(get('deepseek','deepseek-flash').label,'DeepSeek-V4.1-Flash')
  assert.equal(get('deepseek','deepseek-v4-pro').label,'DeepSeek-V4-Pro-0813')
  assert.equal(get('deepseek','deepseek-v4-pro').version.kind,'rolling')
  assert.equal(get('bailian','deepseek-v4-pro').version.kind,'unconfirmed')
  assert.match(get('bailian','deepseek-v4-pro').label,/待确认/)
  assert.equal(get('bailian','deepseek-v4-pro').releasedAt,null)
  assert.equal(get('bailian','vanchin/deepseek-v4-pro').releasedAt,null)
  assert.equal(get('bailian','deepseek-v4-flash').releasedAt,null)
  assert.equal(get('bailian','deepseek-v4-pro-0813').version.kind,'fixed')
  assert.match(get('tokendance','deepseek-v4-pro').label,/Preview/)
  const or = audit.models.find(m=>m.channel==='openrouter' && m.apiModelId==='deepseek/deepseek-v4-pro')
  assert.equal(or.versionId,'deepseek/deepseek-v4-pro-20260423')
  assert.match(or.displayName,/0423/)
})

test('rolling pointers use documented defaults, not the newest snapshot or a date heuristic', () => {
  assert.equal(get('openai','gpt-4o').version.id,'gpt-4o-2024-08-06')
  assert.equal(get('openai','gpt-4-1106-preview').version.id,'gpt-4-1106-preview')
  assert.equal(get('openai','gpt-4-1106-preview').version.kind,'unconfirmed')
  assert.doesNotMatch(get('openai','gpt-4-1106-preview').label,/0613/)
  assert.equal(get('anthropic','claude-opus-5').version.kind,'fixed')
  assert.match(get('anthropic','claude-opus-4-5-20251101').label,/20251101/)
  assert.equal(get('mistral','mistral-medium-3').version.id,'mistral-medium-3-5')
  assert.equal(get('openai','chat-latest').version.kind,'rolling')
  assert.equal(get('openai','chat-latest').version.id,'')
  assert.match(modelVersionDetail(get('openai','chat-latest')),/具体版本待确认/)
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
