// Public discovery never enables unreviewed capabilities or silently rewrites IDs.
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

function validateModels(models) {
  if (!Array.isArray(models) || models.length > 5000 || models.some(m =>
    !m || typeof m.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,159}$/.test(m.id) ||
    !Array.isArray(m.supported_protocols) || !m.supported_protocols.length || m.supported_protocols.length > 32 ||
    m.supported_protocols.some(p => typeof p !== 'string' || p.length > 160 || !/^[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/.test(p))
  )) throw new Error('Invalid TokenDance catalog')
  const ids = new Set()
  for (const model of models) {
    if (ids.has(model.id)) throw new Error('Duplicate TokenDance model ID: ' + model.id)
    ids.add(model.id)
  }
}

export function compareTokenDanceCatalog(approved, live) {
  validateModels(approved?.models)
  validateModels(live?.data)
  const old = new Map(approved.models.map(m => [m.id, m])), next = new Map(live.data.map(m => [m.id, m]))
  const protocols = m => [...new Set(m.supported_protocols)].sort().join(',')
  return {
    newModels: live.data.filter(m => !old.has(m.id)).map(m => m.id).sort(),
    // A missing catalog row is not an official retirement notice.
    missingModels: approved.models.filter(m => !next.has(m.id)).map(m => m.id).sort(),
    protocolChanges: live.data.filter(m => old.has(m.id) && protocols(m) !== protocols(old.get(m.id))).map(m => m.id).sort(),
    metadataReview: live.data.filter(m => old.has(m.id) && (m.name !== old.get(m.id).name || m.description !== old.get(m.id).description || m.context_length !== old.get(m.id).context_length)).map(m => m.id).sort(),
    liveCount: live.data.length,
  }
}

export function buildTokenDanceDriftReport(approved, live, review = { missingModels: [] }) {
  const diff = compareTokenDanceCatalog(approved, live)
  if (!live.data.length) throw new Error('Empty TokenDance catalog')
  const active = approved.models.filter(m => m.roles?.length)
  if (active.some(m => !m.selectedProtocol || !m.supported_protocols.includes(m.selectedProtocol))) {
    throw new Error('Invalid approved TokenDance execution protocol')
  }
  // A reviewed absence acknowledges an existing runtime quarantine, never retirement
  // or permission to invoke. Bind the review to the exact audited role/protocol.
  const known = new Set()
  const roles = model => [...model.roles].sort().join(',')
  if (!Array.isArray(review?.missingModels)) throw new Error('Invalid TokenDance drift review')
  for (const row of review.missingModels) {
    const model = active.find(m => m.id === row?.id)
    if (!model || known.has(row.id) || row.selectedProtocol !== model.selectedProtocol ||
      !Array.isArray(row.roles) || roles(row) !== roles(model) || !row.reason ||
      !row.sourceUrl?.startsWith('https://') || !/^\d{4}-\d{2}-\d{2}$/.test(row.reviewedAt || '')) {
      throw new Error('Invalid TokenDance reviewed absence')
    }
    known.add(row.id)
  }
  const activeIds = new Set(active.map(m => m.id))
  const next = new Map(live.data.map(m => [m.id, m]))
  const newMissingModels = diff.missingModels.filter(id => activeIds.has(id) && !known.has(id))
  const knownMissingModels = diff.missingModels.filter(id => known.has(id))
  const unusedMissingModels = diff.missingModels.filter(id => !activeIds.has(id))
  const selectedProtocolMissing = active.filter(m => next.has(m.id) && !next.get(m.id).supported_protocols.includes(m.selectedProtocol)).map(m => m.id).sort()
  const contextReductions = active.filter(m => {
    const current = next.get(m.id)
    return current && Number.isFinite(m.context_length) && m.context_length > 0 &&
      (!Number.isFinite(current.context_length) || current.context_length < m.context_length)
  }).map(m => m.id).sort()
  const critical = { newMissingModels, selectedProtocolMissing, contextReductions }
  const recoveredModels = [...known].filter(id => next.has(id) && !selectedProtocolMissing.includes(id) && !contextReductions.includes(id)).sort()
  const needsReview = recoveredModels.length > 0 || Object.values(diff).some(value => Array.isArray(value) && value.length)
  return {
    checkedAt: new Date().toISOString(),
    status: Object.values(critical).some(ids => ids.length) ? 'critical' : needsReview ? 'review' : 'ok',
    ...diff, critical, knownMissingModels, unusedMissingModels,
    recoveredModels,
    autoPromotions: [],
    policy: 'Discovery is report-only; new execution regressions fail. Known absences remain runtime-blocked while missing. No automatic model or protocol changes.',
  }
}

