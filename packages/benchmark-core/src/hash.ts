import { createHash } from 'node:crypto'

function normalize(value: unknown): unknown {
  if (value === undefined) return null
  if (Array.isArray(value)) return value.map(normalize)
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('INVALID_CANONICAL_DATE')
    return value.toISOString()
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) throw new Error('UNSUPPORTED_CANONICAL_OBJECT')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)]),
    )
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('NON_FINITE_CANONICAL_VALUE')
  return value
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(normalize(value))
}

export function canonicalHash(value: unknown) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex')
}

export function benchmarkImmutableRunBinding(input: {
  runHash: string
  runFacts: Record<string, unknown>
  candidateSnapshot: Record<string, unknown>
  runIntegrityAttestation: string
}) {
  const immutableFacts = {
    runHash: String(input.runHash || ''),
    runFacts: input.runFacts,
    candidateSnapshot: input.candidateSnapshot,
    runIntegrityAttestation: String(input.runIntegrityAttestation || ''),
  }
  const aspectRatios = Array.isArray(input.runFacts?.aspectRatios) ? input.runFacts.aspectRatios : []
  return Object.freeze({
    immutableFacts: Object.freeze(immutableFacts),
    immutableFactsHash: canonicalHash(immutableFacts),
    runHash: immutableFacts.runHash,
    runFactsHash: canonicalHash(input.runFacts),
    candidateSnapshotHash: canonicalHash(input.candidateSnapshot),
    aspectRatiosHash: canonicalHash(aspectRatios),
    registryHash: String(input.runFacts?.registryHash || ''),
    runIntegrityAttestation: immutableFacts.runIntegrityAttestation,
  })
}
