import { constants as fsConstants } from 'node:fs'
import { createHash } from 'node:crypto'
import { open, lstat, unlink, type FileHandle } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertBoundedScientificV2PlainData } from './scientific-v2-common.js'
import { SCIENTIFIC_V2_PRODUCTION_LOCK_NAME } from './scientific-v2-manifest.js'
import { executeScientificV2OperatorBundle, type ScientificV2OperatorBundle } from './scientific-v2-operator-runtime.js'

const MIB = 1024 * 1024
const MAX_BUNDLE_BYTES = 64 * MIB
const MAX_ARTIFACT_BYTES = 25 * MIB
const MAX_ARTIFACT_AGGREGATE_BYTES = 40 * MIB
const MAX_PRIVATE_OUTPUT_BYTES = 64 * MIB
const READ_CHUNK_BYTES = MIB

function safeError(error: unknown) {
  const message = String((error as Error)?.message || error)
  return /^SCIENTIFIC_V2_[A-Z0-9_]+$/.test(message) ? message : 'SCIENTIFIC_V2_OPERATOR_FAILED'
}

function currentUid() {
  if (typeof process.getuid !== 'function') throw new Error('SCIENTIFIC_V2_OPERATOR_PLATFORM_UNSUPPORTED')
  return process.getuid()
}

function currentGid() {
  if (typeof process.getgid !== 'function') throw new Error('SCIENTIFIC_V2_OPERATOR_PLATFORM_UNSUPPORTED')
  return process.getgid()
}

async function assertControlledSpool(spoolDir: string) {
  if (!spoolDir) throw new Error('SCIENTIFIC_V2_OPERATOR_SPOOL_DIR_REQUIRED')
  if (!isAbsolute(spoolDir) || resolve(spoolDir) !== spoolDir) throw new Error('SCIENTIFIC_V2_OPERATOR_SPOOL_DIR_INVALID')
  try {
    const stat = await lstat(spoolDir)
    const mode = stat.mode & 0o7777
    const serviceOwned = stat.uid === currentUid() && mode === 0o700
    const rootOwnedReadOnly = stat.uid === 0 && (mode & 0o022) === 0
      && ((stat.gid === currentGid() && (mode & 0o050) === 0o050) || (mode & 0o005) === 0o005)
    if (!stat.isDirectory() || stat.isSymbolicLink() || (!serviceOwned && !rootOwnedReadOnly)) {
      throw new Error('SCIENTIFIC_V2_OPERATOR_SPOOL_DIR_INVALID')
    }
  } catch (error) {
    if ((error as Error)?.message === 'SCIENTIFIC_V2_OPERATOR_SPOOL_DIR_INVALID') throw error
    throw new Error('SCIENTIFIC_V2_OPERATOR_SPOOL_DIR_INVALID')
  }
}

function assertDirectSpoolPath(path: string, spoolDir: string, errorCode: string) {
  if (!path || !isAbsolute(path) || resolve(path) !== path || dirname(path) !== spoolDir) throw new Error(errorCode)
}

async function readBounded(handle: FileHandle, expectedSize: number) {
  const chunks: Buffer[] = []
  let total = 0
  while (total <= MAX_BUNDLE_BYTES) {
    const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, MAX_BUNDLE_BYTES + 1 - total))
    const { bytesRead } = await handle.read(chunk, 0, chunk.length, null)
    if (bytesRead === 0) break
    chunks.push(chunk.subarray(0, bytesRead))
    total += bytesRead
  }
  if (total !== expectedSize || total > MAX_BUNDLE_BYTES) throw new Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID')
  return Buffer.concat(chunks, total)
}

function decodedBase64Length(value: string) {
  const maximumEncodedLength = Math.ceil(MAX_ARTIFACT_BYTES / 3) * 4
  if (value.length > maximumEncodedLength) throw new Error('SCIENTIFIC_V2_OPERATOR_ARTIFACT_TOO_LARGE')
  if (value.length === 0 || value.length % 4 !== 0) throw new Error('SCIENTIFIC_V2_OPERATOR_BASE64_INVALID')
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const dataLength = value.length - padding
  if ((padding === 1 && dataLength % 4 !== 3) || (padding === 2 && dataLength % 4 !== 2)) {
    throw new Error('SCIENTIFIC_V2_OPERATOR_BASE64_INVALID')
  }
  for (let index = 0; index < dataLength; index += 1) {
    const code = value.charCodeAt(index)
    if (!((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57)
      || code === 43 || code === 47)) throw new Error('SCIENTIFIC_V2_OPERATOR_BASE64_INVALID')
  }
  return (value.length / 4) * 3 - padding
}

