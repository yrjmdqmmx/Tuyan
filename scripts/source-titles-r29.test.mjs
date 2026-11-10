import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {buildR29TitleReport, currentTitlePresentations} from '../test-support/source-title-report-r29.mjs'
import {sourceSurfaces, assertUnifiedTitles, titleIdentity} from '../test-support/source-titles-r29.mjs'
import {restoreR29Titles} from '../test-support/source-title-history-r29.mjs'
import {visibleSourceTitle, sourceTitleKey} from '../packages/api/src/card-presentation.mjs'
import {assertNoConditionalLabels, conditionalLabel} from '../test-support/conditional-labels-r29.mjs'
test('R29 all 1064 cards: one strict title per URL on all surfaces, full Web/Mini formatter parity, exact title-only delta', async () => {
  const report = await buildR29TitleReport()
  const rows = await currentTitlePresentations(), surfaces = sourceSurfaces(rows)
  assertUnifiedTitles(surfaces)
  const mini = createRequire(import.meta.url)('../apps/miniprogram/miniprogram/utils/card-presentation.js')
  for (const url of new Set(surfaces.map(row => row.url))) {
    assert.equal(mini.visibleSourceTitle(url),visibleSourceTitle(url),url)
    for (const model of [{id:'unrelated',label:'Unrelated'},{}]) assert.equal(mini.visibleSourceTitle(url,model),visibleSourceTitle(url,model),url)
  }
  for (const row of Object.values(rows)) delete row.web.noticeSource
  const {r29Baseline} = await import('../test-support/source-titles-r29.mjs')
  const before = structuredClone(r29Baseline.rows)
  for (const row of Object.values(before)) delete row.web.noticeSource
  assert.deepEqual(restoreR29Titles(rows),before)
  assert.equal(report.counts.urlsWithMultipleTitlesAfter,0)
  assert.ok(report.counts.urlsWithMultipleTitlesBefore>0)
})
test('R29 guards reject a second title and non-channel fal roles; URL policy preserves semantic queries', async () => {
  const surfaces=sourceSurfaces(await currentTitlePresentations())
  const bad=structuredClone(surfaces);bad[0].title+=' Other';assert.throws(()=>assertUnifiedTitles(bad))
  const fal=structuredClone(surfaces);for(const row of fal)if(/^https:\/\/fal\.ai\/models\/.+\/api$/.test(row.identity))row.title=row.title.replace('渠道资料','官方文档')
  assert.throws(()=>assertUnifiedTitles(fal))
  const base='https://fal.ai/models/fal-ai/flux-2-pro/api'
  for(const suffix of ['/', '#input', '/?utm_source=test#output']) {
    assert.equal(titleIdentity(base+suffix),titleIdentity(base))
    assert.equal(sourceTitleKey(base+suffix),sourceTitleKey(base))
    assert.equal(visibleSourceTitle(base+suffix),'渠道资料 · fal · FLUX 2 Pro API 文档')
  }
  assert.notEqual(titleIdentity(base+'?lang=en'),titleIdentity(base+'?lang=zh'))
  assert.equal(visibleSourceTitle(base+'?lang=en'), '渠道资料 · fal · FLUX 2 Pro API 文档')
  assert.equal(sourceTitleKey(base+'?b=2&a=1&ref=test'),sourceTitleKey(base+'?a=1&b=2'))
  assert.equal(visibleSourceTitle(base.replace('/api','/edit/api')),'渠道资料 · fal · FLUX 2 Pro Edit API 文档')
})
test('R29 locale and UI scan rejects every conditional-support label/key while preserving the data state', () => {
  assertNoConditionalLabels()
  for(const text of ['有条件支持','Conditionally supported','conditionalSupport','conditionallySupported','conditional_support','support_conditional'])assert.match(text,conditionalLabel)
  assert.doesNotMatch('state === "conditional"',conditionalLabel)
})
