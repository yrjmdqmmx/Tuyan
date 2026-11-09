export function displayModalities(values: string[]): string[]
export function displayModalityText(value: string): string
export function sourceTitle(value: string, model?: {id?: string; label?: string; displayName?: string}): string
export function titleSourceRows<T extends {url: string; label: string}>(rows: T[], model?: {id?: string; label?: string; displayName?: string}): T[]
export interface ModalityIcon { id: string; label: string; state: string; detail: string; accessibleLabel: string; tooltip: string }
export function modalityIconStates(value: string, fact?: object, provider?: string, modelId?: string): ModalityIcon[]
