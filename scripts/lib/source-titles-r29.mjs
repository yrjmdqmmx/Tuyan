import {sourceAcronyms} from '../../packages/api/src/card-presentation.mjs'
// Offline title decisions, frozen before R29. No page/spec/execution data changes.
import {r29Baseline, sourceSurfaces, titleMap} from '../../test-support/source-titles-r29.mjs'
import {titleIssues} from '../../test-support/source-titles-r24.mjs'

export function unifiedPageTitles() {
  const titles = {}
  const surfaces = sourceSurfaces(r29Baseline.rows)
  const falModels = Object.entries(r29Baseline.rows).filter(([key]) => key.startsWith('fal/'))
    .map(([key, row]) => [key.slice(4), row.web.name]).sort(([a], [b]) => b.length - a.length || a.localeCompare(b))
  for (const [url, values] of titleMap(surfaces)) {
    const candidates = [...new Set([...values].map(title => title.split(' · ').slice(1).join(' · ')))].sort()
    const fal = /^https:\/\/fal\.ai\/models\/(.+)\/api$/.exec(url)
    if (fal) {
      const endpoint = fal[1], model = falModels.find(([id]) => endpoint === id || endpoint.startsWith(id + '/'))
      const readable = text => text.replace(/[_/·-]/g, ' ').replace(/\b[a-z][a-z0-9]*/gi, word => ({flux:'FLUX',sdxl:'SDXL',gpt:'GPT',lora:'LoRA'})[word.toLowerCase()] || word[0].toUpperCase() + word.slice(1))
      const subject = model ? model[1] + (endpoint === model[0] ? '' : ' ' + readable(endpoint.slice(model[0].length + 1)))
        : r29Baseline.unscopedTitles[url].replace(/^fal · /, '').replace(/(?: API 文档| 编辑接口)$/, '') + (/\/edit$/.test(endpoint) ? ' Edit' : '')
      const name = readable(subject).replace(/\s+/g, ' ').trim()
      titles[url] = name + (/\/(?:edit|edit-image)$/.test(endpoint) && !/\bEdit\b/i.test(name) ? ' Edit' : '') + ' API 文档'
    } else if (candidates.length > 1 || candidates.some(title => /（.*）$/.test(title))) {
      const fallback = r29Baseline.unscopedTitles[url].replace(/（(?:\d{4}|Nano Banana \d+)）$/, '')
      // A real namespace/language disambiguator belongs to the URL everywhere.
      const qualified = candidates.filter(title => title.startsWith(fallback + '（') && /（.*(?:开放平台|Code|英文版|中文版|接口|API 参考|控制台|模型库|产品文档|开发者|国际站|中国站).*）$/.test(title))
      const names = surfaces.filter(row => row.identity === url).map(row => r29Baseline.rows[row.card].web.name)
      const valid = title => names.some(name => titleIssues({url, label:'官方文档 · ' + title}, name).length === 0)
      const selected = qualified.filter(valid).sort((a,b) => b.length - a.length || a.localeCompare(b))[0]
        || (valid(fallback) ? fallback : candidates.find(valid))
      if (!selected) throw Error('No strict readable title for ' + url)
      titles[url] = selected.split(' · ').slice(1).join(' · ')
    }
  }
  // These previously differed only by role, so role unification also needs
  // the URL's existing namespace in every context.
  for (const row of surfaces) if (/^https:\/\/(?:app\.)?fireworks\.ai\/models\//.test(row.url)) {
    const page = (titles[row.identity] || r29Baseline.unscopedTitles[row.identity].split(' · ').slice(1).join(' · ')).replace(/（(?:控制台|模型库)）$/, '')
    titles[row.identity] = page + (/^https:\/\/app\./.test(row.url) ? '（控制台）' : '（模型库）')
  }
  return Object.fromEntries(Object.entries(titles).map(([url,title]) => [url,sourceAcronyms(title)]))
}
