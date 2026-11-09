import storedTitles from './card-data/source-titles.json' with { type: 'json' }
import knownModels from './card-data/source-model-names.json' with { type: 'json' }
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
// Model subjects take the existing card name; general pages retain captured titles.
// Keep this URL-parser-free implementation usable in the native Mini runtime.
// These documentation Markdown URLs have the same human page without .md.
// GitHub /blob/*.md is already an HTML reader, not a machine document.
export function humanSourceUrl(value) {
  if (/^https:\/\/developers\.openai\.com\/api\/docs\//.test(value)) return value.replace(/\.md(?=[?#]|$)/, '')
  return value
}
export function isMachineDocument(value) {
  const path = value.split(/[?#]/)[0]
  // This public text document contains the only model-specific channel notice.
  if (path === 'https://tokendance.space/llms-full.txt') return false
  return /\/(?:llms(?:-full)?\.txt|[^/]+\.(?:md|mdx))\/?$/i.test(path)
    && !/^https:\/\/(?:github\.com\/[^/]+\/[^/]+\/blob\/|huggingface\.co\/[^/]+\/[^/]+\/blob\/)/.test(path)
}
function sourceRole(value, role) {
  if (!['官方文档', '原厂规格'].includes(role)) return role
  const [host, ...parts] = value.replace(/^https?:\/\//, '').split(/[?#]/)[0].split('/')
  const path = decodeURIComponent(parts.join('/'))
  return /deprecat|depreciat|retire|sunset|下线/i.test(path)
    || /(^|\.)aliyun\.com$/i.test(host) && /^notice\/\d+\/?$/.test(path)
    || host === 'docs.x.ai' && /^developers\/migration\//.test(path) ? '下线公告' : role
}
const compactSubject = value => value.toLowerCase().replace(/(\d)p(?=\d)/g, '$1.').replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
const brands = 'OpenAI GPT ChatGPT DeepSeek Qwen GLM Kimi MiniMax MiMo FLUX Stable Diffusion SDXL Claude Grok Gemini Recraft Ideogram Seedream Wan Hunyuan ERNIE CogView LongCat SenseNova TokenDance Fireworks Hugging Face SiliconFlow Runware Replicate Novita StepFun BFL API HTTP VL OCR LoRA'.split(' ')
function readableSubject(value) {
  return value.replace(/\bflux11\b/gi, 'FLUX.1.1').replace(/(\d)[_-](?=\d)/g, '$1~').replace(/[_-]/g, ' ').replace(/~/g, '-').replace(/\b[a-z][a-z0-9]*/gi, word => brands.find(brand => brand.toLowerCase() === word.toLowerCase()) || word[0].toUpperCase() + word.slice(1))
}
// Index complete identities and name prefixes (family pages omit variant/date
// suffixes). Only separators are ignored; parameter/date tokens stay distinct.
const modelSubjects = new Map()
for (const [, label] of knownModels) {
  if (label.includes('\\')) continue
  const name = /-[a-z]/.test(label) ? readableSubject(label) : label
  const add = (key, title) => {
    key = compactSubject(key)
    const prior = modelSubjects.get(key)
    if (/\d/.test(key) && (!prior || title.split('.').length > prior.split('.').length || !prior.includes(' ') && title.includes(' '))) modelSubjects.set(key, title)
  }
  for (const end of [...name.matchAll(/[\s_(/-]+/g)].map(match => match.index).concat(name.length)) {
    const prefix = name.slice(0, end).replace(/[\s·(\[]+$/, '')
    add(prefix, prefix)
  }
}
// A known request ID may differ from every display label. Its punctuation is
// still authoritative; never let that fallback replace a curated name.
for (const [id] of knownModels) {
  const subject = id.split('/').at(-1), key = compactSubject(subject)
  if (!modelSubjects.has(key)) modelSubjects.set(key, readableSubject(subject))
}
function modelSubject(value, keys, name) {
  const tokens = [...value.matchAll(/[a-z0-9]+/gi)]
  // Longest token span wins. Keep surrounding page words, e.g. Quickstart.
  for (let size = tokens.length; size > 0; size--) for (let start = 0; start + size <= tokens.length; start++) {
    const first = tokens[start].index, last = tokens[start + size - 1]
    let end = last.index + last[0].length
    if (/\d$/.test(last[0]) && /^[-_.]\d/.test(value.slice(end))) continue
    const key = compactSubject(value.slice(first, end))
    if (key.length < 4 && size < tokens.length) continue
    const title = name && keys.includes(key) ? name : modelSubjects.get(key)
    if (value[end] === ']' && /]$/.test(title)) end++
    if (title) return [readableSubject(value.slice(0, first)), title, readableSubject(value.slice(end))].join(' ').replace(/\s+/g, ' ').trim()
  }
  return readableSubject(value)
}
function pageSubject(value) {
  let title = value.split(/ - | \| | – |·(?=百度|阿里|DeepSeek)/)[0].trim()
  if (/^[a-z]|_|-[a-z]{2}/.test(title)) title = readableSubject(title)
  title = title.replace(/ · (.*)/, (_, rest) => '（' + rest.replaceAll(' · ', '，') + '）').replace(/\brecraftv(\d+)/gi, 'Recraft V$1')
  // Site prefixes are separate from model names. Remove repetitions within a page.
  title = title.replace(/\b([A-Z][a-z]+)(.*?) By \1\b/i, '$1$2')
  return title
}
export function sourceTitle(value, model = {}) {
  const parts = value.replace(/^https?:\/\//, '').split(/[?#]/)[0].replace(/\/+$/, '').split('/')
  const host = parts.shift(), path = decodeURIComponent(parts.join('/')).replace(/\.(html|md)$/, '')
  const slugs = path.split('/'), api = slugs.at(-1) === 'api'
  if (api || slugs.at(-1) === 'overview' && slugs.length > 2) slugs.pop()
  const subject = slugs.at(-1) || ''
  const siteKey = host.replace(/^(?:www|docs|help|platform|developers|developer|app|api-docs)\./, '')
  const site = ({'aliyun.com':'百炼','tokendance.space':'TokenDance','huggingface.co':'Hugging Face','deepseek.com':'DeepSeek',
    'fal.ai':'fal','openai.com':'OpenAI','bfl.ai':'BFL','bfl.ml':'BFL','x.ai':'xAI','ai.google.dev':'Google','cloud.google.com':'Google Cloud',
    'bigmodel.cn':'智谱','cloud.tencent.com':'腾讯云','cloud.baidu.com':'百度千帆','mimo.mi.com':'MiMo','ant-ling.com':'蚂蚁百灵',
    'volcengine.com':'火山方舟','ark.volcengine.com':'火山方舟','api.volcengine.com':'火山方舟','xfyun.cn':'讯飞星火','maas.xfyun.cn':'讯飞星辰',
    'minimax.io':'MiniMax','minimaxi.com':'MiniMax','kimi.com':'Kimi','github.com':'GitHub','qianwenai.com':'千问'})[siteKey]
    || readableSubject(siteKey.split('.')[0])
  const rawName = model.displayName || model.label || '', knownName = modelSubjects.get(compactSubject(rawName)) || ''
  // A slug-like picker label stays unchanged in the picker, but may not hide a
  // known dotted version in its source title (e.g. Replicate qwen3-7-plus).
  const name = /[a-z]\d+-\d+(?![a-z\d])/i.test(rawName) && /\d\.\d/.test(knownName) ? knownName : rawName
  const keys = [model.id, name].filter(Boolean).map(compactSubject)
  const own = name && keys.some(key => compactSubject(slugs.join('/')).endsWith(key) && (key.length > 3 || compactSubject(subject) === key))
  if (own) return site + ' · ' + pageSubject(name) + (api ? ' API 文档' : '')
  const stored = storedTitles[value.split(/[?#]/)[0].replace(/\/+$/, '')]
  if (stored) return site + ' · ' + pageSubject(stored)
  if (host === 'cloud.baidu.com' && slugs[1] === 'WENXINWORKSHOP') return site + ' · 千帆 ModelBuilder 旧版文档：' + pageSubject(stored || '模型列表')
  if (host === 'cloud.baidu.com' && slugs[1] === 'qianfan-docs' && !stored) return site + ' · AI 应用开发入门：模型说明'
  const general = {models:'模型列表',model:'模型说明','model-list':'模型列表','models-overview':'模型概览','model-overview':'模型概览','models_overview':'模型概览','model-pricing':'模型定价',pricing:'价格与规格','newly-released-models':'模型更新','model-depreciation':'模型下线公告',deprecations:'模型下线公告',deprecation:'模型下线公告',deprecate:'模型下线公告','api-reference':'API 文档','api-docs':'API 文档',docs:'文档首页',documentation:'文档首页',welcome:'文档首页',overview:'概览','stable-diffusion-35':'Stable Diffusion 3.5'}
  const news = /^news(\d{2})(\d{2})(\d{2})$/i.exec(subject)
  const opaque = /^(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{8,}$/i.test(subject) && !modelSubjects.has(compactSubject(subject))
  let title = news ? `更新日志 20${news[1]}-${news[2]}-${news[3]}` : general[subject] || (opaque ? site === '百度千帆' ? '模型列表' : name || '模型说明' : modelSubject(subject, keys, name)) || '文档首页'
  if (api) title = modelSubject(slugs.slice(slugs.indexOf('models') + 2).join(' '), keys, name) + ' API 文档'
  if (/^\d+$/.test(title)) title = '文档 ' + title
  return site + ' · ' + pageSubject(title)
}
// A collision describes a real namespace, operation, region or language. Never
// turn a URL's position in an array or its serialization format into a title.
function sourceSection(value) {
  const [host, ...parts] = value.replace(/^https?:\/\//, '').split(/[?#]/)[0].split('/')
  const path = parts.join('/')
  const language = /[?&]lang=en|\/en\//.test(value) ? '英文版' : /[?&]lang=zh|\/zh\//.test(value) ? '中文版' : ''
  let section = ''
  if (host.endsWith('kimi.com')) section = path.startsWith('code/') ? 'Kimi Code' : '开放平台'
  else if (host === 'docs.x.ai') section = parts[0] === 'developers' ? '开发者指南' : '模型指南'
  else if (host.endsWith('volcengine.com')) section = host.startsWith('www.') ? '产品文档' : '开发者文档'
  else if (host === 'developer.ideogram.ai') section = [/^v\d+$/.test(parts[0]) ? parts[0].toUpperCase() + ' 接口' : 'API 参考', /precise-edit/.test(path) ? '精确编辑' : /edit/.test(path) ? '图像编辑' : '图像生成'].join('，')
  else if (/minimax/.test(host)) section = /\.io$/.test(host) ? '国际站' : /\.cn$/.test(host) ? '中国站' : '开放平台'
  else if (host.endsWith('fireworks.ai')) section = host.startsWith('app.') ? '控制台' : '模型库'
  else if (host === 'developer.ant-ling.com') section = parts.includes('chat') ? '对话接口兼容指南' : '接口兼容指南'
  else if (!language) section = parts.slice(0, -1).filter(p => !/^(?:docs?|api|api-reference|[a-z]{2}(?:-[A-Z]{2})?)$/.test(p)).map(readableSubject).join('，')
  return [section, language].filter(Boolean).join('，')
}
export function titleSourceRows(rows, model = {}) {
  const seen = new Set()
  const human = rows.map(row => ({...row, url: humanSourceUrl(row.url)})).filter(row => {
    if (isMachineDocument(row.url) || seen.has(row.url)) return false
    seen.add(row.url); return true
  })
  const titled = human.map(row => ({...row, label: sourceRole(row.url, row.label) + ' · ' + sourceTitle(row.url, model)}))
  const counts = new Map()
  for (const row of titled) counts.set(row.label, (counts.get(row.label) || 0) + 1)
  return titled.map(row => {
    const section = counts.get(row.label) > 1 ? sourceSection(row.url) : ''
    return {...row, label: row.label + (section ? '（' + section + '）' : '')}
  })
}
