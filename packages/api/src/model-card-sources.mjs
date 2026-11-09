import { sourceIdentity, uniqueSources, sourceTitle } from './card-presentation.mjs'
import tokenDancePages from './card-data/tokendance-pages.json' with { type: 'json' }
import { safeSources } from './catalog-card-facts.mjs'
import deadLinks from './card-data/dead-links.json' with { type: 'json' }

const sourcePath = value => { const url = new URL(value); return url.origin + url.pathname.replace(/\/$/, '') }
const deadPaths = new Set(deadLinks.map(row => sourcePath(row.url)))
export function isDeadSource(value) {
  try { return deadPaths.has(sourcePath(value)) } catch { return false }
}

// Source evidence stays intact; only human-facing links are filtered/ranked.
export function isApiSource(value, checks = {}) {
  try {
    const url = new URL(value), check = checks[value] || {}
    const path = decodeURIComponent(url.pathname)
    const humanDocs = /^(?:docs|developers|api-docs)\./i.test(url.hostname) || /\/(?:docs|documentation|api-docs)(?:\/|$)/i.test(path)
    return /\/openapi|\/swagger|\.(?:json|ya?ml)\/?$/i.test(path)
      || /(?:\/|\+)(?:json|yaml|x-yaml)(?:\s*;|$)/i.test(check.contentType || '')
      || /\/gateway(?:\/|$)|\/portal\/api(?:\/|$)|\/v\d+(?:alpha|beta)?\/models(?:\b|\/|$)/i.test(path)
      || !humanDocs && (/^api\./i.test(url.hostname) || /^\/api\/|\/api\/v\d+(?:\/|$)/i.test(path))
      || url.hostname === 'replicate.com' && /^\/[^/]+\/[^/]+\/api\/schema\/?$/i.test(path)
      || !!(check.finalUrl && check.finalUrl !== value && isApiSource(check.finalUrl))
  } catch { return true }
}

// A method reference or welcome page is not a model page. Anchored Stability
// model sections and BFL's per-model API-reference documents remain specific.
export function sourceSpecificity(value) {
  const url = new URL(value), path = decodeURIComponent(url.pathname)
  if (/^\/?$|\/(?:welcome|docs|documentation)\/?$/i.test(path)) return 0
  if (/\/(?:models?|model-list|models-overview|model-overview|models-intro|overview|list|model-pricing|pricing|newly-released-models|introduction|official|index(?:\.html)?)\/?$/i.test(path)
    || /\/collections(?:\/|$)|\/chat-completions(?:\/|$)|\/HTTP调用文档\.html$|\/[^/]*Chat\.html$|\/api\/chat\/|\/usage-guide\/|\/guides\/vision\/?$/i.test(path)
    || /\/api-reference\/?$/i.test(path) && !url.hash) return 1
  return 2
}
const noticePage = value => {
  const { hostname, pathname } = new URL(value)
  return /(?:deprecat|depreciat|retire|sunset|下线)/i.test(pathname)
    || /(^|\.)aliyun\.com$/i.test(hostname) && /^\/notice\/\d+\/?$/i.test(pathname)
    || hostname === 'docs.x.ai' && /^\/developers\/migration\//i.test(pathname)
}

function modelPageForEndpoint(value, model, captured) {
  const url = new URL(value)
  if (url.hostname === 'replicate.com' && /^\/[^/]+\/[^/]+\/api\/schema\/?$/.test(url.pathname))
    return url.origin + url.pathname.replace(/\/api\/schema\/?$/, '')
  if (url.hostname === 'api.fal.ai' && /^\/v\d+\/models(?:\b|\/|$)/.test(url.pathname))
    return captured.find(source => /^https:\/\/fal\.ai\/models\/.+/.test(source))
      || (model.id ? 'https://fal.ai/models/' + model.id : null)
  return null
}

