import type { AuditFact } from './model-audit.js'
export function registryCardProjection(channel: string, model: {id: string}, audit: {fields: Record<string, AuditFact>}, lifecycle: unknown, checks: unknown): {
  fields: Record<string, AuditFact>; sourceUrl: string | null; sourceLabel: string; note: string
}
