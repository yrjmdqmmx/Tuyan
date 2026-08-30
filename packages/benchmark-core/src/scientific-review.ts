import { createHmac, timingSafeEqual } from 'node:crypto'

export const SCIENTIFIC_REVIEW_RED_LINE_CODES = Object.freeze([
  'missing_required_content', 'scientific_inaccuracy', 'topology_error', 'text_symbol_error', 'quantitative_error',
  'instruction_violation', 'readability_issue', 'publication_quality_issue', 'edit_target_miss', 'non_target_changed',
] as const)
export const SCIENTIFIC_REVIEW_MAX_RED_LINES = SCIENTIFIC_REVIEW_RED_LINE_CODES.length

import { canonicalHash } from './hash.js'
import {
  SCIENTIFIC_BENCHMARK_AXES,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  type ScientificBenchmarkAxis,
} from './scientific-contracts.js'
import {
  PB_SCIENTIFIC_FIGURE_V2,
  type ScientificEditCase,
  type ScientificGenerationCase,
} from './scientific-suite.js'

export type ScientificAttemptResult = Readonly<{
  status: 'succeeded' | 'failed' | 'unsupported'
  routeId: string
  attemptHash: string
}>

export interface ScientificReviewItemInput {
  caseId: string
  caseManifestHash: string
  applicableAxes: readonly ScientificBenchmarkAxis[]
  imageHash: string | null
  rubric: Readonly<Partial<Record<ScientificBenchmarkAxis, string>>>
  attemptResult: ScientificAttemptResult
  instruction: string
  negativePrompt?: string
  aspectRatio?: string
  sourceHash?: string
  editedHash?: string | null
  region?: string
}

const MAX_PACKET_ITEMS = 9
const MAX_PACKET_ID_LENGTH = 512
const MAX_CASE_ID_LENGTH = 256
const MAX_ROUTE_ID_LENGTH = 2_048
const MAX_INSTRUCTION_LENGTH = 10_000
const MAX_RUBRIC_VALUE_LENGTH = 2_000

const CREATOR_KEYS = new Set(['suiteManifestHash', 'packetId', 'runHash', 'issuedAt', 'signingSecret', 'items'])
const PACKET_KEYS = new Set([
  'schemaVersion', 'suiteId', 'evaluationMode', 'evaluationEpoch', 'reviewProtocol', 'presentationVersion',
  'suiteManifestHash', 'packetId', 'runHash', 'issuedAt', 'items', 'packetHash', 'attestation',
])
const ITEM_INPUT_KEYS = new Set([
  'caseId', 'caseManifestHash', 'applicableAxes', 'imageHash', 'rubric', 'attemptResult', 'instruction',
  'negativePrompt', 'aspectRatio', 'sourceHash', 'editedHash', 'region',
])
const COMMON_ITEM_OUTPUT_KEYS = [
  'caseId', 'kind', 'caseManifestHash', 'applicableAxes', 'imageHash', 'rubric', 'rubricHash',
  'attemptResult', 'attemptResultHash', 'instruction', 'itemHash',
]
const GENERATION_ITEM_KEYS = new Set([...COMMON_ITEM_OUTPUT_KEYS, 'negativePrompt', 'aspectRatio'])
const EDIT_ITEM_KEYS = new Set([...COMMON_ITEM_OUTPUT_KEYS, 'sourceHash', 'editedHash', 'region'])
const ATTEMPT_KEYS = new Set(['status', 'routeId', 'attemptHash'])
const AXIS_SET = new Set<string>(SCIENTIFIC_BENCHMARK_AXES)

function reviewError(code: string): never {
  throw new Error(code)
}

function isReviewDomainError(error: unknown): error is Error {
  return error instanceof Error && /^SCIENTIFIC_REVIEW_[A-Z_]+/.test(error.message)
}

function wrapReviewError<T>(operation: () => T): T {
  try {
    return operation()
  } catch (error) {
    if (isReviewDomainError(error)) throw error
    throw new Error('SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH')
  }
}

function isPlainDataRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  return Reflect.ownKeys(descriptors).every((key) => typeof key === 'string'
    && descriptors[key].enumerable === true
    && 'value' in descriptors[key]
    && descriptors[key].get === undefined
    && descriptors[key].set === undefined)
}

function isDenseDataArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value)) return false
  const keys = Reflect.ownKeys(value)
  const indexKeys = keys.filter((key): key is string => typeof key === 'string' && key !== 'length')
  if (keys.some((key) => typeof key !== 'string'
    || (key !== 'length' && !/^(?:0|[1-9]\d*)$/.test(key)))
    || indexKeys.length !== value.length) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  return indexKeys.every((key) => descriptors[key]?.enumerable === true
    && 'value' in descriptors[key]
    && descriptors[key].get === undefined
    && descriptors[key].set === undefined)
}

function assertExactKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>, code: string) {
  const keys = Reflect.ownKeys(value)
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key))) reviewError(code)
}

function validHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
}

function validIsoInstant(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value
}

function validBoundedString(value: unknown, maximum: number) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum && value.trim() === value
}

function validSigningSecret(value: unknown) {
  if (typeof value !== 'string' || value.trim() !== value) return false
  const byteLength = Buffer.byteLength(value, 'utf8')
  return byteLength >= 32 && byteLength <= 4_096
}

function assertAxes(value: unknown, expected: readonly ScientificBenchmarkAxis[]) {
  if (!isDenseDataArray(value)
    || value.length === 0
    || value.length > SCIENTIFIC_BENCHMARK_AXES.length
    || value.some((axis) => typeof axis !== 'string' || !AXIS_SET.has(axis))
    || new Set(value).size !== value.length
    || value.length !== expected.length
    || value.some((axis, index) => axis !== expected[index])) {
    reviewError('SCIENTIFIC_REVIEW_AXES_MISMATCH')
  }
}

function normalizeRubric(value: unknown, applicableAxes: readonly ScientificBenchmarkAxis[]) {
  if (!isPlainDataRecord(value)) reviewError('SCIENTIFIC_REVIEW_RUBRIC_MISMATCH')
  const keys = Reflect.ownKeys(value)
  if (keys.length === 0 || keys.length > SCIENTIFIC_BENCHMARK_AXES.length
    || keys.some((key) => typeof key !== 'string' || !AXIS_SET.has(key) || !applicableAxes.includes(key as ScientificBenchmarkAxis))) {
    reviewError('SCIENTIFIC_REVIEW_RUBRIC_MISMATCH')
  }
  const rubric: Partial<Record<ScientificBenchmarkAxis, string>> = {}
  for (const axis of applicableAxes) {
    const rubricValue = value[axis]
    if (typeof rubricValue !== 'string' || !rubricValue.trim() || rubricValue.length > MAX_RUBRIC_VALUE_LENGTH) {
      reviewError('SCIENTIFIC_REVIEW_RUBRIC_MISMATCH')
    }
    rubric[axis] = rubricValue
  }
  if (Object.keys(rubric).length !== keys.length) reviewError('SCIENTIFIC_REVIEW_RUBRIC_MISMATCH')
  return rubric
}

function normalizeAttempt(value: unknown): ScientificAttemptResult {
  if (!isPlainDataRecord(value)) reviewError('SCIENTIFIC_REVIEW_ATTEMPT_MISMATCH')
  assertExactKeys(value, ATTEMPT_KEYS, 'SCIENTIFIC_REVIEW_ATTEMPT_MISMATCH')
  if (typeof value.status !== 'string'
    || !['succeeded', 'failed', 'unsupported'].includes(value.status)
    || !validBoundedString(value.routeId, MAX_ROUTE_ID_LENGTH)
    || !validHash(value.attemptHash)) {
    reviewError('SCIENTIFIC_REVIEW_ATTEMPT_MISMATCH')
  }
  return {
    status: value.status as ScientificAttemptResult['status'],
    routeId: value.routeId as string,
    attemptHash: value.attemptHash,
  }
}

function sameHash(actual: unknown, expected: string, code: string) {
  if (!validHash(actual) || actual !== expected) reviewError(code)
}

