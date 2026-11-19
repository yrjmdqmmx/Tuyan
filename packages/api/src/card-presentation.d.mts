export interface SourceModel { id?: string; label?: string; displayName?: string }
export const modalityOrder: string[]
export const conflictNote: string
export function fieldSourceLines(fields: Record<string, {state: string; provenance: string | null; verifiedAt?: string | null}>, checkedAt?: string | null, translate?: (value: string) => string): string[]
export function cardLifecycle<T extends { sourceUrl?: string | null }>(lifecycle: T | null | undefined, audit?: { lifecycleSourceUrl?: string | null; excludedSources?: string[] }): (T & { sourceUrl: string }) | null
export function displayModalities<T extends string>(values?: readonly T[]): T[]
export function displayModalityText(value: string): string
export function sourceIdentity(value: string): string
export function uniqueSources(values: string[]): string[]
export function sourceTitle(value: string, model?: SourceModel): string
export function humanSourceUrl(value: string): string
export function isMachineDocument(value: string): boolean
export function titleSourceRows<T extends { url: string; label: string }>(rows: T[], model?: SourceModel): Array<Omit<T, 'label'> & { label: string }>
