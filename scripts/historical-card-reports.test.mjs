import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadCard, readPackedRegistry } from './lib/model-card-audit.mjs'
import { r10Rows, r12Links, r12Models, r12SourceUrls, r12SourcePolicy } from './lib/historical-card-projections.mjs'
import { historicalCardRows } from './lib/historical-card-reports.mjs'
import { modalityIconStates } from '../apps/web/src/lib/modelModalityIcons.js'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
import * as sourcePolicy from '../apps/web/src/lib/modelCardSources.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = file => JSON.parse(fs.readFileSync(root + file, 'utf8'))
// Independently read from git show 52e0f161:<artifact>, not generated outputs.
const mainHashes = {
  'docs/model-card-audit-20261109-r10-counts.json': '43e0aa5618892ebd0fd8ecfdf411750b0bd2dd268e9b0b2ccdf0d8f619457dd1',
  'docs/model-card-audit-20261109-r12-links.md': 'dced655fbbcce4cf71f92676d08e01bec35975e2c6bf073acfc647e2da86d492',
  'apps/web/tests/fixtures/r12-final-changed-links.json': '60e885e26e3598c48c1fc91a980afef925aeeaddbff60094c324d4a3d0fb8943',
}

test('R31 I14 default R10/R12 checks pass without Git and retain byte-identical main artifacts', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r31-i14-no-git-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  fs.writeFileSync(path.join(dir, 'git'), '#!/bin/sh\necho "I14 check must not invoke Git" >&2\nexit 91\n', { mode: 0o755 })
  const snapshots = Object.fromEntries(Object.keys(mainHashes).map(file => [file, fs.readFileSync(root + file)]))
  for (const report of ['r10', 'r12']) {
    const output = execFileSync(process.execPath, [`scripts/report-model-card-${report}.mjs`, '--check'], {
      cwd: root, env: { ...process.env, PATH: dir + path.delimiter + process.env.PATH }, encoding: 'utf8', stdio: 'pipe',
    })
    assert.doesNotMatch(output, /SKIP/, report + ' must actually verify the report')
  }
  for (const [file, hash] of Object.entries(mainHashes)) {
    assert.equal(createHash('sha256').update(snapshots[file]).digest('hex'), hash, file + ' differs from main')
    assert.deepEqual(fs.readFileSync(root + file), snapshots[file], file + ' check wrote an artifact')
  }
})

test('R31 I14 exact projections reject source, modality, identity/order and unchanged-row drift', async () => {
  const card = await loadCard(root)
  const registry = readPackedRegistry(root + 'apps/web/tests/fixtures/r11-registry-head.json')
  const before = read('apps/web/tests/fixtures/r12-links-before.json'), models = r12Models(STATIC_MODEL_REGISTRY, registry)
  const current = {
    r10: r10Rows(registry, card, modalityIconStates),
    r12Full: r12Links(before.rows, card, row => models.get(row.channel + '/' + row.modelId)),
    r12Static: r12Links(before.staticApiOnlyRows, card,
      row => STATIC_MODEL_REGISTRY[row.channel].models.find(model => model.id === row.modelId)),
  }
  const full = historicalCardRows('r12Full', current.r12Full), statics = historicalCardRows('r12Static', current.r12Static)
  current.r12Policy = r12SourcePolicy(r12SourceUrls(before, full, statics, current.r12Full, current.r12Static),
    sourcePolicy, read('config/channel-audit/model-audit-supplement-20261109.json').sourceChecks)
  for (const [scope, rows] of Object.entries(current)) {
    const snapshot = structuredClone(rows)
    assert.equal(historicalCardRows(scope, rows).length, rows.length)
    assert.deepEqual(rows, snapshot, scope + ' must not mutate current display inputs')
    const wrongIdentity = structuredClone(rows); wrongIdentity[0].key += '/unreviewed'
    assert.throws(() => historicalCardRows(scope, wrongIdentity), /unreviewed current presentation drift/)
    assert.throws(() => historicalCardRows(scope, rows.toReversed()), /unreviewed current presentation drift/)
    assert.throws(() => historicalCardRows(scope, rows.slice(1)), /identity count drift/)
  }
  const badSource = structuredClone(current.r10); badSource[0].full.sources[0] = 'https://example.invalid/'
  const badState = structuredClone(current.r10); badState[0].minimal.modalities[0][0][1] = 'unreviewed'
  for (const rows of [badSource, badState]) assert.throws(() => historicalCardRows('r10', rows), /unreviewed current presentation drift/)
  for (const scope of ['r12Full', 'r12Static']) {
    const rows = structuredClone(current[scope]); rows[0].url = 'https://example.invalid/'
    assert.throws(() => historicalCardRows(scope, rows), /unreviewed current presentation drift/)
  }
  const badPolicy = structuredClone(current.r12Policy); badPolicy[0].api = !badPolicy[0].api
  assert.throws(() => historicalCardRows('r12Policy', badPolicy), /unreviewed current presentation drift/)
})
