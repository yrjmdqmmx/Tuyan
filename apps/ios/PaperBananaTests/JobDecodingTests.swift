import XCTest
@testable import PaperBanana

final class JobDecodingTests: XCTestCase {
  func testJobDecodesCurrentWebRecordShape() throws {
    let json = """
    {
      "id": "job-1",
      "status": "failed",
      "provider": "bailian",
      "job_type": "generate",
      "task_name": "plot",
      "output_format": "svg",
      "image_size": "2K",
      "reference_image_mode_used": "vision_model",
      "retrieval_setting": "none",
      "retrieved_references": [{"id": "ref-1", "title": "Reference", "image_url": "https://example.com/ref.png"}],
      "stages": [{"id": "stage-1", "candidate_id": 0, "type": "critic", "round": 1, "text": "needs labels"}],
      "result_images": [{"filename": "out.svg", "url": "/signed/out.svg", "mime_type": "image/svg+xml", "candidate_id": 0}],
      "reference_image_count": 1,
      "reference_images": [{"filename": "style.svg", "objectKey": "refs/style.svg", "mimeType": "image/svg+xml", "size": 128}],
      "logs_tail": "tail",
      "error": "model failed"
    }
    """.data(using: .utf8)!

    let job = try JSONDecoder().decode(Job.self, from: json)

    XCTAssertEqual(job.id, "job-1")
    XCTAssertEqual(job.statusKind, .failed)
    XCTAssertEqual(job.taskName, .plot)
    XCTAssertEqual(job.outputFormat, .svg)
    XCTAssertEqual(job.imageSize, .twoK)
    XCTAssertEqual(job.failureText, "model failed")
    XCTAssertEqual(job.failureErrorText, "model failed")
    XCTAssertEqual(job.failureLogsText, "tail")
    XCTAssertEqual(job.referenceImageCount, 1)
    XCTAssertEqual(job.resultImages.first?.format, "svg")
    XCTAssertEqual(job.referenceImages.first?.objectKey, "refs/style.svg")
    XCTAssertEqual(job.retrievedReferences.first?.title, "Reference")
    XCTAssertEqual(job.stages.first?.type, "critic")
  }

  func testFailedJobKeepsLogsTailSeparateFromError() throws {
    let job = try JSONDecoder().decode(Job.self, from: Data("""
      {
        "id": "failed-logs",
        "status": "failed",
        "error": "model failed",
        "logsTail": "gateway line",
        "logs": ["planner line", "renderer line"]
      }
      """.utf8))

    XCTAssertEqual(job.failureText, "model failed")
    XCTAssertEqual(job.failureErrorText, "model failed")
    XCTAssertEqual(job.failureLogsText, "gateway line\nplanner line\nrenderer line")
  }

  func testFailedJobFallsBackToLogsWhenErrorIsMissing() throws {
    let job = try JSONDecoder().decode(Job.self, from: Data("""
      {
        "id": "failed-log-only",
        "status": "failed",
        "logs_tail": "renderer timeout"
      }
      """.utf8))

    XCTAssertEqual(job.failureText, "renderer timeout")
    XCTAssertEqual(job.failureErrorText, "")
    XCTAssertEqual(job.failureLogsText, "renderer timeout")
  }

  func testRecordSummaryKnowsWhenFreshDetailIsNeeded() throws {
    let summary = try JSONDecoder().decode(Job.self, from: Data("""
      {
        "id": "summary-1",
        "status": "succeeded",
        "caption": "summary",
        "result_image_count": 1,
        "result_images": []
      }
      """.utf8))

    let queued = try JSONDecoder().decode(Job.self, from: Data("""
      {
        "id": "summary-2",
        "status": "queued",
        "caption": "queued",
        "result_image_count": 0,
        "result_images": []
      }
      """.utf8))

    XCTAssertTrue(summary.needsFreshRecordDetail)
    XCTAssertFalse(queued.needsFreshRecordDetail)
  }

  func testVisibleReferenceImagesMatchWebReferenceEchoRule() throws {
    let job = try JSONDecoder().decode(Job.self, from: Data("""
      {
        "id": "reference-echo",
        "status": "succeeded",
        "reference_images": [
          {"filename": "style.svg", "url": "/signed/style.svg", "objectKey": "refs/style.svg", "mimeType": "image/svg+xml", "size": 16},
          {"filename": "hidden.png", "objectKey": "refs/hidden.png", "mimeType": "image/png", "size": 16}
        ]
      }
      """.utf8))

    XCTAssertEqual(job.visibleReferenceImages.count, 1)
    XCTAssertEqual(job.visibleReferenceImages.first?.filename, "style.svg")
    XCTAssertEqual(job.visibleReferenceImages.first?.displayFormat, "svg")
  }

