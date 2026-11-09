// R22 review coverage. Git is used only for diff/show/ls-tree reads.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url)), base = '8c456709'
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
const original = new Set(git(['ls-tree', '-r', '--name-only', base]).trim().split('\n'))
const changed = paths => git(['diff', '--no-renames', '--name-only', base, '--', ...paths]).trim().split('\n').filter(file => file && original.has(file))
const files = changed(['*test*', '*tests*']).sort()
const testSources = [...original].filter(file => /test/.test(file) && /\.[cm]?[jt]s$/.test(file) && fs.existsSync(path.join(root, file)))
const consumedFixtures = changed(['*.json']).filter(file => !files.includes(file) &&
  testSources.some(test => fs.readFileSync(path.join(root, test), 'utf8').includes(path.basename(file)))).sort()
const manifestArg = process.argv.indexOf('--manifest')
const manifestPath = manifestArg < 0 ? path.join(root, 'docs/model-modality-changed-tests.json') : process.argv[manifestArg + 1]
const review = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.equal(review.base, base)
assert.deepEqual(review.files.map(entry => entry.file).sort(), files, 'Changed pre-existing test file missing from review (or stale entry)')
assert.deepEqual(review.fixtures.map(entry => entry.file).sort(), consumedFixtures, 'Changed consumed JSON fixture missing from review')
for (const file of [...review.files, ...review.fixtures]) {
  const diff = git(['diff', '--no-ext-diff', '--no-renames', '--unified=0', base, '--', file.file])
  assert.equal(file.diffSha256, createHash('sha256').update(diff).digest('hex'), 'Review is stale: ' + file.file)
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
  assert.equal(file.comparisonBase, '2550c736')
  const diff = git(['diff', '--no-ext-diff', '--no-renames', '--unified=0', file.comparisonBase, '--', file.file])
  assert.equal(file.diffSha256, createHash('sha256').update(diff).digest('hex'), 'Follow-up review is stale: ' + file.file)
  assert.ok(file.changes.length)
  for (const row of file.changes) {
    assert.ok(row.old && row.new && row.reason && row.verdict === 'JUSTIFIED')
    for (const evidence of row.evidence) assert.ok(fs.existsSync(path.join(root, evidence.split('#')[0])))
  }
}
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
  '# Changed test expectations — R22 Phases A, B and C', '',
  `Baseline: \`${base}\`. This inventory covers every changed pre-existing test file from \`git diff ${base} -- '*test*' '*tests*'\`, plus changed JSON fixtures directly consumed by those tests. New test files are not pre-existing expectations.`, '',
  `Counts: **${counts.files} test files**, **${counts.assertionAndFixtureInputChanges} assertion or test-input changes**, **${counts.consumedJsonFixtures} consumed JSON fixtures**, **${counts.semanticFixtureChanges} semantic fixture changes**; **${counts.justified} JUSTIFIED**, **${counts.unjustifiedRestored} UNJUSTIFIED / RESTORED**, **${counts.flagged} FLAGGED**.`, '',
  ...review.notes.flatMap(note => [note, '']),
  '## Assertions and test inputs', '', table(review.files), '',
  '## Phase C follow-up expectations introduced after main', '', table(review.followupChanges || []), '',
  '## Consumed JSON fixture changes', '',
  'The generated audit fixture interns values and URLs. The table resolves those indices to exact per-model expectations; unused pool entries and index renumbering are storage changes, not additional assertions. JSON pointers identify individual values in the machine-readable report. No pre-existing tests/fixtures JSON file changed.', '', table(review.fixtures), '',
  '## Verification', '',
  '`node scripts/report-changed-tests.mjs --check` independently recomputes the changed pre-existing file list, checks directly consumed JSON fixtures, checks every diff hash and review count, and verifies this Markdown matches the JSON. A negative test removes a reviewed file and requires the guard to fail.', '',
].join('\n')
const output = path.join(root, 'docs/model-modality-changed-tests.md')
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(output, 'utf8'), markdown, 'Changed-test Markdown drift')
else fs.writeFileSync(output, markdown)
console.log(JSON.stringify(counts))
