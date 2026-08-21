import Foundation

/// A server-owned provider identifier.
///
/// This deliberately is not an enum: the model registry may introduce a new
/// access provider before this client is updated. Unknown values must remain
/// decodable so historical jobs and cached registry data keep working.
struct ProviderID: RawRepresentable, Codable, Identifiable, Hashable, Sendable {
  let rawValue: String

  init(rawValue: String) {
    self.rawValue = rawValue
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    self.init(rawValue: try container.decode(String.self))
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    try container.encode(rawValue)
  }

  var id: String { rawValue }

  static let bailian = ProviderID(rawValue: "bailian")
  static let ark = ProviderID(rawValue: "ark")
  static let openrouter = ProviderID(rawValue: "openrouter")
  static let gemini = ProviderID(rawValue: "gemini")
  static let openai = ProviderID(rawValue: "openai")
}

enum ConfigurationMode: String, CaseIterable, Codable, Identifiable {
  case simple
  case advanced

  var id: String { rawValue }

  var title: String {
    switch self {
    case .simple: "普通模式"
    case .advanced: "专业模式"
    }
  }
}

enum TaskName: String, Codable, Identifiable {
  case diagram
  case plot

  var id: String { rawValue }
}

enum OutputFormat: String, CaseIterable, Codable, Identifiable {
  case png
  case svg

  var id: String { rawValue }

  var title: String {
    switch self {
    case .png: "PNG 图片"
    case .svg: "SVG 矢量图"
    }
  }
}

enum ImageSize: String, CaseIterable, Codable, Identifiable {
  case oneK = "1K"
  case twoK = "2K"
  case fourK = "4K"

  var id: String { rawValue }

  var title: String {
    switch self {
    case .oneK: "1K 标准"
    case .twoK: "2K 高清"
    case .fourK: "4K 超清"
    }
  }
}

enum ReferenceImageMode: String, Codable, Identifiable {
  case mainModel = "main_model"
  case visionModel = "vision_model"

  var id: String { rawValue }

  var title: String {
    switch self {
    case .mainModel: "主模型直读"
    case .visionModel: "独立识别模型"
    }
  }
}

enum PipelineMode: String, CaseIterable, Codable, Identifiable {
  case plannerCritic = "demo_planner_critic"
  case full = "demo_full"
  case vanilla

  var id: String { rawValue }

  var title: String {
    switch self {
    case .plannerCritic: "规划器 + 评审器"
    case .full: "完整流程"
    case .vanilla: "基础生成"
    }
  }

  var lafValue: String {
    switch self {
    case .plannerCritic: "planner_critic"
    case .full: "full"
    case .vanilla: "vanilla"
    }
  }
}

enum RetrievalSetting: String, CaseIterable, Codable, Identifiable {
  case none
  case auto
  case random
  case manual

  var id: String { rawValue }

  var title: String {
    switch self {
    case .none: "不使用检索"
    case .auto: "自动检索"
    case .random: "随机参考"
    case .manual: "手动参考"
    }
  }
}

struct ProviderConfig: Identifiable, Equatable {
  let id: ProviderID
  let label: String
  let keyName: String
  let keyPlaceholder: String
  let guideURL: URL
  let guideSteps: [String]
}

struct ModelCapability: Decodable, Equatable {
  let status: String
  let supportsReferenceImages: Bool
  let reason: String
  let source: String
  let cached: Bool

  init(
    status: String,
    supportsReferenceImages: Bool,
    reason: String,
    source: String,
    cached: Bool
  ) {
    self.status = status
    self.supportsReferenceImages = supportsReferenceImages
    self.reason = reason
    self.source = source
    self.cached = cached
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    status = container.string("status", default: "unknown")
    supportsReferenceImages = container.bool("supportsReferenceImages", "supports_reference_images")
    reason = container.string("reason")
    source = container.string("source")
    cached = container.bool("cached")
  }
}
