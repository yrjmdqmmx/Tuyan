import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { appRelativePath } from './appPaths.js'
import { compareVersions, filterChangelog, isChangelogPath, resolveChangelogAnchor, validateChangelog } from './changelog.js'
const data=JSON.parse(readFileSync(new URL('./data/changelog.json',import.meta.url),'utf8'))
const released=copy=>copy.entries.find(entry=>entry.release.status==='released')
test('versions keep announcement dates and a separate unreleased 3.8.0',()=>{
 assert.deepEqual(validateChangelog(data),[])
 assert.equal(data.entries.length,13)
 assert.equal(data.entries[0].version,'3.8.0')
 assert.deepEqual(data.entries[0].release,{status:'unreleased',date:null,surfaces:[]})
 assert.equal(data.entries.find(e=>e.version==='3.0.0').release.date,null)
 assert.equal(data.entries.find(e=>e.version==='1.0.0').release.status,'unverified')
 assert.equal(data.entries.find(e=>e.version==='3.0.2').announcementDate,'2026-09-03')
 assert.equal(data.entries.find(e=>e.version==='3.0.2').release.date,'2026-09-02')
 assert.ok(data.unassigned.length>0)
})
for(const [name,mutate,expected] of [
 ['draft release date',copy=>{copy.entries[0].release.date='2026-09-22'},/cannot have a release date/],
 ['unverified date',copy=>{copy.entries.at(-1).release.date='2026-05-14'},/cannot have a release date/],
 ['invalid date',copy=>{copy.entries[0].announcementDate='2026-02-30'},/calendar date/],
 ['future date',copy=>{released(copy).release.date='2027-01-01'},/calendar date/],
 ['duplicate version',copy=>{copy.entries[1].version=copy.entries[0].version},/numerically descending/],
 ['lexical order',copy=>{copy.entries[0].version='3.9.0';copy.entries[1].version='3.10.0'},/numerically descending/],
 ['duplicate anchor',copy=>{copy.entries[1].legacyAnchors.push(copy.entries[0].id)},/unique and URL-safe/],
 ['PR without release proof',copy=>{released(copy).sources=released(copy).sources.filter(s=>s.kind==='pull-request')},/alone does not prove publication/],
 ['missing item evidence',copy=>{copy.entries[0].changes[0].sourceIds=['missing']},/existing source IDs/],
 ['unsafe link',copy=>{copy.entries[0].sources[0].url='javascript:alert(1)'},/safe public URL/],
 ['mislabelled source',copy=>{copy.entries[0].sources[0].kind='deployment'},/safe public URL/],
 ['fake local link',copy=>{copy.entries[0].sources.find(s=>s.kind==='local-verification').url='https://github.com/yrjmdqmmx/Tuyan/commit/0884129'},/fabricate a public URL/],
 ['private address',copy=>{copy.entries[0].summary='server 10.0.0.12'},/private addresses/],
 ['account detail',copy=>{copy.entries[0].summary='reader@example.com'},/account details/],
 ['hidden ops content',copy=>{copy.entries[0].privateNotes='operations'},/unsupported field/],
 ['local code published',copy=>{released(copy).changes[0].state='local-verified'},/unreleased changes/],
 ['unsupported client release',copy=>{released(copy).release.surfaces.push('微信小程序')},/release surfaces/],
])test(`validation rejects ${name}`,()=>{const copy=structuredClone(data);mutate(copy);assert.match(validateChangelog(copy).join('\n'),expected)})
test('numeric versions and search across version, dates and content',()=>{
 assert.ok(compareVersions('3.10.0','3.9.0')>0)
 assert.deepEqual(filterChangelog(data.entries,'3.8.0 RunWARE 遮罩').map(e=>e.id),['v3-8-0'])
 assert.deepEqual(filterChangelog(data.entries,'3.7.1 观猹').map(e=>e.id),['v3-7-1'])
 assert.equal(filterChangelog(data.entries,'无法命中').length,0)
 assert.equal(filterChangelog(data.entries,'   ').length,data.entries.length)
 assert.ok(filterChangelog(data.entries,'2026-05-14').some(e=>e.version==='1.0.0'))
})
test('mini local changes cannot inherit Web publication',()=>{
 const copy=structuredClone(data),entry=copy.entries[0]
 entry.release={status:'released',date:'2026-09-22',surfaces:['Web']}
 for(const change of entry.changes)if(change.surfaces.includes('Web')){change.state='released';change.sourceIds=['universal-api-1']}
 assert.deepEqual(validateChangelog(copy),[])
 assert.ok(entry.changes.some(c=>c.state==='local-verified'&&c.surfaces.includes('微信小程序')))
})
test('legacy entry anchors resolve to their version',()=>{
 assert.equal(resolveChangelogAnchor(data,'reference-budget'),'v3-8-0')
 assert.equal(resolveChangelogAnchor(data,'watcha-login'),'v3-7-1')
 assert.equal(resolveChangelogAnchor(data,'v3-7-1'),'v3-7-1')
 assert.equal(resolveChangelogAnchor(data,'not-found'),undefined)
})
test('excluded modules never enter public history',()=>{
 assert.doesNotMatch(JSON.stringify(data),/OpenAcad|figure-studio|论文画布|论文绘图/)
 assert.ok(data.entries[0].changes.some(c=>c.text.includes('排行榜')))
})
test('direct, trailing-slash, static and base-path routes remain valid',()=>{
 for(const path of ['/changelog','/changelog/','/changelog/index.html']){assert.equal(isChangelogPath(path),true);assert.equal(isChangelogPath(appRelativePath(`/Tuyan${path}`,'/Tuyan/')),true)}
 for(const path of ['/changelog/unknown','/changelog-extra','/leaderboard','/',undefined])assert.equal(isChangelogPath(path),false)
})
