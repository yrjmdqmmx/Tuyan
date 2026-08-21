import Foundation

struct GenerationDraft: Equatable {
  var configurationMode: ConfigurationMode = .simple
  var provider: ProviderID = .bailian
  var methodContent: String = PaperBananaSamples.sampleMethod
  var caption: String = "图 1：所提出的多智能体学术图示生成框架总览。"
  var infographicCategoryID: String = "method_framework"
  var outputFormat: OutputFormat = .png
  var imageSize: ImageSize = .oneK
  // Legacy shadows remain for historic UI/templates; new submission uses routes.
  var mainModelName: String = ""
  var imageModelName: String = ""
  var referenceVisionModelName: String = ""
  var modelRoutes: ModelRoutes?
  var negativePrompt: String = ""
  var referenceImageMode: ReferenceImageMode = .visionModel
  var referenceImages: [PendingReferenceImage] = []
  var pipelineMode: PipelineMode = .plannerCritic
  var retrievalSetting: RetrievalSetting = .none
  var manualReferenceIds: [String] = []
  var aspectRatio: String = "16:9"
  var numCandidates: Int = 1
  var maxCriticRounds: Int = 1

  mutating func setNegativePrompt(_ value: String) { negativePrompt = String(value.prefix(1_000)) }

  var selectedCategory: InfographicCategory {
    PaperBananaSamples.categories.first { $0.id == infographicCategoryID } ?? PaperBananaSamples.categories[0]
  }

  var taskName: TaskName {
    infographicCategoryID == "data_stat" ? .plot : .diagram
  }

  mutating func applyProviderDefaults(_ provider: ProviderID, routes: ModelRoutes?) {
    self.provider = provider
    guard let routes else { return }
    modelRoutes = routes
    mainModelName = routes.main.modelId
    imageModelName = routes.image.modelId
    referenceVisionModelName = routes.vision.modelId
    self.provider = routes.main.accessProvider
  }

  mutating func normalize(with registry: ModelRegistry) {
    let routes = modelRoutes ?? registry.defaultRoutes(for: provider)
    guard let routes else { return }
    modelRoutes = routes
    provider = routes.main.accessProvider
    mainModelName = routes.main.modelId
    imageModelName = routes.image.modelId
    referenceVisionModelName = routes.vision.modelId
    let supported = registry.generationResolutions(for: routes.image)
    if !supported.contains(imageSize), let first = supported.first {
      imageSize = first
    }
  }
}
