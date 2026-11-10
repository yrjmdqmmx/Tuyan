import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('changed-test review rejects a missing pre-existing test file', () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r22-review-'))
  try {
    const review = JSON.parse(fs.readFileSync(path.join(root, 'docs/model-modality-changed-tests.json'), 'utf8'))
    review.files.pop()
    const file = path.join(dir, 'incomplete.json')
    fs.writeFileSync(file, JSON.stringify(review))
    assert.throws(() => execFileSync(process.execPath, ['scripts/report-changed-tests.mjs', '--check', '--manifest', file], { cwd: root, stdio: 'pipe' }),
      error => /Changed pre-existing test file missing from review/.test(String(error.stderr)))
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})


test('changed-test content hashes and ledger checks are stable at core.abbrev 7 and 12', async () => {
  const { changedTestHash } = await import('./lib/changed-test-hash.mjs')
  assert.notEqual(changedTestHash('a', 'bc'), changedTestHash('ab', 'c'))
  assert.notEqual(changedTestHash('before', 'after'), changedTestHash('before', 'tampered'))
  const root = fileURLToPath(new URL('../', import.meta.url))
  for (const abbreviation of ['7', '12']) {
    const output = execFileSync(process.execPath, ['scripts/report-changed-tests.mjs', '--check'], {
      cwd: root, encoding: 'utf8', stdio: 'pipe',
      env: {...process.env, GIT_CONFIG_COUNT:'1', GIT_CONFIG_KEY_0:'core.abbrev', GIT_CONFIG_VALUE_0:abbreviation},
    })
    assert.match(output, /"flagged":0/, abbreviation)
  }
})
