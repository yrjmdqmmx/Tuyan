import assert from 'node:assert/strict'
import {imageInputPresentations} from './image-input-r27.mjs'
import {r29Baseline, sourceSurfaces, titleMap, assertUnifiedTitles} from './source-titles-r29.mjs'
import {visibleSourceTitle} from '../packages/api/src/card-presentation.mjs'
import {titleIssues} from './source-titles-r24.mjs'

export const r29Rules = {
  identity:'Existing sourceIdentity: strip fragment and trailing slash, remove utm_*/ref/referrer/fbclid/gclid/msclkid, sort remaining query keys; preserve semantic queries. Existing humanSourceUrl aliases OpenAI and Ideogram .md to HTML. Navigation/evidence URLs unchanged.',
  title:'One role · site · page per normalized URL. URL-wide readable title outranks card spelling and list position. Non-fal: frozen unscoped title, meaningful namespace/region/language qualifier when needed, then sorted strict readable candidates; omit card-specific dates/aliases. Numeric release codes stay in the model subject. Hidden Runware schema JSON attribution uses the parent model plus API 规格.',
  fal:'Fal is always 渠道资料. API title uses the longest matching catalog endpoint name, normalizing slug separators/case without changing picker names, plus remaining endpoint segments and API 文档. If no catalog identity matches, retain the existing unscoped subject. Example: 渠道资料 · fal · FLUX 2 Pro API 文档; edit: 渠道资料 · fal · FLUX 2 Pro Edit API 文档.',
  role:'Vendor documentation and vendor repositories: 官方文档. Fal, TokenDance, Replicate, Fireworks, Novita, Runware, SiliconFlow, OpenRouter, Together and Tencent MaaS: 渠道资料. Alibaba/Baidu/Volcengine/Tencent hosted pages: 渠道资料 except paths naming their own Qwen/QVQ/Wan/Tongyi, ERNIE, Doubao/Seedream/Seedance or Hunyuan family: 官方文档. Retirement notices keep 下线公告. Field provenance is separate; catalog/product explanations precede the canonical title with a colon.',
  occurrences:'Count each Web footer link, dialog link, distinct title per input/output dialog field, each titled icon tooltip, and retirement dialog. Mini counts every footer/source-copy button and its dialog, distinct field title, each titled icon tooltip and retirement source. Accessibility mirrors the tooltip and is checked but not counted again. Verification dates and provenance explanations are not part of the title.',
}
export async function currentTitlePresentations() {
  const rows = await imageInputPresentations()
  for (const row of Object.values(rows)) {
    const url = row.web.data.lifecycle?.state === 'scheduled' && row.web.data.lifecycle.sourceUrl
    if (url) row.web.noticeSource = {url, label:visibleSourceTitle(url)}
  }
  return rows
}
export async function buildR29TitleReport() {
  const rows = await currentTitlePresentations(), before = sourceSurfaces(r29Baseline.rows), after = sourceSurfaces(rows)
  assertUnifiedTitles(after)
  for (const row of after) assert.deepEqual(titleIssues({url:row.identity,label:row.title},rows[row.card].web.name)
    .filter(issue => issue !== 'machine document link' || /footer|dialog-link/.test(row.surface)), [], row.card + ' ' + row.title)
  const key = row => [row.client,row.card,row.surface,row.identity].join('|')
  const old = new Map(before.map(row => [key(row),row]))
  assert.deepEqual(after.map(key).sort(),before.map(key).sort(), 'Every source occurrence/URL is preserved')
  const changed = after.filter(row => row.title !== old.get(key(row)).title)
  const oldMap = titleMap(before), newMap = titleMap(after)
  const changes = [...newMap].flatMap(([url, titles]) => {
    const after = [...titles][0], before = [...oldMap.get(url)].sort()
    return before.some(title => title !== after) ? [{url,before,after,changedOccurrences:changed.filter(row => row.identity === url).length}] : []
  })
  const changedStrings = new Set(changes.flatMap(row => row.before.filter(title => title !== row.after)))
  const fal = changes.filter(row => /^https:\/\/fal\.ai\/models\/.+\/api$/.test(row.url))
  return {phase:'R29 title unification',baseline:r29Baseline.head,rules:r29Rules,counts:{cardsPerClient:1064,urls:oldMap.size,
    urlsWithMultipleTitlesBefore:[...oldMap.values()].filter(s => s.size > 1).length,urlsWithMultipleTitlesAfter:0,
    changedUrls:changes.length,titleStringsChanged:changedStrings.size,urlTitlePairsChanged:changes.reduce((n,r)=>n+r.before.filter(t=>t!==r.after).length,0),
    cardSurfaceOccurrences:after.length,cardSurfaceOccurrencesChanged:changed.length,
    changedOccurrencesByClient:Object.fromEntries(['web','mini'].map(client => [client,changed.filter(r=>r.client===client).length])),
    falApiPagesChanged:fal.length,falApiOccurrencesChanged:fal.reduce((n,r)=>n+r.changedOccurrences,0)},changes}
}
export function r29TitleMarkdown(report) {
  const c = report.counts, cell = v => String(v).replaceAll('|','&#124;')
  return '\n## R29 title unification\n\n' + Object.values(report.rules).join('\n\n') + '\n\n'
    + `Across **${c.cardsPerClient} cards per client**, **${c.urls} URLs** and **${c.cardSurfaceOccurrences} occurrences**: URLs with multiple titles **${c.urlsWithMultipleTitlesBefore} → 0**; **${c.titleStringsChanged} distinct title strings** (${c.urlTitlePairsChanged} URL/title pairs), **${c.changedUrls} URLs**, and **${c.cardSurfaceOccurrencesChanged} card-surface occurrences changed** (Web ${c.changedOccurrencesByClient.web}, Mini ${c.changedOccurrencesByClient.mini}). **${c.falApiPagesChanged} fal API pages changed**, covering ${c.falApiOccurrencesChanged} occurrences. Every shared URL has identical Web/Mini titles.\n\n`
    + 'Before/after strings below exclude verification dates and separate provenance. Counts and exact title-only presentation patches are checked offline; prior report sections remain historical.\n\n| URL | Before titles | After title | Changed occurrences |\n| --- | --- | --- | ---: |\n'
    + report.changes.map(row => `| ${row.url} | ${row.before.map(cell).join('<br>')} | ${cell(row.after)} | ${row.changedOccurrences} |`).join('\n') + '\n'
}
