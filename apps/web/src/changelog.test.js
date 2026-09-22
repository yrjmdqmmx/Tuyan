import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { appRelativePath } from './appPaths.js'
import { compareVersions, isChangelogPath, publishedVersions, publicEvents, resolveChangelogAnchor, validateChangelog, versionLabel } from './changelog.js'
const data = JSON.parse(readFileSync(new URL('./data/changelog.json', import.meta.url), 'utf8'))
test('independent product lines contain only published versions with their own numbering', () => {
  assert.deepEqual(validateChangelog(data), [])
  assert.equal(publishedVersions(data, 'tuyan').length, 12)
  assert.equal(publishedVersions(data, 'benchmark').length, 5)
  assert.equal(publishedVersions(data, 'openacad').length, 4)
  assert.equal(publicEvents(data).length, 4)
  assert.equal(versionLabel(data.entries[0]), 'Tuyan v3.7.1')
  assert.equal(versionLabel(publishedVersions(data, 'benchmark')[0]), 'Tuyan Benchmark v2.5')
  assert.equal(versionLabel(publishedVersions(data, 'openacad')[0]), 'OpenAcad v1.1.0')
  assert.ok(compareVersions('2.10', '2.9') > 0)
  assert.ok(compareVersions('3.10.0', '3.9.0') > 0)
})
test('owner-confirmed early versions and announcement-based 3.0.0 date are retained', () => {
  const versions = publishedVersions(data, 'tuyan')
  for (const [version, date] of [['1.0.0', '2026-05-14'], ['1.1.0', '2026-05-14'], ['1.3.0', '2026-05-19'], ['3.0.0', '2026-08-24']]) {
    const entry = versions.find(entry => entry.version === version)
    assert.equal(entry.release.date, date)
    assert.equal(entry.release.status, 'released')
  }
  assert.equal(versions.find(entry => entry.version === '3.0.2').announcementDate, '2026-09-03')
  assert.equal(versions.find(entry => entry.version === '3.0.2').release.date, '2026-09-02')
})
for (const [name, mutate, expected] of [
  ['draft version', copy => { copy.entries[0].release.status = 'unreleased' }, /only released versions/],
  ['local change', copy => { copy.entries[0].changes[0].state = 'local-verified' }, /unreleased changes/],
  ['invalid date', copy => { copy.entries[0].release.date = '2026-02-30' }, /calendar date/],
  ['future date', copy => { copy.entries[0].release.date = '2027-01-01' }, /calendar date/],
  ['duplicate product version', copy => { copy.entries[1].version = copy.entries[0].version }, /numerically descending/],
  ['lexical sorting', copy => { copy.entries[0].version = '3.9.0'; copy.entries[1].version = '3.10.0' }, /numerically descending/],
  ['three-part Benchmark', copy => { copy.entries.find(e => e.product === 'benchmark').version = '2.5.0' }, /product version format/],
  ['two-part OpenAcad', copy => { copy.entries.find(e => e.product === 'openacad').version = '1.1' }, /product version format/],
  ['separate PaperBanana product', copy => { copy.entries[0].product = 'paperbanana' }, /product version format/],
  ['event version', copy => { copy.events[0].version = '3.8.0' }, /unsupported field/],
  ['event ordering', copy => { copy.events.at(-1).date = '2026-09-22' }, /events must be dated descending/],
  ['pending event', copy => { copy.events[0].status = 'pending' }, /only recorded events/],
  ['duplicate anchor', copy => { copy.entries[1].legacyAnchors.push(copy.entries[0].id) }, /unique and URL-safe/],
  ['PR without release evidence', copy => { copy.entries[0].sources = copy.entries[0].sources.filter(s => s.kind === 'pull-request') }, /alone does not prove version publication/],
  ['missing item evidence', copy => { copy.entries[0].changes[0].sourceIds = ['missing'] }, /existing source IDs/],
  ['unsafe link', copy => { copy.entries[0].sources[0].url = 'javascript:alert(1)' }, /safe public URL/],
  ['mislabelled source', copy => { copy.entries[0].sources[0].kind = 'deployment' }, /safe public URL/],
  ['fabricated archive link', copy => { copy.entries.at(-1).sources[0].url = 'https://github.com/yrjmdqmmx/OpenAcad/commit/0b146dd' }, /fabricate a public URL/],
  ['private address', copy => { copy.entries[0].summary = 'server 10.0.0.12' }, /private addresses/],
  ['account detail', copy => { copy.entries[0].summary = 'reader@example.com' }, /account details/],
  ['hidden ops content', copy => { copy.entries[0].privateNotes = 'operations' }, /unsupported field/],
  ['unsupported client release', copy => { copy.entries[0].release.surfaces.push('微信小程序') }, /release surfaces/],
  ['mini inside workbench', copy => { copy.entries[0].surfaces.push('微信小程序') }, /ecosystem events/],
]) test(`validation rejects ${name}`, () => { const copy = structuredClone(data); mutate(copy); assert.match(validateChangelog(copy).join('\n'), expected) })
test('runtime selection and anchors never expose a pending version or event', () => {
  const copy = structuredClone(data)
  copy.entries[0].release.status = 'unreleased'
  copy.events[0].status = 'pending'
  assert.equal(publishedVersions(copy, 'tuyan').length, 11)
  assert.equal(publicEvents(copy).length, 3)
  assert.equal(resolveChangelogAnchor(copy, 'watcha-login'), undefined)
  assert.equal(resolveChangelogAnchor(data, 'watcha-login'), 'v3-7-1')
  assert.equal(resolveChangelogAnchor(data, 'early-ranking-mai'), 'benchmark-v2-1')
  assert.equal(resolveChangelogAnchor(data, 'early-agent-tools'), 'agent-tools-release')
  assert.equal(resolveChangelogAnchor(data, 'reference-budget'), undefined)
})
test('drafts and independent drawing module stay outside the public archive', () => {
  assert.doesNotMatch(JSON.stringify(data), /3\.8\.0|figure-studio|论文画布|历史微信公告整理稿/)
  assert.doesNotMatch(JSON.stringify(publishedVersions(data, 'tuyan')), /Benchmark v|MCP|微信小程序/)
  assert.ok(publishedVersions(data, 'tuyan').some(e => e.changes.some(c => c.text.includes('精修'))))
  assert.ok(publishedVersions(data, 'openacad').some(e => e.changes.some(c => c.text.includes('AB1'))))
})
test('direct, trailing-slash, static and base-path routes remain valid', () => {
  for (const path of ['/changelog', '/changelog/', '/changelog/index.html']) { assert.equal(isChangelogPath(path), true); assert.equal(isChangelogPath(appRelativePath(`/Tuyan${path}`, '/Tuyan/')), true) }
  for (const path of ['/changelog/unknown', '/changelog-extra', '/leaderboard', '/', undefined]) assert.equal(isChangelogPath(path), false)
})
