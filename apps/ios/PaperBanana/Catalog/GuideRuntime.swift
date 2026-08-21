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
    let modeTitle = draft.configurationMode == .simple ? "普通模式" : "专业模式"
    if let routes {
      routeSummary = "\(modeTitle)：主 \(Self.routeLabel(routes.main)) · 图 \(Self.routeLabel(routes.image)) · 识 \(Self.routeLabel(routes.vision))"
    } else {
      routeSummary = "\(modeTitle)：服务端路线不可用"
    }
  }

  private static func routeLabel(_ route: ModelRoute) -> String { "\(route.accessProvider.rawValue)/\(route.modelId)" }
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

  /// Every preset uses the current live provider's authoritative server defaults.
  /// It never preserves a stale custom route or picks a client-side recommendation.
  static func apply(_ preset: GuidePreset, to draft: inout GenerationDraft, registry: ModelRegistry?, hasLiveRegistry: Bool) -> Result {
    guard hasLiveRegistry, let registry else { return .directoryUnavailable }
    guard let provider = currentLiveProvider(for: draft, registry: registry),
          let routes = registry.defaultRoutes(for: provider),
          routesAreLiveAndSelectable(routes, registry: registry) else { return .noCompatibleRoutes }

    draft.configurationMode = .simple
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

  private static func currentLiveProvider(for draft: GenerationDraft, registry: ModelRegistry) -> ProviderID? {
    let provider = draft.configurationMode == .advanced ? draft.modelRoutes?.main.accessProvider : draft.provider
    guard let provider, registry.providers[provider] != nil else { return nil }
    return provider
  }

  private static func routesAreLiveAndSelectable(_ routes: ModelRoutes, registry: ModelRegistry) -> Bool {
    [ModelRole.main, .image, .vision].allSatisfy { role in
      guard let route = routes[role], let model = registry.model(for: route) else { return false }
      return model.selectable && model.roles.contains(role)
    }
  }
}
