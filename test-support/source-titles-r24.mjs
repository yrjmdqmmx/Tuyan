import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {titleIssues as previousIssues} from './source-titles-r23.mjs'
export const reviewBaseline=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/source-review-cd72eace.json.gz',import.meta.url))))
export const titleRule='Require role · curated site · readable page. Reject opaque mixed letter/digit IDs, news/anchor fragments, site suffixes, lowercase or kebab/snake slugs, raw hosts/API paths, empty or leftover separators, repeated page brands, missing segments, and collapsed/split/hyphenated dotted versions. Genuine model/version/date hyphens remain valid; picker spelling is not an exemption for source slugs.'
const roles=new Set(['官方文档','原厂文档','原厂规格','渠道公告','下线公告'])
const brands=/\b(?:OpenAI|GPT|ChatGPT|DeepSeek|Qwen|GLM|Kimi|MiniMax|MiMo|FLUX|Stable|Diffusion|SDXL|Claude|Grok|Gemini|Recraft|Ideogram|Seedream|Wan|Hunyuan|ERNIE|CogView|LongCat|SenseNova|TokenDance|Fireworks|SiliconFlow|Runware|Replicate|Novita|StepFun|BFL|Kling|Klingai|Nemotron|NVIDIA|Gemma|Llama|Txt2img|Img2img|Unisound|LLaVA|InternVL|OmniGen|Hy|Xing|Kolors|Ling|Ring|O[134])(?=v?\d|\b)/i
export function titleIssues(row,name,id) {
  const parts=row.label.split(' · '), page=(parts[2]||'').replace(/（(?:Markdown|控制台|英文|文档)(?: \d+)?）$/,''), issues=previousIssues(row,name,id).filter(issue=>issue!=='curated case/punctuation')
  if(parts.length!==3 || !roles.has(parts[0]) || parts.slice(1).some(s=>!s.trim())) issues.push('missing role/site/page segment or extra separator')
  if(/ - | \| | – |·(?:百度|阿里|DeepSeek)/.test(row.label)) issues.push('site suffix')
  if(/\bNews\d+\b|#[\w-]+/i.test(row.label)) issues.push('URL fragment')
  if(/(?:[a-z0-9-]+\.)+[a-z]{2,}(?=\b|\/)/i.test(row.label)) issues.push('raw hostname')
  if(/^[a-z][a-z0-9._-]*(?:（.*）)?$/.test(page) && !/^(?:v\d|o[134])(?:\b|（)/.test(page)) issues.push('lowercase slug')
  if(/_|-[a-z]{2}/.test(page)) issues.push('kebab/snake slug')
  if(/(?:^|\s)[|·–—-](?:\s|$)|[|·–—-]\s*$/.test(page) || / ·\s*· /.test(row.label)) issues.push('leftover separator')
  for(const token of page.match(/[A-Za-z0-9]+/g)||[]) {
    if(/^(?:[a-z]{1,4}\d[a-z0-9]{3,}|(?=.*[a-z])(?=.*\d)[a-z0-9]{8,})$/i.test(token) && !brands.test(token) && !/^(?:\d+[bBkK]|[aA]\d+[bB]|[nvNV]?fp\d+)$/.test(token)) issues.push('opaque identifier')
  }
  const names=page.match(new RegExp(brands.source,'gi'))||[]
  if(/\b([a-z][a-z0-9]+)\b.* By \1\b/i.test(page)) issues.push('duplicated brand words')
  if(new Set(names.map(s=>s.toLowerCase())).size!==names.length) issues.push('duplicated brand words')
  return [...new Set(issues)]
}
export const scanTitles=cards=>cards.flatMap(card=>card.rows.flatMap(row=>titleIssues(row,card.name,card.card.slice(card.card.indexOf('/')+1)).map(issue=>({card:card.card,...row,issue}))))
export function dialogIssues(text) {
  const lines=text.split('\n').map(s=>s.trim()).filter(Boolean), issues=[]
  if(/审计|回退|未核实值|\b(?:provenance|catalog|channel|vendor|sourceUrl|sourceUrls|verifiedAt|inputModalities|outputModalities|totalContextTokens|maxOutputTokens|suppressFallback|modalityMasks)\b/i.test(text)) issues.push('internal jargon')
  if(new Set(lines).size!==lines.length) issues.push('duplicate line')
  // Each direction starts a new field section; a source for another field is not a contradiction.
  for(const section of text.split(/(?=^(?:输入|输出)：.*(?:支持|未知))/m)) {
    if(/^(?:原厂资料|渠道资料|图研既有核实|图研输入要求)(?: ·|（|$)/m.test(section) && /暂无官方资料/.test(section)) issues.push('source plus no-source contradiction')
  }
  return [...new Set(issues)]
}
export const scanDialogs=cards=>cards.flatMap(card=>[card.text,...(card.dialogs||[]),...(card.tooltips||[])].flatMap((text,index)=>dialogIssues(text).map(issue=>({card:card.card,index,issue,text}))))
