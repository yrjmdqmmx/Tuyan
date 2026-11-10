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
export const conflictNote = '该渠道页面与图研之前记录的信息不一致，这里只保留已经核实过的内容，没核实的显示为「未知」。'
export function fieldSourceLines(fields, checkedAt, t = value => value) {
  const labels = {inputModalities:'输入',outputModalities:'输出',totalContextTokens:'上下文窗口',maxOutputTokens:'最大输出'}
  const origins = {vendor:'源自原厂',channel:'渠道公布',catalog:'图研既有核实',product:'图研输入要求'}
  return Object.entries(fields).flatMap(([key, fact]) => {
    const origin = origins[fact.provenance]
    const date = fact.state !== 'unknown' && fact.verifiedAt && fact.verifiedAt !== checkedAt ? fact.verifiedAt : ''
    return origin ? [`${t(labels[key])}：${t(origin)}${date ? `（${t('核实日期')}：${date}）` : ''}`] : []
  })
}
// Numeric absence is different from an unsupported capability.
export const numericStatus = state => state === 'not-applicable' ? '不适用' : state === 'unsupported' ? '不支持' : '未公布'
export function evidenceStatusLines(icons, fields, limits) {
  return [...icons.map(icon => icon.tooltip), ...['totalContextTokens', 'maxOutputTokens'].map((key, i) =>
    ['上下文窗口', '最大输出'][i] + '：' + (fields[key].state === 'known'
      ? fields[key].value.toLocaleString('en-US') + ' tokens' : limits[i]))].join('\n')
}
// Event dates remain meaningful; verification dates belong only to link hovers.
export const readableEventDates = text => text.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$1年$2月$3日')
export function cardLifecycle(lifecycle, audit = {}) {
  const sourceUrl = audit.lifecycleSourceUrl || lifecycle?.sourceUrl
  return lifecycle && /^https:\/\//.test(sourceUrl || '') && !(audit.excludedSources || []).includes(sourceUrl)
    && !isMachineDocument(sourceUrl) ? { ...lifecycle, sourceUrl } : null
}
// These documentation Markdown URLs have the same human page without .md.
// GitHub /blob/*.md is already an HTML reader, not a machine document.
export function humanSourceUrl(value) {
  if (/^https:\/\/developers\.openai\.com\/api\/docs\//.test(value)) return value.replace(/\.md(?=[?#]|$)/, '')
  if (/^https:\/\/developer\.ideogram\.ai\/v1\/api-reference\/edit-images\//.test(value)) return value.replace(/\.md(?=[?#]|$)/, '')
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
// Native Mini has no URL/URLSearchParams. Match sourceIdentity's existing
// fragment, trailing slash and tracking-query policy without changing links.
export function sourceTitleKey(value) {
  const [path, query = ''] = humanSourceUrl(value).split('#')[0].split('?')
  const parameters = query.split('&').filter(Boolean).filter(part => !/^(utm_.+|ref|referrer|fbclid|gclid|msclkid)$/i.test(decodeURIComponent(part.split('=')[0])))
  parameters.sort((a,b) => { const x=decodeURIComponent(a.split('=')[0]), y=decodeURIComponent(b.split('=')[0]); return x < y ? -1 : x > y ? 1 : 0 })
  return path.replace(/\/+$/, '') + (parameters.length ? '?' + parameters.join('&') : '')
}
export function visibleSourceTitle(value, model = {}, fallback = '官方文档') {
  const key = sourceTitleKey(value), host = key.replace(/^https?:\/\//, '').split('/')[0]
  const notice = sourceRole(value, '官方文档') === '下线公告' || key === 'https://tokendance.space/llms-full.txt'
  const channel = /(?:^|\.)(?:fal\.ai|fal\.run|tokendance\.space|replicate\.com|fireworks\.ai|novita\.ai|runware\.ai|siliconflow\.(?:cn|com)|openrouter\.ai|together\.(?:ai|xyz)|tencentmaas\.com)$/.test(host)
    || /(?:^|\.)(?:aliyun\.com|baidu\.com|volcengine\.com|tencent\.com)$/.test(host)
      && !/(?:qwen|qvq|wan[\d/-]|tongyi|ernie|doubao|seedream|seedance|hunyuan)/i.test(key)
  const role = notice ? '下线公告' : channel ? '渠道资料' : host.endsWith('.test') ? fallback : '官方文档'
  return role + ' · ' + readableEventDates(sourceTitle(value, model))
}
const compactSubject = value => value.toLowerCase().replace(/(\d)p(?=\d)/g, '$1.').replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
const brands = 'OpenAI GPT ChatGPT DeepSeek Qwen GLM Kimi MiniMax MiMo FLUX Stable Diffusion SDXL Claude Grok Gemini Recraft Ideogram Seedream Wan Hunyuan ERNIE CogView LongCat SenseNova TokenDance Fireworks Hugging Face SiliconFlow Runware Replicate Novita StepFun BFL API APIs LLM HTTP VL OCR LoRA GGUF AWQ GPTQ FP8 FP16 BF16 INT4 INT8 MLX ONNX MoE'.split(' ')
export const sourceAcronyms = value => value.replace(/\b(?:gguf|awq|gptq|fp8|fp16|bf16|int4|int8|mlx|onnx|apis?|llm|vl|moe|ocr|sdxl|lora)\b/gi, word => brands.find(brand => brand.toLowerCase() === word.toLowerCase()) || word)
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
  title = title.replace(/\s*[（(]([^（）()]+)[）)]/g, (original, qualifier) => {
    const translated = {'bailian hosted':'百炼托管',hosted:'托管',docs:'文档',documentation:'文档',guide:'指南',overview:'概览',free:'免费'}[qualifier.toLowerCase()]
    return translated ? '（' + translated + '）' : original
  })
  return sourceAcronyms(title)
}
export function sourceTitle(value, model = {}) {
  if (value.split(/[?#]/)[0].replace(/\/+$/, '') === 'https://api.fal.ai/v1/models') return 'fal 模型目录'
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
  const unified = storedTitles[sourceTitleKey(value)]
  if (Array.isArray(unified)) return site + ' · ' + sourceAcronyms(unified[0])
  if (subject === 'schema.json') return site + ' · ' + pageSubject(modelSubject(slugs.at(-2) || '', [], '')).replace(/-(?=[a-z])/gi, ' ') + ' API 规格'
  const rawName = model.displayName || model.label || '', knownName = modelSubjects.get(compactSubject(rawName)) || ''
  // A slug-like picker label stays unchanged in the picker, but may not hide a
  // known dotted version in its source title (e.g. Replicate qwen3-7-plus).
  const name = /[a-z]\d+-\d+(?![a-z\d])/i.test(rawName) && /\d\.\d/.test(knownName) ? knownName : rawName
  const keys = [model.id, name].filter(Boolean).map(compactSubject)
  const own = name && keys.some(key => compactSubject(slugs.join('/')).endsWith(key) && (key.length > 3 || compactSubject(subject) === key))
  if (own) return site + ' · ' + pageSubject(name) + (api ? ' API 文档' : '')
  const stored = storedTitles[value.split(/[?#]/)[0].replace(/\/+$/, '')]
  if (stored) return site + ' · ' + pageSubject(Array.isArray(stored) ? stored[0] : stored)
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
  const titled = human.map(row => ({...row, label: visibleSourceTitle(row.url, model, row.label)}))
  const counts = new Map()
  for (const row of titled) counts.set(row.label, (counts.get(row.label) || 0) + 1)
  return titled.map(row => {
    const section = !Array.isArray(storedTitles[sourceTitleKey(row.url)]) && counts.get(row.label) > 1 ? sourceSection(row.url) : ''
    return {...row, label: row.label + (section ? '（' + section + '）' : '')}
  })
}
