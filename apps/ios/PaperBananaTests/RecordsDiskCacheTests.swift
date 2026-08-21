import XCTest
@testable import PaperBanana

final class RecordsDiskCacheTests: XCTestCase {
  func testJobCacheEncodingRoundTripsThroughExistingDecoder() throws {
    // fixture 覆盖 RecordsDiskCache 手写 encoder 输出的全部字段（含嵌套子字段），
    // 且每个字段都取非默认值：解码器对缺失 key 静默取默认值，
    // 只有非默认值才能在「删掉某行 encode」时让 round-trip 断言失败。
    let job = try JSONDecoder().decode(Job.self, from: Data("""
    {
      "id": "job-cache",
      "status": "succeeded",
      "provider": "bailian",
      "job_type": "refine",
      "user_id": "user-9",
      "user_email": "cache@example.com",
      "configuration_mode": "simple",
      "method_content": "method",
      "caption": "caption",
      "infographic_category": "流程图",
      "output_format": "svg",
      "image_size": "2K",
      "main_model_name": "qwen3.7-max",
      "image_gen_model_name": "wan2.7-image-pro",
      "reference_vision_model_name": "qwen3.7-plus",
      "reference_image_mode": "vision_model",
      "reference_image_mode_used": "main_model",
      "pipeline_mode": "planner_critic",
      "task_name": "plot",
      "retrieval_setting": "manual",
      "retrieved_reference_ids": ["ref-1"],
      "retrieved_references": [
        {"id": "lib-1", "task_name": "plot", "title": "对标案例", "summary": "案例摘要", "image_url": "/refs/lib-1.png", "image_object_key": "library/lib-1.png", "source": "user-upload"}
      ],
      "critic_mode": "image",
      "aspect_ratio": "16:9",
      "num_candidates": 2,
      "max_critic_rounds": 1,
      "prompt_char_count": 1234,
      "result_image_count": 2,
      "result_images": [
        {"filename": "out.png", "url": "/signed/out.png", "storage": "bucket", "mime_type": "image/png", "candidate_id": 1, "object_key": "jobs/out.png"}
      ],
      "reference_image_count": 3,
      "reference_images": [
        {"filename": "style.png", "mimeType": "image/png", "size": 16, "objectKey": "refs/style.png", "uploadToken": "token-1", "url": "/signed/style.png", "storage": "bucket"}
      ],
      "stages": [
        {"id": "stage-1", "candidate_id": 1, "type": "critic", "title": "评审", "round": 1, "text": "建议", "suggestion": "加大字号", "image": {"filename": "stage.webp", "url": "/signed/stage.webp", "storage": "bucket", "mime_type": "image/webp"}, "error": "渲染告警"}
      ],
      "logs_tail": "done",
      "error": "部分候选失败",
      "created_at": "2026-06-10T08:00:00Z",
      "updated_at": "2026-06-10T08:05:00Z",
      "started_at": "2026-06-10T08:01:00Z",
      "completed_at": "2026-06-10T08:04:00Z"
    }
    """.utf8))

    // 先确认 fixture 真的解出了非默认值：防止 fixture key 拼错时
    // 两侧都落到默认值、round-trip 假绿通过。
    XCTAssertEqual(job.jobType, "refine")
    XCTAssertEqual(job.userID, "user-9")
    XCTAssertEqual(job.userEmail, "cache@example.com")
    XCTAssertEqual(job.configurationMode, "simple")
    XCTAssertEqual(job.infographicCategory, "流程图")
    XCTAssertEqual(job.referenceImageMode, .visionModel)
    XCTAssertEqual(job.referenceImageModeUsed, "main_model")
    XCTAssertEqual(job.criticMode, "image")
    XCTAssertEqual(job.promptCharCount, 1234)
    XCTAssertEqual(job.resultImageCount, 2)
    XCTAssertEqual(job.referenceImageCount, 3)
    XCTAssertEqual(job.error, "部分候选失败")
    XCTAssertEqual(job.updatedAt, "2026-06-10T08:05:00Z")
    XCTAssertEqual(job.startedAt, "2026-06-10T08:01:00Z")
    XCTAssertEqual(job.completedAt, "2026-06-10T08:04:00Z")

    let libraryItem = try XCTUnwrap(job.retrievedReferences.first)
    XCTAssertEqual(libraryItem.id, "lib-1")
    XCTAssertEqual(libraryItem.taskName, .plot)
    XCTAssertEqual(libraryItem.title, "对标案例")
    XCTAssertEqual(libraryItem.summary, "案例摘要")
    XCTAssertEqual(libraryItem.imageURL, "/refs/lib-1.png")
    XCTAssertEqual(libraryItem.imageObjectKey, "library/lib-1.png")
    XCTAssertEqual(libraryItem.source, "user-upload")

    let resultImage = try XCTUnwrap(job.resultImages.first)
    XCTAssertEqual(resultImage.candidateID, 1)
    XCTAssertEqual(resultImage.objectKey, "jobs/out.png")

    let referenceImage = try XCTUnwrap(job.referenceImages.first)
    XCTAssertEqual(referenceImage.size, 16)
    XCTAssertEqual(referenceImage.uploadToken, "token-1")

    let stage = try XCTUnwrap(job.stages.first)
    XCTAssertEqual(stage.candidateID, 1)
    XCTAssertEqual(stage.suggestion, "加大字号")
    XCTAssertEqual(stage.error, "渲染告警")
    XCTAssertEqual(stage.image?.mimeType, "image/webp")

    let encoded = try JSONEncoder().encode([job])
    let decoded = try JSONDecoder().decode([Job].self, from: encoded)

    XCTAssertEqual(decoded, [job])
  }

