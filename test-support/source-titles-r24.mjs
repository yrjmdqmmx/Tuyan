import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {titleIssues as previousIssues} from './source-titles-r23.mjs'
import captures from '../config/channel-audit/source-titles-r25-i5.json' with {type:'json'}
const unfetchable = new Set(captures.unfetchable.map(row => row.url))
export const promotionalTitle = /大促|元到岗|限时|秒杀|优惠|爆款|免费领|抢|狂欢|折|[！!]|\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\uFE0F\u20E3]|\d+(?:\.\d+)?\s*元|[¥￥$]\s*\d/u
export const reviewBaseline=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/source-review-cd72eace.json.gz',import.meta.url))))
export const titleRule='Require role · curated site · readable page. Reject opaque mixed letter/digit IDs, news/anchor fragments, site suffixes, lowercase or kebab/snake slugs, raw hosts/API paths, empty or leftover separators, repeated page brands, missing segments, and collapsed/split/hyphenated dotted versions. Reject counter-only and format-only qualifiers including （文档）, （文档 2）, （Markdown）; meaningful interface versions, languages and release codes remain valid. Genuine model/version/date hyphens remain valid; picker spelling is not an exemption for source slugs. Numeric document IDs require an exact captured unfetchable URL exception; hosting/documentation qualifiers must be Chinese; date labels need a colon. Promotional wording, exclamation marks, emoji and prices are rejected.'
const roles=new Set(['官方文档','原厂文档','原厂规格','渠道公告','下线公告'])
const brands=/\b(?:OpenAI|GPT|ChatGPT|DeepSeek|Qwen|GLM|Kimi|MiniMax|MiMo|FLUX|Stable|Diffusion|SDXL|Claude|Grok|Gemini|Recraft|Ideogram|Seedream|Wan|Hunyuan|ERNIE|CogView|LongCat|SenseNova|TokenDance|Fireworks|SiliconFlow|Runware|Replicate|Novita|StepFun|BFL|Kling|Klingai|Nemotron|NVIDIA|Gemma|Llama|Txt2img|Img2img|Unisound|LLaVA|InternVL|OmniGen|Hy|Xing|Kolors|Ling|Ring|O[134])(?=v?\d|\b)/i
export function titleIssues(row,name,id) {
  const parts=row.label.split(' · '), page=parts[2]||'', issues=previousIssues(row,name,id).filter(issue=>issue!=='curated case/punctuation')
  if (promotionalTitle.test(row.label)) issues.push('promotional title')
  if (/文档\s*\d+(?:[（(].*)?$|^\d+(?:[（(].*)?$/.test(page) && !unfetchable.has(row.url)) issues.push('numeric document identifier')
  if (/[（(][^（）()]*\b(?:hosted|docs?|documentation|guide|overview|free)\b[^（）()]*[）)]/i.test(page)) issues.push('untranslated qualifier')
  const counter = [...row.label.matchAll(/[（(]((?:(?:文档|页面|资料|来源|链接|副本|版本|Document|Page|Source|Link|Copy)\s*)?\d+)[）)]/gi)].some(([,v]) => !/^\d{4}$/.test(v) || ![name,id].some(s => s?.includes(v)))
  const numbered = [...row.label.matchAll(/[（(]([^（）()]*\s+\d+)[）)]/g)].some(([,v]) => ![name,id].some(s => s?.includes(v)))
  if(/[（(](?:(?:Markdown|MDX?|HTML?|PDF|JSON|XML|YAML|TXT)(?:\s*(?:格式|文档|页面|版|版本))?|文档|文本|纯文本|网页|格式)(?:\s*\d+)?[）)]/i.test(row.label) || counter || numbered) issues.push('meaningless counter or format qualifier')
  if(row.url!=='https://tokendance.space/llms-full.txt' && /\/(?:llms(?:-full)?\.txt|[^/]+\.(?:md|mdx))(?:[?#]|$)/i.test(row.url) && !/^https:\/\/(?:github\.com|huggingface\.co)\/[^/]+\/[^/]+\/blob\//.test(row.url)) issues.push('machine document link')
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
  if (lines.filter(line => /^核实日期：/.test(line)).length > 1 || /^(?:输入|输出|上下文窗口|最大输出)核实日期：/m.test(text)) issues.push('separate or repeated verification date')
  if (/渠道资料与此前记录不一致，已保留确认过的模态；未确认的项显示为未知。/.test(text)) issues.push('old conflict wording')
  if (/日期\s+\d{4}-\d{2}-\d{2}/.test(text)) issues.push('date label missing colon')
  if(/审计|回退|未核实值|\b(?:provenance|catalog|channel|vendor|sourceUrl|sourceUrls|verifiedAt|inputModalities|outputModalities|totalContextTokens|maxOutputTokens|suppressFallback|modalityMasks)\b/i.test(text)) issues.push('internal jargon')
  if(new Set(lines).size!==lines.length) issues.push('duplicate line')
  // Each direction starts a new field section; a source for another field is not a contradiction.
  for(const section of text.split(/(?=^(?:输入|输出)：.*(?:支持|未知|未标注))/m)) {
    if(/^(?:原厂资料|渠道资料|图研既有核实|图研输入要求)(?: ·|（|$)/m.test(section) && /暂无官方资料/.test(section)) issues.push('source plus no-source contradiction')
  }
  return [...new Set(issues)]
}
export const scanDialogs=cards=>cards.flatMap(card=>[card.text,...(card.dialogs||[]),...(card.tooltips||[])].flatMap((text,index)=>dialogIssues(text).map(issue=>({card:card.card,index,issue,text}))))
