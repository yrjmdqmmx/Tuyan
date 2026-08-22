import Foundation

#if DEBUG
/// Deterministic state for UI tests and local screenshot capture. This type is
/// compiled only in Debug and never supplies credentials or invokes a network
/// endpoint. It deliberately uses the same decoded registry/job shapes as the
/// production client.
@MainActor
enum DebugPreviewConfiguration {
  static var isUITesting: Bool {
    UserDefaults.standard.bool(forKey: "pb-ui-testing")
  }

  static var usesLiveRegistryPreview: Bool {
    UserDefaults.standard.bool(forKey: "pb-preview-live-registry")
  }

  /// These are intentionally independent from `pb-ui-testing`: a Debug launch
  /// only disables side effects when the caller opted in with the explicit
  /// flag. This keeps ordinary Debug runs representative of production.
  static var isNetworkDisabled: Bool { launchFlag("pb-ui-disable-network") }
  static var isAnimationsDisabled: Bool { launchFlag("pb-ui-disable-animations") }
  static var usesDarkPreview: Bool { launchFlag("pb-ui-preview-dark") }
  static var usesReduceMotionPreview: Bool { launchFlag("pb-ui-preview-reduce-motion") }
  static var usesAccessibilityXXLPreview: Bool {
    UserDefaults.standard.string(forKey: "pb-ui-preview-accessibility-size") == "AX-XXL"
  }

  static func configure(_ model: AppModel) {
    guard isUITesting else { return }

    // Arguments live in NSArgumentDomain; clearing the persistent domain keeps
    // UI tests isolated without erasing the launch contract itself.
    if let bundleID = Bundle.main.bundleIdentifier {
      UserDefaults.standard.removePersistentDomain(forName: bundleID)
    }

    if usesLiveRegistryPreview {
      model.modelRegistry.acceptLiveRegistry(registry)
    }
    model.generation.draft.applyProviderDefaults(.bailian, routes: registry.defaultRoutes(for: .bailian))
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.retrievalSetting = .manual
    model.generation.draft.setNegativePrompt("避免测试图中的真实邮箱、密钥或不可读文字。")
    model.generation.normalizeDraftWithLiveRegistry()

    if UserDefaults.standard.bool(forKey: "pb-preview-reference-library") {
      model.generation.referenceLibraryPage = referencePage
      model.generation.referenceLibrary = referencePage.references
      model.generation.featuredTemplateArtworks = FeaturedTemplateCatalog.withImages(referencePage.references)
    }

    if UserDefaults.standard.bool(forKey: "pb-preview-signed-in") {
      model.auth.currentUser = previewUser
    }

    if UserDefaults.standard.bool(forKey: "pb-preview-current-result") {
      let job = JobPreviewFixtures.succeeded
      model.jobs.currentJobID = job.id
      model.jobs.currentJob = job
      model.jobs.userJobs = [job]
      model.jobs.localJobs = [job]
    }

    if let raw = UserDefaults.standard.string(forKey: "pb-initial-tab"), let tab = AppTab(rawValue: raw) {
      model.selectedTab = tab
    }
  }

  static let previewUser = decode(CurrentUser.self, #"{"id":"ui-preview-user","email":"ui-preview@paperbanana.invalid","name":"UI Preview"}"#)

  private static let registry: ModelRegistry = decode(ModelRegistry.self, """
  {"code":0,"registryVersion":"2026-08-21.v9-ui-preview","routeContractVersion":9,"supportsModelRoutes":true,"providers":{
    "bailian":\(providerJSON("bailian")),
    "openrouter":\(providerJSON("openrouter")),
    "gemini":\(providerJSON("gemini")),
    "openai":\(providerJSON("openai")),
    "ark":\(providerJSON("ark"))
  },"unavailableProviders":{}}
  """)

  private static func providerJSON(_ provider: String) -> String {
    """
    {"accessKind":"preview","routeContractVersion":9,"accountCatalogRequired":false,"defaults":{"main":"\(provider)-main","image":"\(provider)-image","vision":"\(provider)-vision"},"models":[
      {"id":"\(provider)-main","label":"\(provider) Main","vendor":"\(provider)","lifecycle":"stable","recommended":true,"requiresEntitlement":false,"inputModalities":["text"],"outputModalities":["text"],"verified":false,"verificationState":"registry","selectable":true,"roles":["main"],"roleReasons":{},"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"},"protocol":"preview","availabilityNotes":"Debug UI fixture"},
      {"id":"\(provider)-image","label":"\(provider) Image","vendor":"\(provider)","lifecycle":"stable","recommended":true,"requiresEntitlement":false,"inputModalities":["text","image"],"outputModalities":["image"],"verified":false,"verificationState":"registry","selectable":true,"roles":["image"],"roleReasons":{},"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":true,"imageEditMode":"direct-edit","resolutions":["1K","2K","4K"],"refineResolutions":["1K","2K","4K"],"aspectRatios":["1:1","3:2","16:9","9:16"],"refineAspectRatios":["1:1","3:2","16:9","9:16"],"outputFormats":["png"]},"protocol":"preview","availabilityNotes":"Debug UI fixture"},
      {"id":"\(provider)-vision","label":"\(provider) Vision","vendor":"\(provider)","lifecycle":"stable","recommended":true,"requiresEntitlement":false,"inputModalities":["image"],"outputModalities":["text"],"verified":false,"verificationState":"registry","selectable":true,"roles":["vision"],"roleReasons":{},"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"},"protocol":"preview","availabilityNotes":"Debug UI fixture"}
    ]}
    """
  }

  private static let referencePage: ReferenceLibraryPage = decode(ReferenceLibraryPage.self, """
  {"references":[
    {"id":"ref_279","task_name":"diagram","title":"多智能体方法框架","summary":"检索、规划、生成与评审。","image_url":"\(JobPreviewFixtures.sampleImageDataURL)","image_object_key":"bench/ref_279.png","source":"paperbanana-bench","titleZh":"多智能体方法框架","titleEn":"Multi-agent method","summaryZh":"研究方法结构示例","summaryEn":"Method structure example"},
    {"id":"ref_281","task_name":"diagram","title":"实验与重建流程","summary":"采集到评估的闭环。","image_url":"\(JobPreviewFixtures.sampleImageDataURL)","image_object_key":"bench/ref_281.png","source":"paperbanana-bench","titleZh":"实验与重建流程","titleEn":"Experiment workflow","summaryZh":"可筛选的测试参考图","summaryEn":"Filterable test reference"}
  ],"total":24,"page":1,"page_size":12,"total_pages":2,"facets":{"visual_categories":[{"value":"framework","count":12,"label_zh":"框架图","label_en":"Framework"}],"research_domains":[{"value":"AI","count":8,"label_zh":"人工智能","label_en":"AI"}]}}
  """)

  private static func decode<T: Decodable>(_ type: T.Type, _ json: String) -> T {
    guard let data = json.data(using: .utf8), let value = try? JSONDecoder().decode(T.self, from: data) else {
      preconditionFailure("Debug UI fixture cannot decode \(T.self)")
    }
    return value
  }

  private static func launchFlag(_ key: String) -> Bool {
    UserDefaults.standard.bool(forKey: key)
  }
}
#endif
