import Foundation
import Observation

/// 生成任务的草稿编辑、能力检查与提交。
@Observable
@MainActor
final class GenerationStore {
  struct EffectiveSubmissionConfiguration: Equatable {
    let pipelineMode: PipelineMode
    let retrievalSetting: RetrievalSetting
    let manualReferenceIDs: [String]
    let aspectRatio: String
    let numCandidates: Int
    let maxCriticRounds: Int
  }
  var draft = GenerationDraft()
  var selectedAPIKey = ""
  var mainModelCapability: ModelCapability?

  var isSubmitting = false
  var submitError = ""
  var arkProbeStatus = ""
  var arkProbeLoading = false
  private var verifiedArkRouteKeys = Set<String>()

  var referenceLibrary: [ReferenceLibraryItem] = []
  var referenceLibraryError = ""
  var referenceLibraryLoading = false
  var referenceUploadError = ""

  /// 错误弹窗（由 AppModel 注入的跨域门面）。
  /// 默认实现 debug 下断言提醒忘记接线（release 下仍是 no-op），避免错误静默丢失。
  @ObservationIgnored var presentAlert: (String) -> Void = { message in
    assertionFailure("presentAlert not wired: \(message)")
  }

  private let apiClient: PaperBananaAPIClient
  private let settings: SettingsStore
  private let jobs: JobsStore
  let registryStore: ModelRegistryStore
  private let keychain = KeychainService()
  private let referenceUploader: ReferenceUploader
  private static let referenceLibraryLimit = 100

  init(apiClient: PaperBananaAPIClient, settings: SettingsStore, jobs: JobsStore, registryStore: ModelRegistryStore? = nil) {
    self.apiClient = apiClient
    self.settings = settings
    self.jobs = jobs
    self.registryStore = registryStore ?? ModelRegistryStore(apiClient: apiClient)
    referenceUploader = ReferenceUploader(apiClient: apiClient)
    loadSelectedProviderKey()
  }

  // MARK: - 派生状态

  var selectedProviderConfig: ProviderConfig {
    ProviderCatalog.config(for: draft.provider)
  }

  var canSubmit: Bool {
    !isSubmitting
      && draft.methodContent.trimmingCharacters(in: .whitespacesAndNewlines).count >= 20
      && draft.caption.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3
      && hasRequiredManualReferences
      && hasRequiredReferenceVisionModel
      && !mainModelDirectUnsupported
      && registryStore.hasLiveRegistry
      && hasCompleteValidRoutes
      && hasRequiredProviderKeys
      && hasRequiredArkVerification
  }

  var activeMainModelName: String {
    activeRoutes?.main.modelId ?? draft.mainModelName
  }

  var activeImageModelName: String {
    activeRoutes?.image.modelId ?? draft.imageModelName
  }

  var activeVisionModelName: String {
    activeRoutes?.vision.modelId ?? draft.referenceVisionModelName
  }

  var activeReferenceImageMode: ReferenceImageMode? {
    guard !draft.referenceImages.isEmpty else { return nil }
    if draft.configurationMode == .advanced { return draft.referenceImageMode }
    return mainModelCanReadReferenceImages ? .mainModel : .visionModel
  }

  var mainModelCanReadReferenceImages: Bool {
    guard let route = activeRoutes?.main else { return false }
    return registryStore.registry?.mainModelCanReadReferenceImages(for: route) == true
  }

  var modelCapabilityQueryID: String {
    [
      settings.apiBase,
      draft.provider.rawValue,
      activeMainModelName,
      String(draft.referenceImages.count),
      settings.health?.runtime ?? ""
    ].joined(separator: "|")
  }

  var mainModelDirectUnsupported: Bool {
    !draft.referenceImages.isEmpty
      && activeReferenceImageMode == .mainModel
      && !mainModelCanReadReferenceImages
  }

  var needsReferenceVisionModel: Bool {
    !draft.referenceImages.isEmpty && activeReferenceImageMode != .mainModel
  }

