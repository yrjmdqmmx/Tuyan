import XCTest
@testable import PaperBanana

final class APIClientTests: XCTestCase {
  override func tearDown() {
    URLProtocolStub.requestHandler = nil
    super.tearDown()
  }

  func testEnvelopeFailureWithOkFalseThrowsServerErrorBeforeDecoding() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    URLProtocolStub.requestHandler = { request in
      XCTAssertEqual(request.url?.path, "/paperbanana-api")
      let body = #"{"ok":false,"error":"Backend is unavailable"}"#
      return HTTPURLResponse.stub(url: request.url, statusCode: 200, body: body)
    }

    do {
      _ = try await client.referenceLibrary(apiBase: "https://gateway.example", taskName: .diagram)
      XCTFail("Expected server error")
    } catch let error as PaperBananaAPIError {
      XCTAssertEqual(error.localizedDescription, "Backend is unavailable")
    }
  }

  func testSubmitFeedbackOmitsNilOptionalFields() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    URLProtocolStub.requestHandler = { request in
      let json = try XCTUnwrap(
        JSONSerialization.jsonObject(with: try request.bodyData()) as? [String: Any]
      )
      XCTAssertEqual(json["action"] as? String, "submitFeedback")
      XCTAssertEqual(json["category"] as? String, "experience")
      XCTAssertEqual(json["platform"] as? String, "ios")
      XCTAssertEqual(json["clientVersion"] as? String, AppDefaults.clientVersion)
      XCTAssertNil(json["jobId"])
      XCTAssertNil(json["contact"])
      return HTTPURLResponse.stub(url: request.url, statusCode: 200, body: #"{"code":0,"ok":true}"#)
    }

    try await client.submitFeedback(
      apiBase: "https://gateway.example",
      message: "希望增加 TestFlight 反馈入口",
      category: .experience,
      jobID: nil,
      contact: nil
    )
  }

  func testRequestsIncludeTrustedWebOriginForBetterAuthGateway() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    URLProtocolStub.requestHandler = { request in
      XCTAssertEqual(request.url?.path, "/api/auth/sign-in/email")
      XCTAssertEqual(request.value(forHTTPHeaderField: "Origin"), AppDefaults.webOrigin)
      XCTAssertEqual(request.value(forHTTPHeaderField: "Referer"), "\(AppDefaults.webOrigin)/")
      return HTTPURLResponse.stub(url: request.url, statusCode: 200, body: #"{"ok":true}"#)
    }

    try await client.signIn(apiBase: "https://gateway.example", email: "founder@paperbanana.asia", password: "password")
  }

  func testUserJobsHydratesRecordSummariesWithResultImageCount() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    var actions: [String] = []
    URLProtocolStub.requestHandler = { request in
      let json = try XCTUnwrap(
        JSONSerialization.jsonObject(with: try request.bodyData()) as? [String: Any]
      )
      let action = try XCTUnwrap(json["action"] as? String)
      actions.append(action)

      if action == "myJobs" {
        return HTTPURLResponse.stub(
          url: request.url,
          statusCode: 200,
          body: """
          {
            "code": 0,
            "jobs": [
              {
                "id": "job-summary",
                "status": "succeeded",
                "caption": "summary",
                "result_image_count": 1,
                "result_images": []
              },
              {
                "id": "job-queued",
                "status": "queued",
                "caption": "queued",
                "result_image_count": 0,
                "result_images": []
              }
            ]
          }
          """
        )
      }

      XCTAssertEqual(action, "getJob")
      XCTAssertEqual(json["jobId"] as? String, "job-summary")
      return HTTPURLResponse.stub(
        url: request.url,
        statusCode: 200,
        body: """
        {
          "code": 0,
          "job": {
            "id": "job-summary",
            "status": "succeeded",
            "caption": "detail",
            "output_format": "png",
            "result_image_count": 1,
            "result_images": [
              {
                "filename": "out.png",
                "url": "/signed/out.png",
                "mime_type": "image/png",
                "candidate_id": 0,
                "object_key": "jobs/out.png"
              }
            ]
          }
        }
        """
      )
    }

    let jobs = try await client.userJobs(apiBase: "https://gateway.example")

    XCTAssertEqual(actions, ["myJobs", "getJob"])
    XCTAssertEqual(jobs.map(\.id), ["job-summary", "job-queued"])
    XCTAssertEqual(jobs.first?.title, "detail")
    XCTAssertEqual(jobs.first?.resultImages.first?.url, "/signed/out.png")
    XCTAssertEqual(jobs.last?.resultImages.count, 0)
  }

  func testDeleteAccountPostsEmailAndPasswordToAccountDeleteEndpoint() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    URLProtocolStub.requestHandler = { request in
      XCTAssertEqual(request.url?.path, "/api/account/delete")
      XCTAssertEqual(request.httpMethod, "POST")
      let json = try XCTUnwrap(
        JSONSerialization.jsonObject(with: try request.bodyData()) as? [String: Any]
      )
      XCTAssertEqual(json["email"] as? String, "founder@paperbanana.asia")
      XCTAssertEqual(json["password"] as? String, "secret-pass")
      return HTTPURLResponse.stub(url: request.url, statusCode: 200, body: #"{"code":0,"ok":true,"deletedJobCount":3}"#)
    }

    try await client.deleteAccount(
      apiBase: "https://gateway.example",
      email: "founder@paperbanana.asia",
      password: "secret-pass"
    )
  }

  func testDeleteAccountInvalidPasswordThrowsMappableError() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    URLProtocolStub.requestHandler = { request in
      HTTPURLResponse.stub(
        url: request.url,
        statusCode: 401,
        body: #"{"code":401,"error":"INVALID_PASSWORD"}"#
      )
    }

    do {
      try await client.deleteAccount(apiBase: "https://gateway.example", email: "a@b.com", password: "wrong")
      XCTFail("Expected delete to throw on invalid password")
    } catch {
      XCTAssertEqual(formatUserFacingError(error), "密码不正确，请重新输入。")
    }
  }

  func testDeleteAccountNetworkFailureThrows() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    URLProtocolStub.requestHandler = { _ in
      throw URLError(.notConnectedToInternet)
    }

    do {
      try await client.deleteAccount(apiBase: "https://gateway.example", email: "a@b.com", password: "pw")
      XCTFail("Expected delete to throw on network failure")
    } catch {
      XCTAssertEqual(formatUserFacingError(error), "网络未连接，请检查网络后重试。")
    }
  }

  func testPreparedReferenceUploadDecodesGatewayKeyVariants() throws {
    let json = Data("""
      {
        "client_id": "local-1:original",
        "upload_url": "https://bucket.example/upload",
        "object_key": "refs/local-1.png",
        "upload_token": "token-1"
      }
      """.utf8)

    let upload = try JSONDecoder().decode(PreparedReferenceUpload.self, from: json)

    XCTAssertEqual(upload.clientId, "local-1:original")
    XCTAssertEqual(upload.uploadURL, "https://bucket.example/upload")
    XCTAssertEqual(upload.objectKey, "refs/local-1.png")
    XCTAssertEqual(upload.uploadToken, "token-1")
  }

  func testReferenceUploadLifecycleUsesExplicitFinalizeAndAbortActions() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    var actions: [String] = []
    URLProtocolStub.requestHandler = { request in
      let json = try XCTUnwrap(
        JSONSerialization.jsonObject(with: try request.bodyData()) as? [String: Any]
      )
      actions.append(try XCTUnwrap(json["action"] as? String))
      let uploads = try XCTUnwrap(json["uploads"] as? [[String: Any]])
      XCTAssertEqual(uploads.first?["objectKey"] as? String, "references/user/reference.png")
      XCTAssertEqual(uploads.first?["uploadToken"] as? String, "token")
      return HTTPURLResponse.stub(url: request.url, statusCode: 200, body: #"{"code":0,"ok":true}"#)
    }
    let upload = ReferenceImageAsset(
      filename: "reference.png",
      mimeType: "image/png",
      size: 123,
      objectKey: "references/user/reference.png",
      uploadToken: "token"
    )

    try await client.finalizeReferenceUploads(apiBase: "https://gateway.example", uploads: [upload])
    try await client.abortReferenceUploads(apiBase: "https://gateway.example", uploads: [upload])

    XCTAssertEqual(actions, ["finalizeReferenceUpload", "abortReferenceUpload"])
  }

  func testCurrentUserDecodesMissingNameFromBetterAuthSession() throws {
    let json = Data(#"{"id":"user-1","email":"founder@paperbanana.asia"}"#.utf8)

    let user = try JSONDecoder().decode(CurrentUser.self, from: json)

    XCTAssertEqual(user.id, "user-1")
    XCTAssertEqual(user.email, "founder@paperbanana.asia")
    XCTAssertEqual(user.name, "founder@paperbanana.asia")
  }

  func testModelCapabilityRequestUsesGatewayActionAndDecodesSnakeCase() async throws {
    let client = PaperBananaAPIClient(session: URLSession.stubbedSession())
    URLProtocolStub.requestHandler = { request in
      XCTAssertEqual(request.url?.path, "/paperbanana-api")
      let body = try XCTUnwrap(
        JSONSerialization.jsonObject(with: try request.bodyData()) as? [String: Any]
      )
      XCTAssertEqual(body["action"] as? String, "modelCapability")
      XCTAssertEqual(body["provider"] as? String, "bailian")
      XCTAssertEqual(body["model"] as? String, "qwen3.7-plus")
      return HTTPURLResponse.stub(
        url: request.url,
        statusCode: 200,
        body: #"{"status":"supported","supports_reference_images":true,"reason":"ok","source":"server","cached":true}"#
      )
    }

    let capability = try await client.modelCapability(apiBase: "https://gateway.example", provider: .bailian, model: "qwen3.7-plus")

    XCTAssertEqual(capability.status, "supported")
    XCTAssertTrue(capability.supportsReferenceImages)
    XCTAssertEqual(capability.reason, "ok")
    XCTAssertEqual(capability.source, "server")
    XCTAssertTrue(capability.cached)
  }
}