  func testDiskCacheSaveLoadClearCycle() throws {
    let cache = RecordsDiskCache(filename: "user-jobs-test-\(UUID().uuidString).json")
    defer { cache.clear() }

    XCTAssertNil(cache.load())

    let job = try JSONDecoder().decode(Job.self, from: Data(#"{"id": "job-1", "status": "succeeded", "caption": "cached"}"#.utf8))
    cache.save([job])

    let loaded = try XCTUnwrap(cache.load())
    XCTAssertEqual(loaded, [job])

    cache.clear()
    XCTAssertNil(cache.load())
  }

  func testDiskCacheRoundTripsEveryV9RefineField() throws {
    let cache = RecordsDiskCache(filename: "v9-refine-cache-\(UUID().uuidString).json")
    defer { cache.clear() }
    let job = try JSONDecoder().decode(Job.self, from: Data("""
    {
      "id":"refine-v9-cache", "status":"succeeded", "client_platform":"ios",
      "model_routes":{"main":{"accessProvider":"bailian","modelId":"main-v9"},"image":{"accessProvider":"openai","modelId":"image-v9"},"vision":{"accessProvider":"ark","modelId":"vision-v9"}},
      "routing_mode":"mixed", "model_routing_version":7, "model_routing_source":"explicit",
      "negative_prompt":"avoid watermark", "image_refine_mode":"direct-edit", "image_refine_reason":"image route supports edit",
      "refine_mode":"direct-edit", "refine_reason":"selected direct edit", "source_image_object_key":"jobs/source-v9.png", "source_image_url":"https://signed.example/source-v9.png"
    }
    """.utf8))

    cache.save([job])
    let loaded = try XCTUnwrap(cache.load()?.first)

    XCTAssertEqual(loaded.clientPlatform, "ios")
    XCTAssertEqual(loaded.modelRoutes?.main.modelId, "main-v9")
    XCTAssertEqual(loaded.modelRoutes?.image.accessProvider, .openai)
    XCTAssertEqual(loaded.routingMode, "mixed")
    XCTAssertEqual(loaded.modelRoutingVersion, 7)
    XCTAssertEqual(loaded.modelRoutingSource, "explicit")
    XCTAssertEqual(loaded.negativePrompt, "avoid watermark")
    XCTAssertEqual(loaded.imageRefineMode, "direct-edit")
    XCTAssertEqual(loaded.imageRefineReason, "image route supports edit")
    XCTAssertEqual(loaded.refineMode, "direct-edit")
    XCTAssertEqual(loaded.refineReason, "selected direct edit")
    XCTAssertEqual(loaded.sourceImageObjectKey, "jobs/source-v9.png")
    XCTAssertEqual(loaded.sourceImageURL, "https://signed.example/source-v9.png")
  }
}
