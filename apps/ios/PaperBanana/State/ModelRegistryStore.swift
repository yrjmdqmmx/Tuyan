import Foundation
import Observation

/// The cached registry is intentionally display-only: only a successful
/// in-session fetch is allowed to authorize new paid work.
@Observable
@MainActor
final class ModelRegistryStore {
  private(set) var registry: ModelRegistry?
  private(set) var hasLiveRegistry = false
  private(set) var refreshError = ""
  private(set) var isRefreshing = false

  private let apiClient: PaperBananaAPIClient
  private let cacheURL: URL

  init(apiClient: PaperBananaAPIClient, cacheURL: URL? = nil) {
    self.apiClient = apiClient
    self.cacheURL = cacheURL ?? Self.defaultCacheURL()
    loadCache()
  }

  func refresh(apiBase: String) async {
    isRefreshing = true
    refreshError = ""
    defer { isRefreshing = false }
    do {
      let live = try await apiClient.modelRegistry(apiBase: apiBase)
      acceptLiveRegistry(live)
    } catch {
      // Preserve a stale visual catalog but keep fail-closed submission state.
      hasLiveRegistry = false
      refreshError = formatUserFacingError(error)
    }
  }

  func acceptCachedRegistry(_ registry: ModelRegistry) {
    self.registry = registry
    hasLiveRegistry = false
  }

  func acceptLiveRegistry(_ registry: ModelRegistry) {
    self.registry = registry
    hasLiveRegistry = true
    refreshError = ""
    persist(registry)
  }

  private func loadCache() {
    guard let data = try? Data(contentsOf: cacheURL),
          let cached = try? JSONDecoder().decode(ModelRegistry.self, from: data) else { return }
    acceptCachedRegistry(cached)
  }

  private func persist(_ registry: ModelRegistry) {
    do {
      try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
      try JSONEncoder().encode(registry).write(to: cacheURL, options: .atomic)
    } catch {
      // A cache failure must never invalidate an otherwise live registry.
    }
  }

  private static func defaultCacheURL() -> URL {
    let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
      ?? FileManager.default.temporaryDirectory
    return base.appendingPathComponent("PaperBanana", isDirectory: true).appendingPathComponent("model-registry.json")
  }
}
