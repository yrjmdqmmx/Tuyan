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

  func paperBananaBody() -> [String: Any] {
    let hasUploadedReferences = !referenceImages.isEmpty
    var body: [String: Any] = [
      "action": "createJob",
      "clientPlatform": "ios",
      "configurationMode": configurationMode.rawValue,
      "provider": provider.rawValue,
      "apiKeys": apiKeysBody(),
      "taskName": taskName.rawValue,
      "methodContent": methodContent,
      "caption": caption,
      "infographicCategory": infographicCategory,
      "outputFormat": outputFormat.rawValue,
      "imageSize": imageSize.rawValue,
      "mainModelName": mainModelName,
      "imageModelName": imageModelName,
      "referenceVisionModelName": referenceVisionModelName,
      "referenceImages": referenceImages.map(\.dictionary),
      "pipelineMode": pipelineMode.lafValue,
      "retrievalSetting": hasUploadedReferences ? RetrievalSetting.none.rawValue : retrievalSetting.rawValue,
      "manualReferenceIds": hasUploadedReferences ? [] : manualReferenceIds,
      "aspectRatio": aspectRatio,
      "numCandidates": numCandidates,
      "maxCriticRounds": maxCriticRounds
    ]
    if hasUploadedReferences, let referenceImageMode {
      body["referenceImageMode"] = referenceImageMode.rawValue
    }
    return body
  }

  func apiKeysBody() -> [String: String] {
    Dictionary(uniqueKeysWithValues: ProviderID.allCases.map { ($0.rawValue, apiKeys[$0] ?? "") })
  }
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

  func paperBananaBody() -> [String: Any] {
    var body: [String: Any] = [
      "action": "refineImage",
      "clientPlatform": "ios",
      "provider": provider.rawValue,
      "apiKeys": Dictionary(uniqueKeysWithValues: ProviderID.allCases.map { ($0.rawValue, apiKeys[$0] ?? "") }),
      "mainModelName": mainModelName,
      "imageModelName": imageModelName,
      "referenceVisionModelName": referenceVisionModelName,
      "sourceImageUrl": sourceImageURL,
      "editInstruction": editInstruction,
      "aspectRatio": aspectRatio,
      "imageSize": imageSize.rawValue
    ]
    if let sourceImageObjectKey, !sourceImageObjectKey.isEmpty {
      body["sourceImageObjectKey"] = sourceImageObjectKey
    }
    return body
  }
}

struct ReferenceUploadFile: Encodable {
  let clientId: String
  let role: String
  let filename: String
  let mimeType: String
  let size: Int
}
