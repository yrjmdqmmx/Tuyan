export interface SourceModel { id?: string; label?: string; displayName?: string }
export const modalityOrder: string[]
export function displayModalities<T extends string>(values?: readonly T[]): T[]
export function displayModalityText(value: string): string
export function sourceIdentity(value: string): string
export function uniqueSources(values: string[]): string[]
export function sourceTitle(value: string, model?: SourceModel): string
export function titleSourceRows<T extends { url: string; label: string }>(rows: T[], model?: SourceModel): Array<Omit<T, 'label'> & { label: string }>
