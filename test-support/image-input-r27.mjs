import fs from 'node:fs'
import {restoreI7IconWording} from './icon-simplify-r27.mjs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {productBundle} from './execution-capability.mjs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import review from '../config/channel-audit/review-r27-20261110.json' with {type:'json'}
import decision from '../docs/model-modality-image-input-decision.json' with {type:'json'}
import {humanSourceUrl} from '../packages/api/src/card-presentation.mjs'

export {review}
const baselineBytes = fs.readFileSync(new URL('./fixtures/image-input-r27-before.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'), '1b98310ddcbcfd25101cea1d1f68a11a56c2b0fef6321a7dbcb11c0a1e0be559', 'R27 frozen HEAD presentation fixture')
export const baseline = JSON.parse(gunzipSync(baselineBytes))
export function presentationDiff(before, after, path = '') {
  if (JSON.stringify(before) === JSON.stringify(after)) return []
  if (before === null || after === null || typeof before !== 'object' || typeof after !== 'object') return [{path, before, after}]
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => presentationDiff(before[key], after[key], path + '/' + key))
}
export function assertImageInput(key, fact, icons, sources) {
  const row = decision.rows.find(row => row.identity === key), input = review.reviews[key].inputModalities
  assert.equal(input.quote, row.officialQuoteOnEditingOrReferenceImages, key + ' verbatim original quote')
  assert.equal(input.sourceUrl, row.url, key + ' configured edit documentation')
  assert.equal(fact.sourceUrl, row.url, key + ' input fact source')
  assert.equal(fact.provenance, 'channel', key)
  assert.equal(fact.verifiedAt, input.verifiedAt, key)
  assert.deepEqual(plain(fact.value), ['text','image'], key)
  const image = icons.find(icon => icon.id === 'image')
  assert.equal(image.state, 'supported', key)
  assert.equal(image.accessibleLabel, '图像：支持', key)
  assert.match(image.tooltip, /渠道资料 · .*编辑接口（\d{4}-\d{2}-\d{2}）/, key)
  assert.ok(sources.some(source => source.url === humanSourceUrl(row.url) && source.label.includes('编辑接口')), key + ' visible edit source')
  assert.equal(sources[0].url, humanSourceUrl(row.url), key + ' primary edit-interface source')
  assert.doesNotMatch(JSON.stringify({fact,icons,sources}), /创始人|决定 A/, key + ' internal note')
}