private final class URLProtocolStub: URLProtocol {
  static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

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

    do {
      let (response, data) = try requestHandler(request)
      client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
      client?.urlProtocol(self, didLoad: data)
      client?.urlProtocolDidFinishLoading(self)
    } catch {
      client?.urlProtocol(self, didFailWithError: error)
    }
  }

  override func stopLoading() {}
}

private extension URLSession {
  static func stubbedSession() -> URLSession {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [URLProtocolStub.self]
    return URLSession(configuration: configuration)
  }
}

private extension HTTPURLResponse {
  static func stub(url: URL?, statusCode: Int, body: String) -> (HTTPURLResponse, Data) {
    let resolvedURL = url ?? URL(string: "https://gateway.example/paperbanana-api")!
    let response = HTTPURLResponse(
      url: resolvedURL,
      statusCode: statusCode,
      httpVersion: "HTTP/1.1",
      headerFields: ["Content-Type": "application/json"]
    )!
    return (response, Data(body.utf8))
  }
}

private extension URLRequest {
  func bodyData() throws -> Data {
    if let httpBody {
      return httpBody
    }
    guard let httpBodyStream else {
      return Data()
    }

    httpBodyStream.open()
    defer { httpBodyStream.close() }

    var data = Data()
    var buffer = [UInt8](repeating: 0, count: 4096)
    while httpBodyStream.hasBytesAvailable {
      let count = httpBodyStream.read(&buffer, maxLength: buffer.count)
      if count > 0 {
        data.append(buffer, count: count)
      } else if count < 0 {
        throw httpBodyStream.streamError ?? URLError(.cannotDecodeContentData)
      } else {
        break
      }
    }
    return data
  }
}
