import XCTest
@testable import PaperBanana

@MainActor
final class AppModelSubmissionTests: XCTestCase {
  private func installLiveRegistry(_ model: AppModel, imageEditMode: String = "none") {
    let json = #"{"code":0,"registryVersion":"test","routeContractVersion":1,"supportsModelRoutes":true,"providers":{"bailian":{"accessKind":"direct","routeContractVersion":1,"accountCatalogRequired":false,"defaults":{"main":"qwen-main","image":"wan-image","vision":"qwen-vision"},"models":[{"id":"qwen-main","label":"Main","vendor":"B","lifecycle":"stable","verificationState":"registry","roles":["main"],"selectable":true,"capabilities":{"referenceImages":false,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},{"id":"wan-image","label":"Image","vendor":"B","lifecycle":"stable","verificationState":"registry","roles":["image"],"selectable":true,"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":false,"imageEditMode":"none","resolutions":["2K"]}},{"id":"qwen-vision","label":"Vision","vendor":"B","lifecycle":"stable","verificationState":"registry","roles":["vision"],"selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}}]},"openrouter":{"accessKind":"aggregator","routeContractVersion":1,"accountCatalogRequired":false,"defaults":{"main":"or-main","image":"or-image","vision":"or-vision"},"models":[{"id":"or-main","label":"Main","vendor":"O","lifecycle":"stable","verificationState":"registry","roles":["main"],"selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},{"id":"or-image","label":"Image","vendor":"O","lifecycle":"stable","verificationState":"registry","roles":["image"],"selectable":true,"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":false,"imageEditMode":"none","resolutions":["2K"]}},{"id":"or-vision","label":"Vision","vendor":"O","lifecycle":"stable","verificationState":"registry","roles":["vision"],"selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}}]}}}"#
    let configured = json.replacingOccurrences(of: "\"imageGeneration\":true,\"imageEditing\":false,\"imageEditMode\":\"none\",\"resolutions\"", with: "\"imageGeneration\":true,\"imageEditing\":false,\"imageEditMode\":\"\(imageEditMode)\",\"resolutions\"")
    model.modelRegistry.acceptLiveRegistry(try! JSONDecoder().decode(ModelRegistry.self, from: Data(configured.utf8)))
    model.generation.normalizeDraftWithLiveRegistry()
  }
  func testMainModelDirectReferenceIsBlockedWhenModelCannotReadImages() {
    let model = AppModel()
    installLiveRegistry(model)
    model.generation.selectedAPIKey = "sk-test"
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.provider = .bailian
    model.generation.draft.mainModelName = "qwen-main"
    model.generation.draft.referenceImageMode = .mainModel
    model.generation.draft.referenceImages = [
      PendingReferenceImage(id: "ref-1", filename: "style.png", mimeType: "image/png", data: Data([1, 2, 3]))
    ]

    XCTAssertTrue(model.generation.mainModelDirectUnsupported)
    XCTAssertFalse(model.generation.canSubmit)
    XCTAssertEqual(model.generation.referenceCapabilityNote, "当前主模型不能直读参考图，请使用独立识别模型。")
  }

  func testManualReferenceModeRequiresSelectionWhenNoUploadExists() {
    let model = AppModel()
    installLiveRegistry(model)
    model.generation.updateSelectedAPIKey("sk-test")
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.retrievalSetting = .manual
    model.generation.draft.manualReferenceIds = []

    XCTAssertFalse(model.generation.hasRequiredManualReferences)
    XCTAssertFalse(model.generation.canSubmit)

    model.generation.draft.manualReferenceIds = ["diagram-001"]

    XCTAssertTrue(model.generation.hasRequiredManualReferences)
    XCTAssertTrue(model.generation.canSubmit)
  }

  func testProviderSelectionRealignsReferenceImageModeLikeWeb() {
    let model = AppModel()
    installLiveRegistry(model)
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.referenceImageMode = .mainModel

    model.generation.selectProvider(.bailian)

    XCTAssertEqual(model.generation.draft.mainModelName, "qwen-main")
    XCTAssertEqual(model.generation.draft.referenceImageMode, .visionModel)

    model.generation.selectProvider(.openrouter)

    XCTAssertEqual(model.generation.draft.mainModelName, "or-main")
    XCTAssertEqual(model.generation.draft.referenceImageMode, .mainModel)
  }

  func testMainModelSelectionRealignsReferenceImageModeLikeWeb() {
    let model = AppModel()
    installLiveRegistry(model)
    model.generation.draft.configurationMode = .advanced
    model.generation.selectProvider(.bailian)

    model.generation.selectMainModel("qwen-vision")

    XCTAssertEqual(model.generation.draft.referenceImageMode, .mainModel)

    model.generation.selectMainModel("qwen-main")

    XCTAssertEqual(model.generation.draft.referenceImageMode, .visionModel)
  }

