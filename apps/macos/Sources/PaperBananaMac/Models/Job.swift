import Foundation

enum JobStatus: String {
  case queued
  case running
  case succeeded
  case failed
  case unknown

  var label: String {
    switch self {
    case .queued: "排队中"
    case .running: "生成中"
    case .succeeded: "已完成"
    case .failed: "失败"
    case .unknown: "未知"
    }
  }

  var isTerminal: Bool {
    self == .succeeded || self == .failed
  }
}

struct ResultImage: Decodable, Identifiable, Equatable {
  let filename: String
  let url: String
  let candidateID: Int
  let mimeType: String

  var id: String {
    "\(candidateID)-\(filename)-\(url)"
  }

  private enum CodingKeys: String, CodingKey {
    case filename
    case url
    case candidateID = "candidate_id"
    case candidateIDCamel = "candidateId"
    case mimeType = "mime_type"
    case mimeTypeCamel = "mimeType"
  }

  init(filename: String, url: String, candidateID: Int, mimeType: String) {
    self.filename = filename
    self.url = url
    self.candidateID = candidateID
    self.mimeType = mimeType
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    filename = try container.decodeIfPresent(String.self, forKey: .filename) ?? ""
    url = try container.decodeIfPresent(String.self, forKey: .url) ?? filename
    candidateID = try container.decodeIfPresent(Int.self, forKey: .candidateID)
      ?? container.decodeIfPresent(Int.self, forKey: .candidateIDCamel)
      ?? 0
    mimeType = try container.decodeIfPresent(String.self, forKey: .mimeType)
      ?? container.decodeIfPresent(String.self, forKey: .mimeTypeCamel)
      ?? ""
  }
}

struct Job: Decodable, Identifiable, Equatable {
  let id: String
  let status: String
  let provider: String
  let clientPlatform: String
  let userEmail: String
  let configurationMode: String
  let methodContent: String
  let caption: String
  let infographicCategory: String
  let mainModelName: String
  let imageGenModelName: String
  let pipelineMode: String
  let aspectRatio: String
  let numCandidates: Int
  let maxCriticRounds: Int
  let promptCharCount: Int
  let resultImageCount: Int
  let resultImages: [ResultImage]
  let logsTail: String
  let error: String
  let createdAt: String
  let updatedAt: String
  let startedAt: String
  let completedAt: String

  var statusKind: JobStatus {
    JobStatus(rawValue: status) ?? .unknown
  }

  var title: String {
    if !caption.isEmpty { return caption }
    if !methodContent.isEmpty { return String(methodContent.prefix(36)) }
    return id
  }

  var providerID: ProviderID? {
    ProviderID(rawValue: provider)
  }

  var mainModelDisplayName: String {
    guard let providerID else { return mainModelName }
    return ProviderCatalog.mainModelDisplayName(provider: providerID, value: mainModelName)
  }

  var imageModelDisplayName: String {
    guard let providerID else { return imageGenModelName }
    return ProviderCatalog.imageModelDisplayName(provider: providerID, value: imageGenModelName)
  }

  var failureText: String {
    if !error.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return error }
    return logsTail
  }

  var formattedFailureText: String {
    formatUserFacingError(failureText)
  }

  init(
    id: String,
    status: String,
    provider: String = "",
    clientPlatform: String = "",
    userEmail: String = "",
    configurationMode: String = "",
    methodContent: String = "",
    caption: String = "",
    infographicCategory: String = "",
    mainModelName: String = "",
    imageGenModelName: String = "",
    pipelineMode: String = "",
    aspectRatio: String = "",
    numCandidates: Int = 0,
    maxCriticRounds: Int = 0,
    promptCharCount: Int = 0,
    resultImageCount: Int = 0,
    resultImages: [ResultImage] = [],
    logsTail: String = "",
    error: String = "",
    createdAt: String = "",
    updatedAt: String = "",
    startedAt: String = "",
    completedAt: String = ""
  ) {
    self.id = id
    self.status = status
    self.provider = provider
    self.clientPlatform = Self.normalizeClientPlatform(clientPlatform)
    self.userEmail = userEmail
    self.configurationMode = configurationMode
    self.methodContent = methodContent
    self.caption = caption
    self.infographicCategory = infographicCategory
    self.mainModelName = mainModelName
    self.imageGenModelName = imageGenModelName
    self.pipelineMode = pipelineMode
    self.aspectRatio = aspectRatio
    self.numCandidates = numCandidates
    self.maxCriticRounds = maxCriticRounds
    self.promptCharCount = promptCharCount
    self.resultImageCount = resultImageCount
    self.resultImages = resultImages
    self.logsTail = logsTail
    self.error = error
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.startedAt = startedAt
    self.completedAt = completedAt
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    id = container.string("id", "_id")
    status = container.string("status")
    provider = container.string("provider")
    clientPlatform = Self.normalizeClientPlatform(container.string("client_platform", "clientPlatform"))
    userEmail = container.string("user_email", "userEmail")
    configurationMode = container.string("configuration_mode", "configurationMode")
    methodContent = container.string("method_content", "methodContent")
    caption = container.string("caption")
    infographicCategory = container.string("infographic_category", "infographicCategory")
    mainModelName = container.string("main_model_name", "mainModelName")
    imageGenModelName = container.string("image_gen_model_name", "imageModelName", "imageGenModelName")
    pipelineMode = container.string("pipeline_mode", "pipelineMode")
    aspectRatio = container.string("aspect_ratio", "aspectRatio")
    numCandidates = container.int("num_candidates", "numCandidates")
    maxCriticRounds = container.int("max_critic_rounds", "maxCriticRounds")
    promptCharCount = container.int("prompt_char_count", "promptCharCount")
    resultImageCount = container.int("result_image_count", "resultImageCount")
    resultImages = container.decodeArray("result_images", "resultImages")
    logsTail = container.string("logs_tail") + container.logsString("logs")
    error = container.string("error")
    createdAt = container.string("created_at", "createdAt")
    updatedAt = container.string("updated_at", "updatedAt")
    startedAt = container.string("started_at", "startedAt")
    completedAt = container.string("completed_at", "completedAt")
  }

  var clientPlatformDisplayName: String {
    switch clientPlatform {
    case "web": "Web 网页"
    case "miniprogram": "微信小程序"
    case "android": "Android"
    case "ios": "iOS"
    case "windows": "Windows"
    case "macos": "macOS"
    case "harmony": "HarmonyOS"
    default: "未记录"
    }
  }

  private static func normalizeClientPlatform(_ value: String) -> String {
    let platform = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    return ["web", "miniprogram", "android", "ios", "windows", "macos", "harmony"].contains(platform) ? platform : ""
  }
}

struct CurrentUser: Decodable, Equatable {
  let id: String
  let email: String
  let name: String
}

enum BackendMode: String, Equatable {
  case gateway
  case laf
  case fastapi
}

struct BackendHealth: Equatable {
  let backendMode: BackendMode
  let runtime: String
  let mockEnabled: Bool
  let detail: String
}
