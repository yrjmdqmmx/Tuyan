import XCTest
@testable import PaperBanana

@MainActor
final class GenerateV9ParityTests: XCTestCase {
  override func tearDown() {
    GenerateV9URLProtocolStub.requestHandler = nil
    ControllableReferenceURLProtocol.reset()
    super.tearDown()
  }

  func testFeaturedCatalogMatchesAuthoritativeV9OrderAndContent() {
    XCTAssertEqual(FeaturedTemplateCatalog.templates.map(\.sourceReferenceId), ["ref_279", "ref_281", "ref_245", "ref_240", "ref_295", "ref_10"])
    XCTAssertEqual(FeaturedTemplateCatalog.templates.map(\.id), ["multi-agent-method", "experiment-reconstruction", "molecular-mechanism", "model-architecture", "system-memory", "statistical-comparison"])
    XCTAssertEqual(FeaturedTemplateCatalog.templates[0].title, "多智能体方法框架")
    XCTAssertEqual(FeaturedTemplateCatalog.templates[0].caption, "图 1：检索、规划、生成与评审协作的多智能体方法框架。")
    XCTAssertEqual(FeaturedTemplateCatalog.templates[5].negativePrompt, "避免截断纵轴夸大差异、缺失误差线、颜色含义不一致、三维柱状图、过多小数位和未解释的显著性符号。")
  }

