// Offline audit helpers only; never imported by product code.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
export const fields = ['inputModalities', 'outputModalities', 'totalContextTokens', 'maxOutputTokens']
export const labels = ['input', 'output', 'context', 'maxOutput']
export const rowsOf = registry => Object.entries(registry.providers || registry).flatMap(([channel, provider]) => provider.models.map(model => ({ channel, model })))
export const keyOf = row => row.channel + '/' + row.model.id
export const archivedAuditText = (root, commit, file) => execFileSync('git', ['show', `${commit}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
export async function loadCard(root, commit = null) {
  // Historical reports use their original resolver/data, without a checkout or
  // writes. Current-card tests continue to load the working tree by default.
  const plugins = commit ? [{ name: 'archived-card', setup(builder) {
    builder.onLoad({ filter: /\.(?:js|json)$/ }, args => ({ contents: archivedAuditText(root, commit, path.relative(root, args.path)), loader: args.path.endsWith('.json') ? 'json' : 'js' }))
  } }] : []
  const result = await build({ entryPoints: [path.join(root, 'apps/web/src/lib/modelCardSpecifications.js')], bundle: true, format: 'cjs', platform: 'node', write: false, logLevel: 'silent', plugins })
  const module = { exports: {} }
  new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports)
  return module.exports.modelCardSpecifications
}
export function displayValues(card) {
  // Main's actual component has no maximum-output row. Do not count hidden
  // limitRows, prompt limits, maxInputTokens, or metadata as rendered max output.
  return Object.fromEntries(fields.map((field, i) => [field, card[labels[i]] ?? '未知']))
}
export function isKnown(value) {
  // Normalize the baseline's three legacy missing-value labels. N/A is a
  // non-unknown display value (PM rule); numeric-only counts are separate.
  return !!value && !['未知', '待确认', '官方未公布', '未单列'].includes(value)
}
export function countCards(rows, card, idOnly = false) {
  const perChannel = {}, values = {}
  for (const row of rows) {
    const view = displayValues(card(row.channel, idOnly ? { id: row.model.id } : row.model))
    values[keyOf(row)] = view
    const count = perChannel[row.channel] ||= { cards: 0, ...Object.fromEntries(fields.map(f => [f, 0])), contextNumeric: 0, maxOutputNumeric: 0, contextNotApplicable: 0, maxOutputNotApplicable: 0 }
    count.cards++
    for (const field of fields) if (isKnown(view[field])) count[field]++
    for (const [field, name] of [['totalContextTokens', 'context'], ['maxOutputTokens', 'maxOutput']]) {
      if (/tokens/.test(view[field])) count[name + 'Numeric']++
      if (view[field] === '不适用') count[name + 'NotApplicable']++
    }
  }
  const totals = Object.fromEntries(Object.keys(Object.values(perChannel)[0]).map(key => [key, Object.values(perChannel).reduce((sum, count) => sum + count[key], 0)]))
  return { totals, perChannel, values }
}
export function readRegistry(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!data.providers) throw new Error('Registry must contain providers: ' + file)
  return data
}
// Retain every model property consumed by either side's card resolver, including
// nested specification objects unchanged. Exclude transport/account/price data.
export const modelFields = ['id', 'label', 'roles', 'capabilities', 'operations', 'specifications', 'specificModelSpecifications', 'officialSourceUrl', 'catalogReview', 'releaseSourceUrl', 'releaseOrderSourceUrl']
export function trimModel(model) {
  return Object.fromEntries(modelFields.filter(key => Object.hasOwn(model, key)).map(key => [key, key === 'capabilities'
    ? Object.fromEntries(['referenceImages', 'maxReferenceImages', 'requiresSourceImage', 'imageEditing', 'imageEditMode'].filter(k => Object.hasOwn(model[key], k)).map(k => [k, model[key][k]]))
    : model[key]]))
}
export function packRegistry(registry) {
  const pool = [], index = new Map()
  const intern = value => { const json = JSON.stringify(value); if (!index.has(json)) { index.set(json, pool.length); pool.push(value) } return index.get(json) }
  return { modelFields, pool, providers: Object.fromEntries(Object.entries(registry.providers).map(([channel, provider]) => [channel, provider.models.map(model => {
    const trimmed = trimModel(model)
    return modelFields.map(key => Object.hasOwn(trimmed, key) ? intern(trimmed[key]) : -1)
  })])) }
}
export function unpackRegistry(data) {
  return { providers: Object.fromEntries(Object.entries(data.providers).map(([channel, entries]) => [channel, { models: entries.map(row => Object.fromEntries(data.modelFields.flatMap((key, i) => row[i] < 0 ? [] : [[key, structuredClone(data.pool[row[i]])]]))) }])) }
}
export const readPackedRegistry = file => unpackRegistry(JSON.parse(fs.readFileSync(file, 'utf8')))
export function writeOrCheck(file, content, check) {
  if (check) { if (fs.readFileSync(file, 'utf8') !== content) throw new Error('Audit report drift: ' + file) }
  else fs.writeFileSync(file, content)
}
