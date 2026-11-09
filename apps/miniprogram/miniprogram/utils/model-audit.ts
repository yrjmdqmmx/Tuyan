// Generated from packages/api/src/model-audit.ts
const MODEL_AUDIT_DATA = require('./model-audit-data.js')

export interface AuditFact {
  value: string[] | number | null
  state: 'known' | 'unknown' | 'unsupported' | 'not-applicable'
  provenance: 'channel' | 'vendor' | null
  sourceUrl: string | null
  verifiedAt: string | null
}
export function auditedModelSpecs(channel: string, id: string) {
  const row = MODEL_AUDIT_DATA.rows[channel + '/' + id]
  const result: Record<string, AuditFact> = {}
  MODEL_AUDIT_DATA.fields.forEach((field: string, index: number) => {
    const fact = row ? MODEL_AUDIT_DATA.facts[row[index]] : [null, 'unknown', null, null]
    result[field] = { value: fact[0], state: fact[1], provenance: fact[2], sourceUrl: fact[3] === null ? null : MODEL_AUDIT_DATA.sources[fact[3]], verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null }
  })
  return { fields: result, unverified: !row || row[4] === 1, verifiedAt: row ? MODEL_AUDIT_DATA.verifiedAt : null, sourceUrl: row && row[5] !== null ? MODEL_AUDIT_DATA.sources[row[5]] : null }
}

// Date-only notices take effect at the start of the stated UTC calendar day.
// Serverless notices apply only to the Fireworks adapter used by this product.
export function auditedModelLifecycle(channel: string, id: string, now = Date.now()) {
  const notice = MODEL_AUDIT_DATA.notices[channel + '/' + String(id).trim()]
  if (!notice || notice.scope === 'serverless' && channel !== 'fireworks') return null
  const elapsed = now >= Date.parse(notice.stopDate)
  const state = !elapsed ? 'scheduled' : notice.scope === 'full' ? 'retired' : 'channel-unavailable'
  const label = state === 'retired' ? '已下架' : state === 'channel-unavailable' ? '渠道不可用' : '将下线'
  // Some audit entries contain a family suggestion, not an exact replacement ID.
  const replacement = notice.replacement === 'Dep' ? null : notice.replacement?.replace(/^Dep -> /, '') || null
  return { ...notice, replacement, state, label, blocked: elapsed, message: `${state === 'scheduled' ? `将于${notice.stopDate.slice(0,10)}下线` : label}${replacement ? `；建议替换为 ${replacement}` : ''}` }
}

export function assertAuditedModelAvailable(channel: string, id: string, now = Date.now()) {
  const lifecycle = auditedModelLifecycle(channel, id, now)
  if (lifecycle?.blocked) throw Object.assign(new Error(`模型 ${id} ${lifecycle.message}。原配置已保留，请确认后切换。`), {
    businessCode: lifecycle.state === 'retired' ? 'MODEL_RETIRED' : 'MODEL_CHANNEL_UNAVAILABLE',
    code: lifecycle.state === 'retired' ? 'MODEL_RETIRED' : 'MODEL_CHANNEL_UNAVAILABLE',
    statusCode: 400, replacement: lifecycle.replacement, sourceUrl: lifecycle.sourceUrl,
    requestState: 'not_sent', localInputFailure: true, retryable: false,
  })
}

export function withModelAudit<T extends { id: string }>(channel: string, model: T, now = Date.now()) {
  const lifecycle = auditedModelLifecycle(channel, model.id, now)
  return { ...model, auditChannel: channel, auditSpecifications: auditedModelSpecs(channel, model.id), auditLifecycle: lifecycle,
    ...(lifecycle?.blocked ? { selectable: false, disabledReason: lifecycle.message } : {}) }
}

export function assertModelLibraryAdditions(next: any, previous: any, now = Date.now()) {
  for (const model of next.models || []) {
    const channel = next.connections?.find((item: any) => item.id === model.connectionId)?.provider
    const retained = previous?.models?.some((old: any) => old.id === model.id && old.connectionId === model.connectionId && old.modelId === model.modelId
      && previous.connections?.find((item: any) => item.id === old.connectionId)?.provider === channel)
    if (!retained) assertAuditedModelAvailable(channel, model.modelId, now)
  }
}
