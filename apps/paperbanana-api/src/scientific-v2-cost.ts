import { canonicalHash } from '@paperbanana/benchmark-core'
import { SCIENTIFIC_V2_BILLING_EVIDENCE } from './scientific-v2-billing-evidence.js'

type Row = Record<string, any>
export type ScientificCost = {
  currency: 'USD' | 'CNY' | null
  amount: string | null
  basis: 'invoice_reconciled' | 'official_rate_calculated' | 'budget_estimate' | 'not_called' | 'unavailable'
  evidenceHash?: string
  verifiedAt?: string
}
const unavailable = (): ScientificCost => ({ currency: null, amount: null, basis: 'unavailable' })
const decimal = (value: number) => value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')

/** Cost is a read-time annotation. Immutable release scores and hashes never change. */
export function scientificEvidenceCost(row: Row, batch?: Row | null): ScientificCost {
  if (!batch || batch.status !== 'published' || batch.manifestHash !== batch.manifest?.manifestHash
    || batch.state?.manifestHash !== batch.manifestHash) return unavailable()
  const { stateHash, ...stateBase } = batch.state
  if (canonicalHash(stateBase) !== stateHash) return unavailable()
  const slots = batch.state.slots.filter((slot: Row) => slot.canonicalModelId === row.canonicalModelId && slot.caseId === row.caseId)
  if (slots.length !== 1) return unavailable()
  const slot = slots[0]
  if (batch.manifest.slotRetest && !batch.manifest.slotRetest.targetSlotIds.includes(slot.slotId)) return unavailable()
  if (slot.status !== row.status || slot.attempts.length !== row.attemptSummary?.count
    || canonicalHash(slot.attempts.map((attempt: Row) => attempt.responseClass)) !== canonicalHash(row.attemptSummary.responseClasses)
    || (slot.status === 'succeeded' && slot.attempts.at(-1)?.rawImageHash !== row.imageHash)) return unavailable()
  if (slot.provider === 'codex' || row.canonicalModelId.startsWith('codex:')) return unavailable()
  if (slot.attempts.length === 0) return { currency: null, amount: '0', basis: 'not_called' }
  const invoice = SCIENTIFIC_V2_BILLING_EVIDENCE.find(item => item.manifestHash === batch.manifestHash
    && item.modelId === row.canonicalModelId && item.caseId === row.caseId && item.imageHash === (row.imageHash ?? null)
    && item.imageHash === (slot.attempts.at(-1)?.rawImageHash ?? null)
    && item.attemptCount === slot.attempts.length)
  if (invoice) return { currency: invoice.currency, amount: invoice.amount, basis: 'invoice_reconciled', evidenceHash: invoice.evidenceHash, verifiedAt: invoice.verifiedAt }
  const prices = (batch.manifest.priceSnapshot?.entries || []).filter((entry: Row) => entry.provider === slot.provider
    && entry.modelId === slot.modelId && entry.operation === slot.operation && entry.imageSize === slot.imageSize)
  // Flat output tariffs can be calculated exactly for a single confirmed successful output.
  // Budget ceilings and failed/unknown calls must not be described as provider charges.
  if (slot.status === 'succeeded' && slot.attempts.length === 1 && prices.length === 1) {
    const price = prices[0]
    if (price.charges?.length === 1 && price.charges[0].billable === 'output_image'
      && price.charges[0].unit === 'image' && price.charges[0].quantityDecimal === '1'
      && ['USD', 'CNY'].includes(price.originalCurrency) && /^\d+(?:\.\d{1,8})?$/.test(price.charges[0].rateDecimal)) {
      return { currency: price.originalCurrency, amount: price.charges[0].rateDecimal, basis: 'official_rate_calculated', evidenceHash: price.entryHash }
    }
  }
  if (typeof slot.costCny === 'number' && Number.isFinite(slot.costCny) && slot.costCny >= 0 && slot.costCny <= 10000) {
    return { currency: 'CNY', amount: decimal(slot.costCny), basis: 'budget_estimate' }
  }
  return unavailable()
}

export function publicScientificCost(value: unknown): ScientificCost {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return unavailable()
  const row = value as Row
  if (row.basis === 'not_called' && row.amount === '0' && row.currency === null) return { currency: null, amount: '0', basis: 'not_called' }
  if (!['invoice_reconciled', 'official_rate_calculated', 'budget_estimate'].includes(row.basis)
    || !['USD', 'CNY'].includes(row.currency) || typeof row.amount !== 'string'
    || !/^\d+(?:\.\d{1,8})?$/.test(row.amount) || Number(row.amount) > 10000) return unavailable()
  if (row.basis !== 'budget_estimate' && !/^[a-f0-9]{64}$/.test(row.evidenceHash || '')) return unavailable()
  if (row.basis === 'invoice_reconciled' && (typeof row.verifiedAt !== 'string' || !Number.isFinite(Date.parse(row.verifiedAt)))) return unavailable()
  return { currency: row.currency, amount: row.amount, basis: row.basis,
    ...(row.basis !== 'budget_estimate' ? { evidenceHash: row.evidenceHash } : {}),
    ...(row.basis === 'invoice_reconciled' ? { verifiedAt: row.verifiedAt } : {}),
  }
}

export function scientificCostSummary(evidence: Row[]) {
  const costs = evidence.map(item => publicScientificCost(item.cost))
  const units = (amount: string) => BigInt(amount.split('.')[0]) * 100000000n + BigInt((amount.split('.')[1] || '').padEnd(8, '0'))
  const amount = (atoms: bigint) => `${atoms / 100000000n}.${(atoms % 100000000n).toString().padStart(8, '0')}`.replace(/0+$/, '').replace(/\.$/, '')
  return {
    scope: 'image_generation_and_editing' as const,
    caseCount: evidence.length,
    knownCaseCount: costs.filter(cost => cost.amount !== null).length,
    billedCaseCount: costs.filter(cost => cost.basis === 'invoice_reconciled').length,
    totals: (['USD', 'CNY'] as const).flatMap(currency => {
      const rows = costs.filter(cost => cost.currency === currency && cost.amount !== null)
      if (!rows.length) return []
      const sum = (basis?: string) => amount(rows.filter(row => !basis || row.basis === basis).reduce((n, row) => n + units(row.amount!), 0n))
      return [{ currency, amount: sum(), billedAmount: sum('invoice_reconciled'), calculatedAmount: sum('official_rate_calculated'), budgetAmount: sum('budget_estimate') }]
    }),
  }
}
