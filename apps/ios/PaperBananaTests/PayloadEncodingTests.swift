import XCTest
@testable import PaperBanana

final class PayloadEncodingTests: XCTestCase {
  func testCreateJobBodySendsFullWebWhitelistAndDisablesRetrievalWhenUploadingReferences() throws {
    let reference = ReferenceImageAsset(
      filename: "style.svg",
      mimeType: "image/svg+xml",
      size: 128,
      objectKey: "refs/style.svg",
      uploadToken: "token-1"
    )
    let payload = JobCreatePayload(
      configurationMode: .advanced,
      provider: .bailian,
      apiKeys: [.bailian: "sk-test"],
      taskName: .plot,
      methodContent: "method",
      caption: "caption",
      infographicCategory: "数据统计图",
      outputFormat: .svg,
      imageSize: .twoK,
      mainModelName: "qwen3.7-max",
      imageModelName: "wan2.7-image-pro",
      referenceVisionModelName: "qwen3.7-plus",
      referenceImageMode: .visionModel,
      referenceImages: [reference],
      pipelineMode: .plannerCritic,
      retrievalSetting: .manual,
      manualReferenceIds: ["ref-1"],
      aspectRatio: "16:9",
      numCandidates: 2,
      maxCriticRounds: 1
    )

    let body = payload.paperBananaBody()

    XCTAssertEqual(body["action"] as? String, "createJob")
    XCTAssertEqual(body["clientPlatform"] as? String, "ios")
    XCTAssertEqual(body["taskName"] as? String, "plot")
    XCTAssertEqual(body["outputFormat"] as? String, "svg")
    XCTAssertEqual(body["imageSize"] as? String, "2K")
    XCTAssertEqual(body["referenceImageMode"] as? String, "vision_model")
    XCTAssertEqual(body["retrievalSetting"] as? String, "none")
    XCTAssertEqual(body["manualReferenceIds"] as? [String], [])

    let references = try XCTUnwrap(body["referenceImages"] as? [[String: Any]])
    XCTAssertEqual(references.first?["objectKey"] as? String, "refs/style.svg")
    XCTAssertEqual(references.first?["mimeType"] as? String, "image/svg+xml")
  }

  func testCreateJobBodyPreservesManualReferencesWhenNoUploadExists() {
    let payload = JobCreatePayload(
      configurationMode: .advanced,
      provider: .openai,
      apiKeys: [.openai: "sk-test"],
      taskName: .diagram,
      methodContent: "method",
      caption: "caption",
      infographicCategory: "方法框架图",
      outputFormat: .png,
      imageSize: .fourK,
      mainModelName: "gpt-5.5",
      imageModelName: "gpt-image-2",
      referenceVisionModelName: "gpt-4.1",
      referenceImageMode: nil,
      referenceImages: [],
      pipelineMode: .full,
      retrievalSetting: .manual,
      manualReferenceIds: ["ref-1", "ref-2"],
      aspectRatio: "1:1",
      numCandidates: 3,
      maxCriticRounds: 2
    )

    let body = payload.paperBananaBody()

    XCTAssertEqual(body["retrievalSetting"] as? String, "manual")
    XCTAssertEqual(body["manualReferenceIds"] as? [String], ["ref-1", "ref-2"])
    XCTAssertNil(body["referenceImageMode"] as? String)
  }

  func testRefineImageBodySendsRequiredWebFields() {
    let payload = RefineImagePayload(
      provider: .openai,
      apiKeys: [.openai: "sk-test"],
      mainModelName: "gpt-5.5",
      imageModelName: "gpt-image-2",
      referenceVisionModelName: "gpt-4.1",
      sourceImageURL: "https://example.com/source.png",
      sourceImageObjectKey: "jobs/source.png",
      editInstruction: "放大标签并减少装饰。",
      aspectRatio: "16:9",
      imageSize: .twoK
    )

    let body = payload.paperBananaBody()

    XCTAssertEqual(body["action"] as? String, "refineImage")
    XCTAssertEqual(body["clientPlatform"] as? String, "ios")
    XCTAssertEqual(body["mainModelName"] as? String, "gpt-5.5")
    XCTAssertEqual(body["imageModelName"] as? String, "gpt-image-2")
    XCTAssertEqual(body["referenceVisionModelName"] as? String, "gpt-4.1")
    XCTAssertEqual(body["sourceImageUrl"] as? String, "https://example.com/source.png")
    XCTAssertEqual(body["sourceImageObjectKey"] as? String, "jobs/source.png")
    XCTAssertEqual(body["editInstruction"] as? String, "放大标签并减少装饰。")
    XCTAssertEqual(body["aspectRatio"] as? String, "16:9")
    XCTAssertEqual(body["imageSize"] as? String, "2K")
  }
}
