import Foundation

enum JobStatus: String, Codable {
  case queued
  case running
  case succeeded
  case failed
  case unknown

  var title: String {
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
  let storage: String
  let candidateID: Int
  let mimeType: String
  let objectKey: String

  var id: String {
    "\(candidateID)-\(filename)-\(url)"
  }

  var format: String {
    if mimeType.contains("svg") || filename.lowercased().hasSuffix(".svg") { return "svg" }
    if mimeType.contains("jpeg") || mimeType.contains("jpg") { return "jpg" }
    if mimeType.contains("webp") { return "webp" }
    return "png"
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    filename = container.string("filename", default: "")
    url = container.string("url", default: "")
    storage = container.string("storage", default: "")
    candidateID = container.int("candidate_id", "candidateId")
    mimeType = container.string("mime_type", "mimeType", default: "")
    objectKey = container.string("object_key", "objectKey", default: "")
  }
}

struct ExportedResultFile: Identifiable, Equatable {
  let id = UUID()
  let url: URL
  let filename: String
}

struct JobMetadataItem: Identifiable, Equatable {
  let label: String
  let value: String

  var id: String { label }
}

struct StageImage: Decodable, Equatable {
  let filename: String
  let url: String
  let storage: String
  let mimeType: String

  var displayFormat: String {
    if mimeType.contains("svg") || filename.lowercased().hasSuffix(".svg") { return "svg" }
    if mimeType.contains("jpeg") || mimeType.contains("jpg") || filename.lowercased().hasSuffix(".jpg") || filename.lowercased().hasSuffix(".jpeg") { return "jpg" }
    if mimeType.contains("webp") || filename.lowercased().hasSuffix(".webp") { return "webp" }
    return "png"
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    filename = container.string("filename", default: "")
    url = container.string("url", default: "")
    storage = container.string("storage", default: "")
    mimeType = container.string("mime_type", "mimeType", default: "")
  }
}

struct JobStage: Decodable, Identifiable, Equatable {
  let id: String
  let candidateID: Int
  let type: String
  let title: String
  let round: Int
  let text: String
  let suggestion: String
  let image: StageImage?
  let error: String

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    candidateID = container.int("candidate_id", "candidateId")
    type = container.string("type")
    title = container.string("title")
    round = container.int("round")
    text = container.string("text", "description", "message")
    suggestion = container.string("suggestion", "criticSuggestion")
    image = try container.decodeIfPresent(StageImage.self, forKey: .key("image"))
    error = container.string("error")
    // 后端 recordStage 总是带 id；缺失时合成确定性 id（type+candidate+round+title hash），
    // 保证同一 stage 跨轮询解码 id 稳定——随机 UUID 会让 ForEach 每次轮询都视为新元素。
    let explicitID = container.string("id", "_id")
    id = explicitID.isEmpty
      ? "stage-\(type)-\(candidateID)-\(round)-\(Self.stableHash("\(type)|\(candidateID)|\(round)|\(title)"))"
      : explicitID
  }

  /// 确定性字符串 hash（FNV-1a）：Swift 原生 hashValue 每次启动随机化，不能用于合成稳定 id。
  private static func stableHash(_ string: String) -> String {
    var hash: UInt64 = 0xcbf2_9ce4_8422_2325
    for byte in string.utf8 {
      hash ^= UInt64(byte)
      hash = hash &* 0x0000_0100_0000_01b3
    }
    return String(hash, radix: 36)
  }
}

