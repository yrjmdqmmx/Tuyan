import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  SCIENTIFIC_BENCHMARK_AXES,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  SCIENTIFIC_REVIEW_MAX_RED_LINES,
  SCIENTIFIC_REVIEW_RED_LINE_CODES,
  canonicalHash,
  compareScientificIdentifiers,
  verifyScientificReviewPacket,
  type ScientificBenchmarkAxis,
} from '@paperbanana/benchmark-core'

import {
  assertExactScientificV2Keys,
  assertBoundedScientificV2PlainData,
  assertDenseScientificV2Array,
  deepFreezeScientificV2,
  isScientificV2Hash,
  scientificV2Error,
} from './scientific-v2-common.js'
import {
  verifyScientificV2BatchManifest,
  verifyScientificV2BatchState,
  type ScientificV2BatchManifest,
  type ScientificV2BatchState,
} from './scientific-v2-manifest.js'

interface BlindPublicItem {
  blindLabel: string
  itemHash: string
  sourcePacketHash: string
  caseId: string
  kind: 'generation' | 'edit'
  applicableAxes: ScientificBenchmarkAxis[]
  imageHash: string
  rubric: Partial<Record<ScientificBenchmarkAxis, string>>
  instruction: string
  negativePrompt?: string
  aspectRatio?: string
  sourceHash?: string
  editedHash?: string
  region?: string
}

type UnlabeledBlindPublicItem = Omit<BlindPublicItem, 'blindLabel'>

interface BlindPacket {
  schemaVersion: 2
  batchManifestHash: string
  packetId: string
  items: BlindPublicItem[]
  packetHash: string
}

interface PrivateMapping {
  packetHash: string
  blindLabel: string
  itemHash: string
  sourcePacketHash: string
  modelKey: string
  runHash: string
}

interface ScientificReviewPrivateEnvelope {
  batchManifestHash: string
  sourceSetHash: string
  role: 'A' | 'B'
  sources: Array<{ modelKey: string; runHash: string | null; sourcePacketHash: string | null; successItemSetHash: string }>
  mappings: PrivateMapping[]
  packagesHash: string
}

export interface ScientificBlindReviewerAssignment {
  role: 'A' | 'B'
  packages: BlindPacket[]
  privateMappings: PrivateMapping[]
  privateEnvelope: ScientificReviewPrivateEnvelope
  mappingHash: string
  assignmentSet: { batchManifestHash: string; sourceSetHash: string; reviewerAEnvelopeHash: string; reviewerBEnvelopeHash: string }
  assignmentAttestationHash: string
}

export type ScientificBlindReviewerPublicAssignment = Pick<ScientificBlindReviewerAssignment,
  'role' | 'packages' | 'mappingHash' | 'assignmentSet' | 'assignmentAttestationHash'>
export type ScientificBlindReviewerPrivateAssignment = Pick<ScientificBlindReviewerAssignment,
  'privateMappings' | 'privateEnvelope'>

