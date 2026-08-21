import XCTest
@testable import PaperBanana

@MainActor
final class JobsStoreTests: XCTestCase {
  override func tearDown() {
    JobsStoreStub.requestHandler = nil
    super.tearDown()
  }

  private func makeStore() -> JobsStore {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [JobsStoreStub.self]
    let client = PaperBananaAPIClient(session: URLSession(configuration: configuration))
    let settings = SettingsStore(apiClient: client)
    let auth = AuthStore(apiClient: client, settings: settings)
    return JobsStore(apiClient: client, settings: settings, auth: auth)
  }

  /// loadUserJobs 有登录闸门（auth.currentUser == nil 直接 return），记录类测试用已登录的 store。
  private func makeSignedInStore() throws -> JobsStore {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [JobsStoreStub.self]
    let client = PaperBananaAPIClient(session: URLSession(configuration: configuration))
    let settings = SettingsStore(apiClient: client)
    let auth = AuthStore(apiClient: client, settings: settings)
    auth.currentUser = try JSONDecoder().decode(
      CurrentUser.self,
      from: Data(#"{"id":"u-test","email":"test@paperbanana.app"}"#.utf8)
    )
    return JobsStore(apiClient: client, settings: settings, auth: auth)
  }

  // MARK: - refreshCurrentJob

  func testRefreshCurrentJobUpdatesJobAndLastPolledAt() async throws {
    let store = makeStore()
    store.currentJobID = "job-1"
    JobsStoreStub.requestHandler = { request in
      JobsStoreStub.jsonResponse(url: request.url, body: #"{"code":0,"job":{"id":"job-1","status":"running"}}"#)
    }

    await store.refreshCurrentJob()

    XCTAssertEqual(store.currentJob?.id, "job-1")
    XCTAssertEqual(store.currentJob?.status, "running")
    XCTAssertNotNil(store.lastPolledAt)
  }

  func testRefreshCurrentJobUpdatesSignedInRecordSummary() async throws {
    // 当前任务轮询完成后，记录页不能继续显示旧的 running 摘要。
    let store = try makeSignedInStore()
    defer {
      store.clearForSignOut()
      store.clearLocalJobs()
    }
    store.currentJobID = "job-1"
    store.userJobs = [Job(id: "job-1", status: "running")]
    JobsStoreStub.requestHandler = { request in
      JobsStoreStub.jsonResponse(
        url: request.url,
        body: """
        {
          "code": 0,
          "job": {
            "id": "job-1",
            "status": "succeeded",
            "caption": "图 1：完成态",
            "result_image_count": 1,
            "result_images": []
          }
        }
        """
      )
    }

    await store.refreshCurrentJob()

    XCTAssertEqual(store.currentJob?.statusKind, .succeeded)
    XCTAssertEqual(store.userJobs.first?.id, "job-1")
    XCTAssertEqual(store.userJobs.first?.statusKind, .succeeded)
    XCTAssertEqual(store.userJobs.first?.title, "图 1：完成态")
    XCTAssertEqual(store.userJobs.first?.resultImageCount, 1)
  }

  func testRefreshCurrentJobSlowResponseDoesNotOverwriteNewerJob() async throws {
    // 旧任务的 getJob 在 await 期间用户已切换跟踪新任务：慢响应不得覆盖新任务的 currentJob。
    let store = makeStore()
    store.currentJobID = "job-old"
    JobsStoreStub.requestHandler = { request in
      Thread.sleep(forTimeInterval: 0.2) // 模拟旧任务的慢响应
      return JobsStoreStub.jsonResponse(url: request.url, body: #"{"code":0,"job":{"id":"job-old","status":"succeeded"}}"#)
    }

    let refresh = Task { await store.refreshCurrentJob() }
    try await Task.sleep(for: .milliseconds(50)) // 让旧请求先发出
    store.currentJobID = "job-new"
    store.currentJob = Job(id: "job-new", status: "queued")
    await refresh.value

    XCTAssertEqual(store.currentJob?.id, "job-new")
    XCTAssertEqual(store.currentJob?.status, "queued")
    XCTAssertNil(store.lastPolledAt)
  }

  // MARK: - loadUserJobs · recordsError 生命周期

  func testSilentLoadUserJobsFailureDoesNotSetRecordsError() async throws {
    // 静默后台刷新（如登录后自动刷新）失败不得弹常驻红卡。
    let store = try makeSignedInStore()
    JobsStoreStub.requestHandler = { request in
      JobsStoreStub.jsonResponse(url: request.url, body: #"{"code":1,"error":"boom"}"#, statusCode: 500)
    }

    await store.loadUserJobs(silent: true)

    XCTAssertEqual(store.recordsError, "")
    XCTAssertFalse(store.recordsLoading)
  }

  func testLoadUserJobsSuccessClearsStaleRecordsError() async throws {
    // 静默成功必须清掉历史错误：旧红卡不能赖在新数据上。
    let store = try makeSignedInStore()
    // 成功路径会写共享磁盘缓存（默认 user-jobs.json）：defer 兜底清理，
    // 断言失败时也不污染其他用例。
    defer { store.clearForSignOut() }
    store.recordsError = "之前显式刷新留下的错误"
    JobsStoreStub.requestHandler = { request in
      JobsStoreStub.jsonResponse(url: request.url, body: #"{"code":0,"jobs":[{"id":"job-1","status":"running"}]}"#)
    }

    await store.loadUserJobs(silent: true)

    XCTAssertEqual(store.recordsError, "")
    XCTAssertEqual(store.userJobs.map(\.id), ["job-1"])
  }

  func testExplicitLoadUserJobsFailureStillSetsRecordsError() async throws {
    // 显式刷新（下拉 / 工具栏 / 重试按钮）失败仍要可见。
    let store = try makeSignedInStore()
    JobsStoreStub.requestHandler = { request in
      JobsStoreStub.jsonResponse(url: request.url, body: #"{"code":1,"error":"boom"}"#, statusCode: 500)
    }

    await store.loadUserJobs(silent: false)

    XCTAssertFalse(store.recordsError.isEmpty)
  }

  // MARK: - track

  func testTrackResetsLastPolledAtFromPreviousJob() {
    let store = makeStore()
    JobsStoreStub.requestHandler = { request in
      JobsStoreStub.jsonResponse(url: request.url, body: #"{"code":0,"job":{"id":"job-2","status":"running"}}"#)
    }
    store.lastPolledAt = Date()

    store.track(jobID: "job-2", status: "queued")

    XCTAssertEqual(store.currentJobID, "job-2")
    XCTAssertEqual(store.currentJob?.id, "job-2")
    // 新任务尚未拿到任何数据："刷新于 X 前"不能显示上一个任务的时刻。
    XCTAssertNil(store.lastPolledAt)
    store.pausePolling()
  }

  func testMissingServerSourceKeepsRegisteredRefineSourceThroughCurrentRefresh() async throws {
    let store = makeStore()
    let source = RefineSource(jobID: "generate-1", image: resultImage(objectKey: "jobs/generate-1/image.png"))
    store.registerRefineSource(source, for: "refine-1")
    store.currentJobID = "refine-1"
    JobsStoreStub.requestHandler = { request in
      JobsStoreStub.jsonResponse(url: request.url, body: #"{"code":0,"job":{"id":"refine-1","status":"running"}}"#)
    }

    await store.refreshCurrentJob()

    XCTAssertEqual(store.currentJob?.sourceImageObjectKey, "jobs/generate-1/image.png")
  }

  func testServerSourceWinsOverRegisteredRefineSourceAndRecordsRefreshMergesMissingSource() async throws {
    let store = try makeSignedInStore()
    defer { store.clearForSignOut(); store.clearLocalJobs() }
    store.registerRefineSource(RefineSource(jobID: "generate-1", image: resultImage(objectKey: "jobs/local.png")), for: "refine-1")
    JobsStoreStub.requestHandler = { request in
      JobsStoreStub.jsonResponse(url: request.url, body: #"{"code":0,"jobs":[{"id":"refine-1","status":"succeeded"},{"id":"refine-2","status":"succeeded","sourceImageObjectKey":"jobs/server.png"}]}"#)
    }

    await store.loadUserJobs(silent: true)
    XCTAssertEqual(store.userJobs.first(where: { $0.id == "refine-1" })?.sourceImageObjectKey, "jobs/local.png")
    XCTAssertEqual(store.userJobs.first(where: { $0.id == "refine-2" })?.sourceImageObjectKey, "jobs/server.png")
  }

  private func resultImage(objectKey: String) -> ResultImage {
    try! JSONDecoder().decode(ResultImage.self, from: Data("{\"filename\":\"image.png\",\"url\":\"https://signed.example/image.png\",\"candidateId\":0,\"objectKey\":\"\(objectKey)\"}".utf8))
  }
}

private final class JobsStoreStub: URLProtocol {
  nonisolated(unsafe) static var requestHandler: ((URLRequest) -> (HTTPURLResponse, Data))?

  static func jsonResponse(url: URL?, body: String, statusCode: Int = 200) -> (HTTPURLResponse, Data) {
    let resolvedURL = url ?? URL(string: "https://gateway.example/paperbanana-api")!
    let response = HTTPURLResponse(
      url: resolvedURL,
      statusCode: statusCode,
      httpVersion: "HTTP/1.1",
      headerFields: ["Content-Type": "application/json"]
    )!
    return (response, Data(body.utf8))
  }

  override class func canInit(with request: URLRequest) -> Bool {
    true
  }

  override class func canonicalRequest(for request: URLRequest) -> URLRequest {
    request
  }

  override func startLoading() {
    guard let requestHandler = Self.requestHandler else {
      client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
      return
    }
    let (response, data) = requestHandler(request)
    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: data)
    client?.urlProtocolDidFinishLoading(self)
  }

  override func stopLoading() {}
}
