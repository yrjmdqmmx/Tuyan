import XCTest
@testable import PaperBanana

@MainActor
final class IOSRealDeviceUIRepairTests: XCTestCase {
  func testReferencePageDecodesProductionTotalItemsAndCalculatesPages() throws {
    let data = Data(#"{"references":[],"totalItems":306,"page":1,"pageSize":12,"facets":{}}"#.utf8)

    let page = try JSONDecoder().decode(ReferenceLibraryPage.self, from: data)

    XCTAssertEqual(page.total, 306)
    XCTAssertEqual(page.totalPages, 26)
  }

  func testReferencePageStillDecodesLegacyTotal() throws {
    let data = Data(#"{"references":[],"total":18,"page":2,"page_size":12,"total_pages":2,"facets":{}}"#.utf8)

    let page = try JSONDecoder().decode(ReferenceLibraryPage.self, from: data)

    XCTAssertEqual(page.total, 18)
    XCTAssertEqual(page.totalPages, 2)
  }

  func testSimpleSummaryUsesEffectiveRoutesAndSubmissionDefaults() throws {
    let model = AppModel()
    model.modelRegistry.acceptLiveRegistry(try makeRegistry())
    model.generation.normalizeDraftWithLiveRegistry()
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.pipelineMode = .vanilla
    model.generation.draft.retrievalSetting = .auto
    model.generation.draft.numCandidates = 3
    model.generation.draft.maxCriticRounds = 0
    model.generation.draft.configurationMode = .simple

    let summary = GenerationConfigurationSummary(store: model.generation)

    XCTAssertEqual(summary.routes.map(\.role), [.main, .image, .vision])
    XCTAssertEqual(summary.routes.map(\.modelLabel), ["Main Model", "Image Model", "Vision Model"])
    XCTAssertEqual(summary.pipeline, .plannerCritic)
    XCTAssertEqual(summary.retrieval, .none)
    XCTAssertEqual(summary.candidates, 1)
    XCTAssertEqual(summary.criticRounds, 1)
  }

  func testFeaturedCarouselPolicyUsesThreeSecondsAndHonorsPauses() {
    XCTAssertEqual(FeaturedTemplateAutoplayPolicy.interval, .seconds(3))
    XCTAssertTrue(FeaturedTemplateAutoplayPolicy.shouldAdvance(reduceMotion: false, isInteracting: false, sceneIsActive: true))
    XCTAssertFalse(FeaturedTemplateAutoplayPolicy.shouldAdvance(reduceMotion: true, isInteracting: false, sceneIsActive: true))
    XCTAssertFalse(FeaturedTemplateAutoplayPolicy.shouldAdvance(reduceMotion: false, isInteracting: true, sceneIsActive: true))
    XCTAssertFalse(FeaturedTemplateAutoplayPolicy.shouldAdvance(reduceMotion: false, isInteracting: false, sceneIsActive: false))
  }

  func testRouteCatalogGroupsRoleModelsByProviderAndVendorIncludingDisabledCards() throws {
    let registry = try makeRegistry()
    let catalog = ModelRouteSelectionCatalog(registry: registry, role: .main)

    XCTAssertEqual(catalog.providers, [.bailian])
    XCTAssertEqual(catalog.vendors(for: .bailian), ["Alibaba Qwen"])
    XCTAssertEqual(catalog.models(for: .bailian, vendor: "Alibaba Qwen").map(\.id), ["main-a", "main-disabled"])
    XCTAssertTrue(catalog.models(for: .bailian, vendor: "Alibaba Qwen")[0].selectable)
    XCTAssertEqual(catalog.models(for: .bailian, vendor: "Alibaba Qwen")[1].disabledReason, "需要额外权益")
  }

  private func makeRegistry() throws -> ModelRegistry {
    try JSONDecoder().decode(ModelRegistry.self, from: Data(#"""
    {"code":0,"registryVersion":"2026-08-21.v9","routeContractVersion":1,"supportsModelRoutes":true,"providers":{"bailian":{"accessKind":"aggregator","routeContractVersion":1,"accountCatalogRequired":false,"defaults":{"main":"main-a","image":"image-a","vision":"vision-a"},"models":[{"id":"main-a","label":"Main Model","vendor":"Alibaba Qwen","lifecycle":"stable","recommended":true,"verificationState":"registry","roles":["main"],"selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},{"id":"main-disabled","label":"Unavailable Main","vendor":"Alibaba Qwen","lifecycle":"stable","verificationState":"catalog","roles":["main"],"selectable":false,"disabledReason":"需要额外权益","capabilities":{"referenceImages":false,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},{"id":"image-a","label":"Image Model","vendor":"Alibaba Qwen","lifecycle":"stable","verificationState":"registry","roles":["image"],"selectable":true,"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":true,"imageEditMode":"direct-edit","resolutions":["1K","2K"],"aspectRatios":["16:9"]}},{"id":"vision-a","label":"Vision Model","vendor":"Alibaba Qwen","lifecycle":"stable","verificationState":"registry","roles":["vision"],"selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}}]}}}
    """#.utf8))
  }
}