export function modelCardSources({ channel, model = {}, audit, fields, lifecycle, checks = {} }) {
  const fieldVendors = uniqueSources(safeSources(Object.values(fields).filter(fact => fact.provenance === 'vendor').flatMap(fact => fact.sourceUrls || [fact.sourceUrl])).filter(url => visibleSource(url) && !isApiSource(url, checks)))
  if (channel === 'tokendance' && model.id) {
    const url = 'https://tokendance.space/models/' + model.id
    if (isVerifiedTokenDancePage(url)) return { sources: uniqueSources([url, ...fieldVendors]), channelSources: [url], vendorSources: fieldVendors, lifecycleSources: [] }
    const fallback = tokenDancePages[model.id]?.fallback
    if (fallback) return Object.fromEntries(Object.entries(fallback).map(([key, urls]) => [key, uniqueSources([...urls, ...(['sources', 'vendorSources'].includes(key) ? fieldVendors : [])].filter(visibleSource))]))
  }
  const links = audit.sourceLinks || []
  const fieldSources = Object.values(fields).flatMap(fact => fact.sourceUrls || [fact.sourceUrl])
  const channelSources = safeSources([
    ...links.filter(link => link.scope === 'channel').map(link => link.url),
    ...Object.values(fields).filter(fact => fact.provenance === 'channel').flatMap(fact => fact.sourceUrls || [fact.sourceUrl]),
  ])
  const vendorSources = safeSources([...links.filter(link => link.scope === 'vendor').map(link => link.url),
    ...Object.values(fields).filter(fact => fact.provenance === 'vendor').flatMap(fact => fact.sourceUrls || [fact.sourceUrl])])
  // Start with R11's order. Added fallback documentation must not displace it.
  const captured = safeSources([
    ...Object.values(fields).filter(fact => fact.provenance === 'channel').flatMap(fact => fact.sourceUrls || [fact.sourceUrl]), lifecycle?.sourceUrl,
    ...(audit.sourceUrls || []), ...fieldSources, audit.sourceUrl, model.officialSourceUrl,
    ...(model.catalogReview?.sourceUrls || []), ...(model.specifications?.sourceUrls || []),
    ...(model.specificModelSpecifications?.sourceUrls || []), ...(model.specifications?.manufacturer?.sourceUrls || []),
    ...links.map(link => link.url)])
  const urls = safeSources([...links.filter(link => link.kind === 'model-page' || link.scope === 'vendor').map(link => link.url),
    ...captured.map(url => isApiSource(url, checks) ? modelPageForEndpoint(url, model, captured) : url)])
    .filter(url => visibleSource(url) && !isApiSource(url, checks) && checks[url]?.rendersModel !== false)
  const channelHosts = new Set(channelSources.map(url => new URL(url).hostname))
  for (const url of urls) if (channelOwns(channel, url) && !channelSources.includes(url)) channelSources.push(url)
  // A tagged vendor announcement describes the source, not channel availability.
  const lifecycleSources = urls.filter(url => links.some(link => link.url === url && link.kind === 'retirement-notice')
    || ['scheduled', 'retired'].includes(lifecycle?.state)
    && (url === lifecycle.sourceUrl || noticePage(url) || links.some(link => link.url === url && link.kind === 'lifecycle')))
  // Preserve existing priority outside the requested lifecycle/API/list cases.
  // In particular, a generic channel table must not displace a vendor page.
  const isChannel = url => channelSources.includes(url) || channelHosts.has(new URL(url).hostname)
  const isGeneral = url => sourceSpecificity(url) < 2
  const replacement = captured[0] && isApiSource(captured[0], checks)
    ? urls.find(url => isChannel(url) && !isGeneral(url)) || urls.find(url => !isGeneral(url)) : null
  const first = lifecycleSources[0] || replacement || (urls[0] && isChannel(urls[0]) && isGeneral(urls[0]) && !/\/pricing\/?$/.test(new URL(urls[0]).pathname)
    ? urls.find(url => isChannel(url) && !isGeneral(url)) : null)
  const sources = first ? [first, ...urls.filter(url => url !== first)] : urls
  const unique = uniqueSources(sources)
  const keys = new Set(unique.map(sourceIdentity))
  const subset = values => uniqueSources(values.filter(visibleSource)).filter(url => keys.has(sourceIdentity(url)))
  return { sources: unique, channelSources: subset(channelSources), vendorSources: subset(vendorSources), lifecycleSources: subset(lifecycleSources) }
}

