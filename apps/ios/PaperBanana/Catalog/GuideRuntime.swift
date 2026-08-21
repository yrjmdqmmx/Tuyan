import Foundation

/// Presentation state is deliberately derived from the in-session registry.
/// A disk cache may be useful to display, but never claims it authorizes work.
struct GuideRuntimeSummary: Equatable {
  let isAvailable: Bool
  let statusText: String
  let registryVersion: String
  let routeContractVersion: Int?
  let providers: [ProviderID]
  let routeSummary: String

  init(registry: ModelRegistry?, hasLiveRegistry: Bool, draft: GenerationDraft) {
    guard hasLiveRegistry, let registry else {
      isAvailable = false
      statusText = "目录不可用，新任务已禁用"
      registryVersion = "—"
      routeContractVersion = nil
      providers = []
      routeSummary = "等待 live registry"
      return
    }

    isAvailable = true
    statusText = "live registry 已连接"
    registryVersion = registry.registryVersion
    routeContractVersion = registry.routeContractVersion
    providers = registry.orderedProviders
    let routes = draft.configurationMode == .advanced ? draft.modelRoutes : registry.defaultRoutes(for: draft.provider)
    if draft.configurationMode == .simple {
      routeSummary = "普通模式：\(ProviderCatalog.config(for: draft.provider).label) · 服务端三路默认"
    } else if let routes {
      routeSummary = "专业模式：主 \(routes.main.modelId) · 图 \(routes.image.modelId) · 识 \(routes.vision.modelId)"
    } else {
      routeSummary = "专业模式：等待服务端路由"
    }
  }
}

enum GuidePreset: String, CaseIterable, Identifiable {
  case budget
  case balanced
  case quality

  enum Result: Equatable {
    case applied
    case directoryUnavailable
    case noCompatibleRoutes
  }

  var id: String { rawValue }

  var title: String {
    switch self {
    case .budget: "省成本"
    case .balanced: "均衡推荐"
    case .quality: "高质量"
    }
  }

  var detail: String {
    switch self {
    case .budget: "基础生成 · 1 候选 · 0 评审 · 不检索"
    case .balanced: "规划器 + 评审器 · 2K 优先"
    case .quality: "完整流程 · 3 候选 · 2 轮评审"
    }
  }

  /// Never synthesizes a model id: only live, selectable registry entries are
  /// eligible. If a role cannot be selected, the caller leaves the draft intact.
  static func apply(_ preset: GuidePreset, to draft: inout GenerationDraft, registry: ModelRegistry?, hasLiveRegistry: Bool) -> Result {
    guard hasLiveRegistry, let registry else { return .directoryUnavailable }
    guard let provider = selectedProvider(for: draft, registry: registry) else { return .noCompatibleRoutes }
    let routes: ModelRoutes?
    if preset == .budget {
      // The registry has no latency or price signal. Keep the user's live
      // routes when valid; retired routes fall back to current provider defaults
      // rather than pretending a different model is cheaper.
      if let current = draft.modelRoutes, routesAreLiveAndSelectable(current, registry: registry) {
        routes = current
      } else {
        routes = registry.defaultRoutes(for: provider)
      }
    } else {
      routes = selectedRoutes(for: provider, registry: registry)
    }
    guard let routes else { return .noCompatibleRoutes }

    draft.configurationMode = .advanced
    draft.provider = provider
    draft.modelRoutes = routes
    draft.mainModelName = routes.main.modelId
    draft.imageModelName = routes.image.modelId
    draft.referenceVisionModelName = routes.vision.modelId
    draft.aspectRatio = "auto"
    draft.manualReferenceIds = []

    let resolutions = registry.model(for: routes.image)?.capabilities.resolutions ?? []
    switch preset {
    case .budget:
      draft.pipelineMode = .vanilla
      draft.numCandidates = 1
      draft.maxCriticRounds = 0
      draft.retrievalSetting = .none
      draft.imageSize = resolutions.contains(.oneK) ? .oneK : (resolutions.first ?? draft.imageSize)
    case .balanced:
      draft.pipelineMode = .plannerCritic
      draft.numCandidates = 1
      draft.maxCriticRounds = 1
      draft.retrievalSetting = .auto
      draft.imageSize = resolutions.contains(.twoK) ? .twoK : (resolutions.first ?? draft.imageSize)
    case .quality:
      draft.pipelineMode = .full
      draft.numCandidates = 3
      draft.maxCriticRounds = 2
      draft.retrievalSetting = .auto
      draft.imageSize = resolutions.last ?? draft.imageSize
    }
    return .applied
  }

  private static func selectedProvider(for draft: GenerationDraft, registry: ModelRegistry) -> ProviderID? {
    registry.providers[draft.provider] == nil ? registry.orderedProviders.first : draft.provider
  }

  private static func selectedRoutes(for provider: ProviderID, registry: ModelRegistry) -> ModelRoutes? {
    guard let main = preferredRoute(provider: provider, role: .main, registry: registry),
          let image = preferredRoute(provider: provider, role: .image, registry: registry),
          let vision = preferredRoute(provider: provider, role: .vision, registry: registry) else { return nil }
    return ModelRoutes(main: main, image: image, vision: vision)
  }

  private static func routesAreLiveAndSelectable(_ routes: ModelRoutes, registry: ModelRegistry) -> Bool {
    [ModelRole.main, .image, .vision].allSatisfy { role in
      guard let route = routes[role], let model = registry.model(for: route) else { return false }
      return model.selectable && model.roles.contains(role)
    }
  }

  private static func preferredRoute(provider: ProviderID, role: ModelRole, registry: ModelRegistry) -> ModelRoute? {
    let candidates = registry.models(for: provider, role: role)
    let model = candidates.first { $0.selectable && $0.lifecycle == "stable" && $0.recommended }
      ?? candidates.first { $0.selectable && $0.lifecycle == "stable" }
      ?? candidates.first { $0.selectable && $0.recommended }
      ?? candidates.first
    return model.map { ModelRoute(accessProvider: provider, modelId: $0.id) }
  }
}
