type DiscoveryModel = { id: string; supported_protocols: string[]; name?: string; description?: string; context_length?: number }
type ApprovedModel = DiscoveryModel & { roles: string[]; selectedProtocol: string | null }
type CatalogDiff = {
  newModels: string[]; missingModels: string[]; protocolChanges: string[]; metadataReview: string[]; liveCount: number
}
type DriftReview = { missingModels: { id: string; roles: string[]; selectedProtocol: string; reviewedAt: string; sourceUrl: string; reason: string }[] }
type DriftReport = CatalogDiff & {
  checkedAt: string; status: 'ok' | 'review' | 'critical';
  critical: { newMissingModels: string[]; selectedProtocolMissing: string[]; contextReductions: string[] };
  knownMissingModels: string[]; unusedMissingModels: string[]; recoveredModels: string[];
  autoPromotions: string[]; policy: string;
}
type FailedReport = { checkedAt: string; status: 'error'; error: string }
export function compareTokenDanceCatalog(approved: { models: DiscoveryModel[] }, live: { data: DiscoveryModel[] }): CatalogDiff
export function buildTokenDanceDriftReport(approved: { models: ApprovedModel[] }, live: { data: DiscoveryModel[] }, review?: DriftReview): DriftReport
export function fetchTokenDanceCatalog(approved: { apiSource: string; appUrl: string }, fetcher?: typeof fetch): Promise<{ data: DiscoveryModel[] }>
export function tokenDanceDriftExitCode(report: DriftReport | FailedReport, strict?: boolean): 0 | 1 | 2
export function formatTokenDanceDriftSummary(report: DriftReport | FailedReport): string
