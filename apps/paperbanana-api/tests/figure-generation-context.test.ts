import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createDocument, PROFILES } from '@paperbanana/figure-core'
import { createFigureStudioService, prepareFigureRequest } from '../src/figure-studio.js'

const route = { mainRoute: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' }, apiKeys: { openai: 'fixture-key-no-network' } }
const plan = { title: 'Flow', summary: 'Author supplied', nodes: [{ id: 'input', label: 'Input' }], edges: [], notes: ['Author review'] }
const source = () => createDocument({ id: 'rules-context-source', revision: 5, elements: [{ id: 'selected', type: 'text', x: 10, y: 10, width: 20, height: 10, text: 'Author label' }, { id: 'unselected', type: 'text', x: 50, y: 10, width: 20, height: 10, text: 'Private unselected label' }], ruleOverrides: { 'text-size': { value: { min: 8, max: 10 } }, 'max-height': { enabled: false } }, customRules: [{ id: 'project-size', label: 'Project size', kind: 'text-size', value: { min: 9, max: 11 } }, { id: 'author', label: 'Author checks', kind: 'manual', message: 'Confirm units' }] })

test('actual planning adapter receives server-derived baseline and working context but no source text or raster bytes', async () => {
  const document = source()
  const bytes = await readFile(new URL('../../../packages/figure-core/tests/fixtures/raster.png', import.meta.url))
  document.assets.photo = { mimeType: 'image/png', pixelWidth: 2, pixelHeight: 2, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` }
  let calls = 0
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async (_body, system, user) => {
    calls++
    const input = JSON.parse(user), context = input.generationContext
    assert.deepEqual(Object.keys(input).sort(), ['generationContext', 'materials'])
    assert.equal(input.materials, 'Author supplied materials')
    assert.deepEqual(context.document, { id: document.id, revision: 5, canvas: document.canvas })
    assert.deepEqual(context.officialBaseline.rules, PROFILES[0].rules)
    assert.deepEqual(context.officialBaseline.rules.find((r: any) => r.id === 'text-size').value, { min: 5, max: 7 })
    assert.equal(context.working.rules.find((r: any) => r.id === 'max-height').enabled, false)
    assert.equal(context.working.rules.find((r: any) => r.id === 'author').origin, 'custom')
    assert.deepEqual(context.constraints.textSizePt, { min: 9, max: 10 })
    assert.match(system, /officialBaseline/); assert.match(system, /manual\/unverified/)
    assert.doesNotMatch(user, /base64|Private unselected label|Author label|fixture-key/)
    return JSON.stringify(plan)
  } })
  const before = JSON.stringify(document)
  const result = await service.handle({ action: 'figureStudioPlan', document, materials: 'Author supplied materials', ...route })
  assert.equal(result.code, 0, JSON.stringify(result)); assert.equal(calls, 1)
  assert.equal(JSON.stringify(document), before)
  assert.deepEqual(prepareFigureRequest({ action: 'figureStudioPlan', document, materials: 'Author supplied materials', ...route }, ['openai']).document, document)
})

test('actual selected-object editor gets the same rules without sending unselected content', async () => {
  const document = source()
  const commands = [{ type: 'update', id: 'selected', patch: { fontSize: 9 } }]
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async (_body, system, user) => {
    const input = JSON.parse(user)
    assert.deepEqual(input.selectedObjects, [document.elements[0]])
    assert.equal(input.generationContext.scope, 'document')
    assert.deepEqual(input.generationContext.constraints.textSizePt, { min: 9, max: 10 })
    assert.doesNotMatch(user, /Private unselected label/)
    assert.match(system, /preserve all other fields/)
    return JSON.stringify({ commands })
  } })
  const result = await service.handle({ action: 'figureStudioEdit', document, baseRevision: 5, instruction: 'Set selected label to the working size', objectIds: ['selected'], ...route })
  assert.deepEqual(result, { code: 0, baseRevision: 5, commands })
})

test('invalid documents, forged official context and conflicting or oversized rules reject before any model call', async () => {
  let calls = 0
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async () => { calls++; return JSON.stringify(plan) } })
  const invalidDocuments = [
    { ...source(), canvas: { widthMm: -1, heightMm: 110, background: '#fff' } },
    { ...source(), profileId: 'forged-official-profile' },
    { ...source(), officialBaseline: { rules: [] } },
    { ...source(), assets: { unsafe: { mimeType: 'image/png', dataUrl: 'https://unsafe.invalid/image.png', pixelWidth: 1, pixelHeight: 1 } } },
    createDocument({ customRules: [{ id: 'contradiction', label: 'Large', kind: 'text-size', value: { min: 10, max: 12 } }] }),
    createDocument({ customRules: Array.from({ length: 30 }, (_, i) => ({ id: `long-${i}`, label: 'Long', kind: 'manual', message: '字'.repeat(1000) })) }),
  ]
  for (const document of invalidDocuments) {
    const result = await service.handle({ action: 'figureStudioPlan', materials: 'Materials', document, ...route })
    assert.ok(result.code >= 400, JSON.stringify(result)); assert.equal(result.requestState, 'not_sent'); assert.equal(result.billingStatus, 'not_called')
  }
  const forged = await service.handle({ action: 'figureStudioPlan', materials: 'Materials', document: source(), generationContext: { officialBaseline: { rules: [] } }, ...route })
  assert.equal(forged.code, 400)
  const edit = await service.handle({ action: 'figureStudioEdit', document: invalidDocuments[4], baseRevision: 0, instruction: 'Font', objectIds: ['selected'], ...route })
  assert.equal(edit.errorCode, 'FIGURE_STUDIO_GENERATION_RULES_INVALID')
  assert.equal(calls, 0)
})

test('legacy planning stays explicitly unconfigured while capability advertises the new contract', async () => {
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async (_body, system, user) => {
    const context = JSON.parse(user).generationContext
    assert.equal(context.scope, 'unconfigured'); assert.equal(context.version, 1)
    assert.equal(context.officialBaseline, undefined); assert.equal(context.working, undefined)
    assert.doesNotMatch(user, /nature-main-final/); assert.match(system, /do not claim any journal rules/)
    return JSON.stringify(plan)
  }, runConverter: async () => { throw new Error('Fixture does not use converter') } })
  assert.equal((await service.handle({ action: 'figureStudioPlan', materials: 'Legacy materials', ...route })).code, 0)
  assert.equal((await service.handle({ action: 'figureStudioCapabilities' })).generationContextVersion, 1)
})
