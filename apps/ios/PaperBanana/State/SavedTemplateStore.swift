import Foundation
import Observation

struct SavedGenerationTemplate: Identifiable, Codable, Equatable {
  var id: String
  var title: String
  var createdAt: Date
  var updatedAt: Date
  var configuration: SavedGenerationTemplateConfiguration

  var displayTitle: String {
    let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? configuration.categoryLabel : trimmed
  }
}

struct SavedGenerationTemplateConfiguration: Codable, Equatable {
  var configurationMode: ConfigurationMode
  var provider: ProviderID
  var methodContent: String
  var caption: String
  var infographicCategoryID: String
  var outputFormat: OutputFormat
  var imageSize: ImageSize
  var mainModelName: String
  var imageModelName: String
  var referenceVisionModelName: String
  var referenceImageMode: ReferenceImageMode
  var pipelineMode: PipelineMode
  var retrievalSetting: RetrievalSetting
  var manualReferenceIds: [String]
  var aspectRatio: String
  var numCandidates: Int
  var maxCriticRounds: Int
  var modelRoutes: ModelRoutes?
  var negativePrompt: String

  init(draft: GenerationDraft) {
    configurationMode = draft.configurationMode
    provider = draft.provider
    methodContent = draft.methodContent
    caption = draft.caption
    infographicCategoryID = draft.infographicCategoryID
    outputFormat = draft.outputFormat
    imageSize = draft.imageSize
    mainModelName = draft.mainModelName
    imageModelName = draft.imageModelName
    referenceVisionModelName = draft.referenceVisionModelName
    referenceImageMode = draft.referenceImageMode
    pipelineMode = draft.pipelineMode
    aspectRatio = draft.aspectRatio
    numCandidates = draft.numCandidates
    maxCriticRounds = draft.maxCriticRounds
    modelRoutes = draft.modelRoutes
    negativePrompt = draft.negativePrompt

    // 模板记录的是可复用配置，不记录本机待上传参考图；若当前草稿带参考图，
    // 套用模板时不能保留依赖图片的检索语义。
    if draft.referenceImages.isEmpty {
      retrievalSetting = draft.retrievalSetting
      manualReferenceIds = draft.manualReferenceIds
    } else {
      retrievalSetting = .none
      manualReferenceIds = []
    }
  }

  var categoryLabel: String {
    PaperBananaSamples.categories.first { $0.id == infographicCategoryID }?.label ?? infographicCategoryID
  }

  func apply(to draft: inout GenerationDraft) {
    draft.configurationMode = configurationMode
    draft.provider = provider
    draft.methodContent = methodContent
    draft.caption = caption
    draft.infographicCategoryID = infographicCategoryID
    draft.outputFormat = outputFormat
    draft.imageSize = imageSize
    draft.mainModelName = mainModelName
    draft.imageModelName = imageModelName
    draft.referenceVisionModelName = referenceVisionModelName
    draft.referenceImageMode = referenceImageMode
    draft.referenceImages = []
    draft.pipelineMode = pipelineMode
    draft.retrievalSetting = retrievalSetting
    draft.manualReferenceIds = manualReferenceIds
    draft.aspectRatio = aspectRatio
    draft.numCandidates = numCandidates
    draft.maxCriticRounds = maxCriticRounds
    draft.modelRoutes = modelRoutes
    draft.setNegativePrompt(negativePrompt)
  }

