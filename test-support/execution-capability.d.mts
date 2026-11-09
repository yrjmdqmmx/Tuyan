export const fixturePath: string
export function coreProducts(commit?: string): Promise<{ core: any; registry: any; calls: string[] }>
export function coreDecisions(core: any, registry: any): Promise<Record<string, any>>
export function catalogDecisions(core: any, registry: any): Record<string, any>
export function executionRegistry(registry: any): Record<string, any>
export function webProducts(commit?: string): Promise<any>
