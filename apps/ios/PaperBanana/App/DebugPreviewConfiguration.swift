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

  static var usesReferenceLibraryPreview: Bool {
    UserDefaults.standard.bool(forKey: "pb-preview-reference-library")
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

    if usesReferenceLibraryPreview {
      let page = previewReferenceLibraryPage(for: .init())!
      model.generation.referenceLibraryPage = page
      model.generation.referenceLibrary = page.references
      model.generation.featuredTemplateArtworks = FeaturedTemplateCatalog.withImages(page.references)
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
  {"code":0,"registryVersion":"2026-08-21.v9-ui-preview","routeContractVersion":1,"supportsModelRoutes":true,"providers":{
    "bailian":\(providerJSON("bailian")),
    "openrouter":\(providerJSON("openrouter")),
    "gemini":\(providerJSON("gemini")),
    "openai":\(providerJSON("openai")),
    "ark":\(providerJSON("ark"))
  },"unavailableProviders":{}}
  """)

  private static func providerJSON(_ provider: String) -> String {
    """
    {"accessKind":"preview","routeContractVersion":1,"accountCatalogRequired":false,"defaults":{"main":"\(provider)-main","image":"\(provider)-image","vision":"\(provider)-vision"},"models":[
      {"id":"\(provider)-main","label":"\(provider) Main","vendor":"\(provider)","lifecycle":"stable","recommended":true,"requiresEntitlement":false,"inputModalities":["text"],"outputModalities":["text"],"verified":false,"verificationState":"registry","selectable":true,"roles":["main"],"roleReasons":{},"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"},"protocol":"preview","availabilityNotes":"Debug UI fixture"},
      {"id":"\(provider)-image","label":"\(provider) Image","vendor":"\(provider)","lifecycle":"stable","recommended":true,"requiresEntitlement":false,"inputModalities":["text","image"],"outputModalities":["image"],"verified":false,"verificationState":"registry","selectable":true,"roles":["image"],"roleReasons":{},"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":true,"imageEditMode":"direct-edit","resolutions":["1K","2K","4K"],"refineResolutions":["1K","2K","4K"],"aspectRatios":["1:1","3:2","16:9","9:16"],"refineAspectRatios":["1:1","3:2","16:9","9:16"],"outputFormats":["png"]},"protocol":"preview","availabilityNotes":"Debug UI fixture"},
      {"id":"\(provider)-vision","label":"\(provider) Vision","vendor":"\(provider)","lifecycle":"stable","recommended":true,"requiresEntitlement":false,"inputModalities":["image"],"outputModalities":["text"],"verified":false,"verificationState":"registry","selectable":true,"roles":["vision"],"roleReasons":{},"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"},"protocol":"preview","availabilityNotes":"Debug UI fixture"}
    ]}
    """
  }

  static func previewReferenceLibraryPage(for request: ReferenceLibraryPageRequest) -> ReferenceLibraryPage? {
    guard isUITesting, usesReferenceLibraryPreview else { return nil }
    let query = request.query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let queryMatches = previewReferences.filter { reference in
      query.isEmpty || [reference.item.title, reference.item.summary, reference.item.shortZh, reference.item.shortEn, reference.item.detailZh, reference.item.detailEn]
        .joined(separator: " ")
        .lowercased()
        .contains(query)
    }
    let matching = queryMatches.filter { reference in
      (request.visualCategory == nil || request.visualCategory == reference.visualCategory) &&
      (request.researchDomain == nil || request.researchDomain == reference.researchDomain)
    }
    let pageSize = 2
    let isUnfiltered = query.isEmpty && request.visualCategory == nil && request.researchDomain == nil
    let reportedTotal = isUnfiltered ? 306 : matching.count
    let totalPages = max(1, Int(ceil(Double(max(reportedTotal, 1)) / Double(pageSize))))
    let page = min(max(1, request.page), totalPages)
    let start = min((page - 1) * pageSize, matching.count)
    let end = min(start + pageSize, matching.count)
    let visualFacets = Dictionary(grouping: queryMatches, by: \.visualCategory).map { key, values in
      ReferenceFacet(value: key, count: values.count, labelZh: key == "framework" ? "框架图" : "流程图", labelEn: key == "framework" ? "Framework" : "Workflow")
    }.sorted { $0.value < $1.value }
    let domainFacets = Dictionary(grouping: queryMatches, by: \.researchDomain).map { key, values in
      ReferenceFacet(value: key, count: values.count, labelZh: key == "AI" ? "人工智能" : "生命科学", labelEn: key)
    }.sorted { $0.value < $1.value }
    return ReferenceLibraryPage(
      references: Array(matching[start..<end]).map(\.item),
      total: reportedTotal,
      page: page,
      pageSize: pageSize,
      totalPages: totalPages,
      facets: ReferenceLibraryFacets(visualCategories: visualFacets, researchDomains: domainFacets)
    )
  }

  private struct PreviewReference {
    let item: ReferenceLibraryItem
    let visualCategory: String
    let researchDomain: String
  }

  private static let previewReferences: [PreviewReference] = [
    PreviewReference(item: previewReference("ref_279", "多智能体框架图", "Multi-agent framework", "检索、规划、生成与评审。"), visualCategory: "framework", researchDomain: "AI"),
    PreviewReference(item: previewReference("ref_281", "实验重建流程图", "Experiment reconstruction", "采集到评估的闭环。"), visualCategory: "workflow", researchDomain: "LifeScience"),
    PreviewReference(item: previewReference("ref_245", "分子机制图", "Molecular mechanism", "可筛选的结构图示。"), visualCategory: "framework", researchDomain: "LifeScience"),
    PreviewReference(item: previewReference("ref_240", "模型架构图", "Model architecture", "模块化模型结构。"), visualCategory: "framework", researchDomain: "AI"),
    PreviewReference(item: previewReference("ref_295", "系统记忆图", "System memory", "多阶段系统状态。"), visualCategory: "framework", researchDomain: "AI"),
  ]

  private static func previewReference(_ id: String, _ title: String, _ titleEn: String, _ summary: String) -> ReferenceLibraryItem {
    ReferenceLibraryItem(id: id, taskName: .diagram, title: title, summary: summary, imageURL: JobPreviewFixtures.sampleImageDataURL, imageObjectKey: "bench/\(id).png", source: "paperbanana-bench", shortZh: title, shortEn: titleEn, detailZh: summary, detailEn: summary)
  }

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
