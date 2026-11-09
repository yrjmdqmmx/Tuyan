// Display only: never sort model/contract arrays in place.
export const modalityOrder = ['text', 'image', 'video', 'audio']
export function displayModalities(values = []) {
  const rank = value => modalityOrder.includes(value) ? modalityOrder.indexOf(value) : modalityOrder.length
  return [...values].sort((a, b) => rank(a) - rank(b))
}
export function displayModalityText(value) {
  const names = ['文本', '图像', '视频', '音频']
  const rank = part => { const index = names.findIndex(name => part.includes(name)); return index < 0 ? names.length : index }
  return value.split('、').sort((a, b) => rank(a) - rank(b)).join('、')
}
// Normalize identity for dedupe, retain the first original URL for navigation.
export function sourceIdentity(value) {
  const url = new URL(value)
  url.hash = ''
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  for (const key of [...url.searchParams.keys()]) if (/^(utm_.+|ref|referrer|fbclid|gclid|msclkid)$/i.test(key)) url.searchParams.delete(key)
  url.searchParams.sort()
  return url.href
}
export function uniqueSources(values) {
  const seen = new Set()
  return values.filter(value => { const key = sourceIdentity(value); if (seen.has(key)) return false; seen.add(key); return true })
}
// Stored title: model-audit-supplement-20261109.json sourceChecks. Other labels
// are curated page subjects or readable paths, never a hostname alone.
export function sourceTitle(value) {
  const parts = value.replace(/^https:\/\//, '').split(/[?#]/)[0].replace(/\/+$/, '').split('/')
  const host = parts.shift(), slug = decodeURIComponent(parts.pop() || '')
  if (host === 'api-docs.deepseek.com' && slug === 'news250325') return 'V3-0324 Release | DeepSeek API Docs'
  const site = ({'help.aliyun.com':'百炼','tokendance.space':'TokenDance','huggingface.co':'Hugging Face','api-docs.deepseek.com':'DeepSeek'})[host] || host.replace(/^(www|docs|help|platform)\./, '')
  const title = ({models:'模型列表','model-list':'模型列表','model-pricing':'模型定价',pricing:'价格与规格','newly-released-models':'模型更新','model-depreciation':'模型下线公告','deepseek-v4-1-flash':'DeepSeek-V4.1-Flash 模型页','kimi-k3':'Kimi-K3 模型页'})[slug]
  return site + ' · ' + (title || (slug ? slug.replace(/\.html$/, '').replace(/[-_]/g, ' ') : '文档首页'))
}
