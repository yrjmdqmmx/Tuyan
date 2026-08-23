import Foundation

/// 任务记录的本地 JSON 缓存：原子写入 Application Support，
/// 启动时先展示缓存、网络刷新后覆盖。
struct RecordsDiskCache {
  private let fileURL: URL

  init(filename: String = "user-jobs.json") {
    let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
      ?? FileManager.default.temporaryDirectory
    fileURL = base
      .appendingPathComponent("PaperBanana", isDirectory: true)
      .appendingPathComponent(filename)
  }

  func load() -> [Job]? {
    guard let data = try? Data(contentsOf: fileURL) else { return nil }
    return try? JSONDecoder().decode([Job].self, from: data)
  }

  func save(_ jobs: [Job]) {
    do {
      try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
      let data = try JSONEncoder().encode(jobs)
      try data.write(to: fileURL, options: .atomic)
    } catch {
      // 缓存写入失败不影响主流程。
    }
  }

  func clear() {
    try? FileManager.default.removeItem(at: fileURL)
  }
}

/// Local-only refinement provenance. Entries originate exclusively from a
/// result selected through AppModel and are keyed by the server-issued refine
/// job ID, so this cache never turns an arbitrary URL into a usable source.
struct RefineSourceDiskCache {
  private let fileURL: URL

  init(filename: String = "refine-sources.json") {
    let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
      ?? FileManager.default.temporaryDirectory
    fileURL = base.appendingPathComponent("PaperBanana", isDirectory: true).appendingPathComponent(filename)
  }

  func load() -> [String: RefineSource] {
    guard let data = try? Data(contentsOf: fileURL) else { return [:] }
    return (try? JSONDecoder().decode([String: RefineSource].self, from: data)) ?? [:]
  }

  func save(_ sources: [String: RefineSource]) {
    do {
      try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
      try JSONEncoder().encode(sources).write(to: fileURL, options: .atomic)
    } catch { }
  }

  func clear() { try? FileManager.default.removeItem(at: fileURL) }
}

// MARK: - 缓存用 Encodable 实现
// 编码使用各自解码器的首选 key（snake_case），保证缓存能被同一解码逻辑读回。

