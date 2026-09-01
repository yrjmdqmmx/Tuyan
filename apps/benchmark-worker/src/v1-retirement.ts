import { createHash } from 'node:crypto'

import { canonicalHash } from '@paperbanana/benchmark-core'

type AnyRecord = Record<string, any>

export const V1_RETIREMENT_IDENTITY = Object.freeze({
  suiteId: 'pb-image-light-v1',
  evaluationMode: 'codex_single',
  evaluationEpoch: 'codex-single-2026-08-v1',
  reviewProtocol: 'codex-single-two-pass-v1',
})

export type V1RetirementObject = {
  objectKey: string
  imageHash: string
  bytes: number
  referenceCount: number
  sharedReferenceCount: number
}

export type V1RetirementInventory = {
  schemaVersion: 1
  releaseHash: string
  identity: typeof V1_RETIREMENT_IDENTITY
  targetRunIds: string[]
  dbCounts: { releases: number; runs: number; samples: number; judgments: number; dispatches: number; publicEvidence: number }
  objects: V1RetirementObject[]
  exclusiveObjects: V1RetirementObject[]
  sharedObjects: V1RetirementObject[]
  exclusiveBytes: number
  sharedBytes: number
  inventoryHash: string
}

type InventoryInput = {
  expectedReleaseHash: string
  releases: AnyRecord[]
  runs: AnyRecord[]
  samples: AnyRecord[]
  judgments: AnyRecord[]
  dispatches: AnyRecord[]
  publicEvidence: AnyRecord[]
  otherEvidence: AnyRecord[]
  readObject: (objectKey: string) => Promise<Uint8Array | Buffer>
}

function idText(value: unknown) {
  if (value && typeof value === 'object' && typeof (value as AnyRecord).toHexString === 'function') return (value as AnyRecord).toHexString()
  return String(value ?? '')
}

function exactIdentity(value: AnyRecord) {
  return Object.entries(V1_RETIREMENT_IDENTITY).every(([key, expected]) => value?.[key] === expected)
}

function verifiedRelease(releases: AnyRecord[], expectedReleaseHash: string) {
  if (!/^[a-f0-9]{64}$/.test(expectedReleaseHash)) throw new Error('V1_RETIREMENT_RELEASE_INVALID')
  const matches = releases.filter((release) => release?.releaseHash === expectedReleaseHash)
  if (matches.length !== 1) throw new Error('V1_RETIREMENT_RELEASE_INVALID')
  const release = matches[0]
  const { _id: _storedId, releaseHash, ...releaseBase } = release
  if (!exactIdentity(release) || release.profileStatus !== 'published' || canonicalHash(releaseBase) !== releaseHash) {
    throw new Error('V1_RETIREMENT_RELEASE_INVALID')
  }
  return release
}

const RAW_OBJECT = /^bench\/objects\/([a-f0-9]{64})\.png$/
const PUBLIC_OBJECT = /^bench\/public\/evidence\/[a-f0-9]{64}\/(?:thumbnail|detail|full)\.webp$/

function isV1ObjectKey(value: string) {
  return RAW_OBJECT.test(value) || PUBLIC_OBJECT.test(value)
}

function walk(value: unknown, visit: (record: AnyRecord) => void) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit))
    return
  }
  const record = value as AnyRecord
  visit(record)
  Object.values(record).forEach((item) => walk(item, visit))
}

function objectRefs(documents: AnyRecord[]) {
  const refs: Array<{ objectKey: string; imageHash: string }> = []
  for (const document of documents) walk(document, (record) => {
    const objectKey = String(record.objectKey || record.imageObjectKey || '')
    const imageHash = String(record.imageHash || '')
    if (isV1ObjectKey(objectKey) && /^[a-f0-9]{64}$/.test(imageHash)) refs.push({ objectKey, imageHash })
  })
  return refs
}

function externalObjectKeys(documents: AnyRecord[]) {
  const keys = new Set<string>()
  const scan = (value: unknown) => {
    if (typeof value === 'string') {
      if (isV1ObjectKey(value)) keys.add(value)
      return
    }
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) value.forEach(scan)
    else Object.values(value as AnyRecord).forEach(scan)
  }
  documents.forEach(scan)
  return keys
}

function sameRun(document: AnyRecord, targetRunIds: Set<string>) {
  return targetRunIds.has(idText(document.runId))
}

