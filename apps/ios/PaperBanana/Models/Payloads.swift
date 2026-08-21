import Foundation

struct JobCreatePayload {
  let configurationMode: ConfigurationMode
  let provider: ProviderID
  let apiKeys: [ProviderID: String]
  let taskName: TaskName
  let methodContent: String
  let caption: String
  let infographicCategory: String
  let outputFormat: OutputFormat
  let imageSize: ImageSize
  let mainModelName: String
  let imageModelName: String
  let referenceVisionModelName: String
  let referenceImageMode: ReferenceImageMode?
  let referenceImages: [ReferenceImageAsset]
  let pipelineMode: PipelineMode
  let retrievalSetting: RetrievalSetting
  let manualReferenceIds: [String]
  let aspectRatio: String
  let numCandidates: Int
  let maxCriticRounds: Int
  var negativePrompt: String = ""
  var modelRoutes: ModelRoutes? = nil
  /// Only keys for execution-reachable routes may leave the device.
  var requiredRouteRoles: [ModelRole] = [.main, .image, .vision]

  func paperBananaBody() -> [String: Any] {
    let hasUploadedReferences = !referenceImages.isEmpty
    var body: [String: Any] = [
      "action": "createJob",
      "clientPlatform": "ios",
      "configurationMode": configurationMode.rawValue,
      "provider": activeRoutes?.main.accessProvider.rawValue ?? provider.rawValue,
      "apiKeys": apiKeysBody(),
      "taskName": taskName.rawValue,
      "methodContent": String(methodContent.prefix(GenerationDraft.methodContentLimit)),
      "caption": String(caption.prefix(GenerationDraft.captionLimit)),
      "infographicCategory": infographicCategory,
      "outputFormat": outputFormat.rawValue,
      "imageSize": imageSize.rawValue,
      "mainModelName": activeRoutes?.main.modelId ?? mainModelName,
      "imageModelName": activeRoutes?.image.modelId ?? imageModelName,
      "referenceVisionModelName": activeRoutes?.vision.modelId ?? referenceVisionModelName,
      "referenceImages": referenceImages.map(\.dictionary),
      "pipelineMode": pipelineMode.lafValue,
      "retrievalSetting": hasUploadedReferences ? RetrievalSetting.none.rawValue : retrievalSetting.rawValue,
      "manualReferenceIds": hasUploadedReferences ? [] : manualReferenceIds,
      "aspectRatio": aspectRatio,
      "numCandidates": numCandidates,
      "maxCriticRounds": maxCriticRounds
    ]
    if !negativePrompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      body["negativePrompt"] = String(negativePrompt.prefix(GenerationDraft.negativePromptLimit))
    }
    if let activeRoutes {
      body["modelRoutes"] = activeRoutes.body
    }
    if hasUploadedReferences, let referenceImageMode {
      body["referenceImageMode"] = referenceImageMode.rawValue
    }
    return body
  }

  func apiKeysBody() -> [String: String] {
    let allowedProviders = Set(requiredRouteRoles.compactMap { activeRoutes?[$0]?.accessProvider })
    let scoped = allowedProviders.isEmpty ? [provider] : allowedProviders
    return Dictionary(uniqueKeysWithValues: apiKeys
      .filter { scoped.contains($0.key) && !$0.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
      .map { ($0.key.rawValue, $0.value) })
  }

  private var activeRoutes: ModelRoutes? { modelRoutes }
}

struct RefineImagePayload {
  let provider: ProviderID
  let apiKeys: [ProviderID: String]
  let mainModelName: String
  let imageModelName: String
  let referenceVisionModelName: String
  let sourceImageURL: String
  let sourceImageObjectKey: String?
  let editInstruction: String
  let aspectRatio: String
  let imageSize: ImageSize
  var configurationMode: ConfigurationMode = .simple
  var modelRoutes: ModelRoutes? = nil
  var requiredRouteRoles: [ModelRole] = [.image]

  func paperBananaBody() -> [String: Any] {
    var body: [String: Any] = [
      "action": "refineImage",
      "clientPlatform": "ios",
      "configurationMode": configurationMode.rawValue,
      "provider": modelRoutes?.main.accessProvider.rawValue ?? provider.rawValue,
      "apiKeys": apiKeysBody(),
      "mainModelName": modelRoutes?.main.modelId ?? mainModelName,
      "imageModelName": modelRoutes?.image.modelId ?? imageModelName,
      "referenceVisionModelName": modelRoutes?.vision.modelId ?? referenceVisionModelName,
      "sourceImageUrl": sourceImageURL,
      "editInstruction": editInstruction,
      "aspectRatio": aspectRatio,
      "imageSize": imageSize.rawValue
    ]
    if let modelRoutes { body["modelRoutes"] = modelRoutes.body }
    if let sourceImageObjectKey, !sourceImageObjectKey.isEmpty {
      body["sourceImageObjectKey"] = sourceImageObjectKey
    }
    return body
  }

  private func apiKeysBody() -> [String: String] {
    let allowedProviders = Set(requiredRouteRoles.compactMap { modelRoutes?[$0]?.accessProvider })
    let scoped = allowedProviders.isEmpty ? [provider] : allowedProviders
    return Dictionary(uniqueKeysWithValues: apiKeys
      .filter { scoped.contains($0.key) && !$0.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
      .map { ($0.key.rawValue, $0.value) })
  }
}

private extension ModelRoutes {
  var body: [String: [String: String]] {
    [
      "main": ["accessProvider": main.accessProvider.rawValue, "modelId": main.modelId],
      "image": ["accessProvider": image.accessProvider.rawValue, "modelId": image.modelId],
      "vision": ["accessProvider": vision.accessProvider.rawValue, "modelId": vision.modelId]
    ]
  }
}

struct ReferenceUploadFile: Encodable {
  let clientId: String
  let role: String
  let filename: String
  let mimeType: String
  let size: Int
}
