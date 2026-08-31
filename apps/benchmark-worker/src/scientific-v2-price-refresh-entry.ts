import { createHash, randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { chmod, lstat, mkdir, open, rename, rm } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import { buildScientificV2CanonicalManifest, canonicalHash } from '@paperbanana/benchmark-core'
import { refreshScientificV2OfficialPriceSourcesFromAuthority } from './scientific-v2-price-refresh.js'

const MAX_JSON_BYTES = 4 * 1024 * 1024
function fail(): never { throw new Error('SCIENTIFIC_V2_PRICE_REFRESH_ENTRY_INVALID') }

async function readProtectedJson(path: string) {
  if (!isAbsolute(path) || resolve(path) !== path) fail()
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null)
  if (!handle) fail()
  try {
    const before = await handle.stat()
    if (!before.isFile() || before.uid !== 0 || before.nlink !== 1 || (before.mode & 0o777) !== 0o600
      || before.size < 2 || before.size > MAX_JSON_BYTES) fail()
    const bytes = await handle.readFile()
    const after = await handle.stat()
    const pathFacts = await lstat(path)
    if (pathFacts.isSymbolicLink() || before.dev !== after.dev || before.ino !== after.ino
      || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
      || before.dev !== pathFacts.dev || before.ino !== pathFacts.ino || bytes.length !== before.size) fail()
    return { value: JSON.parse(bytes.toString('utf8')), bytes }
  } catch { fail() } finally { await handle.close() }
}

async function assertRootDirectory(path: string) {
  if (!isAbsolute(path) || resolve(path) !== path) fail()
  const facts = await lstat(path).catch(() => null)
  if (!facts?.isDirectory() || facts.isSymbolicLink() || facts.uid !== 0 || (facts.mode & 0o777) !== 0o700) fail()
}

async function writeExclusive(path: string, bytes: Uint8Array) {
  const handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
  let complete = false
  try {
    await handle.chmod(0o600)
    const facts = await handle.stat()
    if (!facts.isFile() || facts.uid !== 0 || facts.nlink !== 1 || (facts.mode & 0o777) !== 0o600) fail()
    await handle.writeFile(bytes)
    await handle.sync()
    complete = true
  } finally {
    await handle.close()
    if (!complete) await rm(path, { force: true })
  }
}

export async function runScientificV2PriceRefreshEntry(env: Record<string, string | undefined> = process.env) {
  if (process.argv.length !== 2 || process.getuid?.() !== 0) fail()
  const authorityPath = env.PAPERBANANA_SCIENTIFIC_V2_REGISTRY_AUTHORITY_PATH
  const captureRoot = env.PAPERBANANA_SCIENTIFIC_V2_PRICE_CAPTURE_ROOT
  const reportRoot = env.PAPERBANANA_SCIENTIFIC_V2_PRICE_REFRESH_REPORT_ROOT
  const codeSha = env.PAPERBANANA_CODE_SHA
  if (!authorityPath || !captureRoot || !reportRoot || !codeSha || !/^[a-f0-9]{40}$/.test(codeSha)) fail()
  await assertRootDirectory(captureRoot)
  await assertRootDirectory(reportRoot)
  const protectedAuthority = await readProtectedJson(authorityPath)
  const authority = protectedAuthority.value
  if (!authority?.registry || typeof authority.registry !== 'object' || Array.isArray(authority.registry)
    || authority.codeSha !== codeSha || canonicalHash({
      schemaVersion: authority.schemaVersion, codeSha: authority.codeSha, capturedAt: authority.capturedAt,
      registryVersion: authority.registryVersion, registryBytesHash: authority.registryBytesHash, registry: authority.registry,
    }) !== authority.snapshotHash) fail()
  const canonicalManifest = buildScientificV2CanonicalManifest({
    registryVersion: authority.registryVersion,
    registryHash: canonicalHash(authority.registry),
    registry: authority.registry,
  })
  const staging = join(captureRoot, `.staging-${process.pid}-${randomBytes(8).toString('hex')}`)
  await mkdir(staging, { mode: 0o700 })
  await chmod(staging, 0o700)
  try {
    const report = await refreshScientificV2OfficialPriceSourcesFromAuthority({
      canonicalManifest, registryAuthority: authority,
      async persistCapture(capture, bytes) {
        if (bytes.length !== capture.byteSize || createHash('sha256').update(bytes).digest('hex') !== capture.bytesSha256) fail()
        await writeExclusive(join(staging, `${capture.bytesSha256}.raw`), bytes)
      },
    })
    const reportBytes = Buffer.from(JSON.stringify(report))
    const reportFileSha256 = createHash('sha256').update(reportBytes).digest('hex')
    const captureDestination = join(captureRoot, reportFileSha256)
    const reportDestination = join(reportRoot, `${reportFileSha256}.json`)
    await rename(staging, captureDestination).catch(() => fail())
    await writeExclusive(reportDestination, reportBytes)
    return Object.freeze({
      authorityFileSha256: createHash('sha256').update(protectedAuthority.bytes).digest('hex'),
      refreshReportFileSha256: reportFileSha256,
      capturesHash: report.capturesHash,
      captureCount: report.captures.length,
      requirementsHash: report.requirementsHash,
      unresolvedCount: report.unresolved.length,
      resolved: report.resolved,
    })
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }
}

void runScientificV2PriceRefreshEntry().then((result) => {
  process.stdout.write(JSON.stringify(result))
}).catch(() => {
  process.stderr.write('SCIENTIFIC_V2_PRICE_REFRESH_FAILED\n')
  process.exitCode = 1
})
