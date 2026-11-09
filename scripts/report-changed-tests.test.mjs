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
