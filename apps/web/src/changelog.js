export const CHANGE_KINDS = ['新增', '改进', '修复', '调整']
const SOURCE_KINDS = ['pull-request', 'deployment', 'release-record']
const PUBLIC_SOURCE = /^https:\/\/github\.com\/yrjmdqmmx\/Tuyan\/(?:pull\/\d+|actions\/runs\/\d+|blob\/[a-f0-9]{7,40}\/docs\/releases\/[a-z0-9.-]+\.md)$/

export function isChangelogPath(pathname) {
  return /^\/changelog(?:\/|\/index\.html)?$/.test(pathname || '')
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

// This is the public dataset. Drafts and operational evidence belong in docs,
// never in the client bundle with a hidden flag.
export function validateChangelog(data) {
  const errors = []
  const text = (value) => typeof value === 'string' && value.trim().length > 0
  const fields = (value, allowed, label) => {
    if (value && typeof value === 'object' && Object.keys(value).some(key => !allowed.includes(key))) errors.push(`${label}: unsupported field in public data`)
  }
  fields(data, ['schemaVersion', 'coverage', 'entries'], 'archive')
  fields(data?.coverage, ['from', 'through', 'description'], 'coverage')
  if (data?.schemaVersion !== 1) errors.push('schemaVersion must be 1')
  if (!isDate(data?.coverage?.from) || !isDate(data?.coverage?.through) || data.coverage.from > data.coverage.through) errors.push('coverage must contain a valid date range')
  if (!text(data?.coverage?.description)) errors.push('coverage description is required')
  if (!Array.isArray(data?.entries) || !data.entries.length) return [...errors, 'entries must not be empty']
  const ids = new Set()
  let previousDate = '9999-12-31'
  for (const entry of data.entries) {
    const label = entry?.id || '(missing id)'
    fields(entry, ['id', 'date', 'status', 'title', 'summary', 'surfaces', 'changes', 'sources'], label)
    if (!entry || !/^[a-z][a-z0-9-]*$/.test(entry.id || '') || ids.has(entry.id)) errors.push(`${label}: id must be unique and URL-safe`)
    ids.add(entry?.id)
    if (entry?.status !== 'released') errors.push(`${label}: only confirmed released entries are public`)
    if (!isDate(entry?.date) || entry.date > previousDate) errors.push(`${label}: dates must be valid and newest first`)
    if (entry?.date < data.coverage?.from || entry?.date > data.coverage?.through) errors.push(`${label}: date is outside coverage`)
    previousDate = entry?.date
    if (!text(entry?.title) || !text(entry?.summary)) errors.push(`${label}: title and summary are required`)
    if (!Array.isArray(entry?.surfaces) || !entry.surfaces.length || entry.surfaces.some(surface => surface !== 'Web')) errors.push(`${label}: this archive covers released Web behavior only`)
    if (!Array.isArray(entry?.changes) || !entry.changes.length || entry.changes.some(change => !CHANGE_KINDS.includes(change?.kind) || !text(change?.text))) errors.push(`${label}: changes require a supported kind and text`)
    else entry.changes.forEach(change => fields(change, ['kind', 'text'], label))
    if (!Array.isArray(entry?.sources) || !entry.sources.length) errors.push(`${label}: public sources are required`)
    else {
      if (!entry.sources.some(source => ['deployment', 'release-record'].includes(source?.kind))) errors.push(`${label}: a PR alone does not prove publication`)
      for (const source of entry.sources) {
        fields(source, ['kind', 'label', 'url'], label)
        if (!SOURCE_KINDS.includes(source?.kind) || !text(source?.label) || !PUBLIC_SOURCE.test(source?.url || '')) errors.push(`${label}: invalid public source`)
        else if ((source.kind === 'pull-request' && !source.url.includes('/pull/'))
          || (source.kind === 'deployment' && !source.url.includes('/actions/runs/'))
          || (source.kind === 'release-record' && !source.url.includes('/blob/'))) errors.push(`${label}: source kind does not match its URL`)
      }
    }
  }
  const serialized = JSON.stringify(data)
  if (/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|\/Users\/|\/opt\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|Bearer\s|api[_-]?key\s*[:=])/i.test(serialized)) errors.push('public data must not contain private addresses, account details, local paths, or credentials')
  return errors
}

export function filterChangelog(entries, query = '') {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return entries.filter(entry => {
    const haystack = [entry.date, entry.title, entry.summary, ...entry.changes.map(change => change.text)].join(' ').toLocaleLowerCase()
    return tokens.every(token => haystack.includes(token))
  })
}