function normalizeReviewItem(value: unknown, mode: 'create' | 'verify') {
  if (!isPlainDataRecord(value)) reviewError('SCIENTIFIC_REVIEW_ITEM_SCHEMA_MISMATCH')
  if (mode === 'create') {
    assertExactKeys(value, ITEM_INPUT_KEYS, 'SCIENTIFIC_REVIEW_ITEM_SCHEMA_MISMATCH')
  } else {
    const kind = value.kind
    if (kind !== 'generation' && kind !== 'edit') reviewError('SCIENTIFIC_REVIEW_ITEM_SCHEMA_MISMATCH')
    assertExactKeys(value, kind === 'generation' ? GENERATION_ITEM_KEYS : EDIT_ITEM_KEYS, 'SCIENTIFIC_REVIEW_ITEM_SCHEMA_MISMATCH')
  }

  if (!validBoundedString(value.caseId, MAX_CASE_ID_LENGTH)) reviewError('SCIENTIFIC_REVIEW_CASE_MISMATCH')
  const scientificCase = PB_SCIENTIFIC_FIGURE_V2.cases.find((candidate) => candidate.id === value.caseId)
  if (!scientificCase || (mode === 'verify' && value.kind !== scientificCase.kind)) reviewError('SCIENTIFIC_REVIEW_CASE_MISMATCH')
  sameHash(value.caseManifestHash, scientificCase.manifestHash, 'SCIENTIFIC_REVIEW_CASE_MANIFEST_MISMATCH')
  assertAxes(value.applicableAxes, scientificCase.applicableAxes)
  const rubric = normalizeRubric(value.rubric, scientificCase.applicableAxes)
  if (canonicalHash(rubric) !== canonicalHash(scientificCase.rubric)) reviewError('SCIENTIFIC_REVIEW_RUBRIC_MISMATCH')
  const attemptResult = normalizeAttempt(value.attemptResult)

  if (attemptResult.status === 'succeeded') {
    if (!validHash(value.imageHash)) reviewError('SCIENTIFIC_REVIEW_OUTPUT_MISMATCH')
  } else if (value.imageHash !== null) {
    reviewError('SCIENTIFIC_REVIEW_OUTPUT_MISMATCH')
  }
  if (!validBoundedString(value.instruction, MAX_INSTRUCTION_LENGTH) || value.instruction !== scientificCase.instruction) {
    reviewError('SCIENTIFIC_REVIEW_INSTRUCTION_MISMATCH')
  }

  const common = {
    caseId: scientificCase.id,
    kind: scientificCase.kind,
    caseManifestHash: scientificCase.manifestHash,
    applicableAxes: [...scientificCase.applicableAxes],
    imageHash: value.imageHash as string | null,
    rubric: { ...rubric },
    rubricHash: canonicalHash(rubric),
    attemptResult: { ...attemptResult },
    attemptResultHash: canonicalHash(attemptResult),
    instruction: scientificCase.instruction,
  }

  if (scientificCase.kind === 'generation') {
    const generationCase = scientificCase as ScientificGenerationCase
    if (!validBoundedString(value.negativePrompt, MAX_INSTRUCTION_LENGTH) || value.negativePrompt !== generationCase.negativePrompt
      || value.aspectRatio !== generationCase.aspectRatio
      || value.sourceHash !== undefined || value.editedHash !== undefined || value.region !== undefined) {
      reviewError('SCIENTIFIC_REVIEW_GENERATION_BINDING_MISMATCH')
    }
    const base = {
      ...common,
      kind: 'generation' as const,
      negativePrompt: generationCase.negativePrompt,
      aspectRatio: generationCase.aspectRatio,
    }
    const normalized = { ...base, itemHash: canonicalHash(base) }
    if (mode === 'verify') assertDerivedHashes(value, normalized)
    return normalized
  }

  const editCase = scientificCase as ScientificEditCase
  if (value.negativePrompt !== undefined || value.aspectRatio !== undefined
    || value.sourceHash !== editCase.sourceHash
    || value.region !== editCase.region
    || !validBoundedString(value.region, 256)) {
    reviewError('SCIENTIFIC_REVIEW_EDIT_BINDING_MISMATCH')
  }
  if (attemptResult.status === 'succeeded') {
    if (!validHash(value.editedHash) || value.editedHash !== value.imageHash) reviewError('SCIENTIFIC_REVIEW_OUTPUT_MISMATCH')
  } else if (value.editedHash !== null) {
    reviewError('SCIENTIFIC_REVIEW_OUTPUT_MISMATCH')
  }
  const base = {
    ...common,
    kind: 'edit' as const,
    sourceHash: editCase.sourceHash,
    editedHash: value.editedHash as string | null,
    region: editCase.region,
  }
  const normalized = { ...base, itemHash: canonicalHash(base) }
  if (mode === 'verify') assertDerivedHashes(value, normalized)
  return normalized
}

function assertDerivedHashes(value: Record<string, unknown>, normalized: {
  rubricHash: string
  attemptResultHash: string
  itemHash: string
}) {
  if (value.rubricHash !== normalized.rubricHash) reviewError('SCIENTIFIC_REVIEW_RUBRIC_HASH_MISMATCH')
  if (value.attemptResultHash !== normalized.attemptResultHash) reviewError('SCIENTIFIC_REVIEW_ATTEMPT_HASH_MISMATCH')
  if (value.itemHash !== normalized.itemHash) reviewError('SCIENTIFIC_REVIEW_ITEM_HASH_MISMATCH')
}

