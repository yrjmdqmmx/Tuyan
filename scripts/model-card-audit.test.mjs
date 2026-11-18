import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { countCards, displayValues, isKnown, packRegistry, unpackRegistry } from './lib/model-card-audit.mjs'
import { channelOwns, readModalityEvidence, modalityDisagreements } from './lib/model-card-modality-evidence.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const read = file => JSON.parse(fs.readFileSync(root + file, 'utf8'))

test('known counts use rendered fields, normalize old missing labels, and distinguish N/A from numbers', () => {
  const rows = [0, 1].map(id => ({ channel: 'test', model: { id, roles: ['vision'] } }))
  const card = (_, model) => model.id === 0 ? { input: '文本', output: '待确认', context: '官方未公布', limitRows: [{ label: '最大输出', value: '100 tokens' }] }
    : { input: '未知', output: '图像', context: '不适用', maxOutput: '42K tokens' }
  const result = countCards(rows, card)
  assert.deepEqual(result.totals, { cards: 2, inputModalities: 1, outputModalities: 1, totalContextTokens: 1, maxOutputTokens: 1, contextNumeric: 0, maxOutputNumeric: 1, contextNotApplicable: 1, maxOutputNotApplicable: 0 })
  assert.equal(displayValues(card('', { id: 0 })).maxOutputTokens, '未知')
  assert.equal(isKnown('未单列'), false)
  assert.equal(isKnown('不支持'), true)
})

test('compact registry preserves all specification data without model-to-model mutable aliases', () => {
  const model = { id: 'one', roles: ['vision'], capabilities: { referenceImages: true }, specificModelSpecifications: { officialInputModalities: ['text', 'image'], sourceUrls: ['https://example.test'] } }
  const registry = { providers: { test: { models: [model, { ...model, id: 'two' }] } } }
  const restored = unpackRegistry(packRegistry(registry))
  assert.deepEqual(restored, registry)
  restored.providers.test.models[0].specificModelSpecifications.officialInputModalities.push('audio')
  assert.deepEqual(restored.providers.test.models[1].specificModelSpecifications.officialInputModalities, ['text', 'image'])
})

test('misleading audit excludes vendor inheritance and unknowns; detects both error directions', () => {
  assert.equal(channelOwns('bailian', 'https://platform.kimi.com/docs/models'), false)
  assert.equal(channelOwns('bailian', 'https://help.aliyun.com/zh/model-studio/kimi-k3'), true)
  const evidence = { value: ['text', 'image'], sourceUrl: 'https://help.aliyun.com/zh/model-studio/kimi-k3', file: 'captured.json' }
  const result = modalityDisagreements('bailian', 'example', 'inputModalities', [
    { id: 'text', state: 'supported' }, { id: 'image', state: 'unsupported' }, { id: 'audio', state: 'supported' }, { id: 'video', state: 'unknown' },
  ], evidence)
  assert.deepEqual(result.map(row => [row.field, row.cardValue, row.officialValue]), [['input/image', '不支持', '列为支持'], ['input/audio', '支持', '未列支持（不等于明确不支持）']])
  assert.deepEqual(modalityDisagreements('custom', 'example', 'inputModalities', [{ id: 'image', state: 'supported' }], null), [])
  const captured = readModalityEvidence(root)
  assert.deepEqual(captured.index.get('bailian/kimi-k3').inputModalities.value, ['image', 'text'])
  assert.equal(captured.index.get('bailian/kimi-k3').inputModalities.file, 'config/channel-audit/modality-table-review-r10-20261109.json')
  assert.ok(captured.index.get('gemini/gemini-nano-banana-2.1').inputModalities.value.includes('file'))
  assert.equal(captured.index.get('bailian/qwen3.7-max').inputModalities.ambiguous, true)
  const runware = captured.index.get('runware/openai:gpt-image@2.5-flare').inputModalities
  assert.equal(runware.positiveOnly, true)
  assert.ok(runware.value.includes('image'))
  assert.deepEqual(modalityDisagreements('runware', 'example', 'inputModalities', [{ id: 'audio', state: 'supported' }], runware), [])
  assert.equal(modalityDisagreements('runware', 'example', 'inputModalities', [{ id: 'image', state: 'unsupported' }], runware).length, 1)
})

test('R11 reports regenerate offline without baseline checkout or raw private captures', () => {
  execFileSync(process.execPath, ['scripts/report-model-card-r11.mjs', '--frozen-main', '--frozen-head', '--check'], { cwd: root, stdio: 'pipe' })
  execFileSync(process.execPath, ['scripts/report-model-card-r10.mjs', '--frozen-head', '--check'], { cwd: root, stdio: 'pipe' })
  const main = read('apps/web/tests/fixtures/r11-main-rendered.json')
  assert.equal(main.capture.commit, 'c7b6a2fc')
  const rows = Object.keys(main.fullObject.values).map(key => ({ channel: key.split('/')[0], model: { id: key } }))
  for (const mode of ['fullObject', 'idOnly']) {
    const original = main[mode]
    const recounted = countCards(rows, (_, model) => {
      const view = original.values[model.id]
      return { input: view.inputModalities, output: view.outputModalities, context: view.totalContextTokens, maxOutput: view.maxOutputTokens }
    })
    assert.deepEqual(recounted.totals, original.totals)
    assert.deepEqual(recounted.perChannel, original.perChannel)
  }
  assert.deepEqual(Object.values(main.fullObject.totals).slice(0, 5), [1122, 983, 968, 534, 0])
  const misleading = read('docs/model-card-audit-20261109-r11-misleading.json')
  assert.equal(misleading.totalCards, 1061)
  assert.equal(misleading.noChannelOfficialEvidence, misleading.noEvidence.length)
  assert.equal(misleading.misleadingEntries, misleading.rows.length)
  assert.ok(misleading.rows.every(row => channelOwns(row.channel, row.sourceUrl)))
  assert.equal(new Set(misleading.rows.map(row => row.channel + '/' + row.modelId + '/' + row.field)).size, misleading.rows.length)
})