export async function buildV1RetirementInventory(input: InventoryInput): Promise<V1RetirementInventory> {
  const release = verifiedRelease(input.releases, input.expectedReleaseHash)
  const targetRuns = input.runs.filter(exactIdentity)
  if (!targetRuns.length) throw new Error('V1_RETIREMENT_RUNS_MISSING')
  const targetRunIds = new Set(targetRuns.map((run) => idText(run._id)).filter(Boolean))
  if (targetRunIds.size !== targetRuns.length) throw new Error('V1_RETIREMENT_RUN_ID_INVALID')

  const targetSamples = input.samples.filter((sample) => sameRun(sample, targetRunIds))
  const targetJudgments = input.judgments.filter((judgment) => sameRun(judgment, targetRunIds))
  const targetDispatches = input.dispatches.filter((dispatch) => sameRun(dispatch, targetRunIds))
  const targetPublicEvidence = input.publicEvidence.filter((row) => row.sourceReleaseHash === input.expectedReleaseHash && row.kind !== 'backfill-lock')
  if (!targetSamples.length || !targetPublicEvidence.length) throw new Error('V1_RETIREMENT_EVIDENCE_MISSING')

  const candidates = new Map<string, { imageHash: string; referenceCount: number }>()
  for (const ref of objectRefs([release, ...targetSamples, ...targetPublicEvidence])) {
    const rawMatch = ref.objectKey.match(RAW_OBJECT)
    if (rawMatch && rawMatch[1] !== ref.imageHash) throw new Error('V1_RETIREMENT_OBJECT_BINDING_INVALID')
    const existing = candidates.get(ref.objectKey)
    if (existing && existing.imageHash !== ref.imageHash) throw new Error('V1_RETIREMENT_OBJECT_BINDING_INVALID')
    candidates.set(ref.objectKey, { imageHash: ref.imageHash, referenceCount: (existing?.referenceCount || 0) + 1 })
  }
  if (!candidates.size) throw new Error('V1_RETIREMENT_OBJECTS_MISSING')

  const externalDocuments = [
    ...input.releases.filter((item) => item.releaseHash !== input.expectedReleaseHash),
    ...input.runs.filter((item) => !targetRunIds.has(idText(item._id))),
    ...input.samples.filter((item) => !sameRun(item, targetRunIds)),
    ...input.judgments.filter((item) => !sameRun(item, targetRunIds)),
    ...input.dispatches.filter((item) => !sameRun(item, targetRunIds)),
    ...input.publicEvidence.filter((item) => item.sourceReleaseHash !== input.expectedReleaseHash),
    ...input.otherEvidence,
  ]
  const externalKeys = externalObjectKeys(externalDocuments)
  const objects: V1RetirementObject[] = []
  for (const [objectKey, ref] of [...candidates.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const bytes = Buffer.from(await input.readObject(objectKey))
    if (!bytes.length || createHash('sha256').update(bytes).digest('hex') !== ref.imageHash) {
      throw new Error(`V1_RETIREMENT_OBJECT_HASH_MISMATCH:${objectKey}`)
    }
    objects.push({
      objectKey,
      imageHash: ref.imageHash,
      bytes: bytes.length,
      referenceCount: ref.referenceCount,
      sharedReferenceCount: externalKeys.has(objectKey) ? 1 : 0,
    })
  }
  const exclusiveObjects = objects.filter((object) => object.sharedReferenceCount === 0)
  const sharedObjects = objects.filter((object) => object.sharedReferenceCount > 0)
  const dbCounts = {
    releases: 1,
    runs: targetRuns.length,
    samples: targetSamples.length,
    judgments: targetJudgments.length,
    dispatches: targetDispatches.length,
    publicEvidence: targetPublicEvidence.length,
  }
  const inventoryBase = {
    schemaVersion: 1 as const,
    releaseHash: input.expectedReleaseHash,
    identity: V1_RETIREMENT_IDENTITY,
    targetRunIds: [...targetRunIds].sort(),
    dbCounts,
    objects,
    exclusiveBytes: exclusiveObjects.reduce((sum, object) => sum + object.bytes, 0),
    sharedBytes: sharedObjects.reduce((sum, object) => sum + object.bytes, 0),
  }
  return {
    ...inventoryBase,
    exclusiveObjects,
    sharedObjects,
    inventoryHash: canonicalHash(inventoryBase),
  }
}

export async function deleteExclusiveV1Objects(
  inventory: V1RetirementInventory,
  expectedInventoryHash: string,
  store: { deleteObject: (objectKey: string) => Promise<void> },
) {
  if (inventory.inventoryHash !== expectedInventoryHash) throw new Error('V1_RETIREMENT_INVENTORY_HASH_MISMATCH')
  for (const object of inventory.exclusiveObjects) await store.deleteObject(object.objectKey)
  return {
    releaseHash: inventory.releaseHash,
    inventoryHash: inventory.inventoryHash,
    deletedObjectCount: inventory.exclusiveObjects.length,
    deletedBytes: inventory.exclusiveBytes,
    sharedObjectCount: inventory.sharedObjects.length,
    sharedBytes: inventory.sharedBytes,
  }
}
