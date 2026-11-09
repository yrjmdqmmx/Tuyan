// Offline input only. Generated output is self-contained in CI and at runtime.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const AUDIT_DATE = '2026-11-09'
const fields = ['inputModalities', 'outputModalities', 'totalContextTokens', 'maxOutputTokens']
const keyLimited = ['openai', 'siliconflow', 'novita', 'together', 'replicate', 'runware']
const keyOf = row => `${row.channel}/${row.apiModelId}`
const https = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false } }

export function generateModelAudit({ pairs, mappings, canonical, deprecations, claims, channels }) {
  const mapping = new Map(mappings.map(row => [keyOf(row), row.canonicalId]))
  const facts = [], sources = [], rows = {}, notices = {}
  const intern = (list, value) => { const index = list.findIndex(item => JSON.stringify(item) === JSON.stringify(value)); if (index >= 0) return index; return list.push(value) - 1 }
  function record(row) {
    const key = keyOf(row)
    if (rows[key]) throw new Error(`Duplicate pair: ${key}`)
    const indices = fields.map(field => {
      const provenance = row.fieldProvenance?.[field]
      let value = row[field], origin = null, source = null
      if (provenance?.kind === 'inherited-from-vendor') {
        const id = mapping.get(key)
        if (!id || id !== provenance.canonicalId || JSON.stringify(canonical[id]?.[field]) !== JSON.stringify(value)) throw new Error(`Unmapped inheritance: ${key}/${field}`)
        origin = 'vendor'; source = provenance.sourceUrl
      } else if (provenance?.kind === 'channel-published') {
        origin = 'channel'; source = provenance.sourceUrl
      }
      let state = 'unknown'
      if (origin && https(source)) {
        if (value === 'N/A') state = 'not-applicable'
        else if (value === false || value === 'unsupported' || Array.isArray(value) && !value.length) state = 'unsupported'
        else if (field.endsWith('Modalities') ? Array.isArray(value) && value.every(x => ['text','image','audio','video','file','document'].includes(x)) : Number.isSafeInteger(value) && value > 0) state = 'known'
      }
      if (state !== 'known') value = null
      // A channel's request/default limits are never official output limits.
      if (row.channel === 'tokendance' && field === 'maxOutputTokens' && origin === 'channel') { value = null; state = 'unknown' }
      return intern(facts, [value ?? null, state, origin, https(source) ? intern(sources, source) : null])
    })
    rows[key] = [...indices, row.presenceStatus === 'unresolved' || keyLimited.includes(row.channel) ? 1 : 0, https(row.sourceUrl) ? intern(sources, row.sourceUrl) : null]
  }
  for (const row of [...pairs].sort((a,b) => keyOf(a).localeCompare(keyOf(b), 'en'))) record(row)
  for (const row of deprecations) {
    if (!https(row.sourceUrl) || !Number.isFinite(Date.parse(row.stopDate)) || !['full','serverless'].includes(row.scope)) throw new Error(`Invalid notice: ${keyOf(row)}`)
    notices[keyOf(row)] = { stopDate: row.stopDate, scope: row.scope, replacement: row.replacement, sourceUrl: row.sourceUrl }
  }
  const additions = []
  function add(channel, id, claim, sourceUrl) {
    if (!https(sourceUrl)) throw new Error(`Missing new-model source: ${id}`)
    const row = { channel, apiModelId: id, sourceUrl, presenceStatus: 'current', fieldProvenance: {} }
    for (const field of fields) {
      row[field] = claim[field] && !Array.isArray(claim[field]) && typeof claim[field] === 'object' ? claim[field][id] : claim[field]
      row.fieldProvenance[field] = { kind: 'channel-published', sourceUrl }
    }
    record(row); additions.push({ channel, id, sourceUrl })
  }
  const [openai, fireworks, , ling, hy, longcat] = claims
  for (const id of ['gpt-image-2.6-sunburst', 'gpt-image-2.6-flare']) {
    if (!openai.officialPageExists?.[id]) throw new Error(`Missing OpenAI evidence: ${id}`)
    add('openai', id, { ...openai, totalContextTokens: 'N/A', maxOutputTokens: 'N/A' }, `https://developers.openai.com/api/docs/models/${id}`)
  }
  const kimi = 'accounts/fireworks/models/kimi-k3p1-pro'
  if (!fireworks.officialApiIdsObserved?.includes(kimi)) throw new Error('Missing Fireworks exact ID')
  add('fireworks', kimi, fireworks, 'https://fireworks.ai/models/fireworks/kimi-k3p1-pro')
  for (const id of ['Ling-3.1-flash', 'Ling-3.2-flash']) {
    if (ling.status === 'official_ids_checked_against_antling_docs' && ling.pageMentions?.[id] === true) add('antling', id, ling, channels.antling.catalogUrls[0])
  }
  if (!hy.officialApiIdsObserved?.includes('hy4')) throw new Error('Missing HY4 exact ID')
  add('tokenhub', 'hy4', hy, 'https://cloud.tencent.com/document/product/1823/132252')
  if (longcat.status !== 'official_GA_checked' || !longcat.pageMentions?.['LongCat-2.5']) throw new Error('Missing LongCat GA evidence')
  add('longcat', 'LongCat-2.5', longcat, channels.longcat.catalogUrls[1])
  return { verifiedAt: AUDIT_DATE, fields, sources, facts, rows, notices, additions }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = path.resolve(process.argv[2] || '.audit-input')
  const read = name => JSON.parse(fs.readFileSync(path.join(input, `${name}.json`), 'utf8'))
  const data = generateModelAudit({ pairs: read('configured-pair-comparison'), mappings: read('canonical-mappings'), canonical: read('canonical-models'), deprecations: read('deprecations'), claims: read('six-claims-recheck'), channels: read('channel-official-meta') })
  const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../config/model-audit.generated.json')
  const content = JSON.stringify(data, null, 0) + '\n'
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(output, 'utf8') !== content) throw new Error('Generated audit data drift')
  } else fs.writeFileSync(output, content)
  console.log(`Audit: ${Object.keys(data.rows).length} pairs, ${Object.keys(data.notices).length} notices, ${data.additions.length} additions`)
}