// A notice's label describes the page even without a channel retirement state.
// Keep the existing lifecycle source ranking independent from this label.
export const modelSourceName = (data, url) => data.lifecycleSources.some(source => sourceIdentity(source) === sourceIdentity(url)) || noticePage(url) ? '下线公告'
  : data.channelSources.some(source => sourceIdentity(source) === sourceIdentity(url)) ? '官方文档' : data.vendorSources.some(source => sourceIdentity(source) === sourceIdentity(url)) ? '原厂规格' : '官方文档'

const channelDomains = {
  anthropic: ['anthropic.com', 'claude.com'], antling: ['ant-ling.com'], ark: ['volcengine.com'],
  bailian: ['aliyun.com', 'qianwenai.com'], bfl: ['bfl.ai'], deepseek: ['deepseek.com'], fal: ['fal.ai', 'fal.run'],
  fireworks: ['fireworks.ai'], gemini: ['ai.google.dev', 'cloud.google.com'], ideogram: ['ideogram.ai'],
  iflytek: ['xfyun.cn', 'xf-yun.com'], kimi: ['kimi.com', 'moonshot.cn', 'moonshot.ai'], longcat: ['longcat.chat'],
  minimax: ['minimax.io', 'minimaxi.com'], mistral: ['mistral.ai'], novita: ['novita.ai'], openai: ['openai.com'],
  openrouter: ['openrouter.ai'], qianfan: ['baidu.com'], recraft: ['recraft.ai'], replicate: ['replicate.com'],
  runware: ['runware.ai'], sensenova: ['sensenova.cn', 'sensecore.cn'], siliconflow: ['siliconflow.cn', 'siliconflow.com'],
  stability: ['stability.ai'], stepfun: ['stepfun.com'], together: ['together.ai', 'together.xyz'],
  tokendance: ['tokendance.space'], tokenhub: ['cloud.tencent.com', 'tencentmaas.com'], xai: ['x.ai'], xiaomi: ['mimo.mi.com'], zhipu: ['bigmodel.cn', 'z.ai'],
}
export function channelOwns(channel, url) {
  try { const host = new URL(url).hostname; return (channelDomains[channel] || []).some(domain => host === domain || host.endsWith('.' + domain)) } catch { return false }
}

export function isVerifiedTokenDancePage(value) {
  try {
    const url = new URL(sourceIdentity(value))
    if (url.origin !== 'https://tokendance.space' || !/^\/models\/[^/]+$/.test(url.pathname) || url.search) return false
    const page = tokenDancePages[decodeURIComponent(url.pathname.slice('/models/'.length))]
    return page?.verified === true && /^\d{4}-\d{2}-\d{2}$/.test(page.checkedAt) && /^[a-f0-9]{64}$/.test(page.evidenceSha256)
  } catch { return false }
}
const visibleSource = url => !isDeadSource(url) && !isApiSource(url)
  && (new URL(url).hostname !== 'tokendance.space' || isVerifiedTokenDancePage(url))

export function modelSourceRows(data) {
  const vendors = new Set(data.vendorSources.map(sourceIdentity))
  const rows = uniqueSources(data.sources).map((url, index) => ({url, label: (index > 0 && vendors.has(sourceIdentity(url)) ? '原厂规格' : modelSourceName(data, url)) + ' · ' + sourceTitle(url)}))
  const counts = new Map()
  for (const row of rows) counts.set(row.label, (counts.get(row.label) || 0) + 1)
  return rows.map(row => counts.get(row.label) > 1 ? { ...row, label: row.label + ' · ' + new URL(sourceIdentity(row.url)).host + new URL(sourceIdentity(row.url)).pathname + new URL(sourceIdentity(row.url)).search } : row)
}
