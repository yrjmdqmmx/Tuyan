import Foundation

struct GenerationConfigurationSummary: Equatable {
  struct Route: Equatable, Identifiable {
    let role: ModelRole
    let provider: ProviderID
    let providerLabel: String
    let modelID: String
    let modelLabel: String

    var id: String { role.rawValue }
  }

  let routes: [Route]
  let pipeline: PipelineMode
  let retrieval: RetrievalSetting
  let candidates: Int
  let criticRounds: Int

  @MainActor
  init(store: GenerationStore) {
    let registry = store.registryStore.registry
    routes = [ModelRole.main, .image, .vision].compactMap { role in
      guard let route = store.route(for: role) else { return nil }
      return Route(
        role: role,
        provider: route.accessProvider,
        providerLabel: ProviderCatalog.config(for: route.accessProvider).label,
        modelID: route.modelId,
        modelLabel: registry?.model(for: route)?.label ?? route.modelId
      )
    }
    let effective = store.effectiveSubmissionConfiguration
    pipeline = effective.pipelineMode
    retrieval = effective.retrievalSetting
    candidates = effective.numCandidates
    criticRounds = effective.maxCriticRounds
  }
}

extension ModelRole {
  var displayTitle: String {
    switch self {
    case .main: "主模型"
    case .image: "生图模型"
    case .vision: "视觉模型"
    default: rawValue
    }
  }

  var systemImage: String {
    switch self {
    case .main: "brain.head.profile"
    case .image: "photo"
    case .vision: "eye"
    default: "questionmark.circle"
    }
  }
}

enum FeaturedTemplateAutoplayPolicy {
  static let interval: Duration = .seconds(3)

  static func shouldAdvance(reduceMotion: Bool, isInteracting: Bool, sceneIsActive: Bool) -> Bool {
    !reduceMotion && !isInteracting && sceneIsActive
  }
}

struct ModelRouteSelectionCatalog {
  let registry: ModelRegistry
  let role: ModelRole

  var providers: [ProviderID] {
    registry.orderedProviders.filter { !models(for: $0).isEmpty }
  }

  func vendors(for provider: ProviderID) -> [String] {
    models(for: provider).map(\.vendor).reduce(into: []) { vendors, vendor in
      let label = vendor.isEmpty ? "其他" : vendor
      if !vendors.contains(label) { vendors.append(label) }
    }
  }

  func models(for provider: ProviderID, vendor: String? = nil) -> [RegistryModel] {
    let roleModels = (registry.providers[provider]?.models ?? []).filter {
      $0.roles.contains(role) || $0.roleReasons[role] != nil
    }
    guard let vendor else { return roleModels }
    return roleModels.filter { ($0.vendor.isEmpty ? "其他" : $0.vendor) == vendor }
  }
}
