import { lstat, readFile } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { createHash } from 'node:crypto'

const fail = () => {
  process.stderr.write('BENCHMARK_PHASE_OPERATOR_ATTESTATION_MISMATCH\n')
  process.exitCode = 1
}

function required(name) {
  const value = String(process.env[name] || '')
  if (!value) throw new Error('invalid expected attestation')
  return value
}

function expectedNumber(name, integer = false, allowZero = false) {
  const raw = required(name)
  if (!/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,12})?$/.test(raw)) throw new Error('invalid expected number')
  const value = Number(raw)
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0) || (integer && !Number.isInteger(value))) throw new Error('invalid expected number')
  return value
}

async function main() {
  if (process.argv.length !== 3) throw new Error('invalid attestation path')
  const path = process.argv[2]
  const metadata = await lstat(path)
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size <= 1 || metadata.size > 32 * 1024) throw new Error('invalid attestation file')
  const actual = JSON.parse(await readFile(path, 'utf8'))
  const phase = required('PAPERBANANA_EXPECTED_PHASE')
  if (!['quick', 'full', 'standard'].includes(phase)) throw new Error('invalid phase')
  const immutableFacts = actual?.immutableFacts
  if (!immutableFacts || typeof immutableFacts !== 'object' || Array.isArray(immutableFacts)) throw new Error('missing immutable facts')
  const normalize = (value) => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, normalize(child)])) : value
  const hash = (value) => createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex')
  const runFacts = immutableFacts.runFacts
  const candidateSnapshot = immutableFacts.candidateSnapshot
  const expected = {
    schemaVersion: 2,
    runId: required('PAPERBANANA_EXPECTED_RUN_ID'),
    phase,
    state: `${phase}_running`,
    codeSha: required('PAPERBANANA_EXPECTED_CODE_SHA'),
    provider: required('PAPERBANANA_EXPECTED_PROVIDER'),
    modelId: required('PAPERBANANA_EXPECTED_MODEL_ID'),
    lane: required('PAPERBANANA_EXPECTED_LANE'),
    suiteId: required('PAPERBANANA_EXPECTED_SUITE_ID'),
    suiteHash: required('PAPERBANANA_EXPECTED_SUITE_HASH'),
    judgeEpoch: required('PAPERBANANA_EXPECTED_JUDGE_EPOCH'),
    judgeStackHash: required('PAPERBANANA_EXPECTED_JUDGE_STACK_HASH'),
    signedAuthorizationHash: required('PAPERBANANA_EXPECTED_SIGNED_AUTHORIZATION_HASH'),
    priceHash: required('PAPERBANANA_EXPECTED_PRICE_HASH'),
    immutableFacts,
    immutableFactsHash: required('PAPERBANANA_EXPECTED_IMMUTABLE_FACTS_HASH'),
    runHash: required('PAPERBANANA_EXPECTED_RUN_HASH'),
    runFactsHash: required('PAPERBANANA_EXPECTED_RUN_FACTS_HASH'),
    candidateSnapshotHash: required('PAPERBANANA_EXPECTED_CANDIDATE_SNAPSHOT_HASH'),
    aspectRatiosHash: required('PAPERBANANA_EXPECTED_ASPECT_RATIOS_HASH'),
    registryHash: required('PAPERBANANA_EXPECTED_REGISTRY_HASH'),
    runIntegrityAttestation: required('PAPERBANANA_EXPECTED_RUN_INTEGRITY_ATTESTATION'),
    maxGenerations: expectedNumber('PAPERBANANA_EXPECTED_MAX_GENERATIONS', true),
    maxJudgments: expectedNumber('PAPERBANANA_EXPECTED_MAX_JUDGMENTS', true, phase === 'standard'),
    maxJudgeCalls: expectedNumber('PAPERBANANA_EXPECTED_MAX_JUDGE_CALLS', true, phase === 'standard'),
    maxEstimatedUsd: expectedNumber('PAPERBANANA_EXPECTED_MAX_ESTIMATED_USD'),
    priceSnapshot: {
      currency: required('PAPERBANANA_EXPECTED_PRICE_CURRENCY'),
      source: required('PAPERBANANA_EXPECTED_PRICE_SOURCE'),
      estimatedPerGeneration: expectedNumber('PAPERBANANA_EXPECTED_GENERATION_USD'),
      estimatedPerJudgeCall: expectedNumber('PAPERBANANA_EXPECTED_JUDGE_USD', false, phase === 'standard'),
      capturedAt: required('PAPERBANANA_EXPECTED_PRICE_CAPTURED_AT'),
    },
  }
  if (hash(immutableFacts) !== expected.immutableFactsHash || hash(runFacts) !== expected.runFactsHash
    || hash(candidateSnapshot) !== expected.candidateSnapshotHash || hash(runFacts?.aspectRatios) !== expected.aspectRatiosHash
    || immutableFacts.runHash !== expected.runHash || immutableFacts.runIntegrityAttestation !== expected.runIntegrityAttestation
    || runFacts?.registryHash !== expected.registryHash || runFacts?.runId !== expected.runId || runFacts?.provider !== expected.provider
    || runFacts?.modelId !== expected.modelId || runFacts?.lane !== expected.lane || runFacts?.suiteId !== expected.suiteId
    || runFacts?.suiteHash !== expected.suiteHash || runFacts?.judgeEpoch !== expected.judgeEpoch || runFacts?.codeSha !== expected.codeSha) {
    throw new Error('immutable facts mismatch')
  }
  if (!isDeepStrictEqual(actual, expected)) throw new Error('attestation mismatch')
}

main().catch(fail)
