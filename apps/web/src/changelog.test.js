import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { appRelativePath } from './appPaths.js'
import { filterChangelog, isChangelogPath, validateChangelog } from './changelog.js'

const data = JSON.parse(readFileSync(new URL('./data/changelog.json', import.meta.url), 'utf8'))

test('the public archive has dated, ordered, independently traceable released entries', () => {
  assert.deepEqual(validateChangelog(data), [])
  assert.equal(data.entries[0].date, data.coverage.through)
  assert.equal(data.entries.at(-1).date, data.coverage.from)
})

for (const [name, mutate, expected] of [
  ['draft', copy => { copy.entries[0].status = 'draft' }, /only confirmed released/],
  ['hidden unpublished payload', copy => { copy.entries[0].internalDraft = 'pending' }, /unsupported field/],
  ['invalid calendar date', copy => { copy.entries[0].date = '2026-02-30' }, /dates must be valid/],
  ['duplicate anchor', copy => { copy.entries[1].id = copy.entries[0].id }, /unique and URL-safe/],
  ['PR without release proof', copy => { copy.entries[0].sources = copy.entries[0].sources.filter(source => source.kind === 'pull-request') }, /PR alone/],
  ['unsafe link', copy => { copy.entries[0].sources[0].url = 'javascript:alert(1)' }, /invalid public source/],
  ['source with a misleading kind', copy => { copy.entries[0].sources[0].kind = 'deployment' }, /kind does not match/],
  ['private address', copy => { copy.entries[0].summary = 'server 10.0.0.12' }, /private addresses/],
  ['account detail', copy => { copy.entries[0].summary = 'reader@example.com' }, /account details/],
  ['unverified mini-program release', copy => { copy.entries[0].surfaces.push('小程序') }, /released Web behavior/],
]) {
  test(`archive validation rejects ${name}`, () => {
    const copy = structuredClone(data)
    mutate(copy)
    assert.match(validateChangelog(copy).join('\n'), expected)
  })
}

test('search matches case-insensitively across entry content and requires all query terms', () => {
  assert.deepEqual(filterChangelog(data.entries, 'runWARE 遮罩').map(entry => entry.id), ['refine-catalog-v23'])
  assert.equal(filterChangelog(data.entries, '无法命中的关键字').length, 0)
  assert.equal(filterChangelog(data.entries, '   ').length, data.entries.length)
  assert.ok(filterChangelog(data.entries, '2026-09-20').every(entry => entry.date === '2026-09-20'))
})

test('changelog routes support direct entry, trailing slash, static index, and app base paths', () => {
  for (const path of ['/changelog', '/changelog/', '/changelog/index.html']) {
    assert.equal(isChangelogPath(path), true)
    assert.equal(isChangelogPath(appRelativePath(`/Tuyan${path}`, '/Tuyan/')), true)
  }
  for (const path of ['/changelog/unknown', '/changelog-extra', '/leaderboard', '/', undefined]) assert.equal(isChangelogPath(path), false)
})