export function assertPresentationChanges(now) {
  now = restoreI7IconWording(now)
  assert.equal(baseline.head, 'd1c6399493f4e216cb0cc482c5312cbea8ed2f8d')
  assert.deepEqual(Object.keys(now), Object.keys(baseline.rows))
  assert.equal(Object.keys(now).length, 1064)
  const allowed = [
    /^\/web\/data\/(?:fields\/inputModalities|inputFact)\/(?:value\/1|sourceUrl|verifiedAt)$/,
    /^\/web\/data\/input$/,
    /^\/web\/data\/(?:sources|channelSources)\/\d+$/,
    /^\/web\/sources\/\d+(?:\/(?:url|label))?$/,
    /^\/web\/inputIcons\/(?:0\/tooltip|1\/(?:state|accessibleLabel|tooltip))$/,
    /^\/web\/fieldSources\/0$/,
    /^\/mini\/card\/specRows\/0\/(?:value|unknownText|icons\/(?:0\/tooltip|1\/(?:state|accessibleLabel|tooltip)))$/,
    /^\/mini\/card\/specSources\/0\/(?:url|label)$/,
    /^\/mini\/card\/auditMessage$/,
    /^\/mini\/audit\/fields\/inputModalities\/(?:value\/1|sourceUrl|verifiedAt)$/,
    /^\/mini\/audit\/sourceUrl$/,
  ]
  const changed = []
  for (const [key, row] of Object.entries(now)) {
    const changes = presentationDiff(baseline.rows[key], row)
    if (!changes.length) continue
    assert.ok(review.reviews[key], key + ' unexpected changed card')
    for (const change of changes) assert.ok(allowed.some(pattern => pattern.test(change.path)), key + ' unexpected change: ' + change.path)
    assertImageInput(key, row.web.data.inputFact, row.web.inputIcons, row.web.sources)
    assertImageInput(key, row.mini.audit.fields.inputModalities, row.mini.card.specRows[0].icons, row.mini.card.specSources)
    const inputLine = '输入：渠道公布（核实日期：' + review.reviews[key].inputModalities.verifiedAt + '）'
    assert.equal(row.web.fieldSources[0], inputLine, key)
    assert.equal(row.mini.card.auditMessage, baseline.rows[key].mini.card.auditMessage.replace('输入：渠道公布', inputLine), key + ' only the input date line changes')
    // All former Web source URLs survive; only the verified edit citation may be added.
    const url = humanSourceUrl(review.reviews[key].inputModalities.sourceUrl)
    assert.deepEqual([...new Set([...baseline.rows[key].web.data.sources, url])].sort(), [...row.web.data.sources].sort(), key)
    assert.equal(row.web.refine.directEdit, true, key)
    changed.push({key, changes})
  }
  assert.equal(changed.length, 15)
  assert.deepEqual(changed.map(row => row.key).sort(), decision.rows.map(row => row.identity).sort())
  for (const client of ['web','mini']) assert.equal(changed.filter(row => row.changes.some(c => c.path.startsWith('/' + client + '/'))).length, 15)
  return {phase:'R27 Phase I7', baseline:baseline.head, cardsPerClient:1064, changedCardsPerClient:15, unchangedCardsPerClient:1049,
    scope:'Only image input and its source/date presentation. All other presentation fields compare exactly to HEAD.', rows:changed}
}

export const plain = value => JSON.parse(JSON.stringify(value))
export async function imageInputPresentations() {
  const web = await productBundle(`
    export {STATIC_MODEL_REGISTRY} from './apps/web/src/lib/staticModelCatalog.js';
    export {modelCardSpecifications, modelCardName} from './apps/web/src/lib/modelCardSpecifications.js';
    export {modelSourceRows} from './apps/web/src/lib/modelCardSources.js';
    export {modalityIconStates} from './packages/api/src/modality-presentation.mjs';
    export {fieldSourceLines} from './packages/api/src/card-presentation.mjs';
    export {modelRefinePresentation} from './apps/web/src/lib/modelRegistry.js';
  `)
  const require = createRequire(new URL('../apps/miniprogram/package.json', import.meta.url))
  const filename = require.resolve('./miniprogram/components/model-picker/model-picker.js')
  const context = {Component(){}, exports:{}, require:createRequire(filename)}
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\nthis.present=presentModel', context, {filename})
  const mini = require('./miniprogram/utils/static-model-catalog.js').STATIC_MODEL_REGISTRY
  const {auditedModelSpecs} = require('./miniprogram/utils/model-audit.js')
  return plain(Object.fromEntries(Object.entries(web.STATIC_MODEL_REGISTRY).flatMap(([channel, provider]) => provider.models.map(model => {
    const data = web.modelCardSpecifications(channel, model)
    const miniModel = mini[channel].models.find(row => row.id === model.id)
    return [channel + '/' + model.id, {
      web: {name:web.modelCardName(channel, model), data, sources:web.modelSourceRows(data),
        inputIcons:web.modalityIconStates(data.input, data.inputFact, channel, model.id),
        outputIcons:web.modalityIconStates(data.output, data.outputFact, channel, model.id),
        fieldSources:web.fieldSourceLines(data.fields, data.checkedAt), refine:web.modelRefinePresentation(model)},
      mini: {card:context.present(miniModel, '', '', channel), audit:auditedModelSpecs(channel, model.id)},
    }]
  }))))
}