struct Job: Decodable, Identifiable, Equatable {
  let id: String
  let status: String
  let provider: String
  let clientPlatform: String
  let jobType: String
  let userID: String
  let userEmail: String
  let configurationMode: String
  let modelRoutes: ModelRoutes?
  let routingMode: String
  let modelRoutingVersion: Int
  let modelRoutingSource: String
  let methodContent: String
  let negativePrompt: String
  let caption: String
  let infographicCategory: String
  let outputFormat: OutputFormat
  let imageSize: ImageSize
  let mainModelName: String
  let imageModelName: String
  let referenceVisionModelName: String
  let imageRefineMode: String
  let imageRefineReason: String
  let refineMode: String
  let refineReason: String
  var sourceImageObjectKey: String
  var sourceImageURL: String
  let referenceImageMode: ReferenceImageMode?
  let referenceImageModeUsed: String
  let pipelineMode: String
  let taskName: TaskName
  let retrievalSetting: RetrievalSetting
  let retrievedReferenceIDs: [String]
  let retrievedReferences: [ReferenceLibraryItem]
  let stages: [JobStage]
  let criticMode: String
  let aspectRatio: String
  let numCandidates: Int
  let maxCriticRounds: Int
  let promptCharCount: Int
  let resultImageCount: Int
  let referenceImageCount: Int
  let resultImages: [ResultImage]
  let referenceImages: [ReferenceImageAsset]
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
    if !methodContent.isEmpty { return String(methodContent.prefix(44)) }
    return id
  }

  /// `title` 是否来自用户输入（图注 / 方法内容），而非回退到任务 id。
  /// 给展示层（如全局状态胶囊副标题）判断"标题值不值得展示"用，
  /// 避免用 `title == id` 这类脆弱推断。
  var hasUserVisibleTitle: Bool {
    !caption.isEmpty || !methodContent.isEmpty
  }

  var failureText: String {
    let trimmedError = failureErrorText
    if !trimmedError.isEmpty { return trimmedError }
    return failureLogsText
  }

  var failureErrorText: String {
    error.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  var failureLogsText: String {
    logsTail.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  var metadataItems: [JobMetadataItem] {
    [
      JobMetadataItem(label: "时间", value: formattedRecordDate(createdAt)),
      JobMetadataItem(label: "任务来源", value: clientPlatformDisplayName),
      JobMetadataItem(label: "模式", value: displayConfigurationMode),
      JobMetadataItem(label: "类别", value: displayValue(infographicCategory, fallback: taskName == .plot ? "数据统计图" : "方法框架图")),
      JobMetadataItem(label: "平台", value: displayProvider),
      JobMetadataItem(label: "格式", value: "\(outputFormat.title) · \(imageSize.rawValue)"),
      JobMetadataItem(label: "画面比例", value: displayValue(aspectRatio)),
      JobMetadataItem(label: "检索", value: retrievalSetting.title),
      JobMetadataItem(label: "参考图处理", value: displayReferenceImageMode),
      JobMetadataItem(label: "主模型", value: displayValue(mainModelName)),
      JobMetadataItem(label: "图像生成模型", value: displayValue(imageModelName)),
      JobMetadataItem(label: "参考图识别模型", value: displayReferenceVisionModel),
      JobMetadataItem(label: "模型路由", value: displayRoutes),
      JobMetadataItem(label: "路由模式", value: displayValue(routingMode)),
      JobMetadataItem(label: "路由版本", value: modelRoutingVersion > 0 ? "v\(modelRoutingVersion)" : "未记录"),
      JobMetadataItem(label: "路由来源", value: displayValue(modelRoutingSource)),
      JobMetadataItem(label: "图片精修能力", value: displayValue(imageRefineMode)),
      JobMetadataItem(label: "精修模式", value: displayValue(refineMode)),
      JobMetadataItem(label: "精修说明", value: displayValue(refineReason)),
      JobMetadataItem(label: "源图", value: sourceImageObjectKey.isEmpty ? displayValue(sourceImageURL) : sourceImageObjectKey),
      JobMetadataItem(label: "负向提示词", value: displayValue(negativePrompt)),
      JobMetadataItem(label: "评审模式", value: displayCriticMode),
      JobMetadataItem(label: "候选图", value: "\(numCandidates > 0 ? numCandidates : max(resultImageCount, resultImages.count)) 张"),
      JobMetadataItem(label: "阶段", value: "\(stages.count) 个")
    ]
  }

  var needsFreshRecordDetail: Bool {
    let hasResult = resultImageCount > 0 || !resultImages.isEmpty
    let hasReference = referenceImageCount > 0 || !referenceImages.isEmpty
    let allURLs = resultImages.map(\.url) + referenceImages.compactMap(\.url)
    let hasBucketImage = resultImages.contains { $0.storage == "bucket" } || referenceImages.contains { $0.storage == "bucket" }
    let hasRemoteSignedURL = allURLs.contains { !$0.isEmpty && !$0.hasPrefix("data:") }

    if statusKind != .succeeded && !hasReference { return false }
    return hasResult || hasReference || hasBucketImage || hasRemoteSignedURL
  }

  var visibleReferenceImages: [ReferenceImageAsset] {
    referenceImages.filter { !($0.url ?? "").isEmpty }
  }

  init(id: String, status: String) {
    self.id = id
    self.status = status
    provider = ""
    clientPlatform = ""
    jobType = "generate"
    userID = ""
    userEmail = ""
    configurationMode = ""
    modelRoutes = nil
    routingMode = ""
    modelRoutingVersion = 0
    modelRoutingSource = ""
    methodContent = ""
    negativePrompt = ""
    caption = ""
    infographicCategory = ""
    outputFormat = .png
    imageSize = .oneK
    mainModelName = ""
    imageModelName = ""
    referenceVisionModelName = ""
    imageRefineMode = ""
    imageRefineReason = ""
    refineMode = ""
    refineReason = ""
    sourceImageObjectKey = ""
    sourceImageURL = ""
    referenceImageMode = nil
    referenceImageModeUsed = ""
    pipelineMode = ""
    taskName = .diagram
    retrievalSetting = .none
    retrievedReferenceIDs = []
    retrievedReferences = []
    stages = []
    criticMode = ""
    aspectRatio = ""
    numCandidates = 0
    maxCriticRounds = 0
    promptCharCount = 0
    resultImageCount = 0
    referenceImageCount = 0
    resultImages = []
    referenceImages = []
    logsTail = ""
    error = ""
    createdAt = ""
    updatedAt = ""
    startedAt = ""
    completedAt = ""
  }

  init(id: String, status: String, payload: JobCreatePayload, createdAt date: Date = Date()) {
    self.id = id
    self.status = status
    provider = payload.provider.rawValue
    clientPlatform = "ios"
    jobType = "generate"
    userID = ""
    userEmail = ""
    configurationMode = payload.configurationMode.rawValue
    modelRoutes = payload.modelRoutes
    routingMode = ""
    modelRoutingVersion = 0
    modelRoutingSource = ""
    methodContent = payload.methodContent
    negativePrompt = payload.negativePrompt
    caption = payload.caption
    infographicCategory = payload.infographicCategory
    outputFormat = payload.outputFormat
    imageSize = payload.imageSize
    mainModelName = payload.mainModelName
    imageModelName = payload.imageModelName
    referenceVisionModelName = payload.referenceVisionModelName
    imageRefineMode = ""
    imageRefineReason = ""
    refineMode = ""
    refineReason = ""
    sourceImageObjectKey = ""
    sourceImageURL = ""
    referenceImageMode = payload.referenceImageMode
    referenceImageModeUsed = payload.referenceImageMode?.rawValue ?? ""
    pipelineMode = payload.pipelineMode.lafValue
    taskName = payload.taskName
    retrievalSetting = payload.referenceImages.isEmpty ? payload.retrievalSetting : .none
    retrievedReferenceIDs = []
    retrievedReferences = []
    stages = []
    criticMode = ""
    aspectRatio = payload.aspectRatio
    numCandidates = payload.numCandidates
    maxCriticRounds = payload.maxCriticRounds
    promptCharCount = payload.methodContent.count
    resultImageCount = 0
    referenceImageCount = payload.referenceImages.count
    resultImages = []
    referenceImages = payload.referenceImages
    logsTail = ""
    error = ""
    let timestamp = Self.localTimestampFormatter.string(from: date)
    createdAt = timestamp
    updatedAt = timestamp
    startedAt = ""
    completedAt = ""
  }

  init(id: String, status: String, payload: RefineImagePayload, createdAt date: Date = Date()) {
    self.id = id; self.status = status; provider = payload.modelRoutes?.main.accessProvider.rawValue ?? payload.provider.rawValue
    clientPlatform = "ios"; jobType = "refine"; userID = ""; userEmail = ""; configurationMode = payload.configurationMode.rawValue
    modelRoutes = payload.modelRoutes; routingMode = ""; modelRoutingVersion = 0; modelRoutingSource = ""
    methodContent = payload.editInstruction; negativePrompt = ""; caption = "精修图片"; infographicCategory = ""
    outputFormat = .png; imageSize = payload.imageSize; mainModelName = payload.modelRoutes?.main.modelId ?? payload.mainModelName
    imageModelName = payload.modelRoutes?.image.modelId ?? payload.imageModelName; referenceVisionModelName = payload.modelRoutes?.vision.modelId ?? payload.referenceVisionModelName
    imageRefineMode = payload.refineMode ?? ""; imageRefineReason = ""; refineMode = payload.refineMode ?? ""; refineReason = ""
    sourceImageObjectKey = payload.sourceImageObjectKey ?? ""; sourceImageURL = sourceImageObjectKey.isEmpty ? payload.sourceImageURL : ""
    referenceImageMode = nil; referenceImageModeUsed = ""; pipelineMode = ""; taskName = .diagram; retrievalSetting = .none
    retrievedReferenceIDs = []; retrievedReferences = []; stages = []; criticMode = ""; aspectRatio = payload.aspectRatio
    numCandidates = 1; maxCriticRounds = 0; promptCharCount = payload.editInstruction.count; resultImageCount = 0; referenceImageCount = 0
    resultImages = []; referenceImages = []; logsTail = ""; error = ""
    let timestamp = Self.localTimestampFormatter.string(from: date); createdAt = timestamp; updatedAt = timestamp; startedAt = ""; completedAt = ""
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    id = container.string("id", "_id")
    status = container.string("status", default: "unknown")
    provider = container.string("provider")
    clientPlatform = Self.normalizeClientPlatform(container.string("client_platform", "clientPlatform"))
    jobType = container.string("job_type", "jobType", default: "generate")
    userID = container.string("user_id", "userId")
    userEmail = container.string("user_email", "userEmail")
    configurationMode = container.string("configuration_mode", "configurationMode", default: "advanced")
    modelRoutes = (try? container.decodeIfPresent(ModelRoutes.self, forKey: .key("modelRoutes"))) ?? (try? container.decodeIfPresent(ModelRoutes.self, forKey: .key("model_routes")))
    routingMode = container.string("routing_mode", "routingMode")
    modelRoutingVersion = container.int("model_routing_version", "modelRoutingVersion")
    modelRoutingSource = container.string("model_routing_source", "modelRoutingSource")
    methodContent = container.string("method_content", "methodContent")
    negativePrompt = container.string("negative_prompt", "negativePrompt")
    caption = container.string("caption")
    infographicCategory = container.string("infographic_category", "infographicCategory", default: "方法框架图")
    outputFormat = OutputFormat(rawValue: container.string("output_format", "outputFormat", default: "png")) ?? .png
    imageSize = ImageSize(rawValue: container.string("image_size", "imageSize", default: "1K")) ?? .oneK
    mainModelName = container.string("main_model_name", "mainModelName")
    imageModelName = container.string("image_gen_model_name", "imageModelName", "imageGenModelName")
    referenceVisionModelName = container.string("reference_vision_model_name", "referenceVisionModelName")
    imageRefineMode = container.string("image_refine_mode", "imageRefineMode")
    imageRefineReason = container.string("image_refine_reason", "imageRefineReason")
    refineMode = container.string("refine_mode", "refineMode")
    refineReason = container.string("refine_reason", "refineReason")
    sourceImageObjectKey = container.string("source_image_object_key", "sourceImageObjectKey")
    sourceImageURL = container.string("source_image_url", "sourceImageUrl")
    referenceImageMode = ReferenceImageMode(rawValue: container.string("reference_image_mode", "referenceImageMode"))
    referenceImageModeUsed = container.string("reference_image_mode_used", "referenceImageModeUsed")
    pipelineMode = container.string("pipeline_mode", "pipelineMode")
    taskName = TaskName(rawValue: container.string("task_name", "taskName", default: "diagram")) ?? .diagram
    retrievalSetting = RetrievalSetting(rawValue: container.string("retrieval_setting", "retrievalSetting", default: "none")) ?? .none
    retrievedReferenceIDs = container.stringArray("retrieved_reference_ids", "retrievedReferenceIds")
    retrievedReferences = container.decodeArray("retrieved_references", "retrievedReferences")
    stages = container.decodeArray("stages")
    criticMode = container.string("critic_mode", "criticMode")
    aspectRatio = container.string("aspect_ratio", "aspectRatio")
    numCandidates = container.int("num_candidates", "numCandidates")
    maxCriticRounds = container.int("max_critic_rounds", "maxCriticRounds")
    promptCharCount = container.int("prompt_char_count", "promptCharCount")
    resultImages = container.decodeArray("result_images", "resultImages")
    resultImageCount = container.int("result_image_count", "resultImageCount", default: resultImages.count)
    referenceImages = container.decodeArray("reference_images", "referenceImages")
    referenceImageCount = container.int("reference_image_count", "referenceImageCount", default: referenceImages.count)
    let rawLogsTail = container.string("logs_tail", "logsTail")
    let logsArrayTail = container.logsString("logs")
    logsTail = [rawLogsTail, logsArrayTail]
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
      .joined(separator: "\n")
    error = container.string("error")
    createdAt = container.string("created_at", "createdAt")
    updatedAt = container.string("updated_at", "updatedAt")
    startedAt = container.string("started_at", "startedAt")
    completedAt = container.string("completed_at", "completedAt")
  }

  private var displayProvider: String {
    let providerID = ProviderID(rawValue: provider)
    return ProviderCatalog.config(for: providerID).label
  }

  private var displayRoutes: String {
    guard let modelRoutes else { return "未记录" }
    return [modelRoutes.main, modelRoutes.image, modelRoutes.vision]
      .map { "\(ProviderCatalog.config(for: $0.accessProvider).label) · \($0.modelId)" }
      .joined(separator: "\n")
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

  private static let localTimestampFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private var displayConfigurationMode: String {
    switch configurationMode {
    case "simple":
      return "普通模式"
    case "advanced":
      return "专业模式"
    default:
      return "未记录"
    }
  }

  private var displayReferenceImageMode: String {
    let rawMode = referenceImageModeUsed.isEmpty ? referenceImageMode?.rawValue ?? "" : referenceImageModeUsed
    switch rawMode {
    case ReferenceImageMode.mainModel.rawValue:
      return ReferenceImageMode.mainModel.title
    case ReferenceImageMode.visionModel.rawValue:
      return ReferenceImageMode.visionModel.title
    case "auto":
      return "自动选择"
    case "none":
      return "未使用参考图"
    default:
      return "未记录"
    }
  }

  private var displayReferenceVisionModel: String {
    let rawMode = referenceImageModeUsed.isEmpty ? referenceImageMode?.rawValue ?? "" : referenceImageModeUsed
    guard rawMode == ReferenceImageMode.visionModel.rawValue else { return "未使用" }
    return displayValue(referenceVisionModelName)
  }

  private var displayCriticMode: String {
    switch criticMode {
    case "image":
      return "图像评审"
    case "text":
      return "文本评审"
    default:
      return "未记录"
    }
  }

  private func displayValue(_ value: String, fallback: String = "未记录") -> String {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? fallback : trimmed
  }

  private func formattedRecordDate(_ value: String) -> String {
    guard !value.isEmpty else { return "未记录" }
    // 绝对时间策略（UTC，与 web 端记录页一致、冻结断言锁定 + 解析失败截断回退）集中在 DateDisplay。
    return DateDisplay.absolute(fromISO: value)
  }
}
