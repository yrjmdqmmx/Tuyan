import type { AuditFact } from './model-audit.js'
export function registryCardProjection(channel: string, model: {id: string}, audit: {fields: Record<string, AuditFact>; verifiedAt?: string | null; lifecycleSourceUrl?: string | null; excludedSources?: string[]}, lifecycle: unknown, checks: unknown): {
  fields: Record<string, AuditFact>; verifiedAt: string | null; sourceUrl: string | null; sourceLabel: string; note: string
  lifecycleSourceUrl: string | null; excludedSources: string[]; vendorSources: string[]; retirementSources: string[]
}
