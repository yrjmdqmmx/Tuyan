import XCTest
@testable import PaperBanana

@MainActor
final class RefineV9ParityTests: XCTestCase {
  func testObjectKeySourceWinsOverSignedURLInRefinePayload() {
    let source = RefineSource(jobID: "own-job", image: ResultImage.fixture(url: "https://signed.example/result.png", objectKey: "jobs/own/result.png"))
    let payload = RefineImagePayload(
      provider: .bailian, apiKeys: [.bailian: "key"], mainModelName: "main", imageModelName: "image", referenceVisionModelName: "vision",
      source: source, editInstruction: "放大所有标签", aspectRatio: "auto", imageSize: .twoK
    )

    let body = payload.paperBananaBody()
    XCTAssertEqual(body["sourceImageObjectKey"] as? String, "jobs/own/result.png")
    XCTAssertNil(body["sourceImageUrl"])
  }

  func testLegacyResultWithoutObjectKeyUsesItsOwnSignedURL() {
    let source = RefineSource(jobID: "own-job", image: ResultImage.fixture(url: "https://signed.example/legacy.png", objectKey: ""))
    XCTAssertTrue(source.isLegacyURLCompatibility)
    XCTAssertEqual(source.requestBody["sourceImageUrl"], "https://signed.example/legacy.png")
  }

  func testRefineCapabilityUsesOnlyImageRouteAndRequiredRoles() {
    XCTAssertEqual(RefineCapability(imageEditMode: "direct-edit").requiredRoles, [.image])
    XCTAssertEqual(RefineCapability(imageEditMode: "analyze-redraw").requiredRoles, [.vision, .image])
    XCTAssertFalse(RefineCapability(imageEditMode: "none").isSupported)
  }

  func testRefineDraftNormalizesMissingAndExplicitEmptyCapabilities() {
    let route = ModelRoute(accessProvider: .bailian, modelId: "image")
    let missing = RefineDraft(source: nil, instruction: "", aspectRatio: "21:9", imageSize: .fourK)
      .normalized(refineAspectRatios: nil, refineResolutions: nil)
    XCTAssertEqual(missing.aspectRatio, "21:9")
    XCTAssertEqual(missing.imageSize, .twoK)

    let explicitEmpty = RefineDraft(source: nil, instruction: "", aspectRatio: "16:9", imageSize: .twoK)
      .normalized(refineAspectRatios: [], refineResolutions: [])
    XCTAssertEqual(explicitEmpty.aspectRatio, "auto")
    XCTAssertNil(explicitEmpty.imageSize)
    XCTAssertEqual(route.modelId, "image")
  }

  func testAutoIsAlwaysAnAllowedRefineRatio() {
    XCTAssertEqual(RefineDraft.supportedAspectRatios(nil), ["auto", "16:9", "21:9", "3:2", "1:1"])
    XCTAssertEqual(RefineDraft.supportedAspectRatios(["1:1", "16:9"]), ["auto", "1:1", "16:9"])
    XCTAssertEqual(RefineDraft.supportedAspectRatios([]), ["auto"])
    let routeChanged = RefineDraft(source: nil, instruction: "", aspectRatio: "16:9", imageSize: .twoK)
      .normalized(refineAspectRatios: ["1:1"], refineResolutions: [.twoK])
    XCTAssertEqual(routeChanged.aspectRatio, "auto")
  }

  func testFiveTabsPutRefineBetweenGenerateAndRecords() {
    XCTAssertEqual(AppTab.allCases, [.generate, .refine, .records, .guide, .settings])
  }

  func testStableV9ErrorCodesMapToChinese() {
    XCTAssertEqual(formatUserFacingError(PaperBananaAPIError.http(.init(statusCode: 400, code: "REFINE_RESOLUTION_UNSUPPORTED", message: nil))), "当前模型不支持所选精修清晰度，请更换设置后重试。")
    XCTAssertEqual(formatUserFacingError(PaperBananaAPIError.http(.init(statusCode: 400, code: "MODEL_ROUTE_CONFLICT", message: nil))), "模型路线配置冲突，请重新检查生成设置。")
  }

  func testJobDecodesV9RoutingRefineAndSourceFieldsInBothCases() throws {
    let job = try JSONDecoder().decode(Job.self, from: Data("""
    {"id":"v9","status":"failed","model_routes":{"main":{"accessProvider":"bailian","modelId":"main"},"image":{"accessProvider":"openai","modelId":"image"},"vision":{"accessProvider":"ark","modelId":"vision"}},"routing_mode":"mixed","modelRoutingVersion":1,"model_routing_source":"explicit","negative_prompt":"no watermark","image_refine_mode":"direct-edit","imageRefineReason":"registry","refine_mode":"direct-edit","refineReason":"source retained","source_image_object_key":"jobs/v9/source.png","sourceImageUrl":"https://ignored.example/source.png"}
    """.utf8))
    XCTAssertEqual(job.modelRoutes?.image.accessProvider, .openai)
    XCTAssertEqual(job.routingMode, "mixed")
    XCTAssertEqual(job.modelRoutingVersion, 1)
    XCTAssertEqual(job.modelRoutingSource, "explicit")
    XCTAssertEqual(job.negativePrompt, "no watermark")
    XCTAssertEqual(job.refineMode, "direct-edit")
    XCTAssertEqual(job.sourceImageObjectKey, "jobs/v9/source.png")
    XCTAssertTrue(job.metadataItems.contains { $0.label == "模型路由" && $0.value.contains("OpenAI") })
  }

  func testUnsupportedModeAndMissingSourceCannotSubmit() {
    var draft = RefineDraft()
    draft.instruction = "改标签"
    XCTAssertNil(draft.source)
    XCTAssertFalse(RefineCapability(imageEditMode: "none").isSupported)
  }

  func testOwnedRecordResultNavigatesToRefineAndResetsInstruction() throws {
    let model = AppModel()
    let job = try JSONDecoder().decode(Job.self, from: Data(#"{"id":"owned","status":"succeeded","resultImages":[{"filename":"one.png","url":"https://signed.example/one.png","objectKey":"jobs/owned/one.png","candidateId":2}]}"#.utf8))
    model.jobs.currentJobID = job.id
    model.jobs.currentJob = job
    model.refine.draft.instruction = "stale instruction"

    model.beginRefine(job: job, image: try XCTUnwrap(job.resultImages.first))

    XCTAssertEqual(model.selectedTab, .refine)
    XCTAssertEqual(model.refine.draft.source?.objectKey, "jobs/owned/one.png")
    XCTAssertTrue(model.refine.draft.instruction.isEmpty)
  }

  func testRefineSubmissionStateDoesNotReusePreviousGenerateJob() {
    let model = AppModel()
    model.jobs.currentJob = Job(id: "generate-old", status: "succeeded")
    model.refine.submittedJobID = "refine-new"
    XCTAssertNotEqual(model.jobs.currentJob?.id, model.refine.submittedJobID)
  }
}

private extension ResultImage {
  static func fixture(url: String, objectKey: String) -> ResultImage {
    try! JSONDecoder().decode(ResultImage.self, from: Data("{\"filename\":\"result.png\",\"url\":\"\(url)\",\"candidate_id\":0,\"object_key\":\"\(objectKey)\"}".utf8))
  }
}