function decodeImportBytes(bundle: Record<string, unknown>) {
  if (bundle.operation !== 'import_codex' || !bundle.input || typeof bundle.input !== 'object') return bundle
  const input = bundle.input as Record<string, unknown>
  if (!Array.isArray(input.toolCalls)) return bundle
  let aggregateBytes = 0
  for (const value of input.toolCalls) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const call = value as Record<string, unknown>
    if (!Object.hasOwn(call, 'bytesBase64') || call.bytesBase64 === null) continue
    const { bytesBase64 } = call
    if (typeof bytesBase64 !== 'string') throw new Error('SCIENTIFIC_V2_OPERATOR_BASE64_INVALID')
    const decodedLength = decodedBase64Length(bytesBase64)
    if (decodedLength > MAX_ARTIFACT_BYTES) throw new Error('SCIENTIFIC_V2_OPERATOR_ARTIFACT_TOO_LARGE')
    aggregateBytes += decodedLength
    if (aggregateBytes > MAX_ARTIFACT_AGGREGATE_BYTES) throw new Error('SCIENTIFIC_V2_OPERATOR_ARTIFACT_AGGREGATE_TOO_LARGE')
  }
  input.toolCalls = input.toolCalls.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value
    const call = value as Record<string, unknown>
    if (!Object.hasOwn(call, 'bytesBase64')) return value
    const { bytesBase64, ...rest } = call
    if (bytesBase64 === null) return { ...rest, bytes: null }
    if (typeof bytesBase64 !== 'string') throw new Error('SCIENTIFIC_V2_OPERATOR_BASE64_INVALID')
    const decodedLength = decodedBase64Length(bytesBase64)
    const bytes = Buffer.from(bytesBase64, 'base64')
    if (bytes.length !== decodedLength || bytes.toString('base64') !== bytesBase64) throw new Error('SCIENTIFIC_V2_OPERATOR_BASE64_INVALID')
    return { ...rest, bytes }
  })
  return bundle
}

export async function readScientificV2OperatorBundle(path: string, spoolDir: string, expectedSha256: string) {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_HASH_INVALID')
  await assertControlledSpool(spoolDir)
  assertDirectSpoolPath(path, spoolDir, 'SCIENTIFIC_V2_OPERATOR_BUNDLE_PATH_INVALID')
  let handle: FileHandle
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW)
  } catch {
    throw new Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID')
  }
  try {
    const stat = await handle.stat()
    const mode = stat.mode & 0o7777
    const serviceOwned = stat.uid === currentUid() && mode === 0o600
    const rootOwnedReadOnly = stat.uid === 0 && stat.gid === currentGid() && (mode === 0o440 || mode === 0o640)
    if (!stat.isFile() || stat.nlink !== 1 || (!serviceOwned && !rootOwnedReadOnly)
      || stat.size < 2 || stat.size > MAX_BUNDLE_BYTES) {
      throw new Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_FILE_INVALID')
    }
    const source = await readBounded(handle, stat.size)
    if (createHash('sha256').update(source).digest('hex') !== expectedSha256) {
      throw new Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_HASH_MISMATCH')
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(source.toString('utf8'))
    } catch {
      throw new Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_INVALID')
    return decodeImportBytes(parsed as Record<string, unknown>) as unknown as ScientificV2OperatorBundle
  } finally {
    await handle.close()
  }
}

export async function writeScientificV2PrivateOutput(path: string, spoolDir: string, value: unknown) {
  await assertControlledSpool(spoolDir)
  assertDirectSpoolPath(path, spoolDir, 'SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_PATH_INVALID')
  assertBoundedScientificV2PlainData(value, { maxDepth: 14, maxNodes: 120_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_INVALID')
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`)
  if (bytes.length > MAX_PRIVATE_OUTPUT_BYTES) throw new Error('SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_TOO_LARGE')
  let handle: FileHandle
  try {
    handle = await open(path, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW, 0o600)
  } catch {
    throw new Error('SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_CREATE_FAILED')
  }
  let complete = false
  try {
    await handle.chmod(0o600)
    const stat = await handle.stat()
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== currentUid() || (stat.mode & 0o7777) !== 0o600) {
      throw new Error('SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_CREATE_FAILED')
    }
    let offset = 0
    while (offset < bytes.length) {
      const { bytesWritten } = await handle.write(bytes, offset, bytes.length - offset, null)
      if (bytesWritten < 1) throw new Error('SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_CREATE_FAILED')
      offset += bytesWritten
    }
    await handle.sync()
    complete = true
  } finally {
    await handle.close()
    if (!complete) await unlink(path).catch(() => undefined)
  }
}

async function main() {
  const path = String(process.env.PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH || '').trim()
  if (!path) throw new Error('SCIENTIFIC_V2_OPERATOR_BUNDLE_PATH_REQUIRED')
  const spoolDir = String(process.env.PAPERBANANA_SCIENTIFIC_V2_SPOOL_DIR || '').trim()
  const expectedSha256 = String(process.env.PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256 || '').trim()
  const bundle = await readScientificV2OperatorBundle(path, spoolDir, expectedSha256)
  const result = await executeScientificV2OperatorBundle(bundle)
  if (bundle.operation === 'review_pack') {
    const privateOutputPath = String(process.env.PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_PATH || '').trim()
    if (!privateOutputPath) throw new Error('SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_PATH_REQUIRED')
    const privateOutputDir = String(process.env.PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_DIR || '').trim()
    if (!privateOutputDir) throw new Error('SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_DIR_REQUIRED')
    if (!result.privateBundle || typeof result.privateBundle !== 'object') throw new Error('SCIENTIFIC_V2_OPERATOR_PRIVATE_OUTPUT_INVALID')
    await writeScientificV2PrivateOutput(privateOutputPath, privateOutputDir, result.privateBundle)
    const { privateBundle: _privateBundle, ...publicResult } = result
    process.stdout.write(`${JSON.stringify({ ...publicResult, privateOutputWritten: true, lockName: SCIENTIFIC_V2_PRODUCTION_LOCK_NAME })}\n`)
    return
  }
  if (bundle.operation === 'import_codex' || bundle.operation === 'run') {
    process.stdout.write(`${JSON.stringify(result)}\n`)
    return
  }
  process.stdout.write(`${JSON.stringify({ ...result, lockName: SCIENTIFIC_V2_PRODUCTION_LOCK_NAME })}\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void main().catch((error) => {
    process.stderr.write(`${safeError(error)}\n`)
    process.exitCode = 1
  })
}