  func testFeaturedReferenceRequestContainsOnlyExactContractBody() async throws {
    let client = PaperBananaAPIClient(session: URLSession.generateV9StubbedSession())
    GenerateV9URLProtocolStub.requestHandler = { request in
      let body = try JSONSerialization.jsonObject(with: try request.bodyData()) as? [String: Any]
      XCTAssertEqual(body as NSDictionary?, ["action": "referenceLibrary", "referenceIds": ["ref_279", "ref_281", "ref_245", "ref_240", "ref_295", "ref_10"]] as NSDictionary)
      return GenerateV9URLProtocolStub.response(url: request.url, body: #"{"code":0,"references":[]}"#)
    }

    _ = try await client.featuredReferences(apiBase: "https://gateway.example")
  }

  func testPagedReferenceRequestAndSnakeCaseResponseDecode() async throws {
    let client = PaperBananaAPIClient(session: URLSession.generateV9StubbedSession())
    GenerateV9URLProtocolStub.requestHandler = { request in
      let body = try JSONSerialization.jsonObject(with: try request.bodyData()) as? [String: Any]
      XCTAssertEqual(body?["action"] as? String, "referenceLibrary")
      XCTAssertEqual(body?["scope"] as? String, "bench")
      XCTAssertEqual(body?["page"] as? Int, 2)
      XCTAssertEqual(body?["pageSize"] as? Int, 12)
      XCTAssertEqual(body?["query"] as? String, "agent")
      XCTAssertEqual(body?["visualCategory"] as? String, "framework")
      XCTAssertEqual(body?["researchDomain"] as? String, "AI")
      XCTAssertNil(body?["taskName"])
      XCTAssertNil(body?["limit"])
      return GenerateV9URLProtocolStub.response(url: request.url, body: #"{"code":0,"references":[{"id":"ref_1","task_name":"diagram","title":"中文标题","summary":"中文简介","image_url":"https://img/1.png","image_object_key":"bench/1.png"}],"total":26,"page":2,"page_size":12,"total_pages":3,"facets":{"visual_categories":[{"value":"framework","count":8,"label_zh":"框架图","label_en":"Framework"}],"research_domains":[{"value":"AI","count":5,"labelZh":"人工智能","labelEn":"AI"}]}}"#)
    }

    let page = try await client.referenceLibraryPage(apiBase: "https://gateway.example", request: .init(page: 2, query: "agent", visualCategory: "framework", researchDomain: "AI"))
    XCTAssertEqual(page.total, 26)
    XCTAssertEqual(page.page, 2)
    XCTAssertEqual(page.pageSize, 12)
    XCTAssertEqual(page.totalPages, 3)
    XCTAssertEqual(page.references.first?.imageObjectKey, "bench/1.png")
    XCTAssertEqual(page.facets.visualCategories.first?.labelZh, "框架图")
    XCTAssertEqual(page.facets.researchDomains.first?.labelEn, "AI")
  }

  func testReferenceSelectionKeepsCachedItemsAcrossPagesAndRejectsEleventh() throws {
    var selection = ReferenceLibrarySelection()
    for index in 1...10 { try selection.toggle(reference(id: "ref_\(index)")) }
    XCTAssertEqual(selection.selectedIDs.count, 10)
    XCTAssertEqual(selection.selectedItems.map(\.id), (1...10).map { "ref_\($0)" })
    XCTAssertThrowsError(try selection.toggle(reference(id: "ref_11"))) { error in
      XCTAssertEqual(error.localizedDescription, "最多只能选择 10 张参考图。")
    }
    try selection.toggle(reference(id: "ref_5"))
    XCTAssertEqual(selection.selectedItems.map(\.id), ["ref_1", "ref_2", "ref_3", "ref_4", "ref_6", "ref_7", "ref_8", "ref_9", "ref_10"])
  }

  func testTemplateDirtyDecisionOnlyPromptsWhenThreeTemplateFieldsDiffer() {
    let template = FeaturedTemplateCatalog.templates[0]
    var draft = GenerationDraft()
    draft.methodContent = template.methodContent
    draft.caption = template.caption
    draft.negativePrompt = template.negativePrompt
    XCTAssertFalse(FeaturedTemplateApplyDecision.requiresConfirmation(draft: draft, baseline: template))
    draft.negativePrompt = "用户自己改过"
    XCTAssertTrue(FeaturedTemplateApplyDecision.requiresConfirmation(draft: draft, baseline: template))
  }

  func testNegativePromptIsBoundedToOneThousandCharactersAndPayloadKeepsIt() {
    var draft = GenerationDraft()
    draft.setNegativePrompt(String(repeating: "避", count: 1_010))
    XCTAssertEqual(draft.negativePrompt.count, 1_000)
  }

  func testDraftTextLimitsApplyAtEditingAndPayloadBoundaries() {
    var draft = GenerationDraft()
    draft.setMethodContent(String(repeating: "m", count: 12_001))
    draft.setCaption(String(repeating: "c", count: 1_001))
    XCTAssertEqual(draft.methodContent.count, 12_000)
    XCTAssertEqual(draft.caption.count, 1_000)

    let payload = JobCreatePayload(
      configurationMode: .simple, provider: .bailian, apiKeys: [:], taskName: .diagram,
      methodContent: String(repeating: "m", count: 12_001), caption: String(repeating: "c", count: 1_001),
      infographicCategory: "框架", outputFormat: .png, imageSize: .oneK, mainModelName: "main", imageModelName: "image", referenceVisionModelName: "vision", referenceImageMode: nil, referenceImages: [], pipelineMode: .plannerCritic, retrievalSetting: .none, manualReferenceIds: [], aspectRatio: "16:9", numCandidates: 1, maxCriticRounds: 1
    )
    let body = payload.paperBananaBody()
    XCTAssertEqual((body["methodContent"] as? String)?.count, 12_000)
    XCTAssertEqual((body["caption"] as? String)?.count, 1_000)
  }

  func testDirectlyMutatedOverLimitDraftCannotSubmit() {
    var draft = GenerationDraft()
    draft.methodContent = String(repeating: "m", count: 12_001)
    XCTAssertFalse(draft.hasValidInputLengths)
    draft.methodContent = String(repeating: "m", count: 12_000)
    draft.caption = String(repeating: "c", count: 1_001)
    XCTAssertFalse(draft.hasValidInputLengths)
  }

  func testSavedTemplateUsesSameDirtyDecisionAsFeaturedTemplate() {
    var draft = GenerationDraft()
    let configuration = SavedGenerationTemplateConfiguration(draft: draft)
    XCTAssertFalse(FeaturedTemplateApplyDecision.requiresConfirmation(draft: draft, baseline: configuration))
    draft.caption = "已改写"
    XCTAssertTrue(FeaturedTemplateApplyDecision.requiresConfirmation(draft: draft, baseline: configuration))
  }

  func testReferenceSearchDebouncerOnlyExecutesLastRapidQuery() async throws {
    var executed: [String] = []
    var observedDelays: [Duration] = []
    var sleepers: [CheckedContinuation<Void, Never>] = []
    let debouncer = ReferenceLibrarySearchDebouncer<String>(sleep: { duration in
      observedDelays.append(duration)
      await withCheckedContinuation { sleepers.append($0) }
    })

    debouncer.schedule("a", operation: { executed.append($0) }) { _ in XCTFail("Cancellation must not be reported") }
    await waitForSleepers(&sleepers, count: 1)
    debouncer.schedule("ab", operation: { executed.append($0) }) { _ in XCTFail("Cancellation must not be reported") }
    await waitForSleepers(&sleepers, count: 2)
    debouncer.schedule("abc", operation: { executed.append($0) }) { _ in XCTFail("Cancellation must not be reported") }
    await waitForSleepers(&sleepers, count: 3)
    sleepers.forEach { $0.resume() }
    await waitForExecution(&executed, count: 1)

    XCTAssertEqual(executed, ["abc"])
    XCTAssertTrue(observedDelays.allSatisfy { $0 == ReferenceLibrarySearchDebouncer<String>.delay })
  }

  func testReferenceSearchDebouncerDoesNotReportCancelledTaskFailure() async throws {
    var executed = false
    var errors: [String] = []
    let debouncer = ReferenceLibrarySearchDebouncer<String>(sleep: { _ in throw CancellationError() })

    debouncer.schedule("cancelled", operation: { _ in executed = true }) { error in errors.append(String(describing: error)) }
    try await Task.sleep(for: .milliseconds(20))

    XCTAssertFalse(executed)
    XCTAssertTrue(errors.isEmpty)
  }

  func testChangingReferenceQueryFromPageTwentySendsPageOneRequest() async throws {
    var request = ReferenceLibraryPageRequest(page: 20, query: "", visualCategory: "framework", researchDomain: "AI")
    request.setQuery("new query")
    let client = PaperBananaAPIClient(session: URLSession.generateV9StubbedSession())
    GenerateV9URLProtocolStub.requestHandler = { urlRequest in
      let body = try JSONSerialization.jsonObject(with: try urlRequest.bodyData()) as? [String: Any]
      XCTAssertEqual(body?["page"] as? Int, 1)
      XCTAssertEqual(body?["query"] as? String, "new query")
      return GenerateV9URLProtocolStub.response(url: urlRequest.url, body: #"{"code":0,"references":[],"total":0,"page":1,"pageSize":12,"totalPages":0,"facets":{}}"#)
    }

    _ = try await client.referenceLibraryPage(apiBase: "https://gateway.example", request: request)
    XCTAssertEqual(request.page, 1)
    XCTAssertEqual(request.query, "new query")
    XCTAssertEqual(request.visualCategory, "framework")
    XCTAssertEqual(request.researchDomain, "AI")
  }

  func testOlderReferenceSuccessDoesNotReplaceNewerLoadingOrPage() async throws {
    let model = AppModel(apiClient: PaperBananaAPIClient(session: .controllableReferenceSession()))
    let old = Task { await model.generation.loadReferenceLibraryPage(.init(page: 20, query: "old")) }
    try await ControllableReferenceURLProtocol.waitForPending(count: 1)
    let newest = Task { await model.generation.loadReferenceLibraryPage(.init(page: 1, query: "new")) }
    try await ControllableReferenceURLProtocol.waitForPending(count: 2)

    ControllableReferenceURLProtocol.respond(query: "old", body: referencePageJSON(id: "old", page: 20))
    try await Task.sleep(for: .milliseconds(20))
    XCTAssertTrue(model.generation.referenceLibraryLoading)
    XCTAssertNil(model.generation.referenceLibraryPage)

    ControllableReferenceURLProtocol.respond(query: "new", body: referencePageJSON(id: "new", page: 1))
    await old.value
    await newest.value
    XCTAssertFalse(model.generation.referenceLibraryLoading)
    XCTAssertEqual(model.generation.referenceLibraryPage?.references.first?.id, "new")
  }

  func testOlderReferenceFailureDoesNotReplaceNewerResultOrLoading() async throws {
    let model = AppModel(apiClient: PaperBananaAPIClient(session: .controllableReferenceSession()))
    let old = Task { await model.generation.loadReferenceLibraryPage(.init(page: 20, query: "old")) }
    try await ControllableReferenceURLProtocol.waitForPending(count: 1)
    let newest = Task { await model.generation.loadReferenceLibraryPage(.init(page: 1, query: "new")) }
    try await ControllableReferenceURLProtocol.waitForPending(count: 2)

    ControllableReferenceURLProtocol.respond(query: "new", body: referencePageJSON(id: "new", page: 1))
    await newest.value
    XCTAssertFalse(model.generation.referenceLibraryLoading)
    ControllableReferenceURLProtocol.respond(query: "old", body: #"{"ok":false,"error":"stale failure"}"#)
    await old.value

    XCTAssertFalse(model.generation.referenceLibraryLoading)
    XCTAssertEqual(model.generation.referenceLibraryPage?.references.first?.id, "new")
    XCTAssertTrue(model.generation.referenceLibraryError.isEmpty)
  }

  func testSavedTemplateV1MigratesRoutesAndNegativePromptIntoV2() throws {
    let suite = "GenerateV9ParityTests.\(UUID().uuidString)"
    let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let v1Key = SavedTemplateStore.v1StorageKey
    let v2Key = SavedTemplateStore.v2StorageKey
    let legacy = #"[{"id":"legacy","title":"旧模板","createdAt":0,"updatedAt":0,"configuration":{"configurationMode":"advanced","provider":"bailian","methodContent":"method","caption":"caption","infographicCategoryID":"method_framework","outputFormat":"png","imageSize":"1K","mainModelName":"main","imageModelName":"image","referenceVisionModelName":"vision","referenceImageMode":"vision_model","pipelineMode":"demo_planner_critic","retrievalSetting":"none","manualReferenceIds":[],"aspectRatio":"16:9","numCandidates":1,"maxCriticRounds":1}}]"#
    defaults.set(Data(legacy.utf8), forKey: v1Key)

    let store = SavedTemplateStore(defaults: defaults)

    XCTAssertNil(defaults.data(forKey: v1Key))
    XCTAssertNotNil(defaults.data(forKey: v2Key))
    let configuration = try XCTUnwrap(store.templates.first?.configuration)
    XCTAssertEqual(configuration.negativePrompt, "")
    XCTAssertEqual(configuration.modelRoutes?.main, ModelRoute(accessProvider: .bailian, modelId: "main"))
    XCTAssertEqual(configuration.modelRoutes?.image, ModelRoute(accessProvider: .bailian, modelId: "image"))
    XCTAssertEqual(configuration.modelRoutes?.vision, ModelRoute(accessProvider: .bailian, modelId: "vision"))
  }

  private func reference(id: String) -> ReferenceLibraryItem {
    ReferenceLibraryItem(id: id, taskName: .diagram, title: id, summary: "", imageURL: "", imageObjectKey: "", source: "test")
  }

  private func referencePageJSON(id: String, page: Int) -> String {
    """
    {"code":0,"references":[{"id":"\(id)","task_name":"diagram","title":"\(id)","summary":"summary","image_url":"","image_object_key":""}],"total":24,"page":\(page),"page_size":12,"total_pages":2,"facets":{}}
    """
  }

  private func waitForSleepers(_ sleepers: inout [CheckedContinuation<Void, Never>], count: Int) async {
    for _ in 0..<100 {
      if sleepers.count >= count { return }
      await Task.yield()
    }
    XCTFail("Timed out waiting for \(count) debounced sleeps")
  }

  private func waitForExecution(_ executed: inout [String], count: Int) async {
    for _ in 0..<100 {
      if executed.count >= count { return }
      await Task.yield()
    }
    XCTFail("Timed out waiting for debounced execution")
  }
}

private final class GenerateV9URLProtocolStub: URLProtocol {
  nonisolated(unsafe) static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

  static func response(url: URL?, body: String) -> (HTTPURLResponse, Data) {
    let response = HTTPURLResponse(url: url ?? URL(string: "https://gateway.example/paperbanana-api")!, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "application/json"])!
    return (response, Data(body.utf8))
  }

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    do {
      let (response, data) = try Self.requestHandler?(request) ?? { throw URLError(.badServerResponse) }()
      client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
      client?.urlProtocol(self, didLoad: data)
      client?.urlProtocolDidFinishLoading(self)
    } catch { client?.urlProtocol(self, didFailWithError: error) }
  }
  override func stopLoading() {}
}

private extension URLSession {
  static func generateV9StubbedSession() -> URLSession {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [GenerateV9URLProtocolStub.self]
    return URLSession(configuration: configuration)
  }

  static func controllableReferenceSession() -> URLSession {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [ControllableReferenceURLProtocol.self]
    return URLSession(configuration: configuration)
  }
}

private final class ControllableReferenceURLProtocol: URLProtocol {
  private struct PendingRequest {
    let request: URLRequest
    let protocolInstance: ControllableReferenceURLProtocol
  }

  private static let lock = NSLock()
  nonisolated(unsafe) private static var pending: [PendingRequest] = []

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

  override func startLoading() {
    Self.lock.lock()
    Self.pending.append(PendingRequest(request: request, protocolInstance: self))
    Self.lock.unlock()
  }

  override func stopLoading() {}

  static func reset() {
    lock.lock()
    pending = []
    lock.unlock()
  }

  static func waitForPending(count: Int) async throws {
    for _ in 0..<400 {
      lock.lock()
      let hasEnough = pending.count >= count
      lock.unlock()
      if hasEnough { return }
      try await Task.sleep(for: .milliseconds(5))
    }
    throw URLError(.timedOut)
  }

  static func respond(query: String, body: String) {
    lock.lock()
    let index = pending.firstIndex { pendingRequest in
      let body = String(data: (try? pendingRequest.request.bodyData()) ?? Data(), encoding: .utf8) ?? ""
      return body.contains("\"query\":\"\(query)\"")
    }
    guard let index else {
      lock.unlock()
      XCTFail("No pending reference request for query \(query)")
      return
    }
    let pendingRequest = pending.remove(at: index)
    lock.unlock()

    let response = HTTPURLResponse(
      url: pendingRequest.request.url ?? URL(string: "https://gateway.example/paperbanana-api")!,
      statusCode: 200,
      httpVersion: "HTTP/1.1",
      headerFields: ["Content-Type": "application/json"]
    )!
    pendingRequest.protocolInstance.client?.urlProtocol(pendingRequest.protocolInstance, didReceive: response, cacheStoragePolicy: .notAllowed)
    pendingRequest.protocolInstance.client?.urlProtocol(pendingRequest.protocolInstance, didLoad: Data(body.utf8))
    pendingRequest.protocolInstance.client?.urlProtocolDidFinishLoading(pendingRequest.protocolInstance)
  }
}

private extension URLRequest {
  func bodyData() throws -> Data {
    if let httpBody { return httpBody }
    let stream = try XCTUnwrap(httpBodyStream)
    stream.open()
    defer { stream.close() }
    var data = Data()
    var buffer = [UInt8](repeating: 0, count: 1_024)
    while stream.hasBytesAvailable {
      let count = stream.read(&buffer, maxLength: buffer.count)
      if count < 0 { throw stream.streamError ?? URLError(.cannotDecodeContentData) }
      if count == 0 { break }
      data.append(buffer, count: count)
    }
    return data
  }
}
