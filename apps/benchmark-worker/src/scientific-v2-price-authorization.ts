import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import {
  SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY,
  buildScientificV2PriceSnapshot,
  canonicalHash,
  deriveScientificV2PriceRequirements,
  type ScientificV2PriceObservation,
  type ScientificV2PriceRequirement,
} from '@paperbanana/benchmark-core'

import { assertScientificV2RootSnapshotFileFacts, type ScientificV2OperatorPriceAuthorization } from './scientific-v2-price-attestation.js'
import { scientificV2Error } from './scientific-v2-common.js'
import { scientificV2ConservativeUnitCny } from './scientific-v2-price-policy.js'
import {
  extractScientificV2OfficialPriceObservations,
  type ScientificV2OfficialPriceCapture,
  type ScientificV2OfficialPriceRefreshReport,
} from './scientific-v2-price-refresh.js'

export { scientificV2ConservativeUnitCny } from './scientific-v2-price-policy.js'

function upperBoundObservation(requirement: ScientificV2PriceRequirement, unitCny: string, capturedAt: string, authorizationHash: string): ScientificV2PriceObservation {
  const output = requirement.imageSize === '1K'
    ? { outputWidth: 1280, outputHeight: 720 }
    : { outputWidth: 2048, outputHeight: 1152 }
  return {
    provider: requirement.provider, modelId: requirement.modelId, operation: requirement.operation,
    imageSize: requirement.imageSize, billingRegion: 'operator-authorized-upper-bound', ...output,
    charges: [{
      billable: 'output_image', unit: 'request', rateDecimal: unitCny, quantityDecimal: '1',
      resolutionTier: 'operator_authorized_conservative_upper_bound',
    }],
    source: {
      url: 'https://paperbanana.asia/benchmark/scientific-v2/operator-authorized-conservative-upper-bound',
      mediaType: 'application/json', capturedAt, bytesSha256: authorizationHash,
    },
    openRouterEvidence: null, fxEvidence: null,
  }
}

export async function buildScientificV2OperatorPriceAuthorization(input: {
  canonicalManifest: Parameters<typeof deriveScientificV2PriceRequirements>[0] & { manifestHash: string }
  refreshReport: ScientificV2OfficialPriceRefreshReport
  loadCaptureBytes(capture: ScientificV2OfficialPriceCapture): Promise<Uint8Array>
  codeSha: string
  confirmation: string
}) {
  if (!/^[a-f0-9]{40}$/.test(input.codeSha)
    || input.confirmation !== 'authorize-scientific-v2-conservative-upper-bound') {
    scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
  }
  const requirements = deriveScientificV2PriceRequirements(input.canonicalManifest)
  const extracted = await extractScientificV2OfficialPriceObservations({
    canonicalManifest: input.canonicalManifest,
    refreshReport: input.refreshReport,
    loadCaptureBytes: input.loadCaptureBytes,
  })
  if (extracted.unresolved.length === 0) scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
  const entries = extracted.unresolved.map((unresolved) => {
    const requirement = requirements.find((candidate) => candidate.requirementHash === unresolved.requirementHash)
    if (!requirement) scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_INVALID')
    return { requirementHash: requirement.requirementHash, unitCny: scientificV2ConservativeUnitCny(requirement) }
  })
  const base = {
    schemaVersion: 1 as const,
    kind: 'scientific-v2-operator-price-upper-bound-v1' as const,
    codeSha: input.codeSha,
    canonicalManifestHash: input.canonicalManifest.manifestHash,
    requirementsHash: canonicalHash(requirements),
    capturedAt: input.refreshReport.capturedAt,
    confirmation: 'authorize-scientific-v2-conservative-upper-bound' as const,
    entries,
  }
  const authorization: ScientificV2OperatorPriceAuthorization = { ...base, authorizationHash: canonicalHash(base) }
  const byHash = new Map(requirements.map((requirement) => [requirement.requirementHash, requirement]))
  const observations = [
    ...extracted.observations,
    ...authorization.entries.map((entry) => upperBoundObservation(byHash.get(entry.requirementHash)!, entry.unitCny, authorization.capturedAt, authorization.authorizationHash)),
  ]
  const preview = buildScientificV2PriceSnapshot({
    canonicalManifest: input.canonicalManifest,
    capturedAt: authorization.capturedAt,
    observations,
    capturesHash: input.refreshReport.capturesHash,
    operatorAuthorizationHash: authorization.authorizationHash,
  })
  const providerTotals = preview.preflight.providerTotals.map((total) => ({
    provider: total.provider,
    capCny: SCIENTIFIC_V2_PRICE_PROVIDER_BUDGETS_CNY[total.provider],
    baselineCny: Number(total.baselineCnyAtoms) / 100_000_000,
    worstCaseCny: Number(total.worstCaseCnyAtoms) / 100_000_000,
  }))
  return Object.freeze({ authorization: Object.freeze(authorization), providerTotals: Object.freeze(providerTotals) })
}

export async function persistScientificV2OperatorPriceAuthorization(input: Parameters<typeof buildScientificV2OperatorPriceAuthorization>[0] & {
  outputDirectory: string
}) {
  if (process.getuid?.() !== 0 || !isAbsolute(input.outputDirectory) || resolve(input.outputDirectory) !== input.outputDirectory) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_SINK_INVALID')
  }
  const directory = await lstat(input.outputDirectory).catch(() => null)
  if (!directory?.isDirectory() || directory.isSymbolicLink() || directory.uid !== 0 || (directory.mode & 0o777) !== 0o700) {
    scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_SINK_INVALID')
  }
  const built = await buildScientificV2OperatorPriceAuthorization(input)
  const bytes = Buffer.from(JSON.stringify(built.authorization))
  const fileSha256 = createHash('sha256').update(bytes).digest('hex')
  const path = join(input.outputDirectory, `${fileSha256}.json`)
  let handle
  try {
    handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    await handle.writeFile(bytes)
    await handle.sync()
    const facts = await handle.stat()
    assertScientificV2RootSnapshotFileFacts({ uid: facts.uid, mode: facts.mode, nlink: facts.nlink, size: facts.size, isFile: facts.isFile() })
    if (facts.size !== bytes.length) scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_SINK_INVALID')
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') throw error
    const existing = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null)
    if (!existing) scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_SINK_INVALID')
    try {
      const facts = await existing.stat()
      assertScientificV2RootSnapshotFileFacts({ uid: facts.uid, mode: facts.mode, nlink: facts.nlink, size: facts.size, isFile: facts.isFile() })
      if (!(await existing.readFile()).equals(bytes)) scientificV2Error('SCIENTIFIC_V2_PRICE_OPERATOR_AUTHORIZATION_SINK_INVALID')
    } finally { await existing.close() }
  } finally { await handle?.close() }
  const directoryHandle = await open(input.outputDirectory, constants.O_RDONLY | constants.O_NOFOLLOW)
  try { await directoryHandle.sync() } finally { await directoryHandle.close() }
  return Object.freeze({
    path, fileSha256, authorizationHash: built.authorization.authorizationHash,
    unresolvedCount: built.authorization.entries.length, providerTotals: built.providerTotals,
  })
}
