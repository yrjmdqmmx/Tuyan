import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  buildTokenDanceDriftReport, compareTokenDanceCatalog, fetchTokenDanceCatalog,
  formatTokenDanceDriftSummary, tokenDanceDriftExitCode,
} from '../scripts/check-tokendance-catalog.mjs'

const chat = 'openai:chat-completions'
const model = (id = 'active') => ({ id, name: id, description: 'fixture', context_length: 1000,
  roles: ['main'], supported_protocols: [chat, 'openai:responses'], selectedProtocol: chat })
const approved = { models: [model()] }
const live = row => ({ data: [row] })
const absence = row => ({ ...row, reviewedAt: '2026-09-25', sourceUrl: 'https://tokendance.space/gateway/v1/models', reason: 'Existing runtime quarantine verified.' })
const root = fileURLToPath(new URL('../', import.meta.url))

test('unchanged catalogs, protocol ordering and duplicates do not create drift', () => {
  const report = buildTokenDanceDriftReport(approved, live({ ...model(), supported_protocols: ['openai:responses', chat, chat] }))
  assert.equal(report.status, 'ok')
  assert.equal(tokenDanceDriftExitCode(report), 0)
  assert.deepEqual(report.autoPromotions, [])
})

test('discovery, marketing text and unused protocol changes remain visible without execution failure', () => {
  const input = { data: [{ ...model(), description: 'new marketing text', supported_protocols: [chat, 'anthropic:messages'] }, model('new-model')] }
  const before = JSON.stringify({ approved, input })
  const report = buildTokenDanceDriftReport(approved, input)
  assert.equal(report.status, 'review')
  assert.deepEqual(report.newModels, ['new-model'])
  assert.deepEqual(report.protocolChanges, ['active'])
  assert.deepEqual(report.metadataReview, ['active'])
  assert.deepEqual(report.critical.selectedProtocolMissing, [])
  assert.equal(tokenDanceDriftExitCode(report), 0)
  assert.equal(tokenDanceDriftExitCode(report, true), 2)
  assert.equal(JSON.stringify({ approved, input }), before)
  assert.match(formatTokenDanceDriftSummary(report), /New models awaiting capability review \(1\)/)
})

test('loss of the actual invocation protocol fails even when another protocol remains', () => {
  const report = buildTokenDanceDriftReport(approved, live({ ...model(), supported_protocols: ['anthropic:messages'] }))
  assert.equal(report.status, 'critical')
  assert.deepEqual(report.critical.selectedProtocolMissing, ['active'])
  assert.equal(tokenDanceDriftExitCode(report), 2)
})

test('newly missing active models fail; unsupported catalog rows are report-only', () => {
  const input = { models: [model(), { ...model('video-only'), roles: [], selectedProtocol: null }] }
  const report = buildTokenDanceDriftReport(input, live(model('new-model')))
  assert.deepEqual(report.critical.newMissingModels, ['active'])
  assert.deepEqual(report.unusedMissingModels, ['video-only'])
  assert.equal(tokenDanceDriftExitCode(report), 2)
})

test('known absences stay visible; their exceptions never hide protocol loss on return', () => {
  const review = { missingModels: [absence(model())] }
  const missing = buildTokenDanceDriftReport(approved, live(model('new-model')), review)
  assert.deepEqual(missing.knownMissingModels, ['active'])
  assert.deepEqual(missing.critical.newMissingModels, [])
  assert.equal(tokenDanceDriftExitCode(missing), 0)
  assert.match(formatTokenDanceDriftSummary(missing), /remain blocked by runtime validation/)
  const incompatibleReturn = buildTokenDanceDriftReport(approved, live({ ...model(), supported_protocols: ['anthropic:messages'] }), review)
  assert.deepEqual(incompatibleReturn.critical.selectedProtocolMissing, ['active'])
  assert.equal(tokenDanceDriftExitCode(incompatibleReturn), 2)
  assert.deepEqual(incompatibleReturn.recoveredModels, [])
  const smallerReturn = buildTokenDanceDriftReport(approved, live({ ...model(), context_length: 500 }), review)
  assert.equal(tokenDanceDriftExitCode(smallerReturn), 2)
  assert.deepEqual(smallerReturn.recoveredModels, [])
  assert.deepEqual(buildTokenDanceDriftReport(approved, live(model()), review).recoveredModels, ['active'])
})

test('absence review is pinned to exact ID, role and selected protocol', () => {
  for (const patch of [{ id: 'unknown' }, { roles: ['main', 'vision'] }, { selectedProtocol: 'anthropic:messages' }, { reviewedAt: '' }, { reason: '' }]) {
    assert.throws(() => buildTokenDanceDriftReport(approved, live(model()), { missingModels: [{ ...absence(model()), ...patch }] }), /reviewed absence/)
  }
  assert.throws(() => buildTokenDanceDriftReport(approved, live(model()), { missingModels: [absence(model()), absence(model())] }), /reviewed absence/)
})

