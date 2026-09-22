export const CHANGE_KINDS = ['新增', '优化', '修复']
export const CHANGE_STATES = { released: '此前已上线', 'local-verified': '本地已验证', 'code-complete': '开发完成', unconfirmed: '待核实' }
export const RELEASE_STATES = { released: '已发布', unreleased: '待发布', unverified: '发布信息待核实' }
const SOURCE_KINDS = ['pull-request', 'deployment', 'release-record', 'commit', 'announcement', 'local-verification']
const SOURCE_PATHS = {
  'pull-request': /^pull\/\d+$/,
  deployment: /^actions\/runs\/\d+$/,
  commit: /^commit\/[a-f0-9]{7,40}$/,
  'release-record': /^blob\/[a-f0-9]{7,40}\/(?:docs\/[a-zA-Z0-9/_().-]+\.md|SYNC\.md)$/,
}
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
export function compareVersions(a, b) {
  const left = a.split('.').map(Number), right = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i]
  return 0
}
export function isChangelogPath(pathname) { return /^\/changelog(?:\/|\/index\.html)?$/.test(pathname || '') }
function isDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value }
export function resolveChangelogAnchor(data, id) {
  return [...data.entries, ...(data.unassigned || [])].find(entry => entry.id === id || entry.legacyAnchors?.includes(id))?.id
}
export function validateChangelog(data) {
  const errors = [], anchors = new Set(), versions = new Set()
  const text = value => typeof value === 'string' && value.trim().length > 0
  const fields = (value, allowed, label) => { if (value && typeof value === 'object' && Object.keys(value).some(key => !allowed.includes(key))) errors.push(`${label}: unsupported field in public data`) }
  const date = (value, label) => { if (value !== null && (!isDate(value) || value > data?.coverage?.through)) errors.push(`${label}: invalid or future calendar date`) }
  const anchor = (value) => { if (!/^[a-z][a-z0-9-]*$/.test(value || '') || anchors.has(value)) errors.push('anchors must be unique and URL-safe'); anchors.add(value) }
  const sources = entry => {
    const ids = new Set()
    if (!Array.isArray(entry.sources) || !entry.sources.length) { errors.push(`${entry.id}: sources required`); return ids }
    for (const source of entry.sources) {
      fields(source, ['id', 'kind', 'label', 'url'], entry.id)
      if (!text(source.id) || ids.has(source.id) || !text(source.label) || !SOURCE_KINDS.includes(source.kind)) errors.push(`${entry.id}: invalid source`)
      ids.add(source.id)
      if (['announcement', 'local-verification'].includes(source.kind)) {
        if (source.url !== undefined) errors.push(`${entry.id}: unpublished evidence must not fabricate a public URL`)
      } else {
        const path = source.url?.startsWith('https://github.com/yrjmdqmmx/Tuyan/') ? source.url.slice('https://github.com/yrjmdqmmx/Tuyan/'.length) : ''
        if (!SOURCE_PATHS[source.kind]?.test(path)) errors.push(`${entry.id}: source kind does not match a safe public URL`)
      }
    }
    return ids
  }
  const changes = (entry, ids) => {
    if (!Array.isArray(entry.changes) || !entry.changes.length) { errors.push(`${entry.id}: changes required`); return }
    for (const change of entry.changes) {
      fields(change, ['kind', 'text', 'state', 'surfaces', 'sourceIds'], entry.id)
      if (!CHANGE_KINDS.includes(change.kind) || !text(change.text) || !Object.hasOwn(CHANGE_STATES, change.state)) errors.push(`${entry.id}: invalid change`)
      if (!Array.isArray(change.sourceIds) || !change.sourceIds.length || change.sourceIds.some(id => !ids.has(id))) errors.push(`${entry.id}: each change needs existing source IDs`)
      if (change.surfaces && (!Array.isArray(change.surfaces) || !change.surfaces.length || change.surfaces.some(s => !entry.surfaces.includes(s)))) errors.push(`${entry.id}: invalid change surfaces`)
      if (change.state === 'released' && !entry.sources.some(s => change.sourceIds?.includes(s.id) && ['deployment', 'release-record'].includes(s.kind))) errors.push(`${entry.id}: a PR or announcement alone does not prove publication`)
      if (entry.release?.status === 'released' && change.state !== 'released' && (change.surfaces || entry.surfaces).some(surface => entry.release.surfaces?.includes(surface))) errors.push(`${entry.id}: unreleased changes cannot be presented as a released version`)
    }
  }
  fields(data, ['schemaVersion', 'coverage', 'entries', 'unassigned'], 'archive')
  fields(data?.coverage, ['from', 'through', 'description'], 'coverage')
  if (data?.schemaVersion !== 2) errors.push('schemaVersion must be 2')
  if (!isDate(data?.coverage?.from) || !isDate(data?.coverage?.through) || data.coverage.from > data.coverage.through || !text(data?.coverage?.description)) errors.push('invalid coverage')
  if (!Array.isArray(data?.entries) || !data.entries.length) return [...errors, 'versions required']
  let previous
  for (const entry of data.entries) {
    fields(entry, ['id', 'version', 'announcementDate', 'release', 'title', 'summary', 'surfaces', 'changes', 'sources', 'notes', 'legacyAnchors'], entry.id)
    anchor(entry.id); for (const alias of entry.legacyAnchors || []) anchor(alias)
    if (!versionPattern.test(entry.version || '') || versions.has(entry.version) || previous && compareVersions(previous, entry.version) <= 0) errors.push(`${entry.id}: versions must be unique and numerically descending`)
    versions.add(entry.version); previous = entry.version
    fields(entry.release, ['status', 'date', 'surfaces'], entry.id)
    if (!Object.hasOwn(RELEASE_STATES, entry.release?.status)) errors.push(`${entry.id}: invalid release state`)
    date(entry.release?.date, entry.id); date(entry.announcementDate, entry.id)
    if (!Array.isArray(entry.release?.surfaces) || entry.release.surfaces.some(surface => !entry.surfaces?.includes(surface)) || (entry.release.status === 'released' ? !entry.release.surfaces.length : entry.release.surfaces.length)) errors.push(`${entry.id}: release surfaces must name only verified published clients`)
    if (entry.release?.status !== 'released' && entry.release?.date !== null) errors.push(`${entry.id}: an unverified or unreleased version cannot have a release date`)
    if (!text(entry.title) || !text(entry.summary) || !Array.isArray(entry.surfaces) || !entry.surfaces.length || entry.surfaces.some(s => !['Web', '微信小程序', 'Android', 'Windows'].includes(s))) errors.push(`${entry.id}: invalid display fields`)
    if (!Array.isArray(entry.notes) || entry.notes.some(note => !text(note))) errors.push(`${entry.id}: invalid notes`)
    changes(entry, sources(entry))
  }
  if (!Array.isArray(data.unassigned)) errors.push('unassigned must be an explicit list')
  else for (const entry of data.unassigned) {
    fields(entry, ['id', 'announcementDate', 'summary', 'note', 'sources'], entry.id)
    anchor(entry.id); date(entry.announcementDate, entry.id); sources(entry)
    if (!text(entry.summary) || !text(entry.note)) errors.push(`${entry.id}: unassigned evidence needs an explanation`)
  }
  const serialized = JSON.stringify(data)
  if (/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|\/Users\/|\/opt\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|Bearer\s|api[_-]?key\s*[:=])/i.test(serialized)) errors.push('public data must not contain private addresses, account details, local paths, or credentials')
  return errors
}
export function filterChangelog(entries, query = '') {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return entries.filter(entry => {
    const haystack = [entry.version, entry.release?.date, entry.announcementDate, RELEASE_STATES[entry.release?.status], entry.title, entry.summary, entry.note, ...(entry.surfaces || []), ...(entry.notes || []), ...(entry.changes || []).map(change => change.text)].join(' ').toLocaleLowerCase()
    return tokens.every(token => versionPattern.test(token.replace(/^v/, '')) ? entry.version === token.replace(/^v/, '') : haystack.includes(token))
  })
}
