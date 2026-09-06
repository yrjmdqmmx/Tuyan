import { canonicalHash, SCIENTIFIC_BENCHMARK_IDENTITY, PB_SCIENTIFIC_FIGURE_V2 } from '@paperbanana/benchmark-core'

type AnyRecord = Record<string, any>
const hashPattern = /^[a-f0-9]{64}$/

function fail(code: string): never { throw new Error(`SCIENTIFIC_V2_EXPANSION_${code}`) }

export function assertScientificV2ExpansionDescriptor(value: unknown): asserts value is AnyRecord {
  const exact = (item: any, keys: string[]) => item && typeof item === 'object' && !Array.isArray(item)
    && canonicalHash(Object.keys(item).sort()) === canonicalHash(keys.sort())
  if (!exact(value, ['schemaVersion', 'kind', 'baseline', 'targetModelId'])) fail('SCHEMA_INVALID')
  const expansion = value as AnyRecord
  if (expansion.schemaVersion !== 1 || expansion.kind !== 'single_model_expansion'
    || typeof expansion.targetModelId !== 'string' || !expansion.targetModelId || expansion.targetModelId.length > 200
    || expansion.targetModelId.startsWith('codex:')
    || !exact(expansion.baseline, ['releaseId', 'releaseHash', 'batchId', 'manifestHash'])) fail('SCHEMA_INVALID')
  const baseline = expansion.baseline
  if (![baseline.releaseHash, baseline.manifestHash].every((value) => typeof value === 'string' && hashPattern.test(value))
    || typeof baseline.releaseId !== 'string' || !baseline.releaseId || baseline.releaseId.length > 200
    || typeof baseline.batchId !== 'string' || !baseline.batchId || baseline.batchId.length > 200) fail('SCHEMA_INVALID')
}

/** Validate the immutable source release without rewriting any historical evaluation or provenance. */
export function assertScientificV2ExpansionBaseline(expansion: AnyRecord, release: AnyRecord | null) {
  assertScientificV2ExpansionDescriptor(expansion)
  if (!release) fail('BASELINE_INVALID')
  const { _id, releaseHash, ...base } = release
  if (_id !== expansion.baseline.releaseId || releaseHash !== expansion.baseline.releaseHash
    || release.batchId !== expansion.baseline.batchId || release.batchManifestHash !== expansion.baseline.manifestHash
    || canonicalHash(base) !== releaseHash || release.profileStatus !== 'published'
    || Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY).some(([key, value]) => release[key] !== value)
    || release.suiteHash !== PB_SCIENTIFIC_FIGURE_V2.manifestHash
    || !Array.isArray(release.models) || release.models.length < 1 || release.models.length > 256) fail('BASELINE_INVALID')
  const ids = release.models.map((model: AnyRecord) => model.canonicalModelId)
  if (new Set(ids).size !== ids.length || ids.some((id: unknown) => typeof id !== 'string' || !id)
    || ids.includes(expansion.targetModelId)) fail('TARGET_NOT_NEW')
  for (const model of release.models) {
    if (!Array.isArray(model.evidence) || model.evidence.length !== 9
      || canonicalHash(model.evidence.map((item: AnyRecord) => item.caseId).sort())
        !== canonicalHash(PB_SCIENTIFIC_FIGURE_V2.cases.map((item) => item.id).sort())) fail('BASELINE_INVALID')
  }
  return release
}

/** Rankings and the explicitly derived row identity are the only permitted inherited changes. */
export function scientificV2ExpansionPreservedModelHash(model: AnyRecord) {
  const { overallRank: _overallRank, dimensionRanks: _dimensionRanks, ...preserved } = model
  return canonicalHash(preserved)
}

export function assertScientificV2ExpansionPreservedModels(baseline: AnyRecord, models: AnyRecord[], targetModelId: string) {
  if (models.length !== baseline.models.length + 1
    || models.filter((model) => model.canonicalModelId === targetModelId).length !== 1) fail('ROSTER_INVALID')
  for (const prior of baseline.models) {
    const inherited = models.filter((model) => model.canonicalModelId === prior.canonicalModelId)
    if (inherited.length !== 1 || scientificV2ExpansionPreservedModelHash(inherited[0]) !== scientificV2ExpansionPreservedModelHash(prior)) {
      fail('BASELINE_DRIFT')
    }
  }
}
