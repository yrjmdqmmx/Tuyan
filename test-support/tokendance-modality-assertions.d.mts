export const tokenDanceSnapshot: { sourceUrl: string; data: any[]; portal: Record<string, any> }
export const tokenDanceBefore: { rows: { id: string }[] }
export function assertTokenDanceFacts(resolve: (id: string) => { fields: Record<string, any> }): void
