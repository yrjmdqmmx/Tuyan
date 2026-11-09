import storedTitles from './card-data/source-titles.json' with { type: 'json' }
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
const compactSubject = value => value.toLowerCase().replace(/(\d)p(?=\d)/g, '$1.').replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
const brands = 'OpenAI GPT ChatGPT DeepSeek Qwen GLM Kimi MiniMax MiMo FLUX Stable Diffusion SDXL Claude Grok Gemini Recraft Ideogram Seedream Wan Hunyuan ERNIE CogView LongCat SenseNova TokenDance Fireworks Hugging Face SiliconFlow Runware Replicate Novita StepFun BFL API HTTP VL OCR LoRA'.split(' ')
function readableSubject(value) {
  return value.replace(/\bflux11\b/gi, 'FLUX.1.1').replace(/(\d)[_-](?=\d)/g, '$1~').replace(/[_-]/g, ' ').replace(/~/g, '-').replace(/\b[a-z][a-z0-9]*/gi, word => brands.find(brand => brand.toLowerCase() === word.toLowerCase()) || word[0].toUpperCase() + word.slice(1))
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
  const name = model.displayName || model.label || ''
  const keys = [model.id, name].filter(Boolean).map(compactSubject)
  const own = name && slugs.some((_, i) => keys.includes(compactSubject(slugs.slice(i).join('/'))))
    || name && keys.some(key => key.length > 3 && compactSubject(slugs.join('/')).endsWith(key))
  if (own) return site + ' · ' + name + (api ? ' API 文档' : '')
  const stored = storedTitles[value.split(/[?#]/)[0].replace(/\/+$/, '')]
  if (stored) return stored
  const general = {models:'模型列表',model:'模型说明','model-list':'模型列表','models-overview':'模型概览','model-overview':'模型概览','models_overview':'模型概览','model-pricing':'模型定价',pricing:'价格与规格','newly-released-models':'模型更新','model-depreciation':'模型下线公告',deprecations:'模型下线公告',deprecation:'模型下线公告',deprecate:'模型下线公告','api-reference':'API 文档','api-docs':'API 文档',docs:'文档首页',documentation:'文档首页',welcome:'文档首页',overview:'概览','stable-diffusion-35':'Stable Diffusion 3.5'}
  let title = general[subject] || readableSubject(subject) || '文档首页'
  if (api) title = readableSubject(slugs.slice(slugs.indexOf('models') + 2).join(' ')) + ' API 文档'
  if (/^\d+$/.test(title)) title = '文档 ' + title
  return site + ' · ' + title
}
// Distinct human descriptions replace the old host/path collision suffix.
export function titleSourceRows(rows, model = {}) {
  const titled = rows.map(row => ({...row, label: row.label + ' · ' + sourceTitle(row.url, model)}))
  const counts = new Map(), used = new Set()
  for (const row of titled) counts.set(row.label, (counts.get(row.label) || 0) + 1)
  return titled.map(row => {
    let label = row.label
    if (counts.get(label) > 1) {
      const kind = /\.md(?:[?#]|$)/.test(row.url) ? 'Markdown' : /https:\/\/app\./.test(row.url) ? '控制台' : /[?&]lang=en|\/en\//.test(row.url) ? '英文' : '文档'
      label += '（' + kind + '）'
      let n = 2
      while (used.has(label)) label = row.label + '（' + kind + ' ' + n++ + '）'
    }
    used.add(label)
    return {...row, label}
  })
}
