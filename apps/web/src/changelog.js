export const CHANGE_KINDS = ['新增', '优化', '修复']
export const PRODUCTS = { tuyan: 'Tuyan', benchmark: 'Tuyan Benchmark', openacad: 'OpenAcad' }
const SOURCE_PATHS = {
  'pull-request': /^pull\/\d+$/,
  deployment: /^actions\/runs\/\d+$/,
  commit: /^commit\/[a-f0-9]{7,40}$/,
  'release-record': /^blob\/[a-f0-9]{7,40}\/(?:docs\/[a-zA-Z0-9/_().-]+\.md|SYNC\.md)$/,
}
const ARCHIVE_SOURCES = ['announcement', 'owner-confirmation', 'archive-record']
const RELEASE_PROOF = ['deployment', 'release-record', 'owner-confirmation', 'archive-record']
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const BENCHMARK_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/
export function versionLabel(entry) { return `${PRODUCTS[entry.product]} v${entry.version}` }
export function compareVersions(a, b) {
  const left = a.split('.').map(Number), right = b.split('.').map(Number)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] || 0) - (right[i] || 0)
    if (difference) return difference
  }
  return 0
}
export function isChangelogPath(pathname) { return /^\/changelog(?:\/|\/index\.html)?$/.test(pathname || '') }
export function publishedVersions(data, product) {
  return (data.entries || []).filter(entry => entry.product === product && entry.release?.status === 'released' && entry.changes?.every(change => change.state === 'released'))
}
export function publicEvents(data) { return (data.events || []).filter(event => event.status === 'recorded' && event.changes?.every(change => change.state === 'released')) }
export function resolveChangelogAnchor(data, id) {
  return [...Object.keys(PRODUCTS).flatMap(product => publishedVersions(data, product)), ...publicEvents(data)]
    .find(entry => entry.id === id || entry.legacyAnchors?.includes(id))?.id
}
function isDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value }
export function validateChangelog(data) {
  const errors = [], anchors = new Set(), identities = new Set(), previous = new Map()
  const text = value => typeof value === 'string' && value.trim().length > 0
  const fields = (value, allowed, label) => { if (value && typeof value === 'object' && Object.keys(value).some(key => !allowed.includes(key))) errors.push(`${label}: unsupported field in public data`) }
  const date = (value, label) => { if (!isDate(value) || value < data?.coverage?.from || value > data?.coverage?.through) errors.push(`${label}: invalid or future calendar date`) }
  const anchor = value => { if (!/^[a-z][a-z0-9-]*$/.test(value || '') || anchors.has(value)) errors.push('anchors must be unique and URL-safe'); anchors.add(value) }
  const sources = entry => {
    const ids = new Set()
    if (!Array.isArray(entry.sources) || !entry.sources.length) { errors.push(`${entry.id}: sources required`); return ids }
    for (const source of entry.sources) {
      fields(source, ['id', 'kind', 'label', 'url'], entry.id)
      if (!text(source.id) || ids.has(source.id) || !text(source.label) || ![...Object.keys(SOURCE_PATHS), ...ARCHIVE_SOURCES].includes(source.kind)) errors.push(`${entry.id}: invalid source`)
      ids.add(source.id)
      if (ARCHIVE_SOURCES.includes(source.kind)) {
        if (source.url !== undefined) errors.push(`${entry.id}: archived evidence must not fabricate a public URL`)
      } else {
        const prefix = 'https://github.com/yrjmdqmmx/Tuyan/'
        const path = source.url?.startsWith(prefix) ? source.url.slice(prefix.length) : ''
        if (!SOURCE_PATHS[source.kind]?.test(path)) errors.push(`${entry.id}: source kind does not match a safe public URL`)
      }
    }
    return ids
  }
  const common = (entry, isEvent = false) => {
    anchor(entry.id); for (const alias of entry.legacyAnchors || []) anchor(alias)
    if (!text(entry.title) || !text(entry.summary) || !Array.isArray(entry.surfaces) || !entry.surfaces.length || entry.surfaces.some(s => !['Web', '微信小程序', 'Android', 'Windows', 'Agent', '平台'].includes(s))) errors.push(`${entry.id}: invalid display fields`)
    const ids = sources(entry)
    if (!Array.isArray(entry.changes) || !entry.changes.length) { errors.push(`${entry.id}: changes required`); return }
    for (const change of entry.changes) {
      fields(change, ['kind', 'text', 'state', 'surfaces', 'sourceIds'], entry.id)
      if (!CHANGE_KINDS.includes(change.kind) || !text(change.text)) errors.push(`${entry.id}: invalid change`)
      if (change.state !== 'released') errors.push(`${entry.id}: unreleased changes cannot enter public history`)
      if (!Array.isArray(change.sourceIds) || !change.sourceIds.length || change.sourceIds.some(id => !ids.has(id))) errors.push(`${entry.id}: each change needs existing source IDs`)
      if (change.surfaces && (!Array.isArray(change.surfaces) || !change.surfaces.length || change.surfaces.some(s => !entry.surfaces.includes(s)))) errors.push(`${entry.id}: invalid change surfaces`)
      const proof = isEvent ? [...RELEASE_PROOF, 'announcement'] : RELEASE_PROOF
      if (!entry.sources?.some(s => change.sourceIds?.includes(s.id) && proof.includes(s.kind))) errors.push(`${entry.id}: a PR or announcement alone does not prove version publication`)
    }
  }
  fields(data, ['schemaVersion', 'coverage', 'entries', 'events'], 'archive')
  fields(data?.coverage, ['from', 'through'], 'coverage')
  if (data?.schemaVersion !== 3) errors.push('schemaVersion must be 3')
  if (!isDate(data?.coverage?.from) || !isDate(data?.coverage?.through) || data.coverage.from > data.coverage.through) errors.push('invalid coverage')
  if (!Array.isArray(data?.entries) || !data.entries.length) return [...errors, 'versions required']
  for (const entry of data.entries) {
    fields(entry, ['id', 'product', 'version', 'announcementDate', 'release', 'title', 'summary', 'surfaces', 'changes', 'sources', 'notes', 'legacyAnchors'], entry.id)
    const identity = `${entry.product}:${entry.version}`, pattern = entry.product === 'benchmark' ? BENCHMARK_VERSION_PATTERN : VERSION_PATTERN
    if (!Object.hasOwn(PRODUCTS, entry.product) || !pattern.test(entry.version || '')) errors.push(`${entry.id}: invalid product version format`)
    if (identities.has(identity) || (previous.has(entry.product) && compareVersions(previous.get(entry.product), entry.version) <= 0)) errors.push(`${entry.id}: product versions must be unique and numerically descending`)
    identities.add(identity); previous.set(entry.product, entry.version)
    fields(entry.release, ['status', 'date', 'surfaces'], entry.id)
    if (entry.release?.status !== 'released') errors.push(`${entry.id}: only released versions belong in public data`)
    date(entry.release?.date, entry.id)
    if (entry.announcementDate !== null) date(entry.announcementDate, entry.id)
    if (!Array.isArray(entry.release?.surfaces) || !entry.release.surfaces.length || entry.release.surfaces.some(surface => !entry.surfaces?.includes(surface)) || entry.surfaces?.some(surface => !entry.release.surfaces.includes(surface))) errors.push(`${entry.id}: release surfaces must name only verified published clients`)
    if (entry.product === 'tuyan' && entry.surfaces?.includes('微信小程序')) errors.push(`${entry.id}: mini program belongs in ecosystem events`)
    if (!Array.isArray(entry.notes) || entry.notes.some(note => !text(note))) errors.push(`${entry.id}: invalid notes`)
    common(entry)
  }
  if (!Array.isArray(data.events)) errors.push('events must be an explicit list')
  else {
    let previousDate
    for (const event of data.events) {
      fields(event, ['id', 'date', 'status', 'title', 'summary', 'surfaces', 'changes', 'sources', 'legacyAnchors'], event.id)
      date(event.date, event.id)
      if (previousDate && event.date > previousDate) errors.push(`${event.id}: events must be dated descending`)
      previousDate = event.date
      if (event.status !== 'recorded') errors.push(`${event.id}: only recorded events belong in public data`)
      common(event, true)
    }
  }
  if (/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|\/Users\/|\/opt\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|Bearer\s|api[_-]?key\s*[:=])/i.test(JSON.stringify(data))) errors.push('public data must not contain private addresses, account details, local paths, or credentials')
  return errors
}
