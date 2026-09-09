type DiscoveryModel = { id: string; supported_protocols: string[]; description?: string; context_length?: number }
export function compareTokenDanceCatalog(approved: { models: DiscoveryModel[] }, live: { data: DiscoveryModel[] }): {
  newModels: string[]; retiredModels: string[]; protocolChanges: string[]; metadataReview: string[]; liveCount: number
}