  func testJobMetadataItemsExposeWebRecordFields() throws {
    let job = try JSONDecoder().decode(Job.self, from: Data("""
      {
        "id": "record-1",
        "status": "succeeded",
        "provider": "openai",
        "client_platform": "macos",
        "configuration_mode": "advanced",
        "method_content": "A long method section",
        "caption": "A caption",
        "infographic_category": "系统架构图",
        "output_format": "png",
        "image_size": "4K",
        "main_model_name": "gpt-5.5",
        "image_gen_model_name": "gpt-image-2",
        "reference_vision_model_name": "gpt-4.1",
        "reference_image_mode_used": "vision_model",
        "retrieval_setting": "manual",
        "critic_mode": "image",
        "aspect_ratio": "21:9",
        "num_candidates": 3,
        "stages": [
          {"id": "stage-1", "type": "render"},
          {"id": "stage-2", "type": "critic"}
        ],
        "created_at": "2026-06-10T13:45:12.000Z"
      }
      """.utf8))

    let metadata = Dictionary(uniqueKeysWithValues: job.metadataItems.map { ($0.label, $0.value) })

    XCTAssertEqual(metadata["时间"], "2026-06-10 13:45")
    XCTAssertEqual(metadata["任务来源"], "macOS")
    XCTAssertEqual(metadata["模式"], "专业模式")
    XCTAssertEqual(metadata["类别"], "系统架构图")
    XCTAssertEqual(metadata["平台"], "OpenAI")
    XCTAssertEqual(metadata["格式"], "PNG 图片 · 4K")
    XCTAssertEqual(metadata["画面比例"], "21:9")
    XCTAssertEqual(metadata["检索"], "手动参考")
    XCTAssertEqual(metadata["参考图处理"], "独立识别模型")
    XCTAssertEqual(metadata["主模型"], "gpt-5.5")
    XCTAssertEqual(metadata["图像生成模型"], "gpt-image-2")
    XCTAssertEqual(metadata["参考图识别模型"], "gpt-4.1")
    XCTAssertEqual(metadata["评审模式"], "图像评审")
    XCTAssertEqual(metadata["候选图"], "3 张")
    XCTAssertEqual(metadata["阶段"], "2 个")
  }

  func testMissingOrUnknownClientPlatformDisplaysUnrecordedWithoutInference() throws {
    let missing = try JSONDecoder().decode(Job.self, from: Data(#"{"id":"legacy","status":"succeeded"}"#.utf8))
    let unknown = try JSONDecoder().decode(Job.self, from: Data(#"{"id":"unknown","status":"succeeded","clientPlatform":"mobile"}"#.utf8))

    XCTAssertEqual(missing.clientPlatformDisplayName, "未记录")
    XCTAssertEqual(unknown.clientPlatformDisplayName, "未记录")
  }

  // MARK: - stage id 合成（后端缺 id 时的确定性回退）

  func testStageWithoutIDGetsDeterministicSyntheticID() throws {
    // 后端 recordStage 总是带 id；缺失时合成 id 必须跨解码稳定（随机 UUID 会让
    // SwiftUI ForEach 每次轮询都把同一 stage 当新元素）。
    let json = Data("""
    {
      "id": "job-stage-id",
      "status": "running",
      "stages": [
        {"candidate_id": 1, "type": "render", "title": "初次渲染", "round": 0},
        {"candidate_id": 1, "type": "render", "title": "重渲染（第1轮）", "round": 1}
      ]
    }
    """.utf8)

    let first = try JSONDecoder().decode(Job.self, from: json)
    let second = try JSONDecoder().decode(Job.self, from: json)

    XCTAssertEqual(first.stages.map(\.id), second.stages.map(\.id), "同一 stage 跨轮询解码 id 必须稳定")
    XCTAssertNotEqual(first.stages[0].id, first.stages[1].id, "不同 stage 必须得到不同 id")
    XCTAssertTrue(first.stages[0].id.hasPrefix("stage-render-1-0-"))
  }

  func testStageWithExplicitIDKeepsBackendID() throws {
    let json = Data("""
    {
      "id": "job-stage-id",
      "status": "running",
      "stages": [{"id": "stage-from-backend", "candidate_id": 0, "type": "critic", "round": 1}]
    }
    """.utf8)

    let job = try JSONDecoder().decode(Job.self, from: json)

    XCTAssertEqual(job.stages.first?.id, "stage-from-backend")
  }
}
