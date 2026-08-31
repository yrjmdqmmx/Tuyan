import { createHash } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'

const hashPattern = /^[a-f0-9]{64}$/
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024

export interface ScientificV2ProtectedArtifactReference {
  schemaVersion: 1
  fileName: string
  sha256: string
  byteSize: number
  format: 'png' | 'jpeg' | 'webp'
}

function fail(code: string): never { throw new Error(code) }

export async function readScientificV2ProtectedArtifactReference(input: {
  root: string
  reference: ScientificV2ProtectedArtifactReference
}) {
  const { root, reference } = input
  if (!isAbsolute(root) || resolve(root) !== root || !reference || reference.schemaVersion !== 1
    || !hashPattern.test(reference.sha256) || !['png', 'jpeg', 'webp'].includes(reference.format)
    || !Number.isSafeInteger(reference.byteSize) || reference.byteSize < 1 || reference.byteSize > MAX_ARTIFACT_BYTES
    || reference.fileName !== `${reference.sha256}.${reference.format}`
    || basename(reference.fileName) !== reference.fileName) fail('SCIENTIFIC_V2_CODEX_ARTIFACT_REFERENCE_INVALID')
  const uid = typeof process.getuid === 'function' ? process.getuid() : -1
  const gid = typeof process.getgid === 'function' ? process.getgid() : -1
  let rootBefore
  try { rootBefore = await lstat(root) } catch { fail('SCIENTIFIC_V2_CODEX_ARTIFACT_ROOT_INVALID') }
  const rootMode = rootBefore.mode & 0o7777
  const serviceOwnedRoot = rootBefore.uid === uid && rootBefore.gid === gid && rootMode === 0o700
  const protectedRoot = rootBefore.uid === 0 && rootBefore.gid === gid && rootMode === 0o550
  if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink() || (!serviceOwnedRoot && !protectedRoot)) {
    fail('SCIENTIFIC_V2_CODEX_ARTIFACT_ROOT_INVALID')
  }
  const path = join(root, reference.fileName)
  if (dirname(path) !== root || resolve(path) !== path) fail('SCIENTIFIC_V2_CODEX_ARTIFACT_REFERENCE_INVALID')
  let handle
  try { handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW) }
  catch { fail('SCIENTIFIC_V2_CODEX_ARTIFACT_FILE_INVALID') }
  try {
    const before = await handle.stat()
    const mode = before.mode & 0o7777
    const serviceOwned = before.uid === uid && mode === 0o600
    const rootOwnedReadOnly = before.uid === 0 && before.gid === gid && mode === 0o440
    if (!before.isFile() || before.nlink !== 1 || before.size !== reference.byteSize
      || (!serviceOwned && !rootOwnedReadOnly)) fail('SCIENTIFIC_V2_CODEX_ARTIFACT_FILE_INVALID')
    const bytes = Buffer.allocUnsafe(reference.byteSize)
    let offset = 0
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset)
      if (!bytesRead) break
      offset += bytesRead
    }
    const after = await handle.stat()
    const pathStat = await lstat(path)
    const rootAfter = await lstat(root)
    if (offset !== bytes.length || pathStat.isSymbolicLink()
      || rootAfter.isSymbolicLink() || rootBefore.dev !== rootAfter.dev || rootBefore.ino !== rootAfter.ino
      || rootBefore.mtimeMs !== rootAfter.mtimeMs || rootBefore.ctimeMs !== rootAfter.ctimeMs
      || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
      || before.dev !== pathStat.dev || before.ino !== pathStat.ino) fail('SCIENTIFIC_V2_CODEX_ARTIFACT_TOCTOU')
    if (createHash('sha256').update(bytes).digest('hex') !== reference.sha256) fail('SCIENTIFIC_V2_CODEX_ARTIFACT_HASH_MISMATCH')
    return bytes
  } finally { await handle.close() }
}