function assertItemArray(value: unknown) {
  if (!isDenseDataArray(value) || value.length === 0 || value.length > MAX_PACKET_ITEMS) {
    reviewError('SCIENTIFIC_REVIEW_ITEM_SET_MISMATCH')
  }
}

function assertUniqueCases(items: readonly { caseId: string }[]) {
  if (new Set(items.map((item) => item.caseId)).size !== items.length) reviewError('SCIENTIFIC_REVIEW_CASE_SET_MISMATCH')
}

function assertPacketHeader(value: Record<string, unknown>) {
  sameHash(value.suiteManifestHash, PB_SCIENTIFIC_FIGURE_V2.manifestHash, 'SCIENTIFIC_REVIEW_SUITE_MANIFEST_MISMATCH')
  if (!validBoundedString(value.packetId, MAX_PACKET_ID_LENGTH)
    || !validHash(value.runHash)
    || !validIsoInstant(value.issuedAt)) {
    reviewError('SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH')
  }
  assertItemArray(value.items)
}

function packetBase(packet: Record<string, unknown>) {
  return {
    schemaVersion: packet.schemaVersion,
    suiteId: packet.suiteId,
    evaluationMode: packet.evaluationMode,
    evaluationEpoch: packet.evaluationEpoch,
    reviewProtocol: packet.reviewProtocol,
    presentationVersion: packet.presentationVersion,
    suiteManifestHash: packet.suiteManifestHash,
    packetId: packet.packetId,
    runHash: packet.runHash,
    issuedAt: packet.issuedAt,
    items: packet.items,
  }
}

function safeHmacEqual(actual: unknown, expected: string) {
  return validHash(actual) && actual.length === expected.length
    && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}

export function createScientificReviewPacket(input: {
  suiteManifestHash: string
  packetId: string
  runHash: string
  issuedAt: string
  signingSecret: string
  items: readonly ScientificReviewItemInput[]
}) {
  return wrapReviewError(() => {
    if (!isPlainDataRecord(input)) reviewError('SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH')
    assertExactKeys(input as unknown as Record<string, unknown>, CREATOR_KEYS, 'SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH')
    assertPacketHeader(input as unknown as Record<string, unknown>)
    if (!validSigningSecret(input.signingSecret)) reviewError('SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH')
    const items = (input.items as readonly unknown[]).map((item) => normalizeReviewItem(item, 'create'))
    assertUniqueCases(items)
    const base = {
      schemaVersion: 2,
      ...SCIENTIFIC_BENCHMARK_IDENTITY,
      suiteManifestHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
      packetId: input.packetId,
      runHash: input.runHash,
      issuedAt: input.issuedAt,
      items,
    }
    const packetHash = canonicalHash(base)
    return deepFreeze({
      ...base,
      packetHash,
      attestation: createHmac('sha256', input.signingSecret).update(packetHash).digest('hex'),
    })
  })
}

export function verifyScientificReviewPacket(packet: unknown, signingSecret: string) {
  return wrapReviewError(() => {
    if (!isPlainDataRecord(packet) || !validSigningSecret(signingSecret)) {
      reviewError('SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH')
    }
    assertExactKeys(packet, PACKET_KEYS, 'SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH')
    assertPacketHeader(packet)
    const expectedIdentity = SCIENTIFIC_BENCHMARK_IDENTITY as Record<string, unknown>
    if (packet.schemaVersion !== 2 || Object.entries(expectedIdentity).some(([key, value]) => packet[key] !== value)) {
      reviewError('SCIENTIFIC_REVIEW_IDENTITY_MISMATCH')
    }
    if (!validHash(packet.packetHash) || !validHash(packet.attestation)) reviewError('SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH')
    const items = (packet.items as readonly unknown[]).map((item) => normalizeReviewItem(item, 'verify'))
    assertUniqueCases(items)
    const expectedPacketHash = canonicalHash(packetBase(packet))
    if (packet.packetHash !== expectedPacketHash) reviewError('SCIENTIFIC_REVIEW_PACKET_HASH_MISMATCH')
    const expectedAttestation = createHmac('sha256', signingSecret).update(expectedPacketHash).digest('hex')
    if (!safeHmacEqual(packet.attestation, expectedAttestation)) reviewError('SCIENTIFIC_REVIEW_ATTESTATION_MISMATCH')
    return { packetHash: expectedPacketHash, attestation: expectedAttestation }
  })
}
