import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'

export const titleBaseline = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/source-titles-1dcd8b13.json.gz', import.meta.url))))
export const historicalIds = ['deepseek-v4-flash-vision-exp', 'deepseek-v4-flash', 'deepseek-v3.2', 'deepseek-chat-v3-0324', 'qwen3.6-max-preview', 'qwen3-30b-a3b-instruct-2507', 'qwen3-max']
const compact = value => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

// Independent output checks, shared by rendered Web and compiled Mini tests.
// A literal curated name is allowed to retain its intentional case/separators.
export function titleIssues({ url, label }, name) {
  const issues = [], title = label.split(' · ').slice(1).join(' · ')
  const subject = title.replace(/^[^·]+ · /, '').replace(/（(?:Markdown|控制台|英文|文档)(?: \d+)?）$/, '').replace(/ API 文档$/, '')
  if (/https?:\/\/|\b(?:[a-z0-9-]+\.)+(?:com|ai|io|org|net|cn|dev|space|co)\b(?:\/|\s|$)|\b(?:models|docs|api)\//i.test(title)) issues.push('raw host/path')
  if (/^api\s*·/i.test(title)) issues.push('api prefix')
  if (/(?:…|\.\.\.)\s*$/.test(title)) issues.push('truncation')
  if (/\b([a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*){0,3})\s+\1\b/i.test(subject)) issues.push('duplicate word')
  if (name && compact(subject) === compact(name) && subject !== name) issues.push('curated case/punctuation')
  if (subject !== name && /_|[a-z]-[a-z]/i.test(subject)) issues.push('slug separators')
  const versionInputs = [name, decodeURIComponent(new URL(url).pathname)].filter(Boolean)
  for (const input of versionInputs) for (const match of input.matchAll(/(\d+)[._-](\d+)(?!\d)/g)) {
    const [version, major, minor] = match
    // Do not mistake parameters (30B), dates (2507/0813), or other numbers for
    // a collapsed version: require the exact combined number as a token.
    if (new RegExp(`(?<!\\d)${major}${minor}(?!\\d)`).test(subject)
      && subject !== name && !name?.includes(major + minor) && !subject.includes(version) && !new RegExp(`(?<!\\d)${major}${minor}(?!\\d)`).test(input)) issues.push('collapsed version: ' + version)
    if (subject !== name && new RegExp(`(?<!\\d)${major}\\s+${minor}(?!\\d)`).test(subject)) issues.push('split version: ' + version)
  }
  return [...new Set(issues)]
}

export function scanTitles(cards) {
  return cards.flatMap(card => card.rows.flatMap(row => titleIssues(row, card.name).map(issue => ({ card: card.card, url: row.url, label: row.label, issue }))))
}

export const titleExamples = [
  ['https://platform.stability.ai/docs/features/stable-diffusion-35', {id:'sd3.5-large',label:'Stable Diffusion 3.5 Large'}, 'Stability · Stable Diffusion 3.5'],
  ['https://help.aliyun.com/zh/model-studio/qwen3-8-max', {id:'qwen3.8-max',label:'Qwen3.8 Max'}, '百炼 · Qwen3.8 Max'],
  ['https://fal.ai/models/fal-ai/flux-3/klein/api', {id:'fal-ai/flux-3/klein',label:'FLUX.3 Klein'}, 'fal · FLUX.3 Klein API 文档'],
  ['https://developers.openai.com/api/docs/models/gpt-6.1-sol', {id:'gpt-6.1-sol',label:'GPT-6.1 Sol'}, 'OpenAI · GPT-6.1 Sol'],
]
