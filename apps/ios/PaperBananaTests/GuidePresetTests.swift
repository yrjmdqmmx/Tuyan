import XCTest
@testable import PaperBanana

@MainActor
final class GuidePresetTests: XCTestCase {
  func testPresetRefusesCachedRegistryAndLeavesDraftUntouched() throws {
    var draft = GenerationDraft()
    let before = draft

    let result = GuidePreset.apply(.balanced, to: &draft, registry: try registry(), hasLiveRegistry: false)

    XCTAssertEqual(result, .directoryUnavailable)
    XCTAssertEqual(draft, before)
  }

  func testBudgetPresetKeepsCurrentProviderDefaultsAndOnlyReducesWorkflow() throws {
    var draft = GenerationDraft()
    draft.provider = .bailian

    let result = GuidePreset.apply(.budget, to: &draft, registry: try registry(), hasLiveRegistry: true)

    XCTAssertEqual(result, .applied)
    XCTAssertEqual(draft.configurationMode, .advanced)
    XCTAssertEqual(draft.modelRoutes?.main.modelId, "main-default")
    XCTAssertEqual(draft.modelRoutes?.image.modelId, "image-default")
    XCTAssertEqual(draft.modelRoutes?.vision.modelId, "vision-default")
    XCTAssertEqual(draft.pipelineMode, .vanilla)
    XCTAssertEqual(draft.numCandidates, 1)
    XCTAssertEqual(draft.maxCriticRounds, 0)
    XCTAssertEqual(draft.retrievalSetting, .none)
    XCTAssertEqual(draft.imageSize, .oneK)
  }

  func testBudgetPresetReplacesRetiredCurrentRoutesWithLiveProviderDefaults() throws {
    var draft = GenerationDraft()
    draft.provider = .bailian
    draft.modelRoutes = ModelRoutes(
      main: ModelRoute(accessProvider: .bailian, modelId: "retired-main"),
      image: ModelRoute(accessProvider: .bailian, modelId: "retired-image"),
      vision: ModelRoute(accessProvider: .bailian, modelId: "retired-vision")
    )

    let result = GuidePreset.apply(.budget, to: &draft, registry: try registry(), hasLiveRegistry: true)

    XCTAssertEqual(result, .applied)
    XCTAssertEqual(draft.modelRoutes?.main.modelId, "main-default")
    XCTAssertEqual(draft.modelRoutes?.image.modelId, "image-default")
    XCTAssertEqual(draft.modelRoutes?.vision.modelId, "vision-default")
  }

  func testQualityPresetUsesHighestRegistryResolutionWithoutHardCodingModelIDs() throws {
    var draft = GenerationDraft()

    let result = GuidePreset.apply(.quality, to: &draft, registry: try registry(), hasLiveRegistry: true)

    XCTAssertEqual(result, .applied)
    XCTAssertEqual(draft.pipelineMode, .full)
    XCTAssertEqual(draft.numCandidates, 3)
    XCTAssertEqual(draft.maxCriticRounds, 2)
    XCTAssertEqual(draft.retrievalSetting, .auto)
    XCTAssertEqual(draft.imageSize, .fourK)
  }

  func testRuntimeSummaryDoesNotPresentCachedRegistryAsLive() throws {
    let cached = GuideRuntimeSummary(registry: try registry(), hasLiveRegistry: false, draft: GenerationDraft())
    let live = GuideRuntimeSummary(registry: try registry(), hasLiveRegistry: true, draft: GenerationDraft())

    XCTAssertFalse(cached.isAvailable)
    XCTAssertEqual(cached.statusText, "目录不可用，新任务已禁用")
    XCTAssertTrue(live.isAvailable)
    XCTAssertEqual(live.registryVersion, "test-v9")
    XCTAssertEqual(live.routeContractVersion, 1)
    XCTAssertEqual(live.providers, [.bailian])
  }

  private func registry() throws -> ModelRegistry {
    try JSONDecoder().decode(ModelRegistry.self, from: Data(#"""
    {"code":0,"registryVersion":"test-v9","routeContractVersion":1,"supportsModelRoutes":true,"providers":{"bailian":{"accessKind":"direct","routeContractVersion":1,"accountCatalogRequired":false,"defaults":{"main":"main-default","image":"image-default","vision":"vision-default"},"models":[
      {"id":"main-default","label":"Main default","vendor":"Example","lifecycle":"stable","verificationState":"registry","selectable":true,"roles":["main"],"capabilities":{"referenceImages":false,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},
      {"id":"main-recommended","label":"Main recommended","vendor":"Example","lifecycle":"stable","recommended":true,"verificationState":"registry","selectable":true,"roles":["main"],"capabilities":{"referenceImages":false,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},
      {"id":"image-default","label":"Image default","vendor":"Example","lifecycle":"preview","verificationState":"registry","selectable":true,"roles":["image"],"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":false,"imageEditMode":"none","resolutions":["1K","2K"]}},
      {"id":"image-stable","label":"Image stable","vendor":"Example","lifecycle":"stable","verificationState":"registry","selectable":true,"roles":["image"],"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":false,"imageEditMode":"none","resolutions":["1K","2K","4K"]}},
      {"id":"vision-default","label":"Vision default","vendor":"Example","lifecycle":"preview","verificationState":"registry","selectable":true,"roles":["vision"],"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},
      {"id":"vision-stable","label":"Vision stable","vendor":"Example","lifecycle":"stable","verificationState":"registry","selectable":true,"roles":["vision"],"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}}
    ]}}}
    """#.utf8))
  }
}
