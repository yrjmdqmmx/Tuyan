import { MODEL_AUDIT_DATA } from './model-audit-data.js'

export interface AuditFact {
  value: string[] | number | null
  state: 'known' | 'unknown' | 'unsupported' | 'not-applicable'
  provenance: 'channel' | 'vendor' | null
  sourceUrl: string | null
  verifiedAt: string | null
  unknownModalities?: string[]
}
export function auditedModelSpecs(channel: string, id: string) {
  const row = MODEL_AUDIT_DATA.rows[channel + '/' + id]
  const result: Record<string, AuditFact> = {}
  MODEL_AUDIT_DATA.fields.forEach((field: string, index: number) => {
    const fact = row ? MODEL_AUDIT_DATA.facts[row[index]] : [null, 'unknown', null, null]
    result[field] = { value: fact[0], state: fact[1], provenance: fact[2], sourceUrl: fact[3] === null ? null : MODEL_AUDIT_DATA.sources[fact[3]], verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null }
  })
  const details = MODEL_AUDIT_DATA.details?.[channel + '/' + id]
  if (details?.unknownInputModalities) result.inputModalities.unknownModalities = details.unknownInputModalities
  return { fields: result, unverified: !row || row[4] === 1, verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null, sourceUrl: row && row[5] !== null ? MODEL_AUDIT_DATA.sources[row[5]] : null, sourceUrls: details?.sourceUrls || [], note: details?.note || '' }
}

// Tombstones preserve exact identities for messages and explicit replacement choices, never catalog entries.
export function removedModel(channel: string, id: string, now = Date.now()) {
  const key = channel + '/' + String(id).trim()
  const removed = MODEL_AUDIT_DATA.removed?.[key]
  if (removed) return removed as { stopDate: string; replacementApiId: string | null; sourceUrl: string }
  const notice = MODEL_AUDIT_DATA.notices[key]
  return notice && now >= Date.parse(notice.stopDate)
    ? { stopDate: notice.stopDate, replacementApiId: notice.replacement, sourceUrl: notice.sourceUrl } : null
}

export function removedModelHint(channel: string, id: string, now = Date.now()) {
  const removed = removedModel(channel, id, now)
  return removed ? `原型号 ${id} 已不可用${removed.replacementApiId ? `，可改选 ${removed.replacementApiId}` : '，请重新选择'}` : ''
}

// Date-only notices take effect at the start of the stated UTC calendar day.
// Serverless notices apply only to the Fireworks adapter used by this product.
export function auditedModelLifecycle(channel: string, id: string, now = Date.now()) {
  const notice = MODEL_AUDIT_DATA.notices[channel + '/' + String(id).trim()]
  if (!notice || notice.scope === 'serverless' && channel !== 'fireworks') return null
  const elapsed = now >= Date.parse(notice.stopDate)
  if (elapsed) return null
  const replacement = notice.replacement || null
  const stopLabel = notice.stopDate.includes('T') ? notice.stopDate.replace('T', ' ').replace(':00+08:00', ' (UTC+8)') : notice.stopDate
  return { ...notice, replacement, state: 'scheduled', label: '将下线', blocked: false, message: `将于${stopLabel}下线${replacement ? `；可改选 ${replacement}` : ''}` }
}

export function assertAuditedModelAvailable(channel: string, id: string, now = Date.now()) {
  const removed = removedModel(channel, id, now)
  if (removed) throw Object.assign(new Error(`模型 ${id}：${removedModelHint(channel, id, now)}。`), {
    businessCode: 'MODEL_UNAVAILABLE', code: 'MODEL_UNAVAILABLE',
    statusCode: 400, replacement: removed.replacementApiId, sourceUrl: removed.sourceUrl,
    requestState: 'not_sent', localInputFailure: true, retryable: false,
  })
}

export function withModelAudit<T extends { id: string }>(channel: string, model: T, now = Date.now()) {
  const lifecycle = auditedModelLifecycle(channel, model.id, now)
  return { ...model, auditChannel: channel, auditSpecifications: auditedModelSpecs(channel, model.id), auditLifecycle: lifecycle,
    ...(removedModel(channel, model.id, now) ? { selectable: false, disabledReason: removedModelHint(channel, model.id, now) } : {}) }
}

export function assertModelLibraryAdditions(next: any, previous: any, now = Date.now()) {
  for (const model of next.models || []) {
    const channel = next.connections?.find((item: any) => item.id === model.connectionId)?.provider
    const retained = previous?.models?.some((old: any) => old.id === model.id && old.connectionId === model.connectionId && old.modelId === model.modelId
      && previous.connections?.find((item: any) => item.id === old.connectionId)?.provider === channel)
    if (!retained) assertAuditedModelAvailable(channel, model.modelId, now)
  }
}