  var hasRequiredReferenceVisionModel: Bool {
    !needsReferenceVisionModel || !activeVisionModelName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  var hasRequiredManualReferences: Bool {
    draft.configurationMode != .advanced
      || draft.retrievalSetting != .manual
      || !draft.referenceImages.isEmpty
      || !draft.manualReferenceIds.isEmpty
  }

  var activeRoutes: ModelRoutes? {
    guard let registry = registryStore.registry else { return draft.modelRoutes }
    if draft.configurationMode == .advanced { return draft.modelRoutes }
    return registry.defaultRoutes(for: draft.provider)
  }

  var liveProviders: [ProviderID] { registryStore.registry?.orderedProviders ?? [] }

  func models(for role: ModelRole, provider: ProviderID) -> [RegistryModel] {
    registryStore.registry?.models(for: provider, role: role) ?? []
  }

  func route(for role: ModelRole) -> ModelRoute? { activeRoutes?[role] }

  var generationResolutions: [ImageSize] {
    guard let route = activeRoutes?.image else { return [] }
    return registryStore.registry?.generationResolutions(for: route) ?? []
  }

  var generationAspectRatios: [String] {
    guard let route = activeRoutes?.image else { return [] }
    return registryStore.registry?.generationAspectRatios(for: route) ?? []
  }

  var effectiveSubmissionConfiguration: EffectiveSubmissionConfiguration {
    guard draft.configurationMode == .advanced else {
      return EffectiveSubmissionConfiguration(pipelineMode: .plannerCritic, retrievalSetting: .none, manualReferenceIDs: [], aspectRatio: "16:9", numCandidates: 1, maxCriticRounds: 1)
    }
    return EffectiveSubmissionConfiguration(pipelineMode: draft.pipelineMode, retrievalSetting: draft.retrievalSetting, manualReferenceIDs: draft.manualReferenceIds, aspectRatio: draft.aspectRatio, numCandidates: draft.numCandidates, maxCriticRounds: draft.maxCriticRounds)
  }

  var requiredRouteRoles: [ModelRole] {
    guard let routes = activeRoutes else { return [] }
    let configuration = effectiveSubmissionConfiguration
    var roles: [ModelRole] = []
    if draft.outputFormat == .svg || draft.taskName == .plot || configuration.pipelineMode != .vanilla || configuration.retrievalSetting == .auto { roles.append(.main) }
    if draft.outputFormat == .png, draft.taskName != .plot { roles.append(.image) }
    if draft.taskName == .plot, [.twoK, .fourK].contains(draft.imageSize), registryStore.registry?.model(for: routes.image)?.capabilities.imageEditMode == "direct-edit" { roles.append(.image) }
    if !draft.referenceImages.isEmpty { roles.append(activeReferenceImageMode == .mainModel ? .main : .vision) }
    if configuration.maxCriticRounds > 0, draft.taskName == .plot || (draft.outputFormat == .png && configuration.pipelineMode != .vanilla) { roles.append(.vision) }
    return [ModelRole.main, .image, .vision].filter { roles.contains($0) && routes[$0] != nil }
  }

  private var hasCompleteValidRoutes: Bool {
    guard let registry = registryStore.registry, let routes = activeRoutes else { return false }
    return [ModelRole.main, .image, .vision].allSatisfy { role in
      guard let route = routes[role], let model = registry.model(for: route) else { return false }
      return model.selectable && model.roles.contains(role)
    }
  }

  private var hasRequiredProviderKeys: Bool {
    guard registryStore.hasLiveRegistry else { return false }
    let providers = Set(requiredRouteRoles.compactMap { activeRoutes?[$0]?.accessProvider })
    return !providers.isEmpty && providers.allSatisfy { provider in
      !((try? keychain.string(for: ProviderCatalog.config(for: provider).keyName)) ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
  }

  private var hasRequiredArkVerification: Bool {
    guard let routes = activeRoutes else { return false }
    return requiredRouteRoles.allSatisfy { role in
      guard let route = routes[role], route.accessProvider == .ark else { return true }
      return verifiedArkRouteKeys.contains("\(role.rawValue):\(route.modelId)")
    }
  }

  var referenceUploadBlockedByRetrieval: Bool {
    draft.configurationMode == .advanced && draft.retrievalSetting != .none
  }

  var referenceUploadBlockedMessage: String {
    "已启用检索参考。若要上传自己的参考图，请先把检索设置改为“不使用检索”。"
  }

  var referenceCapabilityNote: String {
    guard !draft.referenceImages.isEmpty else { return "" }
    if let capability = mainModelCapability {
      switch capability.status {
      case "loading":
        return capability.reason.isEmpty ? "正在检查当前主模型是否支持直接理解参考图。" : capability.reason
      case "supported":
        return "网关确认当前主模型支持图像理解，可用主模型直读参考图。"
      case "unsupported":
        return "网关确认当前主模型不支持直接理解参考图，请使用独立识别模型。"
      default:
        if !capability.reason.isEmpty {
          return "\(localReferenceCapabilityNote)（能力查询：\(capability.reason)）"
        }
      }
    }
    return localReferenceCapabilityNote
  }

  private var localReferenceCapabilityNote: String {
    if mainModelCanReadReferenceImages {
      return "当前主模型支持图像理解，可用主模型直读参考图。"
    }
    return "当前主模型不能直读参考图，请使用独立识别模型。"
  }

  // MARK: - 草稿操作

  func selectProvider(_ provider: ProviderID) {
    saveSelectedProviderKey()
    draft.applyProviderDefaults(provider, routes: registryStore.registry?.defaultRoutes(for: provider))
    mainModelCapability = nil
    alignReferenceImageModeWithActiveMainModel()
    ensureSupportedImageSize()
    loadSelectedProviderKey()
  }

  /// Professional mode changes one route only; its model resets to that
  /// provider's authoritative default for the same role.
  func selectProvider(_ provider: ProviderID, for role: ModelRole) {
    guard let registry = registryStore.registry,
          let defaults = registry.defaultRoutes(for: provider),
          let current = draft.modelRoutes ?? registry.defaultRoutes(for: draft.provider),
          let replacement = defaults[role] else { return }
    switch role {
    case .main: draft.modelRoutes = ModelRoutes(main: replacement, image: current.image, vision: current.vision)
    case .image: draft.modelRoutes = ModelRoutes(main: current.main, image: replacement, vision: current.vision)
    case .vision: draft.modelRoutes = ModelRoutes(main: current.main, image: current.image, vision: replacement)
    default: return
    }
    draft.normalize(with: registry)
    ensureSupportedImageSize()
  }

  func selectModel(_ model: RegistryModel, for role: ModelRole) {
    guard let current = activeRoutes else { return }
    let replacement = ModelRoute(accessProvider: current[role]?.accessProvider ?? draft.provider, modelId: model.id)
    switch role {
    case .main: draft.modelRoutes = ModelRoutes(main: replacement, image: current.image, vision: current.vision)
    case .image: draft.modelRoutes = ModelRoutes(main: current.main, image: replacement, vision: current.vision)
    case .vision: draft.modelRoutes = ModelRoutes(main: current.main, image: current.image, vision: replacement)
    default: return
    }
    guard let registry = registryStore.registry else { return }
    draft.normalize(with: registry)
    alignReferenceImageModeWithActiveMainModel()
    ensureSupportedImageSize()
  }

  func selectMainModel(_ modelName: String) {
    draft.mainModelName = modelName
    if let routes = draft.modelRoutes {
      draft.modelRoutes = ModelRoutes(main: ModelRoute(accessProvider: routes.main.accessProvider, modelId: modelName), image: routes.image, vision: routes.vision)
    }
    mainModelCapability = nil
    alignReferenceImageModeWithActiveMainModel()
  }

  func selectImageModel(_ modelName: String) {
    draft.imageModelName = modelName
    if let routes = draft.modelRoutes {
      draft.modelRoutes = ModelRoutes(main: routes.main, image: ModelRoute(accessProvider: routes.image.accessProvider, modelId: modelName), vision: routes.vision)
    }
    ensureSupportedImageSize()
  }

  func updateSelectedAPIKey(_ value: String) {
    selectedAPIKey = value
    saveSelectedProviderKey()
  }

  func updateAPIKey(_ value: String, for provider: ProviderID) {
    do {
      try keychain.set(value.trimmingCharacters(in: .whitespacesAndNewlines), for: ProviderCatalog.config(for: provider).keyName)
      if provider == draft.provider { selectedAPIKey = value }
    } catch {
      presentAlert(formatUserFacingError(error))
    }
  }

  func selectRetrievalSetting(_ setting: RetrievalSetting) {
    draft.retrievalSetting = setting
    if setting != .manual {
      draft.manualReferenceIds = []
    }
    referenceUploadError = ""
  }

  func addReferenceFile(filename: String, mimeType: String?, data: Data) {
    referenceUploadError = ""
    guard !referenceUploadBlockedByRetrieval else {
      referenceUploadError = referenceUploadBlockedMessage
      return
    }
    guard draft.referenceImages.count < ReferenceImageLimits.maxCount else {
      referenceUploadError = "最多只能上传 \(ReferenceImageLimits.maxCount) 张参考图。"
      return
    }
    let normalized = ReferenceImageLimits.normalizedMimeType(filename: filename, mimeType: mimeType)
    guard ReferenceImageLimits.isAccepted(filename: filename, mimeType: normalized, size: data.count) else {
      referenceUploadError = "参考图仅支持 PNG、JPG、WebP 或 SVG，且单张不能超过 5MB。"
      return
    }
    draft.referenceImages.append(PendingReferenceImage(id: UUID().uuidString, filename: filename, mimeType: normalized, data: data))
    if !draft.referenceImages.isEmpty {
      draft.retrievalSetting = .none
      draft.manualReferenceIds = []
    }
    mainModelCapability = nil
  }

  func removeReferenceImage(_ image: PendingReferenceImage) {
    draft.referenceImages.removeAll { $0.id == image.id }
    if draft.referenceImages.isEmpty {
      mainModelCapability = nil
    }
  }

  func toggleManualReference(_ reference: ReferenceLibraryItem) {
    if draft.manualReferenceIds.contains(reference.id) {
      draft.manualReferenceIds.removeAll { $0 == reference.id }
    } else if draft.manualReferenceIds.count < 10 {
      draft.manualReferenceIds.append(reference.id)
    }
  }

  func applyTemplate(_ configuration: SavedGenerationTemplateConfiguration) {
    saveSelectedProviderKey()
    configuration.apply(to: &draft)
    referenceUploadError = ""
    mainModelCapability = nil
    if draft.referenceImageMode == .mainModel && !mainModelCanReadReferenceImages {
      draft.referenceImageMode = .visionModel
    }
    ensureSupportedImageSize()
    loadSelectedProviderKey()
  }

  // MARK: - 网络操作

  func refreshMainModelCapability() async {
    guard !draft.referenceImages.isEmpty else {
      mainModelCapability = nil
      return
    }

    let provider = draft.provider
    let modelName = activeMainModelName
    mainModelCapability = ModelCapability(
      status: "loading",
      supportsReferenceImages: mainModelCanReadReferenceImages,
      reason: "正在检查主模型能力。",
      source: "ios",
      cached: false
    )

    do {
      let capability = try await apiClient.modelCapability(apiBase: settings.apiBase, provider: provider, model: modelName)
      guard provider == draft.provider, modelName == activeMainModelName, !draft.referenceImages.isEmpty else { return }
      mainModelCapability = capability
    } catch {
      guard provider == draft.provider, modelName == activeMainModelName, !draft.referenceImages.isEmpty else { return }
      mainModelCapability = ModelCapability(
        status: "unknown",
        supportsReferenceImages: mainModelCanReadReferenceImages,
        reason: formatUserFacingError(error),
        source: "client-error",
        cached: false
      )
    }
  }

  func loadReferenceLibrary() async {
    referenceLibraryError = ""
    referenceLibraryLoading = true
    defer { referenceLibraryLoading = false }
    do {
      referenceLibrary = try await apiClient.referenceLibrary(apiBase: settings.apiBase, taskName: draft.taskName, limit: Self.referenceLibraryLimit)
    } catch {
      referenceLibraryError = formatUserFacingError(error)
    }
  }

  func verifyArkRoutes(confirmPaidImageProbe: Bool) async {
    guard let routes = activeRoutes else { return }
    let arkRoles = requiredRouteRoles.filter { routes[$0]?.accessProvider == .ark }
    guard !arkRoles.isEmpty else { return }
    let containsImage = arkRoles.contains(.image)
    guard !containsImage || confirmPaidImageProbe else {
      arkProbeStatus = "图像路线探测可能产生费用，请先确认。"
      return
    }
    let key = (try? keychain.string(for: ProviderCatalog.config(for: .ark).keyName)) ?? ""
    guard !key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      arkProbeStatus = "请先填写火山方舟 API Key。"
      return
    }
    arkProbeLoading = true
    arkProbeStatus = ""
    defer { arkProbeLoading = false }
    do {
      let result = try await apiClient.providerAccountCatalog(apiBase: settings.apiBase, arkKey: key, routes: routes, requiredRoles: arkRoles, confirmPaidImageProbe: confirmPaidImageProbe)
      for probe in result.probeResults where probe.state == "verified" {
        verifiedArkRouteKeys.insert("\(probe.role.rawValue):\(probe.modelId)")
      }
      arkProbeStatus = result.probeResults.isEmpty ? "方舟路线已完成探测。" : "方舟路线：\(result.probeResults.map(\.state).joined(separator: "、"))"
    } catch {
      arkProbeStatus = formatUserFacingError(error)
    }
  }

  func submitJob() async {
    guard canSubmit else { return }
    saveSelectedProviderKey()
    isSubmitting = true
    submitError = ""
    jobs.currentJob = nil
    defer { isSubmitting = false }

    do {
      let uploaded = try await referenceUploader.upload(draft.referenceImages, apiBase: settings.apiBase)
      let payload = makeJobPayload(referenceImages: uploaded)
      let created = try await apiClient.createJob(apiBase: settings.apiBase, payload: payload)
      guard !created.id.isEmpty else { throw PaperBananaAPIError.server("后端没有返回任务 ID。") }
      jobs.track(jobID: created.id, status: created.status, localDraft: Job(id: created.id, status: created.status, payload: payload))
      await jobs.loadUserJobs(silent: true)
    } catch {
      submitError = formatUserFacingError(error)
    }
  }

  func makeJobPayload(referenceImages: [ReferenceImageAsset]) -> JobCreatePayload {
    let configuration = effectiveSubmissionConfiguration
    return JobCreatePayload(
      configurationMode: draft.configurationMode,
      provider: draft.provider,
      apiKeys: scopedAPIKeys(),
      taskName: draft.taskName,
      methodContent: draft.methodContent.trimmingCharacters(in: .whitespacesAndNewlines),
      caption: draft.caption.trimmingCharacters(in: .whitespacesAndNewlines),
      infographicCategory: draft.selectedCategory.label,
      outputFormat: draft.outputFormat,
      imageSize: draft.imageSize,
      mainModelName: activeMainModelName,
      imageModelName: activeImageModelName,
      referenceVisionModelName: activeVisionModelName,
      referenceImageMode: activeReferenceImageMode,
      referenceImages: referenceImages,
      pipelineMode: configuration.pipelineMode,
      retrievalSetting: configuration.retrievalSetting,
      manualReferenceIds: configuration.manualReferenceIDs,
      aspectRatio: configuration.aspectRatio,
      numCandidates: configuration.numCandidates,
      maxCriticRounds: configuration.maxCriticRounds,
      negativePrompt: draft.negativePrompt.trimmingCharacters(in: .whitespacesAndNewlines),
      modelRoutes: activeRoutes,
      requiredRouteRoles: requiredRouteRoles
    )
  }

  /// 删除账号时的本机清理：抹掉草稿、当前选中 API key，并清空所有 provider 的 Keychain key。
  /// 退出登录（signOut）不走这里——API key 要保留给重新登录的用户。
  func clearAllForAccountDeletion() {
    for provider in ProviderCatalog.order {
      try? keychain.delete(account: ProviderCatalog.config(for: provider).keyName)
    }
    draft = GenerationDraft()
    selectedAPIKey = ""
    mainModelCapability = nil
    submitError = ""
    referenceUploadError = ""
    referenceLibrary = []
    referenceLibraryError = ""
  }

  // MARK: - 私有

  private func alignReferenceImageModeWithActiveMainModel() {
    draft.referenceImageMode = mainModelCanReadReferenceImages ? .mainModel : .visionModel
  }

  private func ensureSupportedImageSize() {
    guard let route = activeRoutes else { return }
    let supported = registryStore.registry?.generationResolutions(for: route.image) ?? [.twoK]
    if !supported.contains(draft.imageSize), let first = supported.first {
      draft.imageSize = first
    }
  }

  private func loadSelectedProviderKey() {
    selectedAPIKey = (try? keychain.string(for: selectedProviderConfig.keyName)) ?? ""
  }

  private func saveSelectedProviderKey() {
    do {
      try keychain.set(selectedAPIKey.trimmingCharacters(in: .whitespacesAndNewlines), for: selectedProviderConfig.keyName)
    } catch {
      presentAlert(formatUserFacingError(error))
    }
  }

  func normalizeDraftWithLiveRegistry() {
    guard let registry = registryStore.registry else { return }
    draft.normalize(with: registry)
    alignReferenceImageModeWithActiveMainModel()
    ensureSupportedImageSize()
  }

  private func scopedAPIKeys() -> [ProviderID: String] {
    Dictionary(uniqueKeysWithValues: Set(requiredRouteRoles.compactMap { activeRoutes?[$0]?.accessProvider }).compactMap { provider in
      guard let key = try? keychain.string(for: ProviderCatalog.config(for: provider).keyName), !key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
      return (provider, key)
    })
  }
}
