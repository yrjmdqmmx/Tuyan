import XCTest
@testable import PaperBanana

@MainActor
final class AppModelSubmissionTests: XCTestCase {
  private func installLiveRegistry(_ model: AppModel) {
    let json = #"{"code":0,"registryVersion":"test","routeContractVersion":1,"supportsModelRoutes":true,"providers":{"bailian":{"accessKind":"direct","routeContractVersion":1,"accountCatalogRequired":false,"defaults":{"main":"qwen-main","image":"wan-image","vision":"qwen-vision"},"models":[{"id":"qwen-main","label":"Main","vendor":"B","lifecycle":"stable","verificationState":"registry","roles":["main"],"selectable":true,"capabilities":{"referenceImages":false,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},{"id":"wan-image","label":"Image","vendor":"B","lifecycle":"stable","verificationState":"registry","roles":["image"],"selectable":true,"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":false,"imageEditMode":"none","resolutions":["2K"]}},{"id":"qwen-vision","label":"Vision","vendor":"B","lifecycle":"stable","verificationState":"registry","roles":["vision"],"selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}}]},"openrouter":{"accessKind":"aggregator","routeContractVersion":1,"accountCatalogRequired":false,"defaults":{"main":"or-main","image":"or-image","vision":"or-vision"},"models":[{"id":"or-main","label":"Main","vendor":"O","lifecycle":"stable","verificationState":"registry","roles":["main"],"selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},{"id":"or-image","label":"Image","vendor":"O","lifecycle":"stable","verificationState":"registry","roles":["image"],"selectable":true,"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":false,"imageEditMode":"none","resolutions":["2K"]}},{"id":"or-vision","label":"Vision","vendor":"O","lifecycle":"stable","verificationState":"registry","roles":["vision"],"selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}}]}}}"#
    model.modelRegistry.acceptLiveRegistry(try! JSONDecoder().decode(ModelRegistry.self, from: Data(json.utf8)))
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
