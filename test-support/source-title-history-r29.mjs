import {restoreI12,restoreI12Sources} from './pm-decisions-r30.mjs'
import {expectedIcons} from './status-sentences-r29.mjs'
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {gunzipSync} from 'node:zlib'
const bytes = fs.readFileSync(new URL('./fixtures/source-title-patches-r29.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'), '31086224ad14ee90daec9e5829b9784b1b9e04f647d2d50cab4d4b65d6b5c38a')
export const r29TitlePatches = JSON.parse(gunzipSync(bytes))
// Exact literal before/after strings, restricted to presentation text. No facts,
// URL, name, state, capability or ordering is eligible for historical projection.
for (const patches of Object.values(r29TitlePatches)) for (const patch of patches) {
  assert.match(patch.path, /^\/(?:web\/(?:sources\/\d+\/label|(?:input|output)Icons\/\d+\/(?:tooltip|accessibleLabel))|mini\/card\/(?:specSources\/\d+\/label|specRows\/[01]\/icons\/\d+\/(?:tooltip|accessibleLabel)))$/)
  assert.equal(typeof patch.before, 'string'); assert.equal(typeof patch.after, 'string')
}
export function applyR29Titles(rows, reverse = false) {
  const copy = structuredClone(rows)
  for (const [key, patches] of Object.entries(r29TitlePatches)) for (const patch of patches) {
    const parts = patch.path.slice(1).split('/'), last = parts.pop(), parent = parts.reduce((r,k) => r[k], copy[key])
    assert.equal(parent[last], patch[reverse ? 'after' : 'before'], key + patch.path + ' R29 literal title drift')
    parent[last] = patch[reverse ? 'before' : 'after']
  }
  return copy
}
export const restoreR29Titles = rows => applyR29Titles(restoreI11Statuses(rows), true)
export function historicalR29Rows(rows, card, client, restored = false) {
  if (!restored) rows = restoreI12Sources(rows, card, client)
  const prefix = client === 'web' ? '/web/sources/' : '/mini/card/specSources/'
  const copy = structuredClone(rows)
  for (const patch of r29TitlePatches[card] || []) if (patch.path.startsWith(prefix)) {
    const index = Number(patch.path.slice(prefix.length).split('/')[0])
    assert.equal(copy[index].label, patch.after, card + patch.path)
    copy[index].label = patch.before
  }
  return copy
}
const baseline = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/source-titles-r29-before.json.gz', import.meta.url))))
export const expectedR29 = applyR29Titles(baseline.rows)
const titles = new Map(Object.values(expectedR29).flatMap(row => [...row.web.sources, ...row.mini.card.specSources]).map(row => [row.url,row.label]))
export const r29SourceRows = rows => rows.map(row => ({...row,label:titles.get(row.url) || row.label}))

// I11 replaces only icon text and removes the legacy Web-only fifth file icon.
// Assert the new wording independently before restoring frozen I10 history.
export function restoreI11Statuses(rows) {
  const copy = restoreI12(rows)
  for (const [key, row] of Object.entries(copy)) for (const [i, direction] of ['input','output'].entries()) {
    const old = expectedR29[key]
    const web = old.web[direction + 'Icons'], mini = old.mini.card.specRows[i].icons
    const qualifiedMini = miniWithConditions(mini, web)
    assert.deepEqual(row.web[direction + 'Icons'], expectedIcons(web, row.web.data[direction + 'Fact'], direction), key + ' unexpected changed card/field')
    assert.deepEqual(row.mini.card.specRows[i].icons, expectedIcons(qualifiedMini, row.mini.audit.fields[direction + 'Modalities'], direction), key + ' unexpected changed card/field')
    row.web[direction + 'Icons'] = structuredClone(web)
    row.mini.card.specRows[i].icons = structuredClone(mini)
  }
  return copy
}
function miniWithConditions(mini, web) {
  return mini.map(icon => web.some(i => i.state === 'conditional') ? {...icon, state:web.find(i => i.id === icon.id).state, detail:web.find(i => i.id === icon.id).detail} : icon)
}
export const expectedI11 = structuredClone(expectedR29)
for (const row of Object.values(expectedI11)) for (const [i, direction] of ['input','output'].entries()) {
  row.web[direction + 'Icons'] = expectedIcons(row.web[direction + 'Icons'], row.web.data[direction + 'Fact'], direction)
  row.mini.card.specRows[i].icons = expectedIcons(miniWithConditions(row.mini.card.specRows[i].icons, row.web[direction + 'Icons']), row.mini.audit.fields[direction + 'Modalities'], direction)
}
