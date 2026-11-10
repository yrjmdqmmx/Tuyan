import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { archivedText } from '../test-support/frozen-sources.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
function withoutGit(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r22-no-history-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const log = path.join(dir, 'git-calls')
  fs.writeFileSync(path.join(dir, 'git'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$R22_GIT_LOG"\nexit 1\n', { mode: 0o755 })
  return { dir, log, cwd: root, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, PATH: dir + path.delimiter + process.env.PATH, R22_GIT_LOG: log } }
}

test('frozen historical sources retain every indexed byte and reject uncaptured revisions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'test-support/archive/manifest.json')))
  const sources = JSON.parse(gunzipSync(fs.readFileSync(path.join(root, 'test-support/archive/model-card-sources.json.gz'))))
  assert.deepEqual(Object.keys(sources), Object.keys(manifest))
  for (const [commit, files] of Object.entries(manifest)) {
    assert.deepEqual(Object.keys(sources[commit]), Object.keys(files))
    for (const [file, expected] of Object.entries(files)) {
      const text = archivedText(root, commit, file)
      assert.equal(Buffer.byteLength(text), expected.bytes, commit + ':' + file)
      assert.equal(createHash('sha256').update(text).digest('hex'), expected.sha256, commit + ':' + file)
    }
  }
  assert.throws(() => archivedText(root, 'uncaptured', 'missing.js'), /Missing frozen audit source/)
})

test('execution and historical card loaders work without invoking Git', t => {
  const options = withoutGit(t)
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { root, coreProducts, executionRegistry, readExecutionFixture } from './test-support/execution-capability.mjs';
    import { loadCard } from './scripts/lib/model-card-audit.mjs';
    const fixture = readExecutionFixture();
    assert.equal(fixture.counts.coreModels, 1064);
    assert.deepEqual(executionRegistry((await coreProducts()).registry), fixture.core);
    for (const commit of ['8c456709', 'd1fe6ff6']) {
      const card = await loadCard(root, commit);
      assert.ok(card('bailian', { id: 'kimi-k3' }).fields.inputModalities);
    }
  `], options)
  assert.equal(fs.existsSync(options.log), false, 'test loaders must not execute even a Git availability probe')
})

test('historical maintenance checks skip explicitly before reading unavailable commits', t => {
  const options = withoutGit(t)
  const commands = [
    ['freeze-audit-sources'], ['freeze-execution-capability'],
    ['report-model-card-r10', '--frozen-head'],
    ['report-model-card-r11', '--frozen-main', '--frozen-head'],
    ['report-model-card-r12', '--frozen-head'],
    ['report-model-modality-r21'], ['report-model-modality-phase2'], ['report-model-modality-r22b'],
    ['prepare-model-card-r12-fixtures'], ['report-changed-tests'],
  ]
  for (const [script, ...args] of commands) {
    const output = execFileSync(process.execPath, [`scripts/${script}.mjs`, '--check', ...args], options)
    assert.match(output, /SKIP .*historical commit\(s\) unavailable/, script)
  }
  assert.ok(fs.readFileSync(options.log, 'utf8').trim().split('\n').every(line => /^cat-file -e [a-f0-9]+\^\{commit\}$/.test(line)))
})

test('history-free ledger checks still reject tampered review hashes', t => {
  const options = withoutGit(t)
  const review = JSON.parse(fs.readFileSync(path.join(root, 'docs/model-modality-changed-tests.json')))
  review.files[0].diffSha256 = '0'.repeat(64)
  const manifest = path.join(options.dir, 'tampered.json')
  fs.writeFileSync(manifest, JSON.stringify(review))
  assert.throws(() => execFileSync(process.execPath, ['scripts/report-changed-tests.mjs', '--check', '--manifest', manifest], options),
    error => /Review is stale:/.test(String(error.stderr)))
})


test('R23 execution oracle is deterministic gzip and retains all 1064 baseline models', async () => {
  const { fixturePath, readExecutionFixture } = await import('../test-support/execution-capability.mjs')
  const { gzipSync } = await import('node:zlib')
  const bytes = fs.readFileSync(fixturePath), raw = gunzipSync(bytes)
  assert.equal(bytes.readUInt32LE(4), 0, 'gzip mtime')
  assert.equal(bytes[3], 0, 'no filename or optional headers')
  // Deflate byte choices may vary across zlib versions; content must not.
  assert.deepEqual(gunzipSync(gzipSync(raw, {level:9})), raw)
  assert.equal(fs.existsSync(fixturePath.replace(/\.gz$/, '')), false)
  const fixture = readExecutionFixture()
  assert.equal(fixture.commit, '8c456709')
  assert.equal(fixture.counts.staticModels, 1064)
  assert.equal(fixture.counts.coreModels, 1064)
})