  func testRequiredRouteRolesMatchWebForPlotReferencesCriticAndDirectEdit() {
    let model = AppModel()
    installLiveRegistry(model)
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.infographicCategoryID = "data_stat"
    model.generation.draft.pipelineMode = .vanilla
    model.generation.draft.maxCriticRounds = 0
    model.generation.draft.imageSize = .oneK
    XCTAssertEqual(model.generation.requiredRouteRoles, [.main])

    model.generation.draft.imageSize = .twoK
    XCTAssertEqual(model.generation.requiredRouteRoles, [.main])

    model.generation.draft.pipelineMode = .full
    XCTAssertEqual(model.generation.requiredRouteRoles, [.main]) // zero-critic plot/full does not invoke vision

    model.generation.draft.maxCriticRounds = 1
    XCTAssertEqual(model.generation.requiredRouteRoles, [.main, .vision])

    model.generation.draft.referenceImages = [PendingReferenceImage(id: "ref", filename: "a.png", mimeType: "image/png", data: Data([1]))]
    model.generation.draft.referenceImageMode = .visionModel
    XCTAssertEqual(model.generation.requiredRouteRoles, [.main, .vision])
  }

  func testPlotTwoKRequiresImageOnlyForDirectEdit() {
    let direct = AppModel()
    installLiveRegistry(direct, imageEditMode: "direct-edit")
    direct.generation.draft.configurationMode = .advanced
    direct.generation.draft.infographicCategoryID = "data_stat"
    direct.generation.draft.pipelineMode = .vanilla
    direct.generation.draft.maxCriticRounds = 0
    direct.generation.draft.imageSize = .oneK
    XCTAssertEqual(direct.generation.requiredRouteRoles, [.main])
    direct.generation.draft.imageSize = .twoK
    XCTAssertEqual(direct.generation.requiredRouteRoles, [.main, .image])

    let redraw = AppModel()
    installLiveRegistry(redraw, imageEditMode: "analyze-redraw")
    redraw.generation.draft.configurationMode = .advanced
    redraw.generation.draft.infographicCategoryID = "data_stat"
    redraw.generation.draft.pipelineMode = .vanilla
    redraw.generation.draft.maxCriticRounds = 0
    redraw.generation.draft.imageSize = .twoK
    XCTAssertEqual(redraw.generation.requiredRouteRoles, [.main])
  }

  func testMixedRoutesSubmitWithoutDraftProviderKeyWhenRequiredProvidersHaveKeys() {
    let model = AppModel()
    installLiveRegistry(model)
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.provider = .ark
    model.generation.draft.modelRoutes = ModelRoutes(
      main: ModelRoute(accessProvider: .bailian, modelId: "qwen-main"),
      image: ModelRoute(accessProvider: .openrouter, modelId: "or-image"),
      vision: ModelRoute(accessProvider: .openrouter, modelId: "or-vision")
    )
    model.generation.draft.pipelineMode = .full
    model.generation.updateAPIKey("bailian-key", for: .bailian)
    model.generation.updateAPIKey("openrouter-key", for: .openrouter)

    XCTAssertTrue(model.generation.canSubmit)
  }

  func testSimpleModeUsesEffectiveDefaultsForPayloadAndReachableRoles() {
    let model = AppModel()
    installLiveRegistry(model)
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.pipelineMode = .vanilla
    model.generation.draft.maxCriticRounds = 0
    model.generation.draft.retrievalSetting = .auto
    model.generation.draft.configurationMode = .simple

    XCTAssertEqual(model.generation.requiredRouteRoles, [.main, .image, .vision])
    let payload = model.generation.makeJobPayload(referenceImages: [])
    let body = payload.paperBananaBody()
    XCTAssertEqual(body["pipelineMode"] as? String, "planner_critic")
    XCTAssertEqual(body["retrievalSetting"] as? String, "none")
    XCTAssertEqual(body["maxCriticRounds"] as? Int, 1)
  }

  func testAccountDeletionRemovesUnknownProviderKeyTrackedByIndex() {
    let model = AppModel()
    let future = ProviderID(rawValue: "future-provider-test")
    model.generation.updateAPIKey("test-key", for: future)
    XCTAssertEqual(model.generation.apiKey(for: future), "test-key")

    model.generation.clearAllForAccountDeletion()

    XCTAssertTrue(model.generation.apiKey(for: future).isEmpty)
  }

  func testChangingArkKeyInvalidatesEveryArkRouteVerification() {
    let model = AppModel()
    model.generation.updateAPIKey("key-a", for: .ark)
    model.generation.verifiedArkRouteKeys = ["main:ark-main", "image:ark-image", "vision:ark-vision"]

    model.generation.updateAPIKey("key-b", for: .ark)

    XCTAssertTrue(model.generation.verifiedArkRouteKeys.isEmpty)
  }

  func testFeedbackCategoriesMatchWebContract() {
    XCTAssertEqual(
      FeedbackCategory.allCases.map(\.rawValue),
      ["bug", "feature", "experience", "other"]
    )
    XCTAssertEqual(
      FeedbackCategory.allCases.map(\.title),
      ["问题反馈", "功能建议", "体验意见", "其他"]
    )
  }

  func testFeedbackMessageLengthMatchesWebLimit() {
    let model = AppModel()
    model.settings.feedbackMessage = "体验很好"

    XCTAssertTrue(model.settings.canSubmitFeedback)

    model.settings.feedbackMessage = ""
    XCTAssertFalse(model.settings.canSubmitFeedback)

    model.settings.feedbackMessage = String(repeating: "图", count: 2001)
    XCTAssertFalse(model.settings.canSubmitFeedback)
  }
}
