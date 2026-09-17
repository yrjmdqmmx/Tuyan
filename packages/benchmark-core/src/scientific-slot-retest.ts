import { canonicalHash } from './hash.js'

export interface ScientificSlotRetest {
  schemaVersion: 1
  kind: 'confirmed_failure_slot_retest'
  source: { releaseId: string; releaseHash: string; batchId: string; manifestHash: string }
  targetModelId: string
  targetSlotIds: string[]
  targetSlotSetHash: string
}

/** A new, explicit operator run; never relaxes the provider's per-run attempt limit. */
export function assertScientificSlotRetest(manifest: any): void {
  const value = manifest.slotRetest
  if (value === undefined) return
  const fail = () => { throw new Error('SCIENTIFIC_V2_SLOT_RETEST_INVALID') }
  const exact = (item: any, keys: string[]) => item && typeof item === 'object' && !Array.isArray(item)
    && canonicalHash(Object.keys(item).sort()) === canonicalHash(keys.sort())
  if (!exact(value, ['schemaVersion', 'kind', 'source', 'targetModelId', 'targetSlotIds', 'targetSlotSetHash'])
    || value.schemaVersion !== 1 || value.kind !== 'confirmed_failure_slot_retest'
    || !exact(value.source, ['releaseId', 'releaseHash', 'batchId', 'manifestHash'])
    || ![value.source.releaseHash, value.source.manifestHash].every(x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x))
    || ![value.source.releaseId, value.source.batchId].every(x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/.test(x))
    || !manifest.expansion || value.targetModelId !== manifest.expansion.targetModelId
    || manifest.models.length !== 1 || manifest.models[0].canonicalModelId !== value.targetModelId
    || !Array.isArray(value.targetSlotIds) || value.targetSlotIds.length !== 1
    || value.targetSlotSetHash !== canonicalHash(value.targetSlotIds)
    || !manifest.executionOrder.some((slot: any) => slot.slotId === value.targetSlotIds[0]
      && slot.canonicalModelId === value.targetModelId && slot.provider === 'replicate' && !slot.isProviderCanary)) fail()
}

export function scientificSlotNeedsFreshEvidence(manifest: any, slot: Record<string, any>): boolean {
  return !manifest.slotRetest || manifest.slotRetest.targetSlotIds.includes(slot.slotId)
}
