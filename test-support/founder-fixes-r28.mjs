import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {gunzipSync} from 'node:zlib'
import corrections from './fixtures/fal-sources-r28.json' with {type:'json'}
import {restoreR29Titles} from './source-title-history-r29.mjs'
const baselineBytes = fs.readFileSync(new URL('./fixtures/founder-fixes-r28-before.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'), '3865bb7260a4a987af8a7ae4bedb8fa6dd546a6fb78d2581dade0a7b588b905c')
export const r28Baseline = JSON.parse(gunzipSync(baselineBytes))
export const groups = row => [row.web.inputIcons, row.web.outputIcons, ...row.mini.card.specRows.slice(0, 2).map(spec => spec.icons)]
export function r28Icon(icon) {
  const unknown = ['unknown', 'unlisted'].includes(icon.state)
  const tooltip = unknown ? '未标注 · ' + icon.tooltip : icon.state === 'conditional'
    ? icon.tooltip.replace(`有条件支持${icon.detail ? ' · ' + icon.detail : ''}。`, `支持（条件：${icon.detail}） · `) : icon.tooltip
  return {...icon, tooltip, accessibleLabel: unknown ? icon.label + '：' + tooltip : icon.accessibleLabel}
}
function apply(row, patch, reverse = false) {
  const keys = patch.path.slice(1).split('/'), last = keys.pop()
  const parent = keys.reduce((value, key) => value[key], row)
  const old = reverse ? 'after' : 'before', next = reverse ? 'before' : 'after'
  assert.deepEqual(parent[last], patch[old], patch.path)
  if (!Object.hasOwn(patch, next)) parent.splice(Number(last), 1)
  else parent[last] = structuredClone(patch[next])
}
// Literal reviewed source/date changes sit alongside an independent global icon rule.
export const expectedR28 = structuredClone(r28Baseline)
for (const row of Object.values(expectedR28)) for (const icons of groups(row)) icons.splice(0, icons.length, ...icons.map(r28Icon))
for (const [key, patches] of Object.entries(corrections)) for (const patch of patches) apply(expectedR28[key], patch)
export function assertR28Presentations(now) {
  now = restoreR29Titles(now)
  assert.equal(Object.keys(now).length, 1064)
  for (const [key, row] of Object.entries(expectedR28)) assert.deepEqual(now[key], row, key + ' unexpected changed card/field outside R28')
}
export function restoreR28Sources(now) {
  const copy = restoreR29Titles(now)
  for (const [key, patches] of Object.entries(corrections)) for (const patch of [...patches].reverse()) apply(copy[key], patch, true)
  return copy
}