extension Job: Encodable {
  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: DynamicCodingKey.self)
    try container.encode(id, forKey: .key("id"))
    try container.encode(status, forKey: .key("status"))
    try container.encode(provider, forKey: .key("provider"))
    if !clientPlatform.isEmpty { try container.encode(clientPlatform, forKey: .key("client_platform")) }
    try container.encode(jobType, forKey: .key("job_type"))
    try container.encode(userID, forKey: .key("user_id"))
    try container.encode(userEmail, forKey: .key("user_email"))
    try container.encode(configurationMode, forKey: .key("configuration_mode"))
    try container.encodeIfPresent(modelRoutes, forKey: .key("model_routes"))
    if !routingMode.isEmpty { try container.encode(routingMode, forKey: .key("routing_mode")) }
    if modelRoutingVersion != 0 { try container.encode(modelRoutingVersion, forKey: .key("model_routing_version")) }
    if !modelRoutingSource.isEmpty { try container.encode(modelRoutingSource, forKey: .key("model_routing_source")) }
    try container.encode(methodContent, forKey: .key("method_content"))
    if !negativePrompt.isEmpty { try container.encode(negativePrompt, forKey: .key("negative_prompt")) }
    try container.encode(caption, forKey: .key("caption"))
    try container.encode(infographicCategory, forKey: .key("infographic_category"))
    try container.encode(outputFormat.rawValue, forKey: .key("output_format"))
    try container.encode(imageSize.rawValue, forKey: .key("image_size"))
    try container.encode(mainModelName, forKey: .key("main_model_name"))
    try container.encode(imageModelName, forKey: .key("image_gen_model_name"))
    try container.encode(referenceVisionModelName, forKey: .key("reference_vision_model_name"))
    if !imageRefineMode.isEmpty { try container.encode(imageRefineMode, forKey: .key("image_refine_mode")) }
    if !imageRefineReason.isEmpty { try container.encode(imageRefineReason, forKey: .key("image_refine_reason")) }
    if !refineMode.isEmpty { try container.encode(refineMode, forKey: .key("refine_mode")) }
    if !refineReason.isEmpty { try container.encode(refineReason, forKey: .key("refine_reason")) }
    if !sourceImageObjectKey.isEmpty { try container.encode(sourceImageObjectKey, forKey: .key("source_image_object_key")) }
    if !sourceImageURL.isEmpty { try container.encode(sourceImageURL, forKey: .key("source_image_url")) }
    try container.encodeIfPresent(referenceImageMode?.rawValue, forKey: .key("reference_image_mode"))
    try container.encode(referenceImageModeUsed, forKey: .key("reference_image_mode_used"))
    try container.encode(pipelineMode, forKey: .key("pipeline_mode"))
    try container.encode(taskName.rawValue, forKey: .key("task_name"))
    try container.encode(retrievalSetting.rawValue, forKey: .key("retrieval_setting"))
    try container.encode(retrievedReferenceIDs, forKey: .key("retrieved_reference_ids"))
    try container.encode(retrievedReferences, forKey: .key("retrieved_references"))
    try container.encode(stages, forKey: .key("stages"))
    try container.encode(criticMode, forKey: .key("critic_mode"))
    try container.encode(aspectRatio, forKey: .key("aspect_ratio"))
    try container.encode(numCandidates, forKey: .key("num_candidates"))
    try container.encode(maxCriticRounds, forKey: .key("max_critic_rounds"))
    try container.encode(promptCharCount, forKey: .key("prompt_char_count"))
    try container.encode(resultImages, forKey: .key("result_images"))
    try container.encode(resultImageCount, forKey: .key("result_image_count"))
    try container.encode(referenceImages, forKey: .key("reference_images"))
    try container.encode(referenceImageCount, forKey: .key("reference_image_count"))
    try container.encode(logsTail, forKey: .key("logs_tail"))
    try container.encode(error, forKey: .key("error"))
    try container.encode(createdAt, forKey: .key("created_at"))
    try container.encode(updatedAt, forKey: .key("updated_at"))
    try container.encode(startedAt, forKey: .key("started_at"))
    try container.encode(completedAt, forKey: .key("completed_at"))
  }
}

extension ResultImage: Encodable {
  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: DynamicCodingKey.self)
    try container.encode(filename, forKey: .key("filename"))
    try container.encode(url, forKey: .key("url"))
    try container.encode(storage, forKey: .key("storage"))
    try container.encode(candidateID, forKey: .key("candidate_id"))
    try container.encode(mimeType, forKey: .key("mime_type"))
    try container.encode(objectKey, forKey: .key("object_key"))
  }
}

extension StageImage: Encodable {
  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: DynamicCodingKey.self)
    try container.encode(filename, forKey: .key("filename"))
    try container.encode(url, forKey: .key("url"))
    try container.encode(storage, forKey: .key("storage"))
    try container.encode(mimeType, forKey: .key("mime_type"))
  }
}

extension JobStage: Encodable {
  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: DynamicCodingKey.self)
    try container.encode(id, forKey: .key("id"))
    try container.encode(candidateID, forKey: .key("candidate_id"))
    try container.encode(type, forKey: .key("type"))
    try container.encode(title, forKey: .key("title"))
    try container.encode(round, forKey: .key("round"))
    try container.encode(text, forKey: .key("text"))
    try container.encode(suggestion, forKey: .key("suggestion"))
    try container.encodeIfPresent(image, forKey: .key("image"))
    try container.encode(error, forKey: .key("error"))
  }
}

extension ReferenceLibraryItem: Encodable {
  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: DynamicCodingKey.self)
    try container.encode(id, forKey: .key("id"))
    try container.encode(taskName.rawValue, forKey: .key("task_name"))
    try container.encode(title, forKey: .key("title"))
    try container.encode(summary, forKey: .key("summary"))
    try container.encode(imageURL, forKey: .key("image_url"))
    try container.encode(imageObjectKey, forKey: .key("image_object_key"))
    try container.encode(source, forKey: .key("source"))
  }
}
