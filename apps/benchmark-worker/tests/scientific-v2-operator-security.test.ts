import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmodSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  readScientificV2OperatorBundle,
  writeScientificV2PrivateOutput,
} from '../src/scientific-v2-operator.js'

const MIB = 1024 * 1024
const LOCK_NAME = '/run/lock/paperbanana-hk-production.lock'

function importBundle(bytesBase64: string | string[]) {
  const encoded = Array.isArray(bytesBase64) ? bytesBase64 : [bytesBase64]
  return {
    operation: 'import_codex',
    gate: { enabled: false, concurrency: 1, lockName: LOCK_NAME },
    input: { toolCalls: encoded.map((value) => ({ bytesBase64: value })) },
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
    const path = writeBundle(root, 'bundle.json', importBundle('YQ=='))
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
    const valid = writeBundle(root, 'valid.json', importBundle('YQ=='))
    await assert.doesNotReject(readBundle(valid, root))

    await assert.rejects(readScientificV2OperatorBundle('valid.json', root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_PATH_INVALID/)
    await assert.rejects(readScientificV2OperatorBundle(valid, '', 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_SPOOL_DIR_REQUIRED/)
    await assert.rejects(
      readScientificV2OperatorBundle(writeBundle(outside, 'outside.json', importBundle('YQ==')), root, 'a'.repeat(64)),
      /SCIENTIFIC_V2_OPERATOR_BUNDLE_PATH_INVALID/,
    )

    const nested = join(root, 'nested')
    mkdirSync(nested, { mode: 0o700 })
    await assert.rejects(
      readScientificV2OperatorBundle(writeBundle(nested, 'nested.json', importBundle('YQ==')), root, 'a'.repeat(64)),
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
    const target = writeBundle(root, 'target.json', importBundle('YQ=='))
    const link = join(root, 'link.json')
    symlinkSync(target, link)
    await assert.rejects(readScientificV2OperatorBundle(link, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)

    const hardLink = join(root, 'hard-link.json')
    linkSync(target, hardLink)
    await assert.rejects(readScientificV2OperatorBundle(hardLink, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)

    const permissive = writeBundle(root, 'permissive.json', importBundle('YQ=='))
    chmodSync(permissive, 0o640)
    await assert.rejects(readScientificV2OperatorBundle(permissive, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)

    const privileged = writeBundle(root, 'privileged.json', importBundle('YQ=='))
    chmodSync(privileged, 0o4600)
    await assert.rejects(readScientificV2OperatorBundle(privileged, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)

    const directory = join(root, 'directory.json')
    mkdirSync(directory, { mode: 0o700 })
    await assert.rejects(readScientificV2OperatorBundle(directory, root, 'a'.repeat(64)), /SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('operator validates canonical base64 and decoded caps before constructing artifact buffers', async () => {
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-base64-'))
  try {
    for (const [name, encoded] of [
      ['unpadded', 'YQ'],
      ['extra-padding', 'YQ==='],
      ['whitespace', 'YQ==\n'],
      ['invalid-alphabet', 'YQ*='],
    ] as const) {
      const path = writeBundle(root, `${name}.json`, importBundle(encoded))
      await assert.rejects(readBundle(path, root), /SCIENTIFIC_V2_OPERATOR_BASE64_INVALID/)
    }

    const tooLarge = Buffer.alloc(25 * MIB + 1).toString('base64')
    const perArtifact = writeBundle(root, 'too-large.json', importBundle(tooLarge))
    await assert.rejects(readBundle(perArtifact, root), /SCIENTIFIC_V2_OPERATOR_ARTIFACT_TOO_LARGE/)

    const aggregatePart = Buffer.alloc(21 * MIB).toString('base64')
    const aggregate = writeBundle(root, 'aggregate.json', importBundle([aggregatePart, aggregatePart]))
    await assert.rejects(readBundle(aggregate, root), /SCIENTIFIC_V2_OPERATOR_ARTIFACT_AGGREGATE_TOO_LARGE/)
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