test('context capacity decreases or disappears fail, while increases request review', () => {
  for (const context_length of [999, 0, undefined, '1000']) {
    const report = buildTokenDanceDriftReport(approved, live({ ...model(), context_length }))
    assert.deepEqual(report.critical.contextReductions, ['active'])
    assert.equal(tokenDanceDriftExitCode(report), 2)
  }
  const increase = buildTokenDanceDriftReport(approved, live({ ...model(), context_length: 2000 }))
  assert.equal(increase.status, 'review')
  assert.equal(tokenDanceDriftExitCode(increase), 0)
})

test('malformed, empty and duplicate live catalogs cannot become a successful report', () => {
  for (const input of [null, {}, { data: null }, { data: [] }, { data: [null] },
    live({ ...model(), id: 'bad\n::notice::injection' }),
    live({ ...model(), supported_protocols: null }), live({ ...model(), supported_protocols: [null] }),
    { data: [model(), model()] }]) {
    assert.throws(() => buildTokenDanceDriftReport(approved, input))
  }
  const noProtocols = buildTokenDanceDriftReport(approved, live({ ...model(), supported_protocols: [] }))
  assert.equal(tokenDanceDriftExitCode(noProtocols), 2)
})

test('invalid active execution baselines fail instead of losing monitoring coverage', () => {
  assert.throws(() => buildTokenDanceDriftReport({ models: [{ ...model(), selectedProtocol: null }] }, live(model())), /execution protocol/)
})

test('HTTP errors fail before parsing their body; network and invalid JSON failures propagate', async () => {
  const source = { apiSource: 'https://tokendance.space/gateway/v1/models', appUrl: 'https://www.paperbanana.asia/' }
  for (const status of [403, 429, 500]) {
    await assert.rejects(fetchTokenDanceCatalog(source, async () => ({ ok: false, status, json() { assert.fail('must not parse error body') } })), new RegExp(`HTTP ${status}`))
  }
  await assert.rejects(fetchTokenDanceCatalog(source, async () => { throw new Error('network unavailable') }), /network/)
  await assert.rejects(fetchTokenDanceCatalog(source, async () => new Response('not JSON')), SyntaxError)
  const result = await fetchTokenDanceCatalog(source, async (url, options) => {
    assert.equal(url, source.apiSource)
    assert.equal(options.headers['X-App-URL'], source.appUrl)
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal instanceof AbortSignal)
    return Response.json(live(model()))
  })
  assert.deepEqual(result, live(model()))
})

test('September incident: known absences and unused protocol changes do not mask new regressions', async () => {
  const catalog = JSON.parse(await fs.readFile(new URL('../config/tokendance/catalog.json', import.meta.url), 'utf8'))
  const review = JSON.parse(await fs.readFile(new URL('../config/tokendance/drift-review.json', import.meta.url), 'utf8'))
  const missing = new Set(['deepseek-chat-v3-0324', 'deepseek-v4-flash-vision-exp', 'deepseek-ocr-2'])
  const input = { data: catalog.models.filter(m => !missing.has(m.id)).map(m => ({ ...m,
    supported_protocols: ['deepseek-v4-flash', 'deepseek-v4-pro'].includes(m.id) ? [chat, 'anthropic:messages'] : m.supported_protocols,
  })) }
  const report = buildTokenDanceDriftReport(catalog, input, review)
  assert.equal(tokenDanceDriftExitCode(report), 0)
  assert.equal(report.knownMissingModels.length, 2)
  assert.deepEqual(report.unusedMissingModels, ['deepseek-ocr-2'])
  input.data = input.data.filter(m => m.id !== 'qwen3.8-flash')
  const regression = buildTokenDanceDriftReport(catalog, input, review)
  assert.equal(tokenDanceDriftExitCode(regression), 2)
  assert.deepEqual(regression.critical.newMissingModels, ['qwen3.8-flash'])
  assert.deepEqual(compareTokenDanceCatalog(catalog, input).missingModels, [...missing, 'qwen3.8-flash'].sort())
})

test('CLI produces JSON, summary, warnings and nonzero failure codes with local fixtures', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'tokendance-drift-'))
  try {
    const catalog = JSON.parse(await fs.readFile(path.join(root, 'config/tokendance/catalog.json'), 'utf8'))
    const file = path.join(temp, 'catalog.json'), summary = path.join(temp, 'summary.md')
    const run = (...args) => spawnSync(process.execPath, ['scripts/check-tokendance-catalog.mjs', '--file', file, ...args], {
      cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: summary },
    })
    await fs.writeFile(file, JSON.stringify({ data: [...catalog.models, model('new-model')] }))
    let result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).status, 'review')
    assert.match(result.stderr, /::warning::/)
    assert.match(await fs.readFile(summary, 'utf8'), /new-model/)
    assert.equal(run('--strict').status, 2)
    await fs.writeFile(file, JSON.stringify({ data: catalog.models.filter(m => m.id !== 'qwen3.8-flash') }))
    result = run()
    assert.equal(result.status, 2)
    assert.match(result.stderr, /::error::/)
    await fs.writeFile(file, '{bad JSON secret raw response')
    result = run()
    assert.equal(result.status, 1)
    assert.equal(JSON.parse(result.stdout).status, 'error')
    assert.equal(result.stdout.includes('secret'), false)
    assert.match(await fs.readFile(summary, 'utf8'), /No compatibility conclusion/)
  } finally { await fs.rm(temp, { recursive: true, force: true }) }
})
