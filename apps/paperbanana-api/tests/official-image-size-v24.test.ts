import { assertRemoved } from './helpers/catalog-retirements.js'
import { assertAuditedModelAvailable } from '../../../packages/api/src/model-audit.js'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import sharp from 'sharp'
import { buildOfficialImageRequest, STEP_IMAGE_SUBMISSION_CUTOFF } from '../../../packages/api/src/official-image-channels.js'
import { auditedChannelContract } from '../../../packages/api/src/audited-channel-contracts.js'
import { refineControlsFor, refineInputIssue } from '../../../packages/api/src/refine-controls.js'
import { imageAspectRatiosByResolution, resolveImageSize } from '../../../packages/types/src/image-size-contract.js'
import { buildAspectRatioOptions, CANONICAL_ASPECT_RATIOS } from '../../../packages/types/src/aspect-ratios.js'
// @ts-ignore Generated catalog intentionally has no TypeScript declarations.
import { STATIC_MODEL_REGISTRY } from '../../web/src/lib/staticModelCatalog.js'

const root = new URL('../../../', import.meta.url)
const sizes = JSON.parse(fs.readFileSync(new URL('config/image-size-contracts.json', root), 'utf8'))
const stepAudit = JSON.parse(fs.readFileSync(new URL('config/channel-audit/v24/stepfun.json', root), 'utf8'))
const sourceBytes = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#fff' } }).png().toBuffer()
const sourceBase64 = sourceBytes.toString('base64')
const source = { mimeType: 'image/png', base64: sourceBase64, dataUrl: 'data:image/png;base64,' + sourceBase64 }
const original = [
  'sensenova/sensenova-u1.5-lite', 'sensenova/sensenova-u1.5-fast',
  'stepfun/step-2x-large', 'stepfun/step-image-edit-2',
]

test('all advertised SenseNova/StepFun model/operation/tier/ratio selections produce valid official requests', context => {
  const routes = Object.keys(sizes.routes).filter(key => /^(sensenova|stepfun)\//.test(key))
  const removed = ['stepfun/step-2x-large', 'stepfun/step-image-edit-2']
  for (const key of removed) assertRemoved('stepfun', key.slice('stepfun/'.length))
  const expected = original.filter(key => !removed.includes(key))
  assert.deepEqual(new Set(routes), new Set(expected), 'all surviving image SKUs, minus the two enumerated removals')
  let combinations = 0
  for (const key of routes) {
    const slash = key.indexOf('/'), provider = key.slice(0, slash), modelId = key.slice(slash + 1)
    const model = STATIC_MODEL_REGISTRY[provider].models.find((m: any) => m.id === modelId)
    assert.ok(model, key)
    for (const operation of ['generation', 'editing']) {
      const profileId = sizes.routes[key][operation], profile = sizes.profiles[profileId]
      assert.ok(profile, key + ' ' + operation)
      const capabilityField = operation === 'generation' ? 'aspectRatios' : 'refineAspectRatios'
      const expectedMap = imageAspectRatiosByResolution(profile, CANONICAL_ASPECT_RATIOS)
      assert.deepEqual(model.capabilities[capabilityField + 'ByResolution'], expectedMap, key + ' ' + operation)
      for (const resolution of Object.keys(profile.tiers)) {
        const options = buildAspectRatioOptions({ capabilities: model.capabilities, capabilityField, resolution })
        assert.ok(options.length, key + ' has no visible selection')
        for (const { value: aspectRatio, disabled } of options) {
          if (disabled) continue
          const resolved = resolveImageSize(profile, aspectRatio, resolution)
          const label = [key, operation, resolution, aspectRatio, resolved.size || 'inherit'].join(' ')
          const edit = operation === 'editing' ? { inputs: { version: 1 as const } } : undefined
          assert.equal(refineInputIssue(refineControlsFor(provider, modelId), edit?.inputs, aspectRatio, resolution), '', label)
          const input = { provider, model: modelId, region: 'cn' as const, apiKey: 'local-fixture', prompt: '保持科研结构，修改图形配色。', aspectRatio, resolution, size: resolved,
            ...(operation === 'editing' ? { source, edit } : {}) }
          const prepared = buildOfficialImageRequest(input)
          assert.ok(prepared.endpoint.startsWith(provider === 'sensenova' ? 'https://token.sensenova.cn/v1/' : 'https://api.stepfun.com/v1/'), label)
          if (prepared.multipart) {
            assert.equal(modelId, 'step-image-edit-2')
            assert.equal(operation, 'editing')
            const form = prepared.body as FormData
            assert.equal(form.has('size'), false, label)
            assert.equal((form.get('image') as File).size, sourceBytes.length, label)
          } else {
            const body = prepared.body as Record<string, unknown>
            assert.equal(body.model, modelId, label)
            assert.equal(body.n, 1, label)
            if (modelId === 'step-image-edit-2') assert.equal(body.size, resolved.height + 'x' + resolved.width, label + ' must convert W/H to HxW')
            else assert.equal(body.size, resolved.size || (provider === 'sensenova' ? 'auto' : '1024x1024'), label)
          }
          combinations++
        }
      }
    }
  }
  assert.ok(combinations > 250, 'exercise all advertised choices, not just representative sizes')
  context.diagnostic(combinations + ' advertised combinations checked with a real 1024×1024 PNG')
})

test('Step image lifecycle cutoff matches ordinary API guard and explicitly identifies the China product policy', () => {
  for (const id of ['step-2x-large', 'step-image-edit-2']) {
    const evidence = assertRemoved('stepfun', id)
    const lifecycle = stepAudit.models.find((model: any) => model.id === id).lifecycle
    assert.equal(evidence.stopDate, '2026-10-10')
    assert.equal(lifecycle.retirementDate, evidence.stopDate)
    assert.equal(Date.parse(evidence.stopDate + 'T00:00:00+08:00'), Date.parse(STEP_IMAGE_SUBMISSION_CUTOFF))
    assert.equal(Date.parse(lifecycle.productSubmissionCutoff.at), Date.parse(STEP_IMAGE_SUBMISSION_CUTOFF))
    assert.equal(lifecycle.productSubmissionCutoff.timezone, 'Asia/Shanghai')
    assert.match(lifecycle.productSubmissionCutoff.reason, /application policy.*China midnight.*not a provider-announced timestamp/)
    assert.equal(lifecycle.retirementAt, null, 'official evidence supplies a date, not an exact instant')
    assert.ok(lifecycle.sourceUrls.includes('https://platform.stepfun.com/docs/zh/guides/image-offline-notice'))
    assert.equal(auditedChannelContract('stepfun', id), undefined)
    assert.throws(() => assertAuditedModelAvailable('stepfun', id), { businessCode: 'MODEL_UNAVAILABLE', requestState: 'not_sent' })
  }
  for (const id of ['sensenova-u1.5-lite', 'sensenova-u1.5-fast']) assert.equal(auditedChannelContract('sensenova', id).expiresAt, undefined)
})