  private enum CodingKeys: String, CodingKey {
    case configurationMode, provider, methodContent, caption, infographicCategoryID, outputFormat, imageSize, mainModelName, imageModelName, referenceVisionModelName, referenceImageMode, pipelineMode, retrievalSetting, manualReferenceIds, aspectRatio, numCandidates, maxCriticRounds, modelRoutes, negativePrompt
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    configurationMode = try c.decode(ConfigurationMode.self, forKey: .configurationMode); provider = try c.decode(ProviderID.self, forKey: .provider); methodContent = try c.decode(String.self, forKey: .methodContent); caption = try c.decode(String.self, forKey: .caption); infographicCategoryID = try c.decode(String.self, forKey: .infographicCategoryID); outputFormat = try c.decode(OutputFormat.self, forKey: .outputFormat); imageSize = try c.decode(ImageSize.self, forKey: .imageSize); mainModelName = try c.decode(String.self, forKey: .mainModelName); imageModelName = try c.decode(String.self, forKey: .imageModelName); referenceVisionModelName = try c.decode(String.self, forKey: .referenceVisionModelName); referenceImageMode = try c.decode(ReferenceImageMode.self, forKey: .referenceImageMode); pipelineMode = try c.decode(PipelineMode.self, forKey: .pipelineMode); retrievalSetting = try c.decode(RetrievalSetting.self, forKey: .retrievalSetting); manualReferenceIds = try c.decode([String].self, forKey: .manualReferenceIds); aspectRatio = try c.decode(String.self, forKey: .aspectRatio); numCandidates = try c.decode(Int.self, forKey: .numCandidates); maxCriticRounds = try c.decode(Int.self, forKey: .maxCriticRounds); negativePrompt = try c.decodeIfPresent(String.self, forKey: .negativePrompt) ?? ""
    modelRoutes = try c.decodeIfPresent(ModelRoutes.self, forKey: .modelRoutes) ?? ModelRoutes(main: ModelRoute(accessProvider: provider, modelId: mainModelName), image: ModelRoute(accessProvider: provider, modelId: imageModelName), vision: ModelRoute(accessProvider: provider, modelId: referenceVisionModelName))
  }
}

@Observable
@MainActor
final class SavedTemplateStore {
  var templates: [SavedGenerationTemplate] = []

  @ObservationIgnored private let defaults: UserDefaults
  static let v1StorageKey = "paperbanana.saved-generation-templates.v1"
  static let v2StorageKey = "paperbanana.saved-generation-templates.v2"
  @ObservationIgnored private let maxTemplates = 30

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    load()
  }

  @discardableResult
  func save(draft: GenerationDraft, title: String) -> SavedGenerationTemplate {
    let now = Date()
    let template = SavedGenerationTemplate(
      id: UUID().uuidString,
      title: resolvedTitle(title: title, draft: draft),
      createdAt: now,
      updatedAt: now,
      configuration: SavedGenerationTemplateConfiguration(draft: draft)
    )
    templates.insert(template, at: 0)
    if templates.count > maxTemplates {
      templates = Array(templates.prefix(maxTemplates))
    }
    persist()
    return template
  }

  func delete(_ template: SavedGenerationTemplate) {
    templates.removeAll { $0.id == template.id }
    persist()
  }

  /// 删除账号时清空所有本机保存的模板（含 UserDefaults 持久化）。
  func clearAll() {
    templates = []
    defaults.removeObject(forKey: Self.v1StorageKey)
    defaults.removeObject(forKey: Self.v2StorageKey)
  }

  private func load() {
    if let data = defaults.data(forKey: Self.v2StorageKey), let decoded = try? JSONDecoder().decode([SavedGenerationTemplate].self, from: data) {
      templates = decoded
      return
    }
    guard let legacy = defaults.data(forKey: Self.v1StorageKey), let decoded = try? JSONDecoder().decode([SavedGenerationTemplate].self, from: legacy) else { templates = []; return }
    templates = decoded
    persist()
    defaults.removeObject(forKey: Self.v1StorageKey)
  }

  private func persist() {
    guard let data = try? JSONEncoder().encode(templates) else { return }
    defaults.set(data, forKey: Self.v2StorageKey)
  }

  private func resolvedTitle(title: String, draft: GenerationDraft) -> String {
    let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty { return trimmed }

    let caption = draft.caption.trimmingCharacters(in: .whitespacesAndNewlines)
    if !caption.isEmpty {
      return String(caption.prefix(18))
    }
    return "\(draft.selectedCategory.label)模板"
  }
}
