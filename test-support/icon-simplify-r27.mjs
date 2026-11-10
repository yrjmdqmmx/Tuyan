import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const bytes = fs.readFileSync(new URL('./fixtures/icon-simplify-r27-before.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'), '24191702c69994dce1ca1d64ca55d83cb49353b65b957f95d29dc947ac53c8db')
export const iconBaseline = JSON.parse(gunzipSync(bytes))
export const iconGroups = row => [
  [row.web.inputIcons, row.web.data.inputFact], [row.web.outputIcons, row.web.data.outputFact],
  ...row.mini.card.specRows.slice(0, 2).map((spec, i) => [spec.icons, row.mini.audit.fields[i ? 'outputModalities' : 'inputModalities']]),
]
// Independent R2 oracle from the pre-change presentation: evidence is preserved verbatim.
export function expectedR2Icon(before, fact) {
  const label = {supported:'支持',unsupported:'暂不支持',unknown:'未标注',unlisted:'未标注',conditional:'支持'}[before.state]
  const prefix = before.state === 'unsupported' ? fact?.provenance === 'channel' ? '此渠道未开放该模态。' : '原厂资料标明不支持。'
    : before.state === 'conditional' ? `有条件支持${before.detail ? ` · ${before.detail}` : ''}。` : ''
  return {...before, accessibleLabel:before.label + '：' + label, tooltip:prefix + before.tooltip}
}
export function assertR2Presentations(now) {
  assert.equal(Object.keys(now).length, 1064)
  for (const [key, before] of Object.entries(iconBaseline.rows)) {
    const expected = structuredClone(before)
    for (const [icons, fact] of iconGroups(expected)) icons.splice(0, icons.length, ...icons.map(icon => expectedR2Icon(icon, fact)))
    assert.deepEqual(now[key], expected, key + ' unexpected changed card/field outside R2 wording')
  }
}
// Keep the historical I7 report exact without masking current evidence or state drift.
// Only the separately asserted R2 wording is projected back to its frozen I7 text.
export function restoreI7IconWording(now) {
  const copy = structuredClone(now)
  for (const [key, row] of Object.entries(copy)) {
    const previous = iconGroups(iconBaseline.rows[key])
    iconGroups(row).forEach(([icons, fact], i) => icons.forEach((icon, j) => {
      const old = previous[i][0][j], expected = expectedR2Icon(old, fact)
      assert.equal(icon.accessibleLabel, expected.accessibleLabel, key + ' unexpected icon label change')
      assert.equal(icon.tooltip, expected.tooltip, key + ' unexpected evidence change')
      icon.accessibleLabel = old.accessibleLabel
      icon.tooltip = old.tooltip
    }))
  }
  return copy
}
