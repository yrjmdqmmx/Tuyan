/** Optional v1 settings. Missing means the historical request behavior. */
export type ThinkingOptions = Record<string, string | number | boolean>
export type ThinkingSelection = {
  provider: string; modelId: string; protocol: string; region?: string; options: ThinkingOptions
}
export type ThinkingConfiguration = { version: 1; roles: Partial<Record<'main' | 'vision' | 'image', ThinkingSelection>> }
export type ThinkingSnapshotRole = ThinkingSelection & {
  role: 'main' | 'vision' | 'image'; profileId: string; checkedAt: string;
  wire: Record<string, unknown>; clearFields: string[]; dropSampling: boolean;
  budgetRelation?: string; budgetField?: string; budgetOutputField?: string;
  samplingFields?: string[]; operations?: string[]; requiresNoInputImages?: boolean; requiresNonSequentialGeneration?: boolean;
  endpointAliases?: string[]; pinnedSchemaVersion?: string
}
export type ThinkingSnapshot = { version: 1; roles: Partial<Record<'main' | 'vision' | 'image', ThinkingSnapshotRole>> }
