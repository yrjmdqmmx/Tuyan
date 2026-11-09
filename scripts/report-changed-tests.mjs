// R22 review coverage. Frozen inventory/content hashes run everywhere; full-history checks also recompute Git diffs.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { changedTestHash } from './lib/changed-test-hash.mjs'
import { hasCommit, requireHistory } from './lib/git-history.mjs'

const root = fileURLToPath(new URL('../', import.meta.url)), base = '8c456709'
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
const manifestArg = process.argv.indexOf('--manifest')
const manifestPath = manifestArg < 0 ? path.join(root, 'docs/model-modality-changed-tests.json') : process.argv[manifestArg + 1]
const review = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const check = process.argv.includes('--check')
const inventoryPath = path.join(root, 'test-support/fixtures/changed-tests-inventory.json')
const commits = [...new Set([base, ...(review.followupChanges || []).map(row => row.comparisonBase)])]
if (!check) requireHistory(root, commits)
const historyAvailable = commits.every(commit => hasCommit(root, commit))
const hash = text => createHash('sha256').update(text).digest('hex')
const frozen = check ? JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) : null
let inventory = frozen
if (historyAvailable) {
  const original = new Set(git(['ls-tree', '-r', '--name-only', base]).trim().split('\n'))
  const changed = paths => git(['diff', '--no-renames', '--name-only', base, '--', ...paths]).trim().split('\n').filter(file => file && original.has(file))
  const files = changed(['*test*', '*tests*']).sort()
  const testSources = [...original].filter(file => /test/.test(file) && /\.[cm]?[jt]s$/.test(file) && fs.existsSync(path.join(root, file)))
  const fixtures = changed(['*.json']).filter(file => !files.includes(file) &&
    testSources.some(test => fs.readFileSync(path.join(root, test), 'utf8').includes(path.basename(file)))).sort()
  const capture = (file, comparisonBase = base) => ({ file, comparisonBase,
    contentSha256: hash(fs.readFileSync(path.join(root, file))),
    diffSha256: changedTestHash(git(['show', comparisonBase + ':' + file]), fs.readFileSync(path.join(root, file))),
  })
  inventory = { base, files: files.map(file => capture(file)), fixtures: fixtures.map(file => capture(file)),
    followupChanges: (review.followupChanges || []).map(file => capture(file.file, file.comparisonBase)) }
}
const files = inventory.files.map(entry => entry.file)
const consumedFixtures = inventory.fixtures.map(entry => entry.file)
assert.equal(inventory.base, base)
const verifyFile = (file, entries) => {
  const captured = entries.find(entry => entry.file === file.file)
  assert.ok(captured, 'File missing from frozen review inventory: ' + file.file)
  assert.equal(file.diffSha256, captured.diffSha256, 'Review is stale: ' + file.file)
  assert.equal(hash(fs.readFileSync(path.join(root, file.file))), captured.contentSha256, 'Reviewed file content drift: ' + file.file)
}
assert.equal(review.base, base)
assert.deepEqual(review.files.map(entry => entry.file).sort(), files, 'Changed pre-existing test file missing from review (or stale entry)')
assert.deepEqual(review.fixtures.map(entry => entry.file).sort(), consumedFixtures, 'Changed consumed JSON fixture missing from review')
for (const file of [...review.files, ...review.fixtures]) {
  verifyFile(file, [...inventory.files, ...inventory.fixtures])
  assert.ok(file.changes.length, 'No assertion/fixture review: ' + file.file)
  for (const row of file.changes) {
    assert.ok(Number.isInteger(row.line) && row.line > 0 && Object.hasOwn(row, 'old') && Object.hasOwn(row, 'new'), file.file)
    assert.ok(row.reason && row.evidence.length && ['JUSTIFIED', 'UNJUSTIFIED', 'FLAGGED'].includes(row.verdict), file.file)
    assert.ok(row.verdict !== 'UNJUSTIFIED' || row.resolution === 'RESTORED', 'Unjustified assertion must be restored: ' + file.file)
    for (const evidence of row.evidence) assert.ok(fs.existsSync(path.join(root, evidence.split('#')[0])), evidence)
  }
}
// Follow-up review also covers expectations introduced on this feature branch.
for (const file of review.followupChanges || []) {
  assert.ok(['2550c736', '42ee9ffd', '1dcd8b13', 'fd29cf36'].includes(file.comparisonBase))
  verifyFile(file, inventory.followupChanges)
  assert.ok(file.changes.length)
  for (const row of file.changes) {
    assert.ok(row.old && row.new && row.reason && row.verdict === 'JUSTIFIED')
    for (const evidence of row.evidence) assert.ok(fs.existsSync(path.join(root, evidence.split('#')[0])))
  }
}
assert.deepEqual((review.followupChanges || []).map(file => file.file), inventory.followupChanges.map(file => file.file), 'Follow-up review inventory drift')
if (check && historyAvailable) assert.deepEqual(inventory, frozen, 'Frozen review inventory drift; regenerate with full history')
const changes = review.files.flatMap(file => file.changes)
const fixtureChanges = review.fixtures.flatMap(file => file.changes)
const counts = { files: files.length, assertionAndFixtureInputChanges: changes.length, consumedJsonFixtures: consumedFixtures.length,
  semanticFixtureChanges: fixtureChanges.length, justified: [...changes, ...fixtureChanges].filter(row => row.verdict === 'JUSTIFIED').length,
  unjustifiedRestored: [...changes, ...fixtureChanges].filter(row => row.verdict === 'UNJUSTIFIED').length,
  flagged: [...changes, ...fixtureChanges].filter(row => row.verdict === 'FLAGGED').length }
