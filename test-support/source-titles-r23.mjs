import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'

export const titleBaseline = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/source-titles-1dcd8b13.json.gz', import.meta.url))))
export const historicalIds = ['deepseek-v4-flash-vision-exp', 'deepseek-v4-flash', 'deepseek-v3.2', 'deepseek-chat-v3-0324', 'qwen3.6-max-preview', 'qwen3-30b-a3b-instruct-2507', 'qwen3-max']
const compact = value => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const knownNames = Object.values(STATIC_MODEL_REGISTRY).flatMap(entry => entry.models.flatMap(model => [model.id, model.label]))
const dottedTokens = values => new Set(values.filter(Boolean).flatMap(value => [...value.matchAll(/[a-z]+\d+\.\d+(?!\d)/gi)].map(match => match[0].toLowerCase())))
const knownDottedTokens = dottedTokens(knownNames)

// Independent output checks, shared by rendered Web and compiled Mini tests.
// A literal curated name is allowed to retain its intentional case/separators.
export function titleIssues({ url, label }, name, id) {
  const issues = [], title = label.split(' · ').slice(1).join(' · ')
  const subject = title.replace(/^[^·]+ · /, '').replace(/（(?:Markdown|控制台|英文|文档)(?: \d+)?）$/, '').replace(/ API 文档$/, '')
  if (/https?:\/\/|\b(?:[a-z0-9-]+\.)+(?:com|ai|io|org|net|cn|dev|space|co)\b(?:\/|\s|$)|\b(?:models|docs|api)\//i.test(title)) issues.push('raw host/path')
  if (/^api\s*·/i.test(title)) issues.push('api prefix')
  if (/(?:…|\.\.\.)\s*$/.test(title)) issues.push('truncation')
  if (/\b([a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*){0,3})\s+\1\b/i.test(subject)) issues.push('duplicate word')
  const repairedDottedName = knownNames.includes(subject) && /\d\.\d/.test(subject) && /[a-z]\d+-\d+(?![a-z\d])/i.test(name || '')
  const readableOwn = /^[A-Z]/.test(subject) && !/_|[a-z]-[a-z]|\d-[a-z]{2}/i.test(subject)
  if (!readableOwn && name && compact(subject) === compact(name) && subject !== name && !repairedDottedName) issues.push('curated case/punctuation')
  const knownSpelling = knownNames.some(known => subject === known || subject.startsWith(known + ' '))
  if (subject !== name && !knownSpelling && /_|[a-z]-[a-z]/i.test(subject)) issues.push('slug separators')
  const ownDottedTokens = dottedTokens([name, id])
  // Independent of the generator's normalized-name index. Check complete
  // letter/version tokens; Qwen3-8B and R1-0528 are not dotted versions.
  for (const [token] of subject.matchAll(/(?<![a-z0-9])[a-z]+\d+-\d+(?![a-z0-9])/gi)) {
    const dotted = token.toLowerCase().replace('-', '.')
    if (knownDottedTokens.has(dotted) || ownDottedTokens.has(dotted)) issues.push('hyphenated dotted version: ' + token)
  }
  const versionInputs = [name, decodeURIComponent(new URL(url).pathname)].filter(Boolean)
  for (const input of versionInputs) for (const match of input.matchAll(/(\d+)[._-](\d+)(?!\d)/g)) {
    const [version, major, minor] = match
    // Do not mistake parameters (30B), dates (2507/0813), or other numbers for
    // a collapsed version: require the exact combined number as a token.
    if (new RegExp(`(?<!\\d)${major}${minor}(?!\\d)`).test(subject)
      && subject !== name && !name?.includes(major + minor) && !subject.includes(version) && !new RegExp(`(?<!\\d)${major}${minor}(?!\\d)`).test(input)) issues.push('collapsed version: ' + version)
    if (subject !== name && new RegExp(`(?<!\\d)${major}\\s+${minor}(?![a-z\\d])`, 'i').test(subject)) issues.push('split version: ' + version)
  }
  return [...new Set(issues)]
}

export function scanTitles(cards) {
  return cards.flatMap(card => card.rows.flatMap(row => titleIssues(row, card.name, card.card.slice(card.card.indexOf('/') + 1)).map(issue => ({ card: card.card, url: row.url, label: row.label, issue }))))
}

export const titleExamples = [
  ['https://platform.stability.ai/docs/features/stable-diffusion-35', {id:'sd3.5-large',label:'Stable Diffusion 3.5 Large'}, 'Stability · Stable Diffusion 3.5'],
  ['https://help.aliyun.com/zh/model-studio/qwen3-8-max', {id:'qwen3.8-max',label:'Qwen3.8 Max'}, '百炼 · Qwen3.8 Max'],
  ['https://fal.ai/models/fal-ai/flux-3/klein/api', {id:'fal-ai/flux-3/klein',label:'FLUX.3 Klein'}, 'fal · FLUX.3 Klein API 文档'],
  ['https://developers.openai.com/api/docs/models/gpt-6.1-sol', {id:'gpt-6.1-sol',label:'GPT-6.1 Sol'}, 'OpenAI · GPT-6.1 Sol'],
]

// General pages intentionally use an unrelated card: only catalog knowledge
// can restore the punctuation. Both clients exercise this same set of cases.
export const f3TitleExamples = [
  ...[
    ['qwen3-6-max', 'Qwen3.6 Max'], ['qwen3-8-max', 'Qwen3.8 Max'],
    ['qwen3-7-plus', 'Qwen3.7 Plus'], ['qwen3-6-plus', 'Qwen3.6 Plus'],
    ['qwen3-5-omni-flash', 'Qwen3.5 Omni Flash'], ['qwen3-5-omni-plus', 'Qwen3.5 Omni Plus'],
    ['kimi-k2-6-quickstart', 'Kimi K2.6 Quickstart'], ['kimi-k2-7-code-quickstart', 'Kimi K2.7 Code Quickstart'],
    ['kimi-k3-1-pro-quickstart', 'Kimi K3.1 Pro Quickstart'], ['recraft-v4-1', 'Recraft V4.1'],
    ['deepseek-v4-1-flash', 'DeepSeek V4.1 Flash'], ['deepseek-r1-0528', 'DeepSeek-R1-0528'],
  ].map(([slug, expected]) => ['https://docs.example.test/guide/' + slug, {id:'unrelated-card',label:'Unrelated Card'}, 'Example · ' + expected]),
  ['https://docs.bfl.ml/api-reference/models/generate-or-edit-an-image-with-flux2-[klein]-4b', {id:'flux-2-klein-4b',label:'FLUX.2 [klein] 4B'}, 'BFL · FLUX.2 [klein] 4B'],
  ['https://docs.example.test/models/qwen3-8-27b', {id:'qwen3.8-27b',label:'Qwen3.8-27B'}, 'Example · Qwen3.8-27B'],
  ['https://docs.example.test/guide/custom-v7-2-quickstart', {id:'custom-v7.2',label:'Custom V7.2'}, 'Example · Custom V7.2 Quickstart'],
  ...[
    ['edit-or-create-an-image-with-flux1-kontext-[max]', 'FLUX.1 Kontext [max]'],
    ['generate-an-image-with-flux1-[dev]', 'FLUX.1 [dev]'],
    ['generate-an-image-with-flux11-[pro]', 'FLUX.1.1 [pro]'],
  ].map(([slug, expected]) => ['https://docs.bfl.ml/api-reference/models/' + slug, {}, 'BFL · ' + (slug.startsWith('edit-') ? 'Edit Or Create An Image With ' : 'Generate An Image With ') + expected]),
  ['https://runware.ai/docs/models/klingai-image-o3', {}, 'Runware · Klingai Image O3'],
]
