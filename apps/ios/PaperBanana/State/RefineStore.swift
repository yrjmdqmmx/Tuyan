import Foundation
import Observation

@Observable
@MainActor
final class RefineStore {
  var draft = RefineDraft()
  var submitError = ""
  var isSubmitting = false

  private let apiClient: PaperBananaAPIClient
  private let settings: SettingsStore
  private let jobs: JobsStore
  private let generation: GenerationStore

  init(apiClient: PaperBananaAPIClient, settings: SettingsStore, jobs: JobsStore, generation: GenerationStore) {
    self.apiClient = apiClient
    self.settings = settings
    self.jobs = jobs
    self.generation = generation
  }

  var activeRoutes: ModelRoutes? { generation.activeRoutes }
  var imageRoute: ModelRoute? { activeRoutes?.image }
  var imageModel: RegistryModel? { imageRoute.flatMap { generation.registryStore.registry?.model(for: $0) } }
  var capability: RefineCapability { RefineCapability(imageEditMode: imageModel?.capabilities.imageEditMode ?? "none") }
  var refineResolutions: [ImageSize] {
    guard let imageModel else { return [] }
    return imageModel.capabilities.refineResolutions ?? [.twoK]
  }
  var refineAspectRatios: [String] { imageModel.map { RefineDraft.supportedAspectRatios($0.capabilities.refineAspectRatios) } ?? [] }
  var canSubmit: Bool {
    guard !isSubmitting, draft.source != nil, draft.trimmedInstruction.count >= 3,
          generation.registryStore.hasLiveRegistry, let registry = generation.registryStore.registry, let routes = activeRoutes,
          capability.isSupported, let image = registry.model(for: routes.image), image.selectable, image.roles.contains(.image),
          let imageSize = draft.imageSize, refineResolutions.contains(imageSize), refineAspectRatios.contains(draft.aspectRatio) else { return false }
    guard [ModelRole.main, .image, .vision].allSatisfy({ role in
      guard let route = routes[role], let model = registry.model(for: route) else { return false }
      return model.selectable && model.roles.contains(role)
    }) else { return false }
    return capability.requiredRoles.allSatisfy { role in
      guard let route = routes[role], let model = registry.model(for: route), model.selectable, model.roles.contains(role) else { return false }
      let key = generation.apiKey(for: route.accessProvider).trimmingCharacters(in: .whitespacesAndNewlines)
      guard !key.isEmpty else { return false }
      return route.accessProvider != .ark || generation.isArkRouteVerified(role: role, route: route)
    }
  }

  func begin(source: RefineSource) {
    draft.source = source
    draft.instruction = ""
    submitError = ""
    normalizeWithLiveRegistry()
  }

  func normalizeWithLiveRegistry() {
    guard let imageModel else { return }
    draft = draft.normalized(refineAspectRatios: imageModel.capabilities.refineAspectRatios, refineResolutions: imageModel.capabilities.refineResolutions)
  }

  func submit() async {
    guard canSubmit, let source = draft.source, let routes = activeRoutes, let imageSize = draft.imageSize else { return }
    isSubmitting = true
    submitError = ""
    defer { isSubmitting = false }
    let roles = capability.requiredRoles
    do {
      let payload = RefineImagePayload(
        provider: routes.main.accessProvider, apiKeys: scopedAPIKeys(roles: roles),
        mainModelName: routes.main.modelId, imageModelName: routes.image.modelId, referenceVisionModelName: routes.vision.modelId,
        source: source, editInstruction: draft.trimmedInstruction, aspectRatio: draft.aspectRatio, imageSize: imageSize,
        configurationMode: generation.draft.configurationMode, modelRoutes: routes, requiredRouteRoles: roles, refineMode: capability.imageEditMode
      )
      let created = try await apiClient.refineImage(apiBase: settings.apiBase, payload: payload)
      guard !created.id.isEmpty else { throw PaperBananaAPIError.server("后端没有返回任务 ID。") }
      jobs.registerRefineSource(source, for: created.id)
      jobs.track(jobID: created.id, status: created.status, localDraft: Job(id: created.id, status: created.status, payload: payload))
      await jobs.loadUserJobs(silent: true)
    } catch {
      submitError = formatUserFacingError(error)
    }
  }

  private func scopedAPIKeys(roles: [ModelRole]) -> [ProviderID: String] {
    Dictionary(uniqueKeysWithValues: Set(roles.compactMap { activeRoutes?[$0]?.accessProvider }).compactMap { provider in
      let key = generation.apiKey(for: provider).trimmingCharacters(in: .whitespacesAndNewlines)
      return key.isEmpty ? nil : (provider, key)
    })
  }
}