assert.deepEqual(review.counts, counts, 'Review counts are stale')
const cell = value => (typeof value === 'string' ? value : JSON.stringify(value)).replaceAll('|', '&#124;').replaceAll('\n', '<br>').replaceAll('`', '&#96;')
const table = entries => ['| File:line | Old expectation → new expectation | Reason and evidence | Verdict |', '| --- | --- | --- | --- |',
  ...entries.flatMap(file => file.changes.map(row => `| [${file.file}:${row.line}](../${file.file}#L${row.line})${row.oldLine ? ` (${row.comparisonBase || 'main'}:${row.oldLine})` : ''} | ${cell(row.old)} → ${cell(row.new)} | ${row.phase ? cell(row.phase) + '. ' : ''}${row.supersededBy ? 'Historical transition, superseded by ' + cell(row.supersededBy) + '. ' : ''}${cell(row.reason)} ${row.evidence.map(e => `[${e}](../${e})`).join('; ')} | ${row.verdict}${row.resolution ? ' / ' + row.resolution : ''} |`))].join('\n')
const markdown = [
  '# Changed test expectations — R22 and R23 Phases E/F/F3', '',
  `Baseline: \`${base}\`. This inventory covers every changed pre-existing test file from \`git diff ${base} -- '*test*' '*tests*'\`, plus changed JSON fixtures directly consumed by those tests. New test files are not pre-existing expectations.`, '',
  `Counts: **${counts.files} test files**, **${counts.assertionAndFixtureInputChanges} assertion or test-input changes**, **${counts.consumedJsonFixtures} consumed JSON fixtures**, **${counts.semanticFixtureChanges} semantic fixture changes**; **${counts.justified} JUSTIFIED**, **${counts.unjustifiedRestored} UNJUSTIFIED / RESTORED**, **${counts.flagged} FLAGGED**.`, '',
  ...review.notes.flatMap(note => [note, '']),
  '## Assertions and test inputs', '', table(review.files), '',
  '## Follow-up expectations introduced after main', '', table(review.followupChanges || []), '',
  '## Consumed JSON fixture changes', '',
  'The generated audit fixture interns values and URLs. The table resolves those indices to exact per-model expectations; unused pool entries and index renumbering are storage changes, not additional assertions. JSON pointers identify individual values in the machine-readable report. No pre-existing tests/fixtures JSON file changed.', '', table(review.fixtures), '',
  '## Verification', '',
  '`node scripts/report-changed-tests.mjs --check` independently recomputes the changed pre-existing file list, checks directly consumed JSON fixtures, checks every old/new blob-content hash (independent of Git diff formatting and core.abbrev) and review count, and verifies this Markdown matches the JSON. A negative test removes a reviewed file and requires the guard to fail.', '',
].join('\n')
const output = path.join(root, 'docs/model-modality-changed-tests.md')
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(output, 'utf8'), markdown, 'Changed-test Markdown drift')
else {
  fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2) + '\n')
  fs.writeFileSync(output, markdown)
}
if (!historyAvailable) console.log('SKIP report-changed-tests.mjs Git diff verification: historical commit(s) unavailable (shallow checkout or no Git history); frozen inventory, file hashes, review assertions/counts and Markdown verified.')
console.log(JSON.stringify(counts))
