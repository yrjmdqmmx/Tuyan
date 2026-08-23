import XCTest
@testable import PaperBanana

@MainActor
final class ModelCapabilityTests: XCTestCase {
  override func tearDown() {
    ModelCapabilityURLProtocolStub.requestHandler = nil
    super.tearDown()
  }

  func testRefreshMainModelCapabilityUsesGatewayResultForReferenceNote() async throws {
    let model = AppModel(apiClient: PaperBananaAPIClient(session: URLSession.modelCapabilityStubbedSession()))
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.provider = .bailian
    model.generation.draft.mainModelName = "qwen3.7-plus"
    model.generation.draft.referenceImages = [
      PendingReferenceImage(id: "ref-1", filename: "style.png", mimeType: "image/png", data: Data([1, 2, 3]))
    ]
    ModelCapabilityURLProtocolStub.requestHandler = { request in
      let body = try XCTUnwrap(
        JSONSerialization.jsonObject(with: try request.bodyData()) as? [String: Any]
      )
      XCTAssertEqual(body["action"] as? String, "modelCapability")
      XCTAssertEqual(body["provider"] as? String, "bailian")
      XCTAssertEqual(body["model"] as? String, "qwen3.7-plus")
      return HTTPURLResponse.modelCapabilityStub(
        url: request.url,
        statusCode: 200,
        body: #"{"status":"supported","supportsReferenceImages":true,"reason":"server-confirmed","source":"gateway","cached":false}"#
      )
    }

    await model.generation.refreshMainModelCapability()

    XCTAssertEqual(model.generation.mainModelCapability?.status, "supported")
    XCTAssertEqual(model.generation.mainModelCapability?.source, "gateway")
    XCTAssertEqual(model.generation.referenceCapabilityNote, "网关确认当前主模型支持图像理解，可用主模型直读参考图。")
  }

  func testRefreshMainModelCapabilityFailsClosedWhenGatewayFailsWithoutLiveRegistry() async throws {
    let model = AppModel(apiClient: PaperBananaAPIClient(session: URLSession.modelCapabilityStubbedSession()))
    model.generation.draft.configurationMode = .advanced
    model.generation.draft.provider = .bailian
    model.generation.draft.mainModelName = "qwen3.7-plus"
    model.generation.draft.referenceImages = [
      PendingReferenceImage(id: "ref-1", filename: "style.png", mimeType: "image/png", data: Data([1, 2, 3]))
    ]
    ModelCapabilityURLProtocolStub.requestHandler = { request in
      HTTPURLResponse.modelCapabilityStub(
        url: request.url,
        statusCode: 503,
        body: #"{"error":"Capability unavailable"}"#
      )
    }

    await model.generation.refreshMainModelCapability()

    XCTAssertEqual(model.generation.mainModelCapability?.status, "unknown")
    XCTAssertFalse(model.generation.mainModelCapability?.supportsReferenceImages ?? true)
    XCTAssertTrue(model.generation.referenceCapabilityNote.contains("当前主模型不能直读参考图"))
    XCTAssertTrue(model.generation.referenceCapabilityNote.contains("Capability unavailable"))
  }

  func testRefreshMainModelCapabilityClearsWhenNoReferenceImagesExist() async {
    let model = AppModel(apiClient: PaperBananaAPIClient(session: URLSession.modelCapabilityStubbedSession()))
    model.generation.mainModelCapability = ModelCapability(
      status: "supported",
      supportsReferenceImages: true,
      reason: "cached",
      source: "test",
      cached: true
    )

    await model.generation.refreshMainModelCapability()

    XCTAssertNil(model.generation.mainModelCapability)
  }
}

private final class ModelCapabilityURLProtocolStub: URLProtocol {
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
  static func modelCapabilityStubbedSession() -> URLSession {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [ModelCapabilityURLProtocolStub.self]
    return URLSession(configuration: configuration)
  }
}

private extension HTTPURLResponse {
  static func modelCapabilityStub(url: URL?, statusCode: Int, body: String) -> (HTTPURLResponse, Data) {
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