export function assembleScientificBlindReviewerAssignment(input: {
  publicAssignment: ScientificBlindReviewerPublicAssignment
  privateAssignment: ScientificBlindReviewerPrivateAssignment
}) {
  assertExactScientificV2Keys(input, ['publicAssignment', 'privateAssignment'], 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  assertBoundedScientificV2PlainData(input, { maxDepth: 14, maxNodes: 120_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  assertExactScientificV2Keys(input.publicAssignment, ['role', 'packages', 'mappingHash', 'assignmentSet', 'assignmentAttestationHash'], 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  assertExactScientificV2Keys(input.privateAssignment, ['privateMappings', 'privateEnvelope'], 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  if (input.publicAssignment.role !== input.privateAssignment.privateEnvelope.role
    || canonicalHash(input.privateAssignment.privateEnvelope) !== input.publicAssignment.mappingHash
    || canonicalHash(input.privateAssignment.privateMappings) !== canonicalHash(input.privateAssignment.privateEnvelope.mappings)
    || canonicalHash(input.publicAssignment.packages) !== input.privateAssignment.privateEnvelope.packagesHash) {
    scientificV2Error('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  }
  return deepFreezeScientificV2({ ...input.publicAssignment, ...input.privateAssignment })
}

export interface ScientificReviewSourceBinding {
  schemaVersion: 2
  batchManifestHash: string
  modelKey: string
  runHash: string | null
  sourcePacketHash: string | null
  stateHash: string
  successItemSetHash: string
  sourceSetHash: string
  bindingAttestation: string
}

function assertAttestationSecret(secret: unknown): asserts secret is string {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32 || Buffer.byteLength(secret, 'utf8') > 4096 || secret.trim() !== secret) {
    scientificV2Error('SCIENTIFIC_V2_REVIEW_ATTESTATION_SECRET_INVALID')
  }
}

function hmac(secret: string, value: unknown) {
  return createHmac('sha256', secret).update(canonicalHash(value)).digest('hex')
}

function safeHmacEqual(actual: unknown, expected: string) {
  return isScientificV2Hash(actual) && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

interface ScientificReviewSourceInput {
  modelKey: string
  packet: unknown | null
  signingSecret: string | null
}

function expectedSuccessfulSlots(manifest: ScientificV2BatchManifest, state: ScientificV2BatchState) {
  verifyScientificV2BatchManifest(manifest)
  verifyScientificV2BatchState(state, manifest)
  if (state.status !== 'completed' || state.manifestHash !== manifest.manifestHash) scientificV2Error('SCIENTIFIC_V2_REVIEW_BATCH_NOT_TERMINAL')
  return new Map(manifest.models.map((model) => [model.canonicalModelId, state.slots.filter((slot) => slot.canonicalModelId === model.canonicalModelId && slot.status === 'succeeded')]))
}

function verifyReviewSourceFacts(
  manifest: ScientificV2BatchManifest,
  state: ScientificV2BatchState,
  sources: ScientificReviewSourceInput[],
) {
  const expected = expectedSuccessfulSlots(manifest, state)
  assertDenseScientificV2Array(sources, manifest.models.length, 'SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
  assertBoundedScientificV2PlainData(sources, { maxDepth: 12, maxNodes: 100_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
  if (sources.length !== manifest.models.length || new Set(sources.map((source) => source.modelKey)).size !== sources.length
    || sources.some((source) => !expected.has(source.modelKey))) scientificV2Error('SCIENTIFIC_V2_REVIEW_MODEL_ROSTER_MISMATCH')
  return sources.map((source) => {
    assertExactScientificV2Keys(source, ['modelKey', 'packet', 'signingSecret'], 'SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
    const slots = expected.get(source.modelKey)!
    const successFacts = slots.map((slot) => {
      const attempt = slot.attempts.at(-1)!
      return { caseId: slot.caseId, imageHash: attempt.rawImageHash, attemptHash: attempt.attemptHash }
    }).sort((left, right) => compareScientificIdentifiers(left.caseId, right.caseId))
    const successItemSetHash = canonicalHash(successFacts)
    if (slots.length === 0) {
      if (source.packet !== null || source.signingSecret !== null) scientificV2Error('SCIENTIFIC_V2_REVIEW_SUCCESS_ITEM_SET_MISMATCH')
      return { modelKey: source.modelKey, runHash: null, sourcePacketHash: null, successItemSetHash }
    }
    if (typeof source.signingSecret !== 'string') scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
    verifyScientificReviewPacket(source.packet, source.signingSecret)
    const packet = source.packet as { runHash: string; packetHash: string; items: Array<Record<string, unknown>> }
    if (!isScientificV2Hash(packet.runHash) || !isScientificV2Hash(packet.packetHash) || packet.items.length !== slots.length) {
      scientificV2Error('SCIENTIFIC_V2_REVIEW_SUCCESS_ITEM_SET_MISMATCH')
    }
    const packetFacts = packet.items.map((item) => {
      const attemptResult = item.attemptResult as { status: string; attemptHash: string }
      return { caseId: item.caseId, imageHash: item.imageHash, attemptHash: attemptResult.attemptHash, status: attemptResult.status }
    }).sort((left, right) => compareScientificIdentifiers(String(left.caseId), String(right.caseId)))
    if (packetFacts.some((fact) => fact.status !== 'succeeded')
      || canonicalHash(packetFacts.map(({ status: _status, ...fact }) => fact)) !== successItemSetHash) {
      scientificV2Error('SCIENTIFIC_V2_REVIEW_SUCCESS_ITEM_SET_MISMATCH')
    }
    return { modelKey: source.modelKey, runHash: packet.runHash, sourcePacketHash: packet.packetHash, successItemSetHash }
  })
}

export function createScientificReviewSourceBindings(input: {
  batchManifestHash: string
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  sources: ScientificReviewSourceInput[]
}, attestationSecret: string) {
  assertAttestationSecret(attestationSecret)
  assertExactScientificV2Keys(input, ['batchManifestHash', 'manifest', 'state', 'sources'], 'SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
  if (!isScientificV2Hash(input.batchManifestHash) || input.batchManifestHash !== input.manifest.manifestHash
    || input.state.stateHash === '' || !Array.isArray(input.sources)) scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
  const facts = verifyReviewSourceFacts(input.manifest, input.state, input.sources)
  const orderedFacts = [...facts].sort((left, right) => compareScientificIdentifiers(left.modelKey, right.modelKey))
  const sourceSetHash = canonicalHash({ batchManifestHash: input.batchManifestHash, stateHash: input.state.stateHash, sources: orderedFacts })
  const bindings = facts.map((fact) => {
    const base = { schemaVersion: 2 as const, batchManifestHash: input.batchManifestHash, stateHash: input.state.stateHash, ...fact, sourceSetHash }
    return { ...base, bindingAttestation: hmac(attestationSecret, base) }
  })
  return deepFreezeScientificV2({ batchManifestHash: input.batchManifestHash, sourceSetHash, bindings })
}

function hashSort<T extends { itemHash: string }>(items: T[], seed: string, role: 'A' | 'B') {
  return [...items].sort((left, right) => compareScientificIdentifiers(canonicalHash([seed, role, left.itemHash]), canonicalHash([seed, role, right.itemHash])))
}

function assignmentFor(
  items: Array<UnlabeledBlindPublicItem & { modelKey: string; runHash: string }>,
  sources: ScientificReviewPrivateEnvelope['sources'],
  sourceSetHash: string,
  batchManifestHash: string,
  seed: string,
  role: 'A' | 'B',
) {
  let ordered = hashSort(items, seed, 'A')
  if (role === 'B' && ordered.length > 1) ordered = ordered.reverse()
  const packages: BlindPacket[] = []
  const privateMappings: PrivateMapping[] = []
  for (let offset = 0; offset < ordered.length; offset += 24) {
    const group = ordered.slice(offset, offset + 24)
    const publicItems = group.map((item, index) => {
      const blindLabel = `blind-${canonicalHash([seed, role, item.itemHash, index]).slice(0, 12)}`
      const { modelKey: _private, runHash: _runHash, ...publicItem } = item
      return { ...publicItem, blindLabel }
    })
    const base = { schemaVersion: 2 as const, batchManifestHash, packetId: `scientific-blind-${offset / 24 + 1}`, items: publicItems }
    const packet = { ...base, packetHash: canonicalHash(base) }
    packages.push(packet)
    group.forEach((item, index) => privateMappings.push({
      packetHash: packet.packetHash,
      blindLabel: publicItems[index].blindLabel,
      itemHash: item.itemHash,
      sourcePacketHash: item.sourcePacketHash,
      modelKey: item.modelKey,
      runHash: item.runHash,
    }))
  }
  const privateEnvelope = { batchManifestHash, sourceSetHash, role, sources, mappings: privateMappings, packagesHash: canonicalHash(packages) }
  const mappingHash = canonicalHash(privateEnvelope)
  return { role, packages, privateMappings, privateEnvelope, mappingHash }
}

function isScientificAxis(value: unknown): value is ScientificBenchmarkAxis {
  return typeof value === 'string' && SCIENTIFIC_BENCHMARK_AXES.some((axis) => axis === value)
}

export function createScientificBlindReviewPackages(input: {
  batchManifestHash: string
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  sourceSetHash: string
  seed: string
  sources: Array<ScientificReviewSourceInput & { binding: ScientificReviewSourceBinding }>
}, attestationSecret: string) {
  assertAttestationSecret(attestationSecret)
  assertExactScientificV2Keys(input, ['batchManifestHash', 'manifest', 'state', 'sourceSetHash', 'seed', 'sources'], 'SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
  if (!input || !isScientificV2Hash(input.batchManifestHash) || !isScientificV2Hash(input.sourceSetHash)
    || typeof input.seed !== 'string' || !input.seed || input.seed.length > 256 || !Array.isArray(input.sources) || input.sources.length === 0) {
    scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
  }
  if (input.batchManifestHash !== input.manifest.manifestHash || input.state.manifestHash !== input.manifest.manifestHash) scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
  const verifiedFacts = verifyReviewSourceFacts(input.manifest, input.state, input.sources.map(({ binding: _binding, ...source }) => source))
  const factsByModel = new Map(verifiedFacts.map((fact) => [fact.modelKey, fact]))
  const items: Array<UnlabeledBlindPublicItem & { modelKey: string; runHash: string }> = []
  const sourceBindings: ScientificReviewPrivateEnvelope['sources'] = []
  const modelKeys = new Set<string>()
  for (const source of input.sources) {
    assertExactScientificV2Keys(source, ['modelKey', 'packet', 'signingSecret', 'binding'], 'SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
    if (!source || typeof source.modelKey !== 'string' || !source.modelKey || modelKeys.has(source.modelKey)) {
      scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
    }
    modelKeys.add(source.modelKey)
    const fact = factsByModel.get(source.modelKey)
    if (!fact) scientificV2Error('SCIENTIFIC_V2_REVIEW_MODEL_ROSTER_MISMATCH')
    if (source.packet === null) {
      assertExactScientificV2Keys(source.binding, ['schemaVersion', 'batchManifestHash', 'modelKey', 'runHash', 'sourcePacketHash', 'stateHash', 'successItemSetHash', 'sourceSetHash', 'bindingAttestation'], 'SCIENTIFIC_V2_REVIEW_SOURCE_BINDING_ATTESTATION_INVALID')
      const { bindingAttestation, ...bindingBase } = source.binding
      if (source.binding.schemaVersion !== 2 || source.binding.batchManifestHash !== input.batchManifestHash
        || source.binding.stateHash !== input.state.stateHash || source.binding.sourceSetHash !== input.sourceSetHash
        || source.binding.modelKey !== source.modelKey || source.binding.runHash !== null || source.binding.sourcePacketHash !== null
        || source.binding.successItemSetHash !== fact.successItemSetHash
        || !safeHmacEqual(bindingAttestation, hmac(attestationSecret, bindingBase))) scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_BINDING_ATTESTATION_INVALID')
      sourceBindings.push(fact)
      continue
    }
    if (typeof source.signingSecret !== 'string') scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
    const verified = verifyScientificReviewPacket(source.packet, source.signingSecret)
    const packet = source.packet as { packetHash: string; runHash: string; items: Array<Record<string, unknown>> }
    if (packet.packetHash !== verified.packetHash) scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
    assertExactScientificV2Keys(source.binding, ['schemaVersion', 'batchManifestHash', 'modelKey', 'runHash', 'sourcePacketHash', 'stateHash', 'successItemSetHash', 'sourceSetHash', 'bindingAttestation'], 'SCIENTIFIC_V2_REVIEW_SOURCE_BINDING_ATTESTATION_INVALID')
    const { bindingAttestation, ...bindingBase } = source.binding
    if (source.binding.schemaVersion !== 2 || source.binding.batchManifestHash !== input.batchManifestHash
      || source.binding.sourceSetHash !== input.sourceSetHash || source.binding.stateHash !== input.state.stateHash || source.binding.modelKey !== source.modelKey
      || source.binding.runHash !== packet.runHash || source.binding.sourcePacketHash !== packet.packetHash
      || source.binding.successItemSetHash !== fact.successItemSetHash
      || !safeHmacEqual(bindingAttestation, hmac(attestationSecret, bindingBase))) scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_BINDING_ATTESTATION_INVALID')
    sourceBindings.push(fact)
    for (const item of packet.items) {
      const attempt = item.attemptResult as { status: string }
      if (attempt.status !== 'succeeded' || typeof item.imageHash !== 'string' || !isScientificV2Hash(item.imageHash)) continue
      if (!Array.isArray(item.applicableAxes) || !item.applicableAxes.every(isScientificAxis)) {
        scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
      }
      items.push({
        modelKey: source.modelKey,
        runHash: packet.runHash,
        sourcePacketHash: packet.packetHash,
        itemHash: item.itemHash as string,
        caseId: item.caseId as string,
        kind: item.kind as 'generation' | 'edit',
        applicableAxes: [...item.applicableAxes],
        imageHash: item.imageHash,
        rubric: structuredClone(item.rubric as Partial<Record<ScientificBenchmarkAxis, string>>),
        instruction: item.instruction as string,
        ...(item.kind === 'generation' ? {
          negativePrompt: item.negativePrompt as string,
          aspectRatio: item.aspectRatio as string,
        } : {
          sourceHash: item.sourceHash as string,
          editedHash: item.editedHash as string,
          region: item.region as string,
        }),
      })
    }
  }
  if (items.length === 0 || new Set(items.map((item) => item.itemHash)).size !== items.length) {
    scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
  }
  const orderedBindings = [...sourceBindings].sort((left, right) => compareScientificIdentifiers(left.modelKey, right.modelKey))
  if (canonicalHash({ batchManifestHash: input.batchManifestHash, stateHash: input.state.stateHash, sources: orderedBindings }) !== input.sourceSetHash) scientificV2Error('SCIENTIFIC_V2_REVIEW_SOURCE_BINDING_ATTESTATION_INVALID')
  const reviewerA = assignmentFor(items, sourceBindings, input.sourceSetHash, input.batchManifestHash, input.seed, 'A')
  const reviewerB = assignmentFor(items, sourceBindings, input.sourceSetHash, input.batchManifestHash, input.seed, 'B')
  const assignmentSet = {
    batchManifestHash: input.batchManifestHash,
    sourceSetHash: input.sourceSetHash,
    reviewerAEnvelopeHash: canonicalHash(reviewerA.privateEnvelope),
    reviewerBEnvelopeHash: canonicalHash(reviewerB.privateEnvelope),
  }
  const assignmentAttestationHash = hmac(attestationSecret, assignmentSet)
  return deepFreezeScientificV2({
    batchManifestHash: input.batchManifestHash,
    sourceSetHash: input.sourceSetHash,
    automaticJudges: [] as const,
    reviewerA: { ...reviewerA, assignmentSet, assignmentAttestationHash },
    reviewerB: { ...reviewerB, assignmentSet, assignmentAttestationHash },
  })
}

type ScoreMap = Partial<Record<ScientificBenchmarkAxis, number>>

export interface ValidatedScientificReviewerResults {
  role: 'A' | 'B'
  batchManifestHash: string
  sourceSetHash: string
  assignmentAttestationHash: string
  assignmentSet: ScientificBlindReviewerAssignment['assignmentSet']
  mappingHash: string
  items: Array<{
    packetHash: string
    itemHash: string
    applicableAxes: ScientificBenchmarkAxis[]
    scores: ScoreMap
    redLines: string[]
    lowConfidence: boolean
  }>
  resultHash: string
  resultAttestationHash: string
}

function normalizeScores(value: unknown, axes: ScientificBenchmarkAxis[]) {
  assertExactScientificV2Keys(value, axes, 'SCIENTIFIC_V2_REVIEW_SCORE_INVALID')
  const scores: ScoreMap = {}
  for (const axis of axes) {
    const score = (value as Record<string, unknown>)[axis]
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 10) scientificV2Error('SCIENTIFIC_V2_REVIEW_SCORE_INVALID')
    scores[axis] = score
  }
  return scores
}

function normalizeRedLines(value: unknown) {
  try {
    assertDenseScientificV2Array(value, SCIENTIFIC_REVIEW_MAX_RED_LINES, 'SCIENTIFIC_V2_REVIEW_RED_LINE_INVALID')
  } catch {
    scientificV2Error('SCIENTIFIC_V2_REVIEW_RED_LINE_INVALID')
  }
  const normalized: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || !(SCIENTIFIC_REVIEW_RED_LINE_CODES as readonly string[]).includes(item)) scientificV2Error('SCIENTIFIC_V2_REVIEW_RED_LINE_INVALID')
    normalized.push(item)
  }
  if (new Set(normalized).size !== normalized.length) scientificV2Error('SCIENTIFIC_V2_REVIEW_RED_LINE_INVALID')
  return normalized.sort(compareScientificIdentifiers)
}

export function validateScientificReviewerResults(input: {
  role: 'A' | 'B'
  assignment: ScientificBlindReviewerAssignment
  submissions: unknown[]
}, attestationSecret: string): ValidatedScientificReviewerResults {
  assertAttestationSecret(attestationSecret)
  assertExactScientificV2Keys(input, ['role', 'assignment', 'submissions'], 'SCIENTIFIC_V2_REVIEW_RESULT_SCHEMA_INVALID')
  assertBoundedScientificV2PlainData(input.assignment, { maxDepth: 14, maxNodes: 120_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  assertBoundedScientificV2PlainData(input.submissions, { maxDepth: 10, maxNodes: 80_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_REVIEW_RESULT_SCHEMA_INVALID')
  if (!input || (input.role !== 'A' && input.role !== 'B') || input.assignment.role !== input.role
    || !Array.isArray(input.submissions) || input.submissions.length === 0) scientificV2Error('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
  assertExactScientificV2Keys(input.assignment.assignmentSet, ['batchManifestHash', 'sourceSetHash', 'reviewerAEnvelopeHash', 'reviewerBEnvelopeHash'], 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  assertExactScientificV2Keys(input.assignment, ['role', 'packages', 'privateMappings', 'privateEnvelope', 'mappingHash', 'assignmentSet', 'assignmentAttestationHash'], 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  assertExactScientificV2Keys(input.assignment.privateEnvelope, ['batchManifestHash', 'sourceSetHash', 'role', 'sources', 'mappings', 'packagesHash'], 'SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  const ownEnvelopeHash = canonicalHash(input.assignment.privateEnvelope)
  const expectedOwnHash = input.role === 'A' ? input.assignment.assignmentSet.reviewerAEnvelopeHash : input.assignment.assignmentSet.reviewerBEnvelopeHash
  if (input.assignment.privateEnvelope.batchManifestHash !== input.assignment.assignmentSet.batchManifestHash
    || input.assignment.privateEnvelope.sourceSetHash !== input.assignment.assignmentSet.sourceSetHash
    || ownEnvelopeHash !== expectedOwnHash
    || !safeHmacEqual(input.assignment.assignmentAttestationHash, hmac(attestationSecret, input.assignment.assignmentSet))
    || canonicalHash(input.assignment.privateEnvelope) !== input.assignment.mappingHash
    || canonicalHash(input.assignment.privateMappings) !== canonicalHash(input.assignment.privateEnvelope.mappings)
    || canonicalHash(input.assignment.packages) !== input.assignment.privateEnvelope.packagesHash) scientificV2Error('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  for (const packet of input.assignment.packages) {
    const { packetHash, ...packetBase } = packet
    if (packet.batchManifestHash !== input.assignment.privateEnvelope.batchManifestHash || canonicalHash(packetBase) !== packetHash) scientificV2Error('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  }
  const publicMappings = input.assignment.packages.flatMap((packet) => packet.items.map((item) => `${packet.packetHash}\0${item.blindLabel}\0${item.itemHash}\0${item.sourcePacketHash}`)).sort(compareScientificIdentifiers)
  const privateMappings = input.assignment.privateMappings.map((item) => `${item.packetHash}\0${item.blindLabel}\0${item.itemHash}\0${item.sourcePacketHash}`).sort(compareScientificIdentifiers)
  if (canonicalHash(publicMappings) !== canonicalHash(privateMappings)) scientificV2Error('SCIENTIFIC_V2_REVIEW_ASSIGNMENT_TAMPERED')
  const expectedPackets = new Map(input.assignment.packages.map((packet) => [packet.packetHash, packet]))
  const normalized: ValidatedScientificReviewerResults['items'] = []
  const seenPackets = new Set<string>()
  const seenItems = new Set<string>()
  for (const submission of input.submissions) {
    assertExactScientificV2Keys(submission, ['packetHash', 'results'], 'SCIENTIFIC_V2_REVIEW_RESULT_SCHEMA_INVALID')
    if (typeof submission.packetHash !== 'string' || seenPackets.has(submission.packetHash) || !Array.isArray(submission.results)) {
      scientificV2Error('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
    }
    seenPackets.add(submission.packetHash)
    const packet = expectedPackets.get(submission.packetHash)
    if (!packet || submission.results.length !== packet.items.length) scientificV2Error('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
    for (const result of submission.results) {
      assertExactScientificV2Keys(result, ['itemHash', 'blindLabel', 'scores', 'redLines', 'lowConfidence'], 'SCIENTIFIC_V2_REVIEW_RESULT_SCHEMA_INVALID')
      const publicItem = packet.items.find((item) => item.itemHash === result.itemHash && item.blindLabel === result.blindLabel)
      if (!publicItem || seenItems.has(publicItem.itemHash) || typeof result.lowConfidence !== 'boolean') {
        scientificV2Error('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
      }
      seenItems.add(publicItem.itemHash)
      normalized.push({
        packetHash: submission.packetHash,
        itemHash: publicItem.itemHash,
        applicableAxes: [...publicItem.applicableAxes],
        scores: normalizeScores(result.scores, publicItem.applicableAxes),
        redLines: normalizeRedLines(result.redLines),
        lowConfidence: result.lowConfidence,
      })
    }
  }
  const expectedItems = input.assignment.packages.flatMap((packet) => packet.items)
  if (seenPackets.size !== expectedPackets.size || seenItems.size !== expectedItems.length) scientificV2Error('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
  const base = {
    role: input.role,
    batchManifestHash: input.assignment.privateEnvelope.batchManifestHash,
    sourceSetHash: input.assignment.privateEnvelope.sourceSetHash,
    assignmentAttestationHash: input.assignment.assignmentAttestationHash,
    assignmentSet: input.assignment.assignmentSet,
    mappingHash: input.assignment.mappingHash,
    items: normalized.sort((a, b) => compareScientificIdentifiers(a.itemHash, b.itemHash)),
  }
  const resultHash = canonicalHash(base)
  return deepFreezeScientificV2({ ...base, resultHash, resultAttestationHash: hmac(attestationSecret, { ...base, resultHash }) })
}

export interface ScientificReviewIntegrityAttestation {
  schemaVersion: 2
  reviewProtocol: string
  canFinalize: boolean
  automaticJudgeCalls: 0
  reviewerAHash: string
  reviewerBHash: string
  resultsHash: string
  disputeCount: number
  arbitrationHash: string | null
  attestationHash: string
}

function sameStringSet(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function verifyValidatedReviewerResult(result: ValidatedScientificReviewerResults, attestationSecret: string) {
  try {
    assertExactScientificV2Keys(result, [
      'role', 'batchManifestHash', 'sourceSetHash', 'assignmentAttestationHash', 'assignmentSet', 'mappingHash',
      'items', 'resultHash', 'resultAttestationHash',
    ], 'SCIENTIFIC_V2_REVIEW_RESULT_TAMPERED')
    assertBoundedScientificV2PlainData(result, { maxDepth: 12, maxNodes: 100_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_REVIEW_RESULT_TAMPERED')
    const { resultHash, resultAttestationHash, ...base } = result
    return resultHash === canonicalHash(base)
      && safeHmacEqual(resultAttestationHash, hmac(attestationSecret, { ...base, resultHash }))
  } catch {
    return false
  }
}

export function finalizeScientificDoubleReview(input: {
  reviewerA: ValidatedScientificReviewerResults
  reviewerB: ValidatedScientificReviewerResults
  automaticJudges: readonly unknown[]
  arbitration?: unknown
}, attestationSecret: string) {
  assertAttestationSecret(attestationSecret)
  const hasArbitration = Boolean(input && typeof input === 'object' && Object.prototype.hasOwnProperty.call(input, 'arbitration'))
  assertExactScientificV2Keys(input, !hasArbitration
    ? ['reviewerA', 'reviewerB', 'automaticJudges']
    : ['reviewerA', 'reviewerB', 'automaticJudges', 'arbitration'], 'SCIENTIFIC_V2_REVIEW_FINALIZE_SCHEMA_INVALID')
  assertDenseScientificV2Array(input.automaticJudges, 0, 'SCIENTIFIC_V2_AUTOMATIC_JUDGE_FORBIDDEN')
  if (input.arbitration !== undefined) {
    assertBoundedScientificV2PlainData(input.arbitration, { maxDepth: 8, maxNodes: 50_000, maxArrayLength: 4_096, maxStringLength: 4_096 }, 'SCIENTIFIC_V2_ARBITRATION_SCHEMA_INVALID')
  }
  if (input.reviewerA.batchManifestHash !== input.reviewerB.batchManifestHash
    || input.reviewerA.sourceSetHash !== input.reviewerB.sourceSetHash
    || input.reviewerA.assignmentAttestationHash !== input.reviewerB.assignmentAttestationHash
    || canonicalHash(input.reviewerA.assignmentSet) !== canonicalHash(input.reviewerB.assignmentSet)
    || !safeHmacEqual(input.reviewerA.assignmentAttestationHash, hmac(attestationSecret, input.reviewerA.assignmentSet))) scientificV2Error('SCIENTIFIC_V2_REVIEW_BINDING_MISMATCH')
  if (input.reviewerA.role !== 'A' || input.reviewerB.role !== 'B' || input.reviewerA.items.length === 0
    || !verifyValidatedReviewerResult(input.reviewerA, attestationSecret)
    || !verifyValidatedReviewerResult(input.reviewerB, attestationSecret)) {
    scientificV2Error('SCIENTIFIC_V2_REVIEW_RESULT_TAMPERED')
  }
  const byB = new Map(input.reviewerB.items.map((item) => [item.itemHash, item]))
  if (byB.size !== input.reviewerA.items.length) scientificV2Error('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
  const disputes: Array<{ itemHash: string; applicableAxes: ScientificBenchmarkAxis[]; reasons: string[] }> = []
  const provisional: Array<{
    itemHash: string
    applicableAxes: ScientificBenchmarkAxis[]
    scores: ScoreMap
    redLines: string[]
    resolution: 'pending_arbitration' | 'ab_mean' | 'xhigh_arbitration'
  }> = input.reviewerA.items.map((left) => {
    const right = byB.get(left.itemHash)
    if (!right || canonicalHash(left.applicableAxes) !== canonicalHash(right.applicableAxes)) scientificV2Error('SCIENTIFIC_V2_REVIEW_RESULT_SET_INVALID')
    const reasons: string[] = []
    if (left.applicableAxes.some((axis) => Math.abs(left.scores[axis]! - right.scores[axis]!) > 2)) reasons.push('score_gap_gt_2')
    if (!sameStringSet(left.redLines, right.redLines)) reasons.push('red_line_conflict')
    if (left.lowConfidence || right.lowConfidence) reasons.push('low_confidence')
    if (reasons.length) disputes.push({ itemHash: left.itemHash, applicableAxes: [...left.applicableAxes], reasons })
    return {
      itemHash: left.itemHash,
      applicableAxes: [...left.applicableAxes],
      scores: Object.fromEntries(left.applicableAxes.map((axis) => [axis, (left.scores[axis]! + right.scores[axis]!) / 2])) as ScoreMap,
      redLines: [...new Set([...left.redLines, ...right.redLines])].sort(compareScientificIdentifiers),
      resolution: reasons.length ? 'pending_arbitration' as const : 'ab_mean' as const,
    }
  })

  let arbitrationHash: string | null = null
  let canFinalize = disputes.length === 0
  if (input.arbitration !== undefined) {
    assertExactScientificV2Keys(input.arbitration, ['reasoningEffort', 'results'], 'SCIENTIFIC_V2_ARBITRATION_SCHEMA_INVALID')
    if (input.arbitration.reasoningEffort !== 'xhigh' || !Array.isArray(input.arbitration.results)
      || input.arbitration.results.length !== disputes.length || disputes.length === 0) scientificV2Error('SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
    const disputed = new Map(disputes.map((item) => [item.itemHash, item]))
    const seen = new Set<string>()
    for (const result of input.arbitration.results) {
      assertExactScientificV2Keys(result, ['itemHash', 'scores', 'redLines'], 'SCIENTIFIC_V2_ARBITRATION_SCHEMA_INVALID')
      const dispute = disputed.get(result.itemHash as string)
      if (!dispute || seen.has(dispute.itemHash)) scientificV2Error('SCIENTIFIC_V2_ARBITRATION_SET_INVALID')
      seen.add(dispute.itemHash)
      const final = provisional.find((item) => item.itemHash === dispute.itemHash)!
      final.scores = normalizeScores(result.scores, dispute.applicableAxes)
      final.redLines = normalizeRedLines(result.redLines)
      final.resolution = 'xhigh_arbitration'
    }
    arbitrationHash = canonicalHash(input.arbitration)
    canFinalize = true
  }
  const results = provisional.sort((a, b) => compareScientificIdentifiers(a.itemHash, b.itemHash))
  const attestationBase = {
    schemaVersion: 2 as const,
    reviewProtocol: SCIENTIFIC_BENCHMARK_IDENTITY.reviewProtocol,
    canFinalize,
    automaticJudgeCalls: 0 as const,
    reviewerAHash: input.reviewerA.resultHash,
    reviewerBHash: input.reviewerB.resultHash,
    resultsHash: canonicalHash(results),
    disputeCount: disputes.length,
    arbitrationHash,
  }
  const attestation = deepFreezeScientificV2({ ...attestationBase, attestationHash: hmac(attestationSecret, attestationBase) })
  return deepFreezeScientificV2({ canFinalize, disputes, results, attestation })
}

export function verifyScientificReviewIntegrityAttestation(attestation: unknown, attestationSecret: string) {
  try {
    assertAttestationSecret(attestationSecret)
    assertExactScientificV2Keys(attestation, [
      'schemaVersion', 'reviewProtocol', 'canFinalize', 'automaticJudgeCalls', 'reviewerAHash', 'reviewerBHash',
      'resultsHash', 'disputeCount', 'arbitrationHash', 'attestationHash',
    ], 'SCIENTIFIC_V2_REVIEW_ATTESTATION_INVALID')
    const { attestationHash, ...base } = attestation
    return attestation.schemaVersion === 2
      && attestation.reviewProtocol === SCIENTIFIC_BENCHMARK_IDENTITY.reviewProtocol
      && attestation.automaticJudgeCalls === 0
      && typeof attestation.canFinalize === 'boolean'
      && Number.isInteger(attestation.disputeCount)
      && isScientificV2Hash(attestation.reviewerAHash)
      && isScientificV2Hash(attestation.reviewerBHash)
      && isScientificV2Hash(attestation.resultsHash)
      && (attestation.arbitrationHash === null || isScientificV2Hash(attestation.arbitrationHash))
      && safeHmacEqual(attestationHash, hmac(attestationSecret, base))
  } catch {
    return false
  }
}
