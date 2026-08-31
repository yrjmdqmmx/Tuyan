import { canonicalHash, buildScientificV2CanonicalManifest } from '@paperbanana/benchmark-core'
import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import {
  assertScientificV2RootSnapshotFileFacts,
  persistScientificV2OfficialSignedPriceSnapshot,
} from './scientific-v2-price-attestation.js'
import type { ScientificV2OfficialPriceCapture, ScientificV2OfficialPriceRefreshReport } from './scientific-v2-price-refresh.js'

const MAX_JSON_BYTES = 32 * 1024 * 1024
function fail(): never { throw new Error('SCIENTIFIC_V2_PRICE_SIGNER_INPUT_INVALID') }

async function readRootFile(path: string, expectedSize?: number) {
  if (!isAbsolute(path) || resolve(path) !== path) fail()
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null)
  if (!handle) fail()
  try {
    const before = await handle.stat()
    assertScientificV2RootSnapshotFileFacts({ uid: before.uid, mode: before.mode, nlink: before.nlink, size: before.size, isFile: before.isFile() })
    if (before.size > MAX_JSON_BYTES || (expectedSize !== undefined && before.size !== expectedSize)) fail()
    const bytes = await handle.readFile()
    const after = await handle.stat()
    const pathFacts = await lstat(path)
    if (pathFacts.isSymbolicLink() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
      || before.dev !== pathFacts.dev || before.ino !== pathFacts.ino || bytes.length !== before.size) fail()
    return bytes
  } finally { await handle.close() }
}

async function readJson(path: string) {
  try { return JSON.parse((await readRootFile(path)).toString('utf8')) } catch { fail() }
}

export async function runScientificV2PriceSignerEntry(env: Record<string, string | undefined> = process.env) {
  if (process.argv.length !== 2 || process.getuid?.() !== 0) fail()
  const authorityPath = env.PAPERBANANA_SCIENTIFIC_V2_REGISTRY_AUTHORITY_PATH
  const reportPath = env.PAPERBANANA_SCIENTIFIC_V2_PRICE_REFRESH_REPORT_PATH
  const captureDirectory = env.PAPERBANANA_SCIENTIFIC_V2_PRICE_CAPTURE_DIR
  const operatorAuthorizationPath = env.PAPERBANANA_SCIENTIFIC_V2_OPERATOR_PRICE_AUTHORIZATION_PATH
  const outputDirectory = env.PAPERBANANA_SCIENTIFIC_V2_PRICE_OUTPUT_DIR
  const codeSha = env.PAPERBANANA_CODE_SHA
  const secret = env.PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET
  if (!authorityPath || !reportPath || !captureDirectory || !operatorAuthorizationPath || !outputDirectory || !codeSha || !secret
    || !/^[a-f0-9]{40}$/.test(codeSha) || !isAbsolute(captureDirectory) || resolve(captureDirectory) !== captureDirectory) fail()
  const captureRoot = await lstat(captureDirectory).catch(() => null)
  if (!captureRoot?.isDirectory() || captureRoot.isSymbolicLink() || captureRoot.uid !== 0 || (captureRoot.mode & 0o777) !== 0o700) fail()
  const registryAuthority = await readJson(authorityPath)
  const refreshReport = await readJson(reportPath) as ScientificV2OfficialPriceRefreshReport
  const operatorAuthorization = await readJson(operatorAuthorizationPath)
  const registry = registryAuthority?.registry
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) fail()
  const canonicalManifest = buildScientificV2CanonicalManifest({ registryVersion: registryAuthority.registryVersion, registryHash: canonicalHash(registry), registry })
  return persistScientificV2OfficialSignedPriceSnapshot({
    canonicalManifest, registryAuthority, refreshReport, operatorAuthorization, codeSha, secret, outputDirectory,
    async loadCaptureBytes(capture: ScientificV2OfficialPriceCapture) {
      if (!/^[a-f0-9]{64}$/.test(capture.bytesSha256) || !Number.isSafeInteger(capture.byteSize) || capture.byteSize < 1) fail()
      return readRootFile(join(captureDirectory, `${capture.bytesSha256}.raw`), capture.byteSize)
    },
  })
}

void runScientificV2PriceSignerEntry().then((result) => {
  process.stdout.write(JSON.stringify(result))
}).catch(() => {
  process.stderr.write('SCIENTIFIC_V2_PRICE_SIGNER_FAILED\n')
  process.exitCode = 1
})
