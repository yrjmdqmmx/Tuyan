import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { appRelativePath } from './appPaths.js'
import { compareVersions, groupPublishedUpdates, isChangelogPath, publishedVersions, publicEvents, resolveChangelogAnchor, validateChangelog, versionLabel } from './changelog.js'
const data = JSON.parse(readFileSync(new URL('./data/changelog.json', import.meta.url), 'utf8'))
test('independent product lines contain only published versions with their own numbering', () => {
  assert.deepEqual(validateChangelog(data), [])
  assert.equal(publishedVersions(data, 'tuyan').length, 13)
  assert.equal(publishedVersions(data, 'benchmark').length, 5)
  assert.equal(publishedVersions(data, 'openacad').length, 4)
  assert.equal(publicEvents(data).length, 4)
  assert.equal(versionLabel(data.entries[0]), 'Tuyan v3.8.0')
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
test('the deployed model supplement belongs to the original Tuyan v3.8.0 release', () => {
  const versions = publishedVersions(data, 'tuyan')
  const matches = versions.filter(entry => entry.version === '3.8.0')
  assert.equal(matches.length, 1)
  const entry = matches[0]
  assert.equal(entry.release.date, '2026-09-22')
  assert.ok(entry.notes.some(note => note.includes('2026-09-23 追加模型更新')))
  const changes = entry.changes.filter(change => change.text.includes('GPT-6 Sol'))
  assert.equal(changes.length, 1)
  assert.match(changes[0].text, /GPT-6 Luna.*Claude Opus 5.5.*OpenRouter/)
  const sources = entry.sources.filter(source => changes[0].sourceIds.includes(source.id))
  assert.equal(sources.filter(source => source.kind === 'deployment').length, 2)
  assert.ok(sources.some(source => source.kind === 'commit'))
  assert.equal(groupPublishedUpdates(data).flatMap(group => group.items).filter(item => item.entry.id === entry.id).length, 1)
  for (const product of ['benchmark', 'openacad']) {
    assert.doesNotMatch(JSON.stringify(publishedVersions(data, product)), /GPT-6 Sol|Claude Opus 5.5/)
  }
})

test('published Pareto and bilingual improvements belong to Benchmark v2.5 only', () => {
  const entry = publishedVersions(data, 'benchmark').find(entry => entry.version === '2.5')
  assert.equal(entry.release.date, '2026-09-17')
  assert.ok(entry.changes.some(change => change.text.includes('帕累托视图')))
  assert.ok(entry.changes.some(change => change.text.includes('中英文切换')))
  assert.ok(entry.changes.some(change => change.text.includes('缺少可比较成本的型号仍保留在排名视图')))
  const pareto = entry.changes.find(change => change.text.includes('新增帕累托视图'))
  assert.ok(entry.sources.some(source => pareto.sourceIds.includes(source.id) && source.kind === 'deployment'))
  assert.doesNotMatch(JSON.stringify(publishedVersions(data, 'tuyan')), /新增帕累托视图/)
  const pending = JSON.parse(readFileSync(new URL('../../../docs/changelog-audit/pending-updates.json', import.meta.url), 'utf8'))
  assert.equal(pending.benchmark, null)
})
for (const [name, mutate, expected] of [
  ['draft version', copy => { copy.entries.find(e => e.id === 'v3-7-1').release.status = 'unreleased' }, /only released versions/],
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
  copy.entries.find(e => e.id === 'v3-7-1').release.status = 'unreleased'
  copy.events[0].status = 'pending'
  assert.equal(publishedVersions(copy, 'tuyan').length, 12)
  assert.equal(publicEvents(copy).length, 3)
  assert.equal(resolveChangelogAnchor(copy, 'watcha-login'), undefined)
  assert.equal(resolveChangelogAnchor(data, 'watcha-login'), 'v3-7-1')
  assert.equal(resolveChangelogAnchor(data, 'early-ranking-mai'), 'benchmark-v2-1')
  assert.equal(resolveChangelogAnchor(data, 'early-agent-tools'), 'agent-tools-release')
  assert.equal(resolveChangelogAnchor(data, 'reference-budget'), 'v3-8-0')
})
test('drafts and independent drawing module stay outside the public archive', () => {
  assert.doesNotMatch(JSON.stringify(data), /figure-studio|论文画布|历史微信公告整理稿/)
  assert.doesNotMatch(JSON.stringify(publishedVersions(data, 'tuyan')), /Benchmark v|MCP|微信小程序/)
  assert.ok(publishedVersions(data, 'tuyan').some(e => e.changes.some(c => c.text.includes('精修'))))
  assert.ok(publishedVersions(data, 'openacad').some(e => e.changes.some(c => c.text.includes('AB1'))))
})
test('direct, trailing-slash, static and base-path routes remain valid', () => {
  for (const path of ['/changelog', '/changelog/', '/changelog/index.html']) { assert.equal(isChangelogPath(path), true); assert.equal(isChangelogPath(appRelativePath(`/Tuyan${path}`, '/Tuyan/')), true) }
  for (const path of ['/changelog/unknown', '/changelog-extra', '/leaderboard', '/', undefined]) assert.equal(isChangelogPath(path), false)
})

test('overview merges every public entry once and groups confirmed dates in descending order', () => {
  const before = structuredClone(data)
  const groups = groupPublishedUpdates(data)
  assert.equal(groups[0].date, '2026-09-22')
  assert.deepEqual(groups.map(group => group.date), [...new Set(groups.map(group => group.date))].sort().reverse())
  const ids = groups.flatMap(group => group.items.map(item => item.entry.id))
  assert.equal(new Set(ids).size, 26)
  assert.deepEqual([...ids].sort(), [...data.entries, ...data.events].map(entry => entry.id).sort())
  assert.deepEqual(groups.find(group => group.date === '2026-09-07').items.map(item => item.entry.id), ['v3-5-0', 'openacad-v1-1-0', 'openacad-v1-0-2', 'openacad-v1-0-1', 'openacad-v1-0-0'])
  assert.equal(groups.find(group => group.date === '2026-09-04').items.length, 2)
  assert.ok(groups.find(group => group.date === '2026-09-02').items.some(item => item.entry.id === 'v3-0-2'))
  assert.deepEqual(data, before)
})
test('new source records automatically appear in both views without dates or publication being inferred', () => {
  const copy = structuredClone(data)
  const next = { ...structuredClone(copy.entries[0]), id: 'next-release', version: '3.8.1', release: { status: 'released', date: '2026-09-24', surfaces: ['Web'] } }
  copy.entries.unshift(next)
  assert.equal(groupPublishedUpdates(copy)[0].items[0].entry, next)
  assert.equal(publishedVersions(copy, 'tuyan')[0], next)
  for (const state of ['unreleased', 'unverified']) {
    next.release.status = state
    assert.ok(!groupPublishedUpdates(copy).flatMap(g => g.items).some(item => item.entry === next))
    assert.ok(!publishedVersions(copy, 'tuyan').includes(next))
  }
  next.release.status = 'released'; next.release.date = null
  assert.ok(!publishedVersions(copy, 'tuyan').includes(next))
  assert.ok(!groupPublishedUpdates(copy).flatMap(g => g.items).some(item => item.entry === next))
  copy.events[0].date = null
  assert.ok(!publicEvents(copy).includes(copy.events[0]))
  assert.ok(!groupPublishedUpdates(copy).flatMap(g => g.items).some(item => item.entry === copy.events[0]))
})

test('paper canvas is an unreleased 4.0.0 draft and is absent from published 3.8.0', () => {
  const draft = JSON.parse(readFileSync(new URL('../../../docs/changelog-audit/pending-updates.json', import.meta.url), 'utf8')).tuyan
  assert.equal(draft.version, '4.0.0')
  assert.equal(draft.release.status, 'unreleased')
  assert.equal(draft.release.date, null)
  assert.equal(draft.baseline.version, '3.8.0')
  assert.ok(draft.changes.some(change => change.text.includes('论文画布')))
  assert.ok(!publishedVersions(data, 'tuyan').some(entry => entry.version === '4.0.0'))
  const released = publishedVersions(data, 'tuyan').find(entry => entry.version === '3.8.0')
  assert.doesNotMatch(JSON.stringify(released.changes), /论文画布|figure-studio/)
})
