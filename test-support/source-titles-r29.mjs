import fs from 'node:fs'
import assert from 'node:assert/strict'
import {gunzipSync} from 'node:zlib'
import {sourceIdentity, humanSourceUrl} from '../packages/api/src/card-presentation.mjs'

export const r29Baseline = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/source-titles-r29-before.json.gz', import.meta.url))))
export const titleIdentity = url => sourceIdentity(humanSourceUrl(url))
// Read the title actually present in the tooltip, not the formatter's expected output.
export function attributionTitle(tooltip, date) {
  const suffix = date && '（' + date + '）'
  const text = suffix && tooltip.endsWith(suffix) ? tooltip.slice(0, -suffix.length) : tooltip
  return text.match(/(?:官方文档|原厂规格|原厂资料|渠道资料|渠道公告|下线公告|图研既有核实|图研输入要求) · .+$/)?.[0]
}
export function sourceSurfaces(rows) {
  const result = []
  for (const [card, row] of Object.entries(rows)) for (const client of ['web', 'mini']) {
    const add = (surface, url, title) => { if (url && title) result.push({client, card, surface, url, identity:titleIdentity(url), title}) }
    const sources = client === 'web' ? row.web.sources : row.mini.card.specSources
    for (const [i, source] of sources.entries()) {
      if (client === 'mini' || i === 0) add('footer/' + i, source.url, source.label)
      add('dialog-link/' + i, source.url, source.label)
    }
    for (const [i, direction] of ['input', 'output'].entries()) {
      const fact = client === 'web' ? row.web.data[direction + 'Fact'] : row.mini.audit.fields[direction + 'Modalities']
      const icons = client === 'web' ? row.web[direction + 'Icons'] : row.mini.card.specRows[i].icons
      const titles = new Set()
      for (const icon of icons) {
        const title = attributionTitle(icon.tooltip, ['unknown','unlisted'].includes(icon.state) ? null : fact.verifiedAt)
        if (title) { add(direction + '-tooltip/' + icon.id, fact.sourceUrl, title); titles.add(title) }
      }
      for (const title of titles) add('dialog-field/' + direction, fact.sourceUrl, title)
    }
    const notice = client === 'mini' ? row.mini.card.retirementSource : row.web.noticeSource
    if (notice) add('retirement-dialog', notice.url, notice.label)
  }
  return result
}
// The frozen presentation predates noticeSource; its rendered source review includes it.
for (const notice of r29Baseline.review.notices) r29Baseline.rows[notice.card].web.noticeSource = notice.rows[0]
export function titleMap(surfaces, client) {
  const map = new Map()
  for (const row of surfaces.filter(row => !client || row.client === client)) {
    if (!map.has(row.identity)) map.set(row.identity, new Set())
    map.get(row.identity).add(row.title)
  }
  return map
}
export function assertUnifiedTitles(surfaces) {
  const maps = Object.fromEntries(['web', 'mini'].map(client => [client, titleMap(surfaces, client)]))
  for (const [url, titles] of titleMap(surfaces)) {
    assert.equal(titles.size, 1, url + ': ' + [...titles].join(' / '))
    const title = [...titles][0]
    if (/^https:\/\/fal\.ai\/models\/.+\/api$/.test(url)) assert.match(title, /^渠道资料 · fal · .+ API 文档$/)
    if (maps.web.has(url) && maps.mini.has(url)) assert.deepEqual(maps.web.get(url), maps.mini.get(url), url)
  }
  for (const client of ['web','mini']) assert.equal(new Set(surfaces.filter(r => r.client === client).map(r => r.card)).size, 1064)
  return maps
}
