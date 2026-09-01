import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmodSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  classifyScientificV2OperatorError,
  readScientificV2OperatorBundle,
  writeScientificV2PrivateOutput,
} from '../src/scientific-v2-operator.js'

const LOCK_NAME = '/run/lock/paperbanana-hk-production.lock'

test('operator exposes only bounded machine error classes for zero-provider production diagnosis', () => {
  assert.equal(classifyScientificV2OperatorError(new Error('SCIENTIFIC_V2_PUBLIC_RENDER_STATE_INVALID')), 'SCIENTIFIC_V2_PUBLIC_RENDER_STATE_INVALID')
  assert.equal(classifyScientificV2OperatorError(Object.assign(new Error('private object path omitted'), { code: 'NoSuchKey' })), 'SCIENTIFIC_V2_OPERATOR_RUNTIME_NO_SUCH_KEY')
  assert.equal(classifyScientificV2OperatorError(Object.assign(new Error('details omitted'), { name: 'MongoServerSelectionError' })), 'SCIENTIFIC_V2_OPERATOR_RUNTIME_MONGO_SERVER_SELECTION_ERROR')
  assert.equal(classifyScientificV2OperatorError(Object.assign(new Error('details omitted'), { code: 'unsafe key with spaces and punctuation!' })), 'SCIENTIFIC_V2_OPERATOR_FAILED')
})

function importBundle(toolCalls: unknown[] = []) {
  return {
    operation: 'import_codex',
    gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    input: { toolCalls },
  }
}

function writeBundle(root: string, name: string, value: unknown, mode = 0o600) {
  const path = join(root, name)
  writeFileSync(path, JSON.stringify(value), { mode })
  return path
}

function readBundle(path: string, root: string) {
  const expected = createHash('sha256').update(readFileSync(path)).digest('hex')
  return readScientificV2OperatorBundle(path, root, expected)
}

test('operator hashes the bytes read from its open bundle handle against the wrapper binding', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-bundle-hash-'))
  try {
    const path = writeBundle(root, 'bundle.json', importBundle())
    const expected = createHash('sha256').update(readFileSync(path)).digest('hex')
    await assert.doesNotReject(readScientificV2OperatorBundle(path, root, expected))
    await assert.rejects(
      readScientificV2OperatorBundle(path, root, 'f'.repeat(64)),
      /SCIENTIFIC_V2_OPERATOR_BUNDLE_HASH_MISMATCH/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('operator bundle reader fails closed unless the absolute path is directly inside the exact controlled spool', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-secure-spool-'))
  const outside = mkdtempSync(join(tmpdir(), 'scientific-v2-outside-'))
  try {
    const valid = writeBundle(root, 'valid.json', importBundle())
    await assert.doesNotReject(readBundle(valid, root))

    await assert.rejects(readScientificV2OperatorBundle('valid.json', root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_PATH_INVALID/)
    await assert.rejects(readScientificV2OperatorBundle(valid, '', 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_SPOOL_DIR_REQUIRED/)
    await assert.rejects(
      readScientificV2OperatorBundle(writeBundle(outside, 'outside.json', importBundle()), root, 'a'.repeat(64)),
      /SCIENTIFIC_V2_OPERATOR_BUNDLE_PATH_INVALID/,
    )

    const nested = join(root, 'nested')
    mkdirSync(nested, { mode: 0o700 })
    await assert.rejects(
      readScientificV2OperatorBundle(writeBundle(nested, 'nested.json', importBundle()), root, 'a'.repeat(64)),
      /SCIENTIFIC_V2_OPERATOR_BUNDLE_PATH_INVALID/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(outside, { recursive: true, force: true })
  }
})

test('operator bundle reader rejects symlinks and requires a current-user regular 0600 file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-secure-file-'))
  try {
    const target = writeBundle(root, 'target.json', importBundle())
    const link = join(root, 'link.json')
    symlinkSync(target, link)
    await assert.rejects(readScientificV2OperatorBundle(link, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)

    const hardLink = join(root, 'hard-link.json')
    linkSync(target, hardLink)
    await assert.rejects(readScientificV2OperatorBundle(hardLink, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)

    const permissive = writeBundle(root, 'permissive.json', importBundle())
    chmodSync(permissive, 0o640)
    await assert.rejects(readScientificV2OperatorBundle(permissive, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)

    const privileged = writeBundle(root, 'privileged.json', importBundle())
    chmodSync(privileged, 0o4600)
    await assert.rejects(readScientificV2OperatorBundle(privileged, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)

    const directory = join(root, 'directory.json')
    mkdirSync(directory, { mode: 0o700 })
    await assert.rejects(readScientificV2OperatorBundle(directory, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('operator rejects legacy inline base64 instead of moving protected image bytes through the bundle', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-base64-forbidden-'))
  try {
    const path = writeBundle(root, 'legacy-inline.json', importBundle([{ bytesBase64: 'YQ==' }]))
    await assert.rejects(readBundle(path, root), /SCIENTIFIC_V2_OPERATOR_BASE64_FORBIDDEN/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('private output sink exclusively creates a 0600 file directly inside the controlled spool', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-private-output-'))
  const outside = mkdtempSync(join(tmpdir(), 'scientific-v2-private-outside-'))
  try {
    const output = join(root, 'review.private.json')
    await writeScientificV2PrivateOutput(output, root, { privateEnvelope: { mapping: 'secret' } })
    assert.equal(lstatSync(output).mode & 0o777, 0o600)
    assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')), { privateEnvelope: { mapping: 'secret' } })

    await assert.rejects(
      writeScientificV2PrivateOutput(output, root, { privateEnvelope: { mapping: 'overwritten' } }),
      /SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_CREATE_FAILED/,
    )
    assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')), { privateEnvelope: { mapping: 'secret' } })
    await assert.rejects(
      writeScientificV2PrivateOutput(join(outside, 'escaped.json'), root, { privateEnvelope: {} }),
      /SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_PATH_INVALID/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(outside, { recursive: true, force: true })
  }
})

test('private output validation rejects accessors before JSON serialization can invoke them', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-private-descriptor-'))
  try {
    let getterCalls = 0
    const malicious = {}
    Object.defineProperty(malicious, 'privateEnvelope', { enumerable: true, get() { getterCalls += 1; return { leaked: true } } })
    await assert.rejects(
      writeScientificV2PrivateOutput(join(root, 'malicious.json'), root, malicious),
      /SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_INVALID/,
    )
    assert.equal(getterCalls, 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