export async function fetchTokenDanceCatalog(approved, fetcher = fetch) {
  const response = await fetcher(approved.apiSource, {
    signal: AbortSignal.timeout(15000), headers: { 'X-App-URL': approved.appUrl }, redirect: 'error',
  })
  if (!response.ok) throw new Error('TokenDance catalog HTTP ' + response.status)
  return response.json()
}

export function tokenDanceDriftExitCode(report, strict = false) {
  return report.status === 'error' ? 1 : report.status === 'critical' || strict && report.status === 'review' ? 2 : 0
}

export function formatTokenDanceDriftSummary(report) {
  const lines = ['## TokenDance catalog drift', '', `Status: **${report.status}**`, '', `Checked at: ${report.checkedAt}`, '']
  if (report.status === 'error') return [...lines, 'The catalog check could not complete. No compatibility conclusion is available.', ''].join('\n')
  lines.push(`Live models: ${report.liveCount}. New models are not automatically enabled.`, '',
    'Known missing models remain blocked by runtime validation; catalog absence is not an official retirement notice.', '')
  const groups = [
    ['Newly missing active models (critical)', report.critical.newMissingModels],
    ['Selected execution protocol lost (critical)', report.critical.selectedProtocolMissing],
    ['Active context capacity reduced or missing (critical)', report.critical.contextReductions],
    ['Previously reviewed missing models', report.knownMissingModels],
    ['Missing models outside supported roles', report.unusedMissingModels],
    ['New models awaiting capability review', report.newModels],
    ['Protocol set changes (including unused protocols)', report.protocolChanges],
    ['Name, description or context changes', report.metadataReview],
    ['Previously missing models present again', report.recoveredModels],
  ]
  for (const [label, ids] of groups) lines.push(`### ${label} (${ids.length})`, '', ids.length ? ids.map(id => `- \`${id}\``).join('\n') : 'None.', '')
  return lines.join('\n')
}

async function main() {
  const { values } = parseArgs({ options: { file: { type: 'string' }, strict: { type: 'boolean', default: false } } })
  const root = new URL('../', import.meta.url)
  const approved = JSON.parse(await fs.readFile(new URL('config/tokendance/catalog.json', root), 'utf8'))
  const review = JSON.parse(await fs.readFile(new URL('config/tokendance/drift-review.json', root), 'utf8'))
  const live = values.file ? JSON.parse(await fs.readFile(values.file, 'utf8')) : await fetchTokenDanceCatalog(approved)
  const report = buildTokenDanceDriftReport(approved, live, review)
  console.log(JSON.stringify(report, null, 2))
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, formatTokenDanceDriftSummary(report))
  if (process.env.GITHUB_ACTIONS === 'true' && report.status !== 'ok') {
    console.error(`::${report.status === 'critical' ? 'error' : 'warning'}::TokenDance catalog status: ${report.status}. See the job summary and JSON artifact; no models were automatically enabled.`)
  }
  process.exitCode = tokenDanceDriftExitCode(report, values.strict)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(async error => {
    // Do not log raw upstream bodies, credentials or arbitrary exception messages.
    const message = String(error?.message || '')
    const safeErrors = new Set(['Invalid TokenDance catalog', 'Empty TokenDance catalog',
      'Invalid approved TokenDance execution protocol', 'Invalid TokenDance drift review', 'Invalid TokenDance reviewed absence'])
    const reason = /^TokenDance catalog HTTP \d{3}$/.test(message) ? message :
      safeErrors.has(message) || /^Duplicate TokenDance model ID: [a-zA-Z0-9][a-zA-Z0-9._:/-]{0,159}$/.test(message) ? message :
      error?.name === 'TimeoutError' ? 'TokenDance catalog request timed out' :
      error instanceof SyntaxError ? 'Invalid TokenDance JSON' :
      'TokenDance catalog check could not complete; check network availability and local report configuration.'
    const report = { checkedAt: new Date().toISOString(), status: 'error', error: reason }
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = 1
    if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, formatTokenDanceDriftSummary(report))
    if (process.env.GITHUB_ACTIONS === 'true') console.error('::error::TokenDance catalog check could not complete. No compatibility conclusion is available.')
  })
}
